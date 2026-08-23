#!/usr/bin/env node
/* Apollo Films — backstage asset prep.
   Run once when new behind-the-scenes material lands:

       node tools/backstage-prep.mjs

   The site itself has no build step, and this is not one: it is a one-off
   asset pass whose OUTPUT is committed. `assets/backstage/web/` is what the
   pages read; the originals move to `assets/backstage/_src/` and never ship
   (see the stage step in .github/workflows/deploy.yml).

   What it does, in order:
     1. Collects every loose image and video under assets/backstage/.
     2. Drops byte-identical duplicates — the material arrives over WhatsApp
        and the same frame turns up in more than one export.
     3. Renames to slugs. The delivered names carry spaces, parens and emoji
        ("MIRAGE 💎 behind the scenes 🎥.mp4"); a filename that needs
        encodeURI to survive a URL is a filename that will eventually break
        on some host, so the derivatives get plain ones.
     4. Writes two WebP sizes per photo — a 640px strip thumb and a 1600px
        lightbox view. The originals run to 5120px, which is a camera file,
        not a web asset.
     5. Re-encodes the two BTS films and pulls a poster frame from each.
     6. Moves every original into _src/.

   Idempotent: work already done is skipped, so a second run only picks up
   what is new. Nothing is deleted — originals are moved, never removed. */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BACKSTAGE = path.join(ROOT, 'assets', 'backstage');
const WEB = path.join(BACKSTAGE, 'web');
const SRC = path.join(BACKSTAGE, '_src');

/* The two films, by the delivered name. La Casa arrived twice — the same cut
   at two bitrates — so the heavier one is named here and the other is left
   to fall through to _src as a spare. */
const FILMS = [
  {
    slug: 'la-casa-de-raisa-vanessa',
    title: 'La Casa De Raisa Vanessa',
    file: 'La Casa De Raisavanessa BTS 🎥.mp4'
  },
  {
    slug: 'mirage',
    title: 'Mirage',
    file: 'MIRAGE 💎 behind the scenes 🎥.mp4'
  }
];

/* The six frames from the old ethos reel. They are already web-sized and
   already committed, and they are not part of a dated shoot — they get left
   where they are rather than pulled into a set. */
const LEGACY = new Set([
  'aesthetics.jpeg', 'ambition.webp', 'art-direction.jpeg',
  'sinematic.webp', 'teamwork.webp', 'vision.webp',
  'bts_1.jpg', 'bts_2.jpg'
]);

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const VIDEO_EXT = /\.mp4$/i;

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function hash(file) {
  return createHash('md5').update(fs.readFileSync(file)).digest('hex');
}

function dims(file) {
  const out = sh('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file
  ]).trim().split('\n')[0];
  const [w, h] = out.split('x').map(Number);
  return { w, h };
}

/* The shoot a frame belongs to, read off the WhatsApp timestamp in its name.
   Three clusters arrived; a date is the only grouping the delivery carries,
   so it is the one the sets are built from. Titles are filled in later by
   hand in assets/js/backstage.js — see the note there. */
function shootOf(name) {
  const m = name.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : 'undated';
}

function ensure(dir) { fs.mkdirSync(dir, { recursive: true }); }

console.log('— backstage prep —\n');
ensure(WEB);
ensure(SRC);

/* ---- 1. collect ---- */

const loose = fs.readdirSync(BACKSTAGE)
  .filter((n) => !n.startsWith('.'))
  .filter((n) => fs.statSync(path.join(BACKSTAGE, n)).isFile())
  .filter((n) => !LEGACY.has(n));

const photos = loose.filter((n) => IMAGE_EXT.test(n));
const videos = loose.filter((n) => VIDEO_EXT.test(n));

console.log(`found ${photos.length} photos, ${videos.length} videos`);

/* ---- 2. dedupe ---- */

const seen = new Map();
const unique = [];
for (const name of photos.sort()) {
  const h = hash(path.join(BACKSTAGE, name));
  if (seen.has(h)) continue;
  seen.set(h, name);
  unique.push(name);
}
console.log(`${unique.length} unique after dedupe (${photos.length - unique.length} dropped)\n`);

