import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { env } from "@/lib/env";

async function bootstrap() {
  // A camada de mocks é ativada por configuração (também no build de demonstração).
  if (env.mocksEnabled) {
    const { startMocks } = await import("@/mocks/browser");
    await startMocks();
  }
  // Carregar a árvore da aplicação após o MSW, pois socket.io-client captura
  // a referência global de WebSocket durante a importação do módulo.
  const { App } = await import("@/app/providers");
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
