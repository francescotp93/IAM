-- ═══════════════════════════════════════════════════════════════════════════
--  UNA CAUSALE PUO' DIRE DOVE IL DENARO ENTRA E DA DOVE ESCE  (23/09/2026)
--
--  Francesco: «quando in una causale, devo aver la possibilità di indicare su
--  quale conto vanno e da quale conto escono. Esempio un versamento su conto
--  corrente e lo faccio in contanti, devo poter aggiungere il conto dove
--  entrano, ma anche il conto dove escono, come ad esempio il conto contanti».
--
--  Due colonne sulla causale, nelle sue parole: dove il denaro ENTRA e da dove
--  ESCE. Registrando un movimento, la causale le propone nei due campi — e
--  «propone» e' la parola giusta: restano visibili e correggibili, perche' un
--  conto scritto dietro le quinte finisce in contabilita' senza che nessuno
--  l'abbia letto (regola di casa §8.1).
--
--  ── QUELLO CHE QUESTE COLONNE NON FANNO ─────────────────────────────────
--  NON scavalcano il cancello del 22/09. Una contropartita configurata qui
--  passa per la STESSA funzione che riempie la tendina e che poi rifiuta
--  (`Contabilita.contropartiteAmmesse`): se qualcuno cambia `incide_su_utile`
--  di una causale, o spegne quel conto, la coppia salvata smette di essere
--  ammessa — e allora NON si propone, e si dice perche'. Una configurazione
--  che scavalca un controllo e' un controllo che non esiste.
--
--  NON si semina niente: le quattordici causali di oggi restano con tutte e
--  due le colonne vuote. Scrivere una coppia «ragionevole» vorrebbe dire
--  decidere al posto di chi tiene i conti, e dopo due settimane quel conto
--  sarebbe un dato che nessuno sa di aver scelto.
--
--  ROLLBACK in fondo.
-- ═══════════════════════════════════════════════════════════════════════════

alter table iam_causali
  add column if not exists conto_entrata_id uuid references iam_conti(id) on delete set null,
  add column if not exists conto_uscita_id  uuid references iam_conti(id) on delete set null;

-- `on delete set null` e non `restrict`: un conto che si cancella non deve
-- bloccare la cancellazione dietro una causale che lo nominava — e la causale
-- resta, con il campo vuoto, che e' la verita' («non e' piu' deciso»).
-- I due indici servono proprio a quel `set null`, che altrimenti leggerebbe
-- per intero la tabella delle causali a ogni conto cancellato.
create index if not exists iam_causali_conto_entrata_idx on iam_causali (conto_entrata_id)
  where conto_entrata_id is not null;
create index if not exists iam_causali_conto_uscita_idx on iam_causali (conto_uscita_id)
  where conto_uscita_id is not null;

-- I due conti non possono essere lo stesso: un movimento da un conto a se
-- stesso non muove niente, ed e' lo stesso rifiuto che `righeSemplici` fa gia'
-- al salvataggio. Il divieto sta qui e non solo nella schermata: la schermata
-- e' una delle strade, non l'unica.
alter table iam_causali drop constraint if exists iam_causali_conti_diversi;
alter table iam_causali add constraint iam_causali_conti_diversi
  check (conto_entrata_id is null or conto_uscita_id is null
         or conto_entrata_id <> conto_uscita_id);

-- ─── ROLLBACK ──────────────────────────────────────────────────────────────
-- alter table iam_causali drop constraint if exists iam_causali_conti_diversi;
-- drop index if exists iam_causali_conto_uscita_idx;
-- drop index if exists iam_causali_conto_entrata_idx;
-- alter table iam_causali drop column if exists conto_uscita_id;
-- alter table iam_causali drop column if exists conto_entrata_id;
