/** Shared transport contracts. MSW handlers and UI consume these types. */
export type Network = "ethereum" | "polygon" | "solana";
export const catalogCategories = [
  { value: "arte-digital", label: "Arte digital" },
  { value: "fotografia", label: "Fotografia" },
  { value: "musica", label: "Música" },
  { value: "arte-3d", label: "Arte 3D" },
  { value: "colecionaveis", label: "Colecionáveis" },
  { value: "generativa", label: "Generativa" },
  { value: "jogos", label: "Jogos" },
  { value: "assinaturas", label: "Assinaturas" },
  { value: "utilidade", label: "Utilidade" },
] as const;
export type CatalogCategory = (typeof catalogCategories)[number]["value"];

export type ApiError = {
  error: { code: string; message: string; fields?: Record<string, string> };
};
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
};
export type SessionResponse = {
  user: PublicUser;
  token: string;
  expiresAt: string;
};

export type Profile = {
  displayName: string;
  username: string;
  email: string;
  ens: string;
  walletAlias: string;
  avatar?: string;
};
export type UpdateProfileInput = Omit<Profile, "avatar"> & { avatar?: string };
export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type Wallet = {
  id: string;
  displayName: string;
  alias: string;
  network: Network;
  profileName: string;
  address: string;
  type: "self-custody" | "hardware" | "exchange";
  ens?: string;
  connected: boolean;
};
export type SaveWalletInput = Omit<Wallet, "id" | "connected">;
export type ConnectWalletInput = { approved: boolean };

export type CartItem = { nftId: string; quantity: number };
export type Cart = { items: CartItem[]; coupon?: string; version: number };
export type CartInput = Omit<Cart, "version">;
export type CartViewItem = CartItem & {
  name: string;
  image: string;
  priceEth: string;
  network: Network;
  available: number;
};
export type Quote = {
  quoteId: string;
  cartVersion: number;
  subtotalEth: string;
  discountEth: string;
  networkFeeEth: string;
  totalEth: string;
  coupon?: string;
  expiresAt: string;
};
export type OrderStatus = "pending" | "confirmed" | "declined";
export type CreateOrderInput = { quoteId: string; walletId: string };
export type Order = {
  id: string;
  status: OrderStatus;
  version: number;
  createdAt: string;
  transactionRef: string;
  quote: Quote;
  items: Array<
    CartItem & {
      name: string;
      image: string;
      priceEth: string;
      network: Network;
    }
  >;
  walletAddress: string;
  walletNetwork: Network;
};

export const apiErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: ApiError } })?.response?.data?.error
    ?.message ?? fallback;
