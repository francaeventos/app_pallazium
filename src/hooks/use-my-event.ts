import { useEffect, useState } from "react";
import { getMyEventFn, type EventBundle } from "@/fns/my-event";
import { useAuth } from "@/lib/auth";

export type { EventBundle } from "@/fns/my-event";

export function useMyEvent(): { data: EventBundle | null; loading: boolean; reload: () => void } {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<EventBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const bundle = await getMyEventFn();
        if (!cancelled) {
          setData(bundle);
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro ao carregar evento", error);
        if (!cancelled) {
          setData({ event: null, client: null, checklist: [], guestLimitExceeded: false });
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, tick]);

  return { data, loading: authLoading || loading, reload: () => setTick((t) => t + 1) };
}
