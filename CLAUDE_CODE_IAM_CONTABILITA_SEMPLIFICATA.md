# IAM - Specifica per la contabilità assicurativa semplificata

> Specifica consegnata da Francesco il 21/09/2026. È la **fonte funzionale**
> di questo lavoro. Il piano di esecuzione, con le misure prese sul repository
> e sul database veri, sta in `CONTABILITA-PIANO.md`.

## Istruzioni per Claude Code

Stai lavorando nel repository IAM. Devi implementare un modulo di **contabilità assicurativa operativa semplificata**, ispirato ai flussi descritti nel manuale AssiEasy, senza replicarne interfaccia, codici contabili o complessità non necessarie.

Prima di modificare il codice:

1. Leggi le istruzioni del repository (`CLAUDE.md`, `AGENTS.md`, README e documentazione tecnica).
2. Individua stack, convenzioni, autenticazione, autorizzazioni, modello multi-azienda, ORM/database, sistema di migrazioni, test e componenti UI già presenti.
3. Cerca entità esistenti per clienti, polizze, rate/scadenze, compagnie, collaboratori, pagamenti e utenti. Riutilizzale: non creare duplicati.
4. Presenta un piano breve con file e migrazioni che intendi modificare.
5. Implementa per fasi piccole e verificabili, mantenendo compatibilità con quanto esiste.
6. Se una scelta non è definita, preferisci la soluzione più semplice coerente con l'architettura IAM. Chiedi chiarimenti solo quando la scelta cambia materialmente il comportamento contabile.

Il manuale AssiEasy è una fonte funzionale. Non deve essere trattato come specifica tecnica, né vanno copiati testi, schermate o codici proprietari.

---

## 1. Obiettivo

Permettere a un'agenzia assicurativa di:

- registrare gli incassi relativi a una o più rate/polizze;
- suddividere un incasso fra più modalità di pagamento;
- mettere a copertura una rata anche quando il denaro non è ancora arrivato, creando un **sospeso**;
- recuperare il sospeso, anche con pagamenti parziali, senza perdere lo storico;
- generare automaticamente la prima nota in Dare/Avere;
- consultare prima nota, saldi e scadenziario;
- effettuare una quadratura giornaliera di cassa, banca, POS e altri conti verificabili;
- mantenere una traccia completa di chi ha creato, registrato, stornato o modificato ogni dato.

Questo modulo è una **contabilità gestionale assicurativa**, non sostituisce la contabilità fiscale del commercialista.

## 2. Perimetro della prima versione

### Incluso

- Piano dei conti minimo e configurabile.
- Causali contabili.
- Prima nota a partita doppia.
- Registrazione incassi di rate/polizze.
- Pagamenti multipli.
- Sospesi e recuperi parziali/totali.
- Elenco scadenze assicurative da incassare.
- Quadratura giornaliera.
- Estratto conto per singolo conto.
- Ricerca, filtri ed esportazione CSV.
- Permessi e audit log.
- Storni dei movimenti registrati.

### Non incluso nella prima versione

- Contabilità generale completa dell'azienda.
- Bilancio civilistico o adempimenti fiscali.
- Gestione completa di costi, ricavi, cespiti e IVA.
- Esportazione specifica verso il gestionale del commercialista.
- Importazione automatica dei flussi di tutte le compagnie.
- Gestione completa delle partite non tecniche, rappel e sinistri.
- Replicazione del piano dei conti numerico di AssiEasy.
- Modifica o cancellazione distruttiva dei movimenti già registrati.

## 3. Principi obbligatori

1. **Partita doppia:** per ogni movimento registrato, totale Dare e totale Avere devono coincidere al centesimo.
2. **Incasso bilanciato:** la somma delle modalità di pagamento deve essere uguale alla somma delle rate/titoli selezionati.
3. **Atomicità:** incasso, allocazioni, eventuale sospeso e prima nota devono essere salvati nella stessa transazione database.
4. **Immutabilità:** un movimento registrato non si elimina e non si riscrive. Si corregge con uno storno collegato all'originale.
5. **Audit:** memorizzare utente, data e ora di creazione, registrazione e storno.
6. **Precisione:** usare decimal/fixed precision per gli importi; mai floating point.
7. **Separazione aziende:** ogni dato contabile deve rispettare il tenant/agenzia previsto da IAM.
8. **Idempotenza:** doppio click, retry o ripetizione di una richiesta non devono creare duplicati.
9. **Storico sospesi:** apertura e recuperi devono rimanere consultabili anche dopo la chiusura.
10. **Nessun saldo memorizzato come verità primaria:** i saldi derivano dalle righe di prima nota; eventuali cache devono essere ricostruibili.

