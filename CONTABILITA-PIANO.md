# Contabilità assicurativa semplificata — il piano

Risposta al **Prompt 0** della consegna del 21/09/2026. La specifica sta in
`CLAUDE_CODE_IAM_CONTABILITA_SEMPLIFICATA.md`; questo documento dice **che cosa
c'è già**, che cosa manca e in che ordine si fa.

**Nessuna riga di codice scritta.** Tutte le cifre qui sotto sono misurate sul
repository e sul database veri il 21/09/2026, non stimate.

---

## 0. La misura che decide tutto, e va letta per prima

```
iam_movimenti     1 riga
iam_quadrature    0
iam_sospesi       0
iam_conti         6   (configurazione)
iam_causali      12   (configurazione)
```

**La prima nota di IAM contiene UN movimento.** Non c'è niente da migrare.

Questo cambia una raccomandazione che avevo scritto io stesso **due ore prima**,
in `CONFRONTO-ASSIEASY.md`: *«non si rincorre la partita doppia»*. La specifica
di Francesco la chiede, e **la misura gli dà ragione sul momento**: il modello
contabile si cambia oggi a costo quasi zero, fra un mese — con qualche centinaio
di movimenti scritti — sarebbe un lavoro di migrazione con il rischio di
riscrivere dei numeri già usati.

Quello che scrivevo allora resta vero su un punto solo, ed è un avvertimento, non
un'obiezione: **la partita doppia va con un piano dei conti che qualcuno deve
mantenere.** Il modo per non pagarlo è il §16 della specifica — l'operatore non
vede mai Dare e Avere, li genera il sistema dalle rate e dai pagamenti. Quello è
il vincolo di progetto più importante di tutto il lavoro.

---

## 1. Architettura rilevante

| | |
|---|---|
| **Stack** | Nessun framework, nessuna compilazione. Due monoliti HTML: `index.html` (QUOTO, 1,9 MB) e `iam/index.html` (IAM, 1,1 MB). Stessa origine in produzione: IAM alla radice, QUOTO sotto `/nuovo-preventivo/` |
| **Logica** | Motori in `tariffe/motore/*.js`: IIFE con `module.exports` **e** `window.X`, così girano nel browser e in Node. Nessun `import`/`export`, nessun build |
| **Database** | Supabase (PostgreSQL) via PostgREST dal browser. Niente ORM. `numeric(14,2)` per gli importi — mai floating point, il requisito §3.6 è **già rispettato** |
| **Migrazioni** | File SQL numerati in `supabase/migrations/`, applicati a mano, con un blocco `ROLLBACK` commentato in testa. Convenzione di casa |
| **Backend** | `server/*.js` (Express, ESM) sul VPS OVH dietro Caddy. Serve mail, firma, archivio cifrato, scraper. **Non** fa da API al gestionale: le schermate parlano direttamente col database |
| **Autorizzazione** | RLS di Postgres, con `iam_is_staff()` e `iam_is_admin()`. Ruoli in `iam_utenti.ruolo`: `top_master`, `admin`, `operativo`, `collaboratore` |
| **Prove** | `node ui-test.mjs` (492, browser vero con Playwright), `node iam/controlla-tutto.mjs` (74), `server/verifica/*.test.mjs` (un file per argomento). **Nessuna CI**: i numeri che si scrivono sono quelli che si sono girati |
| **Interfaccia** | Kit grafico dichiarato in `iam/index.html` (`page-head`, `d-card`, `d-btn`), gettoni `--w1-*` condivisi. Guardiano `kit-schermate.test.mjs` |

### Tre vincoli di casa che questo lavoro deve rispettare

1. **Il motore si carica, non si copia.** La logica contabile sta in un file
   solo sotto `tariffe/motore/`, caricato da tutti e due i documenti. Due copie
   sarebbero due contabilità della stessa agenzia.
2. **Un guardiano conta le collisioni** fra i due monoliti
   (`fusione-collisioni.test.mjs`): oggi **6 su 6, scarto 0**. Ogni nome globale
   e ogni classe CSS nuova va prefissata, altrimenti il banco diventa rosso.
3. **Niente dati inventati** (CLAUDE.md §8.1). In contabilità non ci sono
   eccezioni: quello che non si sa resta vuoto e si dichiara.

