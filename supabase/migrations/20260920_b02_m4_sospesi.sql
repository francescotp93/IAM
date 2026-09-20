-- ═══════════════════════════════════════════════════════════════════════════════
--  BRIEF #02 · M4 — GLI INCASSI DA ACCREDITARE               (20/09/2026)
--
--  Il pezzo che collega l'incasso di una rata (§17, §24) alla prima nota (§29).
--  Fino a oggi le due cose non si parlavano: una rata incassata restava dentro
--  `quote_titoli` e il conto dell'agenzia non lo sapeva.
--
--  LA COSA CHE IL BRIEF CHIEDE, DETTA COME STA IN CONTABILITA'.
--  Quando un cliente paga, il denaro NON e' sul conto nello stesso istante:
--    · CONTANTI  → sono in mano subito: entrano in cassa, e il movimento si
--                  registra il giorno stesso;
--    · POS, BONIFICO, ASSEGNO, CARTA → il cliente ha pagato, ma l'accredito
--                  arriva dopo. In mezzo c'e' un tempo in cui l'incasso e'
--                  avvenuto e il conto non si e' mosso.
--  Quel tempo e' questa tabella. Senza, il saldo del conto direbbe di avere
--  gia' dei soldi che non sono ancora arrivati — un numero credibile e falso,
--  ed e' esattamente il caso che la quadratura (§29) troverebbe sbagliato.
--
--  MISURATO PRIMA DI SCRIVERE, sul database vero:
--    · 15 rate incassate: 4 carta di credito, 2 bonifico, **9 senza mezzo**
--    · 40 rate aperte, nessuna col mezzo
--    · ZERO incassi in contanti
--    · 2 conti (aziendale e plurimandatario), **nessuna cassa contanti**
--  Due conseguenze, e nessuna delle due si aggira indovinando:
--    1. senza una cassa contanti, un incasso in contanti non ha dove andare:
--       il sistema lo DICE invece di scegliere un conto a caso;
--    2. 9 rate su 15 non dicono con che mezzo sono state incassate, quindi non
--       si puo' sapere se sono in cassa o in attesa di accredito. Restano
--       «mezzo da dire», e si vedono.
--
--  LE QUATTRO DECISIONI
--
--  1. UN SOSPESO PUNTA ALLA RATA, NON LA RICOPIA. `titolo_id` con un indice
--     unico sulle righe vive: importo e mezzo restano una cosa sola con la
--     rata. Ricopiarli avrebbe creato il secondo archivio degli incassi, che
--     e' esattamente quello che la M5 del brief #01 ha evitato (§25).
--     Un sospeso SENZA rata esiste (un assegno ricevuto per altro) e allora
--     porta i suoi campi.
--
--  2. L'ACCREDITO GENERA IL MOVIMENTO, E IL MOVIMENTO SA DA DOVE VIENE.
--     `iam_movimenti.sospeso_id` + `origine = 'sospeso'`, con l'indice unico
--     che impedisce di scaricarlo due volte. Un accredito registrato due volte
--     e' denaro che nel sistema c'e' e in banca no.
--
--  3. SI ANNULLA, NON SI CANCELLA — col motivo, come per i movimenti (§29).
--     Un POS che non arriva mai (storno, contestazione) e' un fatto: la riga
--     resta e dice perche'.
--
--  4. DOVE FINISCONO I SOLDI LO DICE IL CONTO, non il codice. `iam_conti.mezzi`
--     elenca i mezzi che arrivano su quel conto. Nasce vuota su tutti e due i
--     conti esistenti: finche' nessuno la riempie il sistema non sa dove
--     mettere niente, e lo scrive in faccia (regola di casa §8.1).
--
--  ROLLBACK:
--    drop table if exists public.iam_sospesi cascade;
--    alter table public.iam_movimenti drop column if exists sospeso_id;
--    alter table public.iam_conti drop column if exists mezzi;
-- ═══════════════════════════════════════════════════════════════════════════════

-- Decisione 4.
alter table public.iam_conti add column if not exists mezzi text[];
comment on column public.iam_conti.mezzi is
  'I mezzi di pagamento che finiscono su questo conto (contanti, pos, bonifico...). Vuoto = nessuno: il sistema non indovina dove mettere i soldi.';

