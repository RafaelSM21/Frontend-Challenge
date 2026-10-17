import { QueryClient } from "@tanstack/react-query";

/**
 * Política de cache (detalhada em ARCHITECTURE.md):
 * - staleTime 30s: o catálogo tolera dados levemente defasados; o socket invalida o que muda.
 * - retry 2 só para falhas transitórias; nunca para 4xx.
 * - mutations NÃO fazem retry automático (evita pedidos duplicados).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});
