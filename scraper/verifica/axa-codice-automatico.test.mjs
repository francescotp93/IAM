// ═══════════════════════════════════════════════════════════════════════════
//  AXA — del codice automatico deve restare traccia, e deve dire com'è andata
//
//  PERCHE' ESISTE
//    14/09/2026, 11:22. La sessione AXA scade dopo quasi due giorni. Lo scraper
//    rientra da solo e nel giornale scrive:
//
//      11:22:59  sessione AXA scaduta → re-login automatico (Auth0 + TOTP)…
//      11:23:14  schermata 2FA Guardian raggiunta: attendo il codice dall'utente
//
//    In mezzo, quindici secondi di niente. Eppure il seme in Fonti c'era ed era
//    valido — quel primo messaggio esce SOLO in quel caso — quindi il codice è
//    stato generato e provato davvero. AXA non l'ha accettato, e di quel
//    tentativo non è rimasta una riga da nessuna parte: né nel giornale, né nel
//    messaggio letto in agenzia, che diceva soltanto «apri AXA Guardian e
//    prendi il codice», come se il tentativo non fosse mai avvenuto.
//
//    Costo: si digita il codice a mano, si torna operativi, e il seme sbagliato
//    resta lì. Domani stessa scena, e nessuno capisce perché.
//
//  I DUE GUASTI CHE NON VANNO CONFUSI
//    · il codice ENTRA nel campo e il portale lo RIFIUTA → il seme non è più
//      quello dell'app: va rifatto scansionando il QR;
//    · il codice NON ENTRA proprio nel campo → è cambiata la schermata, e il
//      seme non c'entra niente: rigenerarlo sarebbe fatica per nulla.
//    Scambiarli manda a rigenerare un seme che andava bene — errore già fatto
//    su Allianz il 2 settembre 2026, e già costato una mattinata.
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(RADICE, 'axa/quote-service.mjs'), 'utf8');

const da = src.indexOf("if (c.totpSecret && !semeKo) {", src.indexOf('async function doAccedi'));
const fine = src.indexOf("if (await isLogged()) { await ctx.storageState(", da);
const blocco = (da < 0 || fine < 0) ? '' : src.slice(da, fine);

const esiti = [];
const prova = (n, f) => { try { esiti.push([true, n, f() || '']); } catch (e) { esiti.push([false, n, e.message]); } };
const deve = (c, m) => { if (!c) throw new Error(m); };

prova('il tentativo automatico lascia scritto che è avvenuto', () => {
  deve(blocco, 'non trovo più il ramo del codice automatico: prova da riscrivere, non da cancellare');
  const prima = blocco.slice(0, blocco.indexOf('for (const code of totpCandidates'));
  deve(/log\(/.test(prima),
    'il tentativo parte in silenzio: nel giornale restano quindici secondi di niente e sembra che nessuno abbia provato');
});

prova('«rifiutato» e «non entrato nel campo» sono due messaggi diversi', () => {
  deve(/compilato/.test(blocco),
    'non si distingue se il codice è entrato nel campo: i due guasti finiscono nella stessa frase');
  /* Attenzione: nel sorgente le frasi contengono apostrofi sfuggiti (\'), e un
     ritaglio ingenuo [^']* si ferma lì, tagliando il messaggio a metà. */
  const FRASE = /setState\('attesa_otp', '((?:\\.|[^'\\])*)'/g;
  const messaggi = [...blocco.matchAll(FRASE)].map(m => m[1]);
  deve(messaggi.length >= 2,
    'c\'è ancora un messaggio solo per due guasti diversi: ' + messaggi.length);
  const uniti = messaggi.join(' | ');
  deve(/rifiutat/i.test(uniti), 'nessun messaggio dice che il portale ha RIFIUTATO il codice: ' + uniti);
  deve(/schermata/i.test(uniti), 'nessun messaggio contempla la schermata cambiata: ' + uniti);
});

prova('col codice rifiutato si manda a rifare il seme', () => {
  /* È l'unica cosa che impedisce di ritrovarsi nella stessa scena domani. */
  const rifiuto = [...blocco.matchAll(/setState\('attesa_otp', '((?:\\.|[^'\\])*)'/g)].map(m => m[1]).find(t => /rifiutat/i.test(t)) || '';
  deve(rifiuto, 'il caso «codice rifiutato» non ha un messaggio suo');
  deve(/QR/.test(rifiuto), 'non si dice come si rifà il seme (la scansione del QR): ' + rifiuto);
  deve(/Fonti/.test(rifiuto), 'non si dice dove sta il seme da rifare: ' + rifiuto);
});

