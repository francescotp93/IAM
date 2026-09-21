-- ═══════════════════════════════════════════════════════════════════════════════
--  CONTABILITÀ · FASE 1 — LE FONDAMENTA A PARTITA DOPPIA (21/09/2026)
--
--  Specifica: `CLAUDE_CODE_IAM_CONTABILITA_SEMPLIFICATA.md`
--  Piano e misure: `CONTABILITA-PIANO.md`
--
--  ┌─────────────────────────────────────────────────────────────────────────┐
--  │ PERCHÉ ADESSO, E PERCHÉ NON FRA UN MESE.                                │
--  │                                                                         │
--  │ Misurato il 21/09/2026, prima di scrivere una riga:                     │
--  │                                                                         │
--  │     iam_movimenti     1 riga                                            │
--  │     iam_quadrature    0                                                 │
--  │     iam_sospesi       0                                                 │
--  │                                                                         │
--  │ La prima nota contiene UN movimento. Non c'è niente da migrare, e il    │
--  │ modello si cambia a costo quasi zero. Con qualche centinaio di          │
--  │ movimenti scritti sarebbe una migrazione di dati con il rischio di      │
--  │ riscrivere numeri che qualcuno ha già letto e usato.                    │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ┌─────────────────────────────────────────────────────────────────────────┐
--  │ LE REGOLE LE FA IL DATABASE, NON LA SCHERMATA.                          │
--  │                                                                         │
--  │ La schermata è UNA delle strade: c'è la console, c'è PostgREST, ci      │
--  │ sarà QUOTO. Una regola contabile scritta solo nella pagina è una        │
--  │ regola che si aggira senza volerlo. Qui sotto sono trigger e vincoli.   │
--  │                                                                         │
--  │  1. una riga ha Dare OPPURE Avere, mai tutti e due, e l'importo > 0     │
--  │  2. un movimento `registrato` ha somma Dare = somma Avere               │
--  │  3. un movimento `registrato` non si aggiorna e non si cancella         │
--  │  4. `chiave_idempotenza` unica: doppio clic e retry non duplicano       │
--  │  5. nessuna colonna `saldo`: i saldi si calcolano dalle righe           │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  CHE COSA **NON** FA QUESTA MIGRAZIONE, ed è voluto:
--
--  · NON crea nessun conto. I dodici conti minimi della specifica §5 si
--    PROPONGONO in schermata, non si seminano: scriverli qui vorrebbe dire
--    mettere nella contabilità dell'agenzia dei conti che nessuno ha deciso,
--    e la regola di casa §8.1 sul denaro non fa eccezioni. Sono in
--    `Contabilita.CONTI_MINIMI`, e la schermata offre «crea questi».
--  · NON tocca `iam_movimenti.conto_id` e `.importo`. Restano, e diventano il
--    DERIVATO della riga singola: cinque schermate li leggono e ci sono 34
--    prove sopra. Si spengono quando quelle schermate leggeranno le righe.
--  · NON aggiunge `organization_id`. Misurato: zero colonne tenant in tutto
--    il database e `iam_azienda` ha una riga. Una colonna che vale sempre lo
--    stesso valore non isola niente, e le prove di «isolamento fra tenant»
--    proverebbero una cosa che non esiste. L'isolamento qui è per RUOLO.
--
--  ── ROLLBACK ──────────────────────────────────────────────────────────────
--    drop function if exists public.iam_movimento_registra(jsonb, jsonb);
--    drop trigger if exists iam_mov_righe_bilancio_trg on public.iam_movimenti_righe;
--    drop trigger if exists iam_mov_immutabile_trg    on public.iam_movimenti;
--    drop trigger if exists iam_mov_no_delete_trg     on public.iam_movimenti;
--    drop trigger if exists iam_mov_righe_bloccate_trg on public.iam_movimenti_righe;
--    drop function if exists public.iam_mov_bilancio();
--    drop function if exists public.iam_mov_immutabile();
--    drop function if exists public.iam_mov_no_delete();
--    drop function if exists public.iam_mov_righe_bloccate();
--    drop table if exists public.iam_movimenti_righe;
--    alter table public.iam_movimenti
--      drop column if exists stato,
--      drop column if exists numero,
--      drop column if exists chiave_idempotenza,
--      drop column if exists storno_di_movimento_id,
--      drop column if exists registrato_da,  drop column if exists registrato_il,
--      drop column if exists stornato_da,    drop column if exists stornato_il,
--      drop column if exists storno_perche;
--    alter table public.iam_conti
--      drop column if exists e_mezzo_pagamento, drop column if exists e_conto_sospeso,
--      drop column if exists e_quadrabile,      drop column if exists compagnia_id,
--      drop column if exists collaboratore_id;
--    alter table public.iam_causali drop column if exists genere;
--    alter table public.iam_movimenti drop constraint if exists iam_movimenti_origine_check;
--    alter table public.iam_movimenti add constraint iam_movimenti_origine_check
--      check (origine in ('manuale','titolo','flusso','sospeso'));
--    -- e il vincolo di tipologia torna ai quattro valori di partenza:
--    alter table public.iam_conti drop constraint if exists iam_conti_tipologia_check;
--    alter table public.iam_conti add constraint iam_conti_tipologia_check
--      check (tipologia in ('banca','cassa','conto_assicurativo','altro'));
-- ═══════════════════════════════════════════════════════════════════════════════

