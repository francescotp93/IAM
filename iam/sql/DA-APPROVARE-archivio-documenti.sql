-- ═══════════════════════════════════════════════════════════════════════════════
--  DA APPROVARE — NON ESEGUITO
--
--  Questo file NON e' stato lanciato sull'archivio. Cambia le regole di accesso
--  ai documenti in produzione: lo esegue Francesco, o Leo dopo il suo via libera
--  esplicito.
--
--  DI COSA SI PARLA
--  "documenti" e' il magazzino dove finiscono i file di tutta la piattaforma:
--  carte d'identita', libretti, patenti, contabili di bonifico, polizze firmate,
--  fatture dei collaboratori, allegati delle chat, documenti dei sinistri. Sono
--  dati personali degli assicurati: qui dentro finisce roba che, per il GDPR,
--  non puo' stare in giro.
--
--  Oggi ci sono 22 file, caricati fra il 17 e il 24 giugno 2026, divisi cosi':
--    rcvp 13, shop 2, infcirc 2, preventivi 1, clienti 1, bonifici 1,
--    messaggi 1, tutelalegale 1.
--  Venti hanno un proprietario (li ha caricati una persona dal browser); due no,
--  e sono esattamente i due della cartella shop, che li scrive il server con la
--  chiave di servizio. Non e' un'anomalia: e' come funziona.
--
--
--  ═══ COSA SUCCEDE OGGI ═══════════════════════════════════════════════════════
--
--  PRIMO. Il magazzino e' aperto in lettura a chiunque (public = true). Chi ha
--  l'indirizzo di un file lo apre senza fare l'accesso, per sempre, anche dopo
--  che non lavora piu' con noi. E gli indirizzi non sono segreti come sembrano:
--  Quoto li costruisce cosi'
--
--      rcvp/<orario in millisecondi>_<tipo>_<nome del file>
--      clienti/<numero cliente>/<orario in millisecondi>_<nome del file>
--
--  cioe' con pezzi che si conoscono o si tirano a indovinare. Non e' un lucchetto,
--  e' un indirizzo lungo. Se un link finisce in una mail inoltrata, nella
--  cronologia di un browser, o in un messaggio girato per sbaglio, quel documento
--  e' fuori e non c'e' modo di richiamarlo indietro.
--
--  SECONDO. Le tre regole di scrittura su questo magazzino sono queste, tutte per
--  il ruolo "utente che ha fatto l'accesso":
--
--      documenti upload   puo' caricare        se il magazzino e' "documenti"
--      documenti update   puo' sovrascrivere   se il magazzino e' "documenti"
--      documenti delete   puo' cancellare      se il magazzino e' "documenti"
--
--  Nessuna delle tre guarda CHI ha caricato il file. Vuol dire che qualunque
--  utenza con un accesso a IAM o a Quoto puo' sovrascrivere o cancellare
--  qualunque documento di chiunque altro: la contabile di bonifico di un cliente,
--  la polizza firmata, la fattura di un collaboratore. Non serve essere
--  amministratore. Non resta traccia.
--
--  TERZO. Non c'e' nessun limite: ne' di dimensione del singolo file
--  (file_size_limit e' vuoto), ne' di tipo (allowed_mime_types e' vuoto). Un
--  errore, o un'utenza finita nelle mani sbagliate, puo' riempire il magazzino
--  fino a far crescere la bolletta di Supabase senza che nessuno se ne accorga.
--
--
--  ═══ LE TRE STRADE ═══════════════════════════════════════════════════════════
--
--  A) LASCIARE COSI'. Non e' una strada. Dati personali di assicurati leggibili
--     da chiunque abbia un indirizzo, e cancellabili da qualunque utenza: davanti
--     a un controllo IVASS o a una richiesta GDPR non si difende.
--
--  B) CHIUDERE IL MAGAZZINO (public = false), regole per proprietario, e ovunque
--     link "firmati" che scadono dopo qualche minuto. E' il punto di arrivo
--     giusto. Non si puo' fare stanotte, e va detto perche':
--
--       - Quoto ha 21 punti nel codice che chiedono l'indirizzo pubblico di un
--         file (getPublicUrl), e quell'indirizzo lo SCRIVE DENTRO le schede sul
--         database — preventivi, clienti, sinistri, messaggi, cauzioni. Chiudere
--         il magazzino spegne tutti e 21 i punti nello stesso momento;
--       - anche i link gia' spediti per mail smettono di funzionare: il cliente
--         che riapre la mail della sua polizza firmata trova una pagina di
--         errore;
--       - due pezzi del server (firma privacy e shop) restituiscono l'indirizzo
--         pubblico al chiamante: vanno riscritti anche quelli.
--
--     Va fatta a tappe, punto per punto, con i vecchi indirizzi convertiti. E'
--     lavoro di giorni, non di una notte, e va programmata.
--
--  C) QUELLO CHE SI PUO' FARE SUBITO, SENZA ROMPERE NIENTE — e' quello che
--     propongo qui sotto. Il magazzino resta leggibile come adesso (nessun link
--     smette di funzionare), ma:
--
--       1. sovrascrivere e cancellare diventa possibile solo a chi ha caricato il
--          file, o a un amministratore;
--       2. si mette un tetto alla dimensione dei file.
--
--     PERCHE' NON ROMPE NIENTE, verificato sul codice vero e non a naso: in tutti
--     e due i progetti, IAM e Quoto, non esiste UNA SOLA riga che cancelli o
--     sovrascriva un file dell'archivio. Non c'e' nessun .remove(), e nessun
--     caricamento con "upsert" dal browser. Le due regole update e delete, oggi,
--     non le usa nessuno: sono solo una porta lasciata aperta. Chiuderla non
--     toglie niente a nessuno.
--     I due punti del server che scrivono con "x-upsert" (server/sign.js e
--     server/shop.js) usano la chiave di servizio, che sta sopra queste regole e
--     non ne e' toccata.
--
--     Sul tetto di dimensione: il file piu' grande oggi in archivio pesa 9,4 MB
--     (una foto), e lo shop del server gia' rifiuta da solo tutto quello che
--     supera i 12 MB. Un tetto a 25 MB non tocca niente di quello che facciamo e
--     ferma la crescita fuori controllo.
--
--     NON propongo di limitare i TIPI di file. Servirebbe a poco e romperebbe:
--     quando il browser non riconosce un PDF, il codice lo carica come
--     "application/octet-stream" — che nell'elenco dovremmo tenere per forza, e
--     tenendolo l'elenco non filtra piu' niente. Prima va corretto il codice
--     perche' dichiari sempre il tipo giusto; poi, e solo poi, ha senso l'elenco.
--
--
--  ═══ COSA CONTROLLARE DOPO AVER ESEGUITO ═════════════════════════════════════
--   1. Caricare un allegato su una fattura di un collaboratore, da IAM: deve
--      salire e riaprirsi.
--   2. Caricare un documento su un preventivo da Quoto: idem.
--   3. Aprire un documento vecchio, caricato prima di oggi: deve aprirsi come
--      sempre (la lettura non cambia).
--  Se qualcosa non va, in fondo al file c'e' come tornare indietro in due righe.
--
--
--  ═══ COME SI ESEGUE (per Francesco, senza toccare un terminale) ══════════════
--  Sul sito di Supabase, progetto ekjxrnsfqxnfxzrthdcf: menu a sinistra "SQL
--  Editor", nuovo foglio, si incolla tutto quello che sta sotto questa riga e si
--  preme Run. Sono quattro comandi, durano un istante e non toccano nessun dato:
--  cambiano solo chi puo' fare cosa.
--  Se comparisse l'errore "permission denied for table objects", basta mettere
--  come primissima riga:      set role supabase_storage_admin;
--  La tabella dei file appartiene a quell'utenza tecnica di Supabase.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. Sovrascrivere: solo il proprio, o un amministratore ────────────────────
-- Nota tecnica: "owner" e' la colonna che Supabase riempie da sola con l'utenza
-- che ha caricato il file. I due file della cartella shop hanno owner vuoto
-- perche' li scrive il server: resteranno modificabili solo dal server stesso e
-- dagli amministratori. E' corretto cosi'.

