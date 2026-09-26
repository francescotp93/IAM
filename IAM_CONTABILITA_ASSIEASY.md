# La contabilità di IAM, misurata contro il manuale di AssiEasy

> **26/09/2026.** Francesco ha portato il *Manuale uso contabilità* di
> AssiEasy (44 pagine) e ha chiesto: «non riusciamo a prendere totalmente
> spunto da questo file ed a implementare quello che ad oggi non
> funziona?».
>
> Questo documento è la risposta operativa. Non è un riassunto del
> manuale: è la **sovrapposizione** fra quello che il manuale prescrive e
> quello che IAM ha davvero in archivio oggi, misurato tabella per
> tabella. Serve a non rileggere 44 pagine ogni volta, e a sapere in che
> ordine muoversi.
>
> Dove scrivo «vuota» o «zero righe», l'ho contato. Dove non l'ho potuto
> contare, lo dico.

---

## La scoperta che cambia il quadro

**IAM è già costruito su questo modello.** Non ci somiglia per caso:
`iam_conti` ha esattamente le «prerogative» che il manuale elenca —
`e_mezzo_pagamento`, `e_conto_sospeso`, `e_quadrabile`, `natura` — e
`iam_causali` ha il `genere` con i valori `apertura_credito` e
`recupero_credito`, che sono il ciclo del sospeso del manuale.

Il motore `contabilita.js` (3.500 righe, suite 138/138 verde) sa già fare
la partita doppia, gli storni, i saldi, il conto economico, i sospesi
aperti, la quadratura conto per conto.

**Quello che manca non è l'impianto: è il carburante e tre schermate.**

| | quante righe in archivio |
|---|--:|
| `iam_conti` | 8 |
| `iam_causali` | 14 |
| `iam_movimenti` | **6, e nessuna uscita** |
| `iam_sospesi` | **0** |
| `iam_incassi` / `_rate` / `_pagamenti` | **0 · 0 · 0** |
| `sessioni_giornaliere` (il foglio cassa a mano) | 68 giornate |
| `quote_titoli` con incasso vero | 2.799 |

L'incasso vero vive in `quote_titoli.incassato_il`. Le tabelle della
contabilità di IAM sono vuote perché **nessuno ha mai registrato un
movimento dall'app**: manca il gesto quotidiano, non la regola.

---

## Il modello del manuale, in una pagina

Il manuale è costruito attorno a una frase, che sta nel capitolo 1:

> «Quando si incassa un premio si è obbligati ad incassarlo esattamente
> allo stesso importo con una o più modalità di pagamento; essendo la
> contabilità creata in partita doppia, lo zero è scontato.»

E a una verifica, che chiama **«Carta canta»**:

| conto | contro che cosa si verifica |
|---|---|
| Contante | i soldi nel cassetto |
| Assegni | gli assegni nel cassetto |
| Banca | il saldo dell'estratto conto |
| Posta | il saldo del conto postale |
| Abbuoni certificati | le ricevute firmate dal cliente |
| Saldo compagnia | il foglio cassa della compagnia |

Più due numeri in cima alla quadratura, che sono le due domande vere:

- **Saldo Finanziario** = liquidità di agenzia − debito verso le
  compagnie. *«Riesco a pagare quello che devo rimettere?»*
- **Saldo Economico** = Saldo Finanziario + premi sospesi. *«Quanto
  guadagno se incasso tutti i sospesi?»*

---

## Processo per processo

### 2A · Appunti incassi — **il cuore, e il pezzo che oggi manca**

Il manuale: ogni incasso registrato in giornata assume uno **stato**, e
la regola operativa del mattino è una riga sola —

> «Verificare che in Appunti Incassi non vi siano segnalazioni in rosso
> (devono avere tutte OK) e sanare eventuali differenze.»

Gli stati sono quattro:

| stato | vuol dire |
|---|---|
| **APPUNTO** | l'abbiamo registrato noi, sul foglio cassa della compagnia non c'è ancora |
| **OK** | c'è da entrambe le parti e gli importi coincidono |
| **SCOSTAMENTO** | c'è da entrambe le parti, importi diversi → si genera un **abbuono** per la differenza |
| **FC** | sul foglio cassa della compagnia, da noi non trova appunto (polizza o effetto diversi, o incasso fatto in direzione) |

