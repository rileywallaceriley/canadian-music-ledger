/**
 * Canadian Music Ledger — app.js
 * =================================
 * Loads real data from data/releases.json + data/tally.json.
 * Falls back to clearly-labelled SAMPLE DATA if those files
 * aren't present yet (i.e. before first build run).
 *
 * Sample release dates are always computed relative to TODAY
 * so they never appear stale.
 */

'use strict';

// ─────────────────────────────────────────────────────────────
// PROVINCE MAP
// ─────────────────────────────────────────────────────────────
const PROV = {
  ON:'Ontario', QC:'Québec', BC:'British Columbia', AB:'Alberta',
  SK:'Saskatchewan', MB:'Manitoba', NS:'Nova Scotia', NB:'New Brunswick',
  NL:'Newfoundland & Labrador', PEI:'Prince Edward Island',
  YT:'Yukon', NT:'Northwest Territories', NU:'Nunavut',
};

// ─────────────────────────────────────────────────────────────
// CHART PALETTE — crimson spectrum
// ─────────────────────────────────────────────────────────────
const PALETTE = [
  '#c8273e','#e8345a','#8a1828','#ff5878','#640e1c',
  '#ff7890','#d43848','#9e1e30','#ff3858','#6a1020',
  '#e05868','#b02030',
];

// ─────────────────────────────────────────────────────────────
// SAMPLE DATA — dates always relative to today
// Shown only when data/releases.json hasn't been generated yet
// ─────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

