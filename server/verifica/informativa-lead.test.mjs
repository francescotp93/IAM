// ═══════════════════════════════════════════════════════════════════════════════
//  L'INFORMATIVA PRIVACY SUI MODULI «RICHIEDI PREVENTIVO»  (10/10/2026)
//
//  «Dobbiamo aggiungere il testo privacy visibile» — Francesco, dopo aver
//  chiesto se chi compila il modulo per un preventivo RCA dà un consenso
//  valido. Per rispondere alla richiesta il consenso non serve (art. 6.1.b),
//  ma l'informativa va data NEL MOMENTO in cui si raccolgono i dati (art. 13),
//  e il marketing vuole un consenso a parte, facoltativo e non spuntato.
//
//  I moduli sono due (la landing e il widget da incollare nel sito) e dicono
//  la STESSA informativa: due testi scritti a mano divergono al primo ritocco.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import http from 'http';
import express from 'express';
import { fileURLToPath } from 'url';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const leggi = f => fs.readFileSync(path.join(RADICE, f), 'utf8');
const esiti = [];
const prova = async (n, f) => { try { const m = await f(); esiti.push([true, n, m || '']); } catch (e) { esiti.push([false, n, e.message]); } };
const deve = (c, m) => { if (!c) throw new Error(m); };

const MODULI = ['landing.html', 'widget.html'];
const blocco = f => {
  const s = leggi(f), a = s.indexOf('INFORMATIVA-LEAD: inizio'), b = s.indexOf('INFORMATIVA-LEAD: fine');
  if (a < 0 || b < 0) throw new Error(f + ': manca il blocco dell\'informativa');
  return s.slice(a, b);
};
const testo = h => h.replace(/<[^>]+>/g, ' ').replace(/&middot;|&mdash;|&nbsp;/g, ' ').replace(/\s+/g, ' ');

await prova('i due moduli mostrano la stessa informativa', () => {
  const [l, w] = MODULI.map(blocco);
  deve(l.replace(/\s+/g, ' ') === w.replace(/\s+/g, ' '), 'landing e widget dicono due informative diverse');
});

await prova('l\'informativa si vede prima del tasto, e dice quello che l\'art. 13 chiede', () => {
  for (const f of MODULI) {
    const s = leggi(f), b = blocco(f), t = testo(b);
    deve(s.indexOf('INFORMATIVA-LEAD: inizio') < s.indexOf('id="submit"'), f + ': l\'informativa sta dopo il tasto «Invia»');
    deve(!/display\s*:\s*none|hidden/.test(b.slice(0, b.indexOf('</div>'))), f + ': il riquadro dell\'informativa è nascosto');
    for (const [cosa, re] of [
      ['il titolare', /With Us Società Cooperativa/], ['i recapiti', /amministrazione@withusassicurazioni\.it/],
      ['la PEC', /withus\.coop@pec\.it/], ['la finalità e la base giuridica', /art\. 6\.1\.b/],
      ['i destinatari', /compagnie e agli intermediari/], ['la conservazione', /Per quanto tempo/],
      ['i diritti', /cancellazione/], ['il reclamo al Garante', /Garante/],
    ]) deve(re.test(t), f + ': l\'informativa breve non dice ' + cosa);
    deve(/\/sign\/privacy\/informativa"/.test(b) && /Informativa_Privacy_WithUs_PR01_rev4\.1\.pdf"/.test(b), f + ': manca il link all\'informativa completa o al PDF');
  }
});

await prova('i fatti dell\'informativa breve sono quelli dell\'informativa ufficiale PR01', () => {
  const pr01 = leggi('docs/privacy/informativa-pr01.txt');
  for (const fatto of ['VICO GIUNONE 3', 'amministrazione@withusassicurazioni.it', 'withus.coop@pec.it', 'Garante', 'portabilità', 'imprese di assicurazione e altri intermediari'])
    deve(pr01.toLowerCase().includes(fatto.toLowerCase()), 'l\'informativa ufficiale non dice «' + fatto + '»: il testo breve non può dirlo');
  deve(fs.existsSync(path.join(RADICE, 'docs/privacy/Informativa_Privacy_WithUs_PR01_rev4.1.pdf')), 'il PDF dell\'informativa non c\'è');
});

await prova('presa visione obbligatoria, marketing facoltativo e non spuntato', () => {
  for (const f of MODULI) {
    const b = blocco(f);
    const priv = (b.match(/<input[^>]*id="privacy"[^>]*>/) || [''])[0];
    const mkt = (b.match(/<input[^>]*id="consenso_mkt"[^>]*>/) || [''])[0];
    deve(/required/.test(priv), f + ': la presa visione non è obbligatoria');
    deve(mkt, f + ': manca la casella del consenso marketing');
    deve(!/required|checked/.test(mkt), f + ': il consenso marketing è obbligatorio o già spuntato (art. 7: non è libero)');
    deve(/Facoltativo/.test(b), f + ': la casella del marketing non dice di essere facoltativa');
  }
});

await prova('i due moduli mandano al server la presa visione e il consenso', () => {
  for (const f of MODULI) {
    const s = leggi(f);
    deve(/privacy_letta\s*:\s*document\.getElementById\('privacy'\)\.checked/.test(s), f + ': non manda la presa visione');
    deve(/consenso_marketing\s*:\s*document\.getElementById\('consenso_mkt'\)\.checked/.test(s), f + ': non manda il consenso marketing');
  }
});

