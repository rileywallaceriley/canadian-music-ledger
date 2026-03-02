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










  ['Shantel May','ON','R&B/Soul'],
  // -- ROUND 10: Drill gaps + Divine Brown --
  ['ShaqIsDope','ON','Hip-Hop'],
  ['Friyie','ON','Hip-Hop'],
  ['LB Spiffy','ON','Hip-Hop'],
  ['Tana343','ON','Hip-Hop'],
  ['Divine Brown','ON','R&B/Soul'],
  // -- ROUND 9: THE BLK LT$ (Toronto, 36 Chambers/RZA) --
  ['The BLK LTS','ON','Hip-Hop'],

  // -- ROUND 9: Polaris 2024/2025 + JUNO 2025 + Punjabi Wave + Emerging --
  ['Quinton Barnes','ON','Hip-Hop'],
  ['Choses Sauvages','QC','Electronic'],
  ['Antoine Corriveau','QC','Folk'],
  ['Myriam Gendron','QC','Folk'],
  ['Hildegard','QC','Pop'],
  ['Kaia Kater','QC','Folk'],
  ['Richard Laviolette','ON','Folk'],
  ['Wyatt C Louis','ON','Hip-Hop'],
  ['N NAO','QC','R&B/Soul'],
  ['Dorothea Paas','ON','Folk'],
  ['Ariane Roy','QC','Folk'],
  ['Mike Shabb','QC','Hip-Hop'],
  ['Annie-Claude Deschenes','QC','Electronic'],
  ['Devours','BC','Pop'],
  ['Shane Ghostkeeper','AB','Folk'],
  ['NOBRO','QC','Rock'],
  ['Cindy Lee','AB','Experimental'],
  ['Alexander Stewart','ON','R&B/Soul'],
  ['Sukha','BC','Hip-Hop'],
  ['EKKSTACY','BC','Rock'],
  ['Jonita Gandhi','ON','Pop'],
  ['Emily DAngelo','ON','Classical'],
  ['Audrey Ochoa','AB','Jazz'],
  ['David Gogo','BC','Blues'],
  ['Boy Golden','MB','Folk'],
  ['Valley','ON','Pop'],
  ['JJ Wilde','ON','Rock'],
  ['Striker','AB','Metal'],
  ['Celeigh Cardinal','AB','Folk'],
  ['Priori','QC','Electronic'],
  ['Dom Vallie','QC','Hip-Hop'],
  ['Benita','ON','R&B/Soul'],
  ['TheHonestGuy','ON','R&B/Soul'],
  ['Chani Nattan','BC','Pop'],
  ['Inderpal Moga','BC','Pop'],
  ['Gminxr','BC','Hip-Hop'],
  ['Chris Grey','ON','Pop'],
  ['Tony Ann','QC','Pop'],
  ['Zeina','ON','Pop'],
  ['Andy Milne','ON','Jazz'],
  ['Mark Kelso','ON','Jazz'],
  ['Shinda Kahlon','BC','Hip-Hop'],
  ['Fateh','BC','Hip-Hop'],
  ['Robyn Sandhu','BC','Hip-Hop'],
  ['Jonah Yano','ON','Jazz'],
  ['Skiifall','QC','Reggae'],
  ['Isabella Lovestory','ON','Pop'],
  ['Tre Mission','ON','Hip-Hop'],
  ['Nia Nadurata','ON','Pop'],
  ['Baby Nova','NS','Pop'],
  ['Jutes','ON','Rock'],
  ['Jade LeMac','QC','Pop'],
  ['Noeline Hofmann','AB','Country'],
  ['Wolf Castle','NB','Hip-Hop'],
  ['Zamani','NS','R&B/Soul'],
  ['November Ultra','QC','Pop'],
  ['Annabel Oreste','QC','R&B/Soul'],
  ['Jennarie','ON','R&B/Soul'],
  // -- ROUND 8: LIZA (Toronto) + ORANGE GECKO (Montreal) --
  ['Liza','ON','R&B / Soul'],
  ['Orange Gecko','QC','R&B / Soul'],
  // -- ROUND 7: DRILL / JUNIA-T / TORONTO HIP HOP DEEP CUT WAVE --
  ['Top5','ON','Hip-Hop'],
  ['TRP.P','ON','R&B / Soul'],
  ['Sofia Camara','ON','Pop'],
  ['Fionn','BC','Rock'],
  ['Shawn Desman','ON','R&B / Soul'],
  ['City Fidelia','ON','Hip-Hop'],
  ['Casper TNG','ON','Hip-Hop'],
  ['3MFrench','ON','Hip-Hop'],
  ['Burna Bandz','ON','Hip-Hop'],
  ['Why G','ON','Hip-Hop'],
  ['AR Paisley','ON','Hip-Hop'],
  ['Savv4x','ON','Hip-Hop'],
  ['Yung Tory','ON','Hip-Hop'],
  ['Bvlly','ON','Hip-Hop'],
  ['Tallup Twinz','ON','Hip-Hop'],
  ['YML Deeko','ON','Hip-Hop'],
  ['100 OTD','ON','Hip-Hop'],
  ['Da Crook','ON','Hip-Hop'],
  ['Ching','ON','Hip-Hop'],
  ['Delon Dior','ON','Hip-Hop'],
  ['KHEM','ON','Hip-Hop'],
  ['Puffy Lz','ON','Hip-Hop'],
  ['Preme','ON','Hip-Hop'],
  ['Smash Brovaz','ON','Hip-Hop'],
  ['Sydanie','ON','Hip-Hop'],
  ['Lioness Kaur','ON','Hip-Hop'],
  ['Thxsomch','ON','Hip-Hop'],
  ['Gustavo Guaapo','ON','Hip-Hop'],
  ['Miloh Smith','ON','R&B / Soul'],
  ['Faiza','ON','R&B / Soul'],
  ['Leila Dey','ON','R&B / Soul'],
  ['Amaal Nuux','ON','R&B / Soul'],
  ['Derin Falana','ON','R&B / Soul'],
  ['yung kai','BC','Pop'],
  ['Sorisa','ON','Pop'],
  ['Cutsleeve','ON','Pop'],
  ['Tiger Balme','ON','Pop'],
  ['Jamie Fine','ON','Country'],
  ['The Sorority','ON','Hip-Hop'],
  ['Talia Schlanger','ON','Pop'],
  ['Paydro 66','QC','Hip-Hop'],
  ['Enima','QC','Hip-Hop'],
  ['Rymz','QC','Hip-Hop'],
  ['Watson','QC','Pop'],
  ['Beatchild','ON','Hip-Hop'],
  ['Addy Papa','ON','Hip-Hop'],
  ['J.O. Mairs','ON','Hip-Hop'],

  // -- ROUND 7: JUNIA-T / TORONTO DRILL / R&B / OTTAWA / MONTREAL ADDITIONS --
  ['NADUH','BC','R&B / Soul'],
  ['JD Era','ON','Hip-Hop'],
  ['Abdominal','ON','Hip-Hop'],
  ['Chuckie Akenz','ON','Hip-Hop'],
  ['Blacka Da Don','ON','Hip-Hop'],
  ['D-Sisive','ON','Hip-Hop'],
  ['The Philosopher Kings','ON','R&B / Soul'],
  ['Love and Sas','ON','R&B / Soul'],
  ['Julian Thomas','ON','R&B / Soul'],
  ['Casey MQ','QC','Electronic'],
  ['TwoTiime','ON','Hip-Hop'],
  ['Goldstripes','ON','Hip-Hop'],
  ['Roi Heenok','QC','Hip-Hop'],
  ['Rowjay','QC','Hip-Hop'],
  ['FREAKEY','QC','Hip-Hop'],
  ['Malko','QC','Hip-Hop'],
  ['Halo','QC','Hip-Hop'],
  ['347aidan','ON','Pop'],
  ['Ecstasy','BC','Rock'],
  // -- ROUND 6: REGGAE / WORLD / AFROBEATS / LATIN / CARIBBEAN / INDIGENOUS WORLD --
  ['STORRY','ON','Reggae'],
  ['Daduh King','ON','Reggae'],
  ['Mel Pacifico','QC','R&B / Soul'],
  ['VIBI','ON','Pop'],
  ['Jackie Mittoo','ON','Reggae'],
  ['Jay Douglas','ON','Reggae'],
  ['Nana McLean','ON','Reggae'],
  ['Leroy Sibbles','ON','Reggae'],
  ['Messenjah','ON','Reggae'],
  ['Sonia Collymore','ON','Reggae'],
  ['Lillian Allen','ON','Reggae'],
  ['Kirk Diamond','ON','Reggae'],
  ['Kairo McLean','ON','Reggae'],
  ['Tanya Mullings','ON','Reggae'],
  ['Kafia','ON','Reggae'],
  ['Slim Flex','ON','Reggae'],
  ['MAGIC','ON','Reggae'],
  ['Dubmatix','ON','Reggae'],
  ['Petraa','ON','Reggae'],
  ['Tiffanie Malvo','ON','Reggae'],
  ['INoah','ON','Reggae'],
  ['Tugstar','BC','Reggae'],
  ['Onique','ON','Reggae'],
  ['Ishan People','ON','Reggae'],
  ['Carla Marshall','ON','Reggae'],
  ['Donna Makeda','ON','Reggae'],
  ['Omega Mighty','ON','Reggae'],
  ['King Cruff','ON','Reggae'],
  ['South Rakkas Crew','ON','Reggae'],
  ['Parachute Club','ON','Reggae'],
  ['TOME','QC','World'],
  ['Nonso Amadi','ON','World'],
  ['Kae Sun','ON','World'],
  ['Borelson','ON','World'],
  ['Sillla','ON','World'],
  ['K naan','ON','World'],
  ['Lorraine Klaasen','QC','World'],
  ['Souljazz Orchestra','ON','World'],
  ['Busty and the Bass','QC','World'],
  ['Fredy V','QC','World'],
  ['The Foundation','QC','World'],
  ['Hua Li','QC','World'],
  ['Caleb Rimtobaye','QC','World'],
  ['H Sao','QC','World'],
  ['Lemon Bucket Orkestra','ON','World'],
  ['Carlos del Junco','ON','World'],
  ['Oscar Lopez','AB','World'],
  ['Sergio Mejia','QC','World'],
  ['Quarteto Latinoamericano','QC','World'],
  ['Mariachi Ghost','ON','World'],
  ['Anslem Douglas','ON','World'],
  ['David Rudder','ON','World'],
  ['Jane Bunnett and Maqueque','ON','Jazz'],
  ['Bonjay','ON','World'],
  ['Kiran Ahluwalia','ON','World'],
  ['Roach Kira','ON','World'],
  ['Jaffa Road','ON','World'],
  ['Pavlo','ON','World'],
  ['Rachel Sermanni','QC','Folk'],
  ['Waleed Abdulhamid','ON','World'],
  ['Saidah Baba Talibah','ON','R&B / Soul'],
  ['Hannah Epperson','BC','Classical'],
  ['Omnia','ON','World'],
  ['Emile Chartier','QC','World'],
  ['D Rego','ON','World'],
  ['Taborah Johnson','ON','R&B / Soul'],
  ['Ayo Leilani','ON','World'],
  // -- ROUND 5: R&B DEEP CUTS / INDIE ROCK / POST-HARDCORE / COUNTRY / WORLD / REGIONAL --
  ['Black Atlass','QC','R&B / Soul'],
  ['Kallitechnis','QC','R&B / Soul'],
  ['Jackie Shane','ON','R&B / Soul'],
  ['anders','ON','R&B / Soul'],
  ['Terrell Morris','BC','R&B / Soul'],
  ['Remy Shand','MB','R&B / Soul'],
  ['Karl Wolf','ON','R&B / Soul'],
  ['Ali Gatie','AB','R&B / Soul'],
  ['Tia Wood','AB','R&B / Soul'],
  ['Tedy','QC','R&B / Soul'],
  ['Blynk','QC','R&B / Soul'],
  ['Liberty Silver','ON','R&B / Soul'],
  ['bbno dollar','BC','Pop'],
  ['Handsome Furs','QC','Rock'],
  ['Death From Above 1979','ON','Rock'],
  ['Hidden Cameras','ON','Rock'],
  ['Dog Day','NS','Rock'],
  ['Pink Mountaintops','BC','Rock'],
  ['Big Sugar','ON','Rock'],
  ['The Strumbellas','ON','Folk'],
  ['Headstones','ON','Rock'],
  ['Honeymoon Suite','ON','Rock'],
  ['The Killjoys','ON','Rock'],
  ['Len','ON','Rock'],
  ['Dear Rouge','BC','Rock'],
  ['Ohbijou','ON','Rock'],
  ['Gentleman Reg','ON','Folk'],
  ['Drive She Said','ON','Rock'],
  ['Haywire','PE','Rock'],
  ['Rik Emmett','ON','Rock'],
  ['Streetheart','AB','Rock'],
  ['Harlequin','MB','Rock'],
  ['A Foot in Coldwater','ON','Rock'],
  ['Bachman Turner Overdrive','MB','Rock'],
  ['Marty Robbins','SK','Country'],
  ['Boys Night Out','ON','Rock'],
  ['Grade','ON','Punk'],
  ['The Reason','BC','Rock'],
  ['Attack In Black','ON','Rock'],
  ['Dead and Divine','ON','Rock'],
  ['Exco Levi','ON','Reggae'],
  ['Jah Cutta','ON','Reggae'],
  ['Cameron Whitcomb','AB','Country'],
  ['Owen Riegling','ON','Country'],
  ['Tyler Joe Miller','BC','Country'],
  ['Madeline Merlo','BC','Country'],
  ['MacKenzie Porter','AB','Country'],
  ['Tim and The Glory Boys','BC','Country'],
  ['James Barker Band','NS','Country'],
  ['High Valley','AB','Country'],
  ['Jess Moskaluke','SK','Country'],
  ['Lindsay Ell','AB','Country'],
  ['Robyn Ottolini','ON','Country'],
  ['Aaron Goodvin','SK','Country'],
  ['Nate Haller','AB','Country'],
  ['Andrew Hyatt','ON','Country'],
  ['Chad Brownlee','BC','Country'],
  ['Nice Horse','AB','Country'],
  ['Tebey','ON','Country'],
  ['Elyse Saunders','NS','Country'],
  ['George Fox','AB','Country'],
  ['Charlie Major','ON','Country'],
  ['Patricia Conroy','BC','Country'],
  ['Lisa Brokop','BC','Country'],
  ['Lucille Starr','BC','Country'],
  ['Don Messer','NB','Country'],
  ['Twin Kennedy','ON','Country'],
  ['Robert Adam','SK','Country'],
  ['Dan Davidson','NS','Country'],
  ['Doc Walker','MB','Country'],
  ['Duane Steele','AB','Country'],
  ['George Canyon','NS','Country'],
  ['James Barker','NS','Country'],
  ['k d lang','AB','Country'],
  ['Ray Griff','AB','Country'],
  ['Wilf Carter','NS','Country'],
  ['Sacha','QC','Pop'],
  ['Ikky','ON','Electronic'],
  ['Sidhu Moosewala','ON','Hip-Hop'],
  ['Alex Cuba','BC','World'],
  ['Abigail Lapell','ON','Folk'],
  ['Michael Jerome Browne','QC','Blues'],
  ['Night Lovell','ON','Hip-Hop'],
  ['SonReal','BC','Hip-Hop'],
  ['Jarvis Church','ON','R&B / Soul'],
  ['Dione Taylor','ON','Jazz'],
  ['Shakura S Aida','ON','Jazz'],
  ['Measha Brueggergosman','NB','Classical'],
  ['Ben Heppner','BC','Classical'],
  ['Gerald Finley','NB','Classical'],
  ['Isabel Bayrakdarian','ON','Classical'],
  ['Russell Braun','ON','Classical'],
  ['Monica Huggett','ON','Classical'],
  ['Serouj Kradjian','ON','Classical'],
  ['Bramwell Tovey','BC','Classical'],
  ['Louis Lortie','QC','Classical'],
  ['Angela Hewitt','ON','Classical'],
  ['Jon Kimura Parker','BC','Classical'],
  ['Andrew Wan','QC','Classical'],
  ['Delerium','BC','Electronic'],
  ['Tobacco','ON','Electronic'],
  ['Shlomo','ON','Electronic'],
  ['Byrd and McKinnon','ON','Electronic'],
  ['Umberto Alemanno','QC','Electronic'],
  ['Le Matos','QC','Electronic'],
  ['High Klassified','QC','Electronic'],
  ['Msaidizi','BC','Electronic'],
  ['Brian MacMillan','BC','Folk'],
  ['Christine Fellows','MB','Folk'],
  ['Vince Fontaine','MB','Folk'],
  ['Eagle and Hawk','MB','Folk'],
  ['Boil the Frog','QC','Rock'],
  ['Vivek Shraya','AB','Pop'],
  ['The Dodos','BC','Folk'],
  ['Outtacontroller','NS','Punk'],
  ['Monomyth','NS','Rock'],
  ['Nils Lofgren','ON','Rock'],
  ['JJ Ipsen','BC','Folk'],
  ['Harrow Fair','ON','Folk'],
  ['Gypsophilia','NS','Jazz'],
  ['The Dardanelles','NL','Folk'],
  ['Crystal Gayle','ON','Country'],
  ['Gary Fjellgaard','SK','Country'],
  ['The Road Hammers','ON','Country'],
  // -- ROUND 4: TORONTO UNDERGROUND HIP HOP / PUNK DEEP CUTS / JAZZ JUNO / INDIE ROCK --
  ['Smoke Dawg','ON','Hip-Hop'],
  ['Puffy L z','ON','Hip-Hop'],
  ['Jimmy Prime','ON','Hip-Hop'],
  ['Jay Whiss','ON','Hip-Hop'],
  ['Robin Banks','ON','Hip-Hop'],
  ['Roney','ON','Hip-Hop'],
  ['Mo G','ON','Hip-Hop'],
  ['Pvrx','ON','Hip-Hop'],
  ['Connor Price','ON','Hip-Hop'],
  ['Preston Pablo','ON','Hip-Hop'],
  ['SadBoi','ON','Hip-Hop'],
  ['Banx and Ranx','ON','Electronic'],
  ['Akeel Henry','ON','Electronic'],
  ['Josh Sahunta','AB','R&B / Soul'],
  ['Luna Elle','ON','R&B / Soul'],
  ['Jhyve','ON','R&B / Soul'],
  ['Reve','QC','Pop'],
  ['New West','ON','Pop'],
  ['Lowell','ON','Pop'],
  ['The Beaches','ON','Rock'],
  ['Lary Kidd','QC','Hip-Hop'],
  ['Loud Lary Ajust','QC','Hip-Hop'],
  ['Bros Landreth','MB','Country'],
  ['East Pointers','PE','Folk'],
  ['Jordan St Cyr','MB','Pop'],
  ['Subhumans','BC','Punk'],
  ['Teenage Head','ON','Punk'],
  ['Viletones','ON','Punk'],
  ['Diodes','ON','Punk'],
  ['Pointed Sticks','BC','Punk'],
  ['Young Canadians','BC','Punk'],
  ['Counterparts','ON','Punk'],
  ['Flatliners','ON','Punk'],
  ['Real McKenzies','BC','Punk'],
  ['Bootlicker','BC','Punk'],
  ['Closet Monster','ON','Punk'],
  ['Breaking Benjamin','ON','Rock'],
  ['Plumtree','NS','Rock'],
  ['Eric s Trip','NS','Rock'],
  ['Hardship Post','NL','Rock'],
  ['Lowest of the Low','ON','Rock'],
  ['Change of Heart','ON','Rock'],
  ['Skydiggers','ON','Rock'],
  ['54 40','BC','Rock'],
  ['Doug and the Slugs','BC','Rock'],
  ['Odds','BC','Rock'],
  ['Long John Baldry','BC','Blues'],
  ['Big Dave McLean','MB','Blues'],
  ['Paul Reddick','ON','Blues'],
  ['Clarence Gatemouth Brown','ON','Blues'],
  ['Andre Leroux','QC','Jazz'],
  ['Jeremy Ledbetter','ON','Jazz'],
  ['Will Bonness','MB','Jazz'],
  ['Jocelyn Gould','MB','Jazz'],
  ['Avataar','ON','Jazz'],
  ['Nick Maclean','ON','Jazz'],
  ['Colin Stetson','QC','Jazz'],
  ['Gentiane MG','QC','Jazz'],
  ['Noam Lemish','ON','Jazz'],
  ['Brownman Ali','ON','Jazz'],
  ['Sundar Viswanathan','ON','Jazz'],
  ['Michael Occhipinti','ON','Jazz'],
  ['Aaron Lightstone','ON','Jazz'],
  ['Mark Limacher','ON','Jazz'],
  ['Russ Macklem','ON','Jazz'],
  ['Canadian Jazz Collective','ON','Jazz'],
  ['Andre Lachance','QC','Jazz'],
  ['Jan Lisiecki','AB','Classical'],
  ['Bruce Liu','QC','Classical'],
  ['Marc-Andre Hamelin','QC','Classical'],
  ['James Ehnes','MB','Classical'],
  ['Tafelmusik','ON','Classical'],
  ['Les Violons du Roy','QC','Classical'],
  ['Orchestre Metropolitain','QC','Classical'],
  ['Yannick Nezet-Seguin','QC','Classical'],
  ['Collectif9','QC','Classical'],
  ['Kevin Lau','ON','Classical'],
  ['Linda Catlin Smith','ON','Classical'],
  ['Airat Ichmouratov','QC','Classical'],
  ['Amy Brandon','BC','Classical'],
  ['Andrew Staniland','NL','Classical'],
  ['Deantha Edmunds','NL','Classical'],
  ['Ron Korb','ON','Classical'],
  ['R Murray Schafer','ON','Classical'],
  ['Glenn Gould','ON','Classical'],
  ['Marek Norman','ON','Classical'],
  ['Sarah Slean','ON','Pop'],
  ['Justin Nozuka','ON','Pop'],
  ['Terra Lightfoot','ON','Rock'],
  ['Skye Wallace','ON','Rock'],
  ['Tim Baker','NL','Folk'],
  ['Nick Sherman','ON','Rock'],
  ['A Winged Victory for the Sullen','AB','Electronic'],
  ['Jason Collett','ON','Folk'],
  ['Constantines','ON','Rock'],
  ['Raising the Fawn','ON','Rock'],
  ['Spencer Krug','QC','Folk'],
  ['Jim Guthrie','ON','Folk'],
  ['Final Fantasy','ON','Classical'],
  ['Tara Holloway','ON','Folk'],
  ['Eric Idle','NB','Folk'],
  ['New Pornographers','BC','Rock'],
  ['Dan Bejar','BC','Rock'],
  ['Ladyhawk','BC','Rock'],
  ['Channeling','ON','Rock'],
  ['Miracle Fortress','QC','Pop'],
  ['Think About Life','QC','Rock'],
  ['Telefon Tel Aviv','QC','Electronic'],
  ['Louis-Jose Houde','QC','Pop'],
  ['Remi Wolf','QC','Pop'],
  ['Mononeon','QC','R&B / Soul'],
  ['Hante','QC','Electronic'],
  ['Ice Cream','ON','Electronic'],
  ['Sunglaciers','AB','Rock'],
  ['Burning Hell','ON','Folk'],
  ['Felicity Williams','ON','Jazz'],
  ['Kevin Quain','AB','Rock'],
  ['James Murdoch','NS','Folk'],
  ['Passenger','ON','Folk'],
  ['Eman','QC','Hip-Hop'],
  ['Brown Bag AllStars','ON','Hip-Hop'],
  ['Denz','ON','Hip-Hop'],
  ['Lil Uzi','ON','Hip-Hop'],
  ['Josh Eppard','ON','Hip-Hop'],
  ['The Town Heroes','NS','Rock'],
  ['Port Cities','NS','Pop'],
  ['Once','NL','Folk'],
  ['Bob Wiseman','ON','Experimental'],
  ['Ice Choir','ON','Electronic'],
  ['Maylee Todd','ON','Pop'],
  ['Barzin','ON','Folk'],
  ['James Leroy','ON','R&B / Soul'],
  ['Naturally','ON','R&B / Soul'],
  ['Allie Hughes','ON','Pop'],
  ['Priya Ragu','ON','R&B / Soul'],
  // -- ROUND 3 MEGA EXPANSION: ELECTRONIC/TECHNO/METAL/INDIGENOUS/QC/FOLK/CLASSIC --
  ['Art Department','ON','Electronic'],
  ['Carlo Lio','ON','Electronic'],
  ['Honeydrip','QC','Electronic'],
  ['Ciel','ON','Electronic'],
  ['Sinjin Hawke','QC','Electronic'],
  ['Nick Holder','ON','Electronic'],
  ['DVBBS','ON','Electronic'],
  ['ATTLAS','ON','Electronic'],
  ['Kid Koala','QC','Electronic'],
  ['Skinny Puppy','BC','Electronic'],
  ['Front Line Assembly','BC','Electronic'],
  ['CRi','QC','Electronic'],
  ['Lunice','QC','Electronic'],
  ['Stwo','QC','Electronic'],
  ['Ghislain Poirier','QC','Electronic'],
  ['Trusst','ON','Electronic'],
  ['Maara','ON','Electronic'],
  ['Kuedo','ON','Electronic'],
  ['Pomo','BC','Electronic'],
  ['Machinedrum','ON','Electronic'],
  ['Weakerthans','MB','Folk'],
  ['Derek Miller','ON','Rock'],
  ['Amanda Rheaume','ON','Folk'],
  ['Julian Taylor','ON','Rock'],
  ['Shawnee Kish','ON','Country'],
  ['Ruby Waters','ON','Rock'],
  ['Wab Kinew','MB','Hip-Hop'],
  ['Samian','QC','Hip-Hop'],
  ['Joey Stylez','SK','Hip-Hop'],
  ['Kinnie Starr','BC','Hip-Hop'],
  ['Leonard Sumner','MB','Folk'],
  ['DJ Shub','ON','Electronic'],
  ['Halluci Nation','ON','Electronic'],
  ['Blue Moon Marquee','AB','Blues'],
  ['Crown Lands','ON','Rock'],
  ['Piqsiq','NU','World'],
  ['Silla and Rise','NU','World'],
  ['Kanen','QC','Folk'],
  ['Strapping Young Lad','BC','Metal'],
  ['Devin Townsend Project','BC','Metal'],
  ['Tomb Mold','ON','Metal'],
  ['Wake','AB','Metal'],
  ['Fuck The Facts','QC','Metal'],
  ['Black Wizard','BC','Metal'],
  ['Altars of Grief','SK','Metal'],
  ['Begrime Exemious','AB','Metal'],
  ['Detherous','AB','Metal'],
  ['Tyrants Blood','BC','Metal'],
  ['Blasphemy','BC','Metal'],
  ['VHS','ON','Metal'],
  ['Arrival of Autumn','AB','Metal'],
  ['Abjection','ON','Metal'],
  ['Phobocosm','QC','Metal'],
  ['Neck of the Woods','BC','Metal'],
  ['Witches Hammer','BC','Metal'],
  ['KEN Mode','MB','Metal'],
  ['Kashtin','QC','Folk'],
  ['Willie Dunn','QC','Folk'],
  ['Robbie Robertson','ON','Rock'],
  ['Leanne Betasamosake Simpson','ON','Folk'],
  ['Jayli Wolf','BC','Pop'],
  ['Digawolf','NT','World'],
  ['Veronica Johnny','BC','Country'],
  ['Don Amero','MB','Folk'],
  ['Daniel Belanger','QC','Pop'],
  ['Salebarbes','QC','Folk'],
  ['2Freres','QC','Folk'],
  ['Roxane Bruneau','QC','Pop'],
  ['Laurence-Anne','QC','Pop'],
  ['Robert Robert','QC','Rock'],
  ['Calamine','QC','Rock'],
  ['Jeanick Fournier','QC','Pop'],
  ['Ginette Reno','QC','Pop'],
  ['Michel Rivard','QC','Folk'],
  ['Patrick Norman','QC','Country'],
  ['Martine St-Clair','QC','Pop'],
  ['Damien Robitaille','QC','Pop'],
  ['Clay and Friends','QC','Pop'],
  ['Lydia Kepinski','QC','Pop'],
  ['Fanny Bloom','QC','Pop'],
  ['Marc Dupre','QC','Pop'],
  ['Alex Burger','QC','Folk'],
  ['Irvin Blais','QC','Pop'],
  ['Elage Diouf','QC','World'],
  ['Lea Jarry','QC','Pop'],
  ['Abelaid','QC','Pop'],
  ['Comment Debord','QC','Electronic'],
  ['Felx Leclerc','QC','Folk'],
  ['Claude Dubois','QC','Pop'],
  ['Richard Seguin','QC','Folk'],
  ['Luc Plamondon','QC','Pop'],
  ['Serge Fiori','QC','Rock'],
  ['Harmonium','QC','Rock'],
  ['Beau Dommage','QC','Pop'],
  ['Plume Latraverse','QC','Folk'],
  ['Paul Piche','QC','Folk'],
  ['Offenbach','QC','Rock'],
  ['Gens du Pays','QC','Folk'],
  ['Jim Corcoran','QC','Folk'],
  ['Raoul Duguay','QC','Experimental'],
  ['Zachary Richard','QC','Folk'],
  ['Marie-Claire Seguin','QC','Folk'],
  ['Joe Bocan','QC','Pop'],
  ['Natalie Choquette','QC','Classical'],
  ['Andre Gagnon','QC','Classical'],
  ['Wake Island','QC','Electronic'],
  ['Dolbeau','QC','Rock'],
  ['Wool and the Pants','BC','Rock'],
  ['Beliefs','ON','Rock'],
    ['Fierte','QC','Folk'],
  ['Robb Nash','MB','Rock'],
  ['Scott Nolan','MB','Folk'],
  ['Swan Lake','MB','Folk'],
  ['Junkhouse','ON','Rock'],
  ['Aldo Nova','QC','Rock'],
  ['Gowan','ON','Pop'],
  ['The Gaff','ON','Hip-Hop'],
  ['Motion','ON','Hip-Hop'],
  ['Wio','ON','Hip-Hop'],
  ['Choklate','BC','R&B / Soul'],
  ['Chin Injeti','BC','R&B / Soul'],
  ['Jimmy Swift Band','NB','Rock'],
  ['Son of Dave','MB','Blues'],
  ['Bobbi Arlene','NB','Folk'],
  ['Tom Fun Orchestra','NS','Folk'],
  ['North Preston Youth House Boys','NS','Hip-Hop'],
  ['Ron Hynes','NL','Folk'],
  ['Chris LeDrew','NL','Pop'],
  ['Ryan Doucette','NL','Folk'],
  ['Layla Staats','ON','Folk'],
  ['Laura Smith','NS','Folk'],
  ['James Gordon','ON','Folk'],
  ['Chris Coole','ON','Folk'],
  ['Tannahill Weavers','NS','Folk'],
  ['Ian Tamblyn','ON','Folk'],
  ['Sonia Rao','ON','Folk'],
  ['Allison Brown','NS','Folk'],
  ['Chris MacLean','PE','Folk'],
  ['Fred Eaglesmith','ON','Country'],
  ['Ian Bell','ON','Folk'],
  ['Stephen Fearing','ON','Folk'],
  ['Jadea Kelly','ON','Folk'],
  ['Sophie Milman','ON','Jazz'],
  ['Shirantha Beddage','ON','Jazz'],
  // -- MEGA EXPANSION: POLARIS ALL YEARS + EXCLAIM NEW FAVES + ROOTS + CLASSICS --
  ['Jean-Michel Blais','QC','Classical'],
  ['FET.NAT','QC','Experimental'],
  ['Les Louanges','QC','Pop'],
  ['Witch Prophet','ON','R&B / Soul'],
  ['Pantayo','ON','World'],
  ['Nehiyawak','AB','World'],
  ['Debby Friday','ON','Electronic'],
  ['Chiiild','QC','R&B / Soul'],
  ['Myst Milano','QC','Hip-Hop'],
  ['poolblood','ON','Folk'],
  ['Eliza Niemi','ON','Folk'],
  ['Gayance','QC','R&B / Soul'],
  ['Home Front','ON','Rock'],
  ['Nico Paulo','ON','R&B / Soul'],
  ['Khotin','AB','Electronic'],
  ['JayWood','MB','Pop'],
  ['Bambii','ON','Electronic'],
  ['Saya Gray','ON','Pop'],
  ['Bibi Club','QC','Folk'],
  ['Population II','QC','Rock'],
  ['Nemahsis','NB','Hip-Hop'],
  ['The OBGMs','ON','Rock'],
  ['Ribbon Skirt','QC','Rock'],
  ['Bells Larsen','ON','Folk'],
  ['Art dEcco','BC','Pop'],
  ['Gloin','QC','Metal'],
  ['Yoo Doo Right','QC','Rock'],
  ['Sister Ray','ON','Rock'],
  ['Lou-Adriane Cassidy','QC','Folk'],
  ['Mana Mana','QC','Electronic'],
  ['La Securite','QC','Pop'],
  ['Philippe Brach','QC','Folk'],
  ['Eric Craven','QC','Jazz'],
  ['Suuns','QC','Rock'],
  ['BIG BRAVE','QC','Rock'],
  ['Godspeed You Black Emperor','QC','Rock'],
  ['Silver Mt Zion','QC','Rock'],
  ['Do Make Say Think','ON','Rock'],
  ['Eric Chenaux','ON','Experimental'],
  ['Kelly McMichael','NL','Folk'],
  ['Haley Blais','BC','Folk'],
  ['Luna Li','ON','Pop'],
  ['Talk','ON','Pop'],
  ['Allie X','ON','Pop'],
  ['Charlotte Cornfield','ON','Folk'],
  ['Leith Ross','ON','Folk'],
  ['Sasha Cay','ON','Folk'],
  ['Elissa Mielke','ON','Folk'],
  ['Nicole Dollanganger','ON','Folk'],
  ['Ducks Ltd','ON','Rock'],
  ['Jay Wood','MB','Pop'],
  ['Amos the Kid','MB','Folk'],
  ['Weather Station','ON','Folk'],
  ['Born Ruffians','ON','Rock'],
  ['Braids','QC','Electronic'],
  ['Doldrums','QC','Electronic'],
  ['Lungbutter','QC','Experimental'],
  ['Atsuko Chiba','QC','Rock'],
  ['Cold Specks','ON','Folk'],
  ['Lydia Ainsworth','ON','Electronic'],
  ['Bernice','ON','Pop'],
  ['Isla Craig','ON','Folk'],
  ['Mary Margaret OHara','ON','Rock'],
  ['Hannah Georgas','BC','Pop'],
  ['Becca Stevens','ON','Folk'],
  ['Rose Cousins','NL','Folk'],
  ['Duane Andrews','NL','Folk'],
  ['Hey Rosetta','NL','Rock'],
  ['Shanneyganock','NL','Folk'],
  ['Matthew Barber','ON','Folk'],
  ['Oh Susanna','ON','Country'],
  ['Lindi Ortega','ON','Country'],
  ['Tokyo Police Club','ON','Rock'],
  ['Hollerado','ON','Rock'],
  ['Hey Ocean','BC','Pop'],
  ['Bend Sinister','BC','Rock'],
  ['The Pack AD','BC','Rock'],
  ['Black Mountain','BC','Rock'],
  ['Bison BC','BC','Metal'],
  ['Woolworm','BC','Rock'],
  ['Tough Age','BC','Rock'],
  ['Dumb','BC','Rock'],
  ['Lab Coast','AB','Rock'],
  ['Ghostkeeper','AB','Rock'],
  ['Miesha and the Spanks','AB','Rock'],
  ['Shout Out Out Out Out','AB','Electronic'],
  ['Woodpigeon','AB','Folk'],
  ['Tonstartssbandht','QC','Rock'],
  ['Caracol','QC','Pop'],
  ['Beyries','QC','Folk'],
  ['Canailles','QC','Folk'],
  ['Avec Pas De Casque','QC','Folk'],
  ['Jenny Salgado','QC','Pop'],
  ['Etienne Fletcher','QC','R&B / Soul'],
  ['Kaya Hoax','QC','Pop'],
  ['Kenya Jade','ON','R&B / Soul'],
  ['Rochelle Jordan','ON','R&B / Soul'],
  ['Meghan Patrick','ON','Country'],
  ['Tenille Arts','SK','Country'],
  ['The Reklaws','ON','Country'],
  ['Jade Eagleson','ON','Country'],
  ['Dallas Smith','BC','Country'],
  ['Washboard Union','BC','Country'],
  ['Hunter Brothers','SK','Country'],
  ['Carolyn Dawn Johnson','AB','Country'],
  ['Emerson Drive','AB','Country'],
  ['Beverly Mahood','ON','Country'],
  ['Johnny Reid','ON','Country'],
  ['Aaron Pritchett','BC','Country'],
  ['River Town Saints','ON','Country'],
  ['Gord Bamford','AB','Country'],
  ['Brett Kissel','AB','Country'],
  ['Jason McCoy','ON','Country'],
  ['Jason Blaine','ON','Country'],
  ['Michelle Wright','ON','Country'],
  ['Terri Clark','AB','Country'],
  ['Tim Hus','AB','Country'],
  ['Tom Wilson','ON','Rock'],
  ['Blackie and the Rodeo Kings','ON','Country'],
  ['MonkeyJunk','ON','Blues'],
  ['Colin Linden','ON','Blues'],
  ['Suzie Vinnick','ON','Blues'],
  ['Steve Strongman','ON','Blues'],
  ['Jack de Keyzer','ON','Blues'],
  ['Jim Byrnes','BC','Blues'],
  ['Rita Chiarelli','ON','Blues'],
  ['Jeff Healey','ON','Blues'],
  ['Sue Foley','ON','Blues'],
  ['Corin Raymond','ON','Folk'],
  ['Don Ross','NS','Folk'],
  ['Dave Carroll','NS','Folk'],
  ['Gordie Sampson','NS','Folk'],
  ['Matt Anderson','NB','Folk'],
  ['Michel Donato','QC','Jazz'],
  ['Karen Young','QC','Jazz'],
  ['PJ Perry','AB','Jazz'],
  ['Wes Montgomery type','BC','Jazz'],
  ['Cory Weeds','BC','Jazz'],
  ['Brad Turner','BC','Jazz'],
  ['Ron Samworth','BC','Jazz'],
  ['Metalwood','BC','Jazz'],
  ['Fred Hersch','ON','Jazz'],
  ['Robi Botos','ON','Jazz'],
  ['Kirk MacDonald','ON','Jazz'],
  ['Ernesto Diaz','ON','Jazz'],
  ['Perry White','ON','Jazz'],
  ['Phil Nimmons','ON','Jazz'],
  ['Kelly Jefferson','ON','Jazz'],
  ['Joe Sullivan','ON','Jazz'],
  ['Alex Pangman','ON','Jazz'],
  ['Kellylee Evans','ON','Jazz'],
  ['Tara Davidson','ON','Jazz'],
  ['Champian Fulton','ON','Jazz'],
  ['Chippy Nonstop','ON','Electronic'],
  ['Nuela Charles','ON','R&B / Soul'],
  ['MSTRKRFT','ON','Electronic'],
  ['Chromeo','QC','Electronic'],
  ['Mustard Plug','ON','Punk'],
  ['Single Mothers','ON','Punk'],
  ['Mobina Galore','MB','Punk'],
  ['PONY','ON','Rock'],
  ['Breeze','ON','Rock'],
  ['Motorists','ON','Rock'],
  ['Stuck Out Here','ON','Rock'],
  ['Cola','ON','Rock'],
  ['The Courtneys','BC','Rock'],
  ['Booji Boys','NS','Punk'],
  ['Construction and Destruction','NS','Rock'],
  ['Reeny Smith','NS','Folk'],
  ['Sultans of String','ON','World'],
  ['Kobo Town','ON','World'],
  ['Nomadic Massive','QC','Hip-Hop'],
  ['Jay Critch','ON','Hip-Hop'],
  ['Travi','ON','Hip-Hop'],
  ['Gordon Lightfoot','ON','Folk'],
  ['Neil Young','ON','Rock'],
  ['Joni Mitchell','BC','Folk'],
  ['Leonard Cohen','QC','Folk'],
  ['Ian and Sylvia Tyson','AB','Folk'],
  ['Rush','ON','Rock'],
  ['The Guess Who','MB','Rock'],
  ['Bachman-Turner Overdrive','MB','Rock'],
  ['BTO','MB','Rock'],
  ['The Band','ON','Rock'],
  ['Lighthouse','ON','Rock'],
  ['Edward Bear','ON','Rock'],
  ['Max Webster','ON','Rock'],
  ['Stonebwoy','ON','World'],
  ['Quake Matthews','NS','Hip-Hop'],
  ['Slowcoaster','NS','Rock'],
  // -- R&B / SOUL EXPANSION --
  ['Jon Vinyl','ON','R&B / Soul'],
  ['Aqyila','ON','R&B / Soul'],
  ['Shay Lia','QC','R&B / Soul'],
  ['Tanika Charles','ON','R&B / Soul'],
  ['Amaal','ON','R&B / Soul'],
  ['LU KALA','QC','R&B / Soul'],
  ['Modlee','QC','R&B / Soul'],
  ['Rau Ze','QC','R&B / Soul'],
  ['JT Soul','QC','R&B / Soul'],
  ['Fernie','QC','R&B / Soul'],
  ['Jahmal Padmore','ON','R&B / Soul'],
  ['Jahkoy','ON','R&B / Soul'],
  ['Allie','ON','R&B / Soul'],
  ['Tika','ON','R&B / Soul'],
  ['Loony','ON','R&B / Soul'],
  ['Emanuel','ON','R&B / Soul'],
  ['Clerel','QC','R&B / Soul'],
  ['Aphrose','ON','R&B / Soul'],
  ['Seth Dyer','ON','R&B / Soul'],
  ['rahiiim','ON','R&B / Soul'],
  ['Malachi','ON','R&B / Soul'],
  ['Lydia Persaud','ON','R&B / Soul'],
  ['Henry Nozuka','ON','R&B / Soul'],
  ['Jordel','BC','R&B / Soul'],
  ['Aysanabee','ON','R&B / Soul'],
  ['Kai Samuels','ON','R&B / Soul'],
  ['Ivana Santilli','ON','R&B / Soul'],
  ['Massari','ON','R&B / Soul'],
  ['Dragonette','ON','Pop'],
  ['Ndidi O','ON','R&B / Soul'],
  ['DACEY','BC','R&B / Soul'],
  ['Caity Gyorgy','BC','R&B / Soul'],
  ['Desiire','ON','R&B / Soul'],
  ['Pierre Kwenders','QC','R&B / Soul'],
  ['Lisa-Li Okoye','QC','R&B / Soul'],
  ['Josh Ross','ON','Pop'],
  ['Curtis Waters','AB','Pop'],
  ['Jah Mila','NS','R&B / Soul'],
  // -- HIP-HOP EXPANSION ROUND 2 --
  ['Majid Jordan','ON','R&B / Soul'],
  ['Eric Reprid','ON','Hip-Hop'],
  ['NorthSideBenji','ON','Hip-Hop'],
  ['Jevon','ON','Hip-Hop'],
  ['Peter Jackson','ON','Hip-Hop'],
  ['Dom Dias','ON','Hip-Hop'],
  ['Kimmortal','BC','Hip-Hop'],
  ['Tommy Genesis','BC','Hip-Hop'],
  ['Missy D','BC','Hip-Hop'],
  ['Kresnt','BC','Hip-Hop'],
  ['Dream Warriors','ON','Hip-Hop'],
  ['Rascalz','BC','Hip-Hop'],
  ['Checkmate','BC','Hip-Hop'],
  ['Thrust','BC','Hip-Hop'],
  ['Ghetto Concept','ON','Hip-Hop'],
  ['Dan-e-o','ON','Hip-Hop'],
  ['Baby Blue Soundcrew','ON','Hip-Hop'],
  ['Jacksoul','ON','Hip-Hop'],
  ['Main Source','ON','Hip-Hop'],
  ['Jelleestone','ON','Hip-Hop'],
  ['Sixtoo','NS','Hip-Hop'],
  ['Snow','ON','Hip-Hop'],
  ['Sebutones','NS','Hip-Hop'],
  ['Da Grassroots','ON','Hip-Hop'],
  ['Tara Chase','ON','Hip-Hop'],
  ['Honey Cocaine','ON','Hip-Hop'],
  ['Dubmatique','QC','Hip-Hop'],
  ['Muzion','QC','Hip-Hop'],
  ['Manu Militari','QC','Hip-Hop'],
  ['Sans Pression','QC','Hip-Hop'],
  ['Loco Locass','QC','Hip-Hop'],
  ['Sarahmee','QC','Hip-Hop'],
  ['Souldia','QC','Hip-Hop'],
  ['Anodajay','QC','Hip-Hop'],
  ['Omnikrom','QC','Hip-Hop'],
  ['Gatineau','QC','Hip-Hop'],
  ['Planet Giza','QC','Hip-Hop'],
  ['Lou Phelps','QC','Hip-Hop'],
  ['Maly','QC','Hip-Hop'],
  ['Imposs','QC','Hip-Hop'],
  ['Saint-Prince','QC','Hip-Hop'],
  ['AP Dhillon','ON','Hip-Hop'],
  ['Karan Aujla','BC','Hip-Hop'],
  ['Shubh','ON','Hip-Hop'],
  ['Gurinder Gill','BC','Hip-Hop'],
  ['Sarain Fox','ON','Hip-Hop'],
  ['Supaman','MB','Hip-Hop'],
  ['Phoenix Pagliacci','ON','Hip-Hop'],
  ['Lex Leosis','ON','Hip-Hop'],
  ['Keysha Freshh','ON','Hip-Hop'],
  ['Boi-1da','ON','Hip-Hop'],
  ['Murda Beatz','ON','Hip-Hop'],
  ['WondaGurl','ON','Hip-Hop'],
  ['Nineteen85','ON','Hip-Hop'],
  ['Frank Dukes','ON','Hip-Hop'],
  ['DijahSB','ON','Hip-Hop'],
  ['Junia-T','ON','Hip-Hop'],
  ['Sargeant X Comrade','ON','Hip-Hop'],
  ['Prevail','BC','Hip-Hop'],
  ['Gruf','MB','Hip-Hop'],
  ['Rollie Pemberton','AB','Hip-Hop'],
  ['Knaan','ON','Hip-Hop'],
  // -- EXPANDED SEED: JUNO NOMINEES, POLARIS PRIZE, ALL ERAS --
  // POP
  ['Andy Kim','QC','Pop'],
  ['Corey Hart','QC','Pop'],
  ['Men Without Hats','QC','Pop'],
  ['Glass Tiger','ON','Pop'],
  ['Kim Mitchell','ON','Pop'],
  ['Platinum Blonde','ON','Pop'],
  ['Martha and the Muffins','ON','Pop'],
  ['Neon Dreams','NS','Pop'],
  ['Virginia to Vegas','ON','Pop'],
  ['Ria Mae','NS','Pop'],
  // R&B / SOUL
  ['Charlotte Day Wilson','ON','R&B / Soul'],
  // POP
  ['Nikki Yanofsky','QC','Pop'],
  // FOLK
  ['Danny Michel','ON','Folk'],
  ['Jim Bryson','ON','Folk'],
  // POP
  ['Emm Gryner','ON','Pop'],
  ['Amanda Marshall','ON','Pop'],
  ['Roxanne Potvin','ON','Pop'],
  ['Isabelle Boulay','QC','Pop'],
  ['Alex Nevsky','QC','Pop'],
  ['Vincent Valliere','QC','Pop'],
  // ROCK
  ['Les Trois Accords','QC','Rock'],
  // COUNTRY
  ['Cayouche','NB','Country'],
  // ROCK
  ['Joel Plaskett Emergency','NS','Rock'],
  // POP
  ['The Heavy Blinkers','NS','Pop'],
  ['Erin Costelo','NS','Pop'],
  // FOLK
  ['Pamela Morgan','NL','Folk'],
  // ROCK
  ['Sam Roberts Band','QC','Rock'],
  ['The Besnard Lakes','QC','Rock'],
  // POP
  ['TOPS','QC','Pop'],
  // FOLK
  ['Leif Vollebekk','QC','Folk'],
  // ROCK
  ['Young Galaxy','QC','Rock'],
  ['Bran Van 3000','QC','Rock'],
  ['The Box','QC','Rock'],
  ['Tea Party','ON','Rock'],
  ['Big Wreck','NS','Rock'],
  ['Arkells','ON','Rock'],
  ['July Talk','ON','Rock'],
  // ELECTRONIC
  ['Austra','ON','Electronic'],
  ['Holy Fuck','ON','Electronic'],
  ['TR/ST','ON','Electronic'],
  ['Peaches','ON','Electronic'],
  // FOLK
  ['Basia Bulat','ON','Folk'],
  ['Timber Timbre','ON','Folk'],
  // ELECTRONIC
  ['Humans','BC','Electronic'],
  // ROCK
  ['Matthew Good Band','BC','Rock'],
  ['Loverboy','AB','Rock'],
  ['The Dudes','AB','Rock'],
  ['Trooper','BC','Rock'],
  ['Chilliwack','BC','Rock'],
  ['Prism','BC','Rock'],
  // FOLK
  ['Spirit of the West','BC','Folk'],
  // PUNK
  ['The Real McKenzies','BC','Punk'],
  // ROCK
  ['Cub','BC','Rock'],
  ['Bif Naked','BC','Rock'],
  ['The Watchmen','MB','Rock'],
  ['Crash Test Dummies','MB','Rock'],
  ['April Wine','NS','Rock'],
  ['The Trews','NS','Rock'],
  ['Super Friendz','NS','Rock'],
  ['The Sheepdogs','SK','Rock'],
  ['Bedouin Soundclash','ON','Rock'],
  ['Tom Cochrane','ON','Rock'],
  ['Edwin','ON','Rock'],
  // POP
  ['Faber Drive','BC','Pop'],
  // FOLK
  ['Cowboy Junkies','ON','Folk'],
  // COUNTRY
  ['Blue Rodeo','ON','Country'],
  ['Prairie Oyster','ON','Country'],
  // ROCK
  ['Colin James','SK','Rock'],
  // JAZZ
  ['Holly Cole','NS','Jazz'],
  // POP
  ['Chantal Kreviazuk','MB','Pop'],
  ['Jann Arden','AB','Pop'],
  // ROCK
  ['The Unicorns','QC','Rock'],
  // HIP-HOP
  ['Killy','ON','Hip-Hop'],
  ['88GLAM','ON','Hip-Hop'],
  ['Tom MacDonald','BC','Hip-Hop'],
  ['Dax','ON','Hip-Hop'],
  ['Bishop Brigante','ON','Hip-Hop'],
  ['Moka Only','BC','Hip-Hop'],
  ['Factor Chandelier','SK','Hip-Hop'],
  ['Snoopy','QC','Hip-Hop'],
  ['Baka Not Nice','ON','Hip-Hop'],
  // R&B / SOUL
  ['Melanie Fiona','ON','R&B / Soul'],
  ['Ammoye','ON','R&B / Soul'],
  ['Kreesha Turner','ON','R&B / Soul'],
  // ELECTRONIC
  ['Crystal Castles','ON','Electronic'],
  ['Venetian Snares','MB','Electronic'],
  ['Excision','BC','Electronic'],
  ['Rezz','ON','Electronic'],
  ['Apashe','QC','Electronic'],
  ['Tim Hecker','QC','Electronic'],
  ['Loscil','BC','Electronic'],
  ['A-Trak','QC','Electronic'],
  ['Poirier','QC','Electronic'],
  ['Ryan Playground','QC','Electronic'],
  ['Essaie Pas','QC','Electronic'],
  ['Milk & Bone','QC','Electronic'],
  ['Rich Aucoin','NS','Electronic'],
  ['Zeds Dead','ON','Electronic'],
  ['Datsik','BC','Electronic'],
  ['Orphx','ON','Electronic'],
  ['Savant','ON','Electronic'],
  // METAL
  ['Unexpect','QC','Metal'],
  ['Beneath the Massacre','QC','Metal'],
  ['Neuraxis','QC','Metal'],
  ['The Agonist','QC','Metal'],
  ['Kataklysm','QC','Metal'],
  ['Gorguts','QC','Metal'],
  ['Augury','QC','Metal'],
  ['Ion Dissonance','QC','Metal'],
  ['Kobra and the Lotus','AB','Metal'],
  ['Unleash the Archers','BC','Metal'],
  ['Archspire','BC','Metal'],
  ['Anciients','BC','Metal'],
  ['Baptists','BC','Metal'],
  ['Bison','BC','Metal'],
  ['Razor','ON','Metal'],
  ['Anvil','ON','Metal'],
  ['Exciter','ON','Metal'],
  ['Sacrifice','ON','Metal'],
  ['Helix','ON','Metal'],
  ['Killer Dwarfs','ON','Metal'],
  // ROCK
  ['Triumph','ON','Rock'],
  ['Saga','ON','Rock'],
  ['Coney Hatch','ON','Rock'],
  ['Brighton Rock','ON','Rock'],
  // METAL
  ['Kick Axe','SK','Metal'],
  ['Threat Signal','ON','Metal'],
  ['Quo Vadis','QC','Metal'],
  ['Martyr','QC','Metal'],
  // COUNTRY
  ['Stompin Tom Connors','NB','Country'],
  ['Hank Snow','NS','Country'],
  // FOLK
  ['The Rankin Family','NS','Folk'],
  ['Natalie MacMaster','NS','Folk'],
  ['Ashley MacIsaac','NS','Folk'],
  ['The Barra MacNeils','NS','Folk'],
  ['Rita MacNeil','NS','Folk'],
  ['Jimmy Rankin','NS','Folk'],
  ['Valdy','BC','Folk'],
  ['Shari Ulrich','BC','Folk'],
  ['Willie P. Bennett','ON','Folk'],
  ['Garnet Rogers','ON','Folk'],
  ['Stan Rogers','NS','Folk'],
  ['Sylvia Tyson','AB','Folk'],
  ['Ian and Sylvia','AB','Folk'],
  // WORLD
  ['Lhasa de Sela','QC','World'],
  // POP
  ['Rufus Wainwright','QC','Pop'],
  ['Martha Wainwright','QC','Pop'],
  // FOLK
  ['Kate and Anna McGarrigle','QC','Folk'],
  // POP
  ['Robert Charlebois','QC','Pop'],
  // FOLK
  ['Gilles Vigneault','QC','Folk'],
  ['Felix Leclerc','QC','Folk'],
  ['The Bills','ON','Folk'],
  ['Good Lovelies','ON','Folk'],
  ['The Wailin Jennys','MB','Folk'],
  // COUNTRY
  ['Del Barber','MB','Country'],
  // FOLK
  ['William Prince','MB','Folk'],
  ['John K Samson','MB','Folk'],
  // COUNTRY
  ['The Bros Landreth','MB','Country'],
  // FOLK
  ['Steve Bell','MB','Folk'],
  ['Allison Russell','QC','Folk'],
  // POP
  ['Elisapie','QC','Pop'],
  // FOLK
  ['Beatrice Deer','QC','Folk'],
  // WORLD
  ['Cris Derksen','AB','World'],
  ['Northern Cree','AB','World'],
  // JAZZ
  ['Carol Welsman','ON','Jazz'],
  ['Ranee Lee','QC','Jazz'],
  ['Jodi Proznick','BC','Jazz'],
  ['Mike Murley','ON','Jazz'],
  ['David Braid','ON','Jazz'],
  ['Larnell Lewis','ON','Jazz'],
  ['Don Thompson','ON','Jazz'],
  ['Guido Basso','QC','Jazz'],
  ['Vic Vogel','QC','Jazz'],
  ['Lorraine Desmarais','QC','Jazz'],
  ['Francois Bourassa','QC','Jazz'],
  ['Molly Johnson','ON','Jazz'],
  ['Matt Dusk','ON','Jazz'],
  // CLASSICAL
  ['Ana Sokolovic','QC','Classical'],
  ['Brian Current','ON','Classical'],
  ['Christos Hatzis','ON','Classical'],
  ['Gary Kulesha','ON','Classical'],
  ['Chan Ka Nin','ON','Classical'],
  // FOLK
  ['Lambchop','ON','Folk'],
  // ROCK
  ['OMBIIGIZI','ON','Rock'],
  // EXPERIMENTAL
  ['James Leyland Kirby','ON','Experimental'],
  // POP
    ['Emile Bilodeau','QC','Pop'],
  // HIP-HOP
  ['Webster','QC','Hip-Hop'],
  // ROCK
  ['Saratoga','QC','Rock'],
  // FOLK
  ['Navet Confit','QC','Folk'],
  ['Avec Pas D Casque','QC','Folk'],
  // ROCK
  ['Galaxie','QC','Rock'],
  ['Bandits Manolos','QC','Rock'],
  // ELECTRONIC
  ['Ponctuation','QC','Electronic'],
  // CLASSICAL
  ['Walter Buczynski','ON','Classical'],
  // POP
  ['La Force','QC','Pop'],
  // FOLK
  ['Helena Deland','QC','Folk'],
  ['Yves Jarvis','QC','Folk'],
  // ROCK
  ['Paul Jacobs','QC','Rock'],
  ['Fleece','QC','Rock'],
  // FOLK
  ['Mark Bragg','NL','Folk'],
  // HIP-HOP
  ['Kaytramine','QC','Hip-Hop'],
  // FOLK
  ['Tara Williamson','MB','Folk'],
  // HIP-HOP
  ['John Orpheus','ON','Hip-Hop'],
  ['Brockhampton','ON','Hip-Hop'],
  // R&B / SOUL
  ['Sate','ON','R&B / Soul'],

  ['Shantel May','ON','R&B/Soul'],
  // -- ROUND 10: Polaris gaps, Juno 2024-25, emerging --
  // ROCK
  ['Karkwa','QC','Rock'],              // Montreal francophone indie rock, Polaris 2010 winner, reunited 2023
  ['Softcult','ON','Rock'],            // Kitchener ON shoegaze grunge duo, Juno nominated 2024 Alternative Album of the Year
  // FOLK
  ['Arielle Soucy','QC','Folk'],       // Montreal folk singer-songwriter, Polaris 2024 longlist, ADISQ 2024 Revelation of the Year
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