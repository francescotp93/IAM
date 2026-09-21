# Decisioni prese senza chiedere

Le scelte fatte in autonomia, con il motivo e come si torna indietro.
Il dettaglio tecnico sta in `CLAUDE.md`, paragrafo per paragrafo: qui c'è
soltanto quello che Francesco potrebbe voler ribaltare.

---

## 22/09/2026 — Le rate che sparivano ricaricando il file (0.22.1)

**Perimetro:** l'importazione del portafoglio dalla compagnia. Sei venuto con
l'anteprima del file PRIMA dell'anno aperta e il dito sul bottone: prima di
dirti «premi» ho guardato che cosa sarebbe successo, e non sarebbe successo
quello che volevi.

🔴 **Applicato al database, con la tua autorizzazione permanente.**
`20260922_import_rate_su_polizze_gia_dentro.sql`: riscrive **una sola
funzione**, `iam_importa_flusso`. Nessuna tabella, nessuna colonna, nessuna
politica, nessuna riga esistente toccata.
*Come tornare indietro:* si riapplica la funzione com'era in
`20260921_import_tutto_o_niente.sql` (righe 118-318). Attenzione: tornare
indietro rimette il difetto — ricaricare un file non recupera più le rate
delle polizze già in portafoglio.

🟡 **Ho fermato il tuo import invece di lasciartelo fare.** Avrebbe scritto le
polizze nuove e buttato via, senza dirlo, le rate delle polizze che ci sono
già — cioè proprio quelle delle 1.700 polizze che volevi sistemare. Alla fine
avresti letto «Import completato» e il problema sarebbe rimasto lì.
*Come tornare indietro:* niente da ribaltare, ma se preferisci che non ti
fermi mai e ti lasci provare, dimmelo.

🟡 **L'esito adesso dice in rosso quante rate sono rimaste fuori**, con
«proposte X, scritte Y». Prima quel riquadro diceva solo quello che era
entrato: se qualcosa veniva scartato non c'era modo di accorgersene.
*Come tornare indietro:* è un riquadro in `fluConferma`, si toglie in una riga.

🟡 **La versione sale a 0.22.1 e non a 0.23.0.** È una correzione, non una
funzione nuova: il numero di mezzo lo tengo per le cose che aggiungono.

---

## 21/09/2026 — Volumi di portafoglio e produzione (0.15.0)

**Perimetro:** il confronto anno su anno in Scrivania e la schermata Produzione.

🔴 **Applicato al database, con autorizzazione esplicita.**
`20260921_produzione_collaboratore.sql`: una colonna nuova su `quote_polizze`
(`collaboratore_id`), due indici, una vista e una funzione di sola lettura, più
le righe di evidenza dei sedici codici produttore (`deciso = false`, nessuna
persona). Nessuna riga esistente riscritta, nessun valore inventato.
*Come tornare indietro:* il blocco ROLLBACK è in testa al file di migrazione.

🟡 **La colonna sta sulla polizza, non solo sulla rata.** Sono due domande
diverse: la rata dice a chi spetta la provvigione, la polizza dice chi ha
prodotto il contratto. Se la produzione si leggesse dalle rate, una polizza che
cambia gestione a marzo sposterebbe la produzione di gennaio.
*Come tornare indietro:* si smette di leggere quella colonna; i dati restano.

🟡 **I due anni si contano fino allo stesso giorno.** Il confronto fra dodici
mesi e nove disegna un crollo che non è successo. Il taglio lo fa il database.
*Come tornare indietro:* una riga nella funzione `iam_produzione_confronto`.

🟡 **I volumi digitati a mano nella scheda del collaboratore restano.** Nove
schede su dodici ne hanno: si spengono quando i due numeri saranno stati
confrontati e torneranno, non perché ne è nata una migliore.

---

## 21/09/2026 — Gestione compagnie (0.16.0)

**Perimetro:** far atterrare sopra `main` una patch nata in un'altra sessione.

🟡 **Reimplementata invece di attesa.** La patch non era su `main` né su un ramo
remoto: esisteva solo come testo. Applicata qui, 14 hunk su 16 sono entrati da
soli. Scelta di Francesco, su mia segnalazione.

🟡 **Le prove della patch non sono state prese per buone.** Leggevano tutte il
sorgente; ne sono state aggiunte otto che fanno girare la schermata.
*Come tornare indietro:* `git revert` del commit 0.16.0.