begin;

-- ═══ 1. I CONTI: LE PROPRIETÀ CHE DECIDONO COME SI COMPORTANO ═══════════════
--
-- La specifica §5 chiede tre flag. Due di questi IAM li aveva già in forma
-- implicita e vengono resi espliciti; il terzo è nuovo e vale più degli altri.
--
-- `e_quadrabile` è la regola che AssiEasy chiama «carta canta»: si mette in
-- quadratura SOLO un conto che si può confrontare con qualcosa di reale — il
-- denaro nel cassetto, gli assegni, l'estratto conto della banca. Un conto che
-- non ha una carta contro cui confrontarsi non si quadra, e chiedere di
-- quadrarlo vorrebbe dire pretendere un numero che nessuno può verificare.
-- Oggi si quadra tutto, e questo è il difetto che il flag chiude.

alter table public.iam_conti
  add column if not exists e_mezzo_pagamento boolean not null default false,
  add column if not exists e_conto_sospeso   boolean not null default false,
  add column if not exists e_quadrabile      boolean not null default true,
  add column if not exists compagnia_id      uuid references public.quote_compagnie(id)   on delete set null,
  add column if not exists collaboratore_id  uuid references public.quote_collaboratori(id) on delete set null;

comment on column public.iam_conti.e_mezzo_pagamento is
  'Compare fra le modalità di pagamento quando si incassa un premio.';
comment on column public.iam_conti.e_conto_sospeso is
  'È un conto di crediti: il premio è a copertura e il denaro non è ancora arrivato dal cliente o dal collaboratore.';
comment on column public.iam_conti.e_quadrabile is
  'Si può confrontare con una realtà verificabile (cassetto, assegni, estratto conto). Quello che non si può contare non si quadra.';

-- I conti già configurati dichiarano i mezzi nella colonna `mezzi`: il flag
-- nuovo si allinea a quello che quei conti già dicono di sé, invece di
-- pretendere che qualcuno li riapra tutti e sei.
update public.iam_conti
   set e_mezzo_pagamento = true
 where mezzi is not null and array_length(mezzi, 1) > 0;

-- Le tipologie: ne servono quattro in più per i dodici conti minimi della
-- specifica. I quattro valori di prima restano e nessuna riga si muove.
alter table public.iam_conti drop constraint if exists iam_conti_tipologia_check;
alter table public.iam_conti add constraint iam_conti_tipologia_check
  check (tipologia in ('banca','cassa','conto_assicurativo',
                       'transitorio','credito','debito','rettifica','altro'));


-- ═══ 2. LE CAUSALI: DA QUALE FLUSSO NASCE UN MOVIMENTO ══════════════════════
--
-- `segno` dice il verso, `genere` dice CHI l'ha generato. Serve a due cose che
-- senza diventano indovinelli: proporre la causale giusta nel flusso giusto, e
-- riconoscere un movimento che il sistema ha scritto da sé — che non si
-- corregge dalla prima nota ma dove è nato (regola già in casa, CLAUDE.md §29).

alter table public.iam_causali
  add column if not exists genere text not null default 'manuale'
    check (genere in ('incasso_premio','apertura_credito','recupero_credito',
                      'manuale','giroconto','storno'));

comment on column public.iam_causali.genere is
  'Il flusso che genera i movimenti con questa causale. «manuale» = scritta a mano in prima nota.';


