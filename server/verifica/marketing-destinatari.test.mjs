// ═══════════════════════════════════════════════════════════════════════════════
//  DESTINATARI DI UNA CAMPAGNA — le prove che contano
//
//  Perché questa prova esiste. Da quando una campagna può partire su un GRUPPO
//  o su un SEGMENTO, il numero dei destinatari non arriva più da Brevo: lo
//  calcola questo codice. Un errore qui non si vede — si vede dopo, quando la
//  mail è partita a chi non doveva riceverla, e allora è tardi.
//
//  Le tre cose sorvegliate sono le tre che fanno danno:
//    1. il CONSENSO: chi non ce l'ha non deve entrare in nessun elenco, mai;
//    2. l'ETÀ: è una data di nascita al contrario, e invertire i due estremi è
//       l'errore classico — «over 60» che diventa «under 60»;
//    3. il «NON ce l'ha» del cross-selling: dev'essere calcolato su TUTTE le
//       polizze del cliente, non su quelle già filtrate per compagnia o
//       scadenza, altrimenti si offre la casa a chi la casa ce l'ha già.
//
//  Supabase qui non c'è: `fetch` viene sostituito con un finto che risponde
//  con dati costruiti a mano. Il codice provato è quello vero, non una copia.
// ═══════════════════════════════════════════════════════════════════════════════
process.env.SUPABASE_ANON_KEY = 'per-la-prova';

const FINTO = {
  quote_anagrafiche: [
    { id: 'a1', nominativo: 'Rossi Mario', email: 'mario@x.it', consenso_marketing: true },
    { id: 'a2', nominativo: 'Rossi Anna', email: 'anna@x.it', consenso_marketing: false },
    { id: 'a3', nominativo: 'Verdi Luca', email: '', consenso_marketing: true },
    { id: 'a4', nominativo: 'Bianchi Spa', email: 'non-e-un-indirizzo', consenso_marketing: true },
    { id: 'a5', nominativo: 'Neri Sara', email: 'SARA@X.IT', consenso_marketing: true },
  ],
  quote_polizze: [
    { cliente_id: 'a1', prodotto: 'RC Auto', compagnia: 'HDI', data_scadenza: '2026-09-10' },
    { cliente_id: 'a5', prodotto: 'RC Auto', compagnia: 'HDI', data_scadenza: '2026-09-20' },
    { cliente_id: 'a5', prodotto: 'Casa sicura', compagnia: 'Allianz', data_scadenza: '2026-11-01' },
  ],
  quote_gruppi: [{ id: 'g1', nome: 'Famiglia Rossi', tipo: 'famiglia' }],
  quote_gruppi_membri: [{ gruppo_id: 'g1', anagrafica_id: 'a1' }, { gruppo_id: 'g1', anagrafica_id: 'a2' }],
};

const chiamate = [];
globalThis.fetch = async (url) => {
  const percorso = String(url).split('/rest/v1/')[1];
  chiamate.push(decodeURIComponent(percorso));
  const tabella = percorso.split('?')[0];
  let righe = FINTO[tabella] || [];
  /* Il finto rispetta solo il filtro `id=in.(...)`, che è quello da cui dipende
     la logica dei gruppi. Gli altri li fa il database vero. */
  const dentro = /[?&]id=in\.\(([^)]*)\)/.exec(percorso);
  if (dentro) { const ok = dentro[1].split(','); righe = righe.filter(r => ok.includes(r.id)); }
  /* Come PostgREST: al più mille righe, e limit/offset rispettati. Senza
     questo il finto restituirebbe tutto in un colpo e la prova della lettura
     completa non misurerebbe niente. */
  const lim = /[?&]limit=(\d+)/.exec(percorso), off = /[?&]offset=(\d+)/.exec(percorso);
  const da = off ? Number(off[1]) : 0;
  righe = righe.slice(da, da + Math.min(lim ? Number(lim[1]) : 1000, 1000));
  return { ok: true, text: async () => JSON.stringify(righe) };
};

