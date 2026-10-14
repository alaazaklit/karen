/* ============================================================================
   KAREN K SANCTUARIES — PROJECTS behaviour (projects.html + project pages).
   Requires jQuery and site.js (Lenis, GSAP/ScrollTrigger wiring) first.
   Every animation is either scroll-scrubbed (reversible, never plays on its own) or a
   short, interruptible response to a click. Honours prefers-reduced-motion.
   ==========================================================================*/
(function ($) {
'use strict';
var $win = $(window), $html = $(document.documentElement);
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var G = window.gsap, ST = window.ScrollTrigger;
var motion = !!(G && ST) && !reduce;
var KK = window.__kk || {};
var lenis = KK.lenis || window.__lenis || null;
var rect = KK.rect || function (el) { return $(el)[0].getBoundingClientRect(); };
function pad(n) { return (n < 10 ? '0' : '') + n; }

/* ---------- header height → the category bar sticks exactly beneath it ---------- */
var $nav = $('#nav');
function navH() { if ($nav.length) $html.css('--nav-h', Math.round(rect($nav).height) + 'px'); }
navH(); $win.on('resize', navH);

/* ---------- scroll-opened frames: the image opens and settles as it enters (scrubbed) ---------- */
function openOnScroll($frame, $img, opts) {
  opts = opts || {};
  if (!motion || !$frame.length) return;
  G.fromTo($frame, { '--clip': (opts.clip || 9) + '%', '--clip-x': (opts.clipX || 6) + '%' }, { '--clip': '0%', '--clip-x': '0%', ease: 'none',
    scrollTrigger: { trigger: $frame[0], start: 'top 98%', end: 'top 42%', scrub: 0.6 } });
  if ($img && $img.length && opts.settle !== false) {
    G.fromTo($frame, { '--pz': 1.16 }, { '--pz': 1.04, ease: 'none', scrollTrigger: { trigger: $frame[0], start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    G.fromTo($frame, { '--py': '-3%' }, { '--py': '3%', ease: 'none', scrollTrigger: { trigger: $frame[0], start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  }
}
function refresh() { if (ST) ST.refresh(); if (lenis && lenis.resize) lenis.resize(); }

/* ==========================================================================
   LISTING
   ========================================================================*/
var $list = $('#wk-list');
if ($list.length) (function () {
  var $bar = $('#wk-bar'), $strip = $('[data-filters]'), $ink = $('.wk-ink'), $countEl = $('[data-filter-count]');
  var $buttons = $strip.find('.filter-btn'), $items = $list.find('.wk-item'), $empty = $list.find('.wk-empty');
  var EMPTY = {
    transformation: { label: 'Transformations', title: 'Transformations are being prepared for publication.',
      text: 'Existing properties re-imagined through the Karen K Method — a fast-track approach with minimal demolition, for owners and tenants.',
      act: [['method.html', 'Discover the Method'], ['#all', 'View all projects']] },
    hospitality: { label: 'Hospitality / Commercial', title: 'Hospitality and commercial work, coming to the portfolio.',
      text: 'Restaurants, hotels, retail and workplaces — interiors conceived as experiences. Selected projects are being prepared for publication.',
      act: [['mailto:info@karenksanctuaries.com', 'Discuss a project'], ['#all', 'View all projects']] },
    award: { label: 'Award-winning', title: 'Recognised projects, presented here soon.',
      text: 'Work recognised by the industry — including homes selected among the Top 50 Homes of Dubai — is being prepared for publication.',
      act: [['#all', 'View all projects']] },
    concept: { label: 'Concepts', title: 'Concepts are being prepared for publication.', text: 'Unbuilt ideas and studies in space, material and light.', act: [['#all', 'View all projects']] },
    international: { label: 'International', title: 'International work, presented here soon.', text: 'Projects beyond the UAE.', act: [['#all', 'View all projects']] },
    residential: { label: 'Residential / Full turnkey', title: 'Residential work, presented here soon.', text: '', act: [['#all', 'View all projects']] }
  };
  var current = 'all', busy = null;
  function byFilter(f) { return $buttons.filter(function () { return $(this).attr('data-filter') === f; }); }
  function navHeight() { return parseInt($html.css('--nav-h'), 10) || 0; }

  /* sticky state: measured from an in-flow marker just above the bar */
  var $sentinel = $('<div></div>').attr('style', 'position:absolute;height:1px;width:1px;margin-top:-1px').insertBefore($bar);
  new IntersectionObserver(function (en) { $bar.toggleClass('is-stuck', !en[0].isIntersecting); },
    { rootMargin: '-' + (parseInt($html.css('--nav-h'), 10) + 2 || 72) + 'px 0px 0px 0px' }).observe($sentinel[0]);

  /* the one sliding line under the active category */
  function placeInk(instant) {
    var b = $buttons.filter('[aria-pressed="true"]')[0]; if (!b || !$ink.length) return;
    if (instant) $ink.css('transition', 'none');
    $ink.css({ '--ink-x': (b.offsetLeft - $strip.scrollLeft()) + 'px', '--ink-w': b.offsetWidth + 'px' });
    if (instant) { rect($ink); $ink.css('transition', ''); }                 // commit the jump before transitions return
  }
  $strip.on('scroll', function () { placeInk(true); });
  $win.on('resize', function () { placeInk(true); });

  function matches(it, f) { return f === 'all' || (' ' + $(it).attr('data-cat') + ' ').indexOf(' ' + f + ' ') > -1; }
  function setCount(n, f, animate) {
    var txt = n > 0 ? pad(n) + (n === 1 ? ' Project' : ' Projects') : 'In preparation';
    var $inner = $countEl.find('.wk-count-in');
    if (!$inner.length) $inner = $('<span class="wk-count-in"></span>').appendTo($countEl.empty());
    if (!animate || !motion) { $inner.text(txt); return; }
    $inner.addClass('is-out');
    setTimeout(function () {
      $inner.text(txt).css({ transition: 'none', transform: 'translateY(100%)' });
      rect($inner);                                                        // commit the start position
      $inner.css('transition', '').removeClass('is-out').css('transform', '');
    }, 260);
  }
  function fillEmpty(f) {
    var d = EMPTY[f]; if (!d) return;
    var $acts = $('<div class="wk-empty-act"></div>');
    $.each(d.act, function (i, a) {
      var link = i === 0 && a[0].charAt(0) !== '#';
      var $a = $('<a></a>').addClass(link ? 'btn' : 'link-arrow').attr('href', a[0]).append($('<span></span>').text(a[1]));
      if (a[0].indexOf('mailto:') === 0) $a.attr('data-enquire', '');
      if (!link) $a.append('<i class="arrow"></i>');
      $acts.append($a);
    });
    $empty.empty().append(
      $('<div></div>').append($('<span class="label"></span>').text(d.label), $('<h2></h2>').text(d.title)),
      $('<div></div>').append(d.text ? $('<p></p>').text(d.text) : null, $acts)
    );
    $empty.find('a[href="#all"]').on('click', function (e) { e.preventDefault(); select('all'); });
  }
  function scrollToList() {
    var top = $sentinel.offset().top - navHeight();
    if ($win.scrollTop() > top + 4) {
      if (lenis) lenis.scrollTo(top, { duration: reduce ? 0 : 0.9, force: true });
      else window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  function apply(f, animate) {
    var $show = $items.filter(function () { return matches(this, f); });
    $buttons.each(function () { $(this).attr('aria-pressed', $(this).attr('data-filter') === f ? 'true' : 'false'); });
    placeInk(!animate);
    setCount($show.length, f, animate);
    var $visibleNow = $items.filter(function () { return !this.hidden; }).add($empty.prop('hidden') ? $() : $empty);
    function swap() {
      $items.each(function () { $(this).prop('hidden', $show.index(this) < 0); });
      if ($show.length) $empty.prop('hidden', true); else { fillEmpty(f); $empty.prop('hidden', false); }
      refresh();
    }
    if (!animate || !motion) { swap(); return; }
    if (busy) busy.kill();
    var tl = G.timeline(); busy = tl;
    tl.to($visibleNow, { autoAlpha: 0, y: 24, duration: 0.38, ease: 'power2.in', stagger: 0.05 })
      .add(function () { swap(); scrollToList(); })
      .add(function () {
        var $in = $show.length ? $show : $empty;
        G.fromTo($in, { autoAlpha: 0, y: 48 }, { autoAlpha: 1, y: 0, duration: 0.95, ease: 'expo.out', stagger: 0.1, clearProps: 'transform,opacity,visibility' });
        $in.each(function () {
          var $m = $(this).find('.wk-media').first();
          if ($m.length) G.fromTo($m, { '--clip': '12%', '--clip-x': '8%' }, { '--clip': '0%', '--clip-x': '0%', duration: 1.2, ease: 'expo.out' });
        });
      }, '+=0.05');
  }
  function select(f) {
    if (f === current) return; current = f;
    if (history.replaceState) history.replaceState(null, '', f === 'all' ? window.location.pathname : '#' + f);
    apply(f, true);
    var b = byFilter(f)[0];
    if (b && $strip[0].scrollWidth > $strip[0].clientWidth) b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }
  $strip.on('click', '.filter-btn', function () { select($(this).attr('data-filter')); });
  $strip.on('keydown', function (e) {
    var i = $buttons.index(document.activeElement); if (i < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      $buttons.eq((i + (e.key === 'ArrowRight' ? 1 : -1) + $buttons.length) % $buttons.length).trigger('focus');
    }
  });
  /* a deep link (#residential …) opens the listing on that category */
  var h = (window.location.hash || '').slice(1);
  if (h && byFilter(h).length) current = h;
  apply(current, false);
  window.requestAnimationFrame(function () { placeInk(true); });
  $win.on('hashchange', function () {
    var f = (window.location.hash || '').slice(1) || 'all';
    if (byFilter(f).length) select(f);
  });

  /* chapters open with the scroll */
  $items.each(function () { var $m = $(this).find('.wk-media').first(); openOnScroll($m, $m.find('img').first()); });

  /* the "View project" cursor — the wings live in cursor.js */
  if (window.__kkCursor && !reduce) window.__kkCursor.bind($('.wk-media'), 'View project');
})();

/* ==========================================================================
   DETAIL
   ========================================================================*/
var $hero = $('.pd-hero2');
if ($hero.length) (function () {
  var $img = $hero.find('.pd-hero2-media img').first(), $text = $hero.find('.pd-hero2-in').first();
  /* the header stays light over the photograph, and becomes the ivory bar once the photograph has passed */
  function tone() {
    var over = rect($hero).bottom > ($nav.length ? $nav.outerHeight() + 8 : 80);
    $nav.toggleClass('on-dark', over).toggleClass('is-solid', !over);
    $html.toggleClass('nav-solid', !over).css('--scrim', over ? '0.85' : '0');
  }
  tone(); $win.on('scroll', tone); if (lenis && lenis.on) lenis.on('scroll', tone);
  /* arrival: when the photograph has morphed in from the listing there is no second entrance */
  var viaVT = window.__kkReveal && window.__kkReveal.vt;
  if (motion && $img.length) {
    if (!viaVT) G.fromTo($hero, { '--hz': 1.08 }, { '--hz': 1, duration: 1.8, ease: 'power2.out' });
    G.fromTo($hero, { '--hy': '0%' }, { '--hy': '7%', ease: 'none', scrollTrigger: { trigger: $hero[0], start: 'top top', end: 'bottom top', scrub: true } });
    if ($text.length) G.fromTo($text, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -40, ease: 'none', scrollTrigger: { trigger: $hero[0], start: 'top top', end: '55% top', scrub: true } });
    if (!viaVT && $text.length) G.from($text.find('.label, .pd-title, .pd-hero2-row, .crumbs'), { y: 40, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, delay: 0.25 });
  }
  /* the next project opens like a chapter */
  var $nm = $('.pd-nextfull .wk-media').first(); if ($nm.length) openOnScroll($nm, $nm.find('img').first());
  $win.on('load', refresh);
})();
})(jQuery);
