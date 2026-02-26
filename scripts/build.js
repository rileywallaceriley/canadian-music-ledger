/**
 * Canadian Music Ledger — Build Script
 * =====================================
 * Pulls real data from:
 *   1. MusicBrainz API  (country:CA, last 30 days)
 *   2. Bandcamp tag pages via Puppeteer (headless Chrome,
 *      required because Bandcamp renders items via JS)
 *
 * Outputs:
 *   /data/releases.json
 *   /data/tally.json
 *
 * Usage:
 *   node scripts/build.js           # full build
 *   node scripts/build.js --dry-run # fetch + print, no file writes
 */

'use strict';

const axios     = require('axios');
const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');

// ─────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────

const DRY_RUN      = process.argv.includes('--dry-run');
const DATA_DIR     = path.resolve(__dirname, '../data');
const RELEASES_OUT = path.join(DATA_DIR, 'releases.json');
const TALLY_OUT    = path.join(DATA_DIR, 'tally.json');
const DAYS_BACK    = 30;

// MusicBrainz requires a meaningful User-Agent or requests get blocked
// Replace YOUR_USERNAME / your@email.com with real values
const MB_USER_AGENT =
  process.env.MB_USER_AGENT ||
  'CanadianMusicLedger/1.0.0 (https://github.com/YOUR_USERNAME/canadian-music-ledger; your@email.com)';

// Polite MB rate-limit: 1 request per second for anonymous access
const MB_DELAY_MS = 1100;

// ─────────────────────────────────────────────────────
// GENRE NORMALIZATION MAP
// ─────────────────────────────────────────────────────

