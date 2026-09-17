// ═══════════════════════════════════════════════════════════════════════════════
//  L'ATTIVAZIONE DELL'ACCESSO DI UNA PERSONA (17/09/2026, Lavoro 2 PR 3)
//
//  Un amministratore attiva una persona del registro: nasce l'utenza, nasce la
//  scheda IAM, la persona si aggancia, e alla sua email parte il collegamento
//  per SCEGLIERE la password. Queste prove girano tutto il percorso con un
//  archivio finto e una posta finta, e tengono ferme le regole che contano:
//  chi decide e' il token, la password non la vede nessuno, e quando c'e' un
//  dubbio (un account gia' esistente) ci si ferma e si dice cosa fare.
// ═══════════════════════════════════════════════════════════════════════════════
import { preparaAttivazione, attivaPersona, emailAttivazione, passwordChiusa, RUOLI } from '../utenti.js';

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

const ADMIN = { id: '00000000-0000-4000-8000-000000000001', email: 'capo@x.it' };
const COLLAB = { id: '00000000-0000-4000-8000-000000000002', email: 'coll@x.it' };
const PERSONA = '11111111-1111-4111-8111-111111111111';

/* Un Supabase finto: risponde alle stesse strade che il modulo percorre e
   registra ogni scrittura. `opz` accende i casi particolari. */
