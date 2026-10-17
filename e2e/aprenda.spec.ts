import { test, expect } from "@playwright/test";

test("aba Aprenda abre os guias e permite filtrar conteúdos", async ({ page }) => {
  await page.goto("/aprenda");

  await expect(
    page.getByRole("heading", { name: /Descubra\./i }),
  ).toBeVisible();
  await expect(page.getByText("DIÁRIO DA CUNHAGEM")).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Buscar artigos" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Segurança" }).click();
  await expect(
    page.getByRole("heading", {
      name: "5 sinais de alerta para evitar golpes com NFTs",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sua primeira carteira digital" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "LER ARTIGO" }).last().click();
  await expect(page.locator("#learn-reader-title")).toHaveText(
    "5 sinais de alerta para evitar golpes com NFTs",
  );
  await expect(page.getByText("PARA LEMBRAR")).toBeVisible();
});
