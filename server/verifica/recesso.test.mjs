// RECESSO ONLINE (09/10/2026) — si fa GIRARE il percorso intero, con un finto
// PostgREST e una finta Brevo: identificarsi, ricevere il codice, recedere.
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

process.env.SUPABASE_SERVICE_ROLE_KEY = 'finta';
process.env.BREVO_API_KEY = 'finta';
process.env.OTP_SEGRETO = 'segreto-di-prova';
const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// ── finto mondo esterno ───────────────────────────────────────────────────────
const RIGHE = [];
const EMAIL = [];
const fetchVero = globalThis.fetch;
globalThis.fetch = async (url, opz = {}) => {
  const u = String(url);
  if (u.includes('api.brevo.com')) { EMAIL.push(JSON.parse(opz.body)); return new Response('{}', { status: 201 }); }
  if (u.includes('/rest/v1/quote_preventivi')) {
    const q = new URL(u).searchParams;
    let rows = RIGHE.filter((r) => r.modulo === 'shop');
    for (const [k, v] of q) {
      const m = /^eq\.(.*)$/.exec(v); if (!m) continue;
      const val = decodeURIComponent(m[1]);
      if (k === 'id') rows = rows.filter((r) => String(r.id) === val);
      if (k === 'dati->contatto->>cf') rows = rows.filter((r) => r.dati?.contatto?.cf === val);
      if (k === 'dati->recesso_accesso->>token') rows = rows.filter((r) => r.dati?.recesso_accesso?.token === val);
    }
    if ((opz.method || 'GET') === 'PATCH') { const b = JSON.parse(opz.body); rows.forEach((r) => Object.assign(r, b)); return new Response(JSON.stringify(rows), { status: 200 }); }
    return new Response(JSON.stringify(JSON.parse(JSON.stringify(rows))), { status: 200 });
  }
  return fetchVero(url, opz);
};

const { recessoRouter, termineRecesso, vistaCliente } = await import('../recesso.js');
const express = (await import('express')).default;
const app = express(); app.use(express.json()); app.use('/recesso', recessoRouter);
const srv = http.createServer(app); await new Promise((r) => srv.listen(0, r));
const BASE = 'http://127.0.0.1:' + srv.address().port;
const post = async (p, b) => { const r = await fetchVero(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); return { s: r.status, d: await r.json() }; };

let ok = 0, ko = 0;
const prova = async (n, f) => { try { await f(); ok++; console.log('  OK  ' + n); } catch (e) { ko++; console.log('  X   ' + n + ' — ' + e.message); } };
const deve = (c, m) => { if (!c) throw new Error(m); };
console.log('\nRECESSO ONLINE\n');

const ieri = new Date(Date.now() - 86400000).toISOString();
const vecchia = new Date(Date.now() - 40 * 86400000).toISOString();
RIGHE.push(
  { id: 'p1', modulo: 'shop', prodotto: 'Rischi Catastrofali Abitazione', premio: 823, creato_il: ieri, dati: { fonte: 'shop online', contatto: { cf: 'RSSMRA80A01H501U', email: 'mario@esempio.it', nome: 'Mario', cognome: 'Rossi' }, pagamento: { data: ieri, stato: 'pagato' } } },
  { id: 'p2', modulo: 'shop', prodotto: 'Infortuni Famiglia', premio: 45, creato_il: vecchia, dati: { fonte: 'shop online', contatto: { cf: 'RSSMRA80A01H501U', email: 'mario@esempio.it' }, pagamento: { data: vecchia } } },
  { id: 'p3', modulo: 'shop', prodotto: 'Altro cliente', premio: 99, creato_il: ieri, dati: { contatto: { cf: 'BNCLRA85M41F205X', email: 'laura@esempio.it' } } },
);
const otpDa = (mail) => /letter-spacing:8px[^>]*>(\d{6})</.exec(mail.htmlContent)[1];

