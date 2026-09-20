-- ═══════════════════════════════════════════════════════════════════════════
--  IL CATALOGO PRODOTTI — libreria standard e prodotti di compagnia
--  20/09/2026 · brief «Anagrafica compagnie e catalogo prodotti»
--
--  ┌─ CHE COSA TOCCA ────────────────────────────────────────────────────────┐
--  │ SOLO AGGIUNTE. Due tabelle nuove, una funzione, un seme.                │
--  │ NESSUNA colonna di una tabella esistente viene aggiunta, cambiata o     │
--  │ tolta: `quote_polizze`, `quote_pratiche`, `iam_provvigioni_tariffa` e   │
--  │ `iam_provvigioni_collaboratore` restano IDENTICHE, e continuano a       │
--  │ identificare il prodotto per stringa.                                   │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ┌─ ROLLBACK (vale per tutto il file) ─────────────────────────────────────┐
--  │   drop table if exists iam_compagnia_prodotti;                          │
--  │   drop table if exists iam_prodotti_standard;                           │
--  │   drop function if exists iam_nome_norm(text);                          │
--  │ Non c'e' niente da ricostruire: nessun dato preesistente e' stato       │
--  │ toccato, quindi tornare indietro e' togliere quello che si e' messo.    │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ── COME LE TARIFFE A STRINGA SI RIALLACCIANO, SENZA ROMPERE NIENTE ──────
--
--  Misurato sul database il 20/09/2026, PRIMA di scrivere:
--
--    iam_provvigioni_tariffa .......... 0 righe
--    iam_provvigioni_collaboratore .... 0 righe
--    quote_polizze .................... 30 righe, 5 coppie (compagnia, prodotto)
--    quote_pratiche ................... 2 righe, 1 coppia
--    quote_compagnie .................. 9 compagnie (alias solo su HDI e Prima)
--
--  Quindi: NELLE TARIFFE NON C'E' NIENTE DA ROMPERE. Le stringhe che contano
--  davvero stanno sulle 32 righe di portafoglio, e sono:
--
--    PRIMA            / rca     / BLACK                              (23)
--    HDI Assicurazioni/ persona / RC Vita Privata · HDI               (3)
--    HDI Assicurazioni/ beni    / Rischi Catastrofali Abitazione (HDI)(2)
--    PRIMA            / beni    / CASA_E_FAMIGLIA                     (1)
--    PRIMA            / beni    / FAMIGLIA                            (1)
--    (nessuna)        / rca     / RC Auto                             (2, pratiche)
--
--  La strada scelta e' che le due tabelle nascono ACCANTO, e nessuna colonna
--  diventa `prodotto_id` oggi:
--
--    1. il catalogo si riempie — a mano dalla schermata, e da solo
--       dall'importazione (che marca `origine='import'`, `da_verificare`);
--    2. una vista di COPERTURA dice quante righe di portafoglio hanno gia'
--       trovato il loro prodotto e quali no (`Catalogo.copertura`);
--    3. solo quando quella copertura e' piena si valuta una colonna
--       `prodotto_id`, con la sua migrazione e il suo backfill.
--
--  Convertire oggi vorrebbe dire mettere una chiave esterna verso una tabella
--  VUOTA su 32 righe che funzionano: si romperebbe quello che c'e' per
--  agganciarlo a quello che non c'e' ancora. E il riallaccio non si perde per
--  strada — la chiave di ricerca (compagnia normalizzata + ramo + nome
--  normalizzato, con gli alias) e' la stessa che usa il motore, quindi una
--  polizza scritta ieri ritrova il suo prodotto il giorno in cui il prodotto
--  esiste, senza che nessuno riscriva la polizza.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── La normalizzazione, e perché sta anche qui ────────────────────────────
--  L'indice unico deve dire la STESSA cosa del codice. Se la normalizzazione
--  di Postgres e quella del motore divergono, il database accetta un doppione
--  che il codice credeva impossibile — ed e' il modo in cui un catalogo
--  comincia a contenere due volte lo stesso prodotto senza che nessuno se ne
--  accorga. Questa funzione e' la copia esatta di `norm()` in
--  tariffe/motore/catalogo.js: minuscole, accenti sciolti, tutto cio' che non
--  e' lettera o cifra diventa uno spazio, gli spazi si comprimono.
create or replace function iam_nome_norm(t text) returns text
language sql immutable parallel safe as $$
  select btrim(regexp_replace(
    translate(lower(coalesce(t, '')),
              'àáâäãèéêëìíîïòóôöõùúûüçñ',
              'aaaaaeeeeiiiiooooouuuucn'),
    '[^a-z0-9]+', ' ', 'g'));
