import '../style.css';
import { initShared, bindHoverTargets, revealNew, gsap, ScrollTrigger } from '../shared.js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

initShared();

const fallbackReleases = [
  {
    title: 'Ночь с астраханцем',
    year: '2025',
    spotify_album_id: '6n9pF7yHoOfZD63HRHpdX1',
    featured: true,
    description:
      'Восьмой полноформатный альбом и первый релиз после четырёхлетнего перерыва. Семнадцать треков — самое личное, что группа выпускала за всю историю.',
  },
  { title: 'Перезвони мне +79995771202 (Deluxe)', year: '2022', spotify_album_id: '5XZlSaRAFO0ukaPElUinAy', featured: false },
  { title: 'Перезвони мне +79995771202', year: '2021', spotify_album_id: '29rpiWucaS0UFkGGyPlzjt', featured: false },
  { title: 'Синий кит', year: 'Сингл · 2019', spotify_album_id: '3ECq39uz37z2DWVqsOkp24', featured: false },
  { title: 'Дети и радуга', year: '2013', spotify_album_id: '3CtNVI7ufM3ofkJC5XE9Mc', featured: false },
];

const COMPACT_H = 152; // Spotify's compact single-row embed
const EXPANDED_H = 470; // tall enough to list every track on all current releases, with internal scroll for longer ones

function embedSrc(id) {
  return `https://open.spotify.com/embed/album/${id}?utm_source=generator&theme=0`;
}

function coverFor(i) {
  return `/images/covers/${(i % 5) + 1}.svg`;
}

function renderFeatured(release) {
  const wrap = document.getElementById('featuredWrap');
  wrap.innerHTML = `
    <div class="featured-inner reveal">
      <div class="featured-copy">
        <span class="section-tag">НОВЫЙ АЛЬБОМ · ${release.year}</span>
        <h2>${release.title}</h2>
        <p>${release.description || ''}</p>
      </div>
      <div class="spotify-frame">
        <iframe style="border-radius:12px" src="${embedSrc(release.spotify_album_id)}" width="100%" height="${EXPANDED_H}"
          title="${release.title} — слушать все треки на Spotify"
          frameborder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
      </div>
    </div>`;
}

function renderGrid(releases) {
  const grid = document.getElementById('albumGrid');
  grid.innerHTML = releases
    .map(
      (r, i) => `
    <div class="album-cell reveal">
      <div class="head">
        <img class="cell-cover" src="${coverFor(i + 1)}" alt="" aria-hidden="true" width="40" height="40" style="border-radius:4px;flex:none;">
        <span class="t">${r.title}</span><span class="y">${r.year}</span>
      </div>
      <iframe src="${embedSrc(r.spotify_album_id)}" width="100%" height="${COMPACT_H}" frameborder="0"
        title="${r.title} — слушать на Spotify"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
      <button type="button" class="track-toggle" data-hover aria-expanded="false">
        <span class="label">Показать все треки</span><i class="ph-bold ph-caret-down"></i>
      </button>
    </div>`
    )
    .join('');

  grid.querySelectorAll('.track-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const iframe = btn.previousElementSibling;
      const open = btn.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      btn.querySelector('.label').textContent = open ? 'Свернуть список' : 'Показать все треки';
      gsap.to(iframe, {
        height: open ? EXPANDED_H : COMPACT_H,
        duration: 0.55,
        ease: 'power3.inOut',
        onUpdate() {
          iframe.setAttribute('height', String(Math.round(gsap.getProperty(iframe, 'height'))));
        },
        onComplete: () => ScrollTrigger.refresh(),
      });
    });
  });
}

async function loadDiscography() {
  let releases = fallbackReleases;
  if (isSupabaseConfigured) {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('releases')
      .select('title, year, spotify_album_id, featured, description')
      .order('sort_order', { ascending: true });
    if (!error && data && data.length) releases = data;
  }
  const featured = releases.find((r) => r.featured) || releases[0];
  const rest = releases.filter((r) => r !== featured);
  renderFeatured(featured);
  renderGrid(rest);
  bindHoverTargets();
  document.querySelectorAll('#featuredWrap .reveal, #albumGrid .reveal').forEach((el) => revealNew(el));
  ScrollTrigger.refresh(); // content below (follow-strip, footer) shifted — re-measure
}

loadDiscography();
