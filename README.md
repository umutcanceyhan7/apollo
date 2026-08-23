# Apollo Films — A24 structure, 601 Inc. surface

A static rebuild of [apollofilms.co](https://www.apollofilms.co/). Plain HTML, CSS and
vanilla JS — no build step, no dependencies beyond one Google font.

Two systems merged:

- **A24** gives the bones — full-bleed band rhythm, tracked uppercase metadata,
  hard-left alignment, zero radius, zero shadow.
- **601 Inc.** gives the surface — celluloid cream on projection black, a single
  typeface at a single weight, carved display scale, bullet-separated nav, 1px hairline
  outlines as the only button, and the film itself playing full-bleed behind the type.

All 24 films and every line of copy come from the live Apollo site. Neither A24's nor
601's work appears here.

## Run it

```bash
python3 serve.py
```

Then open <http://localhost:4173>. A server is required — the pages read
`film.html?f=<slug>` and stream video.

`serve.py` is `http.server` with two dev-only changes: `Cache-Control: no-store`,
because otherwise the browser holds a stale `app.js` after every edit, and threading,
because a single open video stream would otherwise block every other request.

## Deploy

Pushing to `main` publishes to <https://umutcanceyhan.com/apollo/> via
`.github/workflows/deploy.yml` — same shape as the other project sites on that domain.

There is no build step. The workflow stages `*.html` and `assets/` into `_site/` and
uploads that, so the README, `serve.py` and `metadata.txt` stay in the repo but off the
web. Every path in the markup is relative, so serving from the `/apollo/` subpath needs
no base rewrite.

## The showcase

One page carries the whole catalogue: a heading, a filter bar, then 24 numbered
hairline rows riding over a reel that pins to the viewport and swaps as you move down
the list. The component is `catalogue` throughout — `.catalogue`, `.catalogue__stage`,
`.catalogue__list`, `.catalogue__media`, `.catalogue__filters`, and `.row` for a line.

Catalogue numbers do **not** renumber when filtered. A film keeps its number wherever
you meet it, so Trailers reads `10, 11` rather than `01, 02`. That's deliberate — the
number is the film's place in the archive, not its position in the current view. To
renumber per view instead, set `row__n` inside `applyFilter` in `app.js`.

### Picking a film without a pointer

A mouse names the film it is over. A finger can't, so on a device with no hover the
schedule commits one when the **scroll comes to rest** — `.catalogue--focus`, set at
load from `(hover: none)`. Scrolling is the looking, stopping is the choice:

- Nothing changes while the page moves. Whatever is playing keeps playing, however many
  rows cross the screen — no cut every few hundred milliseconds on a flick.
- The gesture is over on `scrollend`, and on a quiet 140ms in the scroll stream where
  that event doesn't exist yet (most iPhones in the field). A finger resting on the
  glass mid-gesture holds the commit back until `touchend`.
- The film is then the row nearest the middle of the screen below the header — or, at
  the foot of the page where no row can reach the middle any more, the last one.
- Land back on the film already running and it is left alone rather than restarted.

Because the reel now changes on its own, the row it belongs to has to say so, in the
page's own language: the rows go quieter than hover ever takes them, the committed row
keeps its hairline while the others dim theirs, and it alone carries `● NOW PLAYING`
(`.row__cue`). The cue holds no height until the commit — the row opens under its title
for it, rather than every title carrying an empty line. The frame arrives on a slow
scale-out, so a change of film reads as a dissolve rather than a swap.

One film is fetched at a time, nothing before the schedule is on screen, and the reel
stops when it leaves; only the last three keep their buffer, so scrolling the archive
doesn't leave twenty-four decoded films on a phone. Desktop hover is untouched.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | The hero and nothing else: five titles at display scale over one full-bleed reel, hovering a title runs that film's. One screen on a desktop, no footer, no second section — the phone turns the same hero into a scroll track through the five (`.hero--track`). The foot of the screen carries the film's category and client, and `See more` to the archive |
| `showcase.html` | The catalogue — 24 numbered hairline rows over a pinned reel that swaps on hover, or on scroll-end where there is no hover, filtered by category |
| `backstage.html` | The BTS archive — one horizontal room, ~20,000px wide, travelled by pointer position, wheel, arrows or drag. Forty-nine photographs from the floor and the two 9:16 cuts, scored across three depth planes; clicking a frame grows that frame into the viewer |
| `about.html` | Opens on the wall — the catalogue hung in 3D behind the studio's own line — then the studio note and, in the footer, four facts two up, all on the one centre axis the site otherwise never uses |
| `contact.html` | Form in the system's type; submitting opens the user's mail client |
| `film.html?f=<slug>` | Full-bleed player with controls, cast/crew credits, prev/next |

## The wall

`about.html` opens on `.wall`: the catalogue hung on one plane in real perspective,
with the page's opening line standing in front of it. `app.js` builds it from
`window.APOLLO_FILMS` — 40 frames on a desktop (8 × 5), 24 on a phone (4 × 6) — and
every frame's position, size, tilt and depth comes out of a `sin`-based hash of its own
index. Nothing is random: a reload gives the reader the same room back.

- **Three z-planes.** Far is blurred and rides `--o-quiet`, mid takes a 1px blur at
  `--o-hold`, near is sharp at the reel's own strength. Perspective does the sizing —
  a frame is large because it is close, not because it was drawn large.
- **Three frames are running.** The nearest films with a loop get a `<video>` laid over
  their own still, faded in once it is actually playing. Touch, reduced motion, a
  metered connection and every phone get the stills alone.
- **The middle is covered, not cleared.** A radial of `--ground` sits over the field so
  the type lands on the page's own floor; the frames keep running underneath. Because
  the scrim is the ground token, the contact sheet inverts it for free — and there the
  whole field multiplies, the same bargain the hero stage strikes.
- **Stills are asked for at the size they land.** The CDN takes `?format=500w` (750w for
  the near plane), which is the difference between 2.5 MB of thumbnails and about 700 KB.
- The plane leans toward the cursor over a long transition, drifts on a 54s loop, and
  stops decoding when it scrolls off screen. Without script the field is empty and the
  copy reads on the ground, as it did before.

## Entrances

Every page uses the same two motion hooks, both read by `app.js`:

- **`data-reveal`** — the element fades and rises 20px once, the first time it
  intersects, then stays. On `.rule` it draws the hairline out from the left instead.
  An optional value is a delay in ms (`data-reveal="140"`), so a lede can land after
  the heading above it without a rule per page. Catalogue rows opt in from JS, since
  they are built rather than authored.
- **`data-split`** — splits a display line into words that rise out of their own
  baseline, staggered 45ms apart. Works on lines the page fills in later, like a film
  title, because splitting runs after the detail block. A `data-reveal` delay on the
  same element offsets the whole line.

`.columns--sticky` holds the label column while its prose scrolls past, from 900px up.

The observer runs a `-10%` bottom `rootMargin`, so an element is held back until it is
properly in view rather than merely peeking over the fold. That assumes the page can
scroll, and one page cannot: once `index.html` became the hero alone it was exactly one
viewport, and the hero's meta row sat at 839–863 against a root that stopped at 810 —
permanently outside it, at opacity 0, taking the category, the client and the way to the
archive with it. The 2.5s fallback does not catch this, because it bails as soon as any
other element is in. So `startReveals()` makes one load-time pass and marks anything
already inside the *real* viewport: holding on-screen copy invisible is the failure the
margin exists to prevent, not one for it to cause. Everything below the fold still waits
for the observer, and the delays are untouched, so the choreography is unchanged.

Both hooks are gated on `.js` (set by an inline script in each `<head>`), so a page
without script is fully readable rather than blank, and a 2.5s fallback reveals
everything if the observer never delivers. Nothing here changes a colour, a size, or a
weight — the page arrives, then it is the same page it always was.

## The design system

Tokens live at the top of `assets/css/apollo.css`.

| | |
| --- | --- |
| Celluloid Cream | `#ece4b4` — all ink, all hairlines, the only border colour |
| Projection Black | `#000000` — the floor beneath everything |
| Darkroom Shadow | `#4f4d3c` — 601 has it; this site does not use it. In 601's system it is haze around a still, not a band you can land on, and as a band it read as a third colour |
| Type | Space Grotesk, **weight 400 only** — no bold appears anywhere on the site |
| Tracking | `-0.04em` at every display size; `+0.16em` on uppercase labels |
| Wordmark | `clamp(72px, 21vw, 280px)` — the branded moment |
| Display | `clamp(34px, 5.8vw, 92px)` / line-height `0.88`. One exception: `.display[data-title]`, the film page's own title, holds `clamp(38px, 7.6vw, 128px)` — the section heads stepped down, the branded moment did not |
| Row numeral | `clamp(38px, 7vw, 110px)`, tabular |
| Label | 12px uppercase — the one deliberate break from 601 (see below) |
| Layout | Full-bleed, no max-width. Gutter `clamp(20px, 4vw, 56px)`, section gap `clamp(72px, 10vw, 120px)`, element gap 12px |
| Buttons | 1px hairline outline, 12px / 21px padding, never a fill |
| Nav | Bullet `•` separators at 21px padding, not dividers |
| Footer | One row of facts under one hairline — the bar's own rule, and the only one the footer draws. It never repeats a line from the page above it |
| Non-negotiable | `border-radius: 0`, `box-shadow: none`, no fourth colour, nothing centred &mdash; `about` is the one exception, and it is the whole page rather than a component: `.wall__inner` and the two `.midblock`s under it hold a single centre axis. Nowhere else centres |

Two grounds alternate down every page — black and cream — so rhythm comes from
value, never from colour. This is A24's rule taken literally: the cut between the
two bands *is* the rhythm, so a third ground only softens it. The interior pages
close on a cream band before the black footer, which is the last cut on the way
out. Two pages are deliberate exceptions.

`about.html` closes black into black, so the page runs out rather than cutting.
That is why the footer draws no rule of its own — with a cream band above, the
change of ground already is the divider; with a black one, there is nothing to
divide.

`index.html` has no rhythm to keep, because it has no second band: the hero is
the whole page and it carries no footer. That is also why `.hero` no longer draws
a bottom hairline — it divided the hero from the band that used to follow it, and
with nothing under it a rule at the foot of the screen divides nothing. The one
place the site says anything about itself is now `about`.

That close is a section of `main`, not the footer, and the distinction is the
whole point: continuity is the ground's job, and sitting inside `<footer>` made
the facts read as fine print. It carries no heading — the four labels are the
only thing naming it, which is a deliberate call to keep the page quiet rather
than an omission. `.band--close` trims the closing band's bottom padding,
because the footer's own top padding is the other half of that gap and paying it
twice leaves a hole under the last line.

The four facts sit in `.factgrid`, which takes its row count from the viewport
rather than from a breakpoint: `auto-fit` at a 240px minimum against a 640px
measure gives two up wherever the block has its full width, and one up once a
column can no longer hold a value on one line. It takes no top margin of its
own; the break above it is the two bands' padding and nothing else.
All chroma on the site comes from the footage.

### Where the merge breaks 601 on purpose

601 forbids any text under 42px. That works for a studio showing one film per screen;
it does not work for a 24-film catalogue with categories, clients and filters. So labels
and secondary text keep A24's small tracked treatment (`.label` at 12px, `.fine` at
15px), and everything else follows 601. That's the only rule bent.