-- ═══ 3. IL MOVIMENTO: TESTATA ══════════════════════════════════════════════
--
-- `conto_id` e `importo` RESTANO, e da qui in avanti sono il derivato della
-- riga singola. Toglierli oggi vorrebbe dire riscrivere `saldo`, `quadratura`,
-- `giornata`, `dettaglioConto` e `anomalie` nello stesso colpo — cinque
-- funzioni con 34 prove sopra — e farlo mentre si cambia il modello è il modo
-- di non sapere più quale delle due cose ha rotto l'altra.

alter table public.iam_movimenti
  add column if not exists stato text not null default 'registrato'
    check (stato in ('bozza','registrato','stornato')),
  add column if not exists numero bigint,
  add column if not exists chiave_idempotenza text,
  add column if not exists storno_di_movimento_id uuid references public.iam_movimenti(id) on delete restrict,
  add column if not exists registrato_da uuid,
  add column if not exists registrato_il timestamptz,
  add column if not exists stornato_da   uuid,
  add column if not exists stornato_il   timestamptz,
  add column if not exists storno_perche text;

-- Il numero progressivo è quello che si legge ad alta voce al telefono
-- («movimento 47»). Una sequenza e non un conteggio: `max(numero)+1` fra due
-- richieste in parallelo dà lo stesso numero a due movimenti diversi.
-- `origine` ammetteva quattro valori e lo storno non c'era: senza questa riga
-- il primo storno sarebbe morto contro un vincolo, in una schermata che
-- aveva appena detto «sì, si può stornare». Il vocabolario si allarga, non si
-- cambia: i quattro di prima restano e nessuna riga si muove.
alter table public.iam_movimenti drop constraint if exists iam_movimenti_origine_check;
alter table public.iam_movimenti add constraint iam_movimenti_origine_check
  check (origine in ('manuale','titolo','flusso','sospeso','storno'));

create sequence if not exists public.iam_movimenti_numero_seq owned by public.iam_movimenti.numero;
alter table public.iam_movimenti alter column numero set default nextval('public.iam_movimenti_numero_seq');

-- Alle righe già scritte si dà un numero, una volta sola.
update public.iam_movimenti set numero = nextval('public.iam_movimenti_numero_seq') where numero is null;

-- Doppio clic e retry non devono produrre due movimenti. La chiave la mette
-- chi scrive; dove è nulla il vincolo non si applica — un movimento scritto a
-- mano in prima nota non ne ha bisogno.
create unique index if not exists iam_movimenti_idem_uq
  on public.iam_movimenti (chiave_idempotenza)
  where chiave_idempotenza is not null;

create index if not exists iam_movimenti_stato_idx  on public.iam_movimenti (stato, data desc);
create index if not exists iam_movimenti_storno_idx on public.iam_movimenti (storno_di_movimento_id)
  where storno_di_movimento_id is not null;


-- ═══ 4. LE RIGHE: DARE E AVERE ═════════════════════════════════════════════
--
-- Una riga ha Dare OPPURE Avere. Non è pignoleria: una riga che porta tutti e
-- due i valori si può sempre leggere come la loro differenza, e allora due
-- righe diverse darebbero lo stesso saldo — con la conseguenza che un totale
-- sbagliato non si distingue più da uno giusto guardando le cifre.

create table if not exists public.iam_movimenti_righe (
  id               uuid primary key default gen_random_uuid(),
  movimento_id     uuid not null references public.iam_movimenti(id) on delete cascade,
  conto_id         uuid not null references public.iam_conti(id)     on delete restrict,
  dare             numeric(14,2) not null default 0,
  avere            numeric(14,2) not null default 0,
  descrizione      text,
  ordine           integer not null default 0,

  -- Le dimensioni che IAM usa già dappertutto: si ripetono sulla riga perché
  -- un movimento può toccare due clienti o due compagnie, e attribuirlo tutto
  -- a quello scritto in testata direbbe una cosa falsa sulla seconda riga.
  compagnia_id     uuid references public.quote_compagnie(id)     on delete set null,
  cliente_id       uuid references public.quote_anagrafiche(id)   on delete set null,
  collaboratore_id uuid references public.quote_collaboratori(id) on delete set null,
  polizza_id       uuid references public.quote_polizze(id)       on delete set null,
  titolo_id        uuid references public.quote_titoli(id)        on delete set null,

  creato_il        timestamptz not null default now(),

  -- Regola 1, e sta nel database perché è il posto in cui non si aggira.
  constraint iam_righe_dare_o_avere check (
    (dare > 0 and avere = 0) or (avere > 0 and dare = 0)
  )
);

