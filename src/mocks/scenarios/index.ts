export type MockScenario =
  | "default"
  | "empty-catalog"
  | "server-error"
  | "connection-failure"
  | "slow-network"
  | "variable-latency"
  | "out-of-order"
  | "session-expired"
  | "favorite-failure"
  | "price-change"
  | "availability-change"
  | "stock-conflict"
  | "payment-declined"
  | "order-pending"
  | "timeout-after-order";

export function readScenario(): MockScenario {
  const configured =
    new URLSearchParams(window.location.search).get("mockScenario") ??
    import.meta.env.VITE_MOCK_SCENARIO ??
    "default";
  if (
    [
      "default",
      "empty-catalog",
      "server-error",
      "connection-failure",
      "slow-network",
      "variable-latency",
      "out-of-order",
      "session-expired",
      "favorite-failure",
      "price-change",
      "availability-change",
      "stock-conflict",
      "payment-declined",
      "order-pending",
      "timeout-after-order",
    ].includes(configured)
  )
    return configured as MockScenario;
  return "default";
}
