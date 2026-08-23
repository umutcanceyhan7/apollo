/* ============================================================
   Apollo Films — the BTS archive engine.

   The camera, the composition and the frame that opens. Three things,
   in that order, in one file with no dependencies and no build step —
   the rest of this site is plain scripts and this page does not get to
   introduce a toolchain for one page's sake.

   The whole page is one transform per plane per frame. Nothing here
   ever writes `left`, `top`, `width` or `height` during motion; those
   are written once at layout and again on resize, and everything in
   between is `translate3d` on three elements.

   Reads window.APOLLO_BACKSTAGE (assets/js/backstage.js).
   ============================================================ */

(function () {
  'use strict';

  var DATA = window.APOLLO_BACKSTAGE;
  var rail = document.getElementById('rail');
  var room = document.getElementById('archive');
  if (!DATA || !rail || !room) return;

  /* Where a frame's two sizes live. A strip carries its own `dir` — the
     floor is shot material under assets/backstage/web/, the key art is cut
     posters under assets/posters/ — so the path is a property of the strip
     and never of this file. The constant is only the fallback for a strip
     written before that field existed. */
  var BASE = 'assets/backstage/web/';

  var planes = {
    back: rail.querySelector('[data-plane="back"]'),
    main: rail.querySelector('[data-plane="main"]'),
    fore: rail.querySelector('[data-plane="fore"]')
  };

  /* Depth, as a rate. A frame's on-screen offset from the camera is
     (itsX - cameraX) * factor, which means the frame the camera is looking
     at lands in the same place whatever plane it is on, and only the
     approach and the departure differ. That is what keeps the parallax a
     sense of depth rather than a layer sliding out of register. */
  var DEPTH = { back: 0.9, main: 1, fore: 1.08 };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var coarse = window.matchMedia('(hover: none), (pointer: coarse)');

  /* ---------------------------------------------------------------
     1. THE SCORE

     The archive is not scattered by a random number generator; it is
     scored. Each beat below is a group of columns, each column is one or
     two frames, and the numbers are the only place the composition
     lives:

        gap  — space before this column, in units of the band height.
               Negative means the column overlaps the one before it.
        h    — frame height, as a fraction of the band.
        cy   — where its centre sits in the band, 0 top to 1 bottom.
        p    — which plane it hangs on.
        after— the breath left after the whole beat.

     The beats run in order and repeat, and stills are dealt into them in
     the order they were shot, so the archive reads as a walk past a wall
     someone hung rather than a shuffle. Change a number here and the
     composition changes; there is nothing else to edit.
     --------------------------------------------------------------- */

  var BEATS = [
    /* Arrival. One frame, alone, and a silence after it — the first thing
       the room says is that it has room. */
    { after: 0.30, cols: [ { items: [ { h: 0.86, cy: 0.50 } ] } ] },

    /* A low pair with a detail riding above the seam. */
    { after: 0.22, cols: [
      { items: [ { h: 0.56, cy: 0.60 } ] },
      { gap: 0.10, items: [ { h: 0.34, cy: 0.24, p: 'fore' } ] },
      { gap: -0.05, items: [ { h: 0.70, cy: 0.54 } ] } ] },

    /* A column of two against one tall. The stack is the contact sheet
       showing through. */
    { after: 0.26, cols: [
      { items: [ { h: 0.40, cy: 0.28 }, { h: 0.40, cy: 0.72 } ] },
      { gap: 0.12, items: [ { h: 0.80, cy: 0.48 } ] } ] },

    /* Far wall. One frame on the back plane, dimmer and set back, with air
       on either side of it. */
    { after: 0.44, gapBefore: 0.20, cols: [
      { items: [ { h: 0.44, cy: 0.38, p: 'back' } ] } ] },

    /* A tight run — four frames close enough to read as one gesture. */
    { after: 0.28, cols: [
      { items: [ { h: 0.48, cy: 0.36 } ] },
      { gap: 0.04, items: [ { h: 0.36, cy: 0.70 } ] },
      { gap: 0.03, items: [ { h: 0.60, cy: 0.46 } ] },
      { gap: 0.05, items: [ { h: 0.34, cy: 0.74, p: 'fore' } ] } ] },

    /* Two large, overlapping by a hair, on different planes so the overlap
       reads as one being nearer. */
    { after: 0.30, cols: [
      { items: [ { h: 0.74, cy: 0.44 } ] },
      { gap: -0.08, items: [ { h: 0.62, cy: 0.64, p: 'fore' } ] } ] },

    /* High band. Everything sits above the middle and the floor is empty —
       which is where a word goes. */
    { after: 0.24, cols: [
      { items: [ { h: 0.44, cy: 0.32 } ] },
      { gap: 0.16, items: [ { h: 0.52, cy: 0.28 } ] },
      { gap: 0.08, items: [ { h: 0.36, cy: 0.34, p: 'back' } ] } ] },

    /* One big, held. */
    { after: 0.34, gapBefore: 0.12, cols: [
      { items: [ { h: 0.84, cy: 0.52 } ] } ] },

    /* A drift down: three frames stepping toward the floor. */
    { after: 0.26, cols: [
      { items: [ { h: 0.38, cy: 0.30 } ] },
      { gap: 0.10, items: [ { h: 0.50, cy: 0.50 } ] },
      { gap: 0.10, items: [ { h: 0.60, cy: 0.68 } ] } ] },

    /* Stack against stack, close. The densest thing in the room. */
    { after: 0.34, cols: [
      { items: [ { h: 0.38, cy: 0.28 }, { h: 0.46, cy: 0.72 } ] },
      { gap: 0.06, items: [ { h: 0.66, cy: 0.48 } ] },
      { gap: 0.06, items: [ { h: 0.34, cy: 0.26, p: 'fore' } ] } ] },

    /* Low and wide, with the back plane carrying the far one. The top of
       the band is left clear. */
    { after: 0.26, cols: [
      { items: [ { h: 0.58, cy: 0.66 } ] },
      { gap: 0.18, items: [ { h: 0.46, cy: 0.62, p: 'back' } ] } ] },

    /* A pause, then a pair either side of the middle. */
    { after: 0.38, gapBefore: 0.18, cols: [
      { items: [ { h: 0.50, cy: 0.34 } ] },
      { gap: 0.08, items: [ { h: 0.50, cy: 0.70 } ] } ] }
  ];

  /* A phone is a different room. Fewer frames stand up at once, each one is
     larger against the band, and the breath between beats is longer —
     otherwise the same composition arrives as a smear. */
  var BEATS_SMALL = [
    { after: 0.26, cols: [ { items: [ { h: 0.72, cy: 0.48 } ] } ] },
    { after: 0.22, cols: [
      { items: [ { h: 0.46, cy: 0.30 } ] },
      { gap: 0.08, items: [ { h: 0.54, cy: 0.72 } ] } ] },
    { after: 0.34, cols: [ { items: [ { h: 0.64, cy: 0.56, p: 'back' } ] } ] },
    { after: 0.22, cols: [
      { items: [ { h: 0.50, cy: 0.64 } ] },
      { gap: 0.06, items: [ { h: 0.40, cy: 0.28, p: 'fore' } ] } ] },
    { after: 0.36, cols: [ { items: [ { h: 0.76, cy: 0.50 } ] } ] },
    { after: 0.24, cols: [
      { items: [ { h: 0.42, cy: 0.30 } ] },
      { gap: 0.10, items: [ { h: 0.52, cy: 0.68 } ] } ] }
  ];

  /* ---------------------------------------------------------------
     THE LINE

     One sentence, broken across the travel and set into the empty bands
     the score leaves above and below the frames. A reader going sideways
     picks it up a word at a time, and meets it whole at the end.

     `at` is the beat the word lands after; `cy` puts it in the band the
     photographs of that beat are NOT using — the high-band beat gets a
     word on the floor, the low-and-wide beat gets one near the ceiling.
     Change a number here and the reading changes; the words themselves
     are the only copy on this page. */

  var LINE = [
    { at: 1,  word: 'We',        cy: 0.14 },
    { at: 2,  word: 'capture',   cy: 0.86 },
    { at: 4,  word: 'moments.',  cy: 0.16 },
    { at: 6,  word: 'They',      cy: 0.84 },
    { at: 8,  word: 'become',    cy: 0.18 },
    { at: 10, word: 'memories.', cy: 0.82 }
  ];

  var LINE_FULL = 'We capture moments. They become memories.';

  /* Same index in, same number out, every visit — the jitter that keeps a
     column from looking ruled is furniture, not a reshuffle. */
  function hash(i, salt) {
    var x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  /* ---------------------------------------------------------------
     2. THE MATERIAL
     One running order: every still in the order it was shot, with the two
     cuts dropped in where the travel wants an event — one early enough to
     be found in the first few seconds, one past the middle.
     --------------------------------------------------------------- */

  /* The archive is shot material only. `tools/backstage-data.mjs` also
     classifies a key art strip — finished posters, cut after the fact, kept
     in assets/posters/ — and those are not behind the scenes of anything.
     The assets stay where they are and the generator keeps writing the
     strip; this page just does not hang it.

     Read off `dir` rather than off the strip's id, so a second batch of
     finished art filed under any name is left out on the same grounds. */
  var stills = [];
  DATA.strips.forEach(function (strip) {
    var dir = strip.dir || BASE;
    if (dir.indexOf('assets/backstage/') !== 0) return;
    strip.shots.forEach(function (shot) {
      stills.push({ kind: 'shot', shot: shot, strip: strip });
    });
  });

  var films = (DATA.films || []).map(function (f, i) {
    return { kind: 'film', film: f, n: i };
  });

  var order = stills.slice();
  if (films[0]) order.splice(Math.min(3, order.length), 0, films[0]);
  if (films[1]) order.splice(Math.round(order.length * 0.62), 0, films[1]);

  /* ---------------------------------------------------------------
     3. BUILDING
     Every frame is built once. Layout runs again on resize; the elements
     do not.
     --------------------------------------------------------------- */

  var built = [];      /* every frame, built once */
  var items = [];      /* the ones this viewport places, in travel order */
  var viewable = [];   /* the placed stills — what the viewer steps through */
  var small = false;

  order.forEach(function (entry, i) {
    var it = { i: i, kind: entry.kind, x: 0, y: 0, w: 0, h: 0, loaded: false };

    if (entry.kind === 'film') {
      var f = entry.film;
      it.ratio = 720 / 1280;
      it.el = document.createElement('figure');
      it.el.className = 'frame frame--film';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'frame__btn';
      btn.setAttribute('aria-label', 'Play ' + f.title + ', behind the scenes');

      var vid = document.createElement('video');
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.setAttribute('playsinline', '');
      vid.setAttribute('muted', '');
      vid.preload = 'none';
      vid.poster = f.poster;
      vid.tabIndex = -1;

      btn.appendChild(vid);
      it.el.appendChild(btn);
      it.video = vid;
      it.film = f;
      it.src = f.src;
      it.title = f.title;

      /* The one caption in the room, and it is a slate: name, running time,
         nothing else. */
      var slate = document.createElement('figcaption');
      slate.className = 'slate';
      slate.innerHTML = '<span>' + f.title + '</span><span class="slate__run">' +
        Math.floor(f.seconds / 60) + ':' + String(f.seconds % 60).padStart(2, '0') + '</span>';
      it.el.appendChild(slate);

      btn.addEventListener('click', function () { openViewer(it); });

    } else {
      var s = entry.shot;
      it.ratio = s.w / s.h;
      it.slug = s.s;
      it.dir = entry.strip.dir || BASE;
      it.title = entry.strip.title;

      it.el = document.createElement('figure');
      it.el.className = 'frame';

      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'frame__btn';
      b.setAttribute('aria-label', 'View frame — ' + entry.strip.title);

      var img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.width = s.w;
      img.height = s.h;

      b.appendChild(img);
      it.el.appendChild(b);
      it.img = img;

      b.addEventListener('click', function () { openViewer(it); });
    }

    it.plane = 'main';
    built.push(it);
  });

  /* The words and the sign-off are built once, like the frames, and hang on
     the planes so they travel with the room rather than floating over it. */

  var words = LINE.map(function (m) {
    var el = document.createElement('p');
    el.className = 'word';
    el.textContent = m.word;
    planes.main.appendChild(el);
    return { at: m.at, cy: m.cy, el: el };
  });

  /* The end of the travel: the sentence whole, and the one way out of the
     archive that is not the corner nav. */
  var signoff = document.createElement('div');
  signoff.className = 'signoff';
  signoff.innerHTML =
    '<p class="signoff__line">' + LINE_FULL + '</p>' +
    '<a class="signoff__cta" href="contact.html">Start a project</a>';
  planes.main.appendChild(signoff);

  var totalEl = document.querySelector('[data-total]');

  /* ---------------------------------------------------------------
     4. LAYOUT
     The score, resolved against the viewport. Runs at start and on resize.
     --------------------------------------------------------------- */

  var vw = 0, vh = 0, band = 0, maxX = 0, contentW = 0;
  var signoffShown = false;

  function layout() {
    /* A page opened in a background tab can report a zero viewport in some
       engines, and a composition scored against zero is a stack of nothing.
       The fallbacks are a floor, not a guess — the loop below notices the
       real numbers the moment they exist and lays out again. */
    vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    vh = window.innerHeight || document.documentElement.clientHeight || 800;
    small = vw < 760;

    var padTop = small ? 62 : 86;
    var padBot = small ? 74 : 104;
    band = Math.max(220, vh - padTop - padBot);

    var score = small ? BEATS_SMALL : BEATS;
    var maxW = Math.max(200, vw * (small ? 0.78 : 0.56));

    /* Half the stills on a phone — every other one, so both shoots survive
       the cut rather than the tail being lopped off, and both cuts always
       do. The frames left out are built and kept; they are simply not in
       this room, and a rotation back to a wide viewport puts them back. */
    var seen = 0;
    items = built.filter(function (b) {
      if (b.kind === 'film') return true;
      return small ? (seen++ % 2 === 0) : (seen++, true);
    });

    viewable = [];
    for (var q = 0; q < built.length; q++) {
      built[q].el.style.display = 'none';
      /* null, not false: promote() only writes on a change, so the record
         has to say "unknown" or the first pass will agree with itself and
         leave every off-screen frame painted. */
      built[q].vis = null;
    }
    for (var r = 0; r < items.length; r++) {
      items[r].el.style.display = '';
      if (items[r].kind !== 'film') {
        items[r].at = viewable.length;
        items[r].el.querySelector('.frame__btn')
          .setAttribute('aria-label', 'View frame ' + (viewable.length + 1) + ' — ' + items[r].title);
        viewable.push(items[r]);
      }
    }
    if (totalEl) totalEl.textContent = '/ ' + pad(items.length);
    lastCount = -1;

    var x = vw * (small ? 0.10 : 0.16);   /* lead-in: the room starts empty */
    var at = 0;                            /* which item we are dealing */
    var beat = 0;

    /* Every word starts unplaced. A short room may not reach every beat, and
       a word with nowhere to go must not be left at last resize's position. */
    words.forEach(function (w) { w.placed = false; w.el.style.display = 'none'; });

    while (at < items.length) {
      var B = score[beat % score.length];
      beat++;

      x += (B.gapBefore || 0) * band;

      for (var c = 0; c < B.cols.length && at < items.length; c++) {
        var col = B.cols[c];
        x += (col.gap || 0) * band;

        /* Deal this column's frames, measure them, then place them centred
           on the column so a stack of two reads as one column. */
        var taken = [];
        var colW = 0;
        var colFilm = false;
        for (var k = 0; k < col.items.length && at < items.length; k++) {
          var slot = col.items[k];
          var it = items[at++];

          /* A cut is always the largest thing in its neighbourhood, whatever
             slot it lands in — it is the event, not a frame that happens to
             be tall. */
          if (it.kind === 'film') colFilm = true;
          var hf = it.kind === 'film' ? (small ? 0.74 : 0.86) : slot.h;
          var ih = hf * band;
          var iw = ih * it.ratio;
          if (iw > maxW) { iw = maxW; ih = iw / it.ratio; }

          it.h = Math.round(ih);
          it.w = Math.round(iw);
          it.plane = it.kind === 'film' ? 'main' : (slot.p || 'main');
          it.slotCy = slot.cy;
          taken.push(it);
          if (iw > colW) colW = iw;
        }

        /* A cut is given air on both sides whatever the beat asked for. It
           is the event in its stretch of the archive, and an event with a
           photograph lapped over its corner is not one. */
        if (colFilm) x += band * 0.22;

        for (var j = 0; j < taken.length; j++) {
          var t = taken[j];
          /* ±4% of the band, from the index. Enough that no two columns are
             ever exactly ruled to each other; not enough to read as noise. */
          var jitter = (hash(t.i, 3) - 0.5) * band * 0.08;
          var cy = padTop + t.slotCy * band;
          var top = cy - t.h / 2 + jitter;

          /* A photograph may run almost to the edge of the room — that bleed
             is half of why the wall reads as a wall. A cut may not: it
             carries a slate under it, and the slate has to clear the bottom
             row of the interface. */
          var lo = t.kind === 'film' ? padTop * 0.4 : 10;
          var hi = vh - t.h - (t.kind === 'film' ? padBot : 10);
          top = Math.max(lo, Math.min(Math.max(lo, hi), top));

          t.x = Math.round(x + (colW - t.w) / 2);
          t.y = Math.round(top);

          var f = DEPTH[t.plane];
          t.el.style.width = t.w + 'px';
          t.el.style.height = t.h + 'px';
          t.el.style.left = Math.round(t.x * f) + 'px';
          t.el.style.top = t.y + 'px';

          if (t.el.parentNode !== planes[t.plane]) planes[t.plane].appendChild(t.el);

          /* `sizes` is the frame's real width on this viewport, so the
             browser takes the 640 strip thumb for anything small and only
             reaches for the 1600 view where the frame is actually large
             enough to want it. */
          if (t.img) t.img.sizes = t.w + 'px';
        }

        x += colW + (colFilm ? band * 0.22 : 0);
      }

      /* A word takes the beat's own trailing breath as its room, rather than
         adding travel of its own — the sentence is set INTO the silence the
         composition already leaves, which is the whole point of it. */
      for (var wi = 0; wi < words.length; wi++) {
        if (words[wi].at !== beat - 1) continue;
        var wd = words[wi];
        wd.el.style.display = '';
        /* Measured, not guessed: the type is fluid and a word's width is
           whatever the viewport made it. */
        var ww = wd.el.offsetWidth, wh = wd.el.offsetHeight;
        var wx = x + ((B.after || 0.3) * band - ww) / 2;
        wd.el.style.left = Math.round(Math.max(x + 8, wx)) + 'px';
        wd.el.style.top = Math.round(padTop + wd.cy * band - wh / 2) + 'px';
        wd.placed = true;
      }

      x += (B.after || 0.3) * band;
    }

    /* The sentence whole, after the last photograph, with the way out under
       it. It gets a screen of its own: arriving at a sign-off that is still
       shoulder to shoulder with the archive is not arriving anywhere. */
    x += band * (small ? 0.34 : 0.46);
    var sw = signoff.offsetWidth, sh = signoff.offsetHeight;
    signoff.style.left = Math.round(x) + 'px';
    signoff.style.top = Math.round(padTop + band / 2 - sh / 2) + 'px';
    x += sw;

    contentW = x + vw * (small ? 0.12 : 0.18);
    maxX = Math.max(0, contentW - vw);

    for (var p in planes) {
      if (planes.hasOwnProperty(p)) planes[p].style.width = Math.round(contentW * DEPTH[p]) + 'px';
    }

    pos = Math.min(pos, maxX);
    render(true);
    promote(true);
  }

  /* ---------------------------------------------------------------
     5. LOADING
     Nothing is fetched until the camera is within a screen or two of it,
     and the two cuts are only attached when they are nearly in the room.
     --------------------------------------------------------------- */

  function promote(force) {
    var near = vw * 1.6;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var left = it.x - pos;
      var vis = left < vw + near && left + it.w > -near;

      if (vis && !it.loaded) {
        it.loaded = true;
        if (it.img) {
          it.img.srcset = it.dir + it.slug + '-thumb.webp 640w, ' + it.dir + it.slug + '-view.webp 1600w';
          it.img.src = it.dir + it.slug + '-thumb.webp';
          /* Decoded before shown where the browser will say so, but never
             waiting on it: a tab that is not in front parks decode()
             indefinitely, and a frame that is loaded and not shown is just
             a hole in the wall. Whichever answer arrives first wins. */
          (function (el, node) {
            var shown = false;
            function show() { if (shown) return; shown = true; el.classList.add('is-in'); }
            if (node.decode) node.decode().then(show, show);
            if (node.complete) show();
            else {
              node.addEventListener('load', show, { once: true });
              node.addEventListener('error', show, { once: true });
            }
          })(it.el, it.img);
        }
      }

      if (it.kind === 'film') {
        var close = left < vw * 1.1 && left + it.w > -vw * 0.4;
        if (close && !it.video.src) {
          it.video.src = it.src;
          it.el.classList.add('is-in');
        }
        /* Paused the moment it is off the near edge of the room. Two
           decoders running behind the archive is two decoders too many. */
        if (close && it.video.src && it.video.paused && !viewerOpen) {
          var pr = it.video.play();
          if (pr && pr.catch) pr.catch(function () {});
        } else if (!close && it.video.src && !it.video.paused) {
          it.video.pause();
        }
      }

      /* Off-screen frames are taken out of the paint entirely. This is the
         difference between seventy frames costing seventy composites a
         frame and costing the eight that are actually in the room. Written
         only on the change, and never over the frame the viewer is holding
         out of the room. */
      if (it !== current && it.vis !== vis) {
        it.vis = vis;
        it.el.style.visibility = vis ? '' : 'hidden';
      }
    }

    /* The words and the sign-off arrive the same way the frames do — once,
       when the camera reaches them, and they stay arrived. A word that came
       up on the way out and went down again on the way back would read as a
       blink rather than as writing on a wall. */
    for (var w = 0; w < words.length; w++) {
      var wd = words[w];
      if (!wd.placed || wd.shown) continue;
      var wl = parseFloat(wd.el.style.left || 0) - pos;
      if (wl < vw * 1.05 && wl + wd.el.offsetWidth > -vw * 0.2) {
        wd.shown = true;
        wd.el.classList.add('is-in');
      }
    }

    if (!signoffShown) {
      var sl = parseFloat(signoff.style.left || 0) - pos;
      if (sl < vw * 1.05) { signoffShown = true; signoff.classList.add('is-in'); }
    }
  }

  /* ---------------------------------------------------------------
     6. THE CAMERA
     Pointer position sets a speed, not a place. The speed is eased into,
     never jumped to, so the room has weight: it takes about a third of a
     second to reach a pace and about as long to give it up.
     --------------------------------------------------------------- */

  var pos = 0;        /* where the camera is, in content px */
  var vel = 0;        /* px per 60Hz frame */
  var norm = 0;       /* pointer across the viewport, -1 to 1 */
  var pointerLive = false;
  var keyDir = 0;
  var dragging = false;
  var viewerOpen = false;

  var MAXV = 32;      /* top speed, px per frame — about 1900px a second */
  var EASE = 0.062;   /* how hard the camera chases the speed it is asked for */
  var DEAD = 0.14;    /* the still middle of the screen */

  /* Position to speed. Squared past the dead zone, so the middle two thirds
     of the screen are a crawl and the last stretch to the edge is where the
     travel actually lives — the pointer is a throttle, not a scrollbar. */
  function throttle(n) {
    var a = Math.abs(n);
    if (a <= DEAD) return 0;
    var k = (a - DEAD) / (1 - DEAD);
    return (n < 0 ? -1 : 1) * k * k;
  }

  function onPointer(e) {
    if (e.pointerType === 'touch') return;
    norm = (e.clientX / vw) * 2 - 1;
    pointerLive = true;
    cursorTo(e.clientX, e.clientY);
    retireCue();
  }

  room.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });

  /* Off the window, the room settles rather than stopping. */
  window.addEventListener('pointerout', function (e) {
    if (!e.relatedTarget) { pointerLive = false; cursorOff(); }
  });
  window.addEventListener('blur', function () { pointerLive = false; keyDir = 0; });

  /* Trackpad and wheel are an impulse into the same momentum, not a second
     way of setting position — a shove, which the easing then spends. */
  room.addEventListener('wheel', function (e) {
    /* Ctrl- and meta-wheel are the browser's zoom, not the archive's. */
    if (e.ctrlKey || e.metaKey) return;
    var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!d) return;
    e.preventDefault();
    vel += Math.max(-90, Math.min(90, d)) * 0.28;
    /* A trackpad sends a flurry rather than a notch, and an uncapped sum of
       one is a jump cut. The ceiling is a shove that outruns the pointer
       without leaving the room behind. */
    var lid = MAXV * 2.4;
    vel = Math.max(-lid, Math.min(lid, vel));
    retireCue();
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    if (viewerOpen) return;
    if (e.key === 'ArrowRight') { keyDir = 1; retireCue(); }
    else if (e.key === 'ArrowLeft') { keyDir = -1; retireCue(); }
    else if (e.key === 'Home') { pos = 0; vel = 0; }
    else if (e.key === 'End') { pos = maxX; vel = 0; }
    else return;
    e.preventDefault();
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowRight' && keyDir === 1) keyDir = 0;
    if (e.key === 'ArrowLeft' && keyDir === -1) keyDir = 0;
  });

  /* Tab is a legitimate way through the archive, so focus moves the camera
     rather than leaving the reader looking at an empty room. */
  rail.addEventListener('focusin', function (e) {
    var el = e.target.closest('.frame');
    if (!el) return;
    for (var i = 0; i < items.length; i++) {
      if (items[i].el === el) {
        pos = Math.max(0, Math.min(maxX, items[i].x - (vw - items[i].w) / 2));
        vel = 0;
        retireCue();
        break;
      }
    }
  });

  /* --- touch: a drag with momentum, and nothing to do with the pointer --- */

  var tStart = 0, tPos = 0, tLast = 0, tTime = 0;

  room.addEventListener('touchstart', function (e) {
    if (viewerOpen || e.touches.length !== 1) return;
    dragging = true;
    tStart = tLast = e.touches[0].clientX;
    tPos = pos;
    tTime = e.timeStamp;
    vel = 0;
    retireCue();
  }, { passive: true });

  room.addEventListener('touchmove', function (e) {
    if (!dragging || e.touches.length !== 1) return;
    var x = e.touches[0].clientX;
    /* Only claim the gesture once it is clearly horizontal, so a vertical
       flick still belongs to the browser. */
    if (Math.abs(x - tStart) > 8 && e.cancelable) e.preventDefault();
    pos = Math.max(-60, Math.min(maxX + 60, tPos + (tStart - x)));

    /* The throw is measured over a real interval, never over the sub-
       millisecond gap between two events in the same tick — that reads as
       a velocity of thousands and hurls the room to the far wall. Sampled
       every 6ms or so, and capped, so a hard flick is a hard flick and not
       a teleport. */
    var dt = e.timeStamp - tTime;
    if (dt > 6) {
      var v = ((tLast - x) / dt) * 16.667;
      vel = Math.max(-MAXV * 2.4, Math.min(MAXV * 2.4, v));
      tLast = x;
      tTime = e.timeStamp;
    }
  }, { passive: false });

  room.addEventListener('touchend', function () { dragging = false; }, { passive: true });
  room.addEventListener('touchcancel', function () { dragging = false; }, { passive: true });

  /* --- the loop --- */

  var last = 0, tick = 0;

  function step(t) {
    requestAnimationFrame(step);
    var dt = last ? Math.min(3, (t - last) / 16.667) : 1;
    last = t;

    if (!dragging && !viewerOpen) {
      var want = 0;
      if (pointerLive && !reduced.matches && !coarse.matches) want += throttle(norm) * MAXV;
      if (keyDir) want += keyDir * MAXV * 0.6;

      /* Framerate-independent easing: the same settle on a 60Hz panel and a
         120Hz one, which a bare vel += (want - vel) * EASE is not. */
      vel += (want - vel) * (1 - Math.pow(1 - EASE, dt));
      pos += vel * dt;

      /* The ends are a wall the camera leans on, not one it bounces off. */
      if (pos < 0) { pos = 0; vel *= 0.3; }
      else if (pos > maxX) { pos = maxX; vel *= 0.3; }
      if (Math.abs(vel) < 0.01) vel = 0;
    } else if (dragging) {
      if (pos < 0) pos *= 0.86;
      if (pos > maxX) pos = maxX + (pos - maxX) * 0.86;
    }

    render();
    cursorStep(dt);

    /* The bookkeeping does not need sixty a second. */
    if ((tick++ % 6) === 0) {
      promote(false);
      readout();
      /* Self-heal: a viewport that changed without a resize event — a
         background tab arriving at its real size, a phone's address bar
         collapsing — is caught here rather than left as a wrong room. */
      var iw = window.innerWidth, ih = window.innerHeight;
      if (iw && ih && (iw !== vw || Math.abs(ih - vh) > 80) && !viewerOpen) relayout();
    }
  }

  var lastRendered = -1;

  function render(force) {
    if (!force && Math.abs(pos - lastRendered) < 0.01) return;
    lastRendered = pos;
    planes.back.style.transform = 'translate3d(' + (-pos * DEPTH.back).toFixed(2) + 'px,0,0)';
    planes.main.style.transform = 'translate3d(' + (-pos).toFixed(2) + 'px,0,0)';
    planes.fore.style.transform = 'translate3d(' + (-pos * DEPTH.fore).toFixed(2) + 'px,0,0)';
  }

  /* --- the readout: a hairline and a number --- */

  var runEl = document.querySelector('[data-progress]');
  var countEl = document.querySelector('[data-count]');
  var lastCount = -1;

  function readout() {
    if (runEl && maxX > 0) {
      runEl.style.transform = 'scaleX(' + (Math.max(0, Math.min(1, pos / maxX))).toFixed(4) + ')';
    }
    if (!countEl) return;
    /* Whichever frame the middle of the screen is nearest — the archive's
       own count of where you are standing. */
    var mid = pos + vw / 2, best = 0, bd = Infinity;
    for (var i = 0; i < items.length; i++) {
      var d = Math.abs(items[i].x + items[i].w / 2 - mid);
      if (d < bd) { bd = d; best = i; }
    }
    if (best !== lastCount) { lastCount = best; countEl.textContent = pad(best + 1); }
  }

  function pad(n) { return (n < 100 ? (n < 10 ? '00' : '0') : '') + n; }

  /* ---------------------------------------------------------------
     7. THE CURSOR
     Says which way the room is about to go, and what is under it.
     --------------------------------------------------------------- */

  var cur = document.querySelector('[data-cursor]');
  var curMark = document.querySelector('[data-cursor-mark]');
  var cx = 0, cy = 0, ctx = 0, cty = 0, curState = '';

  function cursorTo(x, y) {
    ctx = x; cty = y;
    if (cur && !cur.classList.contains('is-on') && !coarse.matches) {
      cx = x; cy = y;
      cur.classList.add('is-on');
    }
  }
  function cursorOff() { if (cur) cur.classList.remove('is-on'); }

  function cursorStep(dt) {
    if (!cur || coarse.matches) return;
    cx += (ctx - cx) * Math.min(1, 0.22 * dt);
    cy += (cty - cy) * Math.min(1, 0.22 * dt);
    cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';

    var want;
    if (hoverKind === 'film') want = 'Play';
    else if (hoverKind === 'shot') want = 'View';
    else if (norm < -0.34) want = '←';
    else if (norm > 0.34) want = '→';
    else want = '●';

    if (want !== curState) {
      curState = want;
      curMark.textContent = want;
      cur.className = 'cursor is-on cursor--' +
        (want === 'Play' || want === 'View' ? 'word' : (want === '●' ? 'dot' : 'arrow'));
    }
  }

  var hoverKind = '';
  rail.addEventListener('pointerover', function (e) {
    var el = e.target.closest('.frame');
    hoverKind = el ? (el.classList.contains('frame--film') ? 'film' : 'shot') : '';
  });
  rail.addEventListener('pointerout', function (e) {
    if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('.frame')) hoverKind = '';
  });

  /* --- the cue: shown once, retired by the first movement of any kind --- */

  var cue = document.querySelector('[data-cue]');
  var cueGone = false;
  function retireCue() {
    if (cueGone || !cue) return;
    cueGone = true;
    cue.classList.add('is-out');
    setTimeout(function () { cue.remove(); }, 500);
  }

  /* ---------------------------------------------------------------
     8. THE FRAME THAT OPENS
     A click measures the frame where it stands and grows that same frame
     to the stage. The aspect never changes, so the whole transition is a
     translate and a scale on one element — no fade to black, and nothing
     for the browser to lay out mid-flight.
     --------------------------------------------------------------- */

  var viewer = document.querySelector('[data-viewer]');
  var stage = document.querySelector('[data-viewer-stage]');
  var vTitle = document.querySelector('[data-viewer-title]');
  var vAt = document.querySelector('[data-viewer-at]');
  var current = null;
  var returnTo = null;

  function stageRect(ratio) {
    var m = Math.min(vw, vh) * (small ? 0.06 : 0.09);
    var aw = vw - m * 2, ah = vh - m * 2;
    var w = aw, h = w / ratio;
    if (h > ah) { h = ah; w = h * ratio; }
    return { w: w, h: h, x: (vw - w) / 2, y: (vh - h) / 2 };
  }

  function fill(it) {
    stage.textContent = '';
    if (it.kind === 'film') {
      var v = document.createElement('video');
      v.src = it.src;
      v.controls = true;
      v.autoplay = true;
      v.loop = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.poster = it.film ? it.film.poster : '';
      if (it.video) { v.poster = it.video.poster; v.currentTime = it.video.currentTime || 0; }
      stage.appendChild(v);
    } else {
      var img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      /* The strip thumb is already decoded, so it is what the frame grows
         with; the full view slots in underneath it once it lands. */
      img.src = it.dir + it.slug + '-thumb.webp';
      stage.appendChild(img);
      var full = new Image();
      full.onload = function () { if (current === it) img.src = full.src; };
      full.src = it.dir + it.slug + '-view.webp';
    }
    if (vTitle) vTitle.textContent = it.title || '';
    if (vAt) vAt.textContent = it.kind === 'film' ? 'Cut' : pad(it.at + 1) + ' / ' + pad(viewable.length);
  }

  function openViewer(it) {
    if (viewerOpen) return;
    viewerOpen = true;
    current = it;
    returnTo = it.el.querySelector('.frame__btn');

    items.forEach(function (o) { if (o.video && !o.video.paused) o.video.pause(); });

    var from = it.el.getBoundingClientRect();
    var to = stageRect(it.ratio);

    fill(it);
    viewer.hidden = false;
    viewer.setAttribute('aria-hidden', 'false');
    stage.style.width = to.w + 'px';
    stage.style.height = to.h + 'px';
    stage.style.transformOrigin = '0 0';
    stage.style.transition = 'none';
    stage.style.transform = 'translate3d(' + from.left + 'px,' + from.top + 'px,0) scale(' + (from.width / to.w) + ')';
    it.el.style.visibility = 'hidden';
    it.vis = false;

    /* One forced read, on purpose: the start transform has to be committed
       before the end one is set or there is no transition to run. */
    void stage.offsetWidth;

    stage.style.transition = reduced.matches ? 'none'
      : 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)';
    stage.style.transform = 'translate3d(' + to.x + 'px,' + to.y + 'px,0) scale(1)';
    viewer.classList.add('is-open');

    var close = viewer.querySelector('[data-viewer-close]');
    if (close) close.focus();
  }

  function closeViewer() {
    if (!viewerOpen || !current) return;
    var it = current;
    var to = stageRect(it.ratio);
    it.el.style.visibility = '';
    var back = it.el.getBoundingClientRect();
    it.el.style.visibility = 'hidden';

    viewer.classList.remove('is-open');
    stage.style.transition = reduced.matches ? 'none'
      : 'transform 560ms cubic-bezier(0.4, 0, 0.2, 1)';
    stage.style.transform = 'translate3d(' + back.left + 'px,' + back.top + 'px,0) scale(' + (back.width / to.w) + ')';

    var done = function () {
      viewer.hidden = true;
      viewer.setAttribute('aria-hidden', 'true');
      stage.textContent = '';
      it.el.style.visibility = '';
      it.vis = true;
      viewerOpen = false;
      current = null;
      if (returnTo) returnTo.focus();
      promote(false);
    };

    if (reduced.matches) done();
    else setTimeout(done, 560);
  }

  /* Stepping is a swap, not a second transition: the stage is already the
     right shape for the next frame before the frame arrives in it. */
  function stepViewer(d) {
    if (!current || current.kind === 'film') return;
    var next = viewable[(current.at + d + viewable.length) % viewable.length];
    var was = current;
    current = next;
    fill(next);
    var to = stageRect(next.ratio);
    stage.style.transition = 'none';
    stage.style.width = to.w + 'px';
    stage.style.height = to.h + 'px';
    stage.style.transform = 'translate3d(' + to.x + 'px,' + to.y + 'px,0) scale(1)';

    /* The room travels to the frame you are looking at, so closing puts you
       where the archive says you are. */
    was.el.style.visibility = '';
    was.vis = true;
    pos = Math.max(0, Math.min(maxX, next.x - (vw - next.w) / 2));
    render(true);
    promote(false);
    next.el.style.visibility = 'hidden';
    next.vis = false;
    returnTo = next.el.querySelector('.frame__btn');
  }

  if (viewer) {
    viewer.querySelector('[data-viewer-close]').addEventListener('click', closeViewer);
    viewer.querySelector('[data-viewer-prev]').addEventListener('click', function () { stepViewer(-1); });
    viewer.querySelector('[data-viewer-next]').addEventListener('click', function () { stepViewer(1); });
    viewer.querySelector('[data-viewer-ground]').addEventListener('click', closeViewer);
    window.addEventListener('keydown', function (e) {
      if (!viewerOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stepViewer(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepViewer(-1); }
    });
  }

  /* ---------------------------------------------------------------
     9. GO
     --------------------------------------------------------------- */

  /* Resize keeps where you were standing, as a fraction of the archive —
     the room is rebuilt around the camera, not under it. */
  function relayout() {
    var where = maxX > 0 ? pos / maxX : 0;
    layout();
    pos = where * maxX;
    render(true);
    promote(true);
  }

  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(relayout, 160);
  });

  layout();
  requestAnimationFrame(step);
})();
