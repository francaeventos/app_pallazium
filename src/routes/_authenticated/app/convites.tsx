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
import { StorageImageInput } from "@/components/StorageImageInput";
import { useMyEvent } from "@/hooks/use-my-event";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  invitationStatusLabels,
  publicInvitationUrl,
  rsvpStatusLabels,
  type RsvpStatus,
} from "@/lib/invitation-utils";
import { CheckCircle2, Copy, Gift, MailCheck, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/convites")({ component: Page });

type Invitation = Database["public"]["Tables"]["event_invitations"]["Row"];
type Guest = Database["public"]["Tables"]["event_guests"]["Row"];
type PartyMember = Database["public"]["Tables"]["event_party_members"]["Row"];
type GiftItem = Database["public"]["Tables"]["event_gift_items"]["Row"];

function Page() {
  const { data, loading } = useMyEvent();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [party, setParty] = useState<PartyMember[]>([]);
  const [giftItems, setGiftItems] = useState<GiftItem[]>([]);
  const [editingGiftItem, setEditingGiftItem] = useState<GiftItem | null>(null);
  const [guestStatus, setGuestStatus] = useState<RsvpStatus>("pendente");
  const [invitationStatus, setInvitationStatus] = useState<Invitation["status"]>("rascunho");

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
    const [
      { data: invitationData },
      { data: guestData },
      { data: partyData },
      { data: giftsData },
    ] = await Promise.all([
      supabase.from("event_invitations").select("*").eq("event_id", event.id).maybeSingle(),
      supabase.from("event_guests").select("*").eq("event_id", event.id).order("created_at"),
      supabase.from("event_party_members").select("*").eq("event_id", event.id).order("sort_order"),
      supabase.from("event_gift_items").select("*").eq("event_id", event.id).order("sort_order"),
    ]);
    setInvitation(invitationData ?? null);
    setGuests(guestData ?? []);
    setParty(partyData ?? []);
    setGiftItems(giftsData ?? []);
  }, [event]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setInvitationStatus(invitation?.status ?? "rascunho");
  }, [invitation?.status]);

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
    const { data: createdGuest, error } = await supabase
      .from("event_guests")
      .insert({
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
        notes: String(fd.get("notes") || "") || null,
        responded_at: status === "pendente" ? null : new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    if (createdGuest) setGuests((current) => [...current, createdGuest]);
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

  const saveInvitation = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const fd = new FormData(formEvent.currentTarget);
    const status = invitationStatus;
    const payload = {
      event_id: event.id,
      title: String(fd.get("title")),
      message: String(fd.get("message") || "") || null,
      cover_image_url: String(fd.get("cover_image_url") || "") || null,
      dress_code: String(fd.get("dress_code") || "") || null,
      ceremony_location: String(fd.get("ceremony_location") || "") || null,
      reception_location: String(fd.get("reception_location") || "") || null,
      map_url: String(fd.get("map_url") || "") || null,
      status,
      published_at: status === "publicado" ? new Date().toISOString() : invitation?.published_at,
    };

    const { data: savedInvitation, error } = invitation
      ? await supabase
          .from("event_invitations")
          .update(payload)
          .eq("id", invitation.id)
          .select()
          .single()
      : await supabase.from("event_invitations").insert(payload).select().single();

    if (error) return toast.error(error.message);
    if (savedInvitation) {
      setInvitation(savedInvitation);
      setInvitationStatus(savedInvitation.status);
    }
    toast.success(invitation ? "Convite atualizado" : "Convite criado");
    load();
  };

  const saveGiftItem = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const fd = new FormData(formEvent.currentTarget);
    const referenceLinks = [
      String(fd.get("link_1") || ""),
      String(fd.get("link_2") || ""),
      String(fd.get("link_3") || ""),
    ]
      .map((link) => link.trim())
      .filter(Boolean);

    const payload = {
      event_id: event.id,
      name: String(fd.get("name")),
      image_url: String(fd.get("image_url") || "") || null,
      reference_links: referenceLinks,
      notes: String(fd.get("notes") || "") || null,
      sort_order: editingGiftItem?.sort_order ?? giftItems.length,
    };

    const { data: savedGiftItem, error } = editingGiftItem
      ? await supabase
          .from("event_gift_items")
          .update(payload)
          .eq("id", editingGiftItem.id)
          .select()
          .single()
      : await supabase.from("event_gift_items").insert(payload).select().single();

    if (error) return toast.error(error.message);
    if (savedGiftItem) {
      setGiftItems((current) =>
        editingGiftItem
          ? current.map((item) => (item.id === savedGiftItem.id ? savedGiftItem : item))
          : [...current, savedGiftItem],
      );
    }
    toast.success(editingGiftItem ? "Presente atualizado" : "Presente adicionado");
    setEditingGiftItem(null);
    formEvent.currentTarget.reset();
    load();
  };

  const removeGiftItem = async (id: string) => {
    if (!window.confirm("Excluir este item da lista de presentes?")) return;
    const { error } = await supabase.from("event_gift_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setGiftItems((current) => current.filter((item) => item.id !== id));
    if (editingGiftItem?.id === id) setEditingGiftItem(null);
    toast.success("Item removido");
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

      {invitation && (
        <Card className="overflow-hidden">
          {invitation.cover_image_url && (
            <div
              className="h-56 bg-muted bg-cover bg-center"
              style={{ backgroundImage: `url(${invitation.cover_image_url})` }}
            />
          )}
          <CardContent className="space-y-3 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Convite digital
                </p>
                <h2 className="mt-2 font-serif text-3xl">{invitation.title}</h2>
              </div>
              <Badge variant="outline">{invitationStatusLabels[invitation.status]}</Badge>
            </div>
            {invitation.message && (
              <p className="text-sm leading-relaxed text-muted-foreground">{invitation.message}</p>
            )}
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Dress code" value={invitation.dress_code} />
              <Info label="Cerimônia" value={invitation.ceremony_location} />
              <Info label="Recepção" value={invitation.reception_location} />
              <Info label="Mapa" value={invitation.map_url ? "Disponível no convite" : null} />
              <Info
                label="Lista de presentes"
                value={
                  giftItems.length > 0
                    ? `${giftItems.length} presente(s) cadastrado(s)`
                    : invitation.gift_list_url
                      ? "Link externo disponível"
                      : null
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">
            {invitation ? "Editar convite digital" : "Criar convite digital"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveInvitation} className="grid gap-4 lg:grid-cols-2">
            <div>
              <Label>Título do convite</Label>
              <Input
                name="title"
                required
                defaultValue={invitation?.title ?? `Convite para ${event.event_type}`}
              />
            </div>
            <div>
              <Label>Status</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={invitationStatus}
                onChange={(event) =>
                  setInvitationStatus(event.target.value as Invitation["status"])
                }
              >
                <option value="rascunho">Rascunho</option>
                <option value="publicado">Publicado</option>
                <option value="pausado">Pausado</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Publique para liberar os links individuais dos convidados.
              </p>
            </div>
            <div className="lg:col-span-2">
              <Label>Mensagem</Label>
              <Textarea
                name="message"
                rows={4}
                placeholder="Com carinho, convidamos você para celebrar este momento especial conosco."
                defaultValue={invitation?.message ?? ""}
              />
            </div>
            <div>
              <StorageImageInput
                bucket="convites"
                name="cover_image_url"
                label="Imagem de capa"
                defaultValue={invitation?.cover_image_url ?? ""}
                folder="capas"
              />
            </div>
            <div>
              <Label>Dress code</Label>
              <Input name="dress_code" defaultValue={invitation?.dress_code ?? ""} />
            </div>
            <div>
              <Label>Local da cerimônia</Label>
              <Input name="ceremony_location" defaultValue={invitation?.ceremony_location ?? ""} />
            </div>
            <div>
              <Label>Local da recepção</Label>
              <Input
                name="reception_location"
                defaultValue={invitation?.reception_location ?? ""}
              />
            </div>
            <div className="lg:col-span-2">
              <Label>Link do mapa</Label>
              <Input
                name="map_url"
                type="url"
                placeholder="https://maps.google.com/..."
                defaultValue={invitation?.map_url ?? ""}
              />
            </div>
            <div className="lg:col-span-2">
              <Button type="submit">{invitation ? "Salvar convite" : "Criar convite"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Lista de presentes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form
            key={editingGiftItem?.id ?? "new-gift-item"}
            onSubmit={saveGiftItem}
            className="space-y-3"
          >
            <div>
              <Label>Nome do produto</Label>
              <Input
                name="name"
                required
                defaultValue={editingGiftItem?.name ?? ""}
                placeholder="Ex.: Jogo de taças, air fryer..."
              />
            </div>
            <StorageImageInput
              bucket="convites"
              name="image_url"
              label="Foto do presente"
              defaultValue={editingGiftItem?.image_url ?? ""}
              folder="presentes"
            />
            <div>
              <Label>Link de referência 1</Label>
              <Input
                name="link_1"
                type="url"
                defaultValue={editingGiftItem?.reference_links[0] ?? ""}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Link de referência 2</Label>
              <Input
                name="link_2"
                type="url"
                defaultValue={editingGiftItem?.reference_links[1] ?? ""}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Link de referência 3</Label>
              <Input
                name="link_3"
                type="url"
                defaultValue={editingGiftItem?.reference_links[2] ?? ""}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea
                name="notes"
                defaultValue={editingGiftItem?.notes ?? ""}
                placeholder="Cor, modelo, tamanho ou preferência..."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="flex-1">
                <Gift className="mr-1 h-4 w-4" />
                {editingGiftItem ? "Salvar presente" : "Adicionar presente"}
              </Button>
              {editingGiftItem && (
                <Button type="button" variant="outline" onClick={() => setEditingGiftItem(null)}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>

          <div className="space-y-3">
            {giftItems.length === 0 && (
              <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                Nenhum presente cadastrado ainda. Os itens aparecerão no convite público.
              </p>
            )}
            {giftItems.map((item) => (
              <div key={item.id} className="rounded-xl border p-4">
                {item.image_url && (
                  <div
                    className="mb-3 aspect-[4/3] rounded-xl border bg-muted bg-cover bg-center"
                    style={{ backgroundImage: `url(${item.image_url})` }}
                  />
                )}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.notes && (
                      <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>
                    )}
                    {item.reserved_at && (
                      <Badge variant="outline" className="mt-2">
                        Reservado
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingGiftItem(item)}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-rose"
                      onClick={() => removeGiftItem(item.id)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Excluir
                    </Button>
                  </div>
                </div>
                {item.reference_links.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.reference_links.map((link, index) => (
                      <Button key={link} asChild size="sm" variant="outline">
                        <a href={link} target="_blank" rel="noreferrer">
                          Referência {index + 1}
                        </a>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
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