---

## 21/09/2026 — L'import diventa tutto-o-niente

**Perimetro:** la schermata «Importa flusso compagnia».

🔴 **Applicato al database, con autorizzazione esplicita.**
`20260921_import_tutto_o_niente.sql`: una tabella di appoggio vuota
(`iam_import_lotti`) e una funzione di scrittura (`iam_importa_flusso`).
Nessuna tabella esistente modificata, nessuna riga riscritta.
*Come tornare indietro:* il blocco ROLLBACK è in testa al file; la schermata
tornerebbe a scrivere riga per riga come prima.

🟡 **RIBALTATA una regola scritta in CLAUDE.md §14.** Fino a oggi
l'importazione era volutamente *interrompibile*: quello che era scritto restava
e si ricaricava lo stesso file. Con venticinque polizze reggeva. Il 21/09/2026
si è misurato che con milleseicento non regge: l'import delle 06:33 ha scritto
2.475 anagrafiche e 1.690 polizze e si è fermato prima delle rate, senza
lasciare un verbale. **1.700 polizze su 1.715 non hanno nemmeno una rata**, cioè
non hanno insoluti e non si incassano.
Il motivo del ribaltamento: un'importazione a metà che si dichiara è
recuperabile, una che *sembra finita* è un portafoglio sbagliato di cui nessuno
sa il perché.
*Come tornare indietro:* il codice vecchio non è stato cancellato.

🟡 **Il catalogo resta fuori dal «tutto o niente»**, ed è voluto: il portafoglio
è il lavoro, il catalogo è la sua etichetta (CLAUDE.md §39, regola 6).

---

## 21/09/2026 — Codice produttore per compagnia (0.18.0, brief Anagrafiche · punto 3)

**Perimetro:** dare un periodo e un interruttore all'abbinamento fra un codice
produttore della compagnia e una persona.

🔴 **Applicato al database, con autorizzazione esplicita.**
`20260921_codici_periodo_e_attivo.sql`: tre colonne nuove su
`quote_codici_collaboratore` (`attivo`, `data_inizio`, `data_fine`). Nessuna
riga riscritta, nessuna colonna esistente toccata. Misurato prima e dopo: 16
righe, tutte attive, 0 con un periodo, 0 decise — dicono esattamente quello che
dicevano.
*Come tornare indietro:* il blocco ROLLBACK è in testa al file; il motore torna
a non guardarle, cioè a come si comportava fino a ieri.

🟡 **Le date si confrontano con l'effetto della polizza, non con oggi.** Con
«oggi» un abbinamento chiuso a giugno toglierebbe a quella persona anche le
polizze di marzo, che sono sue.
*Come tornare indietro:* una riga in `Assegnazione.valeIl`.

🟡 **Sospendere e togliere sono due bottoni, non uno.** Sospeso vuol dire «non
produce più, ma è stato suo»; tolto rimette il codice fra quelli da abbinare e
azzera periodo e sospensione, perché sono di quell'abbinamento e non del codice.

🟡 **Nel dettaglio di una polizza un produttore non risolto adesso si vede**
(richiamo giallo) e, quando l'abbinamento non copre quella data, **il nome non
si scrive**: si scrive il codice e il motivo.

🟡 **Una riga per codice, quindi un padrone per codice.** Il periodo non tiene
lo storico dei padroni che si sono succeduti: servirebbe un'altra chiave
primaria, ed è un lavoro a sé. Scritto nella migrazione.

---

## 21/09/2026 — Il contatore delle anagrafiche (0.19.0, brief Anagrafiche · punto 1)

**Perimetro:** far dire ai contatori quante anagrafiche ci sono davvero.

🟡 **Nessuna modifica al database.** I numeri li chiede il server con un
conteggio, senza scaricare le righe. Misurato: 2.536 anagrafiche, 29 lead,
2.507 clienti — la schermata diceva 50.

🟡 **Il marcatore `LEAD` scritto nelle note non decide più chi è un lead**:
decide la colonna `lead`. Misurato: una sola riga in tutto l'archivio ha quel
marcatore, e non è fra i clienti — il numero non cambia.
*Come tornare indietro:* si rimette il filtro sulle note in `caricaDaFareOggi`.

