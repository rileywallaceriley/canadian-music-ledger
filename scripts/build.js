'use strict';

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

// ── CONFIG ────────────────────────────────────────────
const DATA_DIR     = path.resolve(__dirname, '../data');
const RELEASES_OUT = path.join(DATA_DIR, 'releases.json');
const TALLY_OUT    = path.join(DATA_DIR, 'tally.json');
const DAYS_BACK    = 60;
const MB_DELAY_MS  = 1200;
const MB_MAX       = 500;

const MB_USER_AGENT =
  process.env.MB_USER_AGENT ||
  'CanadianMusicLedger/1.0.0 (https://github.com/YOUR_USERNAME/canadian-music-ledger; your@email.com)';

const LASTFM_KEY = process.env.LASTFM_API_KEY || '';

// ── NON-CANADIAN ARTIST BLOCKLIST ─────────────────────
// Artists that keep appearing due to Canadian release editions in MB
const ARTIST_BLOCKLIST = new Set([
  'foo fighters','the cure','mumford & sons','nofx','karnivool',
  'scott buckley','the album leaf','andrew bird','denez prigent',
  'fakear','sam sauvage','arif murakami',
]);

// ── GENRE MAP ─────────────────────────────────────────
const GENRE_MAP = {
  'hip hop':'Hip-Hop','hip-hop':'Hip-Hop','rap':'Hip-Hop','trap':'Hip-Hop',
  'boom bap':'Hip-Hop','drill':'Hip-Hop','conscious rap':'Hip-Hop',
  'alternative hip hop':'Hip-Hop','underground rap':'Hip-Hop','lo-fi hip hop':'Hip-Hop',
  'grime':'Hip-Hop','cloud rap':'Hip-Hop','gangsta rap':'Hip-Hop',
  'house':'Electronic','techno':'Electronic','ambient':'Electronic',
  'edm':'Electronic','electronic':'Electronic','electronica':'Electronic',
  'synth-pop':'Electronic','synthwave':'Electronic','drum and bass':'Electronic',
  'dubstep':'Electronic','idm':'Electronic','downtempo':'Electronic',
  'chillwave':'Electronic','lo-fi':'Electronic','vaporwave':'Electronic',
  'hyperpop':'Electronic','glitch':'Electronic','uk garage':'Electronic',
  'trance':'Electronic','electro':'Electronic','minimal techno':'Electronic',
  'rock':'Rock','indie rock':'Rock','alternative rock':'Rock','shoegaze':'Rock',
  'post-rock':'Rock','hard rock':'Rock','garage rock':'Rock','math rock':'Rock',
  'psychedelic rock':'Rock','prog rock':'Rock','noise rock':'Rock','dream pop':'Rock',
  'grunge':'Rock','new wave':'Rock','post-grunge':'Rock',
  'metal':'Metal','heavy metal':'Metal','death metal':'Metal','black metal':'Metal',
  'doom metal':'Metal','metalcore':'Metal','thrash metal':'Metal','sludge metal':'Metal',
  'punk':'Punk','punk rock':'Punk','hardcore':'Punk','post-punk':'Punk',
  'emo':'Punk','pop punk':'Punk','hardcore punk':'Punk','skate punk':'Punk',
  'pop':'Pop','indie pop':'Pop','chamber pop':'Pop','art pop':'Pop',
  'electropop':'Pop','bedroom pop':'Pop','baroque pop':'Pop','bubblegum pop':'Pop',
  'folk':'Folk','indie folk':'Folk','singer-songwriter':'Folk','acoustic':'Folk',
  'freak folk':'Folk','contemporary folk':'Folk','folk rock':'Folk','neofolk':'Folk',
  'country':'Country','alt-country':'Country','americana':'Country',
  'bluegrass':'Country','outlaw country':'Country','country rock':'Country',
  'jazz':'Jazz','free jazz':'Jazz','jazz fusion':'Jazz','acid jazz':'Jazz',
  'bebop':'Jazz','nu jazz':'Jazz','contemporary jazz':'Jazz','latin jazz':'Jazz',
  'blues':'Blues','electric blues':'Blues','blues rock':'Blues','chicago blues':'Blues',
  'classical':'Classical','contemporary classical':'Classical','orchestral':'Classical',
  'chamber music':'Classical','minimalism':'Classical','opera':'Classical',
  'experimental':'Experimental','avant-garde':'Experimental','noise':'Experimental',
  'drone':'Experimental','improv':'Experimental','sound art':'Experimental',
  'r&b':'R&B / Soul','rnb':'R&B / Soul','soul':'R&B / Soul','neo soul':'R&B / Soul',
  'funk':'R&B / Soul','gospel':'R&B / Soul','contemporary r&b':'R&B / Soul',
  'reggae':'Reggae','dub':'Reggae','dancehall':'Reggae','ska':'Reggae',
  'world':'World','world music':'World','afrobeat':'World','latin':'World',
  'cumbia':'World','traditional':'World','indigenous':'World','afropop':'World',
  'throat singing':'World','powwow':'World','first nations':'World',
  'celtic':'World','francophone':'World',
};

