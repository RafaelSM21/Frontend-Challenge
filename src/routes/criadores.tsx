import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/criadores")({
  component: CreatorsLayout,
});

function CreatorsLayout() {
  return <Outlet />;
}
