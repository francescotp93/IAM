// ═══════════════════════════════════════════════════════════════════════════════
//  RICERCA IN ALTO — deve trovare anche i prodotti, non solo i clienti
//
//  Il difetto: la lente in alto prometteva «cliente, targa, polizza o
//  preventivo» ma cercava SOLO fra le anagrafiche, e solo premendo Invio.
//  Chi scriveva «casa» o «moto» non otteneva niente e la dava per rotta.
//
//  Qui non si guarda che il codice «ci sia»: si fanno girare davvero le
//  funzioni della ricerca in una stanza chiusa e si controlla che cosa
//  restituiscono per le parole che in agenzia si digitano per prime.
//
//  Le due promesse sorvegliate:
//   1. cercare un prodotto lo trova — e trova QUELLO giusto, per primo;
//   2. l'elenco dei prodotti resta uno solo (si legge da MEGA, la stessa
//      fonte del menu verde). Se qualcuno riscrive una seconda lista qui
//      dentro, le due divergono al primo prodotto nuovo e la ricerca
//      comincia a promettere schermate che il menu non ha più.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { RADICE, esiti, deve } from './banco.mjs';

const src = fs.readFileSync(path.join(RADICE, 'withus-one.js'), 'utf8');
const e = esiti('RICERCA IN ALTO — trova anche i prodotti');

/* Ritaglia una dichiarazione dal sorgente: la scocca è un IIFE, le sue
   funzioni non si possono importare da fuori.

   Il taglio va per INDENTAZIONE, non contando le graffe: dentro queste
   funzioni ci sono espressioni regolari che contengono apostrofi e apici
   inversi (/['’`]/g) e commenti italiani pieni di apostrofi («un'altra»).
   Un contatore di graffe li scambia per stringhe aperte e finisce fuori
   strada — è già successo scrivendo questa prova. Tutto ciò che sta nella
   scocca è indentato di due spazi, quindi la riga «  }» a quel livello è
   la fine della dichiarazione, e si legge senza interpretare niente. */
function ritaglia(inizioTesto, chiusura = '\n  }') {
  const i = src.indexOf(inizioTesto);
  deve(i >= 0, 'non trovo «' + inizioTesto + '» in withus-one.js');
  const fine = src.indexOf(chiusura, i);
  deve(fine > i, 'non trovo la fine di «' + inizioTesto + '»');
  return src.slice(i, fine + chiusura.length);
}

/* La stanza chiusa: solo i pezzi della ricerca, niente browser. */
const stanza = vm.createContext({});
vm.runInContext(
  [
    ritaglia('var MEGA = {', '\n  };'),
    ritaglia('function senzaAccenti('),
    ritaglia('var SINONIMI = {', '\n  };'),
    'var INDICE = null;',
    ritaglia('function indiceProdotti('),
    ritaglia('function quanto('),
    ritaglia('function cercaProdotti('),
  ].join('\n'),
  stanza
);

const cerca = (t) => vm.runInContext('cercaProdotti(' + JSON.stringify(t) + ')', stanza);
const primi = (t) => cerca(t).map((r) => r.l);