## 4. Glossario

- **Rata/titolo:** importo assicurativo da incassare, collegato a polizza, cliente, compagnia e data di scadenza.
- **Incasso:** operazione con cui una o più rate vengono regolate tramite una o più modalità di pagamento.
- **Sospeso:** premio già messo a copertura/rendicontato, ma non ancora ricevuto dall'agenzia dal cliente o collaboratore.
- **Recupero sospeso:** denaro ricevuto successivamente che riduce il residuo del sospeso.
- **Prima nota:** insieme dei movimenti contabili operativi.
- **Movimento:** testata contabile con due o più righe Dare/Avere.
- **Quadratura:** confronto tra saldo calcolato da IAM e valore reale dichiarato/verificato dall'operatore.
- **Storno:** movimento inverso che annulla contabilmente un movimento precedente conservandone lo storico.

## 5. Piano dei conti minimo

Il sistema deve creare conti iniziali modificabili dall'amministratore:

| Categoria | Esempi | Utilizzabile come pagamento | Quadrabile |
|---|---|---:|---:|
| Disponibilità | Cassa contanti | Sì | Sì |
| Disponibilità | Assegni | Sì | Sì |
| Disponibilità | Banca assicurativa | Sì | Sì |
| Transitorio | POS da accreditare | Sì | Sì |
| Crediti | Sospesi clienti | Sì | Tramite scadenziario |
| Crediti | Sospesi collaboratori | Sì | Tramite scadenziario |
| Debiti/crediti | Compagnia | No | Sì |
| Debiti/crediti | Collaborazione | No | Sì |
| Rettifiche | Abbuoni passivi | Sì | Sì |
| Rettifiche | Eccedenze/abbuoni attivi | Sì | Sì |
| Transitorio | Incassi diretti in compagnia | Sì | Sì |
| Transitorio | Partite da identificare | Sì | Sì |

Ogni conto dovrebbe avere almeno:

- identificativo interno;
- codice leggibile e univoco nell'agenzia;
- nome;
- categoria/tipo;
- stato attivo/inattivo;
- flag `isPaymentMethod`;
- flag `isSuspenseAccount`;
- flag `isReconciliable`;
- eventuale compagnia o collaboratore associato;
- data e utente di creazione/modifica.

Non codificare nel software numerazioni rigide come 0401 o 4101. Se IAM possiede già un sistema di codici, rispettarlo.

## 6. Modello dati concettuale

Adatta nomi e relazioni alle convenzioni del repository.

### `accounting_accounts`

- `id`
- `organization_id`
- `code`
- `name`
- `type`: `cash`, `cheque`, `bank`, `pos_clearing`, `suspense_customer`, `suspense_collaborator`, `company_balance`, `collaboration_balance`, `write_off`, `direct_company_payment`, `unidentified`, `other`
- `is_payment_method`
- `is_suspense_account`
- `is_reconciliable`
- `company_id` nullable
- `collaborator_id` nullable
- `active`
- audit timestamps/users

### `accounting_causes`

- `id`
- `organization_id`
- `code`
- `name`
- `kind`: almeno `premium_collection`, `suspense_opening`, `suspense_recovery`, `manual`, `transfer`, `reversal`
- configurazione facoltativa dei conti proposti
- `active`

### `accounting_entries`

- `id`
- `organization_id`
- numero progressivo leggibile
- `entry_date`
- `description`
- `cause_id`
- `status`: `draft`, `posted`, `reversed`
- `source_type` e `source_id` oppure relazione polimorfica equivalente
- `idempotency_key` univoca nel tenant, se coerente con l'architettura
- `reversal_of_entry_id` nullable
- `created_by`, `posted_by`, `reversed_by`
- timestamps

### `accounting_entry_lines`

