import { createFileRoute } from "@tanstack/react-router";
import { LeadFormVisualPanel } from "@/components/leads/form-editor/LeadFormEditor";

export const Route = createFileRoute("/_authenticated/admin/leads/formulario/visual")({
  component: LeadFormVisualPanel,
});
