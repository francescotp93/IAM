-- ═══════════════════════════════════════════════════════════════════════════════
--  IL PUNTATORE DEL REGISTRO DIVENTA TESTO (19/09/2026, poche ore dopo)
--
--  `quote_log.entita_id` era nato `uuid`, e per QUOTO andava bene: polizze,
--  anagrafiche, preventivi, pratiche, rate e sinistri hanno tutti un uuid.
--
--  Poi il registro è arrivato in IAM, e la misura ha detto un'altra cosa:
--
--    uuid    → iam_utenti, iam_lead, iam_formazione, quote_collaboratori
--    text    → iam_team (le schede economiche), iam_workdiary
--    bigint  → sessioni_giornaliere (la cassa), iam_ticket, iam_trattative,
--              iam_gare_config
--
--  Con una colonna `uuid`, METÀ di IAM non si sarebbe potuta agganciare: il
--  movimento si sarebbe registrato senza puntatore, e «chi ha toccato questa
--  scheda» sarebbe rimasta senza risposta proprio dove la si chiede di più.
--  Cioè il registro sarebbe stato costruito a metà, e la metà mancante non si
--  vedeva da nessuna parte.
--
--  ┌─────────────────────────────────────────────────────────────────────────┐
--  │ PERCHÉ NON SI SONO CAMBIATE LE TABELLE DI IAM.                          │
--  │                                                                         │
--  │ Portare `iam_team.id` da text a uuid vuol dire riscrivere ogni riga che  │
--  │ lo referenzia — le fatture dentro la scheda, `collab_id`, i documenti —  │
--  │ e farlo per mettere a posto un registro è la coda che muove il cane. Il  │
--  │ registro si adatta a com'è fatta la casa, non il contrario.              │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  QUELLO CHE NON SI PERDE. Il controllo non stava nel tipo della colonna:
--  stava (e resta) nel motore, che adesso sa PER OGNI VOCE che forma ha il suo
--  identificativo — uuid, testo o numero — e rifiuta quello che non combacia.
--  Un `uuid` scritto male su una polizza continua a non passare.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ATTENZIONE ALL'ORDINE: Postgres rifiuta di cambiare il tipo di una colonna
-- usata dentro una politica («cannot alter type of a column used in a policy
-- definition»). La politica va tolta PRIMA e rimessa subito dopo — e in quei
-- due passaggi la tabella resta con RLS attiva e senza politica di lettura,
-- cioe' invisibile a tutti tranne il servizio: non c'e' un istante in cui e'
-- aperta. Nell'ordine opposto la migrazione fallisce a meta'.
drop policy if exists log_select on public.quote_log;

alter table public.quote_log alter column entita_id type text using entita_id::text;

comment on column public.quote_log.entita_id is
  'La riga toccata, come TESTO: le tabelle di questo sistema usano uuid, testo e numeri interi, e una colonna uuid avrebbe lasciato fuori meta'' di IAM. La forma giusta per ogni tipo di entita'' la conosce e la pretende `tariffe/motore/registro.js`.';

-- ── La visibilità, riscritta senza conversioni di tipo ───────────────────────
--  Il confronto è `x.id::text = entita_id`, mai `entita_id::uuid`: convertire
--  un testo qualunque in uuid SOLLEVA UN ERRORE, e un errore dentro una regola
--  di visibilità non è un permesso negato — è una schermata che non si apre.
--  Il motore impedisce già che arrivi spazzatura; questa riga fa in modo che,
--  se ci arrivasse lo stesso, la riga resti semplicemente invisibile.
create policy log_select on public.quote_log for select using (
  iam_is_staff()
  or (entita_id is not null and case lower(coalesce(entita, ''))
      when 'polizza'    then exists (select 1 from public.quote_polizze     x where x.id::text = entita_id and quote_vede(x.creato_da))
      when 'pratica'    then exists (select 1 from public.quote_pratiche    x where x.id::text = entita_id and quote_vede(x.creato_da))
      when 'preventivo' then exists (select 1 from public.quote_preventivi  x where x.id::text = entita_id and quote_vede(x.creato_da))
      when 'cliente'    then exists (select 1 from public.quote_anagrafiche x where x.id::text = entita_id and quote_vede(x.creato_da))
      when 'sinistro'   then exists (select 1 from public.quote_sinistri    x where x.id::text = entita_id and quote_vede(x.creato_da))
      when 'titolo'     then exists (select 1 from public.quote_titoli t
                                       join public.quote_polizze p on p.id = t.polizza_id
                                      where t.id::text = entita_id and quote_vede(p.creato_da))
      else false end));

-- ═══════════════════════════════════════════════════════════════════════════════
--  PER TORNARE INDIETRO
--
--   Non si torna indietro senza perdere righe: i movimenti scritti su IAM hanno
--   identificativi che non sono uuid, e `alter column ... type uuid` li
--   rifiuterebbe. Prima si guarda che cosa c'è dentro:
--     select entita, count(*) from quote_log
--      where entita_id is not null and entita_id !~ '^[0-9a-f-]{36}$' group by 1;
-- ═══════════════════════════════════════════════════════════════════════════════
