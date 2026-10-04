import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Upload, Loader2, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmButton } from "@/components/ConfirmButton";
import { loadCompany, saveCompany } from "@/lib/data";
import { EMPTY_COMPANY, type Company } from "@/lib/quote";

export const Route = createFileRoute("/empresa")({
  head: () => ({
    meta: [
      { title: "Minha Empresa — Orçamentos" },
      { name: "description", content: "Logo, contatos e PIX que aparecem em todos os orçamentos." },
      { property: "og:title", content: "Minha Empresa — Orçamentos" },
      { property: "og:description", content: "Configure os dados da sua empresa uma única vez." },
    ],
  }),
  component: EmpresaPage,
});

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 500;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function EmpresaPage() {
  return (
    <AppShell title="Minha Empresa" back>
      <CompanyForm />
    </AppShell>
  );
}

function CompanyForm() {
  const [c, setC] = useState<Company>(EMPTY_COMPANY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCompany().then((x) => {
      setC(x);
      setLoaded(true);
    });
  }, []);

  const set = (k: keyof Company) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setC({ ...c, [k]: e.target.value });

  async function save() {
    if (!c.name.trim()) {
      toast.error("Preencha o nome da empresa.");
      return;
    }
    setSaving(true);
    try {
      await saveCompany(c);
      toast.success("Dados da empresa salvos!");
    } catch {
      toast.error("Não foi possível salvar. Tente de novo.");
    }
    setSaving(false);
  }

  if (!loaded) return <Loader2 className="mx-auto size-8 animate-spin text-primary" />;

  const field = (k: keyof Company, label: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="space-y-2">
      <Label htmlFor={k} className="text-base">{label}</Label>
      <Input id={k} value={(c[k] as string) ?? ""} onChange={set(k)} {...props} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Minha Empresa</h1>
        <p className="text-muted-foreground">Preencha uma vez. Esses dados aparecem em todo orçamento.</p>
      </div>

      <section className="space-y-4 rounded-2xl bg-card p-5 shadow-card">
        <Label className="text-base">Logo</Label>
        <div className="flex items-center gap-4">
          <div className="flex size-24 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted">
            {c.logo_url ? <img src={c.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" /> : <span className="text-sm text-muted-foreground">Sem logo</span>}
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload /> {c.logo_url ? "Trocar logo" : "Enviar logo"}
            </Button>
            {c.logo_url && (
              <ConfirmButton title="Remover a logo?" confirmLabel="Sim, remover" onConfirm={() => setC({ ...c, logo_url: null })}>
                <Button variant="danger" size="sm"><Trash2 /> Remover</Button>
              </ConfirmButton>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                setC({ ...c, logo_url: await resizeImage(f) });
              } catch {
                toast.error("Não consegui ler essa imagem.");
              }
              e.target.value = "";
            }}
          />
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl bg-card p-5 shadow-card sm:grid-cols-2">
        <div className="sm:col-span-2">{field("name", "Nome da empresa / razão social *")}</div>
        {field("document", "CNPJ ou CPF", { inputMode: "numeric" })}
        {field("phone", "Telefone / WhatsApp", { inputMode: "tel" })}
        {field("email", "E-mail", { type: "email" })}
        {field("pix", "Chave PIX")}
        <div className="sm:col-span-2">{field("address", "Endereço")}</div>
        <div className="sm:col-span-2">{field("website", "Instagram ou site (opcional)")}</div>
      </section>

      <section className="space-y-2 rounded-2xl bg-card p-5 shadow-card">
        <Label htmlFor="notes" className="text-base">Condições / observações padrão</Label>
        <p className="text-sm text-muted-foreground">Esse texto já vem preenchido em todo orçamento novo.</p>
        <Textarea id="notes" rows={5} className="text-base" value={c.default_notes} onChange={set("default_notes")} placeholder="Ex.: Materiais por conta do cliente. Garantia de 90 dias." />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-4xl">
          <Button size="lg" className="w-full" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />} Salvar dados da empresa
          </Button>
        </div>
      </div>
    </div>
  );
}
