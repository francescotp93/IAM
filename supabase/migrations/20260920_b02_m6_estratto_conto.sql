-- ═══════════════════════════════════════════════════════════════════════════════
--  BRIEF #02 · M6 — L'ESTRATTO CONTO CHE ESCE DI CASA            (20/09/2026)
--
--  La schermata c'e' gia' (QUOTO, `#page-estratto`, §17 e §24): due linguette,
--  «Da versare» e «Provvigioni», l'Excel e l'email. Rifarla in IAM sarebbe la
--  malattia di Utenti e Performance (§10): la stessa schermata scritta due
--  volte, e due numeri che un giorno diranno cose diverse sulla stessa persona.
--
--  Quello che mancava non e' la schermata: e' tutto cio' che succede quando
--  quel foglio ESCE. Quattro cose, e questa migrazione ne regge due.
--
--  1. LE COORDINATE SU CUI SI VERSA NON SI SCRIVONO A MANO.
--     Un estratto conto «da versare» chiede dei soldi: senza l'IBAN e' una
--     richiesta senza il modo di rispondere, e un IBAN copiato a mano dentro
--     un programma e' quello che resta scritto anche il giorno in cui
--     l'agenzia cambia banca. La M1 aveva lasciato scritto che spostare
--     `iam_azienda.dati.iban1/iban2` su `iam_conti` «e' una migrazione di dati
--     che vuole una persona che dica quale IBAN e' di quale conto»: quella
--     persona serve ancora, quindi qui NON si sposta niente. Si aggiungono le
--     colonne, vuote, e la spunta che dice quale conto riceve le rimesse.
--     Finche' nessuno la mette, il foglio dice «coordinate da configurare»
--     invece di stampare un IBAN indovinato (regola di casa §8.1).
--
--     `rimesse` e' UNA SOLA, e il divieto e' un indice unico parziale, non un
--     controllo nella schermata: due conti che dicono «i soldi vengono a me»
--     sono due IBAN diversi su due estratti conto mandati lo stesso giorno.
--
--  2. UN DOCUMENTO CHE SI MANDA FUORI LASCIA UNA RIGA.
--     «Io l'estratto conto non l'ho ricevuto» e' una frase che arriva mesi
--     dopo, e oggi la risposta e' un `quote_log` che dice «mandato» e non dice
--     a chi, con quali numeri, ne' se e' partito davvero. Questo registro
--     tiene il DESTINATARIO, la casella da cui e' uscito, il periodo, i totali
--     di quel giorno e l'esito.
--
--     I TOTALI SI COPIANO, e non e' un doppione: le rate cambiano (una viene
--     incassata, una si assegna a un altro), e rileggere l'estratto conto di
--     agosto oggi darebbe numeri diversi da quelli che quella persona ha
--     ricevuto. Un registro di documenti usciti che non sa dire che cosa
--     diceva il documento non serve a niente.
--
--     E si registra ANCHE L'ERRORE. Un invio fallito che non lascia traccia
--     e' la differenza fra «non gliel'ho mandato» e «gliel'ho mandato e non
--     gli e' arrivato» — due lavori diversi (§18, §12: «non risponde» e «non
--     c'e' niente» non sono la stessa cosa).
--
--  MISURATO PRIMA DI SCRIVERE, sul database e sul server veri:
--    · 55 rate, di cui **0 assegnate** a un collaboratore: oggi l'estratto
--      conto di ognuno e' vuoto, e questa migrazione non lo riempie (§19);
--    · 12 schede economiche, **0 con l'IBAN** del collaboratore;
--    · caselle configurate sul VPS: amministrazione@, **contabilita@**,
--      intermediari@ — la casella della contabilita' ESISTE, e fino a oggi
--      nessuno la sceglieva: l'estratto conto partiva dalla prima dell'elenco.
--
--  ROLLBACK:
--    drop table if exists public.iam_invii_estratto cascade;
--    alter table public.iam_conti drop column if exists iban,
--      drop column if exists bic, drop column if exists intestatario,
--      drop column if exists rimesse;
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Le coordinate stanno sul conto ──────────────────────────────────────
alter table public.iam_conti add column if not exists iban          text;
alter table public.iam_conti add column if not exists bic           text;
alter table public.iam_conti add column if not exists intestatario  text;
alter table public.iam_conti add column if not exists rimesse       boolean not null default false;

