import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listOwnPartnerInterestsFn, updateOwnPartnerInterestStatusFn } from "@/fns/partner-interests";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientEmptyState } from "@/components/ClientEmptyState";
import { Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/parceiro/interesses")({ component: Page });

type InterestStatus = "novo" | "em_contato" | "vendido" | "perdido";
type Interest = Awaited<ReturnType<typeof listOwnPartnerInterestsFn>>["interests"][number];

const statusLabel = (status: string) =>
  ({ novo: "Novo", em_contato: "Em contato", vendido: "Vendido", perdido: "Perdido" })[status] ??
  status;

function Page() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { interests } = await listOwnPartnerInterestsFn();
      setInterests(interests);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: InterestStatus) => {
    setInterests((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );
    try {
      await updateOwnPartnerInterestStatusFn({ data: { id, status } });
      toast.success("Status atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
      load();
    }
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-10">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Painel do Parceiro
        </p>
        <h1 className="mt-2 font-serif text-4xl">Clientes com interesse</h1>
        <p className="mt-2 text-muted-foreground">
          Clientes do Espaço Pallazium que sinalizaram interesse no seu negócio.
        </p>
      </div>

      {interests.length === 0 ? (
        <ClientEmptyState
          icon={Users}
          title="Nenhum cliente liberado ainda"
          description="Quando um cliente sinalizar interesse e a equipe Espaço Pallazium liberar os dados de contato, ele aparece aqui."
        />
      ) : (
        <div className="space-y-3">
          {interests.map((interest) => (
            <Card key={interest.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-serif text-xl">{interest.client.full_name}</p>
                    <Badge variant={interest.status === "novo" ? "default" : "outline"}>
                      {statusLabel(interest.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {interest.client.email}
                    {interest.client.whatsapp && ` • ${interest.client.whatsapp}`}
                  </p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {interest.event.event_type}
                    {interest.event.event_date
                      ? ` • ${format(new Date(interest.event.event_date), "dd/MM/yyyy")}`
                      : ""}{" "}
                    • sinalizado {format(new Date(interest.created_at), "dd/MM/yyyy")}
                  </p>
                </div>
                <Select
                  value={interest.status}
                  onValueChange={(value) => updateStatus(interest.id, value as InterestStatus)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_contato">Em contato</SelectItem>
                    <SelectItem value="vendido">Vendido</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
