CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL DEFAULT '',
  cpf text NOT NULL DEFAULT '',
  rg text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  birth_date text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own employees" ON public.employees FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());