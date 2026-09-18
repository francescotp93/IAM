-- ═══════════════════════════════════════════════════════════════════════════════
--  LAVORO 3 — LE REGOLE DOCUMENTALI PER COMPAGNIA (18/09/2026)
--
--  Ogni compagnia chiede documenti diversi, e li cambia nel tempo: Prima
--  Assicurazioni vuole la patente, un'altra no, e fra sei mesi la lista sarà
--  un'altra ancora. Finora quelle regole stavano nella testa di chi lavora la
--  pratica — cioè da nessuna parte, e ogni volta si scopriva che mancava un
--  documento quando la compagnia lo chiedeva.
--
--  Due tabelle, tutte e due modificabili da schermata: quando una compagnia
--  cambia i requisiti si cambia la regola, non il codice.
--    quote_compagnie          l'anagrafica delle compagnie (prima non c'era:
--                             i nomi vivevano dentro un array del catalogo
--                             prodotti e come testo libero sulle polizze)
--    quote_regole_documenti   compagnia → tipo documento → obbligatorio/no
--
--  E UNA COSA CHE NON STA QUI. I requisiti risolti per una pratica si
--  CONGELANO sulla pratica stessa (quote_polizze.dati.fascicolo.requisiti),
--  non si rileggono da queste tabelle ogni volta. Se si rileggessero, il
--  giorno in cui una compagnia aggiunge un documento tutte le pratiche già
--  chiuse diventerebbero incomplete, e l'elenco dei fascicoli da completare
--  smetterebbe di voler dire qualcosa. Il congelamento non ha bisogno di
--  colonne nuove: `dati` è già un jsonb su quote_polizze.
--
--  SOLO AGGIUNTE. Non tocca, non altera e non svuota nulla di esistente.
--  Per tornare indietro basta il blocco in fondo.
--
--  RLS: si riusano le funzioni già in uso nelle altre tabelle quote_* —
--  iam_is_staff() per scrivere, iam_is_admin() per cancellare. In lettura
--  sono aperte a chi è collegato: un collaboratore che apre un fascicolo deve
--  sapere che cosa chiede la compagnia, altrimenti il fascicolo non si può
--  compilare. Non contengono dati di clienti.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. ANAGRAFICA COMPAGNIE ──────────────────────────────────────────────────
create table if not exists public.quote_compagnie (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  -- I nomi con cui la stessa compagnia compare altrove: sulle polizze è testo
  -- libero («HDI Assicurazioni») e nel catalogo prodotti è una sigla («HDI»).
  -- Senza gli alias una polizza non ritroverebbe le regole della sua
  -- compagnia, e il fascicolo direbbe «nessuna regola» con la faccia seria.
  alias      text[] not null default '{}',
  attiva     boolean not null default true,
  ordine     int not null default 100,
  note       text,
  -- nullable: le righe seminate qui sotto nascono da una migrazione, dove
  -- auth.uid() è NULL. Un NOT NULL le farebbe fallire tutte.
  creato_da  uuid default auth.uid(),
  creato_il  timestamptz not null default now()
);

comment on table public.quote_compagnie is
  'Anagrafica delle compagnie. Prima del 18/09/2026 i nomi vivevano solo dentro quote_prodotti_catalogo.compagnie e come testo libero su quote_polizze.compagnia.';
comment on column public.quote_compagnie.alias is
  'Gli altri nomi della stessa compagnia: servono a ritrovare le regole partendo dal testo libero scritto sulla polizza.';

-- ── 2. REGOLE DOCUMENTALI ────────────────────────────────────────────────────
-- `documento` è una chiave del catalogo di tariffe/motore/fascicolo.js
-- (patente, libretto_veicolo, privacy…). Qui NON si mette un vincolo di
-- valore: il catalogo vive nel motore e cambierà prima di questa tabella; una
-- chiave che il motore non conosce viene ignorata e DICHIARATA nel fascicolo,
-- invece di sparire in silenzio (prova: server/verifica/fascicolo.test.mjs).
create table if not exists public.quote_regole_documenti (
  id           uuid primary key default gen_random_uuid(),
  compagnia_id uuid not null references public.quote_compagnie(id) on delete cascade,
  documento    text not null,
  obbligatorio boolean not null default true,
  -- '*' = vale per tutti i rami. Non NULL: in Postgres due NULL non sono
  -- uguali, quindi un vincolo unico su una colonna che può essere NULL
  -- lascerebbe entrare la stessa regola due volte.
  ramo         text not null default '*',
  note         text,
  attiva       boolean not null default true,
  creato_da    uuid default auth.uid(),
  creato_il    timestamptz not null default now(),
  unique (compagnia_id, documento, ramo)
);

