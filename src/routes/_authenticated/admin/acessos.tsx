import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Shield, Unlink, UserCog } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/acessos")({ component: Page });

type AppRole = Database["public"]["Enums"]["app_role"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];
type Client = Pick<
  Database["public"]["Tables"]["clients"]["Row"],
  "user_id" | "full_name" | "email" | "status"
>;

type AccessRow = Profile & {
  roles: UserRole[];
  client: Client | null;
};
type PromoteAdminRpc = (
  fn: "promote_user_to_admin_by_email",
  args: { _email: string },
) => Promise<{ error: { message: string } | null }>;

function Page() {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [adminEmail, setAdminEmail] = useState("");

  const load = async () => {
    const [{ data: profiles }, { data: roles }, { data: clients }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase
        .from("clients")
        .select("user_id, full_name, email, status")
        .not("user_id", "is", null),
    ]);

    const rolesByUser = new Map<string, UserRole[]>();
    (roles ?? []).forEach((role) => {
      rolesByUser.set(role.user_id, [...(rolesByUser.get(role.user_id) ?? []), role]);
    });

    const clientByUser = new Map(
      (clients ?? []).map((client) => [client.user_id, client as Client]),
    );

    setRows(
      (profiles ?? []).map((profile) => ({
        ...profile,
        roles: rolesByUser.get(profile.id) ?? [],
        client: clientByUser.get(profile.id) ?? null,
      })),
    );
  };

  useEffect(() => {
    load();
  }, []);

  const addRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success(role === "admin" ? "Admin liberado" : "Cliente liberado");
    load();
  };

  const removeRole = async (roleId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) return toast.error(error.message);
    toast.success(role === "admin" ? "Admin removido" : "Perfil cliente removido");
    load();
  };

  const promoteByEmail = async () => {
    const email = adminEmail.trim();
    if (!email) return toast.error("Informe o e-mail.");
    const promote = supabase.rpc as unknown as PromoteAdminRpc;
    const { error } = await promote("promote_user_to_admin_by_email", { _email: email });
    if (error) return toast.error(error.message);
    toast.success("Admin liberado pelo e-mail");
    setAdminEmail("");
    load();
  };

  const linkClientByEmail = async (row: AccessRow) => {
    if (!row.email) return toast.error("Este perfil não tem e-mail salvo.");
    const { error } = await supabase
      .from("clients")
      .update({ user_id: row.id })
      .eq("email", row.email)
      .is("user_id", null);
    if (error) return toast.error(error.message);
    toast.success("Cliente vinculado pelo e-mail");
    load();
  };

  const unlinkClient = async (row: AccessRow) => {
    const { error } = await supabase
      .from("clients")
      .update({ user_id: null })
      .eq("user_id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Cliente desvinculado");
    load();
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
    </div>
  );
}
