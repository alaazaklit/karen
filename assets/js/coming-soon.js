/* ============================================================================
   KAREN K SANCTUARIES — COMING SOON ENGINE
   00 config / env      01 utils          02 loader
   03 wings (WebGL)     04 wings (calm)   05 enquiry, standalone

   The homepage gateway's CLOSED state, held for the life of the page.
   Sections 00–04 are lifted from home-engine.js §00–05: the same renderer,
   hall plate, seam shaft, wing shader, materials, seam dust, camera and
   pointer depth. What is deliberately absent is the opening — runGate,
   applyOpening and every ScrollTrigger — so the master progress that the
   homepage drives from 0 → 1 is simply never advanced here: open, separation,
   lift and exit are 0 at every frame. The idle breathing the intro shows
   during its 2 s hold is what the wings do, indefinitely, plus a slow
   "gathering" breath (feathers brace from the seam, the seam light swells)
   that suggests they are about to open. They never do.

   Requires jQuery and site.js loaded first (START A PROJECT overlay). gsap,
   ScrollTrigger and Lenis are not used on this page.
   ==========================================================================*/
(function ($) {
'use strict';

/* ---------- 00 · config & environment ---------- */
var CFG = {
  wing: { maxAngle: 1.05, bow: 0.42 },     // identical to the homepage
  camera: { z: 10, fov: 42 },              // the intro's resting camera (no dolly)
  dprCap: 1.6,
  dust: 0.14,                              // seam-dust density (the intro's hold ran at 0.05)
  breath: 17.0,                            // seconds per gathering breath
  entranceDelay: 0.12,                     // s after the loader lifts before the copy rises
  loaderMin: 0.7                           // s the name holds in the dark before the wings
};
var KK = window.__kk || {};
var $win = $(window), $html = $(document.documentElement);
/* a detached canvas (a texture or a sprite is painted into it; it never joins the page) */
function makeCanvas(w, h) { return $('<canvas></canvas>').attr({ width: w, height: h })[0]; }
var reduceMotion = typeof KK.reduceMotion === 'boolean' ? KK.reduceMotion : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var isTouch = window.matchMedia('(pointer: coarse)').matches;
var isMobile = window.matchMedia('(max-width: 900px)').matches;
var hasWebGL = (function () {
  try { var c = makeCanvas(1, 1);
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) { return false; }
})();
var cinematic = !reduceMotion && hasWebGL && typeof THREE !== 'undefined';
if (!cinematic) $html.addClass('calm');

var FILE_ASSETS = {
  wingL: 'assets/img/wings/wing-l.webp',     // the wing artwork with its transparency baked in
  wingR: 'assets/img/wings/wing-r.webp',
  reveal: 'assets/img/wings/open-full.jpg'
};
var ASSETS = window.KK_GATE || FILE_ASSETS;
/* Opened from disk (file://) every external image taints canvas/WebGL, so the
   wing textures exist as data URIs in gateway-assets.js — fetched ONLY then. */
var assetsReady = Promise.resolve();
if (location.protocol === 'file:' && !window.KK_GATE) {
  assetsReady = new Promise(function (res) {
    // inserted natively on purpose: jQuery's append() would fetch the script over XHR, which a file:// page cannot do
    var sc = $('<script></script>').on('load error', function () { if (window.KK_GATE) ASSETS = window.KK_GATE; res(); })[0];
    sc.src = 'assets/js/gateway-assets.js';
    document.head.appendChild(sc);
  });
}

/* ---------- 01 · utils ---------- */
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function loadImg(src) {
  return new Promise(function (res, rej) { $('<img>').one('load', function () { res(this); }).one('error', rej).attr('src', src); });
}
/* the gathering breath: a raised cosine sharpened so the wings rest longer than
   they brace, its depth slowly modulated so no two breaths are identical */
function breath(t) {
  var raw = 0.5 - 0.5 * Math.cos(t * Math.PI * 2 / CFG.breath);
  return Math.pow(raw, 1.7) * (0.72 + 0.28 * Math.sin(t * 0.037 + 1.3));
}

/* ---------- 02 · loader ---------- */
var $loader = $('#loader');
var LOG = window.__kkTiming = { t0: performance.now() };
function mark(k) { LOG[k] = Math.round(performance.now() - LOG.t0); }
var loaderMin = new Promise(function (res) { setTimeout(res, reduceMotion ? 120 : CFG.loaderMin * 1000); });
var criticalReady = assetsReady.then(function () {
  return document.fonts ? document.fonts.ready : Promise.resolve();
});
var resolveWings;
var wingsReady = new Promise(function (r) { resolveWings = r; });
var entered = false;
function enter() {
  if (entered) return; entered = true;
  mark('enter');
  $loader.addClass('is-done');
  setTimeout(function () { $html.addClass('cs-in'); }, CFG.entranceDelay * 1000);
  setTimeout(function () { $html.addClass('cs-done'); }, 2600);
}
Promise.all([loaderMin, criticalReady, wingsReady]).then(enter, enter);
/* watchdog: whatever happens to WebGL, fonts or images, the page always appears */
setTimeout(enter, 15000);

/* ==========================================================================
   03 · THE WINGS — WebGL. Exactly two wings, preserved artwork, held closed.
   ========================================================================*/
function initWingsWebGL() {
  var canvas = $('#gw-canvas')[0];
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, failIfMajorPerformanceCaveat: false });
  renderer.setClearColor(0x0c0a08, 1);
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(CFG.camera.fov, 1, 0.1, 60);
  camera.position.z = CFG.camera.z;
  var root = new THREE.Group(); scene.add(root);
  var wingsGroup = new THREE.Group(); root.add(wingsGroup);

  /* --- background: the dark hall behind the wings, as in the intro's first frame --- */
  var texLoader = new THREE.TextureLoader();
  var bgTex = texLoader.load(ASSETS.reveal, sizeAll);
  bgTex.minFilter = THREE.LinearFilter;
  var bgMat = new THREE.MeshBasicMaterial({ map: bgTex, color: new THREE.Color(0.14, 0.13, 0.12) });
  var bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bgMat);
  bgMesh.position.z = -6;
  scene.add(bgMesh);

  /* --- central shaft of light --- */
  function gradTex() {
    var c = makeCanvas(128, 512);
    var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(243,233,214,0)'); g.addColorStop(.5, 'rgba(243,233,214,.85)'); g.addColorStop(1, 'rgba(243,233,214,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 512);
    var v = x.createLinearGradient(0, 0, 0, 512);
    v.addColorStop(0, 'rgba(12,10,8,1)'); v.addColorStop(.22, 'rgba(12,10,8,0)');
    v.addColorStop(.78, 'rgba(12,10,8,0)'); v.addColorStop(1, 'rgba(12,10,8,1)');
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = v; x.fillRect(0, 0, 128, 512);
    return new THREE.CanvasTexture(c);
  }
  var shaftMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 7.5),
    new THREE.MeshBasicMaterial({ map: gradTex(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  shaftMesh.position.z = -2.5;
  root.add(shaftMesh);

  /* --- wing shader: identical to the homepage (hinge curl, feather bands, lifted materials) --- */
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
    '  vec3 base = pow(tex.rgb, vec3(0.88)) * uExpo;',
    '  base *= 1.0 + 0.10 * (1.0 - vUv.y);',
    '  float rim = (1.0 - dist);',
    '  vec3 col = base + vec3(0.95, 0.84, 0.62) * uLight * pow(rim, 2.2) * 0.55;',
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
    [{ lo: 0.0, hi: 0.45, outer: 0, z: 0.03, phase: 0.0 }, { lo: 0.45, hi: 1.01, outer: 1, z: 0, phase: 1.9 }]
      .forEach(function (band) {
        var u = {
          map: { value: tex }, uOpen: { value: 0 }, uSide: { value: side },
          uTension: { value: 0 }, uTime: { value: 0 }, uCalm: { value: 1 },
          uBow: { value: CFG.wing.bow }, uMaxAngle: { value: CFG.wing.maxAngle },
          uBandPhase: { value: band.phase }, uLight: { value: 0 }, uExpo: { value: 1.18 },
          uBandLo: { value: band.lo }, uBandHi: { value: band.hi }
        };
        u._outer = band.outer; u._side = side;
        var mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
          uniforms: u, vertexShader: wingVert, fragmentShader: wingFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide
        }));
        mesh.position.z = band.z;
        group.add(mesh);
        uniformSets.push(u);
      });
    group.position.x = side * (W / 2 - 0.012);
    wingsGroup.add(group);
    return { group: group, width: W };
  }

  /* --- pointer depth (desktop only) --- */
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
    var viewH = 2 * Math.tan(vFov / 2) * CFG.camera.z, viewW = viewH * camera.aspect;
    // portrait phones are width-bound: let the wings use more of the frame there
    var wFrac = camera.aspect < 0.75 ? 0.94 : 0.82;
    var s = Math.min((viewH * 0.70) / 2.0, (viewW * wFrac) / 2.6);
    root.scale.setScalar(s);
    var bgDist = CFG.camera.z + 6;
    var bgH = 2 * Math.tan(vFov / 2) * bgDist, bgW = bgH * camera.aspect;
    var img = bgTex.image;
    if (img && img.width) {
      var cover = Math.max(bgW / (img.width / img.height), bgH);
      bgMesh.scale.set(cover * (img.width / img.height), cover, 1);
    } else bgMesh.scale.set(bgW * 1.2, bgH * 1.2, 1);
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
    g.addColorStop(0, 'rgba(246,236,218,.9)'); g.addColorStop(.4, 'rgba(243,233,214,.35)'); g.addColorStop(1, 'rgba(243,233,214,0)');
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
    function draw(t, intensity) {
      if (!W) size();
      while (motes.length < count * intensity) motes.push(spawn());
      dctx.clearRect(0, 0, W, H);
      for (var i = motes.length - 1; i >= 0; i--) {
        var m = motes[i];
        m.life += 0.016;
        m.x += m.vx;
        m.y += m.vy + Math.sin(t * 0.7 + m.phase) * 0.05;
        var fade = Math.sin(Math.min(m.life / m.span, 1) * Math.PI);
        var tw = 0.55 + 0.45 * Math.sin(t * 1.4 + m.phase * 3);
        var a = fade * tw * intensity * 0.75;
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

  /* --- the frame: the intro's hold state, breathing, with the gathering breath on top --- */
  var S = window.__kkWingsState = { open: 0, sep: 0, lift: 0, exit: 0, tension: 0, light: 0, shaft: 0, bright: 0.16, breath: 0 };
  var clock = new THREE.Clock();
  var running = true;
  function render() {
    var t = clock.getElapsedTime();
    mouse.x = lerp(mouse.x, mouse.tx, 0.045);
    mouse.y = lerp(mouse.y, mouse.ty, 0.045);
    var g = S.breath = breath(t);

    // the camera never walks in; it only sways, imperceptibly, so the frame is never still
    camera.position.z = CFG.camera.z + 0.06 * Math.sin(t * 0.081);
    camera.position.x = mouse.x * 0.12 + 0.03 * Math.sin(t * 0.053);
    camera.position.y = -mouse.y * 0.08 + 0.02 * Math.sin(t * 0.067 + 2.0);
    camera.lookAt(0, 0, -1.5);

    // the intro's idle sinusoids (hold state), verbatim — incommensurate periods, no loop
    var dpL = Math.sin(t * 0.085 + 0.9), dpR = Math.sin(t * 0.078 + 2.3);
    var brL = Math.sin(t * 0.50), brR = Math.sin(t * 0.465 + 1.4);
    var stL = Math.sin(t * 0.21 + 1.7), stR = Math.sin(t * 0.19 + 0.6);
    var idleOpenL = Math.max(0.055 + 0.040 * brL + 0.024 * dpL, 0.004) + 0.05 * g;
    var idleOpenR = Math.max(0.055 + 0.040 * brR + 0.024 * dpR, 0.004) + 0.05 * g;
    // the gathering breath: feathers brace outward from the seam, the seam light swells, the hall stirs
    S.tension = 0.38 * g;
    S.light   = 0.16 * g;
    S.shaft   = 0.14 * g;
    S.bright  = 0.16 + 0.02 * g;

    uniformSets.forEach(function (u) {
      var io = (u._side < 0 ? idleOpenL : idleOpenR), br = (u._side < 0 ? brL : brR);
      u.uTime.value = t; u.uCalm.value = 1; u.uTension.value = S.tension;
      // the hinge flexes a few degrees at most (the outer band a touch less) and the seam edge never moves —
      // there is no separation, so the silhouette stays closed
      u.uOpen.value = clamp(io * (u._outer ? 0.55 : 1.0), 0, 0.2);
      u.uLight.value = S.light + 0.16 + 0.10 * br;
      u.uExpo.value = 1.18 + S.light * 0.12 + 0.03 * br;
    });
    if (wings.L) {
      wings.L.group.position.x = -(wings.L.width / 2 - 0.012);
      wings.R.group.position.x =  (wings.R.width / 2 - 0.012);
      wings.L.group.position.y = 0.030 * stL;
      wings.R.group.position.y = 0.026 * stR;
      wings.L.group.position.z = 0.048 * Math.sin(t * 0.17);
      wings.R.group.position.z = 0.048 * Math.sin(t * 0.155 + 0.8);
      wings.L.group.scale.setScalar(1 + 0.014 * brL);
      wings.R.group.scale.setScalar(1 + 0.012 * brR);
      wings.L.group.rotation.z =  0.009 * stL;
      wings.R.group.rotation.z = -0.009 * stR;
      wings.L.group.rotation.y = ( 0.030 * Math.sin(t * 0.11 + 0.4) + 0.016 * dpL) + mouse.x * 0.02;
      wings.R.group.rotation.y = (-0.030 * Math.sin(t * 0.10 + 1.9) - 0.016 * dpR) + mouse.x * 0.02;
    }
    wingsGroup.rotation.y = mouse.x * 0.035;
    wingsGroup.rotation.x = mouse.y * 0.022;

    bgMat.color.setRGB(S.bright * 1.02, S.bright * 1.0, S.bright * 0.965);
    shaftMesh.material.opacity = S.shaft + 0.10 * (0.5 + 0.5 * brL);
    shaftMesh.scale.x = 0.25 + S.shaft * 1.4;

    renderer.render(scene, camera);
    if (dust) dust.draw(t, CFG.dust * (0.85 + 0.3 * g));
  }
  function frame() { if (!running) return; render(); requestAnimationFrame(frame); }
  window.__kkWingsDebug = { stop: function () { running = false; }, render: render, state: S };

  /* build the wings from their masters (transparency baked in), then hold */
  Promise.all([loadImg(ASSETS.wingL), loadImg(ASSETS.wingR)]).then(function (imgs) {
    wings.L = buildWing(-1, imgs[0], imgs[0].naturalWidth / imgs[0].naturalHeight);
    wings.R = buildWing( 1, imgs[1], imgs[1].naturalWidth / imgs[1].naturalHeight);
    sizeAll();
    requestAnimationFrame(frame);
    mark('wingsBuilt');

    /* render self-check: a granted context can still paint nothing (blocklisted
       drivers, virtual GPUs). Read a few pixels back; if blank, hand off to the
       static wings so nobody ever meets a black page. */
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
        if (ok) { resolveWings(); return; }
        if (tries < 3) { setTimeout(probe, 260); return; }
        running = false;
        try { renderer.dispose(); } catch (e) {}
        $(canvas).css('display', 'none');
        $html.addClass('calm webgl-failed');
        initWingsCalm();
      }
      requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(probe, 120); }); });
    })();
  }).catch(function () {
    $(canvas).css('display', 'none');
    $html.addClass('calm gateway-build-failed');
    initWingsCalm();
  });
}

