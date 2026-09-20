-- ═══════════════════════════════════════════════════════════════════════════════
--  BRIEF #02 · M3 — LA PRIMA NOTA E LA QUADRATURA DEI CONTI      (20/09/2026)
--
--  La M1 ha creato i conti e le causali, e ha lasciato una cosa scritta in
--  faccia nella schermata: «nessun movimento ancora: e' il saldo iniziale
--  dichiarato». Questa migrazione e' la riga che lo fa smettere di essere vero.
--
--  MISURATO PRIMA DI SCRIVERE, sul database vero:
--    · iam_conti        2 righe (tutte e due attive)
--    · iam_causali     10 righe (quelle di partenza)
--    · iam_movimenti    NON ESISTEVA
--    · sessioni_giornaliere 68 righe, dal 25/05/2026 al 16/09/2026 — il foglio
--      di cassa del giorno (contanti, versamenti, spese, fondo cassa, POS).
--      NON e' una prima nota: non sa su quale conto e' finito il denaro, non ha
--      una causale, e un giorno e' una riga sola. Resta dov'e' (la
--      riorganizzazione della Contabilita' e' la M5) e non si tocca qui.
--
--  LE CINQUE DECISIONI, e perche' ognuna.
--
--  1. L'IMPORTO E' SEMPRE POSITIVO. Il verso lo dice la CAUSALE, non chi
--     digita. Un «-50» in una riga «Incasso premi» e' un'uscita travestita da
--     entrata, e in un totale non si vede piu'. Il motore lo pretendeva gia'
--     (`versoDi` legge il segno dalla causale): qui lo pretende anche il
--     database, con un check.
--
--  2. UN MOVIMENTO NON SI CANCELLA: SI ANNULLA, CON IL MOTIVO. Una riga
--     cancellata lascia un buco che nessuno sa piu' spiegare — e in un registro
--     di denaro «non c'e'» e «e' stato tolto» sono due cose diverse. La riga
--     resta, esce dai totali, e lo storico dice perche'. Il divieto sta in un
--     TRIGGER, non nella schermata: la schermata e' una delle strade (c'e' la
--     console, c'e' PostgREST, ci sara' QUOTO).
--
--  3. LE DUE NATURE DEL DENARO NON SI MESCOLANO, E LO CONTROLLA IL DATABASE.
--     `Contabilita.compatibile` lo diceva gia' in pagina (art. 117 CAP: i premi
--     dei clienti stanno su un conto separato dal patrimonio dell'agenzia). Una
--     regola scritta solo nella schermata e' una regola che il primo script la
--     aggira: qui c'e' il trigger che rifiuta.
--
--  4. UN CONTO O UNA CAUSALE CON MOVIMENTI NON SI CANCELLANO. La M1 lo diceva
--     in pagina (`eliminabile`); adesso lo dice `on delete restrict`, che e'
--     il posto giusto — cancellare il conto renderebbe orfani dei movimenti che
--     sono successi davvero.
--
--  5. LA QUADRATURA E' UN FATTO DICHIARATO, NON UN CALCOLO. Il saldo
--     ricostruito lo sa il sistema (saldo iniziale + movimenti); quello vero lo
--     sa la banca o chi ha contato la cassa. `iam_quadrature` tiene il secondo,
--     con la data e chi l'ha dichiarato, e la differenza si legge. Senza una
--     dichiarazione non si dice «quadra»: si dice che non e' stata fatta. Sono
--     due cose diverse, ed e' la stessa regola di «non risponde» ≠ «non ce n'e'».
--
--  COSA NON C'E' ANCORA, ED E' VOLUTO. Il movimento che nasce da solo quando si
--  incassa una rata: `titolo_id` e `origine` ci sono gia', con l'indice unico
--  che impedisce di scriverlo due volte, ma a riempirli e' la M4 — e' li' che si
--  decide quale conto riceve un POS, un bonifico o dei contanti. Finche' quella
--  decisione non c'e', un movimento automatico sceglierebbe un conto a caso.
--
--  ROLLBACK (in ordine inverso, le dipendenze contano):
--    drop table if exists public.iam_quadrature;
--    drop table if exists public.iam_movimenti;
--    drop function if exists public.iam_movimenti_regole();
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── LA PRIMA NOTA ──────────────────────────────────────────────────────────
create table if not exists public.iam_movimenti (
  id               uuid primary key default gen_random_uuid(),

  -- La data CONTABILE: quando il denaro si e' mosso, non quando si e' digitato.
  -- Sono due cose diverse e si registra spesso il giorno dopo.
  data             date not null,

  conto_id         uuid not null references public.iam_conti(id)   on delete restrict,
  causale_id       uuid not null references public.iam_causali(id) on delete restrict,

  -- Decisione 1: sempre positivo. Lo zero non e' un movimento.
  importo          numeric(14,2) not null check (importo > 0),

  descrizione      text,
  -- Chi ha pagato o chi e' stato pagato. Testo libero apposta: una controparte
  -- puo' essere un cliente, una compagnia, il gestore della luce o il comune.
  controparte      text,
  -- Il numero di polizza, della fattura, del bonifico: quello che si cerca
  -- quando si torna a guardare questa riga fra sei mesi.
  riferimento      text,

  -- I tre agganci, tutti facoltativi e tutti `set null`: cancellare una persona
  -- o una polizza non cancella un movimento di denaro che e' avvenuto.
  collaboratore_id uuid references public.quote_collaboratori(id) on delete set null,
  polizza_id       uuid references public.quote_polizze(id)       on delete set null,
  titolo_id        uuid references public.quote_titoli(id)        on delete set null,

  -- Da dove viene la riga. `manuale` = l'ha scritta una persona; `titolo` =
  -- l'ha generata l'incasso di una rata (M4); `flusso` = l'ha portata la
  -- compagnia. Una riga che non si distingue da quelle scritte a mano e' una
  -- riga di cui non ci si puo' fidare.
  origine          text not null default 'manuale'
                   check (origine in ('manuale', 'titolo', 'flusso')),

  -- Decisione 2: si annulla, non si cancella. E il motivo e' obbligatorio.
  annullato_il     timestamptz,
  annullato_da     uuid,
  annullato_perche text,
  constraint iam_movimenti_annullo_col_motivo
    check (annullato_il is null or coalesce(btrim(annullato_perche), '') <> ''),

  nota             text,
  creato_il        timestamptz not null default now(),
  creato_da        uuid default auth.uid(),
  aggiornato_il    timestamptz not null default now()
);

