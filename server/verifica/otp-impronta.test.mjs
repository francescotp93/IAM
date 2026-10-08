// ═══════════════════════════════════════════════════════════════════════════
//  I CODICI DI CONFERMA NON SI RICAVANO DALL'IMPRONTA (08/10/2026)
//
//  Prima l'impronta era sha256(codice + ':' + legame): chi leggeva la riga
//  provava il milione di codici sul suo computer e trovava quello giusto. Il
//  tetto dei tentativi non scattava, perché al server arrivava un tentativo
//  solo, ed era giusto. Questa prova FA quell'attacco e pretende che fallisca.
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const qui = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const esiti = [];
const prova = async (n, f) => { try { await f(); esiti.push([true, n, '']); } catch (e) { esiti.push([false, n, e.message]); } };
const deve = (c, m) => { if (!c) throw new Error(m); };

process.env.OTP_SEGRETO = 'segreto-di-prova-che-sta-solo-sul-server';
const { improntaOtp, otpGiusto } = await import(path.join(qui, 'otpImpronta.js'));

await prova('l\'attacco del milione di codici sull\'impronta non trova niente', () => {
  const legame = 'associato-123';
  const codice = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const imp = improntaOtp(codice, legame);
  let trovato = null;
  for (let n = 0; n < 1000000; n++) {
    const c = String(n).padStart(6, '0');
    if (crypto.createHash('sha256').update(c + ':' + legame).digest('hex') === imp) { trovato = c; break; }
  }
  deve(trovato === null, 'il codice si ricava dall\'impronta senza la chiave: ' + trovato);
});

await prova('il codice giusto passa, uno sbagliato no, e un\'impronta storta non fa saltare niente', () => {
  const imp = improntaOtp('482913', 'tok-1');
  deve(otpGiusto('482913', 'tok-1', imp), 'il codice giusto non passa');
  deve(!otpGiusto('482914', 'tok-1', imp), 'un codice sbagliato passa');
  deve(!otpGiusto('482913', 'tok-2', imp), 'lo stesso codice vale per un\'altra firma');
  deve(!otpGiusto('482913', 'tok-1', null) && !otpGiusto('482913', 'tok-1', 'zz'), 'un\'impronta assente o storta passa');
});

await prova('senza chiave non si genera niente: nessun ripiego su una chiave nota', async () => {
  const salva = { a: process.env.OTP_SEGRETO, b: process.env.SUPABASE_SERVICE_ROLE_KEY };
  delete process.env.OTP_SEGRETO; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  let lanciato = false;
  try { improntaOtp('1', '2'); } catch (e) { lanciato = true; }
  process.env.OTP_SEGRETO = salva.a; if (salva.b) process.env.SUPABASE_SERVICE_ROLE_KEY = salva.b;
  deve(lanciato, 'senza chiave ha generato un\'impronta');
});

await prova('nessun file genera o confronta più un OTP con lo sha semplice', () => {
  for (const f of ['convenzionati.js', 'sign.js', 'firmaCollab.js']) {
    const s = fs.readFileSync(path.join(qui, f), 'utf8');
    deve(!/(sha|impronta)\(\s*(String\()?(otp|codice)/.test(s), f + ': un OTP passa ancora dallo sha semplice');
    deve(/otpGiusto\(/.test(s) && /improntaOtp\(/.test(s), f + ': non usa l\'impronta con la chiave');
  }
});

await prova('la firma dei collaboratori ha il suo tetto di tentativi, azzerato a ogni codice nuovo', () => {
  const s = fs.readFileSync(path.join(qui, 'firmaCollab.js'), 'utf8');
  for (const k of ["'c:'", "'a:'"]) {
    const i = s.indexOf('!otpGiusto(', s.indexOf("tentativiFirma.bloccato(" + k));
    deve(s.indexOf("tentativiFirma.bloccato(" + k) > 0 && i > 0, 'manca il blocco ' + k + ' prima del confronto');
  }
  deve(/tentativiFirma\.azzera\('a:'/.test(s), 'un codice di controfirma nuovo non azzera i tentativi');
});

let ko = 0;
for (const [ok, n, e] of esiti) { console.log((ok ? '  ok  ' : '  X   ') + n + (ok ? '' : '\n        ' + e)); if (!ok) ko++; }
console.log(`\nIMPRONTA OTP: ${esiti.length - ko} superate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
