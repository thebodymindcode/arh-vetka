/* Ветки реальности: анимация «переход на другую ветку». Собирается из b1..b4 скриптом sklejka.sh.
   v2.1 (09.10): режим mobil (поле 900x1100, 7 веток, фигурки и подписи в 2 раза крупнее, кадры плёнки крупнее,
   титр переносится по ширине). mobil: true | false | 'avto' (avto = ширина контейнера меньше 700 px). */
(function () {
  'use strict';
  var W = 1600, H = 900, LOOP = 15000;
  var TEMY = {
    teplo:  { fon: '#1A1915', fon2: '#24211B', vetka: '#6F6A5A', vetkaL: '#8C8674', zoloto: '#C9A24A', zolotoL: '#E8CF8A',
              zelen: '#5E8F6E', tekst: '#D6CFC0', mute: '#A39C88', chastic: 0, ramka: '#3A3328' },
    kosmos: { fon: '#07090F', fon2: '#0D111C', vetka: '#3A4260', vetkaL: '#55608A', zoloto: '#D4AE5A', zolotoL: '#F0D894',
              zelen: '#6C7CFF', tekst: '#C9CBDA', mute: '#8B8FA6', chastic: 110, ramka: '#1C2439', violet: '#8E6CFF', indigo: '#6C7CFF' }
  };
  /* геометрия двух режимов: поле, число веток, золотая ветка, ветка героя, точка выбора, разлёт концов, размеры */
  var REZHIMY = {
    pk:    { W: 1600, H: 900, N: 11, G: 3, HB: 6, p0: [0.085, 0.5], y0: 0.13, y1: 0.87, fig: 11, ger: 15, lw: 1.3, verh: 19, niz: 17, titr: 30, dug: 70, kadrW: 0.12 },
    mobil: { W: 900, H: 1180, N: 7, G: 1, HB: 4, p0: [0.06, 0.66], y0: 0.46, y1: 0.85, fig: 20, ger: 28, lw: 2, verh: 34, niz: 34, titr: 44, dug: 110, kadrW: 0.29 }
  };
  var R = REZHIMY.pk, N = R.N, G = R.G, HB = R.HB, P0 = { x: 0, y: 0 };
  function rezhim(st) {
    R = st.mobil ? REZHIMY.mobil : REZHIMY.pk;
    W = R.W; H = R.H; N = R.N; G = R.G; HB = R.HB; P0 = { x: W * R.p0[0], y: H * R.p0[1] };
  }
  function ease(x) { return x < 0 ? 0 : x > 1 ? 1 : (1 - Math.cos(Math.PI * x)) / 2; }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function lin(t, a, b) { return clamp01((t - a) / (b - a)); }
  function hex(c, a) { var r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16); return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; }

  var VetkiAnim = {};
  VetkiAnim.mount = function (el, opts) {
    opts = opts || {};
    var st = {
      el: el, tema: TEMY[opts.tema] || TEMY.teplo, temaName: opts.tema || 'teplo',
      titr: opts.titr || ['ПРОШЛОЕ УЖЕ ОТСНЯТО.', 'ВПЕРЕДИ ВЕТКА, ГДЕ ВСЁ ПОЛУЧИЛОСЬ.'],
      podpisi: opts.podpisi || { verh: ['ТОЧКА ВЫБОРА', 'ВЫБРАННАЯ ВЕТКА', 'ПЕРЕХОД', 'ПРОСТРАНСТВО ВАРИАНТОВ'], niz: ['ЧТО ЕСТЬ', 'ЧТО БУДЕТ', 'ЧТО МОГЛО БЫ БЫТЬ'] },
      kadry: [], raf: 0, t0: 0, vidno: true, stop: false, shrift: opts.shrift || 'Manrope, Arial, sans-serif',
      mobilOpt: opts.mobil === undefined ? false : opts.mobil, mobil: false
    };
    var cv = document.createElement('canvas');
    cv.style.cssText = 'display:block;width:100%;height:100%;';
    el.appendChild(cv);
    st.cv = cv; st.ctx = cv.getContext('2d');
    (opts.kadry || []).forEach(function (src, i) {
      var im = new Image(); im.decoding = 'async'; im.src = src; st.kadry[i] = im;
    });
    VetkiAnim._init(st);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var obertka = el.parentNode || el;
    function resize() {
      var shir = obertka.getBoundingClientRect().width;
      st.mobil = st.mobilOpt === true || (st.mobilOpt === 'avto' && shir > 0 && shir < 700);
      if (obertka.classList) obertka.classList.toggle('ph-mobil', st.mobil);
      rezhim(st);
      var r = el.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(2, Math.round(r.width * dpr)); cv.height = Math.max(2, Math.round(r.height * dpr));
      st.sx = cv.width / W; st.sy = cv.height / H;
      if (reduce) VetkiAnim._draw(st, 13000); else if (st.stop || !st.raf) VetkiAnim._draw(st, st.lastT || 0);
    }
    resize();
    var rzW = innerWidth, rzT; window.addEventListener('resize', function () { if (innerWidth === rzW) return; rzW = innerWidth; clearTimeout(rzT); rzT = setTimeout(resize, 150); });
    st.resize = resize;
    if (reduce) { VetkiAnim._draw(st, 13000); return st; }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { st.vidno = es[0].isIntersecting; if (st.vidno && !st.raf) { st.t0 = performance.now(); kadr(); } }, { threshold: 0.05 }).observe(el);
    }
    st.t0 = performance.now();
    function kadr(now) {
      st.raf = 0;
      if (!st.vidno || st.stop) return;
      var t = ((now || performance.now()) - st.t0) % LOOP;
      VetkiAnim._draw(st, t);
      st.raf = requestAnimationFrame(kadr);
    }
    kadr();
    st.destroy = function () { st.stop = true; if (st.raf) cancelAnimationFrame(st.raf); el.removeChild(cv); };
    return st;
  };
  /* рисование одного кадра по времени t (мс) */
  VetkiAnim._draw = function (st, t) {
    rezhim(st); st.lastT = t;
    var c = st.ctx, T = st.tema;
    c.setTransform(st.sx, 0, 0, st.sy, 0, 0);
    var g = c.createRadialGradient(W * 0.45, H * 0.5, 50, W * 0.45, H * 0.5, Math.max(W, H) * 0.75);
    g.addColorStop(0, T.fon2); g.addColorStop(1, T.fon);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    VetkiAnim._chasticy(st, t);
    VetkiAnim._vetki(st, t);
    VetkiAnim._podpisi(st, t);
    VetkiAnim._figurki(st, t);
    VetkiAnim._kadryPlenka(st, t);
    VetkiAnim._geroy(st, t);
    VetkiAnim._titr(st, t);
    var fade = t < 500 ? 1 - t / 500 : t > 14000 ? (t - 14000) / 1000 : 0;
    if (fade > 0) { c.fillStyle = hex(T.fon, fade); c.fillRect(0, 0, W, H); }
  };
  /* ===== Блок 2: геометрия веера, ветки, подписи, фигурки ===== */
  function konec(i) { return { x: W * 0.97, y: H * (R.y0 + (R.y1 - R.y0) * i / (N - 1)) }; }
  function tochka(i, u) { /* кубическая Безье от P0 к концу ветки i, u 0..1 */
    var e = konec(i), c1 = { x: W * 0.28, y: P0.y + (e.y - P0.y) * 0.15 }, c2 = { x: W * 0.5, y: e.y };
    var m = 1 - u, a = m * m * m, b = 3 * m * m * u, c = 3 * m * u * u, d = u * u * u;
    return { x: a * P0.x + b * c1.x + c * c2.x + d * e.x, y: a * P0.y + b * c1.y + c * c2.y + d * e.y };
  }
  function ugol(i, u) { var p = tochka(i, u), q = tochka(i, Math.min(1, u + 0.01)); return Math.atan2(q.y - p.y, q.x - p.x); }
  function put(c, i, u1) { /* контур ветки до параметра u1 */
    c.beginPath(); var p = tochka(i, 0); c.moveTo(p.x, p.y);
    for (var k = 1; k <= 60; k++) { var q = tochka(i, u1 * k / 60); c.lineTo(q.x, q.y); }
  }
  VetkiAnim._init = function (st) {
    var r = 0.37;
    function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280; }
    function hodoki(rz) {
      var out = [];
      for (var i = 0; i < rz.N; i++) {
        if (i === rz.HB) continue;
        var n = 1 + Math.floor(rnd() * 2);
        for (var k = 0; k < n; k++) out.push({ i: i, u0: 0.18 + rnd() * 0.7, v: 0.012 + rnd() * 0.01, faza: rnd() * 6.28 });
      }
      return out;
    }
    st.hodokiPk = hodoki(REZHIMY.pk); st.hodokiMob = hodoki(REZHIMY.mobil);
    st.ch = [];
    for (var m = 0; m < 120; m++) st.ch.push({ x: rnd(), y: rnd(), r: 0.6 + rnd() * 1.4, v: 2 + rnd() * 6, f: rnd() * 6.28 });
  };
  VetkiAnim._vetki = function (st, t) {
    var c = st.ctx, T = st.tema, rost = ease(lin(t, 0, 1400)), k = R.lw;
    var goren = ease(lin(t, 5500, 7000));
    c.lineCap = 'round';
    for (var i = 0; i < N; i++) {
      if (i === G) continue;
      c.strokeStyle = hex(T.vetka, 0.9); c.lineWidth = (i === HB ? 1.6 : 1.1) * k;
      put(c, i, rost); c.stroke();
      c.strokeStyle = hex(T.vetkaL, 0.55); c.lineWidth = 0.5 * k; put(c, i, rost); c.stroke();
    }
    /* золотая ветка: тусклая до перехода, затем загорается */
    c.strokeStyle = hex(T.vetka, 0.9); c.lineWidth = 1.3 * k; put(c, G, rost); c.stroke();
    if (goren > 0) {
      c.save(); c.shadowColor = hex(T.zoloto, 0.9 * goren); c.shadowBlur = 18 * goren * k;
      c.strokeStyle = hex(T.zoloto, goren); c.lineWidth = 2.4 * k; put(c, G, 1); c.stroke();
      c.strokeStyle = hex(T.zolotoL, 0.8 * goren); c.lineWidth = 1 * k; put(c, G, 1); c.stroke();
      c.restore();
    }
    /* точка выбора */
    c.fillStyle = hex(T.zolotoL, 0.9 * rost); c.beginPath(); c.arc(P0.x, P0.y, 3.5 * k, 0, 6.29); c.fill();
    c.fillStyle = hex(T.zoloto, 0.25 * rost); c.beginPath(); c.arc(P0.x, P0.y, 11 * k, 0, 6.29); c.fill();
  };
  function nadpis(c, st, s, x, y, a, size, vyrav, col) {
    c.font = '600 ' + size + 'px ' + st.shrift; c.textAlign = vyrav || 'left'; c.textBaseline = 'middle';
    c.letterSpacing = Math.round(size * (st.mobil ? 0.12 : 0.24)) + 'px';
    c.fillStyle = hex(col || st.tema.mute, a); c.fillText(s, x, y);
  }
  VetkiAnim._podpisi = function (st, t) {
    var c = st.ctx, T = st.tema, p = st.podpisi, sz = R.verh, i, a;
    var zolA = ease(lin(t, 5500, 6500)) * (t > 5500 ? 1 : 0);
    if (st.mobil) { /* две строки сверху, по краям */
      var poz = [[W * 0.04, H * 0.045, 'left'], [W * 0.96, H * 0.045, 'right'], [W * 0.04, H * 0.095, 'left'], [W * 0.96, H * 0.095, 'right']];
      for (i = 0; i < 4; i++) {
        a = ease(lin(t, 500 + i * 500, 1000 + i * 500)); if (a <= 0) continue;
        nadpis(c, st, p.verh[i], poz[i][0], poz[i][1], a * (i === 1 ? 1 - zolA : 1), sz, poz[i][2]);
        if (i === 1 && zolA > 0) nadpis(c, st, p.verh[i], poz[i][0], poz[i][1], a * zolA, sz, poz[i][2], T.zolotoL);
      }
    } else {
      var xs = [0.085, 0.35, 0.535, 0.86], ys = H * 0.075;
      for (i = 0; i < 4; i++) {
        a = ease(lin(t, 500 + i * 500, 1000 + i * 500)); if (a <= 0) continue;
        var x = W * xs[i], v = i === 0 ? 'left' : i === 3 ? 'right' : 'center';
        nadpis(c, st, p.verh[i], x, ys, a * (i === 1 ? 1 - zolA : 1), sz, v);
        if (i === 1 && zolA > 0) nadpis(c, st, p.verh[i], x, ys, a * zolA, sz, v, T.zolotoL);
        c.strokeStyle = hex(T.mute, 0.35 * a); c.lineWidth = 1; c.beginPath(); c.moveTo(x, ys + 18); c.lineTo(x, ys + 36); c.stroke();
      }
    }
    var a2 = ease(lin(t, 2600, 3400));
    if (a2 > 0) {
      var yn = H * (st.mobil ? 0.955 : 0.93), fz = R.niz, xn;
      var yk = [yn, yn, yn];
      if (st.mobil) { /* Б15: кегль не ужимается (на 320 не мельче 12 px), три подписи лесенкой в два ряда: слева и в середине, справа ниже */
        yn = H * 0.915; yk = [yn, yn, H * 0.965];
        c.font = '600 ' + fz + 'px ' + st.shrift; c.letterSpacing = Math.round(fz * 0.12) + 'px';
        xn = [0.04, 0.5, 0.96];
      } else xn = [0.085, 0.5, 0.97];
      var vn = ['left', 'center', 'right'];
      for (var k = 0; k < 3; k++) nadpis(c, st, p.niz[k], W * xn[k], yk[k], a2 * 0.95, fz, vn[k]);
      c.strokeStyle = hex(T.mute, 0.25 * a2); c.lineWidth = R.lw; c.beginPath(); c.moveTo(W * xn[0], yn - fz * 1.3); c.lineTo(W * (st.mobil ? 0.96 : 0.97), yn - fz * 1.3); c.stroke();
    }
    c.letterSpacing = '0px';
  };
  function figurka(c, x, y, ang, faza, col, r, a) { /* силуэт из линий: голова, тело, руки, ноги в шаге */
    c.save(); c.translate(x, y); c.rotate(ang); c.strokeStyle = hex(col, a); c.fillStyle = hex(col, a); c.lineWidth = r * 0.22; c.lineCap = 'round';
    var s = Math.sin(faza), k = Math.cos(faza);
    c.beginPath(); c.arc(0, -r * 2.1, r * 0.42, 0, 6.29); c.fill();
    c.beginPath(); c.moveTo(0, -r * 1.65); c.lineTo(0, -r * 0.7); c.stroke();
    c.beginPath(); c.moveTo(0, -r * 1.5); c.lineTo(r * 0.55 * s, -r * 0.95); c.moveTo(0, -r * 1.5); c.lineTo(-r * 0.55 * s, -r * 0.95); c.stroke();
    c.beginPath(); c.moveTo(0, -r * 0.7); c.lineTo(r * 0.6 * k, 0); c.moveTo(0, -r * 0.7); c.lineTo(-r * 0.6 * k, 0); c.stroke();
    c.restore();
  }
  VetkiAnim._figurki = function (st, t) {
    var c = st.ctx, T = st.tema, a = ease(lin(t, 900, 2000)), sec = t / 1000;
    if (a <= 0) return;
    (st.mobil ? st.hodokiMob : st.hodokiPk).forEach(function (h) {
      var u = (h.u0 + sec * h.v) % 0.98, p = tochka(h.i, u), zol = h.i === G && t > 6000;
      figurka(c, p.x, p.y, ugol(h.i, u) * 0.6, h.faza + sec * 5.6, zol ? T.zolotoL : T.vetkaL, R.fig, a * (zol ? 0.95 : 0.65));
    });
  };
  /* ===== Блок 3: герой, переход на золотую ветку, частицы ===== */
  var U_PER = 0.42; /* параметр ветки, где происходит переход */
  function geroyPoz(t) {
    var sec = t / 1000;
    if (t < 5200) { var u = 0.1 + (U_PER - 0.1) * lin(t, 800, 5200); return { p: tochka(HB, u), i: HB, u: u, ang: ugol(HB, u) }; }
    if (t < 5800) {
      var k = ease(lin(t, 5200, 5800)), a = tochka(HB, U_PER), b = tochka(G, U_PER);
      var dug = -Math.sin(k * Math.PI) * R.dug; /* дуга прыжка вверх */
      return { p: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k + dug }, i: -1, u: U_PER, ang: 0, k: k };
    }
    var u2 = U_PER + (0.93 - U_PER) * lin(t, 5800, 14000);
    return { p: tochka(G, u2), i: G, u: u2, ang: ugol(G, u2) };
  }
  VetkiAnim._geroy = function (st, t) {
    var c = st.ctx, T = st.tema, a = ease(lin(t, 800, 1600));
    if (a <= 0) return;
    var g = geroyPoz(t), sec = t / 1000, faza = sec * 6.2, na = g.i === G || g.i === -1;
    var col = na ? T.zolotoL : T.tekst, r = R.ger, m = R.lw;
    /* свечение под героем */
    c.fillStyle = hex(na ? T.zoloto : T.vetkaL, 0.12 * a); c.beginPath(); c.arc(g.p.x, g.p.y, 18 * m, 0, 6.29); c.fill();
    if (g.i === -1) {
      var k = g.k, vsp = Math.sin(k * Math.PI);
      if (st.temaName === 'kosmos') { /* двойник: расщепление на две полупрозрачные копии и схлопывание */
        var sdv = 14 * vsp * m;
        figurka(c, g.p.x - sdv, g.p.y - 4 * vsp, 0, faza, T.indigo, r, 0.55 * vsp);
        figurka(c, g.p.x + sdv, g.p.y + 4 * vsp, 0, faza + 1.2, T.violet, r, 0.55 * vsp);
        c.strokeStyle = hex(T.indigo, 0.35 * vsp); c.lineWidth = 1; /* волна вероятности */
        for (var w = 1; w <= 3; w++) { c.beginPath(); c.arc(g.p.x, g.p.y - 10 * m, (16 + w * 14 + 20 * k) * m, 0, 6.29); c.stroke(); }
      }
      c.save(); c.shadowColor = hex(T.zolotoL, 0.9 * vsp); c.shadowBlur = 30 * vsp * m;
      figurka(c, g.p.x, g.p.y, 0, faza, T.zolotoL, r, a); c.restore();
      /* вспышка */
      var rg = c.createRadialGradient(g.p.x, g.p.y - 10 * m, 0, g.p.x, g.p.y - 10 * m, 90 * m * vsp + 1);
      rg.addColorStop(0, hex(T.zolotoL, 0.45 * vsp)); rg.addColorStop(1, hex(T.zolotoL, 0));
      c.fillStyle = rg; c.fillRect(g.p.x - 100 * m, g.p.y - 110 * m, 200 * m, 200 * m);
      /* искры */
      for (var s = 0; s < 14; s++) { var an = s * 0.449 + k * 1.3, dd = (20 + 70 * k) * m; c.fillStyle = hex(st.temaName === 'kosmos' ? T.violet : T.zoloto, 0.8 * (1 - k)); c.beginPath(); c.arc(g.p.x + Math.cos(an) * dd, g.p.y - 10 * m + Math.sin(an) * dd * 0.7, 1.6 * m, 0, 6.29); c.fill(); }
    } else {
      if (na) { c.save(); c.shadowColor = hex(T.zoloto, 0.7); c.shadowBlur = 12 * m; }
      figurka(c, g.p.x, g.p.y, g.ang * 0.6, faza, col, r, a);
      if (na) c.restore();
    }
    /* пунктир старой ветки после ухода: показывает, откуда ушёл */
    if (t > 5800 && t < 14000) {
      var ost = ease(lin(t, 5800, 7000)), q = tochka(HB, U_PER);
      c.strokeStyle = hex(T.vetkaL, 0.35 * ost); c.setLineDash([3 * m, 6 * m]); c.lineWidth = m;
      c.beginPath(); c.moveTo(q.x, q.y); var q2 = tochka(G, U_PER); c.lineTo(q2.x, q2.y); c.stroke(); c.setLineDash([]);
    }
  };
  VetkiAnim._chasticy = function (st, t) {
    var T = st.tema; if (!T.chastic) return;
    var c = st.ctx, sec = t / 1000, g = t > 5000 && t < 7000 ? geroyPoz(t).p : null;
    for (var i = 0; i < T.chastic; i++) {
      var p = st.ch[i], x = (p.x * W + sec * p.v) % W, y = p.y * H + Math.sin(sec * 0.6 + p.f) * 8, a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(sec * 1.7 + p.f * 3));
      if (g) { var dx = x - g.x, dy = y - g.y, d = Math.sqrt(dx * dx + dy * dy); if (d < 160) { var k = (160 - d) / 160 * Math.sin(lin(t, 5000, 7000) * Math.PI); x += dx / d * 40 * k; y += dy / d * 40 * k; a += 0.4 * k; } }
      c.fillStyle = hex(i % 3 === 0 ? T.violet : T.indigo, a); c.beginPath(); c.arc(x, y, p.r, 0, 6.29); c.fill();
    }
  };
  /* ===== Блок 4: плёнка кадров мечты вдоль золотой ветки, титр, экспорт ===== */
  var KADRY_U = [0.5, 0.58, 0.66, 0.74, 0.82, 0.9];
  function plenka(c, st, x, y, w, h, im, a, nomer) {
    var T = st.tema, m = R.lw, ph = 4 * m; /* перфорация */
    c.save(); c.globalAlpha = a;
    c.fillStyle = hex(T.ramka, 1); c.fillRect(x - 5 * m, y - ph - 6 * m, w + 10 * m, h + 2 * ph + 12 * m);
    c.strokeStyle = hex(T.zoloto, 0.85); c.lineWidth = m; c.strokeRect(x - 5 * m, y - ph - 6 * m, w + 10 * m, h + 2 * ph + 12 * m);
    c.fillStyle = hex(T.zolotoL, 0.7);
    for (var k = 0; k < 7; k++) { var px = x + 2 * m + k * (w - 4 * m) / 6; c.fillRect(px - 2 * m, y - ph - 3 * m, 4 * m, 3 * m); c.fillRect(px - 2 * m, y + h + m, 4 * m, 3 * m); }
    c.fillStyle = hex(T.fon, 1); c.fillRect(x, y, w, h);
    if (im && im.complete && im.naturalWidth) {
      var s = Math.max(w / im.naturalWidth, h / im.naturalHeight), iw = im.naturalWidth * s, ih = im.naturalHeight * s;
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); c.restore();
    } else {
      var gr = c.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, hex(T.zoloto, 0.35)); gr.addColorStop(1, hex(T.zoloto, 0.08));
      c.fillStyle = gr; c.fillRect(x, y, w, h);
    }
    c.restore();
  }
  VetkiAnim._kadryPlenka = function (st, t) {
    var c = st.ctx, T = st.tema, w = W * R.kadrW, h = w * 9 / 16, m = R.lw;
    for (var i = 0; i < 6; i++) {
      var k = ease(lin(t, 7000 + i * 600, 7700 + i * 600)); if (k <= 0) continue;
      var p = tochka(G, KADRY_U[i]), cx, cy;
      if (st.mobil) { /* два ряда по три над веером, точка на золотой ветке вспыхивает в момент кадра */
        var gap = (W - 3 * w) / 4; cx = gap + (i % 3) * (w + gap); cy = H * 0.145 + Math.floor(i / 3) * (h + 34);
        var vs = 1 - lin(t, 7700 + i * 600, 8600 + i * 600);
        c.fillStyle = hex(T.zolotoL, 0.35 * vs * k); c.beginPath(); c.arc(p.x, p.y, 16 * m, 0, 6.29); c.fill();
      } else {
        var verh = i % 2 === 0; cy = verh ? p.y - h - 46 : p.y + 46; cx = p.x - w / 2;
        c.strokeStyle = hex(T.zoloto, 0.6 * k); c.lineWidth = 1; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x, verh ? cy + h + 8 : cy - 8); c.stroke();
      }
      c.fillStyle = hex(T.zolotoL, 0.9 * k); c.beginPath(); c.arc(p.x, p.y, 3 * m, 0, 6.29); c.fill();
      var sc = 0.6 + 0.4 * k; c.save(); c.translate(cx + w / 2, cy + h / 2); c.scale(sc, sc); c.translate(-(cx + w / 2), -(cy + h / 2));
      plenka(c, st, cx, cy, w, h, st.kadry[i], k, i + 1); c.restore();
    }
  };
  function perenos(c, stroki, maks) { /* строки титра по ширине поля */
    var out = [];
    stroki.forEach(function (s, n) {
      var slova = s.split(' '), cur = '';
      slova.forEach(function (sl) { var p = cur ? cur + ' ' + sl : sl; if (cur && c.measureText(p).width > maks) { out.push([cur, n]); cur = sl; } else cur = p; });
      if (cur) out.push([cur, n]);
      var L = out.length; if (L > 1 && out[L-2][1] === n && cur.indexOf(' ') < 0) { var pr = out[L-2][0].split(' '); if (pr.length > 1) { var nov = [pr.pop()]; while (pr.length > 1 && pr[pr.length-1].length <= 3 && !/[,.;:]$/.test(pr[pr.length-1])) nov.unshift(pr.pop()); out[L-1][0] = nov.join(' ') + ' ' + cur; out[L-2][0] = pr.join(' '); } }   /* T19c: без слова-сироты и висячего союза в титре */
    });
    return out;
  }
  VetkiAnim._titr = function (st, t) {
    var c = st.ctx, T = st.tema, a = ease(lin(t, 11500, 12500)) * (1 - ease(lin(t, 14200, 15000)));
    if (a <= 0) return;
    var fz = R.titr, x = W * 0.5;
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = Math.round(fz * 0.15) + 'px';
    c.font = '700 ' + fz + 'px ' + st.shrift;
    var linii = perenos(c, st.titr, W * 0.9), shag = fz * 1.35, y0 = H * (st.mobil ? 0.79 : 0.81) - (linii.length - 1) * shag / 2;
    if (st.mobil) { /* подложка, чтобы титр читался поверх веток */
      var gr = c.createLinearGradient(0, y0 - shag, 0, y0 + linii.length * shag);
      gr.addColorStop(0, hex(T.fon, 0)); gr.addColorStop(0.25, hex(T.fon, 0.82 * a)); gr.addColorStop(0.75, hex(T.fon, 0.82 * a)); gr.addColorStop(1, hex(T.fon, 0));
      c.fillStyle = gr; c.fillRect(0, y0 - shag * 1.2, W, linii.length * shag + shag * 1.4);
    }
    c.shadowColor = hex(T.fon, 0.9); c.shadowBlur = 14 * R.lw;
    linii.forEach(function (l, i) {
      c.fillStyle = l[1] === 0 ? hex(T.tekst, 0.95 * a) : hex(T.zolotoL, a);
      c.fillText(l[0], x, y0 + i * shag + 6 * (1 - a));
    });
    c.restore(); c.letterSpacing = '0px';
  };
  VetkiAnim.TEMY = TEMY; VetkiAnim.LOOP = LOOP;
  window.VetkiAnim = VetkiAnim;
})();
