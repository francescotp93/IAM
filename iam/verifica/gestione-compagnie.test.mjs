// ═══════════════════════════════════════════════════════════════════════════════
//  GESTIONE COMPAGNIE — la schermata, fatta girare  (21/09/2026)
//
//  `compagnie-provvigioni.test.mjs` sorveglia il SORGENTE: che i bottoni ci
//  siano, che il cancello sia chiamato, che nessuno riscriva una percentuale in
//  posto. Sono guardie utili e non bastano: una schermata che ha tutti i pezzi
//  al posto giusto può lo stesso disegnare la cosa sbagliata.
//
//  Qui la schermata si ESEGUE, con un'anagrafica e un portafoglio finti, e si
//  guarda che cosa esce. Le tre cose che, sbagliate, si vedono solo aprendola:
//
//   · GLI ALIAS. Sulle polizze è scritto «HDI Assicurazioni», in anagrafica
//     «HDI». Se il confronto va per nome esatto, una compagnia configurata
//     risulta scoperta e nessun errore lo dice — è la stessa trappola che il
//     20/09 impediva a `calcola` di trovare le tariffe (CLAUDE.md §28).
//   · QUELLO CHE STA SULLE POLIZZE E NON IN ANAGRAFICA. Senza la scheda non
//     c'è dove attaccare prodotti e provvigioni: se non si elenca, quel
//     portafoglio resta scoperto e non lo sa nessuno.
//   · UNA COMPAGNIA APERTA CHE NON C'È PIÙ. Cancellata da un altro, o
//     ricaricata: la scheda deve tornare all'elenco, non restare vuota.
//
//  Dati tutti inventati (regola di casa §8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { stanza, esiti, deve, RADICE } from './banco.mjs';

const require = createRequire(import.meta.url);
const html = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const Provvigioni = require(path.join(RADICE, '..', 'tariffe', 'motore', 'provvigioni.js'));
const e = esiti('GESTIONE COMPAGNIE');

/* Anagrafica: HDI ha un alias, Prima è spenta. */
const COMPAGNIE = [
  { id: 'c1', nome: 'HDI', alias: ['HDI Assicurazioni'], attiva: true },
  { id: 'c2', nome: 'Prima', alias: [], attiva: false }
];
const PRODOTTI = [
  { id: 'p1', compagnia_id: 'c1', nome: 'RC Vita Privata', ramo: 'persona', attivo: true },
  { id: 'p2', compagnia_id: 'c1', nome: 'Casa', ramo: 'beni', attivo: false },
  { id: 'p3', compagnia_id: 'c2', nome: 'BLACK', ramo: 'rca', attivo: true }
];
/* Una tariffa vigente su HDI, ramo persona. Niente su «beni», che resta
   scoperto pur avendo delle polizze. */
const TARIFFE = [
  { id: 't1', compagnia: 'HDI', ramo: 'persona', aliquota_agenzia: 20, retrocessione_default: 50, dal: '2026-01-01', al: null },
  /* LA SECONDA È SCRITTA COL NOME LUNGO, ed è il caso che smaschera la
     regola. Senza di lei la prova resta verde anche togliendo gli alias da
     `gcDiQuesta`: la copertura passa da `Provvigioni.copertura`, che risolve
     già i nomi col catalogo, quindi arriva qui con «HDI» e il confronto
     esatto basta. Le TARIFFE invece le digita una persona, e può scriverci il
     nome che legge sulle polizze. È il banco più cattivo di §19: una
     controprova restata verde non assolve il codice, accusa la prova. */
  { id: 't2', compagnia: 'HDI Assicurazioni', ramo: 'tutela', aliquota_agenzia: 15, retrocessione_default: 40, dal: '2026-01-01', al: null }
];
/* Il portafoglio nomina la compagnia col nome LUNGO, che in anagrafica è un
   alias — ed è il caso vero: sulle polizze c'è «HDI Assicurazioni». */
const POLIZZE = [
  { compagnia: 'HDI Assicurazioni', modulo: 'persona', prodotto: 'RC Vita Privata' },
  { compagnia: 'HDI Assicurazioni', modulo: 'beni', prodotto: 'Rischi Catastrofali' },
  { compagnia: 'HDI Assicurazioni', modulo: 'beni', prodotto: 'Rischi Catastrofali' },
  { compagnia: 'Plurima', modulo: 'rca', prodotto: 'Auto' }
];