create table if not exists public.iam_sospesi (
  id               uuid primary key default gen_random_uuid(),

  -- Decisione 1: si punta alla rata, non la si ricopia.
  titolo_id        uuid references public.quote_titoli(id) on delete set null,
  -- …e questi servono solo al sospeso che una rata non ce l'ha.
  descrizione      text,
  controparte      text,

  importo          numeric(14,2) not null check (importo > 0),
  mezzo            text not null,
  -- Il giorno in cui il CLIENTE ha pagato, non quello in cui la banca accredita.
  -- Sono due date diverse, e la distanza fra loro e' il motivo per cui questa
  -- tabella esiste.
  data_incasso     date not null,

  -- Su quale conto e' atteso l'accredito. Puo' essere vuoto: vuol dire che
  -- nessuno ha ancora detto quale conto riceve quel mezzo (decisione 4).
  conto_id         uuid references public.iam_conti(id) on delete restrict,

  stato            text not null default 'aperto'
                   check (stato in ('aperto', 'accreditato', 'annullato')),
  accreditato_il   date,
  -- Decisione 2: il movimento nato dall'accredito.
  movimento_id     uuid references public.iam_movimenti(id) on delete set null,

  nota             text,
  annullato_perche text,
  creato_il        timestamptz not null default now(),
  creato_da        uuid default auth.uid(),
  aggiornato_il    timestamptz not null default now(),

  -- Accreditato senza dire quando e senza il suo movimento e' uno stato che
  -- mente: la riga esce dagli aperti e il conto non si e' mosso.
  constraint iam_sospesi_accredito_completo
    check (stato <> 'accreditato' or (accreditato_il is not null and movimento_id is not null)),
  constraint iam_sospesi_annullo_col_motivo
    check (stato <> 'annullato' or coalesce(btrim(annullato_perche), '') <> '')
);

comment on table public.iam_sospesi is
  'Denaro gia incassato dal cliente e non ancora sul conto: POS, bonifico, assegno, carta. Si chiude con l accredito, che genera il movimento in prima nota.';

-- Decisione 1: una rata genera UN sospeso vivo, mai due.
create unique index if not exists iam_sospesi_titolo_uno
  on public.iam_sospesi (titolo_id)
  where titolo_id is not null and stato <> 'annullato';

create index if not exists iam_sospesi_stato_data on public.iam_sospesi (stato, data_incasso desc);
create index if not exists iam_sospesi_conto on public.iam_sospesi (conto_id) where stato = 'aperto';

-- Decisione 2.
alter table public.iam_movimenti add column if not exists sospeso_id uuid references public.iam_sospesi(id) on delete set null;
alter table public.iam_movimenti drop constraint if exists iam_movimenti_origine_check;
alter table public.iam_movimenti add constraint iam_movimenti_origine_check
  check (origine in ('manuale', 'titolo', 'flusso', 'sospeso'));
create unique index if not exists iam_movimenti_sospeso_uno
  on public.iam_movimenti (sospeso_id)
  where sospeso_id is not null and annullato_il is null;

create or replace function public.iam_sospesi_regole() returns trigger
language plpgsql as $$
begin
  new.aggiornato_il := now();
  /* Quello che e' gia' accreditato e' storia: l'importo, il mezzo e la data
     hanno gia' prodotto un movimento in prima nota, e cambiarli qui li
     farebbe divergere in silenzio. */
  if tg_op = 'UPDATE' and old.stato = 'accreditato' and new.stato = 'accreditato'
     and (old.importo, old.mezzo, old.data_incasso) is distinct from (new.importo, new.mezzo, new.data_incasso) then
    raise exception 'Questo incasso e'' gia'' stato accreditato: non si corregge. Annulla il movimento in prima nota e rifai.';
  end if;
  return new;
end $$;

drop trigger if exists iam_sospesi_regole_trg on public.iam_sospesi;
create trigger iam_sospesi_regole_trg
  before insert or update on public.iam_sospesi
  for each row execute function public.iam_sospesi_regole();

-- Decisione 3.
create or replace function public.iam_sospesi_no_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'Un incasso da accreditare non si cancella: si annulla, con il motivo.';
end $$;

drop trigger if exists iam_sospesi_no_delete_trg on public.iam_sospesi;
create trigger iam_sospesi_no_delete_trg
  before delete on public.iam_sospesi
  for each row execute function public.iam_sospesi_no_delete();

-- Stessa soglia della M1, M2 e M3: legge lo staff, scrive l'admin.
alter table public.iam_sospesi enable row level security;

drop policy if exists sospesi_select on public.iam_sospesi;
create policy sospesi_select on public.iam_sospesi
  for select using (public.iam_is_staff());

drop policy if exists sospesi_write on public.iam_sospesi;
create policy sospesi_write on public.iam_sospesi
  for all using (public.iam_is_admin()) with check (public.iam_is_admin());

-- NIENTE SEED, e nemmeno un backfill delle 15 rate gia' incassate: 9 non
-- dicono con che mezzo, e per le altre 6 nessuno ha mai detto su quale conto
-- sono arrivate. Costruirle qui vorrebbe dire scrivere in contabilita' dei
-- fatti che nessuno ha verificato. Si portano dentro a mano, dalla schermata,
-- che le elenca e chiede.
