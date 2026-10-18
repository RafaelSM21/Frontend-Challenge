import { test, expect, type Page } from "@playwright/test";
import { closeFilters, openFilters, resetMocks } from "./support";

test.beforeEach(async ({ page }) => {
  await resetMocks(page);
});

/** Lê um parâmetro de busca da URL; arrays são serializados como JSON pelo TanStack Router. */
async function expectParam(page: Page, key: string, value: unknown) {
  await expect
    .poll(() => {
      const raw = new URL(page.url()).searchParams.get(key);
      if (raw === null) return undefined;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    })
    .toEqual(value);
}

const pages = [
  { path: "/", name: "Início" },
  { path: "/mercado", name: "Mercado" },
  { path: "/criadores", name: "Criadores" },
];

for (const { path, name } of pages) {
  test(`${name} usa o mesmo painel de filtros do Início`, async ({ page }) => {
    await page.goto(path);
    await openFilters(page);
    const panel = page.locator("aside.filters");
    await expect(panel.getByRole("heading", { name: "Filtros", level: 2 })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Limpar tudo" })).toBeVisible();
    await expect(panel.getByRole("checkbox", { name: /Ethereum/ })).toBeVisible();
    await expect(panel.getByRole("checkbox", { name: /Polygon/ })).toBeVisible();
    await expect(panel.getByRole("checkbox", { name: /Solana/ })).toBeVisible();
    // Cada opção mostra a contagem de resultados, como no catálogo.
    await expect(panel.locator(".filter-option small").first()).toBeVisible();
  });
}

test("Mercado combina filtros na URL e restaura após refresh e histórico", async ({ page }) => {
  await page.goto("/mercado");
  await expect(page.locator(".collection-card")).toHaveCount(5);

  // Nas fixtures cada coleção reúne todas as categorias e redes (as obras são
  // distribuídas em rodízio), então esses dois filtros mudam a URL e o estado
  // dos checkboxes, mas não reduzem as 5 coleções. O filtro de criador reduz.
  await openFilters(page);
  await page.getByRole("checkbox", { name: /Utilidade/ }).check();
  await expectParam(page, "categoria", ["utilidade"]);
  await expect(page.locator(".collection-card").first()).toBeVisible();

  await page.getByRole("checkbox", { name: /Ethereum/ }).check();
  await expectParam(page, "rede", ["ethereum"]);
  await expectParam(page, "categoria", ["utilidade"]);

  await page.getByRole("checkbox", { name: /neoarchive/ }).check();
  await expectParam(page, "criador", ["neoarchive"]);
  await expect(page.locator(".collection-card")).toHaveCount(1);
  // O drawer mobile é modal (aria-hidden no resto), então o card é achado por CSS/texto.
  await expect(page.locator(".collection-card", { hasText: "Dreamscape" })).toBeVisible();

  await page.reload();
  await expect(page.locator(".collection-card")).toHaveCount(1);
  await openFilters(page);
  await expect(page.getByRole("checkbox", { name: /Utilidade/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Ethereum/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /neoarchive/ })).toBeChecked();

  await page.goBack();
  await expectParam(page, "criador", undefined);
  await expectParam(page, "rede", ["ethereum"]);
  await expect(page.locator(".collection-card")).toHaveCount(5);

  await openFilters(page);
  await page.getByRole("button", { name: "Limpar tudo" }).click();
  await expect(page).not.toHaveURL(/categoria=|rede=|criador=|q=/);
  await expect(page.locator(".collection-card")).toHaveCount(5);
});

test("Mercado busca por criador e ordena pela URL", async ({ page }) => {
  await page.goto("/mercado");
  await openFilters(page);
  await page.getByRole("searchbox", { name: "Buscar coleções ou criadores" }).fill("neoarchive");
  await expect(page).toHaveURL(/q=neoarchive/);
  await expect(page.locator(".collection-card")).toHaveCount(1);
  // O drawer mobile é modal (aria-hidden no resto), então o card é achado por CSS/texto.
  await expect(page.locator(".collection-card", { hasText: "Dreamscape" })).toBeVisible();

  await closeFilters(page);
  await page.getByLabel("Ordenar coleções").selectOption("nome");
  await expect(page).toHaveURL(/ordenar=nome/);
});

test("Criadores filtra por coleção e busca, com estado na URL", async ({ page }) => {
  await page.goto("/criadores");
  await expect(page.locator(".creator-card")).toHaveCount(5);

  await openFilters(page);
  await page.getByRole("searchbox", { name: "Buscar criador" }).fill("neo");
  await expect(page).toHaveURL(/q=neo/);
  await expect(page.locator(".creator-card")).toHaveCount(1);
  await expect(page.locator(".creator-card h3")).toHaveText("neoarchive");

  await page.reload();
  await expect(page.locator(".creator-card")).toHaveCount(1);

  await openFilters(page);
  await page.getByRole("button", { name: "Limpar tudo" }).click();
  await expect(page.locator(".creator-card")).toHaveCount(5);
  await expect(page).not.toHaveURL(/q=/);
});

test("filtros de Mercado e Criadores não transbordam nos três breakpoints", async ({ page }) => {
  for (const path of ["/mercado", "/criadores"]) {
    await page.goto(path);
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(() =>
          page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        )
        .toBe(true);
    }
  }
});

test("drawer de filtros do Mercado controla foco e fecha com Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/mercado");
  const toggle = page.getByRole("button", { name: /FILTROS/ });
  await toggle.click();
  const dialog = page.getByRole("dialog", { name: "Filtros de coleções" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Limpar tudo" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(toggle).toBeFocused();
});

test("painel de filtros tem as mesmas medidas e estilos no Início, Mercado e Criadores", async ({ page }) => {
  const measure = async (path: string) => {
    await page.goto(path);
    await openFilters(page);
    const panel = page.locator("aside.filters");
    await expect(panel).toBeVisible();
    return panel.evaluate((element) => {
      const read = (selector: string) => {
        const node = element.querySelector(selector);
        return node ? getComputedStyle(node) : null;
      };
      const panelStyle = getComputedStyle(element);
      const heading = read(".filters-heading");
      const group = read(".filter-group:not(.filter-search)");
      const groupHeading = read(".filter-group h3");
      const option = read(".filter-option");
      const optionText = read(".filter-option span");
      const count = read(".filter-option small");
      const clear = read(".clear-button");
      return {
        width: Math.round(element.getBoundingClientRect().width),
        padding: panelStyle.padding,
        background: panelStyle.backgroundColor,
        border: panelStyle.border,
        headingSize: heading?.fontSize,
        groupPadding: group?.padding,
        groupBorder: group?.borderBottom,
        groupHeadingSize: groupHeading?.fontSize,
        optionSize: option?.fontSize,
        optionColor: option?.color,
        optionMargin: option?.margin,
        optionGap: option?.gap,
        optionTextFont: optionText?.fontFamily,
        countSize: count?.fontSize,
        countColor: count?.color,
        clearColor: clear?.color,
        clearSize: clear?.fontSize,
      };
    });
  };
  const home = await measure("/");
  expect(await measure("/mercado")).toEqual(home);
  expect(await measure("/criadores")).toEqual(home);
});
