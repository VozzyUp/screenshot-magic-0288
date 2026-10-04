import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { FileText, LogOut, Building2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AppShell({ children, title, back }: { children: ReactNode; title?: string; back?: boolean }) {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen pb-32">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="size-5" />
            </span>
            {back ? "Início" : "Orçamentos"}
          </Link>
          {title && <span className="truncate text-muted-foreground">/ {title}</span>}
          <div className="ml-auto flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/empresa">
                <Building2 /> <span className="hidden sm:inline">Minha Empresa</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/funcionarios">
                <Users /> <span className="hidden sm:inline">Funcionários</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} aria-label="Sair">
              <LogOut />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}

function LoginScreen() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || password.length < 6) {
      toast.error("Informe o e-mail e uma senha com pelo menos 6 caracteres.");
      return;
    }
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("E-mail ou senha incorretos.");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) toast.error("Não foi possível criar a conta: " + error.message);
      else if (!data.session) toast.success("Conta criada! Abra seu e-mail e clique no link de confirmação.");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl bg-card p-7 shadow-card">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <FileText className="size-7" />
          </span>
          <h1 className="text-2xl font-bold">{mode === "in" ? "Entrar" : "Criar conta"}</h1>
          <p className="text-muted-foreground">Seus orçamentos, simples e bonitos.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-base">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw" className="text-base">Senha</Label>
          <Input id="pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {mode === "in" ? "Entrar" : "Criar conta"}
        </Button>
        <button type="button" className="w-full text-center text-primary font-medium" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Primeiro acesso? Criar conta" : "Já tenho conta. Entrar"}
        </button>
      </form>
    </div>
  );
}
