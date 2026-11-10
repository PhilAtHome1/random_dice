// Würfelpoker – Spiellogik und Punktewertung (ohne UI).
// Würfel werden als Index 0–5 gespeichert: 9, 10, Bube, Dame, König, Ass.
// Der Augenwert eines Würfels ist Index + 1 (9 = 1 … Ass = 6).

(function (root) {
  'use strict';

  const FACES = [
    { label: '9', name: 'Neuner', value: 1 },
    { label: '10', name: 'Zehner', value: 2 },
    { label: 'B', name: 'Buben', value: 3 },
    { label: 'D', name: 'Damen', value: 4 },
    { label: 'K', name: 'Könige', value: 5 },
    { label: 'A', name: 'Asse', value: 6 },
  ];

  const UPPER_BONUS_THRESHOLD = 63;
  const UPPER_BONUS = 35;

  function counts(dice) {
    const c = [0, 0, 0, 0, 0, 0];
    dice.forEach((d) => c[d]++);
    return c;
  }

  function sum(dice) {
    return dice.reduce((s, d) => s + d + 1, 0);
  }

  const CATEGORIES = [
    ...FACES.map((f, i) => ({
      id: 'u' + i,
      section: 'upper',
      name: f.name,
      hint: `Summe aller ${f.name} (je ${f.value})`,
      score: (dice) => counts(dice)[i] * (i + 1),
    })),
    {
      id: 'pair',
      section: 'lower',
      name: 'Paar',
      hint: 'Höchstes Paar: Summe der 2 Würfel',
      score: (dice) => {
        const c = counts(dice);
        for (let i = 5; i >= 0; i--) if (c[i] >= 2) return 2 * (i + 1);
        return 0;
      },
    },
    {
      id: 'twopair',
      section: 'lower',
      name: 'Zwei Paar',
      hint: 'Zwei verschiedene Paare: Summe der 4 Würfel',
      score: (dice) => {
        const c = counts(dice);
        const pairs = [];
        for (let i = 5; i >= 0; i--) if (c[i] >= 2) pairs.push(i);
        if (pairs.length < 2) return 0;
        return 2 * (pairs[0] + 1) + 2 * (pairs[1] + 1);
      },
    },
    {
      id: 'three',
      section: 'lower',
      name: 'Drilling',
      hint: '3 gleiche: Summe aller Würfel',
      score: (dice) => (counts(dice).some((n) => n >= 3) ? sum(dice) : 0),
    },
    {
      id: 'fullhouse',
      section: 'lower',
      name: 'Full House',
      hint: '3 gleiche + 2 gleiche: 25 Punkte',
      score: (dice) => {
        const c = counts(dice).filter((n) => n > 0).sort();
        return c.length === 2 && c[0] === 2 && c[1] === 3 ? 25 : 0;
      },
    },
    {
      id: 'straight',
      section: 'lower',
      name: 'Straße',
      hint: '9–K oder 10–A: 40 Punkte',
      score: (dice) => {
        const c = counts(dice);
        const distinct = c.every((n) => n <= 1);
        return distinct && (c[0] === 0 || c[5] === 0) ? 40 : 0;
      },
    },
    {
      id: 'four',
      section: 'lower',
      name: 'Vierling',
      hint: '4 gleiche: Summe aller Würfel',
      score: (dice) => (counts(dice).some((n) => n >= 4) ? sum(dice) : 0),
    },
    {
      id: 'poker',
      section: 'lower',
      name: 'Poker',
      hint: '5 gleiche: 50 Punkte',
      score: (dice) => (counts(dice).some((n) => n === 5) ? 50 : 0),
    },
    {
      id: 'chance',
      section: 'lower',
      name: 'Chance',
      hint: 'Beliebig: Summe aller Würfel',
      score: (dice) => sum(dice),
    },
  ];

  const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

  function totals(scores) {
    let upper = 0;
    let lower = 0;
    for (const cat of CATEGORIES) {
      const v = scores[cat.id];
      if (typeof v !== 'number') continue;
      if (cat.section === 'upper') upper += v;
      else lower += v;
    }
    const bonus = upper >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS : 0;
    return { upper, bonus, lower, total: upper + bonus + lower };
  }

  function scoreFor(catId, dice) {
    return CATEGORY_BY_ID[catId].score(dice);
  }

  const api = {
    FACES,
    CATEGORIES,
    UPPER_BONUS,
    UPPER_BONUS_THRESHOLD,
    scoreFor,
    totals,
    counts,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Poker = api;
})(this);
