import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Download, Printer, MessageCircle, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { QuoteDocument } from "@/components/QuoteDocument";
import { supabase } from "@/integrations/supabase/client";
import { loadCompany } from "@/lib/data";
import { downloadPdf } from "@/lib/pdf";
import { computeTotals, money, onlyDigits, type Company, type QuoteData } from "@/lib/quote";

export const Route = createFileRoute("/ver/$id")({
  head: () => ({
    meta: [
      { title: "Ver orçamento — Orçamentos" },
      { name: "description", content: "Veja o orçamento como o cliente vai receber e baixe em PDF." },
      { property: "og:title", content: "Ver orçamento" },
      { property: "og:description", content: "Pré-visualização, PDF, impressão e envio pelo WhatsApp." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerPage,
});

function VerPage() {
  const { id } = Route.useParams();
  return (
    <AppShell title="Ver orçamento">
      <Preview id={id} />
    </AppShell>
  );
}

function Preview({ id }: { id: string }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [q, setQ] = useState<{ number: string; data: QuoteData; status: string } | null>(null);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const [docH, setDocH] = useState(1123);

  useEffect(() => {
    loadCompany().then(setCompany);
    supabase
      .from("quotes")
      .select("number,data,status")
      .eq("id", id)
      .single()
      .then(({ data }) => data && setQ({ number: data.number, data: data.data as unknown as QuoteData, status: data.status }));
  }, [id]);

  useLayoutEffect(() => {
    const fit = () => {
      if (boxRef.current) setScale(Math.min(1, boxRef.current.clientWidth / 794));
      if (docRef.current) setDocH(docRef.current.offsetHeight);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [q, company]);

  if (!company || !q) return <Loader2 className="mx-auto size-8 animate-spin text-primary" />;

  const fileName = `Orcamento-${q.number.replace("/", "-")}-${q.data.client.name || "cliente"}.pdf`;

  async function pdf() {
    if (!docRef.current) return;
    setBusy(true);
    try {
      await downloadPdf(docRef.current, fileName);
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    }
    setBusy(false);
  }

  function whats() {
    const phone = onlyDigits(q!.data.client.phone);
    const total = computeTotals(q!.data).final;
    const msg = `Olá${q!.data.client.name ? ", " + q!.data.client.name.split(" ")[0] : ""}! Segue o orçamento Nº ${q!.number} da ${company!.name || "nossa empresa"}, no valor de ${money(total)}. O PDF vai em anexo. Qualquer dúvida estou à disposição!`;
    const num = phone ? (phone.startsWith("55") && phone.length > 11 ? phone : "55" + phone) : "";
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
    if (q!.status === "rascunho") supabase.from("quotes").update({ status: "enviado" }).eq("id", id).then(() => {});
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 print:hidden">
        <Button onClick={pdf} disabled={busy} className="col-span-2 sm:col-span-1">
          {busy ? <Loader2 className="animate-spin" /> : <Download />} Baixar PDF
        </Button>
        <Button variant="whatsapp" onClick={whats} className="col-span-2 sm:col-span-1"><MessageCircle /> WhatsApp</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer /> Imprimir</Button>
        <Button asChild variant="outline"><Link to="/editar/$id" params={{ id }}><Pencil /> Editar</Link></Button>
      </div>
      <p className="text-sm text-muted-foreground print:hidden">
        Dica: baixe o PDF primeiro e depois anexe na conversa do WhatsApp.
      </p>
      <div ref={boxRef} className="w-full overflow-hidden" style={{ height: docH * scale }}>
        <div data-scale-wrap style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 794 }}>
          <QuoteDocument ref={docRef} company={company} data={q.data} number={q.number} />
        </div>
      </div>
    </div>
  );
}
