/* ============================================================================
   KAREN K SANCTUARIES — the wings cursor (projects listing + project pages)

   On a fine pointer, over a photograph that opens something, the arrow gives
   way to the studio's golden wings (assets/img/cursor/), meeting just above the
   pointer, with the action named beneath them ("View project", "View", "Drag",
   "Next project"). They rise folded and open over the photograph, then fly:
   a slow wing-beat while the hand rests that quickens and widens as it moves,
   the body lifting a little on every downbeat, banking into turns, the gold
   catching the light at the bottom of each beat, and one quick beat on a
   press. Moving straight from one photograph to the next keeps them in the air.

   The flight is computed here, one requestAnimationFrame loop that runs only
   while the wings are on screen; the poses and the look are in projects.css § 6.
   Touch and coarse pointers never see it, and with reduced motion the native
   pointer is kept. The native arrow is hidden only once both wings have loaded.

   Exposed as window.__kkCursor.bind($elements, label). Requires jQuery.
   ========================================================================== */
(function ($) {
'use strict';
var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!fine || reduce) { window.__kkCursor = { bind: $.noop }; return; }

/* the wing artwork sits beside this script: assets/js/cursor.js → assets/img/cursor/ */
var base = new URL('../img/cursor/', $(document.currentScript).prop('src') || window.location.href).href;

var $cur = $('<div class="kk-cur" aria-hidden="true"></div>');
var $fly = $('<div class="kk-cur-fly"></div>').appendTo($cur);            // banks, and lifts with the beat
var $pair = $('<div class="kk-cur-pair"><span class="kk-cur-halo"></span></div>').appendTo($fly);
var loaded = 0, ready = $.Deferred();
$.each(['l', 'r'], function (i, side) {
  $('<span class="kk-cur-wing kk-cur-wing--' + side + '"></span>')
    .append($('<img>')
      .one('load', function () { if (++loaded === 2) ready.resolve(); })
      .one('error', function () { ready.reject(); })
      .attr({ src: base + 'wing-' + side + '.webp', alt: '', width: 168, height: 245, decoding: 'async', 'data-rescue': 'off' }))   // never swapped for a photograph
    .appendTo($pair);
});
var $label = $('<span class="kk-cur-label"></span>').appendTo($cur);      // stays level while the wings bank
$cur.appendTo('body');

/* ---- flight ---- */
var tx = 0, ty = 0, x = 0, y = 0;                   // where the hand is, where the wings are
var vx = 0, vy = 0;                                 // the wings' smoothed velocity, px per 60 Hz frame
var amp = 4.5, freq = 0.42, phase = Math.PI / 2;    // wing-beat: degrees, beats per second, radians
var bank = 0, beat = 0, beatV = 0;                  // banking angle; the press beat (a damped spring)
var on = false, raf = 0, lastT = 0, settleUntil = 0, linger = 0;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function frame(now) {
  var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 1 / 60; lastT = now;
  var f = dt * 60;                                                    // frames elapsed at 60 Hz
  var k = 1 - Math.pow(0.78, f);                                      // follow the hand: 22 % of the way per frame
  var nx = x + (tx - x) * k, ny = y + (ty - y) * k;
  vx += ((nx - x) / f - vx) * 0.25; vy += ((ny - y) / f - vy) * 0.25;
  x = nx; y = ny;

  var speed = clamp(Math.sqrt(vx * vx + vy * vy) / 16, 0, 1);         // 0 at rest, 1 in quick flight
  amp += (4.5 + 8.5 * speed - amp) * (1 - Math.pow(0.92, f));         // the beat widens…
  freq += (0.42 + 0.95 * speed - freq) * (1 - Math.pow(0.92, f));     // …and quickens with the hand
  phase += dt * freq * Math.PI * 2;
  var s = Math.sin(phase);
  var wave = (s + 0.22 * Math.sin(2 * phase)) / 1.1;                  // a quicker downbeat than upbeat

  beatV += (-beat * 240 - beatV * 20) * dt; beat += beatV * dt;       // the press: one beat, settling at once

  var ang = amp * wave + beat - clamp(vy * 0.35, -6, 6);              // + raises the wings; a fall lifts them, a climb draws them down
  bank += (clamp(vx * 0.75, -10, 10) - bank) * (1 - Math.pow(0.85, f));

  $cur.css('transform', 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)');
  $fly.css({
    '--bank': bank.toFixed(2) + 'deg',
    '--bob': (-(1.3 + 1.7 * speed) * Math.cos(phase)).toFixed(2) + 'px',   // the body rises through the downbeat
    '--wl': ang.toFixed(2) + 'deg',
    '--wr': (-ang).toFixed(2) + 'deg',
    '--shine': (1 + 0.1 * Math.max(0, -s)).toFixed(3),                     // the gold catches the light low in the beat
    '--glow': (0.62 + 0.22 * Math.max(0, -s)).toFixed(3)
  });
  raf = (on || now < settleUntil) ? window.requestAnimationFrame(frame) : 0;
}
function wake() { if (!raf) { lastT = 0; raf = window.requestAnimationFrame(frame); } }

function rest() {                                   // leave: a short grace, so a move to the next photograph keeps them flying
  clearTimeout(linger);
  linger = setTimeout(function () {
    on = false; $cur.removeClass('is-on is-down');
    settleUntil = window.performance.now() + 600;   // fly on while they fold away
  }, 90);
}

function bind($els, label) {
  ready.done(function () {                          // never hide the arrow before the wings can replace it
    $($els).css('cursor', 'none')
      .on('pointerenter.kkcur', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        clearTimeout(linger);
        $label.text(label);
        tx = e.clientX; ty = e.clientY;
        if (!on) { x = tx; y = ty; vx = vy = 0; bank = 0; amp = 4.5; freq = 0.42; phase = Math.PI / 2; }   // a fresh arrival starts at the hand, wings high
        on = true; $cur.addClass('is-on');
        wake();
      })
      .on('pointermove.kkcur', function (e) { tx = e.clientX; ty = e.clientY; wake(); })
      .on('pointerleave.kkcur', rest)
      .on('pointerdown.kkcur', function () { $cur.addClass('is-down'); beatV -= 210; wake(); })
      .on('pointerup.kkcur pointercancel.kkcur', function () { $cur.removeClass('is-down'); });
  });
}
$(window).on('blur', function () { clearTimeout(linger); on = false; $cur.removeClass('is-on is-down'); });
window.__kkCursor = { bind: bind, $el: $cur };
})(jQuery);
