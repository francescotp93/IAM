// ═══════════════════════════════════════════════════════════════════════════════
//  Banco di prova dell'impianto — «nessuna compagnia puo' restare indietro»
//
//  PERCHE' ESISTE
//    Il 14 agosto 2026 tre scraper su dieci giravano male senza che nessuno lo
//    sapesse, per due errori muti nell'impianto:
//
//    1) deploy/bootstrap.sh teneva l'elenco delle compagnie scritto a mano
//       (SCRAPERS="italiana hdi groupama moto axa"). Chi ne aggiungeva una
//       aggiornava le cartelle e dimenticava questa riga: quello scraper partiva
//       lo stesso, ma senza la chiave di cifratura del Pannello Fonti, e rispondeva
//       «non ho credenziali» pur avendole. Nessun errore, nessun log: solo una
//       compagnia che non quota.
//
//    2) quotiamo-scraper.service leggeva EnvironmentFile=-/opt/withus-backend/.env,
//       un file che non esiste (quello vero e' server/.env). Il prefisso «-» dice a
//       systemd di tirare dritto in silenzio se il file manca.
//
//    Queste prove non guardano il codice che gira: guardano l'impianto che lo
//    accende. Sono le due cose che nessuno rilegge mai.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bootstrap = fs.readFileSync(path.join(RADICE, 'deploy/bootstrap.sh'), 'utf8');

// Le compagnie vere: una cartella sotto scraper/ con un file <nome>-scraper.service.
const compagnie = fs.readdirSync(path.join(RADICE, 'scraper'))
  .filter(c => !c.startsWith('_'))
  .map(c => ({ c, dep: path.join(RADICE, 'scraper', c, 'deploy') }))
  .filter(x => fs.existsSync(x.dep) && fs.readdirSync(x.dep).some(f => f === x.c + '-scraper.service'))
  .map(x => x.c)
  .sort();

const prove = {};

// ── 1) L'elenco non e' scritto a mano ─────────────────────────────────────────
const rigaElenco = (bootstrap.match(/^SCRAPERS=.*$/m) || [''])[0];
prove['l\'elenco degli scraper non e\' una lista scritta a mano'] =
  !/^SCRAPERS="[a-z0-9 _-]+"/.test(rigaElenco.trim());
