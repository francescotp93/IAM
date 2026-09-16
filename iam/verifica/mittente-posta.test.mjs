// ═══════════════════════════════════════════════════════════════════════════════
//  IL MITTENTE DELLA POSTA — chi risulta aver scritto
//
//  «Le email risultano inviate da Francesco Oddo, ma devono essere inviate da
//  With Us Assicurazioni» — «tutte le mail» (Francesco, 09/09/2026).
//
//  Da questa pagina si scrive dalle caselle dell'agenzia, e la finestra di
//  composizione mandava al server anche `fromName`: nome e cognome di chi era
//  collegato. Il server lo metteva accanto all'indirizzo, e al destinatario
//  arrivava «Francesco Oddo <amministrazione@withusassicurazioni.it>» — una
//  persona che non conosce, al posto dell'agenzia con cui ha un rapporto.
//
//  Il nome adesso lo decide il server, in un posto solo
//  (QUOTE/server/mittente.js), e quello che partisse da qui verrebbe ignorato.
//  Queste prove servono a impedire che rientri: un parametro ignorato che
//  continua a partire e' un invito a rimetterlo in mezzo, e la prossima
//  persona non ha modo di sapere che era stato tolto apposta.
//
//  LA SECONDA PROVA E' LA CONTROPARTE DELLA PRIMA. Togliere un campo da una
//  chiamata lunga una riga e' il modo piu' facile per portarsene via un altro
//  senza accorgersene: qui si controlla che tutto il resto sia ancora al suo
//  posto.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const leggi = (f) => fs.readFileSync(path.join(radice, f), 'utf8');

const esiti = [];
const prova = (nome, fn) => {
  try { const m = fn(); esiti.push([true, nome, m || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const idx = leggi('index.html');
/* La chiamata di invio, presa per intero: si cerca il pezzo fra «/mail/send» e
   la fine dell'oggetto mandato, non una riga a occhio. */
const iInvio = idx.indexOf("mailFetch('/mail/send'");
const invio = iInvio < 0 ? '' : idx.slice(iInvio, idx.indexOf('})', idx.indexOf('scheduledAt })', iInvio)) + 2);

prova('la finestra di composizione esiste ancora', () => {
  deve(iInvio > 0, 'non trovo piu\' la chiamata a /mail/send: la prova non starebbe guardando niente');
  return 'trovata';
});

prova('non manda piu\' il nome di chi scrive', () => {
  deve(!/fromName\s*:/.test(invio),
    'la posta torna a mandare il nome di chi scrive: al destinatario arriverebbe una persona al posto dell\'agenzia');
  return 'il nome lo decide il server, non questa pagina';
});

prova('in nessun altro punto della pagina parte un fromName', () => {
  /* `fromName` compare ancora una volta sola, dentro il commento che spiega
     perche' e' stato tolto: quello va bene, e' la memoria della cosa. */
  const usi = (idx.match(/fromName\s*:/g) || []).length;
  deve(usi === 0, usi + ' punti mandano ancora un fromName');
  return 'nessuno';
});

prova('togliendolo non si e\' portato via nient\'altro', () => {
  for (const campo of ['to', 'subject', 'html', 'text', 'casella', 'attachments', 'scheduledAt']) {
    deve(new RegExp('\\b' + campo + '\\b').test(invio), 'dalla chiamata e\' sparito anche «' + campo + '»');
  }
  deve(/MAIL_FOOTER_TEXT/.test(invio),
    'il messaggio parte senza la firma di legge (sede, RUI, informativa): e\' quella che dice chi siamo');
  return '7 campi e la firma, tutti al loro posto';
});

console.log('MITTENTE DELLA POSTA');
for (const [ok, nome, msg] of esiti) {
  console.log(`  ${ok ? 'ok ' : 'X  '} ${nome}${msg ? ' — ' + msg : ''}`);
}
const falliti = esiti.filter(e => !e[0]).length;
console.log('');
console.log(`MITTENTE DELLA POSTA: ${esiti.length - falliti} superate, ${falliti} fallite`);
process.exit(falliti === 0 ? 0 : 1);