**Stato in IAM:** il motore `contabilita-giornaliera.js` costruiva già le
righe della giornata nella forma esatta del manuale (compagnia, data,
nominativo, ramo, polizza, effetto, mezzo, produttore, importo,
provvigione) — **ma senza stato**. Finché un incasso non ha uno stato,
quella frase del mattino non si può eseguire, e un incasso che la
compagnia non ha visto è una copertura che il cliente crede di avere.

**Fatto il 26/09/2026:** `statoAppunto` e `abbinaFoglio` nel motore, con
l'abbuono e il suo verso (passivo = ci rimettiamo, costo; attivo =
eccedenza, ricavo — nel manuale sono due conti diversi). Suite
`appunti-incassi` 22/22, controprova **16 sabotaggi su 16 presi**.

**Resta da fare:** la schermata. Il motore dice lo stato e quale abbuono
servirebbe; scrivere la scrittura contabile è un gesto che vuole una
persona davanti.

### 2B · Registrazione movimenti (prima nota)

Il manuale: i movimenti **non** assicurativi (versamenti in banca, costi,
prelievi) si registrano scegliendo una **causale**, che propone da sé i
conti in DARE e in AVERE.

**Stato in IAM:** la prima nota c'è e le causali ci sono (14).
🔴 **Ma `conto_entrata_id` e `conto_uscita_id` sono NULL su tutte e
quattordici.** Le causali non sanno su quali conti scrivere, quindi la
partita doppia non si genera da sé: è il singolo anello che tiene ferma
tutta la catena. `iam_movimenti` ha 6 righe e nessuna uscita.

### 2C · Gestione sospesi — la regola più severa del manuale

> «Il sospeso può essere chiuso **solo se incassato con modalità di
> pagamento diversa da sospeso**; **non è possibile eliminarlo**. Il
> sospeso chiuso non viene eliminato fisicamente ed è sempre possibile
> consultarlo.»

**Stato in IAM:** `iam_conti` non ha **nessun** conto con
`e_conto_sospeso = true`, e `iam_sospesi` è **vuota**. Le due causali
(`apertura_sospeso`, `recupero_sospeso`) esistono e non hanno un conto su
cui atterrare: è come avere il verbo senza il soggetto.

Il motore sa già calcolare `sospesiAperti` e `riepilogoSospesi`.

### 2E · Quadratura di giornata

Il manuale: i saldi dei conti «carta canta» a una data, più i due numeri
(Finanziario ed Economico).

**Stato in IAM:** la quadratura conto per conto (ricostruito contro
dichiarato, con la differenza) **c'è ed è provata**. Il cruscotto mostra
già i tre ingredienti separati — «Premi dei clienti», «Soldi
dell'agenzia», «Premi da rimettere».
🟡 **Manca la sottrazione**: nessuno risponde alla domanda «riesco a
pagare il debito verso le compagnie?», e il Saldo Economico non esiste.

### 3 · Tenere allineato il foglio cassa di compagnia

Il manuale: il saldo del periodo in AssiEasy deve essere **identico** a
quello sul foglio cassa della compagnia. Nei flussi automatici i premi ci
sono sempre, ma **le partite non tecniche spesso no** — rimesse, rappel,
contributi, spese legali, storni fatti in compagnia, adeguamenti,
pagamenti sinistri. Quelle vanno inserite a mano («Partite Varie»),
altrimenti il saldo non tornerà mai.

**Stato in IAM:** il Foglio cassa esiste in QUOTO (e dal 26/09 ha la sua
voce in Contabilità), e legge le rate incassate.
🔴 **Non c'è modo di inserire una partita non tecnica.** Senza quello,
l'allineamento col foglio cassa della compagnia è impossibile per
costruzione: mancherà sempre la differenza delle PNT.

### 4A · Piano dei conti — **la decisione che è di Francesco**

Il manuale dedica dodici pagine alle «prerogative» dei sottoconti, e sono
le stesse colonne che IAM ha già. Quello che il manuale prescrive e che
in archivio **non c'è**:

