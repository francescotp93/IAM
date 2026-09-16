# Specifica funzionale

## 1. Posizionamento del prodotto

Nome: **Analisi dei bisogni**  
Area: **IAM > Strumenti > Marketing**  
Scopo: trasformare i dati del portafoglio in una consulenza strutturata, senza produrre automaticamente una raccomandazione o un preventivo.

## 2. Modalità operative

### 2.1 Compilazione assistita in agenzia

L'operatore:

1. cerca il cliente;
2. apre una nuova analisi;
3. compila insieme al cliente;
4. raccoglie consenso privacy;
5. avvia e verifica OTP con il metodo esistente;
6. mostra il risultato;
7. genera report cliente e scheda agenzia;
8. archivia tutto sulla scheda cliente.

### 2.2 Cliente da casa

L'operatore:

1. cerca il cliente;
2. crea un invito con scadenza;
3. prepara una bozza WhatsApp o email;
4. conferma personalmente l'invio.

Il cliente:

1. apre il link pubblico;
2. supera l'eventuale controllo iniziale previsto;
3. compila il percorso;
4. accetta la privacy;
5. firma tramite OTP;
6. vede una sintesi comprensibile;
7. può scaricare il report cliente o chiedere un contatto.

L'area interna vede apertura, avanzamento, completamento e firma.

## 3. Ricerca cliente

Riutilizzare la ricerca anagrafica esistente. Campi di ricerca:

- nominativo;
- codice fiscale;
- email;
- telefono.

Non duplicare un cliente. La creazione di un nuovo lead resta un'azione esplicita e deve rispettare le regole già esistenti.

## 4. Questionario breve

Obiettivo: **7 passaggi al massimo oltre all'anagrafica precompilata**.

1. famiglia e persone dipendenti;
2. dipendenza dal reddito;
3. abitazione, mutuo e patrimonio;
4. prodotti assicurativi già posseduti, selezione multipla;
5. aree di interesse, selezione multipla;
6. professione/responsabilità e campo libero;
7. privacy e firma OTP.

Per i clienti già presenti, l'anagrafica deve essere precompilata e non deve diventare un passaggio inutilmente lungo.

## 5. Prodotti già presenti

Selezione multipla, almeno:

- polizza casa;
- salute;
- infortuni;
- TCM/protezione mutuo;
- previdenza integrativa;
- RC famiglia;
- tutela legale;
- protezione professionale o impresa.

La presenza di un prodotto non deve produrre automaticamente verde. Deve produrre **blu - da verificare**, perché massimali, esclusioni, franchigie e coerenza non sono ancora noti.

## 6. Aree di interesse

Selezione multipla, almeno:

- protezione famiglia;
- casa e patrimonio;
- salute;
- infortuni;
- mutuo e debiti;
- risparmio;
- pensione;
- professione o impresa.

## 7. Campo aperto

Testo libero per cambiamenti recenti, progetti, dubbi e priorità personali. Non deve essere obbligatorio.

## 8. Rating

Categorie:

- famiglia e reddito;
- casa e patrimonio;
- salute e infortuni;
- previdenza e risparmio;
- responsabilità e professione.

Stati:

- **rosso**: scopertura o priorità alta;
- **ambra**: bisogno da approfondire;
- **blu**: prodotto già presente, adeguatezza da verificare;
- **verde**: nessuna criticità evidente con dati sufficienti;
- **grigio**: dati insufficienti, mai trasformare l'assenza di informazioni in verde.

Ogni stato deve riportare almeno una motivazione testuale.

## 9. Risultato

Il risultato deve mostrare:

- indice complessivo;
- necessità principale;
- motivazioni che l'hanno determinata;
- rating di tutte le aree;
- prodotti già dichiarati;
- informazioni mancanti;
- prossimi passi suggeriti al consulente.

Non deve mostrare prezzi o proporre automaticamente un prodotto specifico.

## 10. Report

### Cliente

Documento semplice, motivato e consegnabile. Deve spiegare perché un'area merita attenzione.

### Agenzia

Documento interno con:

- punteggi;
- risposte;
- coperture dichiarate;
- dati mancanti;
- traccia del colloquio;
- opportunità da verificare;
- audit privacy/OTP.

## 11. Stati della pratica

- `bozza`;
- `invito_creato`;
- `inviata`;
- `aperta`;
- `in_compilazione`;
- `completata`;
- `firmata`;
- `scaduta`;
- `revocata`;
- `annullata`.

La transizione deve essere registrata nell'audit.

## 12. Azioni esterne

- email: bozza da confermare;
- WhatsApp: testo precompilato da confermare;
- OTP: invio richiesto esplicitamente dal cliente o operatore;
- nessuna campagna automatica in questa prima versione.
