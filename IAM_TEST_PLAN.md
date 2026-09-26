# IAM — Piano delle prove

> **25/09/2026.** Che cosa dev'essere vero perché IAM si possa dire
> funzionante. Non è un elenco di buoni propositi: ogni riga o è già una
> prova che gira, o è una prova da scrivere, e si vede quale delle due.

---

## 1. La regola di casa sulle prove

Queste tre cose valgono più di qualunque elenco, e sono costate care.

**Ogni prova nuova va controprovata.** Si sabota la cosa che protegge e
si guarda che diventi rossa. Una prova che resta verde col guasto dentro
non è una prova: è una frase. In una sola giornata ne sono state trovate
deboli otto — una guardava tre riquadri insieme e ne bastava uno giusto;
una cercava il nome di una funzione e lo trovava nella sua stessa
definizione; una accettava «IT» come «due lettere».

**«0 superate, 0 fallite» non è verde, è muto.** Nove suite su 68
uscivano così e sembravano a posto: non partivano affatto. Si guarda il
codice di uscita, non i simboli.

**Le prove che usano valori inventati non vedono i valori veri.** La
contabilità aveva 31 prove verdi con `'Contante'` e `'Pos'` scritti a
mano, mentre il database scrive `carta_credito` e `altro`: il motore non
li riconosceva, e sul 23/09 erano 2 mezzi su 5. Dove esiste un elenco di
valori veri, la prova lo copia da lì — non dalla memoria.

---

## 2. Quello che gira oggi

**74 suite in `server/verifica/`, 1.254 prove superate, 2 suite rosse**
(le `parita-*`, senza ancoraggio: P2.4). All'inizio dell'audit erano 68
suite, 961 prove e 16 rosse.

```
node server/verifica/tutte.mjs             # tutte, col conto e le rosse in fondo
node server/verifica/tutte.mjs crm conta   # solo quelle col nome che contiene «crm» o «conta»
node server/verifica/<nome>.test.mjs       # una suite
```

Il ciclo `for f in server/verifica/*.test.mjs; do node "$f"; done` funziona
ancora, ma non conta niente e non dice quali sono rosse. Il numero va
chiesto a `tutte.mjs`, che usa **una** regola per tutte le suite: a
contarle a mano con `grep` venivano 403 o 885 sullo stesso codice, perché
metà delle suite non stampa una riga per prova.

Le suite trasversali, che proteggono il progetto invece di un modulo:

