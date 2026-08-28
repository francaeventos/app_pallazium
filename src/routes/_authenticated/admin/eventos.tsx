import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  addFinancialStatusOptionFn,
  createEventFn,
  deleteEventFn,
  deleteFinancialStatusOptionFn,
  listEventsFn,
  updateEventFn,
  updateEventStatusFn,
  updateFinancialStatusOptionFn,
} from "@/fns/events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminEmptyState } from "@/components/AdminEmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Ban,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  ListChecks,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
export const Route = createFileRoute("/_authenticated/admin/eventos")({ component: Page });

type Client = { id: string; full_name: string };
type MenuOption = { id: string; name: string; category: string };
type UpgradeOption = { id: string; name: string; category: string; price_text: string | null };
const NO_MENU_VALUE = "__none__";
type EventStatus = "novo" | "em_organizacao" | "proximo" | "concluido" | "cancelado";
type FinancialStatusOption = {
  id: string;
  label: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
type EventWithClient = {
  id: string;
  client_id: string;
  menu_id: string | null;
  menu: { id: string; name: string; category: string } | null;
  upgrade_ids: string[];
  event_type: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  estimated_guests: number | null;
  contracted_value: number | null;
  financial_status: string | null;
  status: EventStatus;
  internal_notes: string | null;
  client_notes: string | null;
  created_at: string;
  updated_at: string;
  clients: { full_name: string; email: string } | null;
};
type EventViewMode = "list" | "calendar";
type CalendarDay = {
  key: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  events: EventWithClient[];
};

const DEFAULT_FINANCIAL_STATUSES: FinancialStatusOption[] = [
  "Em aberto",
  "Sinal pago",
  "Parcialmente pago",
  "Pago",
  "Vencido",
  "Cancelado",
].map((label, index) => ({
  id: `fallback-${index}`,
  label,
  sort_order: index,
  created_at: "",
  updated_at: "",
}));

function Page() {
  const [events, setEvents] = useState<EventWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [menus, setMenus] = useState<MenuOption[]>([]);
  const [upgrades, setUpgrades] = useState<UpgradeOption[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventWithClient | null>(null);
  const [createClientId, setCreateClientId] = useState("");
  const [createStatus, setCreateStatus] = useState<EventStatus>("novo");
  const [createMenuId, setCreateMenuId] = useState(NO_MENU_VALUE);
  const [createUpgradeIds, setCreateUpgradeIds] = useState<string[]>([]);
  const [editClientId, setEditClientId] = useState("");
  const [editStatus, setEditStatus] = useState<EventStatus>("novo");
  const [editMenuId, setEditMenuId] = useState(NO_MENU_VALUE);
  const [editUpgradeIds, setEditUpgradeIds] = useState<string[]>([]);
  const [financialStatusOptions, setFinancialStatusOptions] = useState<FinancialStatusOption[]>(
    DEFAULT_FINANCIAL_STATUSES,
  );
  const [createFinancialStatus, setCreateFinancialStatus] = useState("Em aberto");
  const [editFinancialStatus, setEditFinancialStatus] = useState("Em aberto");
  const [viewMode, setViewMode] = useState<EventViewMode>("list");
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));

  const calendarDays = useMemo(
    () => buildCalendarDays(events, calendarMonth),
    [events, calendarMonth],
  );
  const calendarMonthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
      }).format(calendarMonth),
    [calendarMonth],
  );

  const load = async () => {
    try {
      const data = await listEventsFn();
      setEvents(data.events);
      setClients(data.clients);
      setMenus(data.menus);
      setUpgrades(data.upgrades);
      setFinancialStatusOptions(
        data.financial_status_options.length
          ? data.financial_status_options
          : DEFAULT_FINANCIAL_STATUSES,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar eventos.");
    }
  };
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!editing) return;
    setEditClientId(editing.client_id);
    setEditStatus(editing.status);
    setEditFinancialStatus(editing.financial_status || "Em aberto");
    setEditMenuId(editing.menu_id ?? NO_MENU_VALUE);
    setEditUpgradeIds(editing.upgrade_ids ?? []);
  }, [editing]);

  const toggleUpgradeId = (ids: string[], upgradeId: string, checked: boolean) =>
    checked ? [...ids, upgradeId] : ids.filter((id) => id !== upgradeId);

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!createClientId) return toast.error("Selecione um cliente.");
    const eventType = String(fd.get("event_type"));
    try {
      const result = await createEventFn({
        data: {
          client_id: createClientId,
          event_type: eventType,
          event_date: String(fd.get("event_date") || "") || null,
          start_time: String(fd.get("start_time") || "") || null,
          end_time: String(fd.get("end_time") || "") || null,
          location: String(fd.get("location") || "") || null,
          estimated_guests: Number(fd.get("estimated_guests")) || null,
          contracted_value: parseCurrencyValue(String(fd.get("contracted_value") || "")),
          financial_status: createFinancialStatus || null,
          status: createStatus,
          client_notes: String(fd.get("client_notes") || "") || null,
          internal_notes: String(fd.get("internal_notes") || "") || null,
          menu_id: createMenuId === NO_MENU_VALUE ? null : createMenuId,
          upgrade_ids: createUpgradeIds,
        },
      });
      toast.success(
        result.is_bride_checklist
          ? "Evento criado com checklist da noiva"
          : "Evento criado com checklist padrão",
      );
      setOpen(false);
      setCreateClientId("");
      setCreateStatus("novo");
      setCreateFinancialStatus("Em aberto");
      setCreateMenuId(NO_MENU_VALUE);
      setCreateUpgradeIds([]);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar evento.");
    }
  };

  const update = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    if (!editClientId) return toast.error("Selecione um cliente.");
    try {
      await updateEventFn({
        data: {
          id: editing.id,
          client_id: editClientId,
          event_type: String(fd.get("event_type")),
          event_date: String(fd.get("event_date") || "") || null,
          start_time: String(fd.get("start_time") || "") || null,
          end_time: String(fd.get("end_time") || "") || null,
          location: String(fd.get("location") || "") || null,
          estimated_guests: Number(fd.get("estimated_guests")) || null,
          contracted_value: parseCurrencyValue(String(fd.get("contracted_value") || "")),
          financial_status: editFinancialStatus || null,
          status: editStatus,
          client_notes: String(fd.get("client_notes") || "") || null,
          internal_notes: String(fd.get("internal_notes") || "") || null,
          menu_id: editMenuId === NO_MENU_VALUE ? null : editMenuId,
          upgrade_ids: editUpgradeIds,
        },
      });
      toast.success("Evento atualizado");
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar evento.");
    }
  };

  const updateEventStatus = async (eventId: string, status: EventStatus) => {
    try {
      await updateEventStatusFn({ data: { id: eventId, status } });
      toast.success("Status do evento atualizado");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar status.");
    }
  };

  const remove = async (event: EventWithClient) => {
    const confirmed = window.confirm(
      `Excluir o evento de ${event.clients?.full_name ?? "cliente"}? Isso também remove checklist, referências e interesses vinculados.`,
    );
    if (!confirmed) return;
    try {
      await deleteEventFn({ data: { id: event.id } });
      toast.success("Evento excluído");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir evento.");
    }
  };

  const addFinancialStatus = async (label: string) => {
    const cleanLabel = label.trim();
    if (!cleanLabel) return toast.error("Digite um status financeiro.");
    if (financialStatusOptions.some((option) => sameStatusLabel(option.label, cleanLabel))) {
      return toast.error("Este status já existe.");
    }

    try {
      const data = await addFinancialStatusOptionFn({ data: { label: cleanLabel } });
      setFinancialStatusOptions((items) => [...items, data]);
      toast.success("Status financeiro adicionado");
    } catch (error) {
      const nextOrder = financialStatusOptions.length;
      setFinancialStatusOptions((items) => [
        ...items,
        fallbackFinancialStatus(cleanLabel, nextOrder),
      ]);
      toast.warning(
        error instanceof Error ? error.message : "Status adicionado apenas nesta sessão",
      );
    }
  };

  const updateFinancialStatus = async (option: FinancialStatusOption, label: string) => {
    const cleanLabel = label.trim();
    if (!cleanLabel) return toast.error("Digite um status financeiro.");

    try {
      const data = await updateFinancialStatusOptionFn({
        data: { id: option.id, label: cleanLabel },
      });
      setFinancialStatusOptions((items) =>
        items.map((item) => (item.id === option.id ? data : item)),
      );
      toast.success("Status financeiro atualizado");
    } catch (error) {
      setFinancialStatusOptions((items) =>
        items.map((item) => (item.id === option.id ? { ...item, label: cleanLabel } : item)),
      );
      toast.warning(error instanceof Error ? error.message : "Status editado nesta sessão");
    }
    if (sameStatusLabel(createFinancialStatus, option.label)) setCreateFinancialStatus(cleanLabel);
    if (sameStatusLabel(editFinancialStatus, option.label)) setEditFinancialStatus(cleanLabel);
  };

  const removeFinancialStatus = async (option: FinancialStatusOption) => {
    if (!window.confirm(`Apagar o status "${option.label}"?`)) return;

    try {
      await deleteFinancialStatusOptionFn({ data: { id: option.id } });
      toast.success("Status financeiro apagado");
    } catch (error) {
      toast.warning(error instanceof Error ? error.message : "Status removido desta sessão");
    }
    setFinancialStatusOptions((items) => items.filter((item) => item.id !== option.id));
    if (sameStatusLabel(createFinancialStatus, option.label)) setCreateFinancialStatus("Em aberto");
    if (sameStatusLabel(editFinancialStatus, option.label)) setEditFinancialStatus("Em aberto");
  };

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-4xl">Eventos</h1>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) {
              setCreateClientId("");
              setCreateStatus("novo");
              setCreateFinancialStatus("Em aberto");
              setCreateMenuId(NO_MENU_VALUE);
              setCreateUpgradeIds([]);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Novo evento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Novo evento</DialogTitle>
            </DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <Select value={createClientId} onValueChange={setCreateClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de evento</Label>
                <Input name="event_type" required placeholder="Casamento, Debutante, ..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data</Label>
                  <Input name="event_date" type="date" />
                </div>
                <div>
                  <Label>Convidados</Label>
                  <Input name="estimated_guests" type="number" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Início</Label>
                  <Input name="start_time" type="time" />
                </div>
                <div>
                  <Label>Encerramento</Label>
                  <Input name="end_time" type="time" />
                </div>
              </div>
              <div>
                <Label>Local</Label>
                <Input name="location" />
              </div>
              <div>
                <Label>Cardápio contratado</Label>
                <Select value={createMenuId} onValueChange={setCreateMenuId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cardápio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_MENU_VALUE}>Selecionar cardápio</SelectItem>
                    {menus.map((menu) => (
                      <SelectItem key={menu.id} value={menu.id}>
                        {menu.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Adicionais contratados</Label>
                <UpgradeCheckboxList
                  upgrades={upgrades}
                  selectedIds={createUpgradeIds}
                  onToggle={(upgradeId, checked) =>
                    setCreateUpgradeIds((ids) => toggleUpgradeId(ids, upgradeId, checked))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor contratado</Label>
                  <CurrencyInput name="contracted_value" />
                </div>
                <div>
                  <Label>Status financeiro</Label>
                  <FinancialStatusPicker
                    value={createFinancialStatus}
                    options={financialStatusOptions}
                    onChange={setCreateFinancialStatus}
                    onAdd={addFinancialStatus}
                    onUpdate={updateFinancialStatus}
                    onRemove={removeFinancialStatus}
                  />
                </div>
              </div>
              <div>
                <Label>Status do evento</Label>
                <Select
                  value={createStatus}
                  onValueChange={(value) => setCreateStatus(value as EventStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_organizacao">Em organização</SelectItem>
                    <SelectItem value="proximo">Próximo da data</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações para o cliente</Label>
                <Textarea name="client_notes" maxLength={1000} />
              </div>
              <div>
                <Label>Observações internas</Label>
                <Textarea name="internal_notes" maxLength={1000} />
              </div>
              <Button type="submit" className="w-full">
                Criar evento
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="font-serif text-xl">
              {viewMode === "calendar" ? "Calendário de eventos" : "Todos os eventos"}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl border bg-muted/30 p-1">
                <Button
                  type="button"
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="mr-1 h-4 w-4" />
                  Lista
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "calendar" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("calendar")}
                >
                  <Calendar className="mr-1 h-4 w-4" />
                  Calendário
                </Button>
              </div>
              {viewMode === "calendar" && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-40 capitalize"
                    onClick={() => setCalendarMonth(startOfMonth(new Date()))}
                  >
                    {calendarMonthLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className={viewMode === "list" ? "divide-y" : ""}>
          {events.length === 0 && (
            <AdminEmptyState
              icon={Calendar}
              title="Crie o primeiro evento"
              description="Eventos conectam o cliente ao checklist, referências, cardápios, adicionais e painel de acompanhamento."
              actionLabel="Novo evento"
              onAction={() => setOpen(true)}
            />
          )}
          {events.length > 0 &&
            (viewMode === "list" ? (
              events.map((event) => (
                <EventListItem
                  key={event.id}
                  event={event}
                  onEdit={setEditing}
                  onRemove={remove}
                  onUpdateStatus={updateEventStatus}
                />
              ))
            ) : (
              <EventCalendar
                days={calendarDays}
                onEdit={setEditing}
                onRemove={remove}
                onUpdateStatus={updateEventStatus}
              />
            ))}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(value) => !value && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Editar evento</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={update} className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <Select value={editClientId} onValueChange={setEditClientId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de evento</Label>
                <Input name="event_type" required defaultValue={editing.event_type} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data</Label>
                  <Input name="event_date" type="date" defaultValue={editing.event_date ?? ""} />
                </div>
                <div>
                  <Label>Convidados</Label>
                  <Input
                    name="estimated_guests"
                    type="number"
                    defaultValue={editing.estimated_guests ?? ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Início</Label>
                  <Input name="start_time" type="time" defaultValue={editing.start_time ?? ""} />
                </div>
                <div>
                  <Label>Encerramento</Label>
                  <Input name="end_time" type="time" defaultValue={editing.end_time ?? ""} />
                </div>
              </div>
              <div>
                <Label>Local</Label>
                <Input name="location" defaultValue={editing.location ?? ""} />
              </div>
              <div>
                <Label>Cardápio contratado</Label>
                <Select value={editMenuId} onValueChange={setEditMenuId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cardápio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_MENU_VALUE}>Selecionar cardápio</SelectItem>
                    {menus.map((menu) => (
                      <SelectItem key={menu.id} value={menu.id}>
                        {menu.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Adicionais contratados</Label>
                <UpgradeCheckboxList
                  upgrades={upgrades}
                  selectedIds={editUpgradeIds}
                  onToggle={(upgradeId, checked) =>
                    setEditUpgradeIds((ids) => toggleUpgradeId(ids, upgradeId, checked))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor contratado</Label>
                  <CurrencyInput name="contracted_value" defaultValue={editing.contracted_value} />
                </div>
                <div>
                  <Label>Status financeiro</Label>
                  <FinancialStatusPicker
                    value={editFinancialStatus}
                    options={financialStatusOptions}
                    onChange={setEditFinancialStatus}
                    onAdd={addFinancialStatus}
                    onUpdate={updateFinancialStatus}
                    onRemove={removeFinancialStatus}
                  />
                </div>
              </div>
              <div>
                <Label>Status do evento</Label>
                <Select
                  value={editStatus}
                  onValueChange={(value) => setEditStatus(value as EventStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_organizacao">Em organização</SelectItem>
                    <SelectItem value="proximo">Próximo da data</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações para o cliente</Label>
                <Textarea
                  name="client_notes"
                  maxLength={1000}
                  defaultValue={editing.client_notes ?? ""}
                />
              </div>
              <div>
                <Label>Observações internas</Label>
                <Textarea
                  name="internal_notes"
                  maxLength={1000}
                  defaultValue={editing.internal_notes ?? ""}
                />
              </div>
              <Button type="submit" className="w-full">
                Salvar alterações
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventListItem({
  event,
  onEdit,
  onRemove,
  onUpdateStatus,
}: {
  event: EventWithClient;
  onEdit: (event: EventWithClient) => void;
  onRemove: (event: EventWithClient) => void;
  onUpdateStatus: (eventId: string, status: EventStatus) => void;
}) {
  return (
    <div className="py-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-medium">{event.clients?.full_name ?? "—"}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {event.event_type} • {event.event_date ?? "sem data"} • {event.estimated_guests ?? "?"}{" "}
          convidados
        </p>
      </div>
      <EventActions
        event={event}
        onEdit={onEdit}
        onRemove={onRemove}
        onUpdateStatus={onUpdateStatus}
      />
    </div>
  );
}

function EventCalendar({
  days,
  onEdit,
  onRemove,
  onUpdateStatus,
}: {
  days: CalendarDay[];
  onEdit: (event: EventWithClient) => void;
  onRemove: (event: EventWithClient) => void;
  onUpdateStatus: (eventId: string, status: EventStatus) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="grid gap-1.5 lg:grid-cols-7">
        {days.map((day) => (
          <div
            key={day.key}
            className={`min-h-24 rounded-xl border p-2 ${
              day.inCurrentMonth ? "bg-background" : "bg-muted/30 text-muted-foreground"
            }`}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-serif text-sm">{day.dayNumber}</span>
              {day.events.length > 0 && (
                <span className="rounded-full bg-champagne px-2 py-0.5 text-[10px] text-gold">
                  {day.events.length}
                </span>
              )}
            </div>
            <div className="space-y-1">
              {day.events.map((event) => (
                <div key={event.id} className="rounded-lg border bg-card p-1.5 shadow-soft">
                  <button type="button" className="w-full text-left" onClick={() => onEdit(event)}>
                    <p className="line-clamp-1 text-xs font-medium">
                      {event.clients?.full_name ?? "Cliente"}
                    </p>
                    <p className="line-clamp-1 text-[10px] text-muted-foreground">
                      {event.event_type}
                    </p>
                    <div className="mt-0.5 space-y-0.5 text-[10px] text-muted-foreground">
                      {event.start_time && (
                        <p className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {event.start_time.slice(0, 5)}
                          {event.end_time ? ` - ${event.end_time.slice(0, 5)}` : ""}
                        </p>
                      )}
                    </div>
                  </button>
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <span className="truncate rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                      {event.status.replace("_", " ")}
                    </span>
                    <EventActions
                      event={event}
                      compact
                      onEdit={onEdit}
                      onRemove={onRemove}
                      onUpdateStatus={onUpdateStatus}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventActions({
  event,
  compact = false,
  onEdit,
  onRemove,
  onUpdateStatus,
}: {
  event: EventWithClient;
  compact?: boolean;
  onEdit: (event: EventWithClient) => void;
  onRemove: (event: EventWithClient) => void;
  onUpdateStatus: (eventId: string, status: EventStatus) => void;
}) {
  const buttonSize: "icon" | "sm" = compact ? "icon" : "sm";
  const iconClassName = compact ? "h-3 w-3" : "h-3 w-3 mr-1";

  return (
    <div className={compact ? "flex items-center gap-0.5" : "flex flex-wrap items-center gap-2"}>
      {!compact && (
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {event.status.replace("_", " ")}
        </span>
      )}
      <Button variant="ghost" size={buttonSize} onClick={() => onEdit(event)}>
        <Pencil className={iconClassName} />
        {!compact && "Editar"}
      </Button>
      {event.status !== "concluido" && (
        <Button
          variant="ghost"
          size={buttonSize}
          onClick={() => onUpdateStatus(event.id, "concluido")}
        >
          <CheckCircle2 className={iconClassName} />
          {!compact && "Concluir"}
        </Button>
      )}
      {event.status !== "cancelado" && (
        <Button
          variant="ghost"
          size={buttonSize}
          className="text-rose"
          onClick={() => onUpdateStatus(event.id, "cancelado")}
        >
          <Ban className={iconClassName} />
          {!compact && "Cancelar"}
        </Button>
      )}
      {(event.status === "cancelado" || event.status === "concluido") && (
        <Button
          variant="ghost"
          size={buttonSize}
          onClick={() => onUpdateStatus(event.id, "em_organizacao")}
        >
          <RotateCcw className={iconClassName} />
          {!compact && "Reabrir"}
        </Button>
      )}
      <Link to="/admin/checklist/$eventId" params={{ eventId: event.id }}>
        <Button variant="outline" size={buttonSize}>
          <ListChecks className={iconClassName} />
          {!compact && "Checklist"}
        </Button>
      </Link>
      <Button
        variant="ghost"
        size={buttonSize}
        className="text-rose"
        onClick={() => onRemove(event)}
      >
        <Trash2 className={iconClassName} />
        {!compact && "Excluir"}
      </Button>
    </div>
  );
}

function UpgradeCheckboxList({
  upgrades,
  selectedIds,
  onToggle,
}: {
  upgrades: UpgradeOption[];
  selectedIds: string[];
  onToggle: (upgradeId: string, checked: boolean) => void;
}) {
  if (upgrades.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        Nenhum adicional cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
      {upgrades.map((upgrade) => (
        <label key={upgrade.id} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={selectedIds.includes(upgrade.id)}
            onCheckedChange={(checked) => onToggle(upgrade.id, checked === true)}
          />
          <span className="flex-1">{upgrade.name}</span>
          <span className="text-xs capitalize text-muted-foreground">{upgrade.category}</span>
        </label>
      ))}
    </div>
  );
}

function CurrencyInput({ name, defaultValue }: { name: string; defaultValue?: number | null }) {
  const [displayValue, setDisplayValue] = useState(
    defaultValue ? formatCurrency(defaultValue) : "",
  );

  const numericValue = parseCurrencyValue(displayValue);

  return (
    <>
      <Input
        inputMode="decimal"
        placeholder="R$ 0,00"
        value={displayValue}
        onChange={(event) => setDisplayValue(event.target.value)}
        onBlur={() => setDisplayValue(numericValue ? formatCurrency(numericValue) : "")}
      />
      <input type="hidden" name={name} value={numericValue ?? ""} />
    </>
  );
}

function FinancialStatusPicker({
  value,
  options,
  onChange,
  onAdd,
  onUpdate,
  onRemove,
}: {
  value: string;
  options: FinancialStatusOption[];
  onChange: (value: string) => void;
  onAdd: (label: string) => Promise<void>;
  onUpdate: (option: FinancialStatusOption, label: string) => Promise<void>;
  onRemove: (option: FinancialStatusOption) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  const filteredOptions = useMemo(() => {
    const cleanQuery = normalizeStatusLabel(query);
    return options.filter((option) => normalizeStatusLabel(option.label).includes(cleanQuery));
  }, [options, query]);

  const handleAdd = async () => {
    const label = (newLabel || query).trim();
    await onAdd(label);
    setNewLabel("");
    setQuery("");
    onChange(label);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between font-normal">
          <span className="truncate">{value || "Selecione o status"}</span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(28rem,calc(100vw-3rem))] p-3">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar status..."
              className="pl-9"
            />
          </div>

          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {filteredOptions.length === 0 && (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                Nenhum status encontrado.
              </p>
            )}
            {filteredOptions.map((option) => (
              <div
                key={option.id}
                className="flex items-center gap-2 rounded-lg border bg-background p-2"
              >
                {editingId === option.id ? (
                  <>
                    <Input
                      value={editingLabel}
                      onChange={(event) => setEditingLabel(event.target.value)}
                      className="h-8"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        await onUpdate(option, editingLabel);
                        setEditingId(null);
                      }}
                    >
                      Salvar
                    </Button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left text-sm"
                      onClick={() => {
                        onChange(option.label);
                        setOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingId(option.id);
                        setEditingLabel(option.label);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-rose"
                      onClick={() => onRemove(option)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 border-t pt-3">
            <Input
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              placeholder="Novo status financeiro"
            />
            <Button type="button" onClick={handleAdd}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function parseCurrencyValue(value: string) {
  const cleanValue = value.replace(/[^\d,.-]/g, "").trim();
  if (!cleanValue) return null;

  const normalized = cleanValue.includes(",")
    ? cleanValue.replace(/\./g, "").replace(",", ".")
    : cleanValue;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function normalizeStatusLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function sameStatusLabel(left: string, right: string) {
  return normalizeStatusLabel(left) === normalizeStatusLabel(right);
}

function fallbackFinancialStatus(label: string, sortOrder: number): FinancialStatusOption {
  return {
    id: `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label,
    sort_order: sortOrder,
    created_at: "",
    updated_at: "",
  };
}

function buildCalendarDays(events: EventWithClient[], month: Date): CalendarDay[] {
  const firstDay = startOfMonth(month);
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());

  const eventsByDate = events.reduce<Record<string, EventWithClient[]>>((acc, event) => {
    if (!event.event_date) return acc;
    (acc[event.event_date] ||= []).push(event);
    return acc;
  }, {});

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const key = dateKey(date);

    return {
      key,
      dayNumber: date.getDate(),
      inCurrentMonth: date.getMonth() === month.getMonth(),
      events: eventsByDate[key] ?? [],
    };
  });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
