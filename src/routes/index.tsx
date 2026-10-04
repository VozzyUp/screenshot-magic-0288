import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, FolderOpen, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { createQuote } from "@/lib/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Orçamentos — Reformas e Manutenção" },
      { name: "description", content: "Crie orçamentos bonitos em PDF para pintura, elétrica, gesso, hidráulica e mais." },
      { property: "og:title", content: "Orçamentos — Reformas e Manutenção" },
      { property: "og:description", content: "Crie orçamentos bonitos em PDF em poucos minutos, até no celular." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
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

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4 pt-4">
        <h1 className="text-3xl font-bold">Olá! O que vamos fazer?</h1>
        <button
          onClick={novo}
          disabled={busy}
          className="flex w-full items-center gap-5 rounded-2xl bg-primary p-6 text-left text-primary-foreground shadow-soft transition active:scale-[0.99] disabled:opacity-70"
        >
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/15">
            {busy ? <Loader2 className="size-8 animate-spin" /> : <Plus className="size-9" />}
          </span>
          <span>
            <span className="block text-2xl font-bold">Novo orçamento</span>
            <span className="opacity-85">Começar um orçamento do zero</span>
          </span>
        </button>
        <Link
          to="/orcamentos"
          className="flex w-full items-center gap-5 rounded-2xl border-2 bg-card p-6 shadow-card transition active:scale-[0.99]"
        >
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <FolderOpen className="size-8" />
          </span>
          <span>
            <span className="block text-2xl font-bold">Meus orçamentos</span>
            <span className="text-muted-foreground">Ver, editar, duplicar e enviar</span>
          </span>
        </Link>
        <Link to="/empresa" className="flex items-center justify-center gap-2 py-4 font-semibold text-primary">
          <Building2 className="size-5" /> Minha Empresa (logo, dados e PIX)
        </Link>
        <Link to="/funcionarios" className="flex items-center justify-center gap-2 py-2 font-semibold text-primary">
          <Users className="size-5" /> Funcionários (lista para entrada na obra)
        </Link>
      </div>
    </AppShell>
  );
}