const GENRE_MAP = {
  // Hip-Hop
  'hip hop':'Hip-Hop','hip-hop':'Hip-Hop','hiphop':'Hip-Hop',
  'rap':'Hip-Hop','boom bap':'Hip-Hop','trap':'Hip-Hop','drill':'Hip-Hop',
  'lo-fi hip hop':'Hip-Hop','lo fi hip hop':'Hip-Hop','lofi hip hop':'Hip-Hop',
  'conscious rap':'Hip-Hop','alternative hip hop':'Hip-Hop',
  'underground hip-hop':'Hip-Hop','underground rap':'Hip-Hop',
  'cloud rap':'Hip-Hop','phonk':'Hip-Hop',

  // Electronic
  'house':'Electronic','techno':'Electronic','deep house':'Electronic',
  'tech house':'Electronic','ambient techno':'Electronic','ambient':'Electronic',
  'edm':'Electronic','electronic':'Electronic','electronica':'Electronic',
  'synth':'Electronic','synthwave':'Electronic','synth-pop':'Electronic',
  'synthpop':'Electronic','drum and bass':'Electronic','drum & bass':'Electronic',
  'dnb':'Electronic','dubstep':'Electronic','future bass':'Electronic',
  'trance':'Electronic','chillwave':'Electronic','downtempo':'Electronic',
  'idm':'Electronic','glitch':'Electronic','lo-fi':'Electronic',
  'lofi':'Electronic','lo fi':'Electronic','vaporwave':'Electronic',
  'hyperpop':'Electronic','club':'Electronic','uk garage':'Electronic',
  'breakbeat':'Electronic','jungle':'Electronic',

  // Rock
  'rock':'Rock','indie rock':'Rock','alternative rock':'Rock','alt-rock':'Rock',
  'post-rock':'Rock','hard rock':'Rock','classic rock':'Rock','shoegaze':'Rock',
  'dream pop':'Rock','noise rock':'Rock','math rock':'Rock','garage rock':'Rock',
  'psychedelic rock':'Rock','prog rock':'Rock','progressive rock':'Rock',
  'grunge':'Rock','post-grunge':'Rock','stoner rock':'Rock','surf rock':'Rock',

  // Metal
  'metal':'Metal','heavy metal':'Metal','death metal':'Metal','black metal':'Metal',
  'doom metal':'Metal','sludge metal':'Metal','thrash metal':'Metal',
  'metalcore':'Metal','post-metal':'Metal','deathcore':'Metal','folk metal':'Metal',

  // Punk
  'punk':'Punk','punk rock':'Punk','hardcore punk':'Punk','hardcore':'Punk',
  'post-punk':'Punk','emo':'Punk','pop punk':'Punk','anarcho punk':'Punk',
  'crust punk':'Punk','skate punk':'Punk',

  // Pop
  'pop':'Pop','indie pop':'Pop','chamber pop':'Pop','baroque pop':'Pop',
  'art pop':'Pop','electropop':'Pop','bedroom pop':'Pop','jangle pop':'Pop',

  // Folk
  'folk':'Folk','indie folk':'Folk','freak folk':'Folk','anti-folk':'Folk',
  'contemporary folk':'Folk','folk rock':'Folk','singer-songwriter':'Folk',
  'singer songwriter':'Folk','acoustic':'Folk','fingerpicking':'Folk',
  'neofolk':'Folk','celtic':'Folk','appalachian':'Folk',

  // Country
  'country':'Country','alt-country':'Country','alt country':'Country',
  'americana':'Country','outlaw country':'Country','country rock':'Country',
  'bluegrass':'Country','country folk':'Country','honky tonk':'Country',

  // Jazz
  'jazz':'Jazz','free jazz':'Jazz','jazz fusion':'Jazz','acid jazz':'Jazz',
  'nu jazz':'Jazz','bebop':'Jazz','smooth jazz':'Jazz','contemporary jazz':'Jazz',
  'avant-garde jazz':'Jazz','post-bop':'Jazz','cool jazz':'Jazz',
  'latin jazz':'Jazz','modal jazz':'Jazz',

  // Blues
  'blues':'Blues','electric blues':'Blues','chicago blues':'Blues',
  'delta blues':'Blues','blues rock':'Blues','rhythm and blues':'Blues',

  // Classical & Experimental
  'classical':'Classical','contemporary classical':'Classical',
  'chamber music':'Classical','orchestral':'Classical',
  'experimental':'Experimental','avant-garde':'Experimental','noise':'Experimental',
  'sound art':'Experimental','drone':'Experimental','improv':'Experimental',
  'free improvisation':'Experimental','musique concrète':'Experimental',
  'acousmatic':'Experimental','minimalism':'Experimental',

  // R&B / Soul
  'r&b':'R&B / Soul','rnb':'R&B / Soul','soul':'R&B / Soul','neo soul':'R&B / Soul',
  'funk':'R&B / Soul','motown':'R&B / Soul','contemporary r&b':'R&B / Soul',
  'gospel':'R&B / Soul',

  // Reggae
  'reggae':'Reggae','dub':'Reggae','roots reggae':'Reggae','dancehall':'Reggae',
  'ska':'Reggae','reggaeton':'Reggae',

  // World
  'world':'World','world music':'World','afrobeat':'World','afrobeats':'World',
  'latin':'World','cumbia':'World','salsa':'World','flamenco':'World',
  'traditional':'World','indigenous':'World','first nations':'World',
  'powwow':'World','throat singing':'World','afropop':'World',
};

// ─────────────────────────────────────────────────────
// PROVINCE INFERENCE
// ─────────────────────────────────────────────────────

