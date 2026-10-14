/* ==========================================================================
   KAREN K SANCTUARIES — shared behaviours (every page)

   00 helpers, the hero lockup, the image safety net
   01 environment & smooth scroll     02 navigation & anchors
   03 menu overlay                    04 page veil (light transition)
   05 reveal system (play once)       06 START A PROJECT overlay
   07 small things (year, dotted lists, silent films)

   Requires jQuery. gsap + ScrollTrigger + Lenis are optional: without them
   every feature degrades to a static, fully readable page.
   window.__kk is the small API the page scripts share (see the end of § 01).
   ========================================================================== */
(function ($) {
'use strict';

var $win = $(window), $doc = $(document), $html = $(document.documentElement);

/* ---------- 00 · helpers ---------- */
/* the assets folder, wherever the page sits (site root or /projects/) — this file is assets/js/site.js */
var ASSETS = new URL('../', $(document.currentScript).prop('src') || window.location.href).href;
function asset(path) { return ASSETS + path; }
/* the element's box on screen (transforms included); jQuery has no viewport-relative equivalent */
function rect(el) { return $(el)[0].getBoundingClientRect(); }

/* jQuery cannot pass listener options. The two scroll-blocking listeners this site cancels — the homepage seal while the
   intro plays (wheel, touchmove) and shift + wheel on a project's promenade strip — must be registered as non-passive,
   or browsers ignore their preventDefault() on window-level targets. */
$.each(['wheel', 'touchmove'], function (i, type) {
  $.event.special[type] = {
    setup: function (data, ns, handle) { this.addEventListener(type, handle, { passive: false }); },
    teardown: function (ns, handle) { this.removeEventListener(type, handle, { passive: false }); }
  };
});

/* ---------- the hero lockup: set the second word's tracking so it reads the width of the first ---------- */
(function fitLockup() {
  function fit() {
    var $name = $('.gw-name'); if (!$name.length) return;
    var $k = $name.find('.wm-k'), $sub = $name.find('.wm-s');
    if (!$k.length || !$sub.length) return;
    var n = ($sub.text() || '').trim().length; if (!n) return;
    var fs = parseFloat($sub.css('font-size')) || 1, track = 0;
    for (var pass = 0; pass < 5; pass++) {                              // converge: measure, correct, measure again
      $sub.css('--wm-track', track.toFixed(4) + 'em');
      var target = rect($k).width, now = rect($sub).width;
      if (!target || !now) return;
      if (Math.abs(target - now) < 0.5) break;
      track = Math.max(0, Math.min(1.05, track + (target - now) / n / fs));
    }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  $win.on('load resize', fit);
  setTimeout(fit, 300); setTimeout(fit, 1200); setTimeout(fit, 2600);
  var $n0 = $('.gw-name');
  if (window.ResizeObserver && $n0.length) new ResizeObserver(fit).observe($n0[0]);
})();

/* ---------- the image safety net — a failed photograph is replaced by a real one, never left empty ----------
   Every <img> is watched (those added later — film frames, the viewer, reels, the cursor — as they arrive). A failure
   swaps in one of the studio's photographs (assets/img/fallback/, in rotation from a page-specific start so
   neighbouring frames never repeat); if even that fails, an image embedded below is used. Artwork that must never
   turn into a photograph (the cursor's wings) opts out with data-rescue="off". */
var guardImages = (function imageSafetyNet() {
  var base = asset('img/fallback/');
  var LAST = 'data:image/webp;base64,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';
  var turn = (function (k) { var h = 0; for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0; return Math.abs(h); })(window.location.pathname);
  function pick() { return base + '0' + (1 + (turn++ % 6)) + '.webp'; }
  function rescue(img) {
    var $img = $(img), mark = $img.attr('data-rescue'), stage = +(mark || 0);
    if (mark === 'off' || stage >= 2) return;
    $img.attr('data-rescue', String(stage + 1));
    $img.parent('picture').children('source').remove();
    $img.removeAttr('srcset sizes').attr('src', stage === 0 ? pick() : LAST);
    window.__kkRescued = (window.__kkRescued || 0) + 1;
  }
  function failed() { var $img = $(this); if ($img.attr('src') || $img.attr('srcset')) rescue(this); }
  function guard($imgs) { $($imgs).off('error.kkSafety').on('error.kkSafety', failed); }
  function sweep() {
    $('img').each(function () { if (this.complete && this.naturalWidth === 0 && (this.currentSrc || $(this).attr('src'))) rescue(this); });
  }
  guard($('img'));
  sweep();
  $win.on('load', sweep);
  if (window.MutationObserver) {
    new MutationObserver(function (records) {
      $.each(records, function (i, r) {
        $(r.addedNodes).filter(function () { return this.nodeType === 1; }).each(function () { guard($(this).find('img').addBack('img')); });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  return guard;
})();

/* ---------- 01 · environment & smooth scroll ---------- */
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
var isHome = $html.hasClass('is-home');

if (hasGsap) {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  ScrollTrigger.clearScrollMemory('manual');
  if (!window.location.hash) window.scrollTo(0, 0);
}

var lenis = null;
if (!reduceMotion && typeof window.Lenis !== 'undefined') {
  /* lerp (not duration): the page answers the wheel on the very next frame and
     settles in ~0.4 s — smooth, never floaty, never fighting the hand */
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1.0, touchMultiplier: 1.35, smoothWheel: true });
  if (hasGsap) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    var raf = function (time) { lenis.raf(time); window.requestAnimationFrame(raf); };
    window.requestAnimationFrame(raf);
  }
  window.__lenis = lenis;
}

var scrollLocks = 0;
function lockScroll(on) {
  scrollLocks = Math.max(0, scrollLocks + (on ? 1 : -1));
  var locked = scrollLocks > 0;
  $html.css('overflow', locked ? 'hidden' : '');
  if (lenis) { if (locked) lenis.stop(); else lenis.start(); }
}

var $nav = $('#nav');
function navClear() {
  var h = $nav.length ? rect($nav).height : 0;
  return Math.round((h || 72) + 14);
}

function scrollToEl(target, offset) {
  var $el = $(target).first();
  if (!$el.length) return;
  var y = $el.offset().top + (offset || 0);
  if (lenis) { lenis.resize(); lenis.scrollTo(y, { duration: 1.1, force: true }); }
  else window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
  $el.attr('tabindex', '-1');
  $el[0].focus({ preventScroll: true });
}

/* ---------- focus that follows the hand ----------
   Moving focus for the visitor — into a menu or dialog that opens, back to what opened it — is for whoever drives
   the page from the keyboard, and their focus ring must show. Safari, and every browser on iPhone and iPad, also
   draws that ring when the page was tapped or clicked (the black frame round "01 The Studio" in the mobile menu).
   So the way the visitor last moved through the page decides: from the keyboard, focus goes to the control; by
   touch or mouse, onto the dialog itself (tabindex -1, which never shows a ring) and, on closing, is let go.
   Native listeners in the capture phase: jQuery cannot bind there, and no handler may hide the key or the touch. */
var viaKeyboard = false;
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Meta') viaKeyboard = true;
}, true);
document.addEventListener('pointerdown', function () { viaKeyboard = false; }, true);
/* into a dialog that has just opened: its first control for the keyboard, the dialog itself for touch and mouse */
function focusIn(control, dialog) {
  var el = viaKeyboard && control ? control : dialog;
  if (!el) return;
  if (el === dialog && !$(el).is('[tabindex]')) $(el).attr('tabindex', '-1');
  el.focus({ preventScroll: true });
}
/* out of a dialog that is closing (or a film that has ended): back to what opened it for the keyboard; for touch and
   mouse, focus left inside that part of the page is simply released */
function focusBack(opener, scope) {
  if (viaKeyboard && opener && $(opener).is(':visible')) { opener.focus({ preventScroll: true }); return; }
  var active = document.activeElement;
  if (active && active !== document.body && (!scope || $(scope).is(active) || $(scope).has(active).length)) active.blur();
}

var KK = window.__kk = {
  lenis: lenis, reduceMotion: reduceMotion, hasGsap: hasGsap,
  lockScroll: lockScroll, scrollToEl: scrollToEl, navClear: navClear, asset: asset, rect: rect, guardImages: guardImages,
  focusIn: focusIn, focusBack: focusBack,
  /* same-page anchors a page script takes over (index.html: #studio lands on the settled Studio frame) */
  anchorRoutes: {}
};

/* arriving with a #hash: the target lands just below the fixed header (unless the page script places its own deep link) */
if (window.location.hash.length > 1) {
  var $landing = $();
  try { $landing = $(window.location.hash); } catch (e) { $landing = $(); }
  if ($landing.length) {
    var place = function () {
      if (KK.anchorRoutes[window.location.hash]) return;
      var y = Math.max(0, Math.round($landing.offset().top - navClear()));
      if (lenis) { lenis.resize(); lenis.scrollTo(y, { immediate: true, force: true }); }
      else window.scrollTo(0, y);
    };
    place();
    $win.on('load', function () { place(); setTimeout(place, 220); });
  }
}

/* ---------- 02 · navigation & anchors ---------- */
if ($nav.length && !isHome && !$html.hasClass('has-hero')) {   // pages with a photographic hero manage the header themselves
  var onScroll = function () { $nav.toggleClass('is-solid', $win.scrollTop() > 24); };
  $win.on('scroll', onScroll);
  onScroll();
}

/* every link click, in one place and one order: a link still waiting for its destination (inert) · START A PROJECT ·
   same-page anchors (glide) · other pages (veil) */
$doc.on('click', 'a[aria-disabled="true"]', function (e) { e.preventDefault(); });
$doc.on('click', '[data-enquire]', function (e) { e.preventDefault(); openEnquiry(true); });

$doc.on('click', 'a[href]', function (e) {
  var $a = $(this), href = $a.attr('href'), hashAt = href.indexOf('#');
  if (hashAt < 0 || $a.is('[data-enquire]')) return;
  var path = href.slice(0, hashAt), hash = href.slice(hashAt);
  var here = window.location.pathname.split('/').pop() || 'index.html';
  var samePage = path === '' || path === here || (path === 'index.html' && here === 'index.html');
  if (!samePage || hash.length < 2) return;
  var route = KK.anchorRoutes[hash];
  if (route && route(e, $a) === true) {
    e.preventDefault();
    if (history.replaceState) history.replaceState(null, '', hash);
    return;
  }
  var $target = $();
  try { $target = $(hash); } catch (err) { return; }
  if (!$target.length) return;
  e.preventDefault();
  if ($a.closest('#menu').length) setMenu(false);
  scrollToEl($target, -navClear());
  if (history.replaceState) history.replaceState(null, '', hash);
});

/* ---------- 03 · menu overlay ---------- */
var $menuBtn = $('#menu-btn'), $menu = $('#menu');
function setMenu(open) {
  if (!$menuBtn.length || !$menu.length) return;
  if ($menu.hasClass('is-open') === open) return;
  $menuBtn.attr('aria-expanded', String(open));
  $nav.toggleClass('nav-above', open);
  $menu.toggleClass('is-open', open);
  lockScroll(open);
  if (open) { var first = $menu.find('a[href]')[0]; setTimeout(function () { focusIn(first, $menu[0]); }, 60); }
  else focusBack($menuBtn[0], $menu);
}
if ($menuBtn.length && $menu.length) {
  $menuBtn.on('click', function () { setMenu($menuBtn.attr('aria-expanded') !== 'true'); });
  $menu.on('keydown', function (e) {
    if (e.key === 'Escape') { setMenu(false); return; }
    if (e.key !== 'Tab') return;
    var items = [$menuBtn[0]].concat($menu.find('a[href], button').filter(function () { return this.offsetParent !== null; }).get());
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); $(last).trigger('focus'); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); $(first).trigger('focus'); }
  });
  $menuBtn.on('keydown', function (e) {
    if (e.key === 'Escape' && $menu.hasClass('is-open')) setMenu(false);
  });
  $menu.find('a[href]').on('click', function () { if (!$(this).is('[data-enquire]')) setMenu(false); });
}
KK.setMenu = setMenu;

