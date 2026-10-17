import { z } from "zod";
import { catalogCategories, type CatalogCategory } from "@/lib/contracts";

const categoryValues = catalogCategories.map(({ value }) => value) as [
  CatalogCategory,
  ...CatalogCategory[],
];

/**
 * Estado do catálogo na URL (busca, filtros, ordenação e paginação).
 * Valores inválidos caem no default em vez de quebrar a página.
 */
export const catalogSearchSchema = z.object({
  q: z.string().trim().optional().catch(undefined),
  criador: z.string().trim().optional().catch(undefined),
  colecao: z.array(z.string()).optional().catch(undefined),
  categoria: z.array(z.enum(categoryValues)).optional().catch(undefined),
  rede: z
    .array(z.enum(["ethereum", "polygon", "solana"]))
    .optional()
    .catch(undefined),
  precoMin: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .optional()
    .catch(undefined),
  precoMax: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .optional()
    .catch(undefined),
  ordenar: z.enum(["recentes", "preco-asc", "preco-desc"]).catch("recentes"),
  pagina: z.number().int().min(1).catch(1),
});

export type CatalogSearch = z.infer<typeof catalogSearchSchema>;
