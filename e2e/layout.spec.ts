import { test, expect } from "@playwright/test";
import { isMobile, resetMocks } from "./support";

test.beforeEach(async ({ page }) => {
  await resetMocks(page);
});

test("navbar acompanha o scroll no desktop", async ({ page }) => {
  test.skip(isMobile(page), "no mobile a navegação é a barra inferior");
  await page.goto("/mercado");
  const header = page.locator("header.site-header");
  await expect(header).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(200);
  const box = await header.boundingBox();
  expect(box?.y ?? 99).toBeLessThanOrEqual(1);
  await expect(header.getByRole("link", { name: "Entrar" })).toBeVisible();
});

test("navbar mostra os links centralizados e o botão Entrar com ícone", async ({ page }) => {
  test.skip(isMobile(page), "no mobile a navegação é a barra inferior");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Principal" });
  const links = nav.locator(".header-links");
  const linksBox = await links.boundingBox();
  const viewport = page.viewportSize()!;
  const center = (linksBox?.x ?? 0) + (linksBox?.width ?? 0) / 2;
  expect(Math.abs(center - viewport.width / 2)).toBeLessThan(4);
  await expect(nav.locator(".header-login svg")).toBeVisible();
});

test("hover do card envolve imagem, nome e preço no mesmo bloco", async ({ page }) => {
  test.skip(isMobile(page), "hover não se aplica ao mobile");
  await page.goto("/");
  const card = page.locator(".nft-card").first();
  await expect(card).toBeVisible();
  const before = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
  await card.hover();
  await expect
    .poll(() => card.evaluate((el) => getComputedStyle(el).borderTopColor))
    .not.toBe("rgba(0, 0, 0, 0)");

  const cardBox = (await card.boundingBox())!;
  for (const selector of [".nft-image-link", ".nft-name", ".nft-card-bottom strong"]) {
    const box = (await card.locator(selector).first().boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(cardBox.x - 0.5);
    expect(box.y).toBeGreaterThanOrEqual(cardBox.y - 0.5);
    expect(box.x + box.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 0.5);
    expect(box.y + box.height).toBeLessThanOrEqual(cardBox.y + cardBox.height + 0.5);
  }
  // O fundo pertence ao card, não só à imagem.
  const imageBackground = await card
    .locator(".nft-image-link")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(imageBackground).toBe("rgba(0, 0, 0, 0)");
  const after = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(after).not.toBe("rgba(0, 0, 0, 0)");
  expect(before).not.toBe("rgba(0, 0, 0, 0)");
});

test("título do detalhe mostra o nome uma única vez", async ({ page }) => {
  await page.goto("/nfts/nft-002");
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toHaveText(/^Astronaut #002$/);
  await expect(page.getByText("ID do token:")).toBeVisible();
});

test("seletor de quantidade não sobrepõe os botões", async ({ page }) => {
  await page.goto("/nfts/nft-002");
  const minus = page.getByRole("button", { name: "Diminuir quantidade" });
  const plus = page.getByRole("button", { name: "Aumentar quantidade" });
  const label = page.locator(".quantity-control span");
  await expect(label).toBeVisible();
  const [m, l, p] = await Promise.all([minus.boundingBox(), label.boundingBox(), plus.boundingBox()]);
  expect(m!.x + m!.width).toBeLessThanOrEqual(l!.x + 0.5);
  expect(l!.x + l!.width).toBeLessThanOrEqual(p!.x + 0.5);
  await expect
    .poll(() => label.evaluate((el) => el.getBoundingClientRect().height))
    .toBeLessThan(30);
});
