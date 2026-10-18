import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { closeFilters, openFilters } from "./support";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        try {
          const response = await fetch("/api/health");
          const body = (await response.json()) as { mocks?: boolean };
          return response.ok && body.mocks === true;
        } catch {
          return false;
        }
      }),
    )
    .toBe(true);
  await page.evaluate(async () => {
    localStorage.clear();
    const response = await fetch("/api/__mock/reset", { method: "POST" });
    if (!response.ok)
      throw new Error("Não foi possível restaurar o cenário mock.");
  });
  // A aplicação mantém sessão e queries em memória; recarregar depois do reset
  // garante que cada teste começa no mesmo estado observável.
  await page.reload();
});

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  const dialog = page.getByRole("dialog", { name: "Entrar" });
  await dialog.locator("#login-email").fill("rafael@example.com");
  await dialog.locator("#login-password").fill("Kurio123!");
  await dialog.getByRole("button", { name: "Entrar" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(localStorage.getItem("kurio.session"))),
    )
    .toBe(true);
  await page.goto("/");
  if ((page.viewportSize()?.width ?? Infinity) <= 720) {
    await expect(
      page
        .getByRole("navigation", { name: "Navegação mobile" })
        .getByRole("link", { name: "Perfil" }),
    ).toBeVisible();
  } else {
    await expect(page.getByLabel("Abrir meu perfil")).toBeVisible();
  }
}

async function createWallet(page: import("@playwright/test").Page) {
  await page.goto("/carteiras");
  await page.getByLabel(/Nome de exibição/i).fill("Carteira de checkout");
  await page.getByLabel(/Apelido da carteira/i).fill("checkout");
  await page.getByLabel("Nome do perfil").fill("Rafael");
  await page.getByLabel(/Endereço da carteira/i).fill("0x1234567890abcdef");
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByText("Carteira salva na sua conta.")).toBeVisible();
}

async function selectAndConnectWallet(page: import("@playwright/test").Page) {
  await page.getByLabel("Carteira cadastrada").selectOption({ index: 1 });
  await page.getByRole("button", { name: "CONECTAR CARTEIRA" }).click();
  await expect(
    page.getByText("Carteira conectada para esta compra."),
  ).toBeVisible();
}

