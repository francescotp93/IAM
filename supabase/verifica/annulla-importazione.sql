-- ═══════════════════════════════════════════════════════════════════════════
--  DISFARE UN'IMPORTAZIONE — le regole che non si vedono dal tasto
--
--  Si incolla nell'editor SQL di Supabase: l'ultima colonna dev'essere OK su
--  ogni riga. Gira dentro una transazione che si annulla da sola, quindi non
--  lascia niente in archivio e non cancella niente per davvero — nemmeno in
--  produzione.
--
--  Le cose che devono restare vere:
--
--    1. NON SI CANCELLA QUELLO CHE È SUCCESSO DOPO. Le chiavi esterne di
--       questo database cascano in silenzio: le note e l'appartenenza ai
--       gruppi seguono il cliente, le rate e i rinnovi seguono la polizza. Un
--       annullamento che si porta via il lavoro fatto dopo l'importazione è
--       peggio di nessun annullamento.
--
--    2. IL CONTO E LA CANCELLAZIONE DEVONO COINCIDERE. Il tasto mostra un
--       numero e poi ne cancella un altro solo se i due blocchi di SQL sono
--       divergenti: qui si controlla che dicano la stessa cosa.
--
--    3. SERVE LA PAROLA. Una cancellazione irreversibile non deve poter
--       partire da una chiamata fatta per sbaglio.
--
--    4. SOLO LO STAFF.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create temp table _esiti (n int, regola text, atteso text, trovato text, esito text) on commit drop;

do $prova$
declare
  v_verb  uuid;
  v_cli1  uuid; v_cli2 uuid;
  v_pol1  uuid; v_pol2 uuid;
  v_conto jsonb;
  v_rim   jsonb;
  v_n     int;
