'use strict';

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

// -- CONFIG --------------------------------------------
const DATA_DIR     = path.resolve(__dirname, '../data');
const RELEASES_OUT = path.join(DATA_DIR, 'releases.json');
const TALLY_OUT    = path.join(DATA_DIR, 'tally.json');
const DAYS_BACK    = 60;
const MB_DELAY_MS  = 1300;
const ITUNES_DELAY = 250;
const BC_PAGES     = 10; // 10 pages x 48 = up to 480 Bandcamp releases

const MB_USER_AGENT =
  process.env.MB_USER_AGENT ||
  'CanadianMusicLedger/1.0.0 (https://github.com/YOUR_USERNAME/canadian-music-ledger; your@email.com)';

// -- CANADIAN ARTIST SEED LIST -------------------------
// [name, province, primaryGenre]
const CANADIAN_ARTISTS_RAW = [
  // HIP-HOP / R&B
  ['Drake','ON','Hip-Hop'],
  ['The Weeknd','ON','R&B / Soul'],
  ['PARTYNEXTDOOR','ON','R&B / Soul'],
  ['dvsn','ON','R&B / Soul'],
  ['NAV','ON','Hip-Hop'],
  ['Roy Woods','ON','R&B / Soul'],
  ['Pressa','ON','Hip-Hop'],
  ['Tory Lanez','ON','Hip-Hop'],
  ['Belly','ON','Hip-Hop'],
  ['Jazz Cartier','ON','Hip-Hop'],
  ['Haviah Mighty','ON','Hip-Hop'],
  ['Cadence Weapon','AB','Hip-Hop'],
  ['Classified','NS','Hip-Hop'],
  ['Shad','BC','Hip-Hop'],
  ['K-os','ON','Hip-Hop'],
  ['Maestro Fresh Wes','ON','Hip-Hop'],
  ['Kardinal Offishall','ON','Hip-Hop'],
  ['Swollen Members','BC','Hip-Hop'],
  ['Madchild','BC','Hip-Hop'],
  ['Merkules','BC','Hip-Hop'],
  ['Eternia','ON','Hip-Hop'],
  ['Choclair','ON','Hip-Hop'],
  ['Saukrates','ON','Hip-Hop'],
  ['Michie Mee','ON','Hip-Hop'],
  ['Daniel Caesar','ON','R&B / Soul'],
  ['Tamia','ON','R&B / Soul'],
  ['Deborah Cox','ON','R&B / Soul'],
  ['Jully Black','ON','R&B / Soul'],
  ['Glenn Lewis','BC','R&B / Soul'],
  ['Ramriddlz','ON','Hip-Hop'],
  ['Safe','ON','Hip-Hop'],
  ['Kaytranada','QC','Electronic'],
  ['Dead Obies','QC','Hip-Hop'],
  ['FouKi','QC','Hip-Hop'],
  ['Alaclair Ensemble','QC','Hip-Hop'],
  ['Soran','QC','Hip-Hop'],
  ['Koriass','QC','Hip-Hop'],
  ['Loud','QC','Hip-Hop'],
  ['Radio Radio','NB','Hip-Hop'],
  ['Buck 65','NS','Hip-Hop'],
  ['Snotty Nose Rez Kids','BC','Hip-Hop'],
  ['TOBi','ON','Hip-Hop'],
  ['Clairmont The Second','ON','Hip-Hop'],
  ['Sean Leon','ON','Hip-Hop'],
  ['Duvy','ON','Hip-Hop'],
  ['Houdini','ON','Hip-Hop'],
  ['Smiley','ON','Hip-Hop'],
  ['Lil Berete','ON','Hip-Hop'],
  ['Nate Husser','ON','Hip-Hop'],
  ['Adria Kain','ON','R&B / Soul'],
  ['Savannah Re','ON','R&B / Soul'],
  ['Ebhoni','ON','R&B / Soul'],
  ['River Tiber','ON','R&B / Soul'],
  ['Harrison','ON','R&B / Soul'],
  ['Zaki Ibrahim','ON','R&B / Soul'],
  ['Mustafa','ON','Folk'],
  ['JB The First Lady','ON','Hip-Hop'],
  ['Ay Huncho','ON','Hip-Hop'],
  ['Lexxicon','ON','Hip-Hop'],
  ['Rich Kidd','ON','Hip-Hop'],
  ['Skratch Bastid','NS','Hip-Hop'],
  ['Ghettosocks','NS','Hip-Hop'],
  ['Wordburglar','NS','Hip-Hop'],
  ['Jorun Bombay','QC','Hip-Hop'],
  ['Rymsko','QC','Hip-Hop'],
  ['Boogat','QC','Hip-Hop'],
  ['Def3','BC','Hip-Hop'],
  ['Tona','BC','Hip-Hop'],
  ['D-Pryde','BC','Hip-Hop'],
  ['Mob Bounce','AB','Hip-Hop'],
  ['Cody Coyote','SK','Hip-Hop'],
  ['Backxwash','BC','Metal'],
  ['Nilla Ali','ON','R&B / Soul'],
  ['Charmaine','ON','R&B / Soul'],
  ['Kirby','ON','R&B / Soul'],
  ['Romero','ON','R&B / Soul'],
  ['Kiya Lacey','BC','R&B / Soul'],
  ['Mindy Jones','BC','R&B / Soul'],
  ['Dylan Sinclair','ON','R&B / Soul'],
  ['Zach Zoya','QC','R&B / Soul'],
  // POP
  ['Justin Bieber','ON','Pop'],
  ['Carly Rae Jepsen','BC','Pop'],
  ['Alessia Cara','ON','Pop'],
  ['Shawn Mendes','ON','Pop'],
  ['Charlotte Cardin','QC','Pop'],
  ['Coeur de pirate','QC','Pop'],
  ['Marie-Mai','QC','Pop'],
  ['Loud Luxury','ON','Electronic'],
  ['Scott Helman','ON','Pop'],
  ['Lights','ON','Pop'],
  ['Fefe Dobson','ON','Pop'],
  ['Anjulie','ON','Pop'],
  ['Serena Ryder','ON','Pop'],
  ['Down With Webster','ON','Pop'],
  ['Marianas Trench','BC','Pop'],
  ['Walk Off the Earth','ON','Pop'],
  ['Hedley','BC','Pop'],
  ['Nelly Furtado','BC','Pop'],
  ['Alanis Morissette','ON','Rock'],
  ['Avril Lavigne','ON','Pop'],
  ['Sarah McLachlan','NS','Pop'],
  ['Celine Dion','QC','Pop'],
  ['Bryan Adams','BC','Rock'],
  ['Michael Buble','BC','Pop'],
  ['Loreena McKennitt','MB','Folk'],
  ['Ariane Moffatt','QC','Pop'],
  ['Klo Pelgag','QC','Pop'],
  ['Pierre Lapointe','QC','Pop'],
  ['Louis-Jean Cormier','QC','Pop'],
  ['Yann Perreau','QC','Pop'],
  ['Pascale Picard','QC','Pop'],
  ['Safia Nolin','QC','Folk'],
  ['Philippe B','QC','Folk'],
  ['Tire le Coyote','QC','Folk'],
  ['Philemon Cimon','QC','Folk'],
  ['Bon Enfant','QC','Folk'],
  ['Sophia Bel','QC','Pop'],
  ['Vincent Vallieres','QC','Pop'],
  ['Roch Voisine','NB','Pop'],
  ['Garou','QC','Pop'],
  ['Lisa LeBlanc','NB','Folk'],
  ['Jean Leloup','QC','Rock'],
  ['Les Cowboys Fringants','QC','Rock'],
  ['Malajube','QC','Rock'],
  ['Mes Aieux','QC','Folk'],
  ['Hubert Lenoir','QC','Rock'],
  ['Luc De Larochelliere','QC','Pop'],
  ['Jayda G','BC','Electronic'],
  ['Tate McRae','AB','Pop'],
  ['bulow','ON','Pop'],
  ['Lennon Stella','ON','Pop'],
  ['JP Saxe','ON','Pop'],
  ['bbno$','BC','Pop'],
  ['Jessie Reyez','ON','Pop'],
  ['Ruth B','AB','Pop'],
  ['DIANA','ON','Pop'],
  ['Scott Hardware','ON','Pop'],
  ['U.S. Girls','ON','Pop'],
  // ROCK / INDIE
  ['Arcade Fire','QC','Rock'],
  ['Wolf Parade','QC','Rock'],
  ['Broken Social Scene','ON','Rock'],
  ['Stars','QC','Rock'],
  ['Metric','ON','Rock'],
  ['Tegan and Sara','AB','Pop'],
  ['The New Pornographers','BC','Rock'],
  ['AC Newman','BC','Rock'],
  ['Neko Case','BC','Folk'],
  ['Japandroids','BC','Rock'],
  ['METZ','ON','Rock'],
  ['Alvvays','NS','Rock'],
  ['The Tragically Hip','ON','Rock'],
  ['Our Lady Peace','ON','Rock'],
  ['Barenaked Ladies','ON','Pop'],
  ['The Tea Party','ON','Rock'],
  ['I Mother Earth','ON','Rock'],
  ['Sloan','NS','Rock'],
  ['The Weakerthans','MB','Rock'],
  ['The Dears','QC','Rock'],
  ['Plants and Animals','QC','Rock'],
  ['Patrick Watson','QC','Folk'],
  ['Half Moon Run','QC','Folk'],
  ['Wintersleep','NS','Rock'],
  ['Joel Plaskett','NS','Rock'],
  ['Matt Mays','NS','Rock'],
  ['The Barr Brothers','QC','Folk'],
  ['Land of Talk','QC','Rock'],
  ['Sunset Rubdown','QC','Rock'],
  ['Chad VanGaalen','AB','Rock'],
  ['Preoccupations','AB','Rock'],
  ['Women','AB','Rock'],
  ['Weaves','ON','Rock'],
  ['Ought','QC','Rock'],
  ['Homeshake','QC','R&B / Soul'],
  ['Corridor','QC','Rock'],
  ['Pottery','QC','Rock'],
  ['Crack Cloud','BC','Rock'],
  ['Fake Palms','ON','Rock'],
  ['Partner','NS','Rock'],
  ['Nap Eyes','NS','Rock'],
  ['White Lung','BC','Punk'],
  ['FRIGS','ON','Rock'],
  ['Odonis Odonis','ON','Electronic'],
  ['Lido Pimienta','ON','World'],
  ['Beverly Glenn-Copeland','ON','Folk'],
  ['Absolutely Free','ON','Electronic'],
  ['Dilly Dally','ON','Rock'],
  ['PUP','ON','Punk'],
  ['Cancer Bats','ON','Metal'],
  ['Fucked Up','ON','Punk'],
  ['The Dirty Nil','ON','Rock'],
  ['Pkew Pkew Pkew','ON','Punk'],
  ['Bad Waitress','ON','Punk'],
  ['Greys','ON','Rock'],
  ['The Constantines','ON','Rock'],
  ['The Hidden Cameras','ON','Folk'],
  ['Destroyer','BC','Rock'],
  ['Viet Cong','AB','Rock'],
  ['Simple Plan','QC','Punk'],
  ['Billy Talent','ON','Punk'],
  ['Sum 41','ON','Punk'],
  ['Protest the Hero','ON','Metal'],
  ['Propagandhi','MB','Punk'],
  ['Alexisonfire','ON','Rock'],
  ['Silverstein','ON','Punk'],
  ['Moneen','ON','Punk'],
  ['The Flatliners','ON','Punk'],
  ['City and Colour','ON','Folk'],
  ['Finger Eleven','ON','Rock'],
  ['Three Days Grace','ON','Rock'],
  ['Default','BC','Rock'],
  ['Theory of a Deadman','BC','Rock'],
  ['Nickelback','AB','Rock'],
  ['Hinder','AB','Rock'],
  ['Thornley','ON','Rock'],
  ['54-40','BC','Rock'],
  ['The Pursuit of Happiness','ON','Rock'],
  ['The Lowest of the Low','ON','Rock'],
  ['Crash Vegas','ON','Rock'],
  ['Moist','BC','Rock'],
  ['Treble Charger','ON','Rock'],
  ['The Super Friendz','NS','Rock'],
  ['Eric Trip','NB','Rock'],
  ['Julie Doiron','NB','Folk'],
  ['The Inbreds','ON','Rock'],
  ['Thrush Hermit','NS','Rock'],
  ['Hayden','ON','Folk'],
  ['Ron Sexsmith','ON','Folk'],
  ['Andrew Cash','ON','Folk'],
  ['Rheostatics','ON','Rock'],
  ['The Stills','QC','Rock'],
  ['Sam Roberts','QC','Rock'],
  ['Hot Hot Heat','BC','Rock'],
  ['Matthew Good','BC','Rock'],
  ['Age of Electric','SK','Rock'],
  ['Wide Mouth Mason','SK','Rock'],
  ['The Odds','BC','Rock'],
  ['Gob','BC','Punk'],
  ['Chixdiggit','AB','Punk'],
  ['NoMeansNo','BC','Punk'],
  ['DOA','BC','Punk'],
  ['Dayglo Abortions','BC','Punk'],
  ['SNFU','AB','Punk'],
  ['Limblifter','BC','Rock'],
  ['Ducks Unlimited','ON','Folk'],
  ['Freak Heat Waves','SK','Electronic'],
  ['Fresh Snow','ON','Experimental'],
  ['Lammping','ON','Rock'],
  ['Zoon','ON','Electronic'],
  ['Moon King','ON','Electronic'],
  // METAL
  ['Voivod','QC','Metal'],
  ['Annihilator','BC','Metal'],
  ['Devin Townsend','BC','Metal'],
  ['Cryptopsy','QC','Metal'],
  ['Despised Icon','QC','Metal'],
  ['Comeback Kid','MB','Metal'],
  ['Misery Signals','MB','Metal'],
  ['Into Eternity','SK','Metal'],
  ['3 Inches of Blood','BC','Metal'],
  ['Cauldron','ON','Metal'],
  ['Woods of Ypres','ON','Metal'],
  // ELECTRONIC
  ['Caribou','ON','Electronic'],
  ['deadmau5','ON','Electronic'],
  ['Grimes','BC','Electronic'],
  ['Purity Ring','AB','Electronic'],
  ['Junior Boys','ON','Electronic'],
  ['Jacques Greene','QC','Electronic'],
  ['Ryan Hemsworth','NS','Electronic'],
  ['CFCF','QC','Electronic'],
  ['Egyptrixx','ON','Electronic'],
  ['Jessy Lanza','ON','Electronic'],
  ['Richie Hawtin','ON','Electronic'],
  ['Tiga','QC','Electronic'],
  ['Azari and III','ON','Electronic'],
  ['Project Pablo','QC','Electronic'],
  ['Sandro Perri','ON','Electronic'],
  ['Marie Davidson','QC','Electronic'],
  ['Milk and Bone','QC','Electronic'],
  ['Men I Trust','QC','Electronic'],
  ['Ouri','QC','Electronic'],
  ['Pelada','QC','Electronic'],
  ['Freak Heat Waves','SK','Electronic'],
  ['Special Patrol','ON','Electronic'],
  ['A Tribe Called Red','ON','Electronic'],
  ['dj NDN','AB','Electronic'],
  ['Julianna Barwick','ON','Electronic'],
  // COUNTRY / ROOTS / FOLK
  ['Shania Twain','ON','Country'],
  ['Paul Brandt','AB','Country'],
  ['Dean Brody','BC','Country'],
  ['Corb Lund','AB','Country'],
  ['Tim Hicks','ON','Country'],
  ['Tenille Townes','AB','Country'],
  ['Gord Downie','ON','Rock'],
  ['The Sadies','ON','Country'],
  ['Colter Wall','SK','Country'],
  ['Old Man Luedecke','NS','Folk'],
  ['Donovan Woods','ON','Folk'],
  ['Whitehorse','ON','Country'],
  ['Bruce Cockburn','ON','Folk'],
  ['Hawksley Workman','ON','Folk'],
  ['Kathleen Edwards','ON','Folk'],
  ['Sarah Harmer','ON','Folk'],
  ['Bahamas','ON','Folk'],
  ['Andy Shauf','SK','Folk'],
  ['Great Lake Swimmers','ON','Folk'],
  ['The Weather Station','ON','Folk'],
  ['David Francey','ON','Folk'],
  ['Feist','AB','Folk'],
  ['k.d. lang','AB','Country'],
  ['Bry Webb','ON','Folk'],
  ['Daniel Romano','ON','Country'],
  ['Kacy and Clayton','SK','Folk'],
  ['Begonia','MB','Folk'],
  ['John K. Samson','MB','Folk'],
  ['Marlaena Moore','AB','Folk'],
  ['Amelia Curran','NL','Folk'],
  ['Great Big Sea','NL','Folk'],
  ['Alan Doyle','NL','Folk'],
  ['The Once','NL','Folk'],
  ['Fortunate Ones','NL','Folk'],
  ['Matt Andersen','NB','Blues'],
  ['The Stanfields','NS','Folk'],
  ['The Burning Hell','NS','Folk'],
  ['Jenn Grant','NS','Folk'],
  ['Mo Kenney','NS','Folk'],
  ['Dave Gunning','NS','Folk'],
  ['The Super Friendz','NS','Rock'],
  ['Lynn Miles','ON','Folk'],
  ['James Keelaghan','AB','Folk'],
  ['Ian Tyson','AB','Country'],
  ['Murray McLauchlan','ON','Folk'],
  ['Connie Kaldor','SK','Folk'],
  ['Greg MacPherson','MB','Folk'],
  ['The Sojourners','BC','Folk'],
  ['Said the Whale','BC','Folk'],
  ['Veda Hille','BC','Folk'],
  ['Dan Mangan','BC','Folk'],
  ['Geoff Berner','BC','Folk'],
  ['Carolyn Mark','BC','Folk'],
  ['Rodney DeCroo','BC','Folk'],
  ['Leeroy Stagger','BC','Country'],
  ['Lennie Gallant','NB','Folk'],
  ['Tasseomancy','ON','Folk'],
  ['Jennifer Castle','ON','Folk'],
  ['Ducks Unlimited','ON','Folk'],
  ['Gregory Hoskins','ON','Folk'],
  ['Jeremy Dutcher','NB','Classical'],
  // JAZZ
  ['Diana Krall','BC','Jazz'],
  ['BADBADNOTGOOD','ON','Jazz'],
  ['Laila Biali','BC','Jazz'],
  ['Christine Jensen','QC','Jazz'],
  ['Dominique Fils-Aime','QC','Jazz'],
  ['Renee Rosnes','BC','Jazz'],
  ['Emilie-Claire Barlow','ON','Jazz'],
  ['Jane Bunnett','ON','Jazz'],
  ['Hilario Duran','ON','Jazz'],
  ['Ingrid Jensen','BC','Jazz'],
  ['Oliver Jones','QC','Jazz'],
  ['Oscar Peterson','QC','Jazz'],
  ['Rob McConnell','ON','Jazz'],
  ['Kenny Wheeler','ON','Jazz'],
  ['Kevin Dean','QC','Jazz'],
  ['P.J. Perry','AB','Jazz'],
  ['Tommy Banks','AB','Jazz'],
  // CLASSICAL / EXPERIMENTAL
  ['Owen Pallett','ON','Classical'],
  ['Tim Brady','QC','Classical'],
  ['Nicole Lizee','QC','Experimental'],
  ['Chilly Gonzales','ON','Classical'],
  ['Alexandra Streliski','QC','Classical'],
  ['Alexina Louie','BC','Classical'],
  ['John Estacio','AB','Classical'],
  ['Tanya Tagaq','NU','Experimental'],
  // INDIGENOUS / WORLD
  ['Susan Aglukark','NU','World'],
  ['Buffy Sainte-Marie','SK','Folk'],
  ['Leela Gilday','NT','World'],
  ['Iskwe','MB','World'],
  ['The Jerry Cans','NU','World'],
  ['Crystal Shawanda','ON','Country'],
  ['Twin Flames','ON','Folk'],
  ['Digging Roots','ON','World'],
  ['Black Bear','ON','Hip-Hop'],
  ['Murray Porter','ON','World'],
  ['Alanis Obomsawin','QC','Folk'],
];

