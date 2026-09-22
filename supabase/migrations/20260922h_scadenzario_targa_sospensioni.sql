-- ═══════════════════════════════════════════════════════════════════════════
-- LO SCADENZARIO DEVE POTER RISPONDERE A «È STATA RINNOVATA?» (22/09/2026)
--
-- Misurato sul database vero prima di scrivere questa riga:
--
--   polizze non annullate ................................. 4.003
--   di cui scadute ........................................ 1.665
--   con sostituisce_id valorizzato ........................     0
--   scadute che hanno gia' una polizza nuova sulla STESSA
--     targa, nata a cavallo della scadenza ................   961
--   scadute che ne hanno una dello stesso cliente e ramo ..  1.017
--   scadute senza nessun successore .......................   647
--
-- Cioe': la colonna «Rinnovo» dello scadenzario, che legge sostituisce_id,
-- oggi dichiara NON rinnovate tutte e 1.665. Due terzi di quell'elenco sono
-- clienti che hanno gia' rinnovato, e telefonargli e' lavoro buttato — ma
-- soprattutto e' un elenco che non si guarda piu' dopo la terza telefonata a
-- vuoto, e allora non si guardano nemmeno i 647 veri.
--
-- La ragione per cui sostituisce_id e' vuoto non e' un difetto: PRIMA non ha
-- tacito rinnovo, alla scadenza la polizza storna e ne NASCE UNA NUOVA
-- (CLAUDE.md §14, regola 4). Il flusso porta la polizza nuova e non ha modo
-- di sapere quale sostituisce: quel collegamento non esiste nel tracciato.
--
-- Quindi il successore si RICONOSCE, e questa vista porta i due dati che
-- servono a riconoscerlo. Il giudizio non lo da' il database: lo da' il
-- motore, che tiene separate le tre risposte — dichiarato (sostituisce_id),
-- indizio (c'e' una polizza nuova che sembra il rinnovo), nessuno. Un
-- indizio non e' una dichiarazione, e chiamarlo cosi' vorrebbe dire
-- nascondere un cliente da richiamare (§19, §39).
--
-- E la terza colonna: SOSPENSIONI. Una polizza ferma non ha la scadenza che
-- dice il contratto — i giorni fermi si recuperano in fondo (§41) — e nello
-- scadenzario compariva con una data falsa. Oggi le polizze sospese sono
-- zero, quindi questa colonna non cambia un numero: cambia il giorno in cui
-- la prima verra' sospesa.
--
-- NIENTE colonna esistente e' toccata: le tre nuove stanno in fondo, che e'
-- l'unico modo in cui «create or replace view» accetta di aggiungerle.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view public.quote_scadenzario as
 select id,
    numero,
    numero_polizza,
    cliente_id,
    cliente,
    modulo,
    prodotto,
    compagnia,
    data_effetto,
    data_scadenza,
    frazionamento,
    tacito_rinnovo,
    premio_annuo,
    premio_rata,
    stato_pagamento,
    perfezionata,
    rendicontata,
    creato_da,
    creato_nome,
    preventivo_id,
    data_scadenza - CURRENT_DATE as giorni_alla_scadenza,
    ( select count(*) as count
        from quote_polizze s
       where s.sostituisce_id = p.id) as sostituzioni,
    -- ── le tre nuove ──────────────────────────────────────────────────────
    -- La targa e' l'indizio piu' forte che esista: stesso veicolo, polizza
    -- nuova che parte dove finiva la vecchia. Il nome del cliente no — due
    -- persone si chiamano uguale, e un aggancio sbagliato qui nasconde un
    -- cliente da richiamare.
    p.dati -> 'ssf' -> 'veicolo' ->> 'targa' as targa,
    p.sospensioni,
    p.sostituisce_id
   from quote_polizze p
  where stato_pagamento <> 'annullata'::text;

-- ── LA RIGA CHE NON SI PUO' DIMENTICARE ───────────────────────────────────
-- «create or replace view» NON conserva le opzioni della vista: dopo la
-- sostituzione questa vista si e' ritrovata SENZA security_invoker, cioe' a
-- girare con i diritti di chi la possiede invece che con quelli di chi
-- legge. Nessun errore, nessuna schermata rotta — solo un collaboratore che
-- dallo scadenzario vede il portafoglio di tutta l'agenzia.
-- Misurato subito dopo l'applicazione (reloptions tornava vuoto) e rimesso.
-- Vale per QUALUNQUE «create or replace view» in questo repository.
alter view public.quote_scadenzario set (security_invoker = true);

comment on view public.quote_scadenzario is
  'Scadenzario: una riga per polizza non annullata. targa e sostituisce_id '
  'servono a capire se il rinnovo c''e'' gia'' (il giudizio lo da'' il motore, '
  'non questa vista); sospensioni serve perche'' una polizza ferma non scade '
  'il giorno scritto sul contratto.';

-- ── ROLLBACK ───────────────────────────────────────────────────────────────
-- Rimette la vista com'era: le tre colonne in fondo spariscono e lo
-- scadenzario torna a leggere solo sostituisce_id, cioe' a dichiarare non
-- rinnovate tutte le polizze scadute. Nessun dato si perde: qui non si
-- scrive niente, si legge soltanto.
--
-- create or replace view public.quote_scadenzario as
--  select id, numero, numero_polizza, cliente_id, cliente, modulo, prodotto,
--     compagnia, data_effetto, data_scadenza, frazionamento, tacito_rinnovo,
--     premio_annuo, premio_rata, stato_pagamento, perfezionata, rendicontata,
--     creato_da, creato_nome, preventivo_id,
--     data_scadenza - CURRENT_DATE as giorni_alla_scadenza,
--     ( select count(*) from quote_polizze s where s.sostituisce_id = p.id)
--       as sostituzioni
--    from quote_polizze p
--   where stato_pagamento <> 'annullata'::text;
-- alter view public.quote_scadenzario set (security_invoker = true);
--   ^ questa riga NON e' facoltativa nemmeno nel rollback: senza, la vista
--     torna indietro scavalcando le politiche di visibilita'.