function conSchermata(opz = {}) {
  const s = stanza(html, [
    'gcPuoScrivere', 'gcSulBody', 'gcGuasti', 'gcDiQuesta', 'gcCopertura',
    'gcNuova', 'gcApri', 'gcIndietro', 'gcRender', 'gcElenco', 'gcScheda',
    'catCompagnia', 'prvOggi'
  ], {
    PROFILO: { ruolo: opz.ruolo || 'admin' },
    altro: {
      GC_APERTA: opz.aperta || null, CAT_APERTA: null,
      CAT_COMPAGNIE: opz.compagnie || COMPAGNIE,
      CAT_PRODOTTI: PRODOTTI, CAT_STANDARD: [],
      PRV_TARIFFE: TARIFFE, PRV_POLIZZE: POLIZZE,
      PRV_ACCORDI: [], PRV_GRUPPI: [], PRV_PERSONE: [], PRV_STORICO: false,
      /* Le righe prodotto sono del Catalogo e hanno le loro prove: qui
         interessa che vengano CHIAMATE, non come sono fatte dentro. */
      catRigheProdotti: (c) => '<!--prodotti di ' + c.id + '-->',
      catApriAnagrafica() {}, catApriProdotto() {}, prvApriTariffa() {},
      catData: (d) => String(d || '—'),
      prvRigaTariffa: () => '', prvEuro: (n) => String(n), prvPerc: (n) => String(n) + '%'
    }
  });
  if (s.mancanti.length) throw new Error('non trovo nel sorgente: ' + s.mancanti.join(', '));
  s.ctx.window.Provvigioni = Provvigioni;
  s.ctx.Provvigioni = Provvigioni;
  return s;
}

e.prova('GLI ALIAS: «HDI Assicurazioni» sulle polizze è «HDI» in anagrafica', () => {
  /* Se il confronto andasse per nome esatto, HDI risulterebbe senza prodotti
     e senza provvigioni pur avendone, e le sue polizze finirebbero
     nell'elenco «in portafoglio ma non in anagrafica». Nessun errore lo
     direbbe: è la trappola degli alias di §11 e §28. */
  const s = conSchermata();
  const h = s.ctx.gcElenco(true);
  deve(/HDI/.test(h), 'HDI non compare nell’elenco');
  deve(/1 prodotto/.test(h), 'i prodotti attivi di HDI non sono uno (il secondo è spento): ' + h.slice(0, 400));
  deve(/2 provvigioni in vigore/.test(h),
    'le provvigioni vigenti di HDI non sono due: quella scritta col nome lungo non viene ritrovata. ' + h.slice(0, 400));
  deve(/anche: HDI Assicurazioni/.test(h), 'l’alias non si dichiara');
  /* E le sue polizze NON finiscono fra le compagnie sconosciute. */
  const coda = h.slice(h.indexOf('ma non in anagrafica'));
  deve(!/HDI/.test(coda), 'le polizze di HDI risultano di una compagnia che non c’è');
  return 'alias risolto: 1 prodotto, 2 provvigioni (una col nome lungo), zero polizze orfane';
});

e.prova('le polizze senza provvigione si contano, e sono quelle del ramo scoperto', () => {
  /* La tariffa c'è su «persona» e non su «beni»: le due polizze di «beni»
     sono portafoglio su cui non si sa quanto si guadagna. Dirlo accanto al
     nome è l'unico modo perché qualcuno le configuri. */
  const s = conSchermata();
  const h = s.ctx.gcElenco(true);
  deve(/2 polizze senza provvigione/.test(h), 'le polizze scoperte di HDI non sono due: ' + h.slice(0, 500));
  return '2 su 3, ed è il ramo senza tariffa';
});

e.prova('quello che sta sulle polizze e non in anagrafica si elenca, con «Aggiungi»', () => {
  /* Senza la scheda non c'è dove attaccare prodotti e provvigioni: se non si
     elenca, quel portafoglio resta scoperto e non lo sa nessuno (§1). */
  const s = conSchermata();
  const h = s.ctx.gcElenco(true);
  deve(/ma non in anagrafica/.test(h), 'manca la sezione delle compagnie fuori anagrafica');
  const coda = h.slice(h.indexOf('ma non in anagrafica'));
  deve(/Plurima/.test(coda), 'Plurima non compare fra le compagnie da aggiungere');
  /* Il nome passa da `esc()`, quindi gli apici escono come entità: cercare la
     forma scritta a mano dichiarerebbe rotto un codice giusto — è la trappola
     già annotata per `selected=""` (§19). */
  deve(/catApriAnagrafica\(null,&quot;Plurima&quot;\)/.test(coda),
    'il tasto «Aggiungi» non è precompilato col nome: ' + coda.slice(0, 400));
  return 'Plurima, con il nome già dentro';
});

