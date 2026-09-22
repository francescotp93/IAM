-- ═══════════════════════════════════════════════════════════════════════════
-- LA MODALITÀ DI PAGAMENTO DIVENTA UNA VOCE CHE SI DICHIARA (22/09/2026)
--
-- Richiesta di Francesco:
--   «Polizza emessa da ODDO FRANCESCO da 300 € mi dovrei trovare tra le
--    modalità di pagamento un nome di un Collaboratore. […] Nella parte
--    gestionale devo avere la possibilità di inserire le voci di modalità di
--    pagamento, e decidere quali devono essere contabilizzate e quali devono
--    invece finire in un'apposita voce dei Sospesi.»
--
-- ── PERCHÉ UNA TABELLA ────────────────────────────────────────────────────
-- Oggi quel vocabolario è scritto in SEI posti, e cinque sono nel codice:
--   · il CHECK di `quote_titoli` e quello di `quote_polizze` (nove valori)
--   · `Contabilita.MEZZI`, `Flusso.MEZZI`, `TIT_MEZZI`, `PF_MEZZI`
-- Aggiungere «Oddo Francesco» vorrebbe dire toccarli tutti e sei, e una voce
-- che si aggiunge toccando sei posti è una voce che nessuno aggiunge.
--
-- Misurato prima di scrivere (22/09/2026):
--   4.037 polizze e 2.817 rate portano uno dei nove codici
--   418 rate aperte, di cui 380 NON dicono con che mezzo: 88.600,71 €
--   17 collaboratori, 16 attivi
--
-- ── LE DUE REGOLE CHE LA TABELLA PORTA ────────────────────────────────────
-- 1. `contabilizza` dice se quella voce entra SUBITO in un conto oppure resta
--    fra i sospesi finché qualcuno non la scarica. Non è una novità: è il
--    campo `immediato` che `Contabilita.MEZZI` ha già — i contanti sono
--    denaro in mano, tutto il resto arriva dopo (CLAUDE.md §32). Qui diventa
--    una cosa che si può cambiare senza toccare il codice.
-- 2. Una voce può essere un COLLABORATORE. E allora `contabilizza` non può
--    essere «subito»: se il premio ce l'ha in mano lui, in cassa dell'agenzia
--    non c'è. È un CHECK, non una raccomandazione.
--
-- ── QUELLO CHE NON SI INVENTA ─────────────────────────────────────────────
-- I collaboratori NON si seminano come voci: una persona diventa una
-- modalità di pagamento quando qualcuno decide che tiene i premi, e quella è
-- una decisione (§8.1, §19). La tabella nasce con le nove voci che il
-- database già ammetteva, e basta.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.iam_modalita_pagamento (
  codice           text primary key,
  nome             text not null,
  -- «subito» = il denaro è in casa nel momento in cui si incassa (i contanti).
  -- «sospeso» = qualcuno lo tiene, e finché non lo porta resta un sospeso.
  contabilizza     text not null default 'sospeso'
                   check (contabilizza in ('subito','sospeso')),
  collaboratore_id uuid references public.quote_collaboratori(id) on delete restrict,
  -- quanti giorni ci mette ad arrivare: serve a dire «è fermo da troppo»
  giorni_attesi    int,
  attiva           boolean not null default true,
  ordine           int not null default 100,
  -- le nove di partenza si possono rinominare e spegnere, mai cancellare:
  -- ci sono appese 6.854 righe fra polizze e rate
  di_sistema       boolean not null default false,
  note             text,
  creato_il        timestamptz not null default now(),
  creato_da        uuid default auth.uid(),
  aggiornato_il    timestamptz not null default now(),
  -- Un collaboratore che tiene il premio NON è denaro in casa.
  constraint iam_modalita_collab_mai_subito
    check (collaboratore_id is null or contabilizza = 'sospeso')
);

-- Una persona sola per voce: due voci per lo stesso collaboratore vorrebbero
-- dire due elenchi di sospesi per la stessa persona, e nessuno dei due
-- completo.
create unique index if not exists iam_modalita_collab_uidx
  on public.iam_modalita_pagamento (collaboratore_id)
  where collaboratore_id is not null;

-- Le nove voci che il vincolo del database già ammetteva, con il verso che
-- `Contabilita.MEZZI` dichiara da sempre: i contanti sono immediati, tutto il
-- resto arriva dopo. Nessun valore inventato.
insert into public.iam_modalita_pagamento
  (codice, nome, contabilizza, giorni_attesi, ordine, di_sistema) values
  ('contante',      'Contanti',              'subito',  0, 10, true),
  ('pos',           'POS',                   'sospeso', 2, 20, true),
  ('bonifico',      'Bonifico',              'sospeso', 3, 30, true),
  ('assegno',       'Assegno',               'sospeso', 7, 40, true),
  ('carta_credito', 'Carta di credito',      'sospeso', 3, 50, true),
  ('prepagata',     'Carta prepagata',       'sospeso', 3, 60, true),
  ('paypal',        'PayPal',                'sospeso', 3, 70, true),
  ('domiciliazione','Domiciliazione (SDD)',  'sospeso', 5, 80, true),
  ('altro',         'Altro',                 'sospeso', null, 90, true)
on conflict (codice) do nothing;

