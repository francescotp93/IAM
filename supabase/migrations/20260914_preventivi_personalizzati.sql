-- ═══════════════════════════════════════════════════════════════════════════
--  PREVENTIVI PERSONALIZZATI — FASE 1  (14/09/2026)
--
--  Il preventivo che si scrive a mano: compagnia e prodotto scelti da un
--  elenco o battuti liberamente, premio pieno, eventuale sconto, righe di
--  descrizione. Non e' una quotazione calcolata da un motore — e' una
--  proposta che l'intermediario mette per iscritto e consegna al cliente.
--
--  Perche' una tabella nuova e non quote_preventivi: li' ogni riga nasce da
--  un motore di tariffa (`modulo`, `prodotto_id`, `dati` della richiesta,
--  `polizza_emessa`). Un preventivo scritto a mano non ha niente di tutto
--  questo, e infilarcelo dentro vorrebbe dire sporcare lo storico e le
--  Performance con righe che non sono preventivi calcolati.
--
--  Cosa NON si crea: nessuna tabella per l'intermediario. Nome, recapiti e
--  iscrizione RUI stanno gia' in quote_collaboratori (rui_numero, rui_data,
--  rui_sezione, veste). Qui si tiene solo il riferimento.
-- ═══════════════════════════════════════════════════════════════════════════

create sequence if not exists public.quote_preventivi_personalizzati_numero_seq;

create table if not exists public.quote_preventivi_personalizzati (
  id                uuid primary key default gen_random_uuid(),
  -- Numero progressivo per il documento: PP-2026-0001, come QT- e PL-.
  numero            bigint not null default nextval('public.quote_preventivi_personalizzati_numero_seq'),

  cliente_id        uuid not null references public.quote_anagrafiche(id),

  -- Compagnia e prodotto: il menu propone quelli gia' nel sistema, «Altro»
  -- apre il campo libero. In colonna ci finisce SEMPRE il nome per esteso,
  -- scelto o battuto che sia: cosi' un raggruppamento per compagnia continua
  -- a funzionare senza dover unire due colonne.
  compagnia         text not null,
  tipo_prodotto     text not null,
  garanzia          text,

  premio_pieno      numeric(12,2) not null check (premio_pieno >= 0),

  -- Il frazionamento vale per il premio pieno E per lo scontato: e' uno solo.
  -- I valori sono quelli gia' in uso (TIT_RATE_ANNO), piu' il premio unico.
  frazionamento     text not null default 'annuale'
                      check (frazionamento = any (array[
                        'annuale','semestrale','quadrimestrale',
                        'trimestrale','mensile','premio_unico'])),

  sconto_applicato  boolean not null default false,
  premio_scontato   numeric(12,2) check (premio_scontato >= 0),

  da_autorizzare    boolean not null default false,

  -- Blocco ripetibile: un elenco di righe di testo. Il vincolo impedisce che
  -- ci finisca dentro un oggetto o una stringa sola.
  descrizioni       jsonb not null default '[]'::jsonb
                      check (jsonb_typeof(descrizioni) = 'array'),

  intermediario_id  uuid references public.quote_collaboratori(id),

  -- Il disclaimer si copia QUI alla creazione, non si legge da una costante.
  -- Se un domani il testo di legge cambia, i preventivi gia' consegnati
  -- devono continuare a mostrare il testo che il cliente ha letto davvero.
  disclaimer        text not null default 'Il presente preventivo ha carattere puramente indicativo e non costituisce proposta contrattuale né impegno all''assunzione del rischio. Le condizioni, le garanzie, le esclusioni e i massimali sono quelli riportati nel set informativo del prodotto, che deve essere consegnato e letto prima della sottoscrizione. Il premio indicato può variare in base ai dati definitivi e alle valutazioni della Compagnia.',

  creato_da         uuid default auth.uid(),
  creato_nome       text,
  creato_il         timestamptz not null default now(),
  aggiornato_il     timestamptz not null default now(),

  -- Lo sconto spento non lascia in giro un premio scontato orfano, e lo
  -- sconto acceso non puo' essere un rincaro travestito.
  constraint pp_sconto_coerente check (
    (sconto_applicato and premio_scontato is not null and premio_scontato <= premio_pieno)
    or ((not sconto_applicato) and premio_scontato is null)
  )
);

comment on table public.quote_preventivi_personalizzati is
  'Preventivi scritti a mano dall''intermediario per un cliente: premio, garanzia, descrizioni, disclaimer. Non passano da un motore di tariffa.';

create index if not exists quote_prev_pers_cliente_idx
  on public.quote_preventivi_personalizzati (cliente_id, creato_il desc);
create index if not exists quote_prev_pers_creato_da_idx
  on public.quote_preventivi_personalizzati (creato_da);

-- ── PERMESSI ───────────────────────────────────────────────────────────────
-- Identici a quote_preventivi: e' un dato di cliente, quindi non basta
-- «sei autenticato». quote_vede() fa passare lo staff (top_master/master),
-- il proprietario della riga e chi sta nella stessa rete: e' la stessa
-- funzione che decide chi vede l'anagrafica, quindi non si creano buchi
-- nuovi ne' zone in cui vedi il preventivo ma non il cliente.
alter table public.quote_preventivi_personalizzati enable row level security;

create policy prev_pers_select on public.quote_preventivi_personalizzati
  for select to authenticated using (public.quote_vede(creato_da));

create policy prev_pers_insert on public.quote_preventivi_personalizzati
  for insert to authenticated with check ((creato_da = auth.uid()) or public.iam_is_staff());

create policy prev_pers_update on public.quote_preventivi_personalizzati
  for update to authenticated using (public.quote_vede(creato_da))
  with check (public.quote_vede(creato_da));

create policy prev_pers_delete on public.quote_preventivi_personalizzati
  for delete to authenticated using (public.iam_is_admin());
