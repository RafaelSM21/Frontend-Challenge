export type CartItem = {
  nftId: string;
  name: string;
  image: string;
  priceEth: string;
  network: string;
  quantity: number;
  available: number;
};

export type Order = {
  id: string;
  createdAt: string;
  status: "confirmed";
  buyer: { name: string; email: string; wallet: string };
  items: CartItem[];
  subtotal: number;
  discount: number;
  networkFee: number;
  total: number;
  coupon?: string;
};

const CART_KEY = "kurio.cart.v1";
const ORDER_KEY = "kurio.orders.v1";

export function readCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter(
          (item): item is CartItem =>
            item &&
            typeof item.nftId === "string" &&
            typeof item.quantity === "number",
        )
      : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("kurio:cart-change"));
}

export function addCartItem(item: CartItem) {
  const cart = readCart();
  const current = cart.find((entry) => entry.nftId === item.nftId);
  if (current)
    current.quantity = Math.min(
      current.available,
      current.quantity + item.quantity,
    );
  else cart.push(item);
  writeCart(cart);
}

export function readOrders(): Order[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ORDER_KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as Order[]) : [];
  } catch {
    return [];
  }
}

export function findOrder(id: string) {
  return readOrders().find((order) => order.id === id);
}

export function saveOrder(order: Order) {
  localStorage.setItem(ORDER_KEY, JSON.stringify([order, ...readOrders()]));
}
