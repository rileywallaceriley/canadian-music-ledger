‘use strict’;

const axios = require(‘axios’);
const fs    = require(‘fs’);
const path  = require(‘path’);

// ── CONFIG ────────────────────────────────────────────
const DATA_DIR     = path.resolve(__dirname, ‘../data’);
const RELEASES_OUT = path.join(DATA_DIR, ‘releases.json’);
const TALLY_OUT    = path.join(DATA_DIR, ‘tally.json’);
const DAYS_BACK    = 30;
const MB_DELAY_MS  = 1200;
const MB_MAX       = 300;

const MB_USER_AGENT =
process.env.MB_USER_AGENT ||
‘CanadianMusicLedger/1.0.0 (https://github.com/YOUR_USERNAME/canadian-music-ledger; your@email.com)’;

// ── GENRE MAP ─────────────────────────────────────────
const GENRE_MAP = {
‘hip hop’:‘Hip-Hop’,‘hip-hop’:‘Hip-Hop’,‘rap’:‘Hip-Hop’,‘trap’:‘Hip-Hop’,
‘boom bap’:‘Hip-Hop’,‘drill’:‘Hip-Hop’,‘conscious rap’:‘Hip-Hop’,
‘alternative hip hop’:‘Hip-Hop’,‘underground rap’:‘Hip-Hop’,‘lo-fi hip hop’:‘Hip-Hop’,
‘house’:‘Electronic’,‘techno’:‘Electronic’,‘ambient’:‘Electronic’,
‘edm’:‘Electronic’,‘electronic’:‘Electronic’,‘electronica’:‘Electronic’,
‘synth-pop’:‘Electronic’,‘synthwave’:‘Electronic’,‘drum and bass’:‘Electronic’,
‘dubstep’:‘Electronic’,‘idm’:‘Electronic’,‘downtempo’:‘Electronic’,
‘chillwave’:‘Electronic’,‘lo-fi’:‘Electronic’,‘vaporwave’:‘Electronic’,
‘hyperpop’:‘Electronic’,‘glitch’:‘Electronic’,‘uk garage’:‘Electronic’,
‘rock’:‘Rock’,‘indie rock’:‘Rock’,‘alternative rock’:‘Rock’,‘shoegaze’:‘Rock’,
‘post-rock’:‘Rock’,‘hard rock’:‘Rock’,‘garage rock’:‘Rock’,‘math rock’:‘Rock’,
‘psychedelic rock’:‘Rock’,‘prog rock’:‘Rock’,‘noise rock’:‘Rock’,‘dream pop’:‘Rock’,
‘metal’:‘Metal’,‘heavy metal’:‘Metal’,‘death metal’:‘Metal’,‘black metal’:‘Metal’,
‘doom metal’:‘Metal’,‘metalcore’:‘Metal’,‘thrash metal’:‘Metal’,‘sludge metal’:‘Metal’,
‘punk’:‘Punk’,‘punk rock’:‘Punk’,‘hardcore’:‘Punk’,‘post-punk’:‘Punk’,
‘emo’:‘Punk’,‘pop punk’:‘Punk’,‘hardcore punk’:‘Punk’,
‘pop’:‘Pop’,‘indie pop’:‘Pop’,‘chamber pop’:‘Pop’,‘art pop’:‘Pop’,
‘electropop’:‘Pop’,‘bedroom pop’:‘Pop’,‘baroque pop’:‘Pop’,
‘folk’:‘Folk’,‘indie folk’:‘Folk’,‘singer-songwriter’:‘Folk’,‘acoustic’:‘Folk’,
‘freak folk’:‘Folk’,‘contemporary folk’:‘Folk’,‘folk rock’:‘Folk’,‘neofolk’:‘Folk’,
‘country’:‘Country’,‘alt-country’:‘Country’,‘americana’:‘Country’,
‘bluegrass’:‘Country’,‘outlaw country’:‘Country’,‘country rock’:‘Country’,
‘jazz’:‘Jazz’,‘free jazz’:‘Jazz’,‘jazz fusion’:‘Jazz’,‘acid jazz’:‘Jazz’,
‘bebop’:‘Jazz’,‘nu jazz’:‘Jazz’,‘contemporary jazz’:‘Jazz’,‘latin jazz’:‘Jazz’,
‘blues’:‘Blues’,‘electric blues’:‘Blues’,‘blues rock’:‘Blues’,‘chicago blues’:‘Blues’,
‘classical’:‘Classical’,‘contemporary classical’:‘Classical’,‘orchestral’:‘Classical’,
‘chamber music’:‘Classical’,‘minimalism’:‘Classical’,
‘experimental’:‘Experimental’,‘avant-garde’:‘Experimental’,‘noise’:‘Experimental’,
‘drone’:‘Experimental’,‘improv’:‘Experimental’,‘sound art’:‘Experimental’,
‘r&b’:‘R&B / Soul’,‘rnb’:‘R&B / Soul’,‘soul’:‘R&B / Soul’,‘neo soul’:‘R&B / Soul’,
‘funk’:‘R&B / Soul’,‘gospel’:‘R&B / Soul’,‘contemporary r&b’:‘R&B / Soul’,
‘reggae’:‘Reggae’,‘dub’:‘Reggae’,‘dancehall’:‘Reggae’,‘ska’:‘Reggae’,‘roots reggae’:‘Reggae’,
‘world’:‘World’,‘world music’:‘World’,‘afrobeat’:‘World’,‘latin’:‘World’,
‘cumbia’:‘World’,‘traditional’:‘World’,‘indigenous’:‘World’,‘afropop’:‘World’,
‘throat singing’:‘World’,‘powwow’:‘World’,‘first nations’:‘World’,
};

// ── CITY -> PROVINCE ──────────────────────────────────
const CITY_TO_PROV = {
‘toronto’:‘ON’,‘hamilton’:‘ON’,‘ottawa’:‘ON’,‘london’:‘ON’,‘kingston’:‘ON’,
‘windsor’:‘ON’,‘brampton’:‘ON’,‘mississauga’:‘ON’,‘barrie’:‘ON’,‘guelph’:‘ON’,
‘kitchener’:‘ON’,‘waterloo’:‘ON’,‘sudbury’:‘ON’,‘thunder bay’:‘ON’,‘ontario’:‘ON’,
‘oshawa’:‘ON’,‘markham’:‘ON’,‘oakville’:‘ON’,‘burlington’:‘ON’,
‘montreal’:‘QC’,‘quebec’:‘QC’,‘laval’:‘QC’,‘sherbrooke’:‘QC’,‘gatineau’:‘QC’,
‘trois-rivieres’:‘QC’,‘saguenay’:‘QC’,‘quebec city’:‘QC’,‘longueuil’:‘QC’,
‘rimouski’:‘QC’,‘rouyn-noranda’:‘QC’,
‘vancouver’:‘BC’,‘victoria’:‘BC’,‘kelowna’:‘BC’,‘surrey’:‘BC’,‘burnaby’:‘BC’,
‘abbotsford’:‘BC’,‘kamloops’:‘BC’,‘nanaimo’:‘BC’,‘british columbia’:‘BC’,
‘prince george’:‘BC’,‘chilliwack’:‘BC’,‘langley’:‘BC’,‘richmond’:‘BC’,
‘calgary’:‘AB’,‘edmonton’:‘AB’,‘red deer’:‘AB’,‘lethbridge’:‘AB’,‘alberta’:‘AB’,
‘grande prairie’:‘AB’,‘airdrie’:‘AB’,‘medicine hat’:‘AB’,
‘saskatoon’:‘SK’,‘regina’:‘SK’,‘saskatchewan’:‘SK’,‘moose jaw’:‘SK’,‘prince albert’:‘SK’,
‘winnipeg’:‘MB’,‘brandon’:‘MB’,‘manitoba’:‘MB’,‘steinbach’:‘MB’,
‘halifax’:‘NS’,‘dartmouth’:‘NS’,‘nova scotia’:‘NS’,‘cape breton’:‘NS’,‘truro’:‘NS’,
‘saint john’:‘NB’,‘moncton’:‘NB’,‘fredericton’:‘NB’,‘new brunswick’:‘NB’,‘bathurst’:‘NB’,
“st. john’s”:‘NL’,‘corner brook’:‘NL’,‘newfoundland’:‘NL’,‘labrador city’:‘NL’,
‘charlottetown’:‘PEI’,‘prince edward island’:‘PEI’,‘summerside’:‘PEI’,
‘whitehorse’:‘YT’,‘yukon’:‘YT’,
‘yellowknife’:‘NT’,‘northwest territories’:‘NT’,
‘iqaluit’:‘NU’,‘nunavut’:‘NU’,
};

const PROV_NAMES = {
ON:‘Ontario’, QC:‘Quebec’, BC:‘British Columbia’, AB:‘Alberta’,
SK:‘Saskatchewan’, MB:‘Manitoba’, NS:‘Nova Scotia’, NB:‘New Brunswick’,
NL:‘Newfoundland and Labrador’, PEI:‘Prince Edward Island’,
YT:‘Yukon’, NT:‘Northwest Territories’, NU:‘Nunavut’,
};

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

function ensureDataDir() {
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── MUSICBRAINZ ───────────────────────────────────────
async function fetchAllMusicBrainz() {
console.log(‘Fetching from MusicBrainz…’);
const releases = [];
let offset = 0;
let total  = null;
const from  = isoDate(DAYS_BACK);
const today = isoDate(0);

try {
do {
console.log(’  offset ’ + offset);
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
      const label    = (rel['label-info'] || [])[0]?.label?.name || '';
      const tags     = (rel.tags || []).map(t => t.name);
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
      console.warn('  skipping: ' + e.message);
    }
  }

  offset += batch.length;
  if (offset < total) await sleep(MB_DELAY_MS);

} while (offset < total);
```

} catch (err) {
console.error(’MusicBrainz error: ’ + err.message);
}

console.log(’  Done: ’ + releases.length + ’ releases’);
return releases;
}

// ── TALLY ─────────────────────────────────────────────
function generateTally(releases) {
const now   = new Date();
const ago7  = new Date(now); ago7.setDate(now.getDate() - 7);
const ago30 = new Date(now); ago30.setDate(now.getDate() - 30);

const inWin = (r, cutoff) => {
const d = new Date(r.release_date);
return r.release_date && !isNaN(d) && d >= cutoff;
};

const last7  = releases.filter(r => inWin(r, ago7));
const last30 = releases.filter(r => inWin(r, ago30));

const byGenre = {}, byProvince = {};
for (const r of last30) {
const g  = r.primary_genre || ‘Other’;
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
console.log(’Range: last ’ + DAYS_BACK + ’ days from ’ + isoDate(0));
ensureDataDir();

const releases = await fetchAllMusicBrainz();

releases.sort((a, b) =>
new Date(b.release_date || ‘1970’) - new Date(a.release_date || ‘1970’)
);

const tally = generateTally(releases);

console.log(’7-day:  ’ + tally.total_releases_last_7_days);
console.log(’30-day: ’ + tally.total_releases_last_30_days);
console.log(‘Genres: ’ + Object.keys(tally.by_genre).join(’, ’));

fs.writeFileSync(RELEASES_OUT, JSON.stringify(releases, null, 2));
fs.writeFileSync(TALLY_OUT,    JSON.stringify(tally, null, 2));

console.log(’Written: ’ + RELEASES_OUT);
console.log(’Written: ’ + TALLY_OUT);
console.log(‘Done.’);
}

main().catch(err => {
console.error(’Build failed: ’ + err);
process.exit(1);
});
