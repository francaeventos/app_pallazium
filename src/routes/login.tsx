import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  clearRecoveryMode,
  isRecoveryUrl,
  markRecoveryMode,
} from "@/lib/password-recovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";

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
const newPasswordSchema = z
  .object({
    password: z.string().min(6, "Use pelo menos 6 caracteres").max(72),
    confirm: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "As senhas não coincidem.",
    path: ["confirm"],
  });

const friendlyAuthError = (message: string) => {
  if (message.toLowerCase().includes("password is known to be weak")) {
    return "Senha bloqueada pela proteção de senha fraca. Use uma senha mais forte.";
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
        className="h-12 pr-11 rounded-xl border-border/70 bg-card focus-visible:ring-primary"
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground"
        onClick={() => setVisible((v) => !v)}
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
  const [mode, setMode] = useState<"login" | "signup" | "recovery">("login");
  const [signupPassword, setSignupPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let active = true;

    const enterRecoveryMode = () => {
      if (!active) return;
      markRecoveryMode();
      setMode("recovery");
    };

    if (isRecoveryUrl()) enterRecoveryMode();

    const searchParams = new URLSearchParams(window.location.search);
    const tokenHash = searchParams.get("token_hash");
    if (tokenHash && searchParams.get("type") === "recovery") {
      supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash }).then(({ error }) => {
        if (error) toast.error(error.message);
        else enterRecoveryMode();
      });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") enterRecoveryMode();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

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

  const handleUpdatePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = newPasswordSchema.safeParse({
      password: newPassword,
      confirm: confirmPassword,
    });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) return toast.error(friendlyAuthError(error.message));
    clearRecoveryMode();
    window.history.replaceState({}, document.title, "/login");
    toast.success("Senha atualizada com sucesso!");
    navigate({ to: "/" });
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
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center p-4 sm:p-8"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30 pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl bg-white/95 backdrop-blur-md shadow-2xl border border-white/40 p-8 sm:p-10">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 w-full max-w-[220px]">
              <img
                src="/logo-pallazium.png"
                alt="Espaço Pallazium"
                className="h-auto w-full object-contain"
              />
            </div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
              Área do Cliente
            </p>
          </div>

          {mode !== "recovery" && (
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-muted p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-full py-2 font-medium transition ${
                mode === "login"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-full py-2 font-medium transition ${
                mode === "signup"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Criar conta
            </button>
          </div>
          )}

          {mode === "recovery" ? (
            <form onSubmit={handleUpdatePassword} className="mt-6 space-y-5">
              <div className="text-center">
                <h2 className="font-serif text-xl text-foreground">Nova senha</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Defina uma nova senha para acessar sua conta.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-xs font-medium text-muted-foreground">
                  Nova senha *
                </Label>
                <PasswordInput
                  id="new-password"
                  name="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={setNewPassword}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="confirm-password"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Confirmar senha *
                </Label>
                <PasswordInput
                  id="confirm-password"
                  name="confirm"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-full text-base font-semibold shadow-luxe"
              >
                {loading ? "Salvando…" : "Salvar nova senha"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  clearRecoveryMode();
                  setMode("login");
                  window.history.replaceState({}, document.title, "/login");
                }}
              >
                Voltar ao login
              </button>
            </form>
          ) : mode === "login" ? (            <form onSubmit={handleLogin} className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                  Email *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="h-12 rounded-xl border-border/70 bg-card focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                  Senha *
                </Label>
                <PasswordInput id="password" name="password" autoComplete="current-password" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                  <Checkbox id="remember" />
                  <span>Salvar login</span>
                </label>
                <button
                  type="button"
                  className="flex items-center gap-1.5 font-medium text-gold hover:underline"
                  onClick={(event) => {
                    const form = event.currentTarget.closest("form");
                    if (form) handleResetPassword(new FormData(form).get("email"));
                  }}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Esqueci minha senha
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-full text-base font-semibold shadow-luxe"
              >
                {loading ? "Entrando…" : "Entrar"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-xs font-medium text-muted-foreground">
                  Nome completo *
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  required
                  autoComplete="name"
                  className="h-12 rounded-xl border-border/70 bg-card focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-xs font-medium text-muted-foreground">
                  Email *
                </Label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="h-12 rounded-xl border-border/70 bg-card focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-xs font-medium text-muted-foreground">
                  Senha *
                </Label>
                <PasswordInput
                  id="signup-password"
                  name="password"
                  autoComplete="new-password"
                  value={signupPassword}
                  onChange={setSignupPassword}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-full text-base font-semibold shadow-luxe"
              >
                {loading ? "Criando…" : "Criar conta"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Após o cadastro, a equipe Pallazium vinculará seu evento à conta.
              </p>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/85 drop-shadow">
          © {new Date().getFullYear()} Espaço Pallazium. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
