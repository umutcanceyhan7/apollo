#!/usr/bin/env node
/* Apollo Films — backstage asset prep.
   Run when the behind-the-scenes material in _src changes:

       node tools/backstage-prep.mjs

   The site itself has no build step, and this is not one: it is a one-off
   asset pass whose OUTPUT is committed. `assets/backstage/web/` is what the
   pages read; the masters live in `assets/backstage/_src/`, which is
   gitignored and never ships (see the stage step in .github/workflows/deploy.yml).

   THE NAMES IN _src ARE THE DATA. An earlier delivery arrived over WhatsApp
   and carried nothing but a timestamp, so the frames were grouped by the date
   they were sent and the sets were called "On the floor" and "Key art". The
   masters are now named by the production they belong to, which is the
   grouping the archive actually wants, so this pass reads it straight off the
   filename rather than guessing at it:

     mirage_3.jpeg                 → a Mirage frame
     mirage_poster_2.jpeg          → Mirage key art, not behind the scenes
     cemo_2_desktop.jpeg           → a Cemo frame, wide crop
     cemo_2_mobile.jpeg            → the same frame, cropped for a phone
     laCasaDeRaisaVanessaBTS*.mp4  → the cut, in two aspects

   What it does, in order:
     1. Sorts _src into cuts, key art and frames, by name.
     2. Groups the frames into clusters — one per production — and pairs any
        frame delivered as a desktop and a mobile crop of one picture.
     3. Writes two WebP sizes per frame: a 640px -thumb for the canvas and a
        1600px -view for the opened frame. The masters run to 5120px, which
        is a camera file, not a web asset.
     4. Re-encodes each cut, in every aspect it was delivered in, and pulls a
        poster frame from each.
     5. Re-derives the key art into assets/posters/ under the slugs that
        directory already uses — the same 21 posters arrived again at up to
        3840x5120, where the first derivatives came off ≤1600px sends.
     6. Sweeps assets/backstage/web/ of anything this run did not write.

   Idempotent: work already done is skipped, so a second run only picks up
   what is new. Nothing in _src is ever touched. */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BACKSTAGE = path.join(ROOT, 'assets', 'backstage');
const WEB = path.join(BACKSTAGE, 'web');
const SRC = path.join(BACKSTAGE, '_src');
const POSTERS = path.join(ROOT, 'assets', 'posters');

/* The productions, in the order the archive lays them out, and the prefix
   each one's masters carry. `film` is the catalogue slug in assets/js/films.js
   where there is one — Cemo and the general material are the studio rather
   than a production, and link nowhere.

   Order matters here: a prefix is matched by `startsWith`, so nothing in this
   list may be a prefix of a later entry. */
const CLUSTERS = [
  { id: 'mirage',        prefix: 'mirage_',        title: 'Mirage',                   film: 'mirage' },
  { id: 'la-casa',       prefix: 'la_casa_',       title: 'La Casa De Raisa Vanessa',  film: 'raisavanessa' },
  { id: 'summer-lovers', prefix: 'summer_lovers_', title: 'Summer Lovers',             film: 'siedres-x-rafael-indiana-summer-lovers' },
  { id: 'il-leone',      prefix: 'il_leone_',      title: 'Il Leone',                  film: 'drole-de-monsieur-ii-leone' },
  { id: 'aurea-somnia',  prefix: 'aurea_somnia_',  title: 'Aurea Somnia',              film: 'aureasomnia' },
  { id: 'cemo',          prefix: 'cemo_',          title: 'On the floor',              film: null },
  { id: 'shopigo',       prefix: 'shopigo_',       title: 'A Summer Odyssey',          film: 'shopigo-a-summer-odyssey' },
  { id: 'general',       prefix: 'general_',       title: 'The studio',                film: null }
];

/* The cuts. `file` is the 9:16 master they were graded as; `wide` is a second
   delivery of the same edit at 16:9, for viewports with the width to take it.
   A cut ships under its cluster's id, and the wide one as <id>-desktop.mp4.
   Mirage came 9:16 only and plays tall everywhere. */
