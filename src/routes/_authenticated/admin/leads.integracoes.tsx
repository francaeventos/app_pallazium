import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/leads/integracoes")({
  component: () => <Navigate to="/admin/leads/formulario/pixels" replace />,
});
