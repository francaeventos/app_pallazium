import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AdminEmptyState } from "@/components/AdminEmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { StorageImageInput } from "@/components/StorageImageInput";
import {
  deleteGuestFn,
  deletePartyMemberFn,
  ensureGuestTokenFn,
  getInvitationDetailsFn,
  saveGuestFn,
  saveInvitationFn,
  savePartyMemberFn,
} from "@/fns/admin-invitations";
import {
  invitationStatusLabels,
  publicInvitationUrl,
  rsvpStatusLabels,
  type InvitationStatus,
  type RsvpStatus,
} from "@/lib/invitation-utils";
import { ArrowLeft, CheckCircle2, Copy, MailCheck, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_INVITATION_MESSAGE, PALLAZIUM_ADDRESS } from "@/lib/pallazium-venue";

export const Route = createFileRoute("/_authenticated/admin/convites/$eventId")({ component: Page });

type EventRow = Awaited<ReturnType<typeof getInvitationDetailsFn>>["event"];
type Invitation = NonNullable<
  Awaited<ReturnType<typeof getInvitationDetailsFn>>["invitation"]
>;
type Guest = Awaited<ReturnType<typeof getInvitationDetailsFn>>["guests"][number];
type PartyMember = Awaited<ReturnType<typeof getInvitationDetailsFn>>["party"][number];

