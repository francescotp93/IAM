# IAM — Backlog

> **25/09/2026.** In ordine di priorità, non di comodità. Si lavora P0,
> poi P1, poi P2. Non si apre un P4 o un P5 finché resta un P0 o un P1.
>
> Aggiornare a ogni intervento: una voce si sposta in «fatto» solo quando
> è vera la definizione di fatto di `IAM_MASTER_SPEC.md` § 3 — un utente
> vero ha completato il flusso e il dato si ritrova il giorno dopo.

---

## P0 — blocca tutto il resto

*Nessun P0 aperto.* Il solo che c'era è stato chiuso il 25/09/2026, ed è
qui sotto perché il motivo per cui esisteva va ricordato.

### ~~P0.1 · `package.json` non dichiara nessuna dipendenza~~ — **fatto 25/09/2026**
Il codice importa 12 pacchetti esterni (`express` in 42 punti,
`playwright`, `nodemailer`, `mailparser`, `imapflow`, `jose`, `dotenv`,
`cors`, `@supabase/supabase-js`, `@anthropic-ai/sdk`, `playwright-extra`,
`puppeteer-extra-plugin-stealth`) e ne dichiara **zero**. Non c'è
lockfile. In `node_modules` ci sono solo `playwright` e `playwright-core`,
installati a mano.

**Costo misurato**: 9 suite su 68 non partono; un clone pulito non avvia
il server; nessun ambiente è riproducibile due volte uguale.

**Fatto**: dichiarate tutte e dodici, lockfile sotto controllo versione.
Risultato misurato: **1.111 prove superate contro 961, e 4 suite rosse
contro 16**. Sono tornate verdi anche `esiti`, `otp-dalla-posta` e
`vigilanza-codice-dalla-posta`, che dipendevano da `mailparser` e
`imapflow` — non le avevo nemmeno attribuite a questa causa.

**Una scelta da ricordare**: `express` è rimasto alla **4**, non alla 5.
Installando l'ultima è entrata la 5 e due suite hanno continuato a
fallire (`path-to-regexp` v8 non accetta più `/:azione(start|stop)`).
Nel progetto quella sintassi compare in **una sola** rotta
(`server/fonti.js:672`), ma la 5 cambia anche altro, e con 16 file di
rotte e nessuna prova da utente vero quelle differenze si
scoprirebbero in produzione. Il salto è un lavoro suo → **P4.3**.

---

## P1 — funzioni fondamentali che non funzionano

### ~~P1.1 · Cinque tabelle con RLS accesa e zero politiche~~ — **ritirato: era un falso allarme mio**
L'avevo aperto vedendo lo schema «RLS accesa, zero politiche» su cinque
tabelle. Andando a vedere **chi le usa**, tre sono corrette così:
`ponte_segreti` tiene segreti, `posta_config` le credenziali della posta,
`posta_notifiche` è scritta solo dal server — e quest'ultima è persino
**dichiarata** nel file che l'ha creata.

Aprirle «per correggere il difetto» avrebbe peggiorato la sicurezza.
Uno schema sospetto non è una prova: va verificata l'intenzione.

Restano due cose più piccole, scese a P2.7 e P2.8.

### ~~P1.2 · Il filtro per gruppo del CRM restituisce sempre zero~~ — **fatto 25/09/2026**
Chiedeva `quote_gruppi_membri.cliente_id`; la colonna vera è
`anagrafica_id`. PostgREST non lancia: tornava un errore e `data` nullo,
quindi l'insieme dei membri nasceva vuoto e la ricerca per gruppo non
trovava mai nessuno, in silenzio.

**Fatto**: colonna corretta, e se la lettura fallisce adesso la ricerca
si ferma e lo dice invece di mostrare un numero che non è quello vero.
Due prove nuove — `colonne-che-esistono` copriva solo metà del problema
(che la colonna esista, non che sia la stessa che poi si legge).
Cinque sabotaggi, cinque rossi; il secondo lo prende solo la prova nuova.

### ~~P1.3 · Suite `tracciabilita` rossa~~ — **fatto 26/09/2026**
Era la prova, non il codice. Rossa **dal 17 settembre**: quel giorno è
entrata la regola «ogni analisi parte da un cliente dell'anagrafica» e
il campione non è mai stato aggiornato. Nove giorni di rosso che nessuno
ha guardato — lo stesso schema di `colonne-che-esistono`, che nel
frattempo nascondeva un difetto vero.

Tre prove rimesse in piedi, e due di loro dicevano il contrario di
quello che il codice fa **adesso**, che è meglio: un riferimento storto
viene rifiutato invece che azzerato in silenzio, e il foglio esce come
PDF prima di essere archiviato. Una terza ritagliava un pezzo di file
troppo largo e finiva dentro le funzioni di email e WhatsApp.