// ── CITY -> PROVINCE ──────────────────────────────────
const CITY_TO_PROV = {
  'toronto':'ON','hamilton':'ON','ottawa':'ON','london':'ON','kingston':'ON',
  'windsor':'ON','brampton':'ON','mississauga':'ON','barrie':'ON','guelph':'ON',
  'kitchener':'ON','waterloo':'ON','sudbury':'ON','thunder bay':'ON','ontario':'ON',
  'oshawa':'ON','markham':'ON','oakville':'ON','burlington':'ON','st. catharines':'ON',
  'montreal':'QC','quebec':'QC','laval':'QC','sherbrooke':'QC','gatineau':'QC',
  'trois-rivieres':'QC','saguenay':'QC','quebec city':'QC','longueuil':'QC',
  'rimouski':'QC','rouyn-noranda':'QC','sept-iles':'QC',
  'vancouver':'BC','victoria':'BC','kelowna':'BC','surrey':'BC','burnaby':'BC',
  'abbotsford':'BC','kamloops':'BC','nanaimo':'BC','british columbia':'BC',
  'prince george':'BC','chilliwack':'BC','langley':'BC','richmond':'BC','trail':'BC',
  'calgary':'AB','edmonton':'AB','red deer':'AB','lethbridge':'AB','alberta':'AB',
  'grande prairie':'AB','airdrie':'AB','medicine hat':'AB','banff':'AB',
  'saskatoon':'SK','regina':'SK','saskatchewan':'SK','moose jaw':'SK','prince albert':'SK',
  'winnipeg':'MB','brandon':'MB','manitoba':'MB','steinbach':'MB','thompson':'MB',
  'halifax':'NS','dartmouth':'NS','nova scotia':'NS','cape breton':'NS','truro':'NS',
  'saint john':'NB','moncton':'NB','fredericton':'NB','new brunswick':'NB','bathurst':'NB',
  "st. john's":'NL','corner brook':'NL','newfoundland':'NL','labrador city':'NL',
  'charlottetown':'PEI','prince edward island':'PEI','summerside':'PEI',
  'whitehorse':'YT','yukon':'YT',
  'yellowknife':'NT','northwest territories':'NT',
  'iqaluit':'NU','nunavut':'NU',
};

const PROV_NAMES = {
  ON:'Ontario', QC:'Quebec', BC:'British Columbia', AB:'Alberta',
  SK:'Saskatchewan', MB:'Manitoba', NS:'Nova Scotia', NB:'New Brunswick',
  NL:'Newfoundland and Labrador', PEI:'Prince Edward Island',
  YT:'Yukon', NT:'Northwest Territories', NU:'Nunavut',
};

// ── UTILS ─────────────────────────────────────────────
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

function inferProvince(city) {
  if (!city) return '';
  const c = city.toLowerCase().trim();
  if (CITY_TO_PROV[c]) return CITY_TO_PROV[c];
  for (const [key, prov] of Object.entries(CITY_TO_PROV)) {
    if (c.includes(key)) return prov;
  }
  return '';
}

function isBlocklisted(artistName) {
  return ARTIST_BLOCKLIST.has((artistName || '').toLowerCase().trim());
}

