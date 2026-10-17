import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "./queryClient";
import { router } from "./router";
import { useEffect } from "react";
import { connectRealtime, disconnectRealtime } from "@/realtime/socket";
import { getSession, SESSION_EVENT } from "@/features/auth/session";

export function App() {
  useEffect(() => {
    connectRealtime();
    return () => disconnectRealtime();
  }, []);
  useEffect(() => {
    const handleSession = () => {
      disconnectRealtime();
      queryClient.removeQueries({
        predicate: (query) =>
          [
            "profile",
            "wallets",
            "favorites",
            "cart",
            "quote",
            "order",
          ].includes(String(query.queryKey[0])),
      });
      if (getSession()) connectRealtime();
    };
    window.addEventListener(SESSION_EVENT, handleSession);
    return () => window.removeEventListener(SESSION_EVENT, handleSession);
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