// Deduplicate by name
const seenNames = new Set();
const ARTISTS = CANADIAN_ARTISTS_RAW.filter(([name]) => {
  const k = name.toLowerCase();
  if (seenNames.has(k)) return false;
  seenNames.add(k);
  return true;
});

// -- GENRE MAP -----------------------------------------
const GENRE_MAP = {
  'hip hop':'Hip-Hop','hip-hop':'Hip-Hop','rap':'Hip-Hop','trap':'Hip-Hop',
  'boom bap':'Hip-Hop','drill':'Hip-Hop','conscious rap':'Hip-Hop',
  'alternative hip hop':'Hip-Hop','underground rap':'Hip-Hop',
  'grime':'Hip-Hop','gangsta rap':'Hip-Hop','cloud rap':'Hip-Hop',
  'house':'Electronic','techno':'Electronic','ambient':'Electronic',
  'edm':'Electronic','electronic':'Electronic','electronica':'Electronic',
  'synth-pop':'Electronic','synthwave':'Electronic','drum and bass':'Electronic',
  'dubstep':'Electronic','idm':'Electronic','downtempo':'Electronic',
  'chillwave':'Electronic','lo-fi':'Electronic','vaporwave':'Electronic',
  'hyperpop':'Electronic','glitch':'Electronic','trance':'Electronic',
  'rock':'Rock','indie rock':'Rock','alternative rock':'Rock','shoegaze':'Rock',
  'post-rock':'Rock','hard rock':'Rock','garage rock':'Rock','math rock':'Rock',
  'psychedelic rock':'Rock','prog rock':'Rock','noise rock':'Rock',
  'grunge':'Rock','new wave':'Rock','dream pop':'Rock',
  'metal':'Metal','heavy metal':'Metal','death metal':'Metal','black metal':'Metal',
  'doom metal':'Metal','metalcore':'Metal','thrash metal':'Metal',
  'punk':'Punk','punk rock':'Punk','hardcore':'Punk','post-punk':'Punk',
  'emo':'Punk','pop punk':'Punk','hardcore punk':'Punk',
  'pop':'Pop','indie pop':'Pop','chamber pop':'Pop','art pop':'Pop',
  'electropop':'Pop','bedroom pop':'Pop','baroque pop':'Pop',
  'folk':'Folk','indie folk':'Folk','singer-songwriter':'Folk','acoustic':'Folk',
  'contemporary folk':'Folk','folk rock':'Folk','neofolk':'Folk',
  'country':'Country','alt-country':'Country','americana':'Country',
  'bluegrass':'Country','outlaw country':'Country',
  'jazz':'Jazz','free jazz':'Jazz','jazz fusion':'Jazz','acid jazz':'Jazz',
  'bebop':'Jazz','nu jazz':'Jazz','contemporary jazz':'Jazz',
  'blues':'Blues','electric blues':'Blues','blues rock':'Blues',
  'classical':'Classical','contemporary classical':'Classical','orchestral':'Classical',
  'chamber music':'Classical','opera':'Classical',
  'experimental':'Experimental','avant-garde':'Experimental','noise':'Experimental',
  'drone':'Experimental','improv':'Experimental',
  'r&b':'R&B / Soul','rnb':'R&B / Soul','soul':'R&B / Soul','neo soul':'R&B / Soul',
  'funk':'R&B / Soul','gospel':'R&B / Soul','contemporary r&b':'R&B / Soul',
  'reggae':'Reggae','dub':'Reggae','dancehall':'Reggae','ska':'Reggae',
  'world':'World','world music':'World','afrobeat':'World','latin':'World',
  'indigenous':'World','throat singing':'World','powwow':'World',
};

