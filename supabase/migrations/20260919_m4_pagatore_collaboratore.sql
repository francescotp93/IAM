-- ═══════════════════════════════════════════════════════════════════════════════
--  Brief IAM #01, M4.2 (19/09/2026) — chi ha pagato la rata, e il credito
--  dell'agenzia verso il collaboratore.
--
--  Finora `quote_titoli.pagatore` era un testo libero (e sul database vero è
--  NULL su 55 rate su 55). Il brief chiede che fra i soggetti di pagamento ci
--  siano anche i collaboratori: se una rata la incassa il collaboratore, quei
--  soldi l'agenzia li deve ancora ricevere — è un credito verso di lui, da
--  richiedergli. Un testo libero non permette di sommare quei crediti né di
--  segnare quando sono rientrati.
--
--  Tre colonne su una tabella che esiste già; nessuna politica cambia (le rate
--  ereditano la visibilità dalla polizza, come prima).
--    pagatore_tipo               chi ha materialmente pagato: il cliente, il
--                                collaboratore (per conto dell'agenzia) o
--                                l'agenzia stessa
--    pagatore_collaboratore_id   quale collaboratore, quando è lui
--    rimesso_il / rimesso_da     quando il collaboratore ha girato i soldi
--                                all'agenzia, e chi l'ha registrato
--  `pagatore` (testo) resta: è il nome scritto sulla quietanza, e sui
--  sinistri/estratti vecchi può esserci ancora.
--
--  ROLLBACK:
--    drop index if exists quote_titoli_credito_collab_idx;
--    alter table quote_titoli drop column if exists rimesso_da,
--      drop column if exists rimesso_il,
--      drop column if exists pagatore_collaboratore_id,
--      drop column if exists pagatore_tipo;
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.quote_titoli
  add column if not exists pagatore_tipo text
    check (pagatore_tipo is null or pagatore_tipo in ('cliente', 'collaboratore', 'agenzia')),
  add column if not exists pagatore_collaboratore_id uuid
    references public.quote_collaboratori(id) on delete set null,
  add column if not exists rimesso_il date,
  add column if not exists rimesso_da uuid;

comment on column public.quote_titoli.pagatore_tipo is
  'Chi ha materialmente pagato la rata: cliente, collaboratore (per conto dell''agenzia: credito da richiedergli) o agenzia.';
comment on column public.quote_titoli.pagatore_collaboratore_id is
  'Il collaboratore che ha incassato per conto dell''agenzia, quando pagatore_tipo = collaboratore.';
comment on column public.quote_titoli.rimesso_il is
  'Quando il collaboratore ha rimesso all''agenzia quanto incassato. NULL = credito ancora aperto.';

-- Il credito aperto si interroga spesso e su poche righe: indice parziale.
create index if not exists quote_titoli_credito_collab_idx
  on public.quote_titoli (pagatore_collaboratore_id)
  where pagatore_tipo = 'collaboratore' and rimesso_il is null;
