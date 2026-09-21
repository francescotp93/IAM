-- ═══════════════════════════════════════════════════════════════════════════
--  LA MEMORIA DEGLI STATI DI COLLEGAMENTO — Blocco 3 · punto 12-bis (20/09/2026)
--
--  ┌─ CHE COSA TOCCA ────────────────────────────────────────────────────────┐
--  │ Una tabella NUOVA e basta. Nessuna colonna esistente cambiata, nessun   │
--  │ dato riscritto, nessuna riga seminata: nasce vuota e la riempie chi     │
--  │ guarda la schermata.                                                    │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ┌─ ROLLBACK ──────────────────────────────────────────────────────────────┐
--  │   drop table if exists iam_collegamenti_stato;                          │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ── PERCHÉ ESISTE ────────────────────────────────────────────────────────
--  La risposta del motore di QUOTO (`/fonti/salute`) è una FOTOGRAFIA: dice
--  com'è adesso e non tiene memoria. «Da quando questa compagnia è
--  scollegata» non aveva risposta da nessuna parte, ed è la domanda che
--  distingue un intoppo di dieci minuti da sei giorni di portafoglio non
--  quotato.
--
--  ── UNA RIGA PER FONTE, NON UN REGISTRO ──────────────────────────────────
--  Non è un diario degli eventi: è lo stato corrente con la data da cui dura.
--  Un registro riga-per-osservazione crescerebbe di migliaia di righe al
--  giorno e, per rispondere alla domanda, bisognerebbe comunque leggerne solo
--  l'ultima. Quello che si conserva del passato è un numero solo: quante volte
--  quella fonte ha cambiato stato.
--
--  ── `dal` È DA QUANDO SI GUARDA, E VA DETTO ──────────────────────────────
--  Di notte non guarda nessuno. Una compagnia caduta alle due risulta caduta
--  all'ora in cui qualcuno ha aperto la schermata. Il motore
--  (tariffe/motore/collegamenti.js) marca la prima osservazione e la schermata
--  lo scrive: «da quando» è una misura dell'osservazione, non del guasto.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists iam_collegamenti_stato (
  -- La chiave è la fonte: una riga per compagnia collegata al preventivatore.
  fonte       text primary key,
  nome        text,
  -- Quattro stati, non due: «non lo dice» è un'altra cosa da «non è dentro».
  stato       text not null check (stato in ('dentro', 'fuori', 'spento', 'boh')),
  -- Da quando dura QUESTO stato, per quel che se ne è potuto vedere.
  dal         timestamptz not null default now(),
  -- L'ultima volta che qualcuno ha guardato. Serve a distinguere «è così da
  -- tre giorni» da «nessuno la guarda da tre giorni», che sono due cose molto
  -- diverse e che senza questa colonna si leggerebbero uguali.
  visto_il    timestamptz not null default now(),
  cambi       integer not null default 0 check (cambi >= 0),
  messaggio   text
);

comment on table iam_collegamenti_stato is
  $c$Stato corrente del collegamento a ogni compagnia, con la data da cui dura. Non e' un registro degli eventi: una riga per fonte. `dal` e' da quando QUALCUNO HA GUARDATO e ha visto questo stato, non da quando e' successo — di notte non guarda nessuno. Regole in tariffe/motore/collegamenti.js.$c$;

alter table iam_collegamenti_stato enable row level security;

-- Legge chi fa parte dello staff: sapere che una compagnia non risponde serve
-- a chi prova a quotare, non solo a chi sistema le credenziali.
drop policy if exists cst_select on iam_collegamenti_stato;
create policy cst_select on iam_collegamenti_stato
  for select using (iam_is_staff());

-- Scrive chi puo' guardare la schermata, che e' riservata all'amministrazione
-- dal ponte verso QUOTO: e' l'osservazione a produrre la riga, quindi chi
-- osserva deve poterla scrivere. Nessun altro, perche' una riga scritta da
-- fuori direbbe «collegata da tre giorni» senza che nessuno l'abbia vista.
drop policy if exists cst_write on iam_collegamenti_stato;
create policy cst_write on iam_collegamenti_stato
  for all using (iam_is_admin()) with check (iam_is_admin());
