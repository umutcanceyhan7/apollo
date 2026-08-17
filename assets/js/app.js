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
     poster still carries the frame. */
  function playReel(v, src) {
    if (reduceMotion || noHover) return;
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
    var current = null;

    films.forEach(function (film, i) {
      var v = reel('catalogue__media', film.hero || film.still);
      catalogueStage.insertBefore(v, catalogueStage.firstChild);

      var li = el('li');
      var a = el('a', 'row');
      a.href = 'film.html?f=' + encodeURIComponent(film.slug);
      a.appendChild(el('span', 'row__n', String(i + 1).padStart(2, '0')));
      a.appendChild(el('span', 'row__t', film.title));
      a.appendChild(el('span', 'row__c', film.client || '—'));
      a.appendChild(el('span', 'row__k', film.category));
      li.appendChild(a);
      catalogueList.appendChild(li);

      li.dataset.category = film.category;
      /* The rows are built here, so they can't carry the attribute in markup —
         they opt into the same entrance the static pages use. A row filtered
         out has never intersected, so it still arrives when it comes back. */
      li.setAttribute('data-reveal', '');

      function activate() {
        if (current === v) return;
        if (current) { current.classList.remove('is-active'); current.pause(); }
        [].forEach.call(catalogueList.children, function (n) { n.classList.remove('is-active'); });
        li.classList.add('is-active');
        v.classList.add('is-active');
        playReel(v, film.video);
        current = v;
      }

      li.activate = activate;
      a.addEventListener('mouseenter', activate);
      a.addEventListener('focus', activate);
      if (i === 0) {
        li.classList.add('is-active');
        v.classList.add('is-active');
        current = v;
        playReel(v, film.video);
      }
    });

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

  [].forEach.call(document.querySelectorAll('[data-split]'), function (node) {
    var text = node.textContent.trim();
    /* A line the page fills in later — a film title with no slug behind it —
       has nothing to split, and one empty word would still clip a space. */
    if (!text) return;

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

  if (reveals.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      reveals.forEach(function (n) { n.classList.add('is-in'); });
    } else {
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
  }

  /* ---------- footer year ---------- */

  [].forEach.call(document.querySelectorAll('[data-year]'), function (n) {
    n.textContent = String(new Date().getFullYear());
  });
})();
