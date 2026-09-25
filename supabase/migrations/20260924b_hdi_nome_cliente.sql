-- ═══════════════════════════════════════════════════════════════════════════
--  IL NOME DEL CLIENTE SULLE POLIZZE HDI GIÀ IMPORTATE   (24/09/2026)
--
--  PERCHÉ
--    `quote_polizze` tiene due cose sul cliente: `cliente_id`, che è il
--    collegamento vero, e `cliente`, che è il nome copiato accanto. Sembra un
--    doppione e non lo è: l'elenco del portafoglio, le stampe e gli export
--    leggono la COPIA, perché disegnare duemila righe andando ogni volta a
--    prendere l'anagrafica collegata sarebbe duemila letture.
--
--    La prima importazione di HDI ha scritto `cliente_id` su tutte e diciotto
--    le polizze — il collegamento c'era, e i clienti erano in archivio
--    completi — ma ha lasciato la copia vuota. In elenco al posto del nome
--    compariva un trattino, e da fuori sembrava che i clienti non fossero
--    stati importati affatto.
--
--    Il lettore adesso la riempie (`flusso-hdi.js`, funzione `converti`). Ma
--    le diciotto già dentro non si sistemano da sole: una nuova importazione
--    dello stesso file non le riscrive, perché sono già presenti e la
--    scrittura le salta di proposito.
--
--  COSA FA
--    Copia `quote_anagrafiche.nominativo` in `quote_polizze.cliente` per le
--    sole polizze HDI che ce l'hanno vuota. La fonte è l'anagrafica collegata,
--    che è il dato autorevole: non si inventa niente.
--
--  COSA NON FA
--    Non tocca nessun'altra riga, non crea e non cancella. Nessun ALTER TABLE.
--
--  ESEGUITA il 24/09/2026 sul progetto ekjxrnsfqxnfxzrthdcf: 18 righe su 18.
-- ═══════════════════════════════════════════════════════════════════════════

update quote_polizze p
   set cliente = a.nominativo,
       aggiornato_il = now()
  from quote_anagrafiche a
 where a.id = p.cliente_id
   and p.fonte = 'hdi'
   and nullif(trim(coalesce(p.cliente,'')),'') is null
   and nullif(trim(coalesce(a.nominativo,'')),'') is not null;

-- ── COME SI TORNA INDIETRO ────────────────────────────────────────────────
--      update quote_polizze set cliente = null where fonte = 'hdi';
--  (riporta esattamente allo stato di prima: prima di questa migrazione
--   nessuna polizza HDI aveva la copia del nome.)
