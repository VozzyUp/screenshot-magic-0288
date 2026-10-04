import { forwardRef } from "react";
import {
  addDays,
  computeTotals,
  formatDateBR,
  formatQty,
  itemTotal,
  money,
  serviceMeta,
  serviceSubtotal,
  type Company,
  type QuoteData,
} from "@/lib/quote";

export const QuoteDocument = forwardRef<HTMLDivElement, { company: Company; data: QuoteData; number: string }>(
  function QuoteDocument({ company, data, number }, ref) {
    const t = computeTotals(data);
    const mode = data.displayMode;
    const services = data.services.filter((s) => s.items.length || s.manualSubtotal !== null);
    const contact = [company.phone, company.email, company.website].filter(Boolean).join("  ·  ");

    return (
      <div ref={ref} id="print-area" className="a4 mx-auto flex flex-col px-14 py-12 text-[13px] leading-snug shadow-card">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 border-b-4 border-primary pb-5">
          <div className="flex items-center gap-4">
            {company.logo_url && <img src={company.logo_url} alt="" className="max-h-20 max-w-36 object-contain" />}
            <div>
              <div className="text-xl font-extrabold">{company.name || "Sua empresa"}</div>
              {company.document && <div className="text-muted-foreground">CNPJ/CPF: {company.document}</div>}
              {contact && <div className="text-muted-foreground">{contact}</div>}
              {company.address && <div className="text-muted-foreground">{company.address}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold tracking-widest text-primary">ORÇAMENTO</div>
            <div className="text-2xl font-extrabold">Nº {number}</div>
            <div className="text-muted-foreground">Emissão: {formatDateBR(data.issueDate)}</div>
            <div className="text-muted-foreground">Válido até: {formatDateBR(addDays(data.issueDate, data.validityDays))}</div>
          </div>
        </div>

        {/* Client */}
        <div className="mt-5 rounded-lg bg-muted px-5 py-3">
          <div className="text-xs font-bold tracking-wider text-muted-foreground">CLIENTE</div>
          <div className="text-base font-bold">{data.client.name || "—"}</div>
          <div className="text-muted-foreground">
            {[data.client.phone, data.client.email].filter(Boolean).join("  ·  ")}
          </div>
          {data.client.address && <div className="text-muted-foreground">Local da obra: {data.client.address}</div>}
        </div>

        {/* Services */}
        <div className="mt-5 space-y-4">
          {services.map((s) => {
            const meta = serviceMeta(s);
            const sub = serviceSubtotal(s);
            return (
              <div key={s.id} className="break-inside-avoid">
                <div className="flex items-center justify-between rounded-t-md bg-primary px-4 py-2 text-primary-foreground">
                  <span className="font-bold uppercase tracking-wide">{meta.label}</span>
                  {mode !== "total" && sub !== null && <span className="font-bold tabular-nums">{money(sub)}</span>}
                </div>
                {s.items.length > 0 && (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="w-16 py-1.5 pl-3 font-semibold">Qtd.</th>
                        <th className="w-14 py-1.5 font-semibold">Un.</th>
                        <th className="py-1.5 font-semibold">Descrição</th>
                        {mode === "items" && <th className="w-24 py-1.5 text-right font-semibold">Unitário</th>}
                        {mode === "items" && <th className="w-24 py-1.5 pr-3 text-right font-semibold">Total</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {s.items.map((it) => (
                        <tr key={it.id} className="border-b align-top">
                          <td className="py-1.5 pl-3 tabular-nums">{formatQty(it.qty)}</td>
                          <td className="py-1.5">{it.unit}</td>
                          <td className="whitespace-pre-wrap py-1.5 pr-2">{it.desc}</td>
                          {mode === "items" && <td className="py-1.5 text-right tabular-nums">{money(it.unitPrice)}</td>}
                          {mode === "items" && <td className="py-1.5 pr-3 text-right tabular-nums">{money(itemTotal(it))}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="mt-5 ml-auto w-72 break-inside-avoid space-y-1">
          {t.discount > 0 && (
            <>
              <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{money(t.gross)}</span></div>
              <div className="flex justify-between text-destructive"><span>Desconto</span><span className="tabular-nums">− {money(t.discount)}</span></div>
            </>
          )}
          <div className="flex items-center justify-between rounded-lg bg-primary px-4 py-3 text-primary-foreground">
            <span className="font-bold">TOTAL</span>
            <span className="text-2xl font-extrabold tabular-nums">{money(t.final)}</span>
          </div>
        </div>

        {/* Conditions */}
        <div className="mt-6 grid break-inside-avoid gap-3">
          {data.payment && <Info label="Forma de pagamento" value={data.payment} />}
          {data.deadline && <Info label="Prazo de execução" value={data.deadline} />}
          {company.pix && <Info label="Chave PIX" value={company.pix} />}
          {data.notes && <Info label="Observações" value={data.notes} />}
        </div>

        {/* Signature */}
        <div className="mt-auto grid grid-cols-2 gap-12 pt-16 break-inside-avoid">
          <Sig label={company.name || "Empresa"} />
          <Sig label={`De acordo: ${data.client.name || "Cliente"}`} />
        </div>
      </div>
    );
  },
);

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold tracking-wider text-primary uppercase">{label}</div>
      <div className="whitespace-pre-wrap">{value}</div>
    </div>
  );
}

function Sig({ label }: { label: string }) {
  return (
    <div className="text-center">
      <div className="border-t border-foreground/50 pt-1.5 text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">Data: ____/____/______</div>
    </div>
  );
}
