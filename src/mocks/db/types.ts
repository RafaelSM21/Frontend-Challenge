import type { Cart, Order, Profile, Wallet } from "@/lib/contracts";

// Os tipos do contrato vivem em lib/contracts; o mock apenas os reexporta.
export type { Network, Nft } from "@/lib/contracts";
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
