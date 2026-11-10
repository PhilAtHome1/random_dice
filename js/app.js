/* Würfelbox – UI für Würfel, Würfelpoker und Glücksrad */
(function () {
  'use strict';

  // ---------------------------------------------------------------- Helfer
  const $ = (id) => document.getElementById(id);

  // Fairer Zufall über crypto (ohne Modulo-Verzerrung)
  function randInt(n) {
    const max = Math.floor(0x100000000 / n) * n;
    const buf = new Uint32Array(1);
    let x;
    do {
      crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= max);
    return x % n;
  }

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem('wuerfelbox.' + key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem('wuerfelbox.' + key, JSON.stringify(value));
      } catch (e) { /* z. B. privater Modus – dann eben ohne Speichern */ }
    },
  };

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v);
      }
    }
    (children || []).forEach((c) => c && node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return node;
  }

  function showOverlay(text, actions) {
    $('overlay-text').textContent = text;
    const box = $('overlay-actions');
    box.innerHTML = '';
    actions.forEach((a) => {
      box.appendChild(el('button', {
        class: a.cls || 'primary',
        text: a.label,
        onclick: () => { hideOverlay(); a.onClick && a.onClick(); },
      }));
    });
    $('overlay').hidden = false;
  }
  function hideOverlay() { $('overlay').hidden = true; }

  // ---------------------------------------------------------------- Tabs
  const tabs = document.querySelectorAll('.tabbar button');
  function showView(id) {
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === id));
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.view === id));
    store.set('tab', id);
    window.scrollTo(0, 0);
    if (id === 'view-wheel') Wheel.draw();
    if (id === 'view-poker') PokerUI.render();
  }
  tabs.forEach((t) => t.addEventListener('click', () => showView(t.dataset.view)));

  // ================================================================ WÜRFEL
  const DiceUI = (() => {
    const D3 = window.Dice3D;
    const state = Object.assign({ sides: 6, count: 1, history: [], last: [] }, store.get('dice', {}));
    let rolling = false;
    let nodes = [];

    function save() { store.set('dice', state); }

    function renderTypes() {
      document.querySelectorAll('#die-types .chip').forEach((c) => {
        const active = Number(c.dataset.sides) === state.sides;
        c.classList.toggle('active', active);
        c.setAttribute('aria-checked', active);
      });
      $('die-count').textContent = state.count;
    }

    const PIP_FACES = [1, 2, 3, 4, 5, 6].map((n) => D3.pipFace(n));

    // Baut die Würfel neu auf (nur bei Wechsel von Typ oder Anzahl)
    function buildStage() {
      const stage = $('dice-stage');
      stage.innerHTML = '';
      stage.dataset.n = state.count;
      nodes = [];
      for (let i = 0; i < state.count; i++) {
        const v = state.last[i];
        let wrap;
        if (state.sides === 6) {
          wrap = D3.createCube(PIP_FACES, 'pipface');
          D3.setCube(wrap, v ? v - 1 : randInt(6), false);
        } else {
          wrap = el('div', { class: 'cube-wrap flat' }, [
            el('div', { class: 'cube-shadow' }),
            el('div', { class: 'cube-hop' }, [el('div', { class: `die d${state.sides}`, text: v ? String(v) : '?' })]),
          ]);
        }
        nodes.push(wrap);
        stage.appendChild(wrap);
      }
      renderSum();
    }

    function renderSum() {
      const v = state.last;
      if (v.length === state.count && state.count > 1) {
        $('dice-sum').textContent = 'Summe: ' + v.reduce((a, b) => a + b, 0);
      } else {
        $('dice-sum').innerHTML = '&nbsp;';
      }
    }

    function changeSetup(fn) {
      if (rolling) return;
      fn();
      state.last = [];
      save();
      renderTypes();
      buildStage();
    }

    function renderHistory() {
      const list = $('dice-history');
      list.innerHTML = '';
      if (!state.history.length) {
        list.appendChild(el('li', {}, ['Noch nicht gewürfelt']));
        return;
      }
      state.history.forEach((h) => {
        const label = (h.v.length > 1 ? h.v.length + '× ' : '') + 'W' + h.s;
        const detail = h.v.length > 1 ? h.v.join(' + ') + ' = ' : '';
        list.appendChild(el('li', {}, [
          el('span', { text: label }),
          el('span', {}, [detail, el('b', { text: String(h.v.reduce((a, b) => a + b, 0)) })]),
        ]));
      });
    }

    function roll() {
      if (rolling) return;
      rolling = true;
      $('roll-dice').disabled = true;
      const sides = state.sides;
      const final = Array.from({ length: state.count }, () => randInt(sides) + 1);
      $('dice-sum').innerHTML = '&nbsp;';
      const STAGGER = 80;
      nodes.forEach((wrap, i) => {
        const delay = i * STAGGER;
        D3.toss(wrap, delay);
        if (sides === 6) {
          D3.setCube(wrap, final[i] - 1, true, delay);
        } else {
          const face = wrap.querySelector('.die');
          D3.tumble(face, delay);
          setTimeout(() => D3.flicker(D3.TOSS_MS, () => { face.textContent = randInt(sides) + 1; }), delay);
          setTimeout(() => { face.textContent = final[i]; }, delay + D3.TOSS_MS * 0.8 + 5);
        }
      });
      setTimeout(() => {
        state.last = final;
        state.history.unshift({ s: sides, v: final });
        state.history = state.history.slice(0, 15);
        save();
        renderSum();
        renderHistory();
        rolling = false;
        $('roll-dice').disabled = false;
      }, D3.TOSS_MS + (nodes.length - 1) * STAGGER);
    }

    function init() {
      document.querySelectorAll('#die-types .chip').forEach((c) => {
        c.addEventListener('click', () => changeSetup(() => { state.sides = Number(c.dataset.sides); }));
      });
      $('die-count-minus').addEventListener('click', () => {
        if (state.count > 1) changeSetup(() => { state.count--; });
      });
      $('die-count-plus').addEventListener('click', () => {
        if (state.count < 6) changeSetup(() => { state.count++; });
      });
      $('roll-dice').addEventListener('click', roll);
      $('dice-stage').addEventListener('click', roll);
      renderTypes();
      buildStage();
      renderHistory();
    }

    return { init };
  })();

  // ================================================================ POKER
  const PokerUI = (() => {
    const P = window.Poker;
    const MAX_ROUNDS = P.CATEGORIES.length;
    const D3 = window.Dice3D;
    const SINGULAR = ['Neun', 'Zehn', 'Bube', 'Dame', 'König', 'Ass'];
    let cubes = [];

    const defaults = {
      phase: 'setup',
      setup: { names: ['Spieler 1', 'Spieler 2'], rounds: MAX_ROUNDS },
    };
    let s = Object.assign({}, defaults, store.get('poker', {}));
    let selected = null;
    let animating = false;

    function save() { store.set('poker', s); }

    // ---------- Setup
    function renderSetup() {
      const names = s.setup.names;
      $('players-count').textContent = names.length;
      $('rounds-count').textContent = s.setup.rounds;
      const box = $('player-names');
      box.innerHTML = '';
      names.forEach((n, i) => {
        const input = el('input', {
          type: 'text', value: n, maxlength: '16', 'aria-label': `Name Spieler ${i + 1}`,
          autocomplete: 'off', enterkeyhint: 'done',
        });
        input.addEventListener('input', () => { s.setup.names[i] = input.value; save(); });
        input.addEventListener('focus', () => input.select());
        box.appendChild(input);
      });
    }

    function startGame(names, rounds) {
      s = {
        phase: 'game',
        setup: s.setup,
        rounds,
        round: 1,
        current: 0,
        players: names.map((n, i) => ({ name: (n || '').trim() || `Spieler ${i + 1}`, scores: {} })),
      };
      resetTurn();
      save();
      render();
      announceTurn();
    }

    function resetTurn() {
      s.dice = [null, null, null, null, null];
      s.held = [false, false, false, false, false];
      s.rollsUsed = 0;
      selected = null;
    }

    function announceTurn() {
      if (s.players.length > 1) {
        showOverlay(`${s.players[s.current].name} ist dran`, [{ label: 'Los geht\'s' }]);
      }
    }

    // ---------- Spiel
    function roll() {
      if (animating || s.rollsUsed >= 3) return;
      animating = true;
      if (s.rollsUsed === 0) s.held = [false, false, false, false, false];
      const final = s.dice.map((d, i) => (s.held[i] && d != null ? d : randInt(6)));
      selected = null;
      $('commit-bar').hidden = true;
      $('poker-roll').disabled = true;
      renderScorecard();
      const STAGGER = 70;
      let k = 0;
      cubes.forEach((wrap, i) => {
        if (s.held[i] && s.dice[i] != null) return;
        const delay = k++ * STAGGER;
        wrap.classList.remove('idle');
        D3.toss(wrap, delay);
        D3.setCube(wrap, final[i], true, delay);
      });
      setTimeout(() => {
        s.dice = final;
        s.rollsUsed++;
        animating = false;
        save();
        renderGame();
      }, D3.TOSS_MS + (k - 1) * STAGGER);
    }

    function toggleHold(i) {
      if (animating || s.rollsUsed === 0 || s.rollsUsed >= 3) return;
      s.held[i] = !s.held[i];
      save();
      renderDice();
      renderHint();
    }

    function commit() {
      if (!selected || s.rollsUsed === 0) return;
      const player = s.players[s.current];
      player.scores[selected] = P.scoreFor(selected, s.dice);
      s.current++;
      if (s.current >= s.players.length) {
        s.current = 0;
        s.round++;
      }
      resetTurn();
      if (s.round > s.rounds) {
        s.phase = 'result';
        save();
        render();
        return;
      }
      save();
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      announceTurn();
    }

    function buildCubes() {
      const box = $('poker-dice');
      box.innerHTML = '';
      cubes = [0, 1, 2, 3, 4].map((i) => {
        const wrap = D3.createCube(D3.POKER_FACES, 'cardface');
        D3.setCube(wrap, randInt(6), false);
        wrap.setAttribute('role', 'button');
        wrap.addEventListener('click', () => toggleHold(i));
        box.appendChild(wrap);
        return wrap;
      });
    }

    function sizeCubes() {
      const box = $('poker-dice');
      const w = box.clientWidth;
      if (!w) return;
      box.style.setProperty('--size', Math.min(84, Math.floor((w - 4 * 10) / 5)) + 'px');
    }

    function renderDice() {
      sizeCubes();
      s.dice.forEach((d, i) => {
        const wrap = cubes[i];
        wrap.classList.toggle('idle', d == null);
        wrap.classList.toggle('held', !!s.held[i] && s.rollsUsed > 0);
        if (d != null && wrap._value !== d) D3.setCube(wrap, d, false);
        wrap.setAttribute('aria-label', d == null ? 'Noch nicht gewürfelt' : SINGULAR[d] + (s.held[i] ? ', gehalten' : ''));
      });
    }

    function renderHint() {
      const left = 3 - s.rollsUsed;
      const hint = $('hold-hint');
      if (s.rollsUsed === 0) hint.textContent = 'Würfle, um deinen Zug zu beginnen.';
      else if (left > 0) hint.textContent = 'Tippe Würfel zum Festhalten · oder wähle unten ein Feld.';
      else hint.textContent = 'Keine Würfe mehr – wähle unten ein Feld.';
      const btn = $('poker-roll');
      btn.disabled = left === 0;
      btn.textContent = left === 0 ? 'Keine Würfe mehr' : s.rollsUsed === 0 ? 'Würfeln' : `Nochmal würfeln (${left} übrig)`;
    }

    function renderStandings() {
      const box = $('standings');
      box.innerHTML = '';
      s.players.forEach((p, i) => {
        box.appendChild(el('span', {
          class: 'pill' + (i === s.current ? ' current' : ''),
          text: `${p.name}: ${P.totals(p.scores).total}`,
        }));
      });
    }

    function renderScorecard() {
      const list = $('scorecard');
      list.innerHTML = '';
      const player = s.players[s.current];
      const rolled = s.rollsUsed > 0;
      const t = P.totals(player.scores);

      const addTitle = (txt) => list.appendChild(el('li', { class: 'section-title', text: txt }));
      const addSummary = (txt, val) => list.appendChild(el('li', { class: 'row summary' }, [
        el('span', { text: txt }), el('span', { class: 'val', text: val }),
      ]));

      let lastSection = null;
      P.CATEGORIES.forEach((cat) => {
        if (cat.section !== lastSection) {
          if (lastSection === 'upper') {
            addSummary(`Oben: ${t.upper} / ${P.UPPER_BONUS_THRESHOLD}`, t.bonus ? `+${t.bonus}` : 'Bonus –');
          }
          addTitle(cat.section === 'upper' ? 'Oberer Teil' : 'Unterer Teil');
          lastSection = cat.section;
        }
        const used = typeof player.scores[cat.id] === 'number';
        let val = '';
        const cls = ['row'];
        if (used) {
          cls.push('used');
          val = String(player.scores[cat.id]);
        } else if (rolled) {
          const pts = P.scoreFor(cat.id, s.dice);
          cls.push('open');
          if (pts === 0) cls.push('zero');
          val = String(pts);
        }
        if (selected === cat.id) cls.push('selected');
        const li = el('li', { class: cls.join(' ') }, [
          el('span', { class: 'name' }, [cat.name, el('span', { class: 'desc', text: cat.hint })]),
          el('span', { class: 'val', text: val }),
        ]);
        if (!used && rolled) {
          li.setAttribute('role', 'button');
          li.addEventListener('click', () => {
            selected = selected === cat.id ? null : cat.id;
            renderScorecard();
            renderCommit();
          });
        }
        list.appendChild(li);
      });
      addSummary('Gesamt', String(t.total));
    }

    function renderCommit() {
      const bar = $('commit-bar');
      if (!selected || s.rollsUsed === 0) { bar.hidden = true; return; }
      const cat = P.CATEGORIES.find((c) => c.id === selected);
      const pts = P.scoreFor(selected, s.dice);
      $('commit-btn').textContent = pts === 0 ? `${cat.name} streichen (0)` : `${cat.name} eintragen (+${pts})`;
      bar.hidden = false;
    }

    function renderGame() {
      $('turn-round').textContent = `Runde ${s.round} von ${s.rounds}`;
      $('turn-player').textContent = s.players[s.current].name;
      renderStandings();
      renderDice();
      renderHint();
      renderScorecard();
      renderCommit();
    }

    // ---------- Ergebnis
    function renderResult() {
      const ranked = s.players
        .map((p) => ({ name: p.name, t: P.totals(p.scores) }))
        .sort((a, b) => b.t.total - a.t.total);
      const best = ranked[0].t.total;
      const winners = ranked.filter((r) => r.t.total === best).map((r) => r.name);

      const w = $('winner');
      w.innerHTML = '';
      w.appendChild(el('div', { class: 'trophy', text: '🏆' }));
      if (s.players.length === 1) {
        w.appendChild(el('h2', { text: `${best} Punkte` }));
        w.appendChild(el('p', { text: s.players[0].name }));
      } else if (winners.length > 1) {
        w.appendChild(el('h2', { text: 'Unentschieden!' }));
        w.appendChild(el('p', { text: `${winners.join(' & ')} mit ${best} Punkten` }));
      } else {
        w.appendChild(el('h2', { text: `${winners[0]} gewinnt!` }));
        w.appendChild(el('p', {
          text: ranked.map((r, i) => `${i + 1}. ${r.name} (${r.t.total})`).join(' · '),
        }));
      }

      const table = $('result-table');
      table.innerHTML = '';
      const head = el('tr', {}, [el('th', { text: '' }), ...s.players.map((p) => el('th', { text: p.name }))]);
      table.appendChild(el('thead', {}, [head]));
      const body = el('tbody');
      const row = (label, values, cls) =>
        body.appendChild(el('tr', cls ? { class: cls } : {}, [el('td', { text: label }), ...values.map((v) => el('td', { text: v }))]));
      const totals = s.players.map((p) => P.totals(p.scores));
      P.CATEGORIES.forEach((cat) => {
        if (cat.id === 'pair') {
          row('Oben', totals.map((t) => String(t.upper)), 'sum');
          row('Bonus', totals.map((t) => String(t.bonus)));
        }
        row(cat.name, s.players.map((p) => (typeof p.scores[cat.id] === 'number' ? String(p.scores[cat.id]) : '–')));
      });
      row('Unten', totals.map((t) => String(t.lower)), 'sum');
      row('Gesamt', totals.map((t) => String(t.total)), 'sum total');
      table.appendChild(body);
    }

    // ---------- Rendern
    function render() {
      $('poker-setup').hidden = s.phase !== 'setup';
      $('poker-game').hidden = s.phase !== 'game';
      $('poker-result').hidden = s.phase !== 'result';
      $('poker-menu').hidden = s.phase !== 'game';
      if (s.phase !== 'game') $('commit-bar').hidden = true;
      if (s.phase === 'setup') renderSetup();
      if (s.phase === 'game') renderGame();
      if (s.phase === 'result') renderResult();
    }

    function init() {
      $('players-minus').addEventListener('click', () => {
        if (s.setup.names.length > 1) { s.setup.names.pop(); save(); renderSetup(); }
      });
      $('players-plus').addEventListener('click', () => {
        if (s.setup.names.length < 8) {
          s.setup.names.push(`Spieler ${s.setup.names.length + 1}`);
          save();
          renderSetup();
        }
      });
      $('rounds-minus').addEventListener('click', () => {
        if (s.setup.rounds > 1) { s.setup.rounds--; save(); renderSetup(); }
      });
      $('rounds-plus').addEventListener('click', () => {
        if (s.setup.rounds < MAX_ROUNDS) { s.setup.rounds++; save(); renderSetup(); }
      });
      $('poker-start').addEventListener('click', () => startGame(s.setup.names, s.setup.rounds));
      buildCubes();
      window.addEventListener('resize', sizeCubes);
      $('poker-roll').addEventListener('click', roll);
      $('commit-btn').addEventListener('click', commit);
      $('poker-menu').addEventListener('click', () => {
        showOverlay('Spiel wirklich beenden? Der Spielstand geht verloren.', [
          { label: 'Spiel beenden', cls: 'primary', onClick: () => { s.phase = 'setup'; save(); render(); } },
          { label: 'Weiterspielen', cls: 'secondary' },
        ]);
      });
      $('poker-again').addEventListener('click', () => startGame(s.players.map((p) => p.name), s.rounds));
      $('poker-new').addEventListener('click', () => { s.phase = 'setup'; save(); render(); });
      render();
    }

    return { init, render };
  })();

  // ================================================================ GLÜCKSRAD
  const Wheel = (() => {
    const canvas = $('wheel');
    const ctx = canvas.getContext('2d');
    const state = Object.assign(
      {
        removeMode: false,
        entries: ['Pizza', 'Pasta', 'Sushi', 'Burger', 'Salat', 'Curry'].map((text) => ({ text, out: false })),
      },
      store.get('wheel', {})
    );
    let rotation = 0;
    let spinning = false;

    function save() { store.set('wheel', state); }
    const color = (i) => `hsl(${Math.round((i * 137.508) % 360)}, 70%, 58%)`;
    const active = () => state.entries.map((e, i) => ({ ...e, i })).filter((e) => !e.out);

    function fitText(text, maxWidth) {
      if (ctx.measureText(text).width <= maxWidth) return text;
      let t = text;
      while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
      return t + '…';
    }

    function draw() {
      const cssSize = canvas.clientWidth;
      if (!cssSize) return; // Tab nicht sichtbar
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(cssSize * dpr)) {
        canvas.width = canvas.height = Math.round(cssSize * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const r = cssSize / 2;
      ctx.clearRect(0, 0, cssSize, cssSize);

      const items = active();
      ctx.save();
      ctx.translate(r, r);

      if (!items.length) {
        ctx.beginPath();
        ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
        ctx.fillStyle = '#1a2540';
        ctx.fill();
        ctx.fillStyle = '#9aa8c7';
        ctx.font = '600 15px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Füge unten Einträge hinzu', 0, -r / 2);
        ctx.restore();
        return;
      }

      const seg = (Math.PI * 2) / items.length;
      const fontSize = Math.max(11, Math.min(20, 220 / items.length + 6));
      ctx.font = `700 ${fontSize}px -apple-system, sans-serif`;
      items.forEach((item, k) => {
        const a0 = rotation + k * seg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r - 4, a0, a0 + seg);
        ctx.closePath();
        ctx.fillStyle = color(item.i);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#0f1729';
        ctx.stroke();

        ctx.save();
        ctx.rotate(a0 + seg / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#10131c';
        ctx.fillText(fitText(item.text, r - 60), r - 16, 0);
        ctx.restore();
      });

      ctx.beginPath();
      ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#f1f5ff';
      ctx.stroke();
      ctx.restore();
    }

    function spin() {
      if (spinning) return;
      const items = active();
      if (!items.length) return;
      spinning = true;
      $('spin-btn').disabled = true;
      $('wheel-result').innerHTML = '&nbsp;';
      $('wheel-result').classList.remove('pop');

      const seg = (Math.PI * 2) / items.length;
      const winner = randInt(items.length);
      const offset = (0.15 + Math.random() * 0.7) * seg; // Landepunkt innerhalb des Segments
      const pointer = -Math.PI / 2; // Zeiger oben
      const TAU = Math.PI * 2;
      // Ziel: pointer ≡ rotation + winner*seg + offset  (mod 2π)
      let target = pointer - winner * seg - offset;
      const minTarget = rotation + TAU * 5;
      target += Math.ceil((minTarget - target) / TAU) * TAU;
      target += TAU * randInt(2);

      const startRot = rotation;
      const duration = 4200 + randInt(1200);
      const t0 = performance.now();
      const ease = (t) => 1 - Math.pow(1 - t, 4);

      const frame = (now) => {
        const t = Math.min(1, (now - t0) / duration);
        rotation = startRot + (target - startRot) * ease(t);
        draw();
        if (t < 1) {
          requestAnimationFrame(frame);
          return;
        }
        rotation = target % TAU;
        spinning = false;
        $('spin-btn').disabled = false;
        const picked = items[winner];
        const res = $('wheel-result');
        res.textContent = picked.text;
        void res.offsetWidth;
        res.classList.add('pop');
        if (state.removeMode) {
          setTimeout(() => {
            state.entries[picked.i].out = true;
            save();
            draw();
            renderList();
          }, 900);
        }
      };
      requestAnimationFrame(frame);
    }

    function renderList() {
      const list = $('wheel-entries');
      list.innerHTML = '';
      state.entries.forEach((e, i) => {
        const li = el('li', { class: e.out ? 'out' : '' }, [
          el('span', { class: 'swatch', style: `background:${color(i)}` }),
          el('span', { class: 'label', text: e.text }),
        ]);
        if (e.out) {
          li.appendChild(el('button', {
            'aria-label': `${e.text} zurück ins Rad`, text: '↩',
            onclick: () => { if (spinning) return; e.out = false; save(); draw(); renderList(); },
          }));
        }
        li.appendChild(el('button', {
          'aria-label': `${e.text} löschen`, text: '✕',
          onclick: () => {
            if (spinning) return;
            state.entries.splice(i, 1);
            save();
            draw();
            renderList();
          },
        }));
        list.appendChild(li);
      });
      $('wheel-reset').hidden = !state.entries.some((e) => e.out);
      $('wheel-remove').checked = state.removeMode;
    }

    function init() {
      $('spin-btn').addEventListener('click', spin);
      canvas.addEventListener('click', spin);
      $('wheel-add').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const input = $('wheel-input');
        const text = input.value.trim();
        if (!text || spinning) return;
        state.entries.push({ text, out: false });
        input.value = '';
        save();
        draw();
        renderList();
      });
      $('wheel-remove').addEventListener('change', (ev) => {
        state.removeMode = ev.target.checked;
        save();
      });
      $('wheel-reset').addEventListener('click', () => {
        if (spinning) return;
        state.entries.forEach((e) => { e.out = false; });
        $('wheel-result').innerHTML = '&nbsp;';
        save();
        draw();
        renderList();
      });
      window.addEventListener('resize', draw);
      renderList();
      draw();
    }

    return { init, draw };
  })();

  // ---------------------------------------------------------------- Start
  DiceUI.init();
  PokerUI.init();
  Wheel.init();
  showView(store.get('tab', 'view-dice'));

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
