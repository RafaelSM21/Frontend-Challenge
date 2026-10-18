import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { env } from "@/lib/env";
import { holdNetworkUntil } from "@/lib/network-ready";

function bootstrap() {
  if (env.mocksEnabled) {
    holdNetworkUntil(
      import("@/mocks/browser").then(({ startMocks }) => startMocks()),
    );
  }
  void import("@/app/providers").then(({ App }) => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
}

bootstrap();
