# Criteri di accettazione

La funzione è pronta solo quando tutti i punti sono verificati.

## Funzionalità

- [ ] La pagina è raggiungibile da IAM sotto Strumenti/Marketing.
- [ ] La ricerca riusa l'anagrafica reale.
- [ ] L'operatore può compilare in agenzia.
- [ ] L'operatore può generare e revocare un link.
- [ ] Il cliente vede una pagina pubblica senza shell interna.
- [ ] Il cliente può interrompere e riprendere entro la scadenza prevista.
- [ ] Le selezioni multiple funzionano.
- [ ] Il campo libero viene salvato.
- [ ] Privacy obbligatoria e marketing separato.
- [ ] OTP reale collegato al metodo esistente.
- [ ] Necessità principale e motivazioni sono visibili.
- [ ] Report cliente e scheda agenzia vengono generati.
- [ ] I documenti vengono collegati alla pratica/cliente.

## Sicurezza

- [ ] Nessuna PII nel link.
- [ ] Token hash nel database.
- [ ] Token scaduto/revocato non funziona.
- [ ] Rate limit su token e OTP.
- [ ] Nessun OTP nei log.
- [ ] Nessuna scrittura diretta pubblica a Supabase.
- [ ] RLS attiva.
- [ ] Report interno non scaricabile dal cliente.

## Rating

- [ ] Server autorevole.
- [ ] Regole versionate.
- [ ] Ogni area ha motivazioni.
- [ ] Prodotto presente = blu da verificare.
- [ ] Dati insufficienti = grigio.
- [ ] Nessuna proposta automatica.

## PDF

- [ ] Grafica coerente con i campioni.
- [ ] Snapshot e hash archiviati.
- [ ] Versioni e report ID presenti.
- [ ] Nessun taglio o sovrapposizione.
- [ ] Cliente e agenzia hanno contenuti diversi.

## Qualità del codice

- [ ] Tutto in italiano.
- [ ] Commenti spiegano il perché.
- [ ] Nessuna `.replace()` indiscriminata.
- [ ] Checkpoint creato.
- [ ] Prove rosse prima, verdi dopo.
- [ ] Tutte le suite precedenti verdi.
- [ ] Nessun push o deploy non autorizzato.

## Deploy

- [ ] Frontend pubblicato nel ramo IAM corretto.
- [ ] Backend presente sia su `main` sia sul ramo VPS finché necessario.
- [ ] Migrazione SQL eseguita manualmente dopo approvazione.
- [ ] Rollback documentato.
