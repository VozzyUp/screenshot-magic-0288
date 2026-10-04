import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Plus, Copy, Trash2, Pencil, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { createQuote } from "@/lib/data";
import { money, STATUS, todayISO, type QuoteData, type QuoteStatus } from "@/lib/quote";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orcamentos")({
  head: () => ({
    meta: [
      { title: "Meus orçamentos — Orçamentos" },
      { name: "description", content: "Todos os seus orçamentos com busca e status." },
      { property: "og:title", content: "Meus orçamentos" },
      { property: "og:description", content: "Busque, edite, duplique e acompanhe seus orçamentos." },
    ],
  }),
  component: ListPage,
});

interface Row {
  id: string;
  number: string;
  client_name: string;
  total: number;
  status: string;
  created_at: string;
  data: unknown;
}

const statusStyle: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviado: "bg-accent text-accent-foreground",
  aprovado: "bg-success/15 text-success",
  recusado: "bg-destructive/10 text-destructive",
};

function ListPage() {
  return (
    <AppShell title="Meus orçamentos" back>
      <List />
    </AppShell>
  );
}

function List() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("quotes")
      .select("id,number,client_name,total,status,created_at,data")
      .order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: QuoteStatus) {
    setRows((r) => r?.map((x) => (x.id === id ? { ...x, status } : x)) ?? null);
    await supabase.from("quotes").update({ status }).eq("id", id);
  }

  async function duplicate(r: Row) {
    setBusy(true);
    try {
      const d = { ...(r.data as QuoteData), issueDate: todayISO() };
      const id = await createQuote(d);
      toast.success("Cópia criada!");
      navigate({ to: "/editar/$id", params: { id } });
    } catch {
      toast.error("Não foi possível duplicar.");
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await supabase.from("quotes").delete().eq("id", id);
    setRows((r) => r?.filter((x) => x.id !== id) ?? null);
    toast.success("Orçamento excluído.");
  }

  async function novo() {
    setBusy(true);
    try {
      const id = await createQuote();
      navigate({ to: "/editar/$id", params: { id } });
    } catch {
      toast.error("Não foi possível criar.");
      setBusy(false);
    }
  }

  const term = q.trim().toLowerCase();
  const filtered = (rows ?? []).filter(
    (r) => !term || r.client_name.toLowerCase().includes(term) || r.number.includes(term),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Meus orçamentos</h1>
        <Button onClick={novo} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Plus />} Novo orçamento
        </Button>
      </div>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-11" placeholder="Buscar por cliente ou número" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {rows === null ? (
        <Loader2 className="mx-auto size-8 animate-spin text-primary" />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed p-10 text-center text-muted-foreground">
          {rows.length === 0 ? "Você ainda não tem orçamentos. Toque em “Novo orçamento”." : "Nenhum orçamento encontrado."}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-2xl bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link to="/editar/$id" params={{ id: r.id }} className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-muted-foreground">
                    Nº {r.number} · {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="truncate text-lg font-bold">{r.client_name || "Cliente sem nome"}</div>
                  <div className="text-xl font-bold text-primary tabular-nums">{money(Number(r.total))}</div>
                </Link>
                <Select value={r.status} onValueChange={(v) => setStatus(r.id, v as QuoteStatus)}>
                  <SelectTrigger className={cn("h-10 w-36 rounded-full border-0 font-semibold", statusStyle[r.status])}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS.map((s) => (
                      <SelectItem key={s.key} value={s.key} className="text-base">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-3 flex flex-wrap gap-1 border-t pt-3">
                <Button asChild variant="ghost" size="sm"><Link to="/editar/$id" params={{ id: r.id }}><Pencil /> Editar</Link></Button>
                <Button asChild variant="ghost" size="sm"><Link to="/ver/$id" params={{ id: r.id }}><Eye /> Ver</Link></Button>
                <Button variant="ghost" size="sm" onClick={() => duplicate(r)} disabled={busy}><Copy /> Duplicar</Button>
                <ConfirmButton title="Excluir este orçamento?" description="Essa ação não pode ser desfeita." onConfirm={() => remove(r.id)}>
                  <Button variant="danger" size="sm" className="ml-auto"><Trash2 /> Excluir</Button>
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
