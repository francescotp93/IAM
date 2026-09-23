# Decisioni prese senza chiedere

Le scelte fatte in autonomia, con il motivo e come si torna indietro.
Il dettaglio tecnico sta in `CLAUDE.md`, paragrafo per paragrafo: qui c'è
soltanto quello che Francesco potrebbe voler ribaltare.

---

## 23/09/2026 — Le causali dicono dove il denaro entra e da dove esce (0.43.0)

**Perimetro:** due conti facoltativi su ogni causale, proposti nei campi della
prima nota.

🔴 **Applicato al database, con la tua autorizzazione permanente.** Due colonne
nuove su `iam_causali` (`conto_entrata_id`, `conto_uscita_id`), due indici e un
vincolo che vieta di metterci lo stesso conto. **Nessuna causale toccata:** le
quattordici che ci sono restano coi due campi vuoti. *Come tornare indietro:*
il blocco ROLLBACK in fondo a `20260923f_causali_conti_predefiniti.sql`.

🟡 **È una proposta, non una decisione.** I due conti finiscono nei campi
visibili e correggibili, e si riempiono SOLO se erano vuoti: se avevi già
scelto un conto non te lo cancella, e ti scrive che cosa avrebbe proposto.

🟡 **La proposta non scavalca i controlli.** Se cambi la causale da «denaro in
transito» a «costo», o spegni quel conto, la coppia salvata smette di andare
bene: non si propone più, e la prima nota dice perché. *Come tornare indietro:*
si risceglie la coppia in Conti e causali.

📝 **Fuori perimetro, annotato in CLAUDE.md §71:** la proposta non arriva agli
incassi automatici (Fase 2 e Fase 3), che scelgono il conto dalla
configurazione dei mezzi di pagamento — è un'altra domanda, e unirle sarebbe
una decisione.

---

## 23/09/2026 — I sospesi: la pagina di chi tiene i premi (0.42.0)

**Perimetro:** la pagina di dettaglio di un sospeso, la selezione multipla, lo
scarico insieme, Excel/PDF/email del resoconto e l'abbinamento voce → persona.

🔴 **Niente database.** Nessuna tabella nuova, nessuna colonna, nessun dato
riscritto: l'abbinamento voce → collaboratore usa la colonna che c'è già dal
22/09. *Come tornare indietro:* è tutto codice, basta un `git revert`.

🟡 **Le due famiglie non si scaricano insieme.** Una rata che il cliente non
ha ancora pagato si INCASSA; una già incassata si PORTA IN CONTABILITÀ. Sono
due schermate diverse, e sceglierne di tutti e due i tipi non fa niente: la
pagina dice perché, invece di registrare un incasso già avvenuto.

🟡 **Abbinare una persona si offre solo dove la voce è già una persona.**
Attaccare un collaboratore al POS vorrebbe dire dire che 135 rate per
34.172 € le tiene lui. Dove non si può, la pagina manda dove si crea una voce
nuova. *Come tornare indietro:* è una riga della schermata.

🟡 **L'email del resoconto parte da `contabilita@` e non ripiega.** Se quella
casella non è raggiungibile l'invio non parte e lo dice, invece di uscire da
un indirizzo dove le risposte non le legge nessuno. *Come tornare indietro:*
`SPR_CASELLA` in `iam/index.html`.

📝 **Fuori perimetro, annotato in CLAUDE.md §70:** non c'è un registro degli
invii dedicato come per l'estratto conto — l'invio lascia una riga nel
registro dei movimenti, ma non congela i totali di quel giorno.

---

## 23/09/2026 — Punti vendita: il responsabile, e le polizze (0.41.0)

**Perimetro:** il responsabile di un punto vendita, chi ci lavora, i flag a
interruttori, la polizza che porta anche il punto vendita del suo
intermediario, e gli HUB che vanno via.

🔴 **Applicato al database, con la tua autorizzazione permanente.** Tre colonne
nuove (`iam_punti_vendita.responsabile_id`, `quote_polizze.punto_vendita_id`,
`quote_titoli.punto_vendita_id`) con i loro indici; due trigger che riempiono
il punto vendita dalla persona; la funzione che applica una decisione su un
codice produttore aggiornata. **Nessun dato riscritto, nessun backfill.**
*Come tornare indietro:* i blocchi ROLLBACK in fondo alle migrazioni
`20260923c`, `20260923d` e `20260923e`.

🟡 **Scegliere un responsabile lo SPOSTA nel suo punto vendita.** Una persona
sta in un punto vendita solo, quindi metterla responsabile di un altro la
toglie da dove stava. Non succede in silenzio: la schermata lo scrive sotto la
tendina, col nome del punto vendita da cui viene via, prima che tu salvi.
*Come tornare indietro:* si rimette la persona dov'era dalla schermata stessa.

🟡 **La polizza porta il punto vendita, e si congela.** Quando una polizza si
assegna a un intermediario, prende anche il punto vendita che quella persona ha
**in quel momento**, e da lì non cambia più. Se domani quella persona passa a
un'altra filiale, la produzione dell'anno scorso resta dov'è stata fatta: un
consuntivo chiuso non deve cambiare da solo. *Come tornare indietro:* si
corregge la colonna sulla polizza; il trigger non la riscrive mai se c'è già
qualcosa.

🟡 **Gli HUB: via la schermata, non i dati.** La gestione HUB non c'è più e nella
scheda del collaboratore al suo posto c'è il punto vendita. La tabella `iam_hub`
e la colonna `iam_team.hub_id` **restano**, e le tre schede che avevano un HUB
se lo tengono: un campo che non si mostra più non è un campo da cancellare. I
due HUB si vedono nei Punti vendita con un bottone che propone di trasformarli
— uno alla volta, col nome nel campo, e a premere Salva sei tu.
*Come tornare indietro:* il codice della schermata sta nella storia di questo
commit; i dati non sono mai stati toccati.

📝 **Un guasto mio, trovato dalle prove e corretto nello stesso giro.** Avevo
riscritto a memoria la funzione che applica una decisione su un codice
produttore, e aveva perso tre regole su chi viene pagato. Postgres non se ne
accorge finché quella funzione non gira davvero. È rimessa com'era, con due
righe in più, e la prova adesso controlla anche quelle tre regole. Nessuna
polizza è stata toccata nel frattempo: quella funzione la chiama una persona,
e nessuno l'ha chiamata.

---

## 22/09/2026 — Contabilità · Fase 3, i premi da recuperare (0.27.0)

**Perimetro:** i sospesi — i premi messi a copertura e non ancora ricevuti dal
cliente — con apertura, scadenzario, recuperi anche parziali e storno.

🔴 **Applicato al database, con la tua autorizzazione permanente.** Due tabelle
nuove (`iam_crediti_premio`, `iam_crediti_recuperi`), tre funzioni, quattro
trigger, due causali di sistema, il vocabolario di `origine` allargato e un
indice ristretto. Nessuna colonna esistente toccata, nessun dato riscritto.
*Come tornare indietro:* i blocchi ROLLBACK in testa alle due migrazioni.

🟡 **Mettere una rata a copertura NON la chiude.** La rata resta fra quelle da
incassare finché il denaro non arriva: «a copertura» vuol dire che la compagnia
è a posto, non che il cliente ha pagato. Se la chiudessimo, la provvigione
maturerebbe su un premio mai ricevuto.
*Come tornare indietro:* è la decisione che regge la fase; ribaltarla vuol dire
rifarla.

🟡 **Una rata a copertura non si incassa dalla schermata degli incassi**: te lo
dice e ti manda a registrare il recupero. Senza, il debito verso la compagnia
nascerebbe due volte.

🟡 **Il credito verso un collaboratore non si apre qui.** Esiste già dal 19/09
(le rate che ha incassato e non ha rimesso, nel suo estratto conto): rifarlo
sarebbe il secondo archivio dello stesso fatto.

🟡 **Più del residuo non si registra**: un di più del cliente è un'eccedenza e
oggi non ha una strada sua — si rifiuta dicendolo.

📝 **Fuori perimetro, annotato:** l'abbuono per chiudere un residuo che non
arriverà mai; l'eccedenza; i conti «Abbuoni» classificati fra i premi.

---

## 22/09/2026 — Contabilità · Fase 2, si incassa una rata (0.26.0)

**Perimetro:** registrare l'incasso di una o più rate con una o più modalità di
pagamento, e la scrittura contabile che ne nasce.