function Page() {
  const { eventId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [party, setParty] = useState<PartyMember[]>([]);
  const [guestOpen, setGuestOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editingParty, setEditingParty] = useState<PartyMember | null>(null);
  const [invitationStatus, setInvitationStatus] = useState<InvitationStatus>("rascunho");
  const [ceremonyExternal, setCeremonyExternal] = useState(false);
  const [guestStatus, setGuestStatus] = useState<RsvpStatus>("pendente");
  const [partyStatus, setPartyStatus] = useState<RsvpStatus>("pendente");

  const totals = {
    guests: guests.length,
    confirmed: guests.filter((guest) => guest.rsvp_status === "confirmado").length,
    people:
      guests.filter((guest) => guest.rsvp_status === "confirmado").length +
      guests
        .filter((guest) => guest.rsvp_status === "confirmado")
        .reduce((total, guest) => total + guest.confirmed_companions, 0),
    pending: guests.filter((guest) => guest.rsvp_status === "pendente").length,
    declined: guests.filter((guest) => guest.rsvp_status === "recusado").length,
    party: party.length,
  };

  const loadDetails = useCallback(async (id: string) => {
    try {
      const {
        event: eventData,
        invitation: invitationData,
        guests: guestData,
        party: partyData,
      } = await getInvitationDetailsFn({ data: { eventId: id } });
      setSelectedEvent(eventData);
      setInvitation(invitationData);
      setGuests(guestData);
      setParty(partyData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar o convite.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDetails(eventId);
  }, [eventId, loadDetails]);

  useEffect(() => {
    setInvitationStatus(invitation?.status ?? "rascunho");
  }, [invitation?.status]);

  useEffect(() => {
    setCeremonyExternal(invitation?.ceremony_external ?? false);
  }, [invitation?.ceremony_external]);

  useEffect(() => {
    if (!editingGuest) return;
    setGuestStatus(editingGuest.rsvp_status);
  }, [editingGuest]);

  useEffect(() => {
    if (!editingParty) return;
    setPartyStatus(editingParty.rsvp_status);
  }, [editingParty]);

  const saveInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventId) return toast.error("Selecione um evento.");
    const fd = new FormData(event.currentTarget);
    const status = invitationStatus;
    const payload = {
      event_id: eventId,
      title: String(fd.get("title")),
      message: String(fd.get("message") || "") || null,
      cover_image_url: String(fd.get("cover_image_url") || "") || null,
      dress_code: String(fd.get("dress_code") || "") || null,
      ceremony_external: ceremonyExternal,
      ceremony_location: String(fd.get("ceremony_location") || "") || null,
      ceremony_address: String(fd.get("ceremony_address") || "") || null,
      ceremony_map_url: String(fd.get("ceremony_map_url") || "") || null,
      gift_list_url: String(fd.get("gift_list_url") || "") || null,
      whatsapp_text: String(fd.get("whatsapp_text") || "") || null,
      status,
      published_at: status === "publicado" ? new Date().toISOString() : invitation?.published_at,
    };

    try {
      await saveInvitationFn({
        data: {
          id: invitation?.id,
          event_id: payload.event_id,
          title: payload.title,
          message: payload.message ?? undefined,
          cover_image_url: payload.cover_image_url ?? undefined,
          dress_code: payload.dress_code ?? undefined,
          ceremony_external: payload.ceremony_external,
          ceremony_location: payload.ceremony_location ?? undefined,
          ceremony_address: payload.ceremony_address ?? undefined,
          ceremony_map_url: payload.ceremony_map_url ?? undefined,
          gift_list_url: payload.gift_list_url ?? undefined,
          whatsapp_text: payload.whatsapp_text ?? undefined,
          status,
          published_at: payload.published_at,
        },
      });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
    toast.success(invitation ? "Convite atualizado" : "Convite criado");
    loadDetails(eventId);
  };

  const saveGuest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventId) return toast.error("Selecione um evento.");
    const fd = new FormData(event.currentTarget);
    const status = guestStatus;
    const payload = {
      event_id: eventId,
      invitation_id: invitation?.id ?? null,
      name: String(fd.get("name")),
      phone: String(fd.get("phone") || "") || null,
      email: String(fd.get("email") || "") || null,
      group_name: String(fd.get("group_name") || "") || null,
      allowed_companions: Number(fd.get("allowed_companions")) || 0,
      confirmed_companions: Math.min(
        Number(fd.get("confirmed_companions")) || 0,
        Number(fd.get("allowed_companions")) || 0,
      ),
      rsvp_status: status,
      notes: String(fd.get("notes") || "") || null,
      public_token: editingGuest?.public_token || createPublicToken(),
      responded_at: status === "pendente" ? null : new Date().toISOString(),
    };
    try {
      await saveGuestFn({
        data: {
          id: editingGuest?.id,
          event_id: payload.event_id,
          invitation_id: payload.invitation_id,
          name: payload.name,
          phone: payload.phone ?? undefined,
          email: payload.email ?? undefined,
          group_name: payload.group_name ?? undefined,
          allowed_companions: payload.allowed_companions,
          confirmed_companions: payload.confirmed_companions,
          rsvp_status: payload.rsvp_status,
          notes: payload.notes ?? undefined,
          public_token: payload.public_token,
        },
      });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
    toast.success(editingGuest ? "Convidado atualizado" : "Convidado criado");
    closeGuestDialog();
    loadDetails(eventId);
  };

  const saveParty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventId) return toast.error("Selecione um evento.");
    const fd = new FormData(event.currentTarget);
    const payload = {
      event_id: eventId,
      name: String(fd.get("name")),
      role: String(fd.get("role")),
      side: String(fd.get("side") || "") || null,
      phone: String(fd.get("phone") || "") || null,
      email: String(fd.get("email") || "") || null,
      attire: String(fd.get("attire") || "") || null,
      rsvp_status: partyStatus,
      notes: String(fd.get("notes") || "") || null,
      sort_order: Number(fd.get("sort_order")) || 0,
    };
    try {
      await savePartyMemberFn({
        data: {
          id: editingParty?.id,
          event_id: payload.event_id,
          name: payload.name,
          role: payload.role,
          side: payload.side ?? undefined,
          phone: payload.phone ?? undefined,
          email: payload.email ?? undefined,
          attire: payload.attire ?? undefined,
          rsvp_status: payload.rsvp_status,
          notes: payload.notes ?? undefined,
          sort_order: payload.sort_order,
        },
      });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
    toast.success(editingParty ? "Padrinho atualizado" : "Padrinho cadastrado");
    closePartyDialog();
    loadDetails(eventId);
  };

  const removeGuest = async (id: string) => {
    if (!window.confirm("Excluir este convidado?")) return;
    try {
      await deleteGuestFn({ data: { id } });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
    toast.success("Convidado excluído");
    loadDetails(eventId);
  };

  const removeParty = async (id: string) => {
    if (!window.confirm("Excluir este padrinho/madrinha?")) return;
    try {
      await deletePartyMemberFn({ data: { id } });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
    toast.success("Registro excluído");
    loadDetails(eventId);
  };

  const copyGuestLink = async (guest: Guest) => {
    if (!invitation) return toast.error("Crie e salve o convite antes de copiar links.");
    if (invitation.status !== "publicado") {
      return toast.error("Publique o convite para liberar o link individual.");
    }

    let publicToken = guest.public_token;
    if (!publicToken) {
      try {
        const updated = await ensureGuestTokenFn({ data: { id: guest.id } });
        publicToken = updated.public_token;
        setGuests((items) =>
          items.map((item) => (item.id === guest.id ? updated : item)),
        );
      } catch (error) {
        return toast.error(error instanceof Error ? error.message : "Não foi possível gerar o link.");
      }
    }

    const url = publicInvitationUrl(publicToken);
    if (!url) return toast.error("Link individual indisponível.");
    await navigator.clipboard.writeText(url);
    toast.success(`Link de ${guest.name} copiado`);
  };

  const closeGuestDialog = () => {
    setGuestOpen(false);
    setEditingGuest(null);
    setGuestStatus("pendente");
  };

  const closePartyDialog = () => {
    setPartyOpen(false);
    setEditingParty(null);
    setPartyStatus("pendente");
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <Link
          to="/admin/convites"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Todos os eventos
        </Link>
        <p className="mt-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Experiência
        </p>
        <h1 className="font-serif text-4xl mt-2">
          {selectedEvent
            ? `${selectedEvent.clients?.full_name ?? "Cliente"} • ${selectedEvent.event_type}`
            : "Convites e RSVP"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gerencie convite digital, convidados, confirmações e padrinhos do evento.
        </p>
      </div>

      {!loading && !selectedEvent && (
        <AdminEmptyState
          icon={MailCheck}
          title="Evento não encontrado"
          description="Esse evento não existe mais ou foi removido. Volte para a lista e escolha outro."
        />
      )}

      {selectedEvent && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Metric icon={Users} label="Convidados" value={totals.guests} />
            <Metric icon={CheckCircle2} label="Confirmados" value={totals.confirmed} />
            <Metric icon={Users} label="Pessoas confirmadas" value={totals.people} />
            <Metric icon={MailCheck} label="Pendentes" value={totals.pending} />
            <Metric icon={Users} label="Recusados" value={totals.declined} />
            <Metric icon={Users} label="Padrinhos" value={totals.party} />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="font-serif text-2xl">Convite digital</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  {invitation && (
                    <Badge variant={invitation.status === "publicado" ? "default" : "outline"}>
                      {invitationStatusLabels[invitation.status]}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Cada convidado tem um link individual abaixo.
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveInvitation} className="grid gap-4 lg:grid-cols-2">
                <div>
                  <Label>Título</Label>
                  <Input
                    name="title"
                    required
                    defaultValue={invitation?.title ?? `Convite para ${selectedEvent.event_type}`}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    name="status"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={invitationStatus}
                    onChange={(event) =>
                      setInvitationStatus(event.target.value as InvitationStatus)
                    }
                  >
                    <option value="rascunho">Rascunho</option>
                    <option value="publicado">Publicado</option>
                    <option value="pausado">Pausado</option>
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    name="message"
                    rows={4}
                    defaultValue={invitation?.message ?? DEFAULT_INVITATION_MESSAGE}
                  />
                </div>
                <div>
                  <StorageImageInput
                    bucket="convites"
                    name="cover_image_url"
                    label="Imagem de capa"
                    defaultValue={invitation?.cover_image_url ?? ""}
                    folder="capas"
                    recommendedSize="1600 x 900 pixels"
                  />
                </div>
                <div>
                  <Label>Dress code</Label>
                  <Input name="dress_code" defaultValue={invitation?.dress_code ?? ""} />
                </div>
                <div className="lg:col-span-2 rounded-lg border p-4 space-y-3">
                  <div>
                    <Label>Cerimônia e recepção</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Padrão: cerimônia e festa no Espaço Pallazium — {PALLAZIUM_ADDRESS}.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="ceremony_external"
                      checked={ceremonyExternal}
                      onCheckedChange={(checked) => setCeremonyExternal(checked === true)}
                    />
                    <Label htmlFor="ceremony_external" className="cursor-pointer font-normal">
                      Cerimônia em local externo
                    </Label>
                  </div>
                  {ceremonyExternal && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Nome do local da cerimônia</Label>
                        <Input
                          name="ceremony_location"
                          defaultValue={invitation?.ceremony_location ?? ""}
                        />
                      </div>
                      <div>
                        <Label>Endereço da cerimônia</Label>
                        <Input
                          name="ceremony_address"
                          defaultValue={invitation?.ceremony_address ?? ""}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Link do mapa da cerimônia</Label>
                        <Input
                          name="ceremony_map_url"
                          type="url"
                          placeholder="https://..."
                          defaultValue={invitation?.ceremony_map_url ?? ""}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Lista externa de presentes</Label>
                  <Input
                    name="gift_list_url"
                    type="url"
                    placeholder="https://..."
                    defaultValue={invitation?.gift_list_url ?? ""}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Opcional. A lista principal agora é criada pelo cliente dentro do sistema.
                  </p>
                </div>
                <div>
                  <Label>Texto para WhatsApp</Label>
                  <Input name="whatsapp_text" defaultValue={invitation?.whatsapp_text ?? ""} />
                </div>
                <div className="lg:col-span-2">
                  <Button type="submit">{invitation ? "Salvar convite" : "Criar convite"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="font-serif text-2xl">Convidados</CardTitle>
                  <Dialog
                    open={guestOpen}
                    onOpenChange={(open) => (open ? setGuestOpen(true) : closeGuestDialog())}
                  >
                    <DialogTrigger asChild>
                      <Button onClick={() => setGuestOpen(true)}>
                        <Plus className="mr-1 h-4 w-4" />
                        Convidado
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="font-serif text-2xl">
                          {editingGuest ? "Editar convidado" : "Novo convidado"}
                        </DialogTitle>
                      </DialogHeader>
                      <GuestForm
                        guest={editingGuest}
                        status={guestStatus}
                        onStatusChange={setGuestStatus}
                        onSubmit={saveGuest}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
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
                    {invitation?.status === "publicado" && guest.public_token && (
                      <p className="mt-2 break-all rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                        Link: {publicInvitationUrl(guest.public_token)}
                      </p>
                    )}
                    {invitation && invitation.status !== "publicado" && (
                      <p className="mt-2 text-xs text-amber-700">
                        Publique o convite para ativar o link individual deste convidado.
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingGuest(guest);
                          setGuestOpen(true);
                        }}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!invitation}
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="font-serif text-2xl">Padrinhos e cortejo</CardTitle>
                  <Dialog
                    open={partyOpen}
                    onOpenChange={(open) => (open ? setPartyOpen(true) : closePartyDialog())}
                  >
                    <DialogTrigger asChild>
                      <Button onClick={() => setPartyOpen(true)}>
                        <Plus className="mr-1 h-4 w-4" />
                        Pessoa
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="font-serif text-2xl">
                          {editingParty ? "Editar pessoa" : "Nova pessoa"}
                        </DialogTitle>
                      </DialogHeader>
                      <PartyForm
                        member={editingParty}
                        status={partyStatus}
                        onStatusChange={setPartyStatus}
                        onSubmit={saveParty}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {party.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum padrinho cadastrado.</p>
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingParty(member);
                          setPartyOpen(true);
                        }}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose"
                        onClick={() => removeParty(member.id)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </>
      )}
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
      <CardContent className="flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-champagne text-gold">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="font-serif text-2xl leading-none">{value}</p>
          <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function GuestForm({
  guest,
  status,
  onStatusChange,
  onSubmit,
}: {
  guest: Guest | null;
  status: RsvpStatus;
  onStatusChange: (status: RsvpStatus) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label>Nome</Label>
        <Input name="name" required defaultValue={guest?.name ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Telefone</Label>
          <Input name="phone" defaultValue={guest?.phone ?? ""} />
        </div>
        <div>
          <Label>E-mail</Label>
          <Input name="email" type="email" defaultValue={guest?.email ?? ""} />
        </div>
      </div>
      <div>
        <Label>Grupo</Label>
        <Input
          name="group_name"
          placeholder="Família, amigos, trabalho..."
          defaultValue={guest?.group_name ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Acompanhantes permitidos</Label>
          <Input
            name="allowed_companions"
            type="number"
            min="0"
            defaultValue={guest?.allowed_companions ?? 0}
          />
        </div>
        <div>
          <Label>Acompanhantes confirmados</Label>
          <Input
            name="confirmed_companions"
            type="number"
            min="0"
            defaultValue={guest?.confirmed_companions ?? 0}
          />
        </div>
      </div>
      <div>
        <Label>Status</Label>
        <Select value={status} onValueChange={(value) => onStatusChange(value as RsvpStatus)}>
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
        <Label>Observações internas</Label>
        <Textarea name="notes" defaultValue={guest?.notes ?? ""} />
      </div>
      <Button type="submit" className="w-full">
        Salvar
      </Button>
    </form>
  );
}

function PartyForm({
  member,
  status,
  onStatusChange,
  onSubmit,
}: {
  member: PartyMember | null;
  status: RsvpStatus;
  onStatusChange: (status: RsvpStatus) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label>Nome</Label>
        <Input name="name" required defaultValue={member?.name ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Função</Label>
          <Input
            name="role"
            required
            placeholder="Padrinho, madrinha..."
            defaultValue={member?.role ?? ""}
          />
        </div>
        <div>
          <Label>Lado</Label>
          <Input
            name="side"
            placeholder="Noiva, noivo, família..."
            defaultValue={member?.side ?? ""}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Telefone</Label>
          <Input name="phone" defaultValue={member?.phone ?? ""} />
        </div>
        <div>
          <Label>E-mail</Label>
          <Input name="email" type="email" defaultValue={member?.email ?? ""} />
        </div>
      </div>
      <div>
        <Label>Traje / orientação</Label>
        <Input name="attire" defaultValue={member?.attire ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => onStatusChange(value as RsvpStatus)}>
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
          <Label>Ordem</Label>
          <Input name="sort_order" type="number" defaultValue={member?.sort_order ?? 0} />
        </div>
      </div>
      <div>
        <Label>Observações</Label>
        <Textarea name="notes" defaultValue={member?.notes ?? ""} />
      </div>
      <Button type="submit" className="w-full">
        Salvar
      </Button>
    </form>
  );
}

function createPublicToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }

  return `${Date.now()}${Math.random().toString(16).slice(2)}`;
}