create index if not exists iam_righe_movimento_idx on public.iam_movimenti_righe (movimento_id);
create index if not exists iam_righe_conto_idx     on public.iam_movimenti_righe (conto_id);

comment on table public.iam_movimenti_righe is
  'Le righe Dare/Avere di un movimento. Una riga ha Dare oppure Avere, mai tutti e due.';


-- ═══ 5. I TRE TRIGGER, CHE SONO IL CUORE DELLA FASE 1 ══════════════════════

-- 5.1 — Somma Dare = somma Avere su un movimento REGISTRATO.
--
-- Si controlla `constraint trigger ... deferrable initially deferred`: le
-- righe arrivano una alla volta, e dopo la prima il movimento è per forza
-- sbilanciato. Controllare subito vorrebbe dire non poterne scrivere nessuna.
-- Il controllo vero si fa quando la transazione chiude — che è esattamente il
-- momento in cui il movimento è finito.
create or replace function public.iam_mov_bilancio()
returns trigger language plpgsql as $$
declare
  m record;
  d numeric(14,2);
  a numeric(14,2);
  n integer;
begin
  select * into m from public.iam_movimenti
   where id = coalesce(new.movimento_id, old.movimento_id);
  -- Il movimento può essere stato cancellato nella stessa transazione: allora
  -- non c'è niente da bilanciare.
  if m.id is null then return null; end if;
  if m.stato <> 'registrato' then return null; end if;

  select coalesce(sum(dare),0), coalesce(sum(avere),0), count(*)
    into d, a, n
    from public.iam_movimenti_righe where movimento_id = m.id;

  if n = 0 then
    raise exception 'Il movimento % non ha righe: un movimento registrato ne ha almeno due.', m.numero;
  end if;
  if n < 2 then
    raise exception 'Il movimento % ha una riga sola: la partita doppia ne vuole almeno due.', m.numero;
  end if;
  if d <> a then
    raise exception 'Il movimento % non quadra: Dare % contro Avere %. La differenza è %.',
      m.numero, d, a, (d - a);
  end if;
  return null;
end $$;

drop trigger if exists iam_mov_righe_bilancio_trg on public.iam_movimenti_righe;
create constraint trigger iam_mov_righe_bilancio_trg
  after insert or update or delete on public.iam_movimenti_righe
  deferrable initially deferred
  for each row execute function public.iam_mov_bilancio();


-- 5.2 — Un movimento REGISTRATO non si riscrive.
--
-- Si correggono solo le colonne dello storno e dell'annullamento: il resto —
-- data, importo, conto, causale — è storia. Chi si è sbagliato registra uno
-- storno, che è un fatto nuovo e si vede.
create or replace function public.iam_mov_immutabile()
returns trigger language plpgsql as $$
begin
  if old.stato = 'registrato' and (
       new.data              is distinct from old.data              or
       new.conto_id          is distinct from old.conto_id          or
       new.causale_id        is distinct from old.causale_id        or
       new.importo           is distinct from old.importo           or
       new.numero            is distinct from old.numero            or
       new.chiave_idempotenza is distinct from old.chiave_idempotenza
     ) then
    raise exception 'Il movimento % è registrato e non si modifica: per correggerlo si registra uno storno.', old.numero;
  end if;
  return new;
end $$;

drop trigger if exists iam_mov_immutabile_trg on public.iam_movimenti;
create trigger iam_mov_immutabile_trg before update on public.iam_movimenti
  for each row execute function public.iam_mov_immutabile();


-- 5.3 — Un movimento REGISTRATO non si cancella.
--
-- «Non c'è» e «è stato tolto» sono due cose diverse, e in un registro di
-- denaro la seconda deve restare leggibile. È la stessa regola già scritta
-- per l'annullamento (CLAUDE.md §29, regola 5), qui portata sulla DELETE.
create or replace function public.iam_mov_no_delete()
returns trigger language plpgsql as $$
begin
  if old.stato in ('registrato','stornato') then
    raise exception 'Il movimento % non si cancella: si annulla o si storna, e resta a registro.', old.numero;
  end if;
  return old;
end $$;

drop trigger if exists iam_mov_no_delete_trg on public.iam_movimenti;
create trigger iam_mov_no_delete_trg before delete on public.iam_movimenti
  for each row execute function public.iam_mov_no_delete();


