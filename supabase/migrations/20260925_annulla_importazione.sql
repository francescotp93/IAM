-- ═══════════════════════════════════════════════════════════════════════════
--  DISFARE UN'IMPORTAZIONE                                    (25/09/2026)
--
--  PERCHÉ
--    «Come cancello?» — Francesco, dopo aver caricato il portafoglio HDI con
--    un lettore che leggeva un terzo del file. Nell'app non c'è nessun modo:
--    il registro «Caricamenti fatti» elenca le importazioni e non le disfa,
--    e finora l'unica strada era che le cancellassi io con una query.
--
--    Una cancellazione irreversibile deve stare in mano a chi risponde dei
--    dati, non a me. Quindi: un tasto.
--
--  IL PROBLEMA VERO NON È CANCELLARE, È NON CANCELLARE TROPPO
--    Le chiavi esterne di questo database cancellano a cascata parecchia
--    roba, e in silenzio:
--      · quote_titoli.polizza_id   → CASCADE   (le rate seguono la polizza)
--      · quote_note.anagrafica_id  → CASCADE   (le NOTE seguono il cliente)
--      · quote_gruppi_membri       → CASCADE   (l'appartenenza ai gruppi)
--      · quote_rinnovi.polizza_id  → CASCADE
--    Se Francesco importa oggi, domani scrive una nota su un cliente
--    importato, e dopodomani disfa l'importazione, un «delete» ingenuo si
--    porta via anche la nota. Un annullamento che cancella il lavoro fatto
--    DOPO è peggio di nessun annullamento: il primo distrugge in silenzio,
--    il secondo costringe a chiedere.
--
--    Quindi questa funzione è prudente per costruzione: cancella solo ciò che
--    l'importazione ha creato E che da allora nessuno ha toccato. Tutto il
--    resto lo LASCIA e lo CONTA, e chi guarda vede quanto è rimasto e perché.
--
--  COSA AGGIUNGE
--    Una colonna `importazione_id` sulle tre tabelle, per sapere quali righe
--    ha scritto quale importazione. Senza, l'unico appiglio sarebbe l'orario
--    di creazione — e due importazioni ravvicinate diventerebbero
--    indistinguibili proprio nel momento in cui si vuole disfarne una sola.
--    La colonna è nuova e nullable: nessuna riga esistente cambia.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.quote_anagrafiche add column if not exists importazione_id uuid
  references public.quote_importazioni(id) on delete set null;
alter table public.quote_polizze     add column if not exists importazione_id uuid
  references public.quote_importazioni(id) on delete set null;
alter table public.quote_titoli      add column if not exists importazione_id uuid
  references public.quote_importazioni(id) on delete set null;

create index if not exists quote_anagrafiche_importazione_idx on public.quote_anagrafiche (importazione_id) where importazione_id is not null;
create index if not exists quote_polizze_importazione_idx     on public.quote_polizze     (importazione_id) where importazione_id is not null;
create index if not exists quote_titoli_importazione_idx      on public.quote_titoli      (importazione_id) where importazione_id is not null;

-- ── IL VERBALE NASCE PRIMA DELLE RIGHE ────────────────────────────────────
--  `iam_importa_flusso` scriveva il verbale per ULTIMO, a cose fatte. Va bene
--  per raccontare, non per disfare: mentre inserisce le righe non ha ancora
--  un id da scriverci sopra, e l'unico appiglio resterebbe l'orario: due
--  importazioni ravvicinate diventerebbero indistinguibili proprio nel
--  momento in cui se ne vuole disfare una sola.
--
--  Adesso il verbale nasce vuoto all'inizio, il suo id va su ogni riga
--  scritta, e i conteggi si scrivono alla fine. È la stessa transazione: se
--  l'importazione fallisce, il verbale vuoto sparisce con tutto il resto.
--
--  NOTA SULLE RIGHE GIÀ IN ARCHIVIO. Quelle scritte prima di oggi non hanno
--  l'`importazione_id` e il tasto non le vede. Per il portafoglio HDI del
--  24/09 si rimedia una volta sola, in fondo a questo file, perché di
--  importazioni HDI ce n'è esattamente una e l'attribuzione è certa. Per
--  l'SSF no: ci sono più importazioni e attribuire a occhio le righe a una di
--  esse vorrebbe dire dare a Francesco un tasto che cancella le righe di
--  un'altra giornata.

-- ── CHE COSA SI PORTEREBBE VIA, SENZA PORTARSELO VIA ──────────────────────
--  Si guarda PRIMA di cancellare, e si può guardare quante volte si vuole.
--  È la stessa regola dell'anteprima dell'importazione: prima si vede, poi
--  si decide.
create or replace function public.iam_conta_annullabili(p_verbale uuid)
returns jsonb
language plpgsql
security invoker
as $function$
declare
  v_fonte     text;
  v_pol_tot   int := 0;  v_pol_ok  int := 0;
  v_tit_tot   int := 0;
  v_ana_tot   int := 0;  v_ana_ok  int := 0;
  v_trattenute jsonb;
begin
  if not coalesce(public.iam_is_staff(), false) then
    raise exception 'Solo lo staff dell''agenzia può disfare un''importazione.'
      using errcode = 'insufficient_privilege';
  end if;

  select fonte into v_fonte from quote_importazioni where id = p_verbale;
  if v_fonte is null then
    raise exception 'Importazione % non trovata.', p_verbale using errcode = 'no_data_found';
  end if;

  /* LE POLIZZE. Si trattiene una polizza che dopo l'importazione ha messo
     radici: un movimento di cassa, un incasso, un credito, una pratica, un
     sinistro, un rinnovo, o una rata che qualcuno ha incassato a mano. */
  create temp table _pol_ann on commit drop as
  select p.id,
         exists (select 1 from iam_movimenti m       where m.polizza_id = p.id)
      or exists (select 1 from iam_movimenti_righe r where r.polizza_id = p.id)
      or exists (select 1 from iam_incassi_rate ir   where ir.polizza_id = p.id)
      or exists (select 1 from iam_crediti_premio cp where cp.polizza_id = p.id)
      or exists (select 1 from quote_pratiche pr     where pr.polizza_id = p.id)
      or exists (select 1 from quote_sinistri si     where si.polizza_id = p.id)
      or exists (select 1 from quote_rinnovi ri      where ri.polizza_id = p.id)
      or exists (select 1 from quote_polizze al      where al.sostituisce_id = p.id)
      or exists (select 1 from quote_titoli t
                  where t.polizza_id = p.id
                    and (t.importazione_id is distinct from p_verbale
                         or t.rimesso_il is not null
                         or t.aggiornato_il > p.creato_il + interval '1 minute'))
         as trattenuta
    from quote_polizze p
   where p.importazione_id = p_verbale;

  select count(*), count(*) filter (where not trattenuta) into v_pol_tot, v_pol_ok from _pol_ann;
  select count(*) into v_tit_tot from quote_titoli t
    join _pol_ann pa on pa.id = t.polizza_id where not pa.trattenuta;

  /* I CLIENTI. Si trattiene un cliente che ha ancora una polizza (anche di
     un'altra importazione), o su cui è nato qualcosa dopo: una nota, un
     preventivo, una pratica, una trattativa, un gruppo, un'analisi
     previdenziale. Sono tutte cose che la cascata cancellerebbe in
     silenzio. */
  create temp table _ana_ann on commit drop as
  select a.id,
         exists (select 1 from quote_polizze p where p.cliente_id = a.id
                   and (p.importazione_id is distinct from p_verbale
                        or p.id in (select id from _pol_ann where trattenuta)))
      or exists (select 1 from quote_note n              where n.anagrafica_id = a.id)
      or exists (select 1 from quote_gruppi_membri g     where g.anagrafica_id = a.id)
      or exists (select 1 from quote_preventivi q        where q.cliente_id = a.id)
      or exists (select 1 from quote_pratiche pr        where pr.cliente_id = a.id)
      or exists (select 1 from iam_trattative tr         where tr.anagrafica_id = a.id)
      or exists (select 1 from iam_incassi ic            where ic.cliente_id = a.id)
      or exists (select 1 from quote_analisi_previdenziali ap where ap.anagrafica_id = a.id)
      or exists (select 1 from quote_progetti_previdenziali pp where pp.anagrafica_id = a.id)
         as trattenuto
    from quote_anagrafiche a
   where a.importazione_id = p_verbale;

  select count(*), count(*) filter (where not trattenuto) into v_ana_tot, v_ana_ok from _ana_ann;

  v_trattenute := jsonb_build_object(
    'polizze_trattenute', v_pol_tot - v_pol_ok,
    'clienti_trattenuti', v_ana_tot - v_ana_ok);

  return jsonb_build_object(
    'verbale', p_verbale, 'fonte', v_fonte,
    'polizze', v_pol_ok, 'polizze_totali', v_pol_tot,
    'rate', v_tit_tot,
    'clienti', v_ana_ok, 'clienti_totali', v_ana_tot,
    'trattenute', v_trattenute);
end;
$function$;

-- ── E QUI SI CANCELLA ──────────────────────────────────────────────────────
create or replace function public.iam_annulla_importazione(p_verbale uuid, p_conferma text)
returns jsonb
language plpgsql
security invoker
as $function$
declare
  v_conto   jsonb;
  v_pol     int := 0;
  v_tit     int := 0;
  v_ana     int := 0;
begin
  /* LA PAROLA. Una cancellazione irreversibile non deve poter partire da una
     chiamata fatta per sbaglio, da un tasto premuto due volte o da una riga
     di console copiata male. Chi chiama deve scrivere ANNULLA. */
  if coalesce(p_conferma, '') <> 'ANNULLA' then
    raise exception 'Per disfare un''importazione serve la conferma esplicita.'
      using errcode = 'invalid_parameter_value';
  end if;

  v_conto := public.iam_conta_annullabili(p_verbale);  -- controlla anche i permessi

  /* Le rate se ne vanno con le loro polizze (CASCADE), ma si cancellano prima
     e a mano, per poterle contare: una cascata non dice quante righe si è
     portata via, e un verbale che non sa dire quanto ha cancellato non è un
     verbale. */
  with da_togliere as (
    select p.id from quote_polizze p where p.importazione_id = p_verbale
       and not exists (select 1 from iam_movimenti m       where m.polizza_id = p.id)
       and not exists (select 1 from iam_movimenti_righe r where r.polizza_id = p.id)
       and not exists (select 1 from iam_incassi_rate ir   where ir.polizza_id = p.id)
       and not exists (select 1 from iam_crediti_premio cp where cp.polizza_id = p.id)
       and not exists (select 1 from quote_pratiche pr     where pr.polizza_id = p.id)
       and not exists (select 1 from quote_sinistri si     where si.polizza_id = p.id)
       and not exists (select 1 from quote_rinnovi ri      where ri.polizza_id = p.id)
       and not exists (select 1 from quote_polizze al      where al.sostituisce_id = p.id)
       and not exists (select 1 from quote_titoli t where t.polizza_id = p.id
                         and (t.importazione_id is distinct from p_verbale
                              or t.rimesso_il is not null
                              or t.aggiornato_il > p.creato_il + interval '1 minute'))
  ), tit as (
    delete from quote_titoli t using da_togliere d where t.polizza_id = d.id returning 1
  )
  select count(*) into v_tit from tit;

  with da_togliere as (
    select p.id from quote_polizze p where p.importazione_id = p_verbale
       and not exists (select 1 from iam_movimenti m       where m.polizza_id = p.id)
       and not exists (select 1 from iam_movimenti_righe r where r.polizza_id = p.id)
       and not exists (select 1 from iam_incassi_rate ir   where ir.polizza_id = p.id)
       and not exists (select 1 from iam_crediti_premio cp where cp.polizza_id = p.id)
       and not exists (select 1 from quote_pratiche pr     where pr.polizza_id = p.id)
       and not exists (select 1 from quote_sinistri si     where si.polizza_id = p.id)
       and not exists (select 1 from quote_rinnovi ri      where ri.polizza_id = p.id)
       and not exists (select 1 from quote_polizze al      where al.sostituisce_id = p.id)
       and not exists (select 1 from quote_titoli t where t.polizza_id = p.id)
  ), pol as (
    delete from quote_polizze p using da_togliere d where p.id = d.id returning 1
  )
  select count(*) into v_pol from pol;

  /* I CLIENTI, solo quelli rimasti senza niente attaccato. */
  with da_togliere as (
    select a.id from quote_anagrafiche a where a.importazione_id = p_verbale
       and not exists (select 1 from quote_polizze p        where p.cliente_id = a.id)
       and not exists (select 1 from quote_note n           where n.anagrafica_id = a.id)
       and not exists (select 1 from quote_gruppi_membri g  where g.anagrafica_id = a.id)
       and not exists (select 1 from quote_preventivi q     where q.cliente_id = a.id)
       and not exists (select 1 from quote_pratiche pr      where pr.cliente_id = a.id)
       and not exists (select 1 from iam_trattative tr      where tr.anagrafica_id = a.id)
       and not exists (select 1 from iam_incassi ic         where ic.cliente_id = a.id)
       and not exists (select 1 from quote_analisi_previdenziali ap where ap.anagrafica_id = a.id)
       and not exists (select 1 from quote_progetti_previdenziali pp where pp.anagrafica_id = a.id)
  ), ana as (
    delete from quote_anagrafiche a using da_togliere d where a.id = d.id returning 1
  )
  select count(*) into v_ana from ana;

  /* IL VERBALE RESTA. Un'importazione disfatta è successa lo stesso, e la
     traccia di che cosa è entrato e poi è stato tolto vale più della riga
     pulita. Si segna com'è andata. */
  update quote_importazioni
     set conteggi = coalesce(conteggi, '{}'::jsonb) || jsonb_build_object(
           'annullata', true,
           'annullata_il', now(),
           'annullata_da', auth.uid(),
           'annullate_polizze', v_pol,
           'annullate_rate', v_tit,
           'annullati_clienti', v_ana,
           'trattenute', v_conto->'trattenute')
   where id = p_verbale;

  return jsonb_build_object(
    'polizze', v_pol, 'rate', v_tit, 'clienti', v_ana,
    'trattenute', v_conto->'trattenute');
end;
$function$;

-- ── COME SI TORNA INDIETRO ────────────────────────────────────────────────
--      drop function if exists public.iam_annulla_importazione(uuid, text);
--      drop function if exists public.iam_conta_annullabili(uuid);
--      alter table public.quote_titoli      drop column if exists importazione_id;
--      alter table public.quote_polizze     drop column if exists importazione_id;
--      alter table public.quote_anagrafiche drop column if exists importazione_id;
--  Le righe già cancellate NON tornano: è il senso del tasto. Per questo
--  prima di cancellare si guarda con `iam_conta_annullabili`.


-- ═══════════════════════════════════════════════════════════════════════════
--  LE RIGHE DI HDI GIÀ IN ARCHIVIO PRENDONO IL LORO VERBALE
--
--  Si fa SOLO per HDI, e solo perché è certo: di importazioni con fonte 'hdi'
--  ce n'è esattamente una, quella del 24/09/2026, quindi ogni riga hdi è sua.
--  Per l'SSF non si fa: le importazioni sono più d'una e attribuire le righe a
--  occhio darebbe a Francesco un tasto che cancella la giornata sbagliata.
-- ═══════════════════════════════════════════════════════════════════════════
do $backfill$
declare v_id uuid; v_quante int;
begin
  select count(*) into v_quante from quote_importazioni where fonte = 'hdi';
  if v_quante <> 1 then
    raise notice 'Importazioni HDI: % — il collegamento si fa solo quando è una sola, e certa. Saltato.', v_quante;
    return;
  end if;
  select id into v_id from quote_importazioni where fonte = 'hdi';
  update quote_anagrafiche set importazione_id = v_id where fonte = 'hdi' and importazione_id is null;
  update quote_polizze     set importazione_id = v_id where fonte = 'hdi' and importazione_id is null;
  update quote_titoli      set importazione_id = v_id where fonte = 'hdi' and importazione_id is null;
  raise notice 'Righe HDI collegate al verbale %', v_id;
end $backfill$;
