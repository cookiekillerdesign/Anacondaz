import '../style.css';
import { initShared, bindHoverTargets, navigateWithTransition, gsap, ScrollTrigger } from '../shared.js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

initShared();

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const fallbackReleases = [
  { title: 'Ночь с астраханцем', year: 'Альбом · 2025', spotify_album_id: '6n9pF7yHoOfZD63HRHpdX1', featured: true },
  { title: 'Перезвони мне +79995771202', year: 'Альбом · 2021', spotify_album_id: '29rpiWucaS0UFkGGyPlzjt', featured: false },
  { title: 'Синий кит', year: 'Сингл · 2019', spotify_album_id: '3ECq39uz37z2DWVqsOkp24', featured: false },
  { title: 'Дети и радуга', year: '2012', spotify_album_id: '3CtNVI7ufM3ofkJC5XE9Mc', featured: false },
];

// Real upcoming dates as listed on the band's own site, anacondaz.ru — kept
// current only as of when this was last pulled; replace via Supabase once
// wired up so the list doesn't quietly go stale.
const fallbackTour = [
  { event_date: '20 СЕН', city: 'Лимассол', venue: 'Кипр', status: 'onsale', ticket_url: 'https://anacondaz.ru/' },
  { event_date: '18 НОЯ', city: 'Кишинёв', venue: 'Молдова', status: 'onsale', ticket_url: 'https://anacondaz.ru/' },
  { event_date: '21–25 НОЯ', city: 'США', venue: 'Восточное и западное побережье', status: 'onsale', ticket_url: 'https://anacondaz.ru/' },
  { event_date: '30 НОЯ', city: 'Дублин', venue: 'Ирландия', status: 'onsale', ticket_url: 'https://anacondaz.ru/' },
  { event_date: '4–5 ЯНВ', city: 'Сербия / Черногория', venue: 'Даты уточняются по городам', status: 'onsale', ticket_url: 'https://anacondaz.ru/' },
  { event_date: 'СКОРО', city: 'Торонто / Ванкувер', venue: 'Канада', status: 'tba', ticket_url: 'https://anacondaz.ru/' },
];

function embedSrc(id) {
  return `https://open.spotify.com/embed/album/${id}?utm_source=generator&theme=0`;
}

// covers are placeholder art — the client drops a same-named file into
// public/images/covers/ to replace any of these without touching markup
function coverFor(i) {
  return `/images/covers/${(i % 5) + 1}.svg`;
}

