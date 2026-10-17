import { createRouter } from "@tanstack/react-router";
import { queryClient } from "./queryClient";
import { routeTree } from "../routeTree.gen";
import { NotFound } from "@/components/layout/not-found";

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultNotFoundComponent: NotFound,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