-- ── DAL VINCOLO CHIUSO ALLA TABELLA ───────────────────────────────────────
-- Il CHECK a nove valori va tolto, altrimenti una voce nuova non si può
-- scrivere. Al suo posto una chiave esterna, che fa di più: garantisce che il
-- codice esista DAVVERO, e con `on delete restrict` impedisce di cancellare
-- una voce che ha delle righe appese. «Non si cancella, si spegne» (§26)
-- smette di essere una raccomandazione.
alter table public.quote_titoli  drop constraint if exists quote_titoli_mezzo_pagamento_check;
alter table public.quote_polizze drop constraint if exists quote_polizze_mezzo_pagamento_check;

alter table public.quote_titoli
  add constraint quote_titoli_mezzo_fk
  foreign key (mezzo_pagamento) references public.iam_modalita_pagamento(codice)
  on update cascade on delete restrict;

alter table public.quote_polizze
  add constraint quote_polizze_mezzo_fk
  foreign key (mezzo_pagamento) references public.iam_modalita_pagamento(codice)
  on update cascade on delete restrict;

-- Senza questi due indici ogni cancellazione di una voce leggerebbe per
-- intero 3.205 rate e 4.019 polizze, e il raggruppamento dei sospesi pure.
create index if not exists quote_titoli_mezzo_idx  on public.quote_titoli (mezzo_pagamento);
create index if not exists quote_polizze_mezzo_idx on public.quote_polizze (mezzo_pagamento);

-- ── CHI LEGGE E CHI SCRIVE ────────────────────────────────────────────────
-- Leggere: chiunque abbia un accesso. È un vocabolario, e le tendine che lo
-- usano stanno anche nel preventivatore: tenerlo allo staff vorrebbe dire una
-- tendina vuota per un collaboratore (stessa scelta di `quote_compagnie`,
-- §39).
-- Scrivere: l'admin. Qui si decide se un premio finisce in cassa o in mano a
-- una persona — è la soglia dei conti e delle causali (§26).
alter table public.iam_modalita_pagamento enable row level security;

drop policy if exists mod_select on public.iam_modalita_pagamento;
create policy mod_select on public.iam_modalita_pagamento
  for select to authenticated using (true);

drop policy if exists mod_write on public.iam_modalita_pagamento;
create policy mod_write on public.iam_modalita_pagamento
  for all to authenticated using (iam_is_admin()) with check (iam_is_admin());

-- Le nove di partenza non si cancellano: ci sono appese migliaia di righe, e
-- il divieto sta nel DATABASE perché la schermata è una delle strade, non
-- l'unica (c'è la console, c'è PostgREST).
create or replace function public.iam_modalita_no_delete_sistema()
returns trigger language plpgsql security invoker as $$
begin
  if old.di_sistema then
    raise exception 'La voce «%» è di sistema: si può rinominare e spegnere, non cancellare.', old.nome;
  end if;
  return old;
end $$;

drop trigger if exists iam_modalita_no_delete on public.iam_modalita_pagamento;
create trigger iam_modalita_no_delete before delete on public.iam_modalita_pagamento
  for each row execute function public.iam_modalita_no_delete_sistema();

create or replace function public.iam_modalita_tocca()
returns trigger language plpgsql security invoker as $$
begin
  new.aggiornato_il := now();
  return new;
end $$;

drop trigger if exists iam_modalita_tocca_t on public.iam_modalita_pagamento;
create trigger iam_modalita_tocca_t before update on public.iam_modalita_pagamento
  for each row execute function public.iam_modalita_tocca();

comment on table public.iam_modalita_pagamento is
  'Le voci della modalità di pagamento. Una voce può essere un collaboratore: '
  'allora il premio ce l''ha lui e resta un sospeso finché non lo porta. '
  '`contabilizza` dice se il denaro è in casa subito (contanti) o arriva dopo.';

-- ── ROLLBACK ───────────────────────────────────────────────────────────────
-- ATTENZIONE: torna indietro solo se nessuna riga usa una voce NUOVA — il
-- CHECK a nove valori rifiuterebbe «Oddo Francesco», e l'ALTER fallirebbe
-- lasciando la tabella senza nessun vincolo. Prima si guarda:
--   select distinct mezzo_pagamento from quote_titoli
--    where mezzo_pagamento not in ('contante','assegno','bonifico','pos',
--          'carta_credito','paypal','prepagata','domiciliazione','altro');
--
-- alter table public.quote_titoli  drop constraint quote_titoli_mezzo_fk;
-- alter table public.quote_polizze drop constraint quote_polizze_mezzo_fk;
-- alter table public.quote_titoli add constraint quote_titoli_mezzo_pagamento_check
--   check (mezzo_pagamento is null or mezzo_pagamento = any (array['contante','assegno','bonifico','pos','carta_credito','paypal','prepagata','domiciliazione','altro']));
-- alter table public.quote_polizze add constraint quote_polizze_mezzo_pagamento_check
--   check (mezzo_pagamento is null or mezzo_pagamento = any (array['contante','assegno','bonifico','pos','carta_credito','paypal','prepagata','domiciliazione','altro']));
-- drop trigger if exists iam_modalita_no_delete on public.iam_modalita_pagamento;
-- drop trigger if exists iam_modalita_tocca_t on public.iam_modalita_pagamento;
-- drop table if exists public.iam_modalita_pagamento;
-- drop function if exists public.iam_modalita_no_delete_sistema();
-- drop function if exists public.iam_modalita_tocca();
