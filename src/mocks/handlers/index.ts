import { http, HttpResponse, delay } from "msw";
import { db } from "../db";
import { readScenario } from "../scenarios";
import {
  catalogCategories,
  type Network,
  type Profile,
  type SaveWalletInput,
  type Wallet,
} from "@/lib/contracts";
import type { Cart, CartViewItem, Order, Quote } from "@/lib/contracts";
import Decimal from "decimal.js";
import {
  disconnectSocketClients,
  emitNftEvent,
  emitNftUpdated,
  emitOrderEvent,
  emitOrderUpdated,
} from "../socket";

const error = (status: number, code: string, message: string) =>
  HttpResponse.json({ error: { code, message } }, { status });
const sessionUser = (request: Request) => {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const userId = token?.replace("mock-token-", "");
  return userId ? db.getUser(userId) : undefined;
};
const hashPassword = (value: string) => {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};
const publicUser = (user: NonNullable<ReturnType<typeof db.getUser>>) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
});
const authenticated = (request: Request) => {
  if (readScenario() === "session-expired") return undefined;
  return sessionUser(request);
};
const quoteCart = (userId: string): Quote | undefined => {
  const cart = db.getCart(userId);
  if (!cart) return undefined;
  const subtotal = cart.items.reduce(
    (sum, item) =>
      sum.plus(
        new Decimal(db.getNft(item.nftId)?.priceEth ?? "0").times(
          item.quantity,
        ),
      ),
    new Decimal(0),
  );
  const discount =
    cart.coupon === "KURIO10" ? subtotal.times("0.10") : new Decimal(0);
  const fee = cart.items.length ? new Decimal("0.008") : new Decimal(0);
  const pricingVersion = cart.items
    .map(
      (item) =>
        `${item.nftId}:${item.editionNumber ?? "default"}:${db.getNft(item.nftId)?.version ?? 0}`,
    )
    .join("|");
  return {
    quoteId: `quote-${userId}-${cart.version}-${pricingVersion}`,
    cartVersion: cart.version,
    subtotalEth: subtotal.toFixed(),
    discountEth: discount.toFixed(),
    networkFeeEth: fee.toFixed(),
    totalEth: subtotal.minus(discount).plus(fee).toFixed(),
    coupon: cart.coupon,
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  };
};
const cartItems = (cart: Cart): CartViewItem[] =>
  cart.items.flatMap((item) => {
    const nft = db.getNft(item.nftId);
    return nft
      ? [
          {
            ...item,
            name: nft.name,
            image: nft.image,
            priceEth: nft.priceEth,
            network: nft.network,
            available: nft.available,
          },
        ]
      : [];
  });