-- 5.4 — E le righe di un movimento registrato non si toccano.
--
-- Senza questo, l'immutabilità della testata sarebbe una porta chiusa con la
-- finestra aperta: si lascia la testata com'è e si riscrivono gli importi.
create or replace function public.iam_mov_righe_bloccate()
returns trigger language plpgsql as $$
declare st text;
begin
  select stato into st from public.iam_movimenti
   where id = coalesce(new.movimento_id, old.movimento_id);
  -- Se il movimento sta sparendo nella stessa transazione (cascade), non c'è
  -- niente da difendere.
  if st is null then return coalesce(new, old); end if;
  if st in ('registrato','stornato') then
    raise exception 'Le righe di un movimento registrato non si modificano: per correggerlo si registra uno storno.';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists iam_mov_righe_bloccate_trg on public.iam_movimenti_righe;
create trigger iam_mov_righe_bloccate_trg
  before update or delete on public.iam_movimenti_righe
  for each row execute function public.iam_mov_righe_bloccate();


-- ═══ 6. CHI VEDE E CHI SCRIVE ══════════════════════════════════════════════
--
-- Le righe ereditano la visibilità del loro movimento: la regola di chi può
-- vedere un movimento è UNA, e sta già su `iam_movimenti`. Riscriverla qui
-- vorrebbe dire averne due, e quella che sbaglia sarebbe quella che nessuno
-- guarda. È la stessa scelta di `iam_archivio` (§15) e del registro (§18).

alter table public.iam_movimenti_righe enable row level security;

drop policy if exists righe_select on public.iam_movimenti_righe;
create policy righe_select on public.iam_movimenti_righe
  for select using (iam_is_staff());

drop policy if exists righe_write on public.iam_movimenti_righe;
create policy righe_write on public.iam_movimenti_righe
  for all using (iam_is_admin()) with check (iam_is_admin());