const PROV_NAMES = {
  ON:'Ontario', QC:'Quebec', BC:'British Columbia', AB:'Alberta',
  SK:'Saskatchewan', MB:'Manitoba', NS:'Nova Scotia', NB:'New Brunswick',
  NL:'Newfoundland and Labrador', PEI:'Prince Edward Island',
  YT:'Yukon', NT:'Northwest Territories', NU:'Nunavut',
};

// -- UTILS ---------------------------------------------
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

function isIndependent(label) {
  if (!label) return true;
  const l = label.toLowerCase().trim();
  return l === '' || l === '[no label]' || l === 'self-released' || l === 'independent';
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// -- 1. BANDCAMP DISCOVER ------------------------------
// bandcamp-fetch v3 is ESM -- use dynamic import from CommonJS
async function fetchBandcamp() {
  console.log('\nFetching Bandcamp Discover (Canada, new arrivals)...');
  const releases = [];
  const cutoff   = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_BACK);

  try {
    const { default: bcfetch } = await import('bandcamp-fetch');

    let continuation = null;
    let page = 0;

    do {
      page++;
      console.log('  BC page ' + page + '/' + BC_PAGES);

      const params = {
        location: 6251999, // GeoNames ID for Canada
        sortBy:   'new',
        size:     48,
      };
      if (continuation) params.continuation = continuation;

      const result = await bcfetch.discovery.discover(params);
      const items  = result.items || [];
      if (!items.length) break;

      for (const item of items) {
        const releaseDate = item.releaseDate
          ? (item.releaseDate instanceof Date
              ? item.releaseDate.toISOString().split('T')[0]
              : String(item.releaseDate).split('T')[0])
          : '';

        if (releaseDate) {
          const d = new Date(releaseDate);
          if (!isNaN(d) && d < cutoff) continue;
        }

        // bandcamp-fetch v3 returns artist as object or string - handle both
        const bcArtist = (() => {
          const a = item.artist || item.band || item.name;
          if (!a) return 'Unknown Artist';
          if (typeof a === 'string') return a;
          if (typeof a === 'object') return a.name || a.title || JSON.stringify(a);
          return String(a);
        })();
        const bcTitle = (() => {
          const t = item.title || item.name || item.album;
          if (!t) return 'Unknown Title';
          if (typeof t === 'string') return t;
          if (typeof t === 'object') return t.name || t.title || String(t);
          return String(t);
        })();
        const bcCity = (() => {
          const l = item.location || item.city || '';
          if (typeof l === 'string') return l;
          if (typeof l === 'object') return l.name || '';
          return '';
        })();
        const bcGenre = (() => {
          const g = item.genre || item.tag || '';
          if (typeof g === 'string') return g;
          if (Array.isArray(g)) return g[0] || '';
          return '';
        })();
        const bcUrl = typeof item.url === 'string' ? item.url : (item.url && item.url.href) || '';

        if (bcArtist === 'Unknown Artist' && bcTitle === 'Unknown Title') continue;

        releases.push({
          artist:          bcArtist,
          artist_country:  'CA',
          artist_city:     bcCity,
          artist_province: '',
          release_title:   bcTitle,
          release_type:    'Album',
          release_date:    releaseDate,
          primary_genre:   normalizeGenre(bcGenre),
          subgenres:       [],
          platforms:       ['Bandcamp'],
          label:           '',
          independent:     true,
          source_url:      bcUrl,
          date_added:      isoDate(0),
        });
      }

      continuation = result.continuation || null;
      if (continuation) await sleep(800);

    } while (continuation && page < BC_PAGES);

  } catch (err) {
    console.error('  Bandcamp error: ' + err.message);
  }

  console.log('  BC done: ' + releases.length);
  return releases;
}

