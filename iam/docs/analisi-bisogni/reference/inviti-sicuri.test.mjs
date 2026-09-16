import test from 'node:test';
import assert from 'node:assert/strict';
import { generaTokenInvito, hashTokenInvito, tokenCorrisponde, calcolaScadenza, invitoUtilizzabile } from './inviti-sicuri.mjs';

test('il token contiene entropia sufficiente ed è URL-safe', () => {
  const token = generaTokenInvito();
  assert.ok(token.length >= 43);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
});

test('nel database è possibile conservare un hash SHA-256', () => {
  const token = generaTokenInvito();
  const hash = hashTokenInvito(token);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(tokenCorrisponde(token, hash), true);
  assert.equal(tokenCorrisponde(`${token}x`, hash), false);
});

test('la scadenza viene calcolata in modo deterministico', () => {
  const base = new Date('2026-08-04T12:00:00Z');
  assert.equal(calcolaScadenza(72, base).toISOString(), '2026-08-07T12:00:00.000Z');
});

test('un invito revocato, completato o scaduto non è utilizzabile', () => {
  const ora = new Date('2026-08-04T12:00:00Z');
  assert.equal(invitoUtilizzabile({ scadeIl: '2026-08-05T12:00:00Z' }, ora), true);
  assert.equal(invitoUtilizzabile({ scadeIl: '2026-08-03T12:00:00Z' }, ora), false);
  assert.equal(invitoUtilizzabile({ scadeIl: '2026-08-05T12:00:00Z', revocatoIl: ora.toISOString() }, ora), false);
  assert.equal(invitoUtilizzabile({ scadeIl: '2026-08-05T12:00:00Z', completatoIl: ora.toISOString() }, ora), false);
});
