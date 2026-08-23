#!/usr/bin/env node
/* Apollo Films — lift the key art out of the backstage floor.

       node tools/posters-split.mjs

   The 2026-05-25 delivery was not behind-the-scenes at all: it is finished
   key art for eight productions. This moves those frames out of
   assets/backstage/web/ into assets/posters/, renames them after the film
   they belong to, writes assets/posters/posters.md as the index, and
   repoints assets/js/backstage.js at the new location.

   The mapping below was read off the posters themselves — every one carries
   its title and credit block, so nothing here is a guess. Where a poster
   names both a series and an episode ("LA CASA DE RAISA VANESSA / Amore
   Serpente") the episode wins, because that is the film it was cut for. */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const WEB = path.join(ROOT, 'assets', 'backstage', 'web');
const POSTERS = path.join(ROOT, 'assets', 'posters');
const DATA = path.join(ROOT, 'assets', 'js', 'backstage.js');

/* frame -> { film title as printed, catalogue slug, a one-line description
   of the image so the index is readable without opening every file } */
const MAP = [
  ['2026-05-25-01', 'Mirage', 'mirage', 'Cliffs and turquoise water, swimmer on the rocks'],
  ['2026-05-25-02', 'Mirage', 'mirage', 'Man with a cigar and a red transistor radio'],

  ['2026-05-25-03', 'Amore Serpente', 'amoreserpente', 'Gold silk and a jewellery box, overhead'],
  ['2026-05-25-04', 'Amore Serpente', 'amoreserpente', 'Blue Corvette above the sea, pistol drawn'],
  ['2026-05-25-05', 'Amore Serpente', 'amoreserpente', 'Bedroom, banknotes across the sheets'],

  ['2026-05-25-06', 'La Casa De Raisa Vanessa', 'raisavanessa', 'Crouched against a white wall, green swimsuit'],
  ['2026-05-25-07', 'La Casa De Raisa Vanessa', 'raisavanessa', 'Poolside table, brick phone on a silver tray'],
  ['2026-05-25-08', 'La Casa De Raisa Vanessa', 'raisavanessa', 'Yellow border, blue swimsuit on the diving board'],
  ['2026-05-25-09', 'La Casa De Raisa Vanessa', 'raisavanessa', 'White hat in a press scrum'],

  ['2026-05-25-10', 'Summer Lovers', 'siedres-x-rafael-indiana-summer-lovers', 'Two on a motorcycle, hair in the wind'],
  ['2026-05-25-11', 'Summer Lovers', 'siedres-x-rafael-indiana-summer-lovers', 'Whitewashed chapel, black dress and white trousers'],
  ['2026-05-25-12', 'Summer Lovers', 'siedres-x-rafael-indiana-summer-lovers', 'Close on the eyes under a gold laurel headpiece'],
  ['2026-05-25-13', 'Summer Lovers', 'siedres-x-rafael-indiana-summer-lovers', 'Beach, lying in the sand as he walks up'],
  ['2026-05-25-14', 'Summer Lovers', 'siedres-x-rafael-indiana-summer-lovers', 'Ferry ticket held against a white bikini'],
  ['2026-05-25-15', 'Summer Lovers', 'siedres-x-rafael-indiana-summer-lovers', 'Laurel crown, leaning on a blue bench'],

  ['2026-05-25-16', 'Il Leone', 'drole-de-monsieur-ii-leone', 'Two faces over a lion balustrade at sunset'],

  ['2026-05-25-17', 'Constanze in Istanbul', '3ckc59fzd7gx74wxljygglmg8ga5kh', 'Painted fan raised against the Bosphorus'],
  ['2026-05-25-18', 'Constanze in Istanbul', '3ckc59fzd7gx74wxljygglmg8ga5kh', 'Period gown at a blue gate, man with a newspaper'],
  ['2026-05-25-19', 'Constanze in Istanbul', '3ckc59fzd7gx74wxljygglmg8ga5kh', 'Backgammon on the quay, gown approaching'],

  ['2026-05-25-20', 'A Summer Odyssey', 'shopigo-a-summer-odyssey', 'Violet montage, Bosphoria Stamboul 1974'],

  ['2026-05-25-21', 'Aurea Somnia', 'aureasomnia', 'Bare back against a column, reflection in the mirror']
];

