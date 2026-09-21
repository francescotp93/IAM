-- ═══════════════════════════════════════════════════════════════════════════
--  L'IMPORTAZIONE DEL PORTAFOGLIO: TUTTO O NIENTE  (21/09/2026)
--
--  ┌─ CHE COSA TOCCA ────────────────────────────────────────────────────────┐
--  │ · una tabella di appoggio nuova, vuota, che si svuota da sola           │
--  │ · una funzione di scrittura                                             │
--  │ Nessuna tabella esistente modificata, nessuna riga riscritta.           │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ┌─ ROLLBACK ──────────────────────────────────────────────────────────────┐
--  │   drop function if exists iam_importa_flusso(uuid);                     │
--  │   drop table    if exists iam_import_lotti;                             │
--  │ La schermata torna a scrivere riga per riga come prima: il codice       │
--  │ vecchio non viene cancellato da questa migrazione.                      │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ── PERCHE' ESISTE: QUELLO CHE E' SUCCESSO STAMATTINA ────────────────────
--  Misurato il 21/09/2026, non supposto:
--
--    fra le 06:33:03 e le 06:36:41 sono entrate 2.475 anagrafiche e 1.690
--    polizze. Poi si e' fermato.
--
--    · rate scritte in quella finestra .......... 0
--    · verbali a registro ....................... 0
--    · polizze in portafoglio senza NEMMENO UNA rata .... 1.700 su 1.715
--
--  Non e' un fastidio di interfaccia. Una polizza senza le sue rate non ha
--  insoluti, non entra nello scadenzario delle rate, non produce estratto
--  conto e non arriva in contabilita': per il sistema quel premio non lo deve
--  nessuno. Milleseicento polizze in quello stato sono un portafoglio che
--  esiste e non si incassa.
--
--  La causa e' il modo in cui si scriveva: una chiamata di rete PER RIGA.
--  4.165 righe in 218 secondi, circa diciannove al secondo. Una scheda chiusa,
--  una rete che tossisce, un portatile che si addormenta — e resta scritta
--  meta' importazione, senza che niente lo dica.
--
--  ── LA DECISIONE, E CHE COSA RIBALTA ─────────────────────────────────────
--  Fino a oggi la regola dichiarata era l'opposto (CLAUDE.md §14): l'ordine
--  clienti → polizze → rate serviva a REGGERE un'interruzione, perche' quello
--  che era scritto restava e si ricaricava lo stesso file. Era una scelta
--  ragionevole con venticinque polizze: il secondo giro saltava il fatto.
--
--  Con milleseicento non regge piu', per una ragione che si e' vista solo
--  succedendo: **nessuno si accorge di essere a meta'**. Non c'e' un verbale
--  (lo si scrive alla fine), le polizze ci sono tutte e sembrano a posto, e
--  le rate mancanti non si vedono finche' qualcuno non cerca un insoluto.
--  Un'importazione a meta' che si dichiara e' recuperabile; una che sembra
--  finita e' un portafoglio sbagliato di cui nessuno sa il perche'.
--
--  Quindi: **o entra tutto, o non entra niente**, e lo garantisce Postgres
--  con una transazione, non il codice della pagina che ci prova.
--
--  ── PERCHE' UNA TABELLA DI APPOGGIO, E NON UN ARGOMENTO SOLO ─────────────
--  Il piano di un portafoglio intero pesa qualche megabyte. Si potrebbe
--  passarlo tutto in una chiamata, e allora la barra di avanzamento non
--  potrebbe dire niente di vero: una richiesta sola o e' finita o non lo e'.
--
--  Il brief chiede che la barra rifletta il salvataggio REALE. Quindi il
--  piano sale a blocchi — e ogni blocco e' una scrittura vera, confermata dal
--  database — e alla fine UNA chiamata applica tutto insieme. Quello che si
--  vede avanzare e' lavoro fatto, non un'animazione a tempo.
--
--  I blocchi caricati e mai applicati non sporcano niente: non sono
--  portafoglio, sono un foglio di brutta. Si cancellano da soli quando
--  l'importazione riesce, e restano visibili solo a chi li ha caricati.
--
--  ── CHE COSA RESTA FUORI DAL «TUTTO O NIENTE», E NON E' UNA DIMENTICANZA ─
--  Il catalogo (compagnie e prodotti nuovi) continua a scriversi a parte,
--  prima, e a non fermare niente se fallisce. E' la regola 6 di §39: il
--  portafoglio e' il lavoro, il catalogo e' la sua etichetta, e
--  un'importazione che si ferma su una tabella di contorno lascia fuori delle
--  polizze vere. «Tutto o niente» vale su clienti, polizze e rate — cioe' su
--  quello che, mezzo scritto, produce numeri sbagliati.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. IL FOGLIO DI BRUTTA ────────────────────────────────────────────────
create table if not exists iam_import_lotti (
  lotto      uuid        not null,
  tipo       text        not null check (tipo in ('testata', 'clienti', 'polizze', 'titoli')),
  parte      int         not null,
  righe      jsonb       not null,
  creato_da  uuid        not null default auth.uid(),
  creato_il  timestamptz not null default now(),
  primary key (lotto, tipo, parte)
);

