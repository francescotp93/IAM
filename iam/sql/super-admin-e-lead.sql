-- ═══════════════════════════════════════════════════════════════════════════════
--  1) SUPER ADMIN vede i movimenti (trattative) di TUTTI gli utenti
--  2) I LEAD inbound (landing / WhatsApp / shop con privacy) sono visibili al
--     Super Admin e all'agente a cui vengono assegnati
--
--  Eseguire nel SQL Editor di Supabase. Sicuro e reversibile (cambia solo le RLS).
--  Il Super Admin è identificato dall'email del JWT.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── iam_trattative: il Super Admin legge/modifica TUTTE le trattative ───────────
-- (le policy esistenti "proprie + condivise" restano valide per gli altri utenti)
drop policy if exists "trattative_superadmin_all" on public.iam_trattative;
create policy "trattative_superadmin_all" on public.iam_trattative
  for all to authenticated
  using ( (auth.jwt() ->> 'email') = 'francesco.oddo199307@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'francesco.oddo199307@gmail.com' );

-- ── iam_lead: visibilità corretta dei lead ─────────────────────────────────────
alter table public.iam_lead enable row level security;

-- pulizia di eventuali policy precedenti su iam_lead
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname='public' and tablename='iam_lead'
  loop execute format('drop policy if exists %I on public.iam_lead', p.policyname); end loop;
end $$;

-- SELECT: vedo il lead se è mio, se mi è assegnato (agente_id), oppure se sono il Super Admin
create policy "lead_select" on public.iam_lead
  for select to authenticated
  using (
    utente_id = auth.uid()
    or agente_id = auth.uid()
    or (auth.jwt() ->> 'email') = 'francesco.oddo199307@gmail.com'
  );

-- INSERT: ogni utente autenticato può creare lead dall'app
create policy "lead_insert" on public.iam_lead
  for insert to authenticated with check (true);

-- UPDATE/DELETE: il proprietario, l'agente assegnato o il Super Admin
create policy "lead_update" on public.iam_lead
  for update to authenticated
  using (
    utente_id = auth.uid() or agente_id = auth.uid()
    or (auth.jwt() ->> 'email') = 'francesco.oddo199307@gmail.com'
  )
  with check (true);

create policy "lead_delete" on public.iam_lead
  for delete to authenticated
  using (
    utente_id = auth.uid() or agente_id = auth.uid()
    or (auth.jwt() ->> 'email') = 'francesco.oddo199307@gmail.com'
  );

-- Nota: i lead creati dal sito/WhatsApp arrivano con utente_id NULL (inbound non
-- ancora assegnato): li vede il Super Admin, che può assegnarli a un agente.