---

## 2. Entità esistenti da riutilizzare — e da NON duplicare

Questa è la parte che vale di più: **la specifica descrive nove tabelle nuove, e
cinque esistono già** con un altro nome.

| la specifica chiede | IAM ha già | righe | che cosa cambia |
|---|---|---:|---|
| `accounting_accounts` | **`iam_conti`** | 6 | ci sono `tipologia`, `natura`, `mezzi`, `iban`, `saldo_iniziale`, `rimesse`. **Mancano** i tre flag della specifica e il legame a compagnia/collaboratore |
| `accounting_causes` | **`iam_causali`** | 12 | ci sono `codice`, `nome`, `segno`, `incide_su_utile`, `natura`. **Manca** `kind` (il tipo di flusso che la usa) |
| `accounting_entries` | **`iam_movimenti`** | **1** | oggi è una riga **singola** con `conto_id` + `importo` + causale col segno. Per la partita doppia serve testata + righe |
| `accounting_entry_lines` | — | — | **da creare** |
| `daily_reconciliations` | **`iam_quadrature`** | 0 | ci sono `conto_id`, `data`, `saldo_dichiarato`, `nota`. **Mancano** `system_balance` congelato, `difference`, `status` |
| `suspenses` | **`iam_sospesi`** | 0 | ⚠️ **è un'altra cosa**, vedi sotto |
| `premium_collections` + items + payments | — | — | **da creare**. Oggi l'incasso è un `update` su `quote_titoli` |
| `suspense_recoveries` | — | — | **da creare** |

E tutto il resto del dominio **c'è e non si tocca**:

| | tabella | righe |
|---|---|---:|
| clienti | `quote_anagrafiche` | 2.536 |
| polizze | `quote_polizze` | 1.721 |
| rate / titoli | `quote_titoli` | 56 (15 incassate) |
| compagnie | `quote_compagnie` | 9 |
| collaboratori | `quote_collaboratori` | 17 |
| utenti | `iam_utenti` | 5 |
| registro dei movimenti (audit) | `quote_log` con `entita_id` | ~240 |

### ⚠️ `iam_sospesi` NON è il «sospeso» della specifica

Questa è la trappola più pericolosa del lavoro, e va scritta in grande.

| | significato |
|---|---|
| **`iam_sospesi` (IAM, oggi)** | il cliente **ha già pagato**, e il denaro non è ancora arrivato sul conto dell'agenzia. È il POS di stamattina che la banca accredita domani |
| **`suspenses` (la specifica, e AssiEasy)** | il premio è **messo a copertura** e il cliente **non ha ancora pagato**. È un credito verso il cliente |

**Sono opposti.** IAM aveva evitato quella parola apposta (CLAUDE.md §32).
Riusare `iam_sospesi` per i crediti verso i clienti mescolerebbe due archivi che
non devono incrociarsi mai, e la tabella oggi è **vuota** — quindi si può ancora
decidere con calma.

**Proposta:** la tabella nuova si chiama `iam_crediti_premio` (o
`iam_sospesi_cliente`), `iam_sospesi` resta quello che è, e i due nomi si
scrivono **per esteso** in ogni schermata. Mai la parola «sospeso» da sola.

---

## 3. I gap veri rispetto alla specifica

In ordine di quanto costano.

1. **La partita doppia non esiste.** `iam_movimenti` è una riga sola con un
   conto e un importo; il verso lo dà la causale. Serve la coppia
   testata + righe, con il vincolo «somma Dare = somma Avere».
2. **L'incasso non è un oggetto.** Oggi incassare vuol dire scrivere
   `incassato_il` e `mezzo_pagamento` su `quote_titoli`. Non c'è un incasso che
   collega più rate a più modalità di pagamento — quindi **il pagamento multiplo
   non si può registrare** (già annotato in `CONFRONTO-ASSIEASY.md`, punto 2.2).
3. **I crediti verso clienti e collaboratori non ci sono** (vedi §2 qui sopra).
4. **Non esiste lo storno.** `iam_movimenti` ha `annullato_il` — cioè un
   annullamento in posto, non un movimento inverso collegato. La specifica
   chiede il secondo, ed è più forte.
