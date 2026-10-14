/* ============================================================================
   KAREN K SANCTUARIES — the wings cursor (projects listing + project pages)

   On a fine pointer, over a photograph that opens something, the arrow gives
   way to the two wings of the Karen K mark (assets/img/cursor/). They arrive
   folded, as the gateway's wings are before the homepage opens, and unfold
   over the photograph; a small caption beneath them names the action
   ("View project", "View", "Drag", "Next project"). In flight they bank with
   the hand and lift or settle with its vertical speed; at rest they breathe;
   a press is a single wing-beat. Touch and coarse pointers never see it, and
   with reduced motion the native pointer is kept.

   Exposed as window.__kkCursor.bind($elements, label).
   Styles: projects.css § 6. Requires jQuery.
   ========================================================================== */
(function ($) {
'use strict';
var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!fine || reduce) { window.__kkCursor = { bind: $.noop }; return; }

/* the wing artwork sits beside this script: assets/js/cursor.js → assets/img/cursor/ */
var base = new URL('../img/cursor/', $(document.currentScript).prop('src') || window.location.href).href;

var $cur = $('<div class="kk-cur" aria-hidden="true"></div>');
var $body = $('<div class="kk-cur-body"></div>').appendTo($cur);          // banks with the hand
$.each([['l', 139], ['r', 140]], function (i, w) {
  $('<span class="kk-cur-wing kk-cur-wing--' + w[0] + '"></span>')
    .append($('<img>').attr({ src: base + 'wing-' + w[0] + '.webp', alt: '', width: 168, height: w[1], decoding: 'async' }))
    .appendTo($body);
});
var $label = $('<span class="kk-cur-label"></span>').appendTo($cur);      // stays level while the wings bank
$cur.appendTo('body');

var tx = -400, ty = -400, x = -400, y = -400, on = false, raf = 0;
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function frame() {
  x += (tx - x) * 0.2; y += (ty - y) * 0.2;
  var vx = tx - x, vy = ty - y;                                           // how far the cursor trails the hand
  $cur.css('transform', 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)');
  $body.css({
    '--bank': clamp(vx / 10, -12, 12).toFixed(2) + 'deg',                 // into the turn
    '--flap': clamp(vy / 7, -12, 12).toFixed(2) + 'deg'                   // rising spreads the wings, falling gathers them
  });
  raf = (on || Math.abs(vx) + Math.abs(vy) > 0.3) ? window.requestAnimationFrame(frame) : 0;
}
function wake() { if (!raf) raf = window.requestAnimationFrame(frame); }
function rest() { on = false; $cur.removeClass('is-on is-down'); }

function bind($els, label) {
  $($els).css('cursor', 'none')
    .on('pointerenter.kkcur', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      $label.text(label);
      on = true; tx = e.clientX; ty = e.clientY;
      if (x < -200) { x = tx; y = ty; }
      $cur.addClass('is-on');
      wake();
    })
    .on('pointermove.kkcur', function (e) { tx = e.clientX; ty = e.clientY; wake(); })
    .on('pointerleave.kkcur', rest)
    .on('pointerdown.kkcur', function () { $cur.addClass('is-down'); })
    .on('pointerup.kkcur', function () { $cur.removeClass('is-down'); });
}
$(window).on('blur', rest);
window.__kkCursor = { bind: bind, $el: $cur };
})(jQuery);
