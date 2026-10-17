import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
import { socketHandlers } from "./socket";

export const worker = setupWorker(...handlers, ...socketHandlers);

export async function startMocks() {
  await worker.start({
    onUnhandledRequest: "bypass",
    serviceWorker: { url: "/mockServiceWorker.js" },
  });
}