/* La regola che porta il consenso sulla scheda del cliente sta nel database
   (provata sul database vero il 10/10/2026, sei casi, transazione annullata).
   Qui si sorveglia il sorgente: le stesse regole non devono sparire. */
await prova('il consenso arriva sulla scheda solo se è suo, ed è l\'ultima volontà', () => {
  const sql = leggi('supabase/migrations/20261010_lead_consenso_in_anagrafica.sql')
    .split('\n').filter(l => !/^\s*--/.test(l)).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const dich = (sql.match(/v_servizio boolean :=[^;]*;/) || [''])[0];
  deve(dich, 'manca il controllo su chi scrive');
  deve(!/current_user/.test(dich), 'chi scrive si riconosce con current_user: in una SECURITY DEFINER è sempre il proprietario, e il controllo direbbe «server» a tutti');
  deve(/auth\.role\(\)/.test(dich), 'chi scrive non si riconosce dal ruolo nel token');
  deve(/new\.dati - 'privacy'/.test(sql) && /old\.dati->'privacy'/.test(sql), 'la registrazione privacy si può scrivere da un account');
  deve(/modulo is distinct from 'lead'/.test(sql) && /is distinct from 'true'/.test(sql), 'si porta un consenso che non è un vero sì, o da una richiesta che non è del sito');
  deve(/contatti diversi/.test(sql), 'non si controlla che email o telefono siano quelli della scheda');
  deve(/opposizione_marketing_il >= v_il/.test(sql) && /privacy_firma->>'firmato_il'/.test(sql), 'un consenso vecchio scavalca un\'opposizione o una privacy firmata dopo');
  deve(/consenso_marketing is true/.test(sql), 'un consenso già presente viene riscritto');
  deve(/'\{consenso_portato\}'/.test(sql), 'l\'esito non resta scritto sulla richiesta');
});

/* Il server: si fa girare la rotta vera con un finto Supabase. */
const scritte = [];
const fetchVero = globalThis.fetch;
globalThis.fetch = async (url, opz = {}) => {
  const u = String(url);
  if (u.startsWith('http://127.0.0.1')) return fetchVero(url, opz);
  if (opz.method === 'POST') scritte.push({ url: u, corpo: JSON.parse(opz.body) });
  return new Response(JSON.stringify(u.includes('iam_lead') && opz.method === 'POST' ? [{ id: 1 }] : []), { status: 200, headers: { 'content-type': 'application/json' } });
};
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chiave-finta';
delete process.env.LEAD_API_KEY; delete process.env.BREVO_API_KEY;
const { leadRouter } = await import('../lead.js');
const app = express(); app.use(express.json()); app.use('/lead', leadRouter);
const srv = http.createServer(app); await new Promise(r => srv.listen(0, r));
const manda = async corpo => {
  scritte.length = 0;
  const r = await fetchVero('http://127.0.0.1:' + srv.address().port + '/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
  const pv = scritte.find(s => s.url.includes('quote_preventivi')), ld = scritte.find(s => s.url.includes('iam_lead'));
  return { stato: r.status, privacy: pv && pv.corpo[0].dati.privacy, consensoLead: ld && ld.corpo[0].consenso };
};
const base = { nome: 'Mario Prova', email: 'prova@esempio.it', prodotto: 'Auto' };

try {
  await prova('il server registra versione, presa visione e consenso, con l\'ora', async () => {
    const r = await manda({ ...base, privacy_letta: true, consenso_marketing: true });
    deve(r.stato === 200, 'stato ' + r.stato);
    deve(r.privacy && r.privacy.informativa === 'PR01 rev 4.1', 'non registra quale informativa è stata data');
    deve(r.privacy.presa_visione === true && r.privacy.presa_visione_il, 'non registra la presa visione con l\'ora');
    deve(r.privacy.consenso_marketing === true && r.privacy.consenso_marketing_il, 'non registra il consenso con l\'ora');
    deve(r.consensoLead === true, 'il lead in IAM non porta il consenso');
  });
  await prova('un consenso che non è un vero «sì» non è un consenso', async () => {
    for (const v of [undefined, false, 'true', 1, 'on']) {
      const r = await manda({ ...base, privacy_letta: true, consenso_marketing: v });
      deve(r.privacy.consenso_marketing === false && r.privacy.consenso_marketing_il === null, 'consenso_marketing=' + JSON.stringify(v) + ' registrato come consenso');
      deve(r.consensoLead === false, 'il lead in IAM risulta col consenso con consenso_marketing=' + JSON.stringify(v));
    }
  });
  await prova('un modulo vecchio non viene rifiutato, ma la presa visione risulta non registrata', async () => {
    const r = await manda({ ...base });
    deve(r.stato === 200, 'una richiesta di preventivo rifiutata per un modulo vecchio');
    deve(r.privacy.presa_visione === false && r.privacy.presa_visione_il === null, 'presa visione inventata');
  });
} finally { srv.close(); globalThis.fetch = fetchVero; }

let ko = 0;
console.log('\nINFORMATIVA SUI MODULI DI RICHIESTA');
for (const [ok, n, m] of esiti) { console.log(ok ? '  ok  ' + n + (m ? ' — ' + m : '') : '  X   ' + n + ' — ' + m); if (!ok) ko++; }
console.log(`\nINFORMATIVA LEAD: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
