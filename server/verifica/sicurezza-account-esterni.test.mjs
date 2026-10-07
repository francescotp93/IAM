// ═══════════════════════════════════════════════════════════════════════════
//  «AUTENTICATO» NON VUOL DIRE «DELL'AGENZIA» (controllo GDPR, 07/10/2026)
//
//  I convenzionati hanno un account Supabase e nessuna riga in iam_utenti.
//  Tutto quello che si fidava del solo login dava a loro i dati di tutti:
//  le rotte del backend con la chiave di servizio, /crm che poteva anche
//  cancellare, i codici OTP provabili all'infinito, le chiavi di debug scritte
//  nel repository pubblico. Questa prova sorveglia le correzioni.
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const qui = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const radice = path.dirname(qui);
const leggi = (p) => fs.readFileSync(path.join(radice, p), 'utf8');
const senzaCommenti = (s) => s.split('\n').filter((r) => !/^\s*(\/\/|\/\*|\*)/.test(r)).join('\n');

const esiti = [];
const prova = async (n, f) => { try { await f(); esiti.push([true, n, '']); } catch (e) { esiti.push([false, n, e.message]); } };
const deve = (c, m) => { if (!c) throw new Error(m); };

const { creaRequireInterno, _svuotaRuoli, ruoloDa } = await import(path.join(qui, 'auth.js'));
const { creaLimitatore } = await import(path.join(qui, 'limitatore.js'));

function finto() {
  const r = { stato: 200, corpo: null, avanti: false };
  r.res = { status(s) { r.stato = s; return this; }, json(b) { r.corpo = b; return this; } };
  r.next = () => { r.avanti = true; };
  return r;
}
async function passa(righe, id) {
  _svuotaRuoli();
  const mw = creaRequireInterno({ leggi: async (x) => { if (righe === 'guasto') throw new Error('rete'); return righe[x] || null; } });
  const r = finto(); const req = { user: { id } };
  await mw(req, r.res, r.next);
  return { ...r, req };
}

await prova('un account senza riga in iam_utenti (un convenzionato) si ferma: 403', async () => {
  const r = await passa({}, 'esterno');
  deve(!r.avanti && r.stato === 403, `passato=${r.avanti} stato=${r.stato}`);
});
await prova('un account sospeso si ferma', async () => {
  const r = await passa({ s: { id: 's', ruolo: 'admin', attivo: false } }, 's');
  deve(!r.avanti && r.stato === 403, 'un account sospeso è passato');
});
await prova('un account interno passa, col ruolo che calcola il database', async () => {
  const r = await passa({ a: { id: 'a', ruolo: 'top_master' } }, 'a');
  deve(r.avanti && r.req.ruolo === 'admin', `ruolo ${r.req.ruolo}`);
  deve(ruoloDa({ ruolo: 'master' }) === 'operatore' && ruoloDa({ ruolo: 'segnalatore' }) === 'collaboratore', 'mappa dei ruoli diversa da iam_mio_ruolo');
});
await prova('se non si può leggere l\'account non si passa: «non so» non è «sì»', async () => {
  const r = await passa('guasto', 'a');
  deve(!r.avanti && r.stato === 503, `passato=${r.avanti} stato=${r.stato}`);
});