🔴 **Applicato al database, con la tua autorizzazione permanente.** Tre tabelle
nuove (`iam_incassi`, `iam_incassi_rate`, `iam_incassi_pagamenti`), due funzioni
(`iam_incasso_registra`, `iam_incasso_storna`), tre trigger di immutabilità e un
vincolo allargato su `iam_movimenti.origine`. Nessuna colonna esistente è stata
toccata, nessun dato riscritto.
*Come tornare indietro:* il blocco ROLLBACK in testa alle due migrazioni. Non
rimette indietro le rate incassate né i movimenti: sono fatti accaduti.

🟡 **Una rata si incassa INTERA.** Il pezzo che manca è un sospeso, e i sospesi
sono la Fase 3. Una rata chiusa per un importo, con un residuo che non sta da
nessuna parte, è peggio di una rata aperta.
*Come tornare indietro:* è una scelta di perimetro, si allarga con la Fase 3.

🟡 **L'Avere è il premio LORDO verso la compagnia**, come dice la specifica. La
provvigione dell'agenzia non viene separata all'incasso: il conto della
compagnia porta il lordo, e il conto economico su quell'incasso dice zero.
*Serve la tua decisione* (vedi sotto). La schermata lo scrive in faccia invece
di scegliere da sola.

🟡 **Un conto di sospesi non è un modo di pagare, per adesso.** Mettere una rata
a copertura senza aver visto il denaro è un'altra operazione e arriva con la
Fase 3: farla passare di qui scriverebbe la contabilità giusta e nessuna
posizione nell'elenco di chi deve pagare.

🟡 **Una rata negativa (rimborso, appendice di riduzione) si rifiuta col
motivo**, invece di sparire dalla ricerca in silenzio.

📝 **Fuori perimetro, annotato:** «Incassi diretti in compagnia» è fra i conti
minimi come modo di pagare e non lo è; gli abbuoni sono classificati fra i
premi e sono una perdita dell'agenzia.

---

## 22/09/2026 — Il cliente si sceglie da una schermata vera (0.25.0)

**Perimetro:** la barra di ricerca del cliente nel modulo «Nuova polizza».

🟡 **Il campo del cliente non si scrive più a mano: si clicca e si apre una
schermata.** Prima era una casella con una tendina; adesso è una porta
(`readonly`) verso una finestra con due linguette — cerca in anagrafica,
oppure censisci il cliente nuovo.
*Come tornare indietro:* si toglie `readonly` dai due campi e si rimette
`oninput` al posto di `onclick`; ma la tendina vecchia non c'è più, andrebbe
riscritta.

🟡 **Vale anche per l'analisi previdenziale**, che usa lo stesso componente. Non
è un effetto collaterale: è il motivo per cui il componente è uno solo. Il
comportamento è lo stesso — solo persone fisiche, codice fiscale controllato —
solo che adesso si vede in una schermata invece che in una tendina.
*Come tornare indietro:* si separano i due campi registrandoli con opzioni
diverse; sconsigliato, sarebbero due schermate da tenere allineate.

🟡 **Si può censire una società, con ragione sociale e partita IVA.** Prima
solo persone fisiche: per una polizza a una ditta bisognava uscire dal modulo
e andare in Anagrafiche, perdendo quello che si stava scrivendo.
*Come tornare indietro:* si toglie la tendina «Chi è» dalla scheda nuova.

🟢 **La data di nascita si ricava dal codice fiscale** mentre lo scrivi, con lo
stesso motore dell'anagrafica, e non tocca quella che hai corretto a mano.

🟢 **Il movimento a registro adesso punta alla riga creata.** Mancava: alla
domanda «chi ha censito questo cliente» il registro non sapeva rispondere.

**Niente database.** Nessuna migrazione, nessuna colonna, nessuna politica.

📝 **Fuori perimetro, annotato:** gli altri diciotto wizard hanno ancora il
loro autocomplete copiato; la ricerca si ferma a 40 righe e lo dichiara; il
modulo non chiede ancora chi ha prodotto la polizza.

---

## 22/09/2026 — Abbinare un codice produttore lo applica davvero (0.24.0)

**Perimetro:** il codice produttore che abbinavi e che in Produzione restava
«da abbinare».

🔴 **Applicato al database, con la tua autorizzazione permanente.**
`20260922c_applica_decisione_codice.sql`: una funzione NUOVA,
`iam_applica_decisione_codice`. Non scrive niente quando viene applicata:
scrive solo quando una schermata la chiama. Nessuna tabella, nessuna colonna,
nessuna politica.
*Come tornare indietro:* si cancella la funzione. Le schermate tornano a
decidere senza applicare, cioè al guasto. Le righe già assegnate restano dove
sono: il dato sta sulla polizza e sulla rata.

🟡 **Abbinare un codice adesso muove il portafoglio subito.** Prima la scheda
scriveva solo la decisione. Ora, nel momento in cui abbini, le polizze e le
rate di quel codice già in archivio passano a quella persona — e la scheda ti
dice quante ne ha mosse.
*Come tornare indietro:* si toglie la chiamata da `ccpAggiungi`; ma quello che
è già stato assegnato resta assegnato.

🟡 **Non tocco quello che è stato assegnato a mano.** Se una polizza ha già un
altro produttore scritto, l'abbinamento la salta e te lo conta a parte. Chi
l'aveva assegnata sapeva qualcosa che il sistema non sa.

🟡 **Ho applicato io le due decisioni che avevi già preso** (U25337 e U25963):
erano scritte e non avevano mosso niente. Applicare una decisione presa da te
non è indovinare — è finire il lavoro che si era fermato a metà.
*Come tornare indietro:* si azzera `collaboratore_id` su quelle polizze; i
numeri esatti sono nel riepilogo.

🟡 **La Produzione manda dove il lavoro si fa** (la scheda del collaboratore)
invece che in «Decisioni aperte», che conta le decisioni mancanti e non ne
applica nessuna.

📝 **Due difetti trovati per strada, tutti e due sui soldi:** «Assegna il
pregresso» leggeva solo le prime mille polizze (su 4.079), e l'importazione
non guardava il periodo dell'abbinamento. Corretti tutti e due.

---

## 22/09/2026 — L'import non muore per una riga, e dice che cosa lascia fuori (0.23.0)

**Perimetro:** la stessa schermata di poco fa. Corretto il guasto delle rate ho
letto il resto della strada prima di dirti «premi», e c'erano altre due cose
che avrebbero fatto fallire l'importazione in blocco.

🔴 **Applicato al database, con la tua autorizzazione permanente.**
`20260922b_import_non_muore_per_una_riga.sql`: riscrive **una sola funzione**,
`iam_importa_flusso`. Nessuna tabella, nessuna colonna, nessuna politica,
nessuna riga esistente toccata.
*Come tornare indietro:* si riapplica la funzione com'è in
`20260922_import_rate_su_polizze_gia_dentro.sql`. Tornare indietro rimette il
difetto: una riga rifiutata torna a far morire l'importazione intera.

🟡 **Una riga che il database rifiuta adesso resta fuori invece di far morire
tutto.** È una scelta, e va detta: se il file contiene una polizza senza data
di effetto, o una rata senza importo, o un numero di polizza che è già in
archivio, quella riga **non entra** — prima non entrava neanche lei, ma con
lei non entrava nient'altro. Ogni esclusione è contata e scritta sullo
schermo.
*Come tornare indietro:* si toglie il filtro dalla funzione, ma si torna a
un'importazione che muore per una riga.

🟡 **Le polizze escluse per numero già preso sono da guardare.** Quando una
polizza si rinnova, PRIMA fa nascere una riga nuova e il numero spesso resta
lo stesso: quelle righe restano fuori e il numero te lo dice l'esito. Se
scopriamo che è la normalità e non un errore, la regola si cambia — ma
cambiarla vuol dire decidere che due polizze possono avere lo stesso numero,
e quella decisione è tua.

🟡 **«568 righe non importabili» diventa tre voci con il loro nome**, perché
erano tre cose diverse e una delle tre non è un guasto (le rate dei rinnovi
non pagati: è giusto che restino fuori dal portafoglio).
*Come tornare indietro:* è un elenco in `fluMostra`, si torna a un numero solo
in tre righe.

🟡 **La barra non arriva più in fondo prima di scrivere**, e l'esito di un
errore non promette più che «non è stato scritto niente»: il catalogo si
scrive prima della transazione, quindi quella frase non era vera.

📝 **Rimessa una cosa che si era persa**: l'importazione torna ad annotare
nome, email e RUI accanto ai codici produttore. Misurato: 16 codici in
tabella, zero con un nome.

---

## 22/09/2026 — Le rate che sparivano ricaricando il file (0.22.1)

