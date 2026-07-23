import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getAdminLeadFormFn,
  getLeadIntegrationHealthFn,
  testLeadWebhookFn,
  testMetaCapiFn,
  updateLeadIntegrationsFn,
} from "@/fns/leads/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, CheckCircle2, CircleAlert, FlaskConical, Save } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/leads/integracoes")({
  component: Page,
});

type Health = Awaited<ReturnType<typeof getLeadIntegrationHealthFn>>;

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge variant={ok ? "default" : "secondary"} className="gap-1">
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
      {label}: {ok ? "ativo" : "pendente"}
    </Badge>
  );
}

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
  const [health, setHealth] = useState<Health | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [{ form }, healthData] = await Promise.all([
        getAdminLeadFormFn({ data: { slug: "leads" } }),
        getLeadIntegrationHealthFn({ data: { slug: "leads" } }),
      ]);
      setFormId(form.id);
      const i = form.integrations;
      setGtmId(i?.gtm_id || "");
      setPixelId(i?.meta_pixel_id || "");
      setMetaToken("");
      setTestCode(i?.meta_test_event_code || "");
      setWebhookUrl(i?.webhook_url || "");
      setWebhookSecret("");
      setPixelEnabled(i?.pixel_enabled ?? true);
      setGtmEnabled(i?.gtm_enabled ?? true);
      setCapiEnabled(i?.capi_enabled ?? true);
      setWebhookEnabled(i?.webhook_enabled ?? true);
      setHasToken(Boolean(i?.has_meta_token));
      setHasSecret(Boolean(i?.has_webhook_secret));
      setHealth(healthData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar integrações.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!formId) return;
    setSaving(true);
    try {
      await updateLeadIntegrationsFn({
        data: {
          form_id: formId,
          gtm_id: gtmId || null,
          meta_pixel_id: pixelId || null,
          meta_access_token: metaToken.trim() || undefined,
          meta_test_event_code: testCode || null,
          webhook_url: webhookUrl || null,
          webhook_secret: webhookSecret.trim() || undefined,
          pixel_enabled: pixelEnabled,
          gtm_enabled: gtmEnabled,
          capi_enabled: capiEnabled,
          webhook_enabled: webhookEnabled,
        },
      });
      toast.success("Integrações salvas — já valem em /leads");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async () => {
    if (!formId) return;
    try {
      if (webhookUrl.trim()) {
        await updateLeadIntegrationsFn({
          data: {
            form_id: formId,
            gtm_id: gtmId || null,
            meta_pixel_id: pixelId || null,
            meta_access_token: metaToken.trim() || undefined,
            meta_test_event_code: testCode || null,
            webhook_url: webhookUrl || null,
            webhook_secret: webhookSecret.trim() || undefined,
            pixel_enabled: pixelEnabled,
            gtm_enabled: gtmEnabled,
            capi_enabled: capiEnabled,
            webhook_enabled: webhookEnabled,
          },
        });
      }
      const result = await testLeadWebhookFn({
        data: { form_id: formId, webhook_url: webhookUrl || undefined },
      });
      toast.success(`Webhook OK${result.detail ? ` · ${result.detail}` : ""}`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no teste do webhook.");
    }
  };

  const testCapi = async () => {
    if (!formId) return;
    try {
      await updateLeadIntegrationsFn({
        data: {
          form_id: formId,
          gtm_id: gtmId || null,
          meta_pixel_id: pixelId || null,
          meta_access_token: metaToken.trim() || undefined,
          meta_test_event_code: testCode || null,
          webhook_url: webhookUrl || null,
          webhook_secret: webhookSecret.trim() || undefined,
          pixel_enabled: pixelEnabled,
          gtm_enabled: gtmEnabled,
          capi_enabled: capiEnabled,
          webhook_enabled: webhookEnabled,
        },
      });
      const result = await testMetaCapiFn({ data: { form_id: formId } });
      toast.success(`CAPI enviado · eventId ${result.eventId}`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no teste CAPI.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/leads">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-serif text-3xl">Integrações</h1>
            <p className="text-sm text-muted-foreground">
              GTM + Meta Pixel no browser · CAPI no servidor · webhook só para leads qualificados
            </p>
          </div>
        </div>
        <Button onClick={save} disabled={saving || !formId}>
          <Save className="h-4 w-4" /> Salvar tudo
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusPill ok={Boolean(health?.status.gtm)} label="GTM" />
        <StatusPill ok={Boolean(health?.status.pixel)} label="Pixel" />
        <StatusPill ok={Boolean(health?.status.capi)} label="CAPI" />
        <StatusPill ok={Boolean(health?.status.webhook)} label="Webhook" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            1. Preencha e salve os IDs abaixo. Em seguida abra{" "}
            <a className="underline" href="/leads" target="_blank" rel="noreferrer">
              /leads
            </a>{" "}
            — o GTM/Pixel carregam automaticamente se estiverem ativos.
          </p>
          <p>
            2. Eventos no <code className="rounded bg-muted px-1">dataLayer</code>:{" "}
            <code>quiz_started</code>, <code>quiz_partial</code>, <code>quiz_lead</code>,{" "}
            <code>quiz_schedule</code>. No Pixel: <code>PageView</code>, <code>Lead</code>,{" "}
            <code>Schedule</code> (com <code>eventID</code> para dedupe).
          </p>
          <p>
            3. CAPI (servidor) dispara no complete/agendamento. Webhook CRM dispara só quando{" "}
            <strong>score ≥ limiar</strong> (lead qualificado), com header{" "}
            <code className="rounded bg-muted px-1">X-Pallazium-Secret</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Tag Manager + Meta Pixel</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>GTM ID</Label>
            <Input
              value={gtmId}
              onChange={(e) => setGtmId(e.target.value)}
              placeholder="GTM-XXXXXXX"
            />
          </div>
          <div>
            <Label>Meta Pixel ID</Label>
            <Input
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="1234567890"
            />
          </div>
          <div className="flex flex-wrap gap-6 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={gtmEnabled} onCheckedChange={setGtmEnabled} /> Carregar GTM em /leads
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={pixelEnabled} onCheckedChange={setPixelEnabled} /> Carregar Pixel em
              /leads
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meta Conversions API (servidor)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Access Token {hasToken ? "(já configurado — cole outro para substituir)" : ""}</Label>
            <Input
              type="password"
              value={metaToken}
              onChange={(e) => setMetaToken(e.target.value)}
              placeholder={hasToken ? "•••••••• (deixe em branco para manter)" : "EAAB..."}
              autoComplete="off"
            />
          </div>
          <div>
            <Label>Test Event Code (Events Manager)</Label>
            <Input
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              placeholder="TEST12345"
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="mb-2 flex items-center gap-2 text-sm">
              <Switch checked={capiEnabled} onCheckedChange={setCapiEnabled} /> CAPI ativo
            </label>
            <Button variant="outline" onClick={testCapi} type="button">
              <FlaskConical className="h-4 w-4" /> Testar CAPI
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook CRM (leads qualificados)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label>URL do webhook</Label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://seu-crm.com/api/webhooks/leads"
            />
          </div>
          <div>
            <Label>Secret {hasSecret ? "(já configurado — cole outro para substituir)" : ""}</Label>
            <Input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={hasSecret ? "•••••••• (deixe em branco para manter)" : "seu-segredo"}
              autoComplete="off"
            />
          </div>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
{`POST {url}
Content-Type: application/json
X-Pallazium-Event: lead.qualified
X-Pallazium-Secret: {secret}

{
  "id": "...",
  "name": "...",
  "email": "...",
  "whatsapp": "55...",
  "score": 80,
  "qualified": true,
  "answers": { ... },
  "utm": { ... },
  "status": "completo"
}`}
          </pre>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} /> Webhook ativo
            </label>
            <Button variant="outline" onClick={testWebhook} type="button">
              <FlaskConical className="h-4 w-4" /> Testar webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos envios (CAPI / webhook)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(health?.recent_events || []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ainda sem eventos. Complete um lead qualificado em /leads ou use os botões de teste.
            </p>
          )}
          {(health?.recent_events || []).map((ev) => (
            <div
              key={ev.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <div>
                <Badge variant="outline">{ev.type}</Badge>{" "}
                <span className="text-muted-foreground">
                  {ev.lead_name || ev.lead_email || "—"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(ev.created_at), "dd/MM/yyyy HH:mm")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
