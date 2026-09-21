-- ═══════════════════════════════════════════════════════════════════════════
--  DECIDERE UN CODICE PRODUTTORE LO APPLICA DAVVERO  (22/09/2026)
--
--  ┌─ CHE COSA TOCCA ────────────────────────────────────────────────────────┐
--  │ · una funzione nuova, iam_applica_decisione_codice(text, text, boolean) │
--  │ Nessuna tabella, nessuna colonna, nessuna politica. Non scrive niente   │
--  │ quando viene applicata: scrive solo quando qualcuno la chiama.          │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ┌─ ROLLBACK ──────────────────────────────────────────────────────────────┐
--  │   drop function if exists iam_applica_decisione_codice(text, text, boolean);
--  │ Le schermate tornano a decidere senza applicare, cioè al guasto qui     │
--  │ sotto. Le righe gia' assegnate restano dove sono: il dato sta sulla     │
--  │ polizza e sulla rata, non in questa funzione.                           │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ── IL GUASTO, MISURATO ──────────────────────────────────────────────────
--  Francesco abbina un codice produttore a un collaboratore dalla scheda in
--  IAM, poi apre il report Produzione e il codice risulta ancora «da
--  abbinare». Misurato sul database vero il 22/09/2026:
--
--    · quote_codici_collaboratore .... 16 righe, DUE decise
--    · quote_polizze.collaboratore_id . 0 valorizzate su 1.721
--    · quote_titoli.collaboratore_id .. 0 valorizzate su 56
--
--  La Produzione non ha un difetto di lettura: legge quote_polizze.
--  collaboratore_id (vista iam_produzione_mensile) e sta dicendo la verita' su
--  una colonna vuota. Il difetto sta a monte: in IAM si puo' DECIDERE un
--  codice e niente in IAM APPLICA quella decisione. Peggio, la conferma
--  prometteva il contrario — «le rate di quel codice sono sue, anche quelle
--  gia' in archivio» — e mandava su una pagina dove quel bottone non c'e'.
--
--  L'unica porta che applicava era il preventivatore, Titoli > «Assegna il
--  pregresso», che oltretutto legge le polizze nel browser: PostgREST ne manda
--  mille per richiesta, e con 4.079 polizze ne avrebbe attribuite circa mille
--  in silenzio (CLAUDE.md §50, §53).
--
--  ── PERCHE' IN POSTGRES E NON IN PAGINA ──────────────────────────────────
--  Le schermate da cui si decide sono TRE e stanno in DUE documenti diversi:
--  il pannello del pregresso e l'anteprima del flusso (index.html), la scheda
--  del collaboratore (iam/index.html). Tre copie della regola «quali righe
--  prendere» diventerebbero tre regole su chi viene pagato, e quella sbagliata
--  sarebbe quella che nessuno guarda. Qui la regola e' una, la scrittura e'
--  una transazione, e non c'e' nessun tetto di righe.
--
--  Le regole rispettate sono quelle del motore Assegnazione (§19, §49):
--   1. niente decisione, niente assegnazione — nessun ripiego;
--   2. non si sovrascrive quello che c'e', se non chiedendolo;
--   3. la chiave e' la coppia compagnia+codice;
--   4. «nessuno» e' una decisione, e non intesta niente a nessuno;
--   5. il periodo si confronta con la data della POLIZZA, non con oggi —
--      anche per le rate, che seguono la loro polizza e non la propria
--      decorrenza.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function iam_applica_decisione_codice(
  p_compagnia text, p_codice text, p_sovrascrivi boolean default false)
returns jsonb
language plpgsql
as $fn$
declare
  r        quote_codici_collaboratore%rowtype;
  v_comp   text := upper(trim(coalesce(p_compagnia, '')));
  v_cod    text := upper(trim(coalesce(p_codice, '')));
  v_stato  text;
  v_pol    int := 0;
  v_rate   int := 0;
  v_fuori  int := 0;
  v_altrui int := 0;