| suite | che cosa impedisce |
|---|---|
| `colonne-che-esistono` | che il codice chieda al database colonne che non ci sono |
| `versione-motori` | che il browser serva un motore vecchio con la pagina nuova |
| `nomi-doppi` | che due funzioni con lo stesso nome si sostituiscano a vicenda (una volta il tasto «Annulla» dell'anteprima stava per diventare quello che cancella il portafoglio) |
| `pagine-dalla-scocca` | che una pagina resti irraggiungibile |
| `fonti-vive` | che una fonte esterna smetta di rispondere senza che nessuno lo noti |

**Le 16 rosse, per causa:**

| causa | quante | che fare |
|---|:--:|---|
| manca `express` (dipendenze non dichiarate) | 9 | **P0**, § 4 |
| riferimento storico perduto (`parita-*`) | 2 | **P2**: riancorare o ritirare |
| difetto vero trovato (`colonne-che-esistono`) | 1 | **P1**: correggere il codice |
| dati mancanti (`tracciabilita`) | 1 | **P1** |
| da triare (`esiti`, `otp-dalla-posta`, `vigilanza-codice-dalla-posta`) | 3 | **P1**: capire se serve una credenziale o è rotto |

---

## 3. Che cosa manca, modulo per modulo

Le prove da scrivere. Priorità come in `IAM_BACKLOG.md`.

### Clienti
- [ ] creazione con codice fiscale valido, e rifiuto di uno non valido
- [ ] ricerca per cognome, codice fiscale, numero di polizza
- [ ] **la scheda mostra le polizze di TUTTE le compagnie** (è il cuore della vista unificata)
- [ ] un cliente doppio non nasce due volte dallo stesso flusso
- [ ] i consensi si registrano e si rileggono

### Polizze
- [ ] inserimento a mano completo, e riletta il giorno dopo
- [ ] modifica di premio e scadenza, con traccia di chi l'ha fatta
- [ ] rinnovo: che cosa succede alla vecchia e alla nuova
- [ ] annullamento: la polizza sparisce dalla produzione ma resta in archivio
- [ ] una polizza senza cliente non entra

### Portafoglio multi-compagnia
- [ ] **una polizza Prima e una HDI sullo stesso cliente**: una riga sola
- [ ] i numeri di polizza non collidono fra compagnie
- [ ] l'assegnazione all'intermediario regge su entrambe

### Scadenze
- [ ] le finestre 7 / 30 / 60 / 90 giorni contano le stesse polizze che si vedono a schermo
- [ ] «rinnovate» e «non rinnovate» distinguono davvero
- [ ] una polizza annullata non compare fra le scadenze

### Contabilità *(la più delicata — vedi le regole R1–R8 in `IAM_MASTER_SPEC.md`)*
- [x] stato di pagamento dal movimento e non dall'etichetta — `pagamento-rata` 19/19, 17 sabotaggi
- [x] la correzione a mano non viene smentita dal flusso — provata anche sulla tabella finta
- [x] i mezzi di pagamento veri del database si riconoscono — `contabilita-giornaliera` 39/39
- [x] la spesa senza mezzo non si toglie dal contante — R6
- [ ] **la schermata** per correggere il pagamento: il tasto salva, e il flusso dopo non lo riporta indietro
- [ ] cassa del giorno: 100 contanti − 30 spesa = 70, **a schermo**, non solo nel motore
- [ ] un sospeso incassato entra in cassa senza essere ricontato negli incassi
- [ ] quadratura: dichiarato e ricostruito, e il semaforo quando non c'è niente da confrontare

### Intermediari
- [ ] i 6 codici produttore HDI abbinati: ogni polizza ha un intestatario
- [ ] la produzione di un collaboratore somma le stesse polizze che la sua scheda elenca
- [ ] documenti mancanti: l'elenco è quello vero

### Documentazione
- [ ] presente / mancante / scaduto su una pratica vera
- [ ] una pratica incompleta si vede senza aprirla

### CRM e segmentazione
- [ ] **il filtro per gruppo restituisce i clienti del gruppo** — oggi ne restituisce zero, difetto confermato
- [ ] «auto senza casa» su dati veri: il conto torna contandoli a mano
- [ ] «HDI con RCA senza infortuni»
- [ ] «scadenza entro 30 giorni» coincide con lo scadenzario
- [ ] fascia d'età, comune, provincia, premio, intermediario
- [ ] **un segmento vuoto si dichiara vuoto**, non «nessun filtro applicato»

---

## 4. Prove da utente vero (end-to-end)

Oggi **non esistono**, ed è il buco più grande del piano. C'è
`ui-test.mjs` (11.634 righe) e Playwright installato: la base c'è.

Prima però serve il **P0 sulle dipendenze**: senza `package.json`
completo non si può nemmeno garantire che l'ambiente di prova si monti
due volte uguale.

I tre percorsi da coprire per primi, perché sono quelli che l'agenzia fa
ogni giorno:

1. **Entro, cerco un cliente, apro la sua scheda, vedo tutte le sue polizze.**
2. **Carico un flusso di compagnia, guardo l'anteprima, confermo, e ritrovo i numeri in archivio.**
3. **Chiudo la giornata di cassa e il totale torna.**

E per ciascuno, anche il percorso storto: campi mancanti, dati sbagliati,
duplicati, record inesistenti, database vuoto, operazione ripetuta due
volte.

---

## 5. Prima di ogni pubblicazione

Il cancello, in ordine:

1. Le suite toccate sono verdi — **guardando il codice di uscita**.
2. Ogni prova nuova è controprovata (sabota → rosso).
3. `index.html` e `iam/index.html` compilano tutti i blocchi `<script>`.
4. `versione-motori` verde: nessun `?v=` indietro.
5. `nomi-doppi` verde.
6. `colonne-che-esistono` verde.
7. Il diff riletto come se dovesse bocciarlo.
8. Se ci sono di mezzo dei soldi: confronto con una fonte esterna.
9. Se qualcosa cancella: revisori indipendenti prima di applicare.