## Backstage

The client's own material, and the one page on the site built from photographs
rather than from film. It answers a brief that was three words long — *kamera
arkası olsun* — and the shape it takes comes from what the material turned out
to be rather than from what the filenames claimed.

### What the delivery actually was

Eighty-seven images and three videos arrived over WhatsApp. Taken at face value
that is three shoots on three dates and three videos. It is none of those:

- **The date in the filename is the delivery, not the shoot.** The `2026-05-24`
  batch is the `2026-04-08` batch sent a second time. WhatsApp re-compresses on
  every send, so the bytes differ and an md5 pass keeps both copies. The frames
  are compared on an 8x8 average hash instead, which sees through it — 80 files
  reduce to 71 distinct photographs.
- **The batches are not one kind of thing.** `2026-04-08` is photography from
  the floor: crew, camera, cast between takes. `2026-05-25` is finished key art
  for Mirage, La Casa De Raisa Vanessa, Il Leone and Summer Lovers. Passing
  those off as behind-the-scenes would be the one dishonest thing on the page,
  so they are classified as their own strip — and the archive does not hang
  that strip at all (see below).
- **Two of the three videos are one video.** Same 68s cut at two bitrates.
- **One "photograph" is a phone screenshot** of the site open inside Instagram's
  in-app browser, address bar and all. It is excluded by name in the generator.

