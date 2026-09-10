import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import '@phosphor-icons/web/regular';
import '@phosphor-icons/web/bold';
import '@phosphor-icons/web/fill';

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = window.matchMedia('(pointer: coarse)').matches;

export function bindHoverTargets() {
  const cring = document.getElementById('cring');
  if (!cring) return;
  document.querySelectorAll('[data-hover]').forEach((el) => {
    if (el.dataset.hoverBound) return; // avoid stacking duplicate listeners on repeat calls
    el.dataset.hoverBound = '1';
    el.addEventListener('mouseenter', () => cring.classList.add('hover'));
    el.addEventListener('mouseleave', () => cring.classList.remove('hover'));
  });
  document.querySelectorAll('[data-magnet]').forEach((el) => {
    if (el.dataset.magnetBound) return;
    el.dataset.magnetBound = '1';
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const relX = e.clientX - r.left - r.width / 2;
      const relY = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${relX * 0.28}px, ${relY * 0.35}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translate(0,0)';
    });
  });
}

export function revealNew(el) {
  if (reduced) {
    el.classList.add('in');
    return;
  }
  gsap.fromTo(
    el,
    { opacity: 0, y: 30 },
    {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    }
  );
}

export function navigateWithTransition(href) {
  if (reduced) {
    window.location.href = href;
    return;
  }
  const wipe = document.getElementById('pageWipe');
  wipe.classList.add('run');
  setTimeout(() => {
    window.location.href = href;
  }, 480);
}

export function initShared() {
  // preloader + late-content safety net
  window.addEventListener('load', () => {
    const pre = document.getElementById('preloader');
    if (pre) setTimeout(() => pre.classList.add('done'), reduced ? 0 : 1250);
    // fonts/images can finish loading after our initial ScrollTrigger measurements;
    // refresh once everything has settled so trigger positions stay accurate.
    setTimeout(() => ScrollTrigger.refresh(), 300);
  });

  // custom cursor
  if (!reduced && !coarse) {
    const cdot = document.getElementById('cdot');
    const cring = document.getElementById('cring');
    if (cdot && cring) {
      let mx = 0, my = 0, rx = 0, ry = 0;
      window.addEventListener('mousemove', (e) => {
        mx = e.clientX;
        my = e.clientY;
        cdot.style.left = mx + 'px';
        cdot.style.top = my + 'px';
      });
      (function loop() {
        rx += (mx - rx) * 0.18;
        ry += (my - ry) * 0.18;
        cring.style.left = rx + 'px';
        cring.style.top = ry + 'px';
        requestAnimationFrame(loop);
      })();
    }
    bindHoverTargets();
  }

  // exit transition on internal nav links
  document.querySelectorAll('a[data-transition]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || a.target === '_blank' || reduced) return;
      e.preventDefault();
      navigateWithTransition(href);
    });
  });

  // smooth scroll (created before nav/anchor wiring below, which reference it)
  let lenisInstance = null;
  if (!reduced) {
    lenisInstance = new Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 3) });
    lenisInstance.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenisInstance.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // header: denser glass background once the page has scrolled past the hero fold
  const headerEl = document.querySelector('header');
  if (headerEl) {
    const onScroll = () => headerEl.classList.toggle('scrolled', window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // mobile nav: open/close + lock background scroll while the overlay is up
  const burger = document.getElementById('burger');
  const navEl = document.querySelector('header nav');
  function closeNav() {
    navEl.classList.remove('open');
    burger?.classList.remove('open');
    burger?.setAttribute('aria-expanded', 'false');
    burger?.setAttribute('aria-label', 'Открыть меню');
    document.documentElement.classList.remove('nav-open');
    if (lenisInstance) lenisInstance.start();
  }
  function openNav() {
    navEl.classList.add('open');
    burger?.classList.add('open');
    burger?.setAttribute('aria-expanded', 'true');
    burger?.setAttribute('aria-label', 'Закрыть меню');
    document.documentElement.classList.add('nav-open');
    if (lenisInstance) lenisInstance.stop();
  }
  if (burger && navEl) {
    burger.addEventListener('click', () => {
      navEl.classList.contains('open') ? closeNav() : openNav();
    });
    navEl.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeNav));
  }

  // same-page anchor links (e.g. "/#tour" while already on "/") get a smooth,
  // Lenis-driven scroll instead of the browser's instant jump, so in-page
  // navigation feels consistent with the rest of the site's scroll feel.
  document.querySelectorAll('a[href*="#"]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;
    const [path, hash] = href.split('#');
    if (!hash) return;
    const samePage = path === '' || path === window.location.pathname;
    if (!samePage) return;
    a.addEventListener('click', (e) => {
      const target = document.getElementById(hash);
      if (!target) return;
      e.preventDefault();
      if (lenisInstance) lenisInstance.scrollTo(target, { offset: -84, duration: 1.2 });
      else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // scroll reveal
  document.querySelectorAll('.reveal').forEach((el) => revealNew(el));
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    if (reduced) {
      Array.from(group.children).forEach((c) => c.classList.add('in'));
      return;
    }
    gsap.fromTo(
      group.children,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: { trigger: group, start: 'top 85%' },
      }
    );
  });

  // marquee
  const track = document.getElementById('marquee');
  if (track) {
    const cities = ['МОСКВА', 'СПБ', 'ЕКАТЕРИНБУРГ', 'ТБИЛИСИ', 'БЕРЛИН', 'БЕЛГРАД', 'ЕРЕВАН', 'АЛМАТЫ'];
    const build = () => cities.map((c) => `<span>${c} <b>●</b></span>`).join('');
    track.innerHTML = build() + build();
  }

  return { lenis: lenisInstance };
}

export { gsap, ScrollTrigger };
