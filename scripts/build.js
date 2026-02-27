‘use strict’;

const axios     = require(‘axios’);
const puppeteer = require(‘puppeteer’);
const fs        = require(‘fs’);
const path      = require(‘path’);

// ── CONFIG ────────────────────────────────────────────
const DATA_DIR     = path.resolve(__dirname, ‘../data’);
const RELEASES_OUT = path.join(DATA_DIR, ‘releases.json’);
const TALLY_OUT    = path.join(DATA_DIR, ‘tally.json’);
const DAYS_BACK    = 30;
const MB_DELAY_MS  = 1200;  // MusicBrainz rate limit: 1 req/sec
const MB_MAX       = 200;   // cap total MB releases to avoid hour-long runs

const MB_USER_AGENT =
process.env.MB_USER_AGENT ||
‘CanadianMusicLedger/1.0.0 (https://github.com/YOUR_USERNAME/canadian-music-ledger; your@email.com)’;

// ── GENRE MAP ─────────────────────────────────────────
const GENRE_MAP = {
‘hip hop’:‘Hip-Hop’,‘hip-hop’:‘Hip-Hop’,‘rap’:‘Hip-Hop’,‘trap’:‘Hip-Hop’,
‘boom bap’:‘Hip-Hop’,‘drill’:‘Hip-Hop’,‘conscious rap’:‘Hip-Hop’,
‘alternative hip hop’:‘Hip-Hop’,‘underground rap’:‘Hip-Hop’,
‘house’:‘Electronic’,‘techno’:‘Electronic’,‘ambient’:‘Electronic’,
‘edm’:‘Electronic’,‘electronic’:‘Electronic’,‘electronica’:‘Electronic’,
‘synth-pop’:‘Electronic’,‘synthpop’:‘Electronic’,‘synthwave’:‘Electronic’,
‘drum and bass’:‘Electronic’,‘dubstep’:‘Electronic’,‘idm’:‘Electronic’,
‘downtempo’:‘Electronic’,‘chillwave’:‘Electronic’,‘lo-fi’:‘Electronic’,
‘vaporwave’:‘Electronic’,‘hyperpop’:‘Electronic’,‘glitch’:‘Electronic’,
‘rock’:‘Rock’,‘indie rock’:‘Rock’,‘alternative rock’:‘Rock’,‘shoegaze’:‘Rock’,
‘post-rock’:‘Rock’,‘hard rock’:‘Rock’,‘garage rock’:‘Rock’,‘math rock’:‘Rock’,
‘psychedelic rock’:‘Rock’,‘prog rock’:‘Rock’,‘noise rock’:‘Rock’,
‘metal’:‘Metal’,‘heavy metal’:‘Metal’,‘death metal’:‘Metal’,‘black metal’:‘Metal’,
‘doom metal’:‘Metal’,‘metalcore’:‘Metal’,‘thrash metal’:‘Metal’,
‘punk’:‘Punk’,‘punk rock’:‘Punk’,‘hardcore’:‘Punk’,‘post-punk’:‘Punk’,
‘emo’:‘Punk’,‘pop punk’:‘Punk’,‘hardcore punk’:‘Punk’,
‘pop’:‘Pop’,‘indie pop’:‘Pop’,‘chamber pop’:‘Pop’,‘art pop’:‘Pop’,
‘electropop’:‘Pop’,‘bedroom pop’:‘Pop’,‘dream pop’:‘Pop’,
‘folk’:‘Folk’,‘indie folk’:‘Folk’,‘singer-songwriter’:‘Folk’,‘acoustic’:‘Folk’,
‘freak folk’:‘Folk’,‘contemporary folk’:‘Folk’,‘folk rock’:‘Folk’,
‘country’:‘Country’,‘alt-country’:‘Country’,‘americana’:‘Country’,
‘bluegrass’:‘Country’,‘outlaw country’:‘Country’,
‘jazz’:‘Jazz’,‘free jazz’:‘Jazz’,‘jazz fusion’:‘Jazz’,‘acid jazz’:‘Jazz’,
‘bebop’:‘Jazz’,‘nu jazz’:‘Jazz’,‘contemporary jazz’:‘Jazz’,
‘blues’:‘Blues’,‘electric blues’:‘Blues’,‘blues rock’:‘Blues’,
‘classical’:‘Classical’,‘contemporary classical’:‘Classical’,‘orchestral’:‘Classical’,
‘experimental’:‘Experimental’,‘avant-garde’:‘Experimental’,‘noise’:‘Experimental’,
‘drone’:‘Experimental’,‘improv’:‘Experimental’,‘minimalism’:‘Experimental’,
‘r&b’:‘R&B / Soul’,‘rnb’:‘R&B / Soul’,‘soul’:‘R&B / Soul’,‘neo soul’:‘R&B / Soul’,
‘funk’:‘R&B / Soul’,‘gospel’:‘R&B / Soul’,
‘reggae’:‘Reggae’,‘dub’:‘Reggae’,‘dancehall’:‘Reggae’,‘ska’:‘Reggae’,
‘world’:‘World’,‘world music’:‘World’,‘afrobeat’:‘World’,‘latin’:‘World’,
‘cumbia’:‘World’,‘traditional’:‘World’,‘indigenous’:‘World’,‘afropop’:‘World’,
};

// ── CITY -> PROVINCE ──────────────────────────────────
const CITY_TO_PROV = {
‘toronto’:‘ON’,‘hamilton’:‘ON’,‘ottawa’:‘ON’,‘london’:‘ON’,‘kingston’:‘ON’,
‘windsor’:‘ON’,‘brampton’:‘ON’,‘mississauga’:‘ON’,‘barrie’:‘ON’,‘guelph’:‘ON’,
‘kitchener’:‘ON’,‘waterloo’:‘ON’,‘sudbury’:‘ON’,‘thunder bay’:‘ON’,‘ontario’:‘ON’,
‘montreal’:‘QC’,‘quebec’:‘QC’,‘laval’:‘QC’,‘sherbrooke’:‘QC’,‘gatineau’:‘QC’,
‘trois-rivieres’:‘QC’,‘saguenay’:‘QC’,‘rimouski’:‘QC’,‘quebec city’:‘QC’,
‘vancouver’:‘BC’,‘victoria’:‘BC’,‘kelowna’:‘BC’,‘surrey’:‘BC’,‘burnaby’:‘BC’,
‘abbotsford’:‘BC’,‘kamloops’:‘BC’,‘nanaimo’:‘BC’,‘british columbia’:‘BC’,
‘calgary’:‘AB’,‘edmonton’:‘AB’,‘red deer’:‘AB’,‘lethbridge’:‘AB’,‘alberta’:‘AB’,
‘saskatoon’:‘SK’,‘regina’:‘SK’,‘saskatchewan’:‘SK’,‘moose jaw’:‘SK’,
‘winnipeg’:‘MB’,‘brandon’:‘MB’,‘manitoba’:‘MB’,
‘halifax’:‘NS’,‘dartmouth’:‘NS’,‘nova scotia’:‘NS’,‘cape breton’:‘NS’,
‘saint john’:‘NB’,‘moncton’:‘NB’,‘fredericton’:‘NB’,‘new brunswick’:‘NB’,
“st. john’s”:‘NL’,‘corner brook’:‘NL’,‘newfoundland’:‘NL’,
‘charlottetown’:‘PEI’,‘prince edward island’:‘PEI’,
‘whitehorse’:‘YT’,‘yukon’:‘YT’,
‘yellowknife’:‘NT’,‘northwest territories’:‘NT’,
‘iqaluit’:‘NU’,‘nunavut’:‘NU’,
};

const PROV_NAMES = {
ON:‘Ontario’,QC:‘Quebec’,BC:‘British Columbia’,AB:‘Alberta’,
SK:‘Saskatchewan’,MB:‘Manitoba’,NS:‘Nova Scotia’,NB:‘New Brunswick’,
NL:‘Newfoundland and Labrador’,PEI:‘Prince Edward Island’,
YT:‘Yukon’,NT:‘Northwest Territories’,NU:‘Nunavut’,
};

// ── BANDCAMP TAGS ─────────────────────────────────────
// Reduced to 5 most productive tags to cut Puppeteer time
const BANDCAMP_TAGS = [
{ tag: ‘canada’,    city: ‘’,          province: ‘’ },
{ tag: ‘toronto’,   city: ‘Toronto’,   province: ‘ON’ },
{ tag: ‘montreal’,  city: ‘Montreal’,  province: ‘QC’ },
{ tag: ‘vancouver’, city: ‘Vancouver’, province: ‘BC’ },
{ tag: ‘ottawa’,    city: ‘Ottawa’,    province: ‘ON’ },
];

// ── UTILS ─────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function isoDate(daysAgo = 0) {
const d = new Date();
d.setDate(d.getDate() - daysAgo);
return d.toISOString().split(‘T’)[0];
}

