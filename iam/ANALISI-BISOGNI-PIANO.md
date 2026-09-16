# Analisi dei bisogni — piano di integrazione

Passo 1 del prompt master («Analisi prima del codice»): file da toccare, punti
di innesto per numero di riga, funzioni già esistenti da riusare, contratti
mancanti, rischi, strategia di prova. **Nessun file di prodotto è stato
modificato**: qui c'è solo il piano.

Data: 4 agosto 2026 · Pacchetto di riferimento: «Analisi dei bisogni With Us» 1.0.0

---

## 0. Stato della specifica

Il pacchetto completo è arrivato il 4 agosto 2026 ed è conservato in
`docs/analisi-bisogni/`: 28 file, **27 verificati contro `SHA256SUMS.txt`,
zero discordanze**. Sta nel repository e non nella cartella dei caricamenti
perché quella è temporanea, e senza copia la specifica di questa funzione
sarebbe sparita col contenitore.

Oltre agli undici documenti c'è una cartella `reference/` che l'indice non
annunciava e che contiene **codice funzionante**, non descrizioni:

| File | Cosa risolve |
|---|---|
| `analisi-bisogni-rating.mjs` | il motore completo: pesi, soglie, motivi, `VERSIONE_REGOLE = 'ABR-1.0.0'` |
| `analisi-bisogni-rating.test.mjs` | le sue prove, già scritte |
| `inviti-sicuri.mjs` + prove | token, hash, scadenza, revoca — con `timingSafeEqual` |
| `genera-pdf-playwright.mjs` | il PDF lato server |
| `analisi-bisogni-schema-proposta.sql` | lo schema Supabase |
| `report-data.example.json` | la forma dello snapshot |
| `pdf-visual-source-reportlab.py` | il sorgente dei PDF campione |

Rispetto al solo prototipo grafico, il modulo di riferimento aggiunge due cose
che nel browser non c'erano e che cambiano il risultato: lo stato **grigio**
per dati insufficienti (`statoCategoria`, urgenza `-100`) e un indice
complessivo che **esclude** le categorie grigie e ripesa su quelle rimaste
(`calcolaIndiceComplessivo`). Il prototipo pesava sempre 50/30/20 sulle prime
tre, comprese quelle senza dati: avrebbe stampato un numero anche quando non
c'era niente su cui calcolarlo.

### L'unica cosa che manca ancora

Il **testo privacy approvato**. Non è una dimenticanza del pacchetto: è una
decisione dell'agenzia. Il prototipo lo marca alla riga 308
(`privacyVersion: 'DA SOSTITUIRE CON VERSIONE APPROVATA'`) e `07-PRIVACY-OTP-LINK.md`
§1 lo chiede esplicitamente prima del rilascio.

Non blocca il lavoro. Si costruisce con il testo Mod. PR01 già usato in
produzione (`QUOTE/server/sign.js:382`), versionato come provvisorio e
sostituibile senza toccare il codice. Va sostituito **prima** che un cliente
vero firmi.

---

## 1. Dove si innesta, nel codice vero

### 1.1 IAM — `Agente-sospesi`

| Punto | File:riga | Nota |
|---|---|---|
| Voce di menu | `withus-one.js:313-324` — gruppo `strumenti` | vedi §1.2 |
| Titolo e briciole | `withus-one.js:344` mappa `TITOLI` | **non** `TITOLI_QUOTO`: quella si legge solo a preventivatore aperto, e la barra resterebbe «IAM > IAM» (già successo, commento in loco alla riga 346) |
| Scheda→menu | `withus-one.js:416` mappa `TAB2MENU` | serve la riga `analisi: 'strumenti'`, altrimenti la voce non si evidenzia |
| Nuovo pannello | `index.html` dopo la riga 2838 (chiusura di `#panel-fonti`) | prima di `<script>` a 2840 |
| Stili confinati | `index.html`, blocco `#panel-fonti{` a 509 | stesso schema: tutti i token dentro `#panel-analisi`, mai globali |
| Chiamate al motore | `index.html:8658` `mailFetch(path, opts)` | già firma con la sessione Supabase |
| Base del motore | `index.html:8025` `MAIL_API` | `https://api.withusassicurazioni.it` |

