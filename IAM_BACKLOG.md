# IAM — Backlog

> **25/09/2026.** In ordine di priorità, non di comodità. Si lavora P0,
> poi P1, poi P2. Non si apre un P4 o un P5 finché resta un P0 o un P1.
>
> Aggiornare a ogni intervento: una voce si sposta in «fatto» solo quando
> è vera la definizione di fatto di `IAM_MASTER_SPEC.md` § 3 — un utente
> vero ha completato il flusso e il dato si ritrova il giorno dopo.

---

## P0 — blocca tutto il resto

### P0.1 · `package.json` non dichiara nessuna dipendenza
Il codice importa 12 pacchetti esterni (`express` in 42 punti,
`playwright`, `nodemailer`, `mailparser`, `imapflow`, `jose`, `dotenv`,
`cors`, `@supabase/supabase-js`, `@anthropic-ai/sdk`, `playwright-extra`,
`puppeteer-extra-plugin-stealth`) e ne dichiara **zero**. Non c'è
lockfile. In `node_modules` ci sono solo `playwright` e `playwright-core`,
installati a mano.

**Costo misurato**: 9 suite su 68 non partono; un clone pulito non avvia
il server; nessun ambiente è riproducibile due volte uguale.

**Fatto quando**: `npm ci` da un clone pulito monta tutto, le 9 suite
partono, e c'è un lockfile sotto controllo versione.

---

## P1 — funzioni fondamentali che non funzionano

### P1.1 · Cinque tabelle con RLS accesa e zero politiche
`posta_notifiche` (**161 righe**), `ponte_segreti` (1), `posta_config`
(1), `iam_trattative_backup` (1), `quote_progetti_previdenziali` (0).

Nessuno le legge e nessuno le scrive dal client: non danno errore,
restituiscono zero righe. E una guardia `not exists` su una tabella così
è **sempre vera** mentre la cascata cancella davvero.

**Fatto quando**: ogni tabella o ha le sue politiche, o è dichiarata
«solo lato server» e il codice che la legge dal client è stato tolto.

### P1.2 · Il filtro per gruppo del CRM restituisce sempre zero
`index.html:11245` chiede `quote_gruppi_membri.cliente_id`; la colonna
vera è `anagrafica_id`. La query fallisce, il `catch` scrive solo in
console, `membri` resta un insieme vuoto, e la segmentazione per gruppo
non trova mai nessuno. È nell'area che vale di più (§ 2 dello spec).

**Fatto quando**: `colonne-che-esistono` è verde, il filtro restituisce
i clienti del gruppo, e c'è una prova che lo controprova.

### P1.3 · Suite `tracciabilita` rossa
«Manca il cliente dell'anagrafica: ogni analisi…» e
`Cannot read properties of undefined (reading 'parametri_usati')`.
Da capire se è la prova a essere scritta su dati che non esistono più o
il codice a essere rotto.

### P1.4 · Triare le tre suite rosse rimaste
`esiti` (4 superate, 16 fallite), `otp-dalla-posta` (5/12),
`vigilanza-codice-dalla-posta` (0/5). Se servono credenziali, la suite
deve **dirlo e saltare**, non fallire: una suite che fallisce per
l'ambiente insegna a ignorare il rosso.

### P1.5 · Sei codici produttore HDI senza persona
A12556 (7 polizze), A12559 (5), A18544, A18545, A4346, A12558. Quelle
polizze sono in archivio **senza intestatario**: non contano per nessun
collaboratore, né in produzione né in provvigioni.

**Fatto quando**: ogni codice è abbinato, e le polizze risalgono alla
persona giusta.

---

## P2 — funzioni presenti ma incomplete

### P2.1 · Nessuna schermata per correggere il pagamento di una rata
La colonna `pagamento_a_mano` esiste, la guardia che la protegge dal
flusso è provata — **ma dall'app non c'è modo di usarla**. La promessa
«sempre con la possibilità di modificare il pagamento» oggi è mantenuta
solo a metà.

### P2.2 · Schermata della contabilità giornaliera
Il motore è pronto e verde (39/39): incassi per mezzo, sospesi
incassati, spese, e il netto del cassetto (100 contanti − 30 spesa = 70).
Il pannello non è mai stato scritto.