// ── 1. le parole che si digitano per prime trovano il prodotto giusto ───────
e.prova('cercando un prodotto esce quel prodotto, per primo', () => {
  /* Sinistra: quello che si scrive. Destra: quello che DEVE uscire in cima.
     Sono le parole del lavoro di tutti i giorni, non i titoli del menu:
     nessuno digita «Infortuni famiglia e LTC», si digita «famiglia». */
  const attesi = [
    ['casa', 'Casa'],
    ['moto', 'Moto e ciclomotori'],
    ['scooter', 'Moto e ciclomotori'],
    ['auto', 'Autovetture'],
    ['rca', 'Autovetture'],
    ['targa', 'Autovetture'],
    ['furgone', 'Autocarri'],
    ['cane', 'Animali domestici'],
    ['gatto', 'Animali domestici'],
    ['viaggio', 'Viaggio'],
    ['legale', 'Tutela legale'],
    ['fotovoltaico', 'Fotovoltaico'],
    ['cauzione', 'Cauzioni appalti'],
    ['fideiussione', 'Fideiussioni'],
    ['fonti', 'Stato collegamenti compagnie'],
    /* Le voci nuove dell'albero (15/09/2026): la ricerca deve arrivare alla
       FOGLIA, non alla categoria che la contiene. */
    ['tcm', 'TCM'],
    ['mutuo', 'TCM Mutuo'],
    ['circolazione', 'Infortuni alla circolazione'],
    ['utenze', 'Rimborso utenze'],
    ['terremoto', 'Rischi catastrofali abitazione'],
    ['medici', 'Medici'],
    ['infermiere', 'Sanitario non medico'],
    ['geometra', 'Geometri'],
    ['avvocato', 'Avvocati'],
    ['commercialisti', 'Commercialisti'],
    ['dpo', 'DPO'],
    ['amtrust', 'AMTRUST'],
    ['dentista', 'Dentista Protetto'],
    ['albergo', 'Albergo'],
    ['lido', 'Lidi balneari'],
    ['provvisoria', 'Provvisoria'],
    ['agea', 'Contributi AGEA'],
  ];
  for (const [testo, atteso] of attesi) {
    const r = primi(testo);
    deve(r.length > 0, 'cercando «' + testo + '» non esce niente');
    deve(r[0] === atteso,
      'cercando «' + testo + '» esce «' + r[0] + '» invece di «' + atteso + '»');
  }
  return attesi.length + ' parole, tutte sul prodotto giusto';
});

// ── 2. gli accenti e le maiuscole non cambiano il risultato ────────────────
e.prova('maiuscole e accenti non fanno sparire il prodotto', () => {
  for (const t of ['CASA', 'Casa', 'cAsA']) {
    deve(primi(t)[0] === 'Casa', '«' + t + '» non trova Casa');
  }
  /* «Idoneità finanziaria autotrasportatori» ha l'accento: chi scrive
     «idoneita» senza accento deve arrivarci lo stesso. */
  deve(primi('idoneita')[0] === 'Idoneità finanziaria autotrasportatori', 'l\'accento blocca la ricerca');
});

// ── 3. una lettera sola non apre la fiera dei prodotti ─────────────────────
e.prova('con meno di due lettere non si suggerisce niente', () => {
  /* Con una lettera sola i risultati sarebbero quasi tutti: una tendina
     lunga che copre la pagina mentre stai ancora scrivendo. */
  deve(cerca('c').length === 0, 'una lettera sola apre già i suggerimenti');
  deve(cerca('').length === 0, 'la ricerca vuota suggerisce qualcosa');
  deve(cerca('casa').length > 0, 'con quattro lettere non suggerisce più niente');
});

// ── 3-bis. niente rumore sotto il risultato giusto ─────────────────────────
e.prova('il nome della colonna non trascina dentro tutti i suoi prodotti', () => {
  /* Cercando «casa» uscivano sei righe: Casa, e sotto RC vita privata,
     Tutela legale, Animali, Fotovoltaico e Beni — tutte solo perché
     stanno nella colonna «Casa e patrimonio». Il risultato giusto era il
     primo, ma affogato in cinque righe che non c'entravano. */
  deve(primi('casa').join('|') === 'Casa',
    'cercando «casa» escono anche: ' + primi('casa').slice(1).join(', '));
  deve(primi('moto')[0] === 'Moto e ciclomotori', '«moto» non trova più la moto');
  /* «moto» sta anche dentro «terremoto» (i rischi catastrofali): quelli
     escono per parola loro, e va bene. Quello che NON deve succedere e' che
     la colonna Motor si porti dietro Autovetture e Autocarri. */
  const daMotor = primi('moto').filter(l => ['Autovetture', 'Autocarri'].includes(l));
  deve(daMotor.length === 0,
    'cercando «moto» esce tutta la colonna Motor: ' + primi('moto').join(', '));

  /* Ma una colonna deve restare raggiungibile per nome: «patrimonio» non
     è l'etichetta di nessun prodotto, è solo il nome della colonna — se
     non trascinasse dentro i suoi prodotti non troverebbe niente. */
  const perColonna = primi('patrimonio');
  deve(perColonna.length >= 3,
    'cercando «patrimonio» non si arriva più ai suoi prodotti: ' + perColonna.join(', '));
  deve(perColonna.includes('Casa'), '«patrimonio» non porta più a Casa');
});

