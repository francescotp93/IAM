-- ═══════════════════════════════════════════════════════════════════════════
-- CONTABILITÀ · FASE 2 — L'INCASSO DI UNA O PIÙ RATE          22/09/2026
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La Fase 1 ha dato alla prima nota due gambe (partita doppia). Questa fase
-- collega quelle gambe al portafoglio: una rata che si incassa adesso muove
-- un conto, e il conto lo sa.
--
-- MISURATO PRIMA DI SCRIVERE, sul database vero (22/09/2026):
--   quote_titoli    418 aperte, 2.787 incassate
--   iam_conti       6, di cui 2 dichiarano un mezzo di pagamento, 0 di debito
--   iam_causali     12 (fra cui «incasso_premi», di sistema)
--   iam_movimenti   1, iam_movimenti_righe 0
--
-- Da cui una conseguenza che va detta subito: **nessun conto di debito verso
-- una compagnia esiste ancora.** Finché non ne esiste uno, questa schermata
-- non registra niente e lo dice — non se ne inventa uno (regola di casa §8.1,
-- che sul denaro non fa eccezioni). Il conto si crea in Strumenti › Conti e
-- causali, dove i dodici conti minimi sono già proposti.
--
-- TRE TABELLE, e il motivo per cui sono tre e non una:
--   iam_incassi            la testata: quando, chi, con quale movimento
--   iam_incassi_rate       quali rate si stanno incassando
--   iam_incassi_pagamenti  in quanti modi il cliente ha pagato
-- Un incasso con tre rate e due modalità è UN fatto con cinque righe: in una
-- tabella sola sarebbe sei righe che si ripetono i dati della testata, e la
-- prima volta che una di quelle copie diverge nessuno sa più quale sia vera.
--
-- ROLLBACK (nell'ordine, e da leggere prima di lanciarlo):
--   begin;
--     drop function if exists public.iam_incasso_registra(jsonb, jsonb, jsonb);
--     drop table if exists public.iam_incassi_pagamenti;
--     drop table if exists public.iam_incassi_rate;
--     drop table if exists public.iam_incassi;
--   commit;
-- Il rollback NON rimette indietro le rate incassate né i movimenti di prima
-- nota: quelli restano dove sono, perché sono fatti accaduti. Toglie la strada
-- per farne di nuovi. Chi lo lancia deve saperlo.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── LA TESTATA ────────────────────────────────────────────────────────────
create table if not exists public.iam_incassi (
  id                  uuid primary key default gen_random_uuid(),
  data                date not null default current_date,
  cliente_id          uuid references public.quote_anagrafiche(id) on delete set null,
  -- Il nome si COPIA, e non è un doppione: un'anagrafica cancellata non deve
  -- far sparire il nome da un incasso già registrato.
  cliente             text,
  totale              numeric(14,2) not null check (totale > 0),
  stato               text not null default 'registrato'
                      check (stato in ('registrato', 'stornato')),
  movimento_id        uuid references public.iam_movimenti(id) on delete restrict,
  chiave_idempotenza  text unique,
  nota                text,
  creato_da           uuid default auth.uid(),
  creato_il           timestamptz not null default now(),
  stornato_da         uuid,
  stornato_il         timestamptz,
  storno_perche       text
);

create index if not exists iam_incassi_data_idx     on public.iam_incassi(data desc);
create index if not exists iam_incassi_cliente_idx  on public.iam_incassi(cliente_id);
create index if not exists iam_incassi_mov_idx      on public.iam_incassi(movimento_id);

-- ── LE RATE INCASSATE ─────────────────────────────────────────────────────
create table if not exists public.iam_incassi_rate (
  id           uuid primary key default gen_random_uuid(),
  incasso_id   uuid not null references public.iam_incassi(id) on delete cascade,
  titolo_id    uuid not null references public.quote_titoli(id) on delete restrict,
  polizza_id   uuid references public.quote_polizze(id) on delete set null,
  compagnia    text,
  compagnia_id uuid references public.quote_compagnie(id) on delete set null,
  importo      numeric(14,2) not null check (importo > 0),
  -- `attiva` esiste per una ragione tecnica che vale la pena scrivere: un
  -- indice unico parziale in Postgres non può leggere un'altra tabella. Per
  -- dire «questa rata non si incassa due volte, a meno che l'incasso non sia
  -- stato stornato» serve che lo stato si veda DA QUI. Lo spegne lo storno, ed
  -- è l'unica cosa che di questa riga si può cambiare.
  attiva       boolean not null default true,
  creato_il    timestamptz not null default now()
);

create index if not exists iam_incassi_rate_incasso_idx on public.iam_incassi_rate(incasso_id);
create index if not exists iam_incassi_rate_titolo_idx  on public.iam_incassi_rate(titolo_id);

-- La stessa rata non si incassa due volte. La garanzia NON sta nel codice che
-- controlla prima di scrivere — sta in Postgres, che dice di no anche al
-- secondo clic partito mentre il primo era ancora in volo. È la stessa
-- decisione dell'importazione del portafoglio (§14).
create unique index if not exists iam_incassi_rate_una_volta
  on public.iam_incassi_rate(titolo_id) where attiva;

-- ── I MODI IN CUI IL CLIENTE HA PAGATO ────────────────────────────────────
create table if not exists public.iam_incassi_pagamenti (
  id           uuid primary key default gen_random_uuid(),
  incasso_id   uuid not null references public.iam_incassi(id) on delete cascade,
  conto_id     uuid not null references public.iam_conti(id) on delete restrict,
  importo      numeric(14,2) not null check (importo > 0),
  mezzo        text,
  -- CRO del bonifico, numero dell'assegno, codice dell'operazione POS: è la
  -- cosa che si cerca quando fra due mesi il cliente dice «ma io ho pagato».
  riferimento  text,
  creato_il    timestamptz not null default now()
);

create index if not exists iam_incassi_pag_incasso_idx on public.iam_incassi_pagamenti(incasso_id);
create index if not exists iam_incassi_pag_conto_idx   on public.iam_incassi_pagamenti(conto_id);

-- ── CHI LEGGE E CHI SCRIVE ────────────────────────────────────────────────
-- Leggere: lo staff, come la prima nota — chi incassa deve rileggere quello
-- che ha incassato. Scrivere: lo staff, perché incassare è il lavoro di tutti
-- i giorni di chi sta allo sportello; la soglia dell'admin è sui CONTI (dove
-- si decide dove finiscono i soldi), non sull'incasso di una rata.
-- Correggere e cancellare: NESSUNO. Un incasso registrato si storna.
alter table public.iam_incassi            enable row level security;
alter table public.iam_incassi_rate       enable row level security;
alter table public.iam_incassi_pagamenti  enable row level security;

