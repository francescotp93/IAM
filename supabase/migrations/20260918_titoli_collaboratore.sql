-- ═══════════════════════════════════════════════════════════════════════════════
--  DI CHI È QUESTA RATA (18/09/2026)
--
--  Oggi una rata non sa di chi è. C'è `creato_da`, ma quello è CHI HA DIGITATO
--  LA RIGA: sul portafoglio arrivato dal flusso della compagnia è l'utente che
--  ha fatto l'importazione — cioè una persona sola, su tutte le rate. Usarlo
--  per pagare le provvigioni vorrebbe dire attribuire l'intero portafoglio a
--  chi ha premuto un bottone.
--
--  Serve un dato suo: chi segue quella rata, chi la incassa, chi ci guadagna.
--
--  ┌─────────────────────────────────────────────────────────────────────────┐
--  │ PERCHÉ SULLA RATA E NON SULLA POLIZZA.                                  │
--  │                                                                         │
--  │ Una polizza vive anni e può cambiare mano: il collaboratore che l'ha    │
--  │ portata non è sempre quello che incassa la quietanza del terzo anno.    │
--  │ La rata è la granularità con cui si paga e con cui si sollecita, quindi │
--  │ è la granularità a cui l'informazione appartiene. Metterla sulla        │
--  │ polizza obbligherebbe a riscrivere la storia per cambiare il futuro.    │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  NIENTE DEDUZIONI AUTOMATICHE. La colonna nasce vuota su tutto il pregresso
--  e la riempie una persona (una rata alla volta o in blocco dalla pagina
--  Titoli). Il flusso della compagnia porta un codice collaboratore e un'email
--  (`dati.ssf.collaboratore`, `.collaboratore_email`), e sarebbe comodo
--  agganciarli da soli: ma quel codice non corrisponde a nessuna persona in
--  agenzia se non per somiglianza, e un aggancio sbagliato qui diventa una
--  provvigione pagata alla persona sbagliata. Chi abbina lo decide una persona,
--  ed è la stessa regola del registro unico (CLAUDE.md §10).
--
--  SOLO AGGIUNTE. Non tocca niente di esistente, e una rata senza
--  collaboratore continua a funzionare come ha sempre funzionato.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.quote_titoli
  add column if not exists collaboratore_id uuid references public.quote_collaboratori(id) on delete set null;

comment on column public.quote_titoli.collaboratore_id is
  'Chi segue questa rata: la incassa, e su di essa matura la sua provvigione. NON e'' `creato_da`, che e'' chi ha digitato la riga (sulle polizze importate, una persona sola su tutte). Vuota finche'' non la riempie una persona: il codice collaboratore del flusso non si aggancia da solo, perche'' un aggancio sbagliato qui e'' una provvigione pagata a chi non doveva.';

-- L'estratto conto interroga sempre «le rate di questa persona in questo
-- periodo»: senza indice diventa una scansione di tutta la tabella a ogni
-- apertura della schermata.
create index if not exists quote_titoli_collab_idx on public.quote_titoli(collaboratore_id);
create index if not exists quote_titoli_collab_incasso_idx
  on public.quote_titoli(collaboratore_id, incassato_il) where stato = 'incassato';

-- ── IL VINCOLO DI STATO, allineato a quello che il codice scrive ────────────
-- `quote_titoli.stato` ammette quattro valori, ma il codice ne scrive un
-- quinto: `annullato` (`annullaPolizzaDiPreventivo`, e `polRicalcolaPagamento`
-- che lo rilegge). O quell'update falliva in silenzio contro il vincolo, o
-- esisteva una migrazione mai finita nel repository — in tutti e due i casi
-- oggi c'e' un codice che scrive un valore che la tabella dice di non
-- accettare, ed e' esattamente il genere di cosa che si scopre quando serve.
--
-- Si allarga il vocabolario invece di cambiare il codice: `annullato` e'
-- un'informazione vera (la polizza e' stata annullata, quella rata non la deve
-- piu' nessuno) e ha un senso diverso da `stornato`, che e' una rata ritirata
-- dalla compagnia. L'estratto conto li tratta allo stesso modo — fuori dai
-- sospesi — ma chi legge lo storico deve poterli distinguere.
alter table public.quote_titoli drop constraint if exists quote_titoli_stato_check;
alter table public.quote_titoli add constraint quote_titoli_stato_check
  check (stato in ('aperto','incassato','insoluto','stornato','annullato'));

-- ═══════════════════════════════════════════════════════════════════════════════
--  PER TORNARE INDIETRO
--
--   drop index if exists public.quote_titoli_collab_incasso_idx;
--   drop index if exists public.quote_titoli_collab_idx;
--   alter table public.quote_titoli drop column if exists collaboratore_id;
--   alter table public.quote_titoli drop constraint if exists quote_titoli_stato_check;
--   alter table public.quote_titoli add constraint quote_titoli_stato_check
--     check (stato in ('aperto','incassato','insoluto','stornato'));
--
--  ATTENZIONE sul vincolo: restringerlo fallisce se nel frattempo qualche rata
--  e' finita in stato `annullato`. Prima si guarda:
--    select stato, count(*) from quote_titoli group by 1;
-- ═══════════════════════════════════════════════════════════════════════════════