- `id`
- `entry_id`
- `account_id`
- `description`
- `debit_amount`
- `credit_amount`
- eventuali dimensioni già usate da IAM: compagnia, cliente, collaboratore, polizza

Vincoli:

- una riga può avere Dare oppure Avere, non entrambi;
- l'importo deve essere maggiore di zero;
- per un movimento `posted`, somma Dare = somma Avere;
- i movimenti `posted` non sono aggiornabili o eliminabili via applicazione.

### `premium_collections`

- `id`
- `organization_id`
- `collection_date`
- `customer_id`
- `status`: `draft`, `posted`, `reversed`
- `accounting_entry_id`
- note e audit

### `premium_collection_items`

Collega l'incasso alle rate/titoli esistenti.

- `collection_id`
- `policy_due_id` o entità equivalente esistente
- `amount`

### `premium_collection_payments`

- `collection_id`
- `account_id` usato come modalità di pagamento
- `amount`
- riferimento facoltativo: CRO, assegno, POS, nota

### `suspenses`

- `id`
- `organization_id`
- `suspense_account_id`
- `customer_id`
- `policy_id`
- `policy_due_id`
- `company_id`
- `collaborator_id` nullable
- `opened_on`
- `expected_on` nullable
- `original_amount`
- `status`: `open`, `partial`, `closed`, `reversed`
- `opening_entry_id`
- note e audit

Il residuo deve essere calcolato come importo originale meno recuperi validi, evitando incoerenze fra un campo aggiornabile e lo storico.

### `suspense_recoveries`

- `id`
- `suspense_id`
- `recovery_date`
- `amount`
- `payment_account_id`
- `accounting_entry_id`
- riferimento pagamento e audit

### `daily_reconciliations`

- `id`
- `organization_id`
- `account_id`
- `reconciliation_date`
- `system_balance`
- `declared_balance`
- `difference`
- `status`: `open`, `matched`, `explained`
- nota esplicativa
- utente e timestamps

### Audit

Se IAM possiede già un audit log, usarlo. In caso contrario prevedere un registro append-only almeno per operazioni contabili sensibili.

## 7. Regole di contabilizzazione

### 7.1 Incasso immediato

Esempio: premio di 500 euro pagato con bonifico.

- Dare: Banca 500
- Avere: Debito verso compagnia 500

Se l'incasso usa più modalità, creare una riga Dare per ciascuna modalità. L'Avere resta imputato al conto della compagnia associata alla rata. Se le rate appartengono a compagnie diverse, creare le righe Avere distinte.

### 7.2 Apertura di un sospeso

La rata è messa a copertura, ma il denaro non è stato ricevuto.

- Dare: Sospesi clienti o sospesi collaboratori
- Avere: Debito verso compagnia

La registrazione crea contestualmente la posizione nello scadenziario sospesi.

### 7.3 Recupero di un sospeso

Esempio: il cliente paga 200 euro in contanti su un sospeso di 500.

- Dare: Cassa contanti 200
- Avere: Sospesi clienti 200

Il sospeso passa a `partial` e il residuo diventa 300. Al recupero degli ultimi 300 passa a `closed`.

Il recupero non deve generare un nuovo credito verso compagnia: quel debito è già nato all'apertura del sospeso.

### 7.4 Trasferimento POS verso banca

Quando un accredito POS viene contabilizzato in banca:

- Dare: Banca
- Avere: POS da accreditare

Le commissioni POS non fanno parte dell'MVP, salvo che IAM le gestisca già.

### 7.5 Versamento contanti in banca

- Dare: Banca
- Avere: Cassa contanti

### 7.6 Abbuono

L'abbuono può completare l'incasso solo entro una soglia configurabile e con permesso adeguato. Deve avere una modalità/conto dedicato e risultare nella quadratura giornaliera.

### 7.7 Storno

Lo storno genera un nuovo movimento con Dare/Avere invertiti, riferimento obbligatorio all'originale, motivazione e utente. Deve aggiornare coerentemente lo stato dell'incasso o del sospeso collegato senza cancellarne la storia.

## 8. Flussi utente

### A. Registrare un incasso

