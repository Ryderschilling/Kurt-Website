/* kurtbenkert.com · interactions · built by Ryder Schilling
   Rules honored: Lenis desktop only, reveals via IntersectionObserver,
   nothing gates <main>, animations play once, reduced-motion respected. */
(function () {
  'use strict';

  var DESKTOP = window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches;
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Lenis smooth scroll, DESKTOP ONLY ---------- */
  var lenis = null;
  if (DESKTOP && !REDUCED && window.Lenis) {
    document.documentElement.classList.add('lenis');
    lenis = new Lenis({ duration: 1.1, easing: function (t) { return 1 - Math.pow(1 - t, 3); } });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  /* ---------- nav: background on scroll, hide down / show up ----------
     Intent-based, not per-pixel. A direction has to be sustained (90px down,
     60px up) before the nav commits, so trackpad jitter can never interrupt
     the transform mid-flight. That stutter was the whole problem. */
  var nav = document.querySelector('.navbar');
  var lastY = Math.max(0, window.scrollY);
  var navAcc = 0;
  var navHidden = false;
  var navTicking = false;
  var HIDE_AFTER = 90;
  var SHOW_AFTER = -60;

  function setNav(hide) {
    if (hide === navHidden) return;
    navHidden = hide;
    nav.classList.toggle('hidden', hide);
  }

  function onScroll() {
    var y = Math.max(0, window.scrollY);
    var dy = y - lastY;
    lastY = y;
    nav.classList.toggle('scrolled', y > 80);
    if (!dy) return;
    if (document.body.classList.contains('menu-open')) { navAcc = 0; return; }
    if (y < 240) { setNav(false); navAcc = 0; return; }
    if ((dy > 0) !== (navAcc > 0)) navAcc = 0;   // direction flipped, start over
    navAcc += dy;
    if (navAcc > HIDE_AFTER) setNav(true);
    else if (navAcc < SHOW_AFTER) setNav(false);
  }

  window.addEventListener('scroll', function () {
    if (navTicking) return;
    navTicking = true;
    requestAnimationFrame(function () { navTicking = false; onScroll(); });
  }, { passive: true });
  onScroll();

  /* ---------- full-screen menu ---------- */
  var burger = document.querySelector('.nav-burger');
  var menu = document.querySelector('.mobile-menu');
  if (burger && menu) {
    var lockY = 0;

    function setMenu(open) {
      if (open === document.body.classList.contains('menu-open')) return;
      if (open) {
        lockY = window.scrollY || window.pageYOffset || 0;
        document.body.classList.add('menu-open');
        document.body.style.position = 'fixed';
        document.body.style.top = -lockY + 'px';
        document.body.style.width = '100%';
        if (lenis) lenis.stop();
      } else {
        document.body.classList.remove('menu-open');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, lockY);
        if (lenis) lenis.start();
      }
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    burger.addEventListener('click', function () {
      setMenu(!document.body.classList.contains('menu-open'));
    });

    Array.prototype.forEach.call(menu.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') setMenu(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1024) setMenu(false);
    });
  }

  /* ---------- auto-tag reveals, then observe ---------- */
  var autoTargets = document.querySelectorAll(
    '.kicker, .h2, .lede, .statstrip, .playcards, .vidgrid, .board, .quoteboard, ' +
    '.stone-sect .grid2 > *, .teamrail, .foot-grid, .bookcover, .chapter .ch-head, ' +
    '.chapter .bigstat, .contact-board .inner > *, .photo-sect .copy > *'
  );
  autoTargets.forEach(function (el) {
    if (!el.hasAttribute('data-rv')) el.setAttribute('data-rv', '');
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      if (e.target.classList.contains('playcard') || e.target.classList.contains('pc-draw')) {
        e.target.classList.add('drawn');
      }
      io.unobserve(e.target);
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('[data-rv]').forEach(function (el) { io.observe(el); });
  document.querySelectorAll('.playcard').forEach(function (el) { io.observe(el); });

  /* ---------- count-up numbers ---------- */
  var fmt = function (n) { return n.toLocaleString('en-US'); };
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      cio.unobserve(el);
      var end = parseFloat(el.getAttribute('data-count'));
      var dec = el.getAttribute('data-dec') === '1';
      if (REDUCED) { el.textContent = dec ? end.toFixed(1) : fmt(end); return; }
      var t0 = null, DUR = 850;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / DUR, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = end * eased;
        el.textContent = dec ? val.toFixed(1) : fmt(Math.round(val));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(function (el) { cio.observe(el); });

  /* ---------- scorebug typewriter ---------- */
  var bug = document.querySelector('[data-typebug]');
  if (bug) {
    var cells = Array.prototype.slice.call(bug.children);
    var texts = cells.map(function (c) { return c.textContent; });
    var typed = false;
    var bio = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting || typed) return;
      typed = true;
      bio.disconnect();
      if (REDUCED) return;
      cells.forEach(function (c) { c.textContent = ' '; });
      var ci = 0;
      function typeCell() {
        if (ci >= cells.length) return;
        var cell = cells[ci], text = texts[ci], i = 0;
        var iv = setInterval(function () {
          i++;
          cell.textContent = text.slice(0, i);
          if (i >= text.length) { clearInterval(iv); ci++; setTimeout(typeCell, 120); }
        }, 26);
      }
      typeCell();
    }, { threshold: 0.5 });
    bio.observe(bug);
  }

  /* ---------- hero + photo parallax (desktop, GSAP) ---------- */
  if (DESKTOP && !REDUCED && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('.hero .bg, .photo-sect .bg, .moment .bg').forEach(function (bg) {
      gsap.fromTo(bg, { yPercent: -5 }, {
        yPercent: 5, ease: 'none',
        scrollTrigger: { trigger: bg.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* ---------- spine segments: scroll-drawn chalk routes ---------- */
    document.querySelectorAll('.spine path').forEach(function (p) {
      p.setAttribute('pathLength', '1');
      p.style.strokeDasharray = '1';
      p.style.strokeDashoffset = '1';
      gsap.to(p, {
        strokeDashoffset: 0, ease: 'none',
        scrollTrigger: {
          trigger: p.closest('section') || p.closest('.spine').parentElement,
          start: 'top 75%', end: 'bottom 60%', scrub: 0.6
        }
      });
    });
    document.querySelectorAll('.spine .spine-cap').forEach(function (cap) {
      gsap.fromTo(cap, { scale: 0, transformOrigin: '50% 50%' }, {
        scale: 1, ease: 'back.out(2)',
        scrollTrigger: { trigger: cap.closest('section'), start: 'bottom 62%', toggleActions: 'play none none none' }
      });
    });
  }

  /* ---------- story page HUD ---------- */
  var hud = document.querySelector('.hud');
  if (hud) {
    var posEl = hud.querySelector('.pos');
    var barEl = hud.querySelector('.bar i');
    var chapters = Array.prototype.slice.call(document.querySelectorAll('[data-hud]'));
    function hudTick() {
      var doc = document.documentElement;
      var p = window.scrollY / (doc.scrollHeight - window.innerHeight);
      if (barEl) barEl.style.width = Math.min(p * 100, 100) + '%';
      var current = null;
      chapters.forEach(function (ch) {
        if (ch.getBoundingClientRect().top < window.innerHeight * 0.5) current = ch;
      });
      if (current && posEl) {
        var label = current.getAttribute('data-hud');
        if (posEl.getAttribute('data-now') !== label) {
          posEl.setAttribute('data-now', label);
          posEl.innerHTML = label;
        }
      }
    }
    window.addEventListener('scroll', hudTick, { passive: true });
    hudTick();
  }

  /* ---------- video lightbox ---------- */
  var lb = document.querySelector('.lightbox');
  if (lb) {
    var frame = lb.querySelector('.frame');
    document.querySelectorAll('[data-yt]').forEach(function (tile) {
      tile.addEventListener('click', function (ev) {
        ev.preventDefault();
        var id = tile.getAttribute('data-yt');
        frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id +
          '?autoplay=1&rel=0" title="YouTube video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
        lb.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });
    function closeLB() {
      lb.classList.remove('open');
      frame.innerHTML = '';
      document.body.style.overflow = '';
    }
    lb.querySelector('.close').addEventListener('click', closeLB);
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLB(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLB(); });
  }

  /* ---------- channel card: tabs drive the CTA ---------- */
  var chanTabs = document.querySelectorAll('.chan__tab');
  var chanGo = document.getElementById('chanGo');
  if (chanTabs.length && chanGo) {
    var CHANNEL = 'https://www.youtube.com/@KurtBenkert';
    Array.prototype.forEach.call(chanTabs, function (tab) {
      tab.addEventListener('click', function () {
        Array.prototype.forEach.call(chanTabs, function (t) {
          t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
        });
        chanGo.setAttribute('href', CHANNEL + (tab.getAttribute('data-path') || ''));
        chanGo.textContent = 'View ' + tab.getAttribute('data-label') + ' On YouTube';
      });
      tab.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var list = Array.prototype.slice.call(chanTabs);
        var i = list.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1);
        var next = list[(i + list.length) % list.length];
        next.focus();
        next.click();
      });
    });
  }

  /* ---------- book cover tilt (desktop) ---------- */
  var cover = document.querySelector('.bookcover .cover');
  if (cover && DESKTOP && !REDUCED) {
    var wrapEl = cover.parentElement;
    wrapEl.addEventListener('mousemove', function (e) {
      var r = wrapEl.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      cover.style.transform = 'rotateY(' + (x * 7) + 'deg) rotateX(' + (-y * 7) + 'deg)';
    });
    wrapEl.addEventListener('mouseleave', function () { cover.style.transform = 'none'; });
  }

  /* ---------- reveal footer: measure the pinned layer, ease the wordmark up ---------- */
  var mark = document.querySelector('.foot-mark');
  var wordmark = document.querySelector('.foot-mark .wordmark');
  if (mark) {
    var markH = 0;
    function sizeMark() {
      markH = mark.offsetHeight;
      document.documentElement.style.setProperty('--markH', markH + 'px');
    }
    sizeMark();
    window.addEventListener('resize', sizeMark);
    window.addEventListener('load', sizeMark);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeMark);

    if (wordmark && !REDUCED) {
      var ticking = false;
      function markTick() {
        ticking = false;
        if (!markH) { wordmark.style.setProperty('--rise', '0%'); return; }
        var docH = document.documentElement.scrollHeight;
        var exposed = window.scrollY + window.innerHeight - (docH - markH);
        var p = Math.min(Math.max(exposed / markH, 0), 1);
        var eased = 1 - Math.pow(1 - p, 3);
        wordmark.style.setProperty('--rise', ((1 - eased) * 24).toFixed(2) + '%');
      }
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(markTick);
      }, { passive: true });
      window.addEventListener('resize', markTick);
      markTick();
    }
  }

  /* ---------- cursor ring (desktop) ---------- */
  if (DESKTOP && !REDUCED) {
    var ring = document.createElement('div');
    ring.className = 'cursor-ring';
    ring.innerHTML = '<span class="cl"></span>';
    document.body.appendChild(ring);
    var rx = -100, ry = -100, tx = -100, ty = -100;
    document.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function loop() {
      rx += (tx - rx) * 0.16; ry += (ty - ry) * 0.16;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('[data-cursor]').forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        ring.classList.add('big');
        ring.querySelector('.cl').textContent = el.getAttribute('data-cursor');
      });
      el.addEventListener('mouseleave', function () { ring.classList.remove('big'); });
    });
  }

  /* ---------- magnetic CTAs (desktop, tiny pull) ---------- */
  if (DESKTOP && !REDUCED) {
    document.querySelectorAll('[data-magnet]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) / r.width;
        var y = (e.clientY - r.top - r.height / 2) / r.height;
        el.style.transform = 'translate(' + (x * 6) + 'px,' + (y * 5) + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }
})();

/* play-card rail: hide the right-edge fade once you reach the last card */
(function () {
  var rail = document.querySelector('.playcards');
  var lift = document.querySelector('.playcards-lift');
  if (!rail || !lift) return;
  function sync() {
    var atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8;
    lift.classList.toggle('rail-end', atEnd);
  }
  rail.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  sync();
})();