5. **Il saldo di compagnia non esiste.** `iam_conti.natura` distingue i premi
   dai soldi dell'agenzia, ma non c'è un conto **per compagnia**: IAM non sa
   dire quanto si deve a PRIMA in questo momento.
6. **L'abbuono non esiste.** Zero colonne, zero causali, zero rate con importo
   diverso dal premio. Chi incassa 199,50 su 200 oggi non ha nessuna strada
   giusta.
7. **L'idempotenza non è modellata** per gli incassi (esiste per l'import dei
   flussi: `fonte`/`fonte_id` con indice unico — il modello è già in casa).
8. **Il multi-azienda non esiste, e non serve.** Misurato: **nessuna** colonna
   `organization_id`/`tenant` in tutto il database, `iam_azienda` ha **una**
   riga. Vedi §7.

---

## 4. Modello dati proposto, adattato a IAM

Nomi in italiano e prefisso `iam_`, come tutto il resto.

### Si estende quello che c'è

```
iam_conti      + e_mezzo_pagamento   boolean   (oggi implicito in `mezzi`)
               + e_conto_sospeso     boolean
               + e_quadrabile        boolean   ← «carta canta»: si quadra solo
                                                 ciò che si può contare
               + compagnia_id        uuid null → quote_compagnie
               + collaboratore_id    uuid null → quote_collaboratori
               + attivo              boolean

iam_causali    + genere  text  check (incasso_premio | apertura_credito |
                                      recupero_credito | manuale |
                                      giroconto | storno)

iam_quadrature + saldo_ricostruito  numeric(14,2)  ← congelato alla verifica
               + differenza         numeric(14,2)  generated
               + stato  text  check (aperta | quadrata | spiegata)
```

### Tabelle nuove

```
iam_movimenti_righe        movimento_id, conto_id, dare, avere, descrizione,
                           + le dimensioni che IAM usa già:
                             compagnia_id, cliente_id, collaboratore_id,
                             polizza_id, titolo_id

iam_incassi                data, cliente_id, stato, movimento_id,
                           chiave_idempotenza (unica), note, audit
iam_incassi_rate           incasso_id, titolo_id, importo
iam_incassi_pagamenti      incasso_id, conto_id, importo, riferimento

iam_crediti_premio         conto_credito_id, cliente_id, polizza_id,
                           titolo_id, compagnia_id, collaboratore_id,
                           aperto_il, previsto_il, importo_originario,
                           stato, movimento_apertura_id, audit
iam_crediti_recuperi       credito_id, data, importo, conto_pagamento_id,
                           movimento_id, audit
```

### Che cosa succede a `iam_movimenti`

Prende `stato` (`bozza`/`registrato`/`stornato`), `storno_di_movimento_id`,
`chiave_idempotenza`, `numero` progressivo e i tre campi di audit
(`creato_da`/`registrato_da`/`stornato_da`).

**`conto_id` e `importo` restano**, ed è una scelta: c'è **una** riga scritta e
la colonna la leggono cinque schermate. Diventano *derivati* — la riga singola
di un movimento a due righe — e si spengono quando le schermate sono passate
alle righe. Toglierle subito vorrebbe dire riscrivere `Contabilita.saldo`,
`quadratura`, `giornata`, `dettaglioConto` e `anomalie` nello stesso colpo, e
quelle funzioni hanno 34 prove sopra.

### Le sei regole che il database fa rispettare da sé

Non il codice della pagina: **il database**, perché la schermata è una delle
strade e non l'unica (c'è la console, c'è PostgREST).

1. una riga ha Dare **oppure** Avere, mai tutti e due, e l'importo `> 0`;
2. un movimento `registrato` ha somma Dare = somma Avere (trigger);
3. un movimento `registrato` non si aggiorna e non si cancella (trigger);
4. `chiave_idempotenza` unica: doppio clic e retry non duplicano;
5. la somma dei recuperi non supera l'importo del credito;
6. nessuna colonna `saldo` da nessuna parte — i saldi si calcolano dalle righe
   (regola già in casa, CLAUDE.md §26).

---

## 5. Motori, schermate e prove

