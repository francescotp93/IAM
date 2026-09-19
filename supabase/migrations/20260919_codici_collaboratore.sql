-- ═══════════════════════════════════════════════════════════════════════════════
--  IL CODICE DELLA COMPAGNIA È UNA PERSONA — MA LO DICE UNA PERSONA (19/09/2026)
--
--  `quote_titoli.collaboratore_id` esiste dal 18/09 e su tutto il pregresso è
--  vuota: 55 rate su 55. Finché resta così l'estratto conto di ognuno è vuoto e
--  il riepilogo d'agenzia ha una riga sola.
--
--  MISURATO PRIMA DI SCRIVERE, il 19/09/2026, sul database vero:
--
--    · 55 rate, 0 assegnate, 17 arrivate dal flusso e 38 nate in QUOTO
--    · 25 polizze su 30 portano un codice collaboratore della compagnia
--      (`dati.ssf.collaboratore`), 11 codici distinti, tutti di PRIMA
--    · `creato_da` su TUTTE e 55 le rate è UN SOLO utente — anche sulle 38 che
--      non vengono dal flusso. Attribuire da lì darebbe l'intero portafoglio a
--      chi ha premuto un bottone, che è esattamente quello che il commento di
--      `20260918_titoli_collaboratore.sql` diceva di non fare
--    · nel verbale dell'importazione `collaboratori` è `[]`, e sulle polizze non
--      c'è nessuna `collaboratore_email`: il nome e l'indirizzo di quei codici
--      NON SONO NEL DATABASE
--
--  Conclusione, e non è un'opinione: **non esiste in questo sistema un dato che
--  dica chi è `U25274`.** Qualunque assegnazione automatica sarebbe inventata, e
--  una provvigione inventata è pagata a chi non doveva.
--
--  ┌─────────────────────────────────────────────────────────────────────────┐
--  │ QUELLO CHE SI FA INVECE: SI CHIEDE UNA VOLTA SOLA.                      │
--  │                                                                         │
--  │ Il codice della compagnia è stabile: `U25274` sarà `U25274` anche nel   │
--  │ flusso di stanotte e in quello di fra un anno. Quindi la domanda «chi è │
--  │ U25274» si fa UNA volta, la risposta si scrive qui, e da quel momento   │
--  │ vale per il pregresso e per tutto quello che arriverà.                  │
--  │                                                                         │
--  │ Non è la deduzione automatica che il 18/09 si era esclusa: lì il        │
--  │ sistema INDOVINAVA, qui APPLICA una decisione presa da una persona e    │
--  │ firmata. Sono due cose diverse, e la differenza sta tutta in questa     │
--  │ tabella.                                                                │
--  └─────────────────────────────────────────────────────────────────────────┘
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.quote_codici_collaboratore (
  -- La chiave è la COPPIA. Due compagnie possono usare lo stesso codice per due
  -- persone diverse, e su una tabella a codice solo la seconda sovrascriverebbe
  -- la prima senza che nessuno se ne accorga.
  compagnia        text not null,
  codice           text not null,

  -- Chi è. `on delete set null` e non `restrict`: bloccare la cancellazione di
  -- una persona con un errore di Postgres che nessuno capisce è peggio che
  -- lasciare la riga scoperta — e una riga scoperta si VEDE (§ sotto).
  collaboratore_id uuid references public.quote_collaboratori(id) on delete set null,

  -- «Questo codice non è di nessun collaboratore» è una DECISIONE (la produzione
  -- diretta dell'agenzia), e va distinta da «non l'ho ancora deciso».
  -- Confonderle vorrebbe dire riproporre ogni volta un codice già guardato, e
  -- chi rivede sempre le stesse righe smette di guardarle.
  nessuno          boolean not null default false,

  -- QUESTA COLONNA ESISTE PER UNA RIGA CHE NON È UNA DECISIONE.
  -- L'importazione del flusso scrive qui le evidenze (nome, email, RUI) appena
  -- le trova, perché servono a riconoscere il codice la prima volta che lo si
  -- guarda. Ma una riga di sole evidenze NON è «deciso da nessuno»: è «non
  -- ancora deciso», e senza questo interruttore le due cose sarebbero
  -- indistinguibili da una riga la cui persona è stata cancellata. Tre stati
  -- diversi collassati in uno, e quello che si perde è l'unico che chiede
  -- attenzione.
  deciso           boolean not null default false,

  -- Le evidenze che il flusso porta con sé, quando le porta. Servono a
  -- RICONOSCERE il codice, non a decidere al posto di nessuno: restano qui
  -- accanto alla decisione e non la sostituiscono mai.
  nome_flusso      text,
  email_flusso     text,
  -- Il RUI è il numero con cui l'intermediario è iscritto al registro: è
  -- l'unico campo del flusso che dice CHI È una persona invece di dove la si
  -- scrive. Per questo le proposte lo guardano per primo e l'email dopo.
  rui_flusso       text,
  -- `CODICE_PRODUTTORE` di REC101: come la compagnia lo chiama nei suoi
  -- discorsi. Può non coincidere con `codice` (`ID_ANAGRAFICA_EXP`), che è la
  -- chiave con cui le polizze lo nominano — e chi deve riconoscere una persona
  -- ha bisogno di tutti e due.
  produttore_flusso text,

  note             text,
  -- Chi ha firmato la decisione. Su una tabella che governa dei pagamenti è la
  -- colonna che conta: fra sei mesi «chi ha detto che U25274 è Mario» deve avere
  -- una risposta, e non può essere «non si sa».
  deciso_da        uuid,
  deciso_il        timestamptz not null default now(),

  primary key (compagnia, codice)
);

comment on table public.quote_codici_collaboratore is
  'Il ponte fra il codice collaboratore che manda la compagnia (SSF `COLLABORATORE_1`) e la persona in agenzia. Lo riempie UNA PERSONA, una volta per codice: il sistema non lo indovina, perche'' un aggancio sbagliato qui e'' una provvigione pagata a chi non doveva. Una riga con `collaboratore_id` nullo e `nessuno` falso non e'' una decisione: e'' una decisione RIMASTA SCOPERTA perche'' quella persona e'' stata cancellata, e la schermata la mostra da ridecidere.';

comment on column public.quote_codici_collaboratore.nessuno is
  'true = deciso che questo codice non e'' di nessun collaboratore (produzione diretta dell''agenzia). Diverso dall''assenza della riga, che vuol dire «non ancora deciso».';

comment on column public.quote_codici_collaboratore.deciso is
  'true = una persona ha deciso. false = la riga c''e'' solo per le evidenze che il flusso ha portato. Distingue «non ancora deciso» da «deciso, ma la persona e'' stata cancellata»: senza, le due cose si leggono uguali.';

comment on column public.quote_codici_collaboratore.email_flusso is
  'L''indirizzo che il flusso dichiara per questo codice. E'' un''EVIDENZA per riconoscere la persona, non un aggancio: l''abbinamento lo conferma qualcuno.';

create index if not exists quote_codici_collab_idx
  on public.quote_codici_collaboratore(collaboratore_id);

-- ── CHI VEDE E CHI DECIDE ────────────────────────────────────────────────────
--  In lettura lo staff: questa tabella è l'elenco di chi c'è nella rete, e
--  §17 «Chi vede chi» vale identica — un collaboratore non deve vedere la mappa
--  di tutti gli altri.
--
--  In scrittura l'ADMIN, e non lo staff: qui si decide a chi vanno dei soldi.
--  È la stessa distinzione che regge `iam_utenti`.
alter table public.quote_codici_collaboratore enable row level security;

drop policy if exists codcol_select on public.quote_codici_collaboratore;
create policy codcol_select on public.quote_codici_collaboratore
  for select using (iam_is_staff());

drop policy if exists codcol_write on public.quote_codici_collaboratore;
create policy codcol_write on public.quote_codici_collaboratore
  for all to authenticated using (iam_is_admin()) with check (iam_is_admin());

-- ═══════════════════════════════════════════════════════════════════════════════
--  PER TORNARE INDIETRO
--
--   drop table if exists public.quote_codici_collaboratore;
--
--  Le assegnazioni già applicate alle rate NON tornano indietro da sole, ed è
--  voluto: `quote_titoli.collaboratore_id` è il dato, questa tabella è solo il
--  modo con cui ci si è arrivati. Per disfare un'assegnazione si toglie il
--  collaboratore dalle rate, dalla pagina Titoli, dove si vede quante sono.
-- ═══════════════════════════════════════════════════════════════════════════════
