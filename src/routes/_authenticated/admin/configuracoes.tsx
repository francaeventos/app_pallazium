import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getClientMenuVisibilityFn, updateClientMenuVisibilityFn } from "@/fns/app-settings";
import { CLIENT_MENU_ITEMS, isClientMenuItemVisible } from "@/lib/client-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({ component: Page });

function Page() {
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { visibility } = await getClientMenuVisibilityFn();
      setVisibility(visibility);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível carregar as configurações.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = (key: string, checked: boolean) => {
    setVisibility((prev) => ({ ...prev, [key]: checked }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateClientMenuVisibilityFn({ data: { visibility } });
      toast.success("Configuração salva.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-10">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Sistema</p>
        <h1 className="mt-2 font-serif text-4xl">Configurações</h1>
        <p className="mt-2 text-muted-foreground">
          Escolha quais itens aparecem no menu lateral da Área VIP para todos os clientes.
        </p>
      </div>

      <Card className="border-gold/15 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Menu da Área VIP</CardTitle>
          <CardDescription>
            &quot;Painel&quot; é a página inicial do cliente e fica sempre visível. Os demais
            itens podem ser desligados aqui.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            CLIENT_MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const checked = isClientMenuItemVisible(visibility, item.key);
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <Label className="cursor-pointer" htmlFor={`menu-${item.key}`}>
                      {item.label}
                    </Label>
                  </div>
                  <Switch
                    id={`menu-${item.key}`}
                    checked={checked}
                    onCheckedChange={(value) => toggle(item.key, value)}
                  />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving || loading}>
        <Save className="h-4 w-4" />
        {saving ? "Salvando…" : "Salvar"}
      </Button>
    </div>
  );
}
