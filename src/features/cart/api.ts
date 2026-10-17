import { http } from "@/lib/http";
import type { Cart, CartInput, CartViewItem, Quote } from "@/lib/contracts";

export type CartResponse = { cart: Cart; items: CartViewItem[] };

export async function getCart() {
  return (await http.get<CartResponse>("/cart")).data;
}

export async function updateCart(input: CartInput) {
  return (await http.put<CartResponse>("/cart", input)).data;
}

export async function applyCartCoupon(code: string) {
  return (await http.post<CartResponse>("/cart/coupon", { code })).data;
}

export async function removeCartCoupon() {
  return (await http.delete<CartResponse>("/cart/coupon")).data;
}

export async function getCartQuote() {
  return (await http.post<{ quote: Quote }>("/checkout/quote")).data.quote;
}

export async function addNftToServerCart(nftId: string, quantity: number) {
  const current = (await http.get<{ cart: Cart }>("/cart")).data.cart;
  const existing = current.items.find((item) => item.nftId === nftId);
  const items = existing
    ? current.items.map((item) =>
        item.nftId === nftId
          ? { ...item, quantity: item.quantity + quantity }
          : item,
      )
    : [...current.items, { nftId, quantity }];
  await http.put("/cart", { items, coupon: current.coupon });
}