begin
  if v_comp = '' or v_cod = '' then
    raise exception 'Serve la compagnia e il codice.' using errcode = 'invalid_parameter_value';
  end if;

  select * into r from quote_codici_collaboratore
   where upper(trim(compagnia)) = v_comp and upper(trim(codice)) = v_cod;

  /* I QUATTRO STATI DEL MOTORE, nello stesso ordine e con le stesse risposte
     (Assegnazione.statoDecisione). Non si indovina mai: niente decisione,
     niente assegnazione. */
  if r.codice is null or not coalesce(r.deciso, false) then v_stato := 'non-deciso';
  elsif r.collaboratore_id is not null                   then v_stato := 'persona';
  elsif coalesce(r.nessuno, false)                       then v_stato := 'nessuno';
  else                                                        v_stato := 'da-ridecidere';
  end if;

  /* «nessuno» e' una decisione (la produzione diretta dell'agenzia) e non
     produce nessuna scrittura: non c'e' una persona a cui intestare.
     `attivo = false` e' una sospensione: il codice non assegna lavoro nuovo,
     e quello che e' gia' assegnato resta dov'e'. `attivo` NULL non vale come
     spento — una colonna mai riempita non e' un «no». */
  if v_stato <> 'persona' then
    return jsonb_build_object('stato', v_stato, 'polizze', 0, 'rate', 0,
                              'fuori_periodo', 0, 'di_altri', 0);
  end if;
  if r.attivo is false then
    return jsonb_build_object('stato', 'sospeso', 'polizze', 0, 'rate', 0,
                              'fuori_periodo', 0, 'di_altri', 0);
  end if;

  /* Quello che NON si tocca, contato prima: le polizze fuori dal periodo
     dell'abbinamento e quelle che hanno gia' un altro padrone. Un numero che
     non si conta non si vede, e qui si sta decidendo chi viene pagato. */
  select count(*) filter (
           where not ((r.data_inizio is null or p.data_effetto >= r.data_inizio)
                  and (r.data_fine   is null or p.data_effetto <= r.data_fine))),
         count(*) filter (
           where p.collaboratore_id is not null and p.collaboratore_id <> r.collaboratore_id)
    into v_fuori, v_altrui
    from quote_polizze p
   where upper(trim(coalesce(p.dati->'ssf'->>'collaboratore', ''))) = v_cod
     and upper(trim(coalesce(p.compagnia, ''))) = v_comp;

  /* LE POLIZZE — chi ha PRODOTTO il contratto. La data che decide e' quella
     della polizza, non oggi: una polizza appartiene a chi teneva il codice
     quando e' stata prodotta. E non si sovrascrive quello che c'e': chi ha
     assegnato a mano sapeva qualcosa che il codice non sa. */
  update quote_polizze p set collaboratore_id = r.collaboratore_id
   where upper(trim(coalesce(p.dati->'ssf'->>'collaboratore', ''))) = v_cod
     and upper(trim(coalesce(p.compagnia, ''))) = v_comp
     and (p.collaboratore_id is null
          or (p_sovrascrivi and p.collaboratore_id <> r.collaboratore_id))
     and (r.data_inizio is null or p.data_effetto >= r.data_inizio)
     and (r.data_fine   is null or p.data_effetto <= r.data_fine);
  get diagnostics v_pol = row_count;

  /* LE RATE — a chi spetta la provvigione. Seguono la data della LORO
     POLIZZA, non la propria decorrenza: una rata e' di chi ha prodotto il
     contratto, non di chi tiene il codice il giorno in cui scade. Guardando
     due date diverse la polizza finirebbe a uno e le sue rate a un altro, e i
     due numeri non tornerebbero mai. */
  update quote_titoli t set collaboratore_id = r.collaboratore_id
    from quote_polizze p
   where t.polizza_id = p.id
     and upper(trim(coalesce(p.dati->'ssf'->>'collaboratore', ''))) = v_cod
     and upper(trim(coalesce(p.compagnia, ''))) = v_comp
     and (t.collaboratore_id is null
          or (p_sovrascrivi and t.collaboratore_id <> r.collaboratore_id))
     and (r.data_inizio is null or p.data_effetto >= r.data_inizio)
     and (r.data_fine   is null or p.data_effetto <= r.data_fine);
  get diagnostics v_rate = row_count;

  return jsonb_build_object('stato', 'persona', 'persona', r.collaboratore_id,
    'polizze', v_pol, 'rate', v_rate, 'fuori_periodo', v_fuori, 'di_altri', v_altrui);
end;
$fn$;

comment on function iam_applica_decisione_codice(text, text, boolean) is
  $c$Applica al portafoglio gia' in archivio una decisione presa su un codice produttore: scrive quote_polizze.collaboratore_id e quote_titoli.collaboratore_id. Rispetta le regole del motore Assegnazione: niente decisione niente assegnazione, «nessuno» non scrive, un abbinamento sospeso non assegna, il periodo si confronta con la data della POLIZZA (anche per le rate), e non si sovrascrive quello che c'e' se non lo si chiede. Torna i numeri veri, comprese le righe lasciate fuori. SECURITY INVOKER: valgono le politiche di chi chiama.$c$;

grant execute on function iam_applica_decisione_codice(text, text, boolean) to authenticated;