fs.mkdirSync(POSTERS, { recursive: true });

const seq = {};
const rows = [];

for (const [frame, title, slug, note] of MAP) {
  seq[slug] = (seq[slug] || 0) + 1;
  const name = seq[slug] > 1 || MAP.filter((m) => m[2] === slug).length > 1
    ? `${slug}-${String(seq[slug]).padStart(2, '0')}`
    : slug;

  for (const size of ['thumb', 'view']) {
    const from = path.join(WEB, `${frame}-${size}.webp`);
    const to = path.join(POSTERS, `${name}-${size}.webp`);
    if (fs.existsSync(from)) fs.renameSync(from, to);
  }
  rows.push({ name, title, slug, note, frame });
}

/* ---- the index ---- */

const byFilm = new Map();
for (const r of rows) {
  if (!byFilm.has(r.title)) byFilm.set(r.title, { slug: r.slug, items: [] });
  byFilm.get(r.title).items.push(r);
}

const md = [];
md.push('# Posters');
md.push('');
md.push('Key art for eight Apollo productions, lifted out of the behind-the-scenes');
md.push('delivery it arrived in. Every title below was read off the poster itself —');
md.push('each one carries its own title and credit block — so none of this is inferred');
md.push('from filenames.');
md.push('');
md.push('Two sizes ship for each: `-thumb.webp` at 640px and `-view.webp` at 1600px.');
md.push('The masters are in `assets/backstage/_src/`, which is gitignored; the original');
md.push('filename for each is in the table so a master can be found again.');
md.push('');
md.push(`${rows.length} posters, ${byFilm.size} films.`);
md.push('');

for (const [title, { slug, items }] of byFilm) {
  md.push(`## ${title}`);
  md.push('');
  md.push(`Catalogue slug: \`${slug}\` — \`film.html?f=${slug}\``);
  md.push('');
  md.push('| Poster | Image | Prepped from |');
  md.push('| --- | --- | --- |');
  for (const r of items) {
    md.push(`| \`${r.name}\` | ${r.note} | \`${r.frame}\` |`);
  }
  md.push('');
}

md.push('## Notes');
md.push('');
md.push('- **La Casa De Raisa Vanessa vs Amore Serpente.** Three posters print both,');
md.push('  the series name above and `Amore Serpente` beneath it; four print only the');
md.push('  series name. They are filed by the smaller of the two, because that is the');
md.push('  film each was cut for. The catalogue carries both as separate entries.');
md.push('- **The catalogue has near-duplicate slugs** for some of these films');
md.push('  (`raisavanessa` / `raisavanessa2`, `amoreserpente` / `amoreserpente2`,');
md.push('  `drole-de-monsieur-ii-leone` / `…-dining`). The first of each pair is used');
md.push('  here; adjust if the other is the canonical one.');
md.push('- One frame in the same delivery was a phone screenshot of the site open in');
md.push('  Instagram, not artwork. It is excluded by name in `tools/backstage-data.mjs`.');
md.push('');

fs.writeFileSync(path.join(POSTERS, 'posters.md'), md.join('\n'));

/* ---- repoint the page ---- */

let js = fs.readFileSync(DATA, 'utf8');
const keyartAt = js.indexOf("id: 'keyart'");
if (keyartAt > -1) {
  const head = js.slice(0, keyartAt);
  let tail = js.slice(keyartAt);
  for (const r of rows) tail = tail.split(`'${r.frame}'`).join(`'${r.name}'`);
  js = head + tail;
  fs.writeFileSync(DATA, js);
}

console.log(`moved ${rows.length} posters into assets/posters/`);
for (const [title, { items }] of byFilm) {
  console.log(`  ${String(items.length).padStart(2)}  ${title}`);
}
console.log('\nwrote assets/posters/posters.md');
console.log('repointed the keyart strip in assets/js/backstage.js');