function isIndependent(label) {
  if (!label) return true;
  const l = label.toLowerCase().trim();
  return l === '' || l === '[no label]' || l === 'self-released' || l === 'independent';
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function unixToISO(ts) {
  if (!ts) return '';
  return new Date(Number(ts) * 1000).toISOString().split('T')[0];
}

// ── 1. MUSICBRAINZ ────────────────────────────────────
async function fetchAllMusicBrainz() {
  console.log('\nFetching MusicBrainz (artistcountry:CA)...');
  const releases = [];
  let offset = 0;
  let total  = null;
  const from  = isoDate(DAYS_BACK);
  const today = isoDate(0);

  try {
    do {
      console.log('  MB offset ' + offset);
      const resp = await axios.get('https://musicbrainz.org/ws/2/release', {
        params: {
          query: 'artistcountry:CA AND date:[' + from + ' TO ' + today + ']',
          limit: 100,
          offset,
          fmt: 'json',
        },
        headers: { 'User-Agent': MB_USER_AGENT },
        timeout: 20000,
      });

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

          if (isBlocklisted(artistName)) continue;

          const label    = (rel['label-info'] || [])[0]?.label?.name || '';
          const tags     = (rel.tags || []).map(t => t.name);
          const rgTags   = (rel['release-group']?.tags || []).map(t => t.name);
          const allTags  = [...new Set([...tags, ...rgTags])];
          const areaName = rel?.['release-events']?.[0]?.area?.name || '';
          const province = inferProvince(areaName);

          releases.push({
            artist:          artistName,
            artist_country:  'CA',
            artist_city:     areaName !== 'Canada' ? areaName : '',
            artist_province: province,
            release_title:   rel.title || '',
            release_type:    rel['release-group']?.['primary-type'] || 'Unknown',
            release_date:    rel.date || '',
            primary_genre:   normalizeGenre(allTags[0] || ''),
            subgenres:       allTags.slice(1).map(normalizeGenre).filter(g => g !== 'Other').slice(0, 3),
            platforms:       ['MusicBrainz'],
            label,
            independent:     isIndependent(label),
            source_url:      'https://musicbrainz.org/release/' + rel.id,
            date_added:      isoDate(0),
          });
        } catch (e) {
          console.warn('  MB skip: ' + e.message);
        }
      }

      offset += batch.length;
      if (offset < total) await sleep(MB_DELAY_MS);

    } while (offset < total);

  } catch (err) {
    console.error('MB error: ' + err.message);
  }

  console.log('  MB done: ' + releases.length);
  return releases;
}

// ── 2. LAST.FM ────────────────────────────────────────
// Uses geo.getTopArtists to find Canadian artists, then
// artist.getTopAlbums to find recent releases
async function fetchLastFM() {
  if (!LASTFM_KEY) {
    console.log('\nLast.fm: no API key, skipping');
    return [];
  }
  console.log('\nFetching Last.fm Canadian artists...');
  const releases = [];
  const seen = new Set();

  try {
    // Get top Canadian artists from Last.fm
    const artistResp = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: {
        method: 'geo.gettopartists',
        country: 'Canada',
        limit: 100,
        api_key: LASTFM_KEY,
        format: 'json',
      },
      timeout: 15000,
    });

    const artists = artistResp.data?.topartists?.artist || [];
    console.log('  Last.fm artists: ' + artists.length);

    // For each artist get their recent releases
    for (const artist of artists.slice(0, 50)) {
      if (isBlocklisted(artist.name)) continue;
      try {
        await sleep(250); // Last.fm allows 5 req/sec
        const albumResp = await axios.get('https://ws.audioscrobbler.com/2.0/', {
          params: {
            method: 'artist.gettopalbums',
            artist: artist.name,
            limit: 5,
            api_key: LASTFM_KEY,
            format: 'json',
          },
          timeout: 10000,
        });

        const albums = albumResp.data?.topalbums?.album || [];
        for (const album of albums) {
          if (!album.name || album.name === '(null)') continue;
          const key = (artist.name + '||' + album.name).toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);

          releases.push({
            artist:          artist.name,
            artist_country:  'CA',
            artist_city:     '',
            artist_province: '',
            release_title:   album.name,
            release_type:    'Album',
            release_date:    '',
            primary_genre:   'Other',
            subgenres:       [],
            platforms:       ['Last.fm'],
            label:           '',
            independent:     true,
            source_url:      album.url || '',
            date_added:      isoDate(0),
          });
        }
      } catch (e) {
        console.warn('  Last.fm artist skip: ' + e.message);
      }
    }
  } catch (err) {
    console.error('Last.fm error: ' + err.message);
  }

  console.log('  Last.fm done: ' + releases.length);
  return releases;
}

