# Product

## Register

brand

## Users

Apollo Films is an Istanbul film studio founded in 2022 by Rafael Indiana Çetin. Four
audiences arrive at this site, and all four are primary. They differ in what they came
to confirm, not in how much they matter.

**Brand and agency creative directors.** Looking for a production partner for a
campaign. They eliminate fast: a reel either reads in the first screen or the tab
closes. They are not reading copy on the first pass, they are judging tone from moving
footage. Everything else on the site exists to survive their second pass.

**Fashion houses and production partners.** The people behind Raisa Vanessa, Drôle De
Monsieur, Koton, Penti. They arrive with an aesthetic already in mind and are checking
whether the studio's register matches theirs. Category and client lines matter to them
more than film titles.

**Festival and cultural programmers.** Here for the short films: Mirage, Constanze in
Istanbul, La Casa. They want the director's authorship visible, credits legible, and a
single film reachable as its own page rather than only as a grid tile.

**Talent: crew, DOPs, directors.** Considering working with the studio. Production and
credits are their pages. They read what the studio says about how it works.

The job to be done is the same across all four: decide whether Apollo is the right
studio, from the work itself, in one sitting.

## Product Purpose

This site replaces the live apollofilms.co. It carries the full responsibility of the
studio's public face: win new work, and hold the complete 24 film archive so that any
single film is reachable, watchable, and credited.

Success is a creative director who watches a reel without deciding to, then finds the
contact page on their own.

It is a static site by choice. No build step, no framework, no dependency beyond one
webfont. The constraint is the point: nothing between the visitor and the footage.

## Brand Personality

**Bold, kinetic, fashion-forward.** With a specific and non-negotiable reading of each:

**Bold means scale, never weight.** The type is one weight, 400, everywhere. No bold
appears anywhere on the site. Boldness is a size decision and a tracking decision, which
is why a wordmark can run past 200px and a label can sit at 12px in the same viewport.
Both source systems agree on this: 601 Inc. specifies weight 400 across every role as a
deliberate anti-convention, A24 caps at 500. Adding a heavier weight would break the one
rule both systems share.

**Kinetic means the footage moves, not the interface.** Films play full-bleed behind the
type. The interface holds still so the work can move. Page motion is limited to arrival:
things fade and rise once, then stop being animated. Scroll is never hijacked, the
cursor is never decorated, and there is no entry animation.

**Fashion-forward means the aesthetic answers to the clients in the catalogue**, not to
the film-studio-website category. The reference axis is A24's structure over 601 Inc.'s
surface, run through fashion film work.

Voice: warm but not sentimental, emotional but not performative. Atmosphere, coherence,
and storytelling that travels across formats, cultures, and time. The studio does not
chase trends. Copy states and stops; it never sells.

## Anti-references

Four failure modes, all rejected explicitly.

**Template portfolio.** Squarespace and Wix studio themes: centered headings, an even
grid of equal thumbnails, "Our Work / Our Team / Our Process" sections, a stock hero
with a play button. This is the single most likely direction to drift back toward,
because it is what a film studio site is expected to look like.

**Agency SaaS aesthetic.** Gradients, rounded cards, drop shadows, glassmorphism,
hero-metric blocks, icon-heading-paragraph card grids. The system already forbids the
mechanics of these (`border-radius: 0`, `box-shadow: none`), and this section makes the
intent explicit rather than leaving it as a CSS accident.

**Infinite masonry reel wall.** Behance and Vimeo logic: 24 films poured onto one wall
with no hierarchy, every item weighted equally, ordered by upload date. The numbered
hairline rows exist specifically to refuse this. A film's number is its place in the
archive, and it keeps that number under every filter.

**Heavy motion showreel site.** WebGL transitions, cursor trails, custom scroll
hijacking, a loading animation before the first frame. These foreground the site over
the film. If a visitor notices the transition, the transition failed.

## Design Principles

**The footage is the only chroma.** Every color on the site comes from the films. The
interface is two grounds and one ink. This is what keeps a 24 film catalogue from
competing with itself, and it is why a fourth color is a structural decision rather than
a styling one.

**Bold by scale, never by weight.** One weight forces hierarchy into size and tracking,
where it is harder to fake. A design that needs a heavier weight to establish rank has
not finished designing the scale.

**A catalogue, not a wall.** Twenty-four films get order, number, and rank. Nothing is
presented as equal to everything else. Filtering changes what is shown, never what a
film is called or where it sits in the archive.

**Judged in thirty seconds.** The primary visitor eliminates before they read. The first
screen carries the work, not the story about the work. Copy earns its place only after
the footage has done its job.

**Readable before it is scripted.** No-JS rendering, reduced-motion paths, and keyboard
navigation are the baseline the page is built on, not a fallback bolted to the end. A
page that is blank without JavaScript has failed before accessibility is even measured.

## Accessibility & Inclusion

Target: **WCAG 2.2 AA**. This is a live commercial site, so AA is the defensible floor
rather than an aspiration.

Already in place and to be preserved:

- `prefers-reduced-motion` respected: reduced-motion visitors get posters, never a
  moving frame.
- Skip link and `sr-only` utility.
- `:focus-visible` outline at `1px solid currentColor` with `4px` offset, on the
  system's own ink rather than a browser default.
- Full readability without JavaScript. Motion hooks are gated on a `.js` class, and a
  2.5s fallback reveals everything if the IntersectionObserver never fires.

Standing risk areas, to be checked on any change:

- **Contrast over moving footage.** Cream on projection black is far above AA, but the
  hero and showcase run type over video at 38 to 45 percent opacity. Contrast there is
  frame-dependent and is the site's most likely AA failure.
- **Small tracked type.** `.label` at 12px and `.fine` at 15px are the deliberate break
  from 601's 42px floor. They are load-bearing for a 24 film catalogue and cannot be
  removed, so they must stay legible rather than get smaller.
- **Form errors.** The contact form is `novalidate` and currently opens a mail client.
  Any real endpoint needs programmatically associated, non-color-only error messaging.
- **Focus order through the pinned showcase reel.** The stage pins while the list
  scrolls; keyboard order must continue to follow the list, not the stage.
