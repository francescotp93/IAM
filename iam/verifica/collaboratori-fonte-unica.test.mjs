// ═══════════════════════════════════════════════════════════════════════════════
//  I COLLABORATORI: UNA FONTE SOLA — le tendine di IAM  (21/09/2026)
//
//  > «In ogni punto dell'app dove si cerca, seleziona o inserisce un
//  > collaboratore la fonte deve essere SEMPRE e SOLO la tabella della sezione
//  > Collaboratori.» — Francesco.
//
//  MISURATO PRIMA DI TOCCARE. Tre tendine leggevano `iam_utenti`, che è il
//  registro degli ACCOUNT: cinque righe, quelle con una password. Il registro
//  delle PERSONE è `quote_collaboratori` e ne ha diciassette. Chi non ha un
//  accesso a IAM — la maggioranza — non compariva in nessuna delle tre.
//
//  Le regole stanno nel motore condiviso (otto prove in Node). Qui si
//  sorveglia che le schermate lo usino, e le due cose che si rompono in
//  silenzio: una tendina che perde il valore che sta guardando, e un filtro
//  che cambia significato insieme alla fonte.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { ritaglia, stanza, esiti, deve, RADICE } from './banco.mjs';

const require = createRequire(import.meta.url);
const html = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const C = require(path.join(RADICE, '..', 'tariffe', 'motore', 'collaboratori.js'));
const e = esiti('COLLABORATORI · FONTE UNICA');

const GENTE = [
  { id: 'p1', nome: 'Mario', cognome: 'Rossi', email: 'm@e.it', attivo: true,  iam_id: 'u1' },
  { id: 'p2', nome: 'Anna',  cognome: 'Neri',  email: 'a@e.it', attivo: true,  iam_id: null },
  { id: 'p3', nome: 'Luigi', cognome: 'Verdi', email: 'l@e.it', attivo: false, iam_id: 'u3' }
];

function conBlocco(nomi, extra = {}) {
  const s = stanza(html, nomi, {
    altro: Object.assign({
      COL_GENTE: GENTE, COL_ULTIMO: Date.now(),
      colCarica: async () => GENTE
    }, extra.altro || {}),
    db: extra.db
  });
  if (s.mancanti.length) throw new Error('non trovo nel sorgente: ' + s.mancanti.join(', '));
  s.ctx.window.Collaboratori = C;
  s.ctx.Collaboratori = C;
  return s;
}

e.prova('IL MOTORE SI CARICA, NON SI COPIA', () => {
  /* Due copie delle regole sarebbero due elenchi di collaboratori della stessa
     agenzia. Si cerca il TAG, non la stringa: quel percorso compare anche nei
     commenti (§18, §26). */
  deve(/<script src="\/nuovo-preventivo\/tariffe\/motore\/collaboratori\.js\?v=/.test(html),
    'IAM non carica il motore dei collaboratori');
  const b = ritaglia(html, 'colCarica');
  deve(/from\('quote_collaboratori'\)/.test(b), 'il lettore non legge il registro delle persone');
  deve(/Collaboratori\.COLONNE/.test(b), 'le colonne non arrivano dal motore: due select diverse, due tendine diverse');
  return 'un tag, un lettore, una lista di colonne';
});

e.prova('LE TRE TENDINE NON LEGGONO PIÙ GLI ACCOUNT', () => {
  /* La condivisione invece resta sugli account, ed è giusto: si condivide con
     chi può entrare in IAM, non con chi è in anagrafica. Due domande diverse. */
  const tratt = ritaglia(html, 'renderTratt');
  deve(!/iam_utenti/.test(tratt), 'il filtro delle trattative legge ancora gli account');
  deve(/colOpzioniNome\(/.test(tratt), 'il filtro delle trattative non usa la tendina unica');

  const i = html.indexOf("const sel = document.getElementById('mt-collab');");
  const seg = html.slice(i, i + 1600);
  deve(/colOpzioniNome\(/.test(seg), 'la scheda della trattativa non usa la tendina unica');
  deve(/mt-condividi|shareSel/.test(seg), 'la condivisione è sparita insieme al resto');

  const prod = html.slice(html.indexOf("const collabSel = document.getElementById('prod-collab');"), html.indexOf("const anno = parseInt(annoSel"));
  deve(/colCarica\(\)/.test(prod), 'il filtro della produzione non parte dal registro');
  /* E il VALORE resta l'account: quel filtro lavora su `creato_da`, e cambiare
     la fonte dei nomi non deve cambiare il significato del filtro. */
  deve(/c\.iam_id/.test(prod), 'il filtro della produzione ha cambiato significato insieme alla fonte');
  return 'tre tendine dal registro, la condivisione dov’era';
});

e.prova('UNA TENDINA NON PERDE IL VALORE CHE STA GUARDANDO', () => {
  /* Le trattative salvano il NOME, e il nome era composto «Nome Cognome»
     mentre il registro lo compone «Cognome Nome». Cambiare la fonte senza
     accorgersene staccherebbe le righe già scritte: il valore che una riga ha
     resta in elenco, marcato, finché qualcuno non lo sceglie di nuovo.
     Una tendina che perde il valore che sta mostrando lo cancella al primo
     salvataggio, e nessuno se ne accorge. */
  const s = conBlocco(['colNome', 'colOpzioniNome']);
  const h = s.ctx.colOpzioniNome('Francesco Oddo', 'Tutti');
  deve(/value="Francesco Oddo" selected/.test(h), 'il valore scritto a mano sparisce dalla tendina: ' + h);
  deve(/scritto a mano/.test(h), 'non dice che quel valore non viene dal registro');
  /* Gli attivi ci sono, il disattivato no — è una scelta NUOVA. */
  deve(/Rossi Mario/.test(h) && /Neri Anna/.test(h), 'mancano gli attivi');
  deve(!/Verdi Luigi/.test(h), 'un disattivato compare in una scelta nuova');
  /* E chi è già scelto e disattivato resta. */
  const h2 = s.ctx.colOpzioniNome('Verdi Luigi', 'Tutti');
  deve(/Verdi Luigi/.test(h2), 'una riga storica perde il suo collaboratore');
  return 'il valore resta, marcato';
});

e.prova('il nome lo compone il MOTORE, non la schermata', () => {
  const s = conBlocco(['colNome']);
  deve(s.ctx.colNome(GENTE[0]) === 'Rossi Mario', 'il nome non è quello del motore: ' + s.ctx.colNome(GENTE[0]));
  return 'Cognome Nome, da un posto solo';
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