const CUTS = [
  {
    cluster: 'la-casa',
    file: 'laCasaDeRaisaVanessaBTSMobile.mp4',
    wide: 'laCasaDeRaisaVanessaBTSDesktop.mp4'
  },
  {
    cluster: 'mirage',
    file: 'MIRAGE 💎 behind the scenes 🎥.mp4'
  }
];

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const VIDEO_EXT = /\.mp4$/i;
/* Key art carries `_poster` somewhere in the name. It is finished work cut
   after the fact, not behind the scenes of anything, so it never enters the
   archive — it is re-derived into assets/posters/ instead. */
const POSTER = /_poster/i;
/* A frame delivered twice, cropped for a wide room and for a phone. */
const CROP = /^(.*)_(desktop|mobile)$/;

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function dims(file) {
  const out = sh('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file
  ]).trim().split('\n')[0];
  const [w, h] = out.split('x').map(Number);
  return { w, h };
}

/* An 8x8 average hash. Used only to line the re-delivered key art up with the
   slugs assets/posters/ already uses: the same poster at two resolutions and
   two codecs is nowhere near byte-identical, but it is the same picture, and
   sixty-four bits of it is enough to say so. */
function aHash(file) {
  const buf = execFileSync('ffmpeg', [
    '-v', 'error', '-i', file, '-vf', 'scale=8:8,format=gray', '-f', 'rawvideo', '-'
  ], { maxBuffer: 1 << 20 });
  const px = [...buf.subarray(0, 64)];
  const avg = px.reduce((a, b) => a + b, 0) / 64;
  let bits = 0n;
  px.forEach((v, i) => { if (v > avg) bits |= (1n << BigInt(i)); });
  return bits;
}

const hamming = (a, b) => {
  let x = a ^ b, c = 0;
  while (x) { c += Number(x & 1n); x >>= 1n; }
  return c;
};

function ensure(dir) { fs.mkdirSync(dir, { recursive: true }); }

/* Longest edge to `n`, whichever way round the picture is. cwebp takes the
   two edges as separate arguments and reads a 0 as "work it out from the
   other one", so the frames may be a mix of portrait and landscape without
   either being squared off. */
function webp(src, out, edge, q) {
  const { w, h } = dims(src);
  const fit = h > w ? ['0', String(edge)] : [String(edge), '0'];
  sh('cwebp', ['-quiet', '-q', String(q), '-resize', ...fit, src, '-o', out]);
}

/* One picture at the two sizes the pages read. Returns the size the -view
   came out at, which is what the layout needs to reserve a frame's shape
   before the picture itself has loaded. */
function frame(src, dir, slug, written) {
  const thumb = path.join(dir, `${slug}-thumb.webp`);
  const view = path.join(dir, `${slug}-view.webp`);
  if (!fs.existsSync(thumb)) webp(src, thumb, 640, 82);
  if (!fs.existsSync(view)) webp(src, view, 1600, 80);
  if (written) { written.add(path.basename(thumb)); written.add(path.basename(view)); }
  return dims(view);
}

console.log('— backstage prep —\n');
ensure(WEB);
ensure(POSTERS);

/* Everything this run is responsible for. Anything left in web/ that is not
   in here at the end belonged to a delivery that is no longer in _src. */
const written = new Set();

/* ---- 1. sort _src by name ---- */

const all = fs.readdirSync(SRC).filter((n) => !n.startsWith('.'));
const cuts = all.filter((n) => VIDEO_EXT.test(n));
const art = all.filter((n) => IMAGE_EXT.test(n) && POSTER.test(n)).sort();
const shots = all.filter((n) => IMAGE_EXT.test(n) && !POSTER.test(n)).sort();

console.log(`_src: ${shots.length} frames, ${art.length} posters, ${cuts.length} cuts`);

/* ---- 2. cluster the frames, and pair the crops ---- */

