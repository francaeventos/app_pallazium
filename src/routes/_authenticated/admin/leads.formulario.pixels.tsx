import { createFileRoute } from "@tanstack/react-router";
import { LeadFormPixelsPanel } from "@/components/leads/form-editor/LeadFormEditor";

export const Route = createFileRoute("/_authenticated/admin/leads/formulario/pixels")({
  component: LeadFormPixelsPanel,
});
