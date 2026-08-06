import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getClientMenuVisibilityFn, updateClientMenuVisibilityFn } from "@/fns/app-settings";
import { CLIENT_MENU_ITEMS, DASHBOARD_SECTIONS, isClientMenuItemVisible } from "@/lib/client-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, type LucideIcon } from "lucide-react";
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
          Escolha o que aparece na Área VIP para todos os clientes: o menu lateral e os blocos do
          Painel.
        </p>
      </div>

      <Card className="border-gold/15 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Painel (visão geral)</CardTitle>
          <CardDescription>
            Blocos exibidos na página inicial da Área VIP, antes de o cliente entrar em cada
            seção.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            DASHBOARD_SECTIONS.map((item) => (
              <ToggleRow
                key={item.key}
                id={item.key}
                icon={item.icon}
                label={item.label}
                checked={isClientMenuItemVisible(visibility, item.key)}
                onChange={(value) => toggle(item.key, value)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-gold/15 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Menu da Área VIP</CardTitle>
          <CardDescription>
            &quot;Painel&quot; é a página inicial do cliente e fica sempre visível. Os demais
            itens podem ser desligados aqui — inclusive os atalhos correspondentes em "Acessos
            rápidos" no Painel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            CLIENT_MENU_ITEMS.map((item) => (
              <ToggleRow
                key={item.key}
                id={item.key}
                icon={item.icon}
                label={item.label}
                checked={isClientMenuItemVisible(visibility, item.key)}
                onChange={(value) => toggle(item.key, value)}
              />
            ))
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

function ToggleRow({
  id,
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  id: string;
  icon: LucideIcon;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const inputId = `toggle-${id}`;
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <Label className="cursor-pointer" htmlFor={inputId}>
          {label}
        </Label>
      </div>
      <Switch id={inputId} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
