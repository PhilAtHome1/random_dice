/* 3D-Würfel (CSS) + Wurfanimation + Kartenbilder für die Pokerwürfel */
(function (root) {
  'use strict';

  // ------------------------------------------------------------ 3D-Würfel
  // Seitenpositionen; Wert v (0–5) liegt auf Seite POS[v].
  const POS = ['front', 'top', 'right', 'left', 'bottom', 'back'];
  // Drehung des Würfels, damit die Seite nach vorne zeigt: [rotateX, rotateY]
  const ORIENT = [[0, 0], [-90, 0], [0, -90], [0, 90], [90, 0], [0, 180]];

  function rnd(min, max) { return min + Math.random() * (max - min); }

  function createCube(faceHtml, faceClass) {
    const wrap = document.createElement('div');
    wrap.className = 'cube-wrap';
    wrap.innerHTML =
      '<div class="cube-shadow"></div><div class="cube-hop"><div class="cube">' +
      faceHtml.map((h, v) => `<div class="face ${POS[v]} ${faceClass || ''}">${h}</div>`).join('') +
      '</div></div>';
    wrap._rot = { x: 0, y: 0, z: 0 };
    wrap._value = 0;
    setCube(wrap, 0, false);
    return wrap;
  }

  // Dreht den Würfel auf Wert v. Mit animate=true überschlägt er sich dabei mehrfach.
  function setCube(wrap, v, animate, delay) {
    const cube = wrap.querySelector('.cube');
    const [tx, ty] = ORIENT[v];
    const r = wrap._rot;
    let x = tx;
    let y = ty;
    let z = rnd(-10, 10);
    if (animate) {
      const turnsX = 2 + Math.floor(Math.random() * 2);
      const turnsY = 1 + Math.floor(Math.random() * 2);
      x = tx + 360 * Math.ceil((r.x + 360 * turnsX - tx) / 360);
      y = ty + 360 * Math.ceil((r.y + 360 * turnsY - ty) / 360);
      z = 360 * Math.round(r.z / 360) + (Math.random() < 0.5 ? -360 : 360) + rnd(-10, 10);
    } else {
      x = tx + 360 * Math.round((r.x - tx) / 360);
      y = ty + 360 * Math.round((r.y - ty) / 360);
      z = 360 * Math.round(r.z / 360) + rnd(-6, 6);
    }
    wrap._rot = { x, y, z };
    wrap._value = v;
    cube.classList.toggle('instant', !animate);
    cube.style.transitionDelay = (delay || 0) + 'ms';
    cube.style.transform =
      `translateZ(calc(var(--size) / -2)) rotateZ(${z}deg) rotateX(${x}deg) rotateY(${y}deg)`;
    if (!animate) void cube.offsetWidth;
  }

  // Lässt einen Würfel von oben einfallen und zweimal nachhüpfen.
  const TOSS_MS = 1000;
  function toss(wrap, delay) {
    const hopEl = wrap.querySelector('.cube-hop') || wrap.firstElementChild;
    const shadow = wrap.querySelector('.cube-shadow');
    const h = Math.min(100, Math.max(60, wrap.offsetHeight * 0.9));
    const dx = rnd(-30, 30);
    const opts = { duration: TOSS_MS, delay: delay || 0, fill: 'backwards' };
    const t = (x, y) => `translate(${x}px, ${y}px)`;
    hopEl.animate([
      { offset: 0, transform: t(dx, -h), easing: 'cubic-bezier(.5,0,.9,.5)' },
      { offset: 0.4, transform: t(0, 0), easing: 'cubic-bezier(.1,.5,.5,1)' },
      { offset: 0.58, transform: t(0, -h * 0.22), easing: 'cubic-bezier(.5,0,.9,.5)' },
      { offset: 0.74, transform: t(0, 0), easing: 'cubic-bezier(.1,.5,.5,1)' },
      { offset: 0.85, transform: t(0, -h * 0.06), easing: 'cubic-bezier(.5,0,.9,.5)' },
      { offset: 0.94, transform: t(0, 0) },
      { offset: 1, transform: t(0, 0) },
    ], opts);
    if (shadow) {
      shadow.animate([
        { offset: 0, transform: 'scale(.35)', opacity: 0.2 },
        { offset: 0.4, transform: 'scale(1)', opacity: 1 },
        { offset: 0.58, transform: 'scale(.8)', opacity: 0.7 },
        { offset: 0.74, transform: 'scale(1)', opacity: 1 },
        { offset: 0.85, transform: 'scale(.95)', opacity: 0.9 },
        { offset: 1, transform: 'scale(1)', opacity: 1 },
      ], opts);
    }
  }

  // Für flache Würfel (W8–W20): 3D-Taumeln der Form selbst.
  function tumble(node, delay) {
    const a = 360 * (2 + Math.floor(Math.random() * 2)) * (Math.random() < 0.5 ? -1 : 1);
    const b = 360 * (1 + Math.floor(Math.random() * 2)) * (Math.random() < 0.5 ? -1 : 1);
    const c = rnd(-540, 540);
    const tilt = rnd(-8, 8);
    node.animate([
      { transform: `perspective(500px) rotateX(${a}deg) rotateY(${b}deg) rotateZ(${c}deg) scale(.75)` },
      { transform: `perspective(500px) rotateX(0deg) rotateY(0deg) rotateZ(${tilt}deg) scale(1)` },
    ], { duration: TOSS_MS, delay: delay || 0, easing: 'cubic-bezier(.15,.6,.25,1)', fill: 'both' });
  }

  // Ruft cb in immer längeren Abständen auf (Zahlen „rollen aus“).
  function flicker(durationMs, cb) {
    let t = 0;
    let gap = 40;
    while (t + gap < durationMs * 0.8) {
      t += gap;
      setTimeout(cb, t);
      gap *= 1.17;
    }
  }

  // Augen für einen normalen W6 (3×3-Raster)
  const PIPS = [[5], [1, 9], [1, 5, 9], [1, 3, 7, 9], [1, 3, 5, 7, 9], [1, 3, 4, 6, 7, 9]];
  function pipFace(n) {
    let html = '';
    for (let c = 1; c <= 9; c++) html += PIPS[n - 1].includes(c) ? '<span class="pip"></span>' : '<span></span>';
    return html;
  }

  // ------------------------------------------------------------ Pokerwürfel-Bilder
  const RED = '#c4161c';
  const BLACK = '#17171c';
  const GOLD = '#e2a627';
  const SKIN = '#f6d6b8';
  const LINE = '#2a1a10';

  const SUIT = {
    heart: '<path d="M50 92C22 70 4 52 4 31 4 15 16 4 30 4c9 0 16 5 20 13 4-8 11-13 20-13 14 0 26 11 26 27 0 21-18 39-46 61z"/>',
    diamond: '<path d="M50 2 88 50 50 98 12 50z"/>',
    spade: '<path d="M50 3C78 30 96 44 96 62c0 13-10 22-22 22-9 0-16-5-20-11 1 10 5 17 13 24H33c8-7 12-14 13-24-4 6-11 11-20 11C14 84 4 75 4 62 4 44 22 30 50 3z"/>',
    club: '<circle cx="50" cy="27" r="22"/><circle cx="26" cy="60" r="22"/><circle cx="74" cy="60" r="22"/><path d="M44 52h12c0 22 5 35 16 45H28c11-10 16-23 16-45z"/>',
  };

  function suit(name, x, y, size, color, flip) {
    return `<g fill="${color}" transform="translate(${x} ${y})${flip ? ' rotate(180)' : ''} scale(${size / 100}) translate(-50 -50)">${SUIT[name]}</g>`;
  }

  function corners(label, suitName, color) {
    const one = `<text x="10" y="17" font-size="${label.length > 1 ? 12 : 15}" font-weight="700" text-anchor="middle" fill="${color}" font-family="Georgia, 'Times New Roman', serif">${label}</text>${suit(suitName, 10, 26, 9, color)}`;
    return one + `<g transform="rotate(180 50 50)">${one}</g>`;
  }

  function svg(inner) {
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
  }

  function pipCard(label, suitName, color, spots, size) {
    let s = corners(label, suitName, color);
    spots.forEach(([x, y]) => { s += suit(suitName, x, y, size, color, y > 50); });
    return svg(s);
  }

  // Oberkörper einer Figur (obere Hälfte), wird für die untere Hälfte gespiegelt.
  function bust(kind) {
    const head = `<rect x="46" y="31" width="8" height="7" fill="${SKIN}"/>
      <ellipse cx="50" cy="25" rx="8" ry="9" fill="${SKIN}" stroke="${LINE}" stroke-width=".8"/>
      <circle cx="47" cy="24" r="1" fill="${LINE}"/><circle cx="53" cy="24" r="1" fill="${LINE}"/>
      <path d="M48 29.5q2 1.3 4 0" stroke="${RED}" stroke-width=".9" fill="none" stroke-linecap="round"/>`;
    const shoulders = (fill) => `<path d="M23 50C24 41 33 36.5 50 36.5S76 41 77 50z" fill="${fill}" stroke="${LINE}" stroke-width=".8"/>`;

    if (kind === 'K') {
      return shoulders(RED) +
        `<path d="M27 50C29 43 36 39.5 50 39.5S71 43 73 50" fill="none" stroke="${GOLD}" stroke-width="2"/>
         <path d="M35 37.5C40 35 45 34.5 50 34.5S60 35 65 37.5L63 41C58 39 54 38.5 50 38.5S42 39 37 41z" fill="#fff" stroke="${LINE}" stroke-width=".6"/>
         <circle cx="41" cy="38.5" r=".8" fill="${BLACK}"/><circle cx="50" cy="37" r=".8" fill="${BLACK}"/><circle cx="59" cy="38.5" r=".8" fill="${BLACK}"/>` +
        head +
        `<path d="M42 26c0 9 4 12.5 8 12.5s8-3.5 8-12.5c-2 3.5-5 4.5-8 4.5s-6-1-8-4.5z" fill="#8a5a2b" stroke="${LINE}" stroke-width=".6"/>
         <path d="M46.5 29.3q3.5-1.6 7 0" stroke="#6b4320" stroke-width="1.4" fill="none"/>
         <path d="M40.5 18V8.5l4 4 2.5-6 3 5 3-5 2.5 6 4-4V18z" fill="${GOLD}" stroke="${LINE}" stroke-width=".8" stroke-linejoin="round"/>
         <circle cx="50" cy="14.5" r="1.5" fill="${RED}"/><circle cx="44.5" cy="15.5" r="1" fill="#1e4fa3"/><circle cx="55.5" cy="15.5" r="1" fill="#1e4fa3"/>
         <path d="M70 50V20" stroke="${GOLD}" stroke-width="2"/><circle cx="70" cy="19" r="2.6" fill="${GOLD}" stroke="${LINE}" stroke-width=".6"/>`;
    }
    if (kind === 'D') {
      return `<path d="M40.5 26c-1-12 5-17 9.5-17s10.5 5 9.5 17l3 12h-25z" fill="#6b3a1e" stroke="${LINE}" stroke-width=".7"/>` +
        shoulders('#1e4fa3') +
        `<path d="M38 37.5 50 47 62 37.5" fill="${SKIN}" stroke="${LINE}" stroke-width=".6"/>
         <path d="M40 39.5q10 8 20 0" fill="none" stroke="${GOLD}" stroke-width="1.6"/>
         <path d="M27 50C28 44 31 41 35 39.5M73 50C72 44 69 41 65 39.5" fill="none" stroke="${RED}" stroke-width="2"/>` +
        head +
        `<path d="M42 21c2-6 14-6 16 0-3-2-13-2-16 0z" fill="#6b3a1e"/>
         <path d="M43 16.5l2-5 2.5 3.5L50 10l2.5 4.5 2.5-3.5 2 5z" fill="${GOLD}" stroke="${LINE}" stroke-width=".7" stroke-linejoin="round"/>
         <circle cx="30" cy="44" r="3.4" fill="${RED}" stroke="${LINE}" stroke-width=".6"/><circle cx="30" cy="44" r="1.2" fill="${GOLD}"/>
         <path d="M30 47.5V50" stroke="#2e7d32" stroke-width="1.4"/>`;
    }
    // Bube
    return shoulders('#2e7d32') +
      `<path d="M38 38.5h24l-3 4H41z" fill="${GOLD}" stroke="${LINE}" stroke-width=".6"/>
       <path d="M31 50V43M69 50V43" stroke="${GOLD}" stroke-width="1.5"/>` +
      `<path d="M41.5 23c-.5 6 0 10 2 12M58.5 23c.5 6 0 10-2 12" stroke="#c9922e" stroke-width="3.2" fill="none" stroke-linecap="round"/>` +
      head +
      `<path d="M38 20c1-8 9-11 15-10s11 4 11 9l-9 1z" fill="${RED}" stroke="${LINE}" stroke-width=".8" stroke-linejoin="round"/>
       <path d="M40 20.5h20" stroke="${GOLD}" stroke-width="1.6"/>
       <path d="M60 15c5-4 8-9 7-14-3 4-6 8-9 13z" fill="#fff" stroke="${LINE}" stroke-width=".6"/>`;
  }

  function courtCard(kind, suitName, color, frame) {
    const b = bust(kind);
    return svg(
      corners(kind, suitName, color) +
      `<rect x="20" y="6" width="60" height="88" rx="3" fill="#fffdf6" stroke="${frame}" stroke-width="1.4"/>
       <g>${b}</g><g transform="rotate(180 50 50)">${b}</g>
       <path d="M20 50h60" stroke="${frame}" stroke-width="1"/>`
    );
  }

  const POKER_FACES = [
    // 9
    pipCard('9', 'club', BLACK, [[34, 19], [66, 19], [34, 39.5], [66, 39.5], [50, 50], [34, 60.5], [66, 60.5], [34, 81], [66, 81]], 13.5),
    // 10
    pipCard('10', 'diamond', RED, [[34, 18], [66, 18], [50, 29], [34, 39.5], [66, 39.5], [34, 60.5], [66, 60.5], [50, 71], [34, 82], [66, 82]], 14),
    courtCard('B', 'spade', BLACK, '#2e7d32'),
    courtCard('D', 'heart', RED, '#1e4fa3'),
    courtCard('K', 'club', BLACK, RED),
    // Ass
    svg(corners('A', 'spade', BLACK) +
      `<circle cx="50" cy="50" r="30" fill="none" stroke="${GOLD}" stroke-width="1.2" stroke-dasharray="2 2.5"/>` +
      suit('spade', 50, 49, 44, BLACK)),
  ];

  root.Dice3D = { createCube, setCube, toss, tumble, flicker, pipFace, TOSS_MS, POKER_FACES };
})(this);