e.prova('una compagnia SPENTA resta visibile, marcata', () => {
  /* §26: un conto con movimenti non si cancella, si spegne — e vale per le
     compagnie, che hanno polizze sotto. Sparire dall'elenco vorrebbe dire
     rendere invisibile il portafoglio che ci sta attaccato. */
  const s = conSchermata();
  const h = s.ctx.gcElenco(true);
  deve(/Prima/.test(h), 'la compagnia spenta è sparita dall’elenco');
  deve(/cnt-spento/.test(h) && /spenta/.test(h), 'la compagnia spenta non è marcata');
  return 'visibile e marcata';
});

e.prova('chi non è admin non vede i tasti che scrivono', () => {
  /* Il cancello VERO sta nelle politiche del database: qui si controlla solo
     che non si mostri una porta che poi non si apre. La prova sul cancello
     chiamato sta nell'altro file. */
  const admin = conSchermata({ ruolo: 'admin' }).ctx.gcElenco(true);
  const s = conSchermata({ ruolo: 'staff' });
  const staff = s.ctx.gcElenco(s.ctx.gcPuoScrivere());
  deve(/Modifica/.test(admin), 'l’admin non vede «Modifica»');
  deve(!/Modifica/.test(staff), 'chi non è admin vede «Modifica»');
  deve(!/Aggiungi/.test(staff), 'chi non è admin vede «Aggiungi»');
  deve(/Le inserisce un amministratore|Plurima/.test(staff), 'a chi non è admin non resta niente da leggere');
  return 'admin sì, staff no';
});

e.prova('UNA COMPAGNIA APERTA CHE NON C’È PIÙ torna all’elenco, non a una scheda vuota', () => {
  /* Succede davvero: la si apre, un altro la cancella, si ricarica. Una
     scheda vuota si legge come un guasto del programma. */
  const s = conSchermata({ aperta: 'c9-non-esiste' });
  s.ctx.gcRender();
  const h = s.browser.elemento('gc-lista').innerHTML || '';
  deve(/HDI/.test(h) && /Plurima/.test(h), 'non è tornata all’elenco: ' + h.slice(0, 200));
  deve(s.ctx.GC_APERTA === null, 'resta aperta una compagnia che non esiste');
  return 'elenco, e la memoria azzerata';
});

e.prova('la scheda di una compagnia porta dati, prodotti e provvigioni', () => {
  const s = conSchermata({ aperta: 'c1' });
  s.ctx.gcRender();
  const h = s.browser.elemento('gc-lista').innerHTML || '';
  deve(/HDI/.test(h), 'la scheda non nomina la compagnia');
  deve(/prodotti di c1/.test(h), 'la scheda non chiama le righe prodotto del Catalogo');
  deve(/Modifica dati/.test(h), 'dalla scheda non si modificano i dati');
  /* E il riepilogo d'insieme si toglie: sulla scheda di una compagnia i
     numeri di tutte le altre non c'entrano. */
  const somma = s.browser.elemento('prv-somma');
  deve(somma.style.display === 'none', 'il riepilogo d’insieme resta acceso sulla scheda');
  return 'dati, prodotti, provvigioni, e il riepilogo spento';
});

e.prova('le finestre salgono sul BODY, o da un altro pannello non si vedono', () => {
  /* Guasto vero corretto dalla patch: `prv-ov` sta dentro
     `panel-provvigioni`, che da Gestione compagnie è `display:none` — e la
     finestra con lui. Qui si fa girare `gcSulBody` invece di cercarne il
     nome nel sorgente. */
  const s = conSchermata();
  const finto = { parentElement: null };
  let salito = null;
  s.ctx.document.body.appendChild = (el) => { salito = el; el.parentElement = s.ctx.document.body; };
  s.ctx.gcSulBody(finto);
  deve(salito === finto, 'la finestra non sale sul body');
  /* E non risale se c'è già: spostarlo a ogni apertura lo toglierebbe e
     rimetterebbe, perdendo lo stato del modulo dentro. */
  salito = null;
  s.ctx.gcSulBody(finto);
  deve(salito === null, 'la finestra viene rispostata anche quando è già sul body');
  /* Un elemento che non c'è non fa esplodere niente. */
  s.ctx.gcSulBody(null);
  return 'sale una volta sola, e regge il null';
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