**Un motore solo, quello che c'è già**: `tariffe/motore/contabilita.js`
(1.300 righe, 48 prove). Si estende, non si affianca.

| dove | che cosa |
|---|---|
| `tariffe/motore/contabilita.js` | `bilanciato()`, `righeDaIncasso()`, `righeDaApertura()`, `righeDaRecupero()`, `residuoCredito()`, `storno()`. Tutto **puro** e provabile in Node |
| `iam/index.html` | quattro schermate nuove sotto Contabilità: **Incassi**, **Crediti da recuperare**, **Prima nota** (estesa), **Quadratura** (estesa). Prefissi liberi da verificare col guardiano |
| `index.html` (QUOTO) | il tasto «Incassa» della pagina Titoli chiama il nuovo flusso invece di scrivere su `quote_titoli` |
| `iam/withus-one.js` | le voci di menu. **Attenzione:** toccarlo obbliga ad aggiornare `?v=` e l'impronta annotata (`versione-scocca.test.mjs`) |
| prove | `server/verifica/contabilita.test.mjs` (48 → ~90), `iam/verifica/*` per le schermate, `ui-test.mjs` per il flusso di incasso |

**Niente API nuove.** Le schermate parlano col database via PostgREST, come
tutto il resto. L'unica eccezione possibile è l'atomicità: vedi §7.

---

## 6. Le quattro fasi

| fase | che cosa | dove |
|---|---|---|
| **1 · Fondamenta** | righe di prima nota, bilanciamento, stati, storno, immutabilità, permessi, audit. I dodici conti minimi come **proposta** da confermare, non come seed automatico | 1 migrazione, il motore, la schermata Conti |
| **2 · Incassi** | incasso con più rate e più pagamenti, atomicità, idempotenza, concorrenza, prima nota generata | 1 migrazione, il motore, la schermata Incassi, il tasto in QUOTO |
| **3 · Crediti** | apertura, scadenziario, recuperi parziali, timeline, residuo calcolato dallo storico | 1 migrazione, il motore, la schermata Crediti |
| **4 · Controllo** | prima nota filtrabile, estratto conto, quadratura, CSV, cruscotto | nessuna migrazione o quasi: `dettaglioConto` e `quadrature` esistono già (§42, §29) |

Una fase per PR, con le prove verdi e la controprova, come tutto il resto del
repository.

---

## 7. Rischi e decisioni bloccanti

### 🔴 Le tre che bloccano davvero

**1. L'atomicità non si ottiene da PostgREST.** La specifica chiede che incasso,
allocazioni, aggiornamento rate e prima nota stiano **nella stessa
transazione** (§3.3) — e dal browser ogni chiamata è una transazione a sé. La
strada di casa esiste già ed è provata: una **funzione Postgres**, come
`iam_importa_flusso` per l'import tutto-o-niente (CLAUDE.md §47). Ogni scrittura
contabile passa da lì. *Senza questa decisione la Fase 2 non si può scrivere.*

