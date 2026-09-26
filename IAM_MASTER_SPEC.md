# IAM — Che cosa deve essere

> **25/09/2026.** Questo documento dice *che cosa* IAM deve fare e
> secondo quali regole. Non dice *come*: quello sta in
> `IAM_ARCHITECTURE.md`. Non dice *a che punto siamo*: quello sta in
> `IAM_STATUS.md`.
>
> È scritto per Francesco, non per un programmatore. Se una riga non si
> capisce leggendola a voce, è scritta male.

---

## 1. A che cosa serve

IAM è il **gestionale centrale di With Us Assicurazioni**: il posto da
cui l'agenzia lavora tutti i giorni.

Non è un insieme di funzioni. La prova che funziona non è che le
schermate esistono: è che **un collaboratore ci lavora dentro una
giornata intera senza aprire altro**.

Due cose lo distinguono da un gestionale qualunque, e sono le due che
valgono di più:

1. **Un portafoglio solo, più compagnie.** HDI e Prima (e domani altre)
   devono stare nello stesso archivio, con la stessa scheda cliente. Se
   un cliente ha l'auto con Prima e la casa con HDI, deve vedersi in una
   riga sola.
2. **Il portafoglio si lavora commercialmente.** Non è un archivio da
   consultare: è la materia prima delle campagne.

---

## 2. Le domande a cui deve saper rispondere

Sono il modo migliore per dire cosa deve fare, perché sono verificabili:
o la risposta esce, o non esce.

- Clienti che hanno l'auto ma non la casa
- Clienti HDI con RCA ma senza infortuni
- Clienti Prima in scadenza nei prossimi 30 giorni
- Clienti fra 30 e 50 anni potenzialmente interessati al fondo pensione
- Intermediari con polizze a documentazione mancante
- Clienti di un comune, di una provincia, di una fascia di premio
- Clienti di uno specifico intermediario
- Clienti senza previdenza · auto senza TCM · auto senza infortuni

**Requisito che ne discende**: la segmentazione deve poter incrociare
compagnia, prodotto, ramo, età, comune, provincia, scadenza, premio,
intermediario, e la **presenza o assenza** di un prodotto. L'assenza è
la parte difficile e la più preziosa: è lì che sta la vendita.

---

## 3. I moduli, e che cosa vuol dire «fatto» per ciascuno

Una funzione è fatta quando **un utente vero completa il flusso
dall'inizio alla fine e il dato si ritrova in archivio il giorno dopo**.
Non quando il codice esiste.

| modulo | è fatto quando |
|---|---|
| **Clienti** | si crea, si modifica, si cerca; codice fiscale, contatti e consensi sono validati; la scheda mostra tutte le polizze del cliente, di qualunque compagnia |
| **Polizze** | si inserisce e si modifica con compagnia, ramo, prodotto, premio, decorrenza, scadenza, stato, cliente, intermediario; rinnovo e annullamento sono operazioni vere, non campi |
| **Portafoglio** | HDI e Prima convivono; la vista unificata del cliente esiste |
| **Scadenze** | 7 / 30 / 60 / 90 giorni, scadute, rinnovate, non rinnovate — e da lì si agisce |
| **Intermediari** | anagrafica, portafoglio assegnato, produzione, documentazione, documenti mancanti, stato pratiche, avvisi |
| **Documentazione** | si vede a colpo d'occhio cosa c'è, cosa manca, cosa è scaduto, quali pratiche sono incomplete |
| **Contabilità** | vedi § 4 |
| **Sinistri** | apertura, stato, controparti, partite |
| **CRM** | trattative, lead, attività, note, promemoria, follow-up, stato, operatore assegnato |
| **Marketing** | i segmenti del § 2 si producono e si esportano |

---

## 4. Contabilità — le regole, scritte una volta

È la parte dove un errore non dà errore: esce un numero credibile e
qualcuno ci chiude la giornata sopra. Quindi le regole stanno scritte.

**R1 — Lo stato di pagamento di una rata lo decide il movimento
contabile della compagnia, non un'etichetta.** Tre stati:

- `incassato` — la compagnia ha registrato l'incasso. Ci sono i soldi.
- `sospeso` — il cliente è coperto ma il premio non è saldato. È un
  **credito**, non un «non pagato».
- `da incassare` — la compagnia non dice niente. Non si inventa.