| conto | prerogative (dal manuale) | c'è? |
|---|---|:--:|
| Cassa contanti | mezzo di pagamento · finanziario · in quadratura | ✅ |
| **Assegni** | mezzo di pagamento · finanziario · in quadratura | ❌ |
| Banca | mezzo di pagamento · finanziario · in quadratura | 🟡 c'è ma non è mezzo di pagamento |
| **POS / bancomat** | il manuale consiglia di gestirlo **come sospeso** (l'accredito arriva giorni dopo) | ❌ |
| **Sospesi di agenzia** | mezzo di pagamento · **sospeso** | ❌ |
| **Sospesi per collaboratore** | mezzo di pagamento · sospeso | ❌ |
| **Debito verso compagnia** (uno per compagnia) | saldo direzione · in quadratura | ❌ |
| **Abbuoni passivi** (costo) | mezzo di pagamento · abbuono | ❌ |
| **Abbuoni attivi / eccedenze** (ricavo) | mezzo di pagamento · abbuono | ❌ |
| **Partite varie** | mezzo di pagamento · in quadratura | ❌ |
| Provvigioni attive (ricavo) | — | 🟡 c'è come «Ricavi di agenzia», non distinto |
| Provvigioni passive (costo) | — | 🟡 c'è come «Costi di agenzia», non distinto |

**Questa è la cosa che non decido io**, ed è l'unica di tutto il
documento: quanti cassetti contante tenere, quali banche, se il POS va
trattato come sospeso, se i sospesi si tengono globali o uno per
collaboratore. Il manuale stesso dice che «dipende dalla struttura e
dalla consuetudine aziendale». Sono scelte contabili dell'agenzia, non
scelte tecniche, e scriverle io vorrebbe dire decidere al posto suo come
si tiene la cassa.

Appena Francesco risponde, i conti si creano in una migrazione additiva e
le causali si agganciano ai conti.

### Quello che il manuale tratta e che qui NON serve ora

- **2D · Fatture e proforma** — consulenze e fatturazione elettronica. È
  un modulo a sé, il manuale stesso lo rimanda a un altro documento.
- **2G / 2H · Stampe e giornale contabile** — servono quando i movimenti
  ci sono. Oggi sono 6.
- **5 · Passaggio dati al commercialista** (livello 3) — ha senso dopo che
  i livelli 1 e 2 girano.
- **Costi e ricavi dettagliati** (livello 4) — il manuale stesso lo mette
  per ultimo.

---

## In che ordine muoversi

| # | cosa | perché prima di altro | chi decide |
|---|---|---|---|
| 1 | **Il piano dei conti** del manuale | senza i conti, sospesi e abbuoni non hanno dove atterrare, e le causali restano senza contropartita | **Francesco** |
| 2 | Agganciare le 14 causali ai conti | è l'anello che fa generare la partita doppia da sé | tecnico |
| 3 | La schermata **Appunti incassi** con i quattro stati | è il gesto quotidiano che riempie tutto il resto | tecnico |
| 4 | Le **partite non tecniche** sul foglio cassa | senza, il saldo con la compagnia non torna per costruzione | tecnico |
| 5 | **Saldo Finanziario ed Economico** in quadratura | i tre ingredienti ci sono già, manca la sottrazione | tecnico |
| 6 | Il **ciclo del sospeso** (apri, non cancellare, chiudi solo incassando) | il motore sa calcolarli, manca il gesto | tecnico |

---

## Il modello operativo, da mettere in IAM come lista

Il capitolo 6 del manuale è una checklist. Vale la pena averla **dentro**
l'app, non in un PDF: è la differenza fra una procedura che si segue e
una che si dimentica.

**Al mattino**
- i flussi contabili delle compagnie sono stati importati?
- in Appunti incassi **nessuna riga in rosso** (tutte OK)
- saldo compagnia = foglio cassa · contanti · assegni · banca
- POS direzione e incassi direzione = zero · partite varie = zero

**Durante la giornata**
- incassare le posizioni in Appunti incassi
- recuperare i sospesi di agenzia e dei collaboratori
- registrare gli altri movimenti (versamenti, costi)

**Alla chiusura serale**
- il totale degli appunti = colonna premi del report giornaliero della
  compagnia
- contanti, assegni, banca
- **gli abbuoni del giorno non devono avere valori elevati** — è lì che si
  nascondono gli ammanchi
