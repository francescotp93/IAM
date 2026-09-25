# IAM — Stato dei moduli

> **25/09/2026.** Uno stato non si dichiara: si misura. Qui ogni riga
> dice *come* l'ho stabilito. Dove non ho potuto provarlo con un utente
> vero o con un dato vero, la voce è **da verificare** — non «funziona».
>
> Aggiornare questo file a ogni intervento. Se una riga resta «da
> verificare» per settimane, è quella la cosa da fare.

## Legenda

| segno | vuol dire |
|---|---|
| 🟢 | **funzionante**: c'è il codice, ci sono dati veri dentro, e ci sono prove verdi che lo coprono |
| 🟡 | **parziale**: funziona un pezzo; il resto manca o non è verificato |
| 🔴 | **non funzionante**: provato e rotto, oppure la tabella è vuota e nessuno lo usa |
| ⚪ | **non presente** |
| ❔ | **da verificare**: non l'ho ancora potuto provare |

---

## Quadro d'insieme

**1.123 prove superate su 70 suite; 3 suite rosse.**

All'inizio dell'audit erano 961 e 16. Le dodici recuperate lo sono state
dichiarando le dipendenze (P0), non toccando il codice: dodici suite
sembravano a posto e non partivano affatto.

`colonne-che-esistono` **è tornata verde** dopo la correzione del filtro
per gruppo. Restano `tracciabilita` (P1.3) e le due `parita-*` che
confrontano contro un riferimento git che non esiste più (P2.4).

Due suite nuove: **`tasti-vivi`** (ognuno dei 2.108 gestori delle due
pagine chiama qualcosa che esiste — nessun tasto morto) e
**`visualizzazione`** (lo zoom con le dita non si blocca, e i campi sono
a 16px dove si tocca).

---

## I dieci moduli della prima milestone

| # | modulo | stato | dove vive | come l'ho stabilito |
|---|---|:--:|---|---|
| 1 | **Clienti** | 🟡 | QUOTO | 2.547 righe in `quote_anagrafiche`, suite `anagrafica` verde. Ma il filtro per gruppo del CRM è rotto (vedi sotto) e cinque difetti anagrafici noti sono ancora aperti |
| 2 | **Polizze** | 🟡 | QUOTO | 4.097 righe. Le polizze HDI dichiaravano tutte «non pagato» con 12 rate incassate: **corretto il 25/09**. `quote_rinnovi` è vuota: il rinnovo non è in uso |
| 3 | **Portafoglio** | 🟢 | QUOTO | 4.097 polizze + 3.218 rate, suite `produzione`, `provvigioni`, `estratto-conto`, `scadenzario` verdi |
| 4 | **HDI** | 🟢 | QUOTO | Importazione PASS-133 verificata sul file vero: 11 clienti, 18 polizze, 13 rate, 3.944,39 €, 367,40 € di provvigioni — combaciano col file e con gli «Appunti Incassi» della compagnia. Suite `flusso-hdi` 75/75 |
| 5 | **Prima Assicurazioni** | 🔴 | — | `prima_preventivi` e `prima_scrape_runs` sono **a zero righe**. Esistono `prima-extension/` e `prima-intermediari/`, ma nel portafoglio non c'è una sola polizza Prima. È un obiettivo dichiarato, non una funzione esistente |
| 6 | **Scadenze** | 🟡 | QUOTO | Suite `scadenzario` 30/30 verde. Le finestre 7/30/60/90 giorni e «rinnovate / non rinnovate» sono **da verificare** contro la schermata |
| 7 | **Intermediari** | 🟡 | IAM | 17 collaboratori, suite `collaboratori` e `assegnazione` (47) verdi. Ma **6 codici produttore HDI non sono ancora abbinati a una persona**: quelle polizze sono in archivio senza intestatario |
| 8 | **Documentazione** | ❔ | QUOTO | `quote_documenti` 9 righe, `quote_pratica_documenti` 1, `quote_regole_documenti` 1. Praticamente non usata. «Documenti mancanti / scaduti» è da verificare |
| 9 | **Contabilità** | 🟡 | IAM | Vedi la sezione dedicata |
| 10 | **CRM / segmentazione** | 🟢 | QUOTO+IAM | `crm-analisi` **51/51**. Il 25/09 sono entrate le ricerche che mancavano — l'**assenza** («auto senza casa»), compagnia, provincia, scadenza, fascia di premio — e si compongono fra loro. Tutte e otto le domande del mandato ora rispondono. Restano vuote `iam_lead` e `quote_segmenti`: lead e segmenti *salvati* non sono in uso |

---

## Contabilità — il modulo che Francesco ha chiesto di chiudere

Dieci pannelli in IAM: cruscotto, quadratura, anomalie, sospesi,
storico, prima nota, quadratura conti, recuperi, incassa, incassi.

