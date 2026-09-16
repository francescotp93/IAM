# Report PDF premium

## 1. Due documenti diversi

### Report cliente

Scopo: spiegare in modo chiaro le aree da approfondire.

Struttura grafica campione:

1. copertina;
2. quadro in sintesi e necessità principale;
3. approfondimento delle priorità;
4. aree e prodotti da verificare;
5. prossimi passi, tracciabilità e disclaimer.

### Scheda interna agenzia

Scopo: aiutare il colloquio e documentare il lavoro.

Struttura:

1. sintesi e matrice operativa;
2. evidenze, dati mancanti e azioni;
3. traccia colloquio, privacy e audit.

## 2. Dati dinamici

Ogni PDF deve usare:

- nome cliente;
- data/ora;
- report ID;
- modalità di compilazione;
- operatore quando presente;
- indice complessivo;
- necessità principale;
- rating completo;
- motivazioni;
- coperture dichiarate;
- interessi;
- note libere;
- stato privacy/OTP;
- versione questionario, regole e informativa.

## 3. Snapshot immutabile

Prima della generazione creare uno snapshot JSON. Il PDF, il suo hash e lo snapshot devono rimanere associati.

Non rigenerare lo stesso report firmato usando regole o testi aggiornati. Una revisione successiva produce un nuovo report ID.

## 4. Generazione consigliata

Il backend dispone già di Playwright. Approccio preferito:

1. template HTML/CSS self-contained;
2. dati inseriti server-side con escaping;
3. font locali o di sistema;
4. nessuna risorsa esterna;
5. `page.setContent()`;
6. `page.pdf({format:'A4', printBackground:true, margin: ...})`;
7. controllo del numero pagine;
8. SHA-256;
9. archiviazione.

Il sorgente ReportLab incluso nel pacchetto riproduce il design campione ed è utile come riferimento visivo. Non è obbligatorio usare Python in produzione.

## 5. Nome file

```text
Analisi-bisogni-<Nome-Cognome>-<report-id>.pdf
Scheda-interna-<Nome-Cognome>-<report-id>.pdf
```

Sanitizzare il nome e non esporre il codice fiscale.

## 6. Qualità grafica

- A4;
- palette e token With Us;
- testo leggibile anche stampato in scala di grigi;
- colore mai unico segnale;
- icona + stato + testo;
- nessun testo tagliato;
- margini coerenti;
- pagine numerate;
- intestazione e report ID;
- PDF testato almeno con un renderer automatico.

## 7. Distribuzione

- download cliente dopo le regole di completamento previste;
- download interno solo a utenti autorizzati;
- invio esterno sempre mediante bozza e conferma;
- link documento temporaneo o endpoint autenticato, non URL pubblico permanente.

## 8. Disclaimer

Usare testo approvato. Il report deve chiarire che:

- è una fotografia iniziale;
- non è un preventivo;
- non è automaticamente una raccomandazione personalizzata;
- prodotti presenti devono essere verificati nel contenuto;
- la decisione segue il colloquio e la documentazione contrattuale.