// -- 2. MUSICBRAINZ ------------------------------------
async function fetchMBBatch(batch, from, today) {
  const orClause = batch
    .map(([name]) => 'artist:"' + name.replace(/"/g, '\\"') + '"')
    .join(' OR ');
  const query = '(' + orClause + ') AND date:[' + from + ' TO ' + today + ']';

  const resp = await axios.get('https://musicbrainz.org/ws/2/release', {
    params: { query, limit: 100, offset: 0, fmt: 'json' },
    headers: { 'User-Agent': MB_USER_AGENT },
    timeout: 20000,
  });
  return resp.data.releases || [];
}

async function fetchAllMusicBrainz() {
  console.log('\nFetching MusicBrainz (seed list batches)...');
  const from  = isoDate(DAYS_BACK);
  const today = isoDate(0);
  const releases = [];
  const BATCH = 8;

  const artistProv  = {};
  const artistGenre = {};
  for (const [name, prov, genre] of ARTISTS) {
    artistProv[name.toLowerCase()]  = prov;
    artistGenre[name.toLowerCase()] = genre;
  }

  for (let i = 0; i < ARTISTS.length; i += BATCH) {
    const batch = ARTISTS.slice(i, i + BATCH);
    if (i % 40 === 0) {
      console.log('  MB batch ' + Math.floor(i/BATCH + 1) + '/' + Math.ceil(ARTISTS.length/BATCH));
    }
    try {
      const raw = await fetchMBBatch(batch, from, today);
      for (const rel of raw) {
        try {
          const credits    = rel['artist-credit'] || [];
          const artistName = credits
            .filter(ac => typeof ac !== 'string' || ac.trim() !== '')
            .map(ac => (typeof ac === 'string' ? ac.trim() : ac?.artist?.name || ''))
            .filter(Boolean)
            .join(' & ');
          const artistKey  = artistName.toLowerCase();
          const label      = (rel['label-info'] || [])[0]?.label?.name || '';
          const tags       = (rel.tags || []).map(t => t.name);
          const rgTags     = (rel['release-group']?.tags || []).map(t => t.name);
          const allTags    = [...new Set([...tags, ...rgTags])];
          const seedGenre  = artistGenre[artistKey] || '';
          const mbGenre    = normalizeGenre(allTags[0] || '');
          const province   = artistProv[artistKey] || '';

          releases.push({
            artist:          artistName,
            artist_country:  'CA',
            artist_city:     '',
            artist_province: province,
            release_title:   rel.title || '',
            release_type:    rel['release-group']?.['primary-type'] || 'Unknown',
            release_date:    rel.date || '',
            primary_genre:   seedGenre || mbGenre,
            subgenres:       allTags.slice(1).map(normalizeGenre).filter(g => g !== 'Other').slice(0, 3),
            platforms:       ['MusicBrainz'],
            label,
            independent:     isIndependent(label),
            source_url:      'https://musicbrainz.org/release/' + rel.id,
            date_added:      isoDate(0),
          });
        } catch (e) { /* skip bad entry */ }
      }
    } catch (err) {
      console.warn('  MB batch error: ' + err.message);
    }
    await sleep(MB_DELAY_MS);
  }

  console.log('  MB done: ' + releases.length);
  return releases;
}

// -- 3. ITUNES SEARCH ----------------------------------
async function fetchiTunesForArtist(name, province, genre) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_BACK);
  const results = [];

  try {
    const resp = await axios.get('https://itunes.apple.com/search', {
      params: {
        term:    name,
        country: 'ca',
        media:   'music',
        entity:  'album',
        limit:   5,
        sort:    'recent',
      },
      timeout: 10000,
    });

    for (const entry of (resp.data?.results || [])) {
      if ((entry.artistName || '').toLowerCase() !== name.toLowerCase()) continue;
      const releaseDate = entry.releaseDate ? entry.releaseDate.split('T')[0] : '';
      if (releaseDate) {
        const d = new Date(releaseDate);
        if (!isNaN(d) && d < cutoff) continue;
      }
      results.push({
        artist:          entry.artistName,
        artist_country:  'CA',
        artist_city:     '',
        artist_province: province,
        release_title:   entry.collectionName || '',
        release_type:    'Album',
        release_date:    releaseDate,
        primary_genre:   genre || normalizeGenre(entry.primaryGenreName || ''),
        subgenres:       [],
        platforms:       ['iTunes'],
        label:           '',
        independent:     false,
        source_url:      entry.collectionViewUrl || '',
        date_added:      isoDate(0),
      });
    }
  } catch (e) { /* timeout -- skip silently */ }

  return results;
}

