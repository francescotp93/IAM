# Contratti API proposti

Prefisso consigliato:

```text
/api/analisi-bisogni
```

Claude deve adattarlo alle convenzioni reali del backend.

## 1. API interne autenticate

### Ricerca clienti

```http
GET /api/analisi-bisogni/clienti?q=rossi
```

Risposta minima:

```json
{
  "clienti": [
    {
      "id": "...",
      "nome": "Mario",
      "cognome": "Rossi",
      "codice_fiscale_mascherato": "RSS***501X",
      "email_mascherata": "m***@example.it",
      "telefono_mascherato": "+39 *** 4567"
    }
  ]
}
```

Riutilizzare la ricerca esistente se già disponibile.

### Crea analisi

```http
POST /api/analisi-bisogni
Content-Type: application/json
```

```json
{
  "anagrafica_id": "...",
  "modalita": "agenzia"
}
```

Risposta:

```json
{
  "id": "uuid",
  "stato": "bozza",
  "versione_questionario": "ABQ-1.0.0",
  "versione_regole": "ABR-1.0.0"
}
```

### Leggi analisi

```http
GET /api/analisi-bisogni/:id
```

### Salva bozza

```http
PATCH /api/analisi-bisogni/:id/risposte
```

```json
{
  "risposte": {"...": "..."},
  "versione_locale": 4
}
```

Usare controllo di concorrenza o versione per evitare sovrascritture silenziose.

### Crea invito

```http
POST /api/analisi-bisogni/:id/inviti
```

```json
{
  "scadenza_ore": 72,
  "verifica_iniziale": "token"
}
```

Risposta:

```json
{
  "url": "https://iam.withusassicurazioni.it/analisi-bisogni.html?t=<token>",
  "scade_il": "2026-08-07T16:00:00Z"
}
```

Il token viene restituito solo al momento della creazione; il database ne conserva soltanto l'hash.

### Revoca invito

```http
POST /api/analisi-bisogni/:id/inviti/:invito_id/revoca
```

### Completa analisi

```http
POST /api/analisi-bisogni/:id/completa
```

Il server valida le risposte, calcola il rating e salva lo snapshot.

### Genera report

```http
POST /api/analisi-bisogni/:id/report
```

```json
{"tipi":["cliente","agenzia"]}
```

Risposta:

```json
{
  "documenti": [
    {"tipo":"cliente","id":"...","nome_file":"Analisi-bisogni-Mario-Rossi-AB-....pdf"},
    {"tipo":"agenzia","id":"...","nome_file":"Scheda-interna-Mario-Rossi-AB-....pdf"}
  ]
}
```

## 2. API pubbliche limitate

### Risolvi invito

```http
GET /api/analisi-bisogni/pubblica/sessione
Authorization: Bearer <token>
```

Risposta senza dati eccedenti:

```json
{
  "stato": "in_compilazione",
  "scade_il": "...",
  "cliente": {"nome":"Mario"},
  "risposte": {"...":"..."},
  "versione_questionario": "ABQ-1.0.0",
  "versione_privacy": "PRIV-..."
}
```

Non restituire codice fiscale completo, ID interni o altre pratiche.

### Salva bozza pubblica

```http
PATCH /api/analisi-bisogni/pubblica/risposte
Authorization: Bearer <token>
```

### Invia OTP

```http
POST /api/analisi-bisogni/pubblica/privacy/otp/invia
Authorization: Bearer <token>
```

Il backend usa il recapito già verificato o il metodo previsto dal sistema esistente.

### Verifica OTP

```http
POST /api/analisi-bisogni/pubblica/privacy/otp/verifica
Authorization: Bearer <token>
```

```json
{"codice":"123456"}
```

Non loggare il codice.

### Completa

```http
POST /api/analisi-bisogni/pubblica/completa
Authorization: Bearer <token>
```

Il server ricalcola il rating e blocca la modifica dopo la firma.

### Scarica report cliente

```http
GET /api/analisi-bisogni/pubblica/report/cliente
Authorization: Bearer <token>
```

Disponibile solo dopo completamento e firma, secondo la scelta di prodotto.

## 3. Errori orientati all'azione

Esempi:

```json
{"errore":"Il link è scaduto: chiedi al tuo consulente With Us un nuovo invito."}
```

```json
{"errore":"Il codice OTP non è corretto. Controlla il messaggio ricevuto o richiedine uno nuovo."}
```

```json
{"errore":"Questa analisi è già stata firmata e non può essere modificata. Apri una nuova revisione."}
```

Non restituire stack trace, codici interni o dettagli che aiutino a enumerare clienti e token.

## 4. Idempotenza

- creazione report: evitare duplicati identici;
- invio OTP: rate limit e cooldown;
- completamento: ripetibile senza cambiare snapshot;
- revoca: ripetibile;
- salvataggio bozza: versione o `updated_at` per concorrenza.