$$;

comment on function iam_nome_norm(text) is
  'Normalizza un nome per il confronto: copia esatta di norm() in tariffe/motore/catalogo.js. Se le due divergono, il database accetta un doppione che il codice credeva impossibile.';

-- ═══════════════════════════════════════════════════════════════════════════
--  1. LA LIBRERIA DEI PRODOTTI STANDARD
--
--  Il nostro vocabolario: «RC Auto» e' RC Auto per chiunque. Il ramo qui NON
--  e' una parola nuova — e' la chiave dei moduli che tutta la casa usa gia'
--  (MODULES in index.html, quote_polizze.modulo): rca, beni, vita, persona,
--  tutela, impresa, rcprof, cauzioni, salute, animali, viaggio. Inventarne un
--  secondo vocabolario vorrebbe dire due elenchi che non si incrociano.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists iam_prodotti_standard (
  id            uuid primary key default gen_random_uuid(),
  ramo          text        not null,
  nome          text        not null,
  codice        text,
  attivo        boolean     not null default true,
  ordine        integer     not null default 100,
  note          text,
  creato_il     timestamptz not null default now(),
  creato_da     uuid        default auth.uid(),
  aggiornato_il timestamptz,
  aggiornato_da uuid
);

-- Due volte «RC Auto» sullo stesso ramo non e' un errore di battitura da
-- correggere dopo: e' un catalogo che da quel momento non sa piu' dire qual e'
-- quello buono.
create unique index if not exists ux_prodstd_ramo_nome
  on iam_prodotti_standard (ramo, iam_nome_norm(nome));
create index if not exists ix_prodstd_attivo
  on iam_prodotti_standard (attivo) where attivo;

-- ═══════════════════════════════════════════════════════════════════════════
--  2. I PRODOTTI DI COMPAGNIA
--
--  Come QUELLA compagnia chiama quel prodotto: PRIMA chiama «BLACK» la sua
--  RC Auto. Il NOME COMMERCIALE e' della compagnia; il RAMO resta quello
--  standard della libreria, perche' due rami per lo stesso prodotto sono due
--  elenchi che non si incrociano.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists iam_compagnia_prodotti (
  id            uuid primary key default gen_random_uuid(),
  -- `restrict` e non `cascade`: cancellare una compagnia non deve portarsi via
  -- in silenzio il suo catalogo, con le polizze che ci puntano per nome.
  compagnia_id  uuid        not null references quote_compagnie(id) on delete restrict,
  -- Nullable, ed e' il punto: «BLACK» non somiglia a «RC Auto» in nessun modo
  -- che un programma possa vedere. L'aggancio lo decide una persona, e finche'
  -- non l'ha deciso il prodotto esiste lo stesso.
  prodotto_standard_id uuid  references iam_prodotti_standard(id) on delete set null,
  ramo          text        not null,
  nome          text        not null,
  -- Il nome scartato da una fusione finisce qui: e' l'unica cosa che impedisce
  -- all'importazione della notte dopo di ricrearlo come nuovo.
  alias         text[]      not null default '{}',
  codice        text,
  attivo        boolean     not null default true,
  dal           date,
  al            date,
  origine       text        not null default 'manuale'
                check (origine in ('manuale', 'import')),
  da_verificare boolean     not null default false,
  note          text,
  creato_il     timestamptz not null default now(),
  creato_da     uuid        default auth.uid(),
  aggiornato_il timestamptz,
  aggiornato_da uuid,
  -- Una validita' che finisce prima di cominciare non e' una data da
  -- correggere dopo: e' un prodotto che non e' mai stato vendibile.
  constraint ck_compprod_validita check (dal is null or al is null or al >= dal)
);

create unique index if not exists ux_compprod_comp_ramo_nome
  on iam_compagnia_prodotti (compagnia_id, ramo, iam_nome_norm(nome));
create index if not exists ix_compprod_compagnia
  on iam_compagnia_prodotti (compagnia_id);
create index if not exists ix_compprod_attivo
  on iam_compagnia_prodotti (attivo) where attivo;
-- La vista «da verificare» e' una coda di lavoro: deve essere veloce anche
-- quando il catalogo sara' grande, perche' e' quella che si apre ogni giorno.
create index if not exists ix_compprod_daverificare
  on iam_compagnia_prodotti (da_verificare) where da_verificare;