// ── 3. ITUNES CANADA RSS ──────────────────────────────
async function fetchiTunes() {
  console.log('\nFetching iTunes Canada new releases...');
  const releases = [];

  try {
    // iTunes RSS feeds — top new releases in Canada
    const feeds = [
      'https://itunes.apple.com/ca/rss/topalbums/limit=100/json',
      'https://itunes.apple.com/ca/rss/newmusic/limit=100/json',
    ];

    for (const feedUrl of feeds) {
      try {
        const resp = await axios.get(feedUrl, { timeout: 15000 });
        const entries = resp.data?.feed?.entry || [];
        console.log('  iTunes feed entries: ' + entries.length);

        for (const entry of entries) {
          const title    = entry?.['im:name']?.label || '';
          const artist   = entry?.['im:artist']?.label || '';
          const genre    = entry?.category?.attributes?.label || '';
          const url      = entry?.link?.attributes?.href || '';
          const dateStr  = entry?.['im:releaseDate']?.label || '';
          const releaseDate = dateStr ? dateStr.split('T')[0] : '';

          if (!title || !artist) continue;
          if (isBlocklisted(artist)) continue;

          // iTunes Canada RSS includes international artists too
          // We can't perfectly filter, but we flag for dedup
          releases.push({
            artist:          artist,
            artist_country:  'CA',
            artist_city:     '',
            artist_province: '',
            release_title:   title,
            release_type:    'Album',
            release_date:    releaseDate,
            primary_genre:   normalizeGenre(genre),
            subgenres:       [],
            platforms:       ['iTunes'],
            label:           '',
            independent:     false,
            source_url:      url,
            date_added:      isoDate(0),
          });
        }
      } catch (e) {
        console.warn('  iTunes feed error: ' + e.message);
      }
      await sleep(500);
    }
  } catch (err) {
    console.error('iTunes error: ' + err.message);
  }

  console.log('  iTunes done: ' + releases.length);
  return releases;
}

// ── DEDUPE & MERGE ────────────────────────────────────
function deduplicate(releases) {
  const map = new Map();
  for (const rel of releases) {
    const key = [(rel.artist || ''), (rel.release_title || '')]
      .map(s => s.toLowerCase().replace(/\s+/g, ' ').trim())
      .join('||');

    if (map.has(key)) {
      const ex = map.get(key);
      ex.platforms = [...new Set([...ex.platforms, ...rel.platforms])];
      if (!ex.artist_province && rel.artist_province) ex.artist_province = rel.artist_province;
      if (ex.primary_genre === 'Other' && rel.primary_genre !== 'Other') ex.primary_genre = rel.primary_genre;
      if (!ex.release_date && rel.release_date) ex.release_date = rel.release_date;
    } else {
      map.set(key, { ...rel });
    }
  }
  return Array.from(map.values());
}

function filterByAge(releases) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_BACK);
  return releases.filter(r => {
    if (!r.release_date) return true; // keep undated entries
    const d = new Date(r.release_date);
    return isNaN(d) || d >= cutoff;
  });
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
    const g  = r.primary_genre || 'Other';
    byGenre[g] = (byGenre[g] || 0) + 1;
    const pn = PROV_NAMES[r.artist_province] || r.artist_province || 'Unknown';
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
  console.log('Canadian Music Ledger - Build');
  console.log('Lookback: ' + DAYS_BACK + ' days from ' + isoDate(0));
  ensureDataDir();

  const [mbReleases, lfReleases, itReleases] = await Promise.all([
    fetchAllMusicBrainz().catch(e => { console.error('MB failed: ' + e.message); return []; }),
    fetchLastFM().catch(e => { console.error('LFM failed: ' + e.message); return []; }),
    fetchiTunes().catch(e => { console.error('iTunes failed: ' + e.message); return []; }),
  ]);

  const combined = [...mbReleases, ...lfReleases, ...itReleases];
  console.log('\nCombined raw: ' + combined.length);

  const filtered = filterByAge(combined);
  const deduped  = deduplicate(filtered);
  deduped.sort((a, b) =>
    new Date(b.release_date || '1970') - new Date(a.release_date || '1970')
  );

  console.log('After dedup: ' + deduped.length);

  const tally = generateTally(deduped);
  console.log('7-day: '  + tally.total_releases_last_7_days);
  console.log('30-day: ' + tally.total_releases_last_30_days);

  fs.writeFileSync(RELEASES_OUT, JSON.stringify(deduped, null, 2));
  fs.writeFileSync(TALLY_OUT,    JSON.stringify(tally, null, 2));
  console.log('\nDone. ' + deduped.length + ' releases written.');
}

main().catch(err => {
  console.error('Build failed: ' + err);
  process.exit(1);
});
