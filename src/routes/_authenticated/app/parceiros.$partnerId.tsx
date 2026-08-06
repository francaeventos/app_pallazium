import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPartnerDetailFn, registerPartnerInterestFn, type PartnerDetail } from "@/fns/partners";
import { useMyEvent } from "@/hooks/use-my-event";
import { PartnerProfileView } from "@/components/PartnerProfileView";
import { Button } from "@/components/ui/button";
import { Check, Handshake } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/parceiros/$partnerId")({
  component: Page,
});

const statusLabels: Record<string, string> = {
  novo: "Interesse enviado",
  em_contato: "Equipe já te chamou",
  vendido: "Fechado",
  perdido: "Não avançou",
};

function Page() {
  const { partnerId } = Route.useParams();
  const { data: eventData } = useMyEvent();
  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const { partner } = await getPartnerDetailFn({ data: { partnerId } });
      setPartner(partner);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Parceiro não encontrado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  const showInterest = async () => {
    if (!partner) return;
    if (!eventData?.client || !eventData?.event) {
      return toast.error("Seu evento precisa estar vinculado para registrar interesse.");
    }
    setSending(true);
    try {
      await registerPartnerInterestFn({
        data: { partnerId: partner.id, eventId: eventData.event.id },
      });
      toast.success("Interesse enviado! A equipe Espaço Pallazium vai fazer a ponte com o parceiro.");
      setPartner({ ...partner, interest_status: "novo" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao registrar interesse";
      if (message === "DUPLICATE") {
        toast.info("Você já registrou interesse neste parceiro.");
      } else {
        toast.error(message);
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;
  if (!partner) return null;

  const interested = Boolean(partner.interest_status);

  return (
    <div className="p-6 lg:p-10">
      <PartnerProfileView
        partner={partner}
        backTo="/app/parceiros"
        backLabel="Voltar aos parceiros"
        cta={
          <>
            <Button
              size="lg"
              className="w-full"
              disabled={sending || interested}
              onClick={showInterest}
            >
              {interested ? (
                <>
                  <Check className="h-4 w-4" />
                  {statusLabels[partner.interest_status ?? "novo"] ?? "Interesse enviado"}
                </>
              ) : (
                <>
                  <Handshake className="h-4 w-4" />
                  Tenho interesse
                </>
              )}
            </Button>
            {!eventData?.event && !interested && (
              <p className="text-center text-xs text-muted-foreground">
                Seu evento precisa estar vinculado para registrar interesse.
              </p>
            )}
          </>
        }
      />
    </div>
  );
}