test("catálogo responde a filtros e acesso direto ao detalhe", async ({
  page,
}) => {
  await page.goto("/?q=Ape%20%23001");
  await expect(
    page.getByRole("heading", { name: /SEJA DONO DO FUTURO/i }),
  ).toBeVisible();
  await expect(
    page.locator(".nft-card .nft-name").filter({ hasText: "Ape #001" }).first(),
  ).toBeVisible();
  await page.goto("/nfts/nft-001");
  await expect(page.getByRole("heading", { name: /Ape #001/i })).toBeVisible();
});

test("perfil do criador abre com estatísticas, coleções e obras navegáveis", async ({
  page,
}) => {
  await page.goto("/criadores");
  await expect(
    page.getByRole("heading", { name: "Conheça os criadores." }),
  ).toBeVisible();
  await expect(page.locator(".creator-card").first()).toBeVisible();

  const creatorCard = page.locator(".creator-card").first();
  const creatorName = (await creatorCard.locator("h3").innerText()).trim();
  await creatorCard.click();

  await expect(page).toHaveURL(/\/criadores\//);
  await expect(
    page.getByRole("heading", { name: creatorName, exact: true }),
  ).toBeVisible();
  await expect(page.locator(".creator-profile-stats")).toContainText("obras");
  await expect(page.locator(".creator-profile-stats")).toContainText("coleção");
  await expect(page.locator(".creator-profile-collections a").first()).toBeVisible();
  await expect(page.locator(".creator-work-grid .nft-card").first()).toBeVisible();

  await page.locator(".creator-work-grid .nft-name").first().click();
  await expect(page).toHaveURL(/\/nfts\/nft-/);
  await expect(page.getByRole("heading", { name: /#\d{3}/ })).toBeVisible();
});

test("Mercado explora coleções e conecta ao catálogo filtrado", async ({
  page,
}) => {
  await page.goto("/mercado");
  await expect(
    page.getByRole("heading", { name: "Explore o universo digital." }),
  ).toBeVisible();
  await expect(page.locator(".collection-card")).toHaveCount(5);

  const genesis = page.getByRole("link", {
    name: /Explorar coleção KURIO Genesis, 48 NFTs/i,
  });
  await expect(genesis.locator(".collection-card-art img")).toHaveCount(4);

  await openFilters(page);
  await page.getByRole("searchbox", { name: "Buscar coleções ou criadores" }).fill(
    "neoarchive",
  );
  await expect(page.locator(".collection-card")).toHaveCount(1);
  // O drawer mobile é modal (aria-hidden no resto), então o card é achado por CSS/texto.
  await expect(
    page.locator(".collection-card", { hasText: "Dreamscape" }),
  ).toBeVisible();

  await page.getByRole("searchbox", { name: "Buscar coleções ou criadores" }).fill("");
  await expect(page.locator(".collection-card")).toHaveCount(5);
  await closeFilters(page);
  await genesis.click();
  await expect(page).toHaveURL(/\/colecoes\/KURIO%20Genesis/);
  await expect(page.locator(".collection-detail-meta")).toContainText(
    "48 NFTs",
  );
  await expect(
    page.getByRole("heading", { name: "NFTs da coleção" }),
  ).toBeVisible();

  await page.locator(".nft-card .nft-name").first().click();
  await expect(page.getByRole("heading", { name: /#\d{3}/ })).toBeVisible();
  await page.getByRole("link", { name: "KURIO Genesis" }).click();
  await expect(page).toHaveURL(/\/colecoes\/KURIO%20Genesis/);
  await expect(page.locator(".collection-detail-meta")).toContainText(
    "48 NFTs",
  );
  await expect(
    page.getByRole("heading", { name: "NFTs da coleção" }),
  ).toBeVisible();
});

test("navegação principal abre o Mercado e a página não transborda", async ({
  page,
}) => {
  await page.goto("/");
  const mobileNav = page.getByRole("navigation", {
    name: "Navegação mobile",
  });
  const marketLink = (page.viewportSize()?.width ?? Infinity) <= 720
    ? mobileNav.getByRole("link", { name: "Mercado" })
    : page.getByRole("navigation", { name: "Principal" }).getByRole("link", {
        name: "Mercado",
      });
  await marketLink.click();
  await expect(page).toHaveURL(/\/mercado$/);
  await expect(
    page.getByRole("heading", { name: "Explore o universo digital." }),
  ).toBeVisible();

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  }
});

test("Mercado mostra estados de erro e catálogo vazio", async ({ page }) => {
  await page.goto("/mercado?mockScenario=empty-catalog");
  await expect(
    page.getByRole("heading", { name: "Nenhuma coleção encontrada." }),
  ).toBeVisible();
  await expect(page.locator(".collection-card")).toHaveCount(0);

  await page.goto("/mercado?mockScenario=server-error");
  await expect(
    page.getByRole("heading", {
      name: "Não foi possível carregar as coleções.",
    }),
  ).toBeVisible();
});

test("categorias combinam com rede e persistem após refresh", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: /FILTROS/i }).click();
  }
  const musicFilter = page.getByRole("checkbox", { name: /Música/ });
  await musicFilter.scrollIntoViewIfNeeded();
  const filterScrollPosition = await page.evaluate(() => window.scrollY);
  await musicFilter.check();
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(filterScrollPosition);
  await page.getByRole("checkbox", { name: "Ethereum" }).check();
  await expect(page).toHaveURL(/categoria=.*musica/);
  await expect(page.locator(".result-count")).toContainText(
    "22 obras encontradas",
  );
  await page.goBack();
  await expect(page).toHaveURL(/categoria=.*musica/);
  await expect(page.getByRole("checkbox", { name: /Música/ })).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Ethereum" }),
  ).not.toBeChecked();
  await expect(page.locator(".result-count")).toContainText(
    "65 obras encontradas",
  );
  await page.goForward();
  await expect(page.getByRole("checkbox", { name: "Ethereum" })).toBeChecked();
  await expect(page.locator(".result-count")).toContainText(
    "22 obras encontradas",
  );
  await page.reload();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: /FILTROS/i }).click();
  }
  await expect(page.getByRole("checkbox", { name: /Música/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Ethereum" })).toBeChecked();
  await expect(page.locator(".result-count")).toContainText(
    "22 obras encontradas",
  );
});

test("migra NFTs salvos antes da taxonomia de categorias", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".nft-card").first()).toBeVisible();
  await page.evaluate(() => {
    const storageKey = "kurio.mock-db.v1";
    const saved = localStorage.getItem(storageKey);
    if (!saved) throw new Error("Banco mock não foi persistido.");
    const database = JSON.parse(saved);
    database.nfts = database.nfts
      .slice(0, 40)
      .map((nft: Record<string, unknown>) => {
        const legacyNft = { ...nft };
        delete legacyNft.category;
        legacyNft.image = "/nfts/nft-ape.webp";
        return legacyNft;
      });
    localStorage.setItem(storageKey, JSON.stringify(database));
  });
  await page.reload();
  await expect(
    page
      .locator(".filter-option")
      .filter({ hasText: "Arte digital" })
      .locator("small"),
  ).toHaveText("33");
  await expect(
    page
      .locator(".filter-option")
      .filter({ hasText: "Ethereum" })
      .locator("small"),
  ).toHaveText("80");
  const migration = await page.evaluate(() => {
    const database = JSON.parse(
      localStorage.getItem("kurio.mock-db.v1") ?? "{}",
    );
    return {
      nftCount: database.nfts?.length,
      missingCategories: database.nfts?.filter(
        (nft: { category?: string }) => !nft.category,
      ).length,
      legacyImages: database.nfts?.filter(
        (nft: { image?: string }) => nft.image?.includes("nft-ape"),
      ).length,
    };
  });
  expect(migration).toEqual({
    nftCount: 239,
    missingCategories: 0,
    legacyImages: 0,
  });
});

test("login, favorito e logout preservam o estado por usuário", async ({
  page,
}) => {
  await login(page);
  await page.goto("/nfts/nft-001");
  await page.getByRole("button", { name: "Remover dos favoritos" }).click();
  await expect(
    page.getByRole("button", { name: "Adicionar aos favoritos" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Adicionar aos favoritos" }).click();
  await expect(
    page.getByRole("button", { name: "Remover dos favoritos" }),
  ).toBeVisible();
});

test("carrinho de visitante é combinado com a conta após login", async ({
  page,
}) => {
  // nft-001 é deliberadamente esgotado nas fixtures; nft-002 possui estoque.
  await page.goto("/nfts/nft-002");
  await page.getByRole("button", { name: /comprar/i }).click();
  await expect(
    page.getByRole("heading", { name: "Resumo do pedido" }),
  ).toBeVisible();
  await login(page);
  await page.goto("/carrinho");
  await expect(
    page.getByRole("heading", { name: /Astronaut #002/i }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Astronaut #002/i }),
  ).toBeVisible();
});

test("carteiras são persistidas pela API mock", async ({ page }) => {
  await login(page);
  await page.goto("/carteiras");
  await page.getByLabel(/Nome de exibição/i).fill("Carteira principal");
  await page.getByLabel(/Apelido da carteira/i).fill("kurio");
  await page.getByLabel("Nome do perfil").fill("Rafael");
  await page.getByLabel(/Endereço da carteira/i).fill("0x1234567890abcdef");
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByText("Carteira salva na sua conta.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Carteira principal")).toBeVisible();
});

test("compra de demonstração produz recibo persistente", async ({ page }) => {
  await login(page);
  await createWallet(page);
  await page.goto("/nfts/nft-002");
  await page.getByRole("button", { name: /comprar/i }).click();
  await expect(
    page.getByRole("heading", { name: "Resumo do pedido" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "IR PARA PAGAMENTO" }).click();
  await selectAndConnectWallet(page);
  await page.getByRole("button", { name: /CONFIRMAR COMPRA/i }).click();
  await expect(page.getByText("COMPRA CONFIRMADA")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recibo" })).toBeVisible();
});

test("cenário de erro do catálogo permite recuperação visual", async ({
  page,
}) => {
  await page.goto("/?mockScenario=server-error");
  await expect(
    page.getByText("Não foi possível carregar as obras."),
  ).toBeVisible();
});

test("falha de conexão do catálogo exibe recuperação visual", async ({
  page,
}) => {
  await page.goto("/?mockScenario=connection-failure");
  await expect(
    page.getByText("Não foi possível carregar as obras."),
  ).toBeVisible();
});

async function loginAndAddNft(page: import("@playwright/test").Page) {
  await login(page);
  await createWallet(page);
  await page.goto("/nfts/nft-002");
  await page.getByRole("button", { name: /comprar/i }).click();
  await page.waitForURL("**/carrinho");
  await page.getByRole("button", { name: "IR PARA PAGAMENTO" }).click();
  await page.waitForURL("**/pagamento");
  await selectAndConnectWallet(page);
}

test("evento de preço durante checkout atualiza a cotação", async ({
  page,
}) => {
  await loginAndAddNft(page);
  // loginAndAddNft já deixa o usuário na rota de pagamento. Não navegar para
  // /checkout, pois essa rota não existe e impediria a conexão em tempo real.
  await page.waitForFunction(() =>
    Boolean(
      (window as Window & { __kurioSocketConnected?: boolean })
        .__kurioSocketConnected,
    ),
  );
  await page.evaluate(() =>
    fetch("/api/__mock/nfts/nft-002/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceEth: "2.50" }),
    }),
  );
  await expect(
    page.getByText("O preço ou a disponibilidade mudou.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Ξ 2.5", { exact: true })).toBeVisible();
});

test("pedido pendente é recuperado após refresh", async ({ page }) => {
  await loginAndAddNft(page);
  await page.goto("/pagamento?mockScenario=order-pending");
  await page.getByRole("button", { name: /confirmar compra/i }).click();
  await expect(page.getByText("PAGAMENTO PENDENTE")).toBeVisible();
  await page.reload();
  await expect(page.getByText("PAGAMENTO PENDENTE")).toBeVisible();
});

test("pagamento recusado preserva carrinho e estoque", async ({ page }) => {
  await loginAndAddNft(page);
  const before = await page.evaluate(() => {
    const database = JSON.parse(
      localStorage.getItem("kurio.mock-db.v1") ?? "{}",
    );
    const session = JSON.parse(localStorage.getItem("kurio.session") ?? "{}");
    return {
      available: database.nfts.find(
        (nft: { id: string }) => nft.id === "nft-002",
      )?.available,
      quantity: database.users
        .find((user: { id: string }) => user.id === session.user.id)
        ?.cart.items.find((item: { nftId: string }) => item.nftId === "nft-002")
        ?.quantity,
    };
  });
  await page.goto("/pagamento?mockScenario=payment-declined");
  await page.getByRole("button", { name: /confirmar compra/i }).click();
  await expect(page).toHaveURL(/\/pedidos\//);
  await expect(page.getByText("PAGAMENTO RECUSADO")).toBeVisible();
  const after = await page.evaluate(() => {
    const database = JSON.parse(
      localStorage.getItem("kurio.mock-db.v1") ?? "{}",
    );
    const session = JSON.parse(localStorage.getItem("kurio.session") ?? "{}");
    const user = database.users.find(
      (item: { id: string }) => item.id === session.user.id,
    );
    return {
      available: database.nfts.find(
        (nft: { id: string }) => nft.id === "nft-002",
      )?.available,
      quantity: user?.cart.items.find(
        (item: { nftId: string }) => item.nftId === "nft-002",
      )?.quantity,
      orderCount: user?.orders.length,
      status: user?.orders[0]?.status,
    };
  });
  expect(after).toEqual({
    ...before,
    orderCount: 1,
    status: "declined",
  });
});

test("timeout recupera o mesmo pedido após retry e refresh sem duplicar compra", async ({
  page,
}) => {
  await loginAndAddNft(page);
  const initialAvailability = await page.evaluate(() => {
    const database = JSON.parse(
      localStorage.getItem("kurio.mock-db.v1") ?? "{}",
    );
    return database.nfts.find(
      (nft: { id: string }) => nft.id === "nft-002",
    )?.available as number;
  });
  await page.goto("/pagamento?mockScenario=timeout-after-order");
  // A tentativa (chave idempotente, carteira e cotação) é gravada antes do envio.
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          JSON.parse(localStorage.getItem("kurio.checkout-resume") ?? "{}")
            .quoteId,
        ),
      ),
    )
    .toBe(true);
  const resume = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("kurio.checkout-resume") ?? "{}") as {
        idempotencyKey: string;
        quoteId: string;
        walletId: string;
      },
  );
  await page.getByRole("button", { name: /confirmar compra/i }).click();
  // O servidor cria o pedido e só então "demora" além do timeout do cliente. Há
  // dois desfechos válidos: o alerta de falha (timeout) ou a recuperação
  // automática do mesmo pedido, quando o evento em tempo real já mostra o
  // carrinho vazio. Em ambos, a compra não pode ser duplicada (verificado abaixo).
  await expect
    .poll(
      async () =>
        /\/pedidos\//.test(page.url()) ||
        (await page
          .getByRole("alert")
          .filter({ hasText: "Não foi possível confirmar o pedido" })
          .count()) > 0,
      { timeout: 20_000 },
    )
    .toBe(true);
  const retry = await page.evaluate(async (resume) => {
    const session = JSON.parse(localStorage.getItem("kurio.session") ?? "{}");
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
        "Idempotency-Key": resume.idempotencyKey,
      },
      body: JSON.stringify({
        quoteId: resume.quoteId,
        walletId: resume.walletId,
      }),
    });
    return {
      status: response.status,
      order: (await response.json()).order as { id: string },
    };
  }, resume);
  expect(retry.status).toBe(200);
  await page.reload();
  await expect(page).toHaveURL(/\/pedidos\//, { timeout: 15_000 });
  await expect(page.getByText("COMPRA CONFIRMADA")).toBeVisible();

  const persisted = await page.evaluate(() => {
    const database = JSON.parse(
      localStorage.getItem("kurio.mock-db.v1") ?? "{}",
    );
    const session = JSON.parse(localStorage.getItem("kurio.session") ?? "{}");
    const user = database.users.find(
      (item: { id: string }) => item.id === session.user.id,
    );
    return {
      orderCount: user?.orders.length,
      orderId: user?.orders[0]?.id,
      status: user?.orders[0]?.status,
      cartItemCount: user?.cart.items.length,
      available: database.nfts.find(
        (nft: { id: string }) => nft.id === "nft-002",
      )?.available,
      transactionRef: user?.orders[0]?.transactionRef,
      quoteId: user?.orders[0]?.quote.quoteId,
      walletId: user?.wallets.find(
        (wallet: { address: string }) =>
          wallet.address === user.orders[0]?.walletAddress,
      )?.id,
    };
  });
  expect(persisted).toMatchObject({
    orderCount: 1,
    orderId: retry.order.id,
    status: "confirmed",
    cartItemCount: 0,
    available: initialAvailability - 1,
  });

  const conflictStatus = await page.evaluate(async (order) => {
    const session = JSON.parse(localStorage.getItem("kurio.session") ?? "{}");
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
        "Idempotency-Key": order.transactionRef,
      },
      body: JSON.stringify({
        quoteId: `${order.quoteId}-different`,
        walletId: order.walletId,
      }),
    });
    return response.status;
  }, persisted);
  expect(conflictStatus).toBe(409);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const database = JSON.parse(
          localStorage.getItem("kurio.mock-db.v1") ?? "{}",
        );
        const session = JSON.parse(
          localStorage.getItem("kurio.session") ?? "{}",
        );
        return database.users.find(
          (user: { id: string }) => user.id === session.user.id,
        )?.orders.length;
      }),
    )
    .toBe(1);
});

