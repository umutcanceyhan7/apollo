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

  /* ---------- footer year ---------- */

  [].forEach.call(document.querySelectorAll('[data-year]'), function (n) {
    n.textContent = String(new Date().getFullYear());
  });
})();