/* ---------- 04 · page veil ---------- */
var $veil = $('.page-veil');
var veilParts = $veil.length ? { l: $veil.find('.veil-left'), r: $veil.find('.veil-right'), s: $veil.find('.veil-seam') } : null;
function veilOpen() {
  if (!$veil.length) return;
  if (reduceMotion || !hasGsap) { $veil.removeClass('is-active'); return; }
  $veil.addClass('is-active');
  gsap.timeline({ onComplete: function () { $veil.removeClass('is-active'); } })
    .set([veilParts.l, veilParts.r], { xPercent: 0 })
    .set(veilParts.s, { opacity: 1 })
    .to(veilParts.s, { opacity: 0, duration: .5, ease: 'power1.out' }, .05)
    .to(veilParts.l, { xPercent: -101, duration: .85, ease: 'power3.inOut' }, 0)
    .to(veilParts.r, { xPercent: 101, duration: .85, ease: 'power3.inOut' }, 0);
}
function veilClose(href) {
  if (!$veil.length || reduceMotion || !hasGsap) { window.location.href = href; return; }
  $veil.addClass('is-active');
  gsap.timeline({ onComplete: function () { window.location.href = href; } })
    .set([veilParts.l, veilParts.r], { xPercent: function (i) { return i === 0 ? -101 : 101; } })
    .set(veilParts.s, { opacity: 0 })
    .to(veilParts.l, { xPercent: 0, duration: .6, ease: 'power3.inOut' }, 0)
    .to(veilParts.r, { xPercent: 0, duration: .6, ease: 'power3.inOut' }, 0)
    .to(veilParts.s, { opacity: 1, duration: .3 }, .35);
}
$doc.on('click', 'a[href]', function (e) {
  var $a = $(this);
  if ($a.attr('target') === '_blank' || $a.is('[download], [data-enquire]')) return;
  var href = $a.attr('href');
  if (!href || href.charAt(0) === '#' || /^(mailto|tel):/i.test(href) || /^https?:/i.test(href)) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.isDefaultPrevented()) return;
  // between project pages the browser morphs the photograph itself (cross-document view transitions)
  if ($a.is('[data-vt]') && $html.hasClass('vt')) return;
  e.preventDefault();
  veilClose(href);
});
$win.on('pageshow', function (e) { if (e.originalEvent.persisted && $veil.length) $veil.removeClass('is-active'); });
if (!isHome) {
  // arriving through a view transition, the photograph has already carried the visitor across: no veil
  var vtPage = $html.hasClass('vt') && 'onpagereveal' in window;
  if (!vtPage) veilOpen();
  else if (window.__kkReveal) { if (!window.__kkReveal.vt) veilOpen(); }
  else $win.one('pagereveal', function (e) { if (!e.originalEvent.viewTransition) veilOpen(); });
}

