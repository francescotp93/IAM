// ═══════════════════════════════════════════════════════════════════════════════
//  IL CONTATORE DELLE LANDING  (09/10/2026)
//
//  «C'è un modo per capire quanti click riceve il link della landing page?» —
//  Francesco. Le prove guardano le tre regole che lo tengono fuori dal consenso
//  cookie (niente cookie, niente IP salvato, niente dati di persone), che il
//  server non dica mai un errore a chi visita, e che la landing, il link
//  WhatsApp e il Lab parlino la stessa lingua.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import http from 'http';
import express from 'express';
import { fileURLToPath } from 'url';
import { sigla, visitatore, rigaEvento, giornoItalia, landingRouter } from '../landingStatistiche.js';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const leggi = f => fs.readFileSync(path.join(RADICE, f), 'utf8');
const esiti = [];
const prova = async (n, f) => { try { const m = await f(); esiti.push([true, n, m || '']); } catch (e) { esiti.push([false, n, e.message]); } };
const deve = (c, m) => { if (!c) throw new Error(m); };
const SEG = 'segreto-di-prova';
const UA = 'Mozilla/5.0 (iPhone) Safari/604.1';

await prova('una sigla non lascia passare un\'email o un numero di telefono', () => {
  deve(sigla('Facebook Ottobre') === 'facebook-ottobre', 'sigla: ' + sigla('Facebook Ottobre'));
  deve(sigla('Città d\'Italia') === 'citta-d-italia', 'accenti: ' + sigla('Città d\'Italia'));
  deve(sigla('mario.rossi@gmail.com') === null, 'un\'email è diventata una campagna');
  deve(sigla('promo 3331234567') === null, 'un numero di telefono è diventato una campagna');
  deve(sigla('') === null && sigla(null) === null, 'il vuoto non è una sigla');
});

await prova('il visitatore non contiene l\'indirizzo e cambia ogni giorno', () => {
  const a = visitatore('93.40.1.2', UA, '2026-10-09', SEG), b = visitatore('93.40.1.2', UA, '2026-10-10', SEG);
  deve(/^[0-9a-f]{16}$/.test(a), 'forma: ' + a);
  deve(a === visitatore('93.40.1.2', UA, '2026-10-09', SEG), 'lo stesso giorno la stessa persona deve dare la stessa impronta');
  deve(a !== b, 'la stessa persona in due giorni ha la stessa impronta: si potrebbe seguirla nel tempo');
  deve(a !== visitatore('93.40.1.3', UA, '2026-10-09', SEG), 'due indirizzi diversi danno la stessa impronta');
});

await prova('robot, anteprime di link ed eventi sconosciuti non si contano', () => {
  deve(rigaEvento({ evento: 'visita', prodotto: 'vita' }, { ip: '1.1.1.1', ua: 'WhatsApp/2.23', segreto: SEG }).scarta === 'robot', 'l\'anteprima di WhatsApp è contata come una visita');
  deve(rigaEvento({ evento: 'visita', prodotto: 'vita' }, { ip: '1.1.1.1', ua: 'facebookexternalhit/1.1', segreto: SEG }).scarta, 'l\'anteprima di Facebook è contata');
  deve(rigaEvento({ evento: 'click', prodotto: 'vita' }, { ip: '1.1.1.1', ua: UA, segreto: SEG }).scarta, 'un evento fuori elenco è entrato');
  deve(rigaEvento({ evento: 'visita' }, { ip: '1.1.1.1', ua: UA, segreto: SEG }).scarta, 'un evento senza prodotto è entrato');
});

await prova('la riga scritta porta solo evento, prodotto, canale, campagna, giorno e impronta', () => {
  const { riga } = rigaEvento({ evento: 'calcolo', prodotto: 'catastrofali', canale: 'WhatsApp', campagna: 'Fiera 2026', nome: 'Mario', email: 'x@y.it' },
    { ip: '1.1.1.1', ua: UA, adesso: new Date('2026-10-08T23:30:00Z'), segreto: SEG });
  deve(JSON.stringify(Object.keys(riga).sort()) === JSON.stringify(['campagna', 'canale', 'evento', 'giorno', 'prodotto', 'visitatore']), 'campi: ' + Object.keys(riga));
  deve(riga.canale === 'whatsapp' && riga.campagna === 'fiera-2026', 'canale/campagna: ' + riga.canale + ' / ' + riga.campagna);
  deve(riga.giorno === '2026-10-09', 'alle 01:30 in Italia è già il 9, il giorno scritto è ' + riga.giorno);
  deve(!JSON.stringify(riga).includes('1.1.1.1'), 'l\'indirizzo è finito nella riga');
  deve(rigaEvento({ evento: 'visita', prodotto: 'vita' }, { ip: '1.1.1.1', ua: UA, segreto: SEG }).riga.canale === 'diretto', 'senza canale deve essere «diretto»');
});

