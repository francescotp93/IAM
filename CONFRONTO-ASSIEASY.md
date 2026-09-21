# La contabilità di AssiEasy, e che cosa IAM ha già

Letto il 21/09/2026 sul manuale mandato da Francesco (41 pagine, *Manuale uso
contabilità dell'intermediario assicurativo*, SAVE srl). Questo documento
**non copia niente**: mappa le loro funzioni contro quello che IAM ha, e dice
che cosa manca davvero e che cosa non vale la pena rifare.

Dove serviva un numero, è misurato sul database vero di With Us al 21/09/2026.

---

## 1. Il modello: due impianti diversi, e perché non si rincorre il loro

**AssiEasy è una partita doppia vera.** Ogni cosa contabile è un
*sottoconto*, identificato da un codice a tre livelli (mastro / conto /
sottoconto: `06.01.0001` contanti, `4101` + codice agenzia il saldo verso la
compagnia, `4201` + codice produttore il credito verso un collaboratore). Ogni
movimento muove almeno due sottoconti, uno in DARE e uno in AVERE.

**IAM ha un impianto più semplice** (§26, §29): conti con una `natura`
(premi / aziendale) e causali con un `segno` (entrata / uscita) e un flag
`incide_su_utile`. Un movimento muove **un** conto.

> **La frase del loro manuale che spiega tutto il resto:** «quando si incassa
> un premio si è obbligati ad incassarlo esattamente allo stesso importo con
> una o più modalità di pagamento; essendo la contabilità creata in partita
> doppia lo zero è scontato».

Quello zero **non viene dalla partita doppia**: viene dall'obbligo che la
somma delle modalità di pagamento faccia esattamente il premio. È una regola
che IAM può avere **senza** cambiare impianto, ed è il punto 2 qui sotto.

**Proposta: non si passa alla partita doppia.** Vuol dire un piano dei conti
che qualcuno deve mantenere (il loro manuale ci dedica dieci pagine e ripete
«chiedere ad Alessandro» cinque volte), codici numerici a quattro cifre da
generare a mano, e un'assistenza telefonica per non sbagliarli. IAM ha gli id
e non ha bisogno di codificare le cose con dei numeri. Quello che serve è
l'**obbligo di quadratura sull'incasso**, non la doppia scrittura.

---

## 2. Le cinque cose che mancano davvero

In ordine di quanto costa non averle.

### 2.1 L'ABBUONO — e in IAM non esiste proprio

> «L'abbuono è la differenza tra quanto effettivamente percepito e il valore
> del premio da incassare: è passivo (costo) quando ci rimettiamo del denaro,
> è attivo quando si incassa un importo a nostro favore.»

In IAM una rata **o è incassata per intero o non lo è**. Chi incassa 199,50 su
un premio di 200 ha due strade, e sono tutte e due sbagliate: lasciare la rata
aperta per 50 centesimi (e ritrovarsela nei solleciti), o segnarla incassata
(e il conto non torna più, senza che si sappia di quanto).

AssiEasy ne distingue due tipi, e la distinzione è buona:
- **certificato** — si stampa una lettera e la firma il cliente. È verificabile
  sulla carta;
- **di piccoli importi** (i decimali) — non si certifica, ma **si monitora
  ogni giorno**, perché è lì che si nasconde un ammanco spacciato per
  arrotondamento.

**Misurato su With Us:** **zero** colonne e **zero** causali che nominino un
abbuono, in tutto il database. Delle 15 rate incassate, **zero** hanno un
importo diverso dal premio di rata — il che non vuol dire che la differenza
non ci sia mai stata: vuol dire che, quando c'è stata, non è stata registrata
qui.

### 2.2 Il pagamento MULTIPLO su una rata sola

`quote_titoli.mezzo_pagamento` è **uno**. Un cliente che paga 200 con 150 in
contanti e 50 col POS in IAM non si può registrare.

Il loro manuale lo mette fra i vantaggi principali del registrare l'incasso
subito: *«in caso di doppie forme di pagamento (non sono mai presenti nei
flussi) non si debba ricorrere a post-it o a pizzini»*.

È anche la condizione perché la regola dello zero funzioni: senza più
modalità, «la somma dei pagamenti fa il premio» sarebbe un obbligo
impossibile da rispettare.

### 2.3 Le PARTITE NON TECNICHE, e il SALDO VERSO LA COMPAGNIA

Questo è il buco grosso, e sono due facce della stessa cosa.

Sul foglio cassa di una compagnia non ci sono solo i premi. Ci sono le
**rimesse** (quello che l'agenzia versa), i **rappel**, i **contributi**, le
**spese legali**, i **pagamenti sinistri**, gli **storni** di incassi fatti
direttamente in compagnia, gli **adeguamenti** di premi e provvigioni.
AssiEasy le chiama *partite non tecniche* (PNT) e permette di aggiungerle a
mano quando il flusso non le porta.

**IAM legge dal flusso solo anagrafiche, polizze, garanzie e titoli** (§14).
Le righe che non sono premi **non esistono**. Conseguenza:

> **IAM non sa dire quanto l'agenzia deve a una compagnia in questo momento.**
> E per un'agenzia plurimandataria quella è la domanda numero uno: è il numero
> che dice se si può pagare la rimessa.

AssiEasy lo tiene in un sottoconto per ogni codice agenzia (`4101` + codice) e
lo mette nella quadratura di giornata sotto «Saldo Direzione». IAM ha già la
`natura = premi` sui conti, che è metà della strada: manca il saldo **per
compagnia**, e mancano le righe che lo muovono oltre agli incassi.

### 2.4 Lo STATO dell'incasso, e il confronto col flusso

AssiEasy chiama *appunto* un incasso registrato in giornata e lo tiene in tre
stati:

| stato | che cosa vuol dire |
|---|---|
| **APPUNTO** | incassato da noi, il foglio cassa della compagnia non l'ha ancora confermato |
| **OK** | l'abbiamo registrato noi **e** il flusso lo conferma: stesso ramo, stessa polizza, stessa data di effetto, stesso importo |
| **FC** | il flusso lo porta e noi non l'avevamo registrato |
| *in rosso* | c'è, ma l'importo non coincide → nasce un abbuono della differenza |

E il primo punto del loro «iter operazioni contabili» del mattino è: *«Appunti
Incassi — verificare che nella colonna Nota non vi siano segnalazioni in rosso
(devono avere tutte OK)»*.

**IAM importa il flusso e scrive** (§14, §47): non confronta quello che aveva
già con quello che la compagnia dice. Un incasso segnato a mano e poi smentito
dal flusso oggi non lo nota nessuno.

### 2.5 Il giornale per DATA DI SISTEMA

Una funzione piccola e furba: cerca i movimenti la cui **data di creazione è
diversa dalla data del movimento**. Serve a trovare «movimenti creati
nell'ultimo periodo ma relativi a giornate diverse», cioè gli errori di
registrazione e le scritture retroattive.

**IAM può farlo quasi subito:** `iam_movimenti` ha già `data` e `creato_il`, e
il registro dei movimenti (§18) sa chi ha scritto cosa. È una query e una
schermata.

È anche l'altra faccia di una decisione già presa (§42, punto 7): le
quadrature passate **si ricalcolano**, così una scrittura retroattiva fa
smettere di quadrare un giorno che quadrava. Questo giornale dice **quale**
scrittura è stata.

---

## 3. Quello che IAM ha già, e non va rifatto

Scritto perché è la metà del valore di questa lettura: non ricostruire quello
che c'è.

| funzione di AssiEasy | in IAM |
|---|---|
| Piano dei conti (i contenitori del denaro) | `iam_conti` — Strumenti › Conti e causali (§26) |
| Causali contabili con conti proposti | `iam_causali`, con `segno` e `incide_su_utile` (§26) |
| Registrazione movimenti (la loro prima nota) | Contabilità › Prima nota (§29) |
| Saldo **calcolato** e non memorizzato | è una regola dichiarata: non esiste una colonna `saldo` (§26) |
| Forzatura del saldo iniziale, con data e utente | `saldo_iniziale` + `saldo_dichiarato_il` (§43) |
| Quadratura di giornata (dichiarato vs realtà) | Contabilità › Quadratura conti, con tre stati e il grigio (§29) |
| Estratto conto di un conto, con saldo iniziale/periodo/finale | `Contabilita.dettaglioConto` (§42) |
| Sospesi: il denaro incassato che non è ancora arrivato | Contabilità › Incassi da accreditare (§32) |
| **Fido** sul sospeso, con segnalazione del superamento | sulla persona, non sul conto (§41) |
| Modalità di pagamento come proprietà del conto | `iam_conti.mezzi` (§32) — e dal 21/09 il vocabolario è uno solo (§53) |
| Incasso di più titoli con un movimento solo | selezione multipla nella pagina Titoli (§17) |
| Profilazione degli utenti per la contabilità | ruoli e permessi IAM (§10, §26: legge lo staff, scrive l'admin) |
| Export dei movimenti in CSV/Excel | c'è su tutte le liste |

**Una nota sul nome «sospeso».** AssiEasy lo usa per *«un titolo messo a
foglio cassa per la compagnia ma dove la vostra azienda non ha ancora ricevuto
il denaro»* — cioè il credito verso il cliente o il collaboratore. IAM ha
evitato quella parola per la sua tabella **apposta** (§32): lì `iam_sospesi`
sono gli incassi *già ricevuti dal cliente* e non ancora accreditati sul
conto. **Sono due cose opposte**, e il fatto che il manuale confermi il primo
significato dice che la scelta di non chiamarli così era giusta. *Nel confronto
con Francesco vale la pena usare le due parole per esteso, non la sigla.*

---

## 4. Quello che NON vale la pena copiare

- **Il piano dei conti a tre livelli con codici numerici.** `4101` + le ultime
  quattro cifre del codice agenzia, `4201` + quelle del codice produttore, e
  tutto un capitolo su che cosa fare quando quei codici non sono numerici o si
  ripetono fra due compagnie. È un modello nato quando i database non avevano
  gli id: IAM ha gli id, e §19 ha già risolto «lo stesso codice per due
  persone» con la coppia compagnia+codice.
- **L'export al gestionale del commercialista** (codice esterno, «da
  raggruppare», «non esportare» su ogni sottoconto). Serve a chi è in
  contabilità ordinaria; è un lavoro a sé e va deciso, non dedotto.
- **La partita doppia completa**, per quanto scritto al punto 1.
- **I quattro «livelli» di adozione.** È un modo di vendere il prodotto per
  gradi; IAM non ne ha bisogno.

---

## 5. Una cosa piccola che conviene prendere subito

La quadratura di giornata di AssiEasy raggruppa i conti in **tre totali**, e i
tre nomi sono utili:

| totale | che cosa dice |
|---|---|
| **Finanziario** | il denaro disponibile subito (contanti, assegni, banca). *«Quanta liquidità è presente in azienda, al fine di valutare, in pagamento rimessa, se tale importo sia congruo»* |
| **Economico** | l'esposizione: i sospesi, cioè quanto c'è da recuperare |
| **Saldo Direzione** | il debito/credito verso le compagnie e le collaborazioni |

IAM ha già `natura` (premi / aziendale) e `tipologia` (banca / cassa /
conto_assicurativo / altro): **il primo dei tre si ricava già**, il secondo
esiste come «incassi da accreditare» ma non è sommato accanto agli altri, il
terzo è il punto 2.3.

E la regola che ci sta sotto vale più dei tre nomi:

> **«Carta canta.»** Il contante deve fare la somma di quello che c'è nel
> cassetto; gli assegni, gli assegni nel cassetto; la banca, il saldo
> dell'estratto conto. Un conto che non si può verificare sulla carta non si
> mette in quadratura.

È la stessa cosa che IAM dice col grigio del semaforo (§33) — *«non si può
dire»* — vista dall'altro lato: **non tutti i conti vanno quadrati, solo
quelli che hanno una carta contro cui confrontarli.** `iam_conti` non ha un
campo che lo dichiari; oggi si quadra tutto.

---

## 6. Le domande per Francesco

Nessuna di queste si può decidere leggendo il codice.

1. **Gli abbuoni si fanno, in agenzia?** E se sì, si distingue fra quelli
   certificati (con la lettera firmata dal cliente) e i decimali? È il pezzo
   che manca di più, ma la forma giusta dipende da come si lavora.
2. **Il saldo verso la compagnia serve per tutte, o solo per quelle con cui
   c'è una rimessa periodica?** Misurato: **tre** compagnie hanno polizze in
   portafoglio (PRIMA, HDI, Allianz) e nove sono in anagrafica. Da questo
   dipende se le partite non tecniche vanno importate dal flusso, inserite a
   mano, o tutte e due.
3. **Chi paga direttamente in compagnia** (POS di direzione, RID, bonifico
   alla compagnia) succede? AssiEasy ci dedica due sottoconti apposta, e il
   loro controllo del mattino è che quel saldo sia **zero**.
4. **Il pagamento multiplo su una rata sola capita spesso?** Se sì è il primo
   da fare, perché è anche la condizione della regola dello zero.
5. **La contabilità dell'agenzia è ordinaria o semplificata?** Decide se
   l'export al commercialista ha senso.

---

## 7. Che cosa NON è stato fatto

Questo documento è una lettura e un confronto: **nessuna riga di codice,
nessuna migrazione, nessuna decisione applicata.** Le cinque mancanze del §2
sono lavori veri, ognuno con la sua misura da fare prima di scrivere, e vanno
presi uno alla volta — nell'ordine che decide Francesco, non in quello in cui
sono elencati qui.
