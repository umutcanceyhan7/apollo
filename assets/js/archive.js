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
   view and then stays where it was put, and the only other movement is the
   small lean a frame gives the cursor. Nothing drifts on its own — this is a
   wall, not a screensaver.

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
  var WALL_W = 2.5, WALL_H = 2.0;
  var WALL_W_SMALL = 2.4, WALL_H_SMALL = 2.6;

  /* The three scales, as the square root of a frame's AREA rather than as a
     width. A portrait frame and a landscape frame given the same width do
     not read as the same size — the portrait one is half again as much
     picture — and a wall where a frame's weight depends on which way up it
     was shot looks accidental rather than composed.

     The smallest is set so that even a 2:3 portrait clears 180px across. */
  var TIER = [308, 250, 212];
  var TIER_SMALL = [188, 152, 126];
  var CUT_K = 430, CUT_K_SMALL = 220;

  /* Which scale each frame gets, walked in the order they are dealt. Uneven,
     no short cycle, and the large ones spaced so a run of three is never the
     same size twice. */
  var SCALE = [0, 2, 1, 2, 1, 0, 1, 2, 2, 1, 0, 2, 1, 1, 2, 0, 2, 1, 2, 1];

  var GRAB = 340;   /* how close the cursor is felt, in px */
  var LIFT = 0.08;  /* how much a frame grows under it */
  var PULL = 10;    /* how far it leans toward it, in px */
  var MAXV = 46;
  var NEAR = 1.1;   /* screens of camera to fetch a frame at */

  /* Stable pseudo-randomness. The wall has to look composed by hand and look
     the SAME every time it is drawn — a composition that reshuffles on
     reload is not a composition. So every jitter is a hash of the thing's
     own index, never Math.random(). */
  function hash(n, salt) {
    var x = Math.sin((n + 1) * 127.1 + (salt || 0) * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
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
      var floorW = small ? 96 : 180;
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
       the horizontal penetration goes negative and drives them together. */
    /* Nothing may hang off the wall either — the wall IS the archive, and an
       edge you can see past stops feeling like one. Which means the clamp
       has to live INSIDE the relaxation and not after it: clamping a settled
       layout shoves every edge frame back into its neighbour, and the seven
       overlaps that produces are exactly the ones the relaxation just spent
       a hundred passes removing. Pushing apart and pulling in on the same
       pass lets the two constraints settle against each other. */
    function pen(it) {
      it.x = clamp(it.x, -W / 2 + it.w / 2, W / 2 - it.w / 2);
      /* A cut carries its slate under it and has to leave room for it. */
      var below = it.kind === 'cut' ? Math.min(vw, vh) * 0.07 : 0;
      it.y = clamp(it.y, -H / 2 + it.h / 2, H / 2 - it.h / 2 - below);
    }

    for (pass = 0; pass < 260; pass++) {
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
          pen(A); pen(B);
          moved = true;
        }
      }
      if (!moved) break;
    }

    order.forEach(function (it) {
      pen(it);

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
      if (pointerLive && !viewerOpen) { vel.x += lean.x * 2.0; vel.y += lean.y * 2.0; }
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
     cursor is actually near. Everything off-screen is taken out of the paint.
     --------------------------------------------------------------- */

  var nearEl = document.querySelector('[data-near]');
  var ofEl = document.querySelector('[data-of-count]');
  var lastNear = null;
  var mapView = document.querySelector('[data-map-view]');
  if (ofEl) ofEl.textContent = '/ ' + pad2(items.length);

  function render(force) {
    var ox = Math.round(-cam.x), oy = Math.round(-cam.y);
    field.style.transform = 'translate3d(' + ox + 'px,' + oy + 'px,0)';

    var best = null, bd = 1e12;

    for (var i = 0; i < order.length; i++) {
      var it = order[i];
      var px = it.x + vw / 2 + ox;
      var py = it.y + vh / 2 + oy;

      var on = px + it.w / 2 > -240 && px - it.w / 2 < vw + 240 &&
               py + it.h / 2 > -240 && py - it.h / 2 < vh + 240;
      if (force || on !== it.on) {
        it.on = on;
        it.el.style.visibility = on ? '' : 'hidden';
      }
      if (!on) continue;

      var dcx = px - vw / 2, dcy = py - vh / 2;
      var dc = dcx * dcx + dcy * dcy;
      if (dc < bd) { bd = dc; best = it; }

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

      /* The cursor is felt, not clicked. Held well under a tenth so it reads
         as the wall answering a hand and never as a control lighting up. */
      var lx = 0, ly = 0, sc = 1;
      if (cursor.on && !small && !viewerOpen && !reduced) {
        var dx = cursor.x - px, dy = cursor.y - py;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < GRAB) {
          var f = 1 - d / GRAB;
          f = f * f * (3 - 2 * f);          /* smoothstep */
          sc = 1 + LIFT * f;
          lx = (dx / (d || 1)) * PULL * f;
          ly = (dy / (d || 1)) * PULL * f;
        }
      }

      /* Written only on a real change, and rounded, so a camera at rest
         stops producing style writes altogether. */
      var key = (lx * 100 | 0) + ':' + (ly * 100 | 0) + ':' + (sc * 1000 | 0);
      if (key !== it.key) {
        it.key = key;
        it.el.style.transform = (sc === 1 && !lx && !ly) ? ''
          : 'translate3d(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px,0) scale(' + sc.toFixed(4) + ')';
        it.el.classList.toggle('is-near', sc > 1.004);
      }
    }

    /* The corner names whatever is nearest the middle of the screen — the
       only place a production is named without the cursor asking. */
    if (best && best !== lastNear) {
      lastNear = best;
      if (nearEl) nearEl.textContent = best.title;
    }

    if (mapView && mapW) {
      mapView.style.transform = 'translate3d(' +
        ((cam.x / W) * mapW).toFixed(1) + 'px,' + ((cam.y / H) * mapH).toFixed(1) + 'px,0)';
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

  function screenRect(it) {
    return {
      x: it.x + vw / 2 - cam.x - it.w / 2,
      y: it.y + vh / 2 - cam.y - it.h / 2,
      w: it.w, h: it.h
    };
  }

  function stageRect(ratio) {
    var m = Math.min(vw, vh) * (small ? 0.06 : 0.09);
    var aw = vw - m * 2, ah = vh - m * 2;
    var w = aw, h = w / ratio;
    if (h > ah) { h = ah; w = h * ratio; }
    return { w: w, h: h, x: (vw - w) / 2, y: (vh - h) / 2 };
  }

  function fill(it) {
    stage.textContent = '';
    if (it.kind === 'cut') {
      var v = document.createElement('video');
      v.src = it.src;
      v.controls = true;
      v.loop = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.poster = it.video ? it.video.poster : '';
      if (it.video) v.currentTime = it.video.currentTime || 0;
      stage.appendChild(v);
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
