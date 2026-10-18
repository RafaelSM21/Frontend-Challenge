import { test, expect, type Page } from "@playwright/test";
import { createWallet, login, resetMocks, settle } from "./support";

/**
 * Regressão visual de Início, Detalhe, Carrinho e Pagamento (desktop 1440 e
 * mobile 390, conforme os projetos do playwright.config.ts).
 *
 * Dados estáveis: banco MSW restaurado a cada teste, cenário `default`, Date
 * congelado, animações e movimento desativados. As baselines ficam em
 * e2e/__screenshots__/ e devem ser versionadas. Gere-as no mesmo ambiente em que
 * serão comparadas (veja README → "Regressão visual").
 */
test.use({ reducedMotion: "reduce" });

const FIXED_NOW = new Date("2026-10-17T12:00:00-03:00");

test.beforeEach(async ({ page }) => {
  await resetMocks(page);
  await page.clock.setFixedTime(FIXED_NOW);
});

async function capture(page: Page, name: string) {
  await settle(page);
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    animations: "disabled",
    caret: "hide",
  });
}

test("visual: início", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".nft-card").first()).toBeVisible();
  await expect(page.locator(".nft-skeleton")).toHaveCount(0);
  await capture(page, "inicio");
});

test("visual: detalhe do NFT", async ({ page }) => {
  await page.goto("/nfts/nft-002");
  await expect(page.getByRole("heading", { name: /Astronaut #002/i })).toBeVisible();
  await expect(page.locator(".skeleton-image, .nft-skeleton")).toHaveCount(0);
  await capture(page, "detalhe");
});

test("visual: carrinho", async ({ page }) => {
  await login(page);
  await page.goto("/nfts/nft-002");
  await page.getByRole("button", { name: /comprar/i }).click();
  await expect(page.getByRole("heading", { name: "Resumo do pedido" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Astronaut #002/i })).toBeVisible();
  await capture(page, "carrinho");
});

test("visual: pagamento", async ({ page }) => {
  await login(page);
  await createWallet(page);
  await page.goto("/nfts/nft-002");
  await page.getByRole("button", { name: /comprar/i }).click();
  await page.getByRole("button", { name: "IR PARA PAGAMENTO" }).click();
  await expect(page.getByLabel("Carteira cadastrada")).toBeVisible();
  await capture(page, "pagamento");
});
