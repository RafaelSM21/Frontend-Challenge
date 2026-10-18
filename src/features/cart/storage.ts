export type CartItem = {
  nftId: string;
  name: string;
  image: string;
  priceEth: string;
  network: string;
  quantity: number;
  available: number;
  editionNumber?: number;
};

const CART_KEY = "kurio.cart.v1";

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
  const current = cart.find(
    (entry) => entry.nftId === item.nftId && entry.editionNumber === item.editionNumber,
  );
  if (!current) cart.push({ ...item, quantity: Math.max(1, item.quantity) });
  writeCart(cart);
}