function normalizeGenre(raw) {
if (!raw) return ‘Other’;
return GENRE_MAP[raw.toLowerCase().trim()] || ‘Other’;
}

function inferProvince(city) {
if (!city) return ‘’;
const c = city.toLowerCase().trim();
if (CITY_TO_PROV[c]) return CITY_TO_PROV[c];
for (const [key, prov] of Object.entries(CITY_TO_PROV)) {
if (c.includes(key)) return prov;
}
return ‘’;
}

function dedupeKey(artist, title) {
return [artist, title]
.map(s => (s || ‘’).toLowerCase().replace(/\s+/g, ’ ‘).trim())
.join(’||’);
}

function ensureDataDir() {
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── MUSICBRAINZ ───────────────────────────────────────
// NOTE: We skip the per-artist area lookup that was causing
// hour-long runs. Province is inferred from city name only.
async function fetchAllMusicBrainz() {
console.log(’\nFetching from MusicBrainz…’);
const releases = [];
let offset = 0;
let total  = null;
const from  = isoDate(DAYS_BACK);
const today = isoDate(0);

try {
do {
console.log(’  MB offset ’ + offset);
const resp = await axios.get(‘https://musicbrainz.org/ws/2/release’, {
params: {
query: ‘country:CA AND date:[’ + from + ’ TO ’ + today + ‘]’,
limit: 100,
offset,
fmt: ‘json’,
},
headers: { ‘User-Agent’: MB_USER_AGENT },
timeout: 20000,
});

```
  const data  = resp.data;
  if (total === null) total = Math.min(data.count || 0, MB_MAX);
  const batch = data.releases || [];
  if (!batch.length) break;

  for (const rel of batch) {
    try {
      const credits    = rel['artist-credit'] || [];
      const artistName = credits
        .map(ac => (typeof ac === 'string' ? ac : ac?.artist?.name || ''))
        .join('');
      const label = (rel['label-info'] || [])[0]?.label?.name || '';
      const tags  = (rel.tags || []).map(t => t.name);

      // Infer province from release area or label city (best effort without extra API call)
      const areaName = rel?.['release-events']?.[0]?.area?.name || '';
      const province = inferProvince(areaName);

      releases.push({
        artist:          artistName,
        artist_country:  'CA',
        artist_city:     areaName,
        artist_province: province,
        release_title:   rel.title || '',
        release_type:    rel['release-group']?.['primary-type'] || 'Unknown',
        release_date:    rel.date || '',
        primary_genre:   normalizeGenre(tags[0] || ''),
        subgenres:       tags.slice(1).map(normalizeGenre).filter(g => g !== 'Other').slice(0, 3),
        platforms:       ['MusicBrainz'],
        label,
        independent:     !label,
        source_url:      'https://musicbrainz.org/release/' + rel.id,
        date_added:      isoDate(0),
      });
    } catch (e) {
      console.warn('  skipping MB release: ' + e.message);
    }
  }

  offset += batch.length;
  if (offset < total) await sleep(MB_DELAY_MS);

} while (offset < total);
```

} catch (err) {
console.error(’MusicBrainz error: ’ + err.message);
}

console.log(’  MB done: ’ + releases.length + ’ releases’);
return releases;
}

// ── BANDCAMP ──────────────────────────────────────────
// Uses domcontentloaded (not networkidle2) + hard 20s timeout
// so Bandcamp cannot hang the process indefinitely.
async function scrapeBandcampTag(page, tagObj) {
const { tag, city, province } = tagObj;
const url = ‘https://bandcamp.com/tag/’ + encodeURIComponent(tag) + ‘?sort_field=date’;
console.log(’  BC tag: ’ + tag);
const results = [];

try {
await page.goto(url, { waitUntil: ‘domcontentloaded’, timeout: 20000 });
// Give JS a fixed window to render — no open-ended waiting
await sleep(4000);

```
const items = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('.music-grid-item').forEach(el => {
    const title  = el.querySelector('.itemtitle, .title')?.textContent?.trim() || '';
    const artist = (el.querySelector('.itemsubtext, .artist-name')?.textContent?.trim() || '').replace(/^by\s+/i, '');
    const href   = el.querySelector('a[href]')?.href || '';
    if (title || artist) out.push({ title, artist, url: href });
  });
  return out;
});

for (const item of items) {
  if (!item.title && !item.artist) continue;
  results.push({
    artist:          item.artist || 'Unknown Artist',
    artist_country:  'CA',
    artist_city:     city,
    artist_province: province,
    release_title:   item.title || 'Unknown Title',
    release_type:    'Unknown',
    release_date:    '',
    primary_genre:   normalizeGenre(tag),
    subgenres:       [],
    platforms:       ['Bandcamp'],
    label:           '',
    independent:     true,
    source_url:      item.url || ('https://bandcamp.com/tag/' + tag),
    date_added:      isoDate(0),
  });
}
console.log('    ' + results.length + ' items');
```

} catch (err) {
console.warn(’  BC tag/’ + tag + ’ failed: ’ + err.message);
}
return results;
}

async function fetchAllBandcamp() {
console.log(’\nScraping Bandcamp…’);
const browser = await puppeteer.launch({
headless: ‘new’,
executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
args: [’–no-sandbox’,’–disable-setuid-sandbox’,’–disable-dev-shm-usage’,’–disable-gpu’],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.setUserAgent(‘Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36’);

// Hard per-page timeout so a single tag can’t block everything
page.setDefaultTimeout(25000);

const all = [];
for (const tagObj of BANDCAMP_TAGS) {
const items = await scrapeBandcampTag(page, tagObj);
all.push(…items);
await sleep(2000);
}

await browser.close();
console.log(’  BC done: ’ + all.length + ’ raw items’);
return all;
}

// ── DEDUPE ────────────────────────────────────────────
function deduplicate(releases) {
const map = new Map();
for (const rel of releases) {
const key = dedupeKey(rel.artist, rel.release_title);
if (map.has(key)) {
const ex = map.get(key);
ex.platforms = […new Set([…ex.platforms, …rel.platforms])];
if (!ex.artist_province && rel.artist_province) ex.artist_province = rel.artist_province;
if (ex.primary_genre === ‘Other’ && rel.primary_genre !== ‘Other’) ex.primary_genre = rel.primary_genre;
} else {
map.set(key, { …rel });
}
}
return Array.from(map.values());
}

function filterByAge(releases) {
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - DAYS_BACK);
return releases.filter(r => {
if (!r.release_date) return true;
const d = new Date(r.release_date);
return isNaN(d) || d >= cutoff;
});
}

// ── TALLY ─────────────────────────────────────────────
function generateTally(releases) {
const now  = new Date();
const ago7 = new Date(now); ago7.setDate(now.getDate() - 7);
const ago30 = new Date(now); ago30.setDate(now.getDate() - 30);
const inWin = (r, cutoff) => {
const d = new Date(r.release_date);
return r.release_date && !isNaN(d) && d >= cutoff;
};
const last7  = releases.filter(r => inWin(r, ago7));
const last30 = releases.filter(r => inWin(r, ago30));
const byGenre = {}, byProvince = {};
for (const r of last30) {
const g = r.primary_genre || ‘Other’;
byGenre[g] = (byGenre[g] || 0) + 1;
const pn = PROV_NAMES[r.artist_province] || r.artist_province || ‘Unknown’;
byProvince[pn] = (byProvince[pn] || 0) + 1;
}
return {
generated_at:                new Date().toISOString(),
total_releases_last_7_days:  last7.length,
total_releases_last_30_days: last30.length,
by_genre:    byGenre,
by_province: byProvince,
independent_count: last30.filter(r => r.independent).length,
label_count:       last30.filter(r => !r.independent).length,
};
}

// ── MAIN ──────────────────────────────────────────────
async function main() {
console.log(‘Canadian Music Ledger - Build’);
console.log(’Looking back ’ + DAYS_BACK + ’ days from ’ + isoDate(0));
ensureDataDir();

const [mbReleases, bcReleases] = await Promise.all([
fetchAllMusicBrainz().catch(e => { console.error(’MB failed: ’ + e.message); return []; }),
fetchAllBandcamp().catch(e => { console.error(’BC failed: ’ + e.message); return []; }),
]);

const combined = […mbReleases, …bcReleases];
console.log(’\nCombined raw: ’ + combined.length);

const filtered = filterByAge(combined);
const deduped  = deduplicate(filtered);
deduped.sort((a, b) => new Date(b.release_date || ‘1970’) - new Date(a.release_date || ‘1970’));

console.log(’After dedup: ’ + deduped.length);

const tally = generateTally(deduped);
console.log(’7-day: ’ + tally.total_releases_last_7_days);
console.log(’30-day: ’ + tally.total_releases_last_30_days);

fs.writeFileSync(RELEASES_OUT, JSON.stringify(deduped, null, 2));
fs.writeFileSync(TALLY_OUT,    JSON.stringify(tally, null, 2));
console.log(’\nWritten: ’ + RELEASES_OUT);
console.log(’Written: ’ + TALLY_OUT);
console.log(‘Done.’);
}

main().catch(err => {
console.error(’Build failed: ’ + err);
process.exit(1);
});