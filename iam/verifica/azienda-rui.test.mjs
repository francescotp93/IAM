// ═══════════════════════════════════════════════════════════════════════════════
//  L'ISCRIZIONE RUI DELL'AGENZIA — dove si scrive, e che venga salvata davvero
//
//  I dati dell'agenzia stanno in iam_azienda.dati, che e' un jsonb: aggiungere
//  un campo non chiede nessuna migrazione. Chiede pero' di toccare TRE punti —
//  il modulo, l'elenco che legge e l'elenco che salva — e due di questi non si
//  vedono guardando la schermata.
//
//  Il guasto che questa prova impedisce e' silenzioso e cattivo: un campo che
//  compare nel modulo ma non sta negli elenchi si compila, si preme «Salva»,
//  non protesta nessuno — e il valore non esiste da nessuna parte. Chi lo ha
//  scritto crede di averlo scritto.
//
//  Perche' serve il RUI: e' il dato che rende riconoscibile l'intermediario su
//  ogni documento che esce di casa (IDD, Reg. IVASS 40/2018). Il preventivo
//  personalizzato di QUOTO lo stampa in carta intestata leggendolo da qui.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const idx = fs.readFileSync(path.join(radice, 'index.html'), 'utf8');

const esiti = [];
const prova = (nome, fn) => {
  try { const m = fn(); esiti.push([true, nome, m || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const CAMPI = ['rui_sezione', 'rui_numero', 'rui_data'];

prova('i tre campi RUI stanno nel modulo dei dati azienda', () => {
  const mancanti = CAMPI.filter(c => !idx.includes('id="az-' + c + '"'));
  deve(!mancanti.length, 'manca il campo: ' + mancanti.join(', '));
  return CAMPI.length + ' campi';
});

prova('ogni campo del modulo sta anche negli elenchi che leggono e salvano', () => {
  /* Gli elenchi sono le righe `const fields = [...]`: ce n'e' una per il
     caricamento da Supabase, una per il ripiego locale e una per il
     salvataggio. Un campo che non sta in tutte e tre non viene salvato, o
     non viene riletto. */
  const elenchi = [...idx.matchAll(/const fields\s*=\s*\[([^\]]+)\]/g)].map(m => m[1]);
  deve(elenchi.length >= 3, 'trovati ' + elenchi.length + ' elenchi dei campi azienda: la prova non guarderebbe piu\' niente');
  for (const c of CAMPI) {
    const dentro = elenchi.filter(e => e.includes("'" + c + "'")).length;
    deve(dentro === elenchi.length,
      'il campo ' + c + ' sta in ' + dentro + ' elenchi su ' + elenchi.length + ': si compila e non si salva');
  }
  return elenchi.length + ' elenchi, tutti allineati';
});

prova('la sezione RUI non parte da un valore inventato', () => {
  /* Un menu che parte gia' su «A» scriverebbe una sezione che nessuno ha
     scelto: in un documento che si consegna a un cliente, un dato dato per
     buono vale meno di un dato che manca e lo dice. */
  const i = idx.indexOf('id="az-rui_sezione"');
  deve(i > 0, 'non trovo il menu della sezione RUI');
  const menu = idx.slice(i, idx.indexOf('</select>', i));
  const prima = menu.indexOf('<option');
  deve(/value=""/.test(menu.slice(prima, prima + 120)),
    'la prima voce del menu non e\' quella vuota: la sezione risulterebbe scelta senza che nessuno l\'abbia scelta');
  deve(/da confermare/i.test(menu), 'il menu non dice che il dato e\' da confermare');
  return 'parte vuota, e lo dice';
});

let ok = 0;
for (const [passata, nome, msg] of esiti) {
  if (passata) { ok++; console.log('  OK  ' + nome + (msg ? '  — ' + msg : '')); }
  else console.log('  KO  ' + nome + '  — ' + msg);
}
console.log('RUI AGENZIA: ' + ok + ' superate, ' + (esiti.length - ok) + ' fallite');
process.exit(ok === esiti.length ? 0 : 1);
