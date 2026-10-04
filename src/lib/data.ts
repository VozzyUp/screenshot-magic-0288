import { supabase } from "@/integrations/supabase/client";
import { EMPTY_COMPANY, newQuoteData, type Company, type QuoteData } from "./quote";

export async function loadCompany(): Promise<Company> {
  const { data } = await supabase.from("companies").select("*").maybeSingle();
  if (!data) return { ...EMPTY_COMPANY };
  return {
    name: data.name,
    document: data.document,
    phone: data.phone,
    email: data.email,
    address: data.address,
    pix: data.pix,
    website: data.website,
    default_notes: data.default_notes,
    logo_url: data.logo_url,
  };
}

export async function saveCompany(c: Company) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sem sessão");
  const { error } = await supabase
    .from("companies")
    .upsert({ ...c, user_id: u.user.id, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function createQuote(fromData?: QuoteData): Promise<string> {
  const { data: num, error: e1 } = await supabase.rpc("next_quote_number");
  if (e1) throw e1;
  const company = await loadCompany();
  const data = fromData ?? newQuoteData(company.default_notes);
  const { data: row, error } = await supabase
    .from("quotes")
    .insert({ number: num as string, client_name: data.client.name, data: data as never })
    .select("id")
    .single();
  if (error) throw error;
  return row.id;
}

export async function monthStats(): Promise<{ count: number; total: number }> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data, error } = await supabase
    .from("quotes")
    .select("total")
    .gte("created_at", start);
  if (error) throw error;
  const rows = data ?? [];
  return {
    count: rows.length,
    total: rows.reduce((s, r) => s + (Number(r.total) || 0), 0),
  };
}