1. Cercare cliente, polizza o numero rata.
2. Selezionare una o più rate aperte.
3. Il sistema propone importo totale e compagnia/e.
4. Inserire una o più modalità di pagamento.
5. Mostrare in tempo reale: totale rate, totale pagamenti e differenza.
6. Consentire la conferma solo quando la differenza è zero.
7. Alla conferma creare incasso, allocazioni e prima nota in un'unica transazione.
8. Mostrare numero movimento e riepilogo.

### B. Aprire un sospeso

1. Dalla rata selezionare `Metti in sospeso` oppure scegliere il conto sospesi fra le modalità di regolazione.
2. Richiedere tipo sospeso: cliente o collaboratore.
3. Proporre cliente, polizza, compagnia, importo e data.
4. Consentire data prevista e nota.
5. Creare apertura sospeso e movimento contabile atomico.

### C. Recuperare un sospeso

1. Aprire lo scadenziario sospesi.
2. Filtrare per stato, scadenza, cliente, polizza, compagnia o collaboratore.
3. Selezionare un sospeso.
4. Inserire importo ricevuto e modalità di pagamento.
5. Non consentire importi superiori al residuo, salvo un flusso esplicito per eccedenze.
6. Registrare il recupero e aggiornare lo stato derivato.

Il recupero multiplo di più sospesi può essere implementato dopo il flusso singolo, riusando lo stesso servizio applicativo.

### D. Quadratura giornaliera

1. Selezionare data.
2. Mostrare i conti quadrabili e il saldo IAM alla data.
3. L'operatore inserisce il valore realmente verificato.
4. Calcolare differenza.
5. Stato `matched` solo con differenza zero.
6. Per una differenza non zero richiedere nota oppure lasciare la quadratura aperta.
7. La quadratura non deve modificare automaticamente la prima nota.

## 9. Schermate minime

Integrare navigazione e stile nell'interfaccia IAM esistente.

### Dashboard contabilità

- incassi del giorno;
- sospesi aperti e scaduti;
- totale esposizione sospesi;
- conti non quadrati oggi;
- ultime registrazioni;
- collegamenti rapidi a nuovo incasso, sospesi e prima nota.

### Incassi

- ricerca rate/titoli;
- carrello delle rate selezionate;
- pagamenti multipli;
- indicatore evidente della differenza;
- riepilogo prima della conferma.

### Sospesi

- tabella con cliente, polizza, compagnia, apertura, data prevista, importo originario, recuperato, residuo e stato;
- filtri e ordinamento;
- evidenza degli scaduti;
- dettaglio con timeline di apertura, recuperi e storni;
- azione `Registra recupero`.

### Prima nota

- filtri per periodo, causale, conto, cliente, polizza, compagnia, utente e stato;
- elenco movimenti;
- dettaglio righe Dare/Avere;
- azione di storno solo per utenti autorizzati;
- esportazione CSV.

### Quadratura

- saldi calcolati e dichiarati affiancati;
- differenze evidenziate;
- storico delle quadrature.

### Impostazioni contabilità

- piano dei conti;
- causali;
- soglia abbuoni;
- permessi, se non centralizzati altrove.

## 10. Permessi

Integrare nel sistema autorizzativo esistente almeno queste capacità:

- `accounting.view`
- `accounting.collect`
- `accounting.suspense.manage`
- `accounting.entry.create`
- `accounting.entry.reverse`
- `accounting.reconcile`
- `accounting.settings.manage`
- `accounting.export`

Profili suggeriti:

- **Lettore:** sola consultazione.
- **Operatore incassi:** incassi e recuperi, senza configurazione né storni.
- **Contabile:** prima nota, quadrature e storni.
- **Amministratore:** piano dei conti, causali e permessi.

Se IAM limita collaboratori/produttori ai propri dati, applicare lo stesso filtro anche a sospesi e incassi.

## 11. Validazioni ed errori

- Impedire movimenti sbilanciati.
- Impedire importi nulli o negativi, tranne movimenti di storno generati dal sistema.
- Impedire incassi superiori al residuo della rata, salvo flusso esplicito.
- Impedire recuperi superiori al residuo del sospeso.
- Impedire utilizzo di conti inattivi.
- Impedire modifica o cancellazione di movimenti registrati.
- Gestire concorrenza: due operatori non possono incassare la stessa quota residua.
- Messaggi di errore in italiano, chiari e orientati all'azione.

