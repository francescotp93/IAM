-- ═══════════════════════════════════════════════════════════════════════════
--  PROFILI COLLABORATORE — blocco 2.4/2.5 delle specifiche del 31/08/2026
--  APPLICATA in produzione il 31/08/2026 (progetto ekjxrnsfqxnfxzrthdcf).
--  Conteggi prima e dopo: iam_utenti 5, iam_team 12, quote_collaboratori 2.
-- ═══════════════════════════════════════════════════════════════════════════
--
--  Perche' due colonne e non tre sistemi.
--
--  Il documento chiede UN SOLO concetto di profilo, da cui dipendono in
--  configurazione le voci di menu visibili, i prodotti quotabili e i permessi.
--  Il profilo che conta davvero e' quello di chi fa login, quindi vive su
--  iam_utenti: e' li' che applicaPermessi() e goTab() vanno a leggere.
--
--  Nessun vincolo CHECK sui valori ammessi, ed e' voluto: l'elenco dei profili
--  sta nella costante PROFILI di index.html. Aggiungerne uno domani deve essere
--  una riga di configurazione, non una migrazione di produzione.

-- ─── 1. Il profilo di chi fa login ────────────────────────────────────────
alter table public.iam_utenti add column if not exists profilo  text;
alter table public.iam_utenti add column if not exists prodotti text[];

comment on column public.iam_utenti.profilo is
  'Profilo collaboratore: previdenza_vita | dealer_iscritto | segnalatore | null (nessun taglio, valgono i permessi del ruolo). I valori ammessi stanno nella configurazione PROFILI del codice, non in un vincolo CHECK, cosi'' aggiungere un profilo domani non richiede una migrazione.';
comment on column public.iam_utenti.prodotti is
  'Prodotti specifici del dealer, piu'' fini di un modulo (es. il solo rc_moto dentro il modulo rca). NON e'' il permesso che il preventivatore applica oggi: quello e'' iam_utenti.moduli, che il profilo riempie da solo. Questa colonna resta vuota finche'' il preventivatore non sapra'' leggerla.';

--  NOTA sui prodotti quotabili, scritta qui perche' non si perda.
--  iam_utenti.moduli ESISTE GIA' ed e' quello che il preventivatore legge per
--  decidere quali moduli mostrare (renderModules, lato QUOTO). Il profilo si
--  limita a riempirlo: nessun meccanismo nuovo, nessun secondo elenco da tenere
--  d'accordo con il primo. La colonna `prodotti` qui sopra serve al caso piu'
--  fine del dealer — un solo prodotto DENTRO un modulo — e oggi nessuno la
--  legge: e' predisposizione, non funzione attiva.

-- ─── 2. Il registro della persona ─────────────────────────────────────────
--  quote_collaboratori esisteva gia' e copriva quasi tutta la scheda prospect
--  chiesta dal documento (stato candidato/attivo/scartato, diario note, CV,
--  foto, portafoglio dichiarato, compagnie). Non si duplica in iam_team: si
--  completa con cio' che manca.
alter table public.quote_collaboratori add column if not exists provincia text;
alter table public.quote_collaboratori add column if not exists profilo   text;

comment on column public.quote_collaboratori.provincia is
  'Sigla provincia (RM, PA, MI...). Serve al filtro della barra Collaboratori: citta'' da sola non basta a raggruppare.';
comment on column public.quote_collaboratori.profilo is
  'Profilo previsto per questa persona. Su un candidato e'' una previsione; alla conferma si copia su iam_utenti.profilo e diventa il permesso vero.';

-- ─── 3. Il ponte fra i due elenchi ────────────────────────────────────────
--  La scheda economica punta alla persona, non viceversa: la persona esiste
--  prima (da candidato), la scheda economica nasce solo alla firma.
alter table public.iam_team add column if not exists collab_id uuid;

comment on column public.iam_team.collab_id is
  'Riferimento a quote_collaboratori.id: la stessa persona nel registro anagrafico. Vuoto sulle schede create prima del collegamento.';

create index if not exists iam_team_collab_id_idx          on public.iam_team (collab_id);
create index if not exists quote_collaboratori_stato_idx   on public.quote_collaboratori (stato);


-- ═══════════════════════════════════════════════════════════════════════════
--  ROLLBACK — reversibile senza perdita finche' i campi non sono popolati.
--  Se sono gia' stati assegnati profili, prima esportare:
--    select id, email, profilo, prodotti from iam_utenti where profilo is not null;
-- ═══════════════════════════════════════════════════════════════════════════
-- drop index if exists public.quote_collaboratori_stato_idx;
-- drop index if exists public.iam_team_collab_id_idx;
-- alter table public.iam_team            drop column if exists collab_id;
-- alter table public.quote_collaboratori drop column if exists profilo;
-- alter table public.quote_collaboratori drop column if exists provincia;
-- alter table public.iam_utenti          drop column if exists prodotti;
-- alter table public.iam_utenti          drop column if exists profilo;
