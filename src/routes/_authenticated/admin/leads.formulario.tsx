import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  LeadFormEditorChrome,
  LeadFormEditorProvider,
} from "@/components/leads/form-editor/LeadFormEditor";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/leads/formulario")({
  component: Layout,
});

class FormEditorErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Lead form editor crashed", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 p-8 text-center">
          <h1 className="font-serif text-2xl">Editor temporariamente indisponível</h1>
          <p className="text-sm text-muted-foreground">
            Recarregue a página (Ctrl+F5). Se continuar, reinicie o <code>npm run dev</code>.
          </p>
          <p className="max-w-full truncate rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
            {this.state.error.message}
          </p>
          <Button type="button" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Layout() {
  return (
    <FormEditorErrorBoundary>
      <LeadFormEditorProvider>
        <LeadFormEditorChrome>
          <Outlet />
        </LeadFormEditorChrome>
      </LeadFormEditorProvider>
    </FormEditorErrorBoundary>
  );
}
