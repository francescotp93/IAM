# Modello dati proposto

Questo è il modello logico. Claude deve verificare tipi, convenzioni, chiavi e funzioni già presenti prima di produrre la migrazione definitiva.

## 1. `iam_analisi_bisogni`

Testata della pratica.

| campo | scopo |
|---|---|
| `id` | UUID pratica |
| `anagrafica_id` | riferimento a `quote_anagrafiche` |
| `stato` | stato della state machine |
| `modalita` | `agenzia` o `link` |
| `operatore_id` | utente che ha creato/gestito la pratica |
| `risposte` | snapshot JSON delle risposte |
| `rating` | snapshot JSON del risultato motivato |
| `indice_complessivo` | 0-100 |
| `bisogno_principale` | chiave categoria |
| `versione_questionario` | versione del percorso |
| `versione_regole` | versione del rating |
| `versione_privacy` | informativa accettata |
| `creata_il`, `aggiornata_il` | audit temporale |
| `completata_il`, `firmata_il` | chiusura percorso |
| `annullata_il` | eventuale annullamento |

## 2. `iam_analisi_bisogni_inviti`

| campo | scopo |
|---|---|
| `id` | UUID invito |
| `analisi_id` | pratica collegata |
| `token_hash` | SHA-256 del token, univoco |
| `scade_il` | scadenza |
| `revocato_il` | revoca |
| `aperto_il` | prima apertura |
| `completato_il` | completamento |
| `ultimo_accesso_il` | attività recente |
| `tentativi_falliti` | difesa da abusi |
| `metadata` | dati tecnici minimizzati |

Non salvare mai il token in chiaro.

## 3. `iam_analisi_bisogni_consensi`

Una riga per ogni consenso.

| campo | scopo |
|---|---|
| `id` | UUID |
| `analisi_id` | pratica |
| `tipo` | `privacy` o `marketing` |
| `versione_testo` | versione dell'informativa |
| `accettato` | booleano |
| `accettato_il` | data/ora |
| `recapito_mascherato` | recapito usato per OTP |
| `otp_riferimento` | ID restituito dal sistema OTP |
| `otp_verificato_il` | data/ora verifica |
| `modalita` | cliente/agenzia |
| `metadata` | esito e informazioni tecniche necessarie |

Non salvare il codice OTP.

## 4. `iam_analisi_bisogni_documenti`

Crearla solo se le tabelle documenti esistenti non sono adatte.

| campo | scopo |
|---|---|
| `id` | UUID |
| `analisi_id` | pratica |
| `tipo` | `cliente` o `agenzia` |
| `percorso_storage` | riferimento al file |
| `sha256` | integrità |
| `snapshot` | dati usati per il report |
| `motore_versione` | versione del template/generatore |
| `generato_il` | data/ora |
| `generato_da` | operatore o sistema |

## 5. `iam_analisi_bisogni_eventi`

Audit append-only.

| campo | scopo |
|---|---|
| `id` | UUID |
| `analisi_id` | pratica |
| `tipo_evento` | creazione, apertura, salvataggio, OTP, report, revoca... |
| `attore_tipo` | operatore, cliente, sistema |
| `attore_id` | riferimento disponibile |
| `dettagli` | JSON privo di segreti |
| `creato_il` | timestamp |

## 6. Indici minimi

- analisi per `anagrafica_id`, `stato`, `operatore_id`, `creata_il`;
- inviti per `token_hash`, `analisi_id`, `scade_il`;
- consensi per `analisi_id`, `tipo`;
- documenti per `analisi_id`, `tipo`;
- eventi per `analisi_id`, `creato_il`.

## 7. RLS e accesso

- RLS attiva su tutte le tabelle;
- pagina pubblica senza accesso diretto a Supabase;
- backend valida token e limita la risposta alla sola pratica associata;
- utenti interni vedono soltanto ciò che il sistema di ruoli già consente;
- nessuna policy generica `authenticated can select all`;
- eventuale service role esclusivamente nel backend e nei secret.

## 8. Retention

Non inventare tempi di conservazione. Rendere la retention configurabile e applicarla solo dopo approvazione privacy/legale.