**Perimetro:** l'importazione del portafoglio dalla compagnia. Sei venuto con
l'anteprima del file PRIMA dell'anno aperta e il dito sul bottone: prima di
dirti «premi» ho guardato che cosa sarebbe successo, e non sarebbe successo
quello che volevi.

🔴 **Applicato al database, con la tua autorizzazione permanente.**
`20260922_import_rate_su_polizze_gia_dentro.sql`: riscrive **una sola
funzione**, `iam_importa_flusso`. Nessuna tabella, nessuna colonna, nessuna
politica, nessuna riga esistente toccata.
*Come tornare indietro:* si riapplica la funzione com'era in
`20260921_import_tutto_o_niente.sql` (righe 118-318). Attenzione: tornare
indietro rimette il difetto — ricaricare un file non recupera più le rate
delle polizze già in portafoglio.

🟡 **Ho fermato il tuo import invece di lasciartelo fare.** Avrebbe scritto le
polizze nuove e buttato via, senza dirlo, le rate delle polizze che ci sono
già — cioè proprio quelle delle 1.700 polizze che volevi sistemare. Alla fine
avresti letto «Import completato» e il problema sarebbe rimasto lì.
*Come tornare indietro:* niente da ribaltare, ma se preferisci che non ti
fermi mai e ti lasci provare, dimmelo.

🟡 **L'esito adesso dice in rosso quante rate sono rimaste fuori**, con
«proposte X, scritte Y». Prima quel riquadro diceva solo quello che era
entrato: se qualcosa veniva scartato non c'era modo di accorgersene.
*Come tornare indietro:* è un riquadro in `fluConferma`, si toglie in una riga.

🟡 **La versione sale a 0.22.1 e non a 0.23.0.** È una correzione, non una
funzione nuova: il numero di mezzo lo tengo per le cose che aggiungono.

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

## 21/09/2026 — Il contatore delle anagrafiche (0.19.0, brief Anagrafiche · punto 1)

**Perimetro:** far dire ai contatori quante anagrafiche ci sono davvero.

🟡 **Nessuna modifica al database.** I numeri li chiede il server con un
conteggio, senza scaricare le righe. Misurato: 2.536 anagrafiche, 29 lead,
2.507 clienti — la schermata diceva 50.

🟡 **Il marcatore `LEAD` scritto nelle note non decide più chi è un lead**:
decide la colonna `lead`. Misurato: una sola riga in tutto l'archivio ha quel
marcatore, e non è fra i clienti — il numero non cambia.
*Come tornare indietro:* si rimette il filtro sulle note in `caricaDaFareOggi`.

🟡 **Il consenso marketing ha una regola sola per tutta la casa.** La Scrivania
di IAM guardava solo la privacy firmata e non la colonna `consenso_marketing`:
contava fra i buchi anche chi il consenso l'aveva dato allo sportello. Oggi i
due numeri coincidono per caso (4 consensi, tutti da privacy firmata).
*Come tornare indietro:* `git revert` del commit del punto 1.

🟡 **Sotto l'elenco compare «Ne vedi 50 su 2.507».** Senza, una lista che si
ferma a cinquanta e un contatore che ne dice duemilacinquecento si leggono come
un guasto.

---

## 21/09/2026 — «Compleanni di oggi» in Marketing (0.19.0, brief Anagrafiche · punto 2)

**Perimetro:** spostare il riquadro dei compleanni da Clienti a Campagne.

🔴 **CAMBIA CHI PUÒ VEDERLO, ed è da sapere.** La pagina Clienti la vede
chiunque entri nel preventivatore; **Marketing è dietro il cancello
`lab_abilitato`** (o super-admin). Un collaboratore senza Marketing abilitato
**non vede più i compleanni**. Non è un effetto collaterale: è la conseguenza
diretta di dove il brief chiede di mettere il riquadro.
*Come tornare indietro:* o si abilita Marketing a chi serve, o si riporta il
riquadro in Anagrafiche — una riga di HTML e una chiamata.

🟡 **In Anagrafiche non resta niente**, né un riquadro vuoto né un rimando: un
rimando a una schermata che sta altrove è il doppione che si voleva togliere.

🟡 **Le regole non sono cambiate di una riga**: invio manuale uno per persona,
solo con consenso marketing e un recapito, traccia nel diario e nel registro.

---

## 21/09/2026 — Il grafico dei volumi è un grafico (0.20.0)

**Perimetro:** «per la dashboard volevo un grafico, non un indicatore».

🟡 **Nessuna modifica al database.** Il grafico legge la funzione che c'era già.

🟡 **Il grafico sta SOPRA i tre riquadri di indicatori.** La prima cosa che si
vede aprendo IAM è l'andamento. I tre riquadri restano, sotto: rispondono a
domande che il grafico non fa.
*Come tornare indietro:* si riscambiano i due blocchi in `#panel-dashboard`.

🟡 **Barre appaiate → due curve ad area.** Ventiquattro barre in dodici slot su
un telefono sono trentadue pixel per mese: illeggibili. Con due curve la
risposta si legge senza numeri — dove il grigio spunta sopra il verde, quel
mese è andato peggio.
*Come tornare indietro:* `git revert` del commit 0.20.0.

🟡 **Corretta una regola del motore.** `fuori_confronto` si accendeva solo dove
il database aveva mandato una riga: un mese vuoto in tutti e due gli anni non
risultava «non ancora arrivato». Adesso lo decide la data, come già faceva il
mese parziale. Cambia i dati che escono da `Produzione.confronto`, quindi lo
usa anche la schermata Produzione.

---

## 21/09/2026 — Tre scritture che non riuscivano (0.21.0)

**Perimetro:** il caricamento dei documenti, i mezzi di pagamento, il foglio cassa.

🔴 **Cambiata una configurazione di PRODUZIONE, con autorizzazione esplicita.**
Sul VPS mancava `SUPABASE_ANON_KEY`, e senza quella i documenti del fascicolo
non si caricavano. È stata scritta nel `.env` del backend prendendola **dal
client**, dove quella chiave è pubblica per costruzione: non è passata da
nessuna parte, non è nel repository e non è in nessun messaggio. Backup del
file accanto, con la data.
*Come tornare indietro:* si toglie quella riga dal `.env` e si riavvia — ma il
caricamento dei documenti torna a fallire.

🔴 **Applicate due migrazioni, con autorizzazione esplicita.**
`20260921_mezzi_conti_allineati.sql` riscrive **solo** la colonna `mezzi` dei
conti (configurazione, non contabilità: nessuna polizza e nessuna rata
toccata). `20260921_polizze_senza_rate.sql` aggiunge una funzione di sola
lettura. Il blocco ROLLBACK è in testa a tutti e due i file.

🟡 **RIBALTATO il vocabolario dei mezzi di pagamento.** Erano quattro elenchi,
e due chiavi su nove divergevano fra il motore della contabilità e il vincolo
del database. Vince il database, perché è l'unico che non si può cambiare
senza riscrivere 1.720 polizze e 55 rate.
*Come tornare indietro:* `git revert` del commit 0.21.0 **e** il rollback della
migrazione dei conti — le due cose vanno insieme.

🟡 **Il foglio cassa parte dalla DATA DI EMISSIONE, non più da quella di
incasso.** È la richiesta di Francesco. Chi lo usava per quadrare la cassa
trova numeri diversi al primo colpo d'occhio: la schermata dichiara su quale
data sta guardando, e il selettore «Date su» riporta alla lettura di prima.
*Come tornare indietro:* una riga in `fcFiltri`.

🟡 **Le rate non incassate entrano nel foglio, i loro premi NO nei totali di
cassa.** Emesso e incassato sono due tessere separate e non si sommano mai; le
provvigioni contano solo l'incassato (regola §17).

🟡 **Il foglio cassa adesso legge tutto il portafoglio, paginando.** Prima si
fermava a mille righe e scartava in silenzio le rate delle altre 720 polizze.
Se un giorno l'archivio superasse il tetto dichiarato, lo scrive.

---

## 21/09/2026 — L'archivio: il secondo ostacolo (0.21.1)

**Perimetro:** far tornare a funzionare il caricamento dei documenti.

🔴 **Cambiati i permessi di una cartella in PRODUZIONE, con autorizzazione
esplicita.** `/var/lib/withus` era di `root` e il servizio gira come `withus`:
non riusciva ad arrivare alla propria cartella dell'archivio. Ora tutte e due
sono `withus:withus` con `chmod 700` — solo il servizio entra, nessun altro
utente della macchina legge quei file.
*Come tornare indietro:* si rimette `chown root:root /var/lib/withus` — ma il
caricamento dei documenti torna a fallire.

