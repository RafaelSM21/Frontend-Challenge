import { http } from "@/lib/http";

export async function getFavoriteIds() {
  return (await http.get<{ items: string[] }>("/favorites")).data.items;
}

export async function setFavorite(nftId: string, favorite: boolean) {
  if (favorite)
    return (await http.put<{ items: string[] }>(`/favorites/${nftId}`)).data
      .items;
  return (await http.delete<{ items: string[] }>(`/favorites/${nftId}`)).data
    .items;
}
