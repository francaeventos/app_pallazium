import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/app/referencias")({ component: () => <Stub title="Referências" /> });

function Stub({ title }: { title: string }) {
  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <h1 className="font-serif text-4xl">{title}</h1>
      <Card className="mt-6"><CardContent className="p-10 text-center text-muted-foreground">Em breve.</CardContent></Card>
    </div>
  );
}
