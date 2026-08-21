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
| Display | `clamp(44px, 11vw, 150px)` / line-height `0.88` |
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
