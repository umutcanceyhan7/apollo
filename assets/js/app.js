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

  /* ---------- the room lights ----------
     Dark is the site's default and it is the absence of the attribute, not
     a value of one: a visitor lands in the projection room whether or not
     their OS prefers light, because that first screen is the studio's
     first impression. Choosing light is a decision, and it is remembered.

     The restore already happened in the head, before first paint. This
     block only carries the switching. */

  var themeToggle = document.querySelector('[data-theme-toggle]');
  if (themeToggle) {
    var root = document.documentElement;
    var themeMeta = document.querySelector('meta[name="theme-color"]');
    /* The literal grounds, for the browser chrome only — it cannot read a
       custom property. Keep in step with --black and --paper. */
    var themeChrome = { dark: '#060603', light: '#f2f0e6' };
    var shiftTimer = 0;

    function themeNow() {
      return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    /* The lamp draws its own state, so the label is the only thing that has
       to say it out loud — and it says the destination, because that is what
       pressing the button does. */
    function paintTheme() {
      var now = themeNow();
      var label = now === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
      themeToggle.setAttribute('aria-label', label);
      themeToggle.setAttribute('title', label);
      if (themeMeta) themeMeta.content = themeChrome[now];
    }

    function setTheme(next) {
      if (next !== 'light' && next !== 'dark') return;
      if (next === themeNow()) return;

      /* The grounds dissolve rather than cut. The class is the only thing
         that gives the page a colour transition, and it comes back off as
         soon as the swap has run — see .theme-shift in apollo.css. */
      if (!reduceMotion) {
        root.classList.add('theme-shift');
        clearTimeout(shiftTimer);
        shiftTimer = setTimeout(function () {
          root.classList.remove('theme-shift');
        }, 460);
      }

      if (next === 'light') root.setAttribute('data-theme', 'light');
      else root.removeAttribute('data-theme');

      try { localStorage.setItem('apollo-theme', next); } catch (e) { /* private mode */ }
      paintTheme();
    }

    themeToggle.addEventListener('click', function () {
      setTheme(themeNow() === 'light' ? 'dark' : 'light');
    });

    /* The markup ships labelled for dark; a page restored into light has to
       be told the truth about itself before anyone reaches the button. */
    paintTheme();
  }

  /* ---------- homepage: the reel plays behind the index ---------- */

  var index = document.getElementById('index');
  if (index) {
    var hero = document.querySelector('.hero');
    var deck = document.querySelector('.hero__deck');
    var stage = document.getElementById('hero-stage');
    var metaRow = document.querySelector('.hero__row--meta');
    var metaCat = document.getElementById('hero-cat');
    var metaClient = document.getElementById('hero-client');
    var slugs = window.APOLLO_INDEX || [];
    var activators = [];
    var reels = [];

    /* Phone mode: the reel is pinned and the scroll picks the film. Set by
       heroSetMode() below, and consulted while the index is being built. */
    var trackOn = null;
    var trackAt = -1;

    /* One decoded film is the point; five held at once is a phone carrying
       four reels nobody is looking at. Oldest buffers are let go — the files
       stay in the HTTP cache, so scrolling back is a re-attach, not a
       re-download. Same bargain the catalogue strikes. */
    var trackLive = [];
    function trackHold(v) {
      var at = trackLive.indexOf(v);
      if (at > -1) trackLive.splice(at, 1);
      trackLive.push(v);
      while (trackLive.length > 2) {
        var old = trackLive.shift();
        old.pause();
        old.removeAttribute('src');
        old.preload = 'none';
        old.load();
      }
    }

    /* The reel is the interaction on a phone — the same exception the
       catalogue makes — so it is allowed to fetch without a hover to ask
       with. A reader who has said they are metering the connection is taken
       at their word, and gets the posters. */
    var saveData = !!(navigator.connection && navigator.connection.saveData);

    /* The metadata belongs to the film on screen, so it changes with it
       rather than being swapped out from under the reader mid-fade. */
    var metaTimer = 0;
    function setMeta(film) {
      var cat = film.category;
      var client = film.client || film.title;
      function write() {
        metaCat.textContent = cat;
        metaClient.textContent = client;
      }
      if (!trackOn || reduceMotion || !metaRow) { write(); return; }
      metaRow.classList.add('is-swapping');
      clearTimeout(metaTimer);
      metaTimer = setTimeout(function () {
        write();
        metaRow.classList.remove('is-swapping');
      }, 200);
    }

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
      reels.push(v);
      v.reelSrc = film.video;

      /* The one place the active film is chosen, whoever is asking — a
         cursor, a focus ring, or the scroll. Name, frame and metadata move
         together here or not at all, so the corner can never be reading
         one film while the screen plays another. */
      function activate() {
        trackAt = i;
        [].forEach.call(index.children, function (n) { n.classList.remove('is-active'); });
        li.classList.add('is-active');
        [].forEach.call(stage.querySelectorAll('.hero__media'), function (n) {
          if (n !== v) { n.classList.remove('is-active'); n.pause(); }
        });
        v.classList.add('is-active');
        playReel(v, film.video, trackOn && !saveData);
        if (trackOn) trackHold(v);
        setMeta(film);
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
      /* The first film is already the active one in the markup above — say so,
         so the poster cycle starts on the second and the scroll track knows
         what it is moving away from. */
      trackAt = 0;
    }

    /* Touch devices wide enough to keep the wall of titles have no hover, so
       the index would sit on one frame forever. Cycle the posters instead —
       no video is fetched. Stops on first touch, and never runs on a phone,
       where the scroll is doing the choosing. */
    var cycleTimer = 0;
    var cycleDone = false;
    function stopCycle() { clearInterval(cycleTimer); cycleTimer = 0; }
    function startCycle() {
      if (cycleTimer || cycleDone || trackOn || reduceMotion || !noHover) return;
      if (activators.length < 2) return;
      cycleTimer = setInterval(function () {
        activators[(trackAt + 1) % activators.length]();
      }, 6000);
    }
    index.addEventListener('touchstart', function () {
      cycleDone = true;
      stopCycle();
    }, { passive: true, once: true });

    /* ---------- phone: the scroll track ----------
       The hero is several screens tall with one screen pinned to the top of
       it, so the distance the hero still has to travel while pinned *is* the
       reader's position in the five. Nothing here reads the viewport for
       which row is nearest the middle — there are no rows to be near. */

    var trackRaf = 0;
    var trackArmed = true;

    function trackTick() {
      trackRaf = 0;
      if (!trackOn || !deck) return;
      var hr = hero.getBoundingClientRect();
      var dr = deck.getBoundingClientRect();
      /* How far the pinned screen has slid down inside its own track. The
         deck starts flush with the top of the hero and ends flush with the
         bottom of it, so this needs no header height and no scroll offset —
         it is measured entirely between the two boxes. */
      var travel = hr.height - dr.height;
      var p = travel > 0 ? (dr.top - hr.top) / travel : 0;
      p = Math.min(Math.max(p, 0), 1);
      var i = Math.round(p * (activators.length - 1));
      if (i !== trackAt && activators[i]) activators[i]();
    }

    function trackSchedule() {
      if (trackRaf || !trackOn) return;
      trackRaf = requestAnimationFrame(trackTick);
    }

    window.addEventListener('scroll', trackSchedule, { passive: true });

    /* A film running three sections above the reader costs battery and shows
       nobody anything. Nothing plays until the hero is on screen, and the
       reel stops when it leaves. */
    if ('IntersectionObserver' in window && hero) {
      var heroIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          trackArmed = en.isIntersecting;
          if (!trackArmed) {
            reels.forEach(function (v) { v.pause(); });
          } else if (trackOn) {
            trackTick();
            if (trackAt > -1 && !saveData) playReel(reels[trackAt], reels[trackAt].reelSrc, true);
          }
        });
      }, { threshold: 0.02 });
      heroIO.observe(hero);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { reels.forEach(function (v) { v.pause(); }); }
      else if (trackArmed && trackOn && trackAt > -1 && !saveData) {
        playReel(reels[trackAt], reels[trackAt].reelSrc, true);
      }
    });

    /* A window can cross between the two, so the mode is re-derived rather
       than decided once at load. */
    function heroSetMode() {
      var on = window.matchMedia('(max-width: 780px)').matches;
      if (on === trackOn) return;
      trackOn = on;
      if (!hero) return;
      hero.classList.toggle('hero--track', on);
      if (on) {
        hero.style.setProperty('--steps', String(activators.length));
        stopCycle();
        /* The film the desktop layout left showing was chosen by a cursor,
           not by where the page is. Forget it and let the track say. */
        trackAt = -1;
        trackTick();
      } else {
        hero.style.removeProperty('--steps');
        startCycle();
      }
    }

    heroSetMode();

    var heroResize;
    window.addEventListener('resize', function () {
      clearTimeout(heroResize);
      heroResize = setTimeout(function () {
        heroSetMode();
        trackTick();
      }, 150);
    });
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
      /* A tap on a phone fires mouseenter and focus on the way to the film
         page, so a pressed row would take the reel for the half second before
         the page changes — and hold it, wrongly, on the way back. Where the
         scroll makes the choice, pressing a row only opens it. */
      if (!focusMode) {
        a.addEventListener('mouseenter', activate);
        a.addEventListener('focus', activate);
      }
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

      /* Coming back from a film page can restore the schedule from the
         back/forward cache: the observer has nothing new to report, and the
         reel comes back stopped where it was. Resolve the focus once and pick
         the film up again, so the list a reader returns to is the list they
         left rather than a still. */
      window.addEventListener('pageshow', function (e) {
        if (!e.persisted || !armed) return;
        commit();
        resume();
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

      /* Crew and cast share the role/name grid. Both only exist on the
         films we hold a delivered roll for, so each block stays hidden
         otherwise rather than printing an empty heading. */
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

      var crewBlock = detail.querySelector('[data-crew-block]');
      if (fillRoles(detail.querySelector('[data-credits]'), film.credits) && crewBlock) {
        crewBlock.hidden = false;
      }

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

  /* ---------- about: the wall ----------
     The about page opens on the catalogue hung in depth. The layout is a
     grid every frame is then knocked out of: each starts at the centre of a
     cell and is moved, sized, turned and pushed back by numbers derived from
     its own index. Nothing here is random — a reload gives the reader the
     same room back, which is the difference between a wall and a shuffle.

     Depth carries the rest. A frame takes one of three z-planes, and how
     large it lands, how much it blurs and how far it swings under the
     pointer all follow from that one number and the perspective on the
     field (see .wall in apollo.css). */

  var wallPlane = document.getElementById('wall-plane');
  if (wallPlane && films.length) {
    var wall = document.querySelector('.wall');
    var wallWide = window.matchMedia('(min-width: 761px)');
    var wallSave = !!(navigator.connection && navigator.connection.saveData);
    var wallReels = [];

    /* Deterministic in place of Math.random: index in, the same number out,
       every visit. */
    function wallRand(i, salt) {
      var x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
      return x - Math.floor(x);
    }
    function wallSpan(i, salt, lo, hi) { return lo + wallRand(i, salt) * (hi - lo); }

    /* The CDN serves whatever width is asked for, and at these sizes the
       delivered thumbnail is four times the pixels the tile can show — a
       full-size wall is 2.5 MB of stills nobody is reading. Only the near
       plane is in focus, so only the near plane is worth 750w. */
    function wallStill(url, w) {
      return url + (url.indexOf('?') > -1 ? '&' : '?') + 'format=' + w + 'w';
    }

    /* Three planes, and every frame belongs to exactly one. Widths are
       multiples of the cell, so a near frame overlaps its neighbours and a
       far one leaves the ground showing — which is the depth, seen. */
    var WALL_TIERS = [
      { cls: 'far',  z: [-520, -330], w: [0.80, 1.10] },
      { cls: 'mid',  z: [-190, -60],  w: [0.92, 1.26] },
      { cls: 'near', z: [30, 170],    w: [1.02, 1.40] }
    ];
    /* Weighted toward the frame the site actually shoots. The phone gets its
       own weighting: a portrait screen cut into rows leaves a band of ground
       under every 16:9 tile, and a crop is the cheapest way to close it. */
    var WALL_AR = ['16 / 9', '16 / 9', '16 / 9', '3 / 2', '4 / 5', '1 / 1'];
    var WALL_AR_NARROW = ['4 / 5', '1 / 1', '3 / 2', '4 / 5', '16 / 9', '1 / 1'];

    /* The frame comes up when its own still does — see .wall__tile. */
    function wallLight() {
      if (this.parentNode) this.parentNode.classList.add('is-lit');
    }

    function buildWall() {
      wallReels = [];
      wallPlane.textContent = '';

      var wide = wallWide.matches;
      var cols = wide ? 8 : 4;
      var rows = wide ? 5 : 6;
      var cells = cols * rows;
      var cw = 100 / cols;
      var ch = 100 / rows;
      /* A phone's cells are tall and narrow and a 16:9 frame is neither, so
         a wall built to the desktop's proportions leaves black bands between
         the rows. The frames are widened past their cell to close them —
         they overlap sideways instead, which is what the wall wants
         anyway. */
      var spread = wide ? 1 : 1.2;
      var ars = wide ? WALL_AR : WALL_AR_NARROW;

      /* Forty cells against twenty-four films, so the catalogue runs round
         twice. Stepping by the column count rather than by one puts a film's
         second appearance a full row away from its first, which is what
         keeps the repeat from reading as a repeat. */
      var near = [];

      for (var n = 0; n < cells; n++) {
        var film = films[(n * 3 + Math.floor(n / cols)) % films.length];
        if (!film || !film.still) continue;

        var tier = WALL_TIERS[Math.min(2, Math.floor(wallRand(n, 3) * 3))];
        var col = n % cols;
        var row = Math.floor(n / cols);

        var tile = el('div', 'wall__tile wall__tile--' + tier.cls);
        tile.style.setProperty('--x', ((col + 0.5) * cw + wallSpan(n, 5, -0.3, 0.3) * cw).toFixed(2) + '%');
        tile.style.setProperty('--y', ((row + 0.5) * ch + wallSpan(n, 7, -0.3, 0.3) * ch).toFixed(2) + '%');
        tile.style.setProperty('--w', (cw * spread * wallSpan(n, 11, tier.w[0], tier.w[1])).toFixed(2) + '%');
        tile.style.setProperty('--z', wallSpan(n, 13, tier.z[0], tier.z[1]).toFixed(0) + 'px');
        tile.style.setProperty('--r', wallSpan(n, 17, -3.4, 3.4).toFixed(2) + 'deg');
        tile.style.setProperty('--ar', ars[Math.floor(wallRand(n, 19) * ars.length)]);

        var img = el('img');
        img.alt = '';
        img.decoding = 'async';
        /* The field is decoration behind a headline, so the two planes the
           reader can actually read wait for the near one to land. */
        img.fetchPriority = tier.cls === 'near' ? 'high' : 'low';
        img.addEventListener('load', wallLight);
        img.src = wallStill(film.still, tier.cls === 'near' ? 750 : 500);
        /* A still already in the HTTP cache can be complete before the
           listener above is ever called. */
        if (img.complete) wallLight.call(img);
        tile.appendChild(img);

        wallPlane.appendChild(tile);
        if (tier.cls === 'near' && film.video) near.push({ tile: tile, film: film });
      }

      /* Three frames out of twenty-four are running. Any more and the wall
         stops reading as a wall of stills with something alive in it and
         starts reading as a video grid — and it would put twelve megabytes
         behind a paragraph of copy. Touch, reduced motion and a metered
         connection get the stills alone. */
      if (!wide || reduceMotion || noHover || wallSave) return;
      near.slice(0, 3).forEach(function (spot) {
        var v = reel('', spot.film.still);
        spot.tile.appendChild(v);
        v.addEventListener('playing', function () { v.classList.add('is-on'); });
        wallReels.push({ el: v, src: spot.film.video });
        playReel(v, spot.film.video);
      });
    }

    buildWall();
    /* The tile count is a layout decision, so it is re-made when the layout
       changes rather than being left at whatever the first paint chose. */
    if (wallWide.addEventListener) wallWide.addEventListener('change', buildWall);

    /* Nothing decodes while the wall is off screen — the same bargain the
       homepage hero strikes with its reel. */
    if ('IntersectionObserver' in window && wall) {
      var wallIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          wallReels.forEach(function (r) {
            if (en.isIntersecting) playReel(r.el, r.src);
            else r.el.pause();
          });
        });
      }, { threshold: 0.01 });
      wallIO.observe(wall);
    }

    /* The wall turns toward the cursor, and arrives after it — the swing is
       small and the transition is long, so it reads as weight rather than as
       a thing following the mouse. The base angles live in the stylesheet;
       this only leans against them. */
    if (wall && !reduceMotion && !noHover) {
      var leanPending = false;
      var leanX = 0;
      var leanY = 0;

      wall.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var r = wall.getBoundingClientRect();
        leanX = (e.clientX - r.left) / r.width - 0.5;
        leanY = (e.clientY - r.top) / r.height - 0.5;
        if (leanPending) return;
        leanPending = true;
        requestAnimationFrame(function () {
          leanPending = false;
          wallPlane.style.setProperty('--wall-y', (12 + leanX * 9).toFixed(2) + 'deg');
          wallPlane.style.setProperty('--wall-x', (7 - leanY * 6).toFixed(2) + 'deg');
        });
      });

      /* Hands back to the stylesheet's own angles rather than to zero. */
      wall.addEventListener('pointerleave', function () {
        wallPlane.style.removeProperty('--wall-x');
        wallPlane.style.removeProperty('--wall-y');
      });
    }
  }

  /* ---------- footer year ---------- */

  [].forEach.call(document.querySelectorAll('[data-year]'), function (n) {
    n.textContent = String(new Date().getFullYear());
  });
})();
