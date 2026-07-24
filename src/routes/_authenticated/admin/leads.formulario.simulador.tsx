import { createFileRoute } from "@tanstack/react-router";
import { LeadFormSimulatorPanel } from "@/components/leads/form-editor/LeadFormEditor";

export const Route = createFileRoute("/_authenticated/admin/leads/formulario/simulador")({
  component: LeadFormSimulatorPanel,
});
