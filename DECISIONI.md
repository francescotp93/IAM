# Decisioni prese senza chiedere

Le scelte fatte in autonomia, con il motivo e come si torna indietro.
Il dettaglio tecnico sta in `CLAUDE.md`, paragrafo per paragrafo: qui c'è
soltanto quello che Francesco potrebbe voler ribaltare.

---

## 21/09/2026 — Volumi di portafoglio e produzione (0.15.0)

**Perimetro:** il confronto anno su anno in Scrivania e la schermata Produzione.

🔴 **Applicato al database, con autorizzazione esplicita.**
`20260921_produzione_collaboratore.sql`: una colonna nuova su `quote_polizze`
(`collaboratore_id`), due indici, una vista e una funzione di sola lettura, più
le righe di evidenza dei sedici codici produttore (`deciso = false`, nessuna
persona). Nessuna riga esistente riscritta, nessun valore inventato.
*Come tornare indietro:* il blocco ROLLBACK è in testa al file di migrazione.

🟡 **La colonna sta sulla polizza, non solo sulla rata.** Sono due domande
diverse: la rata dice a chi spetta la provvigione, la polizza dice chi ha
prodotto il contratto. Se la produzione si leggesse dalle rate, una polizza che
cambia gestione a marzo sposterebbe la produzione di gennaio.
*Come tornare indietro:* si smette di leggere quella colonna; i dati restano.

🟡 **I due anni si contano fino allo stesso giorno.** Il confronto fra dodici
mesi e nove disegna un crollo che non è successo. Il taglio lo fa il database.
*Come tornare indietro:* una riga nella funzione `iam_produzione_confronto`.

🟡 **I volumi digitati a mano nella scheda del collaboratore restano.** Nove
schede su dodici ne hanno: si spengono quando i due numeri saranno stati
confrontati e torneranno, non perché ne è nata una migliore.

---

## 21/09/2026 — Gestione compagnie (0.16.0)

**Perimetro:** far atterrare sopra `main` una patch nata in un'altra sessione.

🟡 **Reimplementata invece di attesa.** La patch non era su `main` né su un ramo
remoto: esisteva solo come testo. Applicata qui, 14 hunk su 16 sono entrati da
soli. Scelta di Francesco, su mia segnalazione.

🟡 **Le prove della patch non sono state prese per buone.** Leggevano tutte il
sorgente; ne sono state aggiunte otto che fanno girare la schermata.
*Come tornare indietro:* `git revert` del commit 0.16.0.

---

## 21/09/2026 — L'import diventa tutto-o-niente

**Perimetro:** la schermata «Importa flusso compagnia».

🔴 **Applicato al database, con autorizzazione esplicita.**
`20260921_import_tutto_o_niente.sql`: una tabella di appoggio vuota
(`iam_import_lotti`) e una funzione di scrittura (`iam_importa_flusso`).
Nessuna tabella esistente modificata, nessuna riga riscritta.
*Come tornare indietro:* il blocco ROLLBACK è in testa al file; la schermata
tornerebbe a scrivere riga per riga come prima.

🟡 **RIBALTATA una regola scritta in CLAUDE.md §14.** Fino a oggi
l'importazione era volutamente *interrompibile*: quello che era scritto restava
e si ricaricava lo stesso file. Con venticinque polizze reggeva. Il 21/09/2026
si è misurato che con milleseicento non regge: l'import delle 06:33 ha scritto
2.475 anagrafiche e 1.690 polizze e si è fermato prima delle rate, senza
lasciare un verbale. **1.700 polizze su 1.715 non hanno nemmeno una rata**, cioè
non hanno insoluti e non si incassano.
Il motivo del ribaltamento: un'importazione a metà che si dichiara è
recuperabile, una che *sembra finita* è un portafoglio sbagliato di cui nessuno
sa il perché.
*Come tornare indietro:* il codice vecchio non è stato cancellato.

🟡 **Il catalogo resta fuori dal «tutto o niente»**, ed è voluto: il portafoglio
è il lavoro, il catalogo è la sua etichetta (CLAUDE.md §39, regola 6).

---

## 21/09/2026 — Codice produttore per compagnia (0.18.0, brief Anagrafiche · punto 3)

**Perimetro:** dare un periodo e un interruttore all'abbinamento fra un codice
produttore della compagnia e una persona.

🔴 **Applicato al database, con autorizzazione esplicita.**
`20260921_codici_periodo_e_attivo.sql`: tre colonne nuove su
`quote_codici_collaboratore` (`attivo`, `data_inizio`, `data_fine`). Nessuna
riga riscritta, nessuna colonna esistente toccata. Misurato prima e dopo: 16
righe, tutte attive, 0 con un periodo, 0 decise — dicono esattamente quello che
dicevano.
*Come tornare indietro:* il blocco ROLLBACK è in testa al file; il motore torna
a non guardarle, cioè a come si comportava fino a ieri.

🟡 **Le date si confrontano con l'effetto della polizza, non con oggi.** Con
«oggi» un abbinamento chiuso a giugno toglierebbe a quella persona anche le
polizze di marzo, che sono sue.
*Come tornare indietro:* una riga in `Assegnazione.valeIl`.

🟡 **Sospendere e togliere sono due bottoni, non uno.** Sospeso vuol dire «non
produce più, ma è stato suo»; tolto rimette il codice fra quelli da abbinare e
azzera periodo e sospensione, perché sono di quell'abbinamento e non del codice.

🟡 **Nel dettaglio di una polizza un produttore non risolto adesso si vede**
(richiamo giallo) e, quando l'abbinamento non copre quella data, **il nome non
si scrive**: si scrive il codice e il motivo.

🟡 **Una riga per codice, quindi un padrone per codice.** Il periodo non tiene
lo storico dei padroni che si sono succeduti: servirebbe un'altra chiave
primaria, ed è un lavoro a sé. Scritto nella migrazione.

---

## Fuori perimetro — annotato e non fatto

- **`flusso-ssf.js:805 aggiungiMesi` duplica `PianoRate.sommaMesi`**: due copie
  dell'aritmetica delle date, e una tocca le date di incasso. Da unire.
- **«Nuova polizza» non chiede chi l'ha prodotta.** Va aggiunto con il
  componente unico dei collaboratori, che è il punto 4 del brief Anagrafiche:
  farne uno adesso vorrebbe dire scriverne uno da buttare.
- **Le politiche di `quote_polizze` non sono cambiate**: si legge ancora per
  `creato_da`, che è un utente solo. Far vedere a un collaboratore «le sue»
  polizze è una decisione, non una conseguenza.
- **`tracciabilita.test.mjs` è rosso su `main` da prima** (10/17, CLAUDE.md §21).
- **Le rate perse dall'import di stamattina non si ricostruiscono dal
  database**: stanno solo nel file della compagnia. Si recuperano ricaricando
  quello stesso file, che adesso è idempotente e atomico.
- **Il codice produttore si cerca sulla compagnia scritta esatta**, non sugli
  alias di `quote_compagnie` (CLAUDE.md §11): «HDI Assicurazioni» sulla polizza
  e «HDI» in tabella non si ritroverebbero. Sul portafoglio vero c'è una
  compagnia sola e il difetto non si vede; va guardato prima del secondo flusso.
