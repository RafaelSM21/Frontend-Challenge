import { expect, type Page } from "@playwright/test";

/** Restaura o banco MSW e a sessão para o cenário conhecido antes de cada teste. */
export async function resetMocks(page: Page) {
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
  await page.reload();
}

export const isMobile = (page: Page) =>
  (page.viewportSize()?.width ?? Infinity) <= 980;

/** No mobile/tablet o painel de filtros é um drawer; no desktop já está visível. */
export async function openFilters(page: Page) {
  if (!isMobile(page)) return;
  const drawer = page.getByRole("dialog", { name: /Filtros/ });
  // O drawer é modal: com ele aberto o botão fica aria-hidden e não é achado por role.
  if ((await drawer.count()) === 0) {
    await page.getByRole("button", { name: /FILTROS/ }).click();
  }
  await expect(page.getByRole("dialog", { name: /Filtros/ })).toBeVisible();
}

export async function closeFilters(page: Page) {
  if (!isMobile(page)) return;
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /Filtros/ })).toHaveCount(0);
}

export async function loginAs(
  page: Page,
  email: string,
  password = "Kurio123!",
) {
  await page.goto("/login");
  const dialog = page.getByRole("dialog", { name: "Entrar" });
  await dialog.locator("#login-email").fill(email);
  await dialog.locator("#login-password").fill(password);
  await dialog.getByRole("button", { name: "Entrar" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(localStorage.getItem("kurio.session"))),
    )
    .toBe(true);
}

export async function login(page: Page) {
  await loginAs(page, "rafael@example.com");
}

export async function createWallet(page: Page) {
  await page.goto("/carteiras");
  await page.getByLabel(/Nome de exibição/i).fill("Carteira de checkout");
  await page.getByLabel(/Apelido da carteira/i).fill("checkout");
  await page.getByLabel("Nome do perfil").fill("Rafael");
  await page.getByLabel(/Endereço da carteira/i).fill("0x1234567890abcdef");
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByText("Carteira salva na sua conta.")).toBeVisible();
}

/** Aguarda fontes e imagens para que a captura não dependa da ordem de carregamento. */
export async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            }),
      ),
    );
  });
}

export async function selectAndConnectWallet(page: Page) {
  await page.getByLabel("Carteira cadastrada").selectOption({ index: 1 });
  await page.getByRole("button", { name: "CONECTAR CARTEIRA" }).click();
  await expect(
    page.getByText("Carteira conectada para esta compra."),
  ).toBeVisible();
}

/** Login, carteira cadastrada, NFT no carrinho e carteira conectada no pagamento. */
export async function reachCheckout(page: Page) {
  await login(page);
  await createWallet(page);
  await page.goto("/nfts/nft-002");
  await page.getByRole("button", { name: /comprar/i }).click();
  await page.waitForURL("**/carrinho");
  await page.getByRole("button", { name: "IR PARA PAGAMENTO" }).click();
  await page.waitForURL("**/pagamento");
  await selectAndConnectWallet(page);
}

/** Lê o banco MSW persistido no navegador (pedidos do usuário logado). */
export async function readOrders(page: Page) {
  return page.evaluate(() => {
    const database = JSON.parse(
      localStorage.getItem("kurio.mock-db.v1") ?? "{}",
    );
    const session = JSON.parse(localStorage.getItem("kurio.session") ?? "{}");
    const user = database.users.find(
      (item: { id: string }) => item.id === session.user.id,
    );
    return (user?.orders ?? []) as Array<{ id: string; status: string }>;
  });
}
