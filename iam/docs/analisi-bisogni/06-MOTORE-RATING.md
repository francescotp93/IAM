# Motore di rating dei bisogni

## 1. Scopo

Il motore ordina le aree da approfondire. Non decide l'adeguatezza, non propone automaticamente un prodotto e non sostituisce il consulente.

Versione iniziale proposta: `ABR-1.0.0`.

## 2. Principi

- regole esplicite e spiegabili;
- stesso input = stesso output;
- calcolo autorevole sul server;
- ogni punteggio porta le proprie motivazioni;
- nessun verde se i dati sono insufficienti;
- prodotto presente = blu da verificare, non verde;
- versione delle regole salvata insieme al risultato;
- qualsiasi modifica alle regole produce una nuova versione.

## 3. Categorie

| chiave | etichetta |
|---|---|
| `famiglia` | Famiglia e reddito |
| `casa` | Casa e patrimonio |
| `salute` | Salute e infortuni |
| `previdenza` | Previdenza e risparmio |
| `responsabilita` | Responsabilità e professione |

## 4. Soglie

Quando non esiste un prodotto dichiarato:

- 65-100: rosso, priorità alta;
- 38-64: ambra, da approfondire;
- 0-37: verde, bassa priorità, solo con dati sufficienti;
- dati incompleti: grigio.

Quando esiste un prodotto dichiarato:

- blu, da verificare;
- il punteggio resta visibile;
- il testo deve indicare cosa verificare.

## 5. Indicatore complessivo

Ordinare le categorie per urgenza e calcolare:

```text
50% prima categoria + 30% seconda + 20% terza
```

L'indicatore complessivo non deve nascondere le singole aree.

## 6. Ordinamento della necessità principale

Proposta iniziale:

```text
urgenza = punteggio
         + 15 se rosso
         + 5 se ambra
         + 0 se blu
         - 10 se verde
```

Il grigio va in fondo finché mancano dati.

## 7. Regole iniziali

Le regole dettagliate sono nel modulo di riferimento `reference/analisi-bisogni-rating.mjs`.

Esempi:

- figli o famiglia allargata aumentano famiglia/reddito;
- alta dipendenza dal reddito aumenta famiglia e salute;
- mutuo aumenta famiglia e casa;
- mutuo senza TCM dichiarata aumenta famiglia;
- proprietà o più immobili aumentano casa;
- assenza dichiarata di salute e infortuni aumenta salute;
- interesse pensione/risparmio aumenta previdenza;
- attività/impresa aumenta responsabilità/professione.

## 8. Motivi obbligatori

Ogni categoria deve avere:

- `punteggio`;
- `stato`;
- `colore`;
- `motivi[]`;
- `prossimo_passo`;
- `versione_regole`.

Non salvare soltanto il numero.

## 9. Scenario di prodotto presente

Esempio casa con mutuo e polizza casa già presente:

- stato: blu;
- testo: "Polizza casa presente: verificare somme assicurate, eventi naturali, danni da acqua, responsabilità civile ed eventuali vincoli del mutuo";
- mai dichiarare che il bisogno è già coperto senza leggere il contratto.

## 10. Evoluzione futura

Solo dopo aver raccolto dati sufficienti e puliti:

- confronto conversioni per segmento;
- efficacia delle campagne;
- regole configurabili da admin;
- modelli statistici.

La prima versione deve rimanere deterministica e auditabile.