prove['l\'elenco si ricava dalle cartelle'] =
  /SCRAPERS=\$\([\s\S]{0,200}scraper\/\*\/deploy/.test(bootstrap);

// ── 2) Ogni compagnia riceve la chiave di cifratura ───────────────────────────
// Il ciclo che scrive i drop-in deve girare su TUTTO l'elenco, senza aggiunte a mano
// (era «for c in $SCRAPERS prima allianz», il segno che l'elenco era incompleto).
const cicloChiave = (bootstrap.match(/^for c in \$SCRAPERS[^;]*; do$/m) || [''])[0];
prove['il ciclo della chiave non ha compagnie aggiunte a mano'] =
  /^for c in \$SCRAPERS\s*;\s*do$/.test(cicloChiave.trim());

// ── 3) Nessun file di servizio punta a un .env che non esiste ─────────────────
// L'unico file d'ambiente del server e' server/.env. Chi ne indica un altro sta
// scrivendo un errore che systemd non segnalera' mai.
const ENV_BUONO = '/opt/withus-backend/server/.env';
const sbagliati = [];
for (const c of compagnie) {
  const f = path.join(RADICE, 'scraper', c, 'deploy', c + '-scraper.service');
  for (const riga of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = riga.match(/^EnvironmentFile=-?(.+)$/);
    if (m && m[1].trim() !== ENV_BUONO) sbagliati.push(c + ' → ' + m[1].trim());
  }
}
prove['nessun servizio legge un file d\'ambiente inesistente'] = sbagliati.length === 0;

// ── 3-bis) La guardia che riaccende gli scraper deve coprire anche i servizi di casa ──
// Il 1 settembre 2026 il backend e il canale comandi non rispondevano piu' e non c'era
// modo di saperlo da fuori: la guardia di autopull riaccendeva SOLO gli scraper. Un
// backend caduto restava caduto, e il canale con cui si guarda dentro la macchina —
// l'unico — restava muto proprio quando serviva. Adesso la guardia copre anche loro.
const autopull = fs.readFileSync(path.join(RADICE, 'deploy/autopull.sh'), 'utf8');
const guardia = (autopull.match(/SERVIZI DI CASA[\s\S]*?\ndone\n/) || [''])[0];
prove['la guardia copre anche il backend'] = /withus-backend\.service/.test(guardia);
prove['la guardia copre anche il canale comandi'] = /cmd-runner\.timer/.test(guardia);
prove['la guardia li riaccende, non solo li guarda'] =
  /systemctl start/.test(guardia) && /systemctl enable/.test(guardia);

/* ── 3-bis) UN RILASCIO DEVE ARRIVARE DAVVERO IN PRODUZIONE ───────────────────
   Fino al 2 settembre 2026 autopull riavviava il backend e — con una riga
   scritta a mano — la sola ITALIANA. Le altre nove compagnie non ripartivano
   mai: `git pull` aggiornava i file su disco e il processo continuava a girare
   con il codice vecchio in memoria, all'infinito.

   Quel giorno due correzioni ad Allianz e Groupama sono state scritte, provate,
   unite e "rilasciate" — e sul server non e' cambiato niente. Si e' creduto di
   aver riparato, e si e' andati a cercare il guasto da un'altra parte.

   Un elenco scritto a mano e' sempre lo stesso errore: qui si pretende la
   REGOLA, non il nome di una compagnia. */
const rilancio = (autopull.match(/OGNI SCRAPER RIPARTE[\s\S]*?\ndone\n/) || [''])[0];
prove['ogni scraper riparte quando cambia il SUO codice'] =
  /systemctl restart "\$\{comp\}-scraper"/.test(rilancio) && /scraper\/\$\{comp\}\//.test(rilancio);
/* Il nome di una compagnia puo' comparire nel racconto del perche'; quello che
   non deve tornare e' un riavvio scritto a mano per UNA sola. Si guarda il
   codice, non i commenti. */
const codiceRilancio = rilancio.split('\n').filter(r => !/^\s*#/.test(r)).join('\n');
prove['la regola vale per tutte, non per una scritta a mano'] =
  !!rilancio && /for d in scraper\/\*\//.test(codiceRilancio) &&
  !compagnie.some(c => new RegExp(c + '-scraper').test(codiceRilancio));
prove['non riavvia chi non e\' cambiato'] = /if echo "\$CHANGED" \| grep -q/.test(rilancio);
prove['se il riavvio fallisce lo dice invece di tacere'] = /gira ancora il codice vecchio/.test(rilancio);
prove['nessuna compagnia resta fuori dal rilancio'] =
  compagnie.every(c => !new RegExp('restart ' + c + '-scraper').test(autopull.replace(rilancio, '')));

// ── 4) L'impianto ricostruisce la macchina sul ramo giusto ────────────────────
prove['bootstrap punta al ramo main'] = /^BR=main\b/m.test(bootstrap);

// ── 5) La chiave non sta scritta nel repository ───────────────────────────────
prove['la chiave di cifratura non e\' scritta nel file'] =
  /^SECRET="\$\{FONTI_SECRET:-/m.test(bootstrap);

// ── 6) Il repository si chiama IAM (16/09/2026): l'impianto non usa il nome vecchio ─
//    GitHub rimanda da QUOTE a IAM finche' nessuno crea un repository con il nome
//    vecchio. Un impianto che funziona per via di un redirect non e' un impianto:
//    tutto cio' che clona o fa fetch deve nominare francescotp93/IAM.
const NOME_VECCHIO = /francescotp93\/QUOTE(\.git)?\b/;
const cmdRunner = fs.readFileSync(path.join(RADICE, 'deploy/cmd-runner.sh'), 'utf8');
const setupServer = fs.readFileSync(path.join(RADICE, 'server/deploy/setup.sh'), 'utf8');
const codiceSenzaCommenti = t => t.split('\n').filter(r => !/^\s*#/.test(r)).join('\n');
prove['bootstrap clona francescotp93/IAM, non il nome vecchio'] =
  /github\.com\/francescotp93\/IAM\.git/.test(bootstrap) && !NOME_VECCHIO.test(codiceSenzaCommenti(bootstrap));
prove['il canale comandi legge il ramo claude-cmd da francescotp93/IAM'] =
  /^REPO_PATH=francescotp93\/IAM\b/m.test(cmdRunner) && !NOME_VECCHIO.test(codiceSenzaCommenti(cmdRunner).replace(/#.*$/gm, ''));
prove['setup.sh del server clona francescotp93/IAM'] =
  /^REPO=https:\/\/github\.com\/francescotp93\/IAM\.git$/m.test(setupServer) && !NOME_VECCHIO.test(codiceSenzaCommenti(setupServer));

//    Sul VPS i cloni esistono gia' con il remoto vecchio: li sposta uno script
//    d'impianto una-tantum, che deve (a) accertarsi che il nome nuovo risponda
//    PRIMA di toccare i remoti, (b) toccare tutti e due i cloni, (c) togliere il
//    secondo clone /opt/withus-iam solo se Caddy non lo usa e non ha modifiche
//    locali, (d) uscire con 1 quando non ha finito, cosi' l'autopull ritenta.
const rinominaPath = path.join(RADICE, 'deploy/setup.d/30-rinomina-repo-iam.sh');
const rinomina = fs.existsSync(rinominaPath) ? fs.readFileSync(rinominaPath, 'utf8') : '';
const rinominaCodice = codiceSenzaCommenti(rinomina);
const posLsRemote = rinominaCodice.search(/git ls-remote[^\n]*francescotp93\/IAM|git ls-remote[^\n]*"\$NUOVO"/);
const posSetUrl = rinominaCodice.indexOf('remote set-url origin');
prove['c\'e\' lo script d\'impianto che sposta i remoti sul nome nuovo'] = !!rinomina;
prove['lo script controlla che IAM risponda prima di toccare i remoti'] =
  posLsRemote >= 0 && posSetUrl > posLsRemote && /ls-remote[^\n]*\n[^\n]*\n[^\n]*exit 1/.test(rinominaCodice.slice(posLsRemote));
prove['lo script tocca il clone del deploy e quello del canale comandi'] =
  /\/opt\/withus-backend/.test(rinominaCodice) && /\/opt\/withus-cmd/.test(rinominaCodice);
prove['lo script toglie /opt/withus-iam solo se Caddy non lo usa e non ha modifiche locali'] =
  /rm -rf "\$VECCHIO"/.test(rinominaCodice) && /^VECCHIO=\/opt\/withus-iam$/m.test(rinominaCodice) &&
  /127\.0\.0\.1:2019\/config\/[^\n]*\|\s*grep -q "\$VECCHIO"/.test(rinominaCodice) &&
  /status --porcelain/.test(rinominaCodice) &&
  rinominaCodice.indexOf('2019/config/') < rinominaCodice.indexOf('rm -rf "$VECCHIO"') &&
  rinominaCodice.indexOf('status --porcelain') < rinominaCodice.indexOf('rm -rf "$VECCHIO"');
prove['lo script esce con 1 quando non ha finito, cosi\' l\'autopull ritenta'] =
  (rinominaCodice.match(/exit 1/g) || []).length >= 4 && /^exit 0$/m.test(rinominaCodice);

console.log('\ncompagnie trovate (' + compagnie.length + '):', compagnie.join(', '));
if (sbagliati.length) console.log('file d\'ambiente sbagliati:', sbagliati.join(' | '));
console.log('riga elenco:', rigaElenco.trim().slice(0, 100));

console.log('\n══ ESITI ══');
let ko = 0;
for (const [k, v] of Object.entries(prove)) { console.log((v ? '  ✅ ' : '  ❌ ') + k); if (!v) ko++; }
console.log(ko ? '\n' + ko + ' prove non reggono.' : '\nTutto regge.');
process.exit(ko ? 1 : 0);
