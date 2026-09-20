-- ═══════════════════════════════════════════════════════════════════════════
--  SOSPENSIONI E FIDO — Blocco 3 · punti 3 e 6  (20/09/2026)
--
--  ┌─ CHE COSA TOCCA ────────────────────────────────────────────────────────┐
--  │ SOLO AGGIUNTE, e tutte nullable o con un default vuoto. Nessuna colonna │
--  │ esistente viene cambiata o tolta, nessun dato viene riscritto, nessun   │
--  │ valore viene inventato: le tre colonne nascono vuote e le riempie una   │
--  │ persona.                                                                │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ┌─ ROLLBACK ──────────────────────────────────────────────────────────────┐
--  │   drop index if exists ix_polizze_sospese;                              │
--  │   alter table quote_polizze       drop column if exists sospensioni;    │
--  │   alter table quote_collaboratori drop column if exists fido;           │
--  │   alter table quote_compagnie     drop column if exists sospensione_giorni_max; │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ── PERCHÉ NON SI SEMINA NIENTE ──────────────────────────────────────────
--  Quanto può durare una sospensione lo decide la compagnia, e ogni compagnia
--  ha il suo. Quanto denaro dell'agenzia può tenere un collaboratore lo decide
--  l'agenzia, persona per persona. Scrivere un numero «ragionevole» qui
--  dentro vorrebbe dire che da domani il sistema giudica dei crediti e delle
--  scadenze su una soglia che nessuno ha deciso — e quel numero, dopo due
--  settimane, diventa un dato (regola di casa §8.1).
--
--  Il motore lo sa: dove il limite non c'è, `Sospensione.limite` conta i
--  giorni e NON dà il giudizio, e `Sospensione.fidi` tiene la persona fuori
--  dai totali con il motivo scritto.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. LE SOSPENSIONI DI UNA POLIZZA ─────────────────────────────────────
--  Un elenco, non due date: una polizza può essere sospesa più volte nella
--  stessa annualità, e i giorni SI SOMMANO. Con una coppia di colonne «da» e
--  «a» la seconda sospensione cancellerebbe la prima, e i giorni recuperati
--  dal cliente sparirebbero senza che nessuno se ne accorga.
--  (Il commento non scrive i nomi di quelle due colonne: una prova li cerca
--   nel file, e trovarli in un commento la farebbe diventare rossa su una
--   migrazione corretta — è la trappola di CLAUDE.md §10, §12, §18, §26,
--   §29, §31, §33, §34.)
--
--  Forma di ogni elemento: { "dal": "2026-01-01", "al": "2026-03-02" }
--  `al` vuoto = ancora ferma.
--
--  La scadenza contrattuale NON si tocca: quella vera si CALCOLA sommando i
--  giorni (`Sospensione.stato`). Riscrivere `data_scadenza` vorrebbe dire
--  perdere per sempre quella scritta sul contratto.
alter table quote_polizze
  add column if not exists sospensioni jsonb not null default '[]'::jsonb;

comment on column quote_polizze.sospensioni is
  $c$Elenco delle sospensioni: [{dal, al}], `al` vuoto se ancora ferma. I giorni si sommano e spostano in avanti la scadenza EFFETTIVA; `data_scadenza` resta quella contrattuale. Regole in tariffe/motore/sospensione.js.$c$;

-- Le polizze sospese sono poche e si guardano ogni giorno: l'indice tiene
-- fuori le altre invece di scorrerle tutte.
create index if not exists ix_polizze_sospese
  on quote_polizze using gin (sospensioni)
  where sospensioni <> '[]'::jsonb;

-- ── 2. IL LIMITE DELLA COMPAGNIA ─────────────────────────────────────────
--  Nullable, e resta null finché qualcuno non lo scrive. Un limite «di
--  default» farebbe dichiarare fuori limite delle sospensioni che magari
--  quella compagnia ammette.
alter table quote_compagnie
  add column if not exists sospensione_giorni_max integer
  check (sospensione_giorni_max is null or sospensione_giorni_max > 0);

comment on column quote_compagnie.sospensione_giorni_max is
  $c$Quanti giorni al massimo questa compagnia ammette di sospensione. NULL = non dichiarato: il motore conta i giorni e non dà il giudizio.$c$;

-- ── 3. IL FIDO DI UNA PERSONA ────────────────────────────────────────────
--  Sta sulla PERSONA (`quote_collaboratori`) e non sulla scheda economica
--  (`iam_team`), ed è una scelta misurata: il credito dell'agenzia si calcola
--  su chi ha INCASSATO (`quote_titoli.pagatore_collaboratore_id`, che punta
--  alla persona), e chi ha incassato può non avere una scheda economica.
--  Mettendo il fido sulla scheda, una persona senza scheda risulterebbe senza
--  limite — in silenzio, che è il modo peggiore.
alter table quote_collaboratori
  add column if not exists fido numeric
  check (fido is null or fido >= 0);

comment on column quote_collaboratori.fido is
  $c$Quanto denaro dell'agenzia questa persona può tenere prima di rimetterlo. NULL = non dichiarato (≠ illimitato: esce dai totali col motivo). 0 = non ne tiene, ed è un accordo.$c$;
