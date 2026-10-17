import { http } from "@/lib/http";
import type { Nft } from "@/mocks/db/types";

export async function getNftDetails(nftId: string, signal?: AbortSignal) {
  return (await http.get<{ item: Nft }>(`/nfts/${nftId}`, { signal })).data
    .item;
}

export async function getRelatedNfts(signal?: AbortSignal) {
  return (
    await http.get<{ items: Nft[] }>("/nfts?limite=8&ordenar=recentes", {
      signal,
    })
  ).data.items;
}
