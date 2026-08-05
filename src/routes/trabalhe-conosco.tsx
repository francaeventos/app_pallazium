import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { submitJobApplicationFn } from "@/fns/careers/public";
import { CAREERS_AVAILABILITY_OPTIONS, CAREERS_ROLE_OPTIONS, careersContactEmail } from "@/lib/careers";
import { captureLeadUtm } from "@/lib/leads/utm";
import { formatPhoneMask, validateWhatsApp } from "@/lib/leads/phone";
import { formatDateMaskBr, validateLeadDate } from "@/lib/leads/date";
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

export const Route = createFileRoute("/trabalhe-conosco")({
  component: TrabalheConoscoPage,
  head: () => ({
    meta: [
      { title: "Trabalhe Conosco — Espaço Pallazium" },
      {
        name: "description",
        content: "Faça parte da equipe de eventos do Espaço Pallazium. Cadastre seus dados e experiência.",
      },
    ],
  }),
});

type FormState = {
  fullName: string;
  whatsapp: string;
  email: string;
  city: string;
  birthDate: string;
  roleInterest: string;
  hasExperience: "sim" | "nao" | "";
  experienceDetails: string;
  availability: string[];
  additionalInfo: string;
  consent: boolean;
};

const EMPTY_FORM: FormState = {
  fullName: "",
  whatsapp: "",
  email: "",
  city: "",
  birthDate: "",
  roleInterest: "",
  hasExperience: "",
  experienceDetails: "",
  availability: [],
  additionalInfo: "",
  consent: false,
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-destructive">{message}</p>;
}

function TrabalheConoscoPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const toggleAvailability = (option: string) => {
    setForm((prev) => ({
      ...prev,
      availability: prev.availability.includes(option)
        ? prev.availability.filter((a) => a !== option)
        : [...prev.availability, option],
    }));
    setErrors((prev) => ({ ...prev, availability: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (form.fullName.trim().length < 3) next.fullName = "Informe seu nome completo.";
    const phoneError = validateWhatsApp(form.whatsapp);
    if (phoneError) next.whatsapp = phoneError;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      next.email = "Informe um e-mail válido.";
    }
    if (form.city.trim().length < 2) next.city = "Informe sua cidade.";
    if (form.birthDate.trim()) {
      const dateError = validateLeadDate(form.birthDate, { futureOnly: false });
      if (dateError && dateError !== "Escolhe uma data pra continuar.") next.birthDate = dateError;
    }
    if (!form.roleInterest) next.roleInterest = "Escolha a função de interesse.";
    if (!form.hasExperience) next.hasExperience = "Selecione uma opção.";
    if (form.hasExperience === "sim" && !form.experienceDetails.trim()) {
      next.experienceDetails = "Conte brevemente sobre sua experiência.";
    }
    if (form.availability.length === 0) next.availability = "Selecione ao menos uma disponibilidade.";
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
      await submitJobApplicationFn({
        data: {
          fullName: form.fullName.trim(),
          whatsapp: form.whatsapp,
          email: form.email.trim(),
          city: form.city.trim(),
          birthDate: form.birthDate.trim(),
          roleInterest: form.roleInterest,
          hasExperience: form.hasExperience === "sim",
          experienceDetails: form.experienceDetails.trim(),
          availability: form.availability,
          additionalInfo: form.additionalInfo.trim(),
          consent: form.consent,
          utm: captureLeadUtm("trabalhe-conosco"),
          sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
        },
      });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar seus dados. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Cadastro recebido! 🎉</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Obrigado pelo interesse em fazer parte da equipe do Espaço Pallazium.
            </p>
            <p>
              Se surgir uma oportunidade compatível com seu perfil e disponibilidade, nossa equipe
              poderá entrar em contato.
            </p>
            <p>
              Obs: pedimos a gentileza de não entrar em contato pelo canal de whatsapp, que é
              exclusivo para atendimento dos nossos clientes. Caso queira enviar seu currículo,
              faça isso via e-mail.
            </p>
            <p className="font-medium text-foreground">E-mail: {careersContactEmail()}</p>
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
              Faça parte da equipe do Espaço Pallazium
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Estamos sempre conhecendo novos profissionais para nossa equipe de eventos.
              <br />
              Preencha seus dados abaixo e conte um pouco sobre sua experiência.
              <br />
              Quando surgir uma oportunidade compatível com o seu perfil, nossa equipe poderá
              entrar em contato.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  className="h-12 text-base"
                  autoComplete="name"
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  disabled={busy}
                />
                <FieldError message={errors.fullName} />
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

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    className="h-12 text-base"
                    autoComplete="address-level2"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    disabled={busy}
                  />
                  <FieldError message={errors.city} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Data de nascimento (opcional)</Label>
                  <Input
                    id="birthDate"
                    className="h-12 text-base"
                    inputMode="numeric"
                    placeholder="dd/mm/aaaa"
                    maxLength={10}
                    value={form.birthDate}
                    onChange={(e) => set("birthDate", formatDateMaskBr(e.target.value))}
                    disabled={busy}
                  />
                  <FieldError message={errors.birthDate} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Qual função você tem interesse em exercer?</Label>
                <Select
                  value={form.roleInterest}
                  onValueChange={(v) => set("roleInterest", v)}
                  disabled={busy}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAREERS_ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.roleInterest} />
              </div>

              <div className="space-y-2">
                <Label>Você já possui experiência trabalhando em eventos?</Label>
                <div className="flex gap-3">
                  {(["sim", "nao"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={busy}
                      onClick={() => set("hasExperience", opt)}
                      className={`h-12 flex-1 rounded-md border text-base font-medium transition-colors ${
                        form.hasExperience === opt
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background hover:bg-accent"
                      }`}
                    >
                      {opt === "sim" ? "Sim" : "Não"}
                    </button>
                  ))}
                </div>
                <FieldError message={errors.hasExperience} />
              </div>

              {form.hasExperience === "sim" ? (
                <div className="space-y-2">
                  <Label htmlFor="experienceDetails">Conte brevemente sobre sua experiência</Label>
                  <Textarea
                    id="experienceDetails"
                    className="min-h-[100px] text-base"
                    value={form.experienceDetails}
                    onChange={(e) => set("experienceDetails", e.target.value)}
                    disabled={busy}
                  />
                  <FieldError message={errors.experienceDetails} />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Qual sua disponibilidade?</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CAREERS_AVAILABILITY_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 rounded-md border p-3 text-sm"
                    >
                      <Checkbox
                        checked={form.availability.includes(option)}
                        onCheckedChange={() => toggleAvailability(option)}
                        disabled={busy}
                      />
                      {option}
                    </label>
                  ))}
                </div>
                <FieldError message={errors.availability} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalInfo">
                  Conte alguma informação adicional que considere importante
                </Label>
                <Textarea
                  id="additionalInfo"
                  className="min-h-[90px] text-base"
                  value={form.additionalInfo}
                  onChange={(e) => set("additionalInfo", e.target.value)}
                  disabled={busy}
                />
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
                    Autorizo o Espaço Pallazium a armazenar essas informações para contato
                    relacionado a oportunidades de trabalho.
                  </span>
                </label>
                <FieldError message={errors.consent} />
              </div>

              <Button
                type="submit"
                className="h-12 w-full text-base font-semibold"
                disabled={busy}
              >
                {busy ? "Enviando…" : "ENVIAR MEUS DADOS"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