begin
  -- un'importazione finta, con due clienti e due polizze
  insert into quote_importazioni (fonte, emittente, conteggi)
    values ('hdi', 'PROVA', '{}'::jsonb) returning id into v_verb;

  insert into quote_anagrafiche (tipo, nominativo, fonte, fonte_id, importazione_id)
    values ('fisica', 'PROVA UNO', 'hdi', 'prova:a:1', v_verb) returning id into v_cli1;
  insert into quote_anagrafiche (tipo, nominativo, fonte, fonte_id, importazione_id)
    values ('fisica', 'PROVA DUE', 'hdi', 'prova:a:2', v_verb) returning id into v_cli2;

  insert into quote_polizze (cliente_id, numero_polizza, compagnia, data_effetto, fonte, fonte_id, importazione_id)
    values (v_cli1, 'PROVA-1', 'HDI', current_date, 'hdi', 'prova:p:1', v_verb) returning id into v_pol1;
  insert into quote_polizze (cliente_id, numero_polizza, compagnia, data_effetto, fonte, fonte_id, importazione_id)
    values (v_cli2, 'PROVA-2', 'HDI', current_date, 'hdi', 'prova:p:2', v_verb) returning id into v_pol2;

  insert into quote_titoli (polizza_id, tipo, data_decorrenza, importo_lordo, stato, fonte, fonte_id, importazione_id)
    values (v_pol1, 'rata', current_date, 100, 'aperto', 'hdi', 'prova:t:1', v_verb);

  -- ── il caso normale: tutto pulito, tutto si può togliere ────────────────
  v_conto := public.iam_conta_annullabili(v_verb);
  insert into _esiti values (1, 'tutto pulito: si possono togliere 2 clienti, 2 polizze, 1 rata',
    '2/2/1',
    (v_conto->>'clienti') || '/' || (v_conto->>'polizze') || '/' || (v_conto->>'rate'),
    case when v_conto->>'clienti' = '2' and v_conto->>'polizze' = '2' and v_conto->>'rate' = '1'
         then 'OK' else 'ERRORE' end);

  -- ── UNA NOTA SUL CLIENTE lo trattiene ───────────────────────────────────
  insert into quote_note (anagrafica_id, testo) values (v_cli2, 'nota scritta dopo');
  v_conto := public.iam_conta_annullabili(v_verb);
  insert into _esiti values (2, 'un cliente con una nota NON si cancella (la nota cascherebbe con lui)',
    '1 cliente togliibile', (v_conto->>'clienti') || ' togliibili',
    case when v_conto->>'clienti' = '1' then 'OK' else 'ERRORE' end);
  insert into _esiti values (3, 'e viene detto che resta indietro',
    '1 trattenuto', (v_conto->'trattenute'->>'clienti_trattenuti') || ' trattenuti',
    case when v_conto->'trattenute'->>'clienti_trattenuti' = '1' then 'OK' else 'ERRORE' end);

  -- ── UN SINISTRO SULLA POLIZZA la trattiene ──────────────────────────────
  insert into quote_sinistri (polizza_id, data_sinistro) values (v_pol1, current_date);
  v_conto := public.iam_conta_annullabili(v_verb);
  insert into _esiti values (4, 'una polizza con un sinistro NON si cancella',
    '1 polizza togliibile', (v_conto->>'polizze') || ' togliibili',
    case when v_conto->>'polizze' = '1' then 'OK' else 'ERRORE' end);

  -- ── SENZA LA PAROLA non si cancella niente ──────────────────────────────
  begin
    perform public.iam_annulla_importazione(v_verb, 'si');
    insert into _esiti values (5, 'senza la parola ANNULLA non parte', 'errore', 'ha cancellato', 'ERRORE');
  exception when others then
    insert into _esiti values (5, 'senza la parola ANNULLA non parte', 'errore', sqlerrm, 'OK');
  end;

  -- ── E ADESSO SI CANCELLA: il conto e la cancellazione devono coincidere ─
  v_conto := public.iam_conta_annullabili(v_verb);
  v_rim   := public.iam_annulla_importazione(v_verb, 'ANNULLA');
  insert into _esiti values (6, 'quello che il tasto promette è quello che toglie',
    (v_conto->>'clienti') || '/' || (v_conto->>'polizze') || '/' || (v_conto->>'rate'),
    (v_rim->>'clienti') || '/' || (v_rim->>'polizze') || '/' || (v_rim->>'rate'),
    case when v_conto->>'clienti' = v_rim->>'clienti'
          and v_conto->>'polizze' = v_rim->>'polizze'
          and v_conto->>'rate'    = v_rim->>'rate' then 'OK' else 'ERRORE' end);

  -- ── LA NOTA È ANCORA LÀ ─────────────────────────────────────────────────
  select count(*) into v_n from quote_note where anagrafica_id = v_cli2;
  insert into _esiti values (7, 'la nota scritta dopo l''importazione è sopravvissuta',
    '1', v_n::text, case when v_n = 1 then 'OK' else 'ERRORE' end);

  select count(*) into v_n from quote_anagrafiche where id = v_cli2;
  insert into _esiti values (8, 'e il cliente che la porta pure',
    '1', v_n::text, case when v_n = 1 then 'OK' else 'ERRORE' end);

  select count(*) into v_n from quote_polizze where id = v_pol1;
  insert into _esiti values (9, 'la polizza col sinistro è rimasta',
    '1', v_n::text, case when v_n = 1 then 'OK' else 'ERRORE' end);

  select count(*) into v_n from quote_polizze where id = v_pol2;
  insert into _esiti values (10, 'quella pulita se n''è andata',
    '0', v_n::text, case when v_n = 0 then 'OK' else 'ERRORE' end);

  select count(*) into v_n from quote_anagrafiche where id = v_cli1;
  insert into _esiti values (11, 'il cliente della polizza trattenuta resta (ha ancora una polizza)',
    '1', v_n::text, case when v_n = 1 then 'OK' else 'ERRORE' end);

  -- ── IL VERBALE RESTA, E RACCONTA ────────────────────────────────────────
  select count(*) into v_n from quote_importazioni
   where id = v_verb and (conteggi->>'annullata')::boolean is true;
  insert into _esiti values (12, 'il verbale resta e dice di essere stato annullato',
    '1', v_n::text, case when v_n = 1 then 'OK' else 'ERRORE' end);
end $prova$;

select n, regola, atteso, trovato, esito from _esiti order by n;

rollback;
