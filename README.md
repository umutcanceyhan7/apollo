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

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Hero only — five titles at display scale, hovering one runs that film's reel full-bleed behind them — then the studio note and a one-line CTA |
| `showcase.html` | The catalogue — 24 numbered hairline rows over a pinned reel that swaps on hover, filtered by category |
| `production.html` | Ethos + six principles as a numbered display list |
| `about.html` | Studio text, left-aligned, two-column with side labels |
| `contact.html` | Form in the system's type; submitting opens the user's mail client |
| `film.html?f=<slug>` | Full-bleed player with controls, cast/crew credits, prev/next |

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
| Footer | One carved wordmark over one hairline over one row of facts — no columns, and it never repeats a line from the page above it |
| Non-negotiable | `border-radius: 0`, `box-shadow: none`, no fourth colour, nothing centred |

Two grounds alternate down every page — black and cream — so rhythm comes from
value, never from colour. This is A24's rule taken literally: the cut between the
two bands *is* the rhythm, so a third ground only softens it. Every page closes on
a cream band before the black footer, which is the last cut on the way out.
All chroma on the site comes from the footage.

### Where the merge breaks 601 on purpose

601 forbids any text under 42px. That works for a studio showing one film per screen;
it does not work for a 24-film catalogue with categories, clients and filters. So labels
and secondary text keep A24's small tracked treatment (`.label` at 12px, `.fine` at
15px), and everything else follows 601. That's the only rule bent.

## Local footage

`assets/films/` holds 21 720p reels, each matched to its film by name. Filenames keep
their delivered spaces and parens — `encodeURI` in `films.js` handles that.

**Three films have no reel of their own** and currently borrow the nearest one. They're
flagged `substituteReel: true` in `films.js` — drop the missing files in and point the
`REEL` entry at them:

| Film | Borrowing |
| --- | --- |
| La Casa (Short Films) | Amore Serpente |
| La Casa (Trailers) | Amore Serpente Trailer |
| Club Marvy | Penti Beach |

Where footage plays:

- **Homepage hero** — one reel per index title, muted loop at 38% behind the type.
- **Showcase** — pinned reel behind the rows, swapping on hover at 45%.
- **Film pages** — full player with native controls, poster from the still.

Sources are attached on demand, not at page load, so a 24-film page opens one
connection rather than 24. Reduced-motion visitors get posters and never a moving frame.

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

**The other twenty films are placeholders.** Nine crew lines each, generated at the
bottom of `films.js` from a rotating pool — none of those people worked on those films.
Replace them before launch. A film that already has its own `credits` is skipped by the
generator; delete a role line and the list reflows.

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
