---
name: Apollo Films
description: A projection room in a browser. Two grounds, one ink, one weight; all colour comes from the footage.
colors:
  celluloid-cream: "oklch(91.3% 0.063 99.6)"
  projection-black: "oklch(12% 0.008 99.6)"
typography:
  wordmark:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(64px, 13vw, 200px)"
    fontWeight: 400
    lineHeight: 0.82
    letterSpacing: "-0.04em"
  display:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(38px, 7.6vw, 128px)"
    fontWeight: 400
    lineHeight: 0.88
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(28px, 3vw, 46px)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(20px, 1.9vw, 26px)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  subhead:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(18px, 1.5vw, 22px)"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  lede:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(17px, 1.5vw, 21px)"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
    fontFeature: "ss01 on, cv11 on"
  label:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.16em"
rounded:
  none: "0"
spacing:
  gap: "12px"
  stack: "24px"
  stack-lg: "48px"
  stack-xl: "72px"
  gutter: "clamp(20px, 4vw, 56px)"
  band: "clamp(72px, 10vw, 120px)"
components:
  button:
    textColor: "{colors.celluloid-cream}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "12px 21px"
  button-hover:
    textColor: "{colors.celluloid-cream}"
  link:
    textColor: "{colors.celluloid-cream}"
    rounded: "{rounded.none}"
  input:
    textColor: "{colors.celluloid-cream}"
    typography: "{typography.subhead}"
    rounded: "{rounded.none}"
    padding: "6px 0 10px"
  nav-item:
    textColor: "{colors.celluloid-cream}"
    typography: "{typography.label}"
    padding: "0 21px"
  filter-chip:
    textColor: "{colors.celluloid-cream}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 21px 0 0"
  catalogue-row:
    textColor: "{colors.celluloid-cream}"
    rounded: "{rounded.none}"
    padding: "18px 0 22px"
---

# Design System: Apollo Films

## 1. Overview

**Creative North Star: "The Projection Room"**

Everything here is dark, and the only light in the room comes off the screen. The
interface is the room: two grounds, one ink, one typeface at one weight. The films are
the light. That division is absolute and it is the source of every other rule in this
document. When a new element is proposed, the first question is not whether it is
well-designed but whether it dims the projection.

The consequence is a system with almost no vocabulary. There is no third colour, no
second font weight, no radius, no shadow, no fill. What remains is scale, tracking,
opacity, and a 1px hairline. Those four are asked to do everything: rank a 24 film
catalogue, separate a form field from its label, distinguish a hovered row from a
committed one, carry a wordmark at 280px and a filter at 13px in the same viewport. The
constraint is not minimalism for taste. It is that a system with more vocabulary would
compete with the footage, and the footage is the work.

This system explicitly rejects the template film-studio portfolio (centered headings, an
even grid of equal thumbnails, "Our Work / Our Team / Our Process"), the agency SaaS
aesthetic (gradients, rounded cards, drop shadows, glassmorphism, hero-metric blocks),
the infinite masonry reel wall, and the heavy motion showreel site. The first is the most
dangerous, because it is what a film studio site is expected to look like and drift
returns there by default.

**Key Characteristics:**

- Two grounds alternating down every page: projection black and celluloid cream. The cut
  between them is the rhythm.
- One typeface, Space Grotesk, at weight 400 only. No bold appears anywhere.
- Hierarchy from scale and tracking, never from weight.
- A nine step opacity ladder, not a colour scale, carries rank.
- 1px hairline as the only border, the only divider, and the only button.
- Full-bleed. No max-width container, nothing centered.
- All chroma comes from the footage.

## 2. Colors

A two colour system with no accent, no state colour, and no semantic palette. Rank,
state, and emphasis are all expressed as opacity of the single ink.

### Primary

- **Celluloid Cream** (`oklch(91.3% 0.063 99.6)`, sRGB `#ece4b4`): every mark the system
  makes. All type on black, all hairlines, all borders, all focus rings, the selection
  highlight, and the cream ground itself. It is simultaneously the ink and the second
  ground, which is why it can never be tinted or shaded: a second cream would read as a
  mistake rather than a variant.

### Neutral

- **Projection Black** (`oklch(12% 0.008 99.6)`, sRGB `#060603`): the floor beneath
  everything, the masthead, the footer, and every video stage. Not `#000`. It carries the
  cream's own hue at the lowest chroma that survives 8-bit quantisation, so the two
  grounds belong to one light rather than to a colour and an absence. To the eye it is
  black; to the system it is the same light as the ink.

### Named Rules

**The Two Grounds Rule.** There are exactly two surfaces a section can land on: black or
cream. A third ground is forbidden. 601 Inc.'s Darkroom Shadow (`#4f4d3c`) exists in the
source system and is deliberately unused here, because in that system it is haze around
a still, not a band you can stand on. Introduced as a band, it reads as a third colour and
the black-to-cream cut stops being the rhythm.

