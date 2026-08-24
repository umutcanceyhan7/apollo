/* Apollo Films — catalogue data.
   Every entry is scraped from apollofilms.co: title, category and still are real.
   `client` is split out of the original title so the card can show the film big
   and the client small (see README). No years are invented — add a `year` field
   to any entry and the UI will render it.

   Only the films we hold a delivered credit roll for carry crew and cast
   (see CREDITS below). The rest carry none — a film with no roll prints no
   crew section rather than invented names. */

const CDN = 'https://images.squarespace-cdn.com/content/v1/6800c8341300e144920e7dc1';

/* ---- Footage ---------------------------------------------------------
   One filename per film, used to build two URLs.

   The 12s silent loops in assets/films/loops ship with the repo — they are
   what the hero and catalogue stages play behind type, and at ~2 MB each the
   whole set is 38 MB. The full cuts do NOT ship: the masters run 780 MB and
   two of them are over GitHub's 100 MB per-file ceiling, so they live on a
   media host instead.

   Point FULL at that host and every film page picks up its full cut. Leave it
   empty and the player falls back to the loop, which is honest but short. */

const FULL = '';   // e.g. 'https://media.apollofilms.co/films'

const FILE = {
  clubMarvy:    'club_marvy_v1 (720p).mp4',
  constanze:    'constanze_in_istanbul_v1 (720p).mp4',
  dagi:         'dagi_islands_v1 (720p).mp4',
  leoneDining:  'drole_de_monsieur_-_il_leone_v1 (720p) (1).mp4',
  leone:        'drole_de_monsieur_-_il_leone_v1 (720p).mp4',
  drole1:       'drole_de_monsieur_v1 (720p).mp4',
  drole2:       'drole_de_monsieur_v1 (720p) (1).mp4',
  drole3:       'drole_de_monsieur_v1 (720p) (2).mp4',
  drole4:       'drole_de_monsieur_v1 (720p) (3).mp4',
  vienna:       'drykorn_-_midnight_in_vienna_v1 (720p).mp4',
  jack:         'jack_daniels_-_jack_lives_here_v1 (720p).mp4',
  koton:        'koton_-_blue_voyage_v1 (720p).mp4',
  laCasa:       'la_casa_de_raisa_vanessa_v1 (720p).mp4',
  laCasaTr:     'la_casa_de_raisa_vanessa_teaser_v1 (720p).mp4',
  leija:        'leija_v1 (720p).mp4',
  penti:        'penti_beach_v1 (720p).mp4',
  atelier:      'rafael_indiana_-_atelier_v1 (720p).mp4',
  aurea:        'rafael_indiana_-_aurea_somnia_v1 (720p).mp4',
  mirage:       'rafael_indiana_-_mirage_v1 (720p).mp4',
  serpenteTr:   'raisa_vanessa_-_amore_serpente_trailer_v1 (720p).mp4',
  serpente:     'raisa_vanessa_-_amore_serpente_v1 (720p).mp4',
  odyssey:      'shopigo_-_a_summer_odyssey_v1 (720p).mp4',
  summerLovers: 'siedres_x_rafael_indiana_-_summer_lovers_v1 (720p).mp4',
  cape:         'xo_cape_arnna_v1 (720p).mp4'
};

/* encodeURI handles the spaces and parens in the delivered filenames. */
const REEL = {};
const CUT = {};
Object.keys(FILE).forEach(function (k) {
  REEL[k] = encodeURI('assets/films/loops/' + FILE[k]);
  CUT[k] = FULL ? encodeURI(FULL + '/' + FILE[k]) : null;
});

/* ---- Real credits ----------------------------------------------------
   Transcribed from the delivered credit rolls (metadata.txt). These are
   the only films we hold real crew for; every other entry ships without
   a crew block until its roll arrives.

   The source rolls are set in caps, as credit rolls are. They're stored
   title-cased here to sit in the same voice as the rest of the site, with
   Turkish orthography restored — caps hide the ı/i and ş/s distinctions,
   so KILICARSLAN is Kılıçarslan and SAHIN is Şahin.

   A handful of surnames are genuinely ambiguous from caps alone and are
   marked `??` below. They are best guesses; check them against the crew
   before launch. */