### One room, travelled sideways

The page is not a document. The viewport is a camera, the page itself is fixed
in both axes, and the material moves under it — one very wide horizontal
composition holding all forty-nine photographs and both cuts, about 20,000px
across on a laptop.

The pointer sets a *speed*, not a place. Horizontal position across the
viewport maps through a squared curve to a target velocity: the middle 14% is
a dead zone that does not move at all, and everything past it accelerates to a
top speed of 32px a frame at the very edge. The camera eases into that target
rather than taking it, so it has weight — about a third of a second to reach a
pace and as long again to give it up, which is what makes returning the cursor
to the centre a settle instead of a stop. Wheel, trackpad and shift-wheel add
an impulse into the same momentum rather than being a second way of setting
position; arrow keys hold a slower one; a phone drags the room directly and
throws it on release.

The easing is framerate-independent — `vel += (want - vel) * (1 - (1 - EASE)^dt)`
rather than the bare `* EASE`, which would run the camera at double speed on a
120Hz panel.

### The composition is scored, not scattered

Fifty frames placed by a random number generator is the *"infinite masonry
reel wall"* this project rejects by name — the scatter has to be furniture.
`assets/js/archive.js` opens with a score: twelve beats, each a run of columns,
each column one or two frames, written as fractions of the band height.

    { after: 0.34, cols: [
      { items: [ { h: 0.29, cy: 0.27 }, { h: 0.29, cy: 0.73 } ] },
      { gap: 0.16, items: [ { h: 0.62, cy: 0.47 } ] } ] },