export const handlers = [
  http.get("/api/health", () =>
    HttpResponse.json({ status: "ok", mocks: true }),
  ),

  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };
    const email = body.email?.trim().toLocaleLowerCase();
    const user = db
      .listUsers()
      .find(
        (item) =>
          item.email.toLocaleLowerCase() === email &&
          item.passwordHash === hashPassword(body.password ?? ""),
      );
    if (!user)
      return error(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos.");
    return HttpResponse.json({
      user: publicUser(user),
      token: `mock-token-${user.id}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  }),

  http.post("/api/auth/register", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      password?: string;
    };
    const name = body.name?.trim();
    const email = body.email?.trim().toLocaleLowerCase();
    const password = body.password ?? "";
    if (
      !name ||
      !email ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      password.length < 8
    ) {
      return error(
        400,
        "INVALID_INPUT",
        "Informe um nome, e-mail válido e senha com pelo menos 8 caracteres.",
      );
    }
    if (db.listUsers().some((user) => user.email.toLocaleLowerCase() === email))
      return error(409, "EMAIL_EXISTS", "Já existe uma conta com este e-mail.");
    const user = {
      id: `user-${String(Date.now())}`,
      name,
      email,
      passwordHash: hashPassword(password),
      avatar: "",
      favorites: [] as string[],
      profile: {
        displayName: name,
        username: name.toLocaleLowerCase().replace(/\s+/g, "-"),
        email,
        ens: "",
        walletAlias: "",
      },
      wallets: [],
      cart: { items: [], version: 1 },
      orders: [],
    };
    db.addUser(user);
    return HttpResponse.json(
      {
        user: publicUser(user),
        token: `mock-token-${user.id}`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
      { status: 201 },
    );
  }),

  http.get("/api/auth/session", ({ request }) => {
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    return HttpResponse.json({
      user: publicUser(user),
      token: `mock-token-${user.id}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  }),

  http.post("/api/auth/logout", () => new HttpResponse(null, { status: 204 })),

  http.get("/api/profile", ({ request }) => {
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    return HttpResponse.json({ profile: user.profile });
  }),

  http.patch("/api/profile", async ({ request }) => {
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    const input = (await request.json().catch(() => ({}))) as Partial<Profile>;
    if (
      !input.displayName?.trim() ||
      !input.username?.trim() ||
      !input.email ||
      !/^\S+@\S+\.\S+$/.test(input.email)
    )
      return error(
        400,
        "INVALID_PROFILE",
        "Preencha nome, usuário e um e-mail válido.",
      );
    if (
      db
        .listUsers()
        .some(
          (item) =>
            item.id !== user.id &&
            item.email.toLocaleLowerCase() === input.email?.toLocaleLowerCase(),
        )
    )
      return error(409, "EMAIL_EXISTS", "Este e-mail já está em uso.");
    const profile: Profile = {
      ...user.profile,
      ...input,
      displayName: input.displayName.trim(),
      username: input.username.trim(),
      email: input.email.trim().toLocaleLowerCase(),
    };
    return HttpResponse.json({ profile: db.updateProfile(user.id, profile) });
  }),

  http.post("/api/profile/password", async ({ request }) => {
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    const input = (await request.json().catch(() => ({}))) as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (hashPassword(input.currentPassword ?? "") !== user.passwordHash)
      return error(400, "INVALID_PASSWORD", "A senha atual está incorreta.");
    if (!input.newPassword || input.newPassword.length < 8)
      return error(
        400,
        "INVALID_PASSWORD",
        "A nova senha deve ter pelo menos 8 caracteres.",
      );
    db.updatePasswordHash(user.id, hashPassword(input.newPassword));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/wallets", ({ request }) => {
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    return HttpResponse.json({ items: db.listWallets(user.id) });
  }),

  http.post("/api/wallets", async ({ request }) => {
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    const input = (await request
      .json()
      .catch(() => ({}))) as Partial<SaveWalletInput>;
    if (
      !input.displayName ||
      !input.alias ||
      !input.network ||
      !input.profileName ||
      !input.address ||
      !input.type
    )
      return error(
        400,
        "INVALID_WALLET",
        "Preencha todos os campos obrigatórios da carteira.",
      );
    if (!/^(0x[a-fA-F0-9]{8,}|[1-9A-HJ-NP-Za-km-z]{16,})$/.test(input.address))
      return error(
        400,
        "INVALID_WALLET_ADDRESS",
        "Informe um endereço de carteira válido.",
      );
    if (
      db
        .listWallets(user.id)
        .some(
          (wallet) =>
            wallet.address.toLocaleLowerCase() ===
            input.address?.toLocaleLowerCase(),
        )
    )
      return error(409, "WALLET_EXISTS", "Esta carteira já está cadastrada.");
    const wallet: Wallet = {
      id: `wallet-${Date.now()}`,
      connected: false,
      displayName: input.displayName,
      alias: input.alias,
      network: input.network,
      profileName: input.profileName,
      address: input.address,
      type: input.type,
      ens: input.ens,
    };
    return HttpResponse.json(
      { item: db.saveWallet(user.id, wallet) },
      { status: 201 },
    );
  }),

  http.patch("/api/wallets/:walletId", async ({ request, params }) => {
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    const existing = db
      .listWallets(user.id)
      .find((wallet) => wallet.id === String(params.walletId));
    if (!existing)
      return error(404, "WALLET_NOT_FOUND", "Carteira não encontrada.");
    const input = (await request.json().catch(() => ({}))) as Partial<Wallet>;
    return HttpResponse.json({
      item: db.saveWallet(user.id, { ...existing, ...input, id: existing.id }),
    });
  }),

  http.delete("/api/wallets/:walletId", ({ request, params }) => {
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    return db.removeWallet(user.id, String(params.walletId))
      ? new HttpResponse(null, { status: 204 })
      : error(404, "WALLET_NOT_FOUND", "Carteira não encontrada.");
  }),

  http.post("/api/wallets/:walletId/connect", async ({ request, params }) => {
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    const wallet = db
      .listWallets(user.id)
      .find((item) => item.id === String(params.walletId));
    if (!wallet)
      return error(404, "WALLET_NOT_FOUND", "Carteira não encontrada.");
    const input = (await request.json().catch(() => ({}))) as {
      approved?: boolean;
    };
    if (input.approved === false)
      return error(
        400,
        "WALLET_CONNECTION_REJECTED",
        "A conexão com a carteira foi recusada.",
      );
    return HttpResponse.json({
      item: db.saveWallet(user.id, { ...wallet, connected: true }),
    });
  }),

  http.delete("/api/wallets/:walletId/connect", ({ request, params }) => {
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    const wallet = db
      .listWallets(user.id)
      .find((item) => item.id === String(params.walletId));
    if (!wallet)
      return error(404, "WALLET_NOT_FOUND", "Carteira não encontrada.");
    return HttpResponse.json({
      item: db.saveWallet(user.id, { ...wallet, connected: false }),
    });
  }),

  http.get("/api/cart", async ({ request }) => {
    if (readScenario() === "slow-network") await delay(1200);
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    const cart = db.getCart(user.id);
    return HttpResponse.json({ cart, items: cart ? cartItems(cart) : [] });
  }),

  http.put("/api/cart", async ({ request }) => {
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    const input = (await request.json().catch(() => ({}))) as Partial<Cart>;
    const items = input.items ?? [];
    if (
      !Array.isArray(items) ||
      items.some(
        (item) =>
          !item ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          (item.editionNumber !== undefined &&
            (!Number.isInteger(item.editionNumber) || item.editionNumber < 1)),
      )
    )
      return error(400, "INVALID_CART", "Carrinho inválido.");
    const editionKeys = items
      .filter((item) => item.editionNumber !== undefined)
      .map((item) => `${item.nftId}:${item.editionNumber}`);
    if (new Set(editionKeys).size !== editionKeys.length)
      return error(
        409,
        "EDITION_DUPLICATE",
        "Esta edição já está no carrinho.",
      );
    const totalsByNft = new Map<string, number>();
    for (const item of items)
      totalsByNft.set(
        item.nftId,
        (totalsByNft.get(item.nftId) ?? 0) + item.quantity,
      );
    for (const [nftId, quantity] of totalsByNft) {
      const nft = db.getNft(nftId);
      if (nft && quantity > nft.available)
        return error(
          409,
          "AVAILABILITY_CONFLICT",
          `A edição ${nft.name} não possui estoque suficiente.`,
        );
    }
    for (const item of items) {
      const nft = db.getNft(item.nftId);
      if (!nft) return error(404, "NFT_NOT_FOUND", "Uma obra não existe mais.");
      if (
        item.editionNumber !== undefined &&
        item.editionNumber > nft.editionTotal
      )
        return error(
          400,
          "INVALID_EDITION",
          "A edição selecionada não existe.",
        );
      if (item.quantity > nft.available)
        return error(
          409,
          "AVAILABILITY_CONFLICT",
          `A edição ${nft.name} não possui estoque suficiente.`,
        );
    }
    const cart = db.saveCart(user.id, { items, coupon: input.coupon });
    return HttpResponse.json({ cart, items: cart ? cartItems(cart) : [] });
  }),

  http.post("/api/cart/merge", async ({ request }) => {
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    const input = (await request.json().catch(() => ({}))) as {
      items?: Cart["items"];
    };
    const current = db.getCart(user.id)!;
    const byEdition = new Map(
      current.items.map((item) => [
        `${item.nftId}:${item.editionNumber ?? "default"}`,
        item,
      ]),
    );
    for (const item of input.items ?? []) {
      const key = `${item.nftId}:${item.editionNumber ?? "default"}`;
      if (!byEdition.has(key)) byEdition.set(key, { ...item, quantity: 1 });
    }
    const items = [...byEdition.values()];
    for (const item of items) {
      const nft = db.getNft(item.nftId);
      if (
        !nft ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > nft.available ||
        (item.editionNumber !== undefined &&
          (!Number.isInteger(item.editionNumber) ||
            item.editionNumber < 1 ||
            item.editionNumber > nft.editionTotal))
      )
        return error(
          409,
          "AVAILABILITY_CONFLICT",
          "Não foi possível combinar o carrinho por falta de disponibilidade.",
        );
    }
    const cart = db.saveCart(user.id, { items, coupon: current.coupon })!;
    return HttpResponse.json({ cart, items: cartItems(cart) });
  }),

  http.post("/api/cart/coupon", async ({ request }) => {
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const code = body.code?.trim().toUpperCase();
    if (code !== "KURIO10")
      return error(
        400,
        code === "EXPIRADO" ? "COUPON_EXPIRED" : "INVALID_COUPON",
        code === "EXPIRADO" ? "Este cupom expirou." : "Cupom inválido.",
      );
    const cart = db.getCart(user.id);
    if (!cart) return error(404, "CART_NOT_FOUND", "Carrinho não encontrado.");
    const saved = db.saveCart(user.id, { ...cart, coupon: code });
    return HttpResponse.json({
      cart: saved,
      items: saved ? cartItems(saved) : [],
    });
  }),

  http.delete("/api/cart/coupon", ({ request }) => {
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    const cart = db.getCart(user.id);
    if (!cart) return error(404, "CART_NOT_FOUND", "Carrinho não encontrado.");
    const saved = db.saveCart(user.id, { ...cart, coupon: undefined });
    return HttpResponse.json({
      cart: saved,
      items: saved ? cartItems(saved) : [],
    });
  }),

  http.post("/api/checkout/quote", async ({ request }) => {
    if (readScenario() === "slow-network") await delay(1200);
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    const quote = quoteCart(user.id);
    return quote
      ? HttpResponse.json({ quote })
      : error(404, "CART_NOT_FOUND", "Carrinho não encontrado.");
  }),

  http.post("/api/orders", async ({ request }) => {
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    const key = request.headers.get("idempotency-key");
    const body = (await request.json().catch(() => ({}))) as {
      quoteId?: string;
      walletId?: string;
    };
    if (!key)
      return error(
        400,
        "MISSING_IDEMPOTENCY_KEY",
        "A chave de idempotência é obrigatória.",
      );
    const existing = user.orders.find((order) => order.transactionRef === key);
    if (existing) {
      const wallet = db
        .listWallets(user.id)
        .find((item) => item.id === body.walletId);
      if (
        existing.quote.quoteId !== body.quoteId ||
        existing.walletAddress !== wallet?.address
      )
        return error(
          409,
          "IDEMPOTENCY_CONFLICT",
          "Esta chave de idempotência já foi usada para outro pedido.",
        );
      return HttpResponse.json({ order: existing });
    }
    const quote = quoteCart(user.id);
    if (!quote || quote.quoteId !== body.quoteId)
      return error(
        409,
        "QUOTE_OUTDATED",
        "A cotação mudou. Revise o pedido antes de confirmar.",
      );
    const wallet = db
      .listWallets(user.id)
      .find((item) => item.id === body.walletId);
    if (!wallet)
      return error(400, "INVALID_WALLET", "Selecione uma carteira cadastrada.");
    if (!wallet.connected)
      return error(
        409,
        "WALLET_NOT_CONNECTED",
        "Conecte a carteira selecionada antes de confirmar.",
      );
    const cart = db.getCart(user.id)!;
    const items = cart.items.map((item) => {
      const nft = db.getNft(item.nftId)!;
      return {
        ...item,
        name: nft.name,
        image: nft.image,
        priceEth: nft.priceEth,
        network: nft.network,
      };
    });
    if (readScenario() === "stock-conflict" && cart.items[0]) {
      const changed = db.updateNft(cart.items[0].nftId, { available: 0 });
      if (changed) emitNftUpdated(changed);
    }
    const selectedEditionKeys = cart.items
      .filter((item) => item.editionNumber !== undefined)
      .map((item) => `${item.nftId}:${item.editionNumber}`);
    if (new Set(selectedEditionKeys).size !== selectedEditionKeys.length)
      return error(
        409,
        "EDITION_DUPLICATE",
        "Uma edição foi selecionada mais de uma vez.",
      );
    const orderTotalsByNft = new Map<string, number>();
    for (const item of cart.items)
      orderTotalsByNft.set(
        item.nftId,
        (orderTotalsByNft.get(item.nftId) ?? 0) + item.quantity,
      );
    for (const [nftId, quantity] of orderTotalsByNft) {
      const nft = db.getNft(nftId);
      if (!nft || quantity > nft.available)
        return error(
          409,
          "AVAILABILITY_CONFLICT",
          "O estoque mudou. Revise seu carrinho.",
        );
    }
    for (const item of cart.items) {
      const nft = db.getNft(item.nftId)!;
      if (
        item.editionNumber !== undefined &&
        item.editionNumber > nft.editionTotal
      )
        return error(
          400,
          "INVALID_EDITION",
          "A edição selecionada não existe.",
        );
      if (item.quantity > nft.available)
        return error(
          409,
          "AVAILABILITY_CONFLICT",
          `A edição ${nft.name} esgotou.`,
        );
    }
    const scenario = readScenario();
    const status: Order["status"] =
      scenario === "payment-declined"
        ? "declined"
        : scenario === "order-pending"
          ? "pending"
          : "confirmed";
    const order = {
      id: `ord-${Date.now().toString(36)}`,
      status,
      version: 1,
      createdAt: new Date().toISOString(),
      transactionRef: key,
      quote,
      items,
      walletAddress: wallet.address,
      walletNetwork: wallet.network,
    };
    if (status === "confirmed") {
      for (const item of cart.items) {
        const nft = db.getNft(item.nftId)!;
        const updatedNft = db.updateNft(nft.id, {
          available: nft.available - item.quantity,
        });
        if (updatedNft) emitNftUpdated(updatedNft);
      }
      db.saveCart(user.id, { items: [] });
    }
    const saved = db.addOrder(user.id, order);
    if (saved) emitOrderUpdated(user.id, saved);
    if (scenario === "timeout-after-order") await delay(10_500);
    return HttpResponse.json({ order: saved }, { status: 201 });
  }),

  http.post(
    "/api/__mock/orders/:orderId/update",
    async ({ request, params }) => {
      const user = sessionUser(request);
      if (!user)
        return error(401, "UNAUTHORIZED", "Entre para atualizar este pedido.");
      const order = db.getOrder(user.id, String(params.orderId));
      if (!order)
        return error(404, "ORDER_NOT_FOUND", "Pedido não encontrado.");
      const body = (await request.json().catch(() => ({}))) as {
        status?: unknown;
      };
      if (body.status !== "confirmed" && body.status !== "declined")
        return error(400, "INVALID_ORDER_STATUS", "Estado de pedido inválido.");
      if (order.status !== "pending")
        return error(
          409,
          "ORDER_TERMINAL",
          "O pedido já está em um estado terminal.",
        );
      if (body.status === "confirmed") {
        for (const item of order.items) {
          const nft = db.getNft(item.nftId);
          if (!nft || item.quantity > nft.available)
            return error(
              409,
              "AVAILABILITY_CONFLICT",
              "Uma das obras do pedido não está mais disponível.",
            );
        }
        for (const item of order.items) {
          const nft = db.getNft(item.nftId)!;
          const updatedNft = db.updateNft(nft.id, {
            available: nft.available - item.quantity,
          });
          if (updatedNft) emitNftUpdated(updatedNft);
        }
        const cart = db.getCart(user.id);
        if (cart) {
          const purchased = new Map(
            order.items.map((item) => [item.nftId, item.quantity]),
          );
          const remaining = cart.items.flatMap((item) => {
            const quantity = item.quantity - (purchased.get(item.nftId) ?? 0);
            return quantity > 0 ? [{ ...item, quantity }] : [];
          });
          db.saveCart(user.id, { items: remaining, coupon: cart.coupon });
        }
      }
      const updated = db.updateOrderStatus(
        user.id,
        order.id,
        body.status as Order["status"],
      );
      if (!updated)
        return error(409, "ORDER_TERMINAL", "Pedido não atualizável.");
      emitOrderUpdated(user.id, updated);
      return HttpResponse.json({ order: updated });
    },
  ),

  http.post(
    "/api/__mock/orders/:orderId/event",
    async ({ request, params }) => {
      const user = sessionUser(request);
      if (!user)
        return error(401, "UNAUTHORIZED", "Entre para emitir este evento.");
      const order = db.getOrder(user.id, String(params.orderId));
      if (!order)
        return error(404, "ORDER_NOT_FOUND", "Pedido não encontrado.");
      const body = (await request.json().catch(() => ({}))) as {
        eventId?: unknown;
        version?: unknown;
        status?: unknown;
      };
      if (
        typeof body.eventId !== "string" ||
        !Number.isInteger(body.version) ||
        (body.version as number) < 1 ||
        (body.status !== "pending" &&
          body.status !== "confirmed" &&
          body.status !== "declined")
      )
        return error(400, "INVALID_ORDER_EVENT", "Evento de pedido inválido.");
      const replayStatus = body.status as Order["status"];
      const replayOrder: Order = {
        ...order,
        status: replayStatus,
        version: body.version as number,
      };
      emitOrderEvent(user.id, {
        eventId: body.eventId,
        resourceId: order.id,
        version: replayOrder.version,
        status: replayStatus,
        order: replayOrder,
      });
      return HttpResponse.json({ emitted: true });
    },
  ),

  http.get("/api/orders/:orderId", ({ request, params }) => {
    const user = authenticated(request);
    if (!user)
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    const order = db.getOrder(user.id, String(params.orderId));
    return order
      ? HttpResponse.json({ order })
      : error(404, "ORDER_NOT_FOUND", "Pedido não encontrado.");
  }),

  http.get("/api/favorites", ({ request }) => {
    if (readScenario() === "session-expired")
      return error(
        401,
        "SESSION_EXPIRED",
        "Sua sessão expirou. Entre novamente.",
      );
    const user = sessionUser(request);
    if (!user)
      return error(401, "UNAUTHORIZED", "Sua sessão expirou. Entre novamente.");
    return HttpResponse.json({ items: user.favorites });
  }),

  http.put("/api/favorites/:nftId", ({ request, params }) => {
    const user = sessionUser(request);
    const nftId = String(params.nftId);
    if (!user)
      return error(401, "UNAUTHORIZED", "Sua sessão expirou. Entre novamente.");
    if (readScenario() === "favorite-failure")
      return error(
        503,
        "FAVORITE_UNAVAILABLE",
        "Não foi possível atualizar os favoritos. Tente novamente.",
      );
    if (!db.getNft(nftId))
      return error(404, "NFT_NOT_FOUND", "NFT não encontrado.");
    return HttpResponse.json({ items: db.setFavorite(user.id, nftId, true) });
  }),

  http.delete("/api/favorites/:nftId", ({ request, params }) => {
    const user = sessionUser(request);
    if (!user)
      return error(401, "UNAUTHORIZED", "Sua sessão expirou. Entre novamente.");
    if (readScenario() === "favorite-failure")
      return error(
        503,
        "FAVORITE_UNAVAILABLE",
        "Não foi possível atualizar os favoritos. Tente novamente.",
      );
    return HttpResponse.json({
      items: db.setFavorite(user.id, String(params.nftId), false),
    });
  }),

  http.get("/api/nfts", async ({ request }) => {
    const scenario = readScenario();
    if (scenario === "slow-network") await delay(1200);
    if (scenario === "server-error")
      return error(
        503,
        "SERVICE_UNAVAILABLE",
        "Serviço temporariamente indisponível.",
      );
    if (scenario === "connection-failure") return HttpResponse.error();
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLocaleLowerCase();
    if (scenario === "variable-latency") await delay(q.length % 2 ? 800 : 120);
    if (scenario === "out-of-order") await delay(q.includes("ape") ? 900 : 80);
    const creator = (url.searchParams.get("criador") ?? "")
      .trim()
      .toLocaleLowerCase();
    const collections = url.searchParams.getAll("colecao");
    const categories = url.searchParams.getAll("categoria");
    const networks = url.searchParams.getAll("rede");
    const min = url.searchParams.has("precoMin")
      ? Number(url.searchParams.get("precoMin"))
      : undefined;
    const max = url.searchParams.has("precoMax")
      ? Number(url.searchParams.get("precoMax"))
      : undefined;
    const sort = url.searchParams.get("ordenar") ?? "recentes";
    const page = Math.max(1, Number(url.searchParams.get("pagina") ?? 1) || 1);
    const pageSize = Math.min(
      60,
      Math.max(1, Number(url.searchParams.get("limite") ?? 12) || 12),
    );
    const sourceItems = scenario === "empty-catalog" ? [] : [...db.listNfts()];
    const matchesBaseFilters = (nft: (typeof sourceItems)[number]) => {
      const matchesText =
        !q ||
        `${nft.name} ${nft.collection} ${nft.creator} ${nft.category}`
          .toLocaleLowerCase()
          .includes(q);
      return (
        matchesText &&
        (!creator || nft.creator.toLocaleLowerCase() === creator) &&
        (!collections.length || collections.includes(nft.collection)) &&
        (min === undefined || Number(nft.priceEth) >= min) &&
        (max === undefined || Number(nft.priceEth) <= max)
      );
    };
    const categoryFacets = catalogCategories.map(({ value }) => ({
      value,
      count: sourceItems.filter(
        (nft) =>
          matchesBaseFilters(nft) &&
          (!networks.length || networks.includes(nft.network)) &&
          nft.category === value,
      ).length,
    }));
    const networkValues: Network[] = ["ethereum", "polygon", "solana"];
    const networkFacets = networkValues.map((value) => ({
      value,
      count: sourceItems.filter(
        (nft) =>
          matchesBaseFilters(nft) &&
          (!categories.length || categories.includes(nft.category)) &&
          nft.network === value,
      ).length,
    }));
    const items = sourceItems.filter(
      (nft) =>
        matchesBaseFilters(nft) &&
        (!categories.length || categories.includes(nft.category)) &&
        (!networks.length || networks.includes(nft.network)),
    );
    if (sort === "preco-asc")
      items.sort((a, b) => Number(a.priceEth) - Number(b.priceEth));
    else if (sort === "preco-desc")
      items.sort((a, b) => Number(b.priceEth) - Number(a.priceEth));
    else items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    return HttpResponse.json({
      items: items.slice((page - 1) * pageSize, page * pageSize),
      pagination: { page, pageSize, total, pages },
      facets: { categories: categoryFacets, networks: networkFacets },
    });
  }),

  http.get("/api/creator-avatars", () => {
    const creatorNames = new Map<string, string>(
      db
        .listNfts()
        .map((nft) => nft.creator)
        .map((name): [string, string] => [name.toLocaleLowerCase(), name]),
    );
    const avatars = db.listUsers().flatMap((user) => {
      const username = user.profile.username.trim().toLocaleLowerCase();
      const creator = creatorNames.get(username);
      const avatar = user.profile.avatar || user.avatar;
      return creator && avatar ? [{ creator, avatar }] : [];
    });
    return HttpResponse.json({ avatars });
  }),

  http.get("/api/nfts/:nftId", ({ params }) => {
    const nft = db.getNft(String(params.nftId));
    if (nft && readScenario() === "price-change")
      db.updateNft(nft.id, {
        priceEth: (Number(nft.priceEth) + 0.01).toFixed(2),
      });
    if (nft && readScenario() === "availability-change")
      db.updateNft(nft.id, { available: Math.max(0, nft.available - 1) });
    return nft
      ? HttpResponse.json({ item: nft })
      : error(404, "NFT_NOT_FOUND", "NFT não encontrado.");
  }),

  http.post("/api/__mock/reset", () => {
    const fresh = db.reset();
    return HttpResponse.json({
      status: "reset",
      nfts: fresh.nfts.length,
      users: fresh.users.length,
    });
  }),

  http.post("/api/__mock/nfts/:nftId/update", async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      priceEth?: string;
      available?: number;
    };
    if (body.priceEth !== undefined && !/^\d+(\.\d+)?$/.test(body.priceEth))
      return error(400, "INVALID_PRICE", "Preço inválido.");
    if (
      body.available !== undefined &&
      (!Number.isInteger(body.available) || body.available < 0)
    )
      return error(400, "INVALID_AVAILABILITY", "Disponibilidade inválida.");
    const nft = db.updateNft(String(params.nftId), body);
    if (nft) emitNftUpdated(nft);
    return nft
      ? HttpResponse.json({ item: nft })
      : error(404, "NFT_NOT_FOUND", "NFT não encontrado.");
  }),

  http.post("/api/__mock/nfts/:nftId/event", async ({ params, request }) => {
    const nft = db.getNft(String(params.nftId));
    if (!nft) return error(404, "NFT_NOT_FOUND", "NFT não encontrado.");
    const body = (await request.json().catch(() => ({}))) as {
      version?: number;
      eventId?: string;
    };
    emitNftEvent({
      eventId:
        body.eventId ?? `manual-${nft.id}-${body.version ?? nft.version}`,
      resourceId: nft.id,
      version: body.version ?? nft.version,
      item: { ...nft, version: body.version ?? nft.version },
    });
    return HttpResponse.json({ status: "emitted" });
  }),

  http.post("/api/__mock/socket/disconnect", () => {
    disconnectSocketClients();
    return HttpResponse.json({ status: "disconnected" });
  }),
];
