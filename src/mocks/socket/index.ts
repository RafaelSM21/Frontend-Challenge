import { ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import type { Nft } from "../db/types";
import type { Order, OrderStatus } from "@/lib/contracts";

// O MSW remove o prefixo /socket.io/ do handshake antes de comparar handlers.
// Por isso os canais devem apontar para a origem, embora o cliente continue
// usando o path Socket.IO padrão (/socket.io).

const currentSocketOrigin =
  typeof window === "undefined"
    ? undefined
    : window.location.origin.replace(/^http/, "ws");

const socketOrigins = new Set([
  ...(currentSocketOrigin ? [currentSocketOrigin] : []),
  "ws://localhost:5173",
  "ws://localhost:4173",
]);

const channels = [...socketOrigins].map((origin) => ws.link(origin));

type MockSocketClient = {
  io: ReturnType<typeof toSocketIo>;
  close: () => void;
  userId?: string;
};
const clients = new Set<MockSocketClient>();

export const socketHandlers = channels.map((channel) =>
  channel.addEventListener("connection", (connection) => {
    const duplex = toSocketIo(connection);
    // Em um socket totalmente mockado não há um servidor remoto para encerrar.
    // Fechar o lado cliente do interceptor propaga o close ao socket.io-client
    // e exercita seu fluxo real de reconexão.
    const client: MockSocketClient = {
      io: duplex,
      close: () => connection.client.close(1011, "mock connection interrupted"),
    };
    clients.add(client);
    duplex.client.on("subscribe", (_event, ...data: unknown[]) => {
      const payload = data[0];
      client.userId =
        typeof payload === "object" &&
        payload !== null &&
        "userId" in payload &&
        typeof payload.userId === "string"
          ? payload.userId
          : undefined;
    });
    connection.client.addEventListener("close", () => clients.delete(client));
  }),
);

export function emitNftUpdated(item: Nft) {
  emitNftEvent({
    eventId: `nft-${item.id}-${item.version}`,
    resourceId: item.id,
    version: item.version,
    item,
  });
}

export function emitNftEvent(event: {
  eventId: string;
  resourceId: string;
  version: number;
  item: Nft;
}) {
  for (const client of clients) client.io.client.emit("nft.updated", event);
}

export function emitOrderUpdated(userId: string, order: Order) {
  const event = {
    eventId: `order-${order.id}-${order.version}`,
    resourceId: order.id,
    userId,
    status: order.status,
    version: order.version,
    order,
  };
  for (const client of clients) {
    if (client.userId === userId) client.io.client.emit("order.updated", event);
  }
}

export function emitOrderEvent(userId: string, event: {
  eventId: string;
  resourceId: string;
  version: number;
  status: OrderStatus;
  order: Order;
}) {
  for (const client of clients) {
    if (client.userId === userId) client.io.client.emit("order.updated", event);
  }
}

/** Fecha o transporte real do mock; o socket.io-client deve reconectar sozinho. */
export function disconnectSocketClients() {
  for (const client of [...clients]) client.close();
}