🔴 **Cancellata una riga dal database, con autorizzazione esplicita.**
`iam_archivio` conteneva **una** riga orfana (`41d6999c-…`, «Certificato
Galfano Vito.pdf», nata alle 15:44 dal guasto dei permessi): puntava a un file
che sul disco non c'è mai stato (misurato: zero file cifrati presenti).
Lasciarla vorrebbe dire mostrare nel fascicolo un documento che si vede, si
clicca e non si apre.
*Come tornare indietro:* non si torna indietro, e non serve — **quel documento
va ricaricato**, perché il PDF non è mai arrivato sul server.

🟡 **Il controllo d'avvio adesso PROVA a scrivere.** Prima guardava solo che il
percorso fosse nel posto giusto. È la terza volta nella stessa giornata che si
trova lo stesso schema: un controllo che guarda la forma e non la sostanza.
*Come tornare indietro:* `git revert` del commit 0.21.1.

🟡 **Se il file non si salva, la riga dei metadati si toglie.** Prima restava,
e il commento diceva che «una riga senza file è recuperabile»: vero solo se
qualcuno la recupera. L'ordine delle due scritture **non è cambiato** — un file
cifrato senza la sua riga non è di nessuno.

---

## 21/09/2026 — Contabilità · Fase 1: le fondamenta a partita doppia (0.22.0)

**Perimetro:** la prima nota diventa a partita doppia. Niente incassi, niente
sospesi, niente estratti conto: sono le Fasi 2, 3 e 4.

🔴 **Applicato al database, con autorizzazione esplicita.**
`20260922_contab_partita_doppia.sql`: la tabella nuova `iam_movimenti_righe`
(le righe Dare/Avere), cinque colonne su `iam_conti`, una su `iam_causali`,
nove su `iam_movimenti`, quattro trigger, due politiche e la funzione
`iam_movimento_registra`. **Nessuna riga esistente riscritta** tranne il numero
progressivo dato all'unico movimento che c'era, e **nessun conto creato**.
*Come tornare indietro:* il blocco ROLLBACK è in testa al file di migrazione.

🟡 **I dodici conti minimi della specifica NON sono stati creati.** Sono una
proposta nella schermata Conti e casse: si spuntano e li crea una persona. Un
conto ha un saldo, e dodici saldi a zero che nessuno ha deciso diventano dodici
dati dopo due settimane (regola di casa §8.1).
*Come tornare indietro:* niente da disfare — non è stato scritto niente.

🟡 **Niente `organization_id`, contro il principio 7 della specifica.**
Misurato: zero colonne tenant in tutto il database, `iam_azienda` ha una riga.
Una colonna che vale sempre lo stesso valore non isola niente, e le prove di
«isolamento fra tenant» proverebbero una cosa che non esiste. L'isolamento qui
è per RUOLO: lo staff legge, l'admin scrive.
*Come tornare indietro:* si aggiunge la colonna il giorno in cui esiste una
seconda agenzia — e quel giorno va aggiunta ovunque, non solo in contabilità.

🟡 **`iam_movimenti.conto_id` e `.importo` restano**, e da oggi sono il derivato
della riga singola. Toglierli adesso vorrebbe dire riscrivere cinque funzioni
con 34 prove sopra mentre si cambia il modello.
*Come tornare indietro:* si spengono quando le schermate leggeranno le righe.

🟡 **I movimenti scritti prima di oggi non si stornano.** Hanno un conto solo e
la contropartita non è mai stata scritta: non si rovescia quello che non c'è, e
inventarla vorrebbe dire scrivere in contabilità una cosa che nessuno ha
deciso. Si annullano col motivo, come prima, e restano a registro.
*Come tornare indietro:* nessuna strada che non passi dall'inventare.

🟡 **`origine` ammette un valore in più (`storno`).** Senza, il primo storno
sarebbe morto contro un vincolo dopo che la schermata aveva detto «sì, si può».
I quattro valori di prima restano e nessuna riga si è mossa.

🟡 **La soglia dei punti di chiamata del registro sale da 54 a 57.** Tre
movimenti nuovi lasciano traccia: i conti minimi creati in blocco, lo storno e
il movimento che nasce dallo storno.

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
- **«CASSA CONTANTI» è di tipologia `altro`**, quindi il fondo cassa ricostruito
  non la conta. Il sistema lo dice come anomalia; cambiare la tipologia di un
  conto è una decisione contabile e non si fa da soli.
- **Due conti dichiarano di ricevere i contanti**: finché è così quegli incassi
  leggono «non si sa». Va lasciato su uno solo.
- **Il manuale di contabilità di AssiEasy** (con la parte «registrazione
  movimenti», cioè la loro prima nota) è da leggere e mappare contro quello che
  IAM ha già: è il task #64, non fatto in questo rilascio.
- **Il codice produttore si cerca sulla compagnia scritta esatta**, non sugli
  alias di `quote_compagnie` (CLAUDE.md §11): «HDI Assicurazioni» sulla polizza
  e «HDI» in tabella non si ritroverebbero. Sul portafoglio vero c'è una
  compagnia sola e il difetto non si vede; va guardato prima del secondo flusso.
- **Il motore della contabilità chiede l'ora al computer in tre punti**
  (`giorniDa`, `sospesiAperti`, `anomalie`), nati con la M4 e la M5: è la
  famiglia del difetto delle date di CLAUDE.md §44 e §45. Nel blocco della
  partita doppia non c'è, e una prova lo sorveglia; gli altri tre vogliono di
  passare `oggi` da chi chiama, cioè toccare le schermate M4 e M5.
- **`otp-dalla-posta.test.mjs` è rosso su `main` da prima** (5/17): cerca
  `server/otpPosta.js`, che nel repository non c'è. È il guasto §1 al
  contrario — una prova che sorveglia un modulo mai arrivato.
- **La prima nota nasce vuota e i saldi iniziali dei conti sono a zero**:
  finché non si scrivono quelli veri, il saldo ricostruito parte da un numero
  che non è quello.

---

## 0.28.0 — Contabilità · Fase 4 (22/09/2026)

### 🟡 Scelte prese, e come tornare indietro

- **I saldi leggono le RIGHE, non la testata.** Sei chiamate interne al motore
  scartavano `opz.righe`; adesso lo propagano. Sulla contabilità di oggi (un
  movimento, nessuna riga) il risultato è identico — il motore ricade sulla
  testata quando le righe non ci sono. *Indietro:* togliere `righe:` dalle sei
  chiamate in `tariffe/motore/contabilita.js`; sei prove diventano rosse.
- **Il pannello Conti legge i movimenti.** Fino a ieri mostrava il solo saldo
  iniziale e lo dichiarava. *Indietro:* togliere la chiamata a `cntSaldi()` in
  `cntCarica`.
- **`eliminabile` guarda le righe.** Un conto toccato solo da una gamba Avere
  adesso non si può cancellare. *Indietro:* togliere `{righe: CNT_RIGHE}` alla
  chiamata; una prova diventa rossa.
- **La visibilità dei pannelli di Contabilità passa da una classe** (`.ct-off`)
  invece che da nove `display:none` in linea. Le soglie del guardiano del kit
  sono calate di conseguenza. *Indietro:* rimettere gli stili in linea e
  rialzare le soglie — ma il cricchetto dice che le soglie scendono e basta.
- **Il cruscotto è la PRIMA linguetta di Contabilità.** Prima era «Quadratura».
  Chi aveva un'altra linguetta in memoria la ritrova: `iam_last_tab` funziona
  come prima. *Indietro:* rimettere `act` su `ctab-quadratura` e togliere il
  `ct-off` dal suo pannello.
- **Sette letture paginate.** Nessuna perde più righe in silenzio; quando il
  tetto si raggiunge, la schermata lo scrive. *Indietro:* rimettere i `.limit()`
  — ma allora il difetto torna, e torna invisibile.

### 🔴 Serve il tuo ok (aperti da prima, ancora tutti)

1. **Non esiste un conto di debito verso una compagnia, né un conto dei
   sospesi, né una cassa contanti di tipologia «cassa».** Finché non ci sono, il
   cruscotto dice «premi da rimettere: non c'è nessun conto» e le due schermate
   della Fase 2 e 3 si rifiutano di registrare. Si creano in
   Strumenti › Conti e causali.
2. **La provvigione: matura all'incasso o alla rimessa?** Decisione non presa.
3. **I conti «Abbuoni» sono di natura `premi`**: dovrebbero essere aziendali.

### 📝 Fuori perimetro, annotato

