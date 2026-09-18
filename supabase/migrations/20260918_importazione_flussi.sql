-- ═══════════════════════════════════════════════════════════════════════════════
--  IMPORTARE IL PORTAFOGLIO DALLE COMPAGNIE (18/09/2026)
--
--  Le compagnie mandano ogni notte un archivio col portafoglio: anagrafiche,
--  polizze, rate, provvigioni (tracciato Standard Share File — vedi
--  `tariffe/motore/flusso-ssf.js`). Questa migrazione aggiunge le due cose
--  senza cui l'importazione non si può ripetere, e un'importazione che non si
--  può ripetere non serve: il flusso arriva tutte le notti e i giorni si
--  sovrappongono.
--
--  1. LA PROVENIENZA (`fonte` + `fonte_id`). La chiave che la compagnia dà a
--     una polizza è sua e non cambia mai: tenerla accanto alla nostra riga è
--     l'unico modo per sapere, la notte dopo, che quella polizza c'è già.
--     Senza, ogni caricamento raddoppierebbe il portafoglio — e la seconda
--     copia sarebbe indistinguibile dalla prima.
--     L'indice è UNICO: la garanzia non sta nel codice che controlla prima di
--     scrivere (quello si può dimenticare o andare in corsa con se stesso),
--     sta nel database, che dice di no.
--
--  2. IL REGISTRO (`quote_importazioni`). Ogni caricamento lascia una riga con
--     chi l'ha fatto, di che periodo, e quanto ha scritto. Serve il giorno in
--     cui un numero non torna: senza il registro, «quando è entrata questa
--     polizza e da quale file» non ha risposta.
--
--  SOLO AGGIUNTE. Nessuna colonna esistente viene toccata, nessuna riga
--  riscritta. In fondo c'è come tornare indietro.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. LA PROVENIENZA SULLE RIGHE CHE ARRIVANO DA UN FLUSSO ──────────────────
-- `fonte` dice da quale tracciato («ssf») e `fonte_id` è la chiave della
-- compagnia. Restano NULL su tutto quello che è stato creato a mano, che è
-- come dev'essere: una polizza scritta in agenzia non ha una provenienza.
alter table public.quote_polizze     add column if not exists fonte    text;
alter table public.quote_polizze     add column if not exists fonte_id text;
alter table public.quote_titoli      add column if not exists fonte    text;
alter table public.quote_titoli      add column if not exists fonte_id text;
alter table public.quote_anagrafiche add column if not exists fonte    text;
alter table public.quote_anagrafiche add column if not exists fonte_id text;

comment on column public.quote_polizze.fonte_id is
  'Chiave della polizza nel flusso della compagnia (ID_POLIZZA_EXP). NULL se la polizza e'' stata creata a mano.';
comment on column public.quote_titoli.fonte_id is
  'Chiave del titolo nel flusso della compagnia (ID_TITOLO_EXP).';
comment on column public.quote_anagrafiche.fonte_id is
  'Chiave dell''anagrafica nel flusso da cui e'' stata creata. Il riconoscimento del cliente resta il codice fiscale: questa colonna dice solo da dove e'' arrivata.';

-- L'indice unico e' la rete vera. `where fonte_id is not null` lascia fuori
-- tutto il portafoglio scritto a mano, che di chiavi di provenienza non ne ha
-- e non deve averne.
create unique index if not exists quote_polizze_fonte_uidx
  on public.quote_polizze(fonte, fonte_id) where fonte_id is not null;
create unique index if not exists quote_titoli_fonte_uidx
  on public.quote_titoli(fonte, fonte_id) where fonte_id is not null;
create index if not exists quote_anagrafiche_fonte_idx
  on public.quote_anagrafiche(fonte, fonte_id) where fonte_id is not null;

-- ── 2. IL REGISTRO DEI CARICAMENTI ───────────────────────────────────────────
create table if not exists public.quote_importazioni (
  id            uuid primary key default gen_random_uuid(),
  fonte         text not null default 'ssf',
  emittente     text,          -- la compagnia che ha mandato il flusso
  intermediario text,          -- il codice agenzia dichiarato nella testata
  versione      text,          -- «SSF V12»: se cambia, si vede qui
  periodo_dal   date,
  periodo_al    date,
  file_nome     text,
  -- quante righe sono state scritte, quante erano gia' li', quante lasciate
  -- fuori e perche': e' il verbale del caricamento
  conteggi      jsonb not null default '{}'::jsonb,
  avvisi        jsonb not null default '[]'::jsonb,
  creato_da     uuid not null default auth.uid(),
  creato_nome   text,
  creato_il     timestamptz not null default now()
);

comment on table public.quote_importazioni is
  'Registro dei flussi di portafoglio caricati. Una riga per caricamento: serve il giorno in cui un numero non torna.';

create index if not exists quote_importazioni_creato_idx on public.quote_importazioni(creato_il desc);

alter table public.quote_importazioni enable row level security;

drop policy if exists imp_select on public.quote_importazioni;
drop policy if exists imp_insert on public.quote_importazioni;
drop policy if exists imp_update on public.quote_importazioni;
drop policy if exists imp_delete on public.quote_importazioni;
create policy imp_select on public.quote_importazioni for select using (quote_vede(creato_da));
-- Caricare il portafoglio di un'agenzia non e' un'operazione da collaboratore:
-- tocca anagrafiche, polizze e contabilita' di tutti in una volta sola.
create policy imp_insert on public.quote_importazioni for insert with check (iam_is_staff());
create policy imp_update on public.quote_importazioni for update using (iam_is_staff()) with check (iam_is_staff());
create policy imp_delete on public.quote_importazioni for delete using (iam_is_admin());

-- ═══════════════════════════════════════════════════════════════════════════════
--  PER TORNARE INDIETRO
--
--   drop table if exists public.quote_importazioni;
--   drop index if exists public.quote_polizze_fonte_uidx;
--   drop index if exists public.quote_titoli_fonte_uidx;
--   drop index if exists public.quote_anagrafiche_fonte_idx;
--   alter table public.quote_polizze     drop column if exists fonte, drop column if exists fonte_id;
--   alter table public.quote_titoli      drop column if exists fonte, drop column if exists fonte_id;
--   alter table public.quote_anagrafiche drop column if exists fonte, drop column if exists fonte_id;
--
--  ATTENZIONE: togliere `fonte_id` cancella la memoria di che cosa era gia'
--  stato importato. Il caricamento successivo riscriverebbe tutto da capo, e
--  i doppioni andrebbero tolti a mano.
-- ═══════════════════════════════════════════════════════════════════════════════