const SAMPLE_RELEASES = [
  { artist:'Haviah Mighty',            artist_province:'ON', release_title:'Full Circle',        release_type:'Album',  release_date:daysAgo(1),  primary_genre:'Hip-Hop',      independent:true,  source_url:'https://bandcamp.com',     platforms:['Bandcamp'],            label:'' },
  { artist:'Corridor',                 artist_province:'QC', release_title:'Mouvement',           release_type:'Album',  release_date:daysAgo(2),  primary_genre:'Rock',         independent:false, source_url:'https://musicbrainz.org',  platforms:['MusicBrainz'],         label:'Sub Pop' },
  { artist:'Venetian Snares',          artist_province:'MB', release_title:'Pattern Recognition', release_type:'Album',  release_date:daysAgo(3),  primary_genre:'Electronic',   independent:false, source_url:'https://musicbrainz.org',  platforms:['MusicBrainz','Bandcamp'],label:'Planet Mu' },
  { artist:'Lido Pimienta',            artist_province:'ON', release_title:'Aterrizaje',          release_type:'Single', release_date:daysAgo(4),  primary_genre:'World',        independent:true,  source_url:'https://bandcamp.com',     platforms:['Bandcamp'],            label:'' },
  { artist:'Destroyer',                artist_province:'BC', release_title:'Labyrinthitis II',    release_type:'Album',  release_date:daysAgo(5),  primary_genre:'Pop',          independent:false, source_url:'https://musicbrainz.org',  platforms:['MusicBrainz'],         label:'Merge Records' },
  { artist:'Jessie Reyez',             artist_province:'ON', release_title:'Before Love Came',    release_type:'Album',  release_date:daysAgo(5),  primary_genre:'R&B / Soul',   independent:false, source_url:'https://musicbrainz.org',  platforms:['MusicBrainz'],         label:'Island' },
  { artist:'Suuns',                    artist_province:'QC', release_title:'Fiction',             release_type:'EP',     release_date:daysAgo(6),  primary_genre:'Experimental', independent:true,  source_url:'https://bandcamp.com',     platforms:['Bandcamp'],            label:'' },
  { artist:'The Weather Station',      artist_province:'ON', release_title:'Humanhood',           release_type:'Album',  release_date:daysAgo(7),  primary_genre:'Folk',         independent:true,  source_url:'https://musicbrainz.org',  platforms:['MusicBrainz','Bandcamp'],label:'' },
  { artist:'Brave Shores',             artist_province:'NS', release_title:'Pacific',             release_type:'EP',     release_date:daysAgo(8),  primary_genre:'Pop',          independent:true,  source_url:'https://bandcamp.com',     platforms:['Bandcamp'],            label:'' },
  { artist:'Milk & Bone',              artist_province:'QC', release_title:'Côte-Est',            release_type:'Album',  release_date:daysAgo(10), primary_genre:'Electronic',   independent:true,  source_url:'https://bandcamp.com',     platforms:['Bandcamp'],            label:'' },
  { artist:'Cadence Weapon',           artist_province:'AB', release_title:'Parallel World II',   release_type:'Album',  release_date:daysAgo(12), primary_genre:'Hip-Hop',      independent:true,  source_url:'https://musicbrainz.org',  platforms:['MusicBrainz'],         label:'' },
  { artist:'Andy Shauf',               artist_province:'SK', release_title:'Norm',                release_type:'Album',  release_date:daysAgo(14), primary_genre:'Folk',         independent:false, source_url:'https://musicbrainz.org',  platforms:['MusicBrainz','Bandcamp'],label:'ANTI-' },
  { artist:'Yamantaka // Sonic Titan', artist_province:'BC', release_title:'Dirt',                release_type:'Album',  release_date:daysAgo(15), primary_genre:'Experimental', independent:true,  source_url:'https://bandcamp.com',     platforms:['Bandcamp'],            label:'' },
  { artist:'Terra Lightfoot',          artist_province:'ON', release_title:'Consider the Bull',   release_type:'Album',  release_date:daysAgo(17), primary_genre:'Country',      independent:false, source_url:'https://musicbrainz.org',  platforms:['MusicBrainz'],         label:'Sonic Unyon' },
  { artist:'Scott Hardware',           artist_province:'ON', release_title:'Mutate',              release_type:'Album',  release_date:daysAgo(18), primary_genre:'Electronic',   independent:true,  source_url:'https://bandcamp.com',     platforms:['Bandcamp'],            label:'' },
  { artist:'Weaves',                   artist_province:'ON', release_title:'Common Grounds',      release_type:'Album',  release_date:daysAgo(20), primary_genre:'Punk',         independent:true,  source_url:'https://musicbrainz.org',  platforms:['MusicBrainz'],         label:'' },
  { artist:'Begonia',                  artist_province:'MB', release_title:'Powder Blue',         release_type:'EP',     release_date:daysAgo(21), primary_genre:'Folk',         independent:true,  source_url:'https://bandcamp.com',     platforms:['Bandcamp'],            label:'' },
  { artist:'Metz',                     artist_province:'ON', release_title:'Up on Gravity Hill',  release_type:'Album',  release_date:daysAgo(23), primary_genre:'Punk',         independent:false, source_url:'https://musicbrainz.org',  platforms:['MusicBrainz'],         label:'Sub Pop' },
  { artist:'Orville Peck',             artist_province:'BC', release_title:'Stampede',            release_type:'Album',  release_date:daysAgo(26), primary_genre:'Country',      independent:false, source_url:'https://musicbrainz.org',  platforms:['MusicBrainz','Bandcamp'],label:'Columbia' },
  { artist:'Badge Époque Ensemble',    artist_province:'ON', release_title:'Self-Help',           release_type:'Album',  release_date:daysAgo(29), primary_genre:'Jazz',         independent:false, source_url:'https://bandcamp.com',     platforms:['Bandcamp'],            label:'Telephone Explosion' },
];

// Pre-compute tally from sample
const SAMPLE_TALLY = (function() {
  const t = {
    generated_at: new Date().toISOString(),
    total_releases_last_7_days:  0,
    total_releases_last_30_days: SAMPLE_RELEASES.length,
    by_genre: {}, by_province: {},
    independent_count: 0, label_count: 0,
  };
  SAMPLE_RELEASES.forEach(r => {
    const age = Math.floor((Date.now() - new Date(r.release_date)) / 86400000);
    if (age <= 7) t.total_releases_last_7_days++;
    if (r.independent) t.independent_count++; else t.label_count++;
    t.by_genre[r.primary_genre] = (t.by_genre[r.primary_genre] || 0) + 1;
    const pn = PROV[r.artist_province] || r.artist_province;
    t.by_province[pn] = (t.by_province[pn] || 0) + 1;
  });
  return t;
})();

// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────
const S = {
  all: [], tally: {},
  range: 7, genre: '', province: '', indieFilter: '',
};
let gchart = null, pchart = null, usingDemo = false;

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────
function daysSince(s) {
  if (!s) return 9999;
  const d = new Date(s.length === 10 ? s + 'T12:00:00Z' : s);
  return isNaN(d) ? 9999 : Math.floor((Date.now() - d) / 86400000);
}

function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s.length === 10 ? s + 'T12:00:00Z' : s);
  return isNaN(d) ? s : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function genreClass(g) {
  return (g || 'Other').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function uniq(arr, field) {
  return [...new Set(arr.map(r => r[field]).filter(Boolean))].sort();
}

function animCount(el, target, ms = 850) {
  if (!el) return;
  const t0 = performance.now();
  (function loop(now) {
    const p = Math.min((now - t0) / ms, 1);
    const e = 1 - Math.pow(2, -10 * p);
    el.textContent = Math.round(target * e);
    if (p < 1) requestAnimationFrame(loop);
    else el.textContent = target;
  })(t0);
}

// ─────────────────────────────────────────────────────────────
// DATA LOADING
// ─────────────────────────────────────────────────────────────
async function loadData() {
  try {
    const [rr, tr] = await Promise.all([
      fetch('data/releases.json'),
      fetch('data/tally.json'),
    ]);
    if (!rr.ok || !tr.ok) throw new Error('HTTP error');
    const releases = await rr.json();
    if (!Array.isArray(releases) || releases.length === 0) throw new Error('empty');
    S.all    = releases;
    S.tally  = await tr.json();
    usingDemo = false;
  } catch (_) {
    S.all    = SAMPLE_RELEASES;
    S.tally  = SAMPLE_TALLY;
    usingDemo = true;
  }
}

// ─────────────────────────────────────────────────────────────
// FILTER
// ─────────────────────────────────────────────────────────────
function getFiltered() {
  return S.all.filter(r => {
    if (daysSince(r.release_date) > S.range) return false;
    if (S.genre && r.primary_genre !== S.genre) return false;
    if (S.province) {
      const pn = PROV[r.artist_province] || r.artist_province;
      if (pn !== S.province && r.artist_province !== S.province) return false;
    }
    if (S.indieFilter === 'independent' && !r.independent) return false;
    if (S.indieFilter === 'label' && r.independent) return false;
    return true;
  });
}

// ─────────────────────────────────────────────────────────────
// RENDER: masthead dates
// ─────────────────────────────────────────────────────────────
function renderDates() {
  const now = new Date();
  const dn  = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const vol = document.getElementById('ledger-vol');
  const dt  = document.getElementById('ledger-date-top');
  if (vol) vol.textContent = `Vol. ${now.getFullYear()} · No. ${dn}`;
  if (dt)  dt.textContent  = now.toLocaleDateString('en-CA', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
}

// ─────────────────────────────────────────────────────────────
// RENDER: stats counters
// ─────────────────────────────────────────────────────────────
function renderStats() {
  const t = S.tally;
  animCount(document.getElementById('stat-7'),        t.total_releases_last_7_days  || 0);
  animCount(document.getElementById('stat-30'),       t.total_releases_last_30_days || 0, 1050);
  animCount(document.getElementById('stat-indie'),    t.independent_count           || 0, 950);
  animCount(document.getElementById('stat-label-ct'), t.label_count                 || 0, 950);
  if (t.generated_at) {
    const el = document.getElementById('footer-date');
    if (el) el.textContent = new Date(t.generated_at)
      .toLocaleString('en-CA', { dateStyle:'medium', timeStyle:'short', timeZone:'UTC' }) + ' UTC';
  }
}

// ─────────────────────────────────────────────────────────────
// RENDER: filter dropdowns
// ─────────────────────────────────────────────────────────────
function renderDropdowns() {
  const genres = uniq(S.all, 'primary_genre');
  const provs  = [...new Set(
    S.all.map(r => PROV[r.artist_province] || r.artist_province).filter(Boolean)
  )].sort();

  const gSel = document.getElementById('filter-genre');
  genres.forEach(g => {
    const o = document.createElement('option');
    o.value = g; o.textContent = g;
    gSel.appendChild(o);
  });

  const pSel = document.getElementById('filter-province');
  provs.forEach(p => {
    const o = document.createElement('option');
    o.value = p; o.textContent = p;
    pSel.appendChild(o);
  });
}

// ─────────────────────────────────────────────────────────────
// RENDER: ledger rows
// Renders a desktop grid row AND a mobile card from the same
// element — CSS handles which layout is shown.
// ─────────────────────────────────────────────────────────────
function renderLedger() {
  const rows  = getFiltered();
  const body  = document.getElementById('ledger-body');
  const empty = document.getElementById('empty-state');
  const countEl = document.getElementById('results-count-num');
  if (countEl) countEl.textContent = rows.length;

  if (!rows.length) {
    body.innerHTML = '';
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  body.innerHTML = rows.map((r, i) => {
    const gc    = genreClass(r.primary_genre || 'Other');
    const pcode = r.artist_province || '';
    const pname = PROV[pcode] || pcode || '—';
    const fmt   = (r.release_type || '').toLowerCase().replace(/^album$/i, 'LP');
    const titleHtml = r.source_url
      ? `<a href="${esc(r.source_url)}" target="_blank" rel="noopener">${esc(r.release_title || '—')}</a>`
      : esc(r.release_title || '—');
    const indieHtml = r.independent
      ? `<span class="indie-star" title="Independent">✦</span>`
      : `<span style="color:var(--rim)" title="On a label">–</span>`;
    const delay = Math.min(i * 0.022, 0.44).toFixed(3);

    // Mobile tag row: genre pill + province badge + indie badge
    const mobileTags = [
      `<span class="g-pill gp-${gc}">${esc(r.primary_genre || 'Other')}</span>`,
      pcode ? `<span class="mob-prov" title="${esc(pname)}">${esc(pcode)}</span>` : '',
      r.independent ? `<span class="mob-indie">✦ Indie</span>` : '',
      fmt   ? `<span class="mob-prov" style="color:var(--muted);border-color:var(--rim);background:transparent">${esc(fmt)}</span>` : '',
    ].filter(Boolean).join('');

    return `<div class="ledger-row" role="listitem" style="--rd:${delay}s">
  <span class="row-date">${fmtDate(r.release_date)}</span>
  <span class="row-artist" title="${esc(r.artist)}">${esc(r.artist)}</span>
  <span class="row-title">${titleHtml}</span>
  <span class="row-genre"><span class="g-pill gp-${gc}">${esc(r.primary_genre || 'Other')}</span></span>
  <span class="row-prov" title="${esc(pname)}">${esc(pcode || '—')}</span>
  <span class="row-format">${esc(fmt)}</span>
  <span class="row-indie">${indieHtml}</span>
  <span class="row-tags">${mobileTags}</span>
</div>`;
  }).join('\n');
}

// ─────────────────────────────────────────────────────────────
// RENDER: Chart.js charts
// ─────────────────────────────────────────────────────────────
const TOOLTIP_BASE = {
  backgroundColor: '#1e1e26',
  borderColor:     '#c8273e',
  borderWidth:     1,
  titleColor:      '#ecead2',
  bodyColor:       '#b4b4c8',
  titleFont: { family: "'DM Mono'", size: 10 },
  bodyFont:  { family: "'DM Mono'", size: 10 },
  padding:   10,
};

function renderCharts() {
  const t = S.tally;

  // ── Genre horizontal bar ─────────────────────────────────
  const genEntries = Object.entries(t.by_genre || {}).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const gLabels    = genEntries.map(([k]) => k);
  const gVals      = genEntries.map(([, v]) => v);

  const gCtx = document.getElementById('chart-genre');
  if (gCtx) {
    if (gchart) gchart.destroy();
    gchart = new Chart(gCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: gLabels,
        datasets: [{
          data: gVals,
          backgroundColor: gLabels.map((_, i) => PALETTE[i % PALETTE.length] + '22'),
          borderColor:     gLabels.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 1,
          borderRadius: 2,
          hoverBackgroundColor: gLabels.map((_, i) => PALETTE[i % PALETTE.length] + '44'),
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 850, easing: 'easeOutExpo' },
        plugins: {
          legend: { display: false },
          tooltip: { ...TOOLTIP_BASE, callbacks: { label: c => ` ${c.parsed.x} release${c.parsed.x !== 1 ? 's' : ''}` } },
        },
        scales: {
          x: { grid: { color: 'rgba(53,53,63,.5)' }, ticks: { color: '#b4b4c8', font: { family: "'DM Mono'", size: 9 } }, border: { color: 'transparent' } },
          y: { grid: { display: false }, ticks: { color: '#b4b4c8', font: { family: "'DM Mono'", size: 9 }, maxRotation: 0 }, border: { color: 'transparent' } },
        },
      },
    });
  }

  // ── Province doughnut ────────────────────────────────────
  const pvEntries = Object.entries(t.by_province || {}).sort((a, b) => b[1] - a[1]);
  const pLabels   = pvEntries.map(([k]) => k);
  const pVals     = pvEntries.map(([, v]) => v);

  const pCtx = document.getElementById('chart-province');
  if (pCtx) {
    if (pchart) pchart.destroy();
    pchart = new Chart(pCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: pLabels,
        datasets: [{
          data: pVals,
          backgroundColor: pLabels.map((_, i) => PALETTE[i % PALETTE.length] + '38'),
          borderColor:     pLabels.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 1,
          hoverBackgroundColor: pLabels.map((_, i) => PALETTE[i % PALETTE.length] + '66'),
          hoverOffset: 5,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '60%',
        animation: { duration: 850, easing: 'easeOutExpo' },
        plugins: {
          legend: {
            display: true, position: 'bottom',
            labels: { color: '#b4b4c8', font: { family: "'DM Mono'", size: 8.5 }, boxWidth: 8, padding: 7, usePointStyle: true, pointStyle: 'rect' },
          },
          tooltip: { ...TOOLTIP_BASE, callbacks: { label: c => ` ${c.label}: ${c.parsed} release${c.parsed !== 1 ? 's' : ''}` } },
        },
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────
// EVENT BINDINGS
// ─────────────────────────────────────────────────────────────
function bindEvents() {
  document.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.range = parseInt(btn.dataset.range, 10);
      renderLedger();
    });
  });

  document.getElementById('filter-genre')?.addEventListener('change', e => {
    S.genre = e.target.value; renderLedger();
  });
  document.getElementById('filter-province')?.addEventListener('change', e => {
    S.province = e.target.value; renderLedger();
  });
  document.getElementById('filter-type')?.addEventListener('change', e => {
    S.indieFilter = e.target.value; renderLedger();
  });
  document.getElementById('reset-filters')?.addEventListener('click', () => {
    S.genre = S.province = S.indieFilter = '';
    S.range = 7;
    ['filter-genre', 'filter-province', 'filter-type'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.querySelectorAll('.pill-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.range === '7')
    );
    renderLedger();
  });
}

// ─────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────
async function init() {
  renderDates();
  await loadData();

  // Show or hide demo banner
  const notice = document.getElementById('sample-notice');
  if (notice) notice.style.display = usingDemo ? 'flex' : 'none';

  renderStats();
  renderDropdowns();
  renderCharts();
  renderLedger();
  bindEvents();
}

document.addEventListener('DOMContentLoaded', init);
