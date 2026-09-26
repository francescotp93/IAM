-- ═══════════════════════════════════════════════════════════════════════════
--  LA SIGLA ARRIVA FINO IN ARCHIVIO                            26/09/2026
--
--  I due lettori (HDI e SSF) calcolano la sigla del titolo e la mettono nella
--  riga che passano a `iam_importa_flusso`. La funzione però elenca le colonne
--  una per una, e `sigla_tipo` non c'era: la sigla arrivava fino alla porta del
--  database e veniva buttata via **in silenzio** — nessun errore, nessun
--  avviso, e i titoli nuovi sarebbero entrati senza sigla mentre gli 890
--  storici ce l'hanno. Il tipo di guasto che si scopre fra sei mesi, quando il
--  filtro dei mancati rinnovi smette di tornare i numeri giusti.
--
--  PERCHÉ UNA PATCH ANCORATA E NON LA FUNZIONE RISCRITTA. La funzione è lunga
--  12.591 caratteri e fa cinque cose (anagrafiche, polizze, rate, garanzie,
--  registro); ricopiarla per cambiarne due righe vuol dire rischiare di
--  cambiarne per sbaglio una terza. Qui si prende la definizione vera, si
--  sostituiscono DUE tratti esatti, e **se uno dei due non si trova la
--  migrazione si ferma** invece di applicare una mezza modifica.
--
--  COSA CAMBIA, nelle rate:
--    · in INSERIMENTO: arrivano `sigla_tipo` e `sigla_dedotta` dalla riga.
--    · in AGGIORNAMENTO: la sigla si RIEMPIE se manca, non si sovrascrive.
--      Una sigla corretta a mano non deve essere smentita dal flusso del mese
--      dopo — è la stessa promessa di `pagamento_a_mano`. E la riga si riscrive
--      anche solo per riempire quel buco, altrimenti una rata già in archivio
--      non prenderebbe mai la sua sigla.
--
--  ROLLBACK: riapplicare la migrazione 20260925_pagamento_dai_flussi.sql, che
--  contiene la funzione per intero nella forma precedente a questa.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare
  v_src   text;
  v_nuovo text;
begin
  select pg_get_functiondef(p.oid) into v_src
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'iam_importa_flusso';
  if v_src is null then
    raise exception 'iam_importa_flusso non esiste: niente da correggere';
  end if;
  if position('sigla_tipo' in v_src) > 0 then
    raise notice 'la funzione porta già la sigla: niente da fare';
    return;
  end if;

  v_nuovo := v_src;

  /* 1 — l'elenco delle colonne dell'inserimento. */
  v_nuovo := replace(v_nuovo,
    '(polizza_id, tipo, data_decorrenza, data_scadenza, importo_lordo, provvigione,',
    '(polizza_id, tipo, sigla_tipo, sigla_dedotta, data_decorrenza, data_scadenza, importo_lordo, provvigione,');
  if v_nuovo = v_src then
    raise exception 'ancoraggio 1 perso: la funzione non contiene più l''elenco delle colonne delle rate come me l''aspettavo. NON è stata applicata nessuna modifica.';
  end if;

  /* 2 — i valori, nello stesso ordine. Una sigla vuota resta vuota: non si
         indovina, perché una sigla sbagliata su una quietanza fa un cliente
         «perso» che invece ha rinnovato. */
  declare
    v_prima text := v_nuovo;
  begin
    v_nuovo := replace(v_nuovo,
      'select p.id, coalesce(nullif(righe.r->>''tipo'', ''''), ''rata''),',
      'select p.id, coalesce(nullif(righe.r->>''tipo'', ''''), ''rata''),' || E'\n' ||
      '           nullif(righe.r->>''sigla_tipo'', ''''),' || E'\n' ||
      '           coalesce((righe.r->>''sigla_dedotta'')::boolean, false),');
    if v_nuovo = v_prima then
      raise exception 'ancoraggio 2 perso: la funzione non contiene più i valori delle rate come me li aspettavo. NON è stata applicata nessuna modifica.';
    end if;
  end;

  /* 3 — l'aggiornamento: la sigla si riempie, non si sovrascrive. */
  declare
    v_prima2 text := v_nuovo;
  begin
    v_nuovo := replace(v_nuovo,
      '          provvigione     = coalesce(quote_titoli.provvigione, excluded.provvigione)',
      '          provvigione     = coalesce(quote_titoli.provvigione, excluded.provvigione),' || E'\n' ||
      '          sigla_tipo      = coalesce(quote_titoli.sigla_tipo, excluded.sigla_tipo),' || E'\n' ||
      '          sigla_dedotta   = case when quote_titoli.sigla_tipo is null then excluded.sigla_dedotta else quote_titoli.sigla_dedotta end');
    if v_nuovo = v_prima2 then
      raise exception 'ancoraggio 3 perso: la clausola di aggiornamento delle rate non è come me l''aspettavo. NON è stata applicata nessuna modifica.';
    end if;
    v_nuovo := replace(v_nuovo,
      '          or (excluded.mezzo_pagamento is not null and quote_titoli.mezzo_pagamento is null))',
      '          or (excluded.mezzo_pagamento is not null and quote_titoli.mezzo_pagamento is null)' || E'\n' ||
      '          or (excluded.sigla_tipo is not null and quote_titoli.sigla_tipo is null))');
    if position('excluded.sigla_tipo is not null' in v_nuovo) = 0 then
      raise exception 'ancoraggio 4 perso: la guardia «si scrive solo se cambia qualcosa» non è come me l''aspettavo. NON è stata applicata nessuna modifica.';
    end if;
  end;

  execute v_nuovo;
end $$;
