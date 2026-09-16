# Architettura e flussi

## 1. Principio

IAM rimane la scocca operativa. QUOTO non viene modificato. Il backend Express esistente espone le API del nuovo prodotto e usa il Supabase condiviso.

```text
Operatore IAM
   |
   +-- Console interna in IAM
   |      |-- ricerca cliente esistente
   |      |-- avvio in agenzia
   |      +-- generazione invito
   |
   +---------------------------> API Express
                                  |-- autorizzazione interna
                                  |-- token pubblico
                                  |-- rating autorevole
                                  |-- OTP esistente
                                  |-- audit
                                  |-- PDF
                                  +-- Supabase condiviso

Cliente da casa
   |
   +-- analisi-bisogni.html?t=<token opaco>
           |
           +---------------------> API pubbliche limitate
```

## 2. Frontend IAM interno

Integrazione iniziale consigliata:

- nuova voce sotto `Strumenti`;
- nuova schermata nell'`index.html` IAM, seguendo il modello delle schermate esistenti;
- route nel router già presente in `withus-one.js`;
- token e colori grafici già esistenti;
- nessuna dipendenza da framework.

Funzioni:

- ricerca cliente;
- analisi recenti;
- stato inviti;
- avvio assistito;
- generazione/revoca link;
- apertura risultato;
- download report.

## 3. Pagina pubblica

File consigliato: `analisi-bisogni.html` nel repository IAM.

URL:

```text
https://iam.withusassicurazioni.it/analisi-bisogni.html?t=<token>
```

Motivi:

- compatibile con GitHub Pages;
- nessuna route server-side necessaria;
- niente shell o menu interni;
- più semplice da proteggere e collaudare;
- il token non contiene PII.

La pagina deve essere autonoma, responsive e caricarsi anche senza dati prima che il token sia validato.

## 4. Backend

Moduli consigliati:

```text
server/analisiBisogni.js            orchestrazione e servizi
server/analisiBisogniRotte.js       router Express
server/analisiBisogniRating.js      motore puro e versionato
server/analisiBisogniInviti.js      token, scadenze, revoche
server/analisiBisogniPdf.js         report cliente/agenzia
server/verifica/analisi-bisogni/    test
```

Claude deve adattare i nomi alle convenzioni reali del backend.

## 5. Token pubblico

- generato dal backend con CSPRNG;
- almeno 128 bit di entropia;
- URL contiene il token in chiaro solo per il trasporto;
- database conserva soltanto `sha256(token)`;
- scadenza configurabile;
- revoca immediata;
- tentativi limitati;
- dopo completamento il token diventa non modificabile;
- il cliente può riprendere una bozza fino a scadenza, se questa è la scelta di prodotto;
- nessuna PII nell'URL o nei messaggi d'errore.

## 6. State machine

```text
bozza
  +-- avvio interno ----------------> in_compilazione
  |                                     |
  |                                     +--> completata --> firmata
  |
  +-- crea invito --> invito_creato --> inviata --> aperta
                                                --> in_compilazione
                                                --> completata --> firmata

Qualsiasi stato aperto --> revocata / scaduta / annullata
```

Le transizioni illegittime devono restituire un errore orientato all'azione.

## 7. Rating

Il browser può calcolare un'anteprima per UX, ma il backend ricalcola sempre il rating prima di salvare o generare il PDF. Il risultato server-side è quello archiviato.

## 8. PDF

Architettura consigliata:

1. creare uno snapshot JSON immutabile;
2. renderizzare un template HTML/CSS senza risorse esterne;
3. usare Playwright già presente nel backend per `page.pdf()`;
4. calcolare SHA-256 del file;
5. archiviare file e metadati con il metodo documentale già esistente;
6. non rigenerare un report firmato usando regole future.

## 9. Documenti e timeline

Prima di creare una nuova gestione documentale, Claude deve verificare come il sistema usa:

- `quote_documenti`;
- `quote_pratica_documenti`;
- eventuali bucket Supabase;
- `iam_audit`;
- timeline o storico cliente.

Riutilizzare le strutture esistenti quando sono adatte. Se non lo sono, creare le tabelle minime descritte nel modello dati.

## 10. Deploy

- frontend IAM: ramo `main` del repository IAM;
- backend: fino all'unificazione, pubblicare la stessa modifica sia su `main` sia sul ramo VPS `claude/vibrant-tesla-o0glfd`;
- nessun deploy senza suite verdi.
