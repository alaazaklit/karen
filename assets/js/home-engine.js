/* ============================================================================
   KAREN K SANCTUARIES — HOMEPAGE ENGINE
   00 config / env      01 utils            02 loader & session
   03 nav mode          04 the cinema runner (one pinned stage, two control modes)
   05 hall (WebGL)      06 hall (calm)      07 atmosphere (suspended light)
   08 the passage       09 studio exit      10 selected projects
   11 the method        12 deep links

   THE CINEMA. Scenes 1–3 and the Studio band are layers of ONE pinned stage
   driven by ONE master progress p ∈ [0,1]:

     film ─── hold ─── A ─── arches ─── B ─── settle
     wings    hall     hall→arches      arches→studio

   The wings film is time-driven on a first visit (closed for CFG.hold, then
   one quintic opening), after which scroll drives the same p. Chapter changes
   are forward passages: the outgoing plate dollies toward its light aperture
   while the incoming chapter emerges through a growing soft aperture — no
   slide, no swap, no white veil. Requires jQuery and site.js loaded first.
   ==========================================================================*/
(function ($) {
'use strict';

/* ---------- 00 · config & environment ---------- */
var CFG = {
  hold: 2.0,                                   // seconds the wings stay closed once the intro is ready (as the original)
  openDur: 4.2,                                // seconds the opening takes, start to settled hall — one movement
  phases: { film: 1.2, hold: 0.4, transA: 1.3, arches: 1.3, transB: 1.3, settle: 0.6 },   // × viewport height
  /* the architectural sequence (image pixels, measured on the photographs). Each opening is a round-headed arch
     fitted to the real opening: the hall's lit end wall, the arches' far doorway. `pivot` is the vanishing point —
     the camera turns toward it and zooms about it; the arch grows about it. `dev` is the range of the arch's on-screen
     width (× the viewport's shorter side) over which the space beyond develops from light. */
  scenes: {
    open: [0.30, 0.90],                                   // the opening, within each passage (the text has left by 0.26)
    tint: [1.06, 1.02, 0.97],                             // the settled warm lift of the arches and the Studio
    hall: { pivot: [1098.9, 850], zoom: 2.2,
            arch: { c: [1098.9, 837.8], r: [125, 99], base: 942.5, pivot: [1098.9, 850], dev: [0.12, 0.55] } },
    arches: { pivot: [899.1, 541], rest: 1.05, read: 1.12, zoom: 2.0,
              arch: { c: [899.1, 455], r: [80.5, 49], base: 677.4, pivot: [899.1, 541], dev: [0.12, 0.36] },
              lights: [[0.20, 0.50, 0.08, 0.33, 0.925, 0.863, 0.745, 0.40], [0.80, 0.50, 0.08, 0.33, 0.925, 0.863, 0.745, 0.40]] },
    studio: { rest: 1.05,
              lights: [[0.85, 0.46, 0.06, 0.13, 0.953, 0.871, 0.706, 0.45], [0.44, 0.34, 0.05, 0.26, 0.941, 0.878, 0.761, 0.30], [0.58, 0.34, 0.04, 0.22, 0.941, 0.878, 0.761, 0.24]] }
  },
  mobilePinScale: 0.72,
  /* the closed wings fill `frame` of the screen's height. A landscape screen keeps them inside its width (at most `fitW`
     of it); a portrait screen lets them bleed off both sides (up to `bleedW` of its width), so a phone sees the same
     composition as the desktop through a narrower window instead of a small pair of wings in an empty hall */
  wing: { maxAngle: 1.05, maxShift: 1.55, bow: 0.42, frame: 0.70, fitW: 0.82, bleedW: 1.8 },
  camera: { start: 10, end: 5.6, fov: 42 },
  /* the depth stage: every plate covers the viewport at COVER units from the camera. The camera walks along -z:
     hall (z -6) → through its light slit → the arches (z -18.1) → through the far doorway → the Studio (z -30.2). */
  depth: { cover: 16, hall: -6, arches: -15.8, rimGap: 3.0, studio: -25.6, camHold: 5.6, camA1: -1.0, camQ1: -3.5, camB1: -10.8 },
  dprCap: 1.6
};
/* phase boundaries as fractions of the master progress */
var B = (function () {
  var ph = CFG.phases, tot = 0, k; for (k in ph) tot += ph[k];
  var acc = 0, out = { total: tot };
  ['film', 'hold', 'transA', 'arches', 'transB', 'settle'].forEach(function (name) {
    out[name + '0'] = acc / tot; acc += ph[name]; out[name + '1'] = acc / tot;
  });
  return out;
})();
var KK = window.__kk || {};
var reduceMotion = !!KK.reduceMotion;
var hasGsap = !!KK.hasGsap;
var lenis = KK.lenis || null;
var lockScroll = KK.lockScroll || function () {};
var isTouch = window.matchMedia('(pointer: coarse)').matches;
var isMobile = window.matchMedia('(max-width: 900px)').matches;
var $win = $(window), $html = $(document.documentElement);
var rect = KK.rect || function (el) { return $(el)[0].getBoundingClientRect(); };
/* a detached canvas (a texture or a sprite is painted into it; it never joins the page) */
function makeCanvas(w, h) { return $('<canvas></canvas>').attr({ width: w, height: h })[0]; }
var hasWebGL = (function () {
  try { var c = makeCanvas(1, 1);
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) { return false; }
})();
var cinematic = !reduceMotion && hasWebGL && typeof THREE !== 'undefined' && hasGsap;
if (!cinematic) $html.addClass('calm');
/* the depth stage needs textures WebGL may read: served over http(s) they are; opened from disk (file://) the plates
   come from cinema-assets.js as data URIs — decided once those assets have had their chance to load */
var gl3d = false;
var staticCinema = reduceMotion || !hasGsap;      // no pin, no passages: the chapters stand one beneath the other
if (staticCinema) $html.addClass('cine-static');
/* in the animated modes the three chapters' copy is lifted into #cine-copy (z 6, above every plate, light, mist and
   the atmosphere) so no heading, paragraph or label is ever behind a glow — during the passages included. Every script
   finds these blocks by id/class, never through their chapter, so nothing else changes. */
(function liftCopy() {
  if (staticCinema) return;
  var $top = $('#cine-copy'); if (!$top.length) return;
  $.each(['.gw-titles', '#ar-copy', '#st-copy'], function (i, sel) { $top.append($(sel).first()); });
})();

/* session: the full closed-wings introduction plays once per browser session.
   The inline <head> script already stamped html.gw-seen (from sessionStorage
   or a deep link) before first paint, so there is never a flash of closed
   wings on a revisit. Reduced motion never holds the visitor either. */
var seen = $html.hasClass('gw-seen') || reduceMotion;
function markSeen() { try { sessionStorage.setItem('kkIntro', '1'); } catch (e) {} }

var FILE_ASSETS = {
  wingL: 'assets/img/wings/wing-l.webp',     // the wing artwork with its transparency baked in
  wingR: 'assets/img/wings/wing-r.webp',
  reveal: 'assets/img/wings/open-full.jpg'
};
var ASSETS = window.KK_GATE || FILE_ASSETS;
/* Opened from disk (file://) every external image taints canvas/WebGL, so the wing
   textures exist as data URIs in gateway-assets.js — fetched ONLY in that case. */
var assetsReady = Promise.resolve();
/* inserted natively on purpose: jQuery's append() would fetch the script over XHR, which a file:// page cannot do */
function loadScript(src) { return new Promise(function (res) { var sc = $('<script></script>').on('load error', function () { res(); })[0]; sc.src = src; document.head.appendChild(sc); }); }
if (location.protocol === 'file:') {
  assetsReady = Promise.all([
    window.KK_GATE ? Promise.resolve() : loadScript('assets/js/gateway-assets.js'),
    window.KK_CINEMA ? Promise.resolve() : loadScript('assets/js/cinema-assets.js')
  ]).then(function () { if (window.KK_GATE) ASSETS = window.KK_GATE; });
}
assetsReady = assetsReady.then(function () {
  gl3d = cinematic && (location.protocol !== 'file:' || !!window.KK_CINEMA);
  if (gl3d) $html.addClass('cine-gl');
});
var CINE = function (key, path) { return (window.KK_CINEMA && window.KK_CINEMA[key]) || path; };

/* ---------- 01 · utils ---------- */
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function win(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
function ss(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function quintic(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function easeIn3(t) { return t * t * t; }
function easeOut3(t) { var u = 1 - t; return 1 - u * u * u; }
function vh(mult) { return Math.round(window.innerHeight * mult); }
function pinLen() {
  var mobile = window.innerWidth > 0 && window.innerWidth <= 900;
  return '+=' + vh(B.total * (mobile ? CFG.mobilePinScale : 1));
}
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function loadImg(src) {
  return new Promise(function (res, rej) { $('<img>').one('load', function () { res(this); }).one('error', rej).attr('src', src); });
}

/* ---------- 02 · loader ---------- */
var $loader = $('#loader');
var LOG = window.__kkTiming = { t0: performance.now() };
function mark(k) { LOG[k] = Math.round(performance.now() - LOG.t0); }
var loaderMin = new Promise(function (res) { setTimeout(res, seen ? 120 : 700); });
var criticalReady = assetsReady.then(function () {
  return Promise.all([document.fonts ? document.fonts.ready : Promise.resolve(), loadImg(ASSETS.reveal)]);
});
var gatewayReady, resolveGateway;
gatewayReady = new Promise(function (r) { resolveGateway = r; });
var loaderDone = Promise.all([loaderMin, criticalReady, gatewayReady]).then(function () {
  $loader.addClass('is-done');
  $('.fill-img, .st-img').each(function () { if (this.decode) this.decode().catch($.noop); });
}).catch(function () { $loader.addClass('is-done'); });
lockScroll(true);            // released by the cinema choreography
var gateReleased = false;
function gateRelease() { if (gateReleased) return; gateReleased = true; lockScroll(false); }
/* watchdog: whatever happens to WebGL, fonts or images, the page can never stay sealed */
setTimeout(function () { resolveGateway(); if (!gateReleased) { gateRelease(); $loader.addClass('is-done'); } }, 15000);

/* ---------- 03 · nav mode ---------- */
var $nav = $('#nav');
var navThreshold = Infinity;
function measureNav() {
  var $g = $('#cine-stage'), gate = window.__kkGate;
  var end = gate && gate.st ? gate.st.end : ($g.length ? $g[0].offsetHeight : 0);
  navThreshold = end + 2;                  // solid the moment the Studio frame starts to scroll away
}
function syncNav() {
  var solid = $win.scrollTop() > navThreshold;
  $nav.toggleClass('is-solid', solid).toggleClass('on-dark', !solid);
  $html.toggleClass('nav-solid', solid);
}
function setScrim(v) { $html.css('--scrim', v.toFixed(3)); }
if (hasGsap) {
  ScrollTrigger.create({ start: 0, end: 999999999, onUpdate: syncNav });
  ScrollTrigger.addEventListener('refresh', function () { measureNav(); syncNav(); });
} else $win.on('scroll', syncNav);
measureNav(); syncNav();

/* ==========================================================================
   04 · THE CINEMA RUNNER — one stage, one progress, two control modes.
   First visit: TIME drives p through the film (0 → B.film1): the wings stay
   closed for CFG.hold, then ONE tween with a quintic ease (zero velocity and
   acceleration at both ends) opens them by itself; the scroll stays sealed
   until the hall has settled. From then on SCROLL drives p through the pinned
   region; the hand-over places the scroll at the exact frame on screen, so the
   switch is invisible. Revisits and deep links start at the settled hall.
   ========================================================================*/
var applyCinema = null;      // assembled in §08 once the hall exists
/* a reload (or back/forward) returns the visitor to where they were — never a link from another page, never a #deep-link */
function navType() { try { var n = performance.getEntriesByType('navigation')[0]; return n ? n.type : ''; } catch (e) { return ''; } }
$win.on('pagehide', function () {
  try { sessionStorage.setItem('kkScroll', JSON.stringify({ path: location.pathname, y: $win.scrollTop() })); } catch (e) {}
});
function restorePosition() {
  var saved = null; try { saved = JSON.parse(sessionStorage.getItem('kkScroll') || 'null'); } catch (e) {}
  var t = navType();
  if (!saved || location.hash || saved.path !== location.pathname || (t !== 'reload' && t !== 'back_forward')) return;
  var gate = window.__kkGate; if (!gate || !gate.st) return;
  var y0 = gate.st.start + (gate.st.end - gate.st.start) * B.film1;
  if (!(saved.y > y0 + 4)) return;
  var y = Math.min(saved.y, $(document).height() - window.innerHeight);
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
  ScrollTrigger.update();
}
function runCinema(opts) {
  opts = opts || {};
  if (window.__kkGate) window.__kkGate.destroy();
  var stage = $('#cine-stage')[0];
  var P = { t: 0 }, tween = null, holdCall = null, mode = 'time';
  var st = ScrollTrigger.create({
    trigger: '#cinema', start: 'top top', end: pinLen,
    pin: stage, scrub: 0.35, anticipatePin: 1, refreshPriority: 10, invalidateOnRefresh: true,   // a short scrub smoothing on top of Lenis
    onUpdate: function (t) { if (mode === 'scroll') applyCinema(t.progress); }
  });
  function hand(p) {
    if (mode === 'scroll') return;
    mode = 'scroll';
    if (holdCall) { holdCall.kill(); holdCall = null; }
    if (tween) { tween.kill(); tween = null; }
    P.t = p; applyCinema(p);
    var y = st.start + (st.end - st.start) * p;
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
    ScrollTrigger.update();
    $win.off('wheel.kkSeal touchmove.kkSeal');
    gateRelease(); mark('scrollMode');
  }
  function play() {
    if (tween || mode !== 'time') return;
    mark('play');
    tween = gsap.to(P, { t: B.film1, duration: CFG.openDur, ease: quintic,
      onUpdate: function () { if (mode === 'time') applyCinema(P.t); },
      onComplete: function () { markSeen(); mark('complete'); hand(B.film1); } });
  }
  function freeze() { mode = 'debug'; if (holdCall) { holdCall.kill(); holdCall = null; } if (tween) tween.pause(); }
  function destroy() { freeze(); mode = 'dead'; try { st.kill(true); } catch (e) {} }
  function toStudio(immediate) {
    var y = st.end;
    if (lenis) lenis.scrollTo(y, immediate ? { immediate: true, force: true } : { duration: 1.6, force: true });
    else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
  }
  window.__kkGate = { st: st, destroy: destroy, hand: function () { if (mode === 'time') hand(P.t); }, toStudio: toStudio, mode: function () { return mode; } };
  window.__kkGatewayDebug = { apply: function (p) { freeze(); applyCinema(p); }, hold: freeze, B: B };
  applyCinema(0);
  if (seen) {
    ScrollTrigger.refresh(); markSeen(); hand(B.film1);
    restorePosition();
    if (opts.onSeen) opts.onSeen();
    return;
  }
  // The film is automatic: the page is sealed (lockScroll) from the first byte until
  // hand() releases it, and any native scroll gesture that could slip past the seal
  // (iOS rubber-banding, trackpad inertia) is swallowed while TIME still owns the wings.
  function seal(e) { if (mode === 'time') e.preventDefault(); }
  $win.on('wheel.kkSeal touchmove.kkSeal', seal);           // non-passive (site.js registers these two events so)
  loaderDone.then(function () {
    if (mode !== 'time') return;
    mark('loaderDone');
    holdCall = gsap.delayedCall(CFG.hold, play);
    // a navigation click during the film is the one thing that may cut it short:
    // the current frame is handed to the scroll so the link can take the visitor on
    $('#nav a, .skip-link').on('click', function () { if (mode === 'time') hand(P.t); });
  });
}

/* ==========================================================================
   05 · THE HALL — WebGL. Exactly two wings, preserved artwork.
   Exposes hall = { apply(pf), dolly(d), setHidden(bool) }.
   ========================================================================*/
var hall = null;
function initHallWebGL() {
  var canvas = $('#gw-canvas')[0];
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, failIfMajorPerformanceCaveat: false });
  renderer.setClearColor(0x1a130c, 1);
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(CFG.camera.fov, 1, 0.1, 60);
  camera.position.z = CFG.camera.start;
  var root = new THREE.Group(); scene.add(root);
  var wingsGroup = new THREE.Group(); root.add(wingsGroup);

  /* --- background: the architectural hall (Scene 2 lives behind the wings) --- */
  var texLoader = new THREE.TextureLoader();
  var bgTex = texLoader.load(ASSETS.reveal, sizeAll);
  bgTex.minFilter = THREE.LinearFilter;
  var bgMat = new THREE.MeshBasicMaterial({ map: bgTex, color: new THREE.Color(0.14, 0.13, 0.12), transparent: gl3d, depthWrite: false });   // replaced by the reveal material when the depth stage is built
  var bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bgMat);
  bgMesh.position.z = CFG.depth.hall;
  bgMesh.renderOrder = 30;
  scene.add(bgMesh);

  /* --- the depth stage: the arches and the Studio as plates in depth, each with its opening cut through --- */
  var D = CFG.depth, motes = null, comp = null;
  function loadTex(url, cb) { var t = texLoader.load(url, cb); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; }

  /* =====================================================================
     THE COMPOSITOR — one full-screen pass draws the whole architectural
     sequence: the space we are in (OUTER), the space beyond (INNER) and
     the opening between them. A parametric arch, fitted to the real
     opening of each photograph, grows from its vanishing point; inside it
     the next space is born as light and develops (shadows first) as the
     arch sweeps past the frame. Every image is always framed to cover the
     viewport (its edges can never be seen), there is no plate sorting, no
     transparency stack, no mask texture — so collisions, seams, gaps and
     flashes are structurally impossible.
     ===================================================================*/
  if (gl3d) {
    comp = (function () {
      var texHall = bgTex;
      var texArch = loadTex(CINE('archesFull', 'assets/img/home/arches-1800.jpg'));
      var texStud = loadTex(CINE('studio', 'assets/img/home/studio-1800.jpg'));
      var V3 = function (a) { return new THREE.Vector3(a[0], a[1], a[2]); };
      var V4 = function () { return new THREE.Vector4(0, 0, 1, 1); };
      var u = {
        uRes: { value: new THREE.Vector2(1, 1) },
        tOut: { value: texHall }, tIn: { value: texArch },
        uOutSize: { value: new THREE.Vector2(2200, 1232) }, uInSize: { value: new THREE.Vector2(1800, 1008) },
        uOutSpan: { value: new THREE.Vector2(1, 1) }, uInSpan: { value: new THREE.Vector2(1, 1) },
        uOutF: { value: new THREE.Vector2(0.5, 0.5) }, uOutQ: { value: new THREE.Vector2(0.5, 0.5) }, uOutS: { value: 1 },
        uInF: { value: new THREE.Vector2(0.5, 0.5) }, uInQ: { value: new THREE.Vector2(0.5, 0.5) }, uInS: { value: 1 },
        uOutTint: { value: V3([1, 1, 1]) }, uInTint: { value: V3([1, 1, 1]) },
        uOutL: { value: [V4(), V4(), V4()] }, uOutLC: { value: [V4(), V4(), V4()] },
        uInL: { value: [V4(), V4(), V4()] }, uInLC: { value: [V4(), V4(), V4()] },
        uPortal: { value: 0 }, uArchC: { value: new THREE.Vector2(0, 0) }, uArchR: { value: new THREE.Vector2(1, 1) }, uArchBase: { value: 0 },
        uPivot: { value: new THREE.Vector2(0, 0) }, uG: { value: 0 }, uPx: { value: 1 }, uFeather: { value: 1.5 },
        uBirth: { value: 0 }, uDev: { value: 0 }, uLight: { value: V3([1.045, 0.95, 0.735]) }, uEdgeDebug: { value: 0 }
      };
      var frag = [
        'precision highp float;',
        'uniform vec2 uRes; uniform sampler2D tOut; uniform sampler2D tIn;',
        'uniform vec2 uOutSize, uInSize, uOutSpan, uInSpan, uOutF, uOutQ, uInF, uInQ; uniform float uOutS, uInS;',
        'uniform vec3 uOutTint, uInTint; uniform vec4 uOutL[3]; uniform vec4 uOutLC[3]; uniform vec4 uInL[3]; uniform vec4 uInLC[3];',
        'uniform float uPortal; uniform vec2 uArchC, uArchR, uPivot; uniform float uArchBase, uG, uPx, uFeather;',
        'uniform float uBirth, uDev; uniform vec3 uLight; uniform float uEdgeDebug;',
        'float outside(vec2 t){ return step(0.5, float(any(lessThan(t, vec2(-0.0005)))) + float(any(greaterThan(t, vec2(1.0005))))); }',
        'vec3 lights(vec3 c, vec2 t, vec4 L[3], vec4 LC[3]){',
        '  for (int i = 0; i < 3; i++) { vec2 d = (t - L[i].xy) / L[i].zw; float f = exp(-dot(d, d) * 2.2) * LC[i].w; c = 1.0 - (1.0 - c) * (1.0 - LC[i].rgb * f); }',
        '  return c; }',
        'vec3 shoulder(vec3 x){ vec3 k = 0.82 + 0.16 * (1.0 - exp(-(x - 0.82) / 0.16)); return mix(x, k, step(0.82, x)); }',
        // round-headed arch with an elliptical head (y down, image px): exact where it matters for the edge
        'float archCover(vec2 p, float g, float f, float fb){ vec2 q = p - uArchC;',
        '  if (q.y < 0.0) { float k0 = length(q / uArchR); float k1 = length(q / (uArchR * uArchR)); float d = k0 * (k0 - 1.0) / max(k1, 1e-5);',
        '    return 1.0 - smoothstep(-f, f, d * g * uPx); }',
        '  float side = 1.0 - smoothstep(-f, f, (abs(q.x) - uArchR.x) * g * uPx);',
        '  float base = 1.0 - smoothstep(-fb, fb, (q.y - (uArchBase - uArchC.y)) * g * uPx);',
        '  return side * base; }',
        'void main(){',
        '  vec2 scr = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);',
        '  vec2 to = uOutF + (scr - uOutQ) * uOutSpan / uOutS;',
        '  vec3 co = texture2D(tOut, vec2(to.x, 1.0 - to.y)).rgb * uOutTint;',
        '  co = lights(co, to, uOutL, uOutLC);',
        '  vec3 col = co; float bad = outside(to);',
        '  if (uPortal > 0.5) {',
        '    vec2 pp = uPivot + (to * uOutSize - uPivot) / uG;',
        '    float f = mix(uFeather * 3.2, uFeather, uDev);',                     // a glow while it is light, a fine threshold once resolved
        '    float m = archCover(pp, uG, f, uFeather * 11.0);',
        '    if (m > 0.0) {',
        '      vec2 ti = uInF + (scr - uInQ) * uInSpan / uInS;',
        '      vec3 ci = texture2D(tIn, vec2(ti.x, 1.0 - ti.y)).rgb * uInTint;',
        '      ci = lights(ci, ti, uInL, uInLC);',
        '      float lum = dot(ci, vec3(0.2126, 0.7152, 0.0722));',
        '      float th = 0.6 * clamp(lum, 0.0, 1.0);',
        '      vec2 rp = (to * uOutSize - uPivot) / (uArchR * uG);',
        '      vec3 light = uLight * (0.965 + 0.05 * exp(-dot(rp, rp) * 0.8));',
        '      ci = mix(light, ci, smoothstep(th, th + 0.4, uDev));',             // develops from light, shadows first
        '      ci = mix(co, ci, uBirth);',                                    // the opening is born inside the outer light
        '      col = mix(co, ci, m);',
        '      bad = max(bad * (1.0 - step(0.999, m)), outside(ti) * step(0.001, m));',
        '    }',
        '  }',
        '  col = shoulder(col);',
        '  if (uEdgeDebug > 0.5 && bad > 0.5) col = vec3(1.0, 0.0, 1.0);',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'].join('\n');
      var mat = new THREE.ShaderMaterial({ uniforms: u, depthTest: false, depthWrite: false, transparent: false,
        vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: frag });
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
      var mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = -100; scene.add(mesh);
      var tex = { hall: texHall, arches: texArch, studio: texStud };
      var size = { hall: [2200, 1232], arches: [1800, 1008], studio: [1800, 1008] };
      var ready = function (k) { var i = tex[k].image; return !!(i && i.width); };
      return { u: u, tex: tex, size: size, ready: ready, mesh: mesh };
    })();
    bgMesh.visible = false;                       // the compositor draws the hall

    /* --- light suspended in the space: motes and sparks between the plates, in true depth --- */
    motes = (function () {
      var N = isMobile ? 170 : 340, pos = new Float32Array(N * 3), size = new Float32Array(N), phase = new Float32Array(N), kind = new Float32Array(N), speed = new Float32Array(N), rise = new Float32Array(N);
      for (var i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 20; pos[i * 3 + 1] = (Math.random() - 0.5) * 14; pos[i * 3 + 2] = 9 - Math.random() * 44;
        var sp = Math.random() < 0.18;
        size[i] = sp ? 0.55 + Math.random() * 0.5 : 0.35 + Math.random() * 0.85; phase[i] = Math.random() * 6.283; kind[i] = sp ? 1 : 0;
        speed[i] = sp ? 1.0 + Math.random() * 1.3 : 0.4 + Math.random() * 0.7;
        rise[i] = sp ? 0.26 + Math.random() * 0.34 : 0.18 + Math.random() * 0.40;   // every point drifts; none is ever steady
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1)); geo.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
      geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1)); geo.setAttribute('aRise', new THREE.BufferAttribute(rise, 1));
      var motesVert = [
          'uniform float uTime; uniform float uPixel;',
          'attribute float aSize; attribute float aPhase; attribute float aKind; attribute float aSpeed; attribute float aRise;',
          'varying float vAlpha; varying float vKind;',
          'void main(){',
          '  vec3 p = position; float t = uTime;',
          '  p.y = mod(p.y + t * aRise + 7.0, 14.0) - 7.0;',
          '  p.x += sin(t * (0.10 + 0.09 * fract(aPhase)) + aPhase) * (0.34 + 0.30 * fract(aPhase * 1.7));',
          '  p.z += cos(t * (0.07 + 0.06 * fract(aPhase * 2.3)) + aPhase * 1.7) * 0.26;',
          '  vec4 mv = modelViewMatrix * vec4(p, 1.0); float dist = -mv.z;',
          '  float tw = 0.5 + 0.5 * sin(t * aSpeed + aPhase);',
          '  float edge = smoothstep(7.0, 5.6, abs(p.y));',
          '  float nearF = smoothstep(0.35, 2.6, dist); float farF = 1.0 - smoothstep(24.0, 42.0, dist);',
          '  vAlpha = (aKind > 0.5 ? tw * tw : 0.55 + 0.45 * tw) * edge * nearF * farF;',
          '  vKind = aKind;',
          '  gl_PointSize = clamp(aSize * uPixel * 30.0 / max(dist, 0.3), 1.0, 44.0 * uPixel);',
          '  gl_Position = projectionMatrix * mv;',
          '}'].join('\n');
      var motesFrag = [
          'uniform float uOpacity; uniform vec3 uColor; varying float vAlpha; varying float vKind;',
          'void main(){',
          '  vec2 c = gl_PointCoord - 0.5; float r = length(c) * 2.0;',
          '  float disc = exp(-r * r * 4.2);',
          '  float rays = 0.0;',
          '  if (vKind > 0.5) { float ax = abs(c.x), ay = abs(c.y); rays = (exp(-ay * 70.0) * (1.0 - smoothstep(0.0, 0.5, ax)) + exp(-ax * 70.0) * (1.0 - smoothstep(0.0, 0.5, ay))) * 0.55; }',
          '  float a = (disc * (vKind > 0.5 ? 0.9 : 0.5) + rays) * vAlpha * uOpacity;',
          '  if (a < 0.004) discard;',
          '  gl_FragColor = vec4(uColor, a);',
          '}'].join('\n');
      function motesMaterial(color) { return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false,
        uniforms: { uTime: { value: 0 }, uPixel: { value: 1 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Vector3(color[0], color[1], color[2]) } },
        vertexShader: motesVert, fragmentShader: motesFrag }); }
      var mat = motesMaterial([0.975, 0.935, 0.84]);
      var pts = new THREE.Points(geo, mat); pts.renderOrder = 40; pts.frustumCulled = false; scene.add(pts);
      /* the glitter: tiny bright glints, quick twinkle, between the hall and the arches only (sections 2 and 3) */
      var G = isMobile ? 120 : 240, gp = new Float32Array(G * 3), gs = new Float32Array(G), gph = new Float32Array(G), gk = new Float32Array(G), gsp = new Float32Array(G), gr = new Float32Array(G);
      for (var j = 0; j < G; j++) {
        gp[j * 3] = (Math.random() - 0.5) * 18; gp[j * 3 + 1] = (Math.random() - 0.5) * 13; gp[j * 3 + 2] = 6 - Math.random() * 30;
        gs[j] = 0.55 + Math.random() * 0.55; gph[j] = Math.random() * 6.283; gk[j] = 1; gsp[j] = 1.4 + Math.random() * 1.9; gr[j] = 0.22 + Math.random() * 0.40;
      }
      var ggeo = new THREE.BufferGeometry();
      ggeo.setAttribute('position', new THREE.BufferAttribute(gp, 3)); ggeo.setAttribute('aSize', new THREE.BufferAttribute(gs, 1));
      ggeo.setAttribute('aPhase', new THREE.BufferAttribute(gph, 1)); ggeo.setAttribute('aKind', new THREE.BufferAttribute(gk, 1));
      ggeo.setAttribute('aSpeed', new THREE.BufferAttribute(gsp, 1)); ggeo.setAttribute('aRise', new THREE.BufferAttribute(gr, 1));
      var gmat = motesMaterial([0.90, 0.74, 0.44]);   // gold, so it reads on limestone and glows in the shadows
      var gpts = new THREE.Points(ggeo, gmat); gpts.renderOrder = 41; gpts.frustumCulled = false; scene.add(gpts);
      return { mat: mat, gmat: gmat };
    })();
  }
  /* ---------- the sequence: every space's framing is a function of the scroll progress ---------- */
  var SC = CFG.scenes;
  function spanOf(k) { var sz = comp.size[k], ia = sz[0] / sz[1], va = (canvas.clientWidth || window.innerWidth) / (canvas.clientHeight || window.innerHeight);
    return [Math.min(1, va / ia), Math.min(1, ia / va)]; }
  function coverPx(k) { var sz = comp.size[k], w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight; return Math.max(w / sz[0], h / sz[1]); }
  // screen <-> image, for a framing {F, Q, S}: image = F + (screen - Q) * span / S
  function scrOf(k, fr, img) { var sp = spanOf(k); return [fr.Q[0] + (img[0] - fr.F[0]) * fr.S / sp[0], fr.Q[1] + (img[1] - fr.F[1]) * fr.S / sp[1]]; }
  function imgOf(k, fr, sc) { var sp = spanOf(k); return [fr.F[0] + (sc[0] - fr.Q[0]) * sp[0] / fr.S, fr.F[1] + (sc[1] - fr.Q[1]) * sp[1] / fr.S]; }
  // keep an image covering the frame: its edges can never enter the viewport
  function clampQ(k, fr) { var sp = spanOf(k), S = Math.max(fr.S, 1);
    for (var i = 0; i < 2; i++) { var lo = 1 - (1 - fr.F[i]) * S / sp[i], hi = fr.F[i] * S / sp[i]; fr.Q[i] = clamp(fr.Q[i], Math.min(lo, hi), Math.max(lo, hi)); }
    fr.S = S; return fr; }
  function restFrame(k, pos) { var sp = spanOf(k); var F = [(1 - sp[0]) * pos[0] + 0.5 * sp[0], (1 - sp[1]) * pos[1] + 0.5 * sp[1]]; return { F: F, Q: [0.5, 0.5], S: 1 }; }
  function refocus(k, fr, img) { return { F: [img[0], img[1]], Q: scrOf(k, fr, img), S: fr.S }; }
  function logLerp(a, b, t) { return Math.exp(lerp(Math.log(a), Math.log(b), t)); }
  function zc(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }                 // a walk: gathers pace, keeps it
  function settle(t) { t = clamp(t, 0, 1); var v = 1 - t; return 1 - v * v * v; }    // an arrival: decelerates into rest

  function hallFrame(P) {
    var fr = { F: [0.5, 0.5], Q: [0.5, 0.5], S: (CFG.camera.start + 6) / (S.camZ + 6) };   // the film's own dolly, unchanged
    if (!(P.a > 0)) return fr;
    var rest = { F: [0.5, 0.5], Q: [0.5, 0.5], S: (CFG.camera.start + 6) / (CFG.camera.end + 6) };
    var o = [SC.hall.pivot[0] / comp.size.hall[0], SC.hall.pivot[1] / comp.size.hall[1]];
    var f = refocus('hall', rest, o);
    var target = scrOf('arches', archFrame(P), [SC.arches.pivot[0] / comp.size.arches[0], SC.arches.pivot[1] / comp.size.arches[1]]);
    var r = zc(P.a / SC.open[0]);                                                     // turn toward the opening while approaching it
    f.Q = [lerp(f.Q[0], target[0], r), lerp(f.Q[1], target[1], r)];
    f.S = rest.S * Math.pow(SC.hall.zoom, zc(P.a));
    return clampQ('hall', f);
  }
  function archFrame(P) {
    var rest = restFrame('arches', [0.5, 0.5]);
    var o = [SC.arches.pivot[0] / comp.size.arches[0], SC.arches.pivot[1] / comp.size.arches[1]];
    var f = refocus('arches', rest, o);
    var s0 = SC.arches.rest, s1 = SC.arches.read;
    if (P.b > 0) f.S = s1 * Math.pow(SC.arches.zoom, zc(P.b));
    else if (P.q > 0) f.S = lerp(s0, s1, zc(P.q));
    else f.S = lerp(1, s0, settle((P.a - SC.open[0]) / (1 - SC.open[0])));
    return clampQ('arches', f);
  }
  function studFrame(P) {
    var f = restFrame('studio', [isMobile ? 0.78 : 0.62, 0.5]);   // phones frame the far arch with the Burj Khalifa in view
    f.S = lerp(1, SC.studio.rest, settle((P.b - SC.open[0]) / (1 - SC.open[0])));
    return clampQ('studio', f);
  }
  // does the arch (grown by g about its pivot) contain the whole frame of the outer image?
  function sdArchJS(A, p) { var qx = p[0] - A.c[0], qy = p[1] - A.c[1];
    if (qy < 0) { var k0 = Math.hypot(qx / A.r[0], qy / A.r[1]), k1 = Math.hypot(qx / (A.r[0] * A.r[0]), qy / (A.r[1] * A.r[1])); return k0 * (k0 - 1) / Math.max(k1, 1e-5); }
    return Math.max(Math.abs(qx) - A.r[0], qy - (A.base - A.c[1])); }
  function covers(k, fr, A, g) { var sz = comp.size[k], corners = [[0, 0], [1, 0], [0, 1], [1, 1]];
    for (var i = 0; i < 4; i++) { var im = imgOf(k, fr, corners[i]), p = [im[0] * sz[0], im[1] * sz[1]];
      var pp = [A.pivot[0] + (p[0] - A.pivot[0]) / g, A.pivot[1] + (p[1] - A.pivot[1]) / g];
      if (sdArchJS(A, pp) * g > -4) return false; }
    return true; }
  function gCover(k, fr, A) { var lo = 1, hi = 400; for (var i = 0; i < 28; i++) { var mid = Math.sqrt(lo * hi); if (covers(k, fr, A, mid)) hi = mid; else lo = mid; } return hi; }
  function sceneLights(k) { return SC[k].lights || []; }
  function bindScene(side, k, fr) {
    var u = comp.u, sp = spanOf(k), tint = k === 'hall' ? hallTint : SC.tint;
    u['t' + side].value = comp.tex[k];
    u['u' + side + 'Size'].value.set(comp.size[k][0], comp.size[k][1]);
    u['u' + side + 'Span'].value.set(sp[0], sp[1]);
    u['u' + side + 'F'].value.set(fr.F[0], fr.F[1]); u['u' + side + 'Q'].value.set(fr.Q[0], fr.Q[1]); u['u' + side + 'S'].value = fr.S;
    u['u' + side + 'Tint'].value.set(tint[0], tint[1], tint[2]);
    var L = sceneLights(k);
    for (var i = 0; i < 3; i++) { var l = L[i];
      if (l) { u['u' + side + 'L'].value[i].set(l[0], l[1], l[2], l[3]); u['u' + side + 'LC'].value[i].set(l[4], l[5], l[6], l[7]); }
      else u['u' + side + 'LC'].value[i].set(0, 0, 0, 0); }
  }
  var hallTint = [1, 1, 1], compState = {};
  function passagePortal(P, t, outK, outFr, inK, A) {
    // t: progress through the opening window (0..1). The arch is born at the vanishing point, grows, sweeps past the frame.
    var endFr = outK === 'hall' ? hallFrame({ a: SC.open[1], b: 0, q: 0 }) : archFrame({ a: 1, q: 1, b: SC.open[1] });
    var gEnd = gCover(outK, endFr, A) * 1.08;
    var g = Math.max(1e-3, gEnd * Math.pow(t, 1.6));
    var full = t >= 1 || covers(outK, outFr, A, g);
    var vw = canvas.clientWidth || window.innerWidth, vh = canvas.clientHeight || window.innerHeight;
    var archScreen = 2 * A.r[0] * g * coverPx(outK) * outFr.S / Math.min(vw, vh);
    return { g: g, full: full, birth: ss(0, 0.12, t), dev: ss(A.dev[0], A.dev[1], archScreen) };
  }
  function updateComp() {
    if (!comp) return;
    var P = S.passage || {}; P = { a: P.a || 0, q: P.q || 0, b: P.b || 0 };
    var u = comp.u, open = SC.open, st = { outK: 'hall', inK: null };
    var hF = hallFrame(P), aF = archFrame(P), sF = studFrame(P);
    var tA = clamp((P.a - open[0]) / (open[1] - open[0]), 0, 1), tB = clamp((P.b - open[0]) / (open[1] - open[0]), 0, 1);
    var pA = P.a > open[0] && P.b <= 0 ? passagePortal(P, tA, 'hall', hF, 'arches', SC.hall.arch) : null;
    var pB = P.b > open[0] ? passagePortal(P, tB, 'arches', aF, 'studio', SC.arches.arch) : null;
    // an opening may only begin once the space beyond has loaded — never a half-drawn frame
    if (pA && !comp.ready('arches')) pA = null;
    if (pB && !comp.ready('studio')) pB = null;
    var outK, outFr, inK = null, inFr = null, portal = null, A = null;
    if (P.b > 0) {
      if (pB && pB.full) { outK = 'studio'; outFr = sF; }
      else { outK = 'arches'; outFr = aF; if (pB) { inK = 'studio'; inFr = sF; portal = pB; A = SC.arches.arch; } }
    } else if (P.q > 0 || (pA && pA.full) || P.a >= 1) { outK = 'arches'; outFr = aF; }
    else { outK = 'hall'; outFr = hF; if (pA) { inK = 'arches'; inFr = aF; portal = pA; A = SC.hall.arch; } }
    bindScene('Out', outK, outFr);
    if (inK) bindScene('In', inK, inFr);
    u.uPortal.value = portal ? 1 : 0;
    if (portal) {
      u.uArchC.value.set(A.c[0], A.c[1]); u.uArchR.value.set(A.r[0], A.r[1]); u.uArchBase.value = A.base;
      u.uPivot.value.set(A.pivot[0], A.pivot[1]); u.uG.value = portal.g;
      u.uPx.value = coverPx(outK) * outFr.S * renderer.getPixelRatio();
      u.uFeather.value = Math.max(1.4, 0.0022 * u.uRes.value.y);
      u.uBirth.value = portal.birth; u.uDev.value = portal.dev;
    }
    compState = { outK: outK, inK: inK, g: portal ? portal.g : 0, dev: portal ? portal.dev : 0, outS: outFr.S, inS: inFr ? inFr.S : 0 };
    if (motes) { motes.mat.uniforms.uOpacity.value = S.passage.motes || 0; motes.gmat.uniforms.uOpacity.value = S.passage.glitter || 0; }
  }
  window.__kkComp = { state: function () { return compState; }, debugEdges: function (on) { if (comp) comp.u.uEdgeDebug.value = on ? 1 : 0; } };

  /* --- central shaft of light --- */
  function gradTex() {
    var c = makeCanvas(128, 512);
    var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(236,206,150,0)'); g.addColorStop(.5, 'rgba(236,206,150,.85)'); g.addColorStop(1, 'rgba(236,206,150,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 512);
    var v = x.createLinearGradient(0, 0, 0, 512);
    v.addColorStop(0, 'rgba(26,19,12,1)'); v.addColorStop(.22, 'rgba(26,19,12,0)');
    v.addColorStop(.78, 'rgba(26,19,12,0)'); v.addColorStop(1, 'rgba(26,19,12,1)');
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = v; x.fillRect(0, 0, 128, 512);
    return new THREE.CanvasTexture(c);
  }
  var shaftMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 7.5),
    new THREE.MeshBasicMaterial({ map: gradTex(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  shaftMesh.position.z = -2.5;
  shaftMesh.renderOrder = 33;                                  // the seam light sits between the hall and the wings
  root.add(shaftMesh);

  /* --- wing shader: hinge-curl opening, feather-band timing, lifted materials --- */
  var wingVert = [
    'uniform float uOpen;', 'uniform float uSide;', 'uniform float uTension;',
    'uniform float uTime;', 'uniform float uCalm;', 'uniform float uBow;',
    'uniform float uMaxAngle;', 'uniform float uBandPhase;',
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = uv;',
    '  float dist = (uSide < 0.0) ? (1.0 - uv.x) : uv.x;',
    '  vec3 p = position;',
    '  p.x += uSide * uTension * 0.06 * dist;',
    '  p.z += sin(uTime * 1.4 + uv.y * 7.0 + dist * 3.0) * 0.010 * uCalm * dist;',
    '  p.z += sin(uTime * 0.34 + uBandPhase + uv.y * 2.2) * 0.009 * uCalm * dist;',
    '  p.x += uSide * sin(uTime * 0.27 + uBandPhase) * 0.010 * uCalm * dist;',
    '  p.x += uSide * sin(uTime * 0.42 + uBandPhase * 0.6) * 0.016 * (1.0 - dist) * uCalm;',
    '  p.y += sin(uTime * 0.23 + uBandPhase + dist * 2.4) * 0.008 * uCalm * dist;',
    '  float ang = uOpen * uMaxAngle * smoothstep(0.0, 1.0, dist);',
    '  float hx  = uSide * 0.5;',
    '  float dx  = p.x - hx;',
    '  p.x = hx + dx * cos(ang * uSide * -1.0);',
    '  p.z += dx * sin(ang) * -uSide;',
    '  p.z += sin(dist * 3.14159 * 0.5) * uBow * uOpen;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
    '}'].join('\n');

  var wingFrag = [
    'uniform sampler2D map;', 'uniform float uLight;', 'uniform float uSide;',
    'uniform float uBandLo;', 'uniform float uBandHi;', 'uniform float uExpo;',
    'varying vec2 vUv;',
    'void main(){',
    '  vec4 tex = texture2D(map, vUv);',
    '  float dist = (uSide < 0.0) ? (1.0 - vUv.x) : vUv.x;',
    '  float band = smoothstep(uBandLo - 0.08, uBandLo, dist) * (1.0 - smoothstep(uBandHi, uBandHi + 0.08, dist));',
    '  float a = tex.a * band;',
    '  a *= smoothstep(0.0, max(0.05 * uLight, 0.002), dist + 0.001);',
    '  a *= smoothstep(0.0, 0.02, vUv.y);',
    '  if (a < 0.01) discard;',
    // material lift: shadows opened a touch (gamma) and a soft key from above —
    // more feather detail reads, without the wing ever going pale
    '  vec3 base = pow(tex.rgb, vec3(0.88)) * uExpo;',
    '  base *= 1.0 + 0.10 * (1.0 - vUv.y);',
    '  float rim = (1.0 - dist);',
    // the inner-edge light is champagne, never white, and stays restrained as the wings leave
    '  vec3 col = base + vec3(0.90, 0.74, 0.46) * uLight * pow(rim, 2.6) * 0.30;',
    // a warm ceiling: the lit feathers can glow champagne, never flare to white
    '  col = min(col, vec3(0.96, 0.89, 0.72));',
    '  gl_FragColor = vec4(col, a);',
    '}'].join('\n');

  var wings = { L: null, R: null };
  var uniformSets = [];
  function buildWing(side, img, aspect) {
    var group = new THREE.Group();
    var tex = new THREE.Texture(img);
    tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
    var H = 2.0, W = H * aspect;
    var geo = new THREE.PlaneGeometry(W, H, 42, 56);
    [{ lo: 0.0, hi: 0.45, delay: 0.0, z: 0.03, phase: 0.0 }, { lo: 0.45, hi: 1.01, delay: 0.16, z: 0, phase: 1.9 }]
      .forEach(function (band) {
        var u = {
          map: { value: tex }, uOpen: { value: 0 }, uSide: { value: side },
          uTension: { value: 0 }, uTime: { value: 0 }, uCalm: { value: 1 },
          uBow: { value: CFG.wing.bow }, uMaxAngle: { value: CFG.wing.maxAngle },
          uBandPhase: { value: band.phase }, uLight: { value: 0 }, uExpo: { value: 1.18 },
          uBandLo: { value: band.lo }, uBandHi: { value: band.hi }
        };
        u._delay = band.delay; u._side = side;
        var mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
          uniforms: u, vertexShader: wingVert, fragmentShader: wingFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide
        }));
        mesh.position.z = band.z;
        mesh.renderOrder = 34;                                   // above the hall plate (30): the wings are the foreground
        group.add(mesh);
        uniformSets.push(u);
      });
    group.position.x = side * (W / 2 - 0.012);
    wingsGroup.add(group);
    return { group: group, width: W };
  }

  /* --- scene state, driven by the choreography --- */
  var S = { open: 0, tension: 0, camZ: CFG.camera.start, bright: 0.16, shaft: 0, sep: 0, lift: 0, exit: 0, light: 0, calm: 1, drift: 0, dolly: 0, hidden: false,
    passage: { a: 0, b: 0, cam: null, motes: 0, glitter: 0, walk: 0 } };
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!isTouch) {
    $win.on('pointermove', function (e) {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    });
  }

  function sizeAll() {
    var w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CFG.dprCap));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    var vFov = CFG.camera.fov * Math.PI / 180;
    var viewH = 2 * Math.tan(vFov / 2) * CFG.camera.start, viewW = viewH * camera.aspect;
    var maxW = lerp(CFG.wing.fitW, CFG.wing.bleedW, ss(1.0, 0.75, camera.aspect));   // square → 4:5 portrait: fit → bleed
    var s = Math.min((viewH * CFG.wing.frame) / 2.0, (viewW * maxW) / 2.6);
    root.scale.setScalar(s);
    var bgDist = CFG.camera.start + 6;
    var bgH = 2 * Math.tan(vFov / 2) * bgDist, bgW = bgH * camera.aspect;
    var img = bgTex.image;
    if (img && img.width) {
      var cover = Math.max(bgW / (img.width / img.height), bgH);
      bgMesh.scale.set(cover * (img.width / img.height), cover, 1);
      bgMesh.userData.pw = bgMesh.scale.x; bgMesh.userData.ph = bgMesh.scale.y;
    } else bgMesh.scale.set(bgW * 1.2, bgH * 1.2, 1);
    if (gl3d && comp) {
      comp.u.uRes.value.set(Math.max(1, Math.round(w * renderer.getPixelRatio())), Math.max(1, Math.round(h * renderer.getPixelRatio())));
      if (motes) motes.mat.uniforms.uPixel.value = motes.gmat.uniforms.uPixel.value = Math.min(window.devicePixelRatio || 1, CFG.dprCap);
    }
  }
  $win.on('resize', sizeAll);
  if (window.ResizeObserver) new ResizeObserver(sizeAll).observe(canvas);

  /* --- angelic dust in the seam light (2D canvas, same frame loop) --- */
  var dust = (function () {
    var cv = $('#gw-dust')[0]; if (!cv) return null;
    var dctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = 0, H = 0, motes = [];
    var sprite = makeCanvas(32, 32);
    var sx = sprite.getContext('2d');
    var g = sx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(246,234,212,.9)'); g.addColorStop(.4, 'rgba(241,228,204,.35)'); g.addColorStop(1, 'rgba(241,228,204,0)');
    sx.fillStyle = g; sx.fillRect(0, 0, 32, 32);
    function size() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; dctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function spawn() {
      var depth = 0.35 + Math.random() * 0.65, fleck = Math.random() < 0.12;
      return { x: W / 2 + (Math.random() - 0.5) * W * 0.08, y: H * (0.22 + Math.random() * 0.6),
        vx: (Math.random() - 0.5) * 0.08, vy: fleck ? (0.05 + Math.random() * 0.09) * depth : -(0.05 + Math.random() * 0.16) * depth,
        depth: depth, fleck: fleck, rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.01,
        r: (fleck ? 1.6 : 0.9 + Math.random() * 2.4) * depth, phase: Math.random() * Math.PI * 2, life: 0, span: 7 + Math.random() * 8 };
    }
    var count = isMobile ? 30 : 64;
    function draw(t, open, exit) {
      var intensity = Math.max(Math.min(open * 2.2, 1), 0.05) * (1 - exit * 0.9);
      if (intensity < 0.02) { if (motes.length) { dctx.clearRect(0, 0, W, H); motes.length = 0; } return; }
      if (!W) size();
      while (motes.length < count * intensity) motes.push(spawn());
      dctx.clearRect(0, 0, W, H);
      for (var i = motes.length - 1; i >= 0; i--) {
        var m = motes[i];
        m.life += 0.016;
        m.x += m.vx + (m.x < W / 2 ? -1 : 1) * open * 0.22 * m.depth;
        m.y += m.vy + Math.sin(t * 0.7 + m.phase) * 0.05;
        var fade = Math.sin(Math.min(m.life / m.span, 1) * Math.PI);
        var tw = 0.55 + 0.45 * Math.sin(t * 1.4 + m.phase * 3);
        var a = fade * tw * intensity * 0.7;
        if (m.life > m.span || m.y < -8 || m.y > H + 8 || m.x < -8 || m.x > W + 8) { motes[i] = spawn(); continue; }
        var s = m.r * 6;
        if (m.fleck) { m.rot += m.vr; dctx.save(); dctx.translate(m.x, m.y); dctx.rotate(m.rot); dctx.globalAlpha = a * 0.7;
          dctx.drawImage(sprite, -s * 1.1, -s * 0.3, s * 2.2, s * 0.6); dctx.restore(); }
        else { dctx.globalAlpha = a; dctx.drawImage(sprite, m.x - s / 2, m.y - s / 2, s, s); }
      }
      dctx.globalAlpha = 1;
    }
    $win.on('resize', size);
    size();
    return { draw: draw };
  })();

  /* --- volumetric specks behind the wings --- */
  var deepDust = (function () {
    var N = 42, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), speed = [];
    for (var i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 4.6; pos[i * 3 + 1] = -1.2 + Math.random() * 3.0; pos[i * 3 + 2] = -1.9 + Math.random() * 1.3;
      speed.push(0.0006 + Math.random() * 0.0018);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var c = makeCanvas(48, 48);
    var x = c.getContext('2d'), g = x.createRadialGradient(24, 24, 0, 24, 24, 24);
    g.addColorStop(0, 'rgba(246,234,212,1)'); g.addColorStop(.5, 'rgba(241,228,204,.35)'); g.addColorStop(1, 'rgba(241,228,204,0)');
    x.fillStyle = g; x.fillRect(0, 0, 48, 48);
    var mat = new THREE.PointsMaterial({ size: 0.05, map: new THREE.CanvasTexture(c), transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, color: 0xe9dcc2, sizeAttenuation: true });
    root.add(new THREE.Points(geo, mat));
    return { update: function (t, open, exit, dolly) {
      mat.opacity = gl3d ? 0 : Math.min(open * 1.8, 1) * 0.5 * (1 - exit) * (1 - dolly);
      if (mat.opacity < 0.02) return;
      var a = geo.attributes.position.array;
      for (var i = 0; i < N; i++) {
        a[i * 3 + 1] += speed[i]; a[i * 3] += Math.sin(t * 0.5 + i) * 0.0009;
        if (a[i * 3 + 1] > 2.0) { a[i * 3 + 1] = -1.3; a[i * 3] = (Math.random() - 0.5) * 4.6; }
      }
      geo.attributes.position.needsUpdate = true;
    } };
  })();

  window.__kkGatewayState = S;
  var clock = new THREE.Clock();
  var running = true, driftT0 = -1;
  function render() {
    if (!running || S.hidden) return;
    var t = clock.getElapsedTime();
    mouse.x = lerp(mouse.x, mouse.tx, 0.045);
    mouse.y = lerp(mouse.y, mouse.ty, 0.045);

    // once open, the hall keeps a slow architectural drift — the film never quite stops.
    var drift = S.drift * (1 - S.dolly);
    if (S.drift > 0 && driftT0 < 0) driftT0 = t;
    var td = driftT0 < 0 ? 0 : t - driftT0;
    var walk = S.passage.walk;                               // 1 while a passage is in motion
    var par = (1 - S.dolly) * (1 - 0.7 * walk);              // the pointer parallax eases off as we walk
    var camZ = S.passage.cam != null ? S.passage.cam : (gl3d ? S.camZ : lerp(S.camZ, -0.55, easeIn3(S.dolly) * 0.72 + S.dolly * 0.28));
    // the camera — and so every image behind the wings — moves only with the scroll: no pointer parallax, no idle drift
    camera.position.z = camZ;
    camera.position.x = 0;
    camera.position.y = 0;
    camera.lookAt(0, 0, camera.position.z - 7);

    var idle = S.calm;
    var dpL = Math.sin(t * 0.085 + 0.9), dpR = Math.sin(t * 0.078 + 2.3);
    var brL = Math.sin(t * 0.50), brR = Math.sin(t * 0.465 + 1.4);
    var stL = Math.sin(t * 0.21 + 1.7), stR = Math.sin(t * 0.19 + 0.6);
    var idleOpenL = Math.max(0.055 + 0.040 * brL + 0.024 * dpL, 0.004) * idle;
    var idleOpenR = Math.max(0.055 + 0.040 * brR + 0.024 * dpR, 0.004) * idle;

    var op = S.open;
    uniformSets.forEach(function (u) {
      var io = (u._side < 0 ? idleOpenL : idleOpenR), br = (u._side < 0 ? brL : brR);
      u.uTime.value = t; u.uCalm.value = S.calm; u.uTension.value = S.tension;
      u.uOpen.value = clamp((op + io - u._delay) / (1 - u._delay), 0, 1);
      u.uLight.value = S.light + idle * (0.16 + 0.10 * br);
      u.uExpo.value = 1.18 + S.light * 0.12 + idle * 0.03 * br;
    });
    if (wings.L) {
      // the opening itself is perfectly symmetrical: only the idle breathing differs left to right, and it has faded by then
      wings.L.group.position.x = -(wings.L.width / 2 - 0.012) - S.sep * CFG.wing.maxShift - S.exit * 1.6;
      wings.R.group.position.x =  (wings.R.width / 2 - 0.012) + S.sep * CFG.wing.maxShift + S.exit * 1.6;
      wings.L.group.position.y = S.lift * 0.10 + 0.030 * stL * idle;
      wings.R.group.position.y = S.lift * 0.10 + 0.030 * stR * idle;
      wings.L.group.position.z = S.sep * 0.46 + 0.048 * Math.sin(t * 0.17) * idle;
      wings.R.group.position.z = S.sep * 0.46 + 0.048 * Math.sin(t * 0.155 + 0.8) * idle;
      wings.L.group.scale.setScalar(1 + 0.014 * brL * idle);
      wings.R.group.scale.setScalar(1 + 0.014 * brR * idle);
      wings.L.group.rotation.z =  0.009 * stL * idle;
      wings.R.group.rotation.z = -0.009 * stR * idle;
      wings.L.group.rotation.y = ( 0.030 * Math.sin(t * 0.11 + 0.4) + 0.016 * dpL) * idle + mouse.x * 0.02 * par;
      wings.R.group.rotation.y = (-0.030 * Math.sin(t * 0.10 + 1.9) - 0.016 * dpR) * idle + mouse.x * 0.02 * par;
      wings.L.group.visible = wings.R.group.visible = S.exit < 0.999;
    }
    wingsGroup.rotation.y = mouse.x * 0.035 * (1 - S.exit) * par;
    wingsGroup.rotation.x = mouse.y * 0.022 * (1 - S.exit) * par;

    // the hall: warm, luminous once open — a hair above 1 lifts the limestone without clipping the lights
    var br = S.bright * (1 + 0.05 * S.dolly);
    hallTint = [br * 1.03, br * 0.995, br * 0.94];
    if (!gl3d) bgMat.color.setRGB(hallTint[0], hallTint[1], hallTint[2]);
    shaftMesh.material.opacity = (S.shaft + idle * 0.10 * (0.5 + 0.5 * brL)) * (1 - S.passage.a) + (gl3d ? 0 : 0.10 * S.dolly);
    shaftMesh.scale.x = 0.25 + S.shaft * 1.4 + S.open * 2.2 + (gl3d ? 0 : S.dolly * 1.8);
    shaftMesh.visible = shaftMesh.material.opacity > 0.005 && camera.position.z > shaftMesh.position.z + 0.5;

    deepDust.update(t, S.open, S.exit, S.dolly);
    if (motes) { motes.mat.uniforms.uTime.value = t; motes.gmat.uniforms.uTime.value = t; }
    updateComp();
    renderer.render(scene, camera);
    if (dust) dust.draw(t, S.open, S.exit * (1 - S.dolly) + S.dolly);
  }
  new IntersectionObserver(function (en) { running = en[0].isIntersecting || en[0].intersectionRatio > 0; }, { rootMargin: '30%' }).observe($('#cinema')[0]);

  /* build the wings from their masters (transparency baked in), then choreograph */
  Promise.all([loadImg(ASSETS.wingL), loadImg(ASSETS.wingR)]).then(function (imgs) {
    wings.L = buildWing(-1, imgs[0], imgs[0].naturalWidth / imgs[0].naturalHeight);
    wings.R = buildWing( 1, imgs[1], imgs[1].naturalWidth / imgs[1].naturalHeight);
    sizeAll();
    gsap.ticker.add(render);
    choreograph();
    ScrollTrigger.sort(); ScrollTrigger.refresh();

    /* render self-check: a granted context can still paint nothing (blocklisted
       drivers, virtual GPUs). Read a few pixels back; if blank, hand off to the
       static wings so nobody ever meets a black hero. */
    (function verifyRender() {
      var tries = 0;
      function probe() {
        tries++;
        var ok = false;
        try {
          var rt = new THREE.WebGLRenderTarget(64, 64);
          renderer.setRenderTarget(rt); renderer.render(scene, camera);
          var buf = new Uint8Array(64 * 64 * 4);
          renderer.readRenderTargetPixels(rt, 0, 0, 64, 64, buf);
          renderer.setRenderTarget(null); rt.dispose();
          for (var i = 0; i < buf.length; i += 4) { if (buf[i] + buf[i + 1] + buf[i + 2] > 24) { ok = true; break; } }
        } catch (e) { ok = false; try { renderer.setRenderTarget(null); } catch (e2) {} }
        if (ok) { resolveGateway(); return; }
        if (tries < 3) { setTimeout(probe, 260); return; }
        try { gsap.ticker.remove(render); } catch (e) {}
        try { renderer.dispose(); } catch (e) {}
        try { if (window.__kkGate) window.__kkGate.destroy(); } catch (e) {}
        $(canvas).css('display', 'none');
        $html.addClass('calm webgl-failed');
        initHallCalm();
      }
      requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(probe, 120); }); });
    })();
  }).catch(function () {
    $(canvas).css('display', 'none');
    $html.addClass('calm gateway-build-failed');
    initHallCalm();
    if (hasGsap) ScrollTrigger.refresh();
  });

  /* --- the film, as a function of progress --- */
  var $head = $('.gw-head').first();
  var $titleEl = $('.gw-h1 .line-mask>span').first(), $titleH1 = $titleEl.closest('.gw-h1'), $sub = $('.gw-sub').first();
  function applyFilm(p) {
    S.tension = ss(0.00, 0.30, p);                       // feathers spread from the seam
    S.calm    = 1 - ss(0.02, 0.55, p);                   // breathing hands over to the opening
    S.open    = ss(0.06, 0.90, p);                       // hinge curl
    S.sep     = ss(0.16, 0.98, p);                       // wings travel outward
    S.lift    = ss(0.20, 0.90, p);
    S.light   = ss(0.04, 0.60, p);                       // seam light on the inner feathers
    S.bright  = 0.16 + 0.88 * ss(0.12, 0.88, p);         // the hall wakes
    S.shaft   = 0.26 * ss(0.00, 0.30, p) * (1 - ss(0.45, 0.92, p)) + 0.14 * ss(0.60, 1.00, p);
    S.camZ    = lerp(CFG.camera.start, CFG.camera.end, ss(0.22, 1.00, p));   // we walk in, once the wings have parted
    S.exit    = ss(0.58, 1.00, p);                       // wings leave the frame
    S.drift   = ss(0.80, 1.00, p);                       // the film keeps breathing
    var hf = ss(0.02, 0.36, p), ho = 1 - ss(0.08, 0.34, p);
    $head.css({ transform: 'translate3d(0,' + (-4 * hf).toFixed(3) + '%,0) scale(' + (1 + 0.05 * hf).toFixed(4) + ')',
      opacity: ho.toFixed(3), visibility: ho > 0.001 ? 'visible' : 'hidden' });
    $nav.toggleClass('nav-lit', p > 0.40);
    // the statement rises out of its mask as the hall settles — derived, so it reverses cleanly
    var w = ss(0.64, 0.90, p), s2 = ss(0.76, 0.98, p);
    $titleEl.css('transform', 'translate3d(0,' + (130 * (1 - w)).toFixed(2) + '%,0)');
    $titleH1.css('--pool', w.toFixed(3));
    $sub.css({ opacity: s2.toFixed(3), transform: 'translate3d(0,' + (14 * (1 - s2)).toFixed(2) + 'px,0)' });
  }
  var _v = new THREE.Vector3();
  hall = {
    apply: applyFilm,
    dolly: function (d) { S.dolly = gl3d ? 0 : d; },
    setHidden: function (h) { S.hidden = gl3d ? false : h; },
    gl: gl3d,
    passage: function (st) { S.passage = st; },
    /* screen position (stage px) of an image-fraction point on the Studio plate */
    project: function (fx, fy) {
      var box = rect(canvas), sc = scrOf('studio', studFrame(S.passage || {}), [fx, fy]);
      return { x: sc[0] * box.width, y: sc[1] * box.height };
    },
    /* the same for any plate ('hall' | 'arches' | 'studio'), so the sparkles sit on the light of each chapter */
    projectOn: function (k, fx, fy) {
      var P = S.passage || {}; P = { a: P.a || 0, q: P.q || 0, b: P.b || 0 };
      var fr = k === 'hall' ? hallFrame(P) : k === 'arches' ? archFrame(P) : studFrame(P);
      var box = rect(canvas), sc = scrOf(k, fr, [fx, fy]);
      // the plate's rendered size on screen, in px per image fraction (for the fields' radii)
      var sp = spanOf(k);
      return { x: sc[0] * box.width, y: sc[1] * box.height, kx: box.width * fr.S / sp[0], ky: box.height * fr.S / sp[1] };
    }
  };
  function choreograph() {
    runCinema({ onSeen: function () {
      // no film on a revisit: the gate stands open and the hall fades up from ivory
      $(canvas).css('opacity', '0');
      loaderDone.then(function () { gsap.to(canvas, { opacity: 1, duration: 1.1, ease: 'power2.out' }); });
    } });
    resolveGateway();
  }
}

