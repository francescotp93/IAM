# Pacchetto di integrazione - Analisi dei bisogni With Us

Versione pacchetto: **1.0.0**  
Data: **4 agosto 2026**

Questo pacchetto serve a Claude Code per integrare nel sistema With Us il prodotto **Analisi dei bisogni**, mantenendo intatti IAM, QUOTO e gli scraper.

## Obiettivo

Aggiungere a IAM uno strumento marketing-consulenziale che permetta di:

1. cercare un cliente già presente nel portafoglio;
2. compilare l'analisi insieme al cliente in agenzia;
3. generare un link sicuro per la compilazione autonoma da casa;
4. raccogliere privacy e firma OTP riutilizzando il metodo già presente;
5. calcolare un indicatore motivato delle necessità;
6. produrre un report premium per il cliente e una scheda interna per l'agenzia;
7. archiviare risposte, regole, consenso e documenti in modo tracciabile.

## Dove va integrato

### Repository IAM - `francescotp93/Agente-sospesi`

- voce iniziale consigliata: **Strumenti > Marketing > Analisi dei bisogni**;
- console interna per ricerca cliente, avvio in agenzia e generazione link;
- pagina pubblica separata consigliata: `analisi-bisogni.html?t=<token>`;
- collegamento al cliente e alla sua cronologia;
- visualizzazione dei risultati e download dei report.

La pagina pubblica separata evita di esporre la scocca interna e funziona correttamente su GitHub Pages. Non usare un percorso dinamico come `/analisi-bisogni/<token>` senza aver prima verificato il comportamento di GitHub Pages.

### Repository QUOTO - `francescotp93/QUOTE`

Toccare **solo** il backend `server/` per:

- API dell'analisi;
- generazione e verifica dei token;
- salvataggio;
- integrazione con il metodo OTP esistente;
- generazione e archiviazione PDF.

**Non modificare il quotatore, le funzioni `aw*`, gli scraper o il ponte IAM/QUOTO.**

### Supabase condiviso

Creare script SQL idempotenti in `supabase/`, ma **non eseguirli automaticamente**. Tutte le nuove tabelle devono avere RLS attiva. Il browser non deve scrivere direttamente le sessioni pubbliche: deve passare dal backend.

## Ordine di lettura

1. `01-PROMPT-MASTER-CLAUDE-CODE.md`
2. `02-SPEC-FUNZIONALE.md`
3. `03-ARCHITETTURA-E-FLUSSI.md`
4. `04-MODELLO-DATI.md`
5. `05-API-CONTRATTI.md`
6. `06-MOTORE-RATING.md`
7. `07-PRIVACY-OTP-LINK.md`
8. `08-REPORT-PDF.md`
9. `09-PIANO-TEST.md`
10. `10-CRITERI-ACCETTAZIONE.md`
11. `11-PIANO-RILASCIO.md`

## Materiale visivo

- `assets/withus-analisi-bisogni-premium-v4.html`: prototipo interattivo e riferimento UX/UI;
- `assets/withus-report-cliente-premium.pdf`: risultato grafico cliente;
- `assets/withus-report-agenzia-premium.pdf`: risultato grafico interno;
- `reference/pdf-visual-source-reportlab.py`: sorgente che riproduce i PDF campione; è un riferimento grafico, non impone Python in produzione.

## Regole non negoziabili

- commit di checkpoint prima delle modifiche;
- niente `push` su `main`;
- prove nuove rosse sul codice precedente e verdi dopo;
- niente invii esterni automatici;
- niente dati personali nel link pubblico;
- OTP non salvato in chiaro;
- testo privacy sostituito con versione approvata;
- rating spiegabile e versionato;
- PDF archiviato come fotografia immutabile della valutazione effettuata;
- backend pubblicato anche sul ramo VPS finché i rami non saranno unificati.

## Cosa deve fare Claude Code per prima cosa

Non deve copiare il prototipo dentro `index.html` alla cieca. Deve prima leggere il codice reale, trovare ricerca clienti, ruoli, OTP, documenti, audit e router esistenti, quindi proporre un piano per file e numero di riga.

## Contesto incluso

La cartella `context/` contiene una copia dei documenti di ecosistema caricati, così il pacchetto può essere consegnato a Claude Code senza dipendere da questa conversazione.
