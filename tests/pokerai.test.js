// Ausführen mit: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const P = require('../js/poker.js');
const AI = require('../js/pokerai.js');

const idx = (labels) => labels.map((l) => P.FACES.findIndex((f) => f.label === l));
const r6 = () => Math.floor(Math.random() * 6);

test('Poker liegen: trägt Poker ein statt weiterzuwürfeln', () => {
  const d = AI.decide(idx(['A', 'A', 'A', 'A', 'A']), 2, {}, 14, 'hard');
  assert.deepStrictEqual(d, { category: 'poker' });
});

test('vier Asse: hält die Asse und würfelt den Rest neu', () => {
  const d = AI.decide(idx(['A', 'A', '9', 'A', 'A']), 2, {}, 14, 'hard');
  assert.deepStrictEqual(d.hold, [true, true, false, true, true]);
});

test('Straße liegt und ist frei: wird eingetragen', () => {
  const d = AI.decide(idx(['9', '10', 'B', 'D', 'K']), 1, {}, 14, 'hard');
  assert.deepStrictEqual(d, { category: 'straight' });
});

test('letzte Runde: nimmt die meisten Punkte', () => {
  const scores = {};
  P.CATEGORIES.forEach((c) => { scores[c.id] = 0; });
  delete scores.chance;
  delete scores.u0;
  const d = AI.decide(idx(['A', 'A', 'K', 'K', 'D']), 0, scores, 1, 'hard');
  assert.deepStrictEqual(d, { category: 'chance' });
});

test('ganze Spiele: nur gültige Züge, beide Stufen', () => {
  for (const level of ['easy', 'hard']) {
    for (let g = 0; g < 5; g++) {
      const scores = {};
      for (let round = 1; round <= 14; round++) {
        let dice = [r6(), r6(), r6(), r6(), r6()];
        let used = 1;
        for (;;) {
          const d = AI.decide(dice, 3 - used, scores, 15 - round, level);
          if (d.category) {
            assert.strictEqual(scores[d.category], undefined, 'Feld schon belegt');
            scores[d.category] = P.scoreFor(d.category, dice);
            break;
          }
          assert.ok(used < 3, 'zu viele Würfe');
          assert.strictEqual(d.hold.length, 5);
          dice = dice.map((x, i) => (d.hold[i] ? x : r6()));
          used++;
        }
      }
      assert.strictEqual(Object.keys(scores).length, 14);
    }
  }
});
