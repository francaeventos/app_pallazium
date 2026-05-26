import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listChecklistEventsFn } from "@/fns/checklist";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/checklist/")({ component: Page });

type EventWithClient = {
  id: string;
  event_type: string;
  event_date: string | null;
  clients: { full_name: string } | null;
};

function Page() {
  const [events, setEvents] = useState<EventWithClient[]>([]);
  useEffect(() => {
    listChecklistEventsFn().then(setEvents);
  }, []);
  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-4">
      <h1 className="font-serif text-4xl">Checklists por evento</h1>
      <Card>
        <CardContent className="divide-y">
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">Nenhum evento.</p>
          )}
          {events.map((e) => (
            <Link
              key={e.id}
              to="/admin/checklist/$eventId"
              params={{ eventId: e.id }}
              className="py-3 flex items-center justify-between hover:bg-muted/40 px-2 -mx-2 rounded"
            >
              <div>
                <p className="font-medium">{e.clients?.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {e.event_type} • {e.event_date ?? "sem data"}
                </p>
              </div>
              <span className="text-xs text-gold">Abrir →</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
