import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, FolderOpen, Loader2, TrendingUp, CircleDollarSign, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { createQuote, monthStats } from "@/lib/data";
import { money } from "@/lib/quote";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — Orçamentos" },
      { name: "description", content: "Crie orçamentos bonitos em PDF para pintura, elétrica, gesso, hidráulica e mais." },
      { property: "og:title", content: "Orçamentos — Reformas e Manutenção" },
      { property: "og:description", content: "Crie orçamentos bonitos em PDF em poucos minutos, até no celular." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<{ count: number; total: number } | null>(null);

  useEffect(() => {
    monthStats().then(setStats).catch(() => setStats({ count: 0, total: 0 }));
  }, []);

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

  const firstName = (user?.user_metadata?.name as string | undefined)?.split(" ")[0];

  return (
    <AppShell>
      <div className="space-y-6 pt-2">
        <div>
          <h1 className="text-3xl font-bold">Olá{firstName ? `, ${firstName}` : ""}! 👋</h1>
          <p className="mt-1 text-muted-foreground">Pronto para criar mais um orçamento profissional para seus clientes?</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={novo}
            disabled={busy}
            className="flex flex-col items-start gap-6 rounded-2xl bg-primary p-6 text-left text-primary-foreground shadow-soft transition active:scale-[0.99] disabled:opacity-70"
          >
            <span className="flex w-full items-start justify-between">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-foreground/15">
                {busy ? <Loader2 className="size-7 animate-spin" /> : <Plus className="size-8" />}
              </span>
              <ArrowRight className="size-6 opacity-70" />
            </span>
            <span>
              <span className="block text-2xl font-bold">Novo Orçamento</span>
              <span className="opacity-85">Crie uma proposta guiada em menos de 3 minutos</span>
            </span>
          </button>
          <Link
            to="/orcamentos"
            className="flex flex-col items-start gap-6 rounded-2xl border-2 bg-card p-6 shadow-card transition active:scale-[0.99]"
          >
            <span className="flex w-full items-start justify-between">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <FolderOpen className="size-7" />
              </span>
              <ArrowRight className="size-6 text-muted-foreground" />
            </span>
            <span>
              <span className="block text-2xl font-bold">Meus Orçamentos</span>
              <span className="text-muted-foreground">Ver histórico, alterar status e duplicar propostas</span>
            </span>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-card">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <TrendingUp className="size-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold tracking-wide text-muted-foreground uppercase">Orçamentos este mês</span>
              <span className="block truncate text-2xl font-bold">
                {stats ? `${stats.count} ${stats.count === 1 ? "proposta" : "propostas"}` : "…"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-card">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <CircleDollarSign className="size-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold tracking-wide text-muted-foreground uppercase">Valor total orçado este mês</span>
              <span className="block truncate text-2xl font-bold text-primary">
                {stats ? money(stats.total) : "…"}
              </span>
            </span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