create index if not exists ix_compprod_standard
  on iam_compagnia_prodotti (prodotto_standard_id);

-- ═══════════════════════════════════════════════════════════════════════════
--  3. CHI LEGGE E CHI SCRIVE
--
--  LEGGERE: chiunque abbia un accesso. Un catalogo di prodotti non e' un dato
--  su una persona — quei nomi stanno gia' scritti sulle polizze che un
--  collaboratore vede e nelle tendine da cui quota. Tenerlo allo staff
--  vorrebbe dire che il giorno in cui le tendine lo leggono, a un
--  collaboratore esce una tendina vuota. E' la stessa scelta di
--  `quote_compagnie`, che legge `true`.
--
--  SCRIVERE: l'admin, come per i conti e le causali (§26) e i codici
--  collaboratore (§19) — qui si decide che cosa si vende e su quale nome sono
--  scritte le regole documentali e le tariffe.
--
--  L'ECCEZIONE, ed e' dichiarata: l'importazione la lancia lo staff, e deve
--  poter REGISTRARE quello che ha trovato. Quindi lo staff puo' inserire una
--  riga SOLO se nasce `origine='import'` e `da_verificare=true`, cioe' come
--  una cosa da guardare — non puo' decidere niente, e non puo' correggere una
--  riga esistente. Il permesso di gestione resta all'amministrazione.
-- ═══════════════════════════════════════════════════════════════════════════
alter table iam_prodotti_standard  enable row level security;
alter table iam_compagnia_prodotti enable row level security;

drop policy if exists prodstd_select on iam_prodotti_standard;
create policy prodstd_select on iam_prodotti_standard
  for select to authenticated using (true);

drop policy if exists prodstd_write on iam_prodotti_standard;
create policy prodstd_write on iam_prodotti_standard
  for all to authenticated using (iam_is_admin()) with check (iam_is_admin());

drop policy if exists compprod_select on iam_compagnia_prodotti;
create policy compprod_select on iam_compagnia_prodotti
  for select to authenticated using (true);

drop policy if exists compprod_insert on iam_compagnia_prodotti;
create policy compprod_insert on iam_compagnia_prodotti
  for insert to authenticated
  with check (
    iam_is_admin()
    or (iam_is_staff() and origine = 'import' and da_verificare = true)
  );

drop policy if exists compprod_update on iam_compagnia_prodotti;
create policy compprod_update on iam_compagnia_prodotti
  for update to authenticated using (iam_is_admin()) with check (iam_is_admin());

drop policy if exists compprod_delete on iam_compagnia_prodotti;
create policy compprod_delete on iam_compagnia_prodotti
  for delete to authenticated using (iam_is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
--  4. IL SEME DELLA LIBRERIA
--
--  Sono i sei del brief, e nient'altro. Il ramo di ognuno e' quello che il
--  sistema usa gia': RC Auto/Moto/Autocarri stanno su `rca` (il modulo
--  «Motor»), Casa e Casa e Famiglia su `beni`, Infortuni su `persona`.
--
--  NON si seminano i prodotti di compagnia: quelli esistono davvero sul
--  portafoglio, e portarli dentro e' una cosa che si GUARDA PRIMA DI
--  SCRIVERE (§14). Lo fa la schermata, che elenca che cosa creerebbe.
-- ═══════════════════════════════════════════════════════════════════════════
insert into iam_prodotti_standard (ramo, nome, codice, ordine) values
  ('rca',     'RC Auto',         'RCA',  10),
  ('rca',     'RC Moto',         'RCM',  20),
  ('rca',     'RC Autocarri',    'RCC',  30),
  ('beni',    'Casa e Famiglia', 'CEF',  40),
  ('beni',    'Casa',            'CASA', 50),
  ('persona', 'Infortuni',       'INF',  60)
on conflict do nothing;

comment on table iam_prodotti_standard is
  'La libreria dei prodotti standard: il nostro vocabolario. Il ramo usa le chiavi dei moduli (rca, beni, vita, persona, tutela, impresa, rcprof, cauzioni, salute, animali, viaggio).';
comment on table iam_compagnia_prodotti is
  $c$Come ogni compagnia chiama i suoi prodotti. Nome commerciale della compagnia, ramo della libreria. Non si elimina: si disattiva, perché le polizze che ci sono sotto sono storia.$c$;
