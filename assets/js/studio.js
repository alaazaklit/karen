/* ============================================================================
   THE STUDIO PAGE — studio.html. After site.js. Requires jQuery.
   0 the header over the hero
   1 the hero film: plays the studio's own edit once the <video class="sv-video">
     is given a source and that file loads; until then it plays a silent sequence
     composed from the studio's photography, so the hero is never an empty frame.
   2 the questions: a plain accordion — buttons, aria-expanded, no height maths.
   ==========================================================================*/
(function ($) {
'use strict';
var $win = $(window), $html = $(document.documentElement);
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var G = window.gsap;
var KK = window.__kk || {};
var lenis = KK.lenis || window.__lenis || null;
var rect = KK.rect || function (el) { return $(el)[0].getBoundingClientRect(); };
var $nav = $('#nav');
function pad(n) { return (n < 10 ? '0' : '') + n; }

/* ---------- 0 · the header over the hero: light type on its own scrim, the ivory bar once the hero has passed ---------- */
(function navOverHero() {
  var $h = $('.sv-hero'); if (!$h.length || !$nav.length) return;
  function tone() {
    var over = rect($h).bottom > ($nav.outerHeight() + 8);
    $nav.toggleClass('on-dark', over).toggleClass('is-solid', !over);
    $html.toggleClass('nav-solid', !over).css('--scrim', over ? '0.85' : '0');
  }
  tone();
  $win.on('scroll resize', tone);
  if (lenis && lenis.on) lenis.on('scroll', tone);
})();

/* ---------- 1 · the hero film ---------- */
var $hero = $('.sv-hero');
if ($hero.length) (function () {
  var $stage = $hero.find('.sv-stage'), $frames = $hero.find('.sv-frame'), $video = $hero.find('.sv-video');
  var $play = $hero.find('.sv-play'), $toggle = $hero.find('.sv-toggle'), $time = $hero.find('.sv-time'), $prog = $hero.find('.sv-prog i');
  var SEG = 4.4, X = 1.5, total = $frames.length * SEG + X, tl = null, state = 'idle', idleT = 0, real = false;

  // is the studio's own edit actually there? (a missing file must never leave a black frame)
  var src = $video.find('source').attr('src');
  if (src) {
    $('<video></video>').on('loadedmetadata', function () { real = true; $video.attr('data-ready', ''); })
      .prop('preload', 'metadata').attr('src', src);
  }
  function fmt(t) { t = Math.max(0, Math.round(t)); return pad(Math.floor(t / 60)) + ':' + pad(t % 60); }
  function awake() { $hero.removeClass('is-idle'); clearTimeout(idleT); if (state === 'playing') idleT = setTimeout(function () { $hero.addClass('is-idle'); }, 2400); }
  function build() {
    $frames.each(function () { var $f = $(this); if (!$f.attr('src')) $f.attr('src', $f.attr('data-src')); });
    tl = G.timeline({ paused: true, onComplete: finish, onUpdate: function () {
      var t = tl.time(); $prog.css('transform', 'scaleX(' + (t / total).toFixed(4) + ')');
      $time.text(fmt(t) + ' / ' + fmt(total)); } });
    tl.set($frames, { autoAlpha: 0 });
    $frames.each(function (i, f) {
      var t0 = i * SEG, dir = i % 2 ? 1 : -1;
      tl.to(f, { autoAlpha: 1, duration: X, ease: 'power1.inOut' }, t0);
      if (reduce) tl.set(f, { scale: 1.04 }, t0);
      else if (i % 3 === 2) tl.fromTo(f, { scale: 1.1, xPercent: dir * 2.2 }, { scale: 1.1, xPercent: -dir * 2.2, duration: SEG + X, ease: 'none' }, t0);
      else tl.fromTo(f, { scale: i % 2 ? 1.12 : 1.02 }, { scale: i % 2 ? 1.02 : 1.12, duration: SEG + X, ease: 'none' }, t0);
      if (i > 0) tl.set($frames[i - 1], { autoAlpha: 0 }, t0 + X);
    });
    tl.to($frames[$frames.length - 1], { autoAlpha: 0, duration: X, ease: 'power1.inOut' }, $frames.length * SEG);
  }
  function start() {
    $hero.addClass('is-playing').removeClass('is-paused'); state = 'playing'; awake();
    if (real) { $video[0].play().catch($.noop); $toggle.attr('aria-label', 'Pause the film'); return; }
    if (!G) return;
    if (!tl) build();
    if (tl.progress() >= 1 || tl.progress() === 0) tl.restart(); else tl.play();
    $toggle.attr('aria-label', 'Pause the film');
  }
  function pause() {
    if (state !== 'playing') return;
    if (real) $video[0].pause(); else if (tl) tl.pause();
    state = 'paused'; $hero.addClass('is-paused'); $toggle.attr('aria-label', 'Play the film'); awake();
  }
  function finish() {
    state = 'idle'; $hero.removeClass('is-playing is-paused is-idle'); $prog.css('transform', 'scaleX(0)');
    if ($play.length) $play[0].focus({ preventScroll: true });
  }
  $play.on('click', start);
  $toggle.on('click', function (e) { e.stopPropagation(); if (state === 'playing') pause(); else start(); });
  $stage.on('click', function (e) {
    if (state === 'idle' || $(e.target).closest('.sv-bar, .sv-play').length) return;
    if (state === 'playing') pause(); else start();
  });
  $stage.on('pointermove', awake);
  $hero.on('keydown', function (e) { if ((e.key === ' ' || e.key === 'k') && state !== 'idle') { e.preventDefault(); if (state === 'playing') pause(); else start(); } });
  new IntersectionObserver(function (en) { if (!en[0].isIntersecting) pause(); }, { threshold: 0.25 }).observe($hero[0]);
  if ($video.length) {
    $video.on('timeupdate', function () {
      var v = this;
      if (!real || !v.duration) return;
      $prog.css('transform', 'scaleX(' + (v.currentTime / v.duration).toFixed(4) + ')');
      $time.text(fmt(v.currentTime) + ' / ' + fmt(v.duration));
    });
    $video.on('ended', finish);
  }
  if (G && !reduce) {   // the poster breathes, very slowly, so the hero is alive before anyone presses play
    var $pimg = $hero.find('.sv-poster img').first();
    if ($pimg.length) G.fromTo($pimg, { scale: 1.03 }, { scale: 1.09, duration: 18, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }
  $time.text('00:00 / ' + fmt(total));
})();

/* ---------- 2 · the questions ---------- */
$('.faq-item').each(function () {
  var $item = $(this), $btn = $item.find('.faq-q'), $panel = $item.find('.faq-a');
  if (!$btn.length || !$panel.length) return;
  $btn.on('click', function () {
    var open = !$item.hasClass('is-open');
    $item.toggleClass('is-open', open);
    $btn.attr('aria-expanded', String(open));
  });
});
})(jQuery);