comment on table public.quote_regole_documenti is
  'I documenti che una compagnia richiede. Si sommano a quelli del tipo di operazione, non li sostituiscono.';

create index if not exists quote_regole_doc_compagnia_idx
  on public.quote_regole_documenti(compagnia_id) where attiva;

-- ── 3. RLS ───────────────────────────────────────────────────────────────────
alter table public.quote_compagnie          enable row level security;
alter table public.quote_regole_documenti   enable row level security;

drop policy if exists comp_select on public.quote_compagnie;
drop policy if exists comp_insert on public.quote_compagnie;
drop policy if exists comp_update on public.quote_compagnie;
drop policy if exists comp_delete on public.quote_compagnie;
create policy comp_select on public.quote_compagnie for select to authenticated using (true);
create policy comp_insert on public.quote_compagnie for insert to authenticated with check (iam_is_staff());
create policy comp_update on public.quote_compagnie for update to authenticated using (iam_is_staff()) with check (iam_is_staff());
create policy comp_delete on public.quote_compagnie for delete to authenticated using (iam_is_admin());

drop policy if exists regdoc_select on public.quote_regole_documenti;
drop policy if exists regdoc_insert on public.quote_regole_documenti;
drop policy if exists regdoc_update on public.quote_regole_documenti;
drop policy if exists regdoc_delete on public.quote_regole_documenti;
create policy regdoc_select on public.quote_regole_documenti for select to authenticated using (true);
create policy regdoc_insert on public.quote_regole_documenti for insert to authenticated with check (iam_is_staff());
create policy regdoc_update on public.quote_regole_documenti for update to authenticated using (iam_is_staff()) with check (iam_is_staff());
create policy regdoc_delete on public.quote_regole_documenti for delete to authenticated using (iam_is_admin());

-- ── 4. LE COMPAGNIE CHE GIÀ CI SONO ──────────────────────────────────────────
-- Si semina da quello che il catalogo prodotti già conosce: inventare un
-- elenco nuovo vorrebbe dire avere due elenchi che si allontanano.
insert into public.quote_compagnie (nome, ordine)
select distinct c, 100 from public.quote_prodotti_catalogo t, unnest(t.compagnie) c
where c is not null and btrim(c) <> ''
on conflict (nome) do nothing;

-- Gli alias noti al 18/09/2026: sulle polizze «HDI» è scritto «HDI
-- Assicurazioni». Gli altri si aggiungono da schermata quando si incontrano.
update public.quote_compagnie
   set alias = array['HDI Assicurazioni', 'HD']
 where nome = 'HDI' and alias = '{}';

-- Nel catalogo la compagnia si chiama «Prima»; sulle polizze e nel parlato è
-- «Prima Assicurazioni». Una riga sola con l'alias, non due righe: due righe
-- vorrebbero dire due elenchi di regole per la stessa compagnia, e metà delle
-- pratiche ne troverebbe uno e metà l'altro.
update public.quote_compagnie
   set alias = array['Prima Assicurazioni', 'Prima.it']
 where nome = 'Prima' and alias = '{}';

-- ── 5. LA PRIMA REGOLA VERA ──────────────────────────────────────────────────
-- Prima Assicurazioni chiede la patente. È un requisito reale, comunicato da
-- Francesco il 18/09/2026: non è un esempio inventato per riempire la tabella.
-- Da qui in avanti le regole si aggiungono dalla schermata, non da SQL.
insert into public.quote_regole_documenti (compagnia_id, documento, obbligatorio, ramo, note)
select c.id, 'patente', true, 'rcauto', 'Requisito comunicato dalla compagnia (18/09/2026).'
from public.quote_compagnie c
where c.nome in ('Prima', 'Prima Assicurazioni')
on conflict (compagnia_id, documento, ramo) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════════
--  PER TORNARE INDIETRO (nulla di esistente è stato toccato, quindi basta questo)
--
--  drop table if exists public.quote_regole_documenti;
--  drop table if exists public.quote_compagnie;
--
--  I requisiti già congelati dentro quote_polizze.dati->'fascicolo' restano, e
--  le pratiche continuano a funzionare: è il punto del congelamento.
-- ═══════════════════════════════════════════════════════════════════════════════
