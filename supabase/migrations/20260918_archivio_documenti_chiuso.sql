-- ═══════════════════════════════════════════════════════════════════════════════
--  L'ARCHIVIO DEI DOCUMENTI SI CHIUDE (18/09/2026)
--
--  `documenti` è il magazzino dove finiscono i file di tutta la piattaforma:
--  carte d'identità, libretti, patenti, contabili di bonifico, polizze firmate,
--  fatture dei collaboratori, allegati delle chat, documenti dei sinistri. Sono
--  dati personali di assicurati e di persone che nemmeno sono nostri clienti.
--
--  Fino a oggi era PUBBLICO in lettura. Chi aveva l'indirizzo di un file lo
--  apriva senza fare l'accesso, per sempre, anche dopo aver smesso di lavorare
--  con noi. E gli indirizzi non sono segreti: si costruiscono con l'orario in
--  millisecondi e il nome del file, cioè con pezzi che si tirano a indovinare.
--  Davanti a un controllo IVASS o a una richiesta GDPR non si difende.
--
--  Il quadro completo, le tre strade e il perché di ogni scelta stanno in
--  `iam/sql/DA-APPROVARE-archivio-documenti.sql`, scritto prima di questo file.
--  Lì la chiusura era «la strada B, da programmare: giorni di lavoro, non una
--  notte». Questa migrazione la chiude, ed è l'ultimo dei quattro passi che
--  quel documento elencava: i primi tre — indirizzi firmati ovunque, percorsi
--  al posto degli indirizzi pubblici, lettura compatibile con le righe vecchie
--  — sono nel codice che accompagna questa migrazione.
--
--  ═══ COSA CAMBIA, IN ORDINE DI IMPORTANZA ══════════════════════════════════
--
--  1. LETTURA. Il magazzino non è più pubblico: per leggere un file serve un
--     indirizzo FIRMATO, e per farselo firmare serve un account. Chi non è
--     collegato non apre più niente, nemmeno conoscendo il percorso.
--
--  2. CHI PUÒ SOVRASCRIVERE E CANCELLARE. Erano regole aperte a qualunque
--     utenza collegata: chiunque poteva cancellare la polizza firmata di un
--     cliente di un altro, senza lasciare traccia. Ora solo chi ha caricato il
--     file, o un amministratore.
--
--  3. UN TETTO ALLA DIMENSIONE: 25 MB. Il file più grande in archivio pesa
--     9,4 MB e lo shop rifiuta già da sé sopra i 12 MB: non tocca niente di
--     quello che facciamo, e ferma la crescita fuori controllo.
--
--  ═══ QUELLO CHE SI ROMPE, E VA SAPUTO PRIMA ════════════════════════════════
--
--  I collegamenti PUBBLICI GIÀ SPEDITI smettono di funzionare. Un cliente che
--  riapre una vecchia email «Scarica la tua polizza» trova una pagina di
--  errore. Non c'è modo di evitarlo tenendo chiuso il magazzino: è il prezzo
--  della chiusura, ed è più basso del rischio che copre. Da oggi le email
--  portano un collegamento firmato che vale 30 giorni e lo dichiara nel testo
--  (`server/notify.js`), e la copia resta sempre disponibile in agenzia.
--
--  ═══ COSA CONTROLLARE DOPO AVER ESEGUITO ═══════════════════════════════════
--   1. Caricare un allegato su una fattura di un collaboratore, da IAM: deve
--      salire e riaprirsi.
--   2. Caricare un documento d'identità dalla scheda cliente, su QUOTO: idem.
--   3. Aprire un documento caricato PRIMA di oggi (l'indirizzo pubblico è
--      ancora scritto nel database): deve aprirsi lo stesso, perché il codice
--      ne ricava il percorso e lo firma.
--   4. Provare a incollare in una finestra anonima un vecchio indirizzo
--      `…/object/public/documenti/…`: deve rispondere «Bucket not found» o
--      400. Se si apre, la chiusura non ha funzionato.
--
--  In fondo c'è come tornare indietro.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. IL MAGAZZINO SI CHIUDE ────────────────────────────────────────────────
update storage.buckets
   set public = false,
       file_size_limit = 26214400   -- 25 MB
 where id = 'documenti';

-- ── 2. LEGGERE: serve un account ─────────────────────────────────────────────
-- Prima questa regola non esisteva proprio: la lettura non passava dalle
-- regole, perché un bucket pubblico le scavalca. Senza, adesso, non
-- leggerebbe più nessuno — nemmeno l'applicazione, perché firmare un
-- indirizzo richiede il permesso di leggere l'oggetto.
--
-- Perché a TUTTI quelli collegati e non solo al proprietario: un operatore
-- deve poter aprire il documento che ha caricato un collega, altrimenti il
-- lavoro si ferma. La differenza che conta è un'altra, ed è enorme: prima
-- poteva leggere CHIUNQUE AL MONDO, adesso solo chi ha un account in casa.
drop policy if exists "documenti read" on storage.objects;
create policy "documenti read" on storage.objects
for select to authenticated
using ( bucket_id = 'documenti' );

-- ── 3. SOVRASCRIVERE: solo il proprio, o un amministratore ───────────────────
-- «owner» è la colonna che Supabase riempie da sola con l'utenza che ha
-- caricato il file. I file scritti dal server (cartella shop) hanno owner
-- vuoto: resteranno modificabili solo dal server stesso, che usa la chiave di
-- servizio e sta sopra queste regole, e dagli amministratori. È corretto così.
drop policy if exists "documenti update" on storage.objects;
create policy "documenti update" on storage.objects
for update to authenticated
using      ( bucket_id = 'documenti' and ( owner = auth.uid() or public.iam_is_admin() ) )
with check ( bucket_id = 'documenti' and ( owner = auth.uid() or public.iam_is_admin() ) );

-- ── 4. CANCELLARE: solo il proprio, o un amministratore ──────────────────────
drop policy if exists "documenti delete" on storage.objects;
create policy "documenti delete" on storage.objects
for delete to authenticated
using ( bucket_id = 'documenti' and ( owner = auth.uid() or public.iam_is_admin() ) );

-- ── 5. CARICARE: resta com'era ───────────────────────────────────────────────
-- Chi ha l'accesso carica, come adesso: è il lavoro di tutti i giorni. Il
-- proprietario viene registrato da solo ed è quello che rende possibili i
-- punti 3 e 4. La regola si riscrive qui solo per averla sotto gli occhi
-- insieme alle altre.
drop policy if exists "documenti upload" on storage.objects;
create policy "documenti upload" on storage.objects
for insert to authenticated
with check ( bucket_id = 'documenti' );

-- ═══════════════════════════════════════════════════════════════════════════════
--  PER TORNARE INDIETRO (rimette esattamente la situazione del 17/09/2026)
--
--   update storage.buckets set public = true, file_size_limit = null
--    where id = 'documenti';
--   drop policy if exists "documenti read" on storage.objects;
--   drop policy if exists "documenti update" on storage.objects;
--   create policy "documenti update" on storage.objects for update to authenticated
--     using (bucket_id = 'documenti') with check (bucket_id = 'documenti');
--   drop policy if exists "documenti delete" on storage.objects;
--   create policy "documenti delete" on storage.objects for delete to authenticated
--     using (bucket_id = 'documenti');
--
--  Il codice invece NON va rimesso indietro: legge sia i percorsi sia i vecchi
--  indirizzi pubblici, quindi continua a funzionare col magazzino aperto.
-- ═══════════════════════════════════════════════════════════════════════════════
