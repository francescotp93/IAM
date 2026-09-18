-- ═══════════════════════════════════════════════════════════════════════════════
--  IL FASCICOLO PRIMA DELLA POLIZZA (18/09/2026)
--
--  Finora il fascicolo si apriva SOLO da una polizza: `quote_polizze.dati`
--  teneva i requisiti congelati e i documenti stavano su
--  quote_pratica_documenti con entita='polizza'. Ma nel lavoro vero i
--  documenti si raccolgono PRIMA: il cliente porta libretto e stato di
--  famiglia mentre la polizza non esiste ancora — non è emessa, spesso non è
--  nemmeno decisa la compagnia. Chi lavorava quei documenti li teneva sul
--  proprio computer finché la polizza non entrava in portafoglio: è
--  esattamente l'archivio sparso da cui si viene.
--
--  LA STRADA CHE NON SI È PRESA, e perché. Si poteva creare una riga finta in
--  `quote_polizze` e nasconderla. No: `quote_polizze` è il portafoglio, e da
--  lì leggono scadenzario, titoli, produzione, estratto conto e il conteggio
--  delle polizze emesse. Una polizza che non esiste, scritta lì dentro,
--  diventa un numero falso in un cruscotto — e prima o poi quel numero lo
--  legge qualcuno. Una pratica in lavorazione NON è una polizza: è un'altra
--  cosa, e ha la sua tabella.
--
--  IL COLLEGAMENTO. Quando la polizza arriva davvero, la pratica le si
--  attacca: i documenti passano da entita='pratica' a entita='polizza' e i
--  requisiti congelati si copiano su `quote_polizze.dati.fascicolo` COSÌ COME
--  SONO — con la data del giorno in cui furono congelati, non con quella del
--  collegamento. È il punto del congelamento (§3.7): i requisiti sono quelli
--  che valevano quando la pratica è nata. Niente si ricarica.
--
--  SOLO AGGIUNTE, con una sola eccezione dichiarata: il vincolo di valore su
--  quote_pratica_documenti.entita si allarga per accettare 'pratica'. Non
--  toglie niente: i quattro valori di prima restano validi.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. LE PRATICHE IN LAVORAZIONE ────────────────────────────────────────────
-- I nomi delle colonne sono gli stessi di quote_polizze DOVE IL MOTORE LI
-- LEGGE (modulo, prodotto, compagnia, cliente, cliente_id, dati): così
-- tariffe/motore/fascicolo.js lavora su una pratica senza sapere che non è
-- una polizza, e non esistono due versioni della stessa regola.
create table if not exists public.quote_pratiche (
  id            uuid primary key default gen_random_uuid(),

  -- Il cliente viene dall'anagrafica, come per tutto il resto (CLAUDE.md §7):
  -- una pratica senza cliente è un nominativo volante, e i documenti
  -- d'identità si ereditano dalla scheda del cliente.
  cliente_id    uuid not null references public.quote_anagrafiche(id) on delete restrict,
  cliente       text,          -- istantanea del nominativo, come su quote_polizze

  -- che pratica è: `modulo` è quello che il motore legge per capire il ramo
  modulo        text,
  prodotto      text,
  compagnia     text,
  -- a che cosa si riferisce (targa, veicolo, «seconda auto»): serve a
  -- distinguere due pratiche aperte per lo stesso cliente
  descrizione   text,
  -- decorrenza PREVISTA. Non si chiama data_effetto apposta: una pratica non
  -- ha effetto, e chiamarla così vorrebbe dire scrivere una data di
  -- decorrenza su un contratto che non c'è. NULL = da confermare.
  data_prevista date,

  stato         text not null default 'aperta'
                check (stato in ('aperta', 'collegata', 'abbandonata')),
  -- valorizzata quando la polizza arriva e la pratica le si attacca
  polizza_id    uuid references public.quote_polizze(id) on delete set null,

  -- dentro `dati.fascicolo` stanno i requisiti congelati, con la stessa forma
  -- che hanno su quote_polizze.dati.fascicolo
  dati          jsonb not null default '{}'::jsonb,

  note          text,
  creato_da     uuid not null default auth.uid(),
  creato_nome   text,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

comment on table public.quote_pratiche is
  'Pratiche in lavorazione: il fascicolo documentale prima che la polizza esista. NON sono polizze e non entrano in portafoglio, scadenzario, titoli o produzione.';
comment on column public.quote_pratiche.data_prevista is
  'Decorrenza prevista. NULL = da confermare: non si inventa (regola di casa §8.1).';
comment on column public.quote_pratiche.polizza_id is
  'La polizza a cui la pratica è stata collegata. Da quel momento i documenti stanno sulla polizza.';

create index if not exists quote_pratiche_cliente_idx   on public.quote_pratiche(cliente_id);
create index if not exists quote_pratiche_creato_da_idx on public.quote_pratiche(creato_da);
create index if not exists quote_pratiche_aperte_idx    on public.quote_pratiche(stato) where stato = 'aperta';

drop trigger if exists quote_pratiche_tocca on public.quote_pratiche;
create trigger quote_pratiche_tocca before update on public.quote_pratiche
  for each row execute function public.quote_tocca_aggiornato_il();

-- ── 2. RLS — le stesse politiche di quote_polizze ────────────────────────────
alter table public.quote_pratiche enable row level security;

drop policy if exists prat_select on public.quote_pratiche;
drop policy if exists prat_insert on public.quote_pratiche;
drop policy if exists prat_update on public.quote_pratiche;
drop policy if exists prat_delete on public.quote_pratiche;
create policy prat_select on public.quote_pratiche for select using (quote_vede(creato_da));
create policy prat_insert on public.quote_pratiche for insert with check ((creato_da = auth.uid()) or iam_is_staff());
create policy prat_update on public.quote_pratiche for update using (quote_vede(creato_da)) with check (quote_vede(creato_da));
create policy prat_delete on public.quote_pratiche for delete using (iam_is_admin());

-- ── 3. I DOCUMENTI DI UNA PRATICA ────────────────────────────────────────────
-- Il vincolo si allarga: 'pratica' si aggiunge ai quattro valori di prima, che
-- restano tutti validi. Il nome del vincolo è quello che Postgres genera da
-- solo; `if exists` regge anche il caso in cui sia stato rinominato a mano.
alter table public.quote_pratica_documenti
  drop constraint if exists quote_pratica_documenti_entita_check;
alter table public.quote_pratica_documenti
  add constraint quote_pratica_documenti_entita_check
  check (entita in ('polizza', 'preventivo', 'cliente', 'sinistro', 'pratica'));

-- La lettura dei documenti segue la pratica, come già segue la polizza: chi
-- vede la pratica vede i suoi documenti. Senza questo ramo si ricadrebbe sul
-- proprietario del singolo documento, e un responsabile non vedrebbe i
-- documenti che il suo collaboratore ha caricato su una pratica sua.
drop policy if exists pdoc_select on public.quote_pratica_documenti;
create policy pdoc_select on public.quote_pratica_documenti for select using (
  case entita
    when 'polizza' then exists (select 1 from public.quote_polizze  p where p.id = entita_id and quote_vede(p.creato_da))
    when 'pratica' then exists (select 1 from public.quote_pratiche r where r.id = entita_id and quote_vede(r.creato_da))
    else quote_vede(creato_da) end);

-- Quando la pratica si collega alla polizza, i documenti vengono spostati con
-- un update di entita/entita_id: la politica di update è già quella giusta
-- (quote_vede sul proprietario del documento), non serve toccarla.

-- ═══════════════════════════════════════════════════════════════════════════════
--  PER TORNARE INDIETRO
--
--   drop policy if exists pdoc_select on public.quote_pratica_documenti;
--   create policy pdoc_select on public.quote_pratica_documenti for select using (
--     case when entita = 'polizza'
--          then exists (select 1 from public.quote_polizze p where p.id = entita_id and quote_vede(p.creato_da))
--          else quote_vede(creato_da) end);
--   alter table public.quote_pratica_documenti drop constraint if exists quote_pratica_documenti_entita_check;
--   alter table public.quote_pratica_documenti add constraint quote_pratica_documenti_entita_check
--     check (entita in ('polizza','preventivo','cliente','sinistro'));
--   -- ATTENZIONE: prima di rimettere il vincolo stretto vanno spostati o
--   -- cancellati i documenti con entita='pratica', altrimenti l'alter fallisce.
--   drop table if exists public.quote_pratiche;
-- ═══════════════════════════════════════════════════════════════════════════════