drop policy if exists "documenti update" on storage.objects;

create policy "documenti update" on storage.objects
for update to authenticated
using (
  bucket_id = 'documenti'
  and ( owner = auth.uid() or public.iam_is_admin() )
)
with check (
  bucket_id = 'documenti'
  and ( owner = auth.uid() or public.iam_is_admin() )
);


-- ── 2. Cancellare: solo il proprio, o un amministratore ───────────────────────

drop policy if exists "documenti delete" on storage.objects;

create policy "documenti delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'documenti'
  and ( owner = auth.uid() or public.iam_is_admin() )
);


-- ── 3. Caricare: resta come oggi ──────────────────────────────────────────────
-- La regola "documenti upload" non si tocca. Chi ha l'accesso carica, come
-- adesso: e' il lavoro di tutti i giorni. Il proprietario viene registrato da
-- solo ed e' quello che rende possibili i punti 1 e 2.


-- ── 4. Un tetto alla dimensione dei file: 25 MB ───────────────────────────────

update storage.buckets
   set file_size_limit = 26214400   -- 25 MB
 where id = 'documenti';


-- ── PER TORNARE INDIETRO ──────────────────────────────────────────────────────
-- Rimette esattamente la situazione di oggi:
--
--   drop policy if exists "documenti update" on storage.objects;
--   create policy "documenti update" on storage.objects for update to authenticated
--     using (bucket_id = 'documenti') with check (bucket_id = 'documenti');
--
--   drop policy if exists "documenti delete" on storage.objects;
--   create policy "documenti delete" on storage.objects for delete to authenticated
--     using (bucket_id = 'documenti');
--
--   update storage.buckets set file_size_limit = null where id = 'documenti';