const CREDITS = {

  mirage: [
    { role: 'Creative Direction', name: 'Rafael Cemo Çetin' },
    { role: 'Producer', name: 'Orfeo Çetin' },
    { role: 'Executive Producer', name: 'Hazer Baycan' },
    { role: 'Executive Producer', name: 'Tuğba Akpınar' },
    { role: 'First A.D.', name: 'Ellis Kaan Özen' },
    { role: 'Second A.D.', name: 'Nur Sude Mollakdakı' },       // ?? MOLLAKDAKI
    { role: 'Edit', name: 'Ahmet Sarımeşe' },                   // ?? SARIMESE
    { role: 'Colour Correction', name: 'Emre Karagöz · Postbrothers' },
    { role: 'Photography', name: 'Mustafa Nurdoğdu' },
    { role: 'Photography Assistant', name: 'Cengizhan Ergün' },
    { role: 'Focus Puller', name: 'Kerim Hacıoğlu' },
    { role: 'Camera Assistant', name: 'Hasan Emre Ural' },
    { role: 'DIT', name: 'Alihan Kara' },
    { role: 'Sound Operator', name: 'Semih' },
    { role: 'Art Design', name: 'Günsu Sarı' },
    { role: 'Styling', name: 'Umut Sımsıkı & Günsu Sarı' },     // ?? SIMSIKI
    { role: 'Storyboard', name: 'Ali Ömer Erener' },
    { role: 'Dialogue Consultant', name: 'Alper Pala' },
    { role: 'Poster Design', name: 'Gökhan Yeter' },
    { role: 'Production Manager', name: 'Onur Yanak' },
    { role: 'Production Assistant', name: 'Recep Yanak' },
    { role: 'Production Assistant', name: 'Samet Atak' },
    { role: 'Production Assistant', name: 'Eda Kılıçarslan' },
    { role: 'Backstage', name: 'Mehmet Ali Gök' }
  ],

  laCasa: [
    { role: 'Written & Directed', name: 'Rafael Cemo Çetin' },
    { role: 'Cinematographer', name: 'Yakup Algül' },
    { role: 'Production', name: 'Kala Film' }
  ],

  constanze: [
    { role: 'Written & Directed', name: 'Rafael Cemo Çetin' },
    { role: 'Cinematographer', name: 'Yakup Akgül' },
    { role: 'Executive Producer', name: 'Cüneyt Utkular' },
    { role: 'Producer', name: 'Hakan Atasoy' },
    { role: 'Line Producer', name: 'Ahmet İlhan' },
    { role: '1st Assistant Director', name: 'Defne Bayrakgil' },
    { role: 'Art Director', name: 'Umut Akan' },
    { role: 'Photography', name: "Finn O'Hanlon" },
    { role: 'Focus Puller', name: 'Tayfun Özkurt' },
    { role: 'Ronin', name: 'Furkan Şahin' },
    { role: 'Ronin Assistant', name: 'Kadir Özbek' },
    { role: 'Camera Assistant', name: 'Fatih Telli' },
    { role: 'DIT', name: 'Fatih Duman' },
    { role: 'Drone Operator', name: 'Esat İnci' },
    { role: 'Gaffer', name: 'Can Yılmaz' },
    { role: 'Hair & Makeup', name: 'Havva Toylar' },
    { role: 'Hair & Makeup', name: 'Yasemin Karataş' },
    { role: 'Fashion Designer', name: 'Raisa & Vanessa' },
    { role: 'Production Manager', name: 'Göksel Kurtoğlu' },
    { role: 'Location Manager', name: 'Recep Yanak' },
    { role: 'Set Manager', name: 'Savaş Tozlu' },
    { role: 'Set', name: 'Osman Yıldırım' },
    { role: 'Operation', name: 'Barış Asil' },                  // ?? ASIL / ASIL
    { role: 'Production Assistant', name: 'Aysel Şahin' },
    { role: 'Production Assistant', name: 'Selcan Rana Genç' },
    { role: 'Production Assistant', name: 'Yunus Emre Kul' },
    { role: 'Production Assistant', name: 'Bora Sungun' },
    { role: 'Production', name: 'Kala Film' }
  ]

};

const CAST = {

  mirage: [
    { role: 'Fisherman Father', name: 'Demir Barışcan' },       // ?? BARISCAN
    { role: 'Local Gambler', name: 'Hasan Dostelmaş' },         // ?? DOSTELMAS
    { role: 'Local Gambler', name: 'Mustafa' }
  ],

  laCasa: [
    { role: 'Starring', name: 'Berrak Tüzünataç' },
    { role: 'Starring', name: 'Teoman' },
    { role: 'Starring', name: 'Yaz Yüceil' }
  ],

  constanze: [
    { role: 'Actress', name: 'Dilan Çiçek Deniz' },
    { role: 'Stylist & Singer', name: 'Hakan Bahar' },
    { role: 'Photographer', name: 'Dinçer İşgel' },
    { role: 'Cello Player', name: 'Jamal Aliyev' }
  ]

};