prova('con la schermata cambiata NON si manda a toccare il seme', () => {
  /* Il consiglio sbagliato qui costa una mattinata: si rigenera un seme che
     funzionava e il guasto resta. */
  const schermo = [...blocco.matchAll(/setState\('attesa_otp', '((?:\\.|[^'\\])*)'/g)].map(m => m[1]).find(t => /schermata/i.test(t)) || '';
  deve(schermo, 'il caso «il codice non entra nel campo» non ha un messaggio suo');
  deve(/non c'entra|non va toccato/i.test(schermo),
    'non mette in chiaro che il seme non c\'entra: si finisce a rigenerarne uno buono — ' + schermo);
});

prova('quando il seme non c\'è, il messaggio resta quello di prima', () => {
  /* Senza seme non c'è nessun tentativo automatico da raccontare: qui la frase
     giusta è sempre stata «apri l'app e prendi il codice». */
  const senza = src.indexOf('nessun seme salvato in Fonti');
  deve(senza > -1, 'il caso «nessun seme» non si distingue più dagli altri nel giornale');
  deve(/Credenziali OK — apri AXA Guardian/.test(src),
    'è sparito il messaggio del caso normale: chi non ha il seme non sa più cosa fare');
});

prova('il giornale non promette il codice automatico senza aver guardato se c\'è il seme', () => {
  /* QUESTA PROVA NASCE DA UN ERRORE DI LETTURA, il 14/09/2026, e l'errore l'ha
     indotto una riga di giornale. Il preventivatore, trovando la sessione
     scaduta, annunciava SEMPRE «re-login automatico (Auth0 + codice Guardian
     TOTP)…» — anche quando in Fonti un seme non c'era. Chi leggeva il giornale
     concludeva che il codice fosse stato generato e rifiutato dal portale, e
     andava a cercare un guasto nel seme. Il seme non esisteva.
     È la lezione n.1 di FONTI.md applicata al giornale invece che alla
     schermata: un motivo si calcola PRIMA di annunciarlo. */
  deve(!/log\('sessione AXA scaduta → re-login automatico \(Auth0 \+ codice Guardian TOTP\)…'\)/.test(src),
    'l\'annuncio del codice Guardian esce ancora senza aver guardato se il seme esiste: il giornale racconta un tentativo che non avviene');
  const da = src.indexOf("if (portal === 'expired')");
  const blocco = da < 0 ? '' : src.slice(da, da + 1800);
  deve(blocco, 'non trovo più il ramo «sessione scaduta» del preventivatore: prova da riscrivere');
  deve(/motivoSemeNonValido/.test(blocco),
    'prima di annunciare il rientro non si controlla il seme: si promette una cosa non verificata');
  const guarda = blocco.indexOf('motivoSemeNonValido');
  const dice = blocco.indexOf('log(\'sessione AXA scaduta');
  deve(guarda > -1 && dice > -1 && guarda < dice,
    'si annuncia PRIMA di guardare: l\'ordine è quello che rende falsa la riga');
});

prova('«non c\'è il seme» e «il seme non si può usare» restano due frasi diverse', () => {
  /* Sono due rimedi opposti: nel primo caso il seme va salvato, nel secondo c'è
     già e va sostituito. Il messaggio che avevo scritto il 14/09 diceva «nessun
     seme salvato» anche quando il seme c'era — mandando a cercare una cosa che
     era lì. */
  const da = src.indexOf("schermata 2FA Guardian raggiunta");
  const riga = da < 0 ? '' : src.slice(da - 200, da + 320);
  deve(riga, 'non trovo più la riga del 2FA in attesa: prova da riscrivere');
  deve(/c\.totpSecret \?/.test(riga),
    'la riga non distingue il seme assente da quello inutilizzabile: un rimedio su due è sbagliato');
  deve(/nessun seme salvato in Fonti/.test(riga) && /non utilizzabile/.test(riga),
    'manca una delle due frasi: ' + riga.slice(0, 200));
});

prova('un tentativo riuscito continua a dirlo', () => {
  deve(/Login completato ✅ \(codice automatico\)/.test(blocco),
    'il caso felice non si distingue più da un login fatto a mano');
});

const ko = esiti.filter(e => !e[0]);
console.log('\n── AXA · il codice automatico dice com\'è andata ────────────');
for (const [ok, n, d] of esiti) console.log((ok ? '  ✅ ' : '  ❌ ') + n + (d ? ' — ' + d : ''));
console.log(ko.length ? '\n🔴 ' + ko.length + ' prove fallite su ' + esiti.length : '\n🟢 ' + esiti.length + '/' + esiti.length + ' prove superate');
process.exit(ko.length ? 1 : 0);
