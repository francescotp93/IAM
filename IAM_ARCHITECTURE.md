# IAM — Architettura

> Fotografia del **25/09/2026**, ricavata misurando il repository e il
> database, non dalla memoria né dai documenti preesistenti. Ogni numero
> qui dentro è stato contato; dove non ho potuto contare, è scritto
> «da verificare».

---

## 1. Il fatto che conta più di ogni altro

**Quello che oggi chiamiamo «IAM» sono DUE applicazioni separate che
condividono un solo database.**

| | `index.html` (QUOTO) | `iam/index.html` (IAM) |
|---|---|---|
| righe | 33.010 | 27.037 |
| pubblicata su | `quoto.withusassicurazioni.it` | `.../iam/` |
| schermate | 51 | 63 pannelli |

E la ripartizione non è quella che ci si aspetta:

**Sta in QUOTO** (non in IAM): anagrafiche, portafoglio, titoli,
scadenzario, sinistri, CRM·Analisi, campagne, foglio cassa, importazione
flussi, emissioni, convenzioni, gruppi, controllo documenti, richieste,
previdenza — più tutti i prodotti di quotazione (RCA, casa, animali,
viaggio, tutela legale, cauzioni, fotovoltaico…).

**Sta in IAM**: contabilità (10 pannelli), collaboratori/candidature/
black list, pipeline CRM (trattative, agenda), KPI e gare, work diary,
provvigioni, conti e causali, catalogo prodotti, punti vendita,
anagrafica azienda, abbinamento.

Conseguenza diretta: **dei dieci moduli della prima milestone, sette
vivono in QUOTO** (clienti, polizze, portafoglio, HDI, Prima, scadenze,
documentazione), tre in IAM (contabilità, intermediari, CRM). Nessuno
dei due, da solo, è il gestionale centrale.

Questa non è una questione tecnica: è una decisione di prodotto, ed è
l'unica vera domanda aperta di questo audit. Sta in `IAM_MASTER_SPEC.md`,
§ «La decisione che non posso prendere io».

---

## 2. Stack

Nessun framework, nessun passaggio di compilazione, nessun bundler.

- **Frontend**: HTML + JavaScript classico (`var`/`function`, non moduli
  ES) servito staticamente. Le pagine sono `<div>` nascosti e mostrati;
  in QUOTO lo fa `showPage()`, in IAM ogni famiglia di pannelli ha il suo
  commutatore (`opSezione`, `contab-panel-*` con la classe `ct-off`…).
  **Non c'è un router unico**: è un difetto di manutenibilità, non di
  funzionamento.
- **Regole di dominio**: estratte in `tariffe/motore/*.js` — 40+ file,
  ciascuno un IIFE che si esporta sia su `window` (browser) sia su
  `module.exports` (Node). È la scelta architetturale migliore del
  progetto: permette di provare le regole in Node senza un browser.
- **Prove**: `server/verifica/*.test.mjs`, 68 suite, lanciate con `node`
  senza framework di test. Vedi `IAM_TEST_PLAN.md`.
- **Backend**: Supabase (PostgreSQL + PostgREST + Auth + RLS). La logica
  che deve essere atomica sta in funzioni PL/pgSQL (`iam_importa_flusso`,
  `iam_polizze_senza_rate`, …).
- **Server Node**: `server/` — Express, usato per le API verso l'esterno,
  la posta (IMAP), gli scraper. **Non è in produzione in modo
  verificato**: da verificare dove gira e se gira.
- **Scraping/automazioni**: `scraper/`, `prima-extension/`,
  `prima-intermediari/` — Playwright.

### Il caricamento dei motori, e perché ha una prova dedicata

I motori si caricano con `<script src="...?v=AAAAMMGG">`. Se si modifica
un motore senza alzare il contrassegno, il browser serve la versione
vecchia con la pagina nuova e il guasto appena corretto resta a schermo.
La suite `versione-motori` lo controlla e lo ha già preso in fallo il
25/09/2026.

---

## 3. Database

**103 tabelle**, 1.464 colonne, **60 migrazioni** in
`supabase/migrations/`, 2 bozze non applicate in `supabase/bozze/`.

Le tabelle con dati veri (righe stimate):

| tabella | righe | cosa tiene |
|---|---:|---|
| `quote_polizze` | 4.097 | il portafoglio |
| `quote_titoli` | 3.218 | le rate |
| `quote_anagrafiche` | 2.547 | i clienti |
| `iam_workdiary` | 321 | il diario di lavoro |
| `quote_log` | 296 | il registro |
| `iam_audit` | 249 | le tracce |
| `posta_notifiche` | 161 | **non leggibile, vedi sotto** |
| `quote_preventivi` | 87 | i preventivi |
| `sessioni_giornaliere` | 68 | le giornate di cassa |

