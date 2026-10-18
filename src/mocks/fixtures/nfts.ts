import type { Nft, Network } from "../db/types";
import { catalogCategories, type CatalogCategory } from "@/lib/contracts";

const names = [
  "Ape",
  "Astronaut",
  "Cyber Fox",
  "Dreamer",
  "Golden Skull",
  "Pixel Spirit",
  "Neon Samurai",
  "Moon Cat",
  "Void Walker",
  "Chrome Angel",
];
const collections = [
  "KURIO Genesis",
  "Digital Nomads",
  "Neon Society",
  "Dreamscape",
  "Future Relics",
];
const creators = [
  "studio.kurio",
  "rafael.art",
  "pixelmancer",
  "neoarchive",
  "dreamfoundry",
];
const networks: Network[] = ["ethereum", "polygon", "solana"];
const artwork = [
  "/nfts/NFT%20Artwork%2003.webp",
  "/nfts/NFT%20Artwork%2004.webp",
  "/nfts/NFT%20Artwork%2005.webp",
  "/nfts/NFT%20Artwork%2004.webp",
  "/nfts/NFT%20Artwork%2010.webp",
  "/nfts/NFT%20Artwork%2010.webp",
  "/nfts/NFT%20Artwork%2010.webp",
];

const categoryCounts: Record<CatalogCategory, number> = {
  "arte-digital": 33,
  fotografia: 12,
  musica: 65,
  "arte-3d": 39,
  colecionaveis: 23,
  generativa: 17,
  jogos: 19,
  assinaturas: 13,
  utilidade: 18,
};

const fixtureCategories = catalogCategories.flatMap(({ value }) =>
  Array.from({ length: categoryCounts[value] }, () => value),
);

export const nftFixtures: Nft[] = fixtureCategories.map((category, index) => {
  const n = index + 1;
  const name = names[index % names.length]!;
  const collection = collections[index % collections.length]!;
  const network = networks[index % networks.length]!;
  const price = (0.08 + ((index * 17) % 97) / 100).toFixed(2);
  const title = `${name} #${String(n).padStart(3, "0")}`;
  const image = artwork[index % artwork.length]!;
  return {
    id: `nft-${String(n).padStart(3, "0")}`,
    name: title,
    collection,
    category,
    creator: creators[index % creators.length]!,
    description: `${title} é uma peça digital da coleção ${collection}, criada para o universo KURIO. Cada edição tem atributos próprios e disponibilidade simulada para este desafio.`,
    image,
    priceEth: price,
    network,
    edition: 1 + (index % 12),
    editionTotal: Math.max(1 + (index % 12), 1 + (index % 8)),
    available: index % 11 === 0 ? 0 : 1 + (index % 8),
    createdAt: new Date(Date.UTC(2026, 8, 1 + index)).toISOString(),
    traits: [
      {
        traitType: "Background",
        value: ["Sunset", "Midnight", "Forest", "Dawn"][index % 4]!,
      },
      {
        traitType: "Rarity",
        value: ["Common", "Rare", "Epic", "Legendary"][index % 4]!,
      },
    ],
    version: 1,
  };
});
