import type { Cart, Order, Profile, Wallet } from "@/lib/contracts";
import type { CatalogCategory } from "@/lib/contracts";
export type Network = "ethereum" | "polygon" | "solana";
export interface Nft {
  id: string;
  name: string;
  collection: string;
  category: CatalogCategory;
  creator: string;
  description: string;
  image: string;
  priceEth: string;
  network: Network;
  edition: number;
  available: number;
  createdAt: string;
  traits: { traitType: string; value: string }[];
  version: number;
}
export interface MockUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatar: string;
  favorites: string[];
  profile: Profile;
  wallets: Wallet[];
  cart: Cart;
  orders: Order[];
}
