import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { submitPartnerApplicationFn } from "@/fns/partners/public";
import { PARTNERSHIP_TYPE_OPTIONS, partnersContactEmail } from "@/lib/partners";
import { captureLeadUtm } from "@/lib/leads/utm";
import { formatPhoneMask, validateWhatsApp } from "@/lib/leads/phone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/seja-parceiro")({
  component: SejaParceiroPage,
  head: () => ({
    meta: [
      { title: "Seja Parceiro — Espaço Pallazium" },
      {
        name: "description",
        content: "Proponha uma parceria com o Espaço Pallazium. Conte sobre sua empresa e sua proposta.",
      },
    ],
  }),
});

type FormState = {
  contactName: string;
  whatsapp: string;
  email: string;
  companyName: string;
  website: string;
  instagram: string;
  partnershipType: string;
  description: string;
  consent: boolean;
};

const EMPTY_FORM: FormState = {
  contactName: "",
  whatsapp: "",
  email: "",
  companyName: "",
  website: "",
  instagram: "",
  partnershipType: "",
  description: "",
  consent: false,
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-destructive">{message}</p>;
}

/** Pré-preenche com o que já foi informado no atendimento (nome/telefone/e-mail via querystring). */
function prefillFromSearch(): FormState {
  if (typeof window === "undefined") return EMPTY_FORM;
  const params = new URLSearchParams(window.location.search);
  return {
    ...EMPTY_FORM,
    contactName: params.get("nome") || "",
    whatsapp: params.get("telefone") || "",
    email: params.get("email") || "",
  };
}

function closeWindow() {
  try {
    window.open("", "_self");
    window.close();
  } catch {
    // ignore
  }
}

function SejaParceiroPage() {
  const [form, setForm] = useState<FormState>(prefillFromSearch);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (form.contactName.trim().length < 3) next.contactName = "Informe seu nome.";
    const phoneError = validateWhatsApp(form.whatsapp);
    if (phoneError) next.whatsapp = phoneError;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      next.email = "Informe um e-mail válido.";
    }
    if (form.companyName.trim().length < 2) {
      next.companyName = "Informe o nome da empresa ou nome artístico.";
    }
    if (!form.partnershipType) next.partnershipType = "Escolha o tipo de parceria.";
    if (form.description.trim().length < 10) {
      next.description = "Conte um pouco mais sobre como imagina essa parceria.";
    }
    if (!form.consent) next.consent = "É necessário autorizar o uso dos dados para continuar.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || done) return;
    if (!validate()) {
      toast.error("Confira os campos destacados no formulário.");
      return;
    }
    setBusy(true);
    try {
      await submitPartnerApplicationFn({
        data: {
          contactName: form.contactName.trim(),
          whatsapp: form.whatsapp,
          email: form.email.trim(),
          companyName: form.companyName.trim(),
          website: form.website.trim(),
          instagram: form.instagram.trim(),
          partnershipType: form.partnershipType,
          description: form.description.trim(),
          consent: form.consent,
          utm: captureLeadUtm("seja-parceiro"),
          sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
        },
      });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar sua proposta. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Proposta recebida! 🎉</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Obrigado pelo interesse em desenvolver uma parceria com o Espaço Pallazium.
            </p>
            <p>
              Suas informações foram registradas e serão avaliadas pela nossa equipe responsável,
              no momento oportuno. Se houver interesse ou necessidade de mais informações,
              entraremos em contato pelos dados informados.
            </p>
            <p className="font-semibold text-foreground">
              Obs: pedimos a gentileza de não entrar em contato pelo canal de whatsapp, que é
              exclusivo para atendimento dos nossos clientes. Caso precise enviar algum material,
              faça isso via e-mail.
            </p>
            <p className="font-medium text-foreground">E-mail: {partnersContactEmail()}</p>
            <Button className="h-12 w-full text-base font-semibold" onClick={closeWindow}>
              Fechar janela
            </Button>
            <p className="text-xs">
              Se o botão não fechar sozinho, pode fechar esta aba com segurança.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl">
              Seja parceiro do Espaço Pallazium
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Que legal saber do seu interesse em fazer uma parceria com a gente. 😊
              <br />
              Conte um pouco sobre sua empresa (ou trabalho) e sua proposta abaixo.
              <br />
              Nossa equipe vai avaliar e entrar em contato quando fizer sentido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="contactName">Seu nome</Label>
                <Input
                  id="contactName"
                  className="h-12 text-base"
                  autoComplete="name"
                  value={form.contactName}
                  onChange={(e) => set("contactName", e.target.value)}
                  disabled={busy}
                />
                <FieldError message={errors.contactName} />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    className="h-12 text-base"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 99999-9999"
                    value={form.whatsapp}
                    onChange={(e) => set("whatsapp", formatPhoneMask(e.target.value))}
                    disabled={busy}
                  />
                  <FieldError message={errors.whatsapp} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    className="h-12 text-base"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    disabled={busy}
                  />
                  <FieldError message={errors.email} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da empresa ou nome artístico</Label>
                <Input
                  id="companyName"
                  className="h-12 text-base"
                  value={form.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                  disabled={busy}
                />
                <FieldError message={errors.companyName} />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="website">Site (opcional)</Label>
                  <Input
                    id="website"
                    className="h-12 text-base"
                    placeholder="https://..."
                    value={form.website}
                    onChange={(e) => set("website", e.target.value)}
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram (opcional)</Label>
                  <Input
                    id="instagram"
                    className="h-12 text-base"
                    placeholder="@seuinstagram"
                    value={form.instagram}
                    onChange={(e) => set("instagram", e.target.value)}
                    disabled={busy}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Qual tipo de parceria você gostaria de propor?</Label>
                <Select
                  value={form.partnershipType}
                  onValueChange={(v) => set("partnershipType", v)}
                  disabled={busy}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Selecione uma opção" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTNERSHIP_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.partnershipType} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Conte brevemente como você imagina essa parceria</Label>
                <Textarea
                  id="description"
                  className="min-h-[110px] text-base"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  disabled={busy}
                />
                <FieldError message={errors.description} />
              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={form.consent}
                    onCheckedChange={(v) => set("consent", v === true)}
                    disabled={busy}
                    className="mt-0.5"
                  />
                  <span>
                    Autorizo o Espaço Pallazium a armazenar essas informações para avaliação da
                    proposta de parceria.
                  </span>
                </label>
                <FieldError message={errors.consent} />
              </div>

              <Button
                type="submit"
                className="h-12 w-full text-base font-semibold"
                disabled={busy}
              >
                {busy ? "Enviando…" : "ENVIAR PROPOSTA DE PARCERIA"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
