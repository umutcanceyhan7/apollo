/* ============================================================
   Apollo Films — the BTS archive.

   ONE WALL. Not eight galleries, not a strip, not a grid: a single finite
   rectangle of behind-the-scenes material that the visitor moves a camera
   across. Every production is on it at once and they are deliberately MIXED
   — Mirage turns up in five different corners rather than in a Mirage
   corner, and Shopigo's one frame is simply part of the composition instead
   of a lonely gathering of one. A production's name is a fact about a
   photograph here, never a place it lives.

   The wall is FINITE and it is meant to feel finite. Two and a half screens
   across, two down, the camera clamped to it, and a map in the corner that
   shows the whole thing at once. An infinite coordinate system would make
   the archive feel larger; it would also make it feel empty, and there are
   forty-one things on this wall, not four hundred.

   Almost all motion comes from the visitor. The wall itself is still: a
   frame settles into place the first time the camera brings it properly into
   view and then stays where it was put. What moves after that is only ever
   an answer to where the visitor has put the camera — the small lean a frame
   gives the cursor, and the middle of the screen taking hold of whatever is
   in it. A cut brought into the middle grows to most of the screen and lets
   go again as soon as the camera carries on past it, which is the whole of
   the gesture on a phone: swipe onto it, swipe off it. Nothing drifts on its
   own — this is a wall, not a screensaver.

   Reads window.APOLLO_BACKSTAGE (assets/js/backstage.js).
   ============================================================ */

