import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});
const signupSchema = loginSchema.extend({
  full_name: z.string().trim().min(2, "Informe seu nome").max(120),
  password: z
    .string()
    .min(10, "Use pelo menos 10 caracteres")
    .regex(/[a-z]/, "Use pelo menos uma letra minúscula")
    .regex(/[A-Z]/, "Use pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "Use pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "Use pelo menos um símbolo, como @, # ou !")
    .max(72),
});

const friendlyAuthError = (message: string) => {
  if (message.toLowerCase().includes("password is known to be weak")) {
    return "Senha muito fraca. Use uma senha mais forte, com maiúscula, minúscula, número e símbolo.";
  }
  return message;
};

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo(a)!");
    navigate({ to: "/" });
  };

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      full_name: fd.get("full_name"),
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: parsed.data.full_name },
      },
    });
    setLoading(false);

    if (error) return toast.error(friendlyAuthError(error.message));
    toast.success("Conta criada! Agora a equipe Pallazium vinculará seu evento.");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative bg-gradient-luxe items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.78_0.12_85/0.25),transparent_60%)]" />
        <div className="relative max-w-md text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-gold shadow-luxe mb-6">
            <span className="font-serif text-3xl text-white">P</span>
          </div>
          <h1 className="font-serif text-5xl text-ink leading-tight">Espaço Pallazium</h1>
          <p className="mt-3 text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Área do Cliente
          </p>
          <p className="mt-8 text-muted-foreground">
            Acompanhe cada detalhe do seu evento com a sofisticação e organização que ele merece.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold shadow-luxe mb-3">
              <span className="font-serif text-2xl text-white">P</span>
            </div>
            <h1 className="font-serif text-3xl">Espaço Pallazium</h1>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            <Button
              type="button"
              variant={mode === "login" ? "secondary" : "ghost"}
              onClick={() => setMode("login")}
              className="w-full"
            >
              Entrar
            </Button>
            <Button
              type="button"
              variant={mode === "signup" ? "secondary" : "ghost"}
              onClick={() => setMode("signup")}
              className="w-full"
            >
              Criar conta
            </Button>
          </div>

          {mode === "login" ? (
            <div className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    Acesso exclusivo
                  </p>
                  <h2 className="font-serif text-3xl mt-2">Bem-vindo de volta</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Entre com o e-mail liberado pela equipe Pallazium após o fechamento do contrato.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Entrando…" : "Entrar"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Primeiro acesso? Clique em{" "}
                  <button type="button" className="underline" onClick={() => setMode("signup")}>
                    Criar conta
                  </button>
                  .
                </p>
              </form>
            </div>
          ) : (
            <div className="mt-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    Primeiro acesso
                  </p>
                  <h2 className="font-serif text-3xl mt-2">Criar sua conta</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Use o mesmo e-mail informado no contrato para facilitar o vínculo do evento.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome completo</Label>
                  <Input id="full_name" name="full_name" required autoComplete="name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    minLength={10}
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use 10+ caracteres com maiúscula, minúscula, número e símbolo. Exemplo:
                    Pallazium2026!
                  </p>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Criando…" : "Criar conta"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Após o cadastro, a equipe Pallazium vinculará seu evento à conta.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
