// ═══════════════════════════════════════════════════════════════════════════════
//  LE COMPAGNIE CHE UN UTENTE VEDE NEL CONFRONTO MOTOR (17/09/2026, Lavoro 2 PR 3)
//
//  IAM scrive iam_utenti.compagnie; QUOTO la legge all'accesso e la applica al
//  confronto Motor, accanto agli interruttori delle Fonti. Le funzioni vivono
//  in index.html: si ritagliano con lo stesso banco di IAM e si fanno girare
//  in una stanza chiusa. Le regole che contano: null = tutte; l'admin vede
//  tutto; un nome che il catalogo non conosce NON si spegne.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { ritaglia } from '../../iam/verifica/banco.mjs';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

function stanza() {
  const ctx = { COMPAGNIE_CATALOGO_QUOTO: null, currentUser: null, console, String, Array, Set, JSON };
  vm.createContext(ctx);
  for (const n of ['compagniaCorrisponde', 'awCompagniaConsentita']) {
    const f = ritaglia(src, n);
    if (!f) throw new Error('non si ritaglia ' + n);
    vm.runInContext(f, ctx);
  }
  return ctx;
}
const CATALOGO = ['HD', 'Allianz', 'Prima', 'Sara', 'AXA', 'Groupama', 'Italiana', 'Nobis', '24H'];
const RIGHE = { italiana: 'Italiana', hdi: 'HDI Assicurazioni', axa: 'AXA', allianz: 'Allianz', '24h': '24H', groupama: 'Groupama', prima: 'Prima' };

prova('i nomi del catalogo trovano le righe del confronto: «24H» ↔ 24h, «AXA» ↔ AXA, «Allianz» ↔ Allianz', () => {
  const c = stanza();
  deve(c.compagniaCorrisponde('24H', '24h', '24H · Moto Platinum'), '24H non trova la riga 24h');
  deve(c.compagniaCorrisponde('HDI', 'hdi', 'HDI Assicurazioni'), 'HDI non trova «HDI Assicurazioni»');
  deve(c.compagniaCorrisponde('axa', 'axa', 'AXA') && c.compagniaCorrisponde('Italiana', 'italiana', 'Italiana'), 'maiuscole diverse non corrispondono');
  deve(!c.compagniaCorrisponde('HD', 'hdi', 'HDI Assicurazioni'), '«HD» (il nome storto del catalogo) non deve valere come HDI: sarebbe indovinare');
  deve(!c.compagniaCorrisponde('Prima', 'allianz', 'Allianz') && !c.compagniaCorrisponde('', 'axa', 'AXA'), 'corrisponde a caso');
  return 'per chiave o prima parola, mai per somiglianza';
});

prova('null = tutte, e l\'amministratore vede tutto anche con una lista stretta', () => {
  const c = stanza();
  for (const [k, n] of Object.entries(RIGHE)) {
    deve(c.awCompagniaConsentita(k, n, { role: 'collaboratore', compagnie: null }, CATALOGO), k + ' spenta con compagnie=null');
    deve(c.awCompagniaConsentita(k, n, { role: 'admin', compagnie: ['Prima'] }, CATALOGO), k + ' spenta all\'admin');
    deve(c.awCompagniaConsentita(k, n, null, CATALOGO), k + ' spenta senza utente');
  }
  return '7 righe × 3 casi, tutte visibili';
});

prova('con una lista, restano solo le compagnie spuntate — e quelle che il catalogo non governa', () => {
  const c = stanza();
  const u = { role: 'collaboratore', compagnie: ['Allianz', 'Prima'] };
  const viste = Object.entries(RIGHE).filter(([k, n]) => c.awCompagniaConsentita(k, n, u, CATALOGO)).map(([k]) => k).sort();
  /* hdi resta: il catalogo dice «HD», che non corrisponde a niente, quindi HDI
     non e' governata e non si spegne. Il giorno in cui il catalogo dira' «HDI»,
     entrera' nel filtro da sola (prova sotto). */
  deve(JSON.stringify(viste) === JSON.stringify(['allianz', 'hdi', 'prima']), 'viste: ' + JSON.stringify(viste));
  const conHdi = CATALOGO.map(x => x === 'HD' ? 'HDI' : x);
  const viste2 = Object.entries(RIGHE).filter(([k, n]) => c.awCompagniaConsentita(k, n, u, conHdi)).map(([k]) => k).sort();
  deve(JSON.stringify(viste2) === JSON.stringify(['allianz', 'prima']), 'col catalogo corretto HDI deve spegnersi: ' + JSON.stringify(viste2));
  const vuota = Object.entries(RIGHE).filter(([k, n]) => c.awCompagniaConsentita(k, n, { role: 'collaboratore', compagnie: [] }, conHdi)).map(([k]) => k);
  deve(vuota.length === 0, 'lista vuota = nessuna compagnia governata visibile, invece: ' + JSON.stringify(vuota));
  return 'allianz+prima (+hdi finche\' il catalogo dice «HD»)';
});

prova('il filtro sta nel confronto Motor, accanto agli interruttori delle Fonti, e conta le escluse', () => {
  const f = ritaglia(src, 'awMostraPremio');
  deve(f, 'awMostraPremio non si ritaglia');
  deve(/await caricaCompagnieCatalogo\(\)/.test(f), 'il catalogo non si carica prima di decidere');
  deve(/if \(!awFonteAttiva\(k\)\) return false;/.test(f) && /awCompagniaConsentita\(k, AW_NOMI_COMPAGNIE\[k\] \|\| k\)/.test(f), 'i due cancelli non stanno insieme');
  deve(/awAvvisoCompagnieEscluse\(escluse\)/.test(f), 'le compagnie escluse non si dicono');
  deve(/compagnie: \(profilo && Array\.isArray\(profilo\.compagnie\)\) \? profilo\.compagnie : null/.test(src), 'currentUser non porta le compagnie dal profilo');
  return 'Fonti + profilo, avviso con il conto';
});

console.log('\n══ COMPAGNIE PER UTENTE ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = await fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nCOMPAGNIE PER UTENTE: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