Pagina pubblica: nuovo file `analisi-bisogni.html` nella radice di
`Agente-sospesi`, servito da GitHub Pages su
`iam.withusassicurazioni.it/analisi-bisogni.html?t=<token>`. Statica, senza
scocca, senza `db` Supabase nel browser: parla solo col motore.

### 1.2 Il menu non ha tre livelli

Il pacchetto consiglia **Strumenti > Marketing > Analisi dei bisogni**. `MENU`
in `withus-one.js` è a due livelli: capo-menu e `sub`, e non esiste alcun terzo
livello né una voce «Marketing» (le campagne email stanno a `withus-one.js:319`
direttamente dentro Strumenti).

Innesto proposto, che rispetta la struttura esistente senza inventarne una:
`Strumenti > Analisi dei bisogni`, subito sotto «Campagne email» — che è
l'altra funzione marketing e sta già lì. Costa una riga; un terzo livello
costerebbe la riscrittura del menu, che è fuori perimetro.

### 1.3 QUOTO — `QUOTE`, solo `server/`

| Punto | File:riga |
|---|---|
| Montaggio rotte | `server/index.js:90` (in coda ai router protetti) e `server/index.js:97` (schema dei router pubblici) |
| Autenticazione | `server/auth.js:13` `requireAuth` — token Supabase, `req.user = { id, email }` |
| Ricerca cliente | `server/crm.js:56` `GET /crm/anagrafiche?q=` — già fa ricerca su nominativo, CF, P.IVA, email, comune |
| Anagrafica singola | `server/crm.js:81` |

Nuovo modulo `server/analisiBisogni.js` con due router esportati, come fanno
già `sign.js` e `fonti.js`: uno protetto (operatore), uno pubblico (cliente col
token). Il router pubblico va montato **prima** di quello protetto, come a
`index.js:97-98`.

---

## 2. Cosa si riusa invece di riscriverlo

`server/sign.js` è, di fatto, il pacchetto già implementato una volta: link
pubblico con token, OTP, consensi, documento firmato. Da riusare **così com'è**:

| Funzione | Riga | A cosa serve qui |
|---|---|---|
| `genToken()` | `sign.js:27` | `crypto.randomBytes(18).toString('base64url')` — token opaco, già conforme |
| `genOtp()` | `sign.js:26` | sei cifre da `crypto.randomInt` |
| `sha()` | `sign.js:25` | l'OTP è salvato **solo** come `sha(otp + ':' + token)` (`sign.js:155`), mai in chiaro: il requisito è già soddisfatto dal metodo esistente |
| `sendEmail()` / `sendSms()` | `sign.js:61` / `sign.js:76` | Brevo; l'SMS è spento se `BREVO_SMS_ENABLED` non è `true` |
| `shell(title, body)` | `sign.js:94` | veste grafica delle email, con disclaimer privacy |
| `sbGet/sbPatch` | `sign.js:35-50` | REST Supabase con service role — è così che il cliente non loggato scrive senza toccare Supabase dal browser |
| `uploadDoc()` | `sign.js:316` | carica su Storage bucket `documenti` e torna l'URL — è già l'archiviazione dei PDF |
| `getCollaboratore()` | `sign.js:402` | l'intermediario della pratica, con RUI, per la scheda d'agenzia |
| `anagCliente()` | `sign.js:305` | normalizza l'anagrafica in dati stampabili |

Lo schema di scadenza e tentativi è a `sign.js:239` e `sign.js:242-246`:
`410` a codice scaduto, `401` con contatore a codice errato. Da ricalcare.

**`OTP_TTL_MIN`** (`sign.js:20`) vale 5 minuti: è già la configurazione in
produzione, non va cambiata per questa funzione.

---

## 3. Rischi trovati leggendo, non ipotizzati

1. **Playwright non c'è nel motore.** `08-REPORT-PDF.md` §4 dice «Il backend
   dispone già di Playwright» e la fase E ci costruisce sopra. Non è così:
   Playwright è nei dieci `scraper/*/package.json`, **non** in `server/`, e in
   tutto `server/` non esiste un solo `import` di playwright. È l'unico punto
   in cui il pacchetto descrive un sistema diverso da quello vero. Renderizzare i
   PDF lato motore vuol dire aggiungere una dipendenza pesante (con Chromium)
   al processo che serve anche posta, firme e pagamenti. `sign.js` oggi risolve
   lo stesso problema **senza** Playwright: genera HTML stampabile
   (`genPrivacyDocHtml` a `sign.js:328`, `genMupDocHtml` a `sign.js:419`) con
   `@media print` e un pulsante «Scarica / Stampa PDF». Prima di introdurre
   Chromium nel motore, serve una decisione esplicita.

