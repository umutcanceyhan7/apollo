/* Apollo Films — page behaviour. Vanilla, no build step.
   Each block is a no-op unless its hook element exists on the page. */

(function () {
  'use strict';

  var films = window.APOLLO_FILMS || [];
  var bySlug = {};
  films.forEach(function (f) { bySlug[f.slug] = f; });

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var noHover = window.matchMedia('(hover: none)').matches;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* A muted, looping, inline reel. The source is attached on demand so a
     page with twenty-four films doesn't open twenty-four connections. */
  function reel(cls, poster) {
    var v = el('video', cls);
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.preload = 'none';
    if (poster) v.poster = poster;
    return v;
  }

  /* Touch devices never get a reel attached: there is no hover to opt in with,
     so autoplaying would pull tens of megabytes over cellular unasked. The
     poster still carries the frame.

     `force` is the one exception, and only the showcase catalogue passes it:
     there the reel IS the interaction on a phone (see scroll-end focus), and
     it holds one film at a time rather than the whole schedule. */
  function playReel(v, src, force) {
    if (reduceMotion) return;
    if (noHover && !force) return;
    if (!v.getAttribute('src')) {
      v.preload = 'auto';
      v.setAttribute('src', src);
    }
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* autoplay blocked — poster stands in */ });
  }

  /* ---------- mobile nav ---------- */

  var toggle = document.querySelector('.masthead__toggle');
  var nav = document.querySelector('.masthead__nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
    });
  }

  /* ---------- homepage: the reel plays behind the index ---------- */

  var index = document.getElementById('index');
  if (index) {
    var stage = document.getElementById('hero-stage');
    var metaCat = document.getElementById('hero-cat');
    var metaClient = document.getElementById('hero-client');
    var slugs = window.APOLLO_INDEX || [];
    var activators = [];

    slugs.forEach(function (slug, i) {
      var film = bySlug[slug];
      if (!film) return;

      var li = el('li');
      if (i === 0) li.className = 'is-active';

      var a = el('a');
      a.href = 'film.html?f=' + encodeURIComponent(slug);
      a.appendChild(document.createTextNode(film.title));
      a.appendChild(el('sup', null, String(i + 1).padStart(2, '0')));
      li.appendChild(a);
      index.appendChild(li);

      var v = reel('hero__media' + (i === 0 ? ' is-active' : ''), film.hero || film.still);
      stage.appendChild(v);

      function activate() {
        [].forEach.call(index.children, function (n) { n.classList.remove('is-active'); });
        li.classList.add('is-active');
        [].forEach.call(stage.querySelectorAll('.hero__media'), function (n) {
          if (n !== v) { n.classList.remove('is-active'); n.pause(); }
        });
        v.classList.add('is-active');
        playReel(v, film.video);
        metaCat.textContent = film.category;
        metaClient.textContent = film.client || film.title;
      }

      activators.push(activate);
      a.addEventListener('mouseenter', activate);
      a.addEventListener('focus', activate);
      if (i === 0) playReel(v, film.video);
    });

    var first = bySlug[slugs[0]];
    if (first) {
      metaCat.textContent = first.category;
      metaClient.textContent = first.client || first.title;
    }

    /* Touch devices have no hover, so the index would sit on one frame forever.
       Cycle the posters instead — no video is fetched. Stops on first touch. */
    if (noHover && !reduceMotion && activators.length > 1) {
      var at = 0;
      var timer = setInterval(function () {
        at = (at + 1) % activators.length;
        activators[at]();
      }, 6000);
      index.addEventListener('touchstart', function () { clearInterval(timer); }, { passive: true, once: true });
    }
  }

  /* ---------- catalogue: the work as a screening schedule ---------- */

  var catalogueList = document.getElementById('catalogue-list');
  if (catalogueList) {
    var catalogueStage = document.getElementById('catalogue-stage');
    var catalogueSection = document.querySelector('.catalogue');
    var current = null;

    /* Without a pointer there is nothing to hover, so the schedule commits a
       film when the scroll settles instead — see "scroll-end focus" below.
       Everything a mouse does is left exactly as it was. */
    var focusMode = noHover;
    if (focusMode) catalogueSection.classList.add('catalogue--focus');

    /* Reels holding a src, oldest first. A phone should not carry twenty-four
       decoded films because the reader scrolled past them, so only the last
       few keep their buffer; the files stay in the HTTP cache. */
    var live = [];
    /* Set by the focus engine below, called by the filter. */
    var recommit = function () {};

    function hold(v) {
      var at = live.indexOf(v);
      if (at > -1) live.splice(at, 1);
      live.push(v);
      while (live.length > 3) {
        var old = live.shift();
        old.pause();
        old.removeAttribute('src');
        old.preload = 'none';
        old.load();
      }
    }

    films.forEach(function (film, i) {
      var v = reel('catalogue__media', film.hero || film.still);
      catalogueStage.insertBefore(v, catalogueStage.firstChild);

      var li = el('li');
      var a = el('a', 'row');
      a.href = 'film.html?f=' + encodeURIComponent(film.slug);
      a.appendChild(el('span', 'row__n', String(i + 1).padStart(2, '0')));
      var title = el('span', 'row__t', film.title);
      a.appendChild(title);
      a.appendChild(el('span', 'row__c', film.client || '—'));
      a.appendChild(el('span', 'row__k', film.category));

      /* The cue rides inside the title cell rather than as a fifth grid child:
         the row's columns differ at three widths, and a stray child would land
         wherever the grid had room. It takes no height until its row has the
         reel — the row opens for it on the commit (see .row__cue). */
      if (focusMode) {
        var cue = el('span', 'row__cue');
        cue.appendChild(el('i', 'row__dot'));
        cue.appendChild(el('span', null, 'Now playing'));
        cue.setAttribute('aria-hidden', 'true');
        title.appendChild(cue);
      }

      li.appendChild(a);
      catalogueList.appendChild(li);

      li.dataset.category = film.category;
      /* The rows are built here, so they can't carry the attribute in markup —
         they opt into the same entrance the static pages use. A row filtered
         out has never intersected, so it still arrives when it comes back. */
      li.setAttribute('data-reveal', '');

      /* The src is needed again when the schedule comes back on screen, long
         after this closure has done its work. */
      v.reelSrc = film.video;

      function activate() {
        if (current === v) return;
        if (current) { current.classList.remove('is-active'); current.pause(); }
        [].forEach.call(catalogueList.children, function (n) { n.classList.remove('is-active'); });
        li.classList.add('is-active');
        v.classList.add('is-active');
        playReel(v, film.video, focusMode);
        if (focusMode) hold(v);
        current = v;
      }

      li.activate = activate;
      a.addEventListener('mouseenter', activate);
      a.addEventListener('focus', activate);
      if (i === 0) {
        li.classList.add('is-active');
        v.classList.add('is-active');
        current = v;
        /* On touch the first film waits for the schedule to actually reach the
           screen — the page opens on a heading, and nothing should be fetched
           over cellular for a section nobody has arrived at yet. */
        if (!focusMode) playReel(v, film.video);
      }
    });

    /* ---------- scroll-end focus ----------
       A mouse names the film it is over. A finger can't, and picking films off
       the viewport as they cross it would cut the reel every few hundred
       milliseconds. So nothing changes while the page is moving: whatever is
       playing keeps playing, however many rows pass over it, and the film is
       only committed once the scroll has actually come to rest. Scrolling is
       the looking; stopping is the choice. */
    if (focusMode) {
      var settleTimer = 0;
      var touching = false;
      var armed = false;          /* the schedule is on screen */
      var masthead = document.querySelector('.masthead');

      /* The reel is stuck under the header, so the row a reader has landed on
         is the one nearest the middle of what is left of the screen. */
      function focusOn() {
        var head = masthead ? masthead.offsetHeight : 0;
        var line = head + (window.innerHeight - head) / 2;
        var rows = catalogueList.children;
        var best = null, bestGap = Infinity, last = null;

        for (var i = 0; i < rows.length; i++) {
          var li = rows[i];
          if (li.hidden) continue;
          last = li;
          var r = li.getBoundingClientRect();
          if (r.bottom < 0 || r.top > window.innerHeight) continue;
          var gap = Math.abs((r.top + r.bottom) / 2 - line);
          if (gap < bestGap) { bestGap = gap; best = li; }
        }

        /* At the foot of the page the last rows can no longer reach the middle
           of the screen — the document has run out of scroll. The row at that
           end is the one being read. */
        var y = window.scrollY || window.pageYOffset;
        if (last && y + window.innerHeight >= document.documentElement.scrollHeight - 4) best = last;

        return best;
      }

      function commit() {
        if (!armed || touching) return;
        var li = focusOn();
        /* Landed back on the film already running: leave it alone. Restarting
           it would punish the reader for looking around. */
        if (li && !li.classList.contains('is-active')) li.activate();
      }

      function schedule(wait) {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(commit, wait);
      }

      function resume() {
        if (current) playReel(current, current.reelSrc, true);
      }

      /* `scrollend` knows when momentum has run out and when the finger is
         still down mid-gesture; without it, a gap in the scroll stream is the
         only signal there is, and the touch handlers below cover the case it
         reads wrong — a finger held still on the glass with the page parked. */
      var hasScrollEnd = 'onscrollend' in window;

      window.addEventListener('scroll', function () {
        clearTimeout(settleTimer);
        if (!hasScrollEnd) schedule(140);
      }, { passive: true });

      if (hasScrollEnd) {
        window.addEventListener('scrollend', function () { schedule(60); });
      }

      window.addEventListener('touchstart', function () {
        touching = true;
        clearTimeout(settleTimer);
      }, { passive: true });

      function released() {
        touching = false;
        /* A flick goes on scrolling after the finger leaves; those scroll
           events push the commit back out again. This only lands when the
           page was already at rest when the touch ended. */
        schedule(hasScrollEnd ? 120 : 160);
      }
      window.addEventListener('touchend', released, { passive: true });
      window.addEventListener('touchcancel', released, { passive: true });

      /* Nothing is fetched until the schedule is on screen, and the reel stops
         when it leaves — a film playing three sections above the reader costs
         battery and shows nobody anything. */
      if ('IntersectionObserver' in window) {
        var stageIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              armed = true;
              commit();
              resume();
            } else {
              armed = false;
              if (current) current.pause();
            }
          });
        }, { threshold: 0.04 });
        stageIO.observe(catalogueSection);
      } else {
        armed = true;
        commit();
        resume();
      }

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { if (current) current.pause(); }
        else if (armed) resume();
      });

      recommit = commit;

      /* Rotation changes where the middle of the screen is. */
      var spin;
      window.addEventListener('resize', function () {
        clearTimeout(spin);
        spin = setTimeout(commit, 220);
      });
    }

    /* Same list, same rows — the filter only hides them. Catalogue numbers
       stay put when filtered, so a row keeps the same number wherever you
       meet it; the sequence going 10, 11 under Trailers is the point. */
    var filterBar = document.querySelector('.filters');
    if (filterBar) {
      var buttons = [].slice.call(filterBar.querySelectorAll('button'));
      var rows = [].slice.call(catalogueList.children);
      var countEl = document.getElementById('filter-count');

      function applyFilter(value) {
        var shown = [];
        rows.forEach(function (li) {
          var hit = value === 'All' || li.dataset.category === value;
          li.hidden = !hit;
          li.classList.remove('is-last');
          if (hit) shown.push(li);
        });
        if (shown.length) shown[shown.length - 1].classList.add('is-last');

        buttons.forEach(function (b) {
          b.setAttribute('aria-pressed', String(b.dataset.filter === value));
        });

        if (countEl) {
          countEl.textContent = shown.length + (shown.length === 1 ? ' film' : ' films');
        }

        /* If the reel on screen belongs to a row that just left, move to the
           top of what's left so the stage is never showing a hidden film. */
        if (shown.length && shown.indexOf(
          rows.filter(function (li) { return li.classList.contains('is-active'); })[0]
        ) === -1) {
          shown[0].activate();
        }

        /* On touch the schedule just changed length under a still page, so the
           row in the middle of the screen is not the one that was there a
           moment ago. Filtering is a deliberate act, not a scroll, so the film
           follows it immediately. */
        recommit();

        history.replaceState(null, '', value === 'All' ? location.pathname : '?c=' + encodeURIComponent(value));
      }

      buttons.forEach(function (b) {
        b.addEventListener('click', function () { applyFilter(b.dataset.filter); });
      });

      var startAt = new URLSearchParams(location.search).get('c');
      applyFilter((window.APOLLO_CATEGORIES || []).indexOf(startAt) > -1 ? startAt : 'All');
    }
  }

  /* ---------- production: the ethos reel ----------
     Six words, one frame. With a fine pointer the frame rides the cursor
     and tilts with it — a still held like a card being turned. Without a
     pointer there is nothing to hover, so the list steps through itself
     and the frame becomes part of the page. */

  var ethos = document.getElementById('ethos');
  if (ethos) {
    var eItems = [].slice.call(ethos.querySelectorAll('.ethos__item'));
    var eCard = ethos.querySelector('[data-ethos-card]');
    var eTilt = ethos.querySelector('.ethos__tilt');
    var eShots = [].slice.call(ethos.querySelectorAll('.ethos__shot'));
    var eLayer = 0;      /* which of the two <img> layers is showing */
    var eAt = -1;        /* active word, -1 = nothing shown */
    var eDwell = 2800;
    var eFollow = null;  /* null until the first setMode() */
    var eTimer = 0;
    var eRaf = 0;
    var eOver = false;
    /* current and target position of the card, in px */
    var cx = 0, cy = 0, gx = 0, gy = 0;

    ethos.style.setProperty('--dwell', eDwell + 'ms');

    var eCache = {};
    function eLoad(src) {
      if (!src || eCache[src]) return;
      eCache[src] = new Image();
      eCache[src].src = src;
    }

    /* Cross-fade between the two layers. The incoming layer is held back
       until it has actually decoded, so a slow frame never flashes empty. */
    function eShow(i) {
      if (i === eAt) return;
      eAt = i;
      eItems.forEach(function (li, k) { li.classList.toggle('is-active', k === i); });

      var src = eItems[i].dataset.shot;
      var cur = eShots[eLayer];
      var next = eShots[(eLayer + 1) % eShots.length];

      function swap() {
        next.classList.add('is-on');
        cur.classList.remove('is-on');
        eLayer = (eLayer + 1) % eShots.length;
      }

      eLoad(eItems[(i + 1) % eItems.length].dataset.shot);   /* the one after */

      if (next.getAttribute('src') === src) { swap(); return; }
      next.setAttribute('src', src);
      if (next.complete) swap();
      else next.onload = next.onerror = swap;
    }

    /* The card is fixed at the viewport origin and moved by transform, so
       following the cursor costs one compositor property and no layout. */
    function eLoop() {
      /* The mode can change under a running loop — a window dragged narrow
         mid-hover. A follow-mode transform left on a flow-mode card drags the
         frame down over the list, so the loop drops it on the way out. */
      if (!eFollow) { eRaf = 0; eCard.style.transform = ''; return; }
      cx += (gx - cx) * 0.18;
      cy += (gy - cy) * 0.18;
      eCard.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      if (eOver || Math.abs(gx - cx) > 0.4 || Math.abs(gy - cy) > 0.4) {
        eRaf = requestAnimationFrame(eLoop);
      } else {
        eRaf = 0;
      }
    }

    function eAim(e) {
      var r = eCard.getBoundingClientRect();
      var w = r.width || 320;
      var h = r.height || 213;
      /* Kept clear of the words: the card sits to whichever side has room. */
      var side = e.clientX < window.innerWidth / 2 ? 1 : -1;
      gx = Math.min(Math.max(e.clientX + side * (w * 0.62) - w / 2, 12), window.innerWidth - w - 12);
      gy = Math.min(Math.max(e.clientY - h / 2, 12), window.innerHeight - h - 12);

      /* Tilt reads off the cursor's place in the viewport, not off the card
         — the card is under the cursor, so it would have nothing to read. */
      if (!reduceMotion) {
        eTilt.style.setProperty('--ry', ((e.clientX / window.innerWidth - 0.5) * 18).toFixed(2) + 'deg');
        eTilt.style.setProperty('--rx', (-(e.clientY / window.innerHeight - 0.5) * 12).toFixed(2) + 'deg');
      }
      if (!eRaf) eRaf = requestAnimationFrame(eLoop);
    }

    function eStopFlow() { if (eTimer) { clearInterval(eTimer); eTimer = 0; } }

    function eStartFlow() {
      eStopFlow();
      if (reduceMotion || eItems.length < 2) return;
      eTimer = setInterval(function () { eShow((eAt + 1) % eItems.length); }, eDwell);
    }

    function eEnter(i) {
      return function (e) {
        eShow(i);
        /* A pointer that exists on a flow-mode layout — a tablet with a mouse,
           a narrow desktop window — picks a word and the sequence goes on from
           it. Nothing else here applies: the frame is already in the page. */
        if (!eFollow) { eStartFlow(); return; }
        eOver = true;
        eCard.classList.add('is-on');
        if (e && e.clientX != null) eAim(e);
      };
    }

    eItems.forEach(function (li, i) {
      var enter = eEnter(i);
      li.addEventListener('mouseenter', enter);
      li.addEventListener('focus', enter);
      /* Flow mode: a tap picks a word and the sequence carries on from it. */
      li.addEventListener('click', function () {
        if (eFollow) return;
        eShow(i);
        eStartFlow();
      });
    });

    ethos.addEventListener('mousemove', function (e) { if (eFollow && eOver) eAim(e); });
    ethos.addEventListener('mouseleave', function () {
      if (!eFollow) return;
      eOver = false;
      eCard.classList.remove('is-on');
    });
    ethos.addEventListener('focusout', function (e) {
      if (!eFollow) return;
      if (!ethos.contains(e.relatedTarget)) eCard.classList.remove('is-on');
    });

    /* Flow mode pulls six stills over what may be a phone connection, so it
       only runs while the section is actually on screen. */
    var eSeen = null;
    if ('IntersectionObserver' in window) {
      eSeen = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (eFollow) return;
          if (en.isIntersecting) { if (eAt < 0) eShow(0); eStartFlow(); }
          else eStopFlow();
        });
      }, { threshold: 0.15 });
    }

    /* A window can cross between the two modes — resizing a desktop window
       narrow, or docking a tablet to a mouse — so the mode is re-derived
       rather than decided once at load. */
    function eSetMode() {
      var follow = window.matchMedia('(hover: hover) and (pointer: fine)').matches
        && window.innerWidth >= 860;
      if (follow === eFollow) return;
      eFollow = follow;
      ethos.classList.toggle('ethos--follow', follow);
      ethos.classList.toggle('ethos--flow', !follow);

      if (follow) {
        eStopFlow();
        if (eSeen) eSeen.unobserve(ethos);
        eOver = false;
        eCard.classList.remove('is-on');
        eCard.style.transform = '';
        eItems.forEach(function (li) { li.classList.remove('is-active'); });
        eAt = -1;
        eShots.forEach(function (s) { s.classList.remove('is-on'); });
      } else {
        if (eRaf) { cancelAnimationFrame(eRaf); eRaf = 0; }
        eOver = false;
        eCard.classList.remove('is-on');
        eCard.style.transform = '';
        if (eAt < 0 && eShots[0].getAttribute('src') === eItems[0].dataset.shot) {
          /* The first frame is already in the markup — adopt it rather than
             cross-fading a second copy of the same file over the top of it. */
          eShots[0].classList.add('is-on');
          eLayer = 0;
          eAt = 0;
          eItems[0].classList.add('is-active');
          eLoad(eItems[1].dataset.shot);
        } else {
          eShow(eAt < 0 ? 0 : eAt);
        }
        if (eSeen) eSeen.observe(ethos);
        else eStartFlow();
      }
    }

    eSetMode();

    var eResize;
    window.addEventListener('resize', function () {
      clearTimeout(eResize);
      eResize = setTimeout(eSetMode, 150);
    });
  }

  /* ---------- film detail ---------- */

  var detail = document.getElementById('film');
  if (detail) {
    var slug = new URLSearchParams(location.search).get('f');
    var film = bySlug[slug];
    var player = detail.querySelector('[data-player]');

    if (!film) {
      detail.querySelector('[data-title]').textContent = 'Film not found';
      detail.querySelector('[data-cat]').textContent = 'Apollo Films';
      detail.querySelector('[data-client]').textContent = '';
      if (player) player.remove();
    } else {
      document.title = film.title + ' — Apollo Films';
      detail.querySelector('[data-title]').textContent = film.title;
      detail.querySelector('[data-cat]').textContent = film.category;
      detail.querySelector('[data-client]').textContent = film.client || '';

      player.poster = film.hero || film.still;
      /* The full cut when a media host is configured, the 12s loop when it
         isn't — see FULL in films.js. */
      player.src = film.full || film.video;

      /* Crew and cast share the role/name grid. Cast only exists on the
         films we hold a real roll for, so its block stays hidden otherwise
         rather than printing an empty heading. */
      function fillRoles(list, rows) {
        if (!list) return 0;
        (rows || []).forEach(function (c) {
          var li = el('li');
          li.appendChild(el('span', 'role', c.role));
          li.appendChild(el('span', 'name', c.name));
          list.appendChild(li);
        });
        return (rows || []).length;
      }

      fillRoles(detail.querySelector('[data-credits]'), film.credits);

      var castBlock = detail.querySelector('[data-cast-block]');
      if (fillRoles(detail.querySelector('[data-cast]'), film.cast) && castBlock) {
        castBlock.hidden = false;
      }

      var alsoBlock = detail.querySelector('[data-also-block]');
      var alsoEl = detail.querySelector('[data-also]');
      if (alsoEl && (film.alsoCredited || []).length) {
        film.alsoCredited.forEach(function (name) {
          alsoEl.appendChild(el('span', null, name));
        });
        if (alsoBlock) alsoBlock.hidden = false;
      }

      var i = films.indexOf(film);
      var prev = films[(i - 1 + films.length) % films.length];
      var next = films[(i + 1) % films.length];

      var prevEl = detail.querySelector('[data-prev]');
      var nextEl = detail.querySelector('[data-next]');
      prevEl.href = 'film.html?f=' + encodeURIComponent(prev.slug);
      prevEl.querySelector('.t').textContent = prev.title;
      nextEl.href = 'film.html?f=' + encodeURIComponent(next.slug);
      nextEl.querySelector('.t').textContent = next.title;
    }
  }

  /* ---------- contact form → mail client ---------- */

  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var body = [
        'From: ' + (d.get('first') || '') + ' ' + (d.get('last') || ''),
        'Email: ' + (d.get('email') || ''),
        d.get('news') ? 'Sign up for news and updates: yes' : '',
        '',
        d.get('message') || ''
      ].filter(Boolean).join('\n');

      window.location.href = 'mailto:info@apollofilms.co'
        + '?subject=' + encodeURIComponent(d.get('subject') || 'Enquiry')
        + '&body=' + encodeURIComponent(body);
    });
  }

  /* ---------- display lines split into words ----------
     Splitting has to happen before the observer runs, or the words are
     created already at rest and the line simply appears. */

  /* Every word rides in its own clip box, so the line must not re-wrap once
     the boxes exist. On a phone a display line sits one word to the row with
     a few pixels to spare, and the smallest change in metrics — the webfont
     arriving — re-flows it: the words appear stacked, blink, and snap back
     together mid-entrance. Below that width the line rises as one block
     instead, the same entrance the rest of the page already uses. */
  var splitWords = window.matchMedia('(min-width: 780px)').matches;

  [].forEach.call(document.querySelectorAll('[data-split]'), function (node) {
    var text = node.textContent.trim();
    /* A line the page fills in later — a film title with no slug behind it —
       has nothing to split, and one empty word would still clip a space. */
    if (!text) return;

    /* Dropped, not ignored: the entrance rules key off the attribute, and a
       line left carrying it would have no start state and simply appear. */
    if (!splitWords) { node.removeAttribute('data-split'); return; }

    var words = text.split(/\s+/);
    /* `data-reveal="120"` holds the line back; its words wait with it. */
    var base = parseInt(node.getAttribute('data-reveal'), 10) || 0;
    node.textContent = '';
    words.forEach(function (w, i) {
      var clip = el('span', 'split');
      var inner = el('span', 'split__w', w);
      /* The stagger is short — the line should read as one move, not six. */
      inner.style.transitionDelay = (base + i * 45) + 'ms';
      clip.appendChild(inner);
      node.appendChild(clip);
      if (i < words.length - 1) node.appendChild(document.createTextNode(' '));
    });
  });

  /* ---------- entrances ----------
     One-shot: an element that has arrived stays arrived, so scrolling back
     up a page doesn't replay it. */

  var reveals = [].slice.call(document.querySelectorAll('[data-reveal]'));

  /* An optional value on the attribute is a delay in ms, so a heading can land
     before the line under it without a rule per page. Empty means no delay —
     and no inline style, so CSS-set delays (the fact row) survive. */
  reveals.forEach(function (n) {
    var d = n.getAttribute('data-reveal');
    if (d && !n.hasAttribute('data-split')) n.style.transitionDelay = d + 'ms';
  });

  function startReveals() {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        revealIO.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    reveals.forEach(function (n) { revealIO.observe(n); });

    /* Insurance. The start state hides real copy, so if the observer never
       delivers — an engine that stubs it, a webview that never gives the
       page a rendering opportunity — the page shows itself anyway. A tab
       that is merely in the background is excluded: it has not been shown
       yet, and will get its entrance when it is. */
    setTimeout(function () {
      if (document.hidden) return;
      if (document.querySelector('[data-reveal].is-in')) return;
      reveals.forEach(function (n) { n.classList.add('is-in'); });
    }, 2500);
  }

  if (reveals.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      reveals.forEach(function (n) { n.classList.add('is-in'); });
    } else if (document.fonts && document.fonts.ready) {
      /* Nothing enters until the face is in. Copy re-wraps when the metrics
         change, and a line that re-wraps mid-rise reads as a blink; held at
         opacity 0 the swap happens where nobody can see it. The wait is
         capped, because a face that never arrives must not hold the page. */
      var begun = false;
      var begin = function () { if (!begun) { begun = true; startReveals(); } };
      document.fonts.ready.then(begin);
      setTimeout(begin, 1200);
    } else {
      startReveals();
    }
  }

  /* ---------- footer year ---------- */

  [].forEach.call(document.querySelectorAll('[data-year]'), function (n) {
    n.textContent = String(new Date().getFullYear());
  });
})();
