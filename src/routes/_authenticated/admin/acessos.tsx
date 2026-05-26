import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  addUserRoleFn,
  linkClientToProfileFn,
  listAccessRowsFn,
  promoteAdminByEmailFn,
  removeUserRoleFn,
  unlinkClientFromUserFn,
  updateAccessProfileFn,
} from "@/fns/access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Pencil, Shield, Unlink, UserCog } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/acessos")({ component: Page });

type AppRole = "admin" | "client";

type UserRole = {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
};

type Client = {
  user_id: string | null;
  full_name: string;
  email: string;
  status: string;
};

type AccessRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  document: string | null;
  created_at: string;
  updated_at: string;
  roles: UserRole[];
  client: Client | null;
};

function Page() {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [adminEmail, setAdminEmail] = useState("");
  const [editingProfile, setEditingProfile] = useState<AccessRow | null>(null);

  const load = async () => {
    try {
      const data = await listAccessRowsFn();
      setRows(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar acessos.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addRole = async (userId: string, role: AppRole) => {
    try {
      await addUserRoleFn({ data: { user_id: userId, role } });
      toast.success(role === "admin" ? "Admin liberado" : "Cliente liberado");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar papel.");
    }
  };

  const removeRole = async (roleId: string, role: AppRole) => {
    try {
      await removeUserRoleFn({ data: { role_id: roleId } });
      toast.success(role === "admin" ? "Admin removido" : "Perfil cliente removido");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover papel.");
    }
  };

  const promoteByEmail = async () => {
    const email = adminEmail.trim();
    if (!email) return toast.error("Informe o e-mail.");
    try {
      await promoteAdminByEmailFn({ data: { email } });
      toast.success("Admin liberado pelo e-mail");
      setAdminEmail("");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao promover admin.");
    }
  };

  const linkClientByEmail = async (row: AccessRow) => {
    if (!row.email) return toast.error("Este perfil não tem e-mail salvo.");
    try {
      await linkClientToProfileFn({ data: { user_id: row.id, email: row.email } });
      toast.success("Cliente vinculado pelo e-mail");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao vincular cliente.");
    }
  };

  const unlinkClient = async (row: AccessRow) => {
    try {
      await unlinkClientFromUserFn({ data: { user_id: row.id } });
      toast.success("Cliente desvinculado");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao desvincular cliente.");
    }
  };

  const updateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProfile) return;
    const fd = new FormData(event.currentTarget);
    try {
      await updateAccessProfileFn({
        data: {
          id: editingProfile.id,
          full_name: String(fd.get("full_name") || "") || null,
          email: String(fd.get("email") || "") || null,
          phone: String(fd.get("phone") || "") || null,
          whatsapp: String(fd.get("whatsapp") || "") || null,
          document: String(fd.get("document") || "") || null,
        },
      });
      toast.success("Perfil atualizado");
      setEditingProfile(null);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar perfil.");
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Segurança</p>
        <h1 className="font-serif text-4xl mt-2">Acessos</h1>
        <p className="mt-2 text-muted-foreground">
          Gerencie perfis, permissões de admin e vínculos com clientes cadastrados.
        </p>
      </div>

      <Card className="border-gold/30">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Promover usuário para admin por e-mail</Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="email@cliente.com"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
            />
          </div>
          <Button onClick={promoteByEmail}>
            <Shield className="mr-2 h-4 w-4" />
            Tornar admin
          </Button>
        </CardContent>
      </Card>

      {rows.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhum perfil criado ainda.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {rows.map((row) => {
          const isAdmin = row.roles.some((role) => role.role === "admin");
          const clientRole = row.roles.find((role) => role.role === "client");
          const adminRole = row.roles.find((role) => role.role === "admin");

          return (
            <Card key={row.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-serif text-xl">{row.full_name || "Usuário sem nome"}</p>
                    {row.roles.map((role) => (
                      <Badge key={role.id} variant={role.role === "admin" ? "default" : "outline"}>
                        {role.role === "admin" ? "Admin" : "Cliente"}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.email ?? "E-mail não salvo"} • ID: {row.id}
                  </p>
                  {row.client && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cliente: {row.client.full_name} • {row.client.email} •{" "}
                      {row.client.status.replace("_", " ")}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingProfile(row)}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Editar perfil
                  </Button>
                  {isAdmin ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adminRole && removeRole(adminRole.id, "admin")}
                    >
                      <Shield className="mr-1 h-3 w-3" />
                      Remover admin
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => addRole(row.id, "admin")}>
                      <Shield className="mr-1 h-3 w-3" />
                      Tornar admin
                    </Button>
                  )}
                  {!clientRole && (
                    <Button variant="ghost" size="sm" onClick={() => addRole(row.id, "client")}>
                      <UserCog className="mr-1 h-3 w-3" />
                      Liberar cliente
                    </Button>
                  )}
                  {row.client ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose"
                      onClick={() => unlinkClient(row)}
                    >
                      <Unlink className="mr-1 h-3 w-3" />
                      Desvincular cliente
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => linkClientByEmail(row)}>
                      <Link2 className="mr-1 h-3 w-3" />
                      Vincular cliente
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editingProfile} onOpenChange={(value) => !value && setEditingProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Editar perfil de acesso</DialogTitle>
          </DialogHeader>
          {editingProfile && (
            <form onSubmit={updateProfile} className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input name="full_name" defaultValue={editingProfile.full_name ?? ""} />
              </div>
              <div>
                <Label>E-mail de exibição/vínculo</Label>
                <Input name="email" type="email" defaultValue={editingProfile.email ?? ""} />
                <p className="mt-1 text-xs text-muted-foreground">
                  Este campo ajuda no vínculo com clientes. O login continua sendo o e-mail da
                  conta do usuário.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Telefone</Label>
                  <Input name="phone" defaultValue={editingProfile.phone ?? ""} />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input name="whatsapp" defaultValue={editingProfile.whatsapp ?? ""} />
                </div>
              </div>
              <div>
                <Label>Documento</Label>
                <Input name="document" defaultValue={editingProfile.document ?? ""} />
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
