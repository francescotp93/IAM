# Prompt master da dare a Claude Code

Integra nel sistema With Us il prodotto **Analisi dei bisogni** usando questo pacchetto come specifica funzionale, tecnica e grafica.

## Contesto obbligatorio

Leggi prima:

- `ECOSISTEMA.md`;
- tutti i file del pacchetto `withus-analisi-bisogni-claude-code/`;
- `assets/withus-analisi-bisogni-premium-v4.html`;
- i due PDF campione;
- nel repository IAM: `index.html`, `withus-one.js`, `withus-one.css`, le suite in `verifica/` e `controlla-tutto.mjs`;
- nel repository QUOTO: i moduli del backend `server/`, il metodo OTP esistente, la gestione documenti, audit e rotte;
- gli script SQL già presenti per copiarne stile, idempotenza e convenzioni.

## Obiettivo

Realizza una funzione completa in IAM che permetta di:

1. cercare un cliente esistente;
2. avviare una compilazione assistita in agenzia;
3. generare un invito pubblico sicuro per il cliente da casa;
4. raccogliere risposte, privacy e firma OTP;
5. calcolare un rating motivato e versionato;
6. produrre due PDF: cliente e agenzia;
7. archiviare sessione, consenso, audit e documenti;
8. mostrare stato dell'invito: creato, aperto, in compilazione, completato, firmato, scaduto o revocato.

## Confini

- Non modificare QUOTO, il quotatore auto, le funzioni `aw*`, gli scraper o il bridge IAM/QUOTO.
- Non modificare login, pagamenti, segreti o ruoli globali.
- Non introdurre un nuovo framework frontend.
- Non usare dati dimostrativi in produzione.
- Non eseguire SQL nell'editor Supabase.
- Non inviare email, WhatsApp, SMS o OTP reali senza un gesto esplicito dell'utente.
- Non fare `push` su `main`.

## Metodo di lavoro obbligatorio

### 1. Analisi prima del codice

Fornisci un piano che indichi:

- file da modificare;
- punti di integrazione e numeri di riga;
- funzioni esistenti da riutilizzare;
- eventuali dati o contratti mancanti;
- rischi e dipendenze;
- strategia di test.

### 2. Checkpoint

Crea un commit di checkpoint prima di modificare qualsiasi file.

### 3. Prove rosse prima

Aggiungi le prove nuove e dimostra che falliscono sul codice precedente usando un worktree separato. Solo dopo implementa.

### 4. Implementazione per fasi

**Fase A - UI interna IAM**  
Aggiungi la pagina sotto `Strumenti > Marketing`. Riusa ricerca cliente, ruoli e componenti già esistenti.

**Fase B - Pagina pubblica**  
Aggiungi una pagina statica dedicata, consigliata `analisi-bisogni.html?t=<token>`, senza shell interna e senza dati personali nell'URL.

**Fase C - Backend**  
Aggiungi API, token hash, stati, persistenza, OTP e audit. Il browser pubblico passa sempre dal backend.

**Fase D - Rating**  
Porta il motore in un modulo puro e testabile. Il server è la fonte autorevole; il browser mostra solo un'anteprima.

**Fase E - PDF**  
Genera i report da uno snapshot immutabile dei dati e delle regole. Riusa il design dei PDF campione. Preferenza: HTML/CSS server-side renderizzato con Playwright già presente, senza dipendenze web esterne.

**Fase F - Collaudo**  
Esegui tutte le suite IAM e backend. Nessuna prova rossa può essere pubblicata.

## Requisiti tecnici chiave

- link con token opaco, casuale, memorizzato solo come hash, revocabile e a scadenza;
- nessun nome, email, CF o ID cliente nell'URL;
- risposta pubblica non deve rivelare se un cliente esiste;
- rate limit su token e OTP;
- consenso privacy obbligatorio e marketing separato/facoltativo;
- OTP: riusa il metodo esistente e registra riferimento firma, recapito mascherato, data/ora e versione informativa;
- PDF cliente e PDF interno distinti;
- salvataggio di `versione_questionario`, `versione_regole`, `versione_privacy` e hash del PDF;
- messaggi d'errore in italiano e orientati all'azione;
- nomi e commenti in italiano;
- commenti che spiegano il perché;
- nessuna `.replace()` su stringhe comuni in `index.html`;
- modifiche per numero di riga e verifica dei conteggi;
- RLS attiva su tutte le nuove tabelle;
- nessuna scrittura diretta dal browser pubblico a Supabase.

## Risultato atteso

Al termine consegna:

- elenco file modificati;
- migrazione SQL pronta ma non eseguita;
- test aggiunti e risultato delle suite;
- schermate implementate;
- endpoint aggiunti;
- esempio reale di PDF generato dal codice;
- istruzioni manuali rimaste;
- chiarimento su entrambi i rami da pubblicare per il backend.

Fermati e chiedi conferma solo prima di:

- eseguire lo script SQL;
- inviare comunicazioni reali;
- modificare login, segreti o ruoli;
- fare push o deploy.