| pezzo | stato | come l'ho stabilito |
|---|:--:|---|
| Stato di pagamento dal flusso | 🟢 | **Chiuso il 25/09/2026**: incassato/sospeso/da incassare deciso dal movimento della compagnia, non dall'etichetta. Motore `pagamento-rata` 19/19, 17 sabotaggi tutti rossi, verificato sul file vero |
| L'importazione aggiorna le rate | 🟢 | Prima era `on conflict do nothing`: una rata in archivio non si aggiornava mai più. Provato su tabella finta prima di applicare |
| La correzione a mano resiste al flusso | 🟡 | La colonna `pagamento_a_mano` c'è e la guardia è provata, **ma la schermata per cambiarlo non esiste ancora**. Oggi non c'è modo di usarla dall'app |
| Motore della giornata | 🟢 | `contabilita-giornaliera` 39/39. Corretto il 25/09 un difetto per cui `carta_credito`, `altro`, `pos_bianco` e `pos_nero` non venivano riconosciuti: sul 23/09 erano 2 mezzi su 5 |
| Schermata della giornata | ⚪ | Il motore è pronto e provato, il pannello non è mai stato scritto |
| Sospesi | 🔴 | `iam_sospesi` è **vuota**. Il motore sa calcolarli, la tabella non ha acqua |
| Prima nota / movimenti | 🔴 | `iam_movimenti` ha **6 righe e nessuna uscita**. Le spese vivono come numero unico in `sessioni_giornaliere` (22 giorni su 68) **senza il mezzo di pagamento** |
| Incassi | 🔴 | `iam_incassi`, `iam_incassi_rate`, `iam_incassi_pagamenti`: **tutte a zero**. L'incasso vero si registra su `quote_titoli.incassato_il` (2.799 rate). Metà del codice cerca nella tabella sbagliata |
| Crediti / recuperi | 🔴 | `iam_crediti_premio` e `iam_crediti_recuperi` a zero |
| Quadratura di giornata | 🟡 | 68 giornate dichiarate a mano in `sessioni_giornaliere`; il confronto col ricostruito c'è, ma il ricostruito pesca da `iam_movimenti`, che è vuota |
| Annulla importazione | 🔴 | Bozza **non applicata**, in `supabase/bozze/`. 3 blocchi + 8 gravi trovati da revisori indipendenti. **Non eseguire** |

**Il quadro onesto della contabilità**: le *regole* sono scritte e
provate bene; le *tabelle* dove quelle regole dovrebbero leggere sono
quasi tutte vuote, perché nessuno ha mai registrato un movimento
dall'app. È un modulo con un buon motore e senza carburante.

---

## Gli altri moduli di IAM

| modulo | stato | note |
|---|:--:|---|
| Collaboratori / candidature / black list | 🟡 | 17 collaboratori, suite verde. Candidature ❔ |
| Work diary | 🟢 | 321 righe, in uso vero |
| KPI e gare | 🟡 | `iam_gare_posizioni` 19, `iam_kpi_re_posizioni` 33, `iam_kpi_consap_posizioni` 5. Suite `kpi` verde. `iam_obiettivi` 3 righe |
| Trattative (pipeline CRM) | 🟡 | 24 righe. `iam_lead` e `iam_agenda` **a zero**: lead e agenda non sono in uso |
| Provvigioni | 🟡 | Suite `provvigioni` 12/12 verde, ma `iam_provvigioni_collaboratore` e `iam_provvigioni_tariffa` sono **a zero** |
| Conti e causali | 🟢 | 8 conti, 14 causali, suite `contabilita` 138/138 |
| Catalogo prodotti | 🟡 | 8 prodotti, 9 compagnie, 6 prodotti standard |
| Punti vendita | 🟡 | 1 riga |
| Azienda | 🟡 | 1 riga |
| Firme | 🔴 | `iam_firme` a zero |
| Formazione | 🔴 | `iam_formazione` a zero |
| Posta | 🔴 | `posta_notifiche` ha 161 righe ma **RLS senza politiche**: nessuno le legge |

---

## I difetti confermati, in ordine di priorità

| # | pri | difetto | prova |
|---|:--:|---|---|
| ~~1~~ | ~~P0~~ | ~~`package.json` non dichiara nessuna delle 12 dipendenze~~ — **corretto il 25/09**: +150 prove, −12 suite rosse | |
| ~~2~~ | ~~P1~~ | ~~5 tabelle con RLS accesa e zero politiche~~ — **falso allarme mio**: tre sono chiuse al client di proposito (segreti, credenziali di posta) e una è pure dichiarata nel file di migrazione. Restano due tabelle orfane, scese a **P2.7 / P2.8** | verificato chi le usa, non solo `pg_policies` |
| ~~3~~ | ~~P1~~ | ~~Il CRM chiede `quote_gruppi_membri.cliente_id`~~ — **corretto il 25/09**, con due prove nuove e cinque sabotaggi | |
| 4 | **P1** | Suite `tracciabilita` rossa: «Manca il cliente dell'anagrafica», `Cannot read properties of undefined` | eseguita |
| 5 | **P1** | 6 codici produttore HDI senza persona abbinata | A12556 (7 polizze), A12559 (5), A18544, A18545, A4346, A12558 |
| 6 | **P2** | `parita-tariffe` e `parita-catastrofali` confrontano contro un riferimento git **che non esiste più** | «nessun commit contiene più `const TL_MYDRIVE`» |
| 7 | **P2** | Nessuna schermata per correggere a mano il pagamento di una rata | la colonna c'è, il tasto no |
| 8 | **P2** | Schermata contabilità giornaliera mai scritta | motore pronto, 39/39 |
| 9 | **P3** | Nessun router unico: ogni famiglia di pannelli ha il suo commutatore | letto nel codice |
| 10 | **❔** | 3 suite rosse ancora da triare: `esiti`, `otp-dalla-posta`, `vigilanza-codice-dalla-posta` | |
