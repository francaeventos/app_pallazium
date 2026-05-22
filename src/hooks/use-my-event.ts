import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface EventBundle {
  event: any | null;
  client: any | null;
  checklist: any[];
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
        .select("*")
        .eq("user_id", user.id)
        .limit(1);
      const client = clients?.[0] ?? null;
      if (!client) {
        if (!cancelled) { setData({ event: null, client: null, checklist: [] }); setLoading(false); }
        return;
      }
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("client_id", client.id)
        .order("event_date", { ascending: true })
        .limit(1);
      const event = events?.[0] ?? null;
      let checklist: any[] = [];
      if (event) {
        const { data: items } = await supabase
          .from("checklist_items")
          .select("*")
          .eq("event_id", event.id)
          .order("sort_order");
        checklist = items ?? [];
      }
      if (!cancelled) { setData({ event, client, checklist }); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user, tick]);

  return { data, loading, reload: () => setTick((t) => t + 1) };
}