**R2 — Se la compagnia dichiara «pagato» ma non manda l'incasso**, non è
né incassato (i soldi non si sono visti) né sospeso (non è un credito
dell'agenzia): resta da incassare, **e la riga si marca**. Una casella
storta che si vede è un problema; nascosta in un totale diventa un
numero.

**R3 — La mano di Francesco vince sempre sul flusso.** Il flusso può
riempire un buco, mai smentire una persona. Quando è in disaccordo lo
dice, non lo tace.

**R4 — Una polizza segue le sue rate**, e **un solo sospeso la rende
sospesa**: è il caso da guardare, e una maggioranza lo nasconderebbe.

**R5 — I sospesi non si sommano agli incassi.** Sono soldi entrati oggi
per polizze di prima; gli incassi sono soldi entrati oggi per polizze di
oggi. La cassa del giorno è la somma delle due, non un ricalcolo.

**R6 — Una spesa senza mezzo di pagamento non si toglie da nessuna
colonna.** Se oggi sono entrati 100 € in contanti e ne sono usciti 30,
in cassa ce ne sono 70 — ma **solo se si sa** che quei 30 sono usciti dal
contante e non dal POS. Toglierli dal contante «perché di solito è così»
farebbe quadrare un cassetto che non quadra. La spesa senza mezzo esce a
parte e si dichiara.

**R7 — Zero e «non si sa» sono due cose diverse.** Zero vuol dire che non
è entrato niente; vuoto vuol dire che nessuno l'ha scritto. Confonderli
fa quadrare i conti per sbaglio.

**R8 — Quando manca una fonte esterna, si pubblica il meno, non il più.**
Una casella vuota è una casella vuota; un numero sbagliato è un numero, e
i numeri si credono.

---

## 4bis. La contabilità giornaliera — definizione ufficiale

> Definita il 26/09/2026 su richiesta di Francesco. Il motore c'è ed è
> provato (39/39); questa è la definizione di che cosa deve mostrare e
> con quali regole, perché finora stava solo nel codice.

### Che cos'è, e che cosa NON è

La contabilità giornaliera risponde a **una domanda sola**: *in questa
giornata, che cosa è passato dal cassetto dell'agenzia?*

Non è il portafoglio e non è la produzione. Il **Foglio cassa**, che sta
nel Portafoglio, guarda le RATE INCASSATE e la provvigione che ne resta
all'agenzia: è una domanda sulla produzione. La contabilità giornaliera
guarda i SOLDI che sono entrati e usciti oggi. Due domande diverse sugli
stessi giorni — e per questo vivono in due motori separati
(`contabilita-giornaliera.js` e `foglio-cassa.js`), che non si
accorpano.

### Le tre colonne della giornata

**1 · Gli incassi del giorno.** Le rate di polizza incassate oggi,
divise per mezzo di pagamento (contante, POS, bonifico, carta,
prepagata, assegno, PayPal, domiciliazione, altro). Al netto delle
sospese: una rata appoggiata al sospeso di un collaboratore **non è
entrata in cassa**, è un pagamento da perfezionare, e si mostra a parte.

**2 · I sospesi incassati oggi.** Soldi entrati oggi per polizze di
prima. **Non si sommano agli incassi** (R5): si affiancano. La cassa del
giorno è la somma delle due, non un ricalcolo.

**3 · Le spese del giorno.** Con il loro mezzo di pagamento. Se oggi
sono entrati 100 € in contanti e ne sono usciti 30 in contanti, nel
cassetto ce ne sono 70 — ma **solo se si sa** che quei 30 sono usciti
dal contante (R6). Una spesa senza mezzo esce a parte e si dichiara:
non si toglie da nessuna colonna.

### Che cosa deve mostrare la schermata

- Il **saldo per ogni mezzo**: entrato, uscito, quel che resta.
- Il **totale della giornata**: incassi netti + sospesi incassati −
  spese.
- L'elenco delle righe che compongono ciascun numero, apribile.
- Gli **avvisi**, in evidenza e non in fondo: pagamenti che non si
  riescono ad attribuire, spese senza mezzo, rate appoggiate a un
  sospeso.

### Le regole che valgono qui e non si negoziano

- **R5, R6, R7, R8** della sezione 4 valgono tutte.
- **Una giornata senza dati non è una giornata a zero.** Se per quel
  giorno non c'è niente in archivio, la schermata lo dice; non mostra
  «0,00 €», che vuol dire un'altra cosa.
- **La finestra è il giorno registrato, non il giorno di calendario.**
  Se fra due registrazioni ci sono tre giorni, quello che si vede
  riguarda tre giorni, e va detto accanto al numero.

### Lo stato di oggi, detto con onestà

Il motore sa fare tutto questo ed è verde. **Le tabelle dove dovrebbe
leggere sono quasi vuote**: `iam_sospesi` a zero, `iam_incassi_rate` a
zero, `iam_movimenti` sei righe e nessuna uscita. Le spese vivono come
numero unico in `sessioni_giornaliere` (22 giorni su 68) **senza il
mezzo di pagamento**, quindi la regola R6 oggi non può togliere niente
da nessuna colonna.

Finché è così, la schermata mostrerà correttamente **gli incassi** (che
hanno dati veri: 2.799 rate) e dichiarerà vuote le altre due colonne.
Riempirle richiede registrare i movimenti dall'app — è lavoro di
processo, non di codice.

### Dove sta, nel menu

Dentro **Contabilità**, accanto agli altri pannelli. E accanto le va
una **voce «Foglio cassa» dedicata**: oggi il foglio cassa vive solo nel
Portafoglio, e chi lavora in contabilità non lo trova. Sono due domande
diverse ma le fa la stessa persona nella stessa mezz'ora.

---

## 4ter. Le polizze attive, i clienti persi, i tipi di titolo

> Definito il 26/09/2026. Sono tre definizioni che si tengono per mano:
> senza la prima non esiste la seconda, e la terza dice *quando* è
> successo.

### Una polizza è ATTIVA quando

**copre il cliente adesso.** Cioè: la data di scadenza non è passata
**e** la polizza non è annullata.

Non basta la data. In archivio ci sono **34 polizze annullate che
scadono in futuro**: contarle fra le attive vorrebbe dire credere di
avere un cliente coperto che non lo è.

> Misurato il 26/09/2026: **2.332 polizze attive** su 4.097. Le altre:
> 1.731 scadute, 34 annullate ma ancora in data.

**Le polizze che interessano sono quelle attive.** Portafoglio,
scadenzario, produzione, ricerche: se non è detto altrimenti, si
guardano le attive.

**Quelle non attive non si buttano e non si nascondono**: vanno in una
**sezione dedicata della scheda cliente**, con il perché e il quando —
scaduta il…, annullata il… e con quale motivo. È la storia del cliente,
e serve a richiamarlo.

### Un cliente è PERSO quando

**aveva almeno una polizza e adesso non ne ha nessuna attiva.**

Le due metà contano tutte e due. Chi non ha **mai** avuto una polizza
non è perso: è un contatto, e confonderli farebbe sembrare un fallimento
quello che è solo un preventivo mai chiuso.

> Misurato il 26/09/2026: **564 clienti persi**, il 22% di chi ha avuto
> almeno una polizza. E **58 anagrafiche non hanno mai avuto una
> polizza**: quelle NON sono perse.

**Si vedono in rosso**, in elenco e sulla scheda. Non è un vezzo: è
l'unica cosa che distingue a colpo d'occhio un cliente da richiamare da
uno che è già coperto.

### Quando l'abbiamo perso — la data

È **il giorno in cui l'ultima polizza attiva ha smesso di coprirlo**:

- polizza **scaduta** → la sua data di scadenza;
- polizza **annullata** → la data di annullamento (sta in
  `dati.ssf.data_annullamento`, con il motivo dello storno), **non** la
  scadenza: le due possono distare mesi.

Serve a rispondere a «chi ho perso fra marzo e giugno», che è la domanda
con cui si organizza una telefonata.

### Perso al rinnovo — la distinzione commerciale

Un cliente può sparire in due modi molto diversi:

- **non ha rinnovato**: c'era una **quietanza di rinnovo (QR)** e non è
  stata incassata. È il caso che si recupera con una telefonata, ed è
  quello che Francesco vuole poter filtrare.
- **se n'è andato prima**: la polizza è stata annullata in corso
  d'anno. È un'altra conversazione.

Il filtro nel CRM deve distinguerli, e deve accettare un intervallo di
date.

### I tipi di titolo — il vocabolario dell'agenzia

| sigla | che cos'è |
|---|---|
| **NP** | Nuova polizza |
| **QR** | Quietanza di rinnovo |
| **QF** | Quietanza di frazionamento |
| **AP** | Appendice |
| **SO** | Sostituzione |

**Perché serve, e che cosa si perde oggi.** La colonna `quote_titoli.tipo`
ne ammette quattro — `prima_rata`, `rata`, `quietanza`, `appendice` — e
i lettori ci schiacciano dentro cinque cose:

```
NP  nuova polizza            → prima_rata
SO  sostituzione             → prima_rata   ← si perde la distinzione
QR  quietanza di rinnovo     → quietanza
QF  quietanza di frazionamento → rata
AP  appendice                → appendice
```

`NP` e `SO` finiscono nello stesso valore: fra sei mesi `prima_rata` non
racconta più che era una sostituzione. E senza distinguere `QR` da `QF`
non si può dire «non ha rinnovato»: una quietanza di frazionamento non
incassata è una rata scoperta, non un cliente perso.

**La sigla si aggiunge, non si sostituisce.** `tipo` resta com'è — ci
sono schermate che lo leggono — e la sigla vive in una colonna nuova e
nullable. Le righe di prima restano senza: vuoto vuol dire «nessuno
l'ha ancora detto», non «nuova polizza».

---

## 5. Le regole di casa che valgono ovunque

- **Niente esce senza conferma**: email, campagne, SMS, post. Sempre
  bozza → conferma → invio.
- **I dati dei clienti non escono dall'agenzia**: non finiscono in
  ricerche sul web né in servizi esterni. I file veri delle compagnie
  non si mettono sotto controllo versione.
- **Non si cancellano dati reali.** Una cancellazione si prepara, si
  mostra che cosa se ne andrebbe, e si aspetta.
- **Un numero di soldi si verifica contro una fonte che non abbiamo
  scritto noi** — il foglio della compagnia, un estratto conto.

---

## 6. La decisione, presa il 25/09/2026

**Oggi «IAM» sono due applicazioni separate.** Sette dei dieci moduli
della prima milestone — clienti, polizze, portafoglio, HDI, Prima,
scadenze, documentazione — vivono in **QUOTO** (`index.html`); in IAM
ci sono contabilità, intermediari e CRM. Il dettaglio sta in
`IAM_ARCHITECTURE.md` § 1.

Questo cambia il comportamento funzionale del prodotto, quindi la scelta
è di Francesco. Tre strade:

**(a) IAM assorbe il portafoglio.** Clienti, polizze, scadenze,
documentazione si spostano dentro IAM; QUOTO resta il quotatore. Un solo
posto da cui si lavora. È la più onerosa: sono migliaia di righe da
muovere fra due file già enormi, con rischio di regressione alto.

**(b) «IAM» diventa il nome dell'insieme**, con due moduli — il
portafoglio (oggi QUOTO) e la gestione (oggi IAM) — un menu comune e la
sessione già condivisa. Poco lavoro, nessuna regressione, e la frase «il
gestionale centrale» diventa vera dal punto di vista di chi lo usa.

**(c) Si sposta solo il minimo**: la scheda cliente unificata e le
scadenze dentro IAM, il resto dov'è. Via di mezzo.

### ▶ Francesco ha scelto la (b): un nome solo, due moduli.

Quindi, e da qui in avanti vale questo:

- **«IAM» è il nome dell'intero gestionale**, non di una delle due
  applicazioni. Chi ci lavora deve vedere un prodotto solo.
- Dentro ci sono due moduli: **Portafoglio** (oggi `index.html`, con
  clienti, polizze, scadenze, documentazione, CRM·Analisi, foglio cassa,
  importazione flussi) e **Gestione** (oggi `iam/index.html`, con
  contabilità, intermediari, KPI, work diary).
- Serve **un menu comune** che passi dall'uno all'altro senza far
  ricaricare l'identità: la sessione è già condivisa, quindi è lavoro di
  navigazione, non di autenticazione.
- **Non si spostano pagine fra i due file.** È la ragione della scelta:
  muovere migliaia di righe fra due monoliti rimanderebbe di mesi Prima,
  i sospesi e la documentazione, che sono le cose che servono davvero.
- La scheda cliente unificata — tutte le polizze di tutte le compagnie
  in una riga — resta il pezzo che vale di più, e si fa **dentro il
  modulo Portafoglio**, dove i dati già stanno.

Scartate: **(a)** IAM assorbe il portafoglio (migliaia di righe da
muovere, rischio di regressione alto); **(c)** spostare solo scheda
cliente e scadenze (metà del costo di (a) per un terzo del beneficio,
e lascia il prodotto diviso lo stesso).

---

## 7. Che cosa NON è la prima milestone

Non sono automazioni, WhatsApp, email automatiche, AI, scoring, campagne
automatiche, report avanzati, altre compagnie. Vengono dopo, e solo
quando i dieci moduli reggono un giorno di lavoro vero.
