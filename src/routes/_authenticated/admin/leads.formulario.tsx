import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  LeadFormEditorChrome,
  LeadFormEditorProvider,
} from "@/components/leads/form-editor/LeadFormEditor";

export const Route = createFileRoute("/_authenticated/admin/leads/formulario")({
  component: Layout,
});

function Layout() {
  return (
    <LeadFormEditorProvider>
      <LeadFormEditorChrome>
        <Outlet />
      </LeadFormEditorChrome>
    </LeadFormEditorProvider>
  );
}