/* The La Casa roll carries a long tail of names and companies with no role
   against them. They're kept as a flat list rather than guessed at. */
const ALSO = {
  laCasa: [
    'Tuğba Akkırpı', 'Yakup Akkırpı', 'Önder Yanar', 'Yusuf Yılmazsoy',
    'Mustafa Asırlıoğlu', 'Müge Sürerkan', 'Hüseyin Barış Bozatlı',
    'Karaca Çetin', 'Melis Lasoğlu', 'Mustafa Akpınar', 'Umut Çarıkçı',
    'Mert Yemenoğlu', 'Günişiği Tunç', 'Nisa Akbaş', 'Ahmet Sarmişçe',
    'Gökhan Yeter', 'Hazar Baykan', 'Dart Digital', 'Macbesic Studios',
    'Kala Film'
  ]
};

/* ---- Key art --------------------------------------------------------
   The posters delivered with the behind-the-scenes set, filed by the film
   each was cut for (assets/posters/posters.md carries the full table —
   every title there was read off the poster itself, not off a filename).

   Stems only: each ships at two sizes, `-thumb.webp` at 640px and
   `-view.webp` at 1600px, and the page picks between them with srcset.

   The catalogue holds some of these films twice — the full cut and its
   trailer, the same shoot cut two ways — and one set of key art covers
   both, so those slugs share a list rather than the second one printing
   no posters at all. */

const POSTER_DIR = 'assets/posters/';

const POSTERS = {
  mirage: ['mirage-01', 'mirage-02'],
  amoreserpente: ['amoreserpente-01', 'amoreserpente-02', 'amoreserpente-03'],
  raisavanessa: [
    'raisavanessa-01', 'raisavanessa-02', 'raisavanessa-03', 'raisavanessa-04'
  ],
  'siedres-x-rafael-indiana-summer-lovers': [
    'siedres-x-rafael-indiana-summer-lovers-01',
    'siedres-x-rafael-indiana-summer-lovers-02',
    'siedres-x-rafael-indiana-summer-lovers-03',
    'siedres-x-rafael-indiana-summer-lovers-04',
    'siedres-x-rafael-indiana-summer-lovers-05',
    'siedres-x-rafael-indiana-summer-lovers-06'
  ],
  'drole-de-monsieur-ii-leone': ['drole-de-monsieur-ii-leone'],
  '3ckc59fzd7gx74wxljygglmg8ga5kh': [
    'constanze-in-istanbul-01', 'constanze-in-istanbul-02', 'constanze-in-istanbul-03'
  ],
  'shopigo-a-summer-odyssey': ['shopigo-a-summer-odyssey'],
  aureasomnia: ['aureasomnia']
};

/* The second cut of a film carries the same key art. */
POSTERS.raisavanessa2 = POSTERS.raisavanessa;
POSTERS.amoreserpente2 = POSTERS.amoreserpente;
POSTERS['drole-de-monsieur-ii-leone-dining'] = POSTERS['drole-de-monsieur-ii-leone'];

