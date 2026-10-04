<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Quote app rules
- Quote content is stored as one jsonb `data` column on `quotes` (types in src/lib/quote.ts); denormalized `client_name`/`total` exist only for listing. Why: flexible nested services/items with simple autosave.
- Quote numbers come from the `next_quote_number()` RPC (per user, per year). Why: atomic sequential numbering.
- Company logo is stored as a resized data URL in `companies.logo_url`. Why: avoids storage bucket policy and canvas CORS issues in PDF export.
- PDFs are rendered client-side from the QuoteDocument component via html2canvas-pro + jsPDF. Why: preview and PDF are identical.
- Pages gate auth client-side through AppShell. Why: single-owner app, all data access goes through RLS.
- App chrome is a left sidebar (desktop) + bottom nav (mobile) in AppShell; home (/) is a summary dashboard with month stats. Why: user chose this navigation layout over the previous simple header.
