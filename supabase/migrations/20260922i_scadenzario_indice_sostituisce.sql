-- ═══════════════════════════════════════════════════════════════════════════
-- L'INDICE CHE MANCAVA SOTTO LA VISTA DELLO SCADENZARIO (22/09/2026)
--
-- Trovato misurando, non leggendo, e solo perche' lo scadenzario ha smesso di
-- leggere mille righe e ha cominciato a leggerle tutte e 4.003.
--
-- La vista porta una colonna `sostituzioni`, che conta le polizze con
-- `sostituisce_id = questa`. Senza un indice su quella colonna, il conto e'
-- una SCANSIONE COMPLETA della tabella PER OGNI RIGA: 4.079 righe lette
-- 1.000 volte.
--
--   explain analyze select * from quote_scadenzario limit 1000;
--     prima  ... Seq Scan su quote_polizze s, loops=1000 ... 896 ms
--     dopo   ... Index Only Scan, Heap Fetches: 0        ...   3,2 ms
--
-- Cioe' 280 volte piu' veloce, e su tutte e 4.003 le righe si passa da circa
-- tre secondi e mezzo a una decina di millisecondi.
--
-- LA COSA DA PORTARSI VIA: il difetto c'era da sempre e non si vedeva perche'
-- la schermata leggeva solo la prima pagina. **Togliere un tetto nascosto fa
-- emergere il costo che quel tetto stava nascondendo**, e il costo va
-- misurato nello stesso lavoro — altrimenti si consegna una schermata
-- corretta e lenta, e la lentezza la scopre chi lavora.
--
-- L'indice e' PARZIALE (`where sostituisce_id is not null`) perche' oggi quella
-- colonna e' vuota su tutte e 4.003 le righe (CLAUDE.md §63): un indice pieno
-- occuperebbe spazio per quattromila valori nulli che nessuno cerca.
-- ═══════════════════════════════════════════════════════════════════════════

create index if not exists quote_polizze_sostituisce_idx
  on public.quote_polizze (sostituisce_id)
  where sostituisce_id is not null;

analyze public.quote_polizze;

-- ── ROLLBACK ───────────────────────────────────────────────────────────────
-- drop index if exists public.quote_polizze_sostituisce_idx;
--   ^ nessun dato si perde: la vista torna a contare con una scansione, e lo
--     scadenzario torna a metterci tre secondi e mezzo invece di dieci
--     millisecondi.