async function fetchAlliTunes() {
  console.log('\nFetching iTunes Canada (per artist)...');
  const releases = [];
  for (let i = 0; i < ARTISTS.length; i++) {
    const [name, province, genre] = ARTISTS[i];
    if (i % 100 === 0) console.log('  iTunes ' + i + '/' + ARTISTS.length);
    const items = await fetchiTunesForArtist(name, province, genre);
    releases.push(...items);
    await sleep(ITUNES_DELAY);
  }
  console.log('  iTunes done: ' + releases.length);
  return releases;
}

// -- DEDUPE --------------------------------------------
function deduplicate(releases) {
  const map = new Map();
  for (const rel of releases) {
    const key = [String(rel.artist || ''), String(rel.release_title || '')]
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
    if (!r.release_date) return true;
    const d = new Date(r.release_date);
    return isNaN(d) || d >= cutoff;
  });
}

// -- TALLY ---------------------------------------------
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
    byGenre[r.primary_genre || 'Other'] = (byGenre[r.primary_genre || 'Other'] || 0) + 1;
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

// -- MAIN ----------------------------------------------
async function main() {
  console.log('Canadian Music Ledger - Build');
  console.log('Lookback: ' + DAYS_BACK + ' days | Seed artists: ' + ARTISTS.length);
  ensureDataDir();

  // Bandcamp first (its own rate limiting, no conflict)
  const bcReleases = await fetchBandcamp().catch(e => {
    console.error('Bandcamp failed: ' + e.message); return [];
  });

  // MB and iTunes concurrently (different APIs)
  const [mbReleases, itReleases] = await Promise.all([
    fetchAllMusicBrainz().catch(e => { console.error('MB failed: ' + e.message); return []; }),
    fetchAlliTunes().catch(e => { console.error('iTunes failed: ' + e.message); return []; }),
  ]);

  const combined = [...bcReleases, ...mbReleases, ...itReleases];
  console.log('\nRaw totals:');
  console.log('  Bandcamp:    ' + bcReleases.length);
  console.log('  MusicBrainz: ' + mbReleases.length);
  console.log('  iTunes:      ' + itReleases.length);
  console.log('  Combined:    ' + combined.length);

  const BLOCKLIST = [
    'moist records',
    'moist records presents',
  ];

  const filtered = filterByAge(combined).filter(r => {
    const artist = String(r.artist || '').toLowerCase();
    const label  = String(r.label || '').toLowerCase();
    return !BLOCKLIST.some(b => artist.includes(b) || label.includes(b));
  });
  const deduped  = deduplicate(filtered);
  deduped.sort((a, b) =>
    new Date(b.release_date || '1970') - new Date(a.release_date || '1970')
  );

  console.log('After dedup:  ' + deduped.length);

  const tally = generateTally(deduped);
  console.log('7-day:        ' + tally.total_releases_last_7_days);
  console.log('30-day:       ' + tally.total_releases_last_30_days);
  console.log('Genres:       ' + Object.keys(tally.by_genre).join(', '));

  fs.writeFileSync(RELEASES_OUT, JSON.stringify(deduped, null, 2));
  fs.writeFileSync(TALLY_OUT,    JSON.stringify(tally, null, 2));
  console.log('\nDone. ' + deduped.length + ' releases written.');
}

main().catch(err => {
  console.error('Build failed: ' + err);
  process.exit(1);
});