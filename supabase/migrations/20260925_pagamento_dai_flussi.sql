-- ═══════════════════════════════════════════════════════════════════════════
--  IL PAGAMENTO DELLE RATE ARRIVA DAL FLUSSO, E LA MANO DI FRANCESCO VINCE
--                                                              (25/09/2026)
--
--  «Le rate che arrivano dai flussi di compagnia devono andare in incasso o
--   in sospeso in automatico, in base all'incasso messo in contabilità dalla
--   compagnia — sempre con la possibilità di modificare il pagamento.»
--
--  Due cose, e la seconda è quella che rende utile la prima.
--
--  1. DUE COLONNE NUOVE su quote_titoli, tutte e due NULLABLE e aggiuntive:
--
--       pagamento          'incassato' | 'sospeso' | 'da_incassare'
--                          Il terzo stato non c'era: la colonna `stato` del
--                          database ammette aperto/incassato/insoluto/
--                          stornato/annullato, e «sospeso» non c'è. Non si
--                          allarga quel vincolo — le schermate che leggono
--                          `stato` continuano a funzionare, e il dettaglio
--                          vive qui.
--
--       pagamento_a_mano   quando qualcuno l'ha deciso a mano (e chi).
--                          Finché è nullo, il flusso comanda. Appena c'è,
--                          il flusso non tocca più quella riga.
--
--     NESSUN BACKFILL. Le righe di prima restano con `pagamento` nullo, e
--     chi legge sa che vuol dire «nessuno l'ha ancora detto»: si ricava da
--     `stato` come si è sempre fatto. Riempirle in blocco vorrebbe dire
--     scrivere su 2.799 rate una cosa che non ho verificato riga per riga.
--
--  2. L'IMPORTAZIONE AGGIORNA, invece di non fare niente. C'era
--     `on conflict do nothing`: una rata già in archivio non veniva mai
--     più guardata, quindi se il mese dopo la compagnia la incassava il
--     portafoglio restava indietro per sempre. Adesso si aggiorna, ma solo
--     dove `pagamento_a_mano` è nullo.
--
--  E il verbale impara a contare le aggiornate separatamente dalle nuove
--  (`xmax = 0`): senza quello direbbe «18 rate nuove» anche quando ne ha
--  scritte zero e aggiornate diciotto.
--
--  COME SI TORNA INDIETRO
--    Le colonne si lasciano: sono nullabili e non danno fastidio a nessuno.
--    Per la funzione, si riapplica 20260924_import_anche_hdi.sql, che la
--    ridefinisce per intero.
-- ═══════════════════════════════════════════════════════════════════════════

alter table quote_titoli add column if not exists pagamento text;
alter table quote_titoli add column if not exists pagamento_a_mano timestamptz;
-- uuid nudo, senza chiave esterna verso auth.users: nessun'altra migrazione di
-- questo repo ne aggancia una, e `creato_da` — che è la stessa cosa — sta lì
-- senza. Una chiave esterna qui cambierebbe anche cosa succede quando si
-- cancella un utente, e non è una decisione da prendere di straforo.
alter table quote_titoli add column if not exists pagamento_a_mano_da uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quote_titoli_pagamento_check') then
    alter table quote_titoli add constraint quote_titoli_pagamento_check
      check (pagamento is null or pagamento in ('incassato', 'sospeso', 'da_incassare'));
  end if;
end $$;

comment on column quote_titoli.pagamento is
  'Incassato / sospeso / da incassare, deciso dal flusso di compagnia. Nullo = nessuno l''ha ancora detto: si ricava da stato.';
comment on column quote_titoli.pagamento_a_mano is
  'Quando il pagamento è stato deciso a mano. Finché è nullo il flusso comanda; appena c''è, il flusso non tocca più la riga.';

/* Serve alla schermata che elenca i sospesi e le rate da incassare: senza,
   ogni apertura scorre tutte le rate del portafoglio. */