comment on table iam_import_lotti is
  $c$Il piano di un'importazione, caricato a blocchi prima di essere applicato. Non e' portafoglio: e' un foglio di brutta. Si svuota da solo quando l'importazione riesce, e ogni blocco e' una scrittura vera - e' quello che permette alla barra di avanzamento di dire il vero invece di animarsi a tempo.$c$;

alter table iam_import_lotti enable row level security;

-- Si vede e si tocca solo il PROPRIO lotto, e solo se si e' staff: e' lo
-- stesso cancello dell'importazione, non uno piu' largo.
drop policy if exists imp_lotti_select on iam_import_lotti;
create policy imp_lotti_select on iam_import_lotti for select
  using (creato_da = auth.uid() and iam_is_staff());

drop policy if exists imp_lotti_insert on iam_import_lotti;
create policy imp_lotti_insert on iam_import_lotti for insert
  with check (creato_da = auth.uid() and iam_is_staff());

drop policy if exists imp_lotti_delete on iam_import_lotti;
create policy imp_lotti_delete on iam_import_lotti for delete
  using (creato_da = auth.uid() and iam_is_staff());

-- Un lotto non si corregge: si ricarica. Un foglio di brutta modificabile a
-- meta' e' esattamente il problema che questa migrazione toglie.
create index if not exists iam_import_lotti_vecchi_idx on iam_import_lotti (creato_il);

grant select, insert, delete on iam_import_lotti to authenticated;

-- ── 2. LA SCRITTURA, IN UNA TRANSAZIONE SOLA ──────────────────────────────
--  SECURITY INVOKER (il default): le politiche di quote_anagrafiche,
--  quote_polizze e quote_titoli valgono come quando scriveva la pagina. Una
--  funzione che le scavalcasse sarebbe una seconda regola di visibilita', e
--  quella che sbaglia e' sempre quella che nessuno guarda.
create or replace function iam_importa_flusso(p_lotto uuid)
returns jsonb
language plpgsql
as $fn$
declare
  v_t         jsonb;
  v_clienti   int := 0;
  v_polizze   int := 0;
  v_titoli    int := 0;
  v_senza_cli int := 0;
  v_verbale   uuid;
