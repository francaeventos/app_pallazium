import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type EventRow = Database["public"]["Tables"]["events"]["Row"];
type ChecklistRow = Database["public"]["Tables"]["checklist_items"]["Row"];

type ClientSummary = Pick<
  ClientRow,
  "id" | "full_name" | "email" | "phone" | "whatsapp" | "status"
>;
type EventSummary = Pick<
  EventRow,
  | "id"
  | "client_id"
  | "event_type"
  | "event_date"
  | "start_time"
  | "end_time"
  | "location"
  | "estimated_guests"
  | "status"
  | "client_notes"
>;
type ChecklistSummary = Pick<
  ChecklistRow,
  | "id"
  | "event_id"
  | "title"
  | "description"
  | "status"
  | "priority"
  | "due_date"
  | "client_notes"
  | "attachment_url"
  | "sort_order"
  | "created_at"
  | "updated_at"
>;

export interface EventBundle {
  event: EventSummary | null;
  client: ClientSummary | null;
  checklist: ChecklistSummary[];
}

export function useMyEvent(): { data: EventBundle | null; loading: boolean; reload: () => void } {
  const { user } = useAuth();
  const [data, setData] = useState<EventBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: clients } = await supabase
        .from("clients")
        .select("id, full_name, email, phone, whatsapp, status")
        .eq("user_id", user.id)
        .limit(1);
      const client: ClientSummary | null = clients?.[0] ?? null;
      if (!client) {
        if (!cancelled) {
          setData({ event: null, client: null, checklist: [] });
          setLoading(false);
        }
        return;
      }
      const { data: events } = await supabase
        .from("events")
        .select(
          "id, client_id, event_type, event_date, start_time, end_time, location, estimated_guests, status, client_notes",
        )
        .eq("client_id", client.id)
        .neq("status", "cancelado")
        .order("event_date", { ascending: true })
        .limit(1);
      const event: EventSummary | null = events?.[0] ?? null;
      let checklist: ChecklistSummary[] = [];
      if (event) {
        const { data: items } = await supabase
          .from("checklist_items")
          .select(
            "id, event_id, title, description, status, priority, due_date, client_notes, attachment_url, sort_order, created_at, updated_at",
          )
          .eq("event_id", event.id)
          .order("sort_order");
        checklist = items ?? [];
      }
      if (!cancelled) {
        setData({ event, client, checklist });
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, tick]);

  return { data, loading, reload: () => setTick((t) => t + 1) };
}
