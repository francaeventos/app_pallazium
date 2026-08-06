import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getOwnPartnerFn } from "@/fns/partner-profile";
import { PartnerProfileView, type PartnerProfileData } from "@/components/PartnerProfileView";
import { ClientEmptyState } from "@/components/ClientEmptyState";
import { Button } from "@/components/ui/button";
import { Handshake } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/parceiro/preview")({ component: Page });

function Page() {
  const [partner, setPartner] = useState<PartnerProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOwnPartnerFn()
      .then(({ partner }) => setPartner(partner))
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Não foi possível carregar seu perfil.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  if (!partner) {
    return (
      <div className="p-6 lg:p-12">
        <ClientEmptyState
          icon={Handshake}
          title="Sua conta ainda não está vinculada"
          description="Assim que a equipe Espaço Pallazium vincular sua conta ao cadastro do seu negócio, você poderá ver aqui como os clientes enxergam seu perfil."
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="mx-auto mb-6 max-w-6xl rounded-xl border border-gold/30 bg-champagne/40 p-4 text-sm text-muted-foreground">
        Esta é uma prévia de como os clientes do Espaço Pallazium veem o seu perfil na vitrine de
        parceiros.
      </div>
      <PartnerProfileView
        partner={partner}
        backTo="/parceiro"
        backLabel="Voltar ao meu perfil"
        cta={
          <>
            <Button size="lg" className="w-full" disabled>
              <Handshake className="h-4 w-4" />
              Tenho interesse
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              É assim que o botão aparece para o cliente sinalizar interesse no seu negócio.
            </p>
          </>
        }
      />
    </div>
  );
}