begin
  select righe into v_t
    from iam_import_lotti
   where lotto = p_lotto and tipo = 'testata' and parte = 0 and creato_da = auth.uid();

  if v_t is null then
    raise exception 'Lotto % senza testata: non c''e'' niente da applicare.', p_lotto
      using errcode = 'no_data_found';
  end if;

  /* La mappa «chiave del file → scheda cliente». Parte da quello che la
     pagina ha gia' trovato in archivio, e si allunga con i nuovi. */
  create temp table _cli (chiave text primary key, id uuid not null) on commit drop;

  insert into _cli (chiave, id)
  select k, v::uuid
    from jsonb_each_text(coalesce(v_t->'clienti_gia', '{}'::jsonb)) as e(k, v)
   where v is not null and v <> '';

  /* ── I CLIENTI ───────────────────────────────────────────────────────────
     Il cliente che c'e' gia' NON si tocca (§14): non si aggiorna l'indirizzo
     e non si «completa» il telefono. La scheda in agenzia l'ha sistemata
     qualcuno a mano, e sovrascriverla vorrebbe dire buttare via quel lavoro
     ogni notte. Qui si inseriscono solo quelli che mancano. */
  with righe as (
    select r
      from iam_import_lotti l, lateral jsonb_array_elements(l.righe) r
     where l.lotto = p_lotto and l.tipo = 'clienti' and l.creato_da = auth.uid()
  ), nuovi as (
    select r from righe
     where nullif(r->>'_chiave', '') is not null
       and not exists (
         select 1 from quote_anagrafiche a
          where a.fonte = 'ssf' and a.fonte_id = r->>'_chiave')
  ), ins as (
    insert into quote_anagrafiche
      (tipo, nominativo, cognome, nome, ragione_sociale, codice_fiscale, partita_iva,
       indirizzo, cap, comune, provincia, cellulare, telefono, email, data_nascita,
       fonte, fonte_id, creato_da)
    select coalesce(nullif(nuovi.r->>'tipo', ''), 'fisica'), nuovi.r->>'nominativo', nuovi.r->>'cognome', nuovi.r->>'nome', nuovi.r->>'ragione_sociale',
           nuovi.r->>'codice_fiscale', nuovi.r->>'partita_iva', nuovi.r->>'indirizzo', nuovi.r->>'cap',
           nuovi.r->>'comune', nuovi.r->>'provincia', nuovi.r->>'cellulare', nuovi.r->>'telefono', nuovi.r->>'email',
           nullif(nuovi.r->>'data_nascita', '')::date,
           'ssf', nuovi.r->>'_chiave', auth.uid()
      from nuovi
    returning 1
  )
  select count(*) into v_clienti from ins;

  /* Tutte le chiavi che indicano quella persona — comprese quelle del
     doppione interno al file — puntano alla stessa scheda. */
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
    join quote_anagrafiche a on a.fonte = 'ssf' and a.fonte_id = coppie.principale
  on conflict (chiave) do nothing;

  /* NOTA SUI `coalesce` QUI SOTTO, che sembrano superflui e non lo sono.
     `tacito_rinnovo`, `stato_pagamento`, `dati`, `tipo` e `stato` sono NOT
     NULL CON UN DEFAULT. Passare un NULL esplicito NON fa scattare il
     default: lo scavalca, e l'inserimento si rifiuta. Il collaudo del
     21/09/2026 e' morto esattamente li' — e la cosa utile e' che, morendo,
     ha tirato indietro anche i clienti gia' scritti e il foglio di brutta:
     zero righe rimaste. Il «tutto o niente» si e' dimostrato da solo prima
     ancora di essere provato apposta.

     ── LE POLIZZE ──────────────────────────────────────────────────────────
     Una polizza senza contraente non entra: l'anteprima l'ha gia' dichiarata,
     e attaccarla a una scheda qualunque sarebbe peggio che lasciarla fuori. */
  with righe as (
    select r
      from iam_import_lotti l, lateral jsonb_array_elements(l.righe) r
     where l.lotto = p_lotto and l.tipo = 'polizze' and l.creato_da = auth.uid()
  )
  select count(*) into v_senza_cli
    from righe
   where not exists (select 1 from _cli c where c.chiave = righe.r->>'_cliente');

  with righe as (
    select r
      from iam_import_lotti l, lateral jsonb_array_elements(l.righe) r
     where l.lotto = p_lotto and l.tipo = 'polizze' and l.creato_da = auth.uid()
  ), ins as (
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
           'ssf', righe.r->>'_fonte_id', auth.uid(), nullif(v_t->>'creato_nome', '')
      from righe
      join _cli c on c.chiave = righe.r->>'_cliente'
    on conflict (fonte, fonte_id) where fonte_id is not null do nothing
    returning 1
  )
  select count(*) into v_polizze from ins;

  /* La mappa «riferimento del file → polizza», che comprende anche quelle
     che c'erano gia': le rate di una polizza gia' in archivio sono rate
     vere, e lasciarle fuori e' il guasto che questa migrazione ripara. */
  create temp table _pol (chiave text primary key, id uuid not null) on commit drop;
  with righe as (
    select r
      from iam_import_lotti l, lateral jsonb_array_elements(l.righe) r
     where l.lotto = p_lotto and l.tipo = 'polizze' and l.creato_da = auth.uid()
  )
  insert into _pol (chiave, id)
  select distinct righe.r->>'_fonte_id', p.id
    from righe
    join quote_polizze p on p.fonte = 'ssf' and p.fonte_id = righe.r->>'_fonte_id'
  on conflict (chiave) do nothing;

  /* ── LE RATE ─────────────────────────────────────────────────────────────
     Sono la meta' che stamattina non e' entrata. Senza, gli insoluti non
     esistono e i soldi non si recuperano. */
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
           'ssf', righe.r->>'_fonte_id', auth.uid()
      from righe
      join _pol p on p.chiave = righe.r->>'_polizza'
    on conflict (fonte, fonte_id) where fonte_id is not null do nothing
    returning 1
  )
  select count(*) into v_titoli from ins;

  /* ── IL VERBALE, NELLA STESSA TRANSAZIONE ────────────────────────────────
     E' la differenza che conta piu' di tutte. Prima si scriveva alla fine,
     fuori: stamattina l'importazione si e' fermata e il registro non ha
     nessuna riga, quindi non c'e' niente che dica che e' successo qualcosa.
     Adesso o ci sono i dati E il verbale, o non c'e' nessuno dei due. */
  insert into quote_importazioni
    (fonte, emittente, intermediario, versione, periodo_dal, periodo_al, file_nome,
     conteggi, avvisi, collaboratori, creato_da, creato_nome)
  values
    ('ssf', v_t->>'emittente', v_t->>'intermediario', v_t->>'versione',
     nullif(v_t->>'dal', '')::date, nullif(v_t->>'al', '')::date, v_t->>'file_nome',
     coalesce(v_t->'conteggi', '{}'::jsonb) || jsonb_build_object(
       'clienti_scritti', v_clienti,
       'polizze_scritte', v_polizze,
       'titoli_scritti',  v_titoli,
       'polizze_senza_cliente', v_senza_cli,
       'transazione', true),
     coalesce(v_t->'avvisi', '[]'::jsonb),
     coalesce(v_t->'collaboratori', '[]'::jsonb),
     auth.uid(), nullif(v_t->>'creato_nome', ''))
  returning id into v_verbale;

  delete from iam_import_lotti where lotto = p_lotto and creato_da = auth.uid();

  return jsonb_build_object(
    'verbale', v_verbale,
    'clienti', v_clienti,
    'polizze', v_polizze,
    'titoli',  v_titoli,
    'polizze_senza_cliente', v_senza_cli);
end;
$fn$;

comment on function iam_importa_flusso(uuid) is
  $c$Applica un lotto caricato in iam_import_lotti: clienti, polizze, rate e verbale, TUTTO IN UNA TRANSAZIONE. O entra tutto o non entra niente. Il catalogo resta fuori apposta: il portafoglio e' il lavoro, il catalogo e' la sua etichetta. SECURITY INVOKER: le politiche delle tabelle valgono come quando scriveva la pagina.$c$;

grant execute on function iam_importa_flusso(uuid) to authenticated;