function supabaseFinto(opz = {}) {
  const st = { chiamate: [], utenzeCreate: [], schedeIam: [], patchPersona: [], linkGenerati: [] };
  const utenti = {
    [ADMIN.id]: { id: ADMIN.id, attivo: true, ruolo: opz.ruoloAdmin || 'admin' },
    [COLLAB.id]: { id: COLLAB.id, attivo: true, ruolo: 'collaboratore' },
  };
  const persona = { id: PERSONA, nome: 'Anna', cognome: 'Bianchi', email: opz.emailPersona === undefined ? 'Anna.Bianchi@X.it' : opz.emailPersona, iam_id: opz.iamIdPersona || null, stato: 'attivo' };
  const sb = async (path, o = {}) => {
    st.chiamate.push({ path, method: (o.method || 'GET'), body: o.body ? JSON.parse(o.body) : null });
    if (path.startsWith('/rest/v1/iam_utenti?id=eq.')) { const id = decodeURIComponent(path.split('id=eq.')[1].split('&')[0]); return utenti[id] ? [utenti[id]] : []; }
    if (path.startsWith('/rest/v1/quote_collaboratori?id=eq.') && (o.method || 'GET') === 'GET') return [persona];
    if (path.startsWith('/rest/v1/iam_utenti?email=eq.')) return opz.omonimo ? [{ id: 'x', nome: 'Altra', cognome: 'Persona' }] : [];
    if (path === '/auth/v1/admin/users' && o.method === 'POST') {
      if (opz.emailGiaRegistrata) { const e = new Error('A user with this email address has already been registered'); e.stato = 422; throw e; }
      const b = JSON.parse(o.body); st.utenzeCreate.push(b); return { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: b.email };
    }
    if (path.startsWith('/auth/v1/admin/users?filter=')) return { users: [{ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', email: 'anna.bianchi@x.it' }] };
    if (path === '/rest/v1/iam_utenti' && o.method === 'POST') { st.schedeIam.push(JSON.parse(o.body)); return null; }
    if (path.startsWith('/rest/v1/quote_collaboratori?id=eq.') && o.method === 'PATCH') { st.patchPersona.push(JSON.parse(o.body)); return null; }
    if (path === '/auth/v1/admin/generate_link') { const b = JSON.parse(o.body); st.linkGenerati.push(b); return { action_link: 'https://sb.finto/verify?token=abc&redirect_to=' + b.redirect_to }; }
    throw new Error('strada non prevista dal finto: ' + (o.method || 'GET') + ' ' + path);
  };
  const posta = [];
  const inviaEmail = async (to, subject, html) => { posta.push({ to, subject, html }); return { ok: true }; };
  return { sb, inviaEmail, posta, st, dip: { sb, inviaEmail, iamUrl: 'https://iam.finto', password: () => 'PASSWORD-SEGRETA-FINTA' } };
}

prova('il corpo si controlla: serve una persona vera, il ruolo e\' fra quelli ammessi, e senza ruolo e\' collaboratore', () => {
  deve(!preparaAttivazione({}).ok && /persona_id/.test(preparaAttivazione({}).errore), 'senza persona passa');
  deve(!preparaAttivazione({ persona_id: 'abc' }).ok, 'un id che non e\' uuid passa');
  const r = preparaAttivazione({ persona_id: PERSONA });
  deve(r.ok && r.ruolo === 'collaboratore', 'senza ruolo non e\' collaboratore: ' + JSON.stringify(r));
  deve(preparaAttivazione({ persona_id: PERSONA, ruolo: 'Operatore' }).ruolo === 'operatore', 'il ruolo non si normalizza');
  deve(!preparaAttivazione({ persona_id: PERSONA, ruolo: 'top_master' }).ok, 'un ruolo storico passa in creazione');
  return RUOLI.join('/') + ', default collaboratore';
});

prova('tutto il percorso: utenza, scheda IAM, aggancio della persona, collegamento per la password', async () => {
  const f = supabaseFinto();
  const r = await attivaPersona({ personaId: PERSONA, ruolo: 'operatore', chi: ADMIN }, f.dip);
  deve(r.iam_id === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' && r.email === 'anna.bianchi@x.it' && r.riusata === false, 'risposta storta: ' + JSON.stringify(r));
  const u = f.st.utenzeCreate[0];
  deve(u && u.email_confirm === true && u.email === 'anna.bianchi@x.it', 'l\'utenza non nasce confermata con l\'email in minuscolo: ' + JSON.stringify(u));
  deve(u.user_metadata && u.user_metadata.ruolo === 'operatore' && u.user_metadata.persona_id === PERSONA, 'i metadati non portano ruolo e persona');
  const s = f.st.schedeIam[0];
  deve(s && s.id === r.iam_id && s.ruolo === 'operatore' && s.attivo === true && s.accesso_iam === true && s.accesso_quoto === false, 'la scheda IAM non nasce come deve: ' + JSON.stringify(s));
  deve(s.creato_da === ADMIN.id && s.nome === 'Anna' && s.cognome === 'Bianchi', 'la scheda non porta chi l\'ha creata o il nome');
  deve(f.st.patchPersona.length === 1 && f.st.patchPersona[0].iam_id === r.iam_id, 'la persona non si aggancia all\'account');
  const g = f.st.linkGenerati[0];
  deve(g && g.type === 'recovery' && g.email === 'anna.bianchi@x.it' && g.redirect_to === 'https://iam.finto/', 'il collegamento non e\' un recovery verso IAM: ' + JSON.stringify(g));
  deve(f.posta.length === 1 && f.posta[0].to === 'anna.bianchi@x.it' && /sb\.finto\/verify/.test(f.posta[0].html), 'la mail non parte o non porta il collegamento');
  return 'utenza → scheda → iam_id → recovery → una mail';
});

prova('la password non la vede nessuno: non e\' nella mail, non e\' nella risposta, e non e\' prevedibile', async () => {
  const f = supabaseFinto();
  const r = await attivaPersona({ personaId: PERSONA, ruolo: 'collaboratore', chi: ADMIN }, f.dip);
  deve(!/PASSWORD-SEGRETA-FINTA/.test(f.posta[0].html) && !/PASSWORD-SEGRETA-FINTA/.test(JSON.stringify(r)), 'la password e\' uscita');
  deve(!/password provvisoria|Password:/i.test(f.posta[0].html), 'la mail parla di una password provvisoria');
  const viste = new Set(); for (let i = 0; i < 500; i++) viste.add(passwordChiusa());
  deve(viste.size === 500 && [...viste][0].length >= 24, 'la password chiusa si ripete o e\' corta');
  return 'mai nella mail, mai nella risposta; 500 estrazioni diverse';
});

prova('chi non e\' amministratore non attiva nessuno, e senza token nemmeno', async () => {
  const f = supabaseFinto();
  for (const [chi, stato] of [[COLLAB, 403], [null, 401], [{ id: 'non-uuid' }, 401]]) {
    let err = null;
    try { await attivaPersona({ personaId: PERSONA, ruolo: 'collaboratore', chi }, f.dip); } catch (e) { err = e; }
    deve(err && err.stato === stato, 'chi=' + JSON.stringify(chi) + ' → ' + (err ? err.stato : 'passa'));
  }
  deve(f.st.utenzeCreate.length === 0 && f.posta.length === 0, 'qualcosa e\' stato creato o spedito lo stesso');
  const legacy = supabaseFinto({ ruoloAdmin: 'top_master' });
  const r = await attivaPersona({ personaId: PERSONA, ruolo: 'collaboratore', chi: ADMIN }, legacy.dip);
  deve(r.iam_id, 'il nome storico top_master non vale come amministratore');
  return '403 al collaboratore, 401 senza token; top_master vale come admin';
});

prova('una persona che ha gia\' un account, o un\'email gia\' di un altro account, ferma tutto e dice cosa fare', async () => {
  let err = null;
  try { await attivaPersona({ personaId: PERSONA, ruolo: 'collaboratore', chi: ADMIN }, supabaseFinto({ iamIdPersona: 'gia-c-e' }).dip); } catch (e) { err = e; }
  deve(err && err.stato === 409 && /già un account/.test(err.message), 'persona con iam_id: ' + (err && err.message));
  err = null;
  const f = supabaseFinto({ omonimo: true });
  try { await attivaPersona({ personaId: PERSONA, ruolo: 'collaboratore', chi: ADMIN }, f.dip); } catch (e) { err = e; }
  deve(err && err.stato === 409 && /non agganciato/.test(err.message), 'email di un altro account: ' + (err && err.message));
  deve(f.st.utenzeCreate.length === 0 && f.posta.length === 0, 'con l\'omonimo ha creato o spedito qualcosa');
  err = null;
  try { await attivaPersona({ personaId: PERSONA, ruolo: 'collaboratore', chi: ADMIN }, supabaseFinto({ emailPersona: '' }).dip); } catch (e) { err = e; }
  deve(err && err.stato === 400 && /email/.test(err.message), 'senza email: ' + (err && err.message));
  return '409 con iam_id, 409 con omonimo, 400 senza email';
});

prova('se l\'indirizzo ha gia\' un\'utenza di accesso ma nessuna scheda IAM, si riusa senza toccarle la password', async () => {
  const f = supabaseFinto({ emailGiaRegistrata: true });
  const r = await attivaPersona({ personaId: PERSONA, ruolo: 'collaboratore', chi: ADMIN }, f.dip);
  deve(r.riusata === true && r.iam_id === 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'non ha riusato l\'utenza: ' + JSON.stringify(r));
  deve(!f.st.chiamate.some(c => c.method === 'PUT'), 'ha toccato l\'utenza esistente (PUT)');
  deve(f.st.schedeIam[0].id === r.iam_id && f.st.patchPersona[0].iam_id === r.iam_id && f.posta.length === 1, 'scheda, aggancio o mail mancano nel riuso');
  return 'utenza riusata, nessun PUT, scheda e mail come sempre';
});

prova('la mail porta il tasto e il collegamento, e non promette una durata che non conosciamo', () => {
  const h = emailAttivazione({ nome: 'Anna <b>', link: 'https://x/verify?a=1&b=2' });
  deve(/href="https:\/\/x\/verify\?a=1&amp;b=2"/.test(h), 'il collegamento non e\' nel tasto (o non e\' protetto)');
  deve(/Anna &lt;b&gt;/.test(h), 'il nome non e\' protetto');
  deve(/Scegli la password/.test(h) && !/\d+\s*(ore|minuti)/.test(h), 'promette una durata precisa o non dice di scegliere la password');
  return 'tasto, link protetto, nessun numero inventato';
});

console.log('\n══ ATTIVAZIONE ACCESSO ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = await fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nATTIVAZIONE ACCESSO: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
