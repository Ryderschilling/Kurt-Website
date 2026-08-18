/* more-nutrition.html only.
   Writes --p (0 -> 1) onto any [data-mn-track] > child stage from that track's
   own scroll progress. Drives two things: the hero's staged copy reveal and the
   grow section's frame scaling.
   Deliberately NOT a ScrollTrigger pin: a pin injects spacer height and forces
   everything below it to re-measure, and a GSAP scrub fights Lenis. sticky +
   one custom property does the same job and never touches layout. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* main.js auto-tags .kicker / .lede with [data-rv] and reveals them on
     intersection. Inside the hero stage that fights the scroll-driven reveal,
     so hand those elements back. */
  var stage = document.querySelector('.mn-hero__stage');
  if (stage) {
    stage.querySelectorAll('[data-rv]').forEach(function (el) {
      el.removeAttribute('data-rv');
      el.classList.remove('in');
    });
  }

  var items = [
    { track: '.mn-hero__track',  target: '.mn-hero',        ease: 1 },
    { track: '.mn-grow__track',  target: '.mn-grow__frame', ease: 1.7 }
  ].map(function (i) {
    return { track: document.querySelector(i.track),
             target: document.querySelector(i.target),
             ease: i.ease, last: -1 };
  }).filter(function (i) { return i.track && i.target; });

  if (!items.length) return;

  if (reduce) {
    items.forEach(function (i) { i.target.style.setProperty('--p', 1); });
    return;
  }

  var queued = false;

  function measure() {
    queued = false;
    for (var n = 0; n < items.length; n++) {
      var i = items[n];
      var r = i.track.getBoundingClientRect();
      var travel = r.height - window.innerHeight; // the sticky child's run
      if (travel <= 0) continue;
      var p = -r.top / travel;
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      var eased = i.ease === 1 ? p : 1 - Math.pow(1 - p, i.ease);
      eased = Math.round(eased * 1000) / 1000;
      if (eased === i.last) continue;
      i.last = eased;
      i.target.style.setProperty('--p', eased);
    }
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(measure);
  }

  /* the loose three-up slides in, staggered, the first time it is seen */
  var cards = document.querySelectorAll('.mn-strip figure');
  if (cards.length) {
    cards.forEach(function (el, n) { el.style.setProperty('--i', n); });
    if (reduce || !('IntersectionObserver' in window)) {
      cards.forEach(function (el) { el.classList.add('in'); });
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('in');
          cio.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -14% 0px' });
      cards.forEach(function (el) { cio.observe(el); });
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();
})();

/* shoot-strip rail: drop the right-edge fade once you reach the last frame */
(function () {
  var rail = document.querySelector('.mn-strip');
  var hold = document.querySelector('.mn-strip-hold');
  if (!rail || !hold) return;
  function sync() {
    hold.classList.toggle('rail-end', rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8);
  }
  rail.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  sync();
})();