async function loadReleases() {
  let releases = fallbackReleases;
  if (isSupabaseConfigured) {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('releases')
      .select('title, year, spotify_album_id, featured')
      .order('sort_order', { ascending: true })
      .limit(4);
    if (!error && data && data.length) releases = data;
  }

  const list = document.getElementById('discoList');
  list.innerHTML = releases
    .map(
      (a, i) => `
    <a class="filmstrip-panel" data-hover href="discography.html" data-transition>
      <div class="cover-sq">
        <img src="${coverFor(i)}" alt="" aria-hidden="true">
        <span class="idx">${String(i + 1).padStart(2, '0')}</span>
        <div class="play-circle"><i class="ph-fill ph-play"></i></div>
      </div>
      <div>
        <div class="ft">${a.title}</div>
        <span class="fy">${a.year}</span>
      </div>
    </a>`
    )
    .join('');
  list.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigateWithTransition(a.getAttribute('href'));
    });
  });
  bindHoverTargets();
  ScrollTrigger.refresh(); // layout height changed — re-measure trigger positions for sections below

  // "listen now" widget on the home page mirrors the newest/featured release
  const featured = releases.find((r) => r.featured) || releases[0];
  const player = document.getElementById('homePlayer');
  if (player && featured?.spotify_album_id) {
    player.innerHTML = `<iframe style="border-radius:12px" src="${embedSrc(featured.spotify_album_id)}"
      width="100%" height="480" title="${featured.title} — слушать на Spotify" frameborder="0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
  }
}

async function loadTour() {
  let tour = fallbackTour;
  if (isSupabaseConfigured) {
    const supabase = await getSupabase();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('tour_dates')
      .select('event_date, city, venue, ticket_url')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(6);
    if (!error && data && data.length) {
      tour = data.map((t) => ({
        ...t,
        event_date: new Date(t.event_date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }).toUpperCase(),
      }));
    }
  }
  document.getElementById('tourList').innerHTML = tour
    .map((t) => {
      const tba = t.status === 'tba';
      return `
    <div class="tour-row" data-hover>
      <span class="date">${t.event_date}</span>
      <span class="city">${t.city}</span>
      <span class="venue">${t.venue}</span>
      <span class="status-pill ${tba ? 'is-tba' : 'is-onsale'}">${tba ? 'Уточняется' : 'Билеты в продаже'}</span>
      ${
        tba
          ? `<span class="ticket-btn is-disabled">СКОРО</span>`
          : `<a href="${t.ticket_url || 'https://anacondaz.ru/'}" target="_blank" rel="noopener" class="ticket-btn">АФИША <i class="ph-bold ph-arrow-up-right"></i></a>`
      }
    </div>`;
    })
    .join('');
  bindHoverTargets();
  ScrollTrigger.refresh();
}

// hero ember particle field — drifting embers with a mouse-reactive gravity well
function initEmberCanvas() {
  const canvas = document.getElementById('emberCanvas');
  const hero = document.querySelector('.hero');
  if (!canvas || !hero) return;
  const ctx = canvas.getContext('2d');
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  let w, h, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.offsetWidth;
    h = hero.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(resize, 150);
  });

  let mx = w * 0.7, my = h * 0.35, hasMouse = false;
  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
    hasMouse = true;
  });
  hero.addEventListener('mouseleave', () => { hasMouse = false; });

  // fewer particles on small/touch screens — lighter on battery, plenty ambient either way
  const COUNT = reduced ? 0 : (coarse || w < 640 ? 28 : 60);
  const particles = Array.from({ length: COUNT }, () => spawn());

  function spawn(atBottom) {
    return {
      x: Math.random() * w,
      y: atBottom === false ? Math.random() * h : h + Math.random() * 80,
      r: 0.6 + Math.random() * 1.8,
      vy: -(0.25 + Math.random() * 0.6),
      vx: (Math.random() - 0.5) * 0.15,
      drift: Math.random() * Math.PI * 2,
      hue: Math.random() < 0.75 ? [255, 122, 26] : [203, 255, 77], // amber or venom
      alpha: 0.25 + Math.random() * 0.45,
      life: 0,
    };
  }
  particles.forEach((p) => { p.y = Math.random() * h; });

  let running = false;
  function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.life += 0.01;
      p.x += p.vx + Math.sin(p.drift + p.life * 2) * 0.25;
      p.y += p.vy;

      if (hasMouse) {
        const dx = p.x - mx, dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160 && dist > 1) {
          const f = (1 - dist / 160) * 0.9;
          p.x += (dx / dist) * f;
          p.y += (dy / dist) * f;
        }
      }

      if (p.y < -20) Object.assign(p, spawn(false), { y: h + 10 });
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;

      const [r, g, b] = p.hue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
      ctx.shadowColor = `rgba(${r},${g},${b},0.8)`;
      ctx.shadowBlur = 6;
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }

  // pause the loop entirely once the hero scrolls out of view — no point
  // burning CPU/battery animating particles nobody can see
  if (!reduced) {
    const io = new IntersectionObserver(([entry]) => {
      const wasRunning = running;
      running = entry.isIntersecting;
      if (running && !wasRunning) requestAnimationFrame(tick);
    });
    io.observe(hero);
  }
}

// subtle drift on the huge faint wordmark behind the hero photo — depth, not noise
function initParallax() {
  if (reduced) return;
  gsap.to('.hero-mark', {
    yPercent: 12,
    rotate: -1,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
  });
}

// hero headline: word-by-word rise instead of a hard-coded per-span animation-delay hack
async function initHeroReveal() {
  const title = document.querySelector('.hero-title');
  if (!title) return;
  if (reduced) {
    title.classList.add('ready');
    return;
  }
  const { SplitText } = await import('gsap/SplitText');
  gsap.registerPlugin(SplitText);
  document.fonts.ready.then(() => {
    title.classList.add('ready');
    SplitText.create(title, {
      type: 'words',
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.words, {
          yPercent: 115,
          opacity: 0,
          duration: 1,
          ease: 'power4.out',
          stagger: 0.09,
          delay: 0.15,
        });
      },
    });
  });
}

loadReleases();
loadTour();
initEmberCanvas();
initParallax();
initHeroReveal();