/* ---------- 05 · reveal system (plays once, never reverses) ----------
   data-reveal            element rises + fades on entry
   data-reveal="lines"    text split into lines that rise in sequence
   data-reveal="media"    image unveiled by a curtain + soft settle
   data-reveal-group      direct children stagger
   data-rule-in           receives .is-in on entry (drawn rules)
------------------------------------------------------------------- */
function splitLines($el) {
  var words = $el.text().trim().split(/\s+/);
  $el.empty();
  var spans = $.map(words, function (w) { return $('<span>').text(w + ' ').css('display', 'inline-block').appendTo($el)[0]; });
  var lines = [], top = null, cur = [];
  $.each(spans, function (i, s) {
    if (top === null || Math.abs(s.offsetTop - top) < 4) { cur.push(s); if (top === null) top = s.offsetTop; }
    else { lines.push(cur); cur = [s]; top = s.offsetTop; }
  });
  if (cur.length) lines.push(cur);
  $el.empty();
  return $.map(lines, function (ws) {
    // headroom so no glyph is ever clipped
    var $outer = $('<span>').attr('style', 'display:block;overflow:hidden;padding:.08em .04em .18em;margin:-.08em -.04em -.18em;');
    var $inner = $('<span>').css('display', 'block').appendTo($outer);
    $.each(ws, function (i, w) { $(w).css('display', 'inline').appendTo($inner); });
    $outer.appendTo($el);
    return $inner[0];
  });
}
(function initReveals() {
  $('[data-rule-in]').each(function () {
    var $el = $(this);
    new IntersectionObserver(function (en, io) {
      if (en[0].isIntersecting) { $el.addClass('is-in'); io.disconnect(); }
    }, { rootMargin: '0px 0px -12% 0px' }).observe(this);
  });
  if (!hasGsap || reduceMotion) return;
  /* lines are measured once the real fonts are in (font-display: swap), so they break where the type does; until then
     (a moment on a first visit, never more than 3 s) the words wait unseen */
  var $lines = $('[data-reveal="lines"]').css('visibility', 'hidden'), linesDone = false;
  function initLines() {
    if (linesDone) return; linesDone = true;
    $lines.each(function () {
      var inners = splitLines($(this));
      gsap.set(inners, { yPercent: 130 });
      $(this).css('visibility', '');
      ScrollTrigger.create({ trigger: this, start: 'top 88%', once: true,
        onEnter: function () { gsap.to(inners, { yPercent: 0, duration: 1.05, ease: 'expo.out', stagger: .08 }); } });
    });
  }
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('400 1em Canela'), document.fonts.load('400 1em "Neue Haas Grotesk"')]).then(initLines, initLines);
  } else initLines();
  setTimeout(initLines, 3000);
  $('[data-reveal="media"]').each(function () {
    var $img = $(this).find('img').first();
    var $curtain = $('<div class="media-veil"></div>').appendTo(this);
    if ($img.length) gsap.set($img, { scale: 1.12 });
    ScrollTrigger.create({ trigger: this, start: 'top 84%', once: true,
      onEnter: function () {
        gsap.to($curtain, { scaleY: 0, duration: 1.1, ease: 'expo.inOut' });
        if ($img.length) gsap.to($img, { scale: 1, duration: 1.6, ease: 'expo.out', delay: .12 });
      } });
  });
  $('[data-reveal=""], [data-reveal="rise"]').each(function () {
    var el = this;
    gsap.set(el, { y: 36, opacity: 0 });
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true,
      onEnter: function () { gsap.to(el, { y: 0, opacity: 1, duration: 1, ease: 'expo.out' }); } });
  });
  $('[data-reveal-group]').each(function () {
    var $kids = $(this).children();
    gsap.set($kids, { y: 30, opacity: 0 });
    ScrollTrigger.create({ trigger: this, start: 'top 86%', once: true,
      onEnter: function () { gsap.to($kids, { y: 0, opacity: 1, duration: .9, ease: 'expo.out', stagger: .09 }); } });
  });
  $win.on('load', function () { ScrollTrigger.refresh(); if (lenis) lenis.resize(); });
})();

