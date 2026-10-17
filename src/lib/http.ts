import axios from "axios";
import { env } from "./env";
import { clearSession, getSession } from "@/features/auth/session";

/**
 * Único cliente HTTP da aplicação. Toda chamada REST passa por aqui.
 * Não contém respostas fictícias: os mocks vivem na camada de rede (MSW).
 * O interceptor de resposta preserva a rota antes de limpar uma sessão expirada.
 * A chave de idempotência de pedidos é mantida pelo fluxo de checkout.
 */
export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10_000,
  headers: { Accept: "application/json" },
});

http.interceptors.request.use((config) => {
  const token = getSession()?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const code = error?.response?.data?.error?.code;
    if (code === "SESSION_EXPIRED") {
      localStorage.setItem(
        "kurio.resume-path",
        window.location.pathname + window.location.search,
      );
      clearSession();
      window.dispatchEvent(new Event("kurio:session-expired"));
    }
    return Promise.reject(error);
  },
);
