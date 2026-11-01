import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  canonicalProducts,
  productListings,
  priceHistory,
  scrapeRuns,
  sources,
  type Db,
} from "@tech-radar/db";

export interface BuildAppOptions {
  db: Db;
  /** When set, every /api route except /api/health requires this token. */
  token?: string;
  logger?: boolean;
}

interface ProductQuery {
  q?: string;
  category?: string;
  limit?: string;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const { db, token } = options;
  const app = Fastify({ logger: options.logger ?? false });

  await app.register(cors, { origin: true });

  app.addHook("onRequest", async (request, reply) => {
    if (!token) return;
    if (request.url.startsWith("/api/health")) return;
    const header = request.headers.authorization;
    const provided = header?.startsWith("Bearer ") ? header.slice(7) : (request.headers["x-api-token"] as string | undefined);
    if (!provided || !safeEqual(provided, token)) {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });

  app.get("/api/health", async () => ({ status: "ok" }));

  app.get<{ Querystring: ProductQuery }>("/api/products", async (request) => {
    const { q, category } = request.query;
    const limit = Math.min(Number(request.query.limit ?? 100) || 100, 200);

    const filters = [
      q
        ? or(
            ilike(canonicalProducts.name, `%${q}%`),
            ilike(canonicalProducts.brand, `%${q}%`),
            ilike(canonicalProducts.model, `%${q}%`),
          )
        : undefined,
      category ? eq(canonicalProducts.category, category) : undefined,
      eq(canonicalProducts.status, "active"),
    ].filter(Boolean);

    const rows = await db
      .select({
        productId: canonicalProducts.id,
        name: canonicalProducts.name,
        brand: canonicalProducts.brand,
        model: canonicalProducts.model,
        category: canonicalProducts.category,
        specs: canonicalProducts.specs,
        listingId: productListings.id,
        priceCurrent: productListings.priceCurrent,
        priceOriginal: productListings.priceOriginal,
        stockStatus: productListings.stockStatus,
        listingStatus: productListings.status,
        sourceUrl: productListings.sourceUrl,
        sourceCode: sources.code,
        sourceName: sources.name,
      })
      .from(canonicalProducts)
      .innerJoin(productListings, eq(productListings.productId, canonicalProducts.id))
      .innerJoin(sources, eq(sources.id, productListings.sourceId))
      .where(and(...filters))
      .orderBy(asc(canonicalProducts.name))
      .limit(limit * 5);

    const products = new Map<string, any>();
    for (const row of rows) {
      let product = products.get(row.productId);
      if (!product) {
        product = {
          id: row.productId,
          name: row.name,
          brand: row.brand,
          model: row.model,
          category: row.category,
          specs: row.specs,
          listings: [],
          bestPrice: null as number | null,
        };
        products.set(row.productId, product);
      }
      const price = row.priceCurrent === null ? null : Number(row.priceCurrent);
      product.listings.push({
        id: row.listingId,
        source: row.sourceCode,
        sourceName: row.sourceName,
        url: row.sourceUrl,
        price,
        priceOriginal: row.priceOriginal === null ? null : Number(row.priceOriginal),
        stockStatus: row.stockStatus,
        status: row.listingStatus,
      });
      if (price !== null && (product.bestPrice === null || price < product.bestPrice)) {
        product.bestPrice = price;
      }
    }

    return { items: [...products.values()].slice(0, limit), total: products.size };
  });

  app.get<{ Params: { id: string } }>("/api/products/:id", async (request, reply) => {
    const { id } = request.params;
    const [product] = await db.select().from(canonicalProducts).where(eq(canonicalProducts.id, id));
    if (!product) return reply.code(404).send({ error: "not_found" });

    const listings = await db
      .select({
        id: productListings.id,
        source: sources.code,
        sourceName: sources.name,
        url: productListings.sourceUrl,
        title: productListings.title,
        priceCurrent: productListings.priceCurrent,
        priceOriginal: productListings.priceOriginal,
        stockStatus: productListings.stockStatus,
        status: productListings.status,
        lastSeenAt: productListings.lastSeenAt,
      })
      .from(productListings)
      .innerJoin(sources, eq(sources.id, productListings.sourceId))
      .where(eq(productListings.productId, id));

    const history = await db
      .select()
      .from(priceHistory)
      .where(
        inArray(
          priceHistory.listingId,
          listings.map((listing) => listing.id),
        ),
      )
      .orderBy(desc(priceHistory.observedAt))
      .limit(200);

    return {
      product,
      listings: listings.map((listing) => ({
        ...listing,
        priceCurrent: listing.priceCurrent === null ? null : Number(listing.priceCurrent),
        priceOriginal: listing.priceOriginal === null ? null : Number(listing.priceOriginal),
        history: history
          .filter((row) => row.listingId === listing.id)
          .map((row) => ({
            price: row.priceCurrent === null ? null : Number(row.priceCurrent),
            stockStatus: row.stockStatus,
            observedAt: row.observedAt,
          })),
      })),
    };
  });

  app.get<{ Querystring: { ids?: string } }>("/api/compare", async (request, reply) => {
    const ids = (request.query.ids ?? "").split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) return reply.code(400).send({ error: "ids_required" });
    if (ids.length > 5) return reply.code(400).send({ error: "too_many_ids" });

    const rows = await db
      .select({
        productId: canonicalProducts.id,
        name: canonicalProducts.name,
        brand: canonicalProducts.brand,
        category: canonicalProducts.category,
        specs: canonicalProducts.specs,
        source: sources.code,
        sourceName: sources.name,
        url: productListings.sourceUrl,
        price: productListings.priceCurrent,
        stockStatus: productListings.stockStatus,
      })
      .from(canonicalProducts)
      .innerJoin(productListings, eq(productListings.productId, canonicalProducts.id))
      .innerJoin(sources, eq(sources.id, productListings.sourceId))
      .where(inArray(canonicalProducts.id, ids));

    const grouped = new Map<string, any>();
    for (const row of rows) {
      let product = grouped.get(row.productId);
      if (!product) {
        product = {
          id: row.productId,
          name: row.name,
          brand: row.brand,
          category: row.category,
          specs: row.specs,
          offers: [],
        };
        grouped.set(row.productId, product);
      }
      product.offers.push({
        source: row.source,
        sourceName: row.sourceName,
        url: row.url,
        price: row.price === null ? null : Number(row.price),
        stockStatus: row.stockStatus,
      });
    }

    // Spec keys present across the selection, for a comparison table.
    const specKeys = [...new Set([...grouped.values()].flatMap((product) => Object.keys(product.specs ?? {})))].sort();
    return { products: [...grouped.values()], specKeys };
  });

