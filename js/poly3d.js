/* Echte 3D-Würfel für W8, W10, W12 und W20 (CSS 3D, eigene kleine Engine).
   Jede Fläche ist ein Element, das per matrix3d in seine Ebene gelegt wird.
   Gedreht wird per requestAnimationFrame, damit sich die Licht-Schattierung
   der Flächen in jedem Frame mitbewegt. */
(function (root) {
  'use strict';

  const PHI = (1 + Math.sqrt(5)) / 2;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const norm = (a) => scale(a, 1 / len(a));
  const avg = (P) => scale(P.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]), 1 / P.length);

  // ------------------------------------------------------------ Geometrie
  function octahedron() {
    const V = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const F = [];
    for (const x of [0, 1]) for (const y of [2, 3]) for (const z of [4, 5]) F.push([x, y, z]);
    return { V, F };
  }

  function icoVerts() {
    const V = [];
    for (const a of [-1, 1]) for (const b of [-1, 1]) V.push([0, a, b * PHI], [a, b * PHI, 0], [b * PHI, 0, a]);
    return V;
  }

  function icosahedron() {
    const V = icoVerts();
    const F = [];
    const edge = (i, j) => Math.abs(len(sub(V[i], V[j])) - 2) < 1e-6;
    for (let i = 0; i < 12; i++)
      for (let j = i + 1; j < 12; j++)
        for (let k = j + 1; k < 12; k++) if (edge(i, j) && edge(j, k) && edge(i, k)) F.push([i, j, k]);
    return { V, F };
  }

  function dodecahedron() {
    const V = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) V.push([x, y, z]);
    for (const a of [-1, 1]) for (const b of [-1, 1]) V.push([0, a / PHI, b * PHI], [a / PHI, b * PHI, 0], [b * PHI, 0, a / PHI]);
    // Flächennormalen des Dodekaeders = Ecken des Ikosaeders (Dualität)
    const F = icoVerts().map(([x, y, z]) => [x, z, y]).map((n) => {
      const d = V.map((p) => dot(p, n));
      const m = Math.max(...d);
      return V.map((_, i) => i).filter((i) => d[i] > m - 1e-6);
    });
    return { V, F };
  }

  // Zehnflächner (pentagonales Trapezoeder)
  function trapezohedron() {
    const c = Math.cos(Math.PI / 5);
    const b = 0.15;
    const a = (b * (1 + c)) / (1 - c); // Höhe der Spitzen, damit die Drachenvierecke eben sind
    const V = [];
    for (let i = 0; i < 10; i++) {
      const ang = (i * Math.PI) / 5;
      V.push([Math.cos(ang), Math.sin(ang), i % 2 === 0 ? b : -b]);
    }
    V.push([0, 0, a], [0, 0, -a]);
    const F = [];
    for (let k = 0; k < 5; k++) {
      F.push([10, 2 * k, 2 * k + 1, (2 * k + 2) % 10]);
      F.push([11, 2 * k + 1, (2 * k + 2) % 10, (2 * k + 3) % 10]);
    }
    return { V, F };
  }

  // Flächen aufbereiten: Mittelpunkt, Normale, lokale Achsen (U rechts, V unten), 2D-Umriss
  function prepare(def) {
    const r = Math.max(...def.V.map(len));
    const V = def.V.map((p) => scale(p, 1 / r));
    return def.F.map((ids) => {
      const P = ids.map((i) => V[i]);
      const c = avg(P);
      let N = norm(cross(sub(P[1], P[0]), sub(P[2], P[0])));
      if (dot(N, c) < 0) N = scale(N, -1);
      // Erste Ecke liegt „oben“ -> Zahl steht aufrecht
      let Vd = sub(c, P[0]);
      Vd = norm(sub(Vd, scale(N, dot(Vd, N))));
      const U = cross(Vd, N);
      const pts = P.map((p) => { const d = sub(p, c); return [dot(d, U), dot(d, Vd)]; })
        .sort((p, q) => Math.atan2(p[1], p[0]) - Math.atan2(q[1], q[0]));
      let rin = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const q = pts[(i + 1) % pts.length];
        const e = Math.hypot(q[0] - p[0], q[1] - p[1]);
        rin = Math.min(rin, Math.abs(p[0] * q[1] - p[1] * q[0]) / e);
      }
      const P3 = pts.map(([x, y]) => [0, 1, 2].map((i) => c[i] + x * U[i] + y * Vd[i]));
      return { c, N, U, V: Vd, pts, rin, P3 };
    });
  }

  const SOLIDS = {
    8: { faces: prepare(octahedron()), hue: 217, sat: 80, radius: 0.56, font: 1.0 },
    10: { faces: prepare(trapezohedron()), hue: 145, sat: 62, radius: 0.6, font: 0.95 },
    12: { faces: prepare(dodecahedron()), hue: 330, sat: 70, radius: 0.56, font: 0.85 },
    20: { faces: prepare(icosahedron()), hue: 265, sat: 70, radius: 0.56, font: 1.05 },
  };

  // ------------------------------------------------------------ Matrizen
  function rotation(axis, ang) {
    const [x, y, z] = axis;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const t = 1 - c;
    return [
      [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
      [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
      [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
    ];
  }
  const mul = (A, B) => A.map((row) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
  const apply3 = (M, v) => M.map((row) => dot(row, v));
  const LIGHT = norm([-0.45, -0.7, 1]);

  // ------------------------------------------------------------ Zeichnen (Canvas)
  // Orthografische Projektion; da die Körper konvex sind, reicht es, Rückseiten wegzulassen.
  function create(sides, sizePx) {
    const solid = SOLIDS[sides];
    const wrap = document.createElement('div');
    wrap.className = 'cube-wrap poly';
    wrap.innerHTML = '<div class="cube-shadow"></div><div class="cube-hop"><canvas></canvas></div>';
    const canvas = wrap.querySelector('canvas');
    const dpr = Math.min(3, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
    const C = Math.ceil(sizePx * 1.3);
    canvas.width = canvas.height = Math.round(C * dpr);
    canvas.style.cssText = `width:${C}px;height:${C}px;left:${(sizePx - C) / 2}px;top:${(sizePx - C) / 2}px`;
    wrap._solid = solid;
    wrap._ctx = canvas.getContext('2d');
    wrap._dpr = dpr;
    wrap._R = sizePx * solid.radius;
    set(wrap, 0, false);
    return wrap;
  }

  function render(wrap, M) {
    const ctx = wrap._ctx;
    const { hue, sat, faces, font } = wrap._solid;
    const k = wrap._dpr;
    const R = wrap._R * k;
    const mid = ctx.canvas.width / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.lineJoin = 'round';
    faces.forEach((f, i) => {
      const n = apply3(M, f.N);
      if (n[2] <= 0.0001) return; // Rückseite
      const lit = Math.max(0, dot(n, LIGHT));
      const L = 30 + 36 * lit;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath();
      f.P3.forEach((p, j) => {
        const q = apply3(M, p);
        const x = mid + q[0] * R;
        const y = mid + q[1] * R;
        if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = `hsl(${hue},${sat}%,${L.toFixed(1)}%)`;
      ctx.fill();
      ctx.lineWidth = 1.2 * k;
      ctx.strokeStyle = `hsla(${hue},${sat}%,${(L + 14).toFixed(1)}%,.55)`;
      ctx.stroke();

      // Zahl in der Flächenebene (affine Abbildung lokal -> Bildschirm)
      const u = apply3(M, f.U);
      const v = apply3(M, f.V);
      const c = apply3(M, f.c);
      ctx.setTransform(u[0], u[1], v[0], v[1], mid + c[0] * R, mid + c[1] * R);
      const size = f.rin * R * font;
      ctx.font = `800 ${size.toFixed(1)}px -apple-system, "SF Pro Display", "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = String(i + 1);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillText(label, 0, size * 0.05);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, 0, 0);
      if (label === '6' || label === '9') {
        const w = ctx.measureText(label).width;
        ctx.fillRect(-w / 2, size * 0.42, w, Math.max(1.5 * k, size * 0.07));
      }
    });
  }

  // Dreht den Körper so, dass Fläche k nach vorne zeigt (mit animate: mehrere Überschläge).
  function set(wrap, k, animate, delay, straight) {
    const f = wrap._solid.faces[k];
    const t = straight ? 0 : ((Math.random() - 0.5) * 20 * Math.PI) / 180;
    const x = [Math.cos(t), Math.sin(t), 0];
    const y = [-Math.sin(t), Math.cos(t), 0];
    const z = [0, 0, 1];
    // Ziel = Sicht-Basis · Flächen-Basisᵀ
    const target = [0, 1, 2].map((i) => [0, 1, 2].map((j) => x[i] * f.U[j] + y[i] * f.V[j] + z[i] * f.N[j]));
    if (wrap._raf) cancelAnimationFrame(wrap._raf);
    wrap._value = k;
    if (!animate) { render(wrap, target); return; }

    const axis = norm([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]);
    const spin = (Math.random() < 0.5 ? -1 : 1) * Math.PI * (4 + Math.random() * 2.5);
    const start = performance.now() + (delay || 0);
    const DURATION = root.Dice3D ? root.Dice3D.TOSS_MS : 1000;
    const frame = (now) => {
      const p = Math.min(1, Math.max(0, (now - start) / DURATION));
      const e = 1 - Math.pow(1 - p, 4);
      render(wrap, p < 1 ? mul(rotation(axis, spin * (1 - e)), target) : target);
      if (p < 1) wrap._raf = requestAnimationFrame(frame);
      else wrap._raf = null;
    };
    frame(performance.now());
  }

  const api = { create, set, SOLIDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Poly3D = api;
})(this);