**Attenzione prima di scriverlo**: due dei tre blocchi non hanno dati.
`iam_sospesi` è vuota e `iam_movimenti` ha 6 righe senza uscite. Vedi
P2.3.

### P2.3 · Le spese non dicono con che mezzo sono state pagate
Oggi vivono come numero unico in `sessioni_giornaliere.spese` (22 giorni
su 68). Senza il mezzo, la regola R6 non può togliere i 30 € dal
contante — resta una riga «senza mezzo» dichiarata a parte.

**Decisione da prendere con Francesco**: si registra la spesa col mezzo
(e allora serve dove scriverla), oppure la contabilità giornaliera resta
in sola lettura e le spese restano un totale.

### P2.4 · `parita-tariffe` e `parita-catastrofali` senza riferimento
Confrontano il calcolo di oggi con una versione storica che **non esiste
più nei commit** («nessun commit contiene più `const TL_MYDRIVE`»). O si
riancorano a una fotografia salvata nel repository, o si ritirano
dicendolo. Lasciarle rosse è peggio di toglierle: insegna a ignorare il
rosso.

### P2.5 · Tabelle costruite e mai usate
`iam_lead`, `iam_agenda`, `quote_segmenti`, `quote_sinistri`,
`iam_firme`, `iam_formazione`, `quote_rinnovi`, `iam_incassi*`,
`iam_crediti_*`, `iam_provvigioni_*`, `iam_gruppi*`, `iam_pagamenti`,
`prima_preventivi`: **tutte a zero righe**.

Per ciascuna una domanda sola: si completa o si toglie? Un gestionale
pieno di schermate che nessuno usa è peggio di uno con meno schermate.

### P2.6 · «Annulla importazione»
Bozza **non applicata** in `supabase/bozze/`, con 3 blocchi e 8 gravi
trovati da revisori indipendenti — fra cui uno che cancellerebbe in
silenzio rate già incassate. **Non eseguire.** Da rifare da capo con le
indicazioni scritte nell'intestazione del file.

---

## P3 — problemi di uso

- **P3.1** Nessun router unico: ogni famiglia di pannelli ha il suo
  commutatore. Nessuna pagina ha un indirizzo proprio, quindi non si può
  mandare un collegamento a una schermata.
- **P3.2** Due file da 33.000 e 27.000 righe. Non si riscrivono: si
  continua a estrarre le regole nei motori, come si sta già facendo.
- **P3.3** Trenta documenti markdown nella radice, scritti in momenti
  diversi e in parte superati. Questi cinque li sostituiscono: gli altri
  vanno rivisti o archiviati.

---

## P4 — miglioramenti

- **P4.1** Prove da utente vero (Playwright) sui tre percorsi
  quotidiani. Dipende da P0.1.
- **P4.2** Un indice sul portafoglio per le domande di segmentazione,
  quando saranno lente (oggi 4.097 polizze non lo sono).

---

## P5 — funzioni nuove (non prima che P0 e P1 siano chiusi)

- **P5.1 · Prima Assicurazioni nel portafoglio.** È un obiettivo
  strategico dichiarato e oggi **non esiste**: zero polizze Prima in
  archivio. Serve decidere da dove arrivano i dati (flusso, estrazione,
  API) prima di scrivere una riga.
- **P5.2** Segmenti salvabili e riusabili (`quote_segmenti` è pronta e
  vuota).
- **P5.3** Campagne commerciali a partire dai segmenti.
- **P5.4** WhatsApp, email automatiche, scoring, suggerimenti, altre
  compagnie.

---

## Fatto di recente

| quando | che cosa |
|---|---|
| 25/09/2026 | **Stato di pagamento dai flussi**: incassato/sospeso/da incassare deciso dal movimento della compagnia e non dall'etichetta; l'importazione aggiorna le rate già in archivio ma non tocca mai una correzione a mano. Verificato sul file vero (12 rate, 3.217,39 €) |
| 25/09/2026 | **Le polizze HDI** dicevano tutte «non pagato» con 12 rate incassate |
| 25/09/2026 | **I mezzi di pagamento veri** (`carta_credito`, `altro`, `pos_bianco`, `pos_nero`) non erano riconosciuti: sul 23/09 erano 2 su 5 |
| 24–25/09/2026 | Importazione HDI PASS-133 completa e verificata sul file vero |
