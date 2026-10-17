import type { MockUser } from "../db/types";

export const userFixtures: MockUser[] = [
  {
    id: "user-001",
    name: "Rafael Soares",
    email: "rafael@example.com",
    passwordHash: "b9ead502",
    avatar: "",
    favorites: ["nft-001", "nft-005"],
    profile: {
      displayName: "Rafael Soares",
      username: "rafael",
      email: "rafael@example.com",
      ens: "",
      walletAlias: "",
    },
    wallets: [],
    cart: { items: [], version: 1 },
    orders: [],
  },
  {
    id: "user-002",
    name: "Marina Costa",
    email: "marina@example.com",
    passwordHash: "b9ead502",
    avatar: "",
    favorites: ["nft-003", "nft-008"],
    profile: {
      displayName: "Marina Costa",
      username: "marina",
      email: "marina@example.com",
      ens: "",
      walletAlias: "",
    },
    wallets: [],
    cart: { items: [], version: 1 },
    orders: [],
  },
];
