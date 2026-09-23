-- ═══════════════════════════════════════════════════════════════════════════
--  LA POLIZZA SEGUE IL PUNTO VENDITA DEL SUO INTERMEDIARIO  (23/09/2026)
--
--  Francesco: «se la polizza si deve sempre poter assegnare all'intermediario,
--  che pero' se fa parte di un punto vendita si deve assegnare anche al punto
--  vendita».
--
--  LE STRADE CHE SCRIVONO UNA POLIZZA SONO QUATTRO, e non una:
--    · l'importazione del flusso della compagnia (`iam_import_applica`);
--    · l'applicazione di una decisione sul codice produttore
--      (`iam_applica_decisione_codice`, che dal 20260923c lo scrive gia' da se');
--    · «Assegna il pregresso», che aggiorna dal browser;
--    · «Nuova polizza», scritta a mano.
--
--  Scrivere la regola in tutte e quattro vorrebbe dire quattro regole su chi
--  produce per chi, e quella sbagliata sarebbe quella che nessuno guarda. Qui
--  c'e' UNA regola sola, nel punto da cui passano tutte: un trigger.
--
--  DUE COSE CHE IL TRIGGER NON FA, e sono la meta' del lavoro:
--
--  1. NON SOVRASCRIVE QUELLO CHE C'E'. Riempie solo un `punto_vendita_id`
--     vuoto. Chi l'ha messo a mano sapeva qualcosa che il programma non sa —
--     una polizza portata in agenzia da una filiale, un passaggio di mano — e
--     cancellarglielo sarebbe lavoro perso che nessuno si accorge di aver
--     perso (e' la regola 2 dei codici produttore, §19).
--
--  2. NON RILEGGE IL PASSATO. La colonna si riempie quando la riga si scrive,
--     e da quel momento resta com'e'. Il punto vendita di una persona cambia —
--     si sposta, il punto vendita chiude — e se la produzione lo leggesse dal
--     vivo il consuntivo di un anno gia' chiuso cambierebbe da solo. E' la
--     stessa ragione per cui il produttore si CONGELA sulla polizza (§45) e per
--     cui i requisiti del fascicolo si congelano alla creazione (§11).
--
--  ROLLBACK in fondo.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function iam_pv_dal_collaboratore() returns trigger
language plpgsql
as $$
begin
  if new.collaboratore_id is not null and new.punto_vendita_id is null then
    select c.punto_vendita_id into new.punto_vendita_id
      from quote_collaboratori c
     where c.id = new.collaboratore_id;
  end if;
  return new;
end $$;

drop trigger if exists quote_polizze_pv_trg on quote_polizze;
create trigger quote_polizze_pv_trg
  before insert or update of collaboratore_id, punto_vendita_id on quote_polizze
  for each row execute function iam_pv_dal_collaboratore();

-- Sulle RATE per la stessa ragione: le provvigioni si contano dalle rate, e un
-- punto vendita che vuole sapere quanto ha incassato non puo' passare ogni
-- volta dalla polizza. La colonna del collaboratore sulla rata esiste dal
-- 18/09, e risponde a un'altra domanda (di chi e' questo incasso).
drop trigger if exists quote_titoli_pv_trg on quote_titoli;
create trigger quote_titoli_pv_trg
  before insert or update of collaboratore_id, punto_vendita_id on quote_titoli
  for each row execute function iam_pv_dal_collaboratore();

-- ─── IL PREGRESSO NON SI TOCCA ─────────────────────────────────────────────
-- Nessun backfill, ed e' voluto. Misurato il 23/09/2026: c'e' UN punto vendita
-- («Agenzia Palermo Villabate»), ZERO persone dentro, e ZERO polizze con un
-- collaboratore. Non c'e' niente da riempire — e il giorno in cui ci fosse,
-- riempirlo all'indietro vorrebbe dire attribuire la produzione di un anno
-- chiuso a una struttura che allora non esisteva.
--
-- Il pregresso si riempie assegnando i codici produttore: e' la strada che
-- gia' c'e' (Titoli › Assegna il pregresso, e la scheda del collaboratore in
-- IAM), e adesso quella strada scrive tutte e due le colonne.

-- ─── ROLLBACK ──────────────────────────────────────────────────────────────
-- drop trigger if exists quote_titoli_pv_trg on quote_titoli;
-- drop trigger if exists quote_polizze_pv_trg on quote_polizze;
-- drop function if exists iam_pv_dal_collaboratore();