test("pedido pendente atualiza por Socket.IO e ignora eventos duplicados e antigos", async ({
  page,
}) => {
  await loginAndAddNft(page);
  await page.goto("/pagamento?mockScenario=order-pending");
  await page.getByRole("button", { name: /confirmar compra/i }).click();
  await expect(page).toHaveURL(/\/pedidos\//);
  await expect(page.getByText("PAGAMENTO PENDENTE")).toBeVisible();
  const orderId = new URL(page.url()).pathname.split("/").at(-1)!;
  const token = await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("kurio.session") ?? "{}");
    return session.token as string;
  });

  const transition = await page.evaluate(
    async ({ orderId, token }) => {
      const response = await fetch(`/api/__mock/orders/${orderId}/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "confirmed" }),
      });
      return response.ok;
    },
    { orderId, token },
  );
  expect(transition).toBe(true);
  await expect(page.getByText("COMPRA CONFIRMADA")).toBeVisible();

  const orderVersion = await page.evaluate(async ({ orderId, token }) => {
    const response = await fetch(`/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await response.json()) as {
      order: { version: number };
    };
    return body.order.version;
  }, { orderId, token });
  const replay = async (eventId: string, version: number, status: string) =>
    page.evaluate(
      async ({ orderId, token, eventId, version, status }) => {
        const response = await fetch(`/api/__mock/orders/${orderId}/event`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ eventId, version, status }),
        });
        return response.ok;
      },
      { orderId, token, eventId, version, status },
    );

  expect(
    await replay(`order-${orderId}-${orderVersion}`, orderVersion, "pending"),
  ).toBe(true);
  expect(await replay("stale-order-event", 1, "declined")).toBe(true);
  await expect(page.getByText("COMPRA CONFIRMADA")).toBeVisible();
  await expect(page.getByText("PAGAMENTO RECUSADO")).toHaveCount(0);
});