await prova('il server risponde sempre 204, anche se la scrittura cade', async () => {
  const scritte = [];
  let rompi = false;
  const app = express();
  app.set('trust proxy', true);
  process.env.LANDING_SEGRETO = SEG;
  app.use('/landing', express.text({ type: 'text/plain', limit: '2kb' }), landingRouter({ scrivi: async r => { if (rompi) throw new Error('giù'); scritte.push(r); } }));
  const srv = http.createServer(app); await new Promise(r => srv.listen(0, r));
  const url = 'http://127.0.0.1:' + srv.address().port + '/landing/evento';
  const manda = (b, ua = UA) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain', 'User-Agent': ua }, body: b });
  try {
    const r1 = await manda(JSON.stringify({ evento: 'visita', prodotto: 'vita', campagna: 'ottobre' }));
    deve(r1.status === 204, 'stato ' + r1.status);
    deve(scritte.length === 1 && scritte[0].campagna === 'ottobre', 'non ha scritto la visita: ' + JSON.stringify(scritte));
    const r2 = await manda('non è json');
    deve(r2.status === 204 && scritte.length === 1, 'un corpo rotto ha scritto o dato errore');
    const r3 = await manda(JSON.stringify({ evento: 'visita', prodotto: 'vita' }), 'WhatsApp/2.23');
    deve(r3.status === 204 && scritte.length === 1, 'un robot è stato scritto');
    rompi = true;
    const r4 = await manda(JSON.stringify({ evento: 'visita', prodotto: 'vita' }));
    deve(r4.status === 204, 'con il database giù il visitatore riceve ' + r4.status);
  } finally { srv.close(); }
});

const LANDING = leggi('landing.html');
await prova('la landing manda i cinque eventi, una volta sola ciascuno, senza cookie', () => {
  for (const ev of ['visita', 'calcolo', 'richiesta', 'checkout', 'acquisto'])
    deve(LANDING.includes("trk('" + ev + "')"), 'la landing non manda «' + ev + '»');
  const f = LANDING.slice(LANDING.indexOf('function trk('), LANDING.indexOf('function trk(') + 400);
  deve(/if\(TRK_FATTI\[evento\]\) return;/.test(f), 'lo stesso evento può partire più volte per apertura');
  deve(/keepalive:true/.test(f) && /\/landing\/evento/.test(f), 'non usa keepalive o non va al contatore');
  deve(!/document\.cookie|localStorage|sessionStorage/.test(f), 'il contatore scrive nel browser');
  /* La richiesta parte DOPO la conferma del server, non al clic: una richiesta
     fallita contata come richiesta gonfierebbe l'imbuto. */
  const lead = LANDING.slice(LANDING.indexOf("fetch(API+'/lead'"), LANDING.indexOf("trk('richiesta')") + 20);
  deve(/if\(!r\.ok\|\|!d\.ok\) throw/.test(lead), 'la richiesta si conta prima di sapere se è arrivata');
});

await prova('il link di WhatsApp porta il canale e la campagna', () => {
  const s = leggi('server/shop.js');
  const r = s.slice(s.indexOf("ogRouter.get('/:prodotto'"), s.indexOf("ogRouter.get('/:prodotto'") + 900);
  deve(/'&canale=whatsapp'/.test(r), 'il link /l/ non dice di venire da WhatsApp');
  deve(/sigla\(req\.query\.campagna\)/.test(r), 'la campagna del link non passa, o passa senza diventare sigla');
});

const LAB = leggi('lab/index.html');
await prova('il Lab riduce la campagna come il server', () => {
  const corpo = LAB.slice(LAB.indexOf('function campSigla('), LAB.indexOf('function campDi('));
  const campSigla = new Function(corpo + '; return campSigla;')();
  for (const v of ['Facebook Ottobre', 'Città d\'Italia', 'mario@x.it', 'promo 3331234567', '  --volantino--  ', ''])
    deve((campSigla(v) || null) === sigla(v), '«' + v + '»: Lab ' + campSigla(v) + ', server ' + sigla(v));
  for (const id of ['l-camp', 'vad-camp', 'wa-camp']) deve(LAB.includes("campDi('" + id + "')"), 'il campo ' + id + ' non entra nel link');
});

await prova('la linguetta Statistiche legge le somme dal database e non scrive mai zero su un guasto', () => {
  deve(LAB.includes("showTab('stat')") && LAB.includes("if (t==='stat') loadStat();"), 'la linguetta non apre le statistiche');
  const f = LAB.slice(LAB.indexOf('async function loadStat('), LAB.indexOf('bootAuth();', LAB.indexOf('async function loadStat(')));
  deve(/db\.rpc\('iam_landing_statistiche'/.test(f) && /db\.rpc\('iam_landing_giorni'/.test(f), 'non usa le due funzioni del database');
  deve(!/db\.from\('iam_landing_eventi'\)/.test(f), 'scarica gli eventi uno per uno invece delle somme');
  deve(/if \(r1\.error\)\{[\s\S]{0,200}Non si è potuto leggere/.test(f), 'un guasto della lettura non si dichiara');
});

await prova('la tabella si legge solo dal server, e si scrive solo dal server', () => {
  const sql = leggi('supabase/migrations/20261009c_landing_eventi.sql').split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
  deve(!/for\s+insert/i.test(sql) && !/for\s+all/i.test(sql), 'c\'è una politica che lascia scrivere dal browser');
  deve(/security invoker/i.test(sql) && !/security definer/i.test(sql), 'le somme scavalcano le politiche');
  deve(!/\bip\b|indirizzo_ip|user_agent|email|nome\b/i.test(sql.slice(sql.indexOf('create table'), sql.indexOf(');', sql.indexOf('create table')))), 'la tabella ha una colonna con dati di persone');
});

await prova('il giorno è quello italiano', () => {
  deve(giornoItalia(new Date('2026-10-08T22:30:00Z')) === '2026-10-09', 'giorno: ' + giornoItalia(new Date('2026-10-08T22:30:00Z')));
});

let ko = 0;
console.log('\nCONTATORE LANDING');
for (const [ok, n, m] of esiti) { console.log(ok ? '  ok  ' + n + (m ? ' — ' + m : '') : '  X   ' + n + ' — ' + m); if (!ok) ko++; }
console.log(`\nCONTATORE LANDING: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