- **`contoEconomico`, `riepilogo` e `perCausale` leggono la testata**, ed è
  giusto: a partita doppia le due gambe si annullano e le righe non saprebbero
  dire se la giornata ha incassato o pagato.
- **`INC_INCERTO` è una bandiera sola** per tre letture: dice «una si è
  fermata» senza dire quale.
- **Il motore chiede l'ora al computer in tre punti** (`giorniDa`,
  `sospesiAperti`, `anomalie`): annotato in §61, non toccato.
- **`otp-dalla-posta.test.mjs` è rosso su `main` da prima** (5/17): cerca un
  modulo che nel repository non c'è.

---

## 0.29.0 — Contabilità · Fase 4-bis (22/09/2026)

Nata da una critica indipendente sul rilascio 0.28.0: cinque difetti reali,
due dei quali scritti nella 0.28.0 stessa.

### 🟡 Scelte prese, e come tornare indietro

- **Entrate e uscite si contano sulle gambe di DENARO** (`denaroDi`), non
  sull'importo di testata: una polizza a copertura non fa entrare un euro, e
  contarla faceva entrare lo stesso premio due volte. Senza le righe il motore
  si comporta come prima. *Indietro:* far chiamare `denaroDi` con `perMov` e
  `contiIdx` nulli in `giornata`/`riepilogo`; due prove diventano rosse.
- **Le anomalie guardano quattro strade** invece di una per sapere se una rata
  è già in contabilità. *Indietro:* togliere `dati.incassi_rate` e
  `dati.crediti` dal controllo 2; una prova diventa rossa.
- **Il cruscotto riceve gli stessi dati della linguetta Anomalie** e dichiara i
  controlli che non si sono potuti fare. *Indietro:* togliere le quattro
  letture accessorie da `cruCarica`.
- **Un orologio solo** (`cntOggiIso`) per `pntOggi`, `gioData`, `recOggi`,
  `incOggi`, `cruOggi`. *Indietro:* rimettere `toISOString().slice(0,10)`; una
  prova diventa rossa.
- **Le tre esportazioni CSV dichiarano in testa al file** una lettura fermata a
  metà. *Indietro:* passare `null` come quarto argomento a `cntCsv`.

### 🔴 Serve il tuo ok — le stesse tre, nessuna è cambiata

1. **Mancano tre conti**: il debito verso una compagnia, il conto dei sospesi,
   e una cassa contanti classificata «cassa». Si creano in Strumenti › Conti e
   causali.
2. **La provvigione matura all'incasso o alla rimessa?**
3. **I conti «Abbuoni» sono di natura `premi`**: dovrebbero essere aziendali.

### 📝 Fuori perimetro, annotato (sei voci, tutte in CLAUDE.md §62)

`contoEconomico` e i suoi numeri di transito; `e_quadrabile` che non guarda
nessuno; `fondoCassa` che somma nature diverse; `eliminabile` che non guarda le
quadrature; `PNT_*`/`CNT_*` ancora `let`; la regola del CSV in pagina invece
che nel motore.

---

## 22/09/2026 — Scadenzario: la proroga di 15 giorni (0.30.0)