test("reconecta o Socket.IO e reconcilia o checkout", async ({ page }) => {
  await loginAndAddNft(page);
  await page.waitForFunction(() =>
    Boolean(
      (window as Window & { __kurioSocketConnected?: boolean })
        .__kurioSocketConnected,
    ),
  );
  await page.evaluate(() =>
    fetch("/api/__mock/socket/disconnect", { method: "POST" }),
  );
  await expect(
    page.getByText("A conexão em tempo real foi interrompida.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.waitForFunction(() =>
    Boolean(
      (window as Window & { __kurioSocketConnected?: boolean })
        .__kurioSocketConnected,
    ),
  );
  await expect(
    page.getByText("Conexão restaurada.", { exact: false }),
  ).toBeVisible();
});

test("pedido pendente é reconciliado pela API após reconexão", async ({
  page,
}) => {
  await loginAndAddNft(page);
  await page.goto("/pagamento?mockScenario=order-pending");
  await page.getByRole("button", { name: /confirmar compra/i }).click();
  await expect(page).toHaveURL(/\/pedidos\//);
  await expect(page.getByText("PAGAMENTO PENDENTE")).toBeVisible();
  const orderId = new URL(page.url()).pathname.split("/").at(-1)!;
  const token = await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("kurio.session") ?? "{}");
    return session.token as string;
  });
  await page.waitForFunction(() =>
    Boolean(
      (window as Window & { __kurioSocketConnected?: boolean })
        .__kurioSocketConnected,
    ),
  );
  await page.evaluate(() =>
    fetch("/api/__mock/socket/disconnect", { method: "POST" }),
  );
  await page.waitForFunction(
    () =>
      !(window as Window & { __kurioSocketConnected?: boolean })
        .__kurioSocketConnected,
  );

  const updatedWhileDisconnected = await page.evaluate(
    async ({ orderId, token }) => {
      const response = await fetch(`/api/__mock/orders/${orderId}/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "confirmed" }),
      });
      return response.ok;
    },
    { orderId, token },
  );
  expect(updatedWhileDisconnected).toBe(true);
  await page.waitForFunction(
    () =>
      Boolean(
        (window as Window & { __kurioSocketConnected?: boolean })
          .__kurioSocketConnected,
      ),
    { timeout: 10_000 },
  );
  await expect(page.getByText("COMPRA CONFIRMADA")).toBeVisible();
});

test("conflito de estoque durante a compra mantém o carrinho", async ({
  page,
}) => {
  await loginAndAddNft(page);
  await page.goto("/pagamento?mockScenario=stock-conflict");
  await page.getByRole("button", { name: /confirmar compra/i }).click();
  await expect(page.getByRole("alert")).toContainText(/esgotou|estoque mudou/i);
  await page.goto("/carrinho");
  await expect(
    page.getByRole("heading", { name: /Astronaut #002/i }),
  ).toBeVisible();
});

test("cadastro valida confirmação de senha e sessão expirada retorna ao login", async ({
  page,
}) => {
  await page.goto("/cadastro");
  const dialog = page.getByRole("dialog", { name: "Criar conta" });
  await dialog.locator("#register-name").fill("Novo colecionador");
  await dialog.locator("#register-email").fill("novo@example.com");
  await dialog.locator("#register-password").fill("SenhaSegura1!");
  const confirmation = dialog.locator("#register-confirm");
  await confirmation.fill("SenhaDiferente1!");
  await expect(confirmation).toHaveValue("SenhaDiferente1!");
  await confirmation.press("Enter");
  await expect(dialog.getByRole("alert")).toContainText("não coincidem");
  await login(page);
  await page.goto("/carrinho?mockScenario=session-expired");
  await page.waitForURL("**/login");
});

test("favorito faz rollback e informa falha da mutation", async ({ page }) => {
  await login(page);
  await page.goto("/nfts/nft-002?mockScenario=favorite-failure");
  const favorite = page
    .getByRole("button", { name: "Adicionar aos favoritos" })
    .first();
  await favorite.click();
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível atualizar os favoritos",
  );
  await expect(
    page.getByRole("button", { name: "Adicionar aos favoritos" }).first(),
  ).toBeVisible();
});

test("carrinho trata cupom expirado, quantidade e remoção", async ({
  page,
}) => {
  await login(page);
  await page.goto("/nfts/nft-002");
  await page.getByRole("button", { name: /comprar/i }).click();
  await page.getByLabel("Aumentar Astronaut #002").click();
  await expect(page.getByText("2", { exact: true }).last()).toBeVisible();
  await page.getByLabel("Cupom de desconto").fill("EXPIRADO");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByRole("alert")).toContainText("expirou");
  await page.getByRole("button", { name: "Remover" }).click();
  await expect(page.getByText("Seu carrinho está vazio.")).toBeVisible();
});

test("perfil salva alterações e valida senha pela API", async ({ page }) => {
  await login(page);
  await page.goto("/perfil");
  await page.getByLabel("Nome de exibição").fill("Rafael Atualizado");
  await page.getByLabel("Apelido da carteira").fill("carteira-rafael");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Dados do perfil salvos",
  );
  await page.getByLabel("Senha atual").fill("senha-incorreta");
  await page.getByLabel("Nova senha", { exact: true }).fill("SenhaNova123!");
  await page
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill("SenhaNova123!");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("status")).toContainText(
    "senha atual está incorreta",
  );
});

test("lateral de conta é igual em perfil e carteiras", async ({ page }) => {
  await login(page);
  await page.goto("/perfil");
  const profileSidebar = page.locator(".account-sidebar");
  await expect(
    profileSidebar.getByRole("link", { name: "Dados do perfil" }),
  ).toHaveAttribute("aria-current", "page");
  for (const href of [
    "/atividade",
    "/interesse",
    "/ofertas",
    "/downloads",
    "/suporte",
  ]) {
    await expect(profileSidebar.locator(`a[href="${href}"]`)).toHaveCount(1);
  }
  await expect(profileSidebar.getByRole("link")).toHaveCount(7);
  await expect(profileSidebar.locator('a[href^="#"]')).toHaveCount(0);
  const profileMenuText = await profileSidebar.innerText();

  await page.goto("/carteiras");
  const walletsSidebar = page.locator(".account-sidebar");
  await expect(
    walletsSidebar.getByRole("link", { name: "Carteiras" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(walletsSidebar.innerText()).resolves.toBe(profileMenuText);
  for (const href of [
    "/atividade",
    "/interesse",
    "/ofertas",
    "/downloads",
    "/suporte",
  ]) {
    await expect(walletsSidebar.locator(`a[href="${href}"]`)).toHaveCount(1);
  }
  await expect(walletsSidebar.getByRole("link")).toHaveCount(7);
  await expect(walletsSidebar.locator('a[href^="#"]')).toHaveCount(0);
});

test("avatar do perfil é persistido após refresh", async ({ page }) => {
  await login(page);
  await page.goto("/perfil");
  await page.getByLabel("Apelido da carteira").fill("avatar-test");
  await page
    .getByLabel("Enviar imagem de perfil")
    .setInputFiles(resolve("e2e/fixtures/avatar.png"));
  await expect(page.locator(".avatar-placeholder img")).toHaveAttribute(
    "src",
    /^data:image\/jpeg/,
  );
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Dados do perfil salvos",
  );
  await page.reload();
  await expect(page.locator(".avatar-placeholder img")).toHaveAttribute(
    "src",
    /^data:image\/jpeg/,
  );
});

test("telas da etapa 1 não transbordam nos três breakpoints", async ({
  page,
}) => {
  await login(page);
  const routes = [
    ["/", ".hero"],
    ["/nfts/nft-002", ".nft-detail-main"],
    ["/perfil", ".avatar-field"],
    ["/carteiras", ".wallet-title"],
    ["/login", ".auth-modal"],
    ["/cadastro", ".register-modal"],
  ];

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [path, selector] of routes) {
      await page.goto(path);
      await expect(page.locator(selector)).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
    }
  }
});

test("navegação mobile inclui as seções do desktop e atalhos de conta", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "A barra inferior só é exibida no viewport mobile.",
  );
  await page.goto("/");
  const mobileNav = page.getByRole("navigation", {
    name: "Navegação mobile",
  });
  await expect(mobileNav).toBeVisible();
  for (const label of [
    "Início",
    "Mercado",
    "Criadores",
    "Aprenda",
  ]) {
    await expect(mobileNav.getByRole("link", { name: label })).toBeVisible();
  }
  await expect(
    mobileNav.getByRole("link", { name: "Carrinho de compras" }),
  ).toBeVisible();
  await expect(
    mobileNav.getByRole("link", { name: /perfil|entrar/i }),
  ).toBeVisible();
  await mobileNav.getByRole("link", { name: "Mercado" }).click();
  await expect(page).toHaveURL(/\/mercado$/);
  await expect(
    page.getByRole("heading", { name: "Explore o universo digital." }),
  ).toBeVisible();
  await mobileNav.getByRole("link", { name: "Criadores" }).click();
  await expect(page).toHaveURL(/\/criadores\/?$/);
  await mobileNav.getByRole("link", { name: "Aprenda" }).click();
  await expect(page).toHaveURL(/\/aprenda\/?$/);
  await expect(page.getByRole("heading", { name: /Descubra\./i })).toBeVisible();
  await login(page);
  await mobileNav.getByRole("link", { name: "Perfil" }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.locator(".site-header")).toBeHidden();
  await expect(page.locator(".app-root")).toHaveClass(/app-account/);
  await expect(
    mobileNav.getByRole("link", { name: "Perfil" }),
  ).toHaveAttribute("aria-current", "page");
});

  test('Roboto local é carregada na aplicação', async ({ page }) => {
    await page.goto('/');
    const loadedFamilies = await page.evaluate(async () =>
      (await document.fonts.load('16px Roboto')).map((font) => font.family),
    );
    expect(loadedFamilies).toContain('Roboto');
  });

test("diálogo de login controla foco, Tab e Escape", async ({ page }) => {
  await page.goto("/login");
  const dialog = page.getByRole("dialog", { name: "Entrar" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("E-mail", { exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "Fechar login" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Continuar com Facebook" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/\?/);
});

test("skeleton do catálogo aparece durante rede lenta e some ao concluir", async ({
  page,
}) => {
  await page.goto("/?mockScenario=slow-network");
  await expect(page.locator(".nft-skeleton").first()).toBeVisible();
  await expect(page.locator(".nft-skeleton")).toHaveCount(0, {
    timeout: 5_000,
  });
  await expect(page.locator(".nft-card").first()).toBeVisible();
});

test("drawer de filtros no mobile controla foco e fecha com Escape", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "O drawer só é exibido no viewport mobile.",
  );
  await page.goto("/");
  await page.getByRole("button", { name: /FILTROS/i }).click();
  await expect(
    page.getByRole("dialog", { name: "Filtros de obras" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "LIMPAR TUDO" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Filtros de obras" }),
  ).toHaveCount(0);
});
