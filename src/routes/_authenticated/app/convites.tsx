import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  createGuestFn,
  deleteGiftItemFn,
  deleteGuestFn,
  getConvitesPageDataFn,
  saveGiftItemFn,
  saveInvitationFn,
  type GiftItemRow,
  type GuestRow,
  type InvitationRow,
  type PartyMemberRow,
} from "@/fns/convites";
import {
  invitationStatusLabels,
  publicInvitationUrl,
  rsvpStatusLabels,
  type RsvpStatus,
} from "@/lib/invitation-utils";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Gift,
  MailCheck,
  Pencil,
  Plus,
  QrCode,
  Trash2,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { GUEST_LIMIT_ERROR_MESSAGE } from "@/lib/guest-limit";
import { DEFAULT_INVITATION_MESSAGE, PALLAZIUM_ADDRESS } from "@/lib/pallazium-venue";

export const Route = createFileRoute("/_authenticated/app/convites")({ component: Page });

function showGuestError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const [title, ...rest] = message.split("\n\n");
  if (rest.length > 0) {
    toast.error(title, { description: rest.join("\n\n") });
  } else {
    toast.error(message);
  }
}

function Page() {
  const { data, loading } = useMyEvent();
  const [invitation, setInvitation] = useState<InvitationRow | null>(null);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [party, setParty] = useState<PartyMemberRow[]>([]);
  const [giftItems, setGiftItems] = useState<GiftItemRow[]>([]);
  const [editingGiftItem, setEditingGiftItem] = useState<GiftItemRow | null>(null);
  const [qrGuest, setQrGuest] = useState<GuestRow | null>(null);
  const [guestStatus, setGuestStatus] = useState<RsvpStatus>("pendente");
  const [invitationStatus, setInvitationStatus] = useState<InvitationRow["status"]>("rascunho");
  const [ceremonyExternal, setCeremonyExternal] = useState(false);

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

  const guestLimitExceeded =
    event?.estimated_guests != null && totals.people > event.estimated_guests * 1.1;
  const [guestLimitTitle, guestLimitBody] = GUEST_LIMIT_ERROR_MESSAGE.split("\n\n");

  const load = useCallback(async () => {
    if (!event) return;
    try {
      const pageData = await getConvitesPageDataFn({ data: { eventId: event.id } });
      setInvitation(pageData.invitation);
      setGuests(pageData.guests);
      setParty(pageData.party);
      setGiftItems(pageData.giftItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar convites");
    }
  }, [event]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setInvitationStatus(invitation?.status ?? "rascunho");
  }, [invitation?.status]);

  useEffect(() => {
    setCeremonyExternal(invitation?.ceremony_external ?? false);
  }, [invitation?.ceremony_external]);

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

    try {
      const createdGuest = await createGuestFn({
        data: {
          eventId: event.id,
          invitationId: invitation?.id ?? null,
          name: String(fd.get("name")),
          phone: String(fd.get("phone") || "") || null,
          email: String(fd.get("email") || "") || null,
          groupName: String(fd.get("group_name") || "") || null,
          allowedCompanions: allowed,
          confirmedCompanions:
            status === "confirmado"
              ? Math.min(Number(fd.get("confirmed_companions")) || 0, allowed)
              : 0,
          rsvpStatus: status,
          notes: String(fd.get("notes") || "") || null,
        },
      });
      setGuests((current) => [...current, createdGuest]);
      toast.success("Convidado adicionado");
      formEvent.currentTarget.reset();
      setGuestStatus("pendente");
      load();
    } catch (error) {
      showGuestError(error, "Erro ao salvar convidado");
    }
  };

  const removeGuest = async (id: string) => {
    if (!window.confirm("Excluir convidado?")) return;
    try {
      await deleteGuestFn({ data: { eventId: event.id, guestId: id } });
      toast.success("Convidado excluído");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir convidado");
    }
  };

  const saveInvitation = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const fd = new FormData(formEvent.currentTarget);
    const status = invitationStatus;

    try {
      const savedInvitation = await saveInvitationFn({
        data: {
          eventId: event.id,
          invitationId: invitation?.id,
          title: String(fd.get("title")),
          message: String(fd.get("message") || "") || null,
          coverImageUrl: String(fd.get("cover_image_url") || "") || null,
          dressCode: String(fd.get("dress_code") || "") || null,
          ceremonyExternal,
          ceremonyLocation: String(fd.get("ceremony_location") || "") || null,
          ceremonyAddress: String(fd.get("ceremony_address") || "") || null,
          ceremonyMapUrl: String(fd.get("ceremony_map_url") || "") || null,
          status,
          publishedAt: invitation?.published_at ?? null,
        },
      });
      setInvitation(savedInvitation);
      setInvitationStatus(savedInvitation.status);
      toast.success(invitation ? "Convite atualizado" : "Convite criado");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar convite");
    }
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

    try {
      const savedGiftItem = await saveGiftItemFn({
        data: {
          eventId: event.id,
          giftItemId: editingGiftItem?.id,
          name: String(fd.get("name")),
          imageUrl: String(fd.get("image_url") || "") || null,
          referenceLinks,
          notes: String(fd.get("notes") || "") || null,
          sortOrder: editingGiftItem?.sort_order ?? giftItems.length,
        },
      });
      setGiftItems((current) =>
        editingGiftItem
          ? current.map((item) => (item.id === savedGiftItem.id ? savedGiftItem : item))
          : [...current, savedGiftItem],
      );
      toast.success(editingGiftItem ? "Presente atualizado" : "Presente adicionado");
      setEditingGiftItem(null);
      formEvent.currentTarget.reset();
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar presente");
    }
  };

  const removeGiftItem = async (id: string) => {
    if (!window.confirm("Excluir este item da lista de presentes?")) return;
    try {
      await deleteGiftItemFn({ data: { eventId: event.id, giftItemId: id } });
      setGiftItems((current) => current.filter((item) => item.id !== id));
      if (editingGiftItem?.id === id) setEditingGiftItem(null);
      toast.success("Item removido");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir item");
    }
  };

  const copyGuestLink = async (guest: GuestRow) => {
    const url = publicInvitationUrl(guest.public_token);
    if (!url) return toast.error("Link individual indisponível.");
    await navigator.clipboard.writeText(url);
    toast.success(`Link de ${guest.name} copiado`);
  };

  const downloadQr = (guest: GuestRow) => {
    const url = publicInvitationUrl(guest.public_token);
    if (!url) return;
    const qrUrl = qrCodeImageUrl(url, 600);
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `qr-${guest.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.target = "_blank";
    a.click();
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

      {guestLimitExceeded && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{guestLimitTitle}</AlertTitle>
          <AlertDescription>{guestLimitBody}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label="Convidados" value={guests.length} />
        <Metric icon={CheckCircle2} label="Confirmados" value={totals.confirmed} />
        <Metric icon={Users} label="Pessoas confirmadas" value={totals.people} />
        <Metric icon={MailCheck} label="Pendentes" value={totals.pending} />
      </div>

      {invitation && (
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
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
                <Info
                  label="Cerimônia"
                  value={
                    invitation.ceremony_external
                      ? invitation.ceremony_location
                      : "Espaço Pallazium"
                  }
                />
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

          {invitation.status === "publicado" && (
            <Card className="flex flex-col items-center justify-center p-6 gap-3 min-w-[180px]">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground text-center">
                QR do convite
              </p>
              <img
                src={qrCodeImageUrl(
                  typeof window !== "undefined"
                    ? `${window.location.origin}/convite/preview/${invitation.id}`
                    : "",
                  200,
                )}
                alt="QR Code do convite"
                className="h-40 w-40 rounded-xl border"
              />
              <p className="text-xs text-muted-foreground text-center">
                Escaneie para ver o convite (sem confirmar presença)
              </p>
            </Card>
          )}
        </div>
      )}

      <Dialog open={!!qrGuest} onOpenChange={(v) => !v && setQrGuest(null)}>
        <DialogContent className="sm:max-w-xs rounded-2xl p-0 gap-0 overflow-hidden">
          {qrGuest && (() => {
            const url = publicInvitationUrl(qrGuest.public_token);
            return (
              <>
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                  <DialogTitle className="font-serif text-xl">QR Code</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{qrGuest.name}</p>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 px-6 py-6">
                  <img
                    src={qrCodeImageUrl(url, 280)}
                    alt={`QR Code de ${qrGuest.name}`}
                    className="h-56 w-56 rounded-xl border"
                  />
                  <p className="text-xs text-muted-foreground text-center break-all">{url}</p>
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={async () => {
                        await navigator.clipboard.writeText(url);
                        toast.success("Link copiado");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copiar link
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => downloadQr(qrGuest)}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Baixar QR
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

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
                  setInvitationStatus(event.target.value as InvitationRow["status"])
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
                      Copiar link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!invitation || invitation.status !== "publicado"}
                      onClick={() => setQrGuest(guest)}
                    >
                      <QrCode className="mr-1 h-3 w-3" />
                      QR Code
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

function qrCodeImageUrl(data: string, size = 300) {
  if (!data) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png&margin=12&color=1a1a1a&bgcolor=ffffff`;
}
