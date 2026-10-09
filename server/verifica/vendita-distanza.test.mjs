// VENDITA A DISTANZA — Rischi Catastrofali Abitazione (09/10/2026)
// Il prezzo della landing è quello del motore del preventivatore; non si
// incassa senza Set Informativo, senza coerenza con le esigenze e senza la
// presa visione dei documenti PRIMA del pagamento (IVASS).
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { quotaCatastrofali, cancelloCon, cancelloVendita, coerenza, ESIGENZE_CATNAT, configurazione, schedaCompleta, maggiorenne } from '../venditaDistanza.js';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const req = createRequire(import.meta.url);
const motore = req(path.join(RADICE, 'tariffe/motore/catastrofali.js'));
let ok = 0, ko = 0;
const prova = (n, f) => { try { f(); ok++; console.log('  OK  ' + n); } catch (e) { ko++; console.log('  X   ' + n + ' — ' + e.message); } };
const deve = (c, m) => { if (!c) throw new Error(m); };
console.log('\nVENDITA A DISTANZA · CATASTROFALI\n');

prova('il premio è quello del motore del preventivatore, sul prodotto COMPLETO', () => {
  motore.caricaTariffa(JSON.parse(fs.readFileSync(path.join(RADICE, 'tariffe/catastrofali_cap.json'), 'utf8')));
  for (const cap of ['89100', '00187', '09124', '50122', '98121']) for (const val of [40000, 180000, 1100000]) {
    const a = quotaCatastrofali({ cap, valore: val });
    const b = motore.calcCatPremio(cap, val, { terrCont: true, alluFabb: true, alluCont: true, frazionamento: 'Annuale' });
    deve(a.prezzo === b.premio, cap + ' ' + val + ': ' + a.prezzo + ' contro ' + b.premio);
  }
});
prova('al cliente finale non si vende una versione ridotta, qualunque cosa mandi il browser', () => {
  const a = quotaCatastrofali({ cap: '50122', valore: 180000, terrCont: false, alluFabb: false, alluCont: false });
  const b = quotaCatastrofali({ cap: '50122', valore: 180000 });
  deve(a.prezzo === b.prezzo && a.dettaglio.alluCont && a.dettaglio.terrCont && a.dettaglio.alluFabb, 'il browser ha tolto delle garanzie');
});
prova('limiti assuntivi della compagnia: fabbricato da 40.000 a 1.100.000 €', () => {
  deve(quotaCatastrofali({ cap: '89100', valore: 39999 }).errore, 'sotto il minimo quota');
  deve(quotaCatastrofali({ cap: '89100', valore: 1100001 }).errore, 'sopra il massimo quota');
  deve(!quotaCatastrofali({ cap: '89100', valore: 40000 }).errore, 'il minimo esatto non quota');
});
prova('CAP fuori tariffa o valore mancante: un motivo in parole, non un prezzo', () => {
  deve(/non è disponibile/.test(quotaCatastrofali({ cap: '99999', valore: 100000 }).errore || ''), 'CAP fuori tariffa');
  deve(quotaCatastrofali({ cap: '89100', valore: 0 }).errore, 'valore zero');
  deve(quotaCatastrofali({ cap: '891', valore: 100000 }).errore, 'CAP corto');
});
prova('OGGI la vendita online è chiusa: non si incassa', () => {
  const cfg = configurazione('catastrofali');
  deve(cfg && cfg.vendita_online === false, 'la configurazione dice aperta: serve il Set Informativo prima');
  deve(!cancelloVendita('catastrofali', { accettazioni: {} }).ok, 'il cancello lascia passare');
});
const tuttoSi = Object.fromEntries(ESIGENZE_CATNAT.map(q => [q.k, q.serve]));
const P = { terrCont: true, alluFabb: true, alluCont: true };
const casa = { indirizzo: 'Via Roma 1', comune: 'Trapani', tipologia: 'Appartamento in condominio', piano: 'Piano intermedio',
  destinazione: 'Abituale', superficie: 'Meno di 100 mq', eta: 'Più di 15 anni', piani_fuori_terra: 4, piani_interrati: 1 };
