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

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

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
              Ainda não recebeu seu acesso? Fale com a equipe responsável pelo seu evento.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