const { membriGruppo, membriSegmento } = await import('../marketingDestinatari.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

prova('nel gruppo entra solo chi ha indirizzo E consenso', async () => {
  const g = await membriGruppo('tok', 'g1');
  const mail = g.contattabili.map(x => x.email);
  deve(mail.length === 1 && mail[0] === 'mario@x.it', 'contattabili sbagliati: ' + JSON.stringify(mail));
  deve(g.senzaConsenso.length === 1, 'Anna ha il consenso a false e deve risultare esclusa per consenso');
});

prova('un indirizzo scritto male non è un indirizzo', async () => {
  const s = await membriSegmento('tok', {});
  deve(!s.contattabili.some(x => x.nominativo === 'Bianchi Spa'), 'un testo senza @ è passato per email');
  deve(s.senzaEmail.some(x => x.nominativo === 'Bianchi Spa'), 'l\'indirizzo storto deve finire fra i «senza email»');
});

prova('le maiuscole non creano un contatto diverso su Brevo', async () => {
  const s = await membriSegmento('tok', {});
  deve(s.contattabili.some(x => x.email === 'sara@x.it'), 'SARA@X.IT doveva diventare minuscolo');
});

prova('«ha una polizza auto» prende chi ce l\'ha e nessun altro', async () => {
  const s = await membriSegmento('tok', { prodotto: 'auto' });
  const nomi = s.contattabili.map(x => x.nominativo).sort();
  deve(JSON.stringify(nomi) === JSON.stringify(['Neri Sara', 'Rossi Mario']), 'trovati: ' + nomi.join(', '));
});

prova('il cross-selling esclude chi il prodotto ce l\'ha già', async () => {
  const s = await membriSegmento('tok', { senza_prodotto: 'Casa' });
  const nomi = s.contattabili.map(x => x.nominativo);
  deve(!nomi.includes('Neri Sara'), 'Sara ha «Casa sicura»: non deve ricevere l\'offerta casa');
  deve(nomi.includes('Rossi Mario'), 'Mario la casa non ce l\'ha e deve restarci');
});

prova('il «non ce l\'ha» guarda tutte le polizze, non solo quelle filtrate', async () => {
  /* Sara ha l'auto con HDI e la casa con Allianz. Chiedendo «clienti HDI senza
     casa», se il controllo guardasse solo le polizze HDI, Sara passerebbe — e
     si ritroverebbe l'offerta di una polizza che ha già. */
  const s = await membriSegmento('tok', { compagnia: 'HDI', senza_prodotto: 'Casa' });
  deve(!s.contattabili.some(x => x.nominativo === 'Neri Sara'), 'Sara è passata: il filtro guarda solo le polizze filtrate');
});

prova('l\'età non è invertita', async () => {
  chiamate.length = 0;
  await membriSegmento('tok', { eta_min: 40, eta_max: 60 });
  const url = chiamate[0];
  const oggi = new Date();
  const meno = (n) => new Date(oggi.getFullYear() - n, oggi.getMonth(), oggi.getDate()).toISOString().slice(0, 10);
  deve(url.includes('data_nascita=lte.' + meno(40)), 'chi ha almeno 40 anni è nato PRIMA di ' + meno(40) + ' — url: ' + url);
  deve(url.includes('data_nascita=gte.' + meno(61)), 'chi ha al più 60 anni è nato DOPO ' + meno(61) + ' — url: ' + url);
});

prova('i valori scritti a mano non possono rompere il filtro', async () => {
  chiamate.length = 0;
  await membriSegmento('tok', { provincia: 'RG),tutto=eq.1' });
  deve(!/\(|\)/.test(chiamate[0].split('provincia=')[1] || ''), 'parentesi passate dentro il filtro: ' + chiamate[0]);
});

// ── Il soft spam (art. 130 c. 4), 08/10/2026 ───────────────────────────────
const SOFT_OK = { base: 'soft_spam', soft_spam_confermato: { il: '2026-10-08T09:00:00Z', da: 'prova' } };
function conSoft(fn) {
  return async () => {
    const prima = FINTO.quote_anagrafiche, primaP = FINTO.quote_polizze;
    FINTO.quote_anagrafiche = [
      { id: 's1', nominativo: 'Cliente Senza Consenso', email: 's1@x.it', consenso_marketing: false, lead: false },
      { id: 's2', nominativo: 'Lead Senza Consenso', email: 's2@x.it', consenso_marketing: false, lead: true },
      { id: 's3', nominativo: 'Non Cliente', email: 's3@x.it', consenso_marketing: false, lead: false },
      { id: 's4', nominativo: 'Opposto Con Consenso', email: 's4@x.it', consenso_marketing: true, lead: false, opposizione_marketing_il: '2026-09-01T00:00:00Z' },
      { id: 's5', nominativo: 'Cliente Con Consenso', email: 's5@x.it', consenso_marketing: true, lead: false },
    ];
    FINTO.quote_polizze = [
      { id: 'p1', cliente_id: 's1', prodotto: 'RC Auto' },
      { id: 'p2', cliente_id: 's2', prodotto: 'RC Auto' },
      { id: 'p4', cliente_id: 's4', prodotto: 'Casa' },
      { id: 'p5', cliente_id: 's5', prodotto: 'Casa' },
    ];
    try { await fn(); } finally { FINTO.quote_anagrafiche = prima; FINTO.quote_polizze = primaP; }
  };
}

prova('senza la dichiarazione il soft spam NON si accende: valgono solo i consensi', conSoft(async () => {
  const s = await membriSegmento('tok', { base: 'soft_spam' });
  const nomi = s.contattabili.map(x => x.nominativo);
  deve(!nomi.includes('Cliente Senza Consenso'), 'senza dichiarazione è entrato un cliente senza consenso');
  deve(nomi.includes('Cliente Con Consenso'), 'chi ha il consenso deve restare');
}));

prova('con la dichiarazione entra il CLIENTE senza consenso, e si dice per quale base', conSoft(async () => {
  const s = await membriSegmento('tok', SOFT_OK);
  const c = s.contattabili.find(x => x.nominativo === 'Cliente Senza Consenso');
  deve(c && c.base === 'soft_spam', 'il cliente con polizza e senza consenso doveva entrare per soft spam');
  deve(s.perSoftSpam === 1, 'conteggio soft spam: ' + s.perSoftSpam);
  const k = s.contattabili.find(x => x.nominativo === 'Cliente Con Consenso');
  deve(k && k.base === 'consenso', 'chi ha il consenso entra per consenso, non per soft spam');
}));

prova('il soft spam non vale per un lead né per chi non ha polizze', conSoft(async () => {
  const s = await membriSegmento('tok', SOFT_OK);
  const nomi = s.contattabili.map(x => x.nominativo);
  deve(!nomi.includes('Lead Senza Consenso'), 'un lead non ha comprato niente: non è un cliente');
  deve(!nomi.includes('Non Cliente'), 'chi non ha polizze non è un cliente');
}));

prova('chi si è opposto non entra MAI, nemmeno col consenso', conSoft(async () => {
  for (const f of [SOFT_OK, {}]) {
    const s = await membriSegmento('tok', f);
    deve(!s.contattabili.some(x => x.nominativo === 'Opposto Con Consenso'), 'un opposto è entrato in lista');
    deve(s.opposti.length === 1, 'l\'opposto deve essere contato a parte');
  }
}));

prova('i gruppi non usano mai il soft spam', async () => {
  const src = (await import('fs')).readFileSync(new URL('../marketingDestinatari.js', import.meta.url), 'utf8');
  const g = (src.match(/export async function membriGruppo[\s\S]*?\n\}/) || [''])[0];
  deve(g && !/softSpam|clienti/.test(g.replace(/\/\*[\s\S]*?\*\//g, '')), 'membriGruppo passa il soft spam');
});

prova('il segmento legge TUTTA la rubrica, non le prime mille righe', async () => {
  const prima = FINTO.quote_anagrafiche;
  FINTO.quote_anagrafiche = Array.from({ length: 2500 }, (_, i) =>
    ({ id: 'm' + String(i).padStart(4, '0'), nominativo: 'Persona ' + i, email: 'p' + i + '@x.it', consenso_marketing: true }));
  try {
    const s = await membriSegmento('tok', { tipo: 'fisica' });
    deve(s.contattabili.length === 2500, 'contattabili: ' + s.contattabili.length + ' su 2500');
  } finally { FINTO.quote_anagrafiche = prima; }
});

prova('le polizze non si chiedono passando gli id nell\'indirizzo', async () => {
  chiamate.length = 0;
  await membriSegmento('tok', { senza_prodotto: 'Casa', prodotto: 'auto' });
  deve(!chiamate.some(c => /quote_polizze\?[^]*cliente_id=in\./.test(c)), 'un indirizzo con migliaia di id muore: ' + chiamate.join(' | '));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nDESTINATARI — gruppi, segmenti e consenso');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n      ' + e.message); }
}
console.log(`\nDESTINATARI: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
