-- PROPOSTA DI SCHEMA - NON ESEGUIRE SENZA REVISIONE
-- Claude deve confrontare tipi, naming, auth e documenti con lo schema reale.
-- Lo script finale deve essere idempotente e lanciato manualmente nell'editor Supabase.

create extension if not exists pgcrypto;

create table if not exists public.iam_analisi_bisogni (
  id uuid primary key default gen_random_uuid(),
  -- Adattare il tipo al vero identificativo di quote_anagrafiche prima dell'esecuzione.
  anagrafica_id text,
  stato text not null default 'bozza' check (stato in (
    'bozza','invito_creato','inviata','aperta','in_compilazione',
    'completata','firmata','scaduta','revocata','annullata'
  )),
  modalita text not null check (modalita in ('agenzia','link')),
  operatore_id text,
  risposte jsonb not null default '{}'::jsonb,
  rating jsonb,
  indice_complessivo integer check (indice_complessivo between 0 and 100),
  bisogno_principale text,
  versione_questionario text not null,
  versione_regole text not null,
  versione_privacy text,
  versione_locale integer not null default 1,
  creata_il timestamptz not null default now(),
  aggiornata_il timestamptz not null default now(),
  completata_il timestamptz,
  firmata_il timestamptz,
  annullata_il timestamptz
);

create table if not exists public.iam_analisi_bisogni_inviti (
  id uuid primary key default gen_random_uuid(),
  analisi_id uuid not null references public.iam_analisi_bisogni(id) on delete cascade,
  token_hash text not null unique,
  scade_il timestamptz not null,
  revocato_il timestamptz,
  aperto_il timestamptz,
  ultimo_accesso_il timestamptz,
  completato_il timestamptz,
  tentativi_falliti integer not null default 0 check (tentativi_falliti >= 0),
  metadata jsonb not null default '{}'::jsonb,
  creato_il timestamptz not null default now()
);

create table if not exists public.iam_analisi_bisogni_consensi (
  id uuid primary key default gen_random_uuid(),
  analisi_id uuid not null references public.iam_analisi_bisogni(id) on delete cascade,
  tipo text not null check (tipo in ('privacy','marketing')),
  versione_testo text not null,
  accettato boolean not null,
  accettato_il timestamptz,
  recapito_mascherato text,
  otp_riferimento text,
  otp_verificato_il timestamptz,
  modalita text not null check (modalita in ('agenzia','link')),
  metadata jsonb not null default '{}'::jsonb,
  creato_il timestamptz not null default now()
);

create table if not exists public.iam_analisi_bisogni_documenti (
  id uuid primary key default gen_random_uuid(),
  analisi_id uuid not null references public.iam_analisi_bisogni(id) on delete cascade,
  tipo text not null check (tipo in ('cliente','agenzia')),
  percorso_storage text not null,
  sha256 text not null,
  snapshot jsonb not null,
  motore_versione text not null,
  generato_da text,
  generato_il timestamptz not null default now(),
  unique (analisi_id, tipo, sha256)
);

create table if not exists public.iam_analisi_bisogni_eventi (
  id uuid primary key default gen_random_uuid(),
  analisi_id uuid not null references public.iam_analisi_bisogni(id) on delete cascade,
  tipo_evento text not null,
  attore_tipo text not null check (attore_tipo in ('operatore','cliente','sistema')),
  attore_id text,
  dettagli jsonb not null default '{}'::jsonb,
  creato_il timestamptz not null default now()
);

create index if not exists idx_iam_analisi_anagrafica on public.iam_analisi_bisogni(anagrafica_id);
create index if not exists idx_iam_analisi_stato on public.iam_analisi_bisogni(stato, creata_il desc);
create index if not exists idx_iam_analisi_operatore on public.iam_analisi_bisogni(operatore_id, creata_il desc);
create index if not exists idx_iam_analisi_inviti_scadenza on public.iam_analisi_bisogni_inviti(scade_il);
create index if not exists idx_iam_analisi_consensi_analisi on public.iam_analisi_bisogni_consensi(analisi_id, tipo);
create index if not exists idx_iam_analisi_documenti_analisi on public.iam_analisi_bisogni_documenti(analisi_id, tipo);
create index if not exists idx_iam_analisi_eventi_analisi on public.iam_analisi_bisogni_eventi(analisi_id, creato_il);

alter table public.iam_analisi_bisogni enable row level security;
alter table public.iam_analisi_bisogni_inviti enable row level security;
alter table public.iam_analisi_bisogni_consensi enable row level security;
alter table public.iam_analisi_bisogni_documenti enable row level security;
alter table public.iam_analisi_bisogni_eventi enable row level security;

-- Non aggiungere policy permissive generiche.
-- Preferenza architetturale: accesso tramite backend, che applica ruoli e token.
-- Se il sistema usa policy IAM già esistenti, copiarne lo schema dopo revisione.
