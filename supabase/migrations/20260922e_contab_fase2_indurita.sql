-- ═══════════════════════════════════════════════════════════════════════════
-- CONTABILITÀ · FASE 2 — QUATTRO DIFETTI TROVATI PRIMA DEL PRIMO INCASSO
--                                                              22/09/2026
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Rilettura ostile della Fase 2 prima di registrare un incasso vero. Nessuno
-- dei quattro dà un errore: tutti e quattro producono numeri credibili e
-- sbagliati, e tre sono stati trovati dal collaudo sul database, non dalla
-- rilettura.
--
-- 1. `origine = 'incasso'` non era nel vincolo. Il primo incasso sarebbe morto
--    contro un CHECK DOPO che la schermata aveva detto «registro». È lo stesso
--    inciampo della Fase 1 con «storno»: un vocabolario che vive in un CHECK
--    non lo vede nessuno, e le prove sul sorgente non leggono i CHECK.
-- 2. L'idempotenza era un SELECT seguito da un INSERT, senza lock. Due clic
--    simultanei passano tutti e due il controllo, il secondo muore sul vincolo
--    unico, e la schermata dice «errore» su un incasso RIUSCITO: chi riprova
--    con una chiave nuova ne fa due. Adesso lo decide Postgres.
-- 3. `update quote_titoli` non guardava che la rata fosse ancora aperta, e in
--    plpgsql un update che tocca zero righe non solleva niente — è BUG 1 (§47)
--    dentro il database invece che in PostgREST. Sulle 2.787 rate già
--    incassate un secondo incasso avrebbe sovrascritto `incassato_il` e creato
--    un secondo debito verso la compagnia per un premio entrato una volta.
-- 4. Lo storno non azzerava il pagatore: una rata riaperta continuava a dire
--    che l'aveva incassata un collaboratore, e l'estratto conto gli avrebbe
--    lasciato la provvigione su un incasso che non c'è più (§17, decisione 1).
--
-- E una conseguenza del punto 2: la testata si prenota PRIMA del movimento,
-- quindi il `movimento_id` arriva un istante dopo. Per il trigger di
-- immutabilità era una correzione, e si rifiutava: l'eccezione è dichiarata,
-- ed è una sola — `movimento_id` passa da vuoto a pieno e niente altro cambia.
-- Scritta larga avrebbe permesso di riagganciare un incasso a un altro
-- movimento mesi dopo, che è il buco che quel trigger esiste per chiudere.
--
-- ROLLBACK: rimettere le due funzioni e il trigger della migrazione «d», e
--   alter table public.iam_movimenti drop constraint iam_movimenti_origine_check;
--   alter table public.iam_movimenti add constraint iam_movimenti_origine_check
--     check (origine = any (array['manuale','titolo','flusso','sospeso','storno']));
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.iam_movimenti drop constraint if exists iam_movimenti_origine_check;
alter table public.iam_movimenti add constraint iam_movimenti_origine_check
  check (origine = any (array['manuale','titolo','flusso','sospeso','storno','incasso']));

create or replace function public.iam_incasso_immutabile()
returns trigger language plpgsql as $$
begin
  -- La nascita: la testata è appena stata prenotata e riceve il suo movimento.
  if old.movimento_id is null and new.movimento_id is not null
     and new.stato = old.stato
     and new.totale is not distinct from old.totale
     and new.data is not distinct from old.data
     and new.cliente_id is not distinct from old.cliente_id then
    return new;
  end if;

  if old.stato = 'stornato' then
    raise exception 'Questo incasso è già stornato: non si storna due volte.';
  end if;
  if new.stato is distinct from 'stornato' then
    raise exception 'Un incasso registrato non si corregge: si storna, e lo storno resta a registro.';
  end if;
  if new.totale is distinct from old.totale
     or new.data is distinct from old.data
     or new.cliente_id is distinct from old.cliente_id
     or new.movimento_id is distinct from old.movimento_id then
    raise exception 'Di un incasso registrato si può cambiare solo lo stato in «stornato».';
  end if;
  return new;
