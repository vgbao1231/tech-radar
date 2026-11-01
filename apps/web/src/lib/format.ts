const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Liên hệ";
  return vnd.format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

const CATEGORY_LABELS: Record<string, string> = {
  mechanical_keyboard: "Bàn phím cơ",
  gaming_mouse: "Chuột gaming",
};

export function categoryLabel(category: string | null): string {
  if (!category) return "Khác";
  return CATEGORY_LABELS[category] ?? category;
}

const STOCK_LABELS: Record<string, string> = {
  InStock: "Còn hàng",
  OutOfStock: "Hết hàng",
  PreOrder: "Đặt trước",
  SoldOut: "Hết hàng",
  Discontinued: "Ngừng bán",
};

export function stockLabel(stock: string | null): string {
  if (!stock) return "Không rõ";
  return STOCK_LABELS[stock] ?? stock;
}

const SOURCE_STATUS_LABELS: Record<string, string> = {
  unknown: "Chưa khảo sát",
  investigated: "Đã khảo sát",
  technically_tested: "Đã test kỹ thuật",
  approved_for_use: "Được phép dùng",
  blocked: "Bị chặn",
};

export function sourceStatusLabel(status: string): string {
  return SOURCE_STATUS_LABELS[status] ?? status;
}