### P1.4 · Triare le tre suite rosse rimaste
`esiti` (4 superate, 16 fallite), `otp-dalla-posta` (5/12),
`vigilanza-codice-dalla-posta` (0/5). Se servono credenziali, la suite
deve **dirlo e saltare**, non fallire: una suite che fallisce per
l'ambiente insegna a ignorare il rosso.

### P1.5 · L'85% del portafoglio non ha un intestatario
**3.494 polizze su 4.097** (85,3%), per **1.113.069 € di premio annuo**,
non risalgono a nessun collaboratore. Su 23 codici produttore ne
risultano decisi **due**.

Il 26/09 ho corretto il difetto che rendeva il problema più piccolo di
quanto fosse: l'importazione registrava un codice solo se il flusso
portava anche un nome, e il tracciato HDI il nome non ce l'ha. Sei
codici HDI non arrivavano mai alla schermata dell'abbinamento — non era
una dimenticanza di Francesco, l'app non gliel'ha mai chiesto. Adesso ci
sono tutti.

**Cosa resta, e non è codice**: chi sia ogni codice lo può dire solo
Francesco. La schermata è in IAM (Abbinamento) e nel preventivatore.
Quindici codici Prima coprono da soli 3.470 polizze: deciderne quattro
— U25236, U25274, U25940, U29015 — ne copre 2.667.

**Fatto quando**: le polizze risalgono alla persona giusta, e la
produzione di ogni collaboratore somma quello che ha venduto davvero.

---

## P2 — funzioni presenti ma incomplete

### P2.1 · Nessuna schermata per correggere il pagamento di una rata
La colonna `pagamento_a_mano` esiste, la guardia che la protegge dal
flusso è provata — **ma dall'app non c'è modo di usarla**. La promessa
«sempre con la possibilità di modificare il pagamento» oggi è mantenuta
solo a metà.

### P2.2 · Schermata della contabilità giornaliera
Il motore è pronto e verde (39/39): incassi per mezzo, sospesi
incassati, spese, e il netto del cassetto (100 contanti − 30 spesa = 70).
Il pannello non è mai stato scritto.

**Attenzione prima di scriverlo**: due dei tre blocchi non hanno dati.
`iam_sospesi` è vuota e `iam_movimenti` ha 6 righe senza uscite. Vedi
P2.3.

### P2.3 · Le spese non dicono con che mezzo sono state pagate
Oggi vivono come numero unico in `sessioni_giornaliere.spese` (22 giorni
su 68). Senza il mezzo, la regola R6 non può togliere i 30 € dal
contante — resta una riga «senza mezzo» dichiarata a parte.

**Decisione da prendere con Francesco**: si registra la spesa col mezzo
(e allora serve dove scriverla), oppure la contabilità giornaliera resta
in sola lettura e le spese restano un totale.

### P2.4 · `parita-tariffe` e `parita-catastrofali` senza riferimento
Confrontano il calcolo di oggi con una versione storica che **non esiste
più nei commit** («nessun commit contiene più `const TL_MYDRIVE`»). O si
riancorano a una fotografia salvata nel repository, o si ritirano
dicendolo. Lasciarle rosse è peggio di toglierle: insegna a ignorare il
rosso.

### P2.5 · Tabelle costruite e mai usate
`iam_lead`, `iam_agenda`, `quote_segmenti`, `quote_sinistri`,
`iam_firme`, `iam_formazione`, `quote_rinnovi`, `iam_incassi*`,
`iam_crediti_*`, `iam_provvigioni_*`, `iam_gruppi*`, `iam_pagamenti`,
`prima_preventivi`: **tutte a zero righe**.

Per ciascuna una domanda sola: si completa o si toglie? Un gestionale
pieno di schermate che nessuno usa è peggio di uno con meno schermate.

### P2.7 · `iam_trattative_backup` è orfana
Una riga dentro, e **nessun file del progetto la nomina**. O è il residuo
di una migrazione delle trattative, o serviva a qualcosa che non esiste
più. Da capire e togliere: una tabella che nessuno nomina è un posto dove
i dati vanno a morire senza che nessuno se ne accorga.

### P2.8 · `quote_progetti_previdenziali`: punto cieco per le guardie
Zero righe, RLS accesa e nessuna politica, e la nomina solo la bozza non
applicata dell'«annulla importazione». Lì una guardia `not exists` è
**sempre vera** mentre la cascata cancella davvero. Non è un problema
oggi (la funzione non è applicata), lo diventa quando si rifà: va
risolto **insieme** a P2.6, non prima e non dopo.

### P2.6 · «Annulla importazione»
Bozza **non applicata** in `supabase/bozze/`, con 3 blocchi e 8 gravi
trovati da revisori indipendenti — fra cui uno che cancellerebbe in
silenzio rate già incassate. **Non eseguire.** Da rifare da capo con le
indicazioni scritte nell'intestazione del file.

---

## P3 — problemi di uso

- **P3.1** Nessun router unico: ogni famiglia di pannelli ha il suo
  commutatore. Nessuna pagina ha un indirizzo proprio, quindi non si può
  mandare un collegamento a una schermata.
