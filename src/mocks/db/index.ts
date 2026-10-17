import { nftFixtures } from "../fixtures/nfts";
import { userFixtures } from "../fixtures/users";
import type { Nft, MockUser } from "./types";
import {
  catalogCategories,
  type CartInput,
  type Order,
  type Profile,
  type Wallet,
} from "@/lib/contracts";

const STORAGE_KEY = "kurio.mock-db.v1";
interface MockDatabase {
  nfts: Nft[];
  users: MockUser[];
}
let databaseNeedsPersist = false;
const fixtureNftsById = new Map(nftFixtures.map((nft) => [nft.id, nft]));

function freshDatabase(): MockDatabase {
  return {
    nfts: structuredClone(nftFixtures),
    users: structuredClone(userFixtures),
  };
}
function loadDatabase(): MockDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDatabase;
      if (
        Array.isArray(parsed.nfts) &&
        Array.isArray(parsed.users) &&
        parsed.users.every(
          (user) =>
            typeof user.passwordHash === "string" &&
            user.profile &&
            Array.isArray(user.wallets) &&
            user.cart &&
            Array.isArray(user.orders),
        )
      ) {
        const savedNfts = parsed.nfts.map((nft, index) => {
          const fixture = fixtureNftsById.get(nft.id);
          const category =
            fixture?.category ??
            nft.category ??
            catalogCategories[index % catalogCategories.length]!.value;
          if (nft.category !== category) databaseNeedsPersist = true;
          const image = fixture?.image ?? nft.image;
          if (nft.image !== image) databaseNeedsPersist = true;
          return { ...fixture, ...nft, category, image };
        });
        const savedIds = new Set(savedNfts.map((nft) => nft.id));
        const missingNfts = nftFixtures.filter((nft) => !savedIds.has(nft.id));
        if (missingNfts.length) databaseNeedsPersist = true;
        const users = parsed.users.map((user) => ({
          ...user,
          orders: user.orders.map((order) => {
            if (Number.isInteger(order.version) && order.version > 0)
              return order;
            databaseNeedsPersist = true;
            return { ...order, version: 1 };
          }),
        }));
        return { ...parsed, users, nfts: [...savedNfts, ...missingNfts] };
      }
    }
  } catch {
    /* Storage corrompido: restaura fixtures conhecidas. */
  }
  return freshDatabase();
}
let database = loadDatabase();
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  } catch {
    /* Memória continua funcional sem storage. */
  }
}
if (databaseNeedsPersist) {
  persist();
  databaseNeedsPersist = false;
}
export const db = {
  listNfts: () => database.nfts,
  getNft: (id: string) => database.nfts.find((nft) => nft.id === id),
  updateNft: (
    id: string,
    update: Partial<Pick<Nft, "priceEth" | "available">>,
  ) => {
    const nft = database.nfts.find((item) => item.id === id);
    if (!nft) return undefined;
    Object.assign(nft, update, { version: nft.version + 1 });
    persist();
    return nft;
  },
  listUsers: () => database.users,
  addUser: (user: MockUser) => {
    database.users.push(user);
    persist();
    return user;
  },
  getUser: (id: string) => database.users.find((user) => user.id === id),
  updateProfile: (userId: string, profile: Profile) => {
    const user = database.users.find((item) => item.id === userId);
    if (!user) return undefined;
    user.profile = profile;
    user.name = profile.displayName;
    user.email = profile.email;
    user.avatar = profile.avatar ?? "";
    persist();
    return user.profile;
  },
  updatePasswordHash: (userId: string, passwordHash: string) => {
    const user = database.users.find((item) => item.id === userId);
    if (!user) return false;
    user.passwordHash = passwordHash;
    persist();
    return true;
  },
  listWallets: (userId: string) =>
    database.users.find((item) => item.id === userId)?.wallets ?? [],
  saveWallet: (userId: string, wallet: Wallet) => {
    const user = database.users.find((item) => item.id === userId);
    if (!user) return undefined;
    const index = user.wallets.findIndex((item) => item.id === wallet.id);
    if (index >= 0) user.wallets[index] = wallet;
    else user.wallets.push(wallet);
    persist();
    return wallet;
  },
  removeWallet: (userId: string, walletId: string) => {
    const user = database.users.find((item) => item.id === userId);
    if (!user) return false;
    const before = user.wallets.length;
    user.wallets = user.wallets.filter((wallet) => wallet.id !== walletId);
    persist();
    return user.wallets.length !== before;
  },
  getCart: (userId: string) =>
    database.users.find((item) => item.id === userId)?.cart,
  saveCart: (userId: string, cart: CartInput) => {
    const user = database.users.find((item) => item.id === userId);
    if (!user) return undefined;
    user.cart = { ...cart, version: user.cart.version + 1 };
    persist();
    return user.cart;
  },
  addOrder: (userId: string, order: Order) => {
    const user = database.users.find((item) => item.id === userId);
    if (!user) return undefined;
    user.orders.unshift(order);
    persist();
    return order;
  },
  updateOrderStatus: (
    userId: string,
    id: string,
    status: Order["status"],
  ) => {
    const order = database.users
      .find((item) => item.id === userId)
      ?.orders.find((item) => item.id === id);
    if (!order || order.status !== "pending") return undefined;
    order.status = status;
    order.version += 1;
    persist();
    return order;
  },
  getOrder: (userId: string, id: string) =>
    database.users
      .find((item) => item.id === userId)
      ?.orders.find((item) => item.id === id),
  setFavorite: (userId: string, nftId: string, enabled: boolean) => {
    const user = database.users.find((item) => item.id === userId);
    if (!user) return undefined;
    user.favorites = enabled
      ? [...new Set([...user.favorites, nftId])]
      : user.favorites.filter((item) => item !== nftId);
    persist();
    return user.favorites;
  },
  reset: () => {
    database = freshDatabase();
    persist();
    return database;
  },
  persist,
};
