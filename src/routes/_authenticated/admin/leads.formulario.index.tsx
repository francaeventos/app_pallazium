import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/leads/formulario/")({
  component: () => <Navigate to="/admin/leads/formulario/score" replace />,
});