**The Opacity Ladder Rule.** Rank is opacity, never colour. The ladder is fixed:
`0.26` (a catalogue row demoted by the focus state), `0.34` (an inactive phone index
entry), `0.38` (the hero reel under 88px titles), `0.45` (the showcase reel, and the
bullet separators), `0.5` (a resting catalogue row, a filter), `0.55` (a nav item, a
credit role), `0.62` (dimmed metadata, the `.dim` class), `0.85` (a button at rest, an
input at rest), `1` (active, hovered, committed). A new element takes a rung; it does not
invent one.

**The Footage Rule.** Every colour on this site that is not cream or black comes from a
film. Reels run at partial opacity so cream type stays legible over them, and the black
beneath the reel is the only scrim the palette permits. A gradient scrim is mixed from
`--black`, never from a colour of its own.

## 3. Typography

**Display Font:** Space Grotesk (with Helvetica Neue, Helvetica, Arial)
**Body Font:** Space Grotesk. The same face, at the same weight, at every size.
**Label Font:** Space Grotesk, uppercase, positively tracked.

Space Grotesk is 601 Inc.'s own stated substitute for Changeling-neo. Its slightly
mechanical grotesk forms hold at 280px, where a neutral sans would go generic, and its
tight default fit takes negative tracking without collapsing. Swap the `--font` token if
the real face is licensed.

**Character:** One face, one weight, an enormous range. The pairing is not a pairing at
all: it is a single voice speaking at very different volumes, from a carved 280px
wordmark down to a 10px cue. Everything expressive happens in scale and tracking.

### Hierarchy

Sizes below are quoted at 1440px, with the clamp in parentheses.

- **Wordmark** 187px (400, `clamp(64px, 13vw, 200px)`, line-height `0.82`, tracking
  `-0.04em`): the branded moment. Footer mark and film-page titles. One per page, never
  two.
- **Display** 109px (400, `clamp(38px, 7.6vw, 128px)`, line-height `0.88`, tracking
  `-0.04em`): page headings and the closing call. `text-wrap: balance`. A variant,
  `.display--line`, sizes off the viewport at `min(7vw, 112px)` to hold one line, and
  gives up and wraps below 560px.
- **Headline** 43px (400, `clamp(28px, 3vw, 46px)`, line-height `0.95`, tracking
  `-0.03em`): section heads within a band.
- **Title** 26px (400, `clamp(20px, 1.9vw, 26px)`, line-height `1.05`, tracking
  `-0.02em`): fact values, sub-heads.
- **Subhead** 22px (400, `clamp(18px, 1.5vw, 22px)`, line-height `1.25`, tracking
  `-0.02em`): credit names, the bullet-separated name list, anything that is a name
  rather than a heading. This is the step the scale was missing.
- **Lede** 21px (400, `clamp(17px, 1.5vw, 21px)`, line-height `1.45`, tracking `-0.01em`,
  max `40ch`): the single sentence under a display heading.
- **Body** (400, `16px`, line-height `1.6`, tracking `0`, max `58ch`): prose only, and
  prose appears on one page. Feature settings `ss01`, `cv11`.
- **Label** (400, `12px`, tracking `+0.16em`, uppercase): all metadata. Category, client,
  credit role, footer facts, form labels, sticky column heads.

### Named Rules

**The One Weight Rule.** `font-weight: 400` everywhere, including `h1` through `h4`,
`strong`, and `b`, which are explicitly reset. No bold appears anywhere on this site. A
design that needs a heavier weight to establish rank has not finished designing the
scale. Both source systems agree on this: 601 Inc. specifies weight 400 across every
role, A24 caps at 500. It is the one rule they share, and it is not negotiable here.

**The Tracking Follows Size Rule.** Tracking is a function of size, not a constant. Four
tiers, applied by the band a role lands in: `--tight-xl: -0.04em` at 100px and up
(wordmark, display), `--tight-lg: -0.03em` from 40 to 100px (headline, hero index, row
numerals, ethos words), `--tight-md: -0.02em` from 22 to 40px (title, subhead, field
text), `--tight-sm: -0.01em` from 17 to 22px (lede). Body sits at `0`: negative tracking
is a display treatment, and at 16px it closes the counters and costs the one thing that
size exists to provide. Uppercase labels remain `+0.16em`. A single flat `-0.04em` across
every size reads as carved at 128px and as cramped at 22px.

**The Headroom Rule.** Every clamp ceiling lands past 1650px, never at 1300. A scale whose
ceilings are reached at 1273px puts an ordinary laptop at the system's maximum with no
headroom left, and the result reads as shouting rather than as large. When adding a role,
check where its ceiling is reached before checking how it looks.

