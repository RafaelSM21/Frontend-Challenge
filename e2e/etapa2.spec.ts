import { test, expect } from "@playwright/test";
import {
  createWallet,
  login,
  reachCheckout,
  readOrders,
  resetMocks,
} from "./support";

/**
 * Etapa 2: skeletons de carrinho e pagamento, isolamento entre usuários,
 * paginação com histórico, clique repetido, sessão expirada no checkout,
 * validação de formulários e movimento reduzido.
 */
test.beforeEach(async ({ page }) => {
  await resetMocks(page);
});

async function addNftToCart(page: import("@playwright/test").Page) {
  await page.goto("/nfts/nft-002");
  await page.getByRole("button", { name: /comprar/i }).click();
  await page.waitForURL("**/carrinho");
  await expect(
    page.getByRole("heading", { name: /Astronaut #002/i }),
  ).toBeVisible();
}

test("skeleton do carrinho preserva as dimensões e some ao concluir", async ({
  page,
}) => {
  await login(page);
  await addNftToCart(page);

  await page.goto("/carrinho?mockScenario=slow-network");
  const skeleton = page.getByTestId("cart-skeleton");
  await expect(skeleton).toBeVisible();
  await expect(skeleton).toHaveAttribute("aria-busy", "true");
  await expect(
    page.getByRole("status").filter({ hasText: "Carregando carrinho" }),
  ).toHaveCount(1);
  const skeletonItem = await skeleton
    .locator(".cart-item")
    .first()
    .boundingBox();
  const skeletonSummary = await skeleton
    .locator(".order-summary")
    .boundingBox();
  const skeletonHeading = await skeleton.locator("h1").boundingBox();

  await expect(skeleton).toHaveCount(0, { timeout: 10_000 });
  await expect(
    page.getByRole("heading", { name: /Astronaut #002/i }),
  ).toBeVisible();
  const item = await page.locator(".cart-item").first().boundingBox();
  const summary = await page.locator(".order-summary").boundingBox();
  const heading = await page.locator(".commerce-heading h1").boundingBox();

  // Sem deslocamento de layout: mesmo título, mesma largura do resumo e altura do item.
  expect(
    Math.abs((heading?.y ?? 0) - (skeletonHeading?.y ?? 0)),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs((summary?.width ?? 0) - (skeletonSummary?.width ?? 0)),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs((item?.height ?? 0) - (skeletonItem?.height ?? 0)),
  ).toBeLessThanOrEqual(8);
});

test("skeleton do pagamento aparece com cotação lenta e some ao concluir", async ({
  page,
}) => {
  await reachCheckout(page);
  await page.goto("/pagamento?mockScenario=slow-network");
  const skeleton = page.getByTestId("checkout-skeleton");
  await expect(skeleton).toBeVisible();
  await expect(skeleton).toHaveAttribute("aria-busy", "true");
  const skeletonSummary = await skeleton
    .locator(".order-summary")
    .boundingBox();

  await expect(skeleton).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByLabel("Carteira cadastrada")).toBeVisible();
  const summary = await page.locator(".order-summary").boundingBox();
  expect(
    Math.abs((summary?.width ?? 0) - (skeletonSummary?.width ?? 0)),
  ).toBeLessThanOrEqual(1);
});

test("movimento reduzido desativa o shimmer dos skeletons", async ({
  page,
}) => {
  await login(page);
  await addNftToCart(page);

  const animationName = () =>
    page
      .getByTestId("cart-skeleton")
      .locator(".sk")
      .first()
      .evaluate((element) => getComputedStyle(element).animationName);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/carrinho?mockScenario=slow-network");
  await expect(page.getByTestId("cart-skeleton")).toBeVisible();
  expect(await animationName()).toBe("shimmer");
  await expect(page.getByTestId("cart-skeleton")).toHaveCount(0, {
    timeout: 10_000,
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/carrinho?mockScenario=slow-network");
  await expect(page.getByTestId("cart-skeleton")).toBeVisible();
  expect(await animationName()).toBe("none");
});

test("troca de usuário não expõe dados do usuário anterior", async ({
  page,
}) => {
  await login(page);
  await createWallet(page);
  await expect(page.getByText("Carteira de checkout").first()).toBeVisible();

  // Logout e novo login por navegação interna (sem recarregar), para que o cache
  // em memória do TanStack Query seja o alvo do teste.
  await page.getByRole("button", { name: "Sair" }).click();
  await page.getByRole("button", { name: "Sim, sair" }).click();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("kurio.session")))
    .toBeNull();

  await page.locator('a[href="/login"]:visible').first().click();
  const dialog = page.getByRole("dialog", { name: "Entrar" });
  await dialog.locator("#login-email").fill("marina@example.com");
  await dialog.locator("#login-password").fill("Kurio123!");
  await dialog.getByRole("button", { name: "Entrar" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("kurio.session") ?? "{}").user?.email,
      ),
    )
    .toBe("marina@example.com");

  await page.locator('a[href="/perfil"]:visible').first().click();
  await expect(page.locator("#profile-email")).toHaveValue(
    "marina@example.com",
  );
  await page
    .locator(".account-sidebar")
    .getByRole("link", { name: "Carteiras" })
    .click();
  await expect(
    page.getByText("Você ainda não adicionou uma carteira."),
  ).toBeVisible();
  await expect(page.getByText("Carteira de checkout")).toHaveCount(0);
  await expect(page.getByText("0x1234567890abcdef")).toHaveCount(0);

  // O isolamento também vale no mock: o carrinho e os pedidos são por usuário.
  await page.goto("/carrinho");
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio." }),
  ).toBeVisible();
});

test("paginação do catálogo restaura página e resultados pelo histórico", async ({
  page,
}) => {
  await page.goto("/");
  const pager = page.getByRole("navigation", { name: "Paginação do catálogo" });
  await expect(pager).toBeVisible();
  const firstName = () =>
    page.locator(".nft-card .nft-name").first().innerText();
  const pageOneFirst = await firstName();

  await pager.getByRole("button", { name: /PRÓXIMA/ }).click();
  await expect(page).toHaveURL(/pagina=2/);
  await expect(pager.locator("b")).toHaveText("2");
  const pageTwoFirst = await firstName();
  expect(pageTwoFirst).not.toBe(pageOneFirst);

  await page.goBack();
  await expect(page).not.toHaveURL(/pagina=2/);
  await expect(pager.locator("b")).toHaveText("1");
  await expect.poll(firstName).toBe(pageOneFirst);

  await page.goForward();
  await expect(page).toHaveURL(/pagina=2/);
  await expect.poll(firstName).toBe(pageTwoFirst);

  await page.reload();
  await expect(page).toHaveURL(/pagina=2/);
  await expect(pager.locator("b")).toHaveText("2");
  await expect.poll(firstName).toBe(pageTwoFirst);
});

test("clique repetido em confirmar compra cria apenas um pedido", async ({
  page,
}) => {
  await reachCheckout(page);
  const confirm = page.getByRole("button", { name: /confirmar compra/i });
  await confirm.dblclick();
  await expect(page).toHaveURL(/\/pedidos\//, { timeout: 15_000 });
  await expect(page.getByText("COMPRA CONFIRMADA")).toBeVisible();
  const orders = await readOrders(page);
  expect(orders).toHaveLength(1);
  expect(orders[0]?.status).toBe("confirmed");
});

test("sessão expirada no checkout preserva o contexto e retoma após novo login", async ({
  page,
}) => {
  await reachCheckout(page);
  await page.goto("/pagamento?mockScenario=session-expired");
  await page.waitForURL("**/login");
  const resumePath = await page.evaluate(() =>
    localStorage.getItem("kurio.resume-path"),
  );
  expect(resumePath).toMatch(/^\/pagamento/);

  // O parâmetro do cenário faz parte da URL guardada; remove-o para retomar no cenário padrão.
  await page.evaluate(() =>
    localStorage.setItem("kurio.resume-path", "/pagamento"),
  );
  const dialog = page.getByRole("dialog", { name: "Entrar" });
  await dialog.locator("#login-email").fill("rafael@example.com");
  await dialog.locator("#login-password").fill("Kurio123!");
  await dialog.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/pagamento$/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: "Confirme sua compra." }),
  ).toBeVisible();
  await expect(page.getByText(/Astronaut #002/).first()).toBeVisible();
  expect(await readOrders(page)).toHaveLength(0);
});

test("login informa credenciais inválidas e associa o erro aos campos", async ({
  page,
}) => {
  await page.goto("/login");
  const dialog = page.getByRole("dialog", { name: "Entrar" });
  const email = dialog.locator("#login-email");
  const password = dialog.locator("#login-password");
  await expect(email).not.toHaveAttribute("aria-invalid", "true");
  await email.fill("rafael@example.com");
  await password.fill("senha-incorreta");
  await dialog.getByRole("button", { name: "Entrar" }).click();

  const alert = dialog.getByRole("alert");
  await expect(alert).toContainText("incorretos");
  for (const field of [email, password]) {
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toHaveAttribute("aria-describedby", "login-error");
  }
  await expect(page).toHaveURL(/\/login/);
  expect(
    await page.evaluate(() => localStorage.getItem("kurio.session")),
  ).toBeNull();

  // Corrigir a senha conclui o login.
  await password.fill("Kurio123!");
  await dialog.getByRole("button", { name: "Entrar" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(localStorage.getItem("kurio.session"))),
    )
    .toBe(true);
});

test("cadastro associa o conflito de e-mail ao campo de e-mail", async ({
  page,
}) => {
  await page.goto("/cadastro");
  const dialog = page.getByRole("dialog", { name: "Criar conta" });
  await dialog.locator("#register-name").fill("Outra pessoa");
  await dialog.locator("#register-email").fill("rafael@example.com");
  await dialog.locator("#register-password").fill("SenhaSegura1!");
  await dialog.locator("#register-confirm").fill("SenhaSegura1!");
  await dialog.getByRole("button", { name: "Criar conta" }).last().click();

  const email = dialog.locator("#register-email");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAttribute(
    "aria-describedby",
    /register-email-error/,
  );
  await expect(dialog.locator("#register-email-error")).toContainText("e-mail");
  await expect(email).toBeFocused();
});

test("carteiras validam o endereço e associam o erro ao campo", async ({
  page,
}) => {
  await login(page);
  await page.goto("/carteiras");
  await page.getByLabel(/Nome de exibição/i).fill("Carteira inválida");
  await page.getByLabel(/Apelido da carteira/i).fill("invalida");
  await page.getByLabel("Nome do perfil").fill("Rafael");
  await page.getByLabel(/Endereço da carteira/i).fill("abc");
  await page.getByRole("button", { name: "Salvar carteira" }).click();

  const address = page.locator("#wallet-address");
  await expect(address).toHaveAttribute("aria-invalid", "true");
  await expect(address).toHaveAttribute(
    "aria-describedby",
    /wallet-address-error/,
  );
  await expect(page.locator("#wallet-address-error")).toBeVisible();
  await expect(address).toBeFocused();
  await expect(
    page.getByText("Você ainda não adicionou uma carteira."),
  ).toBeVisible();

  await address.fill("0x1234567890abcdef");
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByText("Carteira salva na sua conta.")).toBeVisible();
  await expect(address).not.toHaveAttribute("aria-invalid", "true");
});