`h` is the frame's height against the band, `cy` where its centre sits in it,
`gap` the space before a column — negative to overlap the one before — and
`after` the breath left at the end of the beat. The beats run in order and
repeat, and the stills are dealt into them in the order they were shot, so the
archive reads as a walk past a wall someone hung. Everything about the
composition is those numbers; there is nothing else to edit. A phone gets its
own six-beat score, half the stills and both cuts, because the desktop
composition arrives on a 375px screen as a smear.

The one thing the score does not decide is a cut's size: a film is always
0.86 of the band whatever slot it lands in, and is given a fifth of a band of
air on either side. It is the event in its stretch of the archive, and an
event with a photograph lapped over its corner is not one.

### Three planes, and what parallax is allowed to be

Depth is carried by the plane, not the frame. A frame's on-screen offset from
the camera is `(itsX - cameraX) * factor`, at 0.9, 1 and 1.08 — which is not
the same as translating a layer at a different rate, and the difference is the
whole point. Under this arrangement the frame the camera is actually looking at
lands in the same place whichever plane it is on, and only its approach and
departure differ. A layer translated at 0.9 with its contents laid out in
camera space drifts a tenth of the whole archive out of register by the end;
this cannot.

The far plane sits back in the light as well as in the movement, at half
opacity. That is the entire 3D budget.

### What it costs to run

Three elements are promoted and transformed per frame — the planes. The
fifty figures inside them are never touched during motion, and everything
outside a screen and a half of the camera has `visibility: hidden`, so a wall
of fifty frames costs the compositor the eight that are in the room.

Loading is driven off the same distance test rather than off
`IntersectionObserver` or native `loading="lazy"`, both of which see a
transformed container as one element sitting in the viewport and would fetch
the archive. Arriving at the page costs nine requests. Each frame carries a
`srcset` of the 640px strip thumb and the 1600px view with `sizes` set to its
real placed width, so a large frame on a retina screen pulls the view and a
small one never does.

### How the cuts behave

The two cuts are the largest things in the room and the only things in it that
move on their own:

- **`preload="none"` and no `src` at all** until the camera is within a screen
  of them, and paused again the moment they are out of it. Two video decoders
  running behind an archive is two too many.
- **No play button and no controls.** They are muted, looped, autoplaying
  pieces of the composition, and they carry the one caption on the page — a
  slate with the title and the running time, which no photograph gets.
- **Clicking one opens it properly**: full size, with controls, with sound,
  from where it had got to.

### Opening a frame

There is no lightbox in the sense of a panel that appears over the page. The
clicked frame is measured where it stands, a copy is dropped at exactly those
coordinates, and that copy is animated to the stage — the photograph is the
transition. Because the stage preserves the frame's aspect ratio, the whole
move is a translate and a scale on one element rather than an animated
`width`/`height`, and the ground fades up behind a frame that is already
travelling. Closing reverses it into wherever the frame has since got to.