/* ==========================================================================
   06 · START A PROJECT — overlay, form, upload, calendar
   Front-end only. Nothing is transmitted. Every backend touch-point is a
   single, clearly labelled hook in KK_INTEGRATIONS below.
   ========================================================================== */
var KK_INTEGRATIONS = {
  /* INTEGRATION HOOK · FORM SUBMIT
     Replace the body with the production request, e.g.
       return $.ajax({ url: '/api/enquiries', method: 'POST', data: formData, processData: false, contentType: false });
     Resolve on success. Until then the UI shows a clearly-labelled
     prototype confirmation and transmits nothing. */
  submit: function (formData) { return Promise.resolve({ prototype: true, formData: formData }); },
  /* INTEGRATION HOOK · FILE UPLOAD
     Files are appended to the FormData under "files[]"; if uploads go to a
     separate store (S3, Cloudinary…), do it here and return the URLs. */
  upload: function (files) { return Promise.resolve($.map(files, function (f) { return f.name; })); },
  /* INTEGRATION HOOK · CALENDAR / SCHEDULING
     The calendar UI is presentation only. To connect Calendly, Cal.com,
     Google Calendar or an in-house booking API, fetch real availability
     here and return the times; the UI renders whatever is returned. */
  availability: function (isoDate) {
    // demo availability: weekdays, hourly 10:00–16:00 Gulf Standard Time
    return Promise.resolve(['10:00', '11:00', '12:00', '14:00', '15:00', '16:00']);
  }
};
window.KK_INTEGRATIONS = KK_INTEGRATIONS;

var CONTACT_EMAIL = 'info@karenksanctuaries.com';
var $enq = null, enqLastFocus = null, enqLight = null, enqState = { files: [], date: null, time: null, month: null };