/* ---------- 04 · the wings — calm (no WebGL / reduced motion): the same masters as <img>, closed ---------- */
function initWingsCalm() {
  if (!reduceMotion) $('#gw-fallback').addClass('is-idle');   // CSS breathing; static under reduced motion
  var ready = $.map($('.fb-wing.l').first().add($('.fb-wing.r').first()).get(), function (im) {
    return !im.complete ? new Promise(function (res) { $(im).one('load error', function () { res(); }); }) : Promise.resolve();
  });
  Promise.all(ready).then(resolveWings, resolveWings);
}
assetsReady.then(function () {
  if (cinematic) {
    try { initWingsWebGL(); }
    catch (e) { $html.addClass('calm gateway-init-failed'); $('#gw-canvas').css('display', 'none'); initWingsCalm(); }
  } else initWingsCalm();
});

/* ---------- 05 · START A PROJECT — the site's enquiry overlay, standalone ----------
   site.js builds the overlay on the first click of any [data-enquire]. On this
   page the rest of the site does not exist yet, so the overlay's onward links
   (projects, privacy) are removed the moment it is built: nothing here can lead
   to an unfinished page. Without JavaScript the button is a plain mailto. */
function standaloneEnquiry() {
  var $root = $('#enquiry');
  if (!$root.length || $root.is('[data-standalone]')) return;
  $root.attr('data-standalone', '');
  var $pj = $root.find('[data-rel="projects"]').first();
  if ($pj.length) { var $p = $pj.closest('p'); ($p.length ? $p : $pj).remove(); }
  $root.find('.enq-note').first().text('Your details are used only to reply to this enquiry.');
}
$(document).on('click', '[data-enquire]', standaloneEnquiry);   // after site.js's own handler, which builds the overlay

})(jQuery);