**Perimetro:** i filtri rapidi chiesti da Francesco nello scadenzario, con la
data che fa testo (scadenza polizza o scadenza rata, mai l'incasso).

### 🟡 Scelte prese, e come tornare indietro

- **«Vicine ai 15 giorni» letto come i 15 giorni PRIMA della scadenza.** La
  frase si poteva leggere anche come «vicine alla fine della proroga». Ho
  scelto la lettura simmetrica: 15 giorni prima si chiama, 15 giorni dopo si è
  ancora in copertura, oltre no. *Indietro:* è il `test` della fascia `vicine`
  in `tariffe/motore/scadenzario.js`, una riga.
- **Il rinnovo si riconosce dalla targa e dal cliente+ramo**, con una finestra
  da −5 a +30 giorni dalla scadenza. Restava l'alternativa di non riconoscerlo
  affatto e dichiarare non rinnovate tutte e 1.665 le scadute, che è quello che
  faceva prima. *Indietro:* `FINESTRA_PRIMA`/`FINESTRA_DOPO` nel motore, oppure
  far tornare `rinnovo()` sempre `nessuno` quando `sostituzioni` è zero.
- **Il tacito rinnovo non sta fra le «non rinnovate».** Si rinnova da solo e va
  verificato, non richiamato: chi guarda quell'elenco deve telefonare.
  *Indietro:* togliere la riga del tacito da `statoLavoro`.
- **Una polizza non ancora scaduta non è «non rinnovata».** *Indietro:*
  togliere la riga `fascia === 'avanti'` da `statoLavoro`; una prova Node e tre
  del browser diventano rosse.
- **L'ordine è per distanza da oggi**, non cronologico: in cima c'è quello che
  è più vicino a oggi nei due versi. *Indietro:* `rinOrdina` in `index.html`.
- **Il numero sulla voce di menu** conta vicine + in proroga, non più tutto
  entro 60 giorni. *Indietro:* `rinBadge`.
- **La tabella disegna 500 righe** e lo dichiara; i contatori contano tutto.
  *Indietro:* `RIN_MAX`.

### 🔴 Serve il tuo ok — le stesse tre di ieri, nessuna è cambiata

1. **Mancano tre conti**: il debito verso una compagnia, il conto dei sospesi,
   e una cassa contanti classificata «cassa».
2. **La provvigione matura all'incasso o alla rimessa?**
3. **I conti «Abbuoni» sono di natura `premi`**: dovrebbero essere aziendali.

### 📝 Fuori perimetro, annotato

- **`create or replace view` butta via `security_invoker`.** Trovato
  applicando la migrazione di oggi e rimesso subito, ma vale per tutte le viste
  del repository: nessuna prova lo sorveglia. Sarebbe una prova che rilegge
  `reloptions` di ogni vista dopo ogni migrazione.
- **`sostituisce_id` non lo scrive nessuno.** Finché «Riquota» non collega la
  polizza nuova alla vecchia all'emissione, ogni rinnovo resta un indizio.
- Le sei voci di ieri (CLAUDE.md §62) restano tutte aperte.

---

## 22/09/2026 — Scadenzario, le correzioni della rilettura ostile (0.30.1)

### 🟡 Scelte prese, e come tornare indietro

- **La prima rata non ha proroga** (art. 1901 c.c.: sul primo premio la
  copertura parte dal pagamento). Trattarla come una quietanza dichiarava
  coperto un cliente che non lo è mai stato. *Indietro:* `PROROGA_PRIMA_RATA`
  in `tariffe/motore/scadenzario.js`, un numero.
- **Due targhe note e diverse non sono un rinnovo.** 34 clienti tornano
  nell'elenco di quelli da richiamare. *Indietro:* la riga
  `if (ta && tb && ta !== tb) continue;` nello stesso motore.
- **Proroga e anticipo sono due parametri distinti.** *Indietro:* far leggere
  a `fasciaDi` un solo numero.
- **I due importi non si sommano**: «premio annuo» e «da incassare» restano
  due colonne. *Indietro:* `conteggi` nel motore.
- **Ogni caricamento prende un numero** e chi non è l'ultimo non scrive.
  *Indietro:* `RIN_GIRO` in `index.html`.

### 🔴 Serve il tuo ok

1. **I 15 giorni di proroga valgono anche sulle polizze SENZA tacito
   rinnovo?** Sul portafoglio sono 3.913 su 4.003, e 77 delle 83 oggi «Nei 15
   giorni». Per l'RC Auto il comporto è di legge; per un altro ramo senza
   tacito, alla scadenza il contratto finisce. Ho lasciato la tua regola («15
   giorni per tutte»): cambiarla direbbe a 77 clienti che sono scoperti.
   Il motore ha già il parametro, è una riga.
2. **Mancano tre conti**: debito verso una compagnia, conto dei sospesi, cassa
   contanti classificata «cassa».
3. **La provvigione matura all'incasso o alla rimessa?**

### 📝 Fuori perimetro, annotato

- Nessuna prova del repository sorveglia che una vista conservi
  `security_invoker` dopo un `create or replace`.
- `sostituisce_id` non lo scrive nessuno: finché «Riquota» non collega la
  polizza nuova alla vecchia, ogni rinnovo resta un indizio.

---

## 22/09/2026 — I sospesi e le modalità di pagamento (0.31.0)

### 🟡 Scelte prese, e come tornare indietro

- **Il vocabolario è una tabella, non sei liste.** Il `CHECK` a nove valori è
  diventato una chiave esterna verso `iam_modalita_pagamento`. *Indietro:* il
  blocco ROLLBACK della migrazione — ma **solo se nessuna riga usa una voce
  nuova**, altrimenti il CHECK la rifiuterebbe e l'ALTER fallirebbe lasciando
  la tabella senza vincolo. La migrazione dice come controllarlo.
- **«Sospeso» qui vuol dire premio non ancora in casa**, ed è la parola di
  Francesco. La linguetta di §32 si chiama «Incassi da accreditare» dal
  20/09, quindi il nome era libero.
- **Un sospeso è una rata APERTA**: nessun archivio nuovo, nessuna terza
  tabella degli incassi. *Indietro:* `Contabilita.daIncassare`.
- **I contanti non sono un sospeso**, e le rate senza modalità stanno in un
  gruppo loro invece di finire sotto «Altro».
- **La schermata dei sospesi non scrive**: «Incassa» porta alla Fase 2.
- **Il caricamento da file resta**, sotto, dichiarato (§17, §33).

### 🔴 Serve il tuo ok

1. **Dichiara le voci che ti servono**: i collaboratori che tengono i premi, e
   le voci che hai nel gestionale vecchio (Finanziamento…). Si fa in
   Strumenti › Conti e causali › Modalità di pagamento.
2. **380 rate su 418 non dicono la modalità**: finché è così i sospesi sono
   quasi tutti «Da dichiarare».
3. Le tre di prima: i 15 giorni sulle polizze senza tacito rinnovo, i tre
   conti mancanti, la provvigione all'incasso o alla rimessa.

### 📝 Fuori perimetro, annotato

- Cambiare la voce di una rata **già incassata e già contabilizzata** dovrebbe
  stornare il movimento: lo storno esiste (§59) ma non è agganciato a questo
  cambio. Oggi non morde, perché le rate in gioco sono aperte.
- `Flusso.MEZZI` resta una lista sua: traduce i codici della compagnia nei
  nostri. Un codice tradotto verso una voce spenta non lo direbbe nessuno.

---

## 22/09/2026 · 0.32.0 — il pagamento lo dicono le rate, e una spesa non si somma

### 🟡 Scelte prese e dichiarate

- **Lo stato del pagamento non si digita più: si deduce dalle rate.** Misurato:
  364 polizze su 4.079 erano in disaccordo con le proprie rate, e 1.444
  dicevano «pagato» senza averne nessuna. *Indietro:* rimettere la tendina in
  `polPagamento` e far filtrare `pfFiltra` su `p.stato_pagamento`. La colonna
  nel database **non è stata riscritta**: c'è tutto com'era.
- **`annullata` resta l'unico valore scritto a mano** di quella colonna, e non
  si deduce: è la vita della polizza, non il suo pagamento.
- **«Non si sa»** è uno stato nuovo per le polizze senza rate. Non è «pagato».
- **Due conti nuovi fra quelli proposti** (costo e ricavo) e il vincolo del
  database allargato. *Indietro:* il blocco ROLLBACK della migrazione
  `20260922k`, ma solo se nessun conto usa le due tipologie.
- **Una spesa con la contropartita su un conto corrente viene rifiutata.** Il
  giroconto resta possibile: il controllo guarda `incide_su_utile`, non il
  segno.
- **Il tetto del Portafoglio (1.000 righe su 4.079) si dichiara invece di
  sparire.** Toglierlo vorrebbe dire scaricare 5,8 MB, misurati.
- **Via il caricamento dei file dai Sospesi** e **via il tasto «Importa» dal
  Portafoglio**, come richiesto. Niente di spento: i dati già caricati si
  rileggono dalla giornata salvata, e l'importazione ha la sua voce di menu.
- **Una rata con la modalità dichiarata esce dallo scadenzario** ed entra nei
  Sospesi: la modalità è la copertura.

### 🔴 Serve il tuo ok

1. **Il movimento «Pagamento Stanza ROMA» va stornato e rifatto** con la
   contropartita su un conto di costo: oggi il CONTO AZIENDALE risulta aver
   incassato 170 € che non ha mai ricevuto. Non l'ho corretto io — un
   movimento registrato non si riscrive, si storna, e lo storno lo firma chi
   lo fa.
2. **Crea «Costi di agenzia» e «Ricavi di agenzia»** da Conti e causali: sono
   nell'elenco dei conti proposti, basta spuntarli. Finché non ci sono,
   qualunque spesa verrà rifiutata (e il motivo lo dice).
3. **Il saldo iniziale è ZERO su tutti e sei i conti.** Quello che hai
   inserito è il saldo DICHIARATO (il tasto «Dichiara il saldo»), che è la
   fotografia della banca per la quadratura — un'altra cosa. Il saldo iniziale
   si scrive aprendo il conto.
4. Le precedenti che restano: i collaboratori da dichiarare come modalità di
   pagamento, le 380 rate su 418 senza modalità, i 15 giorni di proroga sulle
   polizze senza tacito rinnovo, la provvigione all'incasso o alla rimessa.

### 📝 Fuori perimetro, annotato

- Le 1.444 polizze senza rate restano tali finché non si ricarica il file
  della compagnia (§55): adesso però si vedono, filtrando su «Non si sa».
- `PF_MAX` è 1.000 e si dichiara. Alzarlo vuol dire misurare il peso sul
  telefono, non deciderlo a tavolino.
- Cambiare la modalità di una rata già incassata e già contabilizzata dovrebbe
  stornare il movimento: lo storno esiste (§59) ma non è agganciato.

---

## 22/09/2026 · 0.33.0 — Contabilità in pagine separate

### 🟡 Scelte prese e dichiarate

- **Via la striscia di linguette.** Le rotte restano tutte: `goTab('primanota')`
  e i collegamenti vecchi funzionano. *Indietro:* rimettere il blocco
  `<div class="ptabs" id="contab-tabs">` in `iam/index.html`.
- **Il Cruscotto ha una voce di menu**, perché era raggiungibile solo dalla
  striscia.
- **Le tre voci tolte tengono una porta**: «Incassa una rata» dal tasto dentro
  Sospesi, le altre due dai riquadri del Cruscotto. Non sono spente, e non
  potevano esserlo: sono le schermate che aprono un sospeso e che portano un
  incasso in contabilità.
- **I permessi passano dalla porta e non da un bottone nascosto.** Se il
  profilo non si legge non si chiude niente: le politiche del database restano
  il cancello vero.

### 🔴 Serve il tuo ok

Le stesse di prima, più niente di nuovo:
1. Stornare e rifare il movimento «Pagamento Stanza ROMA» con la contropartita
   su un conto di costo.
2. Creare «Costi di agenzia» e «Ricavi di agenzia» da Conti e causali.
3. Il saldo iniziale dei conti è zero: quello che hai inserito è il saldo
   *dichiarato*, che è la fotografia della banca per la quadratura.

### 📝 Fuori perimetro, annotato

- Se un giorno «Premi da recuperare» o «Incassi da accreditare» dovessero
  tornare nel menu, è una riga in `iam/withus-one.js` (più `?v=` e impronta).

---

## 22/09/2026 · 0.34.0 — la polizza a colpo d'occhio

### 🟡 Scelte prese e dichiarate

- **La scheda polizza ha una testata densa, una griglia a colonne e rate e
  sinistri affiancati.** *Indietro:* è tutto dentro `polDettaglio` e il blocco
  `.pol-*`.
- **Definite le classi che non esistevano** (`pol-griglia`, `pol-r`, `pnu-ov`
  e le parti della finestra «Come paga»): era la causa vera del «si vede male».
- **Tre appigli per le prove adesso fanno qualcosa di vero**
  (`pol-produttore`, `pol-rata-aperta`, `pol-firma`): un appiglio senza regola
  il guardiano non lo distingue da un refuso.
- **I sinistri della polizza si leggono dal dettaglio**, con una lettura sua:
  se cade lo dice invece di scrivere «nessun sinistro».

### 🔴 Serve il tuo ok

Le stesse di prima. Niente di nuovo.

### 📝 Fuori perimetro, annotato

- **Scheda cliente e foglio cassa**: la richiesta è fatta per metà. Mancano le
  linguette della scheda cliente (polizze/titoli/sinistri/pagamenti/sospesi) e
  la tabella più densa del foglio cassa — due lavori a sé, e nessuno dei due
  ha classi mancanti da riparare.

---

## 22/09/2026 — La scheda cliente e il foglio cassa (0.35.0)

### ✅ Fatto

- **La scheda cliente apre con l'identità in cima**, larga quanto la finestra,
  in colonne: codice fiscale, nascita ed età, professione, indirizzo, contatti,
  intermediario. *Indietro:* è tutto dentro `apriAnagrafica` (`testaCliente`) e
  il blocco `.clk-*`.
- **Il foglio cassa ha una barra dei totali** al posto delle tessere alte il
  doppio, e una tabella più fitta (righe basse, intestazione che resta in cima,
  righe alternate, riga del totale distinta). *Indietro:* `fcRender` e il
  blocco `.fc-*`.
- **I tre avvisi del foglio cassa uscivano nudi**: scrivevano due nomi di stile
  che esistono in IAM e non nel preventivatore. Adesso hanno la loro cornice.
- **La riga d'errore della finestra «Come paga» non era rossa**: il rosso era
  usato e non dichiarato da nessuna parte.

### 🟡 Scelte da sapere

- **I campi dell'identità sono stati SPOSTATI, non copiati.** Nella colonna di
  sinistra della scheda cliente non ci sono più codice fiscale, nascita,
  professione, indirizzo, contatti e intermediario: sono in cima. Lì resta
  quello che si modifica (residenza dichiarata, consensi, note), e la
  colonna si chiama «Consensi e note». *Indietro:* una riga in
  `apriAnagrafica`.
- **La finestra della scheda cliente è più larga** (980 px invece di 920), per
  far stare la testata in colonne su schermo normale.

### 🔴 Serve il tuo ok

Le stesse di prima. Niente di nuovo.

### 📝 Fuori perimetro, annotato

- **La barra dei totali non ha partite varie, rimessa e premi di direzione**
  come quella del tuo gestionale: quei conti in IAM non esistono, e inventarli
  sarebbe scrivere numeri che nessuno ha deciso.
- **La scheda cliente non ha le linguette «Pagamenti» e «Sospesi»**: quelle due
  liste oggi vivono in Contabilità e nel dettaglio della polizza. Portarle qui
  vuol dire decidere se sono la stessa lista vista da un'altra parte o un
  secondo elenco.

---

## 22/09/2026 — I due conti di costo e di ricavo, creati

> «Crea i conti Costi di agenzia e Ricavi di agenzia» — Francesco.

### ✅ Fatto

Creati in `iam_conti`, esattamente come li propone `Contabilita.CONTI_MINIMI`:

| nome | tipologia | natura | si quadra? | mezzo di pagamento? |
|---|---|---|---|---|
| Costi di agenzia | `costo` | aziendale | no | no |
| Ricavi di agenzia | `ricavo` | aziendale | no | no |

- **Natura AZIENDALE, non «premi»**: un affitto non è denaro di un cliente in
  transito verso la compagnia (art. 117 CAP).
- **Non si quadrano**: un costo non si conta aprendo un cassetto né leggendolo
  su un estratto conto — si legge nel conto economico.
- **Non sono modi di pagare**: non compaiono fra le modalità di incasso.
- **Saldo iniziale 0 e NESSUNA data di dichiarazione**: zero è anche un saldo
  vero, e quella data è l'unica cosa che distingue «è zero» da «nessuno l'ha
  mai scritto».
- **Non entrano nella liquidità del Cruscotto**: `LIQUIDE` è un elenco
  dichiarato (cassa, banca, conto assicurativo, transitorio), quindi i due
  conti nuovi non gonfiano «soldi dell'agenzia».

Due righe a registro (`quote_log`, entità `conto`), firmate, con scritto che
sono nati su richiesta esplicita dalla console.

### 🔴 Serve ancora il tuo ok

- **Il movimento «Pagamento Stanza ROMA» (170 €, 22/09) è ancora sbagliato.**
  Le sue due gambe dicono `CARTA DI CREDITO UNICREDIT` Avere 170 e
  `CONTO AZIENDALE` **Dare** 170: quel conto risulta aver *ricevuto* 170 €
  mai arrivati. Un movimento registrato non si riscrive — si **storna**, e lo
  storno lo firma una persona. Adesso il conto giusto esiste: da Contabilità ›
  Prima nota, aprilo, «Storna», e rifallo con contropartita **Costi di
  agenzia**.
- **«ACQUISTO ACQUA» (25 €, 21/09) non ha gambe**: è nato prima della partita
  doppia, quindi non si storna — non si rovescia quello che non c'è. Si
  **annulla col motivo** e si riscrive, oppure si lascia com'è: resta a
  registro e non sbilancia nessun conto di liquidità.

---

## 22/09/2026 — La scheda cliente come un gestionale (0.36.0)

### ✅ Fatto

- **Barra laterale sempre visibile** con foto, nome, età, nascita, codice
  fiscale, indirizzo, email, telefono e il menu «Operazioni» a gruppi.
- **Tre linguette**: Sintesi cliente · Dettaglio anagrafica · Portafoglio.
- **Sintesi**: ciambella della composizione del portafoglio, ultimi cinque
  eventi, situazione cliente (insoluti, valore, polizze, valore portafoglio),
  consensi e documenti d'identità.
- **Portafoglio**: premi e provvigioni per mese/anno in corso/anno
  precedente, premi per linea prodotto, e le polizze come **schede**.
- **Motore nuovo** `tariffe/motore/scheda-cliente.js` con 12 prove in Node.

### 🟡 Scelte da sapere

- **Le sette linguette di prima** (polizze, preventivi, documenti, sinistri,
  note, trattative, cronologia) sono tutte dentro **Portafoglio**: non è
  sparito niente, hanno solo una casa.
- **L'identità compare in due posti** ed è voluto: la barra è il riepilogo,
  la linguetta Anagrafica è la scheda completa. Sono due letture dello stesso
  dato nello stesso istante, non possono divergere.
- **I periodi si chiamano «anno in corso» e «anno precedente»**, non «ultimo
  anno» come nel tuo gestionale: quella parola vuol dire due cose (gli ultimi
  dodici mesi, oppure l'anno scorso) e chi legge non sa quale.

### 🔴 Serve il tuo ok

Le stesse di prima, più: lo storno del movimento «Pagamento Stanza ROMA» con
la contropartita su «Costi di agenzia», adesso che quel conto esiste.

### 📝 Fuori perimetro, annotato

- **«Pagamenti» e «Sospesi» come linguette della scheda**: quelle due liste
  oggi vivono in Contabilità e nel dettaglio della polizza.

## 22/09/2026 — La spesa che non sottraeva, e i sospesi senza nome (0.37.0)

**Perimetro:** due segnalazioni di Francesco: (1) una spesa in uscita non
sottrae dal conto, (2) in Contabilità › Sospesi non compare nessun sospeso di
Oddo Francesco.

### 🟡 Scelte prese, e come tornare indietro

**1. La tendina della contropartita non offre più tutti i conti.**
Su una causale che incide sul risultato offre solo conti di costo (uscita) o
di ricavo (entrata); sulle altre, tutto tranne costo e ricavo. Se resta una
sola voce, è preselezionata.
*Perché:* il cancello del 21/09 rifiutava già la scelta sbagliata, ma la
tendina continuava a offrirla — quindi la spesa non si poteva più registrare.
*Come tornare indietro:* in `tariffe/motore/contabilita.js`, in
`contropartiteAmmesse`, far tornare `tutti` invece di `ammessi`. La tendina
torna completa e il salvataggio torna a rifiutare.

**2. Il salvataggio usa la stessa funzione della tendina.**
Prima rifiutava solo i conti di liquidità: una spesa con contropartita su
«Ricavi di agenzia» passava, e diceva che l'agenzia aveva guadagnato quello
che aveva speso. L'ha trovato una prova, non la rilettura.
*Come tornare indietro:* togliere il primo `if` aggiunto in `righeSemplici`.

**3. Sotto il modulo si vede l'effetto sui saldi prima di salvare.**
*Come tornare indietro:* togliere il contenitore `#pnt-effetto` e le chiamate
a `pntEffetto()`.

**4. Una PERSONA dichiarata sulla polizza tiene i premi di quella polizza,
anche quando la rata dice un altro mezzo e anche quando la rata è già
incassata.**
*Perché:* «come il cliente ha pagato» e «chi ha in mano i soldi» sono due
domande diverse, e i due campi le portavano già. Misurato: la voce «Oddo
Francesco» era su 2 polizze e su 0 rate, ed entrambe le rate erano incassate.
*Effetto sui numeri:* in Sospesi compare «Oddo Francesco · 2 rate · 662,98 €».
*Come tornare indietro:* in `chiTiene`, togliere il primo `if` (la persona
sulla polizza). I sospesi tornano a leggere solo il mezzo della rata.

**5. Una rata che non dichiara il mezzo lo eredita dalla polizza, marcato.**
*Effetto sui numeri:* 339 rate su 380 escono da «Da dichiarare» e finiscono
sotto il mezzo che la loro polizza dichiara.
*Come tornare indietro:* in `chiTiene`, togliere il terzo `if`.

**6. Una rata incassata è un sospeso solo se a tenerla è una persona.**
Per POS, bonifico e carte resta «Incassi da accreditare»: il ritardo è di
giorni. Le altre non spariscono — si contano e si dichiarano con la porta.
*Come tornare indietro:* in `daIncassare`, rimettere `if (testo(t.stato) !==
'aperto') return;` in cima al ciclo.

### 📝 Fuori perimetro, annotato

- I due movimenti sbagliati sul database restano **annullati**: un movimento
  registrato non si riscrive (regola 13). La spesa di Roma va rifatta con
  «Costi di agenzia» come contropartita.
- Nessun conto dichiara ancora quali mezzi riceve: scaricare un sospeso chiede
  il conto a mano.

## 22/09/2026 — I sospesi delle persone si vedono per primi (0.38.0)

**Perimetro:** «Carpitella Guido 400 € come pagamento Oddo Francesco dovrebbe
andare tra i sospesi, ma non c'è».

### 🟡 Scelte prese, e come tornare indietro

**1. Due sezioni nei Sospesi: le persone sempre prima dei mezzi.**
*Perché:* misurato, Oddo Francesco era il settimo gruppo su sette (662,98 €)
sotto quattro mezzi da 19.000-34.000 € e 418 righe. Un mezzo raccoglie
centinaia di rate, una persona ne ha due: ordinandoli insieme per importo la
persona finisce sempre in fondo.
*Come tornare indietro:* in `daIncassare`, togliere dal `sort` la riga che
confronta `a.sezione`.

**2. I gruppi delle persone nascono aperti; i mezzi no.**
*Come tornare indietro:* togliere il blocco `if (SPR_ESITO && !SPR_TOCCATO)`
in `sprCarica`.

**3. Un contatore nuovo in testa: «Li tiene una persona».**
*Come tornare indietro:* togliere la prima `sprCard` in `sprRender`.

### 🔴 Una richiesta NON applicata alla lettera, e il motivo

«Nei sospesi ci devono andare tutti quei pagamenti impostati come sospesi»:
letta alla lettera porterebbe dentro **2.778 rate già incassate** per
**896.627,80 €** (misurato). Quelle le ha incassate la compagnia: nessuno le
deve all'agenzia, e nei «premi da incassare» sarebbero un numero grande,
credibile e falso. Restano contate e dichiarate con la porta dove si lavorano.
Se la lettura giusta è l'altra, si cambia una riga in `daIncassare` — ma è una
decisione, non una conseguenza.

## 23/09/2026 — 0.39.0 · Sospesi che si aprono, e la quadratura che dice le due cause

### 🟡 Scelte prese da solo

1. **`sprEuro` nuova invece di importare `pfEuro`.** In IAM esistono già
   `recEuro` e `incaEuro` con la stessa forma (`window.Contabilita ?
   Contabilita.euro(n) : String(n)`): se ne è aggiunta una terza per il blocco
   dei Sospesi, invece di spostare la funzione del preventivatore in un file
   condiviso. Spostarla avrebbe toccato QUOTO per un guasto di IAM.
   *Come tornare indietro:* è una riga sola accanto a `sprOggi`.
2. **Le date dei Sospesi passano da `pntData`**, che è la funzione della
   contabilità di IAM e conta sui numeri della stringa invece di passare da
   `new Date()` (§44). `pfData` faceva la conversione via fuso orario.
   *Come tornare indietro:* una sostituzione in una riga.
3. **La prova dei Sospesi adesso FA GIRARE la schermata** con un finto
   PostgREST, e il ciclo che esegue le prove è diventato `await fn()` per
   accettare prove asincrone. Le 22 prove di prima non sono cambiate.
   *Come tornare indietro:* si tolgono le due prove nuove e si rimette `fn()`.
4. **La quadratura elenca due cause e mette per prima quella del saldo di
   partenza.** È una scelta di ordine, non di contenuto: su un conto con pochi
   movimenti è quella che risponde.
   *Come tornare indietro:* si invertono i due `out.cause.push` in
   `tariffe/motore/contabilita.js`.
5. **Il tasto «Correggi il saldo di partenza» PRECOMPILA il campo e non
   salva.** Il numero è una misura (§43) e si vede prima di scriverlo (§44).
   *Come tornare indietro:* si toglie il secondo bottone nella riga della
   quadratura; il modulo del conto continua a funzionare com'era.

### 🔴 Da decidere (nessuna applicata)

- **`CARTA DI CREDITO UNICREDIT` è classificata `banca`.** Una carta di credito
  non è un conto corrente: quello che si legge su una carta è un debito o un
  plafond, non un saldo. Finché non è deciso, il sistema conta e non giudica.
- **Il saldo di partenza vero di quel conto.** Il sistema propone 3.170,00 €
  perché è il numero che fa tornare i conti, non perché sappia che è quello.

### 📝 Fuori perimetro, annotato

- Gli altri blocchi di IAM (prima nota, incassi, recuperi, cruscotto) non hanno
  ancora un banco che li fa girare: nessuno di loro chiama funzioni del
  preventivatore — censito — ma la prova che lo dimostrerebbe girando esiste
  solo per i Sospesi.

## 23/09/2026 — 0.39.1 · Una carta di credito non è un conto corrente

### 🟡 Scelte prese da solo (su «ok per carta di credito»)

1. **Tipologia nuova `carta_credito`** invece di riusare `debito`, che è
   «debiti e crediti verso terzi» — cioè le compagnie. Una carta ha un nome
   che chi lavora riconosce, e in una tendina «debito» non lo direbbe.
   *Come tornare indietro:* una riga in `TIPOLOGIE` e il ROLLBACK in
   `supabase/migrations/20260923_carta_di_credito.sql`.
2. **L'aggiornamento tocca SOLO quel conto**, e solo se è ancora classificato
   `banca`. Un aggiornamento largo («tutti i conti che si chiamano carta…»)
   riclassificherebbe domani un conto chiamato così di proposito.
3. **Il saldo di partenza non è stato toccato.** Resta 0,00: la quadratura
   adesso propone 3.170,00, ma proporre e scrivere sono due cose diverse.

### 🔴 Resta da decidere

- **`CASSA CONTANTI` è di tipologia `altro`** (aperta dal 22/09, §53): il fondo
  cassa somma solo le tipologie `cassa`, quindi quel conto non ci entra e il
  fondo resta a zero. È una decisione contabile, non una correzione.

## 23/09/2026 — 0.40.0 · I punti vendita

### 🟡 Scelte prese da solo

1. **Il punto vendita sta sulla PERSONA** (`quote_collaboratori.punto_vendita_id`),
   non sull'account. Dodici persone su diciassette non hanno un accesso a IAM:
   appendendolo all'account resterebbero fuori dalla struttura.
   *Come tornare indietro:* il ROLLBACK della migrazione toglie la colonna.
2. **Una filiale non può potere più del padre.** Le abilitazioni effettive sono
   l'AND della catena. È la scelta che decide che cosa il sistema permette, ed
   è scritta nel motore con quattro prove sopra.
   *Come tornare indietro:* `effettive` in `tariffe/motore/punti-vendita.js`.
3. **La tabella nasce vuota e le abilitazioni nascono spente.** Niente seme.
4. **«Nuovo utente» porta in Utenti e permessi** invece di aprire un modulo
   qui: l'attivazione di un accesso passa dal server dal 17/09.
5. **Il guardiano della prima nota adesso misura la TABELLA**, non una fetta di
   documento lunga tremila righe: la regola era «un movimento non si cancella».
   È più forte di prima, e la controprova lo dimostra.
6. **Il guardiano del vocabolario del registro vede i tipi con l'underscore.**
   Rinforzandolo ha trovato che `modalita_pagamento` si registrava dal 22/09
   senza essere nel vocabolario: aggiunto.

### 🔴 Resta da decidere

- **«Assegna polizze»**, il terzo bottone della schermata che hai mandato. Qui
  le polizze si attribuiscono già a una PERSONA (produzione per collaboratore):
  aggiungere il punto vendita come secondo asse è una decisione, perché due
  elenchi della stessa produzione direbbero numeri diversi.
- **Le abilitazioni non filtrano ancora niente nel preventivatore**: oggi si
  dichiarano e si leggono. Collegarle a chi può emettere davvero tocca i
  permessi, e va fatto con la sua migrazione.
- **`CASSA CONTANTI` è di tipologia `altro`**: il fondo cassa resta a zero.