/* calm / no-WebGL hall: the same film, drawn with the DOM wings (<img>) */
function initHallCalm() {
  var $fb = $('#gw-fallback'), $reveal = $('.fb-reveal').first(), $wl = $('.fb-wing.l').first(), $wr = $('.fb-wing.r').first();
  if (!$reveal.attr('src')) $reveal.attr('src', ASSETS.reveal);
  var $titleEl = $('.gw-h1 .line-mask>span').first(), $titleH1 = $titleEl.closest('.gw-h1'), $sub = $('.gw-sub').first(), $head = $('.gw-head').first(), $plate = $('#hall-plate');
  $fb.addClass('is-js');   // JS owns the transforms; CSS transitions are for the no-JS state only
  function applyFilm(p) {
    var o = ss(0.05, 0.90, p), fade = 1 - ss(0.50, 0.95, p);
    $wl.css({ transform: 'translate3d(' + (-70 * o).toFixed(2) + '%,0,0)', opacity: fade.toFixed(3) });
    $wr.css({ transform: 'translate3d(' + (70 * o).toFixed(2) + '%,0,0)', opacity: fade.toFixed(3) });
    $reveal.css('opacity', ss(0.15, 0.80, p).toFixed(3));
    var ho = 1 - ss(0.08, 0.34, p);
    $head.css({ opacity: ho.toFixed(3), visibility: ho > 0.001 ? 'visible' : 'hidden' });
    $nav.toggleClass('nav-lit', p > 0.40);
    var w = ss(0.64, 0.90, p), s2 = ss(0.76, 0.98, p);
    $titleEl.css('transform', 'translate3d(0,' + (130 * (1 - w)).toFixed(2) + '%,0)');
    $titleH1.css('--pool', w.toFixed(3));
    $sub.css({ opacity: s2.toFixed(3), transform: 'translate3d(0,' + (14 * (1 - s2)).toFixed(2) + 'px,0)' });
  }
  hall = {
    apply: applyFilm,
    dolly: function (d) { $plate.css('transform', d > 0 ? 'scale(' + (1 + 1.35 * (easeIn3(d) * 0.72 + d * 0.28)).toFixed(4) + ')' : ''); },
    setHidden: function () {}, gl: false, passage: function () {}, project: null
  };
  resolveGateway();
  // static film (reduced motion): the lit hall at rest, with the same header scrim the animated film settles on,
  // so the light navigation stays legible over the bright hall
  if (staticCinema) { applyFilm(1); setScrim(0.92); markSeen(); gateRelease(); if (hasGsap) ScrollTrigger.refresh(); return; }
  runCinema();
}
assetsReady.then(function () {
  if (cinematic) {
    try { initHallWebGL(); }
    catch (e) { $html.addClass('calm gateway-init-failed'); $('#gw-canvas').css('display', 'none'); initHallCalm(); }
  } else initHallCalm();
});

