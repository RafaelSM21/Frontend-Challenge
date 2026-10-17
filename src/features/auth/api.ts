import { http } from "@/lib/http";
import type { CartItem } from "@/features/cart/storage";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
};
export type AuthSessionResponse = {
  user: AuthUser;
  token: string;
  expiresAt: string;
};

export async function registerAccount(input: {
  name: string;
  email: string;
  password: string;
}) {
  return (await http.post<AuthSessionResponse>("/auth/register", input)).data;
}

export async function loginAccount(input: { email: string; password: string }) {
  return (await http.post<AuthSessionResponse>("/auth/login", input)).data;
}

export async function mergeGuestCart(items: CartItem[]) {
  await http.post("/cart/merge", {
    items: items.map(({ nftId, quantity }) => ({ nftId, quantity })),
  });
}
