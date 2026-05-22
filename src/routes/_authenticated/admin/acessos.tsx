import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, UserCog } from "lucide-react";
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

function Page() {
  const [rows, setRows] = useState<AccessRow[]>([]);

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

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Segurança</p>
        <h1 className="font-serif text-4xl mt-2">Acessos</h1>
        <p className="mt-2 text-muted-foreground">
          Gerencie perfis, permissões de admin e vínculos com clientes cadastrados.
        </p>
      </div>

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
                  <p className="mt-1 text-xs text-muted-foreground">ID: {row.id}</p>
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
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