function enqTemplate() {
  function field(type, id, name, label, req, ac, ph, err) {
    return '<div class="field"><label for="' + id + '">' + label + (req ? '<span class="req" aria-hidden="true"> *</span>' : '') + '</label>' +
      '<input type="' + type + '" id="' + id + '" name="' + name + '"' + (req ? ' required' : '') + ' autocomplete="' + ac + '"' +
      (type === 'tel' ? ' inputmode="tel"' : '') + (ph ? ' placeholder="' + ph + '"' : '') + ' aria-describedby="' + id + '-err">' +
      '<p class="error-msg" id="' + id + '-err" role="alert">' + err + '</p></div>';
  }
  return '' +
  '<aside class="enq-aside">' +
    '<div>' +
      '<span class="label">Start a project</span>' +
      '<h2 class="display-l caps" id="enq-title">A private<br>consultation</h2>' +
      '<p class="lede">Tell us about the site, the ambition and the way you live or work. We reply personally, and the first conversation is always without obligation.</p>' +
    '</div>' +
    '<div class="enq-alt">' +
      '<p>Prefer to write? <a class="link-u" href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a></p>' +
      '<p>Or call <a class="link-u" href="tel:+971502269068">+971 50 226 9068</a></p>' +
      '<ul class="dots"><li>Dubai</li><li>London</li><li>Miami</li><li>Beirut</li><li>Ibiza</li></ul>' +
    '</div>' +
  '</aside>' +
  '<div class="enq-main" data-lenis-prevent>' +
    '<form class="enq-form" id="enq-form" novalidate>' +
      /* the two steps: 01 about you and the project · 02 date and time */
      '<ol class="enq-steps" id="enq-steps" aria-label="Progress">' +
        '<li class="is-on" data-step="1" aria-current="step"><i>01</i><span>About you &amp; the project</span></li>' +
        '<li data-step="2"><i>02</i><span>Date &amp; time</span></li>' +
      '</ol>' +
      '<fieldset class="enq-step" id="enq-step-1" data-step="1">' +
      '<legend class="sr-only">Step 1 of 2 — about you and the project</legend>' +
      '<p class="enq-group">About you</p>' +
      '<div class="form-row">' +
        field('text', 'enq-name', 'name', 'Name', true, 'name', '', 'Please share your name.') +
        field('email', 'enq-email', 'email', 'Email', true, 'email', '', 'A valid email lets us reply.') +
      '</div>' +
      '<div class="form-row">' +
        field('tel', 'enq-phone', 'phone', 'Telephone / WhatsApp', true, 'tel', '+971 …', 'Please add a telephone number with the country code.') +
        field('text', 'enq-location', 'location', 'Project location', true, 'off', 'City, country', 'Where is the project?') +
      '</div>' +
      '<p class="enq-group">The project</p>' +
      '<div class="form-row">' +
        '<div class="field"><label for="enq-type">Project type<span class="req" aria-hidden="true"> *</span></label>' +
          '<span class="select-wrap"><select id="enq-type" name="type" required data-empty="true" aria-describedby="enq-type-err">' +
            '<option value="" selected disabled>Select…</option>' +
            '<option>Residential — full turnkey</option><option>Transformation of an existing property</option>' +
            '<option>Hospitality or commercial</option><option>Concept or feasibility study</option><option>Something else</option>' +
          '</select></span><p class="error-msg" id="enq-type-err" role="alert">Choose the closest match.</p></div>' +
        '<div class="field"><label for="enq-size">Approximate size</label>' +
          '<span class="select-wrap"><select id="enq-size" name="size" data-empty="true">' +
            '<option value="" selected disabled>Optional…</option>' +
            '<option>Under 200 sq m</option><option>200 – 500 sq m</option><option>500 – 1,000 sq m</option><option>Over 1,000 sq m</option><option>Not sure yet</option>' +
          '</select></span></div>' +
      '</div>' +
      '<div class="field"><label for="enq-brief">Brief project description<span class="req" aria-hidden="true"> *</span></label>' +
        '<textarea id="enq-brief" name="brief" rows="4" required minlength="20" aria-describedby="enq-brief-err" placeholder="The property, the ambition, the timing — a few lines are enough."></textarea>' +
        '<p class="error-msg" id="enq-brief-err" role="alert">A few sentences help us prepare — at least twenty characters.</p></div>' +
      '<div class="field"><label for="enq-files">Plans or images <span class="muted">(optional)</span></label>' +
        '<div class="upload" id="enq-upload">' +
          '<p>Drop plans or images here, or browse<small>PDF, JPG or PNG · up to 10 MB each · maximum 5 files</small></p>' +
          '<span class="btn"><span>Browse</span></span>' +
          '<input type="file" id="enq-files" name="files[]" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple aria-describedby="enq-files-err">' +
        '</div>' +
        '<ul class="upload-list" id="enq-upload-list" aria-live="polite"></ul>' +
        '<p class="error-msg" id="enq-files-err" role="alert"></p></div>' +
      '<div class="enq-nav">' +
        '<button type="button" class="btn btn--solid" id="enq-next"><span>Continue</span><i class="arrow"></i></button>' +
        '<p class="enq-nav-hint">Next: choose a date and time for a call, or skip it.</p>' +
      '</div>' +
      '</fieldset>' +
      '<fieldset class="enq-step" id="enq-step-2" data-step="2" hidden>' +
      '<legend class="sr-only">Step 2 of 2 — date and time</legend>' +
      '<p class="enq-group">Book a call <span class="muted">(optional)</span></p>' +
      '<p class="enq-step-lede">Choose a day and a time that suits you, in Gulf Standard Time. You can also send the request without a call and we will suggest a time.</p>' +
      '<div class="cal" id="enq-cal">' +
        '<div class="cal-month">' +
          '<div class="cal-head"><b id="cal-title" tabindex="-1"></b><div class="cal-nav">' +
            '<button type="button" id="cal-prev" aria-label="Previous month"><i class="arrow arrow--back"></i></button>' +
            '<button type="button" id="cal-next" aria-label="Next month"><i class="arrow"></i></button></div></div>' +
          '<div class="cal-grid" id="cal-grid" role="grid" aria-label="Choose a date"></div>' +
        '</div>' +
        '<div class="cal-slots"><div class="slots-h"><b id="slots-title">Time</b><span>Gulf Standard Time</span></div>' +
          '<div class="slots" id="cal-slots"><p class="slots-empty">Select a date to see available times.</p></div>' +
          '<div class="cal-summary" id="cal-summary" hidden><span>Call requested for <b id="cal-summary-text"></b></span><button type="button" id="cal-clear">Clear</button></div>' +
        '</div>' +
        '<input type="hidden" name="call_date" id="enq-call-date"><input type="hidden" name="call_time" id="enq-call-time">' +
      '</div>' +
      '<div class="enq-submit"><button type="submit" class="btn btn--solid"><span>Request a private consultation</span><i class="arrow"></i></button>' +
        '<button type="button" class="enq-back link-arrow" id="enq-back"><i class="arrow arrow--back"></i><span>Back to your details</span></button>' +
        '<p class="enq-note">Your details are used only to reply to this enquiry. See our <a class="link-u" href="privacy.html" data-rel="privacy">privacy policy</a>.</p></div>' +
      '</fieldset>' +
      '<p class="enq-status" id="enq-status" role="alert" hidden></p>' +
    '</form>' +
    '<div class="enq-done" id="enq-done" hidden tabindex="-1">' +
      '<span class="label">Request prepared</span>' +
      '<h2 class="display-m caps">Thank you</h2>' +
      '<p class="lede">Here is what you asked us for. A member of the studio would normally reply personally within one working day.</p>' +
      '<dl class="enq-summary" id="enq-summary"></dl>' +
      '<p class="proto-note"><b>Prototype state.</b> The enquiry backend is not yet connected, so this request has been prepared on your screen but not transmitted. Until the integration is live, please email <a class="link-u" href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a>.</p>' +
      '<p style="margin-top:1.8rem"><a class="link-arrow" href="projects.html" data-rel="projects"><span>View the projects</span><i class="arrow"></i></a></p>' +
    '</div>' +
  '</div>' +
  '<button type="button" class="enq-close" id="enq-close" aria-label="Close"><span>Close</span><i></i></button>';
}

