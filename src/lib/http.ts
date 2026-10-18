import axios from "axios";
import { env } from "./env";
import { whenNetworkReady } from "./network-ready";
import { clearSession, getSession } from "@/features/auth/session";

export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10_000,
  headers: { Accept: "application/json" },
});

http.interceptors.request.use(async (config) => {
  await whenNetworkReady();
  const token = getSession()?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const code = error?.response?.data?.error?.code;
    if (code === "SESSION_EXPIRED") {
      if (!/^\/(login|cadastro)(\/|$)/.test(window.location.pathname)) {
        localStorage.setItem(
          "kurio.resume-path",
          window.location.pathname + window.location.search,
        );
      }
      clearSession();
      window.dispatchEvent(new Event("kurio:session-expired"));
    }
    return Promise.reject(error);
  },
);