/* `cemo_2_desktop` and `cemo_2_mobile` are one picture cropped twice, and are
   dealt as one frame with two sources. A stem that turns up with only one of
   the two suffixes is a frame in its own right that happens to be named that
   way, and is dealt as one — the pairing is what makes a crop pair, not the
   suffix. */
const pairs = new Map();
for (const name of shots) {
  const stem = name.replace(IMAGE_EXT, '');
  const m = stem.match(CROP);
  const key = m ? m[1] : stem;
  if (!pairs.has(key)) pairs.set(key, {});
  pairs.get(key)[m ? m[2] : 'only'] = name;
}

const orphans = [];
const byCluster = new Map(CLUSTERS.map((c) => [c.id, []]));

for (const [key, got] of pairs) {
  const c = CLUSTERS.find((c) => key.startsWith(c.prefix));
  if (!c) { orphans.push(key); continue; }
  /* Both crops present, or neither — a lone _desktop is just a frame. */
  const paired = got.desktop && got.mobile;
  byCluster.get(c.id).push({
    key,
    wide: got.desktop || got.only || got.mobile,
    tall: paired ? got.mobile : null
  });
}

if (orphans.length) {
  console.log(`\n  ! no cluster for: ${orphans.join(', ')}`);
  console.log(`    add a prefix to CLUSTERS or rename the master.`);
}

/* Natural order inside a cluster, so mirage_10 sorts after mirage_9 rather
   than after mirage_1. */
const natural = (a, b) => a.key.localeCompare(b.key, undefined, { numeric: true });

/* ---- 3. the frames ---- */

console.log('');
const clusterData = [];
let n = 0;

for (const c of CLUSTERS) {
  const list = byCluster.get(c.id).sort(natural);
  if (!list.length) { console.log(`  ${c.id.padEnd(14)} — nothing in _src, skipped`); continue; }

  const built = [];
  list.forEach((item, i) => {
    const slug = `${c.id}-${String(i + 1).padStart(2, '0')}`;
    const wide = frame(path.join(SRC, item.wide), WEB, slug, written);
    const shot = { slug, w: wide.w, h: wide.h, from: item.wide };
    if (item.tall) {
      const tall = frame(path.join(SRC, item.tall), WEB, `${slug}-mobile`, written);
      shot.tall = { w: tall.w, h: tall.h, from: item.tall };
    }
    built.push(shot);
    process.stdout.write(`\r  frames: ${++n}`);
  });

  clusterData.push({ id: c.id, title: c.title, film: c.film, shots: built });
  process.stdout.write(`\r  ${c.id.padEnd(14)} ${String(built.length).padStart(3)} frames` +
    `${built.some((s) => s.tall) ? '  (with crop pairs)' : ''}\n`);
}

/* ---- 4. the cuts ---- */

console.log('');

/* One aspect of one cut: the encode, the poster frame, and the pixel size the
   canvas needs to draw the frame at before the video has loaded. */
function cut(src, slug) {
  const out = path.join(WEB, `${slug}.mp4`);
  const poster = path.join(WEB, `${slug}-poster.webp`);

  if (!fs.existsSync(out)) {
    console.log(`  encoding ${slug} …`);
    sh('ffmpeg', [
      '-v', 'error', '-y', '-i', src,
      '-c:v', 'libx264', '-b:v', '1200k', '-preset', 'slow',
      '-c:a', 'aac', '-b:a', '96k',
      '-movflags', '+faststart', out
    ]);
  }
  if (!fs.existsSync(poster)) {
    const jpg = poster.replace(/\.webp$/, '.jpg');
    sh('ffmpeg', ['-v', 'error', '-y', '-ss', '1', '-i', src, '-frames:v', '1', jpg]);
    webp(jpg, poster, 1280, 80);
    fs.unlinkSync(jpg);
  }
  written.add(path.basename(out));
  written.add(path.basename(poster));

  const { w, h } = dims(out);
  const dur = Number(sh('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out
  ]).trim());
  return { w, h, seconds: Math.round(dur) };
}