Stepping with the arrows moves the camera to the frame you are looking at, so
closing puts you where the archive says you are.

### The interface is four corners and a hairline

No masthead, no bands, no theme switch. The archive is the projection room
only: a paper version of a dark room you travel through would be a different
idea rather than the same one at another hour, so this is the one page that
does not carry the two grounds.

Position is reported by a 1px rule along the bottom filled to where the camera
has reached, and by a count of the frame nearest the middle of the screen. A
cue — `← MOVE YOUR CURSOR →` — fades in after a second and is retired for good
by the first pointer move, wheel, key or touch.

Under `prefers-reduced-motion` the pointer stops driving the camera entirely
and the page falls back to wheel, keys and drag. The travel is the page and
cannot be removed, but nothing has to move on its own.


### The key art lives apart

The 2026-05-25 delivery was not behind-the-scenes at all: it is finished key
art for eight productions. Those frames are in `assets/posters/`, named after
the film each belongs to rather than after the day they were sent, with
`assets/posters/posters.md` as the index — poster, what it shows, the catalogue
slug it maps to, and the frame it was prepped from.

Every title in that index was read off the poster itself; each carries its own
title and credit block, so none of it is inferred from a filename. Two things
in there are judgement rather than fact and are flagged as such: which of the
near-duplicate catalogue slugs is canonical, and the split between `La Casa De
Raisa Vanessa` and `Amore Serpente` — three posters print both names and are
filed under the second, on the grounds that it is the film they were cut for.

A strip carries its own `dir`, so a strip's photographs are found without the
page knowing anything about where they live. `tools/posters-split.mjs` did the
move and can do it again; it is idempotent in the sense that it only moves what
is still sitting in the backstage directory.

**The archive does not show them.** Finished key art is not behind the scenes
of anything, and forty-nine frames from the floor plus the two cuts is the
material the page is actually about. `archive.js` takes only strips whose `dir`
sits under `assets/backstage/` — read off the path rather than off the strip's
id, so a second batch of finished art filed under any name is left out on the
same grounds. The generator keeps classifying and writing the key art strip,
`assets/posters/` keeps its 43 derivatives and `posters.md` keeps its index;
nothing is deleted, and hanging them again is one line.

### The pipeline

Two scripts, run in order, whose output is committed. The site still has no
build step: this is asset prep, not a build.

```
node tools/backstage-prep.mjs     # dedupe, slug, resize, encode, park originals
node tools/backstage-data.mjs     # classify and write assets/js/backstage.js
```

`backstage-prep` writes two WebP sizes per frame into `assets/backstage/web/` —
a 640px `-thumb` for the wall and a 1600px `-view` for the opened frame — re-encodes
the two cuts, pulls a poster from each, and moves every original into
`assets/backstage/_src/`. It is idempotent: a second run only picks up what is
new, and it moves originals rather than deleting them.

The weights are the point. 106 MB of camera files at up to 5120px become 3.3 MB
of thumbnails, and a visitor pays for fewer than ten of those on arrival: the
views load one at a time as a frame is opened, and the cuts carry
`preload="none"` so 18 MB of video costs nothing until the camera reaches one.

`_src` is gitignored on the same argument as the film masters, and the deploy
drops it from `_site` as a second line of defence. The derivatives are what the
web needs and all it needs.

### Set titles

`backstage-data.mjs` declares at the top of the file which delivery batches carry
which kind of material — the floor photography and the key art — and the order
they run in. That is also where a frame is excluded by name. Change it there and
re-run; the generated `assets/js/backstage.js` is also safe to hand-edit, since
the page reads it directly and nothing sits between them.

## Local footage

`assets/films/` holds 24 720p reels, each matched to its film by name. Filenames keep
their delivered spaces and parens — `encodeURI` in `films.js` handles that.

Every film now carries its own reel — no entry borrows another's footage, and the
`substituteReel` flag is gone from `films.js`.

Loops are cut to one house recipe: 12s, silent, 720p25, starting at 15% into the master
(the point every earlier loop was cut from) —

