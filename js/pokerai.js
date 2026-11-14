// Computergegner für Würfelpoker.
//
// „Schwer“: Für jeden möglichen Satz festgehaltener Würfel wird der Erwartungswert über
// alle möglichen Neuwürfe berechnet (mit den restlichen Würfen, exakt per Rekursion).
// Bewertet wird das Endergebnis mit einer Nutzenfunktion: Punkte des besten freien Feldes
// minus dem, was dieses Feld in einem späteren Zug typischerweise noch bringen würde,
// plus Fortschritt Richtung Bonus. Würfel werden als Multimenge (sortiert) gerechnet –
// es gibt nur 252 verschiedene Würfe mit 5 Würfeln, daher ist das schnell.
//
// „Leicht“: hält die häufigste Karte und trägt einfach die meisten Punkte ein.

(function (root) {
  'use strict';

  const P = typeof module !== 'undefined' && module.exports ? require('./poker.js') : root.Poker;

  // Durchschnittlicher Wert eines Feldes, wenn man es später „normal“ füllt (Opportunitätskosten)
  const COST = {
    u0: 2, u1: 4, u2: 6, u3: 8, u4: 10, u5: 12,
    pair: 8, twopair: 12, three: 10, fullhouse: 9, straight: 10, four: 5, poker: 8, chance: 22,
  };

  // ---------- Multimengen
  const key = (ms) => ms.join('');
  const FACT = [1, 1, 2, 6, 24, 120];

  // Alle Ergebnisse beim Werfen von k Würfeln, als sortierte Multimenge mit Wahrscheinlichkeit
  const OUTCOMES = [];
  for (let k = 0; k <= 5; k++) {
    const list = [];
    const rec = (start, cur) => {
      if (cur.length === k) {
        const c = [0, 0, 0, 0, 0, 0];
        cur.forEach((d) => c[d]++);
        const ways = FACT[k] / c.reduce((m, n) => m * FACT[n], 1);
        list.push({ dice: cur.slice(), p: ways / Math.pow(6, k) });
        return;
      }
      for (let f = start; f < 6; f++) { cur.push(f); rec(f, cur); cur.pop(); }
    };
    rec(0, []);
    OUTCOMES.push(list);
  }

  function merge(a, b) {
    const out = [];
    let i = 0;
    let j = 0;
    while (i < a.length || j < b.length) {
      if (j >= b.length || (i < a.length && a[i] <= b[j])) out.push(a[i++]);
      else out.push(b[j++]);
    }
    return out;
  }

  // Alle 252 möglichen Würfe (5 Würfel) mit Nummer
  const ALL5 = OUTCOMES[5].map((o) => o.dice);
  const ID5 = new Map(ALL5.map((ms, i) => [key(ms), i]));

  // Für jede Multimenge: alle verschiedenen Haltesätze (Teil-Multimengen)
  const holdsCache = new Map();
  function holdsOf(ms) {
    const k = key(ms);
    if (holdsCache.has(k)) return holdsCache.get(k);
    const seen = new Map();
    for (let mask = 0; mask < 32; mask++) {
      const h = ms.filter((_, i) => mask & (1 << i));
      const hk = key(h);
      if (!seen.has(hk)) seen.set(hk, h);
    }
    const list = [...seen.values()];
    holdsCache.set(k, list);
    return list;
  }

  // Für jeden Haltesatz: welche Würfe entstehen mit welcher Wahrscheinlichkeit (fest, einmal berechnet)
  const transCache = new Map();
  function transOf(hold) {
    const k = key(hold);
    let t = transCache.get(k);
    if (!t) {
      const outs = OUTCOMES[5 - hold.length];
      t = { ids: new Int16Array(outs.length), ps: new Float64Array(outs.length) };
      outs.forEach((o, i) => { t.ids[i] = ID5.get(key(merge(hold, o.dice))); t.ps[i] = o.p; });
      transCache.set(k, t);
    }
    return t;
  }

  function expectedOf(hold, values) {
    const t = transOf(hold);
    let ev = 0;
    for (let i = 0; i < t.ids.length; i++) ev += t.ps[i] * values[t.ids[i]];
    return ev;
  }

  // ---------- Bewertung des Endergebnisses eines Zuges
  function makeUtility(scores, roundsLeft) {
    const open = P.CATEGORIES.filter((c) => typeof scores[c.id] !== 'number');
    const t = P.totals(scores);
    // Wie stark zählt die Zukunft? Im letzten Zug gar nicht mehr.
    const w = open.length <= 1 ? 0 : Math.max(0, Math.min(1, (roundsLeft - 1) / (open.length - 1)));
    const upperOpen = open.filter((c) => c.section === 'upper').length;

    return function best(ms) {
      let bestU = -Infinity;
      let bestCat = null;
      for (const c of open) {
        const s = P.scoreFor(c.id, ms);
        let u = s - w * COST[c.id];
        if (c.section === 'upper' && t.upper < P.UPPER_BONUS_THRESHOLD) {
          const v = Number(c.id[1]) + 1;
          if (t.upper + s >= P.UPPER_BONUS_THRESHOLD && (w === 0 || upperOpen === 1 || s >= 3 * v)) {
            u += P.UPPER_BONUS; // Bonus wird mit diesem Eintrag sicher erreicht
          } else {
            u += w * (s - 3 * v) * 0.8; // über/unter „Soll“ von 3 gleichen Karten
          }
        }
        if (u > bestU) { bestU = u; bestCat = c.id; }
      }
      return { u: bestU, cat: bestCat };
    };
  }

  // Wert jedes Wurfs mit r restlichen Würfen (r = 0, 1), als Tabelle über alle 252 Würfe
  function valueTables(utility, r) {
    const v0 = new Float64Array(ALL5.length);
    ALL5.forEach((ms, i) => { v0[i] = utility(ms).u; });
    if (r < 1) return [v0];
    const v1 = new Float64Array(ALL5.length);
    ALL5.forEach((ms, i) => {
      let best = v0[i];
      for (const h of holdsOf(ms)) if (h.length < 5) best = Math.max(best, expectedOf(h, v0));
      v1[i] = best;
    });
    return [v0, v1];
  }

  // Wandelt eine festgehaltene Multimenge in Positionen der aktuellen Würfel um
  function maskFor(dice, hold) {
    const need = [0, 0, 0, 0, 0, 0];
    hold.forEach((d) => need[d]++);
    return dice.map((d) => (need[d] > 0 ? (need[d]--, true) : false));
  }

  // ---------- Öffentliche Entscheidung
  // dice: 5 Werte 0–5, rollsLeft: noch erlaubte Würfe, scores: eigener Zettel,
  // roundsLeft: Runden inkl. der laufenden. Ergebnis: { hold: [bool×5] } oder { category }
  function decide(dice, rollsLeft, scores, roundsLeft, level) {
    if (level === 'easy') return decideEasy(dice, rollsLeft, scores);
    const ms = dice.slice().sort((a, b) => a - b);
    const utility = makeUtility(scores, roundsLeft);
    if (rollsLeft > 0) {
      const tables = valueTables(utility, rollsLeft - 1);
      const after = tables[rollsLeft - 1]; // Wert nach dem nächsten Wurf
      let best = { ev: tables[0][ID5.get(key(ms))], hold: ms }; // aufhören und eintragen
      for (const h of holdsOf(ms)) {
        if (h.length === 5) continue;
        const ev = expectedOf(h, after);
        if (ev > best.ev + 1e-9) best = { ev, hold: h };
      }
      if (best.hold.length < 5) return { hold: maskFor(dice, best.hold) };
    }
    return { category: utility(ms).cat };
  }

  function decideEasy(dice, rollsLeft, scores) {
    const open = P.CATEGORIES.filter((c) => typeof scores[c.id] !== 'number');
    const c = P.counts(dice);
    const fixed = ['poker', 'fullhouse', 'straight'].some(
      (id) => open.some((o) => o.id === id) && P.scoreFor(id, dice) > 0
    );
    if (rollsLeft > 0 && !fixed) {
      let face = 5;
      for (let f = 5; f >= 0; f--) if (c[f] > c[face]) face = f;
      if (c[face] < 5) return { hold: dice.map((d) => d === face) };
    }
    let best = open[0];
    let bestS = -1;
    for (const o of open) {
      const s = P.scoreFor(o.id, dice);
      if (s > bestS) { bestS = s; best = o; }
    }
    return { category: best.id };
  }

  const api = { decide };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PokerAI = api;
})(this);
