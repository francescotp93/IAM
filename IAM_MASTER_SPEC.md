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

## 6. La decisione che non posso prendere io

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

**La mia raccomandazione è (b)**, e poi (c) per la scheda cliente. Il
motivo non è la comodità: è che (a) rimanderebbe di mesi ogni altro
lavoro su un file da 33.000 righe, e i moduli che servono davvero — Prima,
i sospesi, la documentazione — non aspettano.

*Questa decisione resta aperta finché Francesco non risponde. Nel
frattempo si lavora su P0 e P1, che non dipendono da essa.*

---

## 7. Che cosa NON è la prima milestone

Non sono automazioni, WhatsApp, email automatiche, AI, scoring, campagne
automatiche, report avanzati, altre compagnie. Vengono dopo, e solo
quando i dieci moduli reggono un giorno di lavoro vero.