**The Broken Floor Rule.** 601 Inc. forbids text under 42px. This system breaks that rule
on purpose and only there: `.label` at 12px and `.fine` at 15px exist because a 24 film
catalogue needs categories, clients, and filters that do not shout. Those two sizes are
load-bearing and cannot be removed. They also cannot get smaller: they are already the
system's accessibility floor.

## 4. Elevation

There is no elevation. `box-shadow: none` and `border-radius: 0` are set on the universal
selector, so a shadow or a corner cannot be introduced by accident anywhere in the
cascade. Nothing on this site is a raised surface, and there is no shadow vocabulary to
document.

Depth is real, but it is built from four other mechanisms, all of which are load-bearing
and none of which involve a shadow.

### Named Rules

**The Opacity Is Rank Rule.** The nine step ladder in section 2 is the z-axis. An element
being in front is said with brightness, not with a shadow under it. This is the most
widely used depth mechanism in the system: nav, catalogue rows, buttons, links, filters,
and credits all rank this way.

**The Rotation, Not Glow Rule.** The one component with genuine volume, the ethos card,
gets it from rotation: `perspective: 900px` on the frame, an idle sway of `±7deg` on Y and
`±1.6deg` on X over 8s, a pointer tilt driven by `--rx` / `--ry`, and a still that drifts
from `scale(1.08)` to `scale(1.15)` over 14s. A card's volume is stated by turning it
over, never by putting a shadow beneath it. On wide flow-mode frames the sway is halved
to `±3.5deg`, because the same gesture read across 600px of frame swings the corners into
the gutter.

**The Layer Is Pinning Rule.** Stacking is a scroll behaviour, not a shadow. The reel
stage is `position: sticky` and the list rides over it, pulled up by a negative margin
equal to the stage height. The hero on a phone does the same thing with the deck. Z-order
is established by what is pinned and what is scrolling, which means depth here is
something the reader produces rather than something the page draws.

**The Hairline Is The Only Border Rule.** `1px solid currentColor` is the sole separating
device: section heads, catalogue rows, credits, form fields, the footer bar, the ethos
frame, and the button. There is no second thickness, no fill, and no box. A border is a
line, never a surface.

## 5. Components

### Buttons

The system has exactly one action pattern.

- **Shape:** square (`border-radius: 0`, enforced globally)
- **Primary and only variant:** `1px solid currentColor` outline, never a fill. Padding
  `12px 21px`. Label typography: 15px, `+0.16em`, uppercase. Rest opacity `0.85`.
- **Hover / Focus:** opacity to `1` over `0.18s ease`. Focus adds
  `outline: 1px solid currentColor` at `4px` offset.
- **Width:** `width: fit-content` with `align-self: flex-start`. Every stack on the site
  is a flex column, which would otherwise stretch the outline to full width. The outline
  is the button, so it has to end where the words end.
- There is no secondary button. The alternative to a button is `.link`.

### Links

- **Style:** 13px, `+0.16em`, uppercase, opacity `0.62`, with a trailing arrow.
- **Hover:** opacity to `1`; the arrow translates `5px` on
  `cubic-bezier(0.2, 0.7, 0.2, 1)`. The arrow leans the way it points.

### Chips (filters)

- **Style:** no background, no border, no box. Text only, 13px, `+0.16em`, uppercase.
- **Separator:** a `•` glyph at `21px` margin, opacity `0.45`. Never a rule, never a pill.
- **State:** unselected `0.5`, selected or hovered `1`, driven by `aria-pressed`.
- The whole filter bar closes on a single bottom hairline, and a count sits at
  `margin-left: auto`.

### Cards / Containers

There are no cards and no containers. Content sits directly on a band. The one framed
object in the system is the **ethos frame**: a `3/2` aspect box with `1px solid
currentColor`, no fill, no radius, no shadow, holding a cross-faded still. It is a frame,
not a card, and it is the only one.

### Inputs / Fields

- **Style:** no box. Transparent background, `border: 0`, and a single
  `border-bottom: 1px solid cream`. Padding `6px 0 10px`.
- **Type size:** `clamp(20px, 2.2vw, 28px)` with display tracking. The field is set at
  near-title scale, so the answer is larger than its own question. The label above it is
  12px uppercase at `0.62`.
- **Focus:** `outline: none`, opacity `0.85` to `1`. The state change is brightness, per
  the opacity ladder.
- **Checkbox:** `15px` square with `accent-color` set to cream.

### Navigation

- **Style:** 15px, `+0.16em`, uppercase, opacity `0.55`, separated by a `•` glyph at
  `21px` padding. Not dividers, not underlines.