const cliente = { cf: 'RSSMRA80A01H501U', dataNascita: '1980-01-01' };
const buono = () => ({ params: P, cliente: { ...cliente }, accettazioni: { esigenze: { ...tuttoSi }, abitazione: { ...casa }, avvertenze_lette: true, precontrattuale_letta: true } });
const aperta = { vendita_online: true, documenti: [{ nome: 'Set Informativo', url: '/docs/x.pdf' }] };
prova('con tutto in regola il cancello si apre (altrimenti le prove sotto non valgono)', () => {
  const g = cancelloCon(aperta, 'catastrofali', buono()); deve(g.ok, g.errore);
});
prova('aperta ma SENZA documenti non si incassa', () => {
  deve(!cancelloCon({ vendita_online: true, documenti: [] }, 'catastrofali', buono()).ok, 'passa senza documenti');
});
prova('senza la presa visione dei documenti o delle avvertenze PRIMA del pagamento non si incassa', () => {
  const a = buono(); delete a.accettazioni.precontrattuale_letta; deve(!cancelloCon(aperta, 'catastrofali', a).ok, 'passa senza presa visione');
  const b = buono(); delete b.accettazioni.avvertenze_lette; deve(!cancelloCon(aperta, 'catastrofali', b).ok, 'passa senza le avvertenze (carenza, franchigie)');
});
prova('una risposta non coerente ferma la vendita, una per volta', () => {
  for (const q of ESIGENZE_CATNAT) {
    const x = buono(); x.accettazioni.esigenze[q.k] = !q.serve;
    deve(!coerenza(x.accettazioni.esigenze, P).coerente, q.k + ' sbagliata passa');
    deve(!cancelloCon(aperta, 'catastrofali', x).ok, q.k + ' passa il cancello');
  }
  deve(!coerenza({}, P).coerente, 'senza risposte risulta coerente');
});
prova('scheda di polizza: senza i dati dell\'abitazione non si incassa', () => {
  deve(schedaCompleta(casa), 'la scheda completa risulta incompleta');
  for (const k of ['tipologia', 'destinazione', 'superficie', 'eta', 'piano', 'piani_fuori_terra', 'indirizzo']) {
    const x = buono(); delete x.accettazioni.abitazione[k];
    deve(!cancelloCon(aperta, 'catastrofali', x).ok, 'passa senza ' + k);
  }
  deve(schedaCompleta({ ...casa, tipologia: 'Villa monofamiliare', piano: '' }), 'una villa monofamiliare non ha piano');
});
prova('il contraente è il proprietario persona fisica, maggiorenne', () => {
  const a = buono(); a.cliente.cf = '01234567890'; deve(!cancelloCon(aperta, 'catastrofali', a).ok, 'passa con una partita IVA');
  const b = buono(); b.cliente.dataNascita = ''; deve(!cancelloCon(aperta, 'catastrofali', b).ok, 'passa senza data di nascita');
  deve(!maggiorenne('2010-06-01', new Date(2026, 9, 9)) && maggiorenne('2008-10-09', new Date(2026, 9, 9)) && !maggiorenne('2008-10-10', new Date(2026, 9, 9)), 'i 18 anni si contano male');
});
prova('un limite solo: motore, preventivatore interno e API usano fuoriLimite', () => {
  deve(motore.fuoriLimite(39999) && motore.fuoriLimite(1100001) && !motore.fuoriLimite(40000) && !motore.fuoriLimite(1100000), 'i limiti del motore sono sbagliati');
  const idx = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
  const blocco = (n) => { const i = idx.indexOf('function ' + n + '('); return idx.slice(i, idx.indexOf('\nfunction ', i + 10)); };
  for (const f of ['rcabRefreshPanel', 'rcabNext', 'rcabInvia']) deve(/catFuoriLimite\(/.test(blocco(f)), f + ' non controlla i limiti');
  deve(/length!==16/.test(blocco('rcabNext')) && /length!==16/.test(blocco('rcabInvia')), 'il preventivatore interno accetta una partita IVA come contraente');
  const api = fs.readFileSync(path.join(RADICE, 'server/prodottiApi.js'), 'utf8');
  deve(/catastrofali\.fuoriLimite\(/.test(api), 'l\'API quota fuori dai limiti');
});
prova('davanti al cliente: stima dichiarata, niente promesse fiscali, niente note interne', () => {
  const l = fs.readFileSync(path.join(RADICE, 'landing.html'), 'utf8');
  const blocco = l.slice(l.indexOf('function renderPcardCatnat('), l.indexOf('function cnCambiato('));
  deve(/Premio indicativo, soggetto a verifica dei dati/.test(blocco), 'il prezzo non dice di essere una stima');
  deve(!/prezzo è <b>finale|detra|IRPEF|730/i.test(blocco), 'la scheda prezzo fa affermazioni fiscali non verificate');
  const prodotto = l.slice(l.indexOf("  catastrofali: { nome:"), l.indexOf("  casa:      { nome:"));
  deve(!/detra|IRPEF/i.test(prodotto), 'i testi del prodotto parlano di detrazione, che nei documenti per il cliente non c\'è');
  /* L'esenzione si dice SOLO citando il DIP aggiuntivo, parola per parola. */
  const dip = execSync('pdftotext docs/catastrofali/RischiCatastrofali_DIP_Aggiuntivo_DAP5821_05-2026.pdf -', { cwd: RADICE, encoding: 'utf8' }).replace(/\s+/g, ' ');
  const frase = /var CN_FISCALE = '([^']+)'/.exec(l);
  deve(frase && dip.includes(frase[1]), 'la frase sull\'esenzione non è quella del DIP aggiuntivo: ' + (frase && frase[1]));
  deve(/CN_FISCALE_FONTE/.test(blocco) && /DAP5821/.test(l), 'la citazione non porta la sua fonte');
  const cfg = configurazione('catastrofali');
  deve(!/Set Informativo|tariffa/i.test(cfg.motivo || ''), 'il messaggio al cliente contiene note interne: ' + cfg.motivo);
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
  deve(/precontrattuale_letta:true/.test(l) && /avvertenze_lette:true/.test(l), 'la presa visione non arriva al server');
  deve(!/vd-tecnica|Nota-Tecnica|Scheda-prodotto/i.test(l), 'un documento interno è finito nella pagina pubblica');
  deve(!/calcCatPremio/.test(l), 'la landing calcola il prezzo da sola invece di chiederlo al server');
});
console.log('\n' + ok + ' superate, ' + ko + ' fallite\n');
process.exit(ko ? 1 : 0);