- **P3.4 · 5.037 stili scritti in linea** (2.376 nel quotatore, 2.661 in IAM)
  e 336 larghezze fisse in pixel. Sono la vera causa di come si vede
  l'app: lo stesso riquadro è scritto in venti modi diversi, e su uno
  schermo stretto le larghezze fisse spingono la pagina di lato.
  **Non si toccano alla cieca**: servono prima le prove da utente vero
  (P4.1), altrimenti si cambia l'aspetto di 60.000 righe senza poter
  guardare che cosa si è rotto.
- **P3.2** Due file da 33.000 e 27.000 righe. Non si riscrivono: si
  continua a estrarre le regole nei motori, come si sta già facendo.
- **P3.3** Trenta documenti markdown nella radice, scritti in momenti
  diversi e in parte superati. Questi cinque li sostituiscono: gli altri
  vanno rivisti o archiviati.

---

## P4 — miglioramenti

- **P4.1** Prove da utente vero (Playwright) sui tre percorsi
  quotidiani. Dipende da P0.1.
- **P4.2** Un indice sul portafoglio per le domande di segmentazione,
  quando saranno lente (oggi 4.097 polizze non lo sono).
- **P4.3 · Salto a Express 5.** Oggi siamo pinnati alla 4. La 5 rompe la
  sintassi delle rotte (`/:azione(start|stop)`) in **un solo** punto,
  `server/fonti.js:672`, ma cambia anche altro. Da fare con le sue prove,
  dopo P4.1, non prima.

---

## P5 — funzioni nuove (non prima che P0 e P1 siano chiusi)

- ~~**P5.1 · Prima Assicurazioni nel portafoglio.**~~ **Era già fatto, e
  l'avevo scritto al contrario.** Prima è il **99,4% del portafoglio**:
  4.073 polizze su 4.097, 2.477 clienti, dal maggio 2024. Avevo guardato
  la tabella `prima_preventivi` (vuota, serve all'estensione dei
  preventivi) invece della colonna `compagnia` delle polizze. Una
  tabella vuota non dimostra che una funzione non c'è: dimostra che
  quella tabella è vuota.
- **P5.2** Segmenti **salvabili e riusabili**: i filtri adesso ci sono
  tutti, ma ogni ricerca va ricomposta a mano. `quote_segmenti` è pronta
  e vuota — è il passo che trasforma una ricerca in una campagna
  ripetibile.
- **P5.3** Campagne commerciali a partire dai segmenti.
- **P5.4** WhatsApp, email automatiche, scoring, suggerimenti, altre
  compagnie.

---

## Fatto di recente

| quando | che cosa |
|---|---|
| 25/09/2026 | **Stato di pagamento dai flussi**: incassato/sospeso/da incassare deciso dal movimento della compagnia e non dall'etichetta; l'importazione aggiorna le rate già in archivio ma non tocca mai una correzione a mano. Verificato sul file vero (12 rate, 3.217,39 €) |
| 25/09/2026 | **Le polizze HDI** dicevano tutte «non pagato» con 12 rate incassate |
| 26/09/2026 | **`tracciabilita` torna verde**: era rossa dal 17/09 per un campione mai aggiornato. Restano 2 suite rosse su 71, e nessuna per un difetto dell'app |
| 26/09/2026 | **I codici produttore nudi**: l'importazione li scartava se il flusso non portava un nome, e il tracciato HDI il nome non ce l'ha. Sei codici non arrivavano mai alla schermata che li decide |
| 26/09/2026 | **Il vocabolario delle compagnie e dei rami**: `rca` e `auto` erano due rami diversi, «HDI» e «HDI Assicurazioni» due compagnie. «Polizza auto» trovava 15 polizze invece di 4.005 |
| 26/09/2026 | **La ricerca per garanzia** («auto senza infortuni del conducente») e il filtro «ha note in anagrafica» |
| 25/09/2026 | **Le ricerche sul portafoglio**: l'assenza («auto senza casa»), compagnia, provincia, scadenza e premio. Le otto domande del mandato ora rispondono tutte |
| 25/09/2026 | **I tasti**: una prova controlla che tutti e 2.108 i gestori chiamino qualcosa che esiste. Nessun tasto morto |
| 25/09/2026 | **Lo zoom con le dita** era bloccato in IAM; i campi vanno a 16px dove si tocca, così iOS non ingrandisce da solo |
| 25/09/2026 | **P0 · le dipendenze**: da 961 a 1.111 prove superate, da 16 a 4 suite rosse |
| 25/09/2026 | **P1 · il filtro per gruppo del CRM** restituiva sempre zero clienti, in silenzio |
| 25/09/2026 | **I mezzi di pagamento veri** (`carta_credito`, `altro`, `pos_bianco`, `pos_nero`) non erano riconosciuti: sul 23/09 erano 2 su 5 |
| 24–25/09/2026 | Importazione HDI PASS-133 completa e verificata sul file vero |
