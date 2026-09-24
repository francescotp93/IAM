-- ═══════════════════════════════════════════════════════════════════════════
--  LA SCRITTURA DEL PORTAFOGLIO ACCETTA ANCHE HDI          (24/09/2026)
--
--  PERCHÉ
--    `iam_importa_flusso` scrive tutto con `fonte = 'ssf'` — la stringa è
--    dentro la funzione in nove punti. Finché resta lì, il portafoglio di HDI
--    ha due sole strade, ed entrambe sbagliate:
--
--      · entrare marcato 'ssf', cioè mentire sulla provenienza. E la
--        provenienza non è un'etichetta: `fonte` + `fonte_id` sono la chiave
--        con cui si riconosce «questa polizza l'ho già caricata». Due
--        tracciati diversi nello stesso spazio di chiavi vuol dire che un
--        numero di HDI può collidere con uno dell'SSF, e la collisione si
--        manifesta come una polizza che non entra — in silenzio.
--
--      · avere una seconda funzione di scrittura tutta sua, cioè due modi di
--        sbagliare a scrivere un portafoglio, il secondo senza le cicatrici
--        del primo (il 21/09 questa funzione ha imparato a essere tutto o
--        niente, il 22 a non morire per una riga storta).
--
--  COSA CAMBIA
--    La fonte diventa un parametro, con default 'ssf'. Le chiamate che
--    esistono oggi non passano niente e si comportano IDENTICHE: stesso
--    piano di esecuzione, stesse righe, stesso verbale. Cambia solo che
--    adesso si può chiedere 'hdi'.
--
--  COSA NON CAMBIA
--    Niente dei dati già dentro. Nessun ALTER TABLE, nessun backfill: si
--    sostituisce il corpo di una funzione. Il ritorno indietro è in fondo.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.iam_importa_flusso(p_lotto uuid, p_fonte text default 'ssf')
returns jsonb
language plpgsql
as $function$
declare
  v_t         jsonb;
  v_fonte     text := lower(nullif(trim(coalesce(p_fonte, '')), ''));
  v_clienti   int := 0;
  v_polizze   int := 0;
  v_titoli    int := 0;
  v_senza_cli int := 0;
  v_proposti  int := 0;
  v_orfani    int := 0;
  v_pol_dati  int := 0;
  v_pol_num   int := 0;
  v_tit_dati  int := 0;
  v_verbale   uuid;
