-- ═══════════════════════════════════════════════════════════════════════════════
--  IL REGISTRO DEI MOVIMENTI: SU CHE COSA (19/09/2026)
--
--  `quote_log` sapeva dire CHE COSA è successo (`azione`), CHI l'ha fatto
--  (`utente_id`, `utente_nome`) e di che TIPO di cosa si trattava (`entita`).
--  Non sapeva dire SU QUALE RIGA — e quella è la domanda che in agenzia arriva
--  sempre, e arriva mesi dopo: «chi ha cambiato QUESTO pagamento?», «chi ha
--  creato QUESTA anagrafica?».
--
--  Senza la risposta, ogni schermata che ci provava si costruiva la sua traccia
--  privata (`quote_polizze.dati.modifiche`, scritta il 18/09): un rimedio per
--  una schermata, non un archivio dei movimenti. Adesso ce n'è uno.
--
--  Tre cose, e sono tre decisioni diverse.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. SU CHE COSA ───────────────────────────────────────────────────────────
alter table public.quote_log add column if not exists entita_id uuid;

comment on column public.quote_log.entita_id is
  'La riga toccata. Insieme a `entita` (che dice la tabella) risponde a «chi ha toccato QUESTA riga». Resta vuota sui movimenti che non puntano a una riga — un''impostazione cambiata, un''esportazione — e su tutto lo storico scritto prima del 19/09/2026, che non si puo'' agganciare a niente senza indovinare.';

-- L'indice è la coppia, non la sola colonna: la domanda è sempre «i movimenti
-- di QUESTA riga DI QUESTA tabella». Due tabelle diverse possono avere righe
-- con lo stesso identificativo, e cercare per solo id le mescolerebbe.
create index if not exists quote_log_entita_idx on public.quote_log(entita, entita_id)
  where entita_id is not null;

-- ── 2. CHI PUÒ LEGGERE UN MOVIMENTO ─────────────────────────────────────────
--  Prima: `iam_is_staff()`. Un collaboratore non vedeva NIENTE, nemmeno la
--  storia delle proprie polizze — e la domanda «chi ha cambiato questo
--  pagamento» se la fa lui per primo.
--
--  Adesso: **si vede il movimento di una riga che si vede già**. È la stessa
--  regola di `quote_pratica_documenti` e di `iam_archivio`, applicata a un
--  archivio di fatti invece che di documenti: la visibilità non si riscrive,
--  si eredita. Riscriverla qui vorrebbe dire averne due, e quella che sbaglia
--  sarebbe quella che nessuno guarda.
--
--  I movimenti che NON puntano a una riga (impostazioni, esportazioni, e tutto
--  lo storico prima di oggi) restano allo staff: sono l'attività dell'agenzia,
--  non la storia di una cosa che si possiede.
drop policy if exists log_select on public.quote_log;
create policy log_select on public.quote_log for select using (
  iam_is_staff()
  or (entita_id is not null and case lower(coalesce(entita, ''))
      when 'polizza'    then exists (select 1 from public.quote_polizze     x where x.id = entita_id and quote_vede(x.creato_da))
      when 'pratica'    then exists (select 1 from public.quote_pratiche    x where x.id = entita_id and quote_vede(x.creato_da))
      when 'preventivo' then exists (select 1 from public.quote_preventivi  x where x.id = entita_id and quote_vede(x.creato_da))
      when 'cliente'    then exists (select 1 from public.quote_anagrafiche x where x.id = entita_id and quote_vede(x.creato_da))
      when 'sinistro'   then exists (select 1 from public.quote_sinistri    x where x.id = entita_id and quote_vede(x.creato_da))
      -- una rata eredita dalla sua polizza, come ovunque nel resto del sistema
      when 'titolo'     then exists (select 1 from public.quote_titoli t
                                       join public.quote_polizze p on p.id = t.polizza_id
                                      where t.id = entita_id and quote_vede(p.creato_da))
      else false end));

-- ── 3. IL REGISTRO DICE CHI, E DEVE ESSERE VERO ─────────────────────────────
--  `log_insert` non aveva nessun controllo: chiunque poteva scrivere una riga
--  firmata con l'identificativo di un altro. In una tabella qualunque sarebbe
--  un difetto; in un REGISTRO è il difetto — l'unica cosa che deve garantire è
--  proprio «chi». Adesso ci si firma solo col proprio nome.
--
--  Il server, che usa la chiave di servizio, scavalca le politiche e non è
--  toccato da questa riga.
drop policy if exists log_insert on public.quote_log;
create policy log_insert on public.quote_log for insert to authenticated
  with check (utente_id = auth.uid());

-- Un movimento non si corregge: è la prova di quello che è successo. La
-- cancellazione resta all'admin (`log_delete`, invariata) e l'aggiornamento non
-- c'è per nessuno — dichiararlo esplicitamente vale più che lasciarlo implicito.
drop policy if exists log_update on public.quote_log;
create policy log_update on public.quote_log for update using (false) with check (false);

-- ═══════════════════════════════════════════════════════════════════════════════
--  PER TORNARE INDIETRO
--
--   drop policy if exists log_update on public.quote_log;
--   drop policy if exists log_insert on public.quote_log;
--   create policy log_insert on public.quote_log for insert to authenticated with check (true);
--   drop policy if exists log_select on public.quote_log;
--   create policy log_select on public.quote_log for select using (iam_is_staff());
--   drop index if exists public.quote_log_entita_idx;
--   alter table public.quote_log drop column if exists entita_id;
--
--  ATTENZIONE: tornare indietro sulla lettura non rompe niente, ma rende di
--  nuovo invisibile a un collaboratore la storia delle sue righe. Tornare
--  indietro su `log_insert` rimette in piedi la possibilità di firmare un
--  movimento col nome di un altro.
-- ═══════════════════════════════════════════════════════════════════════════════
