-- Il catalogo prodotti diceva «HD» al posto di «HDI» su sette prodotti (auto,
-- moto, autocarro, TCM, casa, infortuni, attivita'). Trovato il 17/09/2026
-- scrivendo il filtro delle compagnie per utente (Lavoro 2 PR 3), che finche'
-- il nome era storto lasciava HDI visibile a tutti per prudenza. Corretto su
-- richiesta di Francesco il 17/09/2026: da qui HDI entra nel filtro come le
-- altre. Nessuna riga aveva gia' «HDI» accanto a «HD», quindi niente doppioni.
-- APPLICATA il 17/09/2026 (7 righe).
update public.quote_prodotti_catalogo
   set compagnie = array_replace(compagnie, 'HD', 'HDI')
 where 'HD' = any(compagnie);