const CITY_TO_PROVINCE = {
  'toronto':'ON','hamilton':'ON','ottawa':'ON','london':'ON','kingston':'ON',
  'windsor':'ON','brampton':'ON','mississauga':'ON','barrie':'ON',
  'st. catharines':'ON','guelph':'ON','kitchener':'ON','waterloo':'ON',
  'sudbury':'ON','thunder bay':'ON','ontario':'ON','ajax':'ON',
  'oshawa':'ON','pickering':'ON','burlington':'ON','oakville':'ON',
  'markham':'ON','richmond hill':'ON',

  'montreal':'QC','québec':'QC','quebec':'QC','quebec city':'QC',
  'laval':'QC','longueuil':'QC','sherbrooke':'QC','gatineau':'QC',
  'trois-rivières':'QC','trois rivieres':'QC','saguenay':'QC',
  'rouyn-noranda':'QC','rimouski':'QC','sept-îles':'QC',

  'vancouver':'BC','victoria':'BC','kelowna':'BC','surrey':'BC',
  'burnaby':'BC','abbotsford':'BC','kamloops':'BC','nanaimo':'BC',
  'british columbia':'BC','prince george':'BC','chilliwack':'BC',
  'langley':'BC','richmond':'BC','delta':'BC','coquitlam':'BC',

  'calgary':'AB','edmonton':'AB','red deer':'AB','lethbridge':'AB',
  'medicine hat':'AB','alberta':'AB','grande prairie':'AB','airdrie':'AB',

  'saskatoon':'SK','regina':'SK','saskatchewan':'SK','moose jaw':'SK',
  'prince albert':'SK',

  'winnipeg':'MB','brandon':'MB','manitoba':'MB','steinbach':'MB',
  'thompson':'MB',

  'halifax':'NS','dartmouth':'NS','nova scotia':'NS','cape breton':'NS',
  'sydney':'NS','truro':'NS','new glasgow':'NS',

  'saint john':'NB','moncton':'NB','fredericton':'NB','new brunswick':'NB',
  'bathurst':'NB','miramichi':'NB',

  "st. john's":'NL',"st johns":'NL','corner brook':'NL',
  'newfoundland':'NL','labrador':'NL','gander':'NL',

  'charlottetown':'PEI','prince edward island':'PEI','pei':'PEI',
  'summerside':'PEI',

  'whitehorse':'YT','yukon':'YT',
  'yellowknife':'NT','northwest territories':'NT',
  'iqaluit':'NU','nunavut':'NU',
};

const PROVINCE_NAMES = {
  ON:'Ontario', QC:'Québec', BC:'British Columbia', AB:'Alberta',
  SK:'Saskatchewan', MB:'Manitoba', NS:'Nova Scotia', NB:'New Brunswick',
  NL:'Newfoundland & Labrador', PEI:'Prince Edward Island',
  YT:'Yukon', NT:'Northwest Territories', NU:'Nunavut',
};

// ─────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