comment on column public.iam_conti.iban is
  'Le coordinate da stampare sui documenti che chiedono un versamento. Vuoto = il documento lo dichiara, non si indovina.';
comment on column public.iam_conti.rimesse is
  'Il conto su cui i collaboratori versano. Uno solo, e lo impone un indice unico: due IBAN su due estratti conto dello stesso giorno non si spiegano.';

create unique index if not exists iam_conti_rimesse_uno
  on public.iam_conti ((rimesse)) where rimesse and attivo;

-- ── 2. Il registro dei documenti usciti ────────────────────────────────────
create table if not exists public.iam_invii_estratto (
  id               uuid primary key default gen_random_uuid(),

  -- A chi. La persona puo' essere cancellata; il fatto che quel foglio sia
  -- uscito no — per questo `on delete set null` e il nome COPIATO.
  collaboratore_id uuid references public.quote_collaboratori(id) on delete set null,
  nome             text not null,
  destinatario     text not null,
  casella          text,

  tipo             text not null check (tipo in ('versare', 'provvigioni')),
  modello          text not null check (modello in ('a', 'b')),
  dal              date,
  al               date,

  -- I numeri di QUEL giorno (vedi la nota 2 in testa).
  righe            integer,
  totale           numeric(14,2),
  oggetto          text not null,
  allegato         text,

  esito            text not null check (esito in ('inviato', 'errore')),
  errore           text,
  creato_il        timestamptz not null default now(),
  creato_da        uuid default auth.uid(),

  -- Un errore senza il motivo non spiega niente, ed e' la meta' del valore
  -- di questo registro.
  constraint iam_invii_estratto_errore_col_motivo
    check (esito <> 'errore' or coalesce(btrim(errore), '') <> '')
);

comment on table public.iam_invii_estratto is
  'Ogni estratto conto uscito: a chi, da quale casella, con quali numeri e con che esito. I totali sono copiati apposta: le rate cambiano, il documento gia mandato no.';

create index if not exists iam_invii_estratto_chi
  on public.iam_invii_estratto (collaboratore_id, creato_il desc);
create index if not exists iam_invii_estratto_quando
  on public.iam_invii_estratto (creato_il desc);

-- Un registro non si corregge e non si cancella (§18, §29): il divieto sta nel
-- database, perche' la schermata e' una delle strade e non l'unica.
create or replace function public.iam_invii_estratto_immutabile() returns trigger
language plpgsql as $$
begin
  raise exception 'Il registro degli invii non si cambia: quello che e'' uscito e'' uscito.';
end $$;

drop trigger if exists iam_invii_estratto_no_update_trg on public.iam_invii_estratto;
create trigger iam_invii_estratto_no_update_trg
  before update or delete on public.iam_invii_estratto
  for each row execute function public.iam_invii_estratto_immutabile();

alter table public.iam_invii_estratto enable row level security;

/* Lo staff vede tutti gli invii dell'agenzia; chi non e' staff vede i propri,
   che e' la stessa regola con cui l'estratto conto gli mostra solo se stesso
   (§17). La visibilita' non si riscrive: si eredita il verso che c'e' gia'. */
drop policy if exists invii_estratto_select on public.iam_invii_estratto;
create policy invii_estratto_select on public.iam_invii_estratto
  for select using (public.iam_is_staff() or creato_da = auth.uid());

/* E il registro dice CHI ha mandato, quindi deve essere vero: nessuno scrive
   una riga firmata con l'identificativo di un altro (§18). */
drop policy if exists invii_estratto_insert on public.iam_invii_estratto;
create policy invii_estratto_insert on public.iam_invii_estratto
  for insert with check (creato_da = auth.uid());

-- NIENTE SEED: nessun IBAN scritto qui dentro. Quale conto riceve le rimesse
-- e con che coordinate lo dice una persona, dalla schermata Conti e causali.
