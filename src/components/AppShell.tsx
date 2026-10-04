import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { FileText, LogOut, Building2, Loader2, Users, Home, FolderOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { createQuote } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo-eletrica-santos.png.asset.json";

const NAV = [
  { to: "/", label: "Início", icon: Home, exact: true },
  { to: "/orcamentos", label: "Meus Orçamentos", icon: FolderOpen },
  { to: "/empresa", label: "Minha Empresa", icon: Building2 },
  { to: "/funcionarios", label: "Funcionários", icon: Users },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [busy, setBusy] = useState(false);

  async function novo() {
    setBusy(true);
    try {
      const id = await createQuote();
      navigate({ to: "/editar/$id", params: { id } });
    } catch {
      toast.error("Não foi possível criar o orçamento. Tente de novo.");
      setBusy(false);
    }
  }

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  if (!user) return <LoginScreen />;

  const isActive = (to: string, exact?: boolean) => (exact ? pathname === to : pathname.startsWith(to));

  return (
    <div className="min-h-screen md:flex">
      {/* Menu lateral (computador) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card md:flex print:hidden">
        <Link to="/" className="block border-b px-5 py-4">
          <img src={logo.url} alt="Elétrica Santos" className="h-14 w-full object-contain" />
        </Link>
        <div className="p-4">
          <button
            onClick={novo}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-base font-bold text-primary-foreground shadow-soft transition active:scale-[0.98] disabled:opacity-70"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />}
            Novo Orçamento
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition ${
                isActive(item.to, "exact" in item && item.exact)
                  ? "bg-accent font-bold text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <item.icon className="size-5 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3">
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-muted-foreground transition hover:bg-muted"
          >
            <LogOut className="size-5 shrink-0" /> Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1 pb-24 md:pb-8">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-card/90 px-4 backdrop-blur md:hidden print:hidden">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo.url} alt="Elétrica Santos" className="h-8" />
          </Link>
          {title && <span className="ml-2 truncate text-muted-foreground">/ {title}</span>}
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6 md:px-8">{children}</main>
      </div>

      {/* Menu inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card md:hidden print:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
              isActive(item.to, "exact" in item && item.exact) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <item.icon className="size-6" />
            {item.label === "Meus Orçamentos" ? "Orçamentos" : item.label === "Minha Empresa" ? "Empresa" : item.label}
          </Link>
        ))}
      </nav>
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
