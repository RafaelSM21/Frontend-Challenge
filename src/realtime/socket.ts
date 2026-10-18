import { io, type Socket } from "socket.io-client";
import { queryClient } from "@/app/queryClient";
import { env } from "@/lib/env";
import { getSession } from "@/features/auth/session";
import type { Nft, Order } from "@/lib/contracts";

type NftUpdatedEvent = {
  eventId: string;
  resourceId: string;
  version: number;
  item: Nft;
};
type OrderUpdatedEvent = {
  eventId: string;
  resourceId: string;
  userId: string;
  status: Order["status"];
  version: number;
  order: Order;
};
type RealtimeWindow = Window & { __kurioSocketConnected?: boolean };
let socket: Socket | undefined;
const seenVersions = new Map<string, number>();
const seenEventIds = new Set<string>();
const seenOrderVersions = new Map<string, number>();

function reconcileActiveResources() {
  queryClient.invalidateQueries({ queryKey: ["nfts"], refetchType: "active" });
  queryClient.invalidateQueries({
    queryKey: ["cart", getSession()?.user.id],
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: ["quote", getSession()?.user.id],
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: ["order", getSession()?.user.id],
    refetchType: "active",
  });
}

function accept(event: NftUpdatedEvent) {
  if (seenEventIds.has(event.eventId)) return;
  const previous = seenVersions.get(event.resourceId) ?? 0;
  if (event.version <= previous) return;
  seenEventIds.add(event.eventId);
  seenVersions.set(event.resourceId, event.version);
  window.dispatchEvent(new CustomEvent("kurio:nft-updated", { detail: event }));
  queryClient.setQueryData<Nft>(["nft", event.resourceId], (current) =>
    !current || current.version < event.version ? event.item : current,
  );
  reconcileActiveResources();
}

function acceptOrder(event: OrderUpdatedEvent) {
  const userId = getSession()?.user.id;
  if (
    !userId ||
    event.userId !== userId ||
    event.resourceId !== event.order.id ||
    event.status !== event.order.status ||
    !Number.isInteger(event.version) ||
    event.version < 1 ||
    event.order.version !== event.version ||
    seenEventIds.has(event.eventId)
  )
    return;
  const versionKey = `${userId}:${event.resourceId}`;
  const cached = queryClient.getQueryData<Order>([
    "order",
    userId,
    event.resourceId,
  ]);
  const previous = Math.max(
    seenOrderVersions.get(versionKey) ?? 0,
    cached?.version ?? 0,
  );
  if (event.version <= previous) return;
  seenEventIds.add(event.eventId);
  seenOrderVersions.set(versionKey, event.version);
  queryClient.setQueryData<Order>(
    ["order", userId, event.resourceId],
    event.order,
  );
}

export function connectRealtime() {
  if (socket?.connected) return socket;
  // O mock WebSocket acompanha a origem da aplicação: Vite usa 5173 e o
  // preview dos E2E usa 4173. Uma URL fixa do .env não pode sobrescrevê-la.
  const endpoint = env.mocksEnabled ? window.location.origin : env.socketUrl;
  if (!endpoint) return undefined;
  socket = io(endpoint, {
    path: "/socket.io",
    transports: ["websocket"],
    autoConnect: true,
  });
  socket.on("connect", () => {
    // Sinal de observabilidade para os testes aguardarem a conexão Socket.IO
    // antes de disparar um evento pelo handler MSW. Não atualiza estado algum.
    (window as RealtimeWindow).__kurioSocketConnected = true;
    window.dispatchEvent(new Event("kurio:socket-connected"));
    socket?.emit("subscribe", { userId: getSession()?.user.id });
    reconcileActiveResources();
    window.dispatchEvent(new Event("kurio:socket-reconciled"));
  });
  socket.on("disconnect", () => {
    (window as RealtimeWindow).__kurioSocketConnected = false;
    window.dispatchEvent(new Event("kurio:socket-disconnected"));
  });
  socket.on("nft.updated", accept);
  socket.on("order.updated", acceptOrder);
  return socket;
}

export function disconnectRealtime() {
  socket?.disconnect();
  socket = undefined;
  (window as RealtimeWindow).__kurioSocketConnected = false;
  seenVersions.clear();
  seenOrderVersions.clear();
  seenEventIds.clear();
}
