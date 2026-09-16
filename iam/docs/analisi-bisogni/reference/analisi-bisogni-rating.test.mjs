import test from 'node:test';
import assert from 'node:assert/strict';
import { calcolaNecessita, calcolaIndiceComplessivo, creaSnapshotRating, VERSIONE_REGOLE } from './analisi-bisogni-rating.mjs';

const oggi = new Date('2026-08-04T12:00:00Z');

function base() {
  return {
    anagrafica: { nascita: '1984-06-14' },
    famiglia: 'figli',
    dipendenzaReddito: 'totale',
    casa: 'mutuo',
    patrimonio: ['prima_casa'],
    coperture: [],
    copertureConfermate: true,
    interessi: []
  };
}

function categoria(dati, chiave) {
  return calcolaNecessita(dati, { dataRiferimento: oggi }).find(n => n.chiave === chiave);
}

test('figli, reddito totale e mutuo senza TCM producono priorità famiglia', () => {
  const r = categoria(base(), 'famiglia');
  assert.equal(r.colore, 'rosso');
  assert.ok(r.punteggio >= 90);
  assert.ok(r.motivi.some(m => m.includes('TCM')));
});

test('TCM presente produce blu da verificare, non verde', () => {
  const dati = base();
  dati.coperture = ['tcm'];
  const r = categoria(dati, 'famiglia');
  assert.equal(r.colore, 'blu');
  assert.equal(r.stato, 'Da verificare');
});

test('mutuo senza polizza casa produce priorità casa', () => {
  const r = categoria(base(), 'casa');
  assert.equal(r.colore, 'rosso');
});

test('polizza casa presente produce blu da verificare', () => {
  const dati = base();
  dati.coperture = ['casa'];
  const r = categoria(dati, 'casa');
  assert.equal(r.colore, 'blu');
});

test('assenza confermata di salute e infortuni produce rosso', () => {
  const r = categoria(base(), 'salute');
  assert.equal(r.colore, 'rosso');
  assert.ok(r.motivi.some(m => m.includes('Non risultano')));
});

test('copertura salute presente produce blu', () => {
  const dati = base();
  dati.coperture = ['salute'];
  const r = categoria(dati, 'salute');
  assert.equal(r.colore, 'blu');
});

test('dati mancanti producono grigio, non verde', () => {
  const risultati = calcolaNecessita({ anagrafica: {}, coperture: [], interessi: [] }, { dataRiferimento: oggi });
  assert.ok(risultati.some(r => r.colore === 'grigio'));
  assert.equal(risultati.find(r => r.chiave === 'famiglia').colore, 'grigio');
});

test('interesse pensione aumenta la previdenza', () => {
  const dati = base();
  dati.interessi = ['pensione'];
  const r = categoria(dati, 'previdenza');
  assert.ok(r.punteggio >= 50);
});

test('impresa aumenta responsabilità e professione', () => {
  const dati = base();
  dati.patrimonio.push('impresa');
  const r = categoria(dati, 'responsabilita');
  assert.ok(r.punteggio >= 65);
});

test('indice complessivo usa 50/30/20', () => {
  const indice = calcolaIndiceComplessivo([
    { punteggio: 100, colore: 'rosso' },
    { punteggio: 50, colore: 'ambra' },
    { punteggio: 0, colore: 'verde' }
  ]);
  assert.equal(indice, 65);
});

test('snapshot contiene versione e bisogno principale', () => {
  const snapshot = creaSnapshotRating(base(), { dataRiferimento: oggi });
  assert.equal(snapshot.versioneRegole, VERSIONE_REGOLE);
  assert.equal(snapshot.bisognoPrincipale, 'famiglia');
  assert.equal(snapshot.generatoIl, oggi.toISOString());
});