// ── 4. mai una tendina più lunga di quello che si legge ────────────────────
e.prova('al massimo sei suggerimenti', () => {
  /* «a» è dentro quasi ogni etichetta: è il caso peggiore. */
  for (const t of ['as', 'ca', 'in', 'ri']) {
    deve(cerca(t).length <= 6, 'cercando «' + t + '» escono ' + cerca(t).length + ' righe');
  }
});

// ── 5. ogni suggerimento sa dove andare ────────────────────────────────────
e.prova('ogni prodotto suggerito porta a una pagina vera', () => {
  const tutti = vm.runInContext('indiceProdotti()', stanza);
  deve(tutti.length >= 70, 'l\'indice ha solo ' + tutti.length + ' prodotti: ne mancano');
  /* Le voci «In arrivo» non hanno una destinazione e NON devono essere
     suggerite: un suggerimento che non apre niente e' una promessa falsa. */
  for (const p of tutti) deve(p.l !== 'RC Attività' && p.l !== 'Cyber', '«' + p.l + '» e\' in arrivo e viene suggerita');
  for (const p of tutti) {
    deve(typeof p.p === 'string' && p.p.length > 0, '«' + p.l + '» non dice quale pagina aprire');
    deve(typeof p.gruppo === 'string' && p.gruppo.length > 0, '«' + p.l + '» non ha un gruppo');
  }
  /* I prodotti che si aprono per chiave devono usare una chiave vera:
     apriProdotto() con una chiave sconosciuta non apre niente e resta
     dov'è — un clic che non fa nulla, senza nessun errore visibile. */
  /* L'elenco e' quello di INTERFACCIA-QUOTO-IAM.md §2.6, lo stesso che
     PRODOTTI_DIRETTI di QUOTO risolve. La prova gemella di la' controlla che
     il codice di QUOTO e il contratto dicano la stessa cosa. */
  const chiavi = ['autovetture', 'motocicli', 'autocarri',
    'tcm', 'tcm_mutuo', 'tl_mydrive', 'tl_myway', 'tl_utenze',
    'imp_catastrofali', 'imp_fotovoltaico', 'albergo', 'lidi',
    'rcp_medici', 'rcp_paramedici', 'rcp_avvocati', 'rcp_nonreg',
    'rcp_tecnici_architetti', 'rcp_tecnici_geometri', 'rcp_tecnici_periti', 'rcp_tecnici_geologi', 'rcp_tecnici_agronomi', 'rcp_tecnici_chimici',
    'rcp_fiscale_commercialisti', 'rcp_fiscale_commercialisti_revisori', 'rcp_fiscale_revisore', 'rcp_fiscale_revisore_sindaco', 'rcp_fiscale_visto_leggero',
    'rcp_varie_informatici', 'rcp_varie_perito_agrario', 'rcp_varie_agenti_immobiliari', 'rcp_varie_amministratori_condominio', 'rcp_varie_mediatori_creditizi', 'rcp_varie_dpo',
    'amt_commercialista_protetto', 'amt_ingegno_protetto', 'amt_professioni_intellettuali', 'amt_pubblico_impiego', 'amt_medico_protetto', 'amt_dentista_protetto', 'amt_farmacista_protetto', 'amt_studi_dentistici', 'amt_poliambulatori', 'amt_residenze_sanitarie', 'amt_farmacie',
    'cauz_provvisoria', 'cauz_definitiva', 'cauz_anticipazione', 'cauz_provvisoria_privati', 'cauz_definitiva_privati',
    'cauz_legge_210', 'cauz_concessione_edilizia', 'cauz_contributi_agea', 'cauz_rimborso_iva', 'cauz_generico', 'cauz_autotrasportatori', 'cauz_ingresso_stranieri', 'cauz_albo_gestori_ambientali'];
  for (const p of tutti) {
    if (p.prod) deve(chiavi.includes(p.prod), '«' + p.l + '» usa la chiave sconosciuta «' + p.prod + '»');
  }
  return tutti.length + ' prodotti, tutti con una destinazione';
});

