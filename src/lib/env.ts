export const env = {
  mocksEnabled: import.meta.env.VITE_ENABLE_MOCKS === "true",
  mockScenario: import.meta.env.VITE_MOCK_SCENARIO ?? "default",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api",
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? "",
} as const;
