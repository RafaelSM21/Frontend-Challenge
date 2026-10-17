const ORDER_KEY = "kurio.orders.v1";

export type LocalOrderItem = {
  nftId: string;
  name: string;
  image: string;
  priceEth: string;
  network: string;
  quantity: number;
  available: number;
};

export type LocalOrder = {
  id: string;
  createdAt: string;
  status: "confirmed";
  buyer: { name: string; email: string; wallet: string };
  items: LocalOrderItem[];
  subtotal: number;
  discount: number;
  networkFee: number;
  total: number;
  coupon?: string;
};

export function readOrders(): LocalOrder[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ORDER_KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as LocalOrder[]) : [];
  } catch {
    return [];
  }
}

export function findOrder(id: string) {
  return readOrders().find((order) => order.id === id);
}

export function saveOrder(order: LocalOrder) {
  localStorage.setItem(ORDER_KEY, JSON.stringify([order, ...readOrders()]));
}