🟡 **Il consenso marketing ha una regola sola per tutta la casa.** La Scrivania
di IAM guardava solo la privacy firmata e non la colonna `consenso_marketing`:
contava fra i buchi anche chi il consenso l'aveva dato allo sportello. Oggi i
due numeri coincidono per caso (4 consensi, tutti da privacy firmata).
*Come tornare indietro:* `git revert` del commit del punto 1.

🟡 **Sotto l'elenco compare «Ne vedi 50 su 2.507».** Senza, una lista che si
ferma a cinquanta e un contatore che ne dice duemilacinquecento si leggono come
un guasto.

---

## 21/09/2026 — «Compleanni di oggi» in Marketing (0.19.0, brief Anagrafiche · punto 2)

**Perimetro:** spostare il riquadro dei compleanni da Clienti a Campagne.

🔴 **CAMBIA CHI PUÒ VEDERLO, ed è da sapere.** La pagina Clienti la vede
chiunque entri nel preventivatore; **Marketing è dietro il cancello
`lab_abilitato`** (o super-admin). Un collaboratore senza Marketing abilitato
**non vede più i compleanni**. Non è un effetto collaterale: è la conseguenza
diretta di dove il brief chiede di mettere il riquadro.
*Come tornare indietro:* o si abilita Marketing a chi serve, o si riporta il
riquadro in Anagrafiche — una riga di HTML e una chiamata.

🟡 **In Anagrafiche non resta niente**, né un riquadro vuoto né un rimando: un
rimando a una schermata che sta altrove è il doppione che si voleva togliere.

🟡 **Le regole non sono cambiate di una riga**: invio manuale uno per persona,
solo con consenso marketing e un recapito, traccia nel diario e nel registro.

---

## 21/09/2026 — Il grafico dei volumi è un grafico (0.20.0)

**Perimetro:** «per la dashboard volevo un grafico, non un indicatore».

🟡 **Nessuna modifica al database.** Il grafico legge la funzione che c'era già.

🟡 **Il grafico sta SOPRA i tre riquadri di indicatori.** La prima cosa che si
vede aprendo IAM è l'andamento. I tre riquadri restano, sotto: rispondono a
domande che il grafico non fa.
*Come tornare indietro:* si riscambiano i due blocchi in `#panel-dashboard`.

🟡 **Barre appaiate → due curve ad area.** Ventiquattro barre in dodici slot su
un telefono sono trentadue pixel per mese: illeggibili. Con due curve la
risposta si legge senza numeri — dove il grigio spunta sopra il verde, quel
mese è andato peggio.
*Come tornare indietro:* `git revert` del commit 0.20.0.

🟡 **Corretta una regola del motore.** `fuori_confronto` si accendeva solo dove
il database aveva mandato una riga: un mese vuoto in tutti e due gli anni non
risultava «non ancora arrivato». Adesso lo decide la data, come già faceva il
mese parziale. Cambia i dati che escono da `Produzione.confronto`, quindi lo
usa anche la schermata Produzione.

---

## 21/09/2026 — Tre scritture che non riuscivano (0.21.0)

**Perimetro:** il caricamento dei documenti, i mezzi di pagamento, il foglio cassa.

🔴 **Cambiata una configurazione di PRODUZIONE, con autorizzazione esplicita.**
Sul VPS mancava `SUPABASE_ANON_KEY`, e senza quella i documenti del fascicolo
non si caricavano. È stata scritta nel `.env` del backend prendendola **dal
client**, dove quella chiave è pubblica per costruzione: non è passata da
nessuna parte, non è nel repository e non è in nessun messaggio. Backup del
file accanto, con la data.
*Come tornare indietro:* si toglie quella riga dal `.env` e si riavvia — ma il
caricamento dei documenti torna a fallire.

🔴 **Applicate due migrazioni, con autorizzazione esplicita.**
`20260921_mezzi_conti_allineati.sql` riscrive **solo** la colonna `mezzi` dei
conti (configurazione, non contabilità: nessuna polizza e nessuna rata
toccata). `20260921_polizze_senza_rate.sql` aggiunge una funzione di sola
lettura. Il blocco ROLLBACK è in testa a tutti e due i file.

🟡 **RIBALTATO il vocabolario dei mezzi di pagamento.** Erano quattro elenchi,
e due chiavi su nove divergevano fra il motore della contabilità e il vincolo
del database. Vince il database, perché è l'unico che non si può cambiare
senza riscrivere 1.720 polizze e 55 rate.
*Come tornare indietro:* `git revert` del commit 0.21.0 **e** il rollback della
migrazione dei conti — le due cose vanno insieme.

