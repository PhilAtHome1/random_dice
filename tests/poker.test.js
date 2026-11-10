// Ausführen mit: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const P = require('../js/poker.js');

// Hilfsfunktion: Würfel als Beschriftung angeben, z. B. ['9','9','K','K','A']
const idx = (labels) => labels.map((l) => P.FACES.findIndex((f) => f.label === l));
const s = (cat, labels) => P.scoreFor(cat, idx(labels));

test('obere Kategorien zählen Anzahl × Wert', () => {
  assert.strictEqual(s('u0', ['9', '9', '9', 'K', 'A']), 3);
  assert.strictEqual(s('u5', ['A', 'A', '9', 'K', 'A']), 18);
  assert.strictEqual(s('u2', ['9', '10', 'D', 'K', 'A']), 0);
});

test('Paar nimmt das höchste Paar', () => {
  assert.strictEqual(s('pair', ['9', '9', 'K', 'K', 'A']), 10);
  assert.strictEqual(s('pair', ['9', '10', 'B', 'D', 'K']), 0);
});

test('Zwei Paar', () => {
  assert.strictEqual(s('twopair', ['9', '9', 'K', 'K', 'A']), 2 + 10);
  assert.strictEqual(s('twopair', ['D', 'D', 'D', 'A', 'A']), 8 + 12);
  assert.strictEqual(s('twopair', ['D', 'D', 'D', 'D', 'A']), 0);
});

test('Drilling und Vierling', () => {
  assert.strictEqual(s('three', ['K', 'K', 'K', '9', '10']), 5 * 3 + 1 + 2);
  assert.strictEqual(s('three', ['K', 'K', '9', '9', '10']), 0);
  assert.strictEqual(s('four', ['A', 'A', 'A', 'A', '9']), 25);
  assert.strictEqual(s('four', ['A', 'A', 'A', '9', '9']), 0);
});

test('Full House', () => {
  assert.strictEqual(s('fullhouse', ['B', 'B', 'B', '10', '10']), 25);
  assert.strictEqual(s('fullhouse', ['B', 'B', 'B', 'B', 'B']), 0);
  assert.strictEqual(s('fullhouse', ['B', 'B', 'B', '10', '9']), 0);
});

test('Straße', () => {
  assert.strictEqual(s('straight', ['9', '10', 'B', 'D', 'K']), 40);
  assert.strictEqual(s('straight', ['A', 'K', 'D', 'B', '10']), 40);
  assert.strictEqual(s('straight', ['9', '10', 'B', 'D', 'A']), 0);
});

test('Poker und Chance', () => {
  assert.strictEqual(s('poker', ['D', 'D', 'D', 'D', 'D']), 50);
  assert.strictEqual(s('poker', ['D', 'D', 'D', 'D', 'K']), 0);
  assert.strictEqual(s('chance', ['9', '10', 'B', 'D', 'K']), 15);
});

test('Summen und Bonus', () => {
  const scores = { u0: 3, u1: 6, u2: 9, u3: 12, u4: 15, u5: 18, chance: 20 };
  assert.deepStrictEqual(P.totals(scores), { upper: 63, bonus: 35, lower: 20, total: 118 });
  assert.strictEqual(P.totals({ u5: 12 }).bonus, 0);
});
