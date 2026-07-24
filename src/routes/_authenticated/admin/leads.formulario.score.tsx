import { createFileRoute } from "@tanstack/react-router";
import { LeadFormScorePanel } from "@/components/leads/form-editor/LeadFormEditor";

export const Route = createFileRoute("/_authenticated/admin/leads/formulario/score")({
  component: LeadFormScorePanel,
});
