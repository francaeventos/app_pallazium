import { createFileRoute } from "@tanstack/react-router";
import { LeadFormVisualPanel } from "@/components/leads/form-editor/LeadFormVisualPanel";

export const Route = createFileRoute("/_authenticated/admin/leads/formulario/visual")({
  component: LeadFormVisualPanel,
});