  app.get("/api/sources", async () => {
    const rows = await db.select().from(sources).orderBy(asc(sources.code));
    return { items: rows };
  });

  app.get<{ Querystring: { limit?: string } }>("/api/runs", async (request) => {
    const limit = Math.min(Number(request.query.limit ?? 20) || 20, 100);
    const rows = await db
      .select({
        id: scrapeRuns.id,
        source: sources.code,
        status: scrapeRuns.status,
        trigger: scrapeRuns.trigger,
        startedAt: scrapeRuns.startedAt,
        finishedAt: scrapeRuns.finishedAt,
        listingsFound: scrapeRuns.listingsFound,
        listingsNew: scrapeRuns.listingsNew,
        listingsUpdated: scrapeRuns.listingsUpdated,
        errors: scrapeRuns.errors,
      })
      .from(scrapeRuns)
      .innerJoin(sources, eq(sources.id, scrapeRuns.sourceId))
      .orderBy(desc(scrapeRuns.createdAt))
      .limit(limit);
    return { items: rows };
  });

  app.get<{ Querystring: { status?: string } }>("/api/reviews", async (request) => {
    const status = request.query.status ?? "pending";
    const rows = await db.execute(
      sql`select r.id, r.product_id, r.listing_ids, r.method, r.confidence, r.score, r.reason, r.status, r.created_at,
                 c.name as candidate_name, c.brand as candidate_brand
          from dedupe_reviews r
          left join canonical_products c on c.id = r.product_id
          where r.status = ${status}
          order by r.created_at desc
          limit 200`,
    );
    return { items: rows.rows };
  });

  return app;
}