/* ---- 3+4. slug, resize, convert ---- */

const bySet = new Map();
let n = 0;

for (const name of unique) {
  const shoot = shootOf(name);
  const seq = (bySet.get(shoot)?.length ?? 0) + 1;
  const slug = `${shoot}-${String(seq).padStart(2, '0')}`;
  const abs = path.join(BACKSTAGE, name);

  const thumb = path.join(WEB, `${slug}-thumb.webp`);
  const view = path.join(WEB, `${slug}-view.webp`);

  if (!fs.existsSync(thumb) || !fs.existsSync(view)) {
    /* -resize 0 H / W 0 keeps the aspect: the strip wants a common height,
       the lightbox a common longest edge, and the frames are a mix of
       portrait and landscape so neither can be a fixed box. */
    const { w, h } = dims(abs);
    const portrait = h > w;
    /* cwebp takes the two edges as separate args, and a 0 means "work it
       out from the other one". */
    const fit = (n) => (portrait ? ['0', String(n)] : [String(n), '0']);
    sh('cwebp', ['-quiet', '-q', '82', '-resize', ...fit(640), abs, '-o', thumb]);
    sh('cwebp', ['-quiet', '-q', '80', '-resize', ...fit(1600), abs, '-o', view]);
  }

  const { w, h } = dims(view);
  if (!bySet.has(shoot)) bySet.set(shoot, []);
  bySet.get(shoot).push({ slug, w, h });

  process.stdout.write(`\r  frames: ${++n}/${unique.length}`);
}
console.log('\n');

/* ---- 5. the two films ---- */

const filmData = [];
for (const film of FILMS) {
  const abs = path.join(BACKSTAGE, film.file);
  if (!fs.existsSync(abs)) {
    console.log(`  ! missing: ${film.file} — skipped`);
    continue;
  }
  const out = path.join(WEB, `${film.slug}.mp4`);
  const poster = path.join(WEB, `${film.slug}-poster.webp`);

  if (!fs.existsSync(out)) {
    console.log(`  encoding ${film.slug} …`);
    sh('ffmpeg', [
      '-v', 'error', '-y', '-i', abs,
      '-c:v', 'libx264', '-b:v', '1200k', '-preset', 'slow',
      '-c:a', 'aac', '-b:a', '96k',
      '-movflags', '+faststart', out
    ]);
  }
  if (!fs.existsSync(poster)) {
    const jpg = poster.replace(/\.webp$/, '.jpg');
    sh('ffmpeg', ['-v', 'error', '-y', '-ss', '1', '-i', abs, '-frames:v', '1', jpg]);
    sh('cwebp', ['-quiet', '-q', '80', '-resize', '0', '1280', jpg, '-o', poster]);
    fs.unlinkSync(jpg);
  }

  const dur = Number(sh('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out
  ]).trim());

  filmData.push({ slug: film.slug, title: film.title, seconds: Math.round(dur) });
  console.log(`  ✓ ${film.slug} — ${Math.round(dur)}s`);
}

/* ---- 6. originals out of the shipped tree ---- */

let moved = 0;
for (const name of [...photos, ...videos]) {
  const from = path.join(BACKSTAGE, name);
  if (!fs.existsSync(from)) continue;
  fs.renameSync(from, path.join(SRC, name));
  moved++;
}
console.log(`\nmoved ${moved} originals to _src/`);

/* ---- report ---- */

const sets = [...bySet.entries()].sort().map(([shoot, shots]) => ({ shoot, shots }));
console.log('\nsets:');
for (const s of sets) console.log(`  ${s.shoot}  ${s.shots.length} frames`);

const manifest = { films: filmData, sets };
fs.writeFileSync(path.join(WEB, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log('\nwrote assets/backstage/web/manifest.json');
console.log('next: node tools/backstage-data.mjs  (turns the manifest into backstage.js)');