🟡 **Il foglio cassa parte dalla DATA DI EMISSIONE, non più da quella di
incasso.** È la richiesta di Francesco. Chi lo usava per quadrare la cassa
trova numeri diversi al primo colpo d'occhio: la schermata dichiara su quale
data sta guardando, e il selettore «Date su» riporta alla lettura di prima.
*Come tornare indietro:* una riga in `fcFiltri`.

🟡 **Le rate non incassate entrano nel foglio, i loro premi NO nei totali di
cassa.** Emesso e incassato sono due tessere separate e non si sommano mai; le
provvigioni contano solo l'incassato (regola §17).

🟡 **Il foglio cassa adesso legge tutto il portafoglio, paginando.** Prima si
fermava a mille righe e scartava in silenzio le rate delle altre 720 polizze.
Se un giorno l'archivio superasse il tetto dichiarato, lo scrive.

---

## 21/09/2026 — L'archivio: il secondo ostacolo (0.21.1)

**Perimetro:** far tornare a funzionare il caricamento dei documenti.

🔴 **Cambiati i permessi di una cartella in PRODUZIONE, con autorizzazione
esplicita.** `/var/lib/withus` era di `root` e il servizio gira come `withus`:
non riusciva ad arrivare alla propria cartella dell'archivio. Ora tutte e due
sono `withus:withus` con `chmod 700` — solo il servizio entra, nessun altro
utente della macchina legge quei file.
*Come tornare indietro:* si rimette `chown root:root /var/lib/withus` — ma il
caricamento dei documenti torna a fallire.

🔴 **Cancellata una riga dal database, con autorizzazione esplicita.**
`iam_archivio` conteneva **una** riga orfana (`41d6999c-…`, «Certificato
Galfano Vito.pdf», nata alle 15:44 dal guasto dei permessi): puntava a un file
che sul disco non c'è mai stato (misurato: zero file cifrati presenti).
Lasciarla vorrebbe dire mostrare nel fascicolo un documento che si vede, si
clicca e non si apre.
*Come tornare indietro:* non si torna indietro, e non serve — **quel documento
va ricaricato**, perché il PDF non è mai arrivato sul server.

🟡 **Il controllo d'avvio adesso PROVA a scrivere.** Prima guardava solo che il
percorso fosse nel posto giusto. È la terza volta nella stessa giornata che si
trova lo stesso schema: un controllo che guarda la forma e non la sostanza.
*Come tornare indietro:* `git revert` del commit 0.21.1.

🟡 **Se il file non si salva, la riga dei metadati si toglie.** Prima restava,
e il commento diceva che «una riga senza file è recuperabile»: vero solo se
qualcuno la recupera. L'ordine delle due scritture **non è cambiato** — un file
cifrato senza la sua riga non è di nessuno.

---

## 21/09/2026 — Contabilità · Fase 1: le fondamenta a partita doppia (0.22.0)

**Perimetro:** la prima nota diventa a partita doppia. Niente incassi, niente
sospesi, niente estratti conto: sono le Fasi 2, 3 e 4.

🔴 **Applicato al database, con autorizzazione esplicita.**
`20260922_contab_partita_doppia.sql`: la tabella nuova `iam_movimenti_righe`
(le righe Dare/Avere), cinque colonne su `iam_conti`, una su `iam_causali`,
nove su `iam_movimenti`, quattro trigger, due politiche e la funzione
`iam_movimento_registra`. **Nessuna riga esistente riscritta** tranne il numero
progressivo dato all'unico movimento che c'era, e **nessun conto creato**.
*Come tornare indietro:* il blocco ROLLBACK è in testa al file di migrazione.

🟡 **I dodici conti minimi della specifica NON sono stati creati.** Sono una
proposta nella schermata Conti e casse: si spuntano e li crea una persona. Un
conto ha un saldo, e dodici saldi a zero che nessuno ha deciso diventano dodici
dati dopo due settimane (regola di casa §8.1).
*Come tornare indietro:* niente da disfare — non è stato scritto niente.

