-- ═══════════════════════════════════════════════════════════════════════════════
--  Brief IAM #01, M1 (19/09/2026) — la data di emissione della polizza e il
--  sinistro collegato alla polizza vera.
--
--  Due colonne su due tabelle che esistono già. Nessuna politica cambia:
--  quote_polizze e quote_sinistri restano leggibili e scrivibili da chi già
--  lo era (top_master / master / operativo / sub-agenti passano da
--  quote_vede() e visibleUserIds(), che guardano creato_da, non queste colonne).
--
--  1. quote_polizze.data_emissione
--     Il criterio di ricerca più usato in agenzia («tutte le emesse a
--     settembre»), e finora non esisteva come colonna: il flusso V12 la porta
--     (DATA_EMISSIONE) e finiva SOLO in dati->ssf->>'data_emissione', dove non
--     si filtra e non si indicizza. Misurato prima di scrivere: 25 polizze su 30
--     vengono dal flusso e tutte e 25 hanno quella data, in forma ISO
--     (aaaa-mm-gg). Le 5 nate in QUOTO restano vuote: non c'è un dato da cui
--     ricavarla, e «effetto» non è «emissione» (una polizza si emette PRIMA che
--     decorra, a volte settimane prima). Il V8 (Plurima) non porta la colonna.
--
--  2. quote_sinistri.polizza_id
--     Il sinistro puntava al PREVENTIVO (preventivo_id) e teneva il numero di
--     polizza come testo (n_polizza). Una polizza arrivata dalla compagnia un
--     preventivo non ce l'ha, e un numero scritto a mano non è un collegamento:
--     non apre niente e un refuso lo perde. Adesso c'è la chiave vera, con
--     `on delete set null`: cancellare una polizza non cancella il sinistro,
--     che è successo davvero.
--
--  ROLLBACK (nell'ordine inverso):
--    drop index if exists quote_sinistri_polizza_idx;
--    alter table quote_sinistri drop column if exists polizza_id;
--    drop index if exists quote_polizze_emissione_idx;
--    alter table quote_polizze drop column if exists data_emissione;
--  Il backfill non si «disfa»: i valori restano in dati->ssf, da dove vengono.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.quote_polizze
  add column if not exists data_emissione date;

comment on column public.quote_polizze.data_emissione is
  'Quando la compagnia ha emesso la polizza. Dal flusso (DATA_EMISSIONE, V12) o scritta a mano; NON è la data di effetto.';

-- Il backfill legge solo date in forma ISO piena: un valore che non lo è
-- resta fuori invece di diventare una data sbagliata.
update public.quote_polizze
   set data_emissione = (dati->'ssf'->>'data_emissione')::date
 where data_emissione is null
   and dati->'ssf'->>'data_emissione' ~ '^\d{4}-\d{2}-\d{2}$';

create index if not exists quote_polizze_emissione_idx
  on public.quote_polizze (data_emissione);

alter table public.quote_sinistri
  add column if not exists polizza_id uuid references public.quote_polizze(id) on delete set null;

comment on column public.quote_sinistri.polizza_id is
  'La polizza VERA (quote_polizze) su cui è aperto il sinistro. preventivo_id e n_polizza restano per i sinistri di prima.';

create index if not exists quote_sinistri_polizza_idx
  on public.quote_sinistri (polizza_id);
