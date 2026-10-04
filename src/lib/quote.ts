import { Paintbrush, Zap, Layers, Umbrella, Snowflake, Droplet, Hammer, type LucideIcon } from "lucide-react";

export type DisplayMode = "items" | "services" | "total";
export type QuoteStatus = "rascunho" | "enviado" | "aprovado" | "recusado";

export interface QuoteItem {
  id: string;
  qty: string; // "12,5"
  unit: string;
  desc: string;
  unitPrice: number | null;
}

export interface QuoteService {
  id: string;
  type: string; // key from SERVICE_TYPES or "outro"
  customName: string;
  items: QuoteItem[];
  manualSubtotal: number | null;
}

export interface QuoteData {
  client: { name: string; phone: string; address: string; email: string };
  issueDate: string; // yyyy-mm-dd
  validityDays: number;
  services: QuoteService[];
  displayMode: DisplayMode;
  manualTotal: number | null;
  discountType: "value" | "percent";
  discountValue: number | null;
  payment: string;
  deadline: string;
  notes: string;
}

export interface Company {
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  pix: string;
  website: string;
  default_notes: string;
  logo_url: string | null;
}

export const EMPTY_COMPANY: Company = {
  name: "",
  document: "",
  phone: "",
  email: "",
  address: "",
  pix: "",
  website: "",
  default_notes: "",
  logo_url: null,
};

export const SERVICE_TYPES: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "pintura", label: "Pintura", icon: Paintbrush },
  { key: "eletrica", label: "Elétrica", icon: Zap },
  { key: "gesso", label: "Gesso", icon: Layers },
  { key: "impermeabilizacao", label: "Impermeabilização", icon: Umbrella },
  { key: "ar", label: "Ar-condicionado", icon: Snowflake },
  { key: "hidraulica", label: "Hidráulica", icon: Droplet },
  { key: "outro", label: "Outro", icon: Hammer },
];

export const UNITS = ["un", "m²", "m", "m³", "ponto", "vb", "diária", "hora", "kg", "L"];

export const STATUS: { key: QuoteStatus; label: string }[] = [
  { key: "rascunho", label: "Rascunho" },
  { key: "enviado", label: "Enviado" },
  { key: "aprovado", label: "Aprovado" },
  { key: "recusado", label: "Recusado" },
];

export const PAYMENT_SUGGESTIONS = [
  "50% na entrada e 50% na entrega",
  "À vista no PIX",
  "Parcelado em 3 vezes",
];

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function newQuoteData(defaultNotes: string): QuoteData {
  return {
    client: { name: "", phone: "", address: "", email: "" },
    issueDate: todayISO(),
    validityDays: 15,
    services: [],
    displayMode: "items",
    manualTotal: null,
    discountType: "value",
    discountValue: null,
    payment: "",
    deadline: "",
    notes: defaultNotes,
  };
}

export function serviceMeta(s: Pick<QuoteService, "type" | "customName">) {
  const t = SERVICE_TYPES.find((x) => x.key === s.type) ?? SERVICE_TYPES[SERVICE_TYPES.length - 1];
  return { label: s.type === "outro" ? s.customName || "Outro serviço" : t.label, icon: t.icon };
}

export function parseQty(q: string): number {
  const n = parseFloat((q || "").replace(/\./g, "").replace(",", "."));
  return isFinite(n) ? n : 0;
}

export function formatQty(q: string) {
  return (q || "").trim() || "—";
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function money(v: number | null | undefined) {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return brl.format(v);
}

export function itemTotal(it: QuoteItem): number | null {
  if (it.unitPrice === null) return null;
  return Math.round(parseQty(it.qty) * it.unitPrice * 100) / 100;
}

export function serviceSubtotal(s: QuoteService): number | null {
  if (s.manualSubtotal !== null) return s.manualSubtotal;
  const vals = s.items.map(itemTotal).filter((v): v is number => v !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
}

export function computeTotals(d: QuoteData) {
  const subs = d.services.map(serviceSubtotal);
  const sum = subs.filter((v): v is number => v !== null).reduce((a, b) => a + b, 0);
  const gross = d.manualTotal !== null ? d.manualTotal : sum;
  let discount = 0;
  if (d.discountValue) {
    discount = d.discountType === "percent" ? (gross * d.discountValue) / 100 : d.discountValue;
  }
  discount = Math.min(Math.max(discount, 0), gross);
  return { gross, discount, final: Math.round((gross - discount) * 100) / 100, hasValue: gross > 0 };
}

export function formatDateBR(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function addDays(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + (days || 0));
  return d.toISOString().slice(0, 10);
}

export function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}
