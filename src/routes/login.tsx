import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(1, "Informe a senha").max(72),
});
const resetSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
});
const signupSchema = loginSchema.extend({
  full_name: z.string().trim().min(2, "Informe seu nome").max(120),
});

const friendlyAuthError = (message: string) => {
  if (message.toLowerCase().includes("password is known to be weak")) {
    return "O login bloqueou essa senha por configuração do Auth. Para aceitar qualquer senha, desative a proteção de senha fraca no Lovable/Supabase Auth.";
  }
  return message;
};

function PasswordInput({
  id,
  name,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  name: string;
  autoComplete: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required
        autoComplete={autoComplete}
        className="pr-10"
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition hover:text-foreground"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupPassword, setSignupPassword] = useState("");

  const handleResetPassword = async (email: FormDataEntryValue | null) => {
    const parsed = resetSchema.safeParse({ email });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);

    if (error) return toast.error(error.message);
    toast.success("Enviamos o link de recuperação para o e-mail informado.");
  };

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
          <div className="mb-8 rounded-2xl border border-white/10 bg-black/75 p-6 shadow-luxe">
            <img
              src="/logo-pallazium.png"
              alt="Espaço Pallazium"
              className="mx-auto h-auto w-full object-contain"
            />
          </div>
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
            <div className="mx-auto mb-3 max-w-56 rounded-xl bg-black p-3 shadow-luxe">
              <img
                src="/logo-pallazium.png"
                alt="Espaço Pallazium"
                className="h-auto w-full object-contain"
              />
            </div>
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
                  <PasswordInput id="password" name="password" autoComplete="current-password" />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Entrando…" : "Entrar"}
                </Button>
                <button
                  type="button"
                  className="block w-full text-center text-xs text-muted-foreground underline"
                  onClick={(event) => {
                    const form = event.currentTarget.closest("form");
                    if (form) handleResetPassword(new FormData(form).get("email"));
                  }}
                >
                  Esqueci minha senha
                </button>
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
                  <PasswordInput
                    id="signup-password"
                    name="password"
                    autoComplete="new-password"
                    value={signupPassword}
                    onChange={setSignupPassword}
                  />
                  <p className="text-xs text-muted-foreground">Pode usar a senha que preferir.</p>
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
