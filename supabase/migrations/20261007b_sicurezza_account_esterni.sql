-- Sicurezza (audit GDPR del 07/10/2026): gli account esterni non leggono i dati
-- dell'agenzia.
--
-- Il difetto, uno solo con quattro facce. Le politiche assumevano
-- «autenticato = qualcuno dell'agenzia». Non è più vero: i convenzionati
-- (area.html) hanno un account e NON hanno una riga in iam_utenti. Ogni
-- politica scritta `using (true)` o `auth.uid() is not null` apriva a loro i
-- dati di tutta l'agenzia.
--
-- La regola nuova è una sola: «interno» vuol dire avere una riga in iam_utenti,
-- cioè iam_mio_ruolo() non nullo. Chi è interno continua a vedere quello che
-- vedeva; chi non lo è smette.
--
-- area.html non legge nessuna di queste tabelle e non scrive nel contenitore
-- `documenti` (misurato il 07/10/2026): l'area convenzionati non cambia.

-- APPLICATA il 07/10/2026 con ALTER POLICY: stesso effetto di un drop+create,
-- ma la politica resta al suo posto e il rollback è un altro ALTER.

-- 1. iam_utenti: nessuno si crea la scheda da solo. --------------------------
-- Con u_insert un account esterno si inseriva la propria riga scegliendo
-- mail_caselle, rete, permessi, accesso_quoto: da lì leggeva le caselle email
-- dell'agenzia e le anagrafiche della rete che copiava. L'attivazione passa dal
-- server con la chiave di servizio (server/utenti.js), che non ne ha bisogno.
alter policy u_insert on public.iam_utenti with check ( false );

-- Leggere l'elenco degli account: solo gli interni (e ognuno la propria riga).
alter policy u_select on public.iam_utenti
  using ( id = auth.uid() or public.iam_mio_ruolo() is not null );

-- 2. iam_trattative: la politica `true` scavalcava le tre che restano. -------
-- Restano tratt_select (proprie, condivise, staff), trattative_visibili e
-- trattative_superadmin_all. Conseguenza voluta: un collaboratore vede le sue
-- trattative e quelle condivise con lui, non più quelle di tutti.
alter policy iam_trattative_select on public.iam_trattative using ( false );

-- 3. quote_note, il diario dei clienti: solo gli interni; correggere e
-- cancellare una nota lo fa chi l'ha scritta o lo staff. ----------------------
alter policy note_select on public.quote_note using ( public.iam_mio_ruolo() is not null );
alter policy note_update on public.quote_note using ( public.iam_is_staff() or autore_id = auth.uid() );
alter policy note_delete on public.quote_note using ( public.iam_is_staff() or autore_id = auth.uid() );
alter policy note_insert on public.quote_note
  with check ( public.iam_mio_ruolo() is not null and autore_id = auth.uid() );

-- 4. Il contenitore `documenti`: carte d'identità, libretti, bonifici. --------
-- Chiuso al pubblico il 18/09 (§12), restava leggibile da QUALUNQUE account.
-- Chi non ha un account continua ad aprire i documenti con l'indirizzo firmato
-- dal server: quella strada non passa da qui.
alter policy "documenti read" on storage.objects
  using ( bucket_id = 'documenti' and ( owner = auth.uid() or public.iam_mio_ruolo() is not null ) );
alter policy "documenti upload" on storage.objects
  with check ( bucket_id = 'documenti' and public.iam_mio_ruolo() is not null );

-- Misurato subito dopo, simulando i tre tipi di account:
--   esterno        utenti 0  trattative 0   note 0  documenti 0
--   admin          utenti 5  trattative 24  note 1  documenti 30
--   collaboratore  utenti 5  trattative 0   note 1  documenti 30

-- 5. search_path fisso sulle funzioni che non lo avevano. --------------------
-- Tutte security invoker: il rischio era basso. `extensions` resta nel
-- percorso perché è quello che il chiamante aveva già.
do $$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    left join pg_depend d on d.objid = p.oid and d.deptype = 'e'
    where n.nspname = 'public' and d.objid is null and p.prokind = 'f'
      and (p.proconfig is null
           or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
  loop
    execute format('alter function %s set search_path = public, extensions', f);
  end loop;
end $$;

-- ROLLBACK (riapre i dati agli account esterni: da usare solo se un interno
-- resta senza accesso, e richiudere appena capito perché)
--
-- alter policy u_insert on public.iam_utenti with check ((id = auth.uid()) and
--   (coalesce(ruolo,'collaboratore') <> all (array['admin','top_master','operatore','master'])));
-- alter policy u_select on public.iam_utenti using (true);
-- alter policy iam_trattative_select on public.iam_trattative using (true);
-- alter policy note_select on public.quote_note using (auth.uid() is not null);
-- alter policy note_update on public.quote_note using (auth.uid() is not null);
-- alter policy note_delete on public.quote_note using (auth.uid() is not null);
-- alter policy note_insert on public.quote_note with check ((auth.uid() is not null) and (autore_id = auth.uid()));
-- alter policy "documenti read" on storage.objects using (bucket_id = 'documenti');
-- alter policy "documenti upload" on storage.objects with check (bucket_id = 'documenti');
-- (search_path: non serve tornare indietro)
