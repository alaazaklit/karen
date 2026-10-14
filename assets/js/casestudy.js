/* ============================================================================
   KAREN K SANCTUARIES — PROJECT CASE STUDY (projects/*.html). After site.js and projects.js.
   1 reveals   2 promenade (pinned walk on desktop, swipe strip on touch)   3 film
   4 before & after   5 full-screen viewer   6 the wings cursor (cursor.js)
   Scroll-linked motion is scrubbed (reversible); everything else answers a gesture.
   Requires jQuery.
   ==========================================================================*/
(function ($) {
'use strict';
if (!$('.cs').length) return;
var $win = $(window), $doc = $(document), $html = $(document.documentElement);
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var G = window.gsap, ST = window.ScrollTrigger;
var motion = !!(G && ST) && !reduce;
var KK = window.__kk || {};
var lenis = KK.lenis || window.__lenis || null;
var rect = KK.rect || function (el) { return $(el)[0].getBoundingClientRect(); };
var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
function pad(n) { return (n < 10 ? '0' : '') + n; }
function refresh() { if (ST) ST.refresh(); if (lenis && lenis.resize) lenis.resize(); }

/* ---------- 1 · reveals — frames open with the scroll, photographs settle inside them ---------- */
function openOnScroll($frame, $img) {
  if (!motion || !$frame.length) return;
  G.fromTo($frame, { '--clip': '8%', '--clip-x': '5%' }, { '--clip': '0%', '--clip-x': '0%', ease: 'none',
    scrollTrigger: { trigger: $frame[0], start: 'top 96%', end: 'top 38%', scrub: 0.6 } });
  if ($img && $img.length) G.fromTo($img, { yPercent: -4, scale: 1.12 }, { yPercent: 4, scale: 1.05, ease: 'none',
    scrollTrigger: { trigger: $frame[0], start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
}
openOnScroll($('.cs-feature-media').first(), $('.cs-feature-media img').first());
$('.cs-duo-media').each(function () { openOnScroll($(this), $(this).find('img').first()); });
$('.cs-ba-wrap').each(function () { openOnScroll($(this), null); });

/* ---------- 2 · the promenade — a walk through the rooms ---------- */
var $prom = $('.cs-prom').first();
if ($prom.length) (function () {
  var $vp = $prom.find('.cs-prom-viewport'), $track = $prom.find('.cs-prom-track'), $frames = $track.find('.cs-frame');
  var $countB = $prom.find('.cs-prom-count b'), $bar = $prom.find('.cs-prom-bar i'), $hint = $prom.find('.cs-prom-hint');
  function nearest() {
    var cx = window.innerWidth / 2, best = 0, bd = 1e9;
    $frames.each(function (i) { var r = rect(this), d = Math.abs(r.left + r.width / 2 - cx); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function setCount() { $countB.text(pad(nearest() + 1)); }
  var pinnable = window.matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine)').matches && $frames.length > 1;
  if (motion && pinnable) {
    $prom.addClass('is-pinned');
    var dist = function () { return Math.max(0, $track[0].scrollWidth - $vp[0].clientWidth); };
    var tw = G.to($track, { x: function () { return -dist(); }, ease: 'none',
      // the counter and the line follow the (smoothed) movement itself, not the raw scroll
      onUpdate: function () { $bar.css('transform', 'scaleX(' + this.progress().toFixed(4) + ')'); setCount(); },   // `this` is the tween (it can fire during creation)
      scrollTrigger: { trigger: $prom[0], start: 'top top', end: function () { return '+=' + Math.round(dist() * 1.1); }, pin: true, scrub: 0.7,
        invalidateOnRefresh: true, anticipatePin: 1 } });
    $frames.each(function () {
      var $img = $(this).find('img').first();
      if ($img.length) G.fromTo($img, { xPercent: -5, scale: 1.12 }, { xPercent: 5, scale: 1.12, ease: 'none',
        scrollTrigger: { trigger: this, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
    });
  } else {
    $prom.addClass('is-swipe');
    $hint.text('Swipe to walk through');
    $vp.on('scroll', function () {
      var p = $vp.scrollLeft() / Math.max(1, $vp[0].scrollWidth - $vp[0].clientWidth);
      $bar.css('transform', 'scaleX(' + p.toFixed(4) + ')'); setCount();
    });
    // on a desktop mouse without pinning (reduced motion), shift + wheel scrolls the strip sideways
    if (fine) $vp.on('wheel', function (e) {
      var w = e.originalEvent;
      if (Math.abs(w.deltaY) > Math.abs(w.deltaX) && w.shiftKey) { $vp.scrollLeft($vp.scrollLeft() + w.deltaY); e.preventDefault(); }
    });
  }
})();

/* ---------- 3 · the film — a silent sequence composed from the project's photographs ---------- */
$('[data-film]').each(function () {
  var sec = this, $sec = $(sec);
  var $stage = $sec.find('.cs-film-stage'), $frames = $sec.find('.cs-film-frame'), $poster = $sec.find('.cs-film-poster'), $title = $sec.find('.cs-film-titlecard');
  var $playBtn = $sec.find('.cs-film-play'), $toggle = $sec.find('.cs-film-toggle'), $time = $sec.find('.cs-film-time'), $prog = $sec.find('.cs-film-progress i');
  var SEG = 4.2, X = 1.4, total = $frames.length * SEG + X, tl = null, state = 'idle', idleT = 0;
  function fmt(t) { t = Math.max(0, Math.round(t)); return pad(Math.floor(t / 60)) + ':' + pad(t % 60); }
  function load() { $frames.each(function () { var $f = $(this); if (!$f.attr('src')) $f.attr('src', $f.attr('data-src')); }); }
  function build() {
    tl = G.timeline({ paused: true, onComplete: finish,
      onUpdate: function () { var t = tl.time(); $prog.css('transform', 'scaleX(' + (t / total).toFixed(4) + ')'); $time.text(fmt(t) + ' / ' + fmt(total)); } });
    tl.set($frames, { autoAlpha: 0 });
    $frames.each(function (i, f) {
      var t0 = i * SEG, dir = i % 2 ? 1 : -1;
      tl.to(f, { autoAlpha: 1, duration: X, ease: 'power1.inOut' }, t0);
      if (reduce) tl.set(f, { scale: 1.04 }, t0);
      else if (i % 3 === 2) tl.fromTo(f, { scale: 1.1, xPercent: dir * 2.4 }, { scale: 1.1, xPercent: -dir * 2.4, duration: SEG + X, ease: 'none' }, t0);   // a slow pan
      else tl.fromTo(f, { scale: i % 2 ? 1.12 : 1.02 }, { scale: i % 2 ? 1.02 : 1.12, duration: SEG + X, ease: 'none' }, t0);                      // push in, pull back
      if (i > 0) tl.set($frames[i - 1], { autoAlpha: 0 }, t0 + X);
    });
    if ($title.length) tl.fromTo($title, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1.3, ease: 'power2.out' }, 0.5).to($title, { autoAlpha: 0, duration: 1, ease: 'power1.in' }, 3.3);
    tl.to($frames[$frames.length - 1], { autoAlpha: 0, duration: X, ease: 'power1.inOut' }, $frames.length * SEG);
  }
  function awake() { $sec.removeClass('is-idle'); clearTimeout(idleT); if (state === 'playing') idleT = setTimeout(function () { $sec.addClass('is-idle'); }, 2400); }
  function play() {
    if (!G) return;
    load(); if (!tl) build();
    $sec.addClass('is-playing').removeClass('is-paused'); state = 'playing';
    if (tl.progress() >= 1 || tl.progress() === 0) tl.restart(); else tl.play();
    $toggle.attr('aria-label', 'Pause the film'); awake();
  }
  function pause() { if (state !== 'playing') return; tl.pause(); state = 'paused'; $sec.addClass('is-paused'); $toggle.attr('aria-label', 'Play the film'); awake(); }
  function finish() {
    state = 'idle'; $sec.removeClass('is-playing is-paused is-idle'); $prog.css('transform', 'scaleX(0)');
    if ($playBtn.length) $playBtn[0].focus({ preventScroll: true });
  }
  $playBtn.on('click', play);
  $toggle.on('click', function (e) { e.stopPropagation(); if (state === 'playing') pause(); else play(); });
  $stage.on('click', function (e) {
    if (state === 'idle' || $(e.target).closest('.cs-film-bar, .cs-film-play').length) return;
    if (state === 'playing') pause(); else play();
  });
  $stage.on('pointermove', awake);
  $sec.on('keydown', function (e) { if ((e.key === ' ' || e.key === 'k') && state !== 'idle') { e.preventDefault(); if (state === 'playing') pause(); else play(); } });
  new IntersectionObserver(function (en) { if (!en[0].isIntersecting) pause(); }, { threshold: 0.25 }).observe(sec);
  // the poster is alive but quiet: a very slow breath, and depth with the scroll
  if (motion) {
    var $pimg = $sec.find('.cs-film-poster img').first();
    if ($pimg.length) G.fromTo($pimg, { scale: 1.03 }, { scale: 1.09, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    if ($poster.length) G.fromTo($poster, { yPercent: -3 }, { yPercent: 3, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
  }
});

/* ---------- 4 · before & after ---------- */
$('[data-ba]').each(function () {
  var $ba = $(this), $range = $ba.find('.ba2-range'), $tagB = $ba.find('.ba2-tag--before'), $tagA = $ba.find('.ba2-tag--after');
  var v = 50, drag = false, pid = null, moved = false, touched = false, hintTl = null;
  function set(x) {
    v = Math.max(0, Math.min(100, x));
    $ba.css('--ba', v.toFixed(2) + '%');
    $range.val(v).attr('aria-valuetext', Math.round(v) + ' percent before, ' + Math.round(100 - v) + ' percent after');
    $tagB.css('opacity', v < 14 ? 0 : 1); $tagA.css('opacity', v > 86 ? 0 : 1);
  }
  function glide(to) { if (!G || reduce) { set(to); return; } var o = { x: v }; G.to(o, { x: to, duration: 0.8, ease: 'expo.out', onUpdate: function () { set(o.x); } }); }
  function stopHint() { touched = true; if (hintTl) { hintTl.kill(); hintTl = null; } }
  function x2v(e) { var r = rect($ba); return (e.clientX - r.left) / r.width * 100; }
  set(50);
  $ba.on('pointerdown', function (e) {
    if (e.button > 0) return;
    moved = false;
    // touch starts a drag only on the line, so a vertical swipe elsewhere still scrolls the page
    var near = Math.abs(x2v(e) - v) < (e.pointerType === 'mouse' ? 101 : 9);
    if (!near) return;
    drag = true; pid = e.pointerId; $ba[0].setPointerCapture(pid); $ba.addClass('is-dragging'); stopHint();
    if (e.pointerType === 'mouse') set(x2v(e));
  });
  $ba.on('pointermove', function (e) { if (drag && e.pointerId === pid) { moved = true; set(x2v(e)); } });
  $ba.on('pointerup pointercancel', function () { drag = false; $ba.removeClass('is-dragging'); });
  $ba.on('click', function (e) { if (moved) return; stopHint(); glide(x2v(e)); });   // a tap moves the line there
  $range.on('input', function () { stopHint(); set(parseFloat($range.val())); });
  $ba.on('keydown', function (e) {
    if (e.target !== $range[0]) return;
    if (e.key === 'Home') { e.preventDefault(); glide(0); }
    if (e.key === 'End') { e.preventDefault(); glide(100); }
  });
  // once, when it first comes into view, the line breathes to show it can move
  if (motion) new IntersectionObserver(function (en, ob) {
    if (!en[0].isIntersecting || touched) return; ob.disconnect();
    var o = { x: 50 };
    hintTl = G.timeline({ delay: 0.4 }).to(o, { x: 36, duration: 0.9, ease: 'sine.inOut', onUpdate: function () { set(o.x); } })
      .to(o, { x: 60, duration: 1.1, ease: 'sine.inOut', onUpdate: function () { set(o.x); } })
      .to(o, { x: 50, duration: 0.8, ease: 'sine.inOut', onUpdate: function () { set(o.x); } });
  }, { threshold: 0.55 }).observe(this);
});

/* ---------- 5 · full-screen viewer ---------- */
var $items = $('[data-view]');
if ($items.length) (function () {
  var $vw = $('<div class="cs-viewer" role="dialog" aria-modal="true" aria-label="Photographs, full screen" hidden></div>').html(
    '<div class="cs-viewer-stage"><img alt=""></div><p class="cs-viewer-cap"></p><p class="cs-viewer-count"></p>' +
    '<button class="cs-viewer-btn cs-viewer-close" type="button" aria-label="Close"><i></i></button>' +
    '<button class="cs-viewer-btn cs-viewer-prev" type="button" aria-label="Previous photograph"><i class="arrow arrow--back"></i></button>' +
    '<button class="cs-viewer-btn cs-viewer-next" type="button" aria-label="Next photograph"><i class="arrow"></i></button>').appendTo('body');
  var $img = $vw.find('img'), $cap = $vw.find('.cs-viewer-cap'), $cnt = $vw.find('.cs-viewer-count'), cur = 0, last = null;
  /* the largest file the photograph offers */
  function big(el) {
    var $i = $(el).find('img').first(); if (!$i.length) return '';
    var best = ['', 0];
    $.each(($i.attr('srcset') || '').split(','), function (k, s) { var a = s.trim().split(/\s+/); var w = parseInt(a[1], 10) || 0; if (a[0] && w > best[1]) best = [a[0], w]; });
    return best[0] || $i.prop('currentSrc') || $i.prop('src');
  }
  function show(n, dir) {
    cur = (n + $items.length) % $items.length;
    var el = $items[cur], s = big(el), alt = $(el).find('img').attr('alt') || '';
    $cap.text($(el).attr('data-cap') || ''); $cnt.html('<b>' + pad(cur + 1) + '</b> / ' + pad($items.length));
    if (motion && dir) {
      G.to($img, { autoAlpha: 0, x: -dir * 28, duration: 0.22, ease: 'power2.in', onComplete: function () {
        $img.attr({ src: s, alt: alt }); G.fromTo($img, { autoAlpha: 0, x: dir * 28 }, { autoAlpha: 1, x: 0, duration: 0.6, ease: 'expo.out' }); } });
    } else { $img.attr({ src: s, alt: alt }); if (motion) G.fromTo($img, { autoAlpha: 0, scale: 0.97 }, { autoAlpha: 1, scale: 1, duration: 0.7, ease: 'expo.out' }); }
    $.each([cur + 1, cur - 1], function (i, k) { $('<img>').attr('src', big($items[(k + $items.length) % $items.length])); });   // preload the neighbours
  }
  function open(i) {
    last = document.activeElement; $vw.prop('hidden', false); $html.addClass('viewer-open');
    window.requestAnimationFrame(function () { $vw.addClass('is-open'); });
    show(i, 0); if (lenis && lenis.stop) lenis.stop(); $vw.find('.cs-viewer-close').trigger('focus');
  }
  function close() {
    $vw.removeClass('is-open'); $html.removeClass('viewer-open');
    setTimeout(function () { $vw.prop('hidden', true); }, 450); if (lenis && lenis.start) lenis.start(); if (last) last.focus({ preventScroll: true });
  }
  $items.each(function (i) {
    var $el = $(this);
    $el.attr({ tabindex: '0', role: 'button', 'aria-label': 'View full screen — ' + ($el.attr('data-cap') || 'photograph') })
      .on('click', function () { open(i); })
      .on('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
  });
  $vw.find('.cs-viewer-close').on('click', close);
  $vw.find('.cs-viewer-prev').on('click', function () { show(cur - 1, -1); });
  $vw.find('.cs-viewer-next').on('click', function () { show(cur + 1, 1); });
  $vw.on('click', function (e) { if (e.target === $vw[0] || $(e.target).hasClass('cs-viewer-stage')) close(); });
  $doc.on('keydown', function (e) {
    if ($vw.prop('hidden')) return;
    if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') show(cur + 1, 1); else if (e.key === 'ArrowLeft') show(cur - 1, -1);
    else if (e.key === 'Tab') {
      var $f = $vw.find('button'), a = $f.index(document.activeElement); e.preventDefault();
      $f.eq((a + (e.shiftKey ? -1 : 1) + $f.length) % $f.length).trigger('focus');
    }
  });
  var sx = 0, sy = 0;
  $vw.on('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; });
  $vw.on('pointerup', function (e) { var dx = e.clientX - sx; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - sy)) show(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); });
})();

/* ---------- 6 · the wings cursor on fine pointers: View · Drag · Next project (cursor.js) ---------- */
if (fine && !reduce && window.__kkCursor) {
  window.__kkCursor.bind($('.cs-feature-media, .cs-frame-media, .cs-duo-media'), 'View');
  window.__kkCursor.bind($('[data-ba]'), 'Drag');
  window.__kkCursor.bind($('.pd-nextfull .wk-media'), 'Next project');
}

$win.on('load', refresh);
})(jQuery);
