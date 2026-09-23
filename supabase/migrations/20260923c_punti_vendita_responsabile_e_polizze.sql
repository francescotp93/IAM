-- ═══════════════════════════════════════════════════════════════════════════
--  PUNTI VENDITA: IL RESPONSABILE, E LA POLIZZA CHE NE PORTA UNO  (23/09/2026)
--
--  Tre richieste di Francesco:
--    · «devo poter mettere un intermediario, e poter scegliere un
--      intermediario di primo livello (responsabile) e poi poter aggiungere
--      chi sta sotto»;
--    · «se la polizza si deve sempre poter assegnare all'intermediario, che
--      pero' se fa parte di un punto vendita si deve assegnare anche al punto
--      vendita»;
--    · «elimina la parte degli HUB perche' i punti vendita li sostituiscono».
--
--  MISURATO PRIMA DI SCRIVERE, il 23/09/2026:
--    · `iam_hub`: 2 righe (HUB PANTELLERIA, HUB VILLABATE);
--    · `iam_team.hub_id` valorizzato su 3 schede su 12;
--    · `iam_punti_vendita`: 1 riga, «Agenzia Palermo Villabate», creata oggi.
--
--  ROLLBACK in fondo.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. IL RESPONSABILE ────────────────────────────────────────────────────
-- E' l'intermediario di PRIMO LIVELLO del punto vendita: chi risponde di quel
-- punto vendita. Chi sta sotto e' gia' modellato — sono le persone con
-- `punto_vendita_id` — e non serve una seconda tabella: una persona lavora in
-- un punto vendita solo, e il responsabile e' una di quelle.
--
-- Punta alla PERSONA del registro unico, non all'account: dodici persone su
-- diciassette non hanno un accesso a IAM, e appendere il responsabile
-- all'account escluderebbe proprio chi non entra nel gestionale.
alter table iam_punti_vendita
  add column if not exists responsabile_id uuid references quote_collaboratori(id) on delete set null;

create index if not exists iam_pv_responsabile_idx on iam_punti_vendita (responsabile_id);

-- ─── 2. LA POLIZZA PORTA IL PUNTO VENDITA ──────────────────────────────────
-- «Sempre all'intermediario, e ANCHE al punto vendita se ne fa parte»: sono
-- due colonne, non una.
--
-- Non si ricava leggendo la persona quando serve. Il punto vendita di una
-- persona cambia — si sposta, il punto vendita chiude — e il consuntivo di un
-- anno chiuso cambierebbe da solo: e' la stessa ragione per cui il produttore
-- si CONGELA sulla polizza invece di risolverlo dal vivo. Qui vale il doppio,
-- perche' la produzione di un punto vendita e' il numero con cui si decide se
-- quel punto vendita sta in piedi.
alter table quote_polizze
  add column if not exists punto_vendita_id uuid references iam_punti_vendita(id) on delete set null;

create index if not exists quote_polizze_pv_idx on quote_polizze (punto_vendita_id)
  where punto_vendita_id is not null;

-- La stessa cosa sulle RATE: le provvigioni si contano dalle rate, e un punto
-- vendita che vuole sapere quanto ha incassato non puo' passare ogni volta
-- dalla polizza. La colonna del collaboratore sulla rata esiste dal 18/09.
alter table quote_titoli
  add column if not exists punto_vendita_id uuid references iam_punti_vendita(id) on delete set null;

create index if not exists quote_titoli_pv_idx on quote_titoli (punto_vendita_id)
  where punto_vendita_id is not null;

-- ─── 3. CHI RIEMPIE QUESTE COLONNE ─────────────────────────────────────────
-- Non questa migrazione, e non un punto di chiamata: le strade che scrivono
-- una polizza sono quattro (importazione, decisione su un codice produttore,
-- «Assegna il pregresso», «Nuova polizza»). La regola sta in un trigger, in
-- `20260923d_polizza_segue_il_punto_vendita.sql`, cioe' nel punto da cui
-- passano tutte.
--
-- QUI C'ERA UNA RISCRITTURA DI `iam_applica_decisione_codice`, ED ERA
-- SBAGLIATA. L'avevo riscritta a memoria invece di partire da quella del
-- 22/09: aveva perso i quattro stati del motore, la sospensione e i nomi dei
-- numeri che torna. Plpgsql non se ne accorge — i campi di un `record` si
-- risolvono quando la funzione gira, non quando si crea — quindi si e'
-- installata senza un errore. L'ha presa `assegnazione.test.mjs`, non la
-- rilettura. La funzione buona sta in `20260923e`, ed e' quella del 22/09 con
-- due righe in piu'.

-- ─── 4. GLI HUB NON SI CANCELLANO: SI SPEGNE LA SCHERMATA ──────────────────
-- Francesco: «elimina la parte degli HUB perche' i punti vendita li
-- sostituiscono». La schermata si toglie, ma `iam_hub` e `iam_team.hub_id`
-- restano dove sono, e questa migrazione non li tocca.
--
-- Non e' prudenza: sono l'unica traccia di come l'agenzia era organizzata, e
-- tre schede economiche ci puntano. Cancellarli renderebbe quelle tre righe
-- orfane e spegnerebbe l'unico modo di ricostruire da dove vengono i punti
-- vendita nuovi.
--
-- E i due hub NON diventano due punti vendita da soli: sarebbe mettere in
-- archivio una struttura che nessuno ha deciso. La schermata dei punti vendita
-- li mostra e propone di trasformarli, con un bottone — proporre e scrivere
-- sono due cose diverse, e su una struttura di agenzia la differenza e' tutta.

-- ─── ROLLBACK ──────────────────────────────────────────────────────────────
-- drop index if exists quote_titoli_pv_idx;
-- alter table quote_titoli drop column if exists punto_vendita_id;
-- drop index if exists quote_polizze_pv_idx;
-- alter table quote_polizze drop column if exists punto_vendita_id;
-- drop index if exists iam_pv_responsabile_idx;
-- alter table iam_punti_vendita drop column if exists responsabile_id;
-- (la funzione iam_applica_decisione_codice torna alla versione del
--  20260922c_applica_decisione_codice.sql)
