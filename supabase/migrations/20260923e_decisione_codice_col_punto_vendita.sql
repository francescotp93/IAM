-- ═══════════════════════════════════════════════════════════════════════════
--  LA DECISIONE SUL CODICE PORTA ANCHE IL PUNTO VENDITA  (23/09/2026)
--
--  Questa funzione e' QUELLA DEL 22/09 (`20260922c_applica_decisione_codice`)
--  con due righe in piu'. Non e' una riscrittura, ed e' una scelta:
--
--  ── LA LEZIONE, E COSTA PIU' DEL LAVORO ──────────────────────────────────
--  Poche ore fa l'avevo riscritta a memoria, credendo di sapere che cosa
--  facesse. Il risultato aveva perso i QUATTRO STATI del motore
--  (`non-deciso`, `persona`, `nessuno`, `da-ridecidere`), la sospensione di un
--  abbinamento e i nomi dei numeri che torna a chi la chiama — cioe' tre delle
--  cinque regole di §19 e §49, tutte su chi viene pagato.
--
--  E si e' installata senza un errore. In plpgsql i campi di un `record` si
--  risolvono QUANDO LA FUNZIONE GIRA, non quando si crea: una funzione che
--  legge una colonna che non esiste nasce verde e muore al primo uso vero.
--  L'ha presa `assegnazione.test.mjs`, che legge l'ULTIMA migrazione che
--  definisce questa funzione e le chiede le stesse regole del motore.
--
--    > Una funzione che esiste non si riscrive: si copia e si aggiunge.
--    > Quello che «si sa che fa» e' il ricordo di chi legge, non il codice.
--
--  ── LE DUE RIGHE IN PIU' ─────────────────────────────────────────────────
--  Quando una polizza (o una rata) CAMBIA produttore, il punto vendita di
--  prima non e' piu' il suo: si azzera, e il trigger di
--  `20260923d_polizza_segue_il_punto_vendita.sql` lo riempie con quello della
--  persona nuova. Dove il produttore non cambia non si tocca niente — chi ha
--  messo un punto vendita a mano sapeva qualcosa che il codice non sa (§19,
--  regola 2).
--
--  ROLLBACK: rieseguire `20260922c_applica_decisione_codice.sql`. Le colonne
--  `punto_vendita_id` restano dove sono: il dato sta sulla polizza e sulla
--  rata, non in questa funzione.
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
  update quote_polizze p set collaboratore_id = r.collaboratore_id,
         /* Quando la polizza CAMBIA produttore, il punto vendita non e' piu'
            quello di prima: si azzera, e il trigger `quote_polizze_pv_trg` lo
            riempie con quello della persona nuova (20260923d). Scrivere qui
            una seconda volta la regola vorrebbe dire due regole su chi
            produce per chi. Dove il produttore non cambia non si tocca
            niente: chi l'ha messo a mano sapeva qualcosa che il codice non sa. */
         punto_vendita_id = case when p.collaboratore_id is distinct from r.collaboratore_id
                                 then null else p.punto_vendita_id end
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
  update quote_titoli t set collaboratore_id = r.collaboratore_id,
         punto_vendita_id = case when t.collaboratore_id is distinct from r.collaboratore_id
                                 then null else t.punto_vendita_id end
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
  $c$Applica al portafoglio gia' in archivio una decisione presa su un codice produttore: scrive quote_polizze.collaboratore_id e quote_titoli.collaboratore_id, e azzera punto_vendita_id dove il produttore CAMBIA, cosi' il trigger di 20260923d lo riempie con quello della persona nuova. Rispetta le regole del motore Assegnazione: niente decisione niente assegnazione, «nessuno» non scrive, un abbinamento sospeso non assegna, il periodo si confronta con la data della POLIZZA (anche per le rate), e non si sovrascrive quello che c'e' se non lo si chiede. Torna i numeri veri, comprese le righe lasciate fuori. SECURITY INVOKER: valgono le politiche di chi chiama.$c$;

grant execute on function iam_applica_decisione_codice(text, text, boolean) to authenticated;