-- ═══════════════════════════════════════════════════════════════════════════════
--  QUELLO CHE RESTA APERTO — la strada B, da programmare
--
--  Anche dopo questa migrazione il magazzino resta LEGGIBILE da chiunque abbia
--  l'indirizzo di un file. Questo e' il problema piu' serio dei tre e questa
--  migrazione non lo risolve: lo circoscrive soltanto.
--
--  La strada, quando la decidiamo, e' questa e in quest'ordine:
--
--   1. Smettere di produrre indirizzi indovinabili. Ogni nuovo caricamento va in
--      una cartella con un codice casuale, come gia' fanno gli allegati delle
--      fatture dei collaboratori da qualche giorno:
--          fatture/<collaboratore>/<codice casuale>_<nome file>
--      Da fare in tutti i 21 punti di Quoto. Non rompe niente: i file vecchi
--      restano dove sono.
--   2. Passare la lettura ai link firmati che scadono (createSignedUrl), sempre
--      con la stessa tecnica gia' usata su IAM: si apre prima la finestra e poi
--      le si da' l'indirizzo, altrimenti il browser la blocca. Un punto alla
--      volta, verificando ogni volta.
--   3. Convertire gli indirizzi pubblici gia' scritti dentro le schede sul
--      database: da indirizzo completo a semplice percorso del file.
--   4. Solo alla fine, e solo quando i primi tre punti sono chiusi ovunque,
--      chiudere il magazzino (public = false). Da quel momento i link vecchi
--      spediti per mail non funzionano piu': va deciso se avvisare i clienti o
--      accettarlo.
--
--  Non e' una cosa da fare di nascosto in una notte: sono giorni di lavoro con
--  una verifica per ogni punto. La metto in roadmap e aspetto il via libera.
-- ═══════════════════════════════════════════════════════════════════════════════
