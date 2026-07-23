import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  component: LeadsLayout,
});

function LeadsLayout() {
  return <Outlet />;
}
