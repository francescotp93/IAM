# Piano di test

## 1. Regola del progetto

Ogni prova nuova deve fallire sul codice precedente e passare dopo l'implementazione.

## 2. Unit test rating

Scenari minimi:

1. figli + dipendenza totale + mutuo + coperture confermate senza TCM -> famiglia rosso;
2. stesso scenario con TCM -> famiglia blu da verificare;
3. mutuo senza polizza casa -> casa rosso;
4. mutuo con polizza casa -> casa blu;
5. assenza confermata di salute/infortuni -> salute rosso;
6. polizza salute presente -> salute blu;
7. risposte mancanti -> grigio, non verde;
8. interesse pensione -> previdenza aumenta;
9. impresa -> responsabilità aumenta;
10. indice complessivo 50/30/20;
11. output deterministico;
12. versione regole presente.

Modulo di riferimento e test sono in `reference/`.

## 3. Test API interne

- utente non autenticato rifiutato;
- ruolo senza visibilità cliente rifiutato;
- ricerca non espone dati oltre il necessario;
- creazione analisi;
- salvataggio bozza con concorrenza;
- transizioni di stato valide e invalide;
- revoca invito;
- generazione report idempotente;
- audit generato.

## 4. Test API pubbliche

- token valido;
- token inesistente;
- token scaduto;
- token revocato;
- token completato;
- token alterato;
- rate limit;
- nessuna enumerazione;
- nessun accesso ad altre analisi;
- nessuna PII nell'URL o nell'errore.

## 5. Test OTP

Tutto con provider finto:

- invio esplicito;
- cooldown;
- codice corretto;
- codice errato;
- scadenza;
- tentativi massimi;
- nessun codice nei log;
- firma non dichiarata prima della verifica;
- versione privacy salvata.

## 6. Test UI IAM

- ricerca cliente;
- nessun doppione;
- nuovo lead solo con gesto esplicito;
- avvio agenzia;
- link disabilitato senza cliente;
- revoca;
- stato invito;
- visualizzazione report;
- responsive.

## 7. Test UI pubblica

- caricamento senza shell;
- token mancante;
- ripresa bozza;
- selezione multipla;
- campo libero;
- privacy obbligatoria;
- marketing facoltativo;
- OTP;
- completamento;
- blocco modifiche dopo firma;
- accessibilità da tastiera;
- smartphone.

## 8. Test PDF

- dati reali dello snapshot;
- due documenti differenti;
- report ID e versioni presenti;
- motivazioni presenti;
- nessuna PII nel nome file oltre al nominativo previsto;
- testo non tagliato;
- nessuna pagina vuota;
- hash salvato;
- stesso snapshot produce stesso contenuto logico;
- render automatico e ispezione visiva.

## 9. Test regressione

Eseguire:

```bash
cd agente-sospesi
node controlla-tutto.mjs
```

E tutte le suite backend pertinenti del repository QUOTO.

## 10. Test di sicurezza

- token non memorizzato in chiaro;
- RLS attiva;
- browser pubblico senza chiavi privilegiate;
- CSP e CORS verificati;
- nessun segreto nel repository;
- log senza risposte complete, OTP o recapiti completi;
- report interno non accessibile al cliente.