await prova('ogni rotta montata dietro il login è montata anche dietro requireInterno', () => {
  const idx = senzaCommenti(leggi('server/index.js'));
  const righe = idx.split('\n').filter((r) => /app\.use\(/.test(r) && /requireAuth/.test(r));
  deve(righe.length >= 15, 'trovate solo ' + righe.length + ' rotte');
  const scoperte = righe.filter((r) => !/requireAuth,\s*requireInterno/.test(r));
  deve(!scoperte.length, 'senza requireInterno: ' + scoperte.join(' | '));
});

await prova('/crm non usa la chiave di servizio: vale la RLS di chi chiama', () => {
  const crm = senzaCommenti(leggi('server/crm.js'));
  deve(!/SERVICE_ROLE/.test(crm), 'crm.js legge ancora la chiave di servizio');
  deve(/Authorization:\s*'Bearer '\s*\+\s*req\.token/.test(crm), 'il token di chi chiama non arriva al database');
});

await prova('/crm: cancellare un\'anagrafica è solo dell\'amministrazione', async () => {
  const { crmRouter } = await import(path.join(qui, 'crm.js'));
  const r = finto();
  const req = { method: 'DELETE', url: '/anagrafiche/x', headers: {}, ruolo: 'collaboratore', token: 't', user: { id: 'u' } };
  await new Promise((ok) => { r.res.status = function (s) { r.stato = s; return this; }; r.res.json = function (b) { r.corpo = b; ok(); return this; }; crmRouter.handle(req, r.res, () => ok()); });
  deve(r.stato === 403, 'un collaboratore ha potuto cancellare (stato ' + r.stato + ')');
});

await prova('il limitatore: cinque tentativi, poi fermo; un codice nuovo riparte da zero', () => {
  let t = 0; const l = creaLimitatore({ max: 5, finestraMs: 1000, adesso: () => t });
  for (let i = 0; i < 5; i++) l.colpo('a');
  deve(l.bloccato('a'), 'dopo cinque errori non è bloccato');
  deve(!l.colpo('a'), 'il sesto colpo passa');
  l.azzera('a'); deve(!l.bloccato('a'), 'azzerare non sblocca');
  for (let i = 0; i < 5; i++) l.colpo('b'); t = 2000; deve(!l.bloccato('b'), 'la finestra non scade');
});

await prova('firma: il tetto ai tentativi si controlla PRIMA di confrontare il codice', () => {
  const s = leggi('server/sign.js');
  const pezzi = s.split("sha(String(otp) + ':' + t) !== f.otp_hash");
  deve(pezzi.length === 3, 'attese due verifiche OTP, trovate ' + (pezzi.length - 1));
  for (const p of pezzi.slice(0, 2)) {
    const prima = p.slice(-600);
    deve(/OTP_MAX_TENTATIVI/.test(prima), 'una verifica OTP non guarda il tetto prima del confronto');
  }
});

await prova('area convenzionati: tetto ai tentativi prima del confronto, e azzerato a ogni codice nuovo', () => {
  const s = leggi('server/convenzionati.js');
  const i = s.indexOf("impronta(codice + ':' + assoc.id) !== assoc.otp_hash");
  deve(i > 0, 'confronto non trovato');
  deve(/tentativiCodice\.bloccato\(assoc\.id\)/.test(s.slice(i - 400, i)), 'il blocco non sta prima del confronto');
  deve(/tentativiCodice\.azzera\(assoc\.id\)/.test(s), 'un codice nuovo non azzera i tentativi');
});

await prova('nessuna chiave di debug ha un valore di riserva scritto nel repository', () => {
  for (const f of ['server/plurimaExplore.js', 'server/plurimaMap.js', 'server/restorePortali.js']) {
    const s = leggi(f);
    deve(!/process\.env\.[A-Z_]+\s*\|\|\s*'[^']{4,}'/.test(s.split('\n').filter((r) => /const KEY/.test(r)).join('\n')), f + ': chiave di riserva');
    deve(/!KEY\s*\|\|/.test(s), f + ': senza chiave la porta non resta chiusa');
  }
});

await prova('le rotte pubbliche dei codici hanno un tetto per indirizzo', () => {
  const idx = senzaCommenti(leggi('server/index.js'));
  const m = idx.match(/app\.use\(\[([^\]]+)\],\s*tettoPubblico\)/);
  deve(m, 'tetto pubblico non montato');
  for (const r of ['/sign', '/convenzionati', '/firma-collab']) deve(m[1].includes(`'${r}'`), r + ' senza tetto');
  deve(idx.indexOf('tettoPubblico)') < idx.indexOf("app.use('/sign'"), 'il tetto è montato dopo le rotte');
});

await prova('Caddy manda gli header di sicurezza su tutto il sito, non solo sul riquadro', () => {
  const c = leggi('deploy/caddy/iam.caddy');
  const testa = c.slice(c.indexOf('iam.withusassicurazioni.it {'), c.indexOf('handle_path /nuovo-preventivo/*'));
  for (const h of ['Strict-Transport-Security', 'X-Content-Type-Options nosniff', 'Referrer-Policy', "frame-ancestors 'self'"]) deve(testa.includes(h), 'manca ' + h);
});

await prova('la migrazione chiude le quattro porte e nessuna politica torna a «true»', () => {
  const m = leggi('supabase/migrations/20261007b_sicurezza_account_esterni.sql').split('\n').filter((r) => !/^\s*--/.test(r)).join('\n');
  for (const p of ['u_insert', 'u_select', 'iam_trattative_select', 'note_select', '"documenti read"', '"documenti upload"']) deve(m.includes('alter policy ' + p), 'manca ' + p);
  deve(!/using\s*\(\s*true\s*\)/i.test(m), 'una politica torna a using(true)');
  deve(/iam_mio_ruolo\(\) is not null/.test(m), '«interno» non è iam_mio_ruolo()');
});

let ko = 0;
for (const [ok, n, e] of esiti) { console.log((ok ? '  ok  ' : '  X   ') + n + (ok ? '' : '\n        ' + e)); if (!ok) ko++; }
console.log(`\nSICUREZZA ACCOUNT ESTERNI: ${esiti.length - ko} superate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