```
ffmpeg -ss <15% of duration> -i "assets/films/<file>.mp4" -t 12 -an \
  -c:v libx264 -crf 27 -preset slow -maxrate 1500k -bufsize 3000k \
  -pix_fmt yuv420p -r 25 -movflags +faststart "assets/films/loops/<file>.mp4"
```

Where footage plays:

- **Homepage hero** — one reel per index title, muted loop at 38% behind the type.
- **Showcase** — pinned reel behind the rows at 45%, swapping on hover, or on scroll-end
  where there is no pointer to hover with.
- **Film pages** — full player with native controls, poster from the still.

Sources are attached on demand, not at page load, so a 24-film page opens one
connection rather than 24. Reduced-motion visitors get posters and never a moving frame.
The hero still fetches nothing on a touch device — only the showcase opts back in,
because there the reel is the interaction rather than a background.

### Two cuts per film

The masters run 780 MB, and two of them — Mirage at 121 MB, Amore Serpente at 120 MB —
sit above GitHub's hard 100 MB per-file ceiling, which rejects a push outright. Nor is
bitrate the problem: the masters are already at 2–3 Mbps. They are simply long.

So each film has two cuts, built from one filename in `FILE`:

| | Where | Size | Used by |
| --- | --- | --- | --- |
| **Loop** | `assets/films/loops/`, in the repo | 38 MB total, ~2 MB each | Hero and showcase stages |
| **Full** | A media host, **not** in the repo | 780 MB | Film page player |

The loops are 12s, silent, CRF 28, cut from 15% into each master to clear the fade-up.
That is all a muted hover background at 38% opacity needs.

The masters are gitignored. To serve the full cuts, upload them to a host and set one
constant at the top of `assets/js/films.js`:

```js
const FULL = 'https://media.example.com/films';
```

Every film page then plays its full cut. While `FULL` is empty the player falls back to
the 12s loop — short, but not broken.

## Credits

A film page renders up to three blocks, and each one only appears if there is data
behind it — **Cast**, **Crew**, and **Also credited** for names delivered with no role
against them. They come from three optional fields on a film entry:

```js
credits:      [{ role: 'Producer', name: 'Orfeo Çetin' }],   // → Crew
cast:         [{ role: 'Local Gambler', name: 'Mustafa' }],  // → Cast
alsoCredited: ['Kala Film', 'Dart Digital']                  // → Also credited
```

**Four films carry real credits**, transcribed from the delivered rolls in
`metadata.txt` into `CREDITS` / `CAST` / `ALSO` at the top of `films.js`: Mirage,
Constanze in Istanbul, and both La Casa entries (the short film and the trailer share
one roll). The source rolls are set in caps, which hides the ı/i and ş/s
distinctions, so Turkish orthography is restored here — `KILICARSLAN` is stored as
Kılıçarslan, `SAHIN` as Şahin. Six surnames are genuinely ambiguous from caps alone
and are marked `// ??` in `films.js`; check those against the crew before launch.

**The other twenty films carry no credits.** No invented names: an entry without a
`credits` array prints no Crew section at all, and the same holds for `cast` and
`alsoCredited`. Add the array to the entry in `films.js` when its roll arrives and the
section appears; delete a role line and the list reflows.

## Data

`assets/js/films.js` is the whole catalogue — edit that one file and every page follows.

```js
{
  slug: 'mirage',
  title: 'Mirage',
  client: 'Rafael Indiana',
  category: 'Short Films',
  still: '…thumbnail.jpg',
  video: REEL.mirage,
  hero: '…MIRAGE+2.JPG'    // optional, higher-res still
}
```

Add `year: '2024'` to any entry and it renders after the client automatically. No years
are in there now because the live site doesn't publish them — I didn't want to invent any.

`window.APOLLO_INDEX` picks the five titles on the homepage, in order.

## Things to know

- **Stills are still hotlinked** from the Squarespace CDN — they serve as video posters
  everywhere. Download them into `assets/img/` before going to production.
- **The four untitled Drôle De Monsieur films** are all called "Drole De Monsieur" on the
  live site, so I labelled them Film I–IV in the client line to tell them apart. Rename
  them in `films.js`.
- **The contact form opens a mail client.** Point it at Formspree, Basin, or your own
  endpoint for real submissions.
- **Space Grotesk is 601's own stated substitute** for changeling-neo. Swap the
  `--font` token if you licence the real face.