function isoDate(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function normalizeGenre(raw) {
  if (!raw) return 'Other';
  return GENRE_MAP[raw.toLowerCase().trim()] || 'Other';
}

function inferProvince(city = '', tags = []) {
  const check = [city, ...tags].map(s => String(s).toLowerCase().trim());
  for (const c of check) {
    if (CITY_TO_PROVINCE[c]) return CITY_TO_PROVINCE[c];
    for (const [key, prov] of Object.entries(CITY_TO_PROVINCE)) {
      if (c.includes(key)) return prov;
    }
  }
  return '';
}

function dedupeKey(artist, title, date) {
  return [artist, title, date]
    .map(s => (s || '').toLowerCase().replace(/\s+/g, ' ').trim())
    .join('||');
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─────────────────────────────────────────────────────
// 1. MUSICBRAINZ API
// ─────────────────────────────────────────────────────

async function fetchMBPage(offset = 0) {
  const from  = isoDate(DAYS_BACK);
  const today = isoDate(0);
  const url   = 'https://musicbrainz.org/ws/2/release';

  const resp = await axios.get(url, {
    params: {
      query: `country:CA AND date:[${from} TO ${today}]`,
      limit: 100,
      offset,
      fmt: 'json',
    },
    headers: { 'User-Agent': MB_USER_AGENT },
    timeout: 20000,
  });
  return resp.data;
}

async function fetchMBArtistArea(mbid) {
  const url  = `https://musicbrainz.org/ws/2/artist/${mbid}`;
  const resp = await axios.get(url, {
    params: { fmt: 'json', inc: 'tags' },
    headers: { 'User-Agent': MB_USER_AGENT },
    timeout: 12000,
  });
  return resp.data;
}

async function fetchAllMusicBrainz() {
  console.log('\n📡 Fetching from MusicBrainz...');
  const releases = [];
  let offset = 0;
  let total  = null;

  try {
    do {
      console.log(`   offset ${offset}…`);
      const data  = await fetchMBPage(offset);
      if (total === null) total = data.count || 0;

      const batch = data.releases || [];
      if (!batch.length) break;

      for (const rel of batch) {
        try {
          // Label
          const labelInfo = rel['label-info'] || [];
          const label = labelInfo[0]?.label?.name || '';

          // Artist
          const credits    = rel['artist-credit'] || [];
          const artistName = credits
            .map(ac => (typeof ac === 'string' ? ac : ac?.artist?.name || ''))
            .join('');
          const artistMBID = credits[0]?.artist?.id || null;

          // Tags from release
          const relTags = (rel.tags || []).map(t => t.name);

          // Try to pull artist area + artist tags (costs an extra request)
          let artistCity     = '';
          let artistProvince = '';
          if (artistMBID) {
            try {
              await sleep(MB_DELAY_MS);
              const artist    = await fetchMBArtistArea(artistMBID);
              artistCity      = artist?.area?.name || artist?.['begin-area']?.name || '';
              const aTags     = (artist?.tags || []).map(t => t.name);
              artistProvince  = inferProvince(artistCity, [...relTags, ...aTags]);
            } catch (_) { /* artist lookup optional */ }
          }

          const allTags    = [...new Set(relTags)];
          const primGenre  = normalizeGenre(allTags[0] || '');
          const subgenres  = allTags.slice(1)
            .map(normalizeGenre)
            .filter(g => g !== 'Other')
            .slice(0, 4);

          releases.push({
            artist:          artistName,
            artist_country:  'CA',
            artist_city:     artistCity,
            artist_province: artistProvince,
            release_title:   rel.title || '',
            release_type:    rel['release-group']?.['primary-type'] || 'Unknown',
            release_date:    rel.date || '',
            primary_genre:   primGenre,
            subgenres,
            platforms:       ['MusicBrainz'],
            label,
            independent:     !label,
            source_url:      `https://musicbrainz.org/release/${rel.id}`,
            date_added:      isoDate(0),
          });
        } catch (e) {
          console.warn(`   ⚠ skipping release: ${e.message}`);
        }
      }

      offset += batch.length;
      if (offset < total) await sleep(MB_DELAY_MS);

    } while (offset < total && offset < 600); // hard cap — be polite

  } catch (err) {
    console.error(`   ✗ MusicBrainz error: ${err.message}`);
  }

  console.log(`   ✓ ${releases.length} releases from MusicBrainz`);
  return releases;
}

// ─────────────────────────────────────────────────────
// 2. BANDCAMP — PUPPETEER SCRAPER
//    Bandcamp renders items via JavaScript, so a plain
//    HTTP fetch with cheerio returns an empty shell.
//    Puppeteer launches real headless Chrome and waits
//    for the DOM to fully populate before extracting.
// ─────────────────────────────────────────────────────

const BANDCAMP_TAGS = [
  { tag: 'canada',    city: '',          province: '' },
  { tag: 'toronto',   city: 'Toronto',   province: 'ON' },
  { tag: 'montreal',  city: 'Montreal',  province: 'QC' },
  { tag: 'vancouver', city: 'Vancouver', province: 'BC' },
  { tag: 'winnipeg',  city: 'Winnipeg',  province: 'MB' },
  { tag: 'halifax',   city: 'Halifax',   province: 'NS' },
  { tag: 'edmonton',  city: 'Edmonton',  province: 'AB' },
  { tag: 'calgary',   city: 'Calgary',   province: 'AB' },
  { tag: 'ottawa',    city: 'Ottawa',    province: 'ON' },
];

async function scrapeBandcampTag(page, tagObj) {
  const { tag, city, province } = tagObj;
  const url = `https://bandcamp.com/tag/${encodeURIComponent(tag)}?sort_field=date`;
  console.log(`   🎸 bandcamp.com/tag/${tag}`);

  const results = [];

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

    // Wait for music grid items to appear (Bandcamp renders these via JS)
    await page.waitForSelector('.music-grid-item, [data-item-id]', { timeout: 15000 })
      .catch(() => console.warn(`      ⚠ no items selector found for tag/${tag}`));

    // Scroll down once to trigger any lazy-load
    await page.evaluate(() => window.scrollBy(0, 800));
    await sleep(1500);

    // Extract item data from the rendered DOM
    const items = await page.evaluate(() => {
      const results = [];

      // Primary selector: .music-grid-item cards
      document.querySelectorAll('.music-grid-item').forEach(el => {
        const titleEl  = el.querySelector('.itemtext .itemtitle, .title-container .title, .itemtitle');
        const artistEl = el.querySelector('.itemtext .itemsubtext, .artist-name, .itemsubtext');
        const linkEl   = el.querySelector('a[href]');
        const imgEl    = el.querySelector('img');

        const title  = titleEl?.textContent?.trim()  || '';
        const artist = (artistEl?.textContent?.trim() || '').replace(/^by\s+/i, '');
        const url    = linkEl?.href || '';
        const img    = imgEl?.src  || '';

        if (title || artist) results.push({ title, artist, url, img });
      });

      // Fallback: [data-item-id] elements (newer Bandcamp layouts)
      if (results.length === 0) {
        document.querySelectorAll('[data-item-id]').forEach(el => {
          const titleEl  = el.querySelector('.item-title, .title, h3');
          const artistEl = el.querySelector('.artist-name, .item-artist, h4');
          const linkEl   = el.querySelector('a');
          const title    = titleEl?.textContent?.trim() || '';
          const artist   = (artistEl?.textContent?.trim() || '').replace(/^by\s+/i, '');
          const url      = linkEl?.href || '';
          if (title || artist) results.push({ title, artist, url, img: '' });
        });
      }

      return results;
    });

    for (const item of items) {
      if (!item.title && !item.artist) continue;

      // Province/city: use the tag's known location if it's a city tag,
      // otherwise try to infer from artist name (best effort)
      const inferredProv = province || inferProvince(city, [tag]);

      results.push({
        artist:          item.artist || 'Unknown Artist',
        artist_country:  'CA',
        artist_city:     city,
        artist_province: inferredProv,
        release_title:   item.title || 'Unknown Title',
        release_type:    'Unknown',
        release_date:    '', // Bandcamp tag pages don't expose release dates in the grid
        primary_genre:   normalizeGenre(tag),
        subgenres:       [],
        platforms:       ['Bandcamp'],
        label:           '',
        independent:     true, // Bandcamp skews heavily independent
        source_url:      item.url || `https://bandcamp.com/tag/${tag}`,
        date_added:      isoDate(0),
      });
    }

    console.log(`      → ${results.length} items`);
  } catch (err) {
    console.warn(`      ✗ Failed tag/${tag}: ${err.message}`);
  }

  return results;
}

async function fetchAllBandcamp() {
  console.log('\n🎵 Scraping Bandcamp (Puppeteer)…');

  // In GitHub Actions the chrome executable is installed by puppeteer
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // required in Docker/Actions env
      '--disable-gpu',
      '--window-size=1280,900',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Expose the inferProvince function inside the page context
  await page.exposeFunction('inferProvince', inferProvince);

  const all = [];

  for (const tagObj of BANDCAMP_TAGS) {
    const items = await scrapeBandcampTag(page, tagObj);
    all.push(...items);
    await sleep(3000); // be polite between pages
  }

  await browser.close();
  console.log(`   ✓ ${all.length} raw items from Bandcamp`);
  return all;
}

// ─────────────────────────────────────────────────────
// 3. NORMALIZE & DEDUPLICATE
// ─────────────────────────────────────────────────────

function deduplicate(releases) {
  const map = new Map();
  for (const rel of releases) {
    const key = dedupeKey(rel.artist, rel.release_title, rel.release_date);
    if (map.has(key)) {
      const ex = map.get(key);
      ex.platforms = [...new Set([...ex.platforms, ...rel.platforms])];
      if (!ex.artist_city     && rel.artist_city)     ex.artist_city     = rel.artist_city;
      if (!ex.artist_province && rel.artist_province) ex.artist_province = rel.artist_province;
      if (!ex.label           && rel.label)           ex.label           = rel.label;
      if (ex.primary_genre === 'Other' && rel.primary_genre !== 'Other') ex.primary_genre = rel.primary_genre;
    } else {
      map.set(key, { ...rel });
    }
  }
  return Array.from(map.values());
}

function filterByAge(releases, days = DAYS_BACK) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return releases.filter(rel => {
    if (!rel.release_date) return true; // keep unknowns — Bandcamp often lacks dates
    const d = new Date(rel.release_date);
    return isNaN(d) || d >= cutoff;
  });
}

