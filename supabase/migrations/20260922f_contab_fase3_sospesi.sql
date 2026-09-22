-- ═══════════════════════════════════════════════════════════════════════════
-- CONTABILITÀ · FASE 3 — I SOSPESI: I PREMI A COPERTURA E NON RICEVUTI
--                                                              22/09/2026
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Il caso, che in agenzia succede tutti i giorni: la polizza si emette e si
-- mette a copertura perché il cliente non può restare scoperto, ma il premio
-- non è ancora arrivato. Da quel momento l'agenzia DEVE il premio alla
-- compagnia e VANTA un credito verso il cliente. Sono due fatti, e finora in
-- IAM non ne esisteva nessuno dei due.
--
-- MISURATO PRIMA DI SCRIVERE, sul database vero (22/09/2026):
--   quote_titoli   418 aperte, di cui 117 GIÀ SCADUTE, per 98.488,84 €
--   iam_conti      6, ZERO con e_conto_sospeso, ZERO di tipologia 'debito'
--   iam_incassi    0 (la Fase 2 è di stamattina)
--
-- ATTENZIONE AI NOMI, ed è il motivo per cui questa tabella non si chiama
-- «sospesi». In agenzia «sospeso» è il premio che il cliente NON ha pagato —
-- cioè questo. Ma `iam_sospesi` esiste già dal 20/09 ed è l'OPPOSTO: il
-- cliente ha pagato e il denaro non è ancora sul conto («Incassi da
-- accreditare», §32). Riusarla sarebbe mettere due fatti opposti nella stessa
-- tabella; chiamare questa allo stesso modo sarebbe due elenchi che non si
-- incrociano (§18). Quindi: `iam_crediti_premio`.
--
-- ┌─ APERTURA ──────────────────────────────────────────────────────────────
-- │  Dare   Sospesi clienti        (il credito verso il cliente)
-- │  Avere  Conto compagnia        (il debito che la copertura crea)
-- └─ RECUPERO (anche parziale) ─────────────────────────────────────────────
--    Dare   Cassa / Banca / POS…   (il denaro che arriva)
--    Avere  Sospesi clienti        (il credito che si riduce)
--
-- **Il recupero NON crea un nuovo debito verso la compagnia**: quel debito è
-- nato all'apertura. Ricrearlo lo conterebbe due volte.
--
-- **L'apertura NON chiude la rata.** «A copertura» vuol dire che la compagnia
-- è a posto, non che il cliente ha pagato: la rata resta APERTA e resta nello
-- scadenzario, perché è vero che il cliente non ha pagato. Chiuderla come
-- incassata farebbe maturare la provvigione su un premio mai ricevuto (§17,
-- decisione 1) — cioè pagherebbe un collaboratore con i soldi di nessuno.
-- La rata si chiude quando il credito arriva a zero, e non un minuto prima.
--
-- **Il credito verso i COLLABORATORI non si rifà qui.** Esiste dal 19/09: sono
-- le rate che un collaboratore ha incassato e non ha ancora rimesso
-- (`quote_titoli.pagatore_tipo` + `rimesso_il`, letto da
-- `EstrattoConto.creditoAgenzia`, §24). Rifarlo sarebbe il secondo archivio
-- dello stesso fatto. La colonna `tipo` c'è perché il modello possa crescere;
-- oggi vale 'cliente', e la schermata dice perché.
--
-- ROLLBACK (nell'ordine):
--   begin;
--     drop function if exists public.iam_credito_storna(uuid, text);
--     drop function if exists public.iam_credito_recupera(jsonb, jsonb);
--     drop function if exists public.iam_credito_apri(jsonb, jsonb);
--     drop table if exists public.iam_crediti_recuperi;
--     drop table if exists public.iam_crediti_premio;
--   commit;
-- Non rimette indietro i movimenti di prima nota già scritti: sono fatti
-- accaduti. Toglie la strada per farne di nuovi.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── IL CREDITO ────────────────────────────────────────────────────────────
create table if not exists public.iam_crediti_premio (
  id                   uuid primary key default gen_random_uuid(),
  tipo                 text not null default 'cliente' check (tipo in ('cliente', 'collaboratore')),
  titolo_id            uuid not null references public.quote_titoli(id) on delete restrict,
  polizza_id           uuid references public.quote_polizze(id) on delete set null,
  cliente_id           uuid references public.quote_anagrafiche(id) on delete set null,
  -- Il nome si COPIA: un'anagrafica cancellata non deve far sparire il nome da
  -- un credito aperto.
  cliente              text,
  compagnia            text,
  compagnia_id         uuid references public.quote_compagnie(id) on delete set null,
  collaboratore_id     uuid references public.quote_collaboratori(id) on delete set null,
  conto_sospeso_id     uuid not null references public.iam_conti(id) on delete restrict,
  importo_originale    numeric(14,2) not null check (importo_originale > 0),
  aperto_il            date not null default current_date,
  previsto_il          date,
  nota                 text,
  movimento_id         uuid references public.iam_movimenti(id) on delete restrict,
  chiave_idempotenza   text unique,
  -- `attivo` spento dallo storno. Serve all'indice unico parziale: un indice
  -- in Postgres non può leggere un'altra tabella, e senza questa colonna non
  -- si potrebbe dire «una rata ha un solo sospeso vivo».
  attivo               boolean not null default true,
  creato_da            uuid default auth.uid(),
  creato_il            timestamptz not null default now(),
  stornato_da          uuid,
  stornato_il          timestamptz,
  storno_perche        text
);

create index if not exists iam_crediti_titolo_idx   on public.iam_crediti_premio(titolo_id);
create index if not exists iam_crediti_cliente_idx  on public.iam_crediti_premio(cliente_id);
create index if not exists iam_crediti_scad_idx     on public.iam_crediti_premio(previsto_il);
create index if not exists iam_crediti_conto_idx    on public.iam_crediti_premio(conto_sospeso_id);

-- Una rata ha UN solo sospeso vivo. Anche qui la garanzia sta in Postgres e
-- non nel codice che controlla prima di scrivere: due schede aperte insieme
-- passerebbero tutte e due il controllo e creerebbero due debiti verso la
-- compagnia per una rata sola.
create unique index if not exists iam_crediti_una_rata
  on public.iam_crediti_premio(titolo_id) where attivo;

-- ── I RECUPERI ────────────────────────────────────────────────────────────
-- NIENTE colonna `residuo`: si calcola. Un residuo memorizzato si aggiorna da
-- un'altra parte, e il giorno in cui si scosta dalla somma dei recuperi
-- nessuno sa più quale dei due sia quello vero — è la stessa decisione per cui
-- i conti non hanno un `saldo` (§26).
create table if not exists public.iam_crediti_recuperi (
  id            uuid primary key default gen_random_uuid(),
  credito_id    uuid not null references public.iam_crediti_premio(id) on delete cascade,
  data          date not null default current_date,
  importo       numeric(14,2) not null check (importo > 0),
  conto_id      uuid not null references public.iam_conti(id) on delete restrict,
  mezzo         text,
  riferimento   text,
  movimento_id  uuid references public.iam_movimenti(id) on delete restrict,
  nota          text,
  -- La chiave sta in una colonna SUA. La prima stesura la infilava dentro
  -- `nota`, che è il campo dove chi lavora scrive a parole: due significati
  -- nella stessa colonna sono il modo più veloce di perderne uno.
  chiave_idempotenza text unique,
  attivo        boolean not null default true,
  creato_da     uuid default auth.uid(),
  creato_il     timestamptz not null default now()
);

create index if not exists iam_crediti_rec_credito_idx on public.iam_crediti_recuperi(credito_id);
create index if not exists iam_crediti_rec_data_idx    on public.iam_crediti_recuperi(data desc);

-- ── CHI LEGGE E CHI SCRIVE ────────────────────────────────────────────────
-- Come gli incassi della Fase 2: legge e scrive lo staff (mettere a copertura
-- e riscuotere sono il lavoro di tutti i giorni), l'admin resta la soglia sui
-- CONTI. Correggere e cancellare: nessuno — si storna.
alter table public.iam_crediti_premio    enable row level security;
alter table public.iam_crediti_recuperi  enable row level security;

drop policy if exists crd_select on public.iam_crediti_premio;
create policy crd_select on public.iam_crediti_premio for select using (iam_is_staff());
drop policy if exists crd_insert on public.iam_crediti_premio;
create policy crd_insert on public.iam_crediti_premio for insert with check (iam_is_staff() and creato_da = auth.uid());
drop policy if exists crd_update on public.iam_crediti_premio;
create policy crd_update on public.iam_crediti_premio for update using (iam_is_staff()) with check (iam_is_staff());

drop policy if exists crdr_select on public.iam_crediti_recuperi;
create policy crdr_select on public.iam_crediti_recuperi for select using (iam_is_staff());
drop policy if exists crdr_insert on public.iam_crediti_recuperi;
create policy crdr_insert on public.iam_crediti_recuperi for insert with check (iam_is_staff() and creato_da = auth.uid());
drop policy if exists crdr_update on public.iam_crediti_recuperi;
create policy crdr_update on public.iam_crediti_recuperi for update using (iam_is_staff()) with check (iam_is_staff());

-- ── UN CREDITO REGISTRATO NON SI RISCRIVE ─────────────────────────────────
-- Gli importi e i riferimenti sono fermi. Cambiano solo le tre cose che lo
-- storno tocca, e la data prevista — che è una previsione, non un fatto, e si
-- corregge quando il cliente dice «pago il mese prossimo».
create or replace function public.iam_credito_immutabile()
returns trigger language plpgsql as $$
begin
  if new.importo_originale is distinct from old.importo_originale
     or new.titolo_id is distinct from old.titolo_id
     or new.conto_sospeso_id is distinct from old.conto_sospeso_id
     or new.aperto_il is distinct from old.aperto_il then
    raise exception 'Di un sospeso registrato si possono cambiare solo la data prevista e la nota: per il resto si storna.';
  end if;
  /* La NASCITA: la testata si prenota prima del movimento (è la prenotazione a
     decidere chi vince fra due clic), quindi il movimento arriva un istante
     dopo. L'eccezione è una sola — da vuoto a pieno — come nella Fase 2. */
  if old.movimento_id is not null and new.movimento_id is distinct from old.movimento_id then
    raise exception 'Il movimento di un sospeso non si riaggancia.';
  end if;
  if old.attivo = false and new.attivo = true then
    raise exception 'Un sospeso stornato non si riaccende: se ne apre uno nuovo.';
  end if;
  return new;
end $$;

drop trigger if exists iam_crediti_immutabile on public.iam_crediti_premio;
create trigger iam_crediti_immutabile before update on public.iam_crediti_premio
  for each row execute function public.iam_credito_immutabile();

create or replace function public.iam_credito_rec_immutabile()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Un recupero non si cancella: si storna il sospeso, e resta a registro.';
  end if;
  if new.importo is distinct from old.importo
     or new.chiave_idempotenza is distinct from old.chiave_idempotenza
     or new.credito_id is distinct from old.credito_id
     or new.conto_id is distinct from old.conto_id
     or new.movimento_id is distinct from old.movimento_id then
    raise exception 'Gli importi e i riferimenti di un recupero non si riscrivono.';
  end if;
  if old.attivo = false and new.attivo = true then
    raise exception 'Un recupero spento non si riaccende.';
  end if;
  return new;
end $$;

drop trigger if exists iam_crediti_rec_immutabile on public.iam_crediti_recuperi;
create trigger iam_crediti_rec_immutabile before update or delete on public.iam_crediti_recuperi
  for each row execute function public.iam_credito_rec_immutabile();

-- ── APRIRE UN SOSPESO ─────────────────────────────────────────────────────
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
begin
  if v_chiave is not null then
    select id, movimento_id into v_id, v_mov from public.iam_crediti_premio where chiave_idempotenza = v_chiave;
    if v_id is not null then
      return jsonb_build_object('credito_id', v_id, 'movimento_id', v_mov, 'gia_fatto', true);
    end if;
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

  select id into v_causale from public.iam_causali where codice = 'incasso_premi' and attiva;
  if v_causale is null then
    raise exception 'Manca la causale «Incasso premi», o è spenta: senza, il movimento non ha un verso.';
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

  insert into public.iam_crediti_premio (
      tipo, titolo_id, polizza_id, cliente_id, cliente, compagnia, compagnia_id,
      collaboratore_id, conto_sospeso_id, importo_originale, aperto_il, previsto_il,
      nota, chiave_idempotenza, creato_da)
  values (
      coalesce(nullif(p_credito->>'tipo', ''), 'cliente'),
      v_tit,
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
      'origine', 'sospeso',
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

comment on function public.iam_credito_apri(jsonb, jsonb) is
  'Apre un sospeso su una rata: credito verso il cliente, debito verso la compagnia, movimento di prima nota. La rata resta APERTA. Idempotente sulla chiave.';

-- ── RECUPERARE, ANCHE UN PEZZO PER VOLTA ──────────────────────────────────
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

  select id into v_causale from public.iam_causali where codice = 'incasso_premi' and attiva;
  if v_causale is null then raise exception 'Manca la causale «Incasso premi», o è spenta.'; end if;

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
      'origine', 'sospeso',
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

comment on function public.iam_credito_recupera(jsonb, jsonb) is
  'Registra un recupero, anche parziale, su un sospeso: movimento di prima nota e riga di recupero. Il residuo si ricalcola con la riga bloccata. La rata si chiude solo quando il residuo arriva a zero.';

-- ── STORNARE UN SOSPESO ───────────────────────────────────────────────────
-- Rovescia tutto: l'apertura, ogni recupero, e la rata se era stata chiusa.
create or replace function public.iam_credito_storna(
  p_credito_id uuid,
  p_perche     text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cr    public.iam_crediti_premio%rowtype;
  v_r     record;
  v_righe jsonb;
  v_mov   uuid;
  v_n     integer := 0;
  v_tit   integer := 0;
begin
  if nullif(trim(coalesce(p_perche, '')), '') is null then
    raise exception 'Uno storno senza motivo è un buco: scrivi perché.';
  end if;
  select * into v_cr from public.iam_crediti_premio where id = p_credito_id for update;
  if v_cr.id is null then raise exception 'Quel sospeso non esiste, o non si può vedere.'; end if;
  if not v_cr.attivo then raise exception 'Quel sospeso è già stornato.'; end if;

  -- Prima i recuperi, dal più recente: ognuno il suo movimento inverso.
  for v_r in select * from public.iam_crediti_recuperi
              where credito_id = p_credito_id and attivo and movimento_id is not null
              order by data desc, creato_il desc loop
    select jsonb_agg(jsonb_build_object(
             'conto_id', x.conto_id, 'dare', x.avere, 'avere', x.dare,
             'descrizione', 'Storno · ' || coalesce(x.descrizione, ''), 'ordine', x.ordine,
             'compagnia_id', x.compagnia_id, 'cliente_id', x.cliente_id,
             'polizza_id', x.polizza_id, 'titolo_id', x.titolo_id) order by x.ordine)
      into v_righe from public.iam_movimenti_righe x where x.movimento_id = v_r.movimento_id;
    if v_righe is not null and jsonb_array_length(v_righe) >= 2 then
      perform public.iam_movimento_registra(
        jsonb_build_object('data', current_date,
          'conto_id', (select conto_id from public.iam_movimenti where id = v_r.movimento_id),
          'causale_id', (select causale_id from public.iam_movimenti where id = v_r.movimento_id),
          'importo', v_r.importo, 'descrizione', 'Storno recupero del ' || to_char(v_r.data, 'DD/MM/YYYY'),
          'origine', 'storno', 'stato', 'registrato',
          'storno_di_movimento_id', v_r.movimento_id, 'storno_perche', p_perche,
          'chiave_idempotenza', 'storno-recupero:' || v_r.id::text), v_righe);
    end if;
    v_n := v_n + 1;
  end loop;
  update public.iam_crediti_recuperi set attivo = false where credito_id = p_credito_id and attivo;

  -- Poi l'apertura.
  if v_cr.movimento_id is not null then
    select jsonb_agg(jsonb_build_object(
             'conto_id', x.conto_id, 'dare', x.avere, 'avere', x.dare,
             'descrizione', 'Storno · ' || coalesce(x.descrizione, ''), 'ordine', x.ordine,
             'compagnia_id', x.compagnia_id, 'cliente_id', x.cliente_id,
             'polizza_id', x.polizza_id, 'titolo_id', x.titolo_id) order by x.ordine)
      into v_righe from public.iam_movimenti_righe x where x.movimento_id = v_cr.movimento_id;
    if v_righe is null or jsonb_array_length(v_righe) < 2 then
      raise exception 'Il movimento di questo sospeso non ha righe: si annulla, non si storna.';
    end if;
    v_mov := public.iam_movimento_registra(
      jsonb_build_object('data', current_date,
        'conto_id', (select conto_id from public.iam_movimenti where id = v_cr.movimento_id),
        'causale_id', (select causale_id from public.iam_movimenti where id = v_cr.movimento_id),
        'importo', v_cr.importo_originale,
        'descrizione', 'Storno sospeso del ' || to_char(v_cr.aperto_il, 'DD/MM/YYYY'),
        'controparte', v_cr.cliente, 'origine', 'storno', 'stato', 'registrato',
        'storno_di_movimento_id', v_cr.movimento_id, 'storno_perche', p_perche,
        'chiave_idempotenza', 'storno-sospeso:' || p_credito_id::text), v_righe);
  end if;

  update public.iam_crediti_premio
     set attivo = false, stornato_da = auth.uid(), stornato_il = now(), storno_perche = p_perche
   where id = p_credito_id;

  -- E se il recupero aveva chiuso la rata, la rata torna aperta: uno storno
  -- che la lasciasse chiusa direbbe che quel premio è entrato.
  update public.quote_titoli set stato = 'aperto', incassato_il = null
   where id = v_cr.titolo_id and stato = 'incassato';
  get diagnostics v_tit = row_count;

  return jsonb_build_object('credito_id', p_credito_id, 'movimento_storno_id', v_mov,
                            'recuperi_stornati', v_n, 'rata_riaperta', v_tit = 1);
end $$;

comment on function public.iam_credito_storna(uuid, text) is
  'Storna un sospeso: movimenti inversi dell''apertura e di ogni recupero, righe spente, rata riaperta se era stata chiusa. Il motivo è obbligatorio.';

commit;

-- ── CONTROLLI, da fare dopo ───────────────────────────────────────────────
-- 1. Creare i conti che mancano: «Sospesi clienti» (e_conto_sospeso) e il
--    «Conto compagnia» (tipologia debito). Senza, la schermata lo dice e non
--    apre niente — ed è giusto.
-- 2. Aprire un sospeso su una rata vera: la rata deve restare APERTA e il
--    movimento avere Dare sui sospesi e Avere sul conto della compagnia.
-- 3. Recuperare metà: il residuo scende, la rata resta aperta.
-- 4. Recuperare il resto: la rata si chiude come incassata.
-- 5. Stornare: due movimenti inversi, rata di nuovo aperta.
