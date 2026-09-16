-- ═══════════════════════════════════════════════════════════════════════════════
--  ANALISI DEI BISOGNI — tabelle
--
--  Da eseguire UNA VOLTA nell'editor SQL di Supabase, dopo averlo letto.
--  Si puo' rilanciare senza danni: ogni istruzione e' idempotente.
--
--  Cinque tabelle, e ognuna esiste per una ragione precisa:
--
--   1. iam_analisi_bisogni            la pratica: risposte, rating, stato
--   2. iam_analisi_bisogni_inviti     i link mandati al cliente
--   3. iam_analisi_bisogni_consensi   privacy e marketing, uno per riga
--   4. iam_analisi_bisogni_documenti  i report generati, con la loro impronta
--   5. iam_analisi_bisogni_eventi     chi ha fatto cosa, e quando
--
--  Perche' i consensi non sono due colonne dentro la pratica. Un consenso e'
--  un fatto giuridico con una data, una versione del testo e un modo in cui e'
--  stato raccolto. Se domani l'informativa cambia, le due colonne direbbero
--  «ha acconsentito» senza poter piu' dire A CHE COSA. Una riga per consenso
--  conserva anche la versione del testo accettato, ed e' l'unica forma in cui
--  un consenso si puo' davvero dimostrare.
--
--  Perche' i documenti portano lo snapshot. Il report e' una fotografia: deve
--  restare leggibile fra due anni con le regole di oggi. Salvare solo il file
--  non basta — serve sapere da quali dati e con quali regole e' nato.
-- ═══════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── 1. La pratica ────────────────────────────────────────────────────────────
create table if not exists public.iam_analisi_bisogni (
  id                    uuid primary key default gen_random_uuid(),
  -- uuid e non text: quote_anagrafiche.id e' uuid (supabase/quote_schema.sql:59).
  -- Il vincolo e' voluto: un'analisi senza cliente non vuol dire niente, e se
  -- il cliente sparisce dal portafoglio deve sparire anche la sua analisi.
  anagrafica_id         uuid references public.quote_anagrafiche(id) on delete cascade,
  stato                 text not null default 'bozza' check (stato in (
                          'bozza','invito_creato','inviata','aperta','in_compilazione',
                          'completata','firmata','scaduta','revocata','annullata')),
  modalita              text not null check (modalita in ('agenzia','link')),
  operatore_id          uuid,
  risposte              jsonb not null default '{}'::jsonb,
  rating                jsonb,
  indice_complessivo    integer check (indice_complessivo between 0 and 100),
  bisogno_principale    text,
  -- Le tre versioni si salvano SEMPRE. Un rating riletto fra un anno con
  -- regole nuove darebbe un altro risultato, e la firma sotto non varrebbe
  -- piu' niente: senza queste colonne il documento non e' piu' rileggibile.
  versione_questionario text not null,
  versione_regole       text not null,
  versione_privacy      text,
  -- Difesa dalle sovrascritture silenziose: operatore e cliente possono avere
  -- la stessa analisi aperta, e chi salva per secondo cancellerebbe l'altro
  -- senza che nessuno dei due se ne accorga.
  versione_locale       integer not null default 1,
  creata_il             timestamptz not null default now(),
  aggiornata_il         timestamptz not null default now(),
  completata_il         timestamptz,
  firmata_il            timestamptz,
  annullata_il          timestamptz
);

-- ── 2. Gli inviti ────────────────────────────────────────────────────────────
create table if not exists public.iam_analisi_bisogni_inviti (
  id                uuid primary key default gen_random_uuid(),
  analisi_id        uuid not null references public.iam_analisi_bisogni(id) on delete cascade,
  -- SOLO l'impronta, mai il codice. Chi legge il database non deve poter
  -- aprire le analisi dei clienti: e' la stessa ragione per cui non si
  -- salvano le password.
  token_hash        text not null unique,
  scade_il          timestamptz not null,
  revocato_il       timestamptz,
  aperto_il         timestamptz,
  ultimo_accesso_il timestamptz,
  completato_il     timestamptz,
  tentativi_falliti integer not null default 0 check (tentativi_falliti >= 0),
  metadata          jsonb not null default '{}'::jsonb,
  creato_il         timestamptz not null default now()
);

-- ── 3. I consensi ────────────────────────────────────────────────────────────
create table if not exists public.iam_analisi_bisogni_consensi (
  id                  uuid primary key default gen_random_uuid(),
  analisi_id          uuid not null references public.iam_analisi_bisogni(id) on delete cascade,
  tipo                text not null check (tipo in ('privacy','marketing')),
  versione_testo      text not null,
  accettato           boolean not null,
  accettato_il        timestamptz,
  -- Mascherato: «f***@gmail.com». Serve a dimostrare DOVE e' arrivato il
  -- codice senza tenere un secondo elenco di recapiti in giro.
  recapito_mascherato text,
  otp_riferimento     text,
  otp_verificato_il   timestamptz,
  modalita            text not null check (modalita in ('agenzia','link')),
  metadata            jsonb not null default '{}'::jsonb,
  creato_il           timestamptz not null default now()
);

