# Privacy, OTP e link pubblico

## 1. Testo privacy

Il prototipo contiene solo un segnaposto. Prima del rilascio:

- inserire il testo approvato dall'agenzia;
- assegnare una versione immutabile;
- salvare la versione accettata;
- distinguere finalità necessarie e marketing;
- non pre-selezionare il marketing.

Questo pacchetto non sostituisce una verifica legale o privacy.

## 2. Consensi separati

### Privacy necessaria

Obbligatoria per completare e firmare l'analisi.

### Marketing

Facoltativo, separato, non condiziona il servizio e non può essere inglobato nella firma necessaria.

## 3. Firma OTP

Riutilizzare il metodo OTP già presente nel sistema.

Registrare almeno:

- ID pratica;
- ID/riferimento challenge OTP;
- recapito mascherato;
- data/ora invio;
- data/ora verifica;
- esito;
- versione informativa;
- modalità cliente/agenzia;
- attore che ha avviato l'invio;
- dati tecnici minimi previsti dal metodo esistente.

Non salvare:

- codice OTP in chiaro;
- segreti del provider;
- recapito completo nei log applicativi.

## 4. Sicurezza OTP

- scadenza e numero tentativi: riusare la configurazione esistente;
- cooldown tra invii;
- rate limit per token, analisi e recapito;
- invalidare challenge precedente quando previsto;
- messaggi non enumerabili;
- non dichiarare "firma acquisita" senza verifica positiva del provider.

## 5. Link pubblico

Requisiti:

- token casuale e opaco;
- hash nel database;
- scadenza;
- revoca;
- nessuna PII nell'URL;
- nessun ID cliente esposto;
- accesso limitato alla sola analisi;
- blocco dopo firma;
- risposta uniforme per token inesistente, revocato o non autorizzato quando utile contro enumerazione.

## 6. Condivisione

### WhatsApp

Aprire una bozza precompilata. L'operatore preme personalmente invio.

### Email

Preferire il sistema `posta_bozze` se adatto. In alternativa aprire una bozza nel client. Nessun invio diretto.

Il messaggio non deve contenere dettagli dei bisogni o dati sensibili.

## 7. Pagina pubblica

- non mostrare menu interni;
- non caricare altri dati cliente;
- non usare cache pubblica per risposte personali;
- impostare header di sicurezza dal backend dove possibile;
- non inviare dati a analytics esterni;
- non usare font o script esterni se impediscono il funzionamento offline o introducono tracciamento.

## 8. Audit

Eventi da registrare:

- invito creato;
- bozza di messaggio preparata;
- link aperto;
- bozza salvata;
- OTP richiesto;
- OTP verificato o fallito;
- analisi completata;
- report generato;
- invito revocato/scaduto.

Non inserire le risposte complete nell'audit: l'audit descrive l'evento, la pratica conserva i dati.
