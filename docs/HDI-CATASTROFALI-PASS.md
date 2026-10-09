# HDI #Rischi catastrofali sul portale PASS: campi e tariffa

Rilevato il 09/10/2026 leggendo il codice delle pagine del portale agenti HDI
(UEFA → "Nuova proposta" → prodotto **545 #Rischi catastrofali**) e facendo
quotazioni di prova senza emettere. La configurazione leggibile da programma è
in [`scraper/hdi/catastrofali-pass.json`](../scraper/hdi/catastrofali-pass.json).

## In due righe

- La tariffa **non è nel codice del browser**: il portale (motore RGI PASS) la
  calcola sul server e manda alla pagina il risultato, **formula compresa**.
- Il tasso dipende solo dalla **zona**: nelle prove i fattori del fabbricato
  (tipo, età, superficie, dimora, piani) non lo cambiano. Per il CAP provato
  coincide con il nostro `tariffe/catastrofali_cap.json`, quindi il motore
  locale `tariffe/motore/catastrofali.js` dà lo stesso premio del portale.

## Come parla il portale

Ogni passo è un `POST /hdi/CommandProcessor` (form classico, sessione = cookie
del portale, scade: vedi `Expire` in pagina). Il campo `RGICommand` porta una
lista di comandi separati da virgola. Il server risponde con HTML che contiene
tre array JavaScript, ed è lì che stanno i dati:

| Array | Cosa contiene |
|---|---|
| `RGICollection` | contesto della pratica: prodotto, bene, nodo, scadenza sessione |
| `RGIFormSet` | definizione dei campi: nome, tipo, obbligatorio, valori ammessi, codice fattore |
| `RGIRecordSet` | dati e risultati: garanzie, premi, provvigioni, formule |

I campi dei fattori si chiamano `_<idFattore>-<idBene>`. L'`idBene` è negativo
e cambia a ogni pratica: va letto da `RGICollection.IDBENE`, mai scritto fisso.

## Il percorso

| Passo | Form | Comandi | Cosa si compila o si legge |
|---|---|---|---|
| 1. Dati bene | `RGI_FORM_DATIBENEDINAMICO` | `azioniPostDatiBene` → `getListaQuestionariBene` → `getGaranzie` | 8 fattori, tabella sotto |
| 2. Garanzie | `RGI_FORM_SELGAR` | `azioniPostSelezioneUnit` | `CKG2568` Terremoto fabbricato (obbligatoria), `CKG2569` Terremoto contenuto, `CKG2571` Alluvione fabbricato, `CKG2570` Alluvione contenuto |
| 3. Fattori garanzia | `RGI_FORM_DATIBENEDINAMICO` | `fattoriBenePostUnit` | calcolati dal portale: somma assicurata = costo ricostruzione, franchigia 10%, limite indennizzo 80%, forma "Valore intero". Per l'appartamento in più: Piano (`_4269`), Interno (`_543`), Piano (`_1503`) |
| 4. Questionario IDD | `RGI_FORM_QAD` | `questionarioAdeguatezzaDanni` | adeguatezza: va fatta con le risposte vere del cliente |
| 5. Quotazione | `RGI_FORM_QUOTADYNA` | `verificaValiditaDataTariffa` → `azioniPostSelezioneBene` → `dynaQuotazione` | premio, tabella più sotto |

### Fattori del passo 1

| Campo | Codice | Tipo | Valori |
|---|---|---|---|
| `_1665` Costo di ricostruzione a nuovo | 2RIC | numero, 2 decimali | libero |
| `_32` Tipo abitazione | 2TIPAB | lista | 1 Appartamento in condominio · 5 Casa a schiera o villa plurifamiliare · 6 Villa monofamiliare |
| `_53` Proprietà dell'assicurato | 2PASS | lista | 0 No · 1 Sì (bloccato su Sì) |
| `_1504` Dimora | 2DIMOR | lista | 1 Abituale · 2 Saltuaria · 3 Locata a terzi |
| `_4270` Superficie | 2MQL | lista | 1 < 100 mq · 2 100–150 mq · 3 > 150 mq |
| `_4272` Età del fabbricato | 2EFA | lista | 1 < 5 anni · 5 5–15 anni · 6 > 15 anni · 4 Sconosciuta |
| `_645` Piani fuori terra | 3PIAN | intero | libero |
| `_646` Piani seminterrati o interrati | da confermare | intero | libero |

L'indirizzo arriva dall'anagrafica: il portale lo geocodifica e gli assegna una
**cella geografica** (`PaindirizzoCcella`, 13 cifre). È il candidato più
probabile a decidere il tasso.

## Dove si legge il premio (pagina Quotazione)

| Record | Contenuto |
|---|---|
| `SVILUPPO` | la formula: `(SA*((TAS))/1000)+(0)` |
| `COEFFICIENTI` | la formula con i numeri, es. `(150*((0,172))/1000)+(0)`; il tasso è mostrato arrotondato a 3 decimali |
| `QPA` | premio annuo: `RIS` per garanzia, `SEZ`, `TOT`, `RID` (riduzione a carico HDI), `LORDO-RID` |
| `QRF` / `QRS` | rata alla firma / rata successiva |
| `QPVARF` / `QPVARS` | provvigioni |
| segnalazioni | es. «Premio adeguato al valore minimo (Euro 60,00)» |

## La tariffa

```
premio garanzia = somma assicurata × tasso (per mille) / 1000
totale          = max(somma garanzie, 60 €), arrotondato per difetto all'euro
```

Quando scatta il minimo, il portale ripartisce i 60 € tra le garanzie in
proporzione. Quando invece toglie i centesimi dell'arrotondamento, li toglie
dalla prima garanzia (terremoto) e lascia intera l'alluvione. Imponibile e
lordo coincidono.

### Prove fatte (stesso indirizzo, CAP 91025)

| Prova | Tassi letti | Premio | Ripartizione |
|---|---|---|---|
| Base: villa, 150.000 €, 100–150 mq, 5–15 anni, abituale, 2 piani, 0 interrati, solo terremoto | 0,172 | 60,00 (minimo) | 60,00 |
| Base + alluvione fabbricato | 0,172 / 0,1 | 60,00 (minimo) | 37,87 + 22,13 |
| Costo ricostruzione 300.000 € | 0,172 / 0,1 | 81,00 | 50,88 + 30,12 |
| Appartamento · casa a schiera | 0,172 / 0,1 | 60,00 | 37,87 + 22,13 |
| Età < 5 · > 15 · sconosciuta | 0,172 / 0,1 | 60,00 | 37,87 + 22,13 |
| Superficie < 100 · > 150 mq | 0,172 / 0,1 | 60,00 | 37,87 + 22,13 |
| Dimora saltuaria · locata a terzi | 0,172 / 0,1 | 60,00 | 37,87 + 22,13 |
| Piani fuori terra 1 · 5; interrati 1 | 0,172 / 0,1 | 60,00 | 37,87 + 22,13 |

Il CAP 91025 in `tariffe/catastrofali_cap.json` vale `[0.1718, 0.1004]`:
150.000 € → 25,77 + 15,06 = 40,83 → minimo **60 €** (ripartito 37,87 + 22,13);
300.000 € → 51,54 + 30,12 = 81,66 → **81 €**. Sono gli stessi numeri del
portale, centesimi della ripartizione compresi: i tassi veri sono quelli a 4
decimali del nostro file, il portale li mostra arrotondati.

## Cosa resta da fare

1. **Provare altre zone** (CAP diversi) per confermare che il nostro file CAP
   coincide con il portale ovunque, non solo su questo CAP.
2. **Contenuto** (terremoto e alluvione): il portale chiede somme proprie, non
   ancora provate. Il motore locale usa il 20% del fabbricato: da confermare.
3. Codice fattore di `_646`.

## Cose da non sbagliare

- Il questionario IDD (passo 4) è un obbligo verso il cliente: non si compila
  da programma con risposte inventate.
- Nessun dato di sessione, cliente o provvigione in questo repo: è pubblico.
- La strada pulita resta l'API ufficiale (`HDI-API.md`, area `home`): questa
  mappa serve a confrontare i numeri, non a sostituirla.