end $$;

create or replace function public.iam_incasso_registra(
  p_incasso    jsonb,
  p_rate       jsonb,
  p_pagamenti  jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id       uuid;
  v_mov      uuid;
  v_chiave   text := nullif(p_incasso->>'chiave_idempotenza', '');
  v_data     date := coalesce((p_incasso->>'data')::date, current_date);
  v_causale  uuid;
  v_tot_r    numeric(14,2) := 0;
  v_tot_p    numeric(14,2) := 0;
  v_mezzo    text := nullif(p_incasso->>'mezzo', '');
  v_titoli   uuid[];
  v_gia      integer;
  v_n        integer;
  r          jsonb;
  v_rate_n   integer := 0;
begin
  if v_chiave is not null then
    select id, movimento_id into v_id, v_mov from public.iam_incassi where chiave_idempotenza = v_chiave;
    if v_id is not null then
      return jsonb_build_object('incasso_id', v_id, 'movimento_id', v_mov, 'gia_fatto', true);
    end if;
  end if;

  if jsonb_typeof(p_rate) <> 'array' or jsonb_array_length(p_rate) = 0 then
    raise exception 'Non c''è nessuna rata da incassare.';
  end if;
  if jsonb_typeof(p_pagamenti) <> 'array' or jsonb_array_length(p_pagamenti) = 0 then
    raise exception 'Non è stato detto come il cliente ha pagato.';
  end if;

  select id into v_causale from public.iam_causali where codice = 'incasso_premi' and attiva;
  if v_causale is null then
    raise exception 'Manca la causale «Incasso premi», o è spenta: senza, il movimento non ha un verso e l''incasso non si registra.';
  end if;

  select coalesce(sum((x->>'importo')::numeric), 0) into v_tot_r from jsonb_array_elements(p_rate) x;
  select coalesce(sum((x->>'importo')::numeric), 0) into v_tot_p from jsonb_array_elements(p_pagamenti) x;
  if v_tot_r <> v_tot_p then
    raise exception 'L''incasso non quadra: rate % contro pagamenti %.', v_tot_r, v_tot_p;
  end if;

  select array_agg((x->>'titolo_id')::uuid) into v_titoli from jsonb_array_elements(p_rate) x;
  select count(*) into v_gia from public.quote_titoli where id = any(v_titoli) and stato <> 'aperto';
  if v_gia > 0 then
    raise exception 'Di queste rate % non sono più aperte: qualcuno le ha già incassate. Ricarica e riprova.', v_gia;
  end if;

  -- Le righe di prima nota le costruisce il MOTORE, che è il posto dove
  -- stanno le regole: riscriverle qui vorrebbe dire averne due, e quella che
  -- sbaglia sarebbe quella che nessuno guarda. Qui si controlla che le due
  -- metà del pacchetto dicano la stessa cosa.
  if jsonb_typeof(p_incasso->'righe') <> 'array' or jsonb_array_length(p_incasso->'righe') < 2 then
    raise exception 'Mancano le righe di prima nota dell''incasso.';
  end if;
  if (select coalesce(sum((x->>'dare')::numeric), 0) from jsonb_array_elements(p_incasso->'righe') x) <> v_tot_p then
    raise exception 'Le righe in Dare non corrispondono ai pagamenti dichiarati.';
  end if;
  if (select coalesce(sum((x->>'avere')::numeric), 0) from jsonb_array_elements(p_incasso->'righe') x) <> v_tot_r then
    raise exception 'Le righe in Avere non corrispondono alle rate scelte.';
  end if;

  -- La testata si prenota PRIMA del movimento, e con `on conflict do nothing`:
  -- è la prenotazione a decidere chi dei due clic simultanei sta registrando.
  -- Il perdente non è un errore: rilegge l'incasso del vincitore.
  insert into public.iam_incassi (data, cliente_id, cliente, totale, chiave_idempotenza, nota, creato_da)
  values (v_data,
          nullif(p_incasso->>'cliente_id', '')::uuid,
          nullif(p_incasso->>'cliente', ''),
          v_tot_r, v_chiave,
          nullif(p_incasso->>'nota', ''),
          auth.uid())
  on conflict (chiave_idempotenza) do nothing
  returning id into v_id;

  if v_id is null then
    select id, movimento_id into v_id, v_mov from public.iam_incassi where chiave_idempotenza = v_chiave;
    if v_id is null then
      raise exception 'L''incasso non è stato scritto e non se ne trova un altro con la stessa chiave.';
    end if;
    return jsonb_build_object('incasso_id', v_id, 'movimento_id', v_mov, 'gia_fatto', true);
  end if;

  v_mov := public.iam_movimento_registra(
    jsonb_build_object(
      'data', v_data,
      'conto_id', (p_incasso->>'conto_id'),
      'causale_id', v_causale,
      'importo', v_tot_r,
      'descrizione', coalesce(nullif(p_incasso->>'descrizione', ''),
                              'Incasso di ' || jsonb_array_length(p_rate) || ' rate'),
      'controparte', nullif(p_incasso->>'cliente', ''),
      'origine', 'incasso',
      'stato', 'registrato',
      'chiave_idempotenza', case when v_chiave is null then null else v_chiave || ':mov' end
    ),
    p_incasso->'righe');

  update public.iam_incassi set movimento_id = v_mov where id = v_id and movimento_id is null;

  for r in select * from jsonb_array_elements(p_rate) loop
    insert into public.iam_incassi_rate (incasso_id, titolo_id, polizza_id, compagnia, compagnia_id, importo)
    values (v_id, (r->>'titolo_id')::uuid, nullif(r->>'polizza_id', '')::uuid,
            nullif(r->>'compagnia', ''), nullif(r->>'compagnia_id', '')::uuid,
            (r->>'importo')::numeric);
    v_rate_n := v_rate_n + 1;
  end loop;

  for r in select * from jsonb_array_elements(p_pagamenti) loop
    insert into public.iam_incassi_pagamenti (incasso_id, conto_id, importo, mezzo, riferimento)
    values (v_id, (r->>'conto_id')::uuid, (r->>'importo')::numeric,
            nullif(r->>'mezzo', ''), nullif(r->>'riferimento', ''));
  end loop;

  -- `and stato = 'aperto'`, e poi si CONTA quante righe si sono mosse: un
  -- update che non tocca niente non è un successo silenzioso.
  update public.quote_titoli
     set stato = 'incassato',
         incassato_il = v_data,
         mezzo_pagamento = coalesce(v_mezzo, mezzo_pagamento)
   where id = any(v_titoli) and stato = 'aperto';
  get diagnostics v_n = row_count;
  if v_n <> v_rate_n then
    raise exception 'Si dovevano chiudere % rate e se ne sono chiuse %: l''incasso non è stato registrato.', v_rate_n, v_n;
  end if;

  return jsonb_build_object('incasso_id', v_id, 'movimento_id', v_mov,
                            'rate', v_rate_n, 'totale', v_tot_r, 'gia_fatto', false);
end $$;

create or replace function public.iam_incasso_storna(
  p_incasso_id uuid,
  p_perche     text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_inc     public.iam_incassi%rowtype;
  v_mov_st  uuid;
  v_righe   jsonb;
  v_titoli  uuid[];
  v_n       integer;
begin
  if nullif(trim(coalesce(p_perche, '')), '') is null then
    raise exception 'Uno storno senza motivo è un buco: scrivi perché.';
  end if;

  select * into v_inc from public.iam_incassi where id = p_incasso_id;
  if v_inc.id is null then
    raise exception 'Quell''incasso non esiste, o non si può vedere.';
  end if;
  if v_inc.stato <> 'registrato' then
    raise exception 'Questo incasso è «%»: si storna solo un incasso registrato.', v_inc.stato;
  end if;
  if v_inc.movimento_id is null then
    raise exception 'Questo incasso non ha un movimento di prima nota: non c''è niente da rovesciare.';
  end if;

  -- Le righe rovesciate si leggono da quelle SCRITTE, non si ricostruiscono
  -- dall'incasso: se un giorno le due cose non coincidessero, lo storno deve
  -- annullare quello che è stato registrato davvero.
  select jsonb_agg(jsonb_build_object(
           'conto_id', r.conto_id, 'dare', r.avere, 'avere', r.dare,
           'descrizione', 'Storno · ' || coalesce(r.descrizione, ''),
           'ordine', r.ordine, 'compagnia_id', r.compagnia_id,
           'cliente_id', r.cliente_id, 'polizza_id', r.polizza_id, 'titolo_id', r.titolo_id)
           order by r.ordine)
    into v_righe
    from public.iam_movimenti_righe r where r.movimento_id = v_inc.movimento_id;

  if v_righe is null or jsonb_array_length(v_righe) < 2 then
    raise exception 'Il movimento di questo incasso non ha righe: si annulla, non si storna.';
  end if;

  v_mov_st := public.iam_movimento_registra(
    jsonb_build_object(
      'data', current_date,
      'conto_id', (select conto_id from public.iam_movimenti where id = v_inc.movimento_id),
      'causale_id', (select causale_id from public.iam_movimenti where id = v_inc.movimento_id),
      'importo', v_inc.totale,
      'descrizione', 'Storno incasso del ' || to_char(v_inc.data, 'DD/MM/YYYY'),
      'controparte', v_inc.cliente,
      'origine', 'storno',
      'stato', 'registrato',
      'storno_di_movimento_id', v_inc.movimento_id,
      'storno_perche', p_perche,
      'chiave_idempotenza', 'storno-incasso:' || p_incasso_id::text
    ),
    v_righe);

  update public.iam_incassi
     set stato = 'stornato', stornato_da = auth.uid(), stornato_il = now(), storno_perche = p_perche
   where id = p_incasso_id;

  select array_agg(titolo_id) into v_titoli from public.iam_incassi_rate where incasso_id = p_incasso_id and attiva;
  update public.iam_incassi_rate set attiva = false where incasso_id = p_incasso_id and attiva;

  -- La rata torna aperta e si dimentica CHI l'aveva incassata: lasciare il
  -- pagatore vorrebbe dire che l'estratto conto continua a maturare una
  -- provvigione su un incasso che non c'è più (§17, decisione 1).
  -- `mezzo_pagamento` invece resta: dice come quel cliente paga, ed è vero
  -- anche dopo lo storno.
  update public.quote_titoli
     set stato = 'aperto', incassato_il = null,
         pagatore_tipo = null, pagatore_collaboratore_id = null
   where id = any(v_titoli) and stato = 'incassato';
  get diagnostics v_n = row_count;

  return jsonb_build_object('incasso_id', p_incasso_id, 'movimento_storno_id', v_mov_st,
                            'rate_riaperte', v_n,
                            'rate_non_riaperte', coalesce(array_length(v_titoli, 1), 0) - v_n);
end $$;

-- ── COLLAUDATO SUL DATABASE VERO (22/09/2026), e annullato ────────────────
--   incasso di 2 rate, 24,00 €, movimento con 2 righe            → scritto
--   stesso tasto premuto due volte (stessa chiave)               → gia_fatto
--   stesse rate con una chiave nuova                             → rifiutato
--   pagamenti che non fanno il totale delle rate                 → rifiutato
--   storno                       → 2 rate riaperte, movimento originale «stornato»