### Due cose da sapere sullo schema

**a) Cinque tabelle hanno l'RLS accesa e ZERO politiche.** In PostgreSQL
questo vuol dire che *nessuno* le legge e *nessuno* le scrive dal client:
non danno errore, restituiscono zero righe.

| tabella | righe dentro |
|---|---:|
| `posta_notifiche` | **161** |
| `ponte_segreti` | 1 |
| `posta_config` | 1 |
| `iam_trattative_backup` | 1 |
| `quote_progetti_previdenziali` | 0 |

Le prime tre contengono dati e non si possono leggere. È già scritto, in
un altro contesto, che un `not exists` su una tabella così è **sempre
vero** mentre la cascata cancella davvero — quindi non è solo un
problema di lettura. Priorità **P1**.

**b) Una trentina di tabelle sono a zero righe.** Sono funzioni
costruite e mai entrate in uso: `iam_lead`, `iam_agenda`,
`quote_segmenti`, `quote_sinistri`, `iam_firme`, `iam_crediti_premio`,
`iam_incassi`, `iam_incassi_rate`, `iam_sospesi`, `iam_gruppi`,
`prima_preventivi`, `iam_pagamenti`, `quote_rinnovi`, `iam_formazione`…

Questo è il cuore della domanda di Francesco «cosa funziona davvero».
Una tabella vuota non dimostra che la funzione sia rotta — dimostra che
**nessuno la sta usando**, il che per un gestionale è la stessa cosa.
Il dettaglio modulo per modulo sta in `IAM_STATUS.md`.

Il caso più grave è la contabilità: `iam_sospesi` e `iam_incassi_rate`
sono vuote, e `iam_movimenti` ha **6 righe, nessuna in uscita**.
L'incasso di una rata oggi si registra scrivendo `incassato_il` sulla
riga di `quote_titoli` — 2.799 rate così — e non in `iam_incassi_rate`,
che è la tabella dove metà del codice va a cercarlo.

---

## 4. Dipendenze — il difetto che rende il progetto non riproducibile

`package.json` **non dichiara nessuna dipendenza**:

```json
{ "name": "quoto", "version": "1.0.0", "type": "module",
  "scripts": { "start": "node scraper/health.js" } }
```

Ma il codice ne importa dodici: `express` (42 punti), `playwright`,
`nodemailer`, `mailparser`, `imapflow`, `jose`, `dotenv`, `cors`,
`@supabase/supabase-js`, `@anthropic-ai/sdk`, `playwright-extra`,
`puppeteer-extra-plugin-stealth`.

In `node_modules` ci sono solo `playwright` e `playwright-core`,
installati a mano e nemmeno loro dichiarati. Non c'è lockfile.

**Conseguenza misurata: 9 suite di prova su 68 non partono affatto**, e
un clone pulito del progetto non può avviare il server. Priorità **P0**:
è il difetto che impedisce di verificare tutto il resto.

---

## 5. Autenticazione, ruoli, permessi

- Auth di Supabase; la sessione è condivisa fra QUOTO e IAM (suite
  `sessione-condivisa`, verde).
- I ruoli stanno in `iam_utenti` (5 righe): `top_master`, `master`,
  `operativo`; le funzioni `iam_is_admin()` e `iam_is_staff()` sono usate
  dalle politiche RLS.
- **Attenzione, già documentata**: le due funzioni non coincidono.
  `iam_is_staff()` comprende `admin` e `operatore`; le politiche di
  cancellazione delle tabelle del portafoglio chiedono `iam_is_admin()`.
  Un codice che apre il cancello con `is_staff` e poi cancella si trova
  la RLS che filtra tutto **senza dare errore**.

---

## 6. Dove sta il rischio, in ordine

1. **Le dipendenze non dichiarate** — niente è riproducibile, 9 suite
   mute.
2. **Le cinque tabelle senza politiche** — dati invisibili e guardie
   cieche.
3. **Le colonne chieste e inesistenti** — la suite
   `colonne-che-esistono` ne ha trovata una: `quote_gruppi_membri.cliente_id`
   (la colonna vera è `anagrafica_id`). Il filtro per gruppo del CRM
   restituisce **sempre zero clienti**, e il `catch` scrive solo in
   console.
4. **I due monoliti** — 60.000 righe di HTML in due file rendono ogni
   modifica un rischio; è mitigato dai motori estratti e dalle 961 prove,
   non risolto.
5. **La divisione QUOTO/IAM** — non un rischio tecnico, ma il motivo per
   cui «il gestionale centrale» oggi non esiste.