-- ═══ 7. SCRIVERE UN MOVIMENTO È UNA COSA SOLA ══════════════════════════════
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ PERCHÉ UNA FUNZIONE, E NON DUE SCRITTURE DALLA PAGINA.                  │
-- │                                                                         │
-- │ La testata e le righe sono due tabelle, e dalla pagina sarebbero due    │
-- │ richieste. Se cade la seconda, resta una testata SENZA righe: un        │
-- │ movimento che c'è, che si legge, che sembra a posto, e che non dice da  │
-- │ dove viene il denaro. È esattamente la forma dei movimenti scritti      │
-- │ prima della partita doppia — solo che quelli sono storia dichiarata, e  │
-- │ questo sarebbe un guasto travestito da storia.                          │
-- │                                                                         │
-- │ Ed è lo stesso ragionamento dell'importazione del portafoglio           │
-- │ (CLAUDE.md §47): un'importazione a metà CHE SI DICHIARA è recuperabile, │
-- │ una che SEMBRA FINITA è un archivio sbagliato di cui nessuno sa il      │
-- │ perché. Qui la garanzia è Postgres, non il codice della pagina.         │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- `security invoker` (il default, scritto per non lasciarlo al caso): le
-- politiche valgono per CHI CHIAMA. Una funzione che scavalcasse la RLS
-- sarebbe una seconda regola su chi può scrivere in contabilità, e quella
-- che sbaglia sarebbe quella che nessuno guarda.
create or replace function public.iam_movimento_registra(
  p_movimento jsonb,
  p_righe     jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id      uuid;
  v_chiave  text := nullif(p_movimento->>'chiave_idempotenza', '');
  v_storno  uuid := nullif(p_movimento->>'storno_di_movimento_id', '')::uuid;
  v_stato   text;
  r         jsonb;
  n         integer := 0;
  d         numeric(14,2) := 0;
  a         numeric(14,2) := 0;
begin
  -- Idempotenza: doppio clic, rete che cade, tasto premuto due volte. Il
  -- secondo giro NON è un errore e non è un secondo movimento: è lo stesso
  -- movimento, e si restituisce il suo id.
  if v_chiave is not null then
    select id into v_id from public.iam_movimenti where chiave_idempotenza = v_chiave;
    if v_id is not null then return v_id; end if;
  end if;

  if jsonb_typeof(p_righe) <> 'array' or jsonb_array_length(p_righe) < 2 then
    raise exception 'Un movimento a partita doppia ha almeno due righe: da dove esce il denaro e dove entra.';
  end if;

  -- Uno storno si fa una volta sola, e solo su un movimento registrato.
  if v_storno is not null then
    select stato into v_stato from public.iam_movimenti where id = v_storno;
    if v_stato is null then
      raise exception 'Il movimento da stornare non esiste.';
    end if;
    if v_stato <> 'registrato' then
      raise exception 'Il movimento da stornare è «%»: si storna solo un movimento registrato.', v_stato;
    end if;
  end if;

  insert into public.iam_movimenti (
      data, conto_id, causale_id, importo, descrizione, controparte, riferimento,
      collaboratore_id, polizza_id, titolo_id, nota, origine, stato,
      chiave_idempotenza, storno_di_movimento_id, storno_perche,
      registrato_da, registrato_il)
  values (
      (p_movimento->>'data')::date,
      (p_movimento->>'conto_id')::uuid,
      (p_movimento->>'causale_id')::uuid,
      (p_movimento->>'importo')::numeric,
      nullif(p_movimento->>'descrizione', ''),
      nullif(p_movimento->>'controparte', ''),
      nullif(p_movimento->>'riferimento', ''),
      nullif(p_movimento->>'collaboratore_id', '')::uuid,
      nullif(p_movimento->>'polizza_id', '')::uuid,
      nullif(p_movimento->>'titolo_id', '')::uuid,
      nullif(p_movimento->>'nota', ''),
      coalesce(nullif(p_movimento->>'origine', ''), 'manuale'),
      coalesce(nullif(p_movimento->>'stato', ''), 'registrato'),
      v_chiave, v_storno, nullif(p_movimento->>'storno_perche', ''),
      auth.uid(), now())
  returning id into v_id;

  for r in select * from jsonb_array_elements(p_righe) loop
    insert into public.iam_movimenti_righe (
        movimento_id, conto_id, dare, avere, descrizione, ordine,
        compagnia_id, cliente_id, collaboratore_id, polizza_id, titolo_id)
    values (
        v_id,
        (r->>'conto_id')::uuid,
        coalesce((r->>'dare')::numeric, 0),
        coalesce((r->>'avere')::numeric, 0),
        nullif(r->>'descrizione', ''),
        coalesce((r->>'ordine')::integer, n),
        nullif(r->>'compagnia_id', '')::uuid,
        nullif(r->>'cliente_id', '')::uuid,
        nullif(r->>'collaboratore_id', '')::uuid,
        nullif(r->>'polizza_id', '')::uuid,
        nullif(r->>'titolo_id', '')::uuid);
    d := d + coalesce((r->>'dare')::numeric, 0);
    a := a + coalesce((r->>'avere')::numeric, 0);
    n := n + 1;
  end loop;

  -- Il trigger differito prende comunque tutto quello che passa di qui e
  -- tutto quello che NON passa di qui. Questo controllo esiste per il
  -- messaggio: un errore che dice «Dare 400 contro Avere 390, mancano 10»
  -- manda a correggere una riga; «violazione del vincolo» manda a chiedere.
  if d <> a then
    raise exception 'Il movimento non quadra: Dare % contro Avere %, differenza %.', d, a, (d - a);
  end if;

  -- Lo storno e il movimento stornato sono un fatto solo: o si scrivono
  -- tutti e due o non si scrive niente. Con due richieste separate, cadendo
  -- la seconda, resterebbe uno storno che non storna nulla — e il saldo
  -- sarebbe rovesciato due volte.
  if v_storno is not null then
    update public.iam_movimenti
       set stato = 'stornato',
           stornato_da = auth.uid(),
           stornato_il = now(),
           storno_perche = coalesce(nullif(p_movimento->>'storno_perche', ''), storno_perche)
     where id = v_storno;
  end if;

  return v_id;
end $$;

comment on function public.iam_movimento_registra(jsonb, jsonb) is
  'Scrive testata e righe di un movimento in una sola transazione. Idempotente sulla chiave. Se la testata porta storno_di_movimento_id, marca l''originale come stornato nello stesso colpo.';

commit;

-- ── CONTROLLI, da leggere dopo ────────────────────────────────────────────
--
--  1. Un movimento sbilanciato viene rifiutato (deve dare errore):
--       begin;
--         insert into iam_movimenti (data, conto_id, causale_id, importo, descrizione)
--           select current_date, c.id, k.id, 100, 'prova'
--             from iam_conti c, iam_causali k limit 1
--           returning id;
--         -- una riga sola da 100 in Dare, e basta
--       commit;   -- ← deve fallire: «non quadra» oppure «una riga sola»
--
--  2. Nessun conto è stato creato da questa migrazione (deve dire 6):
--       select count(*) from iam_conti;
--
--  3. Il movimento che c'era ha preso il suo numero (deve dire 1 riga, numero 1):
--       select numero, stato from iam_movimenti;