/* ==========================================================================
   07 · ATMOSPHERE — a few soft points of light, moving only with the scroll.
   One sprite: the small glowing dot of the earlier builds (a soft
   disc, cream or gold — no rays, no points). Two small populations on one
   canvas. FIELD dots are placed intentionally in the light of the chapter
   in view (the hall's floor pool and rib faces, the arches' faces and
   floor, the Studio's sun shafts, the far arch and the Burj Khalifa),
   given in image space each frame so they ride with the plates. AMBIENT
   dots are a handful drifting in the space. every dot floats on its
   own: each carries its own slow rise, lateral drift, sway (its own
   frequency and phase) and twinkle, so nothing is ever stationary and no
   two move alike; the scroll still streams them outward through a passage,
   and each still breathes in and out across its life. Presence is highest during the passages between
   chapters. Every size scales with the viewport; colour is capped at warm
   cream so nothing reads as white glitter.
   ========================================================================*/
function makeDust(cv, opts) {
  if (!cv || staticCinema) return null;
  opts = opts || {};
  var ctx = cv.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var W = 0, H = 0, ps = [], fs = [], scale = 1, uid = 0;
  var state = { intensity: 0, flow: 0, fx: 0.5, fy: 0.5, dark: 1, field: 0, fields: [], p: 0, dp: 0, scroll: 0 };
  var CAP = opts.cap || (isMobile ? 8 : 14);            // ambient
  var FCAP = opts.fieldCap || (isMobile ? 18 : 38);     // in the light fields — selective, never a field of glitter
  var MOTE = opts.gold ? ['rgba(214,182,124,1)', 'rgba(206,172,114,.7)', 'rgba(200,166,108,.22)', 'rgba(200,166,108,0)']
                       : ['rgba(252,244,226,1)', 'rgba(248,234,206,.7)', 'rgba(242,224,190,.22)', 'rgba(242,224,190,0)'];
  var GOLD = ['rgba(250,232,190,1)', 'rgba(238,210,150,.72)', 'rgba(226,192,124,.22)', 'rgba(226,192,124,0)'];
  function sprite(cols) {
    var c = makeCanvas(64, 64); var x = c.getContext('2d');
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, cols[0]); g.addColorStop(.22, cols[1]); g.addColorStop(.5, cols[2]); g.addColorStop(1, cols[3]);
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c;
  }
  var dotCream = sprite(MOTE), dotGold = sprite(GOLD);
  function size() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.max(0.72, Math.min(1.2, Math.min(W, H) / 880)); }
  function gauss() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); }
  function breath(life, span) { var t = Math.min(life / span, 1); return t < 0.3 ? (t / 0.3) * (t / 0.3) : t > 0.7 ? Math.pow((1 - t) / 0.3, 2) : 1; }   // in, hold, out
  function spawn(nearCentre) {
    var depth = 0.35 + Math.random() * 0.65;
    var x = Math.random() * W, y = H * (0.08 + Math.random() * 0.84);
    if (nearCentre) x = W * (0.5 + (Math.random() - 0.5) * 0.7);
    return { uid: ++uid, x: x, y: y, depth: depth, r: (1.0 + Math.random() * 1.4) * depth * scale, gold: Math.random() < 0.6,
      life: -Math.random() * 4, span: 9 + Math.random() * 8, base: 0.34 + Math.random() * 0.26,
      /* its own float: a slow rise, a little lateral drift, a sway and a twinkle — all on its own clock */
      vx: gauss() * 5.0 * scale, vy: -(9 + Math.random() * 17) * scale,
      swA: (3.0 + Math.random() * 6.5) * scale, swF: 0.10 + Math.random() * 0.26, swP: Math.random() * 6.283,
      twF: 0.18 + Math.random() * 0.4, twP: Math.random() * 6.283 };
  }
  function pickField() {
    var F = state.fields, tot = 0, i;
    for (i = 0; i < F.length; i++) tot += F[i].w;
    if (!tot) return null;
    var r = Math.random() * tot;
    for (i = 0; i < F.length; i++) { r -= F[i].w; if (r <= 0) return F[i]; }
    return F[F.length - 1];
  }
  function fieldById(id) { var F = state.fields; for (var i = 0; i < F.length; i++) if (F[i].id === id) return F[i]; return null; }
  function spawnField() {
    var f = pickField(); if (!f) return null;
    var u = Math.max(-1, Math.min(1, gauss() * 0.45)), v = Math.max(-1, Math.min(1, gauss() * 0.45));
    var depth = 0.4 + Math.random() * 0.6;
    return { uid: ++uid, id: f.id, u: u, v: v, ox: 0, oy: 0, depth: depth, r: (1.35 + Math.random() * 1.75) * scale, gold: Math.random() < (f.gold ? 0.7 : 0.4),
      life: -Math.random() * 5, span: 8 + Math.random() * 7, base: 0.52 + Math.random() * 0.36,
      vx: gauss() * 4.2 * scale, vy: -(8 + Math.random() * 15) * scale,
      swA: (2.6 + Math.random() * 5.5) * scale, swF: 0.09 + Math.random() * 0.24, swP: Math.random() * 6.283,
      twF: 0.16 + Math.random() * 0.38, twP: Math.random() * 6.283 };
  }
  var visible = true, frames = 0, lastT = 0, lastScroll = null;
  function draw(t) {
    frames++;
    if (frames % 12 === 1) { var vr = rect(cv); visible = vr.width > 0 && vr.bottom > -40 && vr.top < (window.innerHeight || 0) + 40; }
    if (!visible) { if (ps.length || fs.length) { ctx.clearRect(0, 0, W, H); ps.length = 0; fs.length = 0; } return; }
    if (!W) size();
    var dt = lastT ? Math.min(0.05, t - lastT) : 0.016; lastT = t;
    /* the only motion is the visitor's: the master progress delta (cinema) or the scroll delta (page) */
    var dp = state.dp; state.dp = 0;
    var sc = $win.scrollTop() || 0, ds = lastScroll === null ? 0 : sc - lastScroll; lastScroll = sc;
    var move = opts.page ? ds * 0.06 : dp * 420;          // px of drift for a full-depth dot (≈ 80 px across a passage)
    var want = Math.round(CAP * state.intensity);
    while (ps.length < want) ps.push(spawn(state.dark > 0.5));
    if (ps.length > want) ps.length = want;
    var wantF = state.fields.length ? Math.round(FCAP * Math.max(0, Math.min(1, state.field))) : 0;
    while (fs.length < wantF) { var nf = spawnField(); if (!nf) break; fs.push(nf); }
    if (fs.length > wantF) fs.length = wantF;
    ctx.clearRect(0, 0, W, H);
    var ts = t;                                           // the ticker's clock, in seconds: each dot's own sway and twinkle
    var fx = state.fx * W, fy = state.fy * H, flow = state.flow;
    var lift = opts.gold ? 0.9 : 0.6 + 0.4 * state.dark;
    var i, m, a, sz;
    for (i = 0; i < ps.length; i++) {
      m = ps[i]; m.life += dt;
      m.x += (m.vx + Math.sin(ts * m.swF + m.swP) * m.swA) * dt * m.depth;
      m.y += m.vy * dt * m.depth;
      if (move) {
        var dx = m.x - fx, dy = m.y - fy, L = Math.sqrt(dx * dx + dy * dy) || 1;
        // rising with the scroll; during a passage, streaming outward from the aperture instead
        m.x += (dx / L) * move * flow * 0.5 * m.depth;
        m.y += (dy / L) * move * flow * 0.5 * m.depth - move * (1 - flow) * 0.12 * m.depth;
      }
      if (m.life > m.span || m.x < -20 || m.x > W + 20 || m.y < -20 || m.y > H + 20) { ps[i] = spawn(state.dark > 0.5); continue; }
      if (m.life < 0) continue;
      a = breath(m.life, m.span) * m.base * lift * (0.82 + 0.18 * Math.sin(ts * m.twF * 6.283 + m.twP));
      sz = m.r * 11;
      ctx.globalAlpha = a; ctx.drawImage(m.gold ? dotGold : dotCream, m.x - sz / 2, m.y - sz / 2, sz, sz);
    }
    for (i = 0; i < fs.length; i++) {
      m = fs[i]; var f = fieldById(m.id);
      if (!f) { var rf = spawnField(); if (rf) fs[i] = rf; continue; }
      m.life += dt;
      m.ox += (m.vx + Math.sin(ts * m.swF + m.swP) * m.swA) * dt * m.depth;
      m.oy += m.vy * dt * m.depth;
      if (move) { m.oy -= move * 0.10 * m.depth; m.ox += (f.x - fx > 0 ? 1 : -1) * move * flow * 0.18 * m.depth; }
      if (m.life > m.span || m.oy < -0.75 * H || Math.abs(m.ox) > 0.6 * W) { var rg = spawnField(); if (rg) fs[i] = rg; continue; }
      if (m.life < 0) continue;
      var gx = f.x + m.u * f.rx + m.ox, gy = f.y + m.v * f.ry + m.oy;
      a = breath(m.life, m.span) * m.base * Math.min(1, 0.6 + 0.4 * f.w) * (opts.gold ? 0.9 : 0.95 - 0.25 * state.dark)
          * (0.82 + 0.18 * Math.sin(ts * m.twF * 6.283 + m.twP));   // quieter on the dark threshold, where every point shows
      sz = m.r * 11;
      ctx.globalAlpha = Math.min(0.9, a); ctx.drawImage(m.gold ? dotGold : dotCream, gx - sz / 2, gy - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
  }
  $win.on('resize', size);
  size();
  if (hasGsap) gsap.ticker.add(function () { draw(gsap.ticker.time); });
  return { state: state, count: function () { return [ps.length, fs.length, visible, frames]; },
    /* debug: where every dot is on screen right now (ambient first, then the ones in the light fields) */
    positions: function () {
      var out = [], i, m, f;
      for (i = 0; i < ps.length; i++) { m = ps[i]; if (m.life >= 0) out.push([m.uid, +m.x.toFixed(2), +m.y.toFixed(2)]); }
      for (i = 0; i < fs.length; i++) { m = fs[i]; f = fieldById(m.id); if (f && m.life >= 0) out.push([m.uid, +(f.x + m.u * f.rx + m.ox).toFixed(2), +(f.y + m.v * f.ry + m.oy).toFixed(2)]); }
      return out;
    },
    /* debug: advance the simulation by n frames of 1/60 s without waiting for the ticker */
    warm: function (n, t0) { var t = t0 || (hasGsap ? gsap.ticker.time : 0); for (var i = 0; i < n; i++) { t += 1 / 60; lastT = t - 1 / 60; draw(t); } } };
}
var atmos = makeDust($('#cine-atmos')[0]);
window.__kkAtmos = atmos;
/* a little gold dust over the rest of the landing page (credentials, projects, method, invitation), only while in view,
   moving only with the scroll */
(function initPageDust() {
  var $cv = $('#page-atmos'); if (!$cv.length || staticCinema) return;
  var dust = makeDust($cv[0], { gold: true, page: true, cap: isMobile ? 10 : 22 });
  if (!dust) return;
  var $secs = $('.studio-cred').first().add($('#projects')).add($('#method')).add($('.invite').first()), seen = [];
  var io = new IntersectionObserver(function (entries) {
    $.each(entries, function (i, en) { seen[$secs.index(en.target)] = en.isIntersecting; });
    var inView = $.grep(seen, function (x) { return x; }).length;
    $cv.toggleClass('is-on', inView > 0);
    dust.state.intensity = inView > 0 ? 1 : 0; dust.state.dark = 0;
  }, { rootMargin: '-12% 0px -12% 0px' });
  $secs.each(function () { io.observe(this); });
  window.__kkPageAtmos = dust;
})();

/* ==========================================================================
   08 · THE PASSAGE — the chapters, as a function of the master progress.
   Everything below is reversible: scrolling back walks the visitor back out
   through the same apertures.
   ========================================================================*/
var passage = (function () {
  var $hallEl = $('#gateway'), $reveal = $('#gw-reveal'), $mist = $('#gw-mist'), $stage = $('#cine-stage');
  var $arEl = $('#arches'), $arPlate = $('#ar-plate'), $far = $('#ar-far'), $arCopy = $('#ar-copy'), $arLine = $arCopy.find('.ar-line').first(),
      $arKicker = $('#ar-kicker'), $arList = $('#ar-list'), $arLight = $('.ar-light').first();
  var $stEl = $('#studio'), $stPlate = $('#st-plate'), $stImg = $('#st-img'), $stGlow = $('#studio .st-glow').first(), $stCopy = $('#st-copy');
  /* one jQuery object per word / per line of copy, made once (these are written every frame) */
  var arWords = $.map($('.ar-w').get(), function (el) { return $(el); }), stItems = $.map($('#st-copy .st-r').get(), function (el) { return $(el); });
  var plateS = 1, farS = 1;                     // the arches' plate and far-image scales, as last written (calm mode)
  var last = { hallHidden: null, arVis: null, stVis: null, arMask: null, stMask: null };
  function setVis($el, key, on) { if (last[key] === on) return; last[key] = on; $el.css('visibility', on ? 'visible' : 'hidden'); }
  function setMask($el, key, on) { if (last[key] === on) return; last[key] = on; $el.toggleClass('is-masked', on); }
  /* the opening, as a fraction of the stage: inscribed in the incoming plate while that plate is still
     growing (so its rectangular edge is never seen), then racing past the corners once the plate is full */
  function apertureRadius(t, plate) {
    var w, h;
    if (t < 0.62) { var g = lerp(0.07, 1, ss(0, 0.62, t)); w = plate * 49.5 * g; h = plate * 49.5 * Math.pow(g, 0.85); }
    else { var g2 = ss(0.62, 1, t); w = lerp(49.5, 182, g2); h = lerp(49.5, 182, g2); }
    return { w: w, h: h };
  }
  function aperture($el, w, h, x, y) {
    $el.css({ '--apw': w.toFixed(2) + '%', '--aph': h.toFixed(2) + '%', '--apx': x + '%', '--apy': y + '%' });
  }
  $('.ar-w').css('transform', 'translate3d(0,130%,0)');
  $arKicker.css('opacity', '0'); $arList.css('opacity', '0');
  $('#st-copy .st-r').css('opacity', '0');

  /* object-fit: cover mapping — where the photograph's box sits inside the stage */
  function coverBox($img, fallbackW, fallbackH) {
    var st = rect($stage);
    var nw = $img.prop('naturalWidth') || fallbackW, nh = $img.prop('naturalHeight') || fallbackH;
    var s = Math.max(st.width / nw, st.height / nh), rw = nw * s, rh = nh * s;
    var op = ($img.css('object-position') || '50% 50%').split(' ');
    var px = parseFloat(op[0]) / 100, py = parseFloat(op[1] || '50%') / 100;
    return { x: (st.width - rw) * px, y: (st.height - rh) * py, w: rw, h: rh, W: st.width, H: st.height };
  }
  /* the illumination overlays are fitted to their photograph, so their light lands on the same stones on every viewport */
  function fitLights() {
    $.each([[$far, $arLight, 1800, 1008], [$stImg, $('.st-light').first(), 1800, 1008]], function (i, pair) {
      if (!pair[0].length || !pair[1].length) return;
      var bx = coverBox(pair[0], pair[2], pair[3]);
      pair[1].css({ inset: 'auto', left: bx.x.toFixed(1) + 'px', top: bx.y.toFixed(1) + 'px', width: bx.w.toFixed(1) + 'px', height: bx.h.toFixed(1) + 'px' });
    });
  }
  fitLights();
  $win.on('resize', fitLights);
  $far.add($stImg).each(function () { if (!this.complete) $(this).on('load', fitLights); });
  /* where the Burj Khalifa stands on screen, for the atmosphere */
  function burjPos(scale) {
    var bx = coverBox($stImg, 1800, 1008);
    var x = bx.x + 0.860 * bx.w, y = bx.y + 0.455 * bx.h;
    var cx = bx.W / 2, cy = bx.H / 2;             // the plate is scaled about the stage centre during the passage
    return { x: cx + (x - cx) * scale, y: cy + (y - cy) * scale };
  }

  var GL = function () { return hall && hall.gl; };
  var D = CFG.depth;
  /* where the light is, per chapter, in IMAGE fractions: [x, y, rx, ry, weight, gold]. Radii are fractions of the
     plate's width/height, so the fields scale with the picture on every viewport. */
  var LIGHT = {
    /* [x, y, rx, ry, weight, gold] — the dots sit where dust would catch the light: on the mid-tone stone beside each
       source, along the seam's edges, in the sunbeams on the floor. 'wings' is in STAGE fractions (the closed wings are
       drawn centred on the stage); the others are image fractions of their plate. */
    wings:  [[0.500, 0.56, 0.012, 0.20, 0.85, 1], [0.500, 0.87, 0.09, 0.035, 0.60, 1], [0.47, 0.34, 0.012, 0.10, 0.45, 1], [0.53, 0.34, 0.012, 0.10, 0.45, 1],
             [0.355, 0.42, 0.035, 0.15, 0.35, 1], [0.645, 0.42, 0.035, 0.15, 0.35, 1]],
    hall:   [[0.50, 0.86, 0.10, 0.05, 1.00, 1], [0.465, 0.50, 0.010, 0.22, 0.60, 1], [0.535, 0.50, 0.010, 0.22, 0.60, 1], [0.42, 0.72, 0.03, 0.12, 0.60, 1], [0.58, 0.72, 0.03, 0.12, 0.60, 1],
             [0.20, 0.18, 0.08, 0.14, 0.50, 1], [0.80, 0.18, 0.08, 0.14, 0.50, 1], [0.30, 0.66, 0.06, 0.16, 0.45, 1], [0.70, 0.66, 0.06, 0.16, 0.45, 1]],
    arches: [[0.35, 0.55, 0.04, 0.18, 0.80, 1], [0.65, 0.55, 0.04, 0.18, 0.80, 1], [0.50, 0.88, 0.12, 0.05, 0.75, 1], [0.445, 0.50, 0.008, 0.14, 0.45, 1], [0.555, 0.50, 0.008, 0.14, 0.45, 1],
             [0.50, 0.14, 0.08, 0.06, 0.40, 1], [0.22, 0.45, 0.03, 0.25, 0.25, 1], [0.78, 0.45, 0.03, 0.25, 0.25, 1]],
    studio: [[0.860, 0.455, 0.030, 0.090, 1.00, 1], [0.858, 0.52, 0.070, 0.10, 0.45, 1], [0.40, 0.87, 0.05, 0.03, 0.50, 1], [0.51, 0.85, 0.05, 0.03, 0.50, 1], [0.61, 0.83, 0.05, 0.03, 0.50, 1],
             [0.70, 0.81, 0.045, 0.03, 0.45, 1], [0.52, 0.50, 0.03, 0.18, 0.40, 1], [0.75, 0.50, 0.05, 0.20, 0.35, 1], [0.32, 0.88, 0.05, 0.03, 0.35, 1]]
  };
  var PLATE = { hall: [2200, 1232], arches: [1800, 1008], studio: [1800, 1008] };
  function lightFields(k, w, out, stScale, stShift) {
    var isGL = GL(), L = LIGHT[k], i, f, pt, kx, ky;
    var sw = $stage[0].clientWidth, sh = $stage[0].clientHeight;
    var mob = sw < 900;
    for (i = 0; i < L.length; i++) {
      f = L[i];
      if (k === 'wings') { pt = { x: f[0] * sw, y: f[1] * sh }; kx = sw; ky = sh; }
      else if (isGL && hall.projectOn) { pt = hall.projectOn(k, f[0], f[1]); kx = pt.kx; ky = pt.ky; }
      else {
        /* calm / no-WebGL: the plates are object-fit: cover images with a CSS scale about the stage centre */
        var $img = k === 'hall' ? $('.fb-reveal').first() : k === 'arches' ? $far : $stImg;
        if (!$img.length) continue;
        var bx = coverBox($img, PLATE[k][0], PLATE[k][1]);
        var sc = k === 'studio' ? (stScale || 1) : k === 'arches' ? farS * plateS : 1;
        var cx = bx.W / 2, cy = bx.H / 2, x0 = bx.x + f[0] * bx.w, y0 = bx.y + f[1] * bx.h;
        pt = { x: cx + (x0 - cx) * sc + (k === 'studio' ? 0.065 * bx.W * (stShift || 0) : 0), y: cy + (y0 - cy) * sc };
        kx = bx.w * sc; ky = bx.h * sc;
      }
      if (pt.x < -0.2 * sw || pt.x > 1.2 * sw || pt.y < -0.2 * sh || pt.y > 1.2 * sh) continue;
      out.push({ id: k + i, x: pt.x, y: pt.y, rx: Math.max(6, f[2] * kx), ry: Math.max(6, f[3] * ky), w: f[4] * w * (mob ? 0.85 : 1), gold: !!f[5] });
    }
  }
  function geo(z0, z1, zPlane, t) { var d0 = z0 - zPlane, d1 = z1 - zPlane; return zPlane + d0 * Math.pow(d1 / d0, t); }   // geometric approach: a steady walk
  return function (p) {
    /* --- the wings film --- */
    var pf = win(p, 0, B.film1);
    hall.apply(pf);
    /* --- the header: light for the whole introduction over a warm scrim that arrives as the hall lights up --- */
    setScrim(0.92 * ss(0.30, 0.60, pf));

    /* --- passage A: the hall → the arches --- */
    var a = win(p, B.transA0, B.transA1);
    var aIn = ss(0, 1, a);
    var q = win(p, B.arches0, B.arches1);
    var b = win(p, B.transB0, B.transB1);
    var isGL = GL();
    if (isGL) {
      /* the camera walks: hall → slit → arches (slow walk while the statement is read) → doorway → Studio */
      var cam = null;
      if (p > B.hold1 && p <= B.transA1) cam = geo(D.camHold, D.camA1, D.hall, ss(0, 1, a));
      else if (p > B.transA1 && p <= B.arches1) cam = lerp(D.camA1, D.camQ1, q);
      else if (p > B.arches1 && p <= B.transB1) cam = geo(D.camQ1, D.camB1, D.arches, ss(0, 1, b));
      else if (p > B.transB1) cam = D.camB1;
      var walk = (a > 0 && a < 1) || (b > 0 && b < 1) ? 1 : 0;
      var mI = 1.0 - 0.15 * ss(0.3, 0.75, pf); mI = lerp(mI, 0.5, aIn); mI = lerp(mI, 0.5, ss(0, 1, b)); mI += 0.1 * walk;   // fuller from the threshold into the hall
      var gI = 0.8 * ss(0.78, 1, pf) * (1 - ss(0.15, 0.6, b));
      hall.passage({ p: p, a: a, q: q, b: b, cam: cam, motes: mI, glitter: gI, walk: walk });
    } else {
      var dA = win(a, 0, 0.82); hall.dolly(dA * dA);               // forward through the hall's light, before the arches cover it
    }
    $mist.css('opacity', (ss(0.60, 0.92, pf) * (1 - ss(0, 0.26, a))).toFixed(3));   // the floor light thins as we walk in
    var ro = 1 - ss(0.0, 0.26, a);
    $reveal.css({ opacity: ro.toFixed(3), transform: 'translate3d(0,' + (-3 * (1 - ro)).toFixed(2) + 'vh,0) scale(' + (1 + 0.07 * (1 - ro)).toFixed(4) + ')',
      visibility: ro > 0.001 ? 'visible' : 'hidden' });
    var arOn = a > 0 && p < B.transB1;
    setVis($arEl, 'arVis', isGL ? true : arOn);
    var plateScale = lerp(0.72, 1, ss(0, 0.62, a));
    if (isGL) { setMask($arEl, 'arMask', false); $arEl.css('opacity', '1'); }
    else if (a > 0 && a < 1) {
      setMask($arEl, 'arMask', true);
      var apr = apertureRadius(a, plateScale);                   // a slit of light first; the opening never outruns the plate
      aperture($arEl, apr.w, apr.h, 50, 50);
      $arEl.css('opacity', ss(0, 0.18, a).toFixed(3));
    } else { setMask($arEl, 'arMask', false); $arEl.css('opacity', a >= 1 ? '1' : '0'); }
    var hallHidden = a >= 1;
    setVis($hallEl, 'hallHidden', !hallHidden);
    hall.setHidden(hallHidden);

    /* --- the arches: a continuous walk toward the light while the statement is read --- */
    if (!isGL) { plateS = +plateScale.toFixed(4); $arPlate.css('transform', 'scale(' + plateScale.toFixed(4) + ')'); }
    // near threshold: we pass through it as the words arrive
    // far: slow drift through the arches, then the dolly into the doorway
    if (!isGL) {
      var dB = win(b, 0, 0.82);
      farS = +(1.08 + 0.2 * q + 1.9 * dB * dB).toFixed(4);
      $far.css({ transform: 'scale(' + farS.toFixed(4) + ')',
        filter: 'brightness(' + (0.97 + 0.03 * q - 0.03 * b).toFixed(3) + ')' });   // never pushed past 1: the doorway stays warm, not white
      $arLight.css('opacity', (0.9 - 0.5 * b).toFixed(3));
    }
    // the statement, in one readable progression
    var ko = ss(0.02, 0.15, q) * (1 - ss(0.0, 0.24, b));
    $arKicker.css({ opacity: ko.toFixed(3), transform: 'translate3d(0,' + (10 * (1 - ss(0.02, 0.15, q))).toFixed(2) + 'px,0)' });
    $.each(arWords, function (i, $w) {
      var y = 130 * (1 - ss(0.06 + i * 0.035, 0.27 + i * 0.035, q));
      $w.css('transform', 'translate3d(0,' + y.toFixed(2) + '%,0)');
    });
    var lo = ss(0.24, 0.38, q) * (1 - ss(0.0, 0.24, b));
    $arList.css({ opacity: lo.toFixed(3), transform: 'translate3d(0,' + (12 * (1 - ss(0.24, 0.38, q))).toFixed(2) + 'px,0)' });
    var co = 1 - ss(0.0, 0.26, b);
    $arCopy.css({ opacity: co.toFixed(3), transform: 'translate3d(0,' + (-5 * (1 - co)).toFixed(2) + 'vh,0) scale(' + (1 + 0.06 * (1 - co)).toFixed(4) + ')' });
    $arLine.css('--pool', ss(0.06, 0.3, q).toFixed(3));

    /* --- passage B: the arches → the Studio --- */
    var stOn = b > 0;
    setVis($stEl, 'stVis', isGL ? true : stOn);
    var stScale = lerp(0.72, 1, ss(0, 0.62, b));
    var stShift = 1 - ss(0, 0.6, b);                  // the colonnade first shows its sunlit face in the opening, then centres
    if (isGL) { setMask($stEl, 'stMask', false); $stEl.css('opacity', '1'); }
    else if (b > 0 && b < 1) {
      setMask($stEl, 'stMask', true);
      var apr2 = apertureRadius(b, stScale);
      aperture($stEl, apr2.w, apr2.h, 50, 54);
      $stEl.css('opacity', ss(0, 0.18, b).toFixed(3));
    } else { setMask($stEl, 'stMask', false); $stEl.css('opacity', b >= 1 ? '1' : '0'); }
    if (!isGL) $stPlate.css('transform', 'translate3d(' + (6.5 * stShift).toFixed(2) + '%,' + (1.5 * stShift).toFixed(2) + '%,0) scale(' + stScale.toFixed(4) + ')');
    // stage one of the Studio reveal: the copy rises as the colonnade settles
    var r = win(p, B.transB0 + 0.88 * (B.transB1 - B.transB0), B.settle1 - 0.05 * (B.settle1 - B.settle0));   // the copy arrives once the Studio has
    $stGlow.css('opacity', ss(0.02, 0.5, r).toFixed(3));
    $stCopy.css('--pool-st', ss(0.02, 0.5, r).toFixed(3));
    $.each(stItems, function (i, $el) {
      var v = ss(0.06 + i * 0.14, 0.52 + i * 0.14, r);
      $el.css({ opacity: v.toFixed(3), transform: 'translate3d(0,' + (26 * (1 - v)).toFixed(2) + 'px,0)' });
    });

    /* --- the atmosphere --- */
    if (atmos) {
      var s = atmos.state;
      var dark = 1 - ss(0.3, 0.75, pf);
      var hallI = 0.42 + 0.38 * ss(0.5, 1, pf);
      var arI = 0.5, stI = 0.55;
      var I = hallI;
      I = lerp(I, arI, aIn); I = lerp(I, stI, ss(0, 1, b));
      s.intensity = isGL ? 0.6 * I : I; s.dark = dark;           // WebGL carries its own motes; the 2D layer adds a few soft points
      s.flow = Math.min(1, Math.sin(Math.PI * a) + Math.sin(Math.PI * b));
      s.fx = 0.5; s.fy = b > 0 ? 0.54 : 0.5;
      s.dp += p - (s.p || 0); s.p = p;                             // the scroll is the only motion
      /* the light fields of the chapter in view (stage px), where the dots are placed; fullest through the transitions */
      var wWings = 1 - ss(0.45, 0.8, pf);
      var wHall = ss(0.62, 0.92, pf) * (1 - ss(0.3, 0.7, a));
      var wAr = ss(0.3, 0.7, a) * (1 - ss(0.3, 0.7, b));
      var wSt = ss(0.3, 0.7, b);
      var F = [];
      if (wWings > 0.01) lightFields('wings', wWings, F);
      if (wHall > 0.01) lightFields('hall', wHall, F);
      if (wAr > 0.01) lightFields('arches', wAr, F);
      if (wSt > 0.01) lightFields('studio', wSt, F, stScale, stShift);
      s.fields = F;
      var passing = Math.sin(Math.PI * a) + Math.sin(Math.PI * b);
      s.field = Math.max(wWings * 0.75, wHall * 0.8, wAr * 0.8, wSt * 0.9) + 0.25 * Math.min(1, passing);
    }
  };
})();
applyCinema = passage;

/* ---------- 09 · the Studio exits with a breath of depth; #studio always means the settled frame ---------- */
function initStudio() {
  if (!hasGsap || staticCinema) return;
  if (!gl3d) gsap.fromTo('#st-img', { yPercent: 0 }, { yPercent: 6, ease: 'none',
    scrollTrigger: { trigger: '#cinema', start: 'bottom bottom', end: 'bottom top', scrub: true } });
  // links to #studio (skip link, menu, footer) land on the settled Studio frame, not the pin's origin.
  // site.js routes every same-page anchor; returning true here means this one has been handled.
  if (KK.anchorRoutes) KK.anchorRoutes['#studio'] = function (e, $a) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    var gate = window.__kkGate; if (!gate || !gate.st) return false;
    if ($a.closest('#menu').length && KK.setMenu) KK.setMenu(false);
    gate.hand();
    gate.toStudio(false);
    return true;
  };
}
initStudio();