-- ── 4. I documenti ───────────────────────────────────────────────────────────
create table if not exists public.iam_analisi_bisogni_documenti (
  id               uuid primary key default gen_random_uuid(),
  analisi_id       uuid not null references public.iam_analisi_bisogni(id) on delete cascade,
  tipo             text not null check (tipo in ('cliente','agenzia')),
  percorso_storage text not null,
  sha256           text not null,
  snapshot         jsonb not null,
  motore_versione  text not null,
  generato_da      uuid,
  generato_il      timestamptz not null default now(),
  -- Rigenerare lo stesso report con gli stessi dati non crea un doppione.
  unique (analisi_id, tipo, sha256)
);

-- ── 5. Gli eventi ────────────────────────────────────────────────────────────
-- Si scrive e non si tocca piu'. Qui va COSA e' successo, non i dati: le
-- risposte stanno nella pratica, e ricopiarle qui vorrebbe dire moltiplicare
-- i posti da cui possono uscire.
create table if not exists public.iam_analisi_bisogni_eventi (
  id           uuid primary key default gen_random_uuid(),
  analisi_id   uuid not null references public.iam_analisi_bisogni(id) on delete cascade,
  tipo_evento  text not null,
  attore_tipo  text not null check (attore_tipo in ('operatore','cliente','sistema')),
  attore_id    text,
  dettagli     jsonb not null default '{}'::jsonb,
  creato_il    timestamptz not null default now()
);

-- ── Indici ───────────────────────────────────────────────────────────────────
create index if not exists idx_ab_anagrafica on public.iam_analisi_bisogni(anagrafica_id);
create index if not exists idx_ab_stato      on public.iam_analisi_bisogni(stato, creata_il desc);
create index if not exists idx_ab_operatore  on public.iam_analisi_bisogni(operatore_id, creata_il desc);
-- L'impronta e' gia' unique (quindi indicizzata): qui serve la scadenza, che
-- si interroga a ogni apertura di un link.
create index if not exists idx_ab_inviti_scadenza on public.iam_analisi_bisogni_inviti(scade_il);
create index if not exists idx_ab_inviti_analisi  on public.iam_analisi_bisogni_inviti(analisi_id);
create index if not exists idx_ab_consensi        on public.iam_analisi_bisogni_consensi(analisi_id, tipo);
create index if not exists idx_ab_documenti       on public.iam_analisi_bisogni_documenti(analisi_id, tipo);
create index if not exists idx_ab_eventi          on public.iam_analisi_bisogni_eventi(analisi_id, creato_il);

-- ── L'ora dell'ultima modifica, senza doversene ricordare ────────────────────
create or replace function public.iam_ab_tocca() returns trigger language plpgsql as $$
begin
  new.aggiornata_il := now();
  return new;
end $$;

drop trigger if exists trg_ab_tocca on public.iam_analisi_bisogni;
create trigger trg_ab_tocca before update on public.iam_analisi_bisogni
  for each row execute function public.iam_ab_tocca();

-- ═══════════════════════════════════════════════════════════════════════════════
--  RLS — protezione attiva e NESSUNA policy
--
--  Questo e' voluto, non dimenticato.
--
--  Le tabelle piu' vecchie usano policy larghe («to authenticated using (true)»),
--  cioe' chiunque abbia fatto il login vede tutto. Qui non si puo': queste
--  tabelle contengono la situazione familiare, il patrimonio e lo stato di
--  salute dichiarati dai clienti — categorie che il GDPR tratta a parte.
--
--  Con RLS attiva e zero policy, dal browser non si legge e non si scrive
--  NIENTE. Passa solo il motore, che usa la service role e applica lui i
--  controlli: ruolo dell'operatore per l'area interna, impronta del token per
--  la pagina pubblica. Un solo punto da sorvegliare invece di due.
--
--  Se un giorno servisse la lettura diretta dal browser, la policy va scritta
--  su chi e' l'operatore — mai «authenticated».
-- ═══════════════════════════════════════════════════════════════════════════════
alter table public.iam_analisi_bisogni            enable row level security;
alter table public.iam_analisi_bisogni_inviti     enable row level security;
alter table public.iam_analisi_bisogni_consensi   enable row level security;
alter table public.iam_analisi_bisogni_documenti  enable row level security;
alter table public.iam_analisi_bisogni_eventi     enable row level security;

-- ── Controllo finale ─────────────────────────────────────────────────────────
-- Deve elencare cinque righe, tutte con rowsecurity = true e zero policy.
select c.relname as tabella,
       c.relrowsecurity as rls_attiva,
       (select count(*) from pg_policies p where p.tablename = c.relname) as policy
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname like 'iam_analisi_bisogni%'
order by 1;