2. **Il motore in produzione gira da un altro ramo.** La VPS
   `api.withusassicurazioni.it` esegue `claude/vibrant-tesla-o0glfd`. Una rotta
   nuova su questo ramo **non arriva in produzione**: il pacchetto lo sa
   («backend pubblicato anche sul ramo VPS finché i rami non saranno
   unificati») ed è la voce «chiarimento su entrambi i rami» fra i risultati
   attesi. Va pubblicato due volte, e la pubblicazione sulla VPS non è
   raggiungibile da qui.

3. **Le anagrafiche non sono in IAM.** In `withus-one.js:272` la voce
   «Anagrafiche» apre il preventivatore (`Q('anagrafiche')`): il registro
   clienti vive in QUOTO su `quote_anagrafiche`. La console in IAM deve quindi
   cercare i clienti **attraverso il motore** (`/crm/anagrafiche?q=`), non
   leggendo Supabase direttamente — il che tra l'altro è già la strada giusta.

4. **`analisi-bisogni.html` è pubblico davvero.** GitHub Pages serve tutta la
   radice: il file sarà raggiungibile da chiunque, con o senza token. Ogni
   controllo sta nel motore; la pagina non deve contenere nulla che non possa
   essere letto da un estraneo. Per lo stesso motivo la risposta a token
   sconosciuto e a token revocato dev'essere **identica**, altrimenti dice se
   un cliente esiste.

5. **`.replace()` su `index.html`.** Vietata dal prompt master, e a ragione:
   in questa sessione una collisione di nomi di classe (`oggi`, usata sia dal
   diario sia dalla scrivania) è costata tre giri. Il prefisso `#panel-analisi`
   su ogni selettore e `ab-` su ogni classe non è pignoleria.

---

## 4. Strategia di prova

Banco esistente: 20 suite in `verifica/`, lanciate da `controlla-tutto.mjs`;
`ritaglia()` in `verifica/banco.mjs` estrae il corpo di una funzione da
`index.html`. Regola di casa: **ogni prova nuova deve fallire sul codice
precedente**, e non si pubblica mai con una suite rossa.

Suite nuove previste:

- `verifica/analisi-bisogni.test.mjs` — la scheda esiste, la voce di menu c'è,
  il titolo è in `TITOLI` (non in `TITOLI_QUOTO`), i token stanno dentro
  `#panel-analisi`, nessun dato d'esempio del prototipo è finito nel codice.
- `verifica/analisi-pagina-pubblica.test.mjs` — `analisi-bisogni.html` non
  contiene chiavi Supabase, non importa la scocca, non mette dati personali in
  URL, e con token assente mostra un errore in italiano.
- lato motore, accanto a `server/fontiLoginGuidato.test.mjs`: token solo come
  hash, scadenza, revoca, rate limit, e risposta indistinguibile fra token
  inesistente e revocato.

Il contenuto vero di queste prove dipende da `09-PIANO-TEST.md` e
`10-CRITERI-ACCETTAZIONE.md`, che sono fra i file mancanti.

---

## 5. Vincoli del pacchetto e una contraddizione da sciogliere

Il pacchetto vieta il `push` su `main`. In questa sessione l'utente ha invece
chiesto di pubblicare su `main`, perché è da lì che GitHub Pages serve le due
app. Per questo documento la questione non si pone — sta sul ramo di lavoro
`claude/with-us-ecosystem-definition-ym6xfl` — ma **prima di pubblicare la
funzione va deciso quale delle due regole vale**.

Gli altri vincoli sono compatibili con quanto sopra e vanno rispettati:
niente modifiche a QUOTO fuori da `server/`, al quotatore, alle `aw*`, agli
scraper o al ponte IAM/QUOTO; niente modifiche a login, segreti o ruoli;
nessun framework nuovo; SQL idempotente scritto ma **non eseguito**; RLS su
ogni tabella nuova; nessun invio reale senza un gesto esplicito.