drop policy if exists inc2_select on public.iam_incassi;
create policy inc2_select on public.iam_incassi for select using (iam_is_staff());
drop policy if exists inc2_insert on public.iam_incassi;
create policy inc2_insert on public.iam_incassi for insert with check (iam_is_staff() and creato_da = auth.uid());
-- L'update serve SOLO allo storno, e lo fa la funzione con il token di chi
-- chiama: si può passare da «registrato» a «stornato», mai indietro e mai
-- toccare gli importi. Il divieto vero è il trigger qui sotto.
drop policy if exists inc2_update on public.iam_incassi;
create policy inc2_update on public.iam_incassi for update using (iam_is_staff()) with check (iam_is_staff());

drop policy if exists inc2r_select on public.iam_incassi_rate;
create policy inc2r_select on public.iam_incassi_rate for select using (iam_is_staff());
drop policy if exists inc2r_insert on public.iam_incassi_rate;
create policy inc2r_insert on public.iam_incassi_rate for insert with check (iam_is_staff());

drop policy if exists inc2p_select on public.iam_incassi_pagamenti;
create policy inc2p_select on public.iam_incassi_pagamenti for select using (iam_is_staff());
drop policy if exists inc2p_insert on public.iam_incassi_pagamenti;
create policy inc2p_insert on public.iam_incassi_pagamenti for insert with check (iam_is_staff());

-- ── UN INCASSO REGISTRATO NON SI RISCRIVE ─────────────────────────────────
-- Regola 13 della Fase 1, qui applicata all'incasso. L'unico cambiamento
-- ammesso è lo storno, e una volta sola.
create or replace function public.iam_incasso_immutabile()
returns trigger language plpgsql as $$
begin
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

drop trigger if exists iam_incassi_immutabile on public.iam_incassi;
create trigger iam_incassi_immutabile before update on public.iam_incassi
  for each row execute function public.iam_incasso_immutabile();

-- Le righe di un incasso non si toccano: nascono con lui e basta. L'unica
-- eccezione è `attiva`, che lo storno spegne — ed è dichiarata qui, non
-- lasciata passare per distrazione.
create or replace function public.iam_incasso_rate_immutabili()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Una rata incassata non si cancella: si storna l''incasso, e resta a registro.';
  end if;
  if new.attiva = old.attiva or new.attiva = true then
    raise exception 'Di questa riga si può solo spegnere «attiva», e lo fa lo storno.';
  end if;
  if new.titolo_id is distinct from old.titolo_id
     or new.importo is distinct from old.importo
     or new.incasso_id is distinct from old.incasso_id then
    raise exception 'Gli importi e i riferimenti di un incasso registrato non si riscrivono.';
  end if;
  return new;
end $$;