for (const c of CUTS) {
  const cluster = clusterData.find((x) => x.id === c.cluster);
  if (!cluster) { console.log(`  ! ${c.cluster} has no frames — cut skipped`); continue; }
  if (!fs.existsSync(path.join(SRC, c.file))) {
    console.log(`  ! missing: ${c.file} — skipped`);
    continue;
  }

  const tall = cut(path.join(SRC, c.file), c.cluster);
  cluster.cut = { slug: c.cluster, seconds: tall.seconds, w: tall.w, h: tall.h };

  if (c.wide && fs.existsSync(path.join(SRC, c.wide))) {
    const wide = cut(path.join(SRC, c.wide), `${c.cluster}-desktop`);
    cluster.cut.wide = { w: wide.w, h: wide.h };
  } else if (c.wide) {
    console.log(`  ! missing wide cut: ${c.wide} — ${c.cluster} stays 9:16 everywhere`);
  }

  console.log(`  ✓ ${c.cluster} — ${tall.seconds}s  ${tall.w}x${tall.h}` +
    (cluster.cut.wide ? `  + wide ${cluster.cut.wide.w}x${cluster.cut.wide.h}` : ''));
}

/* ---- 5. the key art, back into the slugs assets/posters/ already uses ---- */

console.log('');

/* The directory is the index: every slug in it is a poster that has already
   been named, described and written up in posters.md. The re-delivery is the
   same 21 pictures at a better size, so it is matched onto those slugs rather
   than given new ones — otherwise posters.md would be describing files that
   no longer exist. */
const slugs = [...new Set(fs.readdirSync(POSTERS)
  .filter((n) => n.endsWith('-view.webp'))
  .map((n) => n.replace('-view.webp', '')))];

const known = slugs.map((slug) => ({ slug, h: aHash(path.join(POSTERS, `${slug}-view.webp`)) }));
const taken = new Set();
const unmatched = [];
let redone = 0;

for (const name of art) {
  const src = path.join(SRC, name);
  const h = aHash(src);
  let best = null;
  for (const k of known) {
    if (taken.has(k.slug)) continue;
    const d = hamming(k.h, h);
    if (!best || d < best.d) best = { slug: k.slug, d };
  }
  /* <= 10 bits apart is the same picture through a resize and a re-encode.
     Anything looser starts matching one poster in a series onto another. */
  if (!best || best.d > 10) { unmatched.push(name); continue; }
  taken.add(best.slug);

  for (const suffix of ['-thumb.webp', '-view.webp']) {
    fs.rmSync(path.join(POSTERS, best.slug + suffix), { force: true });
  }
  frame(src, POSTERS, best.slug, null);
  redone++;
}

console.log(`  ${redone}/${art.length} posters re-derived from the new masters`);
if (unmatched.length) console.log(`  ! no slug matched: ${unmatched.join(', ')}`);
const missed = slugs.filter((s) => !taken.has(s));
if (missed.length) console.log(`  ! no master arrived for: ${missed.join(', ')}`);

/* ---- 6. sweep ---- */

const stale = fs.readdirSync(WEB)
  .filter((n) => !n.startsWith('.') && n !== 'manifest.json' && !written.has(n));

for (const n of stale) fs.rmSync(path.join(WEB, n));
console.log(`\nswept ${stale.length} files out of web/ — they were not in this delivery`);

/* ---- report ---- */

const manifest = { clusters: clusterData };
fs.writeFileSync(path.join(WEB, 'manifest.json'), JSON.stringify(manifest, null, 1));

console.log('\nclusters:');
for (const c of clusterData) {
  console.log(`  ${c.id.padEnd(14)} ${String(c.shots.length).padStart(3)} frames` +
    `${c.cut ? '  + cut' : ''}`);
}
console.log('\nwrote assets/backstage/web/manifest.json');
console.log('next: node tools/backstage-data.mjs  (turns the manifest into backstage.js)');