begin
  /* La fonte si controlla, non si accetta com'è. Una stringa libera qui
     vorrebbe dire che una chiamata sbagliata può creare uno spazio di chiavi
     nuovo senza che nessuno se ne accorga, e da lì i doppioni. */
  if v_fonte is null or v_fonte not in ('ssf', 'hdi') then
    raise exception 'Fonte % sconosciuta: le fonti previste sono ssf e hdi.', p_fonte
      using errcode = 'invalid_parameter_value';
  end if;

  select righe into v_t
    from iam_import_lotti
   where lotto = p_lotto and tipo = 'testata' and parte = 0 and creato_da = auth.uid();

  if v_t is null then
    raise exception 'Lotto % senza testata: non c''e'' niente da applicare.', p_lotto
      using errcode = 'no_data_found';
  end if;

  create temp table _cli (chiave text primary key, id uuid not null) on commit drop;

  insert into _cli (chiave, id)
  select k, v::uuid
    from jsonb_each_text(coalesce(v_t->'clienti_gia', '{}'::jsonb)) as e(k, v)
   where v is not null and v <> '';

  /* I CLIENTI: quello che c'e' gia' NON si tocca. */
  with righe as (
    select r
      from iam_import_lotti l, lateral jsonb_array_elements(l.righe) r
     where l.lotto = p_lotto and l.tipo = 'clienti' and l.creato_da = auth.uid()
  ), nuovi as (
    select r from righe
     where nullif(r->>'_chiave', '') is not null
       and not exists (
         select 1 from quote_anagrafiche a
          where a.fonte = v_fonte and a.fonte_id = r->>'_chiave')
  ), ins as (
    insert into quote_anagrafiche
      (tipo, nominativo, cognome, nome, ragione_sociale, codice_fiscale, partita_iva,
       indirizzo, cap, comune, provincia, cellulare, telefono, email, data_nascita,
       fonte, fonte_id, creato_da)
    select coalesce(nullif(nuovi.r->>'tipo', ''), 'fisica'), nuovi.r->>'nominativo', nuovi.r->>'cognome', nuovi.r->>'nome', nuovi.r->>'ragione_sociale',
           nuovi.r->>'codice_fiscale', nuovi.r->>'partita_iva', nuovi.r->>'indirizzo', nuovi.r->>'cap',
           nuovi.r->>'comune', nuovi.r->>'provincia', nuovi.r->>'cellulare', nuovi.r->>'telefono', nuovi.r->>'email',
           nullif(nuovi.r->>'data_nascita', '')::date,
           v_fonte, nuovi.r->>'_chiave', auth.uid()
      from nuovi
    returning 1
  )
  select count(*) into v_clienti from ins;

  with righe as (
    select r
      from iam_import_lotti l, lateral jsonb_array_elements(l.righe) r
     where l.lotto = p_lotto and l.tipo = 'clienti' and l.creato_da = auth.uid()
  ), coppie as (
    select k, righe.r->>'_chiave' as principale
      from righe,
           lateral jsonb_array_elements_text(
             coalesce(righe.r->'_chiavi', jsonb_build_array(righe.r->>'_chiave'))) k
     where nullif(k, '') is not null
  )
  insert into _cli (chiave, id)
  select distinct coppie.k, a.id
    from coppie
    join quote_anagrafiche a on a.fonte = v_fonte and a.fonte_id = coppie.principale
  on conflict (chiave) do nothing;

  /* QUELLO CHE NON PUO' ENTRARE SI ESCLUDE E SI CONTA, NON FA MORIRE IL RESTO. */
  with righe as (
    select r
      from iam_import_lotti l, lateral jsonb_array_elements(l.righe) r
     where l.lotto = p_lotto and l.tipo = 'polizze' and l.creato_da = auth.uid()
  ), marcate as (
    select righe.r,
           nullif(righe.r->>'data_effetto', '') is null as senza_data,
           row_number() over (
             partition by coalesce(nullif(righe.r->>'numero_polizza', ''),
                                   '#' || (righe.r->>'_fonte_id'))
             order by righe.r->>'_fonte_id') as rn,
           exists (
             select 1 from quote_polizze p2
              where p2.numero_polizza = nullif(righe.r->>'numero_polizza', '')
                and (p2.fonte is distinct from v_fonte
                     or p2.fonte_id is distinct from righe.r->>'_fonte_id')) as numero_preso
      from righe
  )
  select count(*) filter (where not exists (select 1 from _cli c where c.chiave = marcate.r->>'_cliente')),
         count(*) filter (where marcate.senza_data),
         count(*) filter (where not marcate.senza_data and (marcate.rn > 1 or marcate.numero_preso))
    into v_senza_cli, v_pol_dati, v_pol_num
    from marcate;

  with righe as (
    select r
      from iam_import_lotti l, lateral jsonb_array_elements(l.righe) r
     where l.lotto = p_lotto and l.tipo = 'polizze' and l.creato_da = auth.uid()
  ), marcate as (
    select righe.r,
           nullif(righe.r->>'data_effetto', '') is null as senza_data,
           row_number() over (
             partition by coalesce(nullif(righe.r->>'numero_polizza', ''),
                                   '#' || (righe.r->>'_fonte_id'))
             order by righe.r->>'_fonte_id') as rn,
           exists (
             select 1 from quote_polizze p2
              where p2.numero_polizza = nullif(righe.r->>'numero_polizza', '')
                and (p2.fonte is distinct from v_fonte
                     or p2.fonte_id is distinct from righe.r->>'_fonte_id')) as numero_preso
      from righe
  )
  , ins as (
    insert into quote_polizze
      (cliente_id, cliente, numero_polizza, compagnia, prodotto, modulo,
       data_effetto, data_scadenza, data_emissione, copertura_dal, copertura_al,
       frazionamento, tacito_rinnovo, mezzo_pagamento, premio_annuo, premio_rata,
       stato_pagamento, dati, collaboratore_id, fonte, fonte_id, creato_da, creato_nome)
    select c.id, righe.r->>'cliente', righe.r->>'numero_polizza', righe.r->>'compagnia', righe.r->>'prodotto', righe.r->>'modulo',
           nullif(righe.r->>'data_effetto', '')::date, nullif(righe.r->>'data_scadenza', '')::date,
           nullif(righe.r->>'data_emissione', '')::date,
           nullif(righe.r->>'copertura_dal', '')::date, nullif(righe.r->>'copertura_al', '')::date,
           nullif(righe.r->>'frazionamento', ''),
           coalesce(nullif(righe.r->>'tacito_rinnovo', '')::boolean, false),
           nullif(righe.r->>'mezzo_pagamento', ''),
           nullif(righe.r->>'premio_annuo', '')::numeric, nullif(righe.r->>'premio_rata', '')::numeric,
           coalesce(nullif(righe.r->>'stato_pagamento', ''), 'non_pagato'),
           coalesce(righe.r->'dati', '{}'::jsonb),
           nullif(righe.r->>'collaboratore_id', '')::uuid,
           v_fonte, righe.r->>'_fonte_id', auth.uid(), nullif(v_t->>'creato_nome', '')
      from marcate as righe
      join _cli c on c.chiave = righe.r->>'_cliente'
     where not righe.senza_data and righe.rn = 1 and not righe.numero_preso
    on conflict (fonte, fonte_id) where fonte_id is not null do nothing
    returning 1
  )
  select count(*) into v_polizze from ins;

  /* LA MAPPA: le chiavi sono DUE — le polizze del lotto E le polizze che le
     RATE nominano. */
  create temp table _pol (chiave text primary key, id uuid not null) on commit drop;
  with chiavi as (
    select distinct r->>'_fonte_id' as chiave
      from iam_import_lotti l, lateral jsonb_array_elements(l.righe) r
     where l.lotto = p_lotto and l.tipo = 'polizze' and l.creato_da = auth.uid()
    union
    select distinct r->>'_polizza' as chiave
      from iam_import_lotti l, lateral jsonb_array_elements(l.righe) r
     where l.lotto = p_lotto and l.tipo = 'titoli' and l.creato_da = auth.uid()
  )
  insert into _pol (chiave, id)
  select k.chiave, p.id
    from chiavi k
    join quote_polizze p on p.fonte = v_fonte and p.fonte_id = k.chiave
   where nullif(k.chiave, '') is not null
  on conflict (chiave) do nothing;

  /* TRE NUMERI SULLE RATE. */
  with righe as (
    select r
      from iam_import_lotti l, lateral jsonb_array_elements(l.righe) r
     where l.lotto = p_lotto and l.tipo = 'titoli' and l.creato_da = auth.uid()
  )
  select count(*),
         count(*) filter (where nullif(righe.r->>'data_decorrenza', '') is null
                             or nullif(righe.r->>'importo_lordo', '') is null),
         count(*) filter (where nullif(righe.r->>'data_decorrenza', '') is not null
                            and nullif(righe.r->>'importo_lordo', '') is not null
                            and not exists (select 1 from _pol p where p.chiave = righe.r->>'_polizza'))
    into v_proposti, v_tit_dati, v_orfani
    from righe;

  /* LE RATE. */
  with righe as (
    select r
      from iam_import_lotti l, lateral jsonb_array_elements(l.righe) r
     where l.lotto = p_lotto and l.tipo = 'titoli' and l.creato_da = auth.uid()
  ), ins as (
    insert into quote_titoli
      (polizza_id, tipo, data_decorrenza, data_scadenza, importo_lordo, provvigione,
       stato, mezzo_pagamento, incassato_il, note, collaboratore_id, fonte, fonte_id, creato_da)
    select p.id, coalesce(nullif(righe.r->>'tipo', ''), 'rata'),
           nullif(righe.r->>'data_decorrenza', '')::date, nullif(righe.r->>'data_scadenza', '')::date,
           nullif(righe.r->>'importo_lordo', '')::numeric, nullif(righe.r->>'provvigione', '')::numeric,
           coalesce(nullif(righe.r->>'stato', ''), 'aperto'), nullif(righe.r->>'mezzo_pagamento', ''),
           nullif(righe.r->>'incassato_il', '')::date, nullif(righe.r->>'note', ''),
           nullif(righe.r->>'collaboratore_id', '')::uuid,
           v_fonte, righe.r->>'_fonte_id', auth.uid()
      from righe
      join _pol p on p.chiave = righe.r->>'_polizza'
     where nullif(righe.r->>'data_decorrenza', '') is not null
       and nullif(righe.r->>'importo_lordo', '') is not null
    on conflict (fonte, fonte_id) where fonte_id is not null do nothing
    returning 1
  )
  select count(*) into v_titoli from ins;

  insert into quote_importazioni
    (fonte, emittente, intermediario, versione, periodo_dal, periodo_al, file_nome,
     conteggi, avvisi, collaboratori, creato_da, creato_nome)
  values
    (v_fonte, v_t->>'emittente', v_t->>'intermediario', v_t->>'versione',
     nullif(v_t->>'dal', '')::date, nullif(v_t->>'al', '')::date, v_t->>'file_nome',
     coalesce(v_t->'conteggi', '{}'::jsonb) || jsonb_build_object(
       'clienti_scritti', v_clienti,
       'polizze_scritte', v_polizze,
       'titoli_scritti',  v_titoli,
       'titoli_proposti', v_proposti,
       'titoli_senza_polizza', v_orfani,
       'titoli_senza_dati', v_tit_dati,
       'polizze_senza_cliente', v_senza_cli,
       'polizze_senza_dati', v_pol_dati,
       'polizze_numero_doppio', v_pol_num,
       'transazione', true),
     coalesce(v_t->'avvisi', '[]'::jsonb),
     coalesce(v_t->'collaboratori', '[]'::jsonb),
     auth.uid(), nullif(v_t->>'creato_nome', ''))
  returning id into v_verbale;

  delete from iam_import_lotti where lotto = p_lotto and creato_da = auth.uid();

  return jsonb_build_object(
    'verbale', v_verbale,
    'fonte',   v_fonte,
    'clienti', v_clienti,
    'polizze', v_polizze,
    'titoli',  v_titoli,
    'titoli_proposti', v_proposti,
    'titoli_senza_polizza', v_orfani,
    'titoli_senza_dati', v_tit_dati,
    'polizze_senza_cliente', v_senza_cli,
    'polizze_senza_dati', v_pol_dati,
    'polizze_numero_doppio', v_pol_num);
end;
$function$;

-- ── COME SI TORNA INDIETRO ────────────────────────────────────────────────
--  La versione a un parametro non è stata toccata: Postgres le tiene
--  entrambe, e chi chiama con un argomento solo prendeva e prende quella.
--  Per togliere questa:
--      drop function if exists public.iam_importa_flusso(uuid, text);
--  Le righe già scritte con fonte 'hdi' restano, e si tolgono così:
--      delete from quote_titoli      where fonte = 'hdi';
--      delete from quote_polizze     where fonte = 'hdi';
--      delete from quote_anagrafiche where fonte = 'hdi';
--      delete from quote_importazioni where fonte = 'hdi';
--  (in quest'ordine: le rate prima delle polizze, le polizze prima dei
--   clienti, altrimenti le chiavi esterne si oppongono.)