// ─────────────────────────────────────────────────────
// 4. TALLY GENERATOR
// ─────────────────────────────────────────────────────

function generateTally(releases) {
  const now     = new Date();
  const ago7    = new Date(now); ago7.setDate(now.getDate() - 7);
  const ago30   = new Date(now); ago30.setDate(now.getDate() - 30);

  const inWin = (rel, cutoff) => {
    const d = new Date(rel.release_date);
    return rel.release_date && !isNaN(d) && d >= cutoff;
  };

  const last7  = releases.filter(r => inWin(r, ago7));
  const last30 = releases.filter(r => inWin(r, ago30));

  const byGenre    = {};
  const byProvince = {};

  for (const r of last30) {
    const g = r.primary_genre || 'Other';
    byGenre[g] = (byGenre[g] || 0) + 1;

    const pCode = r.artist_province || 'Unknown';
    const pName = PROVINCE_NAMES[pCode] || pCode;
    byProvince[pName] = (byProvince[pName] || 0) + 1;
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

// ─────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────

async function main() {
  console.log('\n🍁 Canadian Music Ledger — Build Script');
  console.log('==========================================');
  console.log(`📅 Looking back ${DAYS_BACK} days from ${isoDate(0)}`);
  if (DRY_RUN) console.log('🧪 DRY RUN — files will NOT be written\n');

  ensureDataDir();

  // Fetch from both sources concurrently where possible
  // (Bandcamp must run sequentially through its tags, but MB and BC can start together)
  const [mbReleases, bcReleases] = await Promise.all([
    fetchAllMusicBrainz().catch(err => {
      console.error('MB failed entirely:', err.message);
      return [];
    }),
    fetchAllBandcamp().catch(err => {
      console.error('Bandcamp failed entirely:', err.message);
      return [];
    }),
  ]);

  // Combine
  const combined = [...mbReleases, ...bcReleases];
  console.log(`\n🔀 Combined raw: ${combined.length}`);

  // Filter to last 30 days
  const filtered = filterByAge(combined, DAYS_BACK);
  console.log(`📅 After date filter: ${filtered.length}`);

  // Deduplicate
  const deduped = deduplicate(filtered);
  console.log(`♻️  After dedup: ${deduped.length} unique releases`);

  // Sort by date descending
  deduped.sort((a, b) => {
    const da = new Date(a.release_date || '1970-01-01');
    const db = new Date(b.release_date || '1970-01-01');
    return db - da;
  });

  // Tally
  const tally = generateTally(deduped);

  console.log(`\n📊 Tally:`);
  console.log(`   7-day:       ${tally.total_releases_last_7_days}`);
  console.log(`   30-day:      ${tally.total_releases_last_30_days}`);
  console.log(`   Independent: ${tally.independent_count}`);
  console.log(`   On a label:  ${tally.label_count}`);
  console.log(`   Genres:      ${Object.keys(tally.by_genre).join(', ')}`);
  console.log(`   Provinces:   ${Object.keys(tally.by_province).join(', ')}`);

  if (DRY_RUN) {
    console.log('\n🧪 Sample output (first 3):');
    console.log(JSON.stringify(deduped.slice(0, 3), null, 2));
    console.log('\n🧪 Tally:');
    console.log(JSON.stringify(tally, null, 2));
  } else {
    fs.writeFileSync(RELEASES_OUT, JSON.stringify(deduped, null, 2));
    fs.writeFileSync(TALLY_OUT,    JSON.stringify(tally, null, 2));
    console.log(`\n✅ Written → ${RELEASES_OUT}`);
    console.log(`✅ Written → ${TALLY_OUT}`);
  }

  console.log('\n🍁 Done.\n');
}

main().catch(err => {
  console.error('\n💥 Build failed:', err);
  process.exit(1);
});