create index if not exists quote_titoli_pagamento_idx
  on quote_titoli (pagamento) where pagamento is not null;

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
  v_tit_agg   int := 0;
  v_pol_agg   int := 0;
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
       stato, pagamento, mezzo_pagamento, incassato_il, note, collaboratore_id, fonte, fonte_id, creato_da)
    select p.id, coalesce(nullif(righe.r->>'tipo', ''), 'rata'),
           nullif(righe.r->>'data_decorrenza', '')::date, nullif(righe.r->>'data_scadenza', '')::date,
           nullif(righe.r->>'importo_lordo', '')::numeric, nullif(righe.r->>'provvigione', '')::numeric,
           coalesce(nullif(righe.r->>'stato', ''), 'aperto'),
           coalesce(nullif(righe.r->>'pagamento', ''), 'da_incassare'),
           nullif(righe.r->>'mezzo_pagamento', ''),
           nullif(righe.r->>'incassato_il', '')::date, nullif(righe.r->>'note', ''),
           nullif(righe.r->>'collaboratore_id', '')::uuid,
           v_fonte, righe.r->>'_fonte_id', auth.uid()
      from righe
      join _pol p on p.chiave = righe.r->>'_polizza'
     where nullif(righe.r->>'data_decorrenza', '') is not null
       and nullif(righe.r->>'importo_lordo', '') is not null
    /* IL BUCO CHE SI CHIUDE. Fino al 25/09/2026 qui c'era `do nothing`: una
       rata già in archivio non veniva MAI aggiornata, quindi se il mese dopo
       la compagnia la incassava il portafoglio restava indietro per sempre.

       Adesso si aggiorna — con due guardie, e sono il punto di tutta questa
       migrazione:

         · `pagamento_a_mano is null`: se qualcuno l'ha corretta a mano, il
           flusso NON la tocca. È la promessa fatta a Francesco: «sempre con
           la possibilità di modificare il pagamento», e una modifica che il
           flusso successivo riporta indietro non è una possibilità.
         · si scrive solo se cambia qualcosa, così il conto delle aggiornate
           dice quante ne sono cambiate davvero e non quante ne ha guardate.

       Le date e il mezzo si RIEMPIONO e non si svuotano (`coalesce` con il
       valore di prima): un estratto che non porta il mezzo non deve
       cancellare quello che c'era. */
    on conflict (fonte, fonte_id) where fonte_id is not null do update
      set stato           = excluded.stato,
          pagamento       = excluded.pagamento,
          mezzo_pagamento = coalesce(excluded.mezzo_pagamento, quote_titoli.mezzo_pagamento),
          incassato_il    = coalesce(excluded.incassato_il, quote_titoli.incassato_il),
          /* LA PROVVIGIONE SI RIEMPIE SOLO SE MANCA, e l'ordine del coalesce
             è invertito apposta rispetto alle due righe qui sopra.

             Mezzo e data di incasso sono pezzi dello STESSO fatto che il
             flusso sta scrivendo (l'incasso), quindi lì comanda il flusso.
             La provvigione no: è quello che l'agenzia guadagna, non fa parte
             dello stato di pagamento, e non c'è nessuna casella che protegga
             una correzione fatta lì. Se Francesco la sistema a mano senza
             toccare il pagamento, `pagamento_a_mano` resta nullo e il flusso
             gliela riscriverebbe sopra in silenzio.
             Quindi: buco sì, smentita no. */
          provvigione     = coalesce(quote_titoli.provvigione, excluded.provvigione)
      where quote_titoli.pagamento_a_mano is null
        and (quote_titoli.stato     is distinct from excluded.stato
          or quote_titoli.pagamento is distinct from excluded.pagamento
          or (excluded.incassato_il is not null and quote_titoli.incassato_il is null)
          or (excluded.mezzo_pagamento is not null and quote_titoli.mezzo_pagamento is null))
    /* `xmax = 0` distingue la riga appena inserita da quella aggiornata: senza
       questo il verbale direbbe «18 rate nuove» anche quando ne ha scritte
       zero e aggiornate diciotto, e Francesco leggerebbe un numero che non
       corrisponde a niente. */
    returning (xmax = 0) as inserita
  )
  select count(*) filter (where inserita), count(*) filter (where not inserita)
    into v_titoli, v_tit_agg from ins;

  /* LA POLIZZA SEGUE LE SUE RATE, anche quando è già in archivio. In archivio
     ci sono 18 polizze HDI che dicono «non pagato» mentre 12 delle loro rate
     sono incassate: l'inserimento le aveva scritte così e nessuno le ha più
     toccate.

     Si aggiorna SOLO quando il flusso dice qualcosa (`stato_pagamento` non
     nullo: una polizza di cui l'estratto non porta rate resta com'è), e solo
     sulle polizze di QUESTA fonte — non si mette mano a quelle scritte a mano
     o da un'altra compagnia. */
  with righe as (
    select r
      from iam_import_lotti l, lateral jsonb_array_elements(l.righe) r
     where l.lotto = p_lotto and l.tipo = 'polizze' and l.creato_da = auth.uid()
  ), agg as (
    update quote_polizze p
       set stato_pagamento = righe.r->>'stato_pagamento'
      from righe
     where p.fonte = v_fonte
       and p.fonte_id = righe.r->>'_fonte_id'
       and nullif(righe.r->>'stato_pagamento', '') is not null
       and p.stato_pagamento is distinct from righe.r->>'stato_pagamento'
    returning 1
  )
  select count(*) into v_pol_agg from agg;

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
       'titoli_aggiornati', v_tit_agg,
       'polizze_aggiornate', v_pol_agg,
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
    'titoli_aggiornati', v_tit_agg,
    'polizze_aggiornate', v_pol_agg,
    'titoli_proposti', v_proposti,
    'titoli_senza_polizza', v_orfani,
    'titoli_senza_dati', v_tit_dati,
    'polizze_senza_cliente', v_senza_cli,
    'polizze_senza_dati', v_pol_dati,
    'polizze_numero_doppio', v_pol_num);
end;
$function$;