- **Active / Hover:** opacity `1`, matched on `aria-current="page"`.
- **Mobile (≤780px):** the bar collapses to a `Menu` toggle; the panel drops full width
  under a hairline, items at 22px with the bullets removed.
- The masthead is `position: sticky` on black with a bottom hairline.

### Catalogue Row (signature component)

The archive's whole interface, and the component that refuses the masonry wall.

- **Grid:** `minmax(84px, 12vw) minmax(0, 1fr) minmax(0, 22ch) 14ch`, baseline aligned.
  Numeral, title, client, category. At ≤1100px the client column drops; at ≤780px the
  category drops too.
- **Numeral:** `clamp(38px, 7vw, 110px)`, `tabular-nums`, display tracking. **A film's
  number is its place in the archive, not its position in the current view.** Filtering
  never renumbers.
- **Separator:** a top hairline per row; the last visible row also takes a bottom hairline,
  so a filtered list still closes on a rule.
- **Rest / active:** `0.5` to `1`.
- **Without a pointer** (`.catalogue--focus`, set from `(hover: none)`): rows drop to
  `0.26`, the committed row alone goes to `1`, its hairline redraws at full strength with
  `scaleX` over `0.6s`, and it alone opens for a `● NOW PLAYING` cue. The cue holds zero
  height until commit, so twenty-four rows do not each carry an empty line.

## 6. Do's and Don'ts

### Do:

- **Do** land every section on one of the two grounds, black (`oklch(12% 0.008 99.6)`) or
  cream (`oklch(91.3% 0.063 99.6)`), and close every page on a cream band before the black
  footer.
- **Do** take a rung on the opacity ladder (`0.26 / 0.34 / 0.38 / 0.45 / 0.5 / 0.55 / 0.62
  / 0.85 / 1`) for any new state. Do not invent a rung.
- **Do** set everything at `font-weight: 400`, and build hierarchy from scale and tracking.
- **Do** use `1px solid currentColor` as the only border, divider, frame, and button.
- **Do** ease with the system's own curves: `cubic-bezier(0.16, 1, 0.3, 1)` for entrances,
  `cubic-bezier(0.2, 0.7, 0.2, 1)` for element motion, `cubic-bezier(0.22, 0.61, 0.36, 1)`
  for the commit. All are ease-out. None overshoot.
- **Do** keep state transitions at `0.18s`, media cross-fades at `0.55s` to `0.7s`, and
  entrances at `0.85s` to `1s`.
- **Do** write both a plain sRGB hex and the canonical OKLCH for any new colour, hex first.
  There is no build step, so there is no autoprefixer to write the fallback.
- **Do** keep every entrance gated on the `.js` class, so a page without script is fully
  readable rather than blank.
- **Do** switch looping animations off outright under `prefers-reduced-motion`, not merely
  down to `0.01ms`. An infinite animation at `0.01ms` still churns frames for no gain.

### Don't:

- **Don't** build a **template portfolio**: centered headings, an even grid of equal
  thumbnails, "Our Work / Our Team / Our Process" sections, a stock hero with a play
  button. This is the most likely drift and it is named in PRODUCT.md as the primary
  anti-reference.
- **Don't** reach for the **agency SaaS aesthetic**: gradients, rounded cards, drop
  shadows, glassmorphism, hero-metric blocks, or icon-heading-paragraph card grids. The
  global `border-radius: 0` and `box-shadow: none` already block the mechanics; do not
  route around them.
- **Don't** pour the archive into an **infinite masonry reel wall** with every item
  weighted equally and ordered by upload date. The numbered hairline rows exist to refuse
  exactly this.
- **Don't** build a **heavy motion showreel site**: WebGL transitions, cursor trails,
  custom scroll hijacking, or a loading animation before the first frame. If a visitor
  notices the transition, the transition failed.
- **Don't** introduce a third ground colour, including 601 Inc.'s Darkroom Shadow
  (`#4f4d3c`). As a band it reads as a third colour and softens the cut.
- **Don't** add a second font weight, a second typeface, or a bold anywhere.
- **Don't** use `border-left` or `border-right` above 1px as a coloured accent stripe.
- **Don't** centre anything. Everything anchors to the left, or to the viewport edges.
- **Don't** wrap content in a max-width container. The system is full-bleed; only prose
  (`58ch`), lede (`34ch`), and the form (`620px`) carry a measure.
- **Don't** shrink `.label` (12px) or `.fine` (15px) any further. They are the deliberate
  break from 601's 42px floor and they are already the accessibility floor.
- **Don't** put type over a reel without checking contrast on a bright frame. Cream on
  black is 15.8:1, but over footage at `0.38` to `0.45` opacity the ratio is
  frame-dependent, and it is this system's most likely WCAG 2.2 AA failure.
