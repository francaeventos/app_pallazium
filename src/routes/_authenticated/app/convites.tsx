import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ClientEmptyState } from "@/components/ClientEmptyState";
import { useMyEvent } from "@/hooks/use-my-event";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  invitationStatusLabels,
  publicInvitationUrl,
  rsvpStatusLabels,
  type RsvpStatus,
} from "@/lib/invitation-utils";
import { CheckCircle2, Copy, MailCheck, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/convites")({ component: Page });

type Invitation = Database["public"]["Tables"]["event_invitations"]["Row"];
type Guest = Database["public"]["Tables"]["event_guests"]["Row"];
type PartyMember = Database["public"]["Tables"]["event_party_members"]["Row"];

function Page() {
  const { data, loading } = useMyEvent();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [party, setParty] = useState<PartyMember[]>([]);
  const [guestStatus, setGuestStatus] = useState<RsvpStatus>("pendente");

  const event = data?.event ?? null;
  const totals = useMemo(() => {
    const confirmed = guests.filter((guest) => guest.rsvp_status === "confirmado");
    return {
      confirmed: confirmed.length,
      people:
        confirmed.length +
        confirmed.reduce((total, guest) => total + guest.confirmed_companions, 0),
      pending: guests.filter((guest) => guest.rsvp_status === "pendente").length,
    };
  }, [guests]);

  const load = useCallback(async () => {
    if (!event) return;
    const [{ data: invitationData }, { data: guestData }, { data: partyData }] = await Promise.all([
      supabase.from("event_invitations").select("*").eq("event_id", event.id).maybeSingle(),
      supabase.from("event_guests").select("*").eq("event_id", event.id).order("created_at"),
      supabase.from("event_party_members").select("*").eq("event_id", event.id).order("sort_order"),
    ]);
    setInvitation(invitationData ?? null);
    setGuests(guestData ?? []);
    setParty(partyData ?? []);
  }, [event]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando convites…</div>;

  if (!event) {
    return (
      <div className="p-6 lg:p-10">
        <ClientEmptyState
          icon={MailCheck}
          title="Convites em configuração"
          description="Assim que seu evento for vinculado, você poderá acompanhar convidados, confirmações e padrinhos."
        />
      </div>
    );
  }

  const saveGuest = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const fd = new FormData(formEvent.currentTarget);
    const allowed = Number(fd.get("allowed_companions")) || 0;
    const status = guestStatus;
    const { error } = await supabase.from("event_guests").insert({
      event_id: event.id,
      invitation_id: invitation?.id ?? null,
      name: String(fd.get("name")),
      phone: String(fd.get("phone") || "") || null,
      email: String(fd.get("email") || "") || null,
      group_name: String(fd.get("group_name") || "") || null,
      allowed_companions: allowed,
      confirmed_companions:
        status === "confirmado"
          ? Math.min(Number(fd.get("confirmed_companions")) || 0, allowed)
          : 0,
      rsvp_status: status,
      dietary_restrictions: String(fd.get("dietary_restrictions") || "") || null,
      notes: String(fd.get("notes") || "") || null,
      responded_at: status === "pendente" ? null : new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Convidado adicionado");
    formEvent.currentTarget.reset();
    setGuestStatus("pendente");
    load();
  };

  const removeGuest = async (id: string) => {
    if (!window.confirm("Excluir convidado?")) return;
    const { error } = await supabase.from("event_guests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Convidado excluído");
    load();
  };

  const copyGuestLink = async (guest: Guest) => {
    const url = publicInvitationUrl(guest.public_token);
    if (!url) return toast.error("Link individual indisponível.");
    await navigator.clipboard.writeText(url);
    toast.success(`Link de ${guest.name} copiado`);
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Seu evento</p>
          <h1 className="font-serif text-4xl mt-2">Convites e confirmações</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acompanhe sua lista de convidados, padrinhos e confirmações de presença.
          </p>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          Cada convidado recebe um link individual para confirmar presença.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label="Convidados" value={guests.length} />
        <Metric icon={CheckCircle2} label="Confirmados" value={totals.confirmed} />
        <Metric icon={Users} label="Pessoas confirmadas" value={totals.people} />
        <Metric icon={MailCheck} label="Pendentes" value={totals.pending} />
      </div>

      <Card className="overflow-hidden">
        {invitation?.cover_image_url && (
          <div
            className="h-56 bg-muted bg-cover bg-center"
            style={{ backgroundImage: `url(${invitation.cover_image_url})` }}
          />
        )}
        <CardContent className="p-6 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Convite digital
              </p>
              <h2 className="mt-2 font-serif text-3xl">
                {invitation?.title ?? "Convite ainda não criado"}
              </h2>
            </div>
            {invitation && (
              <Badge variant="outline">{invitationStatusLabels[invitation.status]}</Badge>
            )}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {invitation?.message ??
              "A equipe Pallazium está preparando o convite digital. Quando estiver publicado, o link aparecerá aqui para compartilhar."}
          </p>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Dress code" value={invitation?.dress_code} />
            <Info label="Cerimônia" value={invitation?.ceremony_location} />
            <Info label="Recepção" value={invitation?.reception_location} />
            <Info label="Mapa" value={invitation?.map_url ? "Disponível no convite" : null} />
            <Info
              label="Lista de presentes"
              value={invitation?.gift_list_url ? "Disponível no convite" : null}
            />
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Adicionar convidado</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveGuest} className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input name="name" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telefone</Label>
                  <Input name="phone" />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input name="email" type="email" />
                </div>
              </div>
              <div>
                <Label>Grupo</Label>
                <Input name="group_name" placeholder="Família, amigos..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Acompanhantes</Label>
                  <Input name="allowed_companions" type="number" min="0" defaultValue={0} />
                </div>
                <div>
                  <Label>Confirmados</Label>
                  <Input name="confirmed_companions" type="number" min="0" defaultValue={0} />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={guestStatus}
                  onValueChange={(value) => setGuestStatus(value as RsvpStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="recusado">Recusado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Restrições alimentares</Label>
                <Input name="dietary_restrictions" />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea name="notes" />
              </div>
              <Button type="submit" className="w-full">
                <Plus className="mr-1 h-4 w-4" />
                Adicionar
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Lista de convidados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {guests.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum convidado cadastrado.</p>
              )}
              {guests.map((guest) => (
                <div key={guest.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{guest.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {guest.group_name ?? "Sem grupo"} • {guest.phone ?? "sem telefone"}
                      </p>
                    </div>
                    <Badge variant={guest.rsvp_status === "confirmado" ? "default" : "outline"}>
                      {rsvpStatusLabels[guest.rsvp_status]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Acompanhantes: {guest.confirmed_companions}/{guest.allowed_companions}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!invitation || invitation.status !== "publicado"}
                      onClick={() => copyGuestLink(guest)}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Copiar link individual
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose"
                      onClick={() => removeGuest(guest.id)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Padrinhos e cortejo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {party.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma pessoa cadastrada.</p>
              )}
              {party.map((member) => (
                <div key={member.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.role} {member.side && `• ${member.side}`}
                      </p>
                    </div>
                    <Badge variant={member.rsvp_status === "confirmado" ? "default" : "outline"}>
                      {rsvpStatusLabels[member.rsvp_status]}
                    </Badge>
                  </div>
                  {member.attire && (
                    <p className="mt-2 text-xs text-muted-foreground">Traje: {member.attire}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <Icon className="h-5 w-5 text-gold" />
        <p className="mt-3 font-serif text-4xl">{value}</p>
        <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value || "A definir"}</p>
    </div>
  );
}