// ── 6. l'elenco dei prodotti resta uno solo ────────────────────────────────
e.prova('i prodotti si leggono da MEGA, non da una seconda lista', () => {
  const corpo = src.slice(src.indexOf('function indiceProdotti'), src.indexOf('function chiudiRisultati'));
  deve(/MEGA\.cols/.test(corpo) && /MEGA\.foot/.test(corpo),
    'l\'indice non legge più da MEGA: due liste separate divergono al primo prodotto nuovo');
  /* SINONIMI aggiunge parole, non prodotti: ogni chiave deve corrispondere
     a un'etichetta che in MEGA esiste davvero, altrimenti è una riga morta
     che nessuno noterà mai. */
  const etichette = vm.runInContext('indiceProdotti().map(function(p){return p.l;})', stanza);
  const sin = vm.runInContext('Object.keys(SINONIMI)', stanza);
  for (const k of sin) {
    deve(etichette.includes(k), 'SINONIMI ha «' + k + '» che nel menu non esiste');
  }
  return sin.length + ' voci di sinonimi, tutte agganciate a un prodotto';
});

// ── 7. la ricerca clienti non è stata barattata con i prodotti ─────────────
e.prova('la ricerca fra i clienti resta sempre disponibile', () => {
  const corpo = src.slice(src.indexOf('function collegaRicerca'), src.indexOf('function costruisciBarra3'));
  deve(/tipo:\s*'clienti'/.test(corpo), 'la riga «cerca fra i clienti» non c\'è più');
  deve(/aprireQuoto\('anagrafiche'/.test(corpo), 'non apre più l\'elenco clienti');
  /* Invio a tendina chiusa deve continuare a cercare fra i clienti: era il
     comportamento di prima, e chi incolla un nome e preme Invio di fretta
     non deve trovarsi altrove. */
  deve(/if\s*\(!aperta\)/.test(corpo), 'Invio a tendina chiusa non ha più la sua strada');
});

// ── 8. quello che la barra promette è quello che fa ────────────────────────
e.prova('la barra cerca i prodotti, e il segnaposto non mente', () => {
  /* Il difetto originale: il segnaposto prometteva quattro cose e ne faceva una.
     §5 ha accorciato l'invito a «Cerca» — generico e onesto: la ricerca fa
     prodotti, clienti e polizze insieme, quindi non deve nominarne solo una
     parte. Il difetto vero da sorvegliare resta che la ricerca FACCIA i prodotti. */
  const seg = (src.match(/id="w1-cerca"[\s\S]{0,260}?placeholder="([^"]*)"/) || [])[1] || '';
  deve(seg.length > 0, 'la barra di ricerca non ha un segnaposto');
  deve(!/^cerca\s+(un\s+)?(client|polizz)/i.test(seg.trim()),
    'il segnaposto promette solo clienti/polizze mentre la ricerca fa anche i prodotti: «' + seg + '»');
  deve(/function collegaRicerca\b/.test(src),
    'la ricerca non è più agganciata al campo (collegaRicerca)');
  const near = src.slice(src.indexOf('id="w1-cerca"') - 60, src.indexOf('id="w1-cerca"') + 200);
  deve(/combobox/.test(near), 'la barra non si annuncia come elenco a chi usa il lettore di schermo');
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