/* ==========================================================================
   10 · SELECTED PROJECTS — one project at a time.
   A refined crossfade with a slow settle; previous / next, an index,
   arrow keys and swipe. The stage never changes size, so nothing shifts.
   ========================================================================*/
function initShowcase() {
  var $show = $('#pj-show'), $stage = $('#pj-stage'); if (!$show.length || !$stage.length) return;
  var $slides = $stage.find('.pj-slide'), N = $slides.length;
  var $cur = $('#pj-cur'), $tot = $('#pj-tot'), $index = $('#pj-index'), $prev = $('#pj-prev'), $next = $('#pj-next'), $ctl = $('#pj-ctl');
  $tot.text(pad(N));
  if (N < 2) { $ctl.prop('hidden', true); return; }
  var idx = $slides.index($slides.filter('.is-current')); if (idx < 0) idx = 0;
  var busy = false, $buttons = $(), live = null;
  function settle() {           // finish a switch instantly (a second request arrived mid-crossfade)
    if (!live) return;
    live.tl.kill();
    gsap.set(live.all, { clearProps: 'all' });
    live = null; busy = false; $stage.removeClass('is-switching');
    paint();
  }
  $slides.each(function (i) {
    var $s = $(this), $name = $s.find('.pj-name').first();
    $s.attr('aria-label', (i + 1) + ' of ' + N);
    var $b = $('<button type="button"></button>').text(pad(i + 1))
      .attr('aria-label', 'Show project ' + (i + 1) + ($name.length ? ': ' + $name.text() : ''))
      .on('click', function () { go(i); });
    $('<li></li>').append($b).appendTo($index);
    $buttons = $buttons.add($b);
  });
  function paint() {
    $slides.each(function (i) {
      var on = i === idx;
      $(this).toggleClass('is-current', on).attr('aria-hidden', on ? 'false' : 'true')
        .find('a, button').attr('tabindex', on ? '0' : '-1');
    });
    $buttons.each(function (i) { if (i === idx) $(this).attr('aria-current', 'true'); else $(this).removeAttr('aria-current'); });
    $cur.text(pad(idx + 1));
  }
  function go(n, dir) {
    n = ((n % N) + N) % N;
    if (busy) settle();
    if (n === idx) return;
    dir = dir || (n > idx ? 1 : -1);
    var from = $slides[idx], to = $slides[n];
    idx = n;
    if (!hasGsap || reduceMotion) { paint(); return; }
    busy = true; $stage.addClass('is-switching');
    var toImg = $(to).find('img').first(), fromImg = $(from).find('img').first(), toCap = $(to).find('.pj-cap').first(), fromCap = $(from).find('.pj-cap').first();
    gsap.killTweensOf([from, to, toImg, fromImg, toCap, fromCap]);
    gsap.set(to, { autoAlpha: 1, zIndex: 3 });
    gsap.set(from, { zIndex: 2 });
    gsap.set(toImg, { scale: 1.1, xPercent: 2.5 * dir });
    gsap.set(toCap, { opacity: 0, y: 18 });
    var tl = gsap.timeline({ onComplete: function () {
      gsap.set([from, to], { clearProps: 'zIndex,opacity,visibility' });
      gsap.set([toImg, fromImg], { clearProps: 'transform' });
      gsap.set([toCap, fromCap], { clearProps: 'opacity,transform' });
      live = null; paint(); busy = false; $stage.removeClass('is-switching');
    } });
    live = { tl: tl, all: [from, to, toImg, fromImg, toCap, fromCap] };
    tl.fromTo(to, { opacity: 0 }, { opacity: 1, duration: 0.95, ease: 'power2.inOut' }, 0)
      .to(toImg, { scale: 1.02, xPercent: 0, duration: 1.9, ease: 'expo.out' }, 0)
      .to(fromImg, { scale: 1.07, xPercent: -2 * dir, duration: 1.2, ease: 'power2.inOut' }, 0)
      .to(fromCap, { opacity: 0, y: -10, duration: 0.45, ease: 'power2.in' }, 0)
      .to(toCap, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.35)
      .set(from, { autoAlpha: 0 }, 0.95);
    // decode the next candidate ahead of time so its arrival is instant
    var pre = $slides.eq((idx + dir + N) % N).find('img')[0]; if (pre && pre.decode) pre.decode().catch($.noop);
  }
  paint();
  $prev.on('click', function () { go(idx - 1, -1); });
  $next.on('click', function () { go(idx + 1, 1); });
  $show.on('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1, 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1, -1); }
  });
  // swipe: a horizontal drag switches projects; a tap still follows the link
  var px = 0, py = 0, dragging = false, moved = false;
  $stage.on('pointerdown', function (e) { if (e.pointerType === 'mouse' && e.button !== 0) return; px = e.clientX; py = e.clientY; dragging = true; moved = false; });
  $stage.on('pointermove', function (e) {
    if (!dragging) return;
    if (!moved && Math.abs(e.clientX - px) > 10 && Math.abs(e.clientX - px) > Math.abs(e.clientY - py)) { moved = true; $stage.addClass('is-dragging'); }
  });
  function endDrag(e) {
    if (!dragging) return; dragging = false; $stage.removeClass('is-dragging');
    if (!moved) return;
    var dx = e.clientX - px;
    if (Math.abs(dx) > 44) go(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  }
  $stage.on('pointerup pointercancel', endDrag);
  // after a swipe, the click that ends it must not follow the slide's link (the page's link handlers see it as handled)
  $stage.on('click', function (e) { if (moved) { e.preventDefault(); moved = false; } });
  $stage.on('dragstart', function (e) { e.preventDefault(); });
}
initShowcase();

/* ==========================================================================
   11 · THE METHOD — an architectural drawing forms as the stages are read
   ========================================================================*/
/* the Method section is driven by method.js (shared with method.html) */

/* ---------- 13 · deep links (STUDIO / THE METHOD / PROJECTS from other pages) ---------- */
loaderDone.then(function () {
  if (hasGsap) ScrollTrigger.refresh();
  if (lenis) lenis.resize();          // pin spacers changed the document height — Lenis must learn the new limit
  if (location.hash.length > 1) {
    setTimeout(function () {
      if (location.hash === '#studio' && window.__kkGate && window.__kkGate.st) { window.__kkGate.toStudio(true); }
      else {
        var $target = $(); try { $target = $(location.hash); } catch (e) {}
        if (!$target.length) return;
        var y = $target.offset().top - (KK.navClear ? KK.navClear() : 8);   // the same landing as site.js: just below the header
        if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
      }
      if (hasGsap) ScrollTrigger.refresh();
    }, 80);
  }
});
$win.on('load', function () { if (hasGsap) ScrollTrigger.refresh(); if (lenis) lenis.resize(); });

})(jQuery);
