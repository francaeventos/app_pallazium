import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  deleteMenuInterestFn,
  deletePartnerInterestFn,
  deleteUpgradeInterestFn,
  listInterestsFn,
  saveMenuInterestFn,
  savePartnerInterestFn,
  saveUpgradeInterestFn,
  setPartnerInterestReleaseFn,
  updateMenuInterestStatusFn,
  updatePartnerInterestStatusFn,
  updateUpgradeInterestStatusFn,
} from "@/fns/admin-interests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Lock, Pencil, Trash2, Unlock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
export const Route = createFileRoute("/_authenticated/admin/interesses")({ component: Page });

type InterestStatus = "novo" | "em_contato" | "vendido" | "perdido";
type UpgradeInterest = Awaited<ReturnType<typeof listInterestsFn>>["upgradeInterests"][number];
type MenuInterest = Awaited<ReturnType<typeof listInterestsFn>>["menuInterests"][number];
type PartnerInterest = Awaited<ReturnType<typeof listInterestsFn>>["partnerInterests"][number];

function Page() {
  const [list, setList] = useState<UpgradeInterest[]>([]);
  const [menuList, setMenuList] = useState<MenuInterest[]>([]);
  const [partnerList, setPartnerList] = useState<PartnerInterest[]>([]);
  const [editingUpgrade, setEditingUpgrade] = useState<UpgradeInterest | null>(null);
  const [editingMenu, setEditingMenu] = useState<MenuInterest | null>(null);
  const [editingPartner, setEditingPartner] = useState<PartnerInterest | null>(null);
  const [editStatus, setEditStatus] = useState<InterestStatus>("novo");

  const load = async () => {
    try {
      const { upgradeInterests, menuInterests, partnerInterests } = await listInterestsFn();
      setList(upgradeInterests);
      setMenuList(menuInterests);
      setPartnerList(partnerInterests);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar os interesses.");
    }
  };
  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateUpgradeInterestStatusFn({
        data: { id, status: status as InterestStatus },
      });
      toast.success("Atualizado");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  };

  const updateMenuStatus = async (id: string, status: string) => {
    try {
      await updateMenuInterestStatusFn({
        data: { id, status: status as InterestStatus },
      });
      toast.success("Atualizado");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  };

  const updatePartnerStatus = async (id: string, status: string) => {
    try {
      await updatePartnerInterestStatusFn({
        data: { id, status: status as InterestStatus },
      });
      toast.success("Atualizado");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  };

  const toggleRelease = async (id: string, released: boolean) => {
    try {
      await setPartnerInterestReleaseFn({ data: { id, released } });
      toast.success(released ? "Dados do cliente liberados para o parceiro" : "Acesso revogado");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  };

  const removePartnerInterest = async (id: string) => {
    try {
      await deletePartnerInterestFn({ data: { id } });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
    toast.success("Interesse removido");
    load();
  };

  const openPartnerEdit = (interest: PartnerInterest) => {
    setEditingPartner(interest);
    setEditStatus(interest.status);
  };

  const savePartnerInterest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingPartner) return;
    const fd = new FormData(event.currentTarget);
    try {
      await savePartnerInterestFn({
        data: {
          id: editingPartner.id,
          status: editStatus,
          notes: String(fd.get("notes") || "") || undefined,
        },
      });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
    toast.success("Interesse atualizado");
    setEditingPartner(null);
    load();
  };

  const removeUpgradeInterest = async (id: string) => {
    try {
      await deleteUpgradeInterestFn({ data: { id } });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
    toast.success("Interesse removido");
    load();
  };

  const removeMenuInterest = async (id: string) => {
    try {
      await deleteMenuInterestFn({ data: { id } });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
    toast.success("Interesse removido");
    load();
  };

  const openUpgradeEdit = (interest: UpgradeInterest) => {
    setEditingUpgrade(interest);
    setEditStatus(interest.status);
  };

  const openMenuEdit = (interest: MenuInterest) => {
    setEditingMenu(interest);
    setEditStatus(interest.status);
  };

  const saveUpgradeInterest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUpgrade) return;
    const fd = new FormData(event.currentTarget);
    try {
      await saveUpgradeInterestFn({
        data: {
          id: editingUpgrade.id,
          status: editStatus,
          notes: String(fd.get("notes") || "") || undefined,
        },
      });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
    toast.success("Interesse atualizado");
    setEditingUpgrade(null);
    load();
  };

  const saveMenuInterest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingMenu) return;
    const fd = new FormData(event.currentTarget);
    try {
      await saveMenuInterestFn({
        data: {
          id: editingMenu.id,
          status: editStatus,
          notes: String(fd.get("notes") || "") || undefined,
        },
      });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
    toast.success("Interesse atualizado");
    setEditingMenu(null);
    load();
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Comercial</p>
        <h1 className="font-serif text-4xl mt-2">Interesses</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Interesses em adicionais</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {list.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">Nenhum interesse ainda.</p>
          )}
          {list.map((i) => (
            <div key={i.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {i.upgrades?.name}{" "}
                  <Badge variant="outline" className="text-xs ml-2 capitalize">
                    {i.upgrades?.category}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {i.clients?.full_name} • {i.clients?.email}
                  {i.clients?.whatsapp && ` • ${i.clients.whatsapp}`}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {i.events?.event_type} • {i.events?.event_date} • registrado{" "}
                  {format(new Date(i.created_at), "dd/MM/yyyy")}
                </p>
                {i.notes && <p className="mt-2 text-sm text-muted-foreground">{i.notes}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={i.status} onValueChange={(v) => updateStatus(i.id, v)}>
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
                <Button variant="outline" size="sm" onClick={() => openUpgradeEdit(i)}>
                  <Pencil className="mr-1 h-3 w-3" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-rose"
                  onClick={() => removeUpgradeInterest(i.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Interesses em cardápios</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {menuList.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              Nenhum interesse em cardápio ainda.
            </p>
          )}
          {menuList.map((i) => (
            <div key={i.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {i.menus?.name}{" "}
                  <Badge variant="outline" className="text-xs ml-2 capitalize">
                    {i.menus?.category}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {i.clients?.full_name} • {i.clients?.email}
                  {i.clients?.whatsapp && ` • ${i.clients.whatsapp}`}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {i.events?.event_type} • {i.events?.event_date} • registrado{" "}
                  {format(new Date(i.created_at), "dd/MM/yyyy")}
                </p>
                {i.notes && <p className="mt-2 text-sm text-muted-foreground">{i.notes}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={i.status} onValueChange={(v) => updateMenuStatus(i.id, v)}>
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
                <Button variant="outline" size="sm" onClick={() => openMenuEdit(i)}>
                  <Pencil className="mr-1 h-3 w-3" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-rose"
                  onClick={() => removeMenuInterest(i.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Interesses em parceiros</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {partnerList.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              Nenhum interesse em parceiro ainda.
            </p>
          )}
          {partnerList.map((i) => (
            <div key={i.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {i.partners?.name}{" "}
                  <Badge variant="outline" className="text-xs ml-2 capitalize">
                    {i.partners?.category}
                  </Badge>
                  {i.client_data_released ? (
                    <Badge className="text-xs ml-2">Dados liberados</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs ml-2">
                      Dados não liberados
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {i.clients?.full_name} • {i.clients?.email}
                  {i.clients?.whatsapp && ` • ${i.clients.whatsapp}`}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {i.events?.event_type} • {i.events?.event_date} • registrado{" "}
                  {format(new Date(i.created_at), "dd/MM/yyyy")}
                </p>
                {i.notes && <p className="mt-2 text-sm text-muted-foreground">{i.notes}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={i.status} onValueChange={(v) => updatePartnerStatus(i.id, v)}>
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
                {i.client_data_released ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleRelease(i.id, false)}
                  >
                    <Lock className="mr-1 h-3 w-3" />
                    Revogar acesso
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => toggleRelease(i.id, true)}>
                    <Unlock className="mr-1 h-3 w-3" />
                    Liberar dados do cliente
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => openPartnerEdit(i)}>
                  <Pencil className="mr-1 h-3 w-3" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-rose"
                  onClick={() => removePartnerInterest(i.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!editingUpgrade} onOpenChange={(value) => !value && setEditingUpgrade(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Editar interesse em adicional</DialogTitle>
          </DialogHeader>
          {editingUpgrade && (
            <form onSubmit={saveUpgradeInterest} className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={editStatus}
                  onValueChange={(value) => setEditStatus(value as InterestStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_contato">Em contato</SelectItem>
                    <SelectItem value="vendido">Vendido</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea name="notes" rows={4} defaultValue={editingUpgrade.notes ?? ""} />
              </div>
              <Button type="submit" className="w-full">
                Salvar alterações
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMenu} onOpenChange={(value) => !value && setEditingMenu(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Editar interesse em cardápio</DialogTitle>
          </DialogHeader>
          {editingMenu && (
            <form onSubmit={saveMenuInterest} className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={editStatus}
                  onValueChange={(value) => setEditStatus(value as InterestStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_contato">Em contato</SelectItem>
                    <SelectItem value="vendido">Vendido</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea name="notes" rows={4} defaultValue={editingMenu.notes ?? ""} />
              </div>
              <Button type="submit" className="w-full">
                Salvar alterações
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPartner} onOpenChange={(value) => !value && setEditingPartner(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Editar interesse em parceiro</DialogTitle>
          </DialogHeader>
          {editingPartner && (
            <form onSubmit={savePartnerInterest} className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={editStatus}
                  onValueChange={(value) => setEditStatus(value as InterestStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_contato">Em contato</SelectItem>
                    <SelectItem value="vendido">Vendido</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea name="notes" rows={4} defaultValue={editingPartner.notes ?? ""} />
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