comment on table public.iam_movimenti is
  'Prima nota: i movimenti dei conti dell''agenzia. Importo sempre positivo, il verso lo dice la causale. Non si cancella: si annulla col motivo.';

-- Il saldo di un conto si legge per conto e per data: e' la lettura che fa
-- ogni schermata di questo brief.
create index if not exists iam_movimenti_conto_data on public.iam_movimenti (conto_id, data desc);
create index if not exists iam_movimenti_data       on public.iam_movimenti (data desc);
create index if not exists iam_movimenti_causale    on public.iam_movimenti (causale_id);
create index if not exists iam_movimenti_collab     on public.iam_movimenti (collaboratore_id) where collaboratore_id is not null;

-- Una rata incassata genera UN movimento, mai due. La garanzia non sta nel
-- codice che controlla prima di scrivere: sta qui, in Postgres, che dice di no.
-- (Vale sulle righe vive: un movimento annullato e rifatto e' legittimo.)
create unique index if not exists iam_movimenti_titolo_uno
  on public.iam_movimenti (titolo_id)
  where titolo_id is not null and annullato_il is null;

-- ─── LE REGOLE CHE NON POSSONO STARE SOLO NELLA SCHERMATA ───────────────────
create or replace function public.iam_movimenti_regole() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n_conto   text;
  n_causale text;
  nome_c    text;
  nome_k    text;
begin
  select natura, nome into n_conto,   nome_c from public.iam_conti   where id = new.conto_id;
  select natura, nome into n_causale, nome_k from public.iam_causali where id = new.causale_id;

  /* Decisione 3. Una causale a natura NULL vale su tutti i conti, ed e' il caso
     delle spese bancarie: il bollo lo addebita anche la banca del conto premi,
     e vietarlo vorrebbe dire non poter registrare un fatto accaduto. */
  if n_causale is not null and n_conto is not null and n_causale <> n_conto then
    raise exception 'La causale «%» vale sui conti «%» e «%» e'' un conto «%». I premi dei clienti e i soldi dell''agenzia non si mescolano (art. 117 CAP).',
      nome_k, n_causale, nome_c, n_conto;
  end if;

  /* Un movimento gia' annullato non si modifica piu': e' storia. Si puo' solo
     riaprirlo (togliere l'annullamento), che e' una correzione dichiarata. */
  if tg_op = 'UPDATE' and old.annullato_il is not null and new.annullato_il is not null
     and (old.importo, old.data, old.conto_id, old.causale_id)
         is distinct from (new.importo, new.data, new.conto_id, new.causale_id) then
    raise exception 'Questo movimento e'' annullato: non si corregge. Riaprilo, oppure registrane uno nuovo.';
  end if;

  new.aggiornato_il := now();
  return new;
end $$;

drop trigger if exists iam_movimenti_regole_trg on public.iam_movimenti;
create trigger iam_movimenti_regole_trg
  before insert or update on public.iam_movimenti
  for each row execute function public.iam_movimenti_regole();

/* Decisione 2, il divieto vero. */
create or replace function public.iam_movimenti_no_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'Un movimento non si cancella: si annulla, con il motivo. Una riga sparita lascia un buco che nessuno sa piu'' spiegare.';
end $$;

drop trigger if exists iam_movimenti_no_delete_trg on public.iam_movimenti;
create trigger iam_movimenti_no_delete_trg
  before delete on public.iam_movimenti
  for each row execute function public.iam_movimenti_no_delete();

-- ─── LA QUADRATURA: IL SALDO CHE DICE LA BANCA ──────────────────────────────
create table if not exists public.iam_quadrature (
  id                uuid primary key default gen_random_uuid(),
  conto_id          uuid not null references public.iam_conti(id) on delete cascade,
  -- A quale giorno si riferisce il saldo dichiarato. Non «quando l'ho scritto»:
  -- un estratto conto del 31/08 si carica il 5/09 e vale per il 31/08.
  data              date not null,
  -- Quello che dice la banca, o quello che si e' contato in cassa.
  saldo_dichiarato  numeric(14,2) not null,
  nota              text,
  creato_il         timestamptz not null default now(),
  creato_da         uuid default auth.uid()
);

comment on table public.iam_quadrature is
  'Il saldo dichiarato di un conto a una data (estratto conto, conta della cassa). Il saldo ricostruito lo calcola il motore: qui sta il termine di paragone.';

-- Una quadratura per conto e per giorno: due saldi dichiarati per lo stesso
-- giorno sono due verita' in disaccordo, e nessuno saprebbe quale guardare.
create unique index if not exists iam_quadrature_conto_data
  on public.iam_quadrature (conto_id, data);

-- ─── CHI LEGGE E CHI SCRIVE ─────────────────────────────────────────────────
-- La stessa soglia della M1 e della M2: legge lo staff (chi registra un
-- movimento deve poter vedere quelli di ieri), scrive l'admin, perche' qui si
-- dice dove sono finiti dei soldi.
alter table public.iam_movimenti  enable row level security;
alter table public.iam_quadrature enable row level security;

drop policy if exists movimenti_select on public.iam_movimenti;
create policy movimenti_select on public.iam_movimenti
  for select using (public.iam_is_staff());

drop policy if exists movimenti_write on public.iam_movimenti;
create policy movimenti_write on public.iam_movimenti
  for all using (public.iam_is_admin()) with check (public.iam_is_admin());

drop policy if exists quadrature_select on public.iam_quadrature;
create policy quadrature_select on public.iam_quadrature
  for select using (public.iam_is_staff());

drop policy if exists quadrature_write on public.iam_quadrature;
create policy quadrature_write on public.iam_quadrature
  for all using (public.iam_is_admin()) with check (public.iam_is_admin());

-- ─── NIENTE SEED ────────────────────────────────────────────────────────────
-- La prima nota nasce vuota, e deve. Inventare dei movimenti per far vedere una
-- schermata piena vorrebbe dire scrivere nella contabilita' di un'agenzia dei
-- fatti che non sono successi (regola di casa §8.1, applicata al denaro).
