-- ===========================================================================
--  L'IMPORTAZIONE NON MUORE PIU' PER UNA RIGA SOLA  (22/09/2026)
--
--  CHE COSA TOCCA: una sola funzione, iam_importa_flusso(uuid), riscritta.
--  Nessuna tabella, nessuna colonna, nessuna politica, nessuna riga esistente.
--
--  ROLLBACK: si riapplica la funzione com'e' in
--  20260922_import_rate_su_polizze_gia_dentro.sql. Tornare indietro rimette il
--  difetto: una riga rifiutata torna a far morire l'importazione intera.
--
--  ── PERCHE' ────────────────────────────────────────────────────────────────
--  Il tutto-o-niente del 21/09 ha un prezzo che nessuno aveva messo in conto:
--  se UNA riga su cinquemila viene rifiutata dal database, non si perde quella
--  riga — si perde tutto, con un messaggio grezzo di Postgres, dopo che
--  l'anteprima aveva detto che andava bene. Due cose la rifiutano, misurate
--  sullo schema vero il 22/09/2026:
--
--   1. quote_polizze.data_effetto, quote_titoli.data_decorrenza e
--      quote_titoli.importo_lordo sono NOT NULL. Il motore lascia vuoto quello
--      che non sa leggere invece di inventarlo — ed e' la regola di casa 8.1 —
--      quindi una colonna illeggibile nel file diventa un NULL, e il NULL
--      diventa un'importazione morta.
--
--   2. quote_polizze_numero_polizza_uidx e' UNICO su numero_polizza per tutta
--      la tabella, mentre l'arbitro dell'on conflict e' (fonte, fonte_id). Un
--      conflitto su un indice DIVERSO dall'arbitro non viene assorbito dal do
--      nothing: solleva un errore e annulla la transazione. PRIMA non ha tacito
--      rinnovo e fa nascere una polizza nuova a ogni scadenza (CLAUDE.md 14,
--      regola 4), quindi in un file di dodici mesi lo stesso numero che torna
--      non e' un'ipotesi di scuola.
--
--  ── LA REGOLA ──────────────────────────────────────────────────────────────
--  Quello che non puo' entrare si esclude e SI CONTA. Mai in silenzio: i tre
--  numeri nuovi (polizze_senza_dati, polizze_numero_doppio, titoli_senza_dati)
--  finiscono nel verbale e tornano alla pagina, che li scrive.
--
--  Una riga esclusa e' un problema da guardare; cinquemila righe perse per
--  colpa sua sono una giornata buttata.
-- ===========================================================================

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
  v_proposti  int := 0;
  v_orfani    int := 0;
  v_pol_dati  int := 0;
  v_pol_num   int := 0;
  v_tit_dati  int := 0;
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
  /* QUELLO CHE NON PUO' ENTRARE SI ESCLUDE E SI CONTA, NON FA MORIRE IL RESTO.
     (22/09/2026.) Con il tutto-o-niente il prezzo di una riga rifiutata non e'
     una riga persa: e' l'importazione intera che muore con un messaggio grezzo
     di Postgres, DOPO che l'anteprima aveva detto che andava tutto bene. Su un
     portafoglio di un anno basta una riga.

     Due cose la rifiutano, e nessuna delle due e' un caso limite:

     · data_effetto e' NOT NULL, e il motore lascia vuoto quello che non sa
       leggere invece di inventarlo (regola di casa 8.1). Giusto la', fatale qui.

     · numero_polizza ha un indice UNICO su tutta la tabella, e l'arbitro
       dell'on conflict e' (fonte, fonte_id): un conflitto su un indice DIVERSO
       dall'arbitro non viene assorbito da do nothing, solleva un errore e
       annulla la transazione. PRIMA non ha tacito rinnovo e fa nascere una
       polizza nuova a ogni scadenza, quindi lo stesso numero che torna in un
       file di dodici mesi non e' un'ipotesi di scuola.

     Il doppione si cerca in due direzioni: contro l'archivio, e DENTRO il
     lotto — due righe dello stesso file con lo stesso numero si scontrerebbero
     fra loro, e il not exists non le vede perche' guarda la tabella com'era
     prima di questa istruzione. */
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
                and (p2.fonte is distinct from 'ssf'
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
                and (p2.fonte is distinct from 'ssf'
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
           'ssf', righe.r->>'_fonte_id', auth.uid(), nullif(v_t->>'creato_nome', '')
      from marcate as righe
      join _cli c on c.chiave = righe.r->>'_cliente'
     where not righe.senza_data and righe.rn = 1 and not righe.numero_preso
    on conflict (fonte, fonte_id) where fonte_id is not null do nothing
    returning 1
  )
  select count(*) into v_polizze from ins;

  /* La mappa «riferimento del file → polizza».

     LE CHIAVI SONO DUE, ED E' LA CORREZIONE DEL 22/09/2026. La prima meta'
     sono le polizze del lotto. La seconda meta' sono le polizze che le RATE
     NOMINANO — e senza quella meta' non si tiene in piedi niente, perche' la
     pagina manda nel lotto SOLO le polizze nuove: quelle gia' in archivio
     non ci sono, e le loro rate non trovavano nessuna chiave a cui
     agganciarsi. La giunzione qui sotto le buttava via senza un errore, e il
     verbale dichiarava lo stesso che era andato tutto bene.

     E' il caso di chi ricarica un file per recuperare le rate che mancano —
     cioe' esattamente il lavoro per cui questa funzione e' nata. Misurato il
     22/09/2026 su tre rate di tre polizze in archivio: proposte 3, scritte 0.

     La giunzione e' su «quote_polizze» vera, non sul lotto: una polizza che
     la RLS non fa vedere a chi importa non entra in questa mappa, e la sua
     rata finisce nel conteggio degli orfani qui sotto invece di sparire. */
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
    join quote_polizze p on p.fonte = 'ssf' and p.fonte_id = k.chiave
   where nullif(k.chiave, '') is not null
  on conflict (chiave) do nothing;

  /* QUANTE RATE SONO STATE PROPOSTE E QUANTE NON TROVANO LA LORO POLIZZA.
     Un numero che non si conta non si vede: la giunzione della insert qui
     sotto scarta in silenzio, e «zero righe» non e' un successo silenzioso
     (CLAUDE.md §47, BUG 1). Questi due numeri finiscono nel verbale e
     tornano alla pagina, che li confronta e lo dice in faccia. */
  with righe as (
    select r
      from iam_import_lotti l, lateral jsonb_array_elements(l.righe) r
     where l.lotto = p_lotto and l.tipo = 'titoli' and l.creato_da = auth.uid()
  )
  /* data_decorrenza e importo_lordo sono NOT NULL su quote_titoli: una rata
     che non li porta rifiuterebbe l'inserimento e con lui tutta la
     transazione. Si esclude, si conta, e il numero si vede. */
  select count(*),
         count(*) filter (where nullif(righe.r->>'data_decorrenza', '') is null
                             or nullif(righe.r->>'importo_lordo', '') is null),
         count(*) filter (where nullif(righe.r->>'data_decorrenza', '') is not null
                            and nullif(righe.r->>'importo_lordo', '') is not null
                            and not exists (select 1 from _pol p where p.chiave = righe.r->>'_polizza'))
    into v_proposti, v_tit_dati, v_orfani
    from righe;

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
     where nullif(righe.r->>'data_decorrenza', '') is not null
       and nullif(righe.r->>'importo_lordo', '') is not null
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
$fn$;

comment on function iam_importa_flusso(uuid) is
  $c$Applica un lotto caricato in iam_import_lotti: clienti, polizze, rate e verbale, TUTTO IN UNA TRANSAZIONE. O entra tutto o non entra niente. Le rate si agganciano anche alle polizze GIA' in archivio (correzione del 22/09/2026): la pagina manda solo le polizze nuove, e la mappa si costruisce anche dalle chiavi che le rate nominano. Quello che resta comunque fuori si conta e finisce nel verbale. Il catalogo resta fuori apposta: il portafoglio e' il lavoro, il catalogo e' la sua etichetta. SECURITY INVOKER: le politiche delle tabelle valgono come quando scriveva la pagina.$c$;

grant execute on function iam_importa_flusso(uuid) to authenticated;
