import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Copy, ArrowUp, ArrowDown, Eye, Loader2, Check, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MoneyInput } from "@/components/MoneyInput";
import { supabase } from "@/integrations/supabase/client";
import {
  computeTotals,
  itemTotal,
  money,
  PAYMENT_SUGGESTIONS,
  SERVICE_TYPES,
  serviceMeta,
  serviceSubtotal,
  uid,
  UNITS,
  type DisplayMode,
  type QuoteData,
  type QuoteItem,
  type QuoteService,
} from "@/lib/quote";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/editar/$id")({
  head: () => ({
    meta: [
      { title: "Editar orçamento — Orçamentos" },
      { name: "description", content: "Monte o orçamento com serviços, itens e valores." },
      { property: "og:title", content: "Editar orçamento" },
      { property: "og:description", content: "Formulário guiado para montar seu orçamento." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditPage,
});

function EditPage() {
  const { id } = Route.useParams();
  return (
    <AppShell title="Orçamento" back>
      <Editor key={id} id={id} />
    </AppShell>
  );
}

type Suggestion = { desc: string; unit: string; unitPrice: number | null };

function move<T>(arr: T[], i: number, d: number) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const a = [...arr];
  [a[i], a[j]] = [a[j]!, a[i]!];
  return a;
}

function Editor({ id }: { id: string }) {
  const navigate = useNavigate();
  const [number, setNumber] = useState("");
  const [d, setD] = useState<QuoteData | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [addOpen, setAddOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion[]>>({});
  const firstLoad = useRef(true);
  const lsKey = `orcamento-rascunho-${id}`;

  useEffect(() => {
    supabase
      .from("quotes")
      .select("number,data,updated_at")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Orçamento não encontrado.");
          navigate({ to: "/orcamentos" });
          return;
        }
        setNumber(data.number);
        let qd = data.data as unknown as QuoteData;
        try {
          const local = JSON.parse(localStorage.getItem(lsKey) || "null");
          if (local && local.savedAt > new Date(data.updated_at).getTime()) qd = local.data;
        } catch {}
        setD(qd);
      });
    supabase
      .from("quotes")
      .select("data")
      .neq("id", id)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        const map: Record<string, Map<string, Suggestion>> = {};
        for (const r of data ?? []) {
          const qd = r.data as unknown as QuoteData;
          for (const s of qd?.services ?? []) {
            const k = s.type === "outro" ? "outro:" + s.customName.toLowerCase() : s.type;
            map[k] ??= new Map();
            for (const it of s.items) {
              const key = it.desc.trim().toLowerCase();
              if (key && !map[k].has(key)) map[k].set(key, { desc: it.desc.trim(), unit: it.unit, unitPrice: it.unitPrice });
            }
          }
        }
        setSuggestions(Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v.values()]])));
      });
  }, [id]);

  // autosave
  useEffect(() => {
    if (!d) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    localStorage.setItem(lsKey, JSON.stringify({ savedAt: Date.now(), data: d }));
    setSaveState("saving");
    const t = setTimeout(async () => {
      const { error } = await supabase
        .from("quotes")
        .update({
          data: d as never,
          client_name: d.client.name,
          total: computeTotals(d).final,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      setSaveState(error ? "error" : "saved");
      if (!error) localStorage.removeItem(lsKey);
    }, 800);
    return () => clearTimeout(t);
  }, [d]);

  const totals = useMemo(() => (d ? computeTotals(d) : null), [d]);

  if (!d || !totals) return <Loader2 className="mx-auto size-8 animate-spin text-primary" />;

  const up = (patch: Partial<QuoteData>) => setD({ ...d, ...patch });
  const upService = (sid: string, fn: (s: QuoteService) => QuoteService) =>
    setD({ ...d, services: d.services.map((s) => (s.id === sid ? fn(s) : s)) });

  function addService(type: string, customName = "") {
    const s: QuoteService = {
      id: uid(),
      type,
      customName,
      manualSubtotal: null,
      items: [{ id: uid(), qty: "", unit: "un", desc: "", unitPrice: null }],
    };
    setD({ ...d!, services: [...d!.services, s] });
    setAddOpen(false);
    setTimeout(() => document.getElementById("svc-" + s.id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function goPreview() {
    const problems: string[] = [];
    if (!d!.client.name.trim()) problems.push("nome do cliente");
    if (!d!.services.length) problems.push("pelo menos um serviço");
    const badItem = d!.services.some((s) => s.items.some((it) => !it.desc.trim() || !it.qty.trim()));
    if (badItem) problems.push("quantidade e descrição de todos os itens");
    if (problems.length) {
      setShowErrors(true);
      toast.error("Falta preencher: " + problems.join(", ") + ".");
      return;
    }
    navigate({ to: "/ver/$id", params: { id } });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-muted-foreground">Orçamento</div>
          <h1 className="text-3xl font-bold tabular-nums">Nº {number}</h1>
        </div>
        <SaveBadge state={saveState} />
      </div>

      {/* Cliente */}
      <Section n={1} title="Cliente">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do cliente *" error={showErrors && !d.client.name.trim()}>
            <Input value={d.client.name} onChange={(e) => up({ client: { ...d.client, name: e.target.value } })} />
          </Field>
          <Field label="Telefone / WhatsApp">
            <Input inputMode="tel" placeholder="(11) 99999-9999" value={d.client.phone} onChange={(e) => up({ client: { ...d.client, phone: e.target.value } })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Endereço da obra">
              <Input value={d.client.address} onChange={(e) => up({ client: { ...d.client, address: e.target.value } })} />
            </Field>
          </div>
          <Field label="E-mail (opcional)">
            <Input type="email" value={d.client.email} onChange={(e) => up({ client: { ...d.client, email: e.target.value } })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <Input type="date" value={d.issueDate} onChange={(e) => up({ issueDate: e.target.value })} />
            </Field>
            <Field label="Validade (dias)">
              <Input inputMode="numeric" value={String(d.validityDays)} onChange={(e) => up({ validityDays: parseInt(e.target.value.replace(/\D/g, "") || "0", 10) })} />
            </Field>
          </div>
        </div>
      </Section>

      {/* Serviços */}
      <Section n={2} title="Serviços e itens">
        <div className="space-y-5">
          {d.services.map((s, si) => (
            <ServiceBlock
              key={s.id}
              s={s}
              index={si}
              count={d.services.length}
              showErrors={showErrors}
              mode={d.displayMode}
              suggestions={suggestions[s.type === "outro" ? "outro:" + s.customName.toLowerCase() : s.type] ?? []}
              onChange={(fn) => upService(s.id, fn)}
              onMove={(dir) => up({ services: move(d.services, si, dir) })}
              onRemove={() => up({ services: d.services.filter((x) => x.id !== s.id) })}
            />
          ))}
          <Button variant="dashed" size="lg" className="w-full" onClick={() => setAddOpen(true)}>
            <Plus /> Adicionar serviço
          </Button>
        </div>
      </Section>

      {/* Valores */}
      <Section n={3} title="Valores">
        <div className="space-y-5">
          <div>
            <Label className="text-base font-bold">Como mostrar os valores no orçamento?</Label>
            <div className="mt-2 grid gap-2">
              {(
                [
                  ["items", "Mostrar valor de cada item", "Preço de cada linha, subtotais e total"],
                  ["services", "Mostrar só o total de cada serviço", "Esconde os valores dos itens"],
                  ["total", "Mostrar só o valor total final", "Lista os itens sem valores"],
                ] as [DisplayMode, string, string][]
              ).map(([k, t, sub]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => up({ displayMode: k })}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition",
                    d.displayMode === k ? "border-primary bg-accent" : "bg-card",
                  )}
                >
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border-2", d.displayMode === k ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                    {d.displayMode === k && <Check className="size-4" />}
                  </span>
                  <span>
                    <span className="block font-semibold">{t}</span>
                    <span className="text-sm text-muted-foreground">{sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Field label="Definir total manualmente (opcional)" hint="Se preencher, este valor vira o total do orçamento.">
            <MoneyInput value={d.manualTotal} onChange={(v) => up({ manualTotal: v })} placeholder="Deixe vazio para somar automático" />
          </Field>

          <div>
            <Label className="text-base">Desconto (opcional)</Label>
            <div className="mt-2 flex gap-2">
              <div className="flex rounded-lg border-2 p-1">
                {(["value", "percent"] as const).map((k) => (
                  <button key={k} type="button" onClick={() => up({ discountType: k, discountValue: null })} className={cn("rounded-md px-4 font-bold", d.discountType === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                    {k === "value" ? "R$" : "%"}
                  </button>
                ))}
              </div>
              {d.discountType === "value" ? (
                <MoneyInput value={d.discountValue} onChange={(v) => up({ discountValue: v })} />
              ) : (
                <Input
                  inputMode="decimal"
                  placeholder="0"
                  className="text-right"
                  value={d.discountValue ?? ""}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value.replace(",", "."));
                    up({ discountValue: isFinite(v) ? Math.min(v, 100) : null });
                  }}
                />
              )}
            </div>
          </div>

          <div className="space-y-1 rounded-xl bg-muted p-4">
            {totals.discount > 0 && (
              <>
                <Row l="Subtotal" r={money(totals.gross)} />
                <Row l="Desconto" r={"− " + money(totals.discount)} />
              </>
            )}
            <div className="flex items-baseline justify-between">
              <span className="font-bold">Total</span>
              <span className="text-3xl font-extrabold text-primary tabular-nums">{money(totals.final)}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Condições */}
      <Section n={4} title="Condições">
        <div className="space-y-4">
          <Field label="Forma de pagamento">
            <Input value={d.payment} onChange={(e) => up({ payment: e.target.value })} placeholder="Ex.: À vista no PIX" />
            <div className="flex flex-wrap gap-2 pt-1">
              {PAYMENT_SUGGESTIONS.map((p) => (
                <button key={p} type="button" onClick={() => up({ payment: p })} className="rounded-full bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground">
                  {p}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Prazo de execução">
            <Input value={d.deadline} onChange={(e) => up({ deadline: e.target.value })} placeholder="Ex.: 10 dias úteis" />
          </Field>
          <Field label="Observações">
            <Textarea rows={4} className="text-base" value={d.notes} onChange={(e) => up({ notes: e.target.value })} />
          </Field>
        </div>
      </Section>

      {/* Barra fixa */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-muted-foreground">TOTAL</div>
            <div className="truncate text-2xl font-extrabold text-primary tabular-nums">{money(totals.final)}</div>
          </div>
          <Button size="lg" onClick={goPreview}>
            <Eye /> Ver orçamento
          </Button>
        </div>
      </div>

      <AddServiceDialog open={addOpen} onOpenChange={setAddOpen} onPick={addService} />
    </div>
  );
}

function SaveBadge({ state }: { state: "saved" | "saving" | "error" }) {
  if (state === "saving") return <span className="flex items-center gap-1 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Salvando…</span>;
  if (state === "error") return <span className="flex items-center gap-1 text-sm text-destructive"><CloudOff className="size-4" /> Salvo só neste aparelho</span>;
  return <span className="flex items-center gap-1 text-sm text-success"><Check className="size-4" /> Salvo</span>;
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-card p-4 shadow-card sm:p-6">
      <h2 className="mb-4 flex items-center gap-3 text-xl font-bold">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={cn("text-base", error && "text-destructive")}>{label}</Label>
      <div className={cn(error && "[&_input]:border-destructive [&_textarea]:border-destructive")}>{children}</div>
      {error && <p className="text-sm text-destructive">Campo obrigatório</p>}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({ l, r }: { l: string; r: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{l}</span>
      <span className="tabular-nums">{r}</span>
    </div>
  );
}

function AddServiceDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (v: boolean) => void; onPick: (type: string, name?: string) => void }) {
  const [other, setOther] = useState<string | null>(null);
  useEffect(() => {
    if (!open) setOther(null);
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Qual serviço?</DialogTitle>
        </DialogHeader>
        {other === null ? (
          <div className="grid grid-cols-2 gap-3">
            {SERVICE_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => (t.key === "outro" ? setOther("") : onPick(t.key))}
                className={cn("flex flex-col items-center gap-2 rounded-xl border-2 bg-card p-4 font-semibold transition hover:border-primary active:scale-[0.98]", t.key === "outro" && "col-span-2 flex-row justify-center")}
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <t.icon className="size-6" />
                </span>
                {t.label}
              </button>
            ))}
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (other.trim()) onPick("outro", other.trim());
            }}
          >
            <Label className="text-base">Nome do serviço</Label>
            <Input autoFocus value={other} onChange={(e) => setOther(e.target.value)} placeholder="Ex.: Marcenaria" />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOther(null)}>Voltar</Button>
              <Button type="submit" className="flex-1" disabled={!other.trim()}>Adicionar</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ServiceBlock({
  s,
  index,
  count,
  mode,
  showErrors,
  suggestions,
  onChange,
  onMove,
  onRemove,
}: {
  s: QuoteService;
  index: number;
  count: number;
  mode: DisplayMode;
  showErrors: boolean;
  suggestions: Suggestion[];
  onChange: (fn: (s: QuoteService) => QuoteService) => void;
  onMove: (d: number) => void;
  onRemove: () => void;
}) {
  const meta = serviceMeta(s);
  const sub = serviceSubtotal(s);
  const upItem = (iid: string, patch: Partial<QuoteItem>) =>
    onChange((x) => ({ ...x, items: x.items.map((it) => (it.id === iid ? { ...it, ...patch } : it)) }));

  return (
    <div id={"svc-" + s.id} className="scroll-mt-20 overflow-hidden rounded-xl border-2 border-primary/25">
      <div className="flex items-center gap-2 bg-accent px-3 py-2.5">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <meta.icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-lg font-bold text-accent-foreground">{meta.label}</span>
        <Button variant="ghost" size="icon" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Subir serviço"><ArrowUp /></Button>
        <Button variant="ghost" size="icon" disabled={index === count - 1} onClick={() => onMove(1)} aria-label="Descer serviço"><ArrowDown /></Button>
        <ConfirmButton title={`Remover o serviço “${meta.label}”?`} description="Todos os itens dele serão apagados." confirmLabel="Sim, remover" onConfirm={onRemove}>
          <Button variant="danger" size="icon" aria-label="Remover serviço"><Trash2 /></Button>
        </ConfirmButton>
      </div>

      <div className="divide-y">
        {s.items.map((it, ii) => (
          <ItemRow
            key={it.id}
            it={it}
            n={ii + 1}
            first={ii === 0}
            last={ii === s.items.length - 1}
            showErrors={showErrors}
            suggestions={suggestions}
            onChange={(p) => upItem(it.id, p)}
            onMove={(dir) => onChange((x) => ({ ...x, items: move(x.items, ii, dir) }))}
            onDuplicate={() => onChange((x) => {
              const a = [...x.items];
              a.splice(ii + 1, 0, { ...it, id: uid() });
              return { ...x, items: a };
            })}
            onRemove={() => onChange((x) => ({ ...x, items: x.items.filter((y) => y.id !== it.id) }))}
          />
        ))}
      </div>

      <div className="space-y-3 border-t bg-muted/50 p-3">
        <Button variant="dashed" className="w-full" onClick={() => onChange((x) => ({ ...x, items: [...x.items, { id: uid(), qty: "", unit: x.items[x.items.length - 1]?.unit ?? "un", desc: "", unitPrice: null }] }))}>
          <Plus /> Adicionar item
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold">Subtotal {meta.label}</span>
          <span className="text-xl font-bold tabular-nums">{money(sub)}</span>
        </div>
        {mode !== "total" && (
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-muted-foreground">Subtotal manual (opcional)</Label>
            <MoneyInput value={s.manualSubtotal} onChange={(v) => onChange((x) => ({ ...x, manualSubtotal: v }))} placeholder="Deixe vazio para somar automático" />
          </div>
        )}
      </div>
    </div>
  );
}

function ItemRow({
  it,
  n,
  first,
  last,
  showErrors,
  suggestions,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  it: QuoteItem;
  n: number;
  first: boolean;
  last: boolean;
  showErrors: boolean;
  suggestions: Suggestion[];
  onChange: (p: Partial<QuoteItem>) => void;
  onMove: (d: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const [focus, setFocus] = useState(false);
  const customUnit = !UNITS.includes(it.unit);
  const [typingUnit, setTypingUnit] = useState(customUnit);
  const term = it.desc.trim().toLowerCase();
  const matches = focus && term.length >= 2 ? suggestions.filter((s) => s.desc.toLowerCase().includes(term) && s.desc.toLowerCase() !== term).slice(0, 4) : [];
  const total = itemTotal(it);

  return (
    <div className="space-y-3 bg-card p-3 sm:p-4">
      <div className="flex items-center gap-1">
        <span className="mr-auto text-sm font-bold text-muted-foreground">Item {n}</span>
        <Button variant="ghost" size="icon" disabled={first} onClick={() => onMove(-1)} aria-label="Subir item"><ArrowUp /></Button>
        <Button variant="ghost" size="icon" disabled={last} onClick={() => onMove(1)} aria-label="Descer item"><ArrowDown /></Button>
        <Button variant="ghost" size="icon" onClick={onDuplicate} aria-label="Duplicar item"><Copy /></Button>
        <ConfirmButton title="Remover este item?" confirmLabel="Sim, remover" onConfirm={onRemove}>
          <Button variant="danger" size="icon" aria-label="Remover item"><Trash2 /></Button>
        </ConfirmButton>
      </div>

      <div className="relative">
        <Textarea
          rows={2}
          placeholder="Descrição do item *"
          className={cn("min-h-12 resize-none border-2 text-base [field-sizing:content]", showErrors && !it.desc.trim() && "border-destructive")}
          value={it.desc}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          onChange={(e) => onChange({ desc: e.target.value })}
        />
        {matches.length > 0 && (
          <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border-2 bg-popover shadow-card">
            <div className="px-3 pt-2 text-xs font-semibold text-muted-foreground">Já usados antes</div>
            {matches.map((m) => (
              <button
                key={m.desc}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ desc: m.desc, unit: m.unit, unitPrice: m.unitPrice });
                  setTypingUnit(!UNITS.includes(m.unit));
                  setFocus(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-accent"
              >
                <span className="truncate">{m.desc}</span>
                <span className="shrink-0 text-sm text-muted-foreground">{m.unit} · {money(m.unitPrice)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <Label className="text-sm text-muted-foreground">Quantidade *</Label>
          <Input
            inputMode="decimal"
            placeholder="0"
            className={cn(showErrors && !it.qty.trim() && "border-destructive")}
            value={it.qty}
            onChange={(e) => onChange({ qty: e.target.value.replace(/[^\d,]/g, "").replace(/,(?=.*,)/g, "") })}
          />
        </div>
        <div>
          <Label className="text-sm text-muted-foreground">Unidade</Label>
          {typingUnit ? (
            <div className="flex gap-1">
              <Input value={it.unit} placeholder="un." onChange={(e) => onChange({ unit: e.target.value })} />
              <Button variant="ghost" size="icon" onClick={() => { setTypingUnit(false); onChange({ unit: "un" }); }} aria-label="Voltar à lista">×</Button>
            </div>
          ) : (
            <select
              className="h-12 w-full rounded-lg border-2 border-input bg-card px-3 text-base"
              value={it.unit}
              onChange={(e) => {
                if (e.target.value === "__outra") {
                  setTypingUnit(true);
                  onChange({ unit: "" });
                } else onChange({ unit: e.target.value });
              }}
            >
              {UNITS.map((u) => <option key={u} value={u}>{u === "vb" ? "vb (verba)" : u}</option>)}
              <option value="__outra">Outra…</option>
            </select>
          )}
        </div>
        <div>
          <Label className="text-sm text-muted-foreground">Valor unitário</Label>
          <MoneyInput value={it.unitPrice} onChange={(v) => onChange({ unitPrice: v })} placeholder="Opcional" />
        </div>
        <div>
          <Label className="text-sm text-muted-foreground">Total do item</Label>
          <div className="flex h-12 items-center justify-end rounded-lg bg-muted px-3 font-bold tabular-nums">{money(total)}</div>
        </div>
      </div>
    </div>
  );
}
