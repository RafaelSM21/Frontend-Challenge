import { http } from "@/lib/http";
import type { CreateOrderInput, Order, Quote, Wallet } from "@/lib/contracts";
import type { CartResponse } from "@/features/cart/api";

export async function getCheckoutCart() {
  return (await http.get<CartResponse>("/cart")).data;
}

export async function getCheckoutWallets() {
  return (await http.get<{ items: Wallet[] }>("/wallets")).data.items;
}

export async function createCheckoutQuote() {
  return (await http.post<{ quote: Quote }>("/checkout/quote")).data.quote;
}

export async function connectCheckoutWallet(
  walletId: string,
  approved: boolean,
) {
  return (
    await http.post<{ item: Wallet }>(`/wallets/${walletId}/connect`, {
      approved,
    })
  ).data.item;
}

export async function disconnectCheckoutWallet(walletId: string) {
  return (await http.delete<{ item: Wallet }>(`/wallets/${walletId}/connect`))
    .data.item;
}

export async function createOrder(
  input: CreateOrderInput,
  idempotencyKey: string,
) {
  return (
    await http.post<{ order: Order }>("/orders", input, {
      headers: { "Idempotency-Key": idempotencyKey },
    })
  ).data.order;
}