🟡 **Niente `organization_id`, contro il principio 7 della specifica.**
Misurato: zero colonne tenant in tutto il database, `iam_azienda` ha una riga.
Una colonna che vale sempre lo stesso valore non isola niente, e le prove di
«isolamento fra tenant» proverebbero una cosa che non esiste. L'isolamento qui
è per RUOLO: lo staff legge, l'admin scrive.
*Come tornare indietro:* si aggiunge la colonna il giorno in cui esiste una
seconda agenzia — e quel giorno va aggiunta ovunque, non solo in contabilità.

🟡 **`iam_movimenti.conto_id` e `.importo` restano**, e da oggi sono il derivato
della riga singola. Toglierli adesso vorrebbe dire riscrivere cinque funzioni
con 34 prove sopra mentre si cambia il modello.
*Come tornare indietro:* si spengono quando le schermate leggeranno le righe.

🟡 **I movimenti scritti prima di oggi non si stornano.** Hanno un conto solo e
la contropartita non è mai stata scritta: non si rovescia quello che non c'è, e
inventarla vorrebbe dire scrivere in contabilità una cosa che nessuno ha
deciso. Si annullano col motivo, come prima, e restano a registro.
*Come tornare indietro:* nessuna strada che non passi dall'inventare.

🟡 **`origine` ammette un valore in più (`storno`).** Senza, il primo storno
sarebbe morto contro un vincolo dopo che la schermata aveva detto «sì, si può».
I quattro valori di prima restano e nessuna riga si è mossa.

🟡 **La soglia dei punti di chiamata del registro sale da 54 a 57.** Tre
movimenti nuovi lasciano traccia: i conti minimi creati in blocco, lo storno e
il movimento che nasce dallo storno.

---

## Fuori perimetro — annotato e non fatto

- **`flusso-ssf.js:805 aggiungiMesi` duplica `PianoRate.sommaMesi`**: due copie
  dell'aritmetica delle date, e una tocca le date di incasso. Da unire.
- **«Nuova polizza» non chiede chi l'ha prodotta.** Va aggiunto con il
  componente unico dei collaboratori, che è il punto 4 del brief Anagrafiche:
  farne uno adesso vorrebbe dire scriverne uno da buttare.
- **Le politiche di `quote_polizze` non sono cambiate**: si legge ancora per
  `creato_da`, che è un utente solo. Far vedere a un collaboratore «le sue»
  polizze è una decisione, non una conseguenza.
- **`tracciabilita.test.mjs` è rosso su `main` da prima** (10/17, CLAUDE.md §21).
- **Le rate perse dall'import di stamattina non si ricostruiscono dal
  database**: stanno solo nel file della compagnia. Si recuperano ricaricando
  quello stesso file, che adesso è idempotente e atomico.
- **«CASSA CONTANTI» è di tipologia `altro`**, quindi il fondo cassa ricostruito
  non la conta. Il sistema lo dice come anomalia; cambiare la tipologia di un
  conto è una decisione contabile e non si fa da soli.
- **Due conti dichiarano di ricevere i contanti**: finché è così quegli incassi
  leggono «non si sa». Va lasciato su uno solo.
- **Il manuale di contabilità di AssiEasy** (con la parte «registrazione
  movimenti», cioè la loro prima nota) è da leggere e mappare contro quello che
  IAM ha già: è il task #64, non fatto in questo rilascio.
- **Il codice produttore si cerca sulla compagnia scritta esatta**, non sugli
  alias di `quote_compagnie` (CLAUDE.md §11): «HDI Assicurazioni» sulla polizza
  e «HDI» in tabella non si ritroverebbero. Sul portafoglio vero c'è una
  compagnia sola e il difetto non si vede; va guardato prima del secondo flusso.
- **Il motore della contabilità chiede l'ora al computer in tre punti**
  (`giorniDa`, `sospesiAperti`, `anomalie`), nati con la M4 e la M5: è la
  famiglia del difetto delle date di CLAUDE.md §44 e §45. Nel blocco della
  partita doppia non c'è, e una prova lo sorveglia; gli altri tre vogliono di
  passare `oggi` da chi chiama, cioè toccare le schermate M4 e M5.
- **`otp-dalla-posta.test.mjs` è rosso su `main` da prima** (5/17): cerca
  `server/otpPosta.js`, che nel repository non c'è. È il guasto §1 al
  contrario — una prova che sorveglia un modulo mai arrivato.
- **La prima nota nasce vuota e i saldi iniziali dei conti sono a zero**:
  finché non si scrivono quelli veri, il saldo ricostruito parte da un numero
  che non è quello.