## 12. Criteri di accettazione

### Scenario 1 - Incasso singolo

Data una rata aperta di 500 euro, quando viene incassata interamente tramite banca, allora:

- la rata risulta pagata;
- esiste un incasso di 500;
- esiste un movimento bilanciato con Banca in Dare e Compagnia in Avere;
- il movimento mostra autore e data/ora.

### Scenario 2 - Pagamento multiplo

Data una rata di 500 euro, quando si registrano 300 in contanti e 200 tramite POS, allora il sistema crea un solo incasso con due righe Dare e una o più righe Avere coerenti con le compagnie delle rate.

Se i pagamenti totalizzano 499,99, la conferma viene bloccata.

### Scenario 3 - Sospeso

Data una rata di 500 euro messa a copertura senza ricevere denaro, il sistema apre un sospeso di 500 e registra Sospesi in Dare e Compagnia in Avere.

### Scenario 4 - Recupero parziale

Dato un sospeso aperto di 500 euro, quando vengono ricevuti 200 euro in contanti, il residuo diventa 300, lo stato diventa `partial` e la prima nota contiene Cassa in Dare e Sospesi in Avere per 200.

### Scenario 5 - Chiusura sospeso

Dato il residuo di 300, quando vengono ricevuti 300 euro tramite banca, il sospeso passa a `closed`, il residuo è zero e l'intera timeline rimane consultabile.

### Scenario 6 - Storno

Dato un incasso registrato, quando un utente autorizzato lo storna specificando il motivo, viene creato il movimento inverso; l'originale resta visibile e collegato allo storno.

### Scenario 7 - Quadratura

Dato un saldo IAM della cassa di 1.250 euro e un valore dichiarato di 1.240, il sistema mostra una differenza di -10 e non marca la quadratura come conclusa senza una gestione esplicita della differenza.

### Scenario 8 - Concorrenza

Se due operatori tentano di incassare contemporaneamente l'ultimo residuo della stessa rata o dello stesso sospeso, una sola operazione deve riuscire.

## 13. Test richiesti

- Unit test per regole di bilanciamento e calcolo residui.
- Test dei servizi applicativi per incasso, sospeso, recupero, storno e quadratura.
- Test di autorizzazione e isolamento fra aziende.
- Test di concorrenza o locking sul residuo.
- Test di rollback: se la prima nota fallisce, non deve restare un incasso o sospeso parziale.
- Test end-to-end dei tre flussi principali: incasso, apertura sospeso, recupero sospeso.
- Test per valuta e arrotondamenti al centesimo.

## 14. Ordine di implementazione

### Fase 1 - Fondamenta

- piano dei conti;
- causali;
- movimenti e righe di prima nota;
- validazione Dare/Avere;
- permessi e audit.

### Fase 2 - Incassi

- collegamento alle rate/polizze esistenti;
- pagamenti singoli e multipli;
- generazione prima nota;
- test di atomicità e concorrenza.

### Fase 3 - Sospesi

- apertura;
- scadenziario;
- recuperi parziali e totali;
- timeline e filtri.

### Fase 4 - Controllo

- prima nota consultabile;
- estratto conto;
- quadratura giornaliera;
- esportazione CSV;
- dashboard sintetica.

Non avviare nella stessa modifica funzioni fuori MVP finché i flussi principali non sono testati e stabili.

## 15. Output atteso da Claude Code

Al termine di ogni fase restituisci:

1. sintesi delle decisioni prese;
2. migrazioni e file modificati;
3. test aggiunti ed esito dei test;
4. istruzioni per provare il flusso nell'interfaccia;
5. eventuali assunzioni o punti ancora da decidere;
6. screenshot o verifica visiva se il progetto dispone di un ambiente avviabile.

## 16. Principio guida dell'interfaccia

L'operatore non deve conoscere la partita doppia per registrare un incasso. Deve scegliere rate e modalità di pagamento; IAM genera automaticamente la scrittura contabile. Dare/Avere restano visibili nel dettaglio e modificabili manualmente solo nei movimenti diversi, con permessi adeguati.
