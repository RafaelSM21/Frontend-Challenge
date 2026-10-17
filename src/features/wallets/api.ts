import { http } from "@/lib/http";
import type { SaveWalletInput, Wallet } from "@/lib/contracts";

export async function getWallets() {
  return (await http.get<{ items: Wallet[] }>("/wallets")).data.items;
}

export async function saveWallet(
  input: SaveWalletInput,
  walletId: string | null,
) {
  if (walletId)
    return (await http.patch<{ item: Wallet }>(`/wallets/${walletId}`, input))
      .data.item;
  return (await http.post<{ item: Wallet }>("/wallets", input)).data.item;
}

export async function deleteWallet(walletId: string) {
  await http.delete(`/wallets/${walletId}`);
  return walletId;
}
