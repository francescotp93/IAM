-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 3 · quattro difetti trovati dal collaudo e dalla rilettura ostile
--                                                              22/09/2026
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. **`iam_movimenti_titolo_uno` diceva: una rata ha UN solo movimento.** Era
--    vero quando una rata produceva una scrittura sola (M4, «porta in
--    contabilità»). Dalla Fase 3 ne produce tre o più — l'apertura del
--    sospeso, ogni recupero, gli storni — e quel vincolo faceva morire il
--    secondo recupero contro un indice, DOPO che la schermata aveva detto
--    «registro». L'ha trovato il collaudo sul database vero, non la
--    rilettura.
--    Non si toglie: si RESTRINGE a quello che voleva dire. La protezione vera
--    — una rata non si contabilizza due volte — resta e sta nei posti giusti:
--    `iam_incassi_rate` per gli incassi, `iam_crediti_una_rata` per i sospesi,
--    e i due controlli incrociati qui sotto.
--
-- 2. **`origine` non aveva né `credito` né `recupero`**: apertura e recupero
--    finivano dentro `sospeso`, che in casa è un'altra cosa (gli incassi da
--    accreditare, §32). Due fatti sotto lo stesso nome sono due elenchi che
--    non si incrociano (§18).
--
-- 3. **Le due strade non devono incrociarsi.** Una rata messa a copertura alle
--    9 e incassata dalla Fase 2 alle 11 farebbe nascere DUE volte il debito
--    verso la compagnia — e nessuno dei due indici unici morde, perché stanno
--    su due tabelle diverse. Un vincolo fra due tabelle Postgres non lo sa
--    fare: lo fanno le due funzioni, ognuna guardando l'altra.
--
-- 4. **Le causali.** Aprire un sospeso non è un «incasso premi»: `GENERI`
--    dichiara `apertura_credito` e `recupero_credito` dal 19/09 e nessuna
--    causale li portava. `incide_su_utile` è FALSO su tutte e due — un premio
--    messo a copertura è denaro di qualcun altro, e contarlo come ricavo
--    direbbe che l'agenzia ha guadagnato il premio intero (§26, decisione 2).
--
-- E due cose più piccole, dalla stessa rilettura: un recupero non può portare
-- una data PRIMA dell'apertura (sarebbe il denaro arrivato prima del credito),
-- e il `tipo` 'collaboratore' si rifiuta dicendo dove sta già quel credito.
--
-- ROLLBACK:
--   drop index if exists public.iam_movimenti_titolo_uno;
--   create unique index iam_movimenti_titolo_uno on public.iam_movimenti(titolo_id)
--     where titolo_id is not null and annullato_il is null;
--   alter table public.iam_movimenti drop constraint iam_movimenti_origine_check;
--   alter table public.iam_movimenti add constraint iam_movimenti_origine_check
--     check (origine = any (array['manuale','titolo','flusso','sospeso','storno','incasso']));
--   delete from public.iam_causali where codice in ('apertura_sospeso','recupero_sospeso');
--   (l'ultima riga vale solo finché quelle causali non hanno movimenti: un
--   trigger della M1 vieta di cancellare una causale di sistema, ed è giusto)
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.iam_movimenti drop constraint if exists iam_movimenti_origine_check;
alter table public.iam_movimenti add constraint iam_movimenti_origine_check
  check (origine = any (array['manuale','titolo','flusso','sospeso','storno','incasso','credito','recupero']));

drop index if exists public.iam_movimenti_titolo_uno;
create unique index iam_movimenti_titolo_uno
  on public.iam_movimenti(titolo_id)
  where titolo_id is not null and annullato_il is null
    and origine in ('titolo', 'sospeso');

insert into public.iam_causali (codice, nome, segno, natura, incide_su_utile, genere, di_sistema, ordine)
values ('apertura_sospeso', 'Apertura di un sospeso', 'entrata', 'premi', false, 'apertura_credito', true, 70),
       ('recupero_sospeso', 'Recupero di un sospeso', 'entrata', 'premi', false, 'recupero_credito', true, 80)
on conflict (codice) do nothing;

