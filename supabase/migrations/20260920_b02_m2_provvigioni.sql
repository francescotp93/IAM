-- ═══════════════════════════════════════════════════════════════════════════════
--  BRIEF #02 · M2 — COMPAGNIE, PRODOTTI, PROVVIGIONI E GRUPPI (20/09/2026)
--
--  MISURATO PRIMA DI SCRIVERE, sul database vero. Quattro numeri, e ognuno ha
--  cambiato una decisione:
--
--  1. `iam_team.provv` — la configurazione provvigionale di oggi — ha in tutto
--     TRE righe su dodici schede. Una di quelle tre è VUOTA (`prodotto: ""`,
--     `perc: ""`). Le altre due dicono «Auto» e «RC AUTO»: due nomi per la
--     stessa cosa, e le percentuali sono STRINGHE, non numeri.
--     → non c'è niente da migrare che valga la pena. C'è da costruire.
--
--  2. I nomi dei prodotti sulle polizze sono testo libero e sporco:
--     «BLACK», «CASA_E_FAMIGLIA», «FAMIGLIA», «RC Vita Privata · HDI»,
--     «Rischi Catastrofali Abitazione (HDI)». Cinque prodotti, tre convenzioni
--     di scrittura. Il `modulo` invece è pulito: `rca`, `beni`, `persona`.
--     → la chiave della tariffa è COMPAGNIA + RAMO, e il prodotto è un
--       affinamento facoltativo. Agganciare per nome di prodotto vorrebbe dire
--       una tariffa che non trova mai la sua polizza.
--
--  3. I nomi delle compagnie sulle polizze non sono quelli del catalogo:
--     «HDI Assicurazioni» e «PRIMA» (maiuscolo) contro «HDI» e «Prima».
--     → il confronto è sul nome NORMALIZZATO (minuscole, spazi compressi), con
--       gli alias di `quote_compagnie`. Un confronto esatto non aggancerebbe
--       nemmeno una delle 23 polizze di Prima.
--
--  ┌─────────────────────────────────────────────────────────────────────────┐
--  │ 4. LA MISURA CHE COMANDA SU TUTTE.                                      │
--  │                                                                         │
--  │ Sul prodotto BLACK di PRIMA ci sono 13 rate con la provvigione          │
--  │ dichiarata, e portano DODICI ALIQUOTE DIVERSE: da 0,00% a 13,85%.       │
--  │                                                                         │
--  │ Su una RC Auto la provvigione cambia garanzia per garanzia (il flusso   │
--  │ lo dice in REC042), e il mix di garanzie cambia da polizza a polizza.   │
--  │ Quindi UNA PERCENTUALE PER PRODOTTO NON PUÒ CALCOLARE QUELLA            │
--  │ PROVVIGIONE. Chi la usasse per moltiplicare il premio otterrebbe un     │
--  │ numero credibile e sbagliato su quasi tutte le rate.                    │
--  │                                                                         │
--  │ Perciò l'aliquota che si configura qui NON calcola mai la provvigione   │
--  │ dove la compagnia l'ha dichiarata. Serve a due cose diverse:            │
--  │                                                                         │
--  │   · PREVEDERE dove la compagnia non dichiara niente — e succede: su     │
--  │     HDI sono 38 rate su 38 senza provvigione;                           │
--  │   · CONTROLLARE dove dichiara: uno scostamento fra quello che arriva e  │
--  │     quello pattuito è una cosa da guardare, non da correggere da soli.  │
--  │                                                                         │
--  │ Una provvigione PREVISTA si marca come tale fino in fondo, e non entra  │
--  │ nei totali insieme a quelle vere: «una riga stimata dentro un totale è  │
--  │ una lite che si perde» (CLAUDE.md §17).                                 │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  LA STORICIZZAZIONE (punto aperto 1 del brief, deciso: SI FA).
--  Ogni riga ha `dal` e `al`. Cambiare un'aliquota non riscrive il passato:
--  si chiude la riga vigente e se ne apre una nuova. Senza, il giorno in cui
--  si ritocca una percentuale tutti gli estratti conto già mandati cambiano
--  numero da soli, e quelli sono documenti su cui si litiga.
--
--  ROLLBACK: in fondo al file.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. LE TARIFFE DI AGENZIA ────────────────────────────────────────────────
create table if not exists public.iam_provvigioni_tariffa (
  id            uuid primary key default gen_random_uuid(),

  -- Il nome del catalogo (`quote_compagnie.nome`). Il confronto con quello
  -- scritto sulla polizza passa dagli alias e dalla normalizzazione: vedi la
  -- misura 3 in testa al file.
  compagnia     text not null,

  -- Il RAMO è il `modulo` della polizza: vocabolario chiuso e pulito.
  -- Non c'è un CHECK apposta: il vocabolario vive nel motore
  -- (`Provvigioni.RAMI`), e aggiungere un ramo domani non deve voler dire una
  -- migrazione. È la stessa scelta di `iam_utenti.profilo`.
  ramo          text not null,

  -- NULL = la riga vale per TUTTO il ramo. Valorizzato = affina su un prodotto
  -- solo, e allora vince sulla riga di ramo (più specifico batte più generico).
  prodotto      text,

  -- Quanto l'agenzia prende dalla compagnia, in percentuale sul PREMIO.
  -- NON serve a calcolare una provvigione già dichiarata (misura 4).
  aliquota_agenzia      numeric(6,3) check (aliquota_agenzia >= 0 and aliquota_agenzia <= 100),

  -- Quanto va al collaboratore, in percentuale sulla PROVVIGIONE DI AGENZIA
  -- (brief §2.3), mai sul premio. È il default: il singolo collaboratore può
  -- avere il suo override nella tabella qui sotto.
  retrocessione_default numeric(6,3) check (retrocessione_default >= 0 and retrocessione_default <= 100),

  -- LA VALIDITÀ. `al` NULL = ancora in vigore.
  dal           date not null default current_date,
  al            date,
  check (al is null or al >= dal),

  note          text,
  creato_da     uuid default auth.uid(),
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

-- Due righe vigenti per la stessa chiave sarebbero due risposte alla stessa
-- domanda, e il motore ne sceglierebbe una a caso. L'indice è parziale sulle
-- righe APERTE: lo storico può avere quante righe chiuse vuole.
create unique index if not exists iam_provv_tariffa_vigente_uni
  on public.iam_provvigioni_tariffa (lower(btrim(compagnia)), lower(btrim(ramo)), coalesce(lower(btrim(prodotto)), ''))
  where al is null;
create index if not exists iam_provv_tariffa_cerca
  on public.iam_provvigioni_tariffa (lower(btrim(compagnia)), lower(btrim(ramo)), dal);

-- ─── 2. GLI OVERRIDE PER COLLABORATORE ───────────────────────────────────────
--
--  «La retrocessione varia per singolo collaboratore» (brief §2.2). Questa
--  tabella dice l'eccezione; la regola sta in `retrocessione_default`.
create table if not exists public.iam_provvigioni_collaboratore (
  id               uuid primary key default gen_random_uuid(),

  collaboratore_id uuid not null references public.quote_collaboratori(id) on delete cascade,

  -- Tutti e tre NULL-abili: NULL vuol dire «qualunque». Un override senza
  -- compagnia né ramo è l'accordo generale con quella persona; con compagnia e
  -- ramo è l'accordo su quel ramo. Più campi valorizzati = più specifico, e il
  -- più specifico vince (la regola sta nel motore, non qui).
  compagnia        text,
  ramo             text,
  prodotto         text,

  -- Percentuale sulla PROVVIGIONE DI AGENZIA. `not null`: un override che non
  -- dice quanto non è un override, è una riga che confonde.
  retrocessione    numeric(6,3) not null check (retrocessione >= 0 and retrocessione <= 100),

  dal              date not null default current_date,
  al               date,
  check (al is null or al >= dal),

  note             text,
  creato_da        uuid default auth.uid(),
  creato_il        timestamptz not null default now(),
  aggiornato_il    timestamptz not null default now()
);

create unique index if not exists iam_provv_collab_vigente_uni
  on public.iam_provvigioni_collaboratore (
    collaboratore_id,
    coalesce(lower(btrim(compagnia)), ''),
    coalesce(lower(btrim(ramo)), ''),
    coalesce(lower(btrim(prodotto)), ''))
  where al is null;
create index if not exists iam_provv_collab_cerca
  on public.iam_provvigioni_collaboratore (collaboratore_id, dal);

-- ─── 3. I GRUPPI PRODUTTIVI ──────────────────────────────────────────────────
create table if not exists public.iam_gruppi (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,

  -- Il capo gruppo percepisce l'indiretto sulla produzione dei suoi.
  -- `on delete set null` e non `restrict`: se la persona sparisce il gruppo
  -- resta e si vede che è senza capo, invece di bloccare una cancellazione con
  -- un errore di Postgres che nessuno capisce (§19).
  capo_id       uuid references public.quote_collaboratori(id) on delete set null,

  -- Percentuale sulla PROVVIGIONE DI AGENZIA della produzione del gruppo.
  -- Il singolo membro può avere la sua, nella tabella qui sotto.
  indiretto     numeric(6,3) check (indiretto >= 0 and indiretto <= 100),

  attivo        boolean not null default true,
  dal           date not null default current_date,
  al            date,
  check (al is null or al >= dal),

  note          text,
  creato_da     uuid default auth.uid(),
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create unique index if not exists iam_gruppi_nome_uni on public.iam_gruppi (lower(btrim(nome))) where al is null;

create table if not exists public.iam_gruppi_membri (
  id               uuid primary key default gen_random_uuid(),
  gruppo_id        uuid not null references public.iam_gruppi(id) on delete cascade,
  collaboratore_id uuid not null references public.quote_collaboratori(id) on delete cascade,

  -- Override dell'indiretto per questo membro: il capo può prendere una
  -- percentuale diversa sulla produzione di uno rispetto agli altri.
  indiretto        numeric(6,3) check (indiretto >= 0 and indiretto <= 100),

  dal              date not null default current_date,
  al               date,
  check (al is null or al >= dal),

  creato_da        uuid default auth.uid(),
  creato_il        timestamptz not null default now()
);

-- Una persona in due gruppi vigenti vorrebbe dire due capi che prendono
-- l'indiretto sulla stessa produzione: il denaro uscirebbe due volte.
create unique index if not exists iam_gruppi_membri_uno_solo
  on public.iam_gruppi_membri (collaboratore_id) where al is null;
create index if not exists iam_gruppi_membri_gruppo on public.iam_gruppi_membri (gruppo_id, dal);

-- ─── CHI VEDE E CHI SCRIVE ───────────────────────────────────────────────────
--
--  Stessa soglia della M1 e dei codici collaboratore: qui si decide a chi
--  vanno dei soldi, quindi scrive l'admin. Legge lo staff, perché il foglio
--  cassa e l'estratto conto devono poter calcolare.
--
--  NOTA su chi NON legge: un collaboratore non vede questa tabella, e quindi
--  non vede la retrocessione dei colleghi. È la stessa ragione per cui la
--  tendina dei nomi nell'estratto conto è bloccata a chi non è staff (§17).
alter table public.iam_provvigioni_tariffa       enable row level security;
alter table public.iam_provvigioni_collaboratore enable row level security;
alter table public.iam_gruppi                    enable row level security;
alter table public.iam_gruppi_membri             enable row level security;

drop policy if exists provv_tariffa_select on public.iam_provvigioni_tariffa;
create policy provv_tariffa_select on public.iam_provvigioni_tariffa
  for select to authenticated using (public.iam_is_staff());
drop policy if exists provv_tariffa_write on public.iam_provvigioni_tariffa;
create policy provv_tariffa_write on public.iam_provvigioni_tariffa
  for all to authenticated using (public.iam_is_admin()) with check (public.iam_is_admin());

drop policy if exists provv_collab_select on public.iam_provvigioni_collaboratore;
create policy provv_collab_select on public.iam_provvigioni_collaboratore
  for select to authenticated using (public.iam_is_staff());
drop policy if exists provv_collab_write on public.iam_provvigioni_collaboratore;
create policy provv_collab_write on public.iam_provvigioni_collaboratore
  for all to authenticated using (public.iam_is_admin()) with check (public.iam_is_admin());

drop policy if exists gruppi_select on public.iam_gruppi;
create policy gruppi_select on public.iam_gruppi
  for select to authenticated using (public.iam_is_staff());
drop policy if exists gruppi_write on public.iam_gruppi;
create policy gruppi_write on public.iam_gruppi
  for all to authenticated using (public.iam_is_admin()) with check (public.iam_is_admin());

drop policy if exists gruppi_membri_select on public.iam_gruppi_membri;
create policy gruppi_membri_select on public.iam_gruppi_membri
  for select to authenticated using (public.iam_is_staff());
drop policy if exists gruppi_membri_write on public.iam_gruppi_membri;
create policy gruppi_membri_write on public.iam_gruppi_membri
  for all to authenticated using (public.iam_is_admin()) with check (public.iam_is_admin());

-- ─── `aggiornato_il` non si scrive a mano (come nella M1) ────────────────────
drop trigger if exists iam_provv_tariffa_tocca_trg on public.iam_provvigioni_tariffa;
create trigger iam_provv_tariffa_tocca_trg before update on public.iam_provvigioni_tariffa
  for each row execute function public.iam_tocca_aggiornato_il();
drop trigger if exists iam_provv_collab_tocca_trg on public.iam_provvigioni_collaboratore;
create trigger iam_provv_collab_tocca_trg before update on public.iam_provvigioni_collaboratore
  for each row execute function public.iam_tocca_aggiornato_il();
drop trigger if exists iam_gruppi_tocca_trg on public.iam_gruppi;
create trigger iam_gruppi_tocca_trg before update on public.iam_gruppi
  for each row execute function public.iam_tocca_aggiornato_il();

-- ─── NESSUN SEED ─────────────────────────────────────────────────────────────
--
--  Le tabelle nascono VUOTE, ed è una decisione. Su HDI non sappiamo niente
--  (38 rate su 38 senza provvigione dichiarata) e su Prima l'aliquota vera
--  varia da 0% a 13,85% sullo stesso prodotto: qualunque numero scritto qui
--  dentro da me sarebbe inventato, e un'aliquota inventata paga qualcuno.
--  Le scrive Francesco, che i mandati li ha firmati (regola di casa §8.1).
--
--  `iam_team.provv` NON si migra: tre righe, due nomi diversi per lo stesso
--  prodotto e una riga vuota. Resta dov'è finché l'estratto conto non legge da
--  qui — è un lavoro a sé, e va fatto quando c'è qualcosa da leggere.

-- ═══════════════════════════════════════════════════════════════════════════════
--  ROLLBACK (da incollare a mano, in quest'ordine)
--
--    drop table if exists public.iam_gruppi_membri;
--    drop table if exists public.iam_gruppi;
--    drop table if exists public.iam_provvigioni_collaboratore;
--    drop table if exists public.iam_provvigioni_tariffa;
--
--  Nessuna di queste tabelle è referenziata da altre: il rollback è pulito
--  finché l'estratto conto non comincia a leggerle. Da quel momento va rifatto
--  sapendo che i numeri già mandati fuori si ricalcolerebbero da un'altra
--  parte — che è esattamente quello che la storicizzazione esiste per evitare.
-- ═══════════════════════════════════════════════════════════════════════════════