(function () {
  'use strict';

  var DATA = window.APOLLO_BACKSTAGE;
  if (!DATA || !DATA.shots || !DATA.shots.length) return;

  var room = document.getElementById('archive');
  var field = document.getElementById('field');
  if (!room || !field) return;

  var BASE = 'assets/backstage/web/';
  var FILMS = DATA.films || {};

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------
     1. NUMBERS
     --------------------------------------------------------------- */

  /* How big the wall is, in screens. Deliberately modest: the whole point is
     that a visitor can hold the entire archive in their head after a minute
     of moving around it. */
  /* Scored a little under the wall that is wanted, because the relaxation
     runs free and pushes the extent out by a tenth or so before the wall is
     fitted to it. 2.5 x 1.75 here lands at about 2.5 x 2.0 on screen. */
  var WALL_W = 2.45, WALL_H = 1.72;
  var WALL_W_SMALL = 2.6, WALL_H_SMALL = 3.1;

  /* The three scales, as the square root of a frame's AREA rather than as a
     width. A portrait frame and a landscape frame given the same width do
     not read as the same size — the portrait one is half again as much
     picture — and a wall where a frame's weight depends on which way up it
     was shot looks accidental rather than composed.

     The smallest is set so that even a 2:3 portrait clears 180px across. */
  var TIER = [308, 250, 212];
  var TIER_SMALL = [166, 134, 111];
  var CUT_K = 430, CUT_K_SMALL = 198;

  /* Which scale each frame gets, walked in the order they are dealt. Uneven,
     no short cycle, and the large ones spaced so a run of three is never the
     same size twice. */
  var SCALE = [0, 2, 1, 2, 1, 0, 1, 2, 2, 1, 0, 2, 1, 1, 2, 0, 2, 1, 2, 1];

  var GRAB = 340;   /* how close the cursor is felt, in px */
  var LIFT = 0.08;  /* how much a frame grows under it */
  var PULL = 10;    /* how far it leans toward it, in px */
  var MAXV = 46;
  var NEAR = 1.1;   /* screens of camera to fetch a frame at */

  /* The middle of the screen is the second thing a frame answers, and the
     only one a phone has. The cursor lift above belongs to a mouse and is
     switched off on touch; this one is driven by the camera itself, so
     swiping a cut into the middle of a phone is what makes it grow and
     swiping past it is what puts it back.

     A cut goes much further than a photograph — to CUT_FILL of the screen,
     which is roughly twice its size on the wall — because the two things
     that move on this wall should be the two things worth stopping on. A
     photograph only ever leans. */
  var FOCUS_R = 0.5;     /* screens of camera travel a frame is felt within */
  var CUT_FILL = 0.80;   /* how much of the screen a centred cut takes */
  /* A cut laid out large enough to be past that already — the portrait cut
     on a desktop is most of the screen's height standing still — would
     answer the camera by not moving at all, which reads as broken rather
     than as restraint. So the fill is a floor with a floor of its own: a
     tenth of the screen more than it had, and never past CUT_MOST, because
     a cut with no wall left around it is a video player. */
  var CUT_GROW = 0.10;
  var CUT_MOST = 0.94;
  var SHOT_LIFT = 0.10;  /* how much a centred photograph grows */
  var CUT_BIAS = 0.55;   /* a cut counts as this much nearer than it is */
  var CUT_PULL = 0.9;    /* how far a growing cut slides to the middle */
  var FOCUS_EASE = 0.14; /* and how fast it answers a change of mind */

  /* Stable pseudo-randomness. The wall has to look composed by hand and look
     the SAME every time it is drawn — a composition that reshuffles on
     reload is not a composition. So every jitter is a hash of the thing's
     own index, never Math.random(). */
  function hash(n, salt) {
    var x = Math.sin((n + 1) * 127.1 + (salt || 0) * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function smooth(f) { return f * f * (3 - 2 * f); }

  /* The largest rectangle of a given aspect that fits inside a box. The
     focus on the wall and the opened stage want the same answer, so they
     ask the same question. */
  function contain(ratio, aw, ah) {
    var w = aw, h = w / ratio;
    if (h > ah) { h = ah; w = h * ratio; }
    return { w: w, h: h };
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
  function titleOf(id) { return (FILMS[id] && FILMS[id].title) || ''; }

  /* ---------------------------------------------------------------
     2. BUILDING

     One flat pool. A cut and a photograph are the same kind of thing here
     and differ only in size and in the fact that two of them move.
     --------------------------------------------------------------- */

  var items = [];
  var viewable = [];
  var small = false;

  /* A cut may have been delivered in two aspects: the 9:16 master it was
     graded as, and a 16:9 version of the same edit. Which one a viewport
     gets is decided at layout, so turning a phone changes the cut as well as
     the composition around it. Only ever one of the two is fetched. */
  function useVariant(it, wide) {
    var v = (wide && it.cut.wide) ? it.cut.wide : it.cut;
    if (it.variant === v) return;
    it.variant = v;
    it.src = v.src;
    it.ratio = v.ratio;

    var vid = it.video;
    vid.poster = v.poster;
    if (!vid.getAttribute('src')) return;

    var at = vid.currentTime;
    var running = !vid.paused;
    vid.src = v.src;
    vid.addEventListener('loadedmetadata', function () {
      try { vid.currentTime = Math.min(at, vid.duration || at); } catch (e) {}
    }, { once: true });
    if (running) {
      var pr = vid.play();
      if (pr && pr.catch) pr.catch(function () {});
    }
  }

  /* A photograph delivered cropped twice — wide for a room with width, tall
     for a phone. Same argument as the cuts, same seam. */
  function useCrop(it, wide) {
    var v = (!wide && it.shot.tall) ? it.shot.tall : it.shot;
    if (it.variant === v) return;
    it.variant = v;
    it.ratio = v.w / v.h;
    it.stem = BASE + it.slug + (v === it.shot.tall ? '-mobile' : '');
    if (it.loaded) paint(it);
  }

  (DATA.cuts || []).forEach(function (c) {
    var it = { kind: 'cut', of: c.of, cut: c, i: items.length, title: titleOf(c.of) };
    it.el = document.createElement('figure');
    it.el.className = 'frame frame--cut';
    it.el.setAttribute('data-of', c.of);

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'frame__btn';
    b.setAttribute('aria-label', 'Play ' + it.title + ', behind the scenes');

    var vid = document.createElement('video');
    vid.muted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.setAttribute('playsinline', '');
    vid.setAttribute('muted', '');
    vid.preload = 'none';
    vid.tabIndex = -1;
    b.appendChild(vid);
    it.el.appendChild(b);
    it.video = vid;
    useVariant(it, false);

    /* The one caption on the wall, and it is a slate: name and running time,
       nothing else. No photograph gets one — turning every frame into a card
       with a production, a year and a medium on it is exactly what this page
       is not. */
    var slate = document.createElement('figcaption');
    slate.className = 'slate';
    slate.innerHTML = '<span>' + it.title + '</span><span class="slate__run">' +
      Math.floor(c.seconds / 60) + ':' + pad2(c.seconds % 60) + '</span>';
    it.el.appendChild(slate);

    b.addEventListener('click', function () { openViewer(it); });
    field.appendChild(it.el);
    items.push(it);
  });

  DATA.shots.forEach(function (s) {
    var it = { kind: 'shot', of: s.of, shot: s, slug: s.s, i: items.length, title: titleOf(s.of) };
    it.el = document.createElement('figure');
    it.el.className = 'frame';
    it.el.setAttribute('data-of', s.of);

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'frame__btn';
    b.setAttribute('aria-label', 'View frame — ' + it.title);

    var img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    b.appendChild(img);
    it.el.appendChild(b);
    it.img = img;
    useCrop(it, true);

    b.addEventListener('click', function () { openViewer(it); });
    field.appendChild(it.el);
    items.push(it);
    viewable.push(it);
  });

  /* ---------------------------------------------------------------
     3. THE DEAL

     Round-robin across productions, largest pile first. Mirage has twelve
     frames and Shopigo has one, so a straight shuffle would still leave
     Mirage in clumps — dealing one from each production in turn spreads the
     big piles through the whole sequence by construction. The cuts go down
     first because the composition is built around them.
     --------------------------------------------------------------- */

  function interleave(list) {
    var by = {};
    list.forEach(function (it) { (by[it.of] = by[it.of] || []).push(it); });
    var piles = Object.keys(by).map(function (k) { return by[k]; });
    piles.sort(function (a, b) { return b.length - a.length; });

    var out = [], left = list.length;
    while (left) {
      for (var i = 0; i < piles.length; i++) {
        if (!piles[i].length) continue;
        out.push(piles[i].shift());
        left--;
      }
    }
    return out;
  }

  var order = items.filter(function (it) { return it.kind === 'cut'; })
    .concat(interleave(items.filter(function (it) { return it.kind === 'shot'; })));

  /* ---------------------------------------------------------------
     4. LAYOUT

     A jittered, staggered lattice — not a grid, and not a scatter either.

     A pure scatter leaves holes: with forty-one things and no structure you
     reliably get a corner with nothing in it for most of a screen, which is
     the loudest complaint a wall like this can attract. A grid has no holes
     and no life. So the wall is divided into cells, one thing to a cell,
     every other row offset by half a cell so nothing lines up into columns,
     and each thing thrown a good way off its cell's centre. The cell
     guarantees the coverage; the offset and the throw take the grid back
     out of it.
     --------------------------------------------------------------- */

  var vw = 0, vh = 0, W = 0, H = 0;
  var limit = { x: 0, y: 0 };
  var arrived = false;

  function sized(k, ratio) {
    return { w: Math.sqrt(k * k * ratio), h: Math.sqrt(k * k / ratio) };
  }

  function overlaps(a, b, gap) {
    return Math.abs(a.x - b.x) * 2 < a.w + b.w + gap &&
           Math.abs(a.y - b.y) * 2 < a.h + b.h + gap;
  }

  /* Which cells count as a cell's immediate neighbourhood, counting the
     stagger. Used only to keep productions apart. */
  function neighbours(cells, ci, cols) {
    var out = [];
    var r = Math.floor(ci / cols), c = ci % cols;
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        var rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || cc >= cols) continue;
        var k = rr * cols + cc;
        if (k >= 0 && k < cells) out.push(k);
      }
    }
    return out;
  }

  function layout() {
    /* A page opened in a background tab can report a zero viewport in some
       engines, and a composition scored against zero is a stack of nothing.
       The fallbacks are a floor, not a guess. */
    vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    vh = window.innerHeight || document.documentElement.clientHeight || 800;
    small = vw < 760;

    W = Math.round(vw * (small ? WALL_W_SMALL : WALL_W));
    H = Math.round(vh * (small ? WALL_H_SMALL : WALL_H));

    var tiers = small ? TIER_SMALL : TIER;
    var cutK = small ? CUT_K_SMALL : CUT_K;
    var gap = Math.min(vw, vh) * (small ? 0.03 : 0.038);

    /* --- size everything first: the lattice is scored against what has to
       fit into it, not the other way round --- */
    order.forEach(function (it, n) {
      if (it.kind === 'cut') useVariant(it, !small);
      else useCrop(it, !small);
      var k = it.kind === 'cut' ? cutK : tiers[SCALE[n % SCALE.length]];
      /* ±7%, so two frames on the same tier are never quite twins. */
      k *= 0.94 + hash(it.i, 7) * 0.13;
      var s = sized(k, it.ratio);
      /* A floor on the WIDTH, not on the area. Sizing by area is what keeps
         a portrait and a landscape at the same visual weight, but it also
         means a tall frame on the smallest tier comes out narrow, and below
         about 180px across a photograph stops reading as a photograph and
         starts reading as a thumbnail. */
      var floorW = small ? 118 : 180;
      if (s.w < floorW) { var up = floorW / s.w; s.w *= up; s.h *= up; }
      it.w = Math.round(s.w);
      it.h = Math.round(s.h);
    });

    /* --- the lattice --- */
    var n = order.length;
    var want = Math.ceil(n * 1.12);      /* a few spare cells, to breathe */
    var cols = Math.max(2, Math.round(Math.sqrt(want * (W / H))));
    var rows = Math.max(2, Math.ceil(want / cols));
    var cells = cols * rows;
    var cw = W / cols, ch = H / rows;

    /* WHICH cells are left empty is chosen first, and chosen to be spread.
       Taking them as whatever the fill order happened not to reach is the
       obvious thing and it is how you get a hole: a stride that visits every
       cell exactly once still leaves its unused tail in runs — three cells
       side by side in one corner — and three empty cells in a row on a
       ten-wide lattice is most of a screen with nothing in it.

       So the spares are dealt out evenly across the wall up front, roughly
       one every half-row, which puts real negative space into the
       composition without ever putting two holes next to each other. */
    var spare = cells - n;
    var empty = {};
    for (var e = 0; e < spare; e++) {
      empty[Math.floor((e + 0.5) * cells / spare)] = true;
    }

    /* The rest are filled in a scattered order rather than left to right, so
       that the deal does not walk along a row laying down neighbours. */
    var open = [];
    var stride = Math.max(5, Math.round(cells * 0.31));
    while (gcd(stride, cells) !== 1) stride++;
    for (var i = 0; i < cells; i++) {
      var c0 = (i * stride + 3) % cells;
      if (!empty[c0]) open.push(c0);
    }

    /* --- keep productions apart ---
       The deal already interleaves them, but the deal is a SEQUENCE and the
       wall is a PLACE: two frames next to each other in the sequence can
       still land next to each other on the lattice. So the assignment is
       repaired against the geometry itself — swap two frames whenever doing
       so lowers the number of same-production frames sitting in each other's
       neighbourhood. */
    var at = open.slice(0, n);
    var inCell = {};
    for (i = 0; i < n; i++) inCell[at[i]] = i;

    function clash(idx) {
      var me = order[idx], bad = 0;
      var nb = neighbours(cells, at[idx], cols);
      for (var j = 0; j < nb.length; j++) {
        var other = inCell[nb[j]];
        if (other !== undefined && order[other].of === me.of) bad++;
      }
      return bad;
    }

    for (var pass = 0; pass < 4000; pass++) {
      var a = Math.floor(hash(pass, 11) * n);
      var b = Math.floor(hash(pass, 13) * n);
      if (a === b || order[a].of === order[b].of) continue;
      var before = clash(a) + clash(b);
      if (!before) continue;
      var ca = at[a], cb = at[b];
      at[a] = cb; at[b] = ca; inCell[ca] = b; inCell[cb] = a;
      if (clash(a) + clash(b) >= before) {          /* no better — put it back */
        at[a] = ca; at[b] = cb; inCell[ca] = a; inCell[cb] = b;
      }
    }

    /* --- place --- */
    order.forEach(function (it, idx) {
      var c = at[idx];
      var r = Math.floor(c / cols), col = c % cols;
      /* Every other row half a cell over. This one line is most of why the
         wall does not read as a grid: without it, a column of frames lines
         up down each cell boundary and no amount of jitter hides it. */
      var stagger = (r % 2) ? cw * 0.5 : 0;
      var cx = -W / 2 + (col + 0.5) * cw + stagger;
      var cy = -H / 2 + (r + 0.5) * ch;
      /* Thrown well off centre — far enough that the lattice is not legible,
         not so far that the coverage it was there to guarantee is undone. */
      it.x = cx + (hash(it.i, 2) - 0.5) * cw * 0.62;
      it.y = cy + (hash(it.i, 3) - 0.5) * ch * 0.62;
    });

    /* --- and then nothing may touch ---
       Separate along the axis each pair is LEAST buried on, by exactly the
       depth they are buried: the shortest way out of an overlap. Pushing
       along the line between two centres instead looks reasonable and is
       not — two frames overlapping by a hair vertically while sitting far
       apart horizontally get shoved mostly sideways, and a force scaled off
       the horizontal penetration goes negative and drives them together.

       The relaxation runs FREE. Holding the frames inside the wall while
       they settle sounds tidier and does not work: a pair pinned against the
       same edge has no room on the axis it needs, so the push happens, the
       clamp puts it straight back, and the pass oscillates until it runs out
       — which is how two frames end up overlapping at the right-hand edge no
       matter how many passes you give it. The wall is fitted to the result
       below instead, which is the same thing said in the order that can
       actually be satisfied. */
    for (pass = 0; pass < 200; pass++) {
      var moved = false;
      for (i = 0; i < n; i++) {
        for (var j = i + 1; j < n; j++) {
          var A = order[i], B = order[j];
          if (!overlaps(A, B, gap)) continue;
          var dx = B.x - A.x, dy = B.y - A.y;
          var ox = (A.w + B.w + gap) / 2 - Math.abs(dx);
          var oy = (A.h + B.h + gap) / 2 - Math.abs(dy);
          if (ox < oy) {
            var px = (dx < 0 ? -1 : 1) * ox * 0.5;
            A.x -= px; B.x += px;
          } else {
            var py = (dy < 0 ? -1 : 1) * oy * 0.5;
            A.y -= py; B.y += py;
          }
          moved = true;
        }
      }
      if (!moved) break;
    }

    /* --- and the wall is whatever they settled into ---
       The lattice was scored against the wall, so what comes out of the
       relaxation is already the right size and shape to within the jitter;
       taking the extent as the wall rather than forcing the extent into the
       wall costs a few per cent either way and buys a guarantee that nothing
       overlaps. Re-centred so the origin stays the middle of the archive,
       which is what every coordinate here is measured from. */
    var ex0 = 1e9, ex1 = -1e9, ey0 = 1e9, ey1 = -1e9;
    order.forEach(function (it) {
      /* A cut carries its slate under it and has to leave room for it. */
      var below = it.kind === 'cut' ? Math.min(vw, vh) * 0.07 : 0;
      ex0 = Math.min(ex0, it.x - it.w / 2); ex1 = Math.max(ex1, it.x + it.w / 2);
      ey0 = Math.min(ey0, it.y - it.h / 2); ey1 = Math.max(ey1, it.y + it.h / 2 + below);
    });
    var midX = (ex0 + ex1) / 2, midY = (ey0 + ey1) / 2;
    W = Math.round(ex1 - ex0);
    H = Math.round(ey1 - ey0);

    order.forEach(function (it) {
      it.x -= midX;
      it.y -= midY;

      it.el.style.width = it.w + 'px';
      it.el.style.height = it.h + 'px';
      it.el.style.left = Math.round(it.x - it.w / 2) + 'px';
      it.el.style.top = Math.round(it.y - it.h / 2) + 'px';
      if (it.img) it.img.sizes = it.w + 'px';
    });

    /* The camera may go exactly as far as the wall does and not a pixel
       further. Where the wall is no bigger than the viewport on an axis
       there is nowhere to go on it at all. */
    limit.x = Math.max(0, (W - vw) / 2);
    limit.y = Math.max(0, (H - vh) / 2);

    /* What each frame becomes when the camera settles on it. Scored here
       rather than in the loop because every term in it — the viewport, the
       tier, the crop, which cut variant this orientation gets — is decided
       here and nowhere else. */
    order.forEach(function (it) {
      if (it.kind === 'cut') {
        /* How much of the screen it holds now, on whichever axis is the
           tight one — the same measure the target is written in, so the
           scale between them is one division. */
        var fill = Math.max(it.w / vw, it.h / vh);
        it.fs = Math.max(1, Math.min(CUT_MOST, Math.max(CUT_FILL, fill + CUT_GROW)) / fill);
      } else {
        it.fs = 1 + SHOT_LIFT;
      }
      if (!it.f) it.f = 0;
    });

    if (!arrived) {
      arrived = true;
      /* Landing off-centre and off-axis, so the first screen is a
         composition rather than the middle of a symmetrical rectangle, and
         there is visibly more wall in every direction. */
      cam.x = to.x = -limit.x * 0.3;
      cam.y = to.y = -limit.y * 0.34;
    }
    cam.x = to.x = clamp(cam.x, -limit.x, limit.x);
    cam.y = to.y = clamp(cam.y, -limit.y, limit.y);

    drawMap();
    render(true);
    promote(true);
  }

  /* ---------------------------------------------------------------
     5. THE CAMERA

     Pointer, wheel, drag and keys all feed one velocity, and one easing
     spends it, so the wall answers a trackpad and a dragged hand as one
     thing rather than as three scroll modes bolted together.
     --------------------------------------------------------------- */

  var cam = { x: 0, y: 0 };
  var to = { x: 0, y: 0 };
  var vel = { x: 0, y: 0 };
  var lean = { x: 0, y: 0 };
  var pointerLive = false;
  var cursor = { x: -1e4, y: -1e4, on: false };
  var keys = { x: 0, y: 0 };
  var drag = null;

  function feed(dx, dy) {
    vel.x = clamp(vel.x + dx, -MAXV * 2.6, MAXV * 2.6);
    vel.y = clamp(vel.y + dy, -MAXV * 2.6, MAXV * 2.6);
    retireCue();
  }

  function onPointer(e) {
    if (e.pointerType === 'touch') return;
    cursor.x = e.clientX; cursor.y = e.clientY; cursor.on = true;
    pointerLive = true;

    /* A steady lean, not a position. The middle of the screen is dead so a
       frame can be looked at and reached for without the wall sliding out
       from under the cursor; past that the push comes on smoothly and is
       strongest in the corners. */
    var nx = (e.clientX / vw) * 2 - 1, ny = (e.clientY / vh) * 2 - 1;
    var dead = 0.5;
    lean.x = Math.abs(nx) < dead ? 0 : (nx - Math.sign(nx) * dead) / (1 - dead);
    lean.y = Math.abs(ny) < dead ? 0 : (ny - Math.sign(ny) * dead) / (1 - dead);
    lean.x *= Math.abs(lean.x); lean.y *= Math.abs(lean.y);

    cursorTo(e.clientX, e.clientY);
    retireCue();
  }

  room.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerout', function (e) {
    if (!e.relatedTarget) { pointerLive = false; lean.x = lean.y = 0; cursorOff(); }
  });
  window.addEventListener('blur', function () {
    pointerLive = false; lean.x = lean.y = 0; keys.x = keys.y = 0;
  });

  room.addEventListener('wheel', function (e) {
    if (e.ctrlKey || e.metaKey || viewerOpen) return;
    e.preventDefault();
    feed(clamp(e.deltaX, -90, 90) * 0.34, clamp(e.deltaY, -90, 90) * 0.34);
  }, { passive: false });

  room.addEventListener('pointerdown', function (e) {
    if (viewerOpen || e.button) return;
    drag = {
      id: e.pointerId, x: e.clientX, y: e.clientY,
      /* Where the camera and the hand both started. The stretch is measured
         from here, not accumulated frame by frame. */
      camX: cam.x, camY: cam.y, fromX: e.clientX, fromY: e.clientY,
      vx: 0, vy: 0, moved: 0, at: Date.now()
    };
    vel.x = vel.y = 0;
    retireCue();
  });

  /* Past the edge the wall gives, but only ever by a little, and it takes it
     back the moment the hand lets go. Feeling the wall end is the point.

     The give is ASYMPTOTIC: however hard the wall is pulled it approaches a
     tenth of a screen and never passes it. A plain linear give — the edge
     plus some fraction of the overshoot — has no ceiling at all, and worse,
     re-applying it to an already-stretched position on every pointermove
     compounds instead of resisting, which is how the camera ends up most of
     a screen off the end of a wall it is supposed to be clamped to. */
  function rubber(v, lim) {
    var over = v > lim ? v - lim : v < -lim ? v + lim : 0;
    if (!over) return v;
    var most = Math.min(vw, vh) * 0.1;
    var give = most * (1 - 1 / (Math.abs(over) / most + 1));
    return v > 0 ? lim + give : -lim - give;
  }

  window.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    drag.vx = dx; drag.vy = dy; drag.at = Date.now();
    drag.moved += Math.abs(dx) + Math.abs(dy);
    cam.x = rubber(drag.camX - (e.clientX - drag.fromX), limit.x);
    cam.y = rubber(drag.camY - (e.clientY - drag.fromY), limit.y);
    to.x = clamp(cam.x, -limit.x, limit.x);
    to.y = clamp(cam.y, -limit.y, limit.y);
    if (drag.moved > 6) room.classList.add('is-dragging');
  }, { passive: true });

  /* A pointer that has not reported in for a third of a second is a gesture
     that ended somewhere we were not told about. */
  function dragLive() { return Date.now() - drag.at < 340; }

  function letGo(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    feed(-drag.vx * 1.5, -drag.vy * 1.5);
    /* A drag that travelled is not a click. */
    if (drag.moved > 6) {
      room.addEventListener('click', function (ev) {
        ev.stopPropagation(); ev.preventDefault();
      }, { capture: true, once: true });
    }
    room.classList.remove('is-dragging');
    drag = null;
  }
  window.addEventListener('pointerup', letGo);
  window.addEventListener('pointercancel', letGo);

  window.addEventListener('keydown', function (e) {
    if (viewerOpen) return;
    if (e.key === 'ArrowRight') keys.x = 1;
    else if (e.key === 'ArrowLeft') keys.x = -1;
    else if (e.key === 'ArrowDown') keys.y = 1;
    else if (e.key === 'ArrowUp') keys.y = -1;
    else if (e.key === 'Home') { to.x = to.y = 0; vel.x = vel.y = 0; }
    else return;
    retireCue();
    e.preventDefault();
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') keys.x = 0;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') keys.y = 0;
  });

  function step() {
    if (!drag) {
      /* The lean eases off as a cut takes hold. A cut answers the cursor by
         growing to most of the screen AND sliding to the middle of it, so a
         camera still drifting underneath is pulling the thing out from under
         the very cursor that asked for it: the frame walks off the pointer,
         the focus drops, it shrinks, the pointer is inside again, and it
         grows — the flicker that reads as "sometimes it just doesn't". While
         a cut is up the camera stands still and lets you look at it; the
         moment you leave, the lean comes straight back. */
      if (pointerLive && !viewerOpen) {
        var hold = 1 - 0.92 * cutHold;
        vel.x += lean.x * 2.0 * hold;
        vel.y += lean.y * 2.0 * hold;
      }
      if (keys.x || keys.y) { vel.x += keys.x * 3.4; vel.y += keys.y * 3.4; }

      vel.x = clamp(vel.x, -MAXV, MAXV) * 0.86;
      vel.y = clamp(vel.y, -MAXV, MAXV) * 0.86;
      if (Math.abs(vel.x) < 0.01) vel.x = 0;
      if (Math.abs(vel.y) < 0.01) vel.y = 0;

      to.x = clamp(to.x + vel.x, -limit.x, limit.x);
      to.y = clamp(to.y + vel.y, -limit.y, limit.y);
      /* Momentum spent at the edge rather than pressed against it. */
      if (Math.abs(to.x) === limit.x) vel.x = 0;
      if (Math.abs(to.y) === limit.y) vel.y = 0;

      /* The camera never arrives where it was sent, it eases toward it. This
         one line is most of why the wall feels heavy rather than scrolled. */
      cam.x += (to.x - cam.x) * 0.09;
      cam.y += (to.y - cam.y) * 0.09;
    }

    if (drag && !dragLive()) letGo();

    render(false);
    promote(false);
    requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------------
     6. RENDER

     One transform for the whole wall, and one more only for the frames the
     cursor or the middle of the screen has hold of. Everything off-screen is
     taken out of the paint.
     --------------------------------------------------------------- */

  var nearEl = document.querySelector('[data-near]');
  var ofEl = document.querySelector('[data-of-count]');
  var lastNear = null;
  var focusHeld = null;
  var cutHold = 0;
  var mapView = document.querySelector('[data-map-view]');
  if (ofEl) ofEl.textContent = '/ ' + pad2(items.length);

  var dimOn = false;

  function render(force) {
    var ox = Math.round(-cam.x), oy = Math.round(-cam.y);
    field.style.transform = 'translate3d(' + ox + 'px,' + oy + 'px,0)';

    var best = null, bd = 1e12;
    var focusIt = null, fd = 1e12;
    var hoverIt = null, hoverArea = 1e12;
    /* A mouse points. Where there is one, what grows is whatever it is
       pointing AT — not whatever the camera happens to have drifted nearest
       to, which is a different question with a different answer and is why a
       cut would grow on one approach and refuse on the next. The camera
       measure below still runs, and is what a phone uses: there is no cursor
       there, so the middle of the screen has to stand in for one. */
    var byHand = fine && cursor.on && !small && !viewerOpen && !reduced;
    var R = Math.min(vw, vh) * FOCUS_R;
    var SEEN = Math.min(vw, vh) * 0.9;
    /* The focus keeps hold while a frame is open. The wall cannot move under
       an open viewer, so nothing behind it changes — and letting it go would
       mean the close animation shrinks the frame to a size it was not at
       when it was opened, then grows it again. */
    var live = !reduced;
    var it, i;

    /* --- what is where, and what the middle of the screen has hold of ---
       Measured for everything before anything is written, because the focus
       is a competition: the wall grows ONE thing at a time, and which one
       cannot be known until every frame has been asked how far it is. */
    for (i = 0; i < order.length; i++) {
      it = order[i];
      var px = it.x + vw / 2 + ox;
      var py = it.y + vh / 2 + oy;

      var on = px + it.w / 2 > -240 && px - it.w / 2 < vw + 240 &&
               py + it.h / 2 > -240 && py - it.h / 2 < vh + 240;
      if (force || on !== it.on) {
        it.on = on;
        it.el.style.visibility = on ? '' : 'hidden';
      }
      it.px = px; it.py = py;
      if (!on) continue;

      var dcx = px - vw / 2, dcy = py - vh / 2;
      var dc = Math.sqrt(dcx * dcx + dcy * dcy);
      if (dc < bd) { bd = dc; best = it; }

      /* How far the camera is from the closest it can ever be brought to
         this frame. Distance from the middle of the SCREEN is the obvious
         measure and it is the wrong one: the wall is two screens tall and
         the camera travels one, so everything in the outer band — which is
         where both cuts happen to be — can never be put in the middle of
         the screen at all, and a focus scored that way would never fire for
         them. What is asked here is not "is this in the middle" but "is
         this as near the middle as this visitor can put it", which is the
         same question `stepViewer` asks when it goes to a frame. */
      var rx = cam.x - clamp(it.x, -limit.x, limit.x);
      var ry = cam.y - clamp(it.y, -limit.y, limit.y);
      var fdist = Math.sqrt(rx * rx + ry * ry);
      it.fd = fdist;

      /* A cut counts as nearer than it is. Otherwise a photograph sitting a
         few pixels closer takes the focus off the one thing on this stretch
         of wall that moves. The screen test is a second gate: two frames at
         opposite ends of the unreachable band answer the camera identically,
         and only the one actually near the middle should be grown. */
      var bid = fdist * (it.kind === 'cut' ? CUT_BIAS : 1);
      if (fdist < R && dc < SEEN && bid < fd) { fd = bid; focusIt = it; }

      /* Hit-tested against where the frame was actually DRAWN last time,
         not where it was laid out. A cut that has grown is half as big
         again as its slot, and testing the slot means the cursor falls out
         of the frame it is plainly still inside the moment the thing
         reacts — grow, drop, grow, drop. Testing the drawn rectangle makes
         the growth its own hysteresis: bigger is easier to stay inside. */
      if (byHand) {
        var hw = (it.rw || it.w) / 2, hh = (it.rh || it.h) / 2;
        var hx = it.rx === undefined ? px : it.rx;
        var hy = it.ry === undefined ? py : it.ry;
        var over = Math.abs(cursor.x - hx) <= hw && Math.abs(cursor.y - hy) <= hh;
        /* The frame it is already holding keeps hold over its SLOT too, not
           only over where it has slid to. A cut travels most of a screen on
           its way to the middle, and testing only the drawn rectangle means
           the cursor can be left behind by the very movement it caused. The
           union of the two is the honest question: has the pointer left this
           frame, or has this frame left the pointer. */
        if (!over && it === focusHeld) {
          over = Math.abs(cursor.x - px) <= it.w / 2 &&
                 Math.abs(cursor.y - py) <= it.h / 2;
        }
        if (over) {
          /* Under two overlapping frames, the smaller one is the one being
             pointed at; a grown neighbour lying over it is not. */
          var area = hw * hh;
          if (it === focusHeld) area = -1;      /* keep hold once held */
          if (area < hoverArea) { hoverArea = area; hoverIt = it; }
        }
      }

      /* Revealed by the camera, once. A frame is held slightly small until
         the visitor's own movement brings it properly inside the viewport,
         and then it settles to its true size. It is not re-run on the way
         back past: a wall where everything breathes every time you cross it
         is a screensaver. */
      if (!it.shown &&
          px + it.w / 2 > vw * 0.14 && px - it.w / 2 < vw * 0.86 &&
          py + it.h / 2 > vh * 0.14 && py - it.h / 2 < vh * 0.86) {
        it.shown = true;
        it.el.classList.add('is-shown');
      }
    }

    if (byHand) focusIt = hoverIt;
    focusHeld = focusIt;
    /* How far the cut that has hold has actually got. Read by the camera on
       the next tick — not a boolean, so the lean returns as smoothly as the
       cut lets go. */
    cutHold = (focusIt && focusIt.kind === 'cut') ? focusIt.f : 0;

    /* --- and what that does to each of them ---------------------------- */
    var dim = false;

    for (i = 0; i < order.length; i++) {
      it = order[i];
      if (!it.on) {
        /* A frame carried off the screen mid-grow is put back flat rather
           than left holding a scale nobody can see — and put back on the
           element, not only in the bookkeeping, or it comes back promoted,
           lit, and standing over its neighbours. */
        if (it.f || it.foc) {
          it.f = 0; it.foc = false; it.key = it.z = null;
          it.rx = it.ry = it.rw = it.rh = undefined;
          it.el.classList.remove('is-focus', 'is-near');
          it.el.style.zIndex = '';
          it.el.style.transform = '';
        }
        continue;
      }

      /* The camera's answer eases rather than switches, so the moment the
         focus changes hands one frame lets go while the next takes hold. */
      var want = (live && it === focusIt)
        ? (byHand ? 1 : smooth(1 - it.fd / R))
        : 0;
      it.f += (want - it.f) * FOCUS_EASE;
      if (it.f < 0.002) it.f = 0;

      var lx = 0, ly = 0, sc = 1;

      /* The cursor is felt, not clicked. Held well under a tenth so it reads
         as the wall answering a hand and never as a control lighting up. */
      if (cursor.on && !small && !viewerOpen && !reduced) {
        var dx = cursor.x - it.px, dy = cursor.y - it.py;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < GRAB) {
          var f = smooth(1 - d / GRAB);
          sc = 1 + LIFT * f;
          lx = (dx / (d || 1)) * PULL * f;
          ly = (dy / (d || 1)) * PULL * f;
        }
      }

      if (it.f) {
        sc *= 1 + (it.fs - 1) * it.f;
        /* A cut also slides toward the middle as it grows, so what it grows
           into is the screen rather than half of it and half the bezel. A
           photograph is never pulled: forty frames leaning at the middle is
           a wall that shuffles itself. */
        if (it.kind === 'cut') {
          lx -= (it.px - vw / 2) * CUT_PULL * it.f;
          ly -= (it.py - vh / 2) * CUT_PULL * it.f;
        }
      }

      var foc = it.f > 0.5;
      if (foc !== it.foc) {
        it.foc = foc;
        it.el.classList.toggle('is-focus', foc);
      }
      if (foc && it.kind === 'cut') dim = true;

      /* Over its neighbours while it is over them, and back into the flat
         wall the moment it is not. Still under the HUD, which owns 40 up. */
      var z = it.f > 0.02 ? String(20 + (it.f * 10 | 0)) : '';
      if (z !== it.z) { it.z = z; it.el.style.zIndex = z; }

      /* Written only on a real change, and rounded, so a camera at rest
         stops producing style writes altogether. */
      var key = (lx * 100 | 0) + ':' + (ly * 100 | 0) + ':' + (sc * 1000 | 0);
      if (key !== it.key) {
        it.key = key;
        it.el.style.transform = (sc === 1 && !lx && !ly) ? ''
          : 'translate3d(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px,0) scale(' + sc.toFixed(4) + ')';
        it.el.classList.toggle('is-near', sc > 1.004);
      }

      it.rx = it.px + lx; it.ry = it.py + ly;
      it.rw = it.w * sc; it.rh = it.h * sc;
    }

    /* One cut at eighty percent of the screen against a full wall is a
       collage. The rest of the wall stands back while it is up. */
    if (dim !== dimOn) {
      dimOn = dim;
      room.classList.toggle('is-focusing', dim);
    }

    /* The corner names whatever is nearest the middle of the screen — the
       only place a production is named without the cursor asking. A frame
       the camera has taken hold of takes the name with it: once a cut is
       most of the screen, naming anything else is simply wrong, and it is
       measured from where a frame was laid out rather than from where the
       focus has since slid it. */
    var name = (focusIt && focusIt.f > 0.35) ? focusIt : best;
    if (name && name !== lastNear) {
      lastNear = name;
      if (nearEl) nearEl.textContent = name.title;
    }

    /* The box is the viewport drawn on the wall, and the wall's origin is
       its MIDDLE — so the box's middle is the map's middle plus the camera,
       and its top-left is that less half its own size. Translating the raw
       camera from a corner-anchored box instead puts it in the corner at
       cam 0 and hangs it off the edge at the far end, which is exactly as
       far wrong as the camera can travel. */
    if (mapView && mapW) {
      var bw = parseFloat(mapView.style.width) || 0;
      var bh = parseFloat(mapView.style.height) || 0;
      /* Held inside the frame even while the camera is stretched past the
         end of the wall. The give is a real thing and the wall should feel
         it, but the map is a diagram of a finite rectangle: a viewport box
         hanging out of its own border says the archive continues past the
         edge, which is the one thing this element exists to deny. */
      var bx = clamp(mapW / 2 + (cam.x / W) * mapW - bw / 2, 0, Math.max(0, mapW - bw));
      var by = clamp(mapH / 2 + (cam.y / H) * mapH - bh / 2, 0, Math.max(0, mapH - bh));
      mapView.style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px,0)';
    }
  }

  /* ---------------------------------------------------------------
     7. THE MAP

     The whole wall at a glance, and the one thing on the page whose job is
     to say THIS IS FINITE. Painted once per layout — forty-one rectangles
     into a canvas — and after that only the viewport box moves.
     --------------------------------------------------------------- */

  var mapCanvas = document.querySelector('[data-map]');
  var mapW = 0, mapH = 0;

  function drawMap() {
    if (!mapCanvas || !mapCanvas.getContext) return;
    var box = mapCanvas.getBoundingClientRect();
    mapW = box.width; mapH = box.height;
    if (!mapW || !mapH) return;

    var dpr = window.devicePixelRatio || 1;
    mapCanvas.width = Math.round(mapW * dpr);
    mapCanvas.height = Math.round(mapH * dpr);
    var g = mapCanvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, mapW, mapH);

    var sx = mapW / W, sy = mapH / H;
    order.forEach(function (it) {
      g.fillStyle = it.kind === 'cut' ? 'rgba(245,244,238,0.82)' : 'rgba(245,244,238,0.34)';
      g.fillRect(
        (it.x - it.w / 2 + W / 2) * sx, (it.y - it.h / 2 + H / 2) * sy,
        Math.max(1, it.w * sx), Math.max(1, it.h * sy)
      );
    });

    if (mapView) {
      mapView.style.width = Math.min(mapW, vw * sx) + 'px';
      mapView.style.height = Math.min(mapH, vh * sy) + 'px';
    }
  }

  /* ---------------------------------------------------------------
     8. LOADING
     --------------------------------------------------------------- */

  function paint(it) {
    it.img.srcset = it.stem + '-thumb.webp 640w, ' + it.stem + '-view.webp 1600w';
    it.img.src = it.stem + '-thumb.webp';
  }

  function promote(force) {
    var near = Math.min(vw, vh) * NEAR;
    for (var i = 0; i < order.length; i++) {
      var it = order[i];
      var px = it.x + vw / 2 - cam.x;
      var py = it.y + vh / 2 - cam.y;
      var close = px > -near && px < vw + near && py > -near && py < vh + near;

      if (close && !it.loaded) {
        it.loaded = true;
        if (it.img) {
          paint(it);
          /* Decoded before shown where the browser will say so, but never
             waiting on it: a tab that is not in front parks decode()
             indefinitely, and a frame that is loaded and not shown is just a
             hole in the wall. Whichever answer arrives first wins. */
          (function (el, node) {
            var done = false;
            function show() { if (done) return; done = true; el.classList.add('is-in'); }
            if (node.decode) node.decode().then(show, show);
            if (node.complete) show();
            else {
              node.addEventListener('load', show, { once: true });
              node.addEventListener('error', show, { once: true });
            }
          })(it.el, it.img);
        }
      }

      if (it.kind === 'cut') {
        var here = px > -vw * 0.5 && px < vw * 1.5 && py > -vh * 0.5 && py < vh * 1.5;
        if (here && !it.video.getAttribute('src')) {
          it.video.src = it.src;
          it.el.classList.add('is-in');
        }
        /* Paused the moment it is off the near edge of the wall. Two decoders
           running behind an archive is two too many. */
        if (here && it.video.getAttribute('src') && it.video.paused && !viewerOpen) {
          var pr = it.video.play();
          if (pr && pr.catch) pr.catch(function () {});
        } else if (!here && it.video.getAttribute('src') && !it.video.paused) {
          it.video.pause();
        }
      }
    }
  }

  /* ---------------------------------------------------------------
     9. THE CUE AND THE CURSOR

     The cursor is where a production gets named. Rather than hang a label on
     every photograph — which would turn a wall into a catalogue — the name
     of whatever is under the pointer is carried by the pointer itself.
     --------------------------------------------------------------- */

  var cue = document.querySelector('[data-cue]');
  var cueGone = false;
  function retireCue() {
    if (cueGone || !cue) return;
    cueGone = true;
    cue.classList.add('is-gone');
    setTimeout(function () { if (cue.parentNode) cue.parentNode.removeChild(cue); }, 900);
  }

  var cur = document.querySelector('[data-cursor]');
  var curMark = document.querySelector('[data-cursor-mark]');
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var curOn = false, hoverOn;

  function cursorTo(x, y) {
    if (!cur || !fine) return;
    cur.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    if (!curOn) { curOn = true; cur.classList.add('is-on'); }
  }
  function cursorOff() {
    if (!cur || !curOn) return;
    curOn = false; cur.classList.remove('is-on');
  }

  if (fine && cur && curMark) {
    room.addEventListener('pointermove', function (e) {
      var el = document.elementFromPoint(e.clientX, e.clientY);
      var fr = el && el.closest ? el.closest('.frame') : null;
      var id = fr ? fr.getAttribute('data-of') : null;
      if (id === hoverOn) return;
      hoverOn = id;
      cur.className = 'cursor is-on ' + (id ? 'cursor--word' : 'cursor--dot');
      curMark.textContent = id ? titleOf(id) : '●';
    }, { passive: true });
  }

  /* ---------------------------------------------------------------
     10. THE FRAME THAT OPENS

     A click measures the frame where it stands and grows that same frame to
     the stage. The aspect never changes, so the whole transition is a
     translate and a scale on one element. The wall keeps moving underneath,
     so closing measures again rather than trusting where it started.
     --------------------------------------------------------------- */

  var viewer = document.querySelector('[data-viewer]');
  var stage = document.querySelector('[data-viewer-stage]');
  var vTitle = document.querySelector('[data-viewer-title]');
  var vAt = document.querySelector('[data-viewer-at]');
  var viewerOpen = false;
  var current = null;

  /* Where the frame IS, not where it was laid out. A frame the camera has
     hold of is scaled and, if it is a cut, slid toward the middle — and a
     zoom that starts from the small rect snaps down before it grows. Closing
     asks again, so it picks the same correction up on the way back. */
  function screenRect(it) {
    var s = 1 + ((it.fs || 1) - 1) * (it.f || 0);
    var cx = it.x + vw / 2 - cam.x;
    var cy = it.y + vh / 2 - cam.y;
    if (it.kind === 'cut' && it.f) {
      cx -= (cx - vw / 2) * CUT_PULL * it.f;
      cy -= (cy - vh / 2) * CUT_PULL * it.f;
    }
    var w = it.w * s, h = it.h * s;
    return { x: cx - w / 2, y: cy - h / 2, w: w, h: h };
  }

  function stageRect(ratio) {
    var m = Math.min(vw, vh) * (small ? 0.06 : 0.09);
    var b = contain(ratio, vw - m * 2, vh - m * 2);
    return { w: b.w, h: b.h, x: (vw - b.w) / 2, y: (vh - b.h) / 2 };
  }

  function fill(it) {
    stage.textContent = '';
    if (it.kind === 'cut') {
      var v = document.createElement('video');
      v.src = it.src;
      v.loop = true;
      v.muted = true;
      v.autoplay = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.setAttribute('muted', '');
      v.poster = it.video ? it.video.poster : '';
      if (it.video) v.currentTime = it.video.currentTime || 0;
      stage.appendChild(v);
      /* A silent, video-only element gets paused by the browser to save power
         if it starts while the stage is still behind the opening animation.
         So ask again when the file is ready and once the stage has landed. */
      var start = function () {
        if (!viewerOpen || v.parentNode !== stage) return;
        var pr = v.play();
        if (pr && pr.catch) pr.catch(function () {});
      };
      v.addEventListener('canplay', start);
      setTimeout(start, 700);
      start();
    } else {
      var img = document.createElement('img');
      img.alt = '';
      img.src = it.stem + '-thumb.webp';
      stage.appendChild(img);
      var full = new Image();
      full.onload = function () { if (current === it) img.src = full.src; };
      full.src = it.stem + '-view.webp';
    }
    if (vTitle) vTitle.textContent = it.title;
    if (vAt) {
      vAt.textContent = it.kind === 'cut' ? 'Cut'
        : pad2(viewable.indexOf(it) + 1) + ' / ' + pad2(viewable.length);
    }
  }

  function openViewer(it) {
    if (viewerOpen || !viewer) return;
    viewerOpen = true;
    current = it;
    order.forEach(function (o) { if (o.video && !o.video.paused) o.video.pause(); });

    var from = screenRect(it);
    var target = stageRect(it.ratio);

    viewer.hidden = false;
    viewer.setAttribute('aria-hidden', 'false');
    fill(it);

    stage.style.width = target.w + 'px';
    stage.style.height = target.h + 'px';
    stage.style.left = target.x + 'px';
    stage.style.top = target.y + 'px';
    stage.style.transition = 'none';
    stage.style.transformOrigin = '0 0';
    stage.style.transform = 'translate(' + (from.x - target.x) + 'px,' + (from.y - target.y) +
      'px) scale(' + (from.w / target.w) + ',' + (from.h / target.h) + ')';

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        viewer.classList.add('is-open');
        stage.style.transition = 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)';
        stage.style.transform = 'translate(0,0) scale(1,1)';
      });
    });

    it.el.style.opacity = '0';
    document.body.classList.add('is-viewing');
  }

  function closeViewer() {
    if (!viewerOpen || !current) return;
    var it = current;
    var target = stageRect(it.ratio);
    var back = screenRect(it);

    viewer.classList.remove('is-open');
    stage.style.transform = 'translate(' + (back.x - target.x) + 'px,' + (back.y - target.y) +
      'px) scale(' + (back.w / target.w) + ',' + (back.h / target.h) + ')';

    viewerOpen = false;
    current = null;
    document.body.classList.remove('is-viewing');

    setTimeout(function () {
      viewer.hidden = true;
      viewer.setAttribute('aria-hidden', 'true');
      stage.textContent = '';
      it.el.style.opacity = '';
    }, 620);
  }

  function stepViewer(d) {
    if (!current || current.kind === 'cut') return;
    var i = viewable.indexOf(current);
    if (i < 0) return;
    var next = viewable[(i + d + viewable.length) % viewable.length];
    /* Stepping brings the wall with it, so closing puts you back where the
       frame you are looking at actually lives. */
    to.x = cam.x = clamp(next.x, -limit.x, limit.x);
    to.y = cam.y = clamp(next.y, -limit.y, limit.y);
    vel.x = vel.y = 0;
    current = next;
    fill(next);
  }

  if (viewer) {
    var cb = viewer.querySelector('[data-viewer-close]');
    var pb = viewer.querySelector('[data-viewer-prev]');
    var nb = viewer.querySelector('[data-viewer-next]');
    var gr = viewer.querySelector('[data-viewer-ground]');
    if (cb) cb.addEventListener('click', closeViewer);
    if (pb) pb.addEventListener('click', function () { stepViewer(-1); });
    if (nb) nb.addEventListener('click', function () { stepViewer(1); });
    if (gr) gr.addEventListener('click', closeViewer);

    window.addEventListener('keydown', function (e) {
      if (!viewerOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stepViewer(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepViewer(-1); }
    });
  }

  /* ---------------------------------------------------------------
     11. GO
     --------------------------------------------------------------- */

  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(layout, 160);
  });

  layout();
  requestAnimationFrame(step);
})();