window.APOLLO_FILMS = [
  {
    slug: 'drole-de-monsieur-ii-leone-dining',
    title: 'Il Leone — Dining',
    client: 'Drôle De Monsieur',
    category: 'Brand Works',
    still: CDN + '/73f6e5ec-99b2-44a7-8c2b-08fe4522f5d3/Drole_de_Monsieur_-_Il_Leone_1172805251thumbnail.jpg',
    video: REEL.leoneDining
  },
  {
    slug: 'drole-de-monsieur-ii-leone',
    title: 'Il Leone',
    client: 'Drôle De Monsieur',
    category: 'Brand Works',
    still: CDN + '/38883601-0a00-4dd8-af6a-9ca925fb3d8d/Drole_de_Monsieur_-_Il_Leone_1168554475thumbnail.jpg',
    video: REEL.leone
  },
  {
    slug: 'xo-cape-arnna',
    title: 'Cape Arnna',
    client: 'XO',
    category: 'Brand Works',
    still: CDN + '/420f5b0f-2b63-405a-9d02-2730bd95776d/XO_Cape_Arnna_1168563603thumbnail.jpg',
    video: REEL.cape
  },
  {
    slug: 'siedres-x-rafael-indiana-summer-lovers',
    title: 'Summer Lovers',
    client: 'Siedres × Rafael Indiana',
    category: 'Short Films',
    still: CDN + '/dac8740d-b75f-4638-a666-e699034a3fec/Siedres_x_Rafael_Indiana_-_Summer_Lovers_1133567941thumbnail.jpg',
    video: REEL.summerLovers
  },
  {
    slug: 'shopigo-a-summer-odyssey',
    title: 'A Summer Odyssey',
    client: 'Shopigo',
    category: 'Brand Works',
    still: CDN + '/4c5eb1a1-e1cb-469e-9e82-b8a0a857798c/Shopigo_-_A_Summer_Odyssey_1122019034thumbnail.jpg',
    video: REEL.odyssey
  },
  {
    slug: 'drykorn-midnight-in-vienna',
    title: 'Midnight in Vienna',
    client: 'Drykorn',
    category: 'Brand Works',
    still: CDN + '/2e4a696b-9a01-462a-ba1b-5a5424469848/Drykorn_-_Midnight_in_Vienna_1133435923thumbnail.jpg',
    video: REEL.vienna
  },
  {
    slug: '3ckc59fzd7gx74wxljygglmg8ga5kh',
    title: 'Constanze in Istanbul',
    client: 'Apollo Films',
    category: 'Short Films',
    still: CDN + '/76fb7bfe-c450-45dc-81d4-747a14a29a34/Constanze_in_Istanbul_1122031299thumbnail.jpg',
    video: REEL.constanze,
    credits: CREDITS.constanze,
    cast: CAST.constanze
  },
  {
    slug: 'raisavanessa2',
    title: 'La Casa De Raisa Vanessa',
    client: 'Raisa Vanessa',
    category: 'Short Films',
    still: CDN + '/79cc464e-124d-4273-8f0f-e5a682abe575/La_Casa_De_Raisa_Vanessa_1133585588thumbnail.jpg',
    hero: CDN + '/eae7bf91-d0b0-471a-b153-ae761f860172/LA+CASA+DE+RAISA+VANESSA.JPG',
    video: REEL.laCasa,
    credits: CREDITS.laCasa,
    cast: CAST.laCasa,
    alsoCredited: ALSO.laCasa
  },
  {
    slug: 'amoreserpente2',
    title: 'Amore Serpente',
    client: 'Raisa Vanessa',
    category: 'Short Films',
    still: CDN + '/6ab2f744-4c48-475b-9119-d50f8f376e33/Raisa_Vanessa_-_Amore_Serpente_1122243071thumbnail.jpg',
    video: REEL.serpente
  },
  {
    slug: 'raisavanessa',
    title: 'La Casa De Raisa Vanessa',
    client: 'Raisa Vanessa',
    category: 'Trailers',
    still: CDN + '/22edfda1-e70e-4956-9498-fd15f93c8d63/La_Casa_De_Raisa_Vanessa_Teaser_1122244675thumbnail.jpg',
    video: REEL.laCasaTr,
    credits: CREDITS.laCasa,
    cast: CAST.laCasa,
    alsoCredited: ALSO.laCasa
  },
  {
    slug: 'amoreserpente',
    title: 'Raisa Vanessa Amore Serpente',
    client: 'Raisa Vanessa',
    category: 'Trailers',
    still: CDN + '/21e85106-5b58-47f7-a56e-bc240bae2a8f/Raisa_Vanessa_-_Amore_Serpente_Trailer_1122246053thumbnail.jpg',
    video: REEL.serpenteTr
  },
  {
    slug: 'drole1',
    title: 'Drôle De Monsieur',
    client: 'Drôle De Monsieur · Film I',
    category: 'Brand Works',
    still: CDN + '/5d4e183a-f1a0-4bf9-b7d2-b59266a9ba1c/Drole_de_Monsieur_1122032670thumbnail.jpg',
    video: REEL.drole1
  },
  {
    slug: 'drole2',
    title: 'Drôle De Monsieur',
    client: 'Drôle De Monsieur · Film II',
    category: 'Brand Works',
    still: CDN + '/b1281d76-a627-44fa-a997-bb81302c4731/Drole_de_Monsieur_1122032834thumbnail.jpg',
    video: REEL.drole2
  },
  {
    slug: 'drole3',
    title: 'Drôle De Monsieur',
    client: 'Drôle De Monsieur · Film III',
    category: 'Brand Works',
    still: CDN + '/a2db7707-a3c5-4390-b9b0-f212893af9b2/Drole_de_Monsieur_1122223333thumbnail.jpg',
    video: REEL.drole3
  },
  {
    slug: 'drole4',
    title: 'Drôle De Monsieur',
    client: 'Drôle De Monsieur · Film IV',
    category: 'Brand Works',
    still: CDN + '/b3f398b3-b28e-4d14-9466-dce4911af57a/Drole_de_Monsieur_1122032199thumbnail.jpg',
    video: REEL.drole4
  },
  {
    slug: 'dagi',
    title: 'DAGI',
    client: 'DAGI × Birce Akalay',
    category: 'Brand Works',
    still: CDN + '/b9abafb1-a9bb-48b5-ad4c-6b02701ff2fd/Dagi_Islands_1122031538thumbnail.jpg',
    video: REEL.dagi
  },
  {
    slug: 'clubmarvy',
    title: 'Club Marvy',
    client: '',
    category: 'Brand Works',
    still: CDN + '/afa89f80-dcb6-406f-8991-5bc6cfc5fe4e/Club_Marvy_1122249863thumbnail.jpg',
    video: REEL.clubMarvy
  },
  {
    slug: 'aureasomnia',
    title: 'Aurea Somnia',
    client: 'Rafael Indiana',
    category: 'Short Films',
    still: CDN + '/10dc07c7-18d9-49a0-897e-64ded62dfb4f/Rafael_Indiana_-_Aurea_Somnia_1122027880thumbnail.jpg',
    video: REEL.aurea
  },
  {
    slug: 'jack-daniels',
    title: 'Jack Lives Here',
    client: "Jack Daniel's",
    category: 'Brand Works',
    still: CDN + '/3e098186-f41b-4676-b077-a420e02648fc/Jack_Daniels_-_Jack_Lives_Here_1122242261thumbnail.jpg',
    video: REEL.jack
  },
  {
    slug: 'leija',
    title: 'Leija',
    client: 'Bosphorus Gentlemen',
    category: 'Brand Works',
    still: CDN + '/30fb9bc4-4a00-405b-818c-fb469936ea2a/Leija_1122247732thumbnail.jpg',
    video: REEL.leija
  },
  {
    slug: 'atelierindiana',
    title: 'Atelier Indiana',
    client: 'Rafael Indiana',
    category: 'Short Films',
    still: CDN + '/4174783f-e53a-44b4-acb6-d96c0af3c34c/Rafael_Indiana_-_Atelier_1122255907thumbnail.jpg',
    video: REEL.atelier
  },
  {
    slug: 'koton',
    title: 'Blue Voyage',
    client: 'Koton × Ece Sükan',
    category: 'Brand Works',
    still: CDN + '/edf58b18-c8ca-4a9b-8678-9e71a3161098/Koton_-_Blue_Voyage_1122028784thumbnail.jpg',
    video: REEL.koton
  },
  {
    slug: 'mirage',
    title: 'Mirage',
    client: 'Rafael Indiana',
    category: 'Short Films',
    still: CDN + '/49d37e32-a5b1-47d7-b0eb-0abf08c91c8c/Rafael_Indiana_-_Mirage_1122250311thumbnail.jpg',
    hero: CDN + '/852bf839-2cc7-4931-9e8f-b0990d574fe3/MIRAGE+2.JPG',
    video: REEL.mirage,
    credits: CREDITS.mirage,
    cast: CAST.mirage
  },
  {
    slug: 'penti',
    title: 'Penti Beach',
    client: 'Penti',
    category: 'Brand Works',
    still: CDN + '/7e94018b-a14e-4156-847f-3dc3c5995b38/Penti_Beach_1122255031thumbnail.jpg',
    video: REEL.penti
  }
];

/* Each entry's full cut is the same file on the media host, so it is derived
   from the reel rather than written out twice. Null until FULL is set. */
const REEL_TO_CUT = {};
Object.keys(FILE).forEach(function (k) { REEL_TO_CUT[REEL[k]] = CUT[k]; });
window.APOLLO_FILMS.forEach(function (f) { f.full = REEL_TO_CUT[f.video] || null; });

/* Key art hangs off the film, as stems ready for -thumb / -view. */
window.APOLLO_FILMS.forEach(function (f) {
  f.posters = (POSTERS[f.slug] || []).map(function (n) { return POSTER_DIR + n; });
});

/* The five titles carried by the homepage index, in order. */
window.APOLLO_INDEX = ['drole-de-monsieur-ii-leone', 'koton', 'jack-daniels', 'drykorn-midnight-in-vienna', 'raisavanessa'];

window.APOLLO_CATEGORIES = ['Brand Works', 'Short Films', 'Trailers'];
