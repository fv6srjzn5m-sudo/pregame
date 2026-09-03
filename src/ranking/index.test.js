import { test } from 'node:test';
import assert from 'node:assert/strict';
import api from './index.js';

// Smoke-Tests fuer die Punktevergabe-Logik aus computeSessionPoints(). Das ist bewusst
// die einzige echte "Kern-Spiellogik", die aktuell isoliert testbar ist - die eigentlichen
// Minispiel-Regeln (Kniffel, Maexchen, Quiz, ...) stecken im nicht-modularen Inline-Script
// von saufapp.html und lassen sich ohne Extraktion/Refactoring (siehe INFRASTRUCTURE.md,
// Frontend-Foundations) nicht sinnvoll unit-testen. Das hier ist ein Startpunkt, kein
// vollstaendiges Test-Setup.

test('computeSessionPoints: Gast ohne passenden Spieler bekommt nur die Teilnahme-Punkte', () => {
  const event = api.computeSessionPoints({
    gameKey: 'kniffel',
    players: [{ id: 'p1', name: 'Alice', score: 30 }],
    winner: null,
    startSnapshot: [],
    durationSec: 120,
  }, 'bob'); // "bob" spielt nicht mit -> kein Match

  assert.equal(event.points, 5);
  assert.equal(event.won, false);
  assert.equal(event.game_key, 'kniffel');
  assert.match(event.client_event_id, /^ev_/);
});

test('computeSessionPoints: passender Spieler bekommt Teilnahme + Score-Gain', () => {
  const event = api.computeSessionPoints({
    gameKey: 'kniffel',
    players: [{ id: 'p1', name: 'Alice', score: 30 }],
    winner: null,
    startSnapshot: [{ id: 'p1', score: 10 }],
    durationSec: 60,
  }, 'alice'); // case-insensitiver Nickname-Match

  // 5 Teilnahme + min(40, 30-10=20) = 25
  assert.equal(event.points, 25);
  assert.equal(event.won, false);
});

test('computeSessionPoints: Sieg gibt zusaetzlich 20 Punkte', () => {
  const winner = { id: 'p1' };
  const event = api.computeSessionPoints({
    gameKey: 'kniffel',
    players: [{ id: 'p1', name: 'Alice', score: 30 }],
    winner,
    startSnapshot: [{ id: 'p1', score: 10 }],
    durationSec: 60,
  }, 'alice');

  // 5 + 20 (Score-Gain, gecappt bei 40) + 20 (Sieg) = 45
  assert.equal(event.points, 45);
  assert.equal(event.won, true);
});

test('computeSessionPoints: Score-Gain wird bei 40 gecappt, auch bei riesigem Punktesprung', () => {
  // Die Formel ist 5 (Teilnahme) + min(40, scoreGain) + 20 (Sieg) = maximal 65.
  // Der Math.min(80, ...)-Clamp im Code ist damit aktuell nur defensiv/zukunftssicher -
  // mit den heutigen Konstanten ist 80 rechnerisch gar nicht erreichbar. Das ist kein Bug,
  // aber wichtig zu wissen, falls die Konstanten spaeter angepasst werden.
  const winner = { id: 'p1' };
  const event = api.computeSessionPoints({
    gameKey: 'kniffel',
    players: [{ id: 'p1', name: 'Alice', score: 1000 }],
    winner,
    startSnapshot: [{ id: 'p1', score: 0 }],
    durationSec: 60,
  }, 'alice');

  assert.equal(event.points, 65);
  assert.equal(event.won, true);
});

test('yearMonthBerlin: liefert YYYY-MM im Europe/Berlin-Zeitraum', () => {
  const result = api.yearMonthBerlin(new Date('2026-01-15T23:30:00Z'));
  // 23:30 UTC im Januar ist in Berlin (UTC+1) schon der naechste Tag, aber noch derselbe Monat
  assert.match(result, /^\d{4}-\d{2}$/);
  assert.equal(result, '2026-01');
});
