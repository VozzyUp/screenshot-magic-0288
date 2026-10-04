import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, FileDown, Printer, ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmButton } from "@/components/ConfirmButton";
import { supabase } from "@/integrations/supabase/client";
import { loadCompany } from "@/lib/data";
import { downloadPdf } from "@/lib/pdf";
import { EMPTY_COMPANY, type Company } from "@/lib/quote";

export const Route = createFileRoute("/funcionarios")({
  head: () => ({
    meta: [
      { title: "Funcionários — Orçamentos" },
      { name: "description", content: "Cadastro de funcionários e lista para liberar entrada na obra." },
      { property: "og:title", content: "Funcionários — Orçamentos" },
      { property: "og:description", content: "Gere a lista de funcionários para autorização de entrada na obra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell title="Funcionários">
      <EmployeesPage />
    </AppShell>
  ),
});

type Employee = { id?: string; name: string; cpf: string; rg: string; role: string; phone: string; birth_date: string };
const EMPTY: Employee = { name: "", cpf: "", rg: "", role: "", phone: "", birth_date: "" };

function maskCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskDate(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2");
}

function EmployeesPage() {
  const [list, setList] = useState<Employee[] | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);

  async function load() {
    const { data } = await supabase.from("employees").select("*").order("name");
    setList((data as Employee[]) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    await supabase.from("employees").delete().eq("id", id);
    setSelected((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    toast.success("Funcionário excluído.");
    load();
  }

  if (editing) return <EmployeeForm initial={editing} onDone={() => { setEditing(null); load(); }} />;
  if (printing && list)
    return <PrintList employees={list.filter((e) => selected.has(e.id!))} onBack={() => setPrinting(false)} />;

  const allSelected = !!list?.length && list.every((e) => selected.has(e.id!));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Funcionários</h1>
        <Button size="lg" onClick={() => setEditing({ ...EMPTY })}>
          <Plus /> Adicionar funcionário
        </Button>
      </div>

      {!list ? (
        <Loader2 className="mx-auto size-8 animate-spin text-primary" />
      ) : list.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground shadow-card">
          <Users className="mx-auto mb-3 size-10 text-primary" />
          Nenhum funcionário cadastrado ainda. Toque em "Adicionar funcionário".
        </div>
      ) : (
        <>
          <p className="text-muted-foreground">Marque quem vai para a obra e toque em "Gerar lista".</p>
          <label className="flex items-center gap-3 px-1 font-medium">
            <Checkbox
              className="size-6"
              checked={allSelected}
              onCheckedChange={(v) => setSelected(v ? new Set(list.map((e) => e.id!)) : new Set())}
            />
            Marcar todos
          </label>
          <ul className="space-y-3">
            {list.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card">
                <Checkbox
                  className="size-6"
                  checked={selected.has(e.id!)}
                  onCheckedChange={(v) =>
                    setSelected((s) => {
                      const n = new Set(s);
                      if (v) n.add(e.id!);
                      else n.delete(e.id!);
                      return n;
                    })
                  }
                  aria-label={`Selecionar ${e.name}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-semibold">{e.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {[e.role, e.cpf && `CPF ${e.cpf}`].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setEditing(e)} aria-label="Editar">
                  <Pencil />
                </Button>
                <ConfirmButton
                  title="Excluir funcionário?"
                  description={`${e.name} será removido do cadastro.`}
                  onConfirm={() => remove(e.id!)}
                >
                  <Button variant="ghost" size="icon" aria-label="Excluir">
                    <Trash2 />
                  </Button>
                </ConfirmButton>
              </li>
            ))}
          </ul>
          <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 p-4 backdrop-blur">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
              <span className="font-medium">{selected.size} selecionado(s)</span>
              <Button size="lg" disabled={!selected.size} onClick={() => setPrinting(true)}>
                <FileDown /> Gerar lista
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmployeeForm({ initial, onDone }: { initial: Employee; onDone: () => void }) {
  const [e, setE] = useState<Employee>(initial);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Employee, v: string) => setE((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!e.name.trim()) { toast.error("Informe o nome do funcionário."); return; }
    setBusy(true);
    const payload = {
      name: e.name.trim().slice(0, 150),
      cpf: e.cpf,
      rg: e.rg.slice(0, 30),
      role: e.role.slice(0, 80),
      phone: e.phone.slice(0, 30),
      birth_date: e.birth_date,
    };
    const { error } = e.id
      ? await supabase.from("employees").update(payload).eq("id", e.id)
      : await supabase.from("employees").insert(payload);
    setBusy(false);
    if (error) { toast.error("Não foi possível salvar. Tente de novo."); return; }
    toast.success("Funcionário salvo!");
    onDone();
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onDone}>
        <ArrowLeft /> Voltar
      </Button>
      <h1 className="text-2xl font-bold">{e.id ? "Editar funcionário" : "Novo funcionário"}</h1>
      <div className="space-y-4 rounded-2xl bg-card p-5 shadow-card">
        <Field label="Nome completo *">
          <Input value={e.name} onChange={(x) => set("name", x.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CPF">
            <Input inputMode="numeric" value={e.cpf} onChange={(x) => set("cpf", maskCpf(x.target.value))} placeholder="000.000.000-00" />
          </Field>
          <Field label="RG">
            <Input value={e.rg} onChange={(x) => set("rg", x.target.value)} />
          </Field>
          <Field label="Função">
            <Input value={e.role} onChange={(x) => set("role", x.target.value)} placeholder="Ex.: Eletricista, Ajudante" />
          </Field>
          <Field label="Data de nascimento">
            <Input inputMode="numeric" value={e.birth_date} onChange={(x) => set("birth_date", maskDate(x.target.value))} placeholder="dd/mm/aaaa" />
          </Field>
          <Field label="Telefone">
            <Input inputMode="tel" value={e.phone} onChange={(x) => set("phone", x.target.value)} />
          </Field>
        </div>
      </div>
      <Button size="lg" className="w-full" onClick={save} disabled={busy}>
        {busy && <Loader2 className="animate-spin" />} Salvar funcionário
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-base">{label}</Label>
      {children}
    </div>
  );
}

function PrintList({ employees, onBack }: { employees: Employee[]; onBack: () => void }) {
  const [company, setCompany] = useState<Company>(EMPTY_COMPANY);
  const [client, setClient] = useState("");
  const [site, setSite] = useState("");
  const [period, setPeriod] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    loadCompany().then(setCompany);
  }, []);

  async function pdf() {
    if (!ref.current) return;
    setBusy(true);
    try {
      await downloadPdf(ref.current, `lista-funcionarios${client ? "-" + client.replace(/\W+/g, "-") : ""}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="print:hidden space-y-5">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft /> Voltar
        </Button>
        <h1 className="text-2xl font-bold">Lista para entrada na obra</h1>
        <div className="space-y-4 rounded-2xl bg-card p-5 shadow-card">
          <Field label="Para qual empresa / cliente? (opcional)">
            <Input value={client} onChange={(x) => setClient(x.target.value)} />
          </Field>
          <Field label="Endereço da obra (opcional)">
            <Input value={site} onChange={(x) => setSite(x.target.value)} />
          </Field>
          <Field label="Período (opcional)">
            <Input value={period} onChange={(x) => setPeriod(x.target.value)} placeholder="Ex.: 06/10 a 10/10/2026" />
          </Field>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" onClick={pdf} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <FileDown />} Baixar PDF
          </Button>
          <Button size="lg" variant="outline" onClick={() => window.print()}>
            <Printer /> Imprimir
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div id="print-area" ref={ref} className="mx-auto w-[794px] bg-card p-12 text-foreground shadow-card print:shadow-none">
          <div className="flex items-center gap-4 border-b-4 border-primary pb-4">
            {company.logo_url && <img src={company.logo_url} alt="" className="h-16 w-auto" />}
            <div>
              <div className="text-xl font-bold">{company.name || "Minha Empresa"}</div>
              <div className="text-sm text-muted-foreground">
                {[company.document && `CNPJ/CPF ${company.document}`, company.phone].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>
          <h2 className="mt-6 text-center text-lg font-bold uppercase">Relação de funcionários — autorização de entrada</h2>
          <div className="mt-4 space-y-1 text-sm">
            {client && <div><b>Para:</b> {client}</div>}
            {site && <div><b>Obra:</b> {site}</div>}
            {period && <div><b>Período:</b> {period}</div>}
            <div><b>Data:</b> {new Date().toLocaleDateString("pt-BR")}</div>
          </div>
          <table className="mt-5 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                {["#", "Nome", "CPF", "RG", "Função", "Nascimento"].map((h) => (
                  <th key={h} className="border border-border px-2 py-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((e, i) => (
                <tr key={e.id}>
                  <td className="border border-border px-2 py-2">{i + 1}</td>
                  <td className="border border-border px-2 py-2 font-medium">{e.name}</td>
                  <td className="border border-border px-2 py-2">{e.cpf || "—"}</td>
                  <td className="border border-border px-2 py-2">{e.rg || "—"}</td>
                  <td className="border border-border px-2 py-2">{e.role || "—"}</td>
                  <td className="border border-border px-2 py-2">{e.birth_date || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-16 text-center text-sm">
            <div className="mx-auto w-72 border-t border-foreground pt-1">{company.name || "Responsável"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
