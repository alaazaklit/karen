/* ============================================================================
   THE KAREN K METHOD — interaction (method.html and the landing section).
   Requires jQuery. Respects prefers-reduced-motion. Media slots stay honest:
   a slider only activates once both photographs exist.
   ==========================================================================*/
(function ($) {
'use strict';
var $win = $(window), $html = $(document.documentElement);
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var KK = window.__kk || {};
var rect = KK.rect || function (el) { return $(el)[0].getBoundingClientRect(); };

/* ---------- the hero (method.html): the header stays light over the photograph, ivory once it has passed ---------- */
(function heroTone() {
  var $hero = $('#km-filmhero'), $nav = $('#nav'); if (!$hero.length || !$nav.length) return;
  function tone() {
    var over = rect($hero).bottom > $nav.outerHeight() + 8;
    $nav.toggleClass('on-dark', over).toggleClass('is-solid', !over);
    $html.toggleClass('nav-solid', !over).css('--scrim', over ? '0.85' : '0');
  }
  tone(); $win.on('scroll', tone);
  if (KK.lenis && KK.lenis.on) KK.lenis.on('scroll', tone);
})();

/* ---------- the six steps: rail, active state, progress hairline ---------- */
(function steps() {
  var $steps = $('.km-step'), $rail = $('.km-rail-list'); if (!$steps.length) return;
  var $buttons = $rail.find('button');
  function activate(i) {
    $steps.each(function (j) { $(this).toggleClass('is-in', j <= i); });
    $buttons.each(function (j) { if (j === i) $(this).attr('aria-current', 'true'); else $(this).removeAttr('aria-current'); });
    $rail.css('--km-progress', ((i + 1) / $steps.length * 100).toFixed(1) + '%');
  }
  $buttons.each(function (i) {
    $(this).on('click', function () {
      var y = $steps.eq(i).offset().top - 110;
      if (KK.lenis) KK.lenis.scrollTo(y, { duration: reduce ? 0 : 1.1 });
      else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    });
  });
  if (reduce) { activate($steps.length - 1); return; }
  var io = new IntersectionObserver(function (entries) {
    $.each(entries, function (k, en) { if (en.isIntersecting) activate($steps.index(en.target)); });
  }, { rootMargin: '-40% 0px -45% 0px' });
  $steps.each(function () { io.observe(this); });
  activate(0);
})();

/* ---------- before / after: each comparison, plus the carousel between them ---------- */
$('.ba').each(function () {
  var $ba = $(this), $before = $ba.find('.ba-before'), $after = $ba.find('.ba-after'), $range = $ba.find('input[type="range"]');
  if (!($before.length && $after.length && $before.attr('src') && $after.attr('src'))) { $ba.addClass('is-empty'); return; }
  function set(v) { v = Math.max(2, Math.min(98, v)); $ba.css('--ba', v + '%'); $range.val(v).attr('aria-valuenow', Math.round(v)); }
  set(50);
  $range.on('input', function () { set(parseFloat($range.val())); });
  var dragging = false;
  function fromEvent(e) { var r = rect($ba); return (e.clientX - r.left) / r.width * 100; }
  // only start a drag from the handle zone or a deliberate press, so vertical scroll on mobile is never captured
  $ba.on('pointerdown', function (e) {
    var x = fromEvent(e), cur = parseFloat($ba.css('--ba')) || 50;
    if (e.pointerType !== 'mouse' && Math.abs(x - cur) > 16) return;   // touch: only near the line
    dragging = true; $ba[0].setPointerCapture(e.pointerId); set(x);
  });
  $ba.on('pointermove', function (e) { if (dragging) { e.preventDefault(); set(fromEvent(e)); } });
  $ba.on('pointerup pointercancel', function () { dragging = false; });
});

$('.bax').each(function () {
  var $bax = $(this), $slides = $bax.find('.bax-slide'), $dots = $bax.find('.bax-dot'), $cur = $bax.find('.bax-cur');
  var $prev = $bax.find('.bax-prev'), $next = $bax.find('.bax-next');
  if ($slides.length < 2) { $bax.find('.bax-ctl').first().css('display', 'none'); $prev.add($next).css('display', 'none'); return; }
  var idx = 0, busy = false;
  function show(n) {
    n = (n % $slides.length + $slides.length) % $slides.length; if (n === idx || busy) return;
    var $from = $slides.eq(idx), $to = $slides.eq(n); idx = n; busy = true;
    $to.prop('hidden', false); rect($to);                                // commit the unhidden slide before it fades in
    $to.addClass('is-current'); $from.removeClass('is-current');
    $dots.each(function (i) { $(this).toggleClass('is-on', i === n).attr('aria-current', i === n ? 'true' : 'false'); });
    $cur.text(('0' + (n + 1)).slice(-2));
    setTimeout(function () { $slides.each(function (i) { if (i !== idx) $(this).prop('hidden', true); }); busy = false; }, reduce ? 0 : 820);
  }
  $prev.on('click', function () { show(idx - 1); });
  $next.on('click', function () { show(idx + 1); });
  $dots.on('click', function () { show(parseInt($(this).attr('data-go'), 10)); });
  $bax.on('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); }
  });
});

/* ---------- the founder film: until the footage exists, a reel composed from the studio's photographs ---------- */
$('.km-film-frame[data-frames]').each(function () {
  var $frame = $(this), $btn = $frame.find('.km-play'); if (!$btn.length) return;
  var srcs = $frame.attr('data-frames').split('|'), titles = ($frame.attr('data-titles') || '').split('|');
  var $reel = null, $cap, $bar, timer = 0, k = 0, SEG = 3600;
  function build() {
    $reel = $('<div class="km-reel"></div>');
    $.each(srcs, function (i, s) { $('<img alt="">').attr('src', s).appendTo($reel); });
    $reel.append('<p class="km-reel-cap"></p><span class="km-reel-bar"><i></i></span>').appendTo($frame);
    $cap = $reel.find('.km-reel-cap'); $bar = $reel.find('.km-reel-bar i');
    $reel.on('click', stop);
  }
  function show(i) {
    $reel.find('img').each(function (j) { $(this).toggleClass('is-on', j === i); });
    $cap.text(titles[i] || '');
    $bar.css({ transition: 'none', transform: 'scaleX(' + (i / srcs.length) + ')' });
    rect($bar);                                                           // commit the start before the timed fill
    $bar.css({ transition: 'transform ' + SEG + 'ms linear', transform: 'scaleX(' + ((i + 1) / srcs.length) + ')' });
  }
  function stop() { clearInterval(timer); $frame.removeClass('is-playing'); }
  $btn.on('click', function () {
    if (!$reel) build();
    $frame.addClass('is-playing'); k = 0; show(0); clearInterval(timer);
    timer = setInterval(function () { k++; if (k >= srcs.length) { stop(); return; } show(k); }, SEG);
  });
});
})(jQuery);
