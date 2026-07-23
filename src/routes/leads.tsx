import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPublicLeadFormFn } from "@/fns/leads/public";
import { LeadsQuiz } from "@/components/leads/LeadsQuiz";

export const Route = createFileRoute("/leads")({
  component: LeadsPage,
  head: () => ({
    meta: [
      { title: "Diagnóstico do evento — Espaço Pallazium" },
      {
        name: "description",
        content: "Conheça a Bella Festa e prepare uma proposta personalizada para o seu evento.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap",
      },
    ],
  }),
});

function LeadsPage() {
  const [form, setForm] = useState<Awaited<ReturnType<typeof getPublicLeadFormFn>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublicLeadFormFn({ data: { slug: "leads" } })
      .then(setForm)
      .catch((err) => setError(err instanceof Error ? err.message : "Formulário indisponível."));
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <LeadsQuiz form={form} />;
}
