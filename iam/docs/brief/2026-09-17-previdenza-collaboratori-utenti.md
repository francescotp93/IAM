# Brief di Francesco — 17/09/2026

Ricevuto in sessione, trascritto qui perché non si perda. Due lavori separati,
**un merge alla volta**. Il Lavoro 2 conferma la decisione del 17/09: i
collaboratori e gli utenti li gestisce IAM (passo 3, modulo 2).

## LAVORO 1 — Modulo Analisi previdenziale

### 1.1 Cliente dall'anagrafica
Oggi l'analisi parte da nome e cognome scritti a mano. Deve invece partire da
un cliente vero:
- campo di ricerca sul portafoglio esistente (`quote_anagrafiche`)
- in alternativa, inserimento di un cliente nuovo che viene registrato in
  anagrafica, non solo usato per il report
- niente nominativi volanti: ogni analisi è agganciata a un'anagrafica

### 1.2 Tipo di lavoro e ramo datoriale
Nel menu a tendina del tipo di lavoro:
- Dipendente privato → flusso attuale, va bene così
- Autonomo / libero professionista → compare un flag «Ha dipendenti?» sì/no

Se «ha dipendenti» = sì, si apre in cascata:
1. Sopra o sotto i 50 dipendenti (determina le aliquote)
2. Numero di dipendenti
3. Stipendio medio mensile

Con questi tre dati il modulo calcola il risparmio del conferimento del TFR al
fondo. Mostrare sia il risparmio annuo sia il totale su 20 anni (l'annuo è il
numero che il cliente verifica subito; il ventennale regge su ipotesi di
organico e stipendio costanti). Valori medi realistici vanno bene:
l'approssimazione si dichiara nel PDF.

### 1.3 Numeri lato datoriale (verificati)
- Deduzione dal reddito d'impresa: 6% del TFR conferito per aziende fino a 50
  dipendenti, 4% sopra i 50
- Esonero Fondo di garanzia INPS: 0,20% della retribuzione imponibile (0,40%
  per dirigenti industriali ex INPDAI), nella stessa percentuale di TFR conferito
- Sgravio contributi minori (CUAF): fino a 0,28%, graduale, proporzionale alla
  quota di TFR che esce
- Rivalutazione TFR in azienda: 1,5% + 75% dell'inflazione, a carico dell'azienda
- Fondo di Tesoreria INPS: sopra i 50 dipendenti il TFR non resta comunque in
  azienda. Per quelle aziende il confronto vero è fondo contro Tesoreria, non
  fondo contro azienda: il modulo deve dirlo

### 1.4 Output del ramo datoriale
Prima la tabella di confronto grafica e pulita: TFR in azienda vs TFR al fondo
complementare, con i numeri. Sotto, la spiegazione discorsiva delle differenze:
fondo di garanzia, rivalutazione, liquidità, anticipazioni, deduzione.

### 1.5 Ramo dipendente
Pulsante «TFR in azienda» sì/no:
- sì → mostra confronto e vantaggi lato dipendente tra TFR in azienda e TFR nel fondo
- no → si parla solo di pensione complementare, senza mai nominare il TFR

### 1.6 PDF
Stessa identica interfaccia grafica del preventivo personalizzato: verde
`#02984e`, fascia scura coi due cerchi, schede bianche bordate, carta intestata.
Gli stessi numeri, non una grafica somigliante. Disclaimer già previsto:
proiezione illustrativa su ipotesi, non garantita.

### 1.7 Invio al cliente
In fondo all'analisi, invio del report via email e via WhatsApp:
- testo già precompilato e modificabile, invio con un solo pulsante
- selettore tono amichevole / professionale
- il testo cambia in base al caso: dipendente con TFR, datore di lavoro, sola
  pensione complementare
- chiude con la firma del consulente: campo selezionabile tra i collaboratori,
  preimpostato sull'utente collegato ma modificabile (può firmare un
  collaboratore diverso)

## LAVORO 2 — Collaboratori e Utenti (in IAM)

### 2.1 Rinomina
Operativa → Collaboratori. Il nome dice cosa contiene.

### 2.2 Fonte unica
`quote_collaboratori` (sezione Collaboratori) resta l'unica anagrafica. La
sezione Utenti legge da lì e ci aggiunge sopra solo i permessi. Nessun record
da creare due volte, nessuna doppia verità sulla stessa persona.

### 2.3 Sezione Utenti — struttura ad albero
`Utenti > Lista utenti`
- vista sintetica per riga: nome e numero RUI
- icona ingranaggio per riga → apre la gestione permessi

Un collaboratore inserito in Collaboratori compare automaticamente nella lista
utenti. Senza permessi è semplicemente inattivo, non abilitato all'accesso.

### 2.4 Schermata permessi — tre gruppi
1. Visualizzazioni dentro IAM (quali sezioni vede)
2. Compagnie visibili su Quoto
3. Attivazione piattaforma IAM → all'attivazione, invio automatico delle
   credenziali alla mail registrata

## Nota di chi ha trascritto
Il Lavoro 2 chiude anche il modulo 2b del passo 3: quando la sezione
Collaboratori di IAM avrà il segno «struttura», i documenti, la privacy firmata
(`iam_firme`) e la ricerca in `iam_team` per CF, la scheda collaboratori di
QUOTO si spegne (INTERFACCIA-QUOTO-IAM.md §2.7).