**2. Su quale portafoglio gira questa contabilità?**
`ASSIEASY-INTEGRAZIONE.md` misurava **7.637 polizze e ~2,48 M€** dentro
AssiEasy. Oggi IAM ne ha **1.721** — la migrazione è cominciata col flusso SSF
(che è esattamente l'esportazione SHARE di cui quel documento chiedeva
l'esistenza: **la risposta è sì**). Ma mancano ancora ~5.900 polizze di altre
compagnie.

> **Una contabilità che gira su un quarto del portafoglio non quadra con
> niente.** I premi da versare alle compagnie sarebbero un quarto di quelli
> veri, e la quadratura di cassa troverebbe ogni giorno una differenza che non
> è un errore.

Va deciso **prima della Fase 2**: si costruisce la contabilità su quello che
c'è (e si usa in parallelo ad AssiEasy finché il portafoglio non è completo),
oppure prima si completa la migrazione. Non è una domanda tecnica.

**3. La cassa vera è fuori da qui.** `sessioni_giornaliere` ha **68 giorni**
digitati a mano (25/05 → 16/09/2026): è l'unica contabilità che l'agenzia
possiede. Non si spegne finché i suoi numeri non sono stati confrontati con
quelli nuovi e tornano — è la stessa regola già applicata due volte (§17, §33).
**Da decidere:** i saldi iniziali dei conti si prendono da lì?

### 🟡 Le decisioni che prendo io, se non dici altro

- **Niente multi-azienda.** Misurato: nessuna colonna tenant, `iam_azienda` ha
  una riga. Aggiungere `organization_id` su nove tabelle per un'agenzia sola
  vuol dire scrivere una colonna che vale sempre lo stesso valore, e i test di
  «isolamento fra tenant» proverebbero una cosa che non esiste. L'isolamento
  che c'è è quello per **ruolo** (RLS), e quello si prova davvero. Se un giorno
  servisse, si aggiunge allora — con una riga sola in tabella è indolore.
- **I permessi si mappano sui ruoli che ci sono**, non si crea un secondo
  sistema: `accounting.view` → staff; `collect` e `suspense.manage` → staff;
  `entry.reverse`, `reconcile`, `settings.manage` → admin. Il cancello vero
  sta nelle politiche del database, come già oggi (§26).
- **I dodici conti minimi si propongono, non si creano.** Un seed automatico
  scriverebbe nella contabilità dell'agenzia dei conti che nessuno ha deciso, e
  §8.1 non fa eccezioni sul denaro. La schermata li elenca con un tasto «crea
  questi».
- **`iam_conti` si estende, non si rifà.** Sei conti configurati stamattina da
  Francesco: rifarli vorrebbe dire fargli rifare quel lavoro.

### 🟡 I rischi tecnici, e come si tengono

| rischio | come si tiene |
|---|---|
| Il guardiano delle collisioni è a **scarto 0** | ogni nome nuovo prefissato, e il banco si gira **prima** del commit |
| `iam/index.html` cresce di ~4.000 righe | quattro blocchi separati, col kit grafico, come le schermate del brief #02 |
| Le 34 prove di `Contabilita` possono diventare rosse | `conto_id`/`importo` restano come derivati: nessuna funzione esistente cambia nella Fase 1 |
| PostgREST manda **mille** righe per richiesta | la prima nota si pagina da subito — difetto già trovato e chiuso sul foglio cassa oggi (§53) |
| Il flusso della compagnia scrive incassi da sé | la Fase 2 deve decidere se l'import genera anche la prima nota, o se resta un secondo archivio |

---

## 8. I file della Fase 1

Elenco preciso, come chiesto.

**Nuovi**
```
supabase/migrations/20260922_contab_partita_doppia.sql
  · iam_movimenti_righe (tabella)
  · iam_movimenti  + stato, storno_di_movimento_id, chiave_idempotenza,
                     numero, registrato_da, stornato_da, stornato_il
  · iam_conti      + e_mezzo_pagamento, e_conto_sospeso, e_quadrabile,
                     compagnia_id, collaboratore_id, attivo
  · iam_causali    + genere
  · trigger: bilanciamento, immutabilità dei registrati, una riga o Dare o Avere
  · politiche RLS sulle righe, ricalcate su quelle dei movimenti
  · blocco ROLLBACK in testa
```

**Modificati**
```
tariffe/motore/contabilita.js     bilanciato(), righeDi(), storno(),
                                  VERSIONE, export
iam/index.html                    Conti e causali: i tre flag e il legame a
                                  compagnia/collaboratore; Prima nota: le righe
                                  Dare/Avere nel dettaglio e lo storno
server/verifica/contabilita.test.mjs   48 → ~62
iam/verifica/conti-causali.test.mjs    12 → ~16
iam/verifica/prima-nota.test.mjs       10 → ~14
versione.json + i due <meta>      0.22.0
CLAUDE.md, DECISIONI.md
```

**Non toccati nella Fase 1:** `index.html` (QUOTO), `iam/withus-one.js`,
`quote_titoli`, `quote_polizze`, e nessuna delle schermate di portafoglio.

---

## 9. Che cosa NON è stato fatto

Questo documento è **solo il Prompt 0**: analisi e piano. Nessuna riga di
codice, nessuna migrazione scritta o applicata, nessuna decisione eseguita.

Le tre 🔴 del §7 vanno risolte prima della Fase 2 — la prima anche prima della
Fase 1, se si vuole che le fondamenta siano già quelle giuste.
