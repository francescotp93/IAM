// VENDITA A DISTANZA — Rischi Catastrofali Abitazione (09/10/2026)
// Il prezzo della landing è quello del motore del preventivatore; non si
// incassa senza Set Informativo, senza coerenza con le esigenze e senza la
// presa visione dei documenti PRIMA del pagamento (IVASS).
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { quotaCatastrofali, cancelloCon, cancelloVendita, coerenza, ESIGENZE_CATNAT, configurazione } from '../venditaDistanza.js';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const req = createRequire(import.meta.url);
const motore = req(path.join(RADICE, 'tariffe/motore/catastrofali.js'));
let ok = 0, ko = 0;
const prova = (n, f) => { try { f(); ok++; console.log('  OK  ' + n); } catch (e) { ko++; console.log('  X   ' + n + ' — ' + e.message); } };
const deve = (c, m) => { if (!c) throw new Error(m); };
console.log('\nVENDITA A DISTANZA · CATASTROFALI\n');

prova('il premio è quello del motore del preventivatore, su più CAP e opzioni', () => {
  motore.caricaTariffa(JSON.parse(fs.readFileSync(path.join(RADICE, 'tariffe/catastrofali_cap.json'), 'utf8')));
  for (const cap of ['89100', '00187', '09124', '50122', '98121']) for (const o of [[0,0,0],[1,0,0],[0,1,0],[1,1,1],[1,1,0]]) {
    const opt = { terrCont: !!o[0], alluFabb: !!o[1], alluCont: !!o[2] };
    const a = quotaCatastrofali({ cap, valore: 180000, ...opt });
    const b = motore.calcCatPremio(cap, 180000, { ...opt, frazionamento: 'Annuale' });
    deve(a.prezzo === b.premio, cap + ' ' + o + ': ' + a.prezzo + ' contro ' + b.premio);
  }
});
prova('il contenuto alluvione senza le due garanzie che lo reggono non si paga', () => {
  const a = quotaCatastrofali({ cap: '50122', valore: 180000, alluCont: true });
  const b = quotaCatastrofali({ cap: '50122', valore: 180000 });
  deve(a.prezzo === b.prezzo && a.dettaglio.alluCont === false, 'alluvione contenuto passa da sola');
});
prova('CAP fuori tariffa o valore mancante: un motivo in parole, non un prezzo', () => {
  deve(/non è disponibile/.test(quotaCatastrofali({ cap: '99999', valore: 1000 }).errore || ''), 'CAP fuori tariffa');
  deve(quotaCatastrofali({ cap: '89100', valore: 0 }).errore, 'valore zero');
  deve(quotaCatastrofali({ cap: '891', valore: 1000 }).errore, 'CAP corto');
});
prova('OGGI la vendita online è chiusa: non si incassa', () => {
  const cfg = configurazione('catastrofali');
  deve(cfg && cfg.vendita_online === false, 'la configurazione dice aperta: serve il Set Informativo prima');
  deve(!cancelloVendita('catastrofali', { accettazioni: {} }).ok, 'il cancello lascia passare');
});
const tuttoSi = { abitazione: true, titolo: true, bisogno: true, valore: true, doppia: false };
const aperta = { vendita_online: true, documenti: [{ nome: 'Set Informativo', url: '/docs/x.pdf' }] };
prova('aperta ma SENZA documenti non si incassa', () => {
  deve(!cancelloCon({ vendita_online: true, documenti: [] }, 'catastrofali', { accettazioni: { esigenze: tuttoSi, precontrattuale_letta: true } }).ok, 'passa senza documenti');
});
prova('senza la presa visione dei documenti PRIMA del pagamento non si incassa', () => {
  deve(!cancelloCon(aperta, 'catastrofali', { accettazioni: { esigenze: tuttoSi } }).ok, 'passa senza presa visione');
  deve(cancelloCon(aperta, 'catastrofali', { accettazioni: { esigenze: tuttoSi, precontrattuale_letta: true } }).ok, 'non passa nemmeno quando è tutto a posto');
});
prova('una risposta non coerente ferma la vendita, una per volta', () => {
  for (const q of ESIGENZE_CATNAT) {
    const e = { ...tuttoSi, [q.k]: !q.serve };
    deve(!coerenza(e).coerente, q.k + ' sbagliata passa');
    deve(!cancelloCon(aperta, 'catastrofali', { accettazioni: { esigenze: e, precontrattuale_letta: true } }).ok, q.k + ' passa il cancello');
  }
  deve(!coerenza({}).coerente, 'senza risposte risulta coerente');
});
prova('gli altri prodotti dello shop non cambiano', () => {
  deve(cancelloVendita('vita', {}).ok && cancelloVendita('infortuni-famiglia', {}).ok, 'il cancello tocca altri prodotti');
});
prova('ogni rotta che incassa passa dal cancello', () => {
  const s = fs.readFileSync(path.join(RADICE, 'server/shop.js'), 'utf8');
  for (const r of ['/checkout/stripe/create-intent', '/checkout/stripe/confirm', '/checkout/paypal/create-order', '/checkout/paypal/capture', '/checkout/bonifico']) {
    const i = s.indexOf("shopRouter.post('" + r + "'"); deve(i > 0, 'manca ' + r);
    const corpo = s.slice(i, s.indexOf('shopRouter.', i + 10) > 0 ? s.indexOf('shopRouter.', i + 10) : undefined);
    deve(/cancelloVendita\(/.test(corpo), r + ' non passa dal cancello');
  }
});
prova('nella landing esigenze e documenti vengono PRIMA del pagamento', () => {
  const l = fs.readFileSync(path.join(RADICE, 'landing.html'), 'utf8');
  deve(/if\(\(P\.quote\|\|\{\}\)\.tipo==='catnat'\) ckStepEsigenze\(\); else ckStepPay\(\);/.test(l), 'dopo i documenti si va dritti al pagamento');
  deve(/precontrattuale_letta:true/.test(l), 'la presa visione non arriva al server');
  deve(!/calcCatPremio/.test(l), 'la landing calcola il prezzo da sola invece di chiederlo al server');
});
console.log('\n' + ok + ' superate, ' + ko + ' fallite\n');
process.exit(ko ? 1 : 0);
