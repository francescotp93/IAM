// ═══════════════════════════════════════
//  I PANNELLI NON SI COPRONO A VICENDA
//
//  Il 5 agosto 2026 tutto il gestionale è rimasto bloccato sull'Analisi dei
//  bisogni: dalla scrivania non si usciva più, e nessuna delle venti prove
//  se n'è accorta.
//
//  La causa era una riga sola. Ogni schermata è
//
//      .panel     { position:absolute; inset:0; display:none }
//      .panel.act { display:block }
//
//  cioè si sovrappongono tutte e si vede quella con «act». Avevo scritto
//  `#panel-analisi{display:flex}` per farne una colonna flessibile — ma un
//  id vince su una classe, quindi quel display batteva `.panel{display:none}`
//  e il pannello restava visibile SEMPRE, coprendo gli altri da sopra.
//
//  Perché le prove non l'hanno preso: guardavano tutte il pannello
//  dell'analisi — che infatti era giusto — e nessuna guardava che cosa quel
//  pannello facesse AGLI ALTRI. Un difetto che sta nella relazione fra due
//  cose non si trova esaminandone una.
//
//  Questa prova vale per tutti i pannelli, presenti e futuri.
// ═══════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(radice, 'index.html'), 'utf8');

const esiti = [];
const prova = (nome, fn) => {
  try { const m = fn(); esiti.push([true, nome, m || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, msg) => { if (!c) throw new Error(msg); };

/* Solo la parte di stile: nel corpo della pagina «#panel-...{» compare anche
   dentro stringhe JavaScript, e leggerla lì darebbe falsi allarmi. */
const stili = (() => {
  let t = '';
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g;
  let m; while ((m = re.exec(html))) t += m[1] + '\n';
  return t.replace(/\/\*[\s\S]*?\*\//g, '');
})();

/* Ogni regola che parte da #panel-QUALCOSA, con quello che la segue fino a «{».
   La coda NON si ripulisce dagli spazi: è proprio lo spazio a distinguere
   «#panel-fonti .f-head» (un discendente, che può fare quello che vuole) da
   «#panel-analisi.act» (lo stesso elemento). Togliendolo, la prima volta ho
   scambiato le due cose e la prova ha gridato al lupo su una regola sana. */
const regole = [...stili.matchAll(/#panel-[a-z0-9-]+([^{,]*)\{([^}]*)\}/gi)]
  .map(m => ({ coda: m[1], corpo: m[2], testo: m[0].slice(0, 70) }));

prova('nessun pannello si dichiara visibile fuori da «act»', () => {
  deve(regole.length > 0, 'non ho trovato nessuna regola di pannello: la prova non sta guardando niente');
  for (const r of regole) {
    if (!/(^|[^-\w])display\s*:/.test(r.corpo)) continue;
    const valore = (r.corpo.match(/(?:^|[^-\w])display\s*:\s*([a-z-]+)/i) || [])[1] || '';
    if (valore === 'none') continue;              // nascondere va sempre bene
    /* Contano solo le regole il cui BERSAGLIO è il pannello stesso: niente
       spazio, niente combinatore. Un discendente può avere il display che
       vuole — è dentro un pannello che, se chiuso, è già nascosto. */
    if (/[\s>+~]/.test(r.coda)) continue;
    deve(/\.act/.test(r.coda),
      'questa regola rende visibile un pannello anche quando è chiuso, e coprirà gli altri: «' + r.testo + '…»');
  }
});

prova('la regola che accende i pannelli è ancora quella', () => {
  /* Se qualcuno cambiasse il meccanismo, la prova qui sopra sorveglierebbe
     una convenzione che non esiste più e passerebbe sempre. */
  deve(/\.panel\{[^}]*position:absolute[^}]*inset:0[^}]*display:none/.test(stili),
    'i pannelli non sono più sovrapposti e nascosti: questa prova va ripensata');
  deve(/\.panel\.act\{display:block/.test(stili),
    'i pannelli non si accendono più con «act»: questa prova va ripensata');
});

prova('il pannello dell\'analisi si accende solo con «act»', () => {
  /* Il caso preciso da cui è nata questa prova. */
  const sull_id = stili.match(/#panel-analisi\{([^}]*)\}/);
  deve(sull_id, 'manca il blocco di #panel-analisi');
  deve(!/(^|[^-\w])display\s*:\s*(?!none)/.test(sull_id[1]),
    'il display è tornato sull\'id: batte .panel{display:none} e blocca il gestionale sull\'analisi');
  deve(/#panel-analisi\.act\{[^}]*display:\s*flex/.test(stili),
    'il pannello dell\'analisi non diventa più una colonna flessibile quando è aperto');
});

let ko = 0;
console.log('\nPANNELLI — nessuno copre gli altri');
for (const [ok, nome, msg] of esiti) {
  console.log(ok ? '  ok  ' + nome + (msg ? ' — ' + msg : '') : '  X   ' + nome + ' — ' + msg);
  if (!ok) ko++;
}
console.log(`\nPANNELLI: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