create or replace function public.iam_incasso_pag_immutabili()
returns trigger language plpgsql as $$
begin
  raise exception 'I pagamenti di un incasso non si modificano: si storna l''incasso.';
end $$;

drop trigger if exists iam_incassi_rate_immutabili on public.iam_incassi_rate;
create trigger iam_incassi_rate_immutabili before update or delete on public.iam_incassi_rate
  for each row execute function public.iam_incasso_rate_immutabili();

drop trigger if exists iam_incassi_pag_immutabili on public.iam_incassi_pagamenti;
create trigger iam_incassi_pag_immutabili before update or delete on public.iam_incassi_pagamenti
  for each row execute function public.iam_incasso_pag_immutabili();

drop policy if exists inc2r_update on public.iam_incassi_rate;
create policy inc2r_update on public.iam_incassi_rate for update using (iam_is_staff()) with check (iam_is_staff());

-- ── LA REGISTRAZIONE, IN UNA TRANSAZIONE SOLA ─────────────────────────────
-- Principio 3 della specifica: incasso, allocazioni, pagamenti e prima nota
-- si salvano insieme o non si salvano. Con cinque richieste separate dalla
-- pagina, cadendo la terza, resterebbe un incasso senza movimento — cioè una
-- rata chiusa e un conto che non sa niente: il guasto che la Fase 2 esiste
-- per chiudere.
--
-- `security invoker`: le politiche valgono per CHI CHIAMA. Una funzione che
-- scavalcasse la RLS sarebbe una seconda regola su chi può incassare, e
-- quella che sbaglia sarebbe quella che nessuno guarda.
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
  r          jsonb;
  v_rate_n   integer := 0;
begin
  -- Idempotenza: doppio clic, rete che cade, tasto premuto due volte. Il
  -- secondo giro non è un errore e non è un secondo incasso.
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
    raise exception 'Manca la causale «Incasso premi»: senza, il movimento non ha un verso.';
  end if;

  select coalesce(sum((x->>'importo')::numeric), 0) into v_tot_r from jsonb_array_elements(p_rate) x;
  select coalesce(sum((x->>'importo')::numeric), 0) into v_tot_p from jsonb_array_elements(p_pagamenti) x;
  if v_tot_r <> v_tot_p then
    raise exception 'L''incasso non quadra: rate % contro pagamenti %.', v_tot_r, v_tot_p;
  end if;

  -- Le rate devono essere APERTE adesso, non quando la schermata le ha lette.
  -- Fra la lettura e il salvataggio può passare mezz'ora, e un collega può
  -- averle incassate: senza questo controllo il secondo incasso passerebbe e
  -- il premio risulterebbe entrato due volte.
  select array_agg((x->>'titolo_id')::uuid) into v_titoli from jsonb_array_elements(p_rate) x;
  select count(*) into v_gia from public.quote_titoli
   where id = any(v_titoli) and stato <> 'aperto';
  if v_gia > 0 then
    raise exception 'Di queste rate % non sono più aperte: qualcuno le ha già incassate. Ricarica e riprova.', v_gia;
  end if;

  -- Le righe di prima nota le costruisce il MOTORE, che è il posto dove
  -- stanno le regole: riscriverle qui vorrebbe dire averne due, e quella che
  -- sbaglia sarebbe quella che nessuno guarda. Qui si controlla che le due
  -- metà del pacchetto dicano la stessa cosa — il Dare deve essere esattamente
  -- quello che i pagamenti dichiarano. Non è una seconda regola: è la prova
  -- che il pacchetto non è stato costruito da un'altra parte.
  if jsonb_typeof(p_incasso->'righe') <> 'array' or jsonb_array_length(p_incasso->'righe') < 2 then
    raise exception 'Mancano le righe di prima nota dell''incasso.';
  end if;
  if (select coalesce(sum((x->>'dare')::numeric), 0) from jsonb_array_elements(p_incasso->'righe') x) <> v_tot_p then
    raise exception 'Le righe in Dare non corrispondono ai pagamenti dichiarati.';
  end if;
  if (select coalesce(sum((x->>'avere')::numeric), 0) from jsonb_array_elements(p_incasso->'righe') x) <> v_tot_r then
    raise exception 'Le righe in Avere non corrispondono alle rate scelte.';
  end if;

  -- Il movimento nasce PRIMA della testata, e non è un dettaglio: la testata
  -- di un incasso registrato è immutabile (trigger qui sopra), quindi il suo
  -- `movimento_id` si scrive una volta sola, quando nasce. Scriverlo dopo
  -- vorrebbe dire chiedere al trigger un'eccezione, e un'eccezione dichiarata
  -- per comodità è la crepa da cui passa la prossima.
  -- Lo scrive la funzione della Fase 1: è l'unico posto in cui nasce un
  -- movimento, e resta l'unico.
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

  insert into public.iam_incassi (data, cliente_id, cliente, totale, movimento_id, chiave_idempotenza, nota, creato_da)
  values (v_data,
          nullif(p_incasso->>'cliente_id', '')::uuid,
          nullif(p_incasso->>'cliente', ''),
          v_tot_r, v_mov, v_chiave,
          nullif(p_incasso->>'nota', ''),
          auth.uid())
  returning id into v_id;

  for r in select * from jsonb_array_elements(p_rate) loop
    insert into public.iam_incassi_rate (incasso_id, titolo_id, polizza_id, compagnia, compagnia_id, importo)
    values (v_id,
            (r->>'titolo_id')::uuid,
            nullif(r->>'polizza_id', '')::uuid,
            nullif(r->>'compagnia', ''),
            nullif(r->>'compagnia_id', '')::uuid,
            (r->>'importo')::numeric);
    v_rate_n := v_rate_n + 1;
  end loop;

  for r in select * from jsonb_array_elements(p_pagamenti) loop
    insert into public.iam_incassi_pagamenti (incasso_id, conto_id, importo, mezzo, riferimento)
    values (v_id,
            (r->>'conto_id')::uuid,
            (r->>'importo')::numeric,
            nullif(r->>'mezzo', ''),
            nullif(r->>'riferimento', ''));
  end loop;

  -- Le rate si chiudono per ultime.
  update public.quote_titoli
     set stato = 'incassato',
         incassato_il = v_data,
         mezzo_pagamento = coalesce(v_mezzo, mezzo_pagamento)
   where id = any(v_titoli);

  return jsonb_build_object('incasso_id', v_id, 'movimento_id', v_mov,
                            'rate', v_rate_n, 'totale', v_tot_r, 'gia_fatto', false);
