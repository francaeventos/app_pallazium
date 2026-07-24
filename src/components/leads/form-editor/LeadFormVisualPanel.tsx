import { VariableChips } from "@/components/leads/form-editor/VariableChips";
import {
  Field,
  useLeadFormEditor,
} from "@/components/leads/form-editor/editor-context";
import { StorageImageInput } from "@/components/StorageImageInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_PRIMARY_PRESETS } from "@/lib/leads/theme";
import { CORE_VARIABLE_CHIPS } from "@/lib/leads/variables";
import { Save } from "lucide-react";

export function LeadFormVisualPanel() {
  const { meta, setMeta, maxScoreHint, primaryDark, agentInitial, savingMeta, saveMeta } =
    useLeadFormEditor();

  return (
    <div className="space-y-4">
      <Card className="border-gold/15 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Cor e imagens</CardTitle>
          <CardDescription>
            Avatar e fundos. O app escolhe claro/escuro pelo tema do celular do visitante.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <Label>Cor primária</Label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={meta.primary_color}
                onChange={(e) => setMeta({ ...meta, primary_color: e.target.value })}
                className="h-11 w-14 cursor-pointer rounded-lg border bg-transparent p-1"
              />
              <Input
                className="max-w-[140px] font-mono uppercase"
                value={meta.primary_color}
                onChange={(e) => setMeta({ ...meta, primary_color: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {LEAD_PRIMARY_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  aria-label={`Usar cor ${color}`}
                  onClick={() => setMeta({ ...meta, primary_color: color })}
                  className={`h-8 w-8 rounded-full border-2 shadow ring-1 ring-black/10 transition ${
                    meta.primary_color.toLowerCase() === color.toLowerCase()
                      ? "border-foreground scale-110"
                      : "border-white"
                  }`}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border shadow-md">
            <div className="border-b bg-muted/30 px-3 py-2">
              <p className="text-sm font-medium">Preview ao vivo</p>
              <p className="text-xs text-muted-foreground">
                Header, chat e fundo da página (claro).
              </p>
            </div>
            <div className="p-3 sm:p-4" style={{ background: meta.page_bg_light || "#1A5C4F" }}>
              <div className="overflow-hidden rounded-xl shadow-lg">
                <div style={{ background: meta.wallpaper_url ? undefined : "#e5ddd5" }}>
                  <div
                    className="flex items-center gap-3 px-3 py-3 text-white"
                    style={{
                      background: `linear-gradient(180deg, ${meta.primary_color} 0%, ${primaryDark} 100%)`,
                    }}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-sm font-semibold ring-2 ring-white/30">
                      {meta.agent_avatar_url ? (
                        <img
                          src={meta.agent_avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        agentInitial
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {meta.agent_name || "Agente"}
                      </p>
                      <p className="truncate text-[11px] opacity-80">
                        {meta.header_subtitle || meta.agent_title || "Estou online"}
                        {meta.brand_name ? ` · ${meta.brand_name}` : ""}
                      </p>
                    </div>
                  </div>
                  <div
                    className="relative min-h-[140px] p-3"
                    style={
                      meta.wallpaper_url
                        ? {
                            backgroundImage: `url(${meta.wallpaper_url})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  >
                    <div className="absolute inset-0 bg-black/5" />
                    <div className="relative space-y-2">
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-xs shadow-sm">
                        Olá! Eu sou a {meta.agent_name || "assistente"} do{" "}
                        {meta.brand_name || "espaço"}.
                      </div>
                      <div
                        className="ml-auto max-w-[70%] rounded-2xl rounded-tr-sm px-3 py-2 text-xs text-white shadow-sm"
                        style={{ background: meta.primary_color }}
                      >
                        Sim, quero!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Quiz pode somar até{" "}
              <span className="font-medium text-foreground">{maxScoreHint} pts</span>.
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StorageImageInput
              bucket="leads"
              folder="avatars"
              name="agent_avatar"
              label="Avatar"
              hideFolderHint
              previewClassName="h-16 rounded-lg border bg-muted bg-cover bg-center"
              defaultValue={meta.agent_avatar_url}
              onValueChange={(url) => setMeta({ ...meta, agent_avatar_url: url })}
            />
            <StorageImageInput
              bucket="leads"
              folder="wallpapers"
              name="wallpaper_light"
              label="Fundo claro"
              hideFolderHint
              previewClassName="h-16 rounded-lg border bg-muted bg-cover bg-center"
              defaultValue={meta.wallpaper_url}
              onValueChange={(url) => setMeta({ ...meta, wallpaper_url: url })}
            />
            <StorageImageInput
              bucket="leads"
              folder="wallpapers"
              name="wallpaper_dark"
              label="Fundo escuro"
              hideFolderHint
              previewClassName="h-16 rounded-lg border bg-muted bg-cover bg-center"
              defaultValue={meta.wallpaper_dark_url}
              onValueChange={(url) => setMeta({ ...meta, wallpaper_dark_url: url })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fundo da página (claro)</Label>
              <input
                type="color"
                value={meta.page_bg_light}
                onChange={(e) => setMeta({ ...meta, page_bg_light: e.target.value })}
                className="h-10 w-full cursor-pointer rounded-lg border bg-transparent p-1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fundo da página (escuro)</Label>
              <input
                type="color"
                value={meta.page_bg_dark}
                onChange={(e) => setMeta({ ...meta, page_bg_dark: e.target.value })}
                className="h-10 w-full cursor-pointer rounded-lg border bg-transparent p-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gold/15 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-xl">SEO</CardTitle>
          <CardDescription>
            Título e descrição usados na aba do navegador e em compartilhamentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label={`Título SEO (${meta.seo_title.length}/60)`}>
            <Input
              maxLength={60}
              value={meta.seo_title}
              onChange={(e) => setMeta({ ...meta, seo_title: e.target.value })}
              placeholder="Diagnóstico do evento — Espaço Pallazium"
            />
          </Field>
          <Field label={`Descrição SEO (${meta.seo_description.length}/160)`}>
            <Textarea
              rows={3}
              maxLength={160}
              value={meta.seo_description}
              onChange={(e) => setMeta({ ...meta, seo_description: e.target.value })}
              placeholder="Conheça a Bella Festa e prepare uma proposta personalizada para o seu evento."
            />
          </Field>
        </CardContent>
      </Card>

      <Card className="border-gold/15 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-xl">WhatsApp</CardTitle>
          <CardDescription>Para onde o visitante é enviado ao final do chat.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Número do WhatsApp da equipe"
            hint="Só números, com DDI. Ex.: 5511999999999."
          >
            <Input
              value={meta.whatsapp_destination}
              placeholder="5511999999999"
              onChange={(e) => setMeta({ ...meta, whatsapp_destination: e.target.value })}
            />
          </Field>
          <div className="space-y-1.5">
            <Label>Mensagem pronta do WhatsApp</Label>
            <Input
              value={meta.whatsapp_message}
              onChange={(e) => setMeta({ ...meta, whatsapp_message: e.target.value })}
            />
            <VariableChips
              tokens={CORE_VARIABLE_CHIPS}
              onInsert={(token) =>
                setMeta({
                  ...meta,
                  whatsapp_message: meta.whatsapp_message
                    ? `${meta.whatsapp_message} ${token}`
                    : token,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={saveMeta} disabled={savingMeta}>
        <Save className="h-4 w-4" />
        {savingMeta ? "Salvando…" : "Salvar visual"}
      </Button>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
        <Button className="w-full" onClick={saveMeta} disabled={savingMeta}>
          <Save className="h-4 w-4" />
          {savingMeta ? "Salvando…" : "Salvar visual"}
        </Button>
      </div>
    </div>
  );
}