await prova('il termine è di 14 giorni dalla conclusione, e oltre si dice', () => {
  deve(termineRecesso(RIGHE[0]).entro_termine === true, 'ieri risulta fuori termine');
  deve(termineRecesso(RIGHE[1]).entro_termine === false, '40 giorni fa risulta nel termine');
  const t = termineRecesso({ creato_il: '2026-10-01T10:00:00Z', dati: { pagamento: { data: '2026-10-02T10:00:00Z' }, firma: { firmato_il: '2026-10-03T10:00:00Z' } } });
  deve(t.conclusione.startsWith('2026-10-03') && t.termine.startsWith('2026-10-17'), 'la conclusione non è l\'ultimo dei fatti: ' + JSON.stringify(t));
});
await prova('la vista del cliente non porta dati che non gli servono', () => {
  const v = vistaCliente(RIGHE[0]);
  deve(!('dati' in v) && !JSON.stringify(v).includes('mario@'), 'la vista porta i dati grezzi');
});
let token;
await prova('dati sbagliati: stessa risposta, nessuna email (non si dice chi è cliente)', async () => {
  const a = await post('/recesso/avvia', { cf: 'RSSMRA80A01H501U', email: 'altro@esempio.it' });
  const b = await post('/recesso/avvia', { cf: 'ZZZZZZ00Z00Z000Z', email: 'nessuno@esempio.it' });
  deve(a.s === 200 && b.s === 200 && a.d.messaggio === b.d.messaggio && a.d.token && b.d.token, 'le risposte si distinguono');
  deve(EMAIL.length === 0, 'è partita un\'email verso un indirizzo che non è quello della polizza');
});
await prova('il codice arriva all\'email SCRITTA SULLA POLIZZA', async () => {
  const r = await post('/recesso/avvia', { cf: 'rssmra80a01h501u', email: 'Mario@Esempio.it ' });
  token = r.d.token;
  deve(EMAIL.length === 1 && EMAIL[0].to[0].email === 'mario@esempio.it', 'email sbagliata: ' + JSON.stringify(EMAIL.map((e) => e.to)));
  deve(!RIGHE[2].dati.recesso_accesso, 'il codice è finito anche sulla polizza di un altro cliente');
});
await prova('un codice sbagliato non apre niente, e i tentativi si contano', async () => {
  const r = await post('/recesso/verifica', { token, otp: '000000' === otpDa(EMAIL[0]) ? '111111' : '000000' });
  deve(r.s === 401, 'un codice sbagliato è passato');
  deve(RIGHE[0].dati.recesso_accesso.tentativi === 1, 'il tentativo non si è contato');
});
await prova('senza la verifica non si recede', async () => {
  const r = await post('/recesso/conferma', { token, id: 'p1', dichiarazione: true });
  deve(r.s === 401, 'recesso registrato senza aver verificato il codice');
});
let polizze;
await prova('il codice giusto mostra solo le polizze online di quel cliente', async () => {
  const r = await post('/recesso/verifica', { token, otp: otpDa(EMAIL[0]) });
  deve(r.s === 200, r.d.error); polizze = r.d.polizze;
  deve(polizze.length === 2 && !polizze.some((p) => p.id === 'p3'), 'elenco sbagliato: ' + polizze.map((p) => p.id));
  deve(polizze.find((p) => p.id === 'p2').entro_termine === false, 'la polizza di 40 giorni fa risulta nel termine');
});
await prova('senza la dichiarazione esplicita non si recede', async () => {
  const r = await post('/recesso/conferma', { token, id: 'p1' });
  deve(r.s === 400 && !RIGHE[0].dati.recesso, 'recesso registrato senza dichiarazione');
});
await prova('il recesso si registra, con ricevuta al cliente e avviso all\'ufficio', async () => {
  const prima = EMAIL.length;
  const r = await post('/recesso/conferma', { token, id: 'p1', motivo: 'ci ho ripensato', dichiarazione: true });
  deve(r.s === 200, r.d.error);
  const rc = RIGHE[0].dati.recesso;
  deve(rc && rc.stato === 'richiesto' && rc.entro_termine === true && /^REC-/.test(rc.ricevuta) && rc.motivo === 'ci ho ripensato', 'registrazione incompleta: ' + JSON.stringify(rc));
  const nuove = EMAIL.slice(prima).map((e) => e.to[0].email);
  deve(nuove.includes('mario@esempio.it') && nuove.length === 2, 'ricevute sbagliate: ' + nuove);
  deve(EMAIL.slice(prima).some((e) => e.htmlContent.includes(rc.ricevuta)), 'la ricevuta non porta il suo codice');
});
await prova('non si registra due volte', async () => {
  const prima = EMAIL.length, ric = RIGHE[0].dati.recesso.ricevuta;
  const r = await post('/recesso/conferma', { token, id: 'p1', dichiarazione: true });
  deve(r.d.gia === true && RIGHE[0].dati.recesso.ricevuta === ric && EMAIL.length === prima, 'secondo recesso registrato');
});
await prova('oltre i 14 giorni la richiesta si registra marcata, non si rifiuta', async () => {
  const r = await post('/recesso/conferma', { token, id: 'p2', dichiarazione: true });
  deve(r.s === 200 && RIGHE[1].dati.recesso.entro_termine === false, 'fuori termine rifiutato o non marcato');
});
await prova('le rotte sono pubbliche ma col tetto, e la pagina c\'è', () => {
  const idx = fs.readFileSync(path.join(RADICE, 'server/index.js'), 'utf8');
  deve(/'\/recesso'\]\s*,\s*tettoPubblico/.test(idx) && /app\.use\('\/recesso', recessoRouter\)/.test(idx), 'rotta non montata o senza tetto');
  const src = fs.readFileSync(path.join(RADICE, 'server/recesso.js'), 'utf8');
  deve(/post\('\/avvia', tettoAvvia/.test(src), 'l\'invio dei codici non ha un tetto suo');
  const pag = fs.readFileSync(path.join(RADICE, 'recesso.html'), 'utf8');
  deve(/\/recesso\/avvia/.test(pag) && /\/recesso\/verifica/.test(pag) && /\/recesso\/conferma/.test(pag), 'la pagina non usa le tre rotte');
  const land = fs.readFileSync(path.join(RADICE, 'landing.html'), 'utf8');
  deve((land.match(/recesso\.html/g) || []).length >= 3, 'la landing non porta al recesso online');
});
await prova('il pulsante si sceglie dal Lab, il collegamento nel piede resta sempre', () => {
  const lab = fs.readFileSync(path.join(RADICE, 'lab/index.html'), 'utf8');
  deve(/id="l-recesso"/.test(lab) && /id="vad-recesso"/.test(lab) && (lab.match(/&recesso=1/g) || []).length >= 2, 'il Lab non offre la scelta nei due posti');
  const land = fs.readFileSync(path.join(RADICE, 'landing.html'), 'utf8');
  deve(/id="cta-recesso" href="recesso\.html" hidden/.test(land) && /params\.get\('recesso'\) === '1'/.test(land), 'il pulsante non dipende dalla scelta');
  /* Dal 09/10/2026 anche il piede segue la spunta, TRANNE sui prodotti che si
     comprano online da quella pagina: lì il recesso online è un obbligo. */
  deve(/<div class="foot">[^\n]*<span id="foot-recesso" hidden>[^\n]*href="recesso\.html"/.test(land), 'il collegamento nel piede non c\'è o non dipende dalla spunta');
  const ag = (land.match(/function aggiornaRecesso\(\)\{[\s\S]*?\n\}/) || [''])[0];
  deve(/f\.hidden = !\(spunta \|\| \(typeof vdOnline === 'function' && VD && vdOnline\(\)\)\)/.test(ag), 'sui prodotti venduti online il piede non mostra più il recesso');
  deve(/aggiornaDettCta\(\); aggiornaRecesso\(\);/.test(land), 'arrivata la configurazione, il piede non si ricontrolla');
});
await prova('privacy: l\'informativa si legge PRIMA di firmare, ed è lo stesso testo del documento firmato', () => {
  const sign = fs.readFileSync(path.join(RADICE, 'server/sign.js'), 'utf8');
  deve(/privacy\/informativa\.json/.test(sign) && /\$\{INFORMATIVA_PRIVACY\}<\/p>/.test(sign), 'testo non condiviso fra pagina e documento');
  const land = fs.readFileSync(path.join(RADICE, 'landing.html'), 'utf8');
  deve(/ck-pz-testo/.test(land) && /privacy\/informativa\.json/.test(land), 'la landing fa firmare senza mostrare il testo');
  deve(!/Acconsento al trattamento dei dati per la gestione del rapporto/.test(land), 'il contratto chiede ancora un «consenso» che non è la sua base giuridica');
  const pdf = path.join(RADICE, 'docs/privacy/Informativa_Privacy_WithUs_PR01_rev4.1.pdf');
  const txt = fs.readFileSync(path.join(RADICE, 'docs/privacy/informativa-pr01.txt'), 'utf8');
  deve(fs.existsSync(pdf) && /1\) Identità e dati di contatto del titolare/.test(txt) && /11\) Trattamento dei dati personali per una finalità diversa/.test(txt), 'l\'informativa completa (PR01 rev 4.1) non c\'è o è troncata');
  deve(/INFORMATIVA_COMPLETA_TESTO \|\| INFORMATIVA_PRIVACY/.test(sign) && /Informativa_Privacy_WithUs_PR01_rev4\.1\.pdf/.test(land), 'il cliente non legge il testo completo o non può scaricare il PDF');
});

srv.close();
console.log('\n' + ok + ' superate, ' + ko + ' fallite\n');
process.exit(ko ? 1 : 0);