end $$;

comment on function public.iam_incasso_registra(jsonb, jsonb, jsonb) is
  'Registra un incasso di una o più rate con una o più modalità di pagamento: testata, righe, pagamenti, movimento di prima nota e chiusura delle rate, tutto in una transazione. Idempotente sulla chiave.';

-- ── LO STORNO ─────────────────────────────────────────────────────────────
-- «Un incasso registrato si storna» è scritto nei trigger qui sopra. Senza
-- questa funzione sarebbe una promessa che il codice non mantiene: chi sbaglia
-- un incasso resterebbe con una rata chiusa e nessuna strada per riaprirla, e
-- la troverebbe a mano nel database — cioè fuori da ogni registro.
--
-- Quattro cose in una transazione, e ognuna è metà del lavoro:
--   1. il movimento inverso, scritto dalla funzione della Fase 1, che marca
--      l'originale come stornato;
--   2. l'incasso passa a «stornato», col motivo e con chi l'ha fatto;
--   3. le sue righe si spengono, e la rata torna incassabile (l'indice unico
--      parziale la lascia passare di nuovo);
--   4. le rate tornano APERTE: un incasso stornato che lasciasse la rata
--      chiusa direbbe che quel premio è entrato, e non è entrato.
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

  -- Le righe rovesciate: quello che era Dare diventa Avere e viceversa. Si
  -- leggono dalle righe SCRITTE, non si ricostruiscono dall'incasso: se un
  -- giorno le due cose non coincidessero, lo storno deve annullare quello che
  -- è stato registrato davvero.
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
      -- La testata vuole un conto e una causale: sono quelli dell'originale.
      -- Non si sceglie un conto nuovo per lo storno: il fatto da rovesciare è
      -- quello, e deve essere riconoscibile riga per riga.
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

  update public.quote_titoli
     set stato = 'aperto', incassato_il = null
   where id = any(v_titoli);

  return jsonb_build_object('incasso_id', p_incasso_id, 'movimento_storno_id', v_mov_st,
                            'rate_riaperte', coalesce(array_length(v_titoli, 1), 0));
end $$;

comment on function public.iam_incasso_storna(uuid, text) is
  'Storna un incasso: movimento inverso, incasso a «stornato», righe spente e rate riaperte, in una transazione. Il motivo è obbligatorio.';

commit;

-- ── CONTROLLI, da fare dopo ───────────────────────────────────────────────
-- 1. In Strumenti › Conti e causali creare almeno un conto di tipologia
--    «debito» (il «Conto compagnia» dei conti minimi). Senza, la schermata
--    degli incassi dichiara che manca e non registra niente — ed è giusto.
-- 2. Dichiarare su almeno un conto che è un mezzo di pagamento.
-- 3. Incassare una rata vera e riaprire il movimento: le righe devono essere
--    Dare sul conto che ha ricevuto, Avere sul conto della compagnia.
-- 4. Premere due volte «Registra»: deve nascere UN incasso solo.