/* sparse floating light on the form side of the overlay (a canvas; still under reduced motion) */
function enqMotes($root) {
  var cv = $('<canvas class="enq-motes" aria-hidden="true"></canvas>').appendTo($root)[0];
  var ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return { start: $.noop, stop: $.noop };
  var still = reduceMotion;
  var dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, P = [], frame = 0, $aside = $root.find('.enq-aside');
  function region() {   // the form side: right of the introduction, or below it where the panels stack
    var r = $aside.length ? rect($aside) : { right: 0, bottom: 0 };
    return window.innerWidth <= 1080 ? { x0: 0, y0: Math.max(0, r.bottom), x1: W, y1: H } : { x0: r.right, y0: 0, x1: W, y1: H };
  }
  function make(g, anywhere) {
    return { x: g.x0 + Math.random() * (g.x1 - g.x0), y: anywhere ? g.y0 + Math.random() * (g.y1 - g.y0) : g.y1 + 12,
      r: 0.7 + Math.random() * 1.4, a: 0.28 + Math.random() * 0.5, s: 0.35 + Math.random() * 0.9, ph: Math.random() * 6.283,
      vy: -(0.05 + Math.random() * 0.11), vx: (Math.random() - 0.5) * 0.04 };
  }
  function seed() {
    var g = region(), area = Math.max(0, (g.x1 - g.x0) * (g.y1 - g.y0));
    var n = Math.round(Math.min(26, Math.max(9, area / 56000)));   // sparse: floating light, not glitter
    P = []; for (var i = 0; i < n; i++) P.push(make(g, true));
  }
  function size() { W = window.innerWidth; H = window.innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); seed(); }
  function draw(t) {
    var g = region(); ctx.clearRect(0, 0, W, H);
    if (g.y1 - g.y0 < 40) return;
    ctx.save(); ctx.beginPath(); ctx.rect(g.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0); ctx.clip();
    for (var i = 0; i < P.length; i++) {
      var p = P[i];
      if (!still) {
        p.y += p.vy; p.x += p.vx + Math.sin(t * 0.00025 + p.ph) * 0.05;
        if (p.y < g.y0 - 24) { P[i] = p = make(g, false); }
        if (p.x < g.x0 - 24 || p.x > g.x1 + 24) p.x = g.x0 + Math.random() * (g.x1 - g.x0);
      }
      var al = p.a * (still ? 0.7 : 0.5 + 0.5 * Math.sin(t * 0.0009 * p.s + p.ph));
      var R = p.r * 8, gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
      gr.addColorStop(0, 'rgba(255,238,205,' + (al * 0.9).toFixed(3) + ')');
      gr.addColorStop(0.28, 'rgba(214,174,108,' + (al * 0.32).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(214,174,108,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,247,230,' + Math.min(1, al * 1.3).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.65, 0, 6.2832); ctx.fill();
    }
    ctx.restore();
  }
  function loop(t) { draw(t); frame = window.requestAnimationFrame(loop); }
  $win.on('resize', function () { if ($root.hasClass('is-open')) { size(); if (still) draw(0); } });
  return { start: function () { size(); if (still) { draw(0); return; } if (!frame) frame = window.requestAnimationFrame(loop); },
           stop: function () { window.cancelAnimationFrame(frame); frame = 0; } };
}

function buildEnquiry() {
  if ($enq) return $enq;
  $enq = $('<div class="enq" id="enquiry" role="dialog" aria-modal="true" aria-labelledby="enq-title" data-lenis-prevent></div>')   // Lenis must not swallow wheel events over the overlay
    .html(enqTemplate()).appendTo('body');
  enqLight = enqMotes($enq);

  // relative links inside the overlay must work from /projects/ too
  if (/\/projects\//.test(window.location.pathname)) $enq.find('[data-rel]').each(function () { $(this).attr('href', '../' + $(this).attr('href')); });

  $enq.find('#enq-close').on('click', function () { openEnquiry(false); });
  $enq.on('keydown', function (e) {
    if (e.key === 'Escape') { e.stopPropagation(); openEnquiry(false); return; }
    if (e.key !== 'Tab') return;
    var f = $enq.find('a[href], button:not([disabled]), input:not([type="hidden"]), select, textarea')
      .filter(function () { return this.offsetParent !== null && !$(this).closest('[hidden]').length; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); $(last).trigger('focus'); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); $(first).trigger('focus'); }
  });

  initForm(); initUpload(); initCalendar();
  return $enq;
}

function openEnquiry(open) {
  var $root = buildEnquiry();
  if ($root.hasClass('is-open') === open) return;
  $root.toggleClass('is-open', open);
  lockScroll(open);
  if (enqLight) { if (open) enqLight.start(); else setTimeout(function () { if (!$root.hasClass('is-open')) enqLight.stop(); }, 600); }
  if (open) {
    enqLastFocus = document.activeElement;
    setMenu(false);
    $root.find('.enq-main').scrollTop(0);
    setTimeout(function () { $root.find('#enq-name').trigger('focus'); }, 80);
  } else focusBack(enqLastFocus && $(enqLastFocus).is(':visible') ? enqLastFocus : $('#menu-btn:visible')[0], $root);
}
KK.openEnquiry = openEnquiry;

/* ---- form validation & prototype submission ---- */
var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
var RE_PHONE = /^\+?[0-9 ()\-]{7,20}$/;
function initForm() {
  var $form = $enq.find('#enq-form'), $status = $enq.find('#enq-status'), $main = $enq.find('.enq-main');
  function setErr($input, bad) {
    $input.closest('.field').toggleClass('is-error', bad);
    $input.attr('aria-invalid', bad ? 'true' : 'false');
  }
  function check(input) {
    var $i = $(input), v = ($i.val() || '').trim(), type = $i.prop('type'), bad = false;
    if ($i.prop('required') && !v) bad = true;
    else if (type === 'email' && v && !RE_EMAIL.test(v)) bad = true;
    else if (type === 'tel' && v && !(RE_PHONE.test(v) && v.replace(/\D/g, '').length >= 7)) bad = true;
    else if ($i.is('textarea') && $i.prop('required') && v.length < 20) bad = true;
    setErr($i, bad);
    return !bad;
  }
  $form.find('select').each(function () {
    var $s = $(this), sync = function () { $s.attr('data-empty', $s.val() ? 'false' : 'true'); };
    $s.on('change', sync); sync();
  });
  $form.on('input', function (e) {
    var $field = $(e.target).closest('.field');
    if ($field.hasClass('is-error')) check(e.target);
  });
  $form.on('change', function (e) { if ($(e.target).is('select')) check(e.target); });

  /* the two steps */
  var $steps = $form.find('.enq-step'), $marks = $form.find('#enq-steps li');
  function showStep(n, focusSel) {
    $steps.each(function () { $(this).prop('hidden', +$(this).attr('data-step') !== n); });
    $marks.each(function () {
      var $m = $(this), k = +$m.attr('data-step');
      $m.toggleClass('is-on', k === n).toggleClass('is-done', k < n);
      if (k === n) $m.attr('aria-current', 'step'); else $m.removeAttr('aria-current');
    });
    $form.attr('data-step', String(n));
    $status.prop('hidden', true);
    /* bring the step to the top: the form column scrolls on desktop, the whole overlay on small screens (below the close control) */
    var marksEl = $form.find('#enq-steps')[0], main = $main[0], sc = (main && main.scrollHeight > main.clientHeight + 4) ? main : $enq[0];
    if (marksEl && sc) {
      var top = rect(marksEl).top - rect(sc).top + sc.scrollTop - (sc === $enq[0] ? 88 : 0);
      sc.scrollTo({ top: Math.max(0, sc === main ? 0 : top), behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    var $f = focusSel ? $form.find(focusSel) : $();
    if ($f.length) setTimeout(function () { $f[0].focus({ preventScroll: true }); }, 60);
  }
  function validateStep1() {
    var firstBad = null;
    $form.find('#enq-step-1 input[required], #enq-step-1 select[required], #enq-step-1 textarea[required], #enq-step-1 input[type="email"], #enq-step-1 input[type="tel"]').each(function () {
      if (!check(this) && !firstBad) firstBad = this;
    });
    if (firstBad) {
      if ($form.attr('data-step') !== '1') showStep(1);
      $status.prop('hidden', false).text('Please complete the highlighted fields.');
      $(firstBad).trigger('focus');
      firstBad.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    return !firstBad;
  }
  $form.find('#enq-next').on('click', function () { if (validateStep1()) showStep(2, '#cal-title'); });
  $form.find('#enq-back').on('click', function () { showStep(1, '#enq-name'); });
  $form.attr('data-step', '1');

  $form.on('submit', function (e) {
    e.preventDefault();
    if (!validateStep1()) return;
    $status.prop('hidden', true);
    var data = new FormData(this);
    $.each(enqState.files, function (i, f) { data.append('files[]', f, f.name); });
    var $btn = $form.find('button[type="submit"]').prop('disabled', true);
    KK_INTEGRATIONS.upload(enqState.files)
      .then(function () { return KK_INTEGRATIONS.submit(data); })
      .then(function () {
        var rows = [
          ['Name', data.get('name')], ['Email', data.get('email')], ['Telephone', data.get('phone')],
          ['Location', data.get('location')], ['Project type', data.get('type')], ['Size', data.get('size') || '—'],
          ['Files', enqState.files.length ? $.map(enqState.files, function (f) { return f.name; }).join(', ') : '—'],
          ['Call', enqState.date && enqState.time ? fmtDate(enqState.date) + ', ' + enqState.time + ' GST' : 'No call requested']
        ];
        var $summary = $enq.find('#enq-summary').empty();
        $.each(rows, function (i, r) { $summary.append($('<dt>').text(r[0]), $('<dd>').text(String(r[1] || '—'))); });
        $form.prop('hidden', true);
        var $done = $enq.find('#enq-done').prop('hidden', false);
        $main.scrollTop(0); $done.trigger('focus');
      })
      .catch(function () { $status.prop('hidden', false).text('Something went wrong preparing the request. Please email us directly.'); })
      .then(function () { $btn.prop('disabled', false); });
  });
}

/* ---- upload UI (client-side only) ---- */
var MAX_FILE = 10 * 1024 * 1024, MAX_FILES = 5, OK_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
function initUpload() {
  var $box = $enq.find('#enq-upload'), $input = $enq.find('#enq-files'), $list = $enq.find('#enq-upload-list'), $err = $enq.find('#enq-files-err');
  function fmt(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function render() {
    $list.empty();
    $.each(enqState.files, function (i, f) {
      $('<li>').append(
        $('<span>').css('color', 'var(--ink-2)').text(f.name),
        $('<span>').text(fmt(f.size)),
        $('<button type="button">Remove</button>').attr('data-rm', i)
      ).appendTo($list);
    });
  }
  function add(files) {
    var msgs = [];
    $.each(files, function (i, f) {
      var ext = (f.name.split('.').pop() || '').toLowerCase();
      var okType = $.inArray(f.type, OK_TYPES) > -1 || $.inArray(ext, ['pdf', 'jpg', 'jpeg', 'png']) > -1;
      if (!okType) { msgs.push(f.name + ' is not a PDF, JPG or PNG.'); return; }
      if (f.size > MAX_FILE) { msgs.push(f.name + ' is larger than 10 MB.'); return; }
      if (enqState.files.length >= MAX_FILES) { msgs.push('Maximum five files.'); return; }
      if ($.grep(enqState.files, function (x) { return x.name === f.name && x.size === f.size; }).length) return;
      enqState.files.push(f);
    });
    $err.text(msgs.join(' ')).css('display', msgs.length ? 'block' : 'none');
    render();
  }
  $input.on('change', function () { add(this.files); $input.val(''); });
  $box.on('dragenter dragover', function (e) { e.preventDefault(); $box.addClass('is-drag'); });
  $box.on('dragleave drop', function (e) { e.preventDefault(); $box.removeClass('is-drag'); });
  $box.on('drop', function (e) { var dt = e.originalEvent.dataTransfer; if (dt && dt.files) add(dt.files); });
  $list.on('click', '[data-rm]', function () {
    enqState.files.splice(+$(this).attr('data-rm'), 1); render(); $err.css('display', 'none');
  });
}

/* ---- calendar UI (presentation only — see KK_INTEGRATIONS.availability) ---- */
var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function fmtDate(isoStr) {
  var p = isoStr.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear();
}
function initCalendar() {
  var $grid = $enq.find('#cal-grid'), $title = $enq.find('#cal-title'), $slots = $enq.find('#cal-slots');
  var $prev = $enq.find('#cal-prev'), $next = $enq.find('#cal-next'), $summary = $enq.find('#cal-summary'), $sumText = $enq.find('#cal-summary-text');
  var $hidDate = $enq.find('#enq-call-date'), $hidTime = $enq.find('#enq-call-time'), $slotsTitle = $enq.find('#slots-title');
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var maxAhead = new Date(today); maxAhead.setMonth(maxAhead.getMonth() + 3);
  enqState.month = new Date(today.getFullYear(), today.getMonth(), 1);

  function renderMonth() {
    var m = enqState.month, y = m.getFullYear(), mo = m.getMonth();
    $title.text(MONTHS[mo] + ' ' + y);
    var first = new Date(y, mo, 1), pad = (first.getDay() + 6) % 7, days = new Date(y, mo + 1, 0).getDate();
    var html = $.map(DOW, function (d) { return '<span class="dow" role="columnheader">' + d + '</span>'; }).join('');
    for (var i = 0; i < pad; i++) html += '<span class="cal-day is-pad" aria-hidden="true"></span>';
    for (var d = 1; d <= days; d++) {
      var date = new Date(y, mo, d), id = iso(date), dow = date.getDay();
      var past = date < today, weekend = dow === 0 || dow === 6, far = date > maxAhead;
      var dis = past || weekend || far;
      html += '<button type="button" class="cal-day' + (id === iso(today) ? ' is-today' : '') + '" data-date="' + id + '"' +
        (dis ? ' disabled' : '') + ' aria-pressed="' + (enqState.date === id ? 'true' : 'false') + '" aria-label="' + fmtDate(id) + (dis ? ', unavailable' : '') + '">' + d + '</button>';
    }
    $grid.html(html);
    $prev.prop('disabled', m <= new Date(today.getFullYear(), today.getMonth(), 1));
    $next.prop('disabled', new Date(y, mo + 1, 1) > maxAhead);
  }
  function renderSlots(times) {
    if (!enqState.date) { $slots.html('<p class="slots-empty">Select a date to see available times.</p>'); $slotsTitle.text('Time'); return; }
    $slotsTitle.text(fmtDate(enqState.date));
    $slots.html(times.length ? $.map(times, function (t) {
      return '<button type="button" class="slot" data-time="' + t + '" aria-pressed="' + (enqState.time === t ? 'true' : 'false') + '">' + t + '</button>';
    }).join('') : '<p class="slots-empty">No times available on this date.</p>');
  }
  function sync() {
    var ok = enqState.date && enqState.time;
    $summary.prop('hidden', !ok);
    if (ok) $sumText.text(fmtDate(enqState.date) + ', ' + enqState.time + ' GST');
    $hidDate.val(enqState.date || ''); $hidTime.val(enqState.time || '');
  }
  $grid.on('click', '.cal-day[data-date]', function () {
    var $b = $(this); if ($b.prop('disabled')) return;
    enqState.date = $b.attr('data-date'); enqState.time = null;
    $grid.find('.cal-day').each(function () { $(this).attr('aria-pressed', String(this === $b[0])); });
    $slots.html('<p class="slots-empty">Checking availability…</p>');
    KK_INTEGRATIONS.availability(enqState.date).then(renderSlots);
    sync();
  });
  $slots.on('click', '.slot', function () {
    var b = this;
    enqState.time = $(b).attr('data-time');
    $slots.find('.slot').each(function () { $(this).attr('aria-pressed', String(this === b)); });
    sync();
  });
  $prev.on('click', function () { enqState.month = new Date(enqState.month.getFullYear(), enqState.month.getMonth() - 1, 1); renderMonth(); });
  $next.on('click', function () { enqState.month = new Date(enqState.month.getFullYear(), enqState.month.getMonth() + 1, 1); renderMonth(); });
  $enq.find('#cal-clear').on('click', function () {
    enqState.date = null; enqState.time = null; renderMonth(); renderSlots([]); sync();
  });
  renderMonth(); renderSlots([]); sync();
}

/* ---------- 07 · small things ---------- */
$('[data-year]').text(new Date().getFullYear());

/* dotted lists: when one wraps, the first item of a new line carries no separator */
function tidyDots() {
  $('.dots').each(function () {
    var items = $(this).children().get(), pass, i;
    $(items).removeAttr('data-line-start data-line-break');
    for (pass = 0; pass < 3; pass++) {
      var changed = false;
      for (i = 1; i < items.length; i++) {
        var $li = $(items[i]), starts = Math.abs(items[i].offsetTop - items[i - 1].offsetTop) > 2;
        if ($li.is('[data-line-break]')) continue;
        if ($li.is('[data-line-start]')) {
          // hidden separator let it climb back onto the previous line: it needs its own line instead
          if (!starts) { $li.removeAttr('data-line-start').attr('data-line-break', ''); changed = true; }
        } else if (starts) { $li.attr('data-line-start', ''); changed = true; }
      }
      if (!changed) break;
    }
  });
}
tidyDots();
$win.on('resize load', tidyDots);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(tidyDots);

/* silent films ([data-autofilm]): play only while in view; with reduced motion the poster stands still.
   Hysteresis: a film starts once a quarter of it is in view and only pauses once it has left the viewport
   entirely, so a scroll resting near the edge never flips it between play and pause. */
$('video[data-autofilm]').each(function () {
  var v = this, $v = $(v);
  if (reduceMotion) { $v.removeAttr('autoplay'); v.pause(); return; }
  var wanted = false;
  function sync() {
    if (wanted && v.paused) { var p = v.play(); if (p && p.catch) p.catch($.noop); }
    else if (!wanted && !v.paused) v.pause();
  }
  new IntersectionObserver(function (en) {
    $.each(en, function (i, e) {
      if (e.intersectionRatio >= 0.25) wanted = true;
      else if (!e.isIntersecting) wanted = false;
    });
    sync();
  }, { threshold: [0, 0.25, 0.5] }).observe(v);
  $v.on('canplay', sync);
  $doc.on('visibilitychange', function () { if (!document.hidden) sync(); });
});

})(jQuery);