-- ── L'INCROCIO, un posto solo ─────────────────────────────────────────────
-- Scritto due volte sarebbe due regole, e quella che sbaglia sarebbe quella
-- che nessuno guarda.
create or replace function public.iam_incasso_rate_libere(p_titoli uuid[])
returns void language plpgsql security invoker set search_path = public as $$
declare v_n integer;
begin
  select count(*) into v_n from public.iam_crediti_premio
   where titolo_id = any(p_titoli) and attivo;
  if v_n > 0 then
    raise exception 'Di queste rate % sono a copertura con un sospeso aperto: il denaro si registra come RECUPERO del sospeso, non come incasso — altrimenti il debito verso la compagnia nascerebbe due volte.', v_n;
  end if;
end $$;

-- ── LE TRE FUNZIONI, NELLA VERSIONE DEFINITIVA ────────────────────────────
-- Il file è la fonte di verità: una funzione che vive solo nel database è una
-- regola che nessuno può rileggere. (L'ha trovato una prova, non la rilettura:
-- cercava il corpo indurito e leggeva la migrazione «f», cioè il mondo di
-- mezz'ora prima.)
create or replace function public.iam_credito_apri(
  p_credito jsonb,
  p_righe   jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id      uuid;
  v_mov     uuid;
  v_chiave  text := nullif(p_credito->>'chiave_idempotenza', '');
  v_data    date := coalesce((p_credito->>'aperto_il')::date, current_date);
  v_causale uuid;
  v_imp     numeric(14,2) := (p_credito->>'importo_originale')::numeric;
  v_tit     uuid := nullif(p_credito->>'titolo_id', '')::uuid;
  v_stato   text;
  v_tipo    text := coalesce(nullif(p_credito->>'tipo', ''), 'cliente');
begin
  if v_chiave is not null then
    select id, movimento_id into v_id, v_mov from public.iam_crediti_premio where chiave_idempotenza = v_chiave;
    if v_id is not null then
      return jsonb_build_object('credito_id', v_id, 'movimento_id', v_mov, 'gia_fatto', true);
    end if;
  end if;

  -- Il credito verso un COLLABORATORE esiste già dal 19/09 (le rate che ha
  -- incassato e non ha rimesso: quote_titoli.pagatore_* + rimesso_il, letti da
  -- EstrattoConto.creditoAgenzia). Rifarlo qui sarebbe il secondo archivio
  -- dello stesso fatto, e il giorno in cui uno dei due si chiude i due elenchi
  -- direbbero numeri diversi sulla stessa persona.
  if v_tipo <> 'cliente' then
    raise exception 'Qui si aprono solo i sospesi verso il CLIENTE. Il credito verso un collaboratore è quello che ha incassato e non ha ancora rimesso, e si legge nel suo estratto conto.';
  end if;

  if v_tit is null then raise exception 'Manca la rata da mettere a copertura.'; end if;
  if v_imp is null or v_imp <= 0 then raise exception 'L''importo del premio a copertura dev''essere positivo.'; end if;

  -- La rata dev'essere APERTA adesso, non quando la schermata l'ha letta.
  select stato into v_stato from public.quote_titoli where id = v_tit;
  if v_stato is null then
    raise exception 'Quella rata non esiste, o non si può vedere.';
  end if;
  if v_stato <> 'aperto' then
    raise exception 'Quella rata è «%»: si mette a copertura una rata aperta.', v_stato;
  end if;
  if exists (select 1 from public.iam_crediti_premio where titolo_id = v_tit and attivo) then
    raise exception 'Quella rata ha già un sospeso aperto: un secondo creerebbe un secondo debito verso la compagnia.';
  end if;

  -- L'incrocio con la Fase 2, primo verso.
  if exists (select 1 from public.iam_incassi_rate where titolo_id = v_tit and attiva) then
    raise exception 'Quella rata è già stata incassata: il premio è entrato, non c''è niente da mettere a copertura.';
  end if;

  select id into v_causale from public.iam_causali where codice = 'apertura_sospeso' and attiva;
  if v_causale is null then
    raise exception 'Manca la causale «Apertura di un sospeso», o è spenta: senza, il movimento non ha un verso.';
  end if;

  -- Le righe le costruisce il motore; qui si controlla che dicano la stessa
  -- cosa dell'importo. Non è una seconda regola: è la prova che il pacchetto
  -- non è stato costruito da un'altra parte.
  if jsonb_typeof(p_righe) <> 'array' or jsonb_array_length(p_righe) <> 2 then
    raise exception 'Un''apertura di sospeso ha due righe: il credito e il debito.';
  end if;
  if (select coalesce(sum((x->>'dare')::numeric), 0) from jsonb_array_elements(p_righe) x) <> v_imp
     or (select coalesce(sum((x->>'avere')::numeric), 0) from jsonb_array_elements(p_righe) x) <> v_imp then
    raise exception 'Le righe non corrispondono all''importo del sospeso.';
  end if;
  -- Il Dare deve andare sul conto dei sospesi dichiarato: se andasse su un
  -- conto di denaro direbbe che quei soldi ci sono, e non ci sono.
  if not exists (select 1 from jsonb_array_elements(p_righe) x
                  where (x->>'conto_id')::uuid = (p_credito->>'conto_sospeso_id')::uuid
                    and coalesce((x->>'dare')::numeric, 0) = v_imp) then
    raise exception 'Il credito non nasce sul conto dei sospesi dichiarato.';
  end if;

  insert into public.iam_crediti_premio (
      tipo, titolo_id, polizza_id, cliente_id, cliente, compagnia, compagnia_id,
      collaboratore_id, conto_sospeso_id, importo_originale, aperto_il, previsto_il,
      nota, chiave_idempotenza, creato_da)
  values (
      v_tipo, v_tit,
      nullif(p_credito->>'polizza_id', '')::uuid,
      nullif(p_credito->>'cliente_id', '')::uuid,
      nullif(p_credito->>'cliente', ''),
      nullif(p_credito->>'compagnia', ''),
      nullif(p_credito->>'compagnia_id', '')::uuid,
      nullif(p_credito->>'collaboratore_id', '')::uuid,
      (p_credito->>'conto_sospeso_id')::uuid,
      v_imp, v_data,
      nullif(p_credito->>'previsto_il', '')::date,
      nullif(p_credito->>'nota', ''),
      v_chiave, auth.uid())
  on conflict (chiave_idempotenza) do nothing
  returning id into v_id;

  if v_id is null then
    select id, movimento_id into v_id, v_mov from public.iam_crediti_premio where chiave_idempotenza = v_chiave;
    if v_id is null then raise exception 'Il sospeso non è stato scritto.'; end if;
    return jsonb_build_object('credito_id', v_id, 'movimento_id', v_mov, 'gia_fatto', true);
  end if;

  v_mov := public.iam_movimento_registra(
    jsonb_build_object(
      'data', v_data,
      'conto_id', (p_credito->>'conto_sospeso_id'),
      'causale_id', v_causale,
      'importo', v_imp,
      'descrizione', 'Premio a copertura da recuperare',
      'controparte', nullif(p_credito->>'cliente', ''),
      'origine', 'credito',
      'stato', 'registrato',
      'titolo_id', v_tit,
      'polizza_id', nullif(p_credito->>'polizza_id', ''),
      'chiave_idempotenza', case when v_chiave is null then null else v_chiave || ':mov' end
    ), p_righe);

  update public.iam_crediti_premio set movimento_id = v_mov where id = v_id and movimento_id is null;

  -- E LA RATA NON SI TOCCA. È la decisione che regge tutta la fase: il cliente
  -- non ha pagato, quindi la rata resta aperta e resta nello scadenzario.
  return jsonb_build_object('credito_id', v_id, 'movimento_id', v_mov,
                            'importo', v_imp, 'gia_fatto', false);
end $$;

create or replace function public.iam_credito_recupera(
  p_recupero jsonb,
  p_righe    jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cr      public.iam_crediti_premio%rowtype;
  v_id      uuid;
  v_mov     uuid;
  v_chiave  text := nullif(p_recupero->>'chiave_idempotenza', '');
  v_data    date := coalesce((p_recupero->>'data')::date, current_date);
  v_imp     numeric(14,2) := (p_recupero->>'importo')::numeric;
  v_causale uuid;
  v_rec     numeric(14,2);
  v_res     numeric(14,2);
  v_n       integer;
  v_chiude  boolean := false;
begin
  if v_chiave is not null then
    select id, movimento_id into v_id, v_mov from public.iam_crediti_recuperi where chiave_idempotenza = v_chiave;
    if v_id is not null then
      return jsonb_build_object('recupero_id', v_id, 'movimento_id', v_mov, 'gia_fatto', true);
    end if;
  end if;

  select * into v_cr from public.iam_crediti_premio
   where id = nullif(p_recupero->>'credito_id', '')::uuid for update;
  if v_cr.id is null then raise exception 'Quel sospeso non esiste, o non si può vedere.'; end if;
  if not v_cr.attivo then raise exception 'Quel sospeso è stornato: non c''è più niente da recuperare.'; end if;
  if v_imp is null or v_imp <= 0 then raise exception 'Metti un importo positivo.'; end if;
  -- La data di un recupero non può precedere l'apertura: sarebbe il denaro
  -- arrivato prima che il credito esistesse.
  if v_data < v_cr.aperto_il then
    raise exception 'Il recupero è del %, il sospeso è stato aperto il %: il denaro non può arrivare prima del credito.', v_data, v_cr.aperto_il;
  end if;

  -- Il residuo si RICALCOLA qui dentro, con la riga bloccata: leggerlo dalla
  -- schermata vorrebbe dire fidarsi di un numero letto mezz'ora fa, e due
  -- recuperi partiti insieme porterebbero il residuo sotto zero.
  select coalesce(sum(importo), 0) into v_rec
    from public.iam_crediti_recuperi where credito_id = v_cr.id and attivo;
  v_res := v_cr.importo_originale - v_rec;
  if v_res <= 0 then raise exception 'Quel sospeso è già chiuso: il residuo è zero.'; end if;
  if v_imp > v_res then
    raise exception 'Il residuo è %: di più non si registra qui. Un di più del cliente è un''eccedenza.', v_res;
  end if;
  v_chiude := (v_res - v_imp) <= 0;

  select id into v_causale from public.iam_causali where codice = 'recupero_sospeso' and attiva;
  if v_causale is null then raise exception 'Manca la causale «Recupero di un sospeso», o è spenta.'; end if;

  if jsonb_typeof(p_righe) <> 'array' or jsonb_array_length(p_righe) <> 2 then
    raise exception 'Un recupero ha due righe: il denaro che entra e il credito che scende.';
  end if;
  if (select coalesce(sum((x->>'dare')::numeric), 0) from jsonb_array_elements(p_righe) x) <> v_imp
     or (select coalesce(sum((x->>'avere')::numeric), 0) from jsonb_array_elements(p_righe) x) <> v_imp then
    raise exception 'Le righe non corrispondono all''importo del recupero.';
  end if;
  -- L'Avere DEVE andare sul conto dei sospesi di questo credito: se andasse
  -- sul conto della compagnia, il debito verso di lei nascerebbe due volte.
  if not exists (select 1 from jsonb_array_elements(p_righe) x
                  where (x->>'conto_id')::uuid = v_cr.conto_sospeso_id
                    and coalesce((x->>'avere')::numeric, 0) = v_imp) then
    raise exception 'Il recupero non riduce il conto dei sospesi di questo credito.';
  end if;

  v_mov := public.iam_movimento_registra(
    jsonb_build_object(
      'data', v_data,
      'conto_id', (p_recupero->>'conto_id'),
      'causale_id', v_causale,
      'importo', v_imp,
      'descrizione', 'Recupero su sospeso del ' || to_char(v_cr.aperto_il, 'DD/MM/YYYY'),
      'controparte', v_cr.cliente,
      'origine', 'recupero',
      'stato', 'registrato',
      'titolo_id', v_cr.titolo_id,
      'polizza_id', v_cr.polizza_id,
      'chiave_idempotenza', case when v_chiave is null then null else v_chiave || ':mov' end
    ), p_righe);

  insert into public.iam_crediti_recuperi (credito_id, data, importo, conto_id, mezzo, riferimento, movimento_id, nota, chiave_idempotenza, creato_da)
  values (v_cr.id, v_data, v_imp, (p_recupero->>'conto_id')::uuid,
          nullif(p_recupero->>'mezzo', ''), nullif(p_recupero->>'riferimento', ''),
          v_mov, nullif(p_recupero->>'nota', ''), v_chiave, auth.uid())
  returning id into v_id;

  -- La rata si chiude SOLO quando il credito arriva a zero: è il momento in
  -- cui il denaro è arrivato davvero, e solo allora la provvigione matura.
  if v_chiude then
    update public.quote_titoli
       set stato = 'incassato', incassato_il = v_data,
           mezzo_pagamento = coalesce(nullif(p_recupero->>'mezzo', ''), mezzo_pagamento)
     where id = v_cr.titolo_id and stato = 'aperto';
    get diagnostics v_n = row_count;
    if v_n <> 1 then
      raise exception 'La rata non era più aperta: il recupero non è stato registrato.';
    end if;
  end if;

  return jsonb_build_object('recupero_id', v_id, 'movimento_id', v_mov,
                            'residuo', v_res - v_imp, 'chiude', v_chiude, 'gia_fatto', false);
end $$;

-- E l'incasso della Fase 2 chiede alla Fase 3 se quella rata è libera.
create or replace function public.iam_incasso_registra(
  p_incasso jsonb, p_rate jsonb, p_pagamenti jsonb
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid; v_mov uuid;
  v_chiave text := nullif(p_incasso->>'chiave_idempotenza','');
  v_data date := coalesce((p_incasso->>'data')::date, current_date);
  v_causale uuid; v_tot_r numeric(14,2):=0; v_tot_p numeric(14,2):=0;
  v_mezzo text := nullif(p_incasso->>'mezzo',''); v_titoli uuid[];
  v_gia integer; v_n integer; r jsonb; v_rate_n integer := 0;
begin
  if v_chiave is not null then
    select id, movimento_id into v_id, v_mov from public.iam_incassi where chiave_idempotenza = v_chiave;
    if v_id is not null then return jsonb_build_object('incasso_id',v_id,'movimento_id',v_mov,'gia_fatto',true); end if;
  end if;
  if jsonb_typeof(p_rate) <> 'array' or jsonb_array_length(p_rate) = 0 then
    raise exception 'Non c''è nessuna rata da incassare.'; end if;
  if jsonb_typeof(p_pagamenti) <> 'array' or jsonb_array_length(p_pagamenti) = 0 then
    raise exception 'Non è stato detto come il cliente ha pagato.'; end if;
  select id into v_causale from public.iam_causali where codice='incasso_premi' and attiva;
  if v_causale is null then raise exception 'Manca la causale «Incasso premi», o è spenta: senza, il movimento non ha un verso e l''incasso non si registra.'; end if;
  select coalesce(sum((x->>'importo')::numeric),0) into v_tot_r from jsonb_array_elements(p_rate) x;
  select coalesce(sum((x->>'importo')::numeric),0) into v_tot_p from jsonb_array_elements(p_pagamenti) x;
  if v_tot_r <> v_tot_p then raise exception 'L''incasso non quadra: rate % contro pagamenti %.', v_tot_r, v_tot_p; end if;
  select array_agg((x->>'titolo_id')::uuid) into v_titoli from jsonb_array_elements(p_rate) x;
  select count(*) into v_gia from public.quote_titoli where id = any(v_titoli) and stato <> 'aperto';
  if v_gia > 0 then raise exception 'Di queste rate % non sono più aperte: qualcuno le ha già incassate. Ricarica e riprova.', v_gia; end if;
  -- L'incrocio con la Fase 3: una rata a copertura si RECUPERA, non si incassa.
  perform public.iam_incasso_rate_libere(v_titoli);
  if jsonb_typeof(p_incasso->'righe') <> 'array' or jsonb_array_length(p_incasso->'righe') < 2 then
    raise exception 'Mancano le righe di prima nota dell''incasso.'; end if;
  if (select coalesce(sum((x->>'dare')::numeric),0) from jsonb_array_elements(p_incasso->'righe') x) <> v_tot_p then
    raise exception 'Le righe in Dare non corrispondono ai pagamenti dichiarati.'; end if;
  if (select coalesce(sum((x->>'avere')::numeric),0) from jsonb_array_elements(p_incasso->'righe') x) <> v_tot_r then
    raise exception 'Le righe in Avere non corrispondono alle rate scelte.'; end if;
  insert into public.iam_incassi (data, cliente_id, cliente, totale, chiave_idempotenza, nota, creato_da)
  values (v_data, nullif(p_incasso->>'cliente_id','')::uuid, nullif(p_incasso->>'cliente',''),
          v_tot_r, v_chiave, nullif(p_incasso->>'nota',''), auth.uid())
  on conflict (chiave_idempotenza) do nothing returning id into v_id;
  if v_id is null then
    select id, movimento_id into v_id, v_mov from public.iam_incassi where chiave_idempotenza = v_chiave;
    if v_id is null then raise exception 'L''incasso non è stato scritto e non se ne trova un altro con la stessa chiave.'; end if;
    return jsonb_build_object('incasso_id',v_id,'movimento_id',v_mov,'gia_fatto',true);
  end if;
  v_mov := public.iam_movimento_registra(
    jsonb_build_object('data',v_data,'conto_id',(p_incasso->>'conto_id'),'causale_id',v_causale,
      'importo',v_tot_r,
      'descrizione',coalesce(nullif(p_incasso->>'descrizione',''),'Incasso di '||jsonb_array_length(p_rate)||' rate'),
      'controparte',nullif(p_incasso->>'cliente',''),'origine','incasso','stato','registrato',
      'chiave_idempotenza', case when v_chiave is null then null else v_chiave||':mov' end),
    p_incasso->'righe');
  update public.iam_incassi set movimento_id = v_mov where id = v_id and movimento_id is null;
  for r in select * from jsonb_array_elements(p_rate) loop
    insert into public.iam_incassi_rate (incasso_id,titolo_id,polizza_id,compagnia,compagnia_id,importo)
    values (v_id,(r->>'titolo_id')::uuid,nullif(r->>'polizza_id','')::uuid,
            nullif(r->>'compagnia',''),nullif(r->>'compagnia_id','')::uuid,(r->>'importo')::numeric);
    v_rate_n := v_rate_n + 1;
  end loop;
  for r in select * from jsonb_array_elements(p_pagamenti) loop
    insert into public.iam_incassi_pagamenti (incasso_id,conto_id,importo,mezzo,riferimento)
    values (v_id,(r->>'conto_id')::uuid,(r->>'importo')::numeric,nullif(r->>'mezzo',''),nullif(r->>'riferimento',''));
  end loop;
  update public.quote_titoli set stato='incassato', incassato_il=v_data,
         mezzo_pagamento = coalesce(v_mezzo, mezzo_pagamento)
   where id = any(v_titoli) and stato='aperto';
  get diagnostics v_n = row_count;
  if v_n <> v_rate_n then
    raise exception 'Si dovevano chiudere % rate e se ne sono chiuse %: l''incasso non è stato registrato.', v_rate_n, v_n; end if;
  return jsonb_build_object('incasso_id',v_id,'movimento_id',v_mov,'rate',v_rate_n,'totale',v_tot_r,'gia_fatto',false);
end $$;

-- ── COLLAUDATO SUL DATABASE VERO (22/09/2026), e annullato ────────────────
--   apertura di un sospeso da 12,00 €            → la rata resta APERTA
--   secondo sospeso sulla stessa rata            → rifiutato
--   incasso (Fase 2) su una rata a copertura     → rifiutato, col verso giusto
--   recupero parziale di 6,00 €                  → residuo 6,00, rata aperta
--   recupero di più del residuo                  → rifiutato
--   tipo 'collaboratore'                         → rifiutato, e dice dove sta
--   recupero finale                              → residuo 0, rata INCASSATA
--   storno                                       → 2 recuperi stornati, rata di nuovo aperta
--   saldo del conto sospesi e del conto compagnia dopo tutto → 0,00 e 0,00
