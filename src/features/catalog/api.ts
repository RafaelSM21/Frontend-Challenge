import { http } from "@/lib/http";
import type { CatalogCategory, Network, Nft } from "@/lib/contracts";
import type { CatalogSearch } from "./search";

export type CatalogResponse = {
  items: Nft[];
  pagination: { page: number; pageSize: number; total: number; pages: number };
  facets: {
    categories: Array<{ value: CatalogCategory; count: number }>;
    networks: Array<{ value: Network; count: number }>;
  };
};

export type MarketCollection = {
  name: string;
  creators: string[];
  categories: CatalogCategory[];
  networks: Network[];
  images: string[];
  nftCount: number;
  newestAt: string;
};

export type MarketCreator = {
  name: string;
  collections: string[];
  categories: CatalogCategory[];
  networks: Network[];
  avatar?: string;
  nftCount: number;
  newestAt: string;
};

export async function searchCatalog(
  search: CatalogSearch,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  if (search.q) params.set("q", search.q);
  if (search.criador) params.set("criador", search.criador);
  search.colecao?.forEach((value) => params.append("colecao", value));
  search.categoria?.forEach((value) => params.append("categoria", value));
  search.rede?.forEach((value) => params.append("rede", value));
  if (search.precoMin) params.set("precoMin", search.precoMin);
  if (search.precoMax) params.set("precoMax", search.precoMax);
  params.set("ordenar", search.ordenar ?? "recentes");
  params.set("pagina", String(search.pagina ?? 1));
  params.set("limite", "12");
  return (
    await http.get<CatalogResponse>(`/nfts?${params.toString()}`, { signal })
  ).data;
}

async function getAllCatalogNfts(signal?: AbortSignal) {
  const pageSize = 60;
  const firstPage = (
    await http.get<CatalogResponse>(
      `/nfts?pagina=1&limite=${pageSize}&ordenar=recentes`,
      { signal },
    )
  ).data;
  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.pagination.pages - 1 }, (_, index) =>
      http.get<CatalogResponse>(
        `/nfts?pagina=${index + 2}&limite=${pageSize}&ordenar=recentes`,
        { signal },
      ),
    ),
  );
  return [
    ...firstPage.items,
    ...remainingPages.flatMap((response) => response.data.items),
  ];
}

export async function getMarketCollections(signal?: AbortSignal) {
  const nfts = await getAllCatalogNfts(signal);
  const collectionMap = new Map<
    string,
    {
      creators: Set<string>;
      categories: Set<CatalogCategory>;
      networks: Set<Network>;
      images: Set<string>;
      nftCount: number;
      newestAt: string;
    }
  >();

  for (const nft of nfts) {
    const collection = collectionMap.get(nft.collection) ?? {
      creators: new Set<string>(),
      categories: new Set<CatalogCategory>(),
      networks: new Set<Network>(),
      images: new Set<string>(),
      nftCount: 0,
      newestAt: nft.createdAt,
    };
    collection.creators.add(nft.creator);
    collection.categories.add(nft.category);
    collection.networks.add(nft.network);
    collection.images.add(nft.image);
    collection.nftCount += 1;
    if (nft.createdAt > collection.newestAt) collection.newestAt = nft.createdAt;
    collectionMap.set(nft.collection, collection);
  }

  return Array.from(collectionMap, ([name, collection]): MarketCollection => ({
    name,
    creators: Array.from(collection.creators).sort(),
    categories: Array.from(collection.categories),
    networks: Array.from(collection.networks),
    images: Array.from(collection.images).slice(0, 4),
    nftCount: collection.nftCount,
    newestAt: collection.newestAt,
  }));
}

export async function getMarketCreators(signal?: AbortSignal) {
  const [nfts, avatarResponse] = await Promise.all([
    getAllCatalogNfts(signal),
    http.get<{ avatars: Array<{ creator: string; avatar: string }> }>(
      "/creator-avatars",
      { signal },
    ),
  ]);
  const avatars = new Map(
    avatarResponse.data.avatars.map(({ creator, avatar }) => [
      creator.toLocaleLowerCase(),
      avatar,
    ]),
  );
  const creatorMap = new Map<
    string,
    {
      collections: Set<string>;
      categories: Set<CatalogCategory>;
      networks: Set<Network>;
      nftCount: number;
      newestAt: string;
    }
  >();

  for (const nft of nfts) {
    const creator = creatorMap.get(nft.creator) ?? {
      collections: new Set<string>(),
      categories: new Set<CatalogCategory>(),
      networks: new Set<Network>(),
      nftCount: 0,
      newestAt: nft.createdAt,
    };
    creator.collections.add(nft.collection);
    creator.categories.add(nft.category);
    creator.networks.add(nft.network);
    creator.nftCount += 1;
    if (nft.createdAt > creator.newestAt) creator.newestAt = nft.createdAt;
    creatorMap.set(nft.creator, creator);
  }

  return Array.from(creatorMap, ([name, creator]): MarketCreator => ({
    name,
    collections: Array.from(creator.collections).sort(),
    categories: Array.from(creator.categories),
    networks: Array.from(creator.networks),
    avatar: avatars.get(name.toLocaleLowerCase()),
    nftCount: creator.nftCount,
    newestAt: creator.newestAt,
  }));
}
