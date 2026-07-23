import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getAdminLeadFormFn,
  testLeadWebhookFn,
  updateLeadIntegrationsFn,
} from "@/fns/leads/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/leads/integracoes")({
  component: Page,
});

function Page() {
  const [formId, setFormId] = useState<string | null>(null);
  const [gtmId, setGtmId] = useState("");
  const [pixelId, setPixelId] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [testCode, setTestCode] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [pixelEnabled, setPixelEnabled] = useState(true);
  const [gtmEnabled, setGtmEnabled] = useState(true);
  const [capiEnabled, setCapiEnabled] = useState(true);
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const [hasSecret, setHasSecret] = useState(false);

  const load = async () => {
    try {
      const { form } = await getAdminLeadFormFn({ data: { slug: "leads" } });
      setFormId(form.id);
      const i = form.integrations;
      setGtmId(i?.gtm_id || "");
      setPixelId(i?.meta_pixel_id || "");
      setMetaToken(i?.meta_access_token || "");
      setTestCode(i?.meta_test_event_code || "");
      setWebhookUrl(i?.webhook_url || "");
      setWebhookSecret(i?.webhook_secret || "");
      setPixelEnabled(i?.pixel_enabled ?? true);
      setGtmEnabled(i?.gtm_enabled ?? true);
      setCapiEnabled(i?.capi_enabled ?? true);
      setWebhookEnabled(i?.webhook_enabled ?? true);
      setHasToken(Boolean(i?.has_meta_token));
      setHasSecret(Boolean(i?.has_webhook_secret));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar integrações.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!formId) return;
    try {
      await updateLeadIntegrationsFn({
        data: {
          form_id: formId,
          gtm_id: gtmId || null,
          meta_pixel_id: pixelId || null,
          meta_access_token: metaToken && metaToken !== "••••••••" ? metaToken : undefined,
          meta_test_event_code: testCode || null,
          webhook_url: webhookUrl || null,
          webhook_secret:
            webhookSecret && webhookSecret !== "••••••••" ? webhookSecret : undefined,
          pixel_enabled: pixelEnabled,
          gtm_enabled: gtmEnabled,
          capi_enabled: capiEnabled,
          webhook_enabled: webhookEnabled,
        },
      });
      toast.success("Integrações salvas");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    }
  };

  const testWebhook = async () => {
    if (!formId) return;
    try {
      await testLeadWebhookFn({
        data: { form_id: formId, webhook_url: webhookUrl || undefined },
      });
      toast.success("Webhook de teste enviado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no teste.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/leads">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-serif text-3xl">Integrações</h1>
          <p className="text-sm text-muted-foreground">GTM, Meta Pixel/CAPI e webhook CRM</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tracking</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>GTM ID</Label>
            <Input value={gtmId} onChange={(e) => setGtmId(e.target.value)} placeholder="GTM-XXXXXXX" />
          </div>
          <div>
            <Label>Meta Pixel ID</Label>
            <Input value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="1234567890" />
          </div>
          <div className="sm:col-span-2">
            <Label>Meta CAPI Access Token {hasToken ? "(configurado)" : ""}</Label>
            <Input
              type="password"
              value={metaToken}
              onChange={(e) => setMetaToken(e.target.value)}
              placeholder="Cole um novo token para substituir"
            />
          </div>
          <div>
            <Label>Meta Test Event Code</Label>
            <Input value={testCode} onChange={(e) => setTestCode(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-6 pt-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={gtmEnabled} onCheckedChange={setGtmEnabled} /> GTM
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={pixelEnabled} onCheckedChange={setPixelEnabled} /> Pixel
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={capiEnabled} onCheckedChange={setCapiEnabled} /> CAPI
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook CRM (só leads qualificados)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label>URL</Label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://crm.exemplo.com/webhook"
            />
          </div>
          <div>
            <Label>Secret {hasSecret ? "(configurado)" : ""}</Label>
            <Input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="Header X-Pallazium-Secret"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} /> Webhook ativo
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={save}>Salvar</Button>
            <Button variant="outline" onClick={testWebhook}>
              Testar webhook
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
