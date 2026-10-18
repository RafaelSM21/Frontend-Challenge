import { z } from "zod";
import { catalogCategories, type CatalogCategory } from "@/lib/contracts";

const categoryValues = catalogCategories.map(({ value }) => value) as [
  CatalogCategory,
  ...CatalogCategory[],
];

const categories = z.array(z.enum(categoryValues)).optional().catch(undefined);
const networks = z
  .array(z.enum(["ethereum", "polygon", "solana"]))
  .optional()
  .catch(undefined);
const names = z.array(z.string()).optional().catch(undefined);

/**
 * Estado de Mercado e Criadores na URL, no mesmo formato do catálogo do Início:
 * valores inválidos caem no padrão e os filtros sobrevivem a refresh e histórico.
 */
export const marketSearchSchema = z.object({
  q: z.string().trim().optional().catch(undefined),
  categoria: categories,
  rede: networks,
  criador: names,
  ordenar: z.enum(["recentes", "quantidade", "nome"]).optional().catch(undefined),
});
export type MarketSearch = z.infer<typeof marketSearchSchema>;

export const creatorsSearchSchema = z.object({
  q: z.string().trim().optional().catch(undefined),
  categoria: categories,
  rede: networks,
  colecao: names,
  ordenar: z.enum(["recentes", "obras", "nome"]).optional().catch(undefined),
});
export type CreatorsSearch = z.infer<typeof creatorsSearchSchema>;
