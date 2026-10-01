/* ============================================================
   LUCIA — application layer
   Vanilla ES2017. No build step, no framework, no dependencies.
   Every page loads data.js → images.js → app.js and declares
   what it needs with data-* attributes.
   ============================================================ */
(function () {
  'use strict';

  const { imgSrc, imgSrcset, imgAlt, IMG } = window.LUCIA_IMAGES;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const euro = (n) => (Number.isInteger(n) ? n : n.toFixed(2));

  /** Small counts as words, to match the site's editorial voice
      ("eleven courses", not "11 courses") — covers 0–99, which is
      as far as any count on this site will ever run. */
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
    'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function wordNum(n) {
    if (n < 20) return ONES[n];
    const t = Math.floor(n / 10), o = n % 10;
    return TENS[t] + (o ? '-' + ONES[o] : '');
  }
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------------------------------------------------------
     0. MONOGRAM
     An 'L' crossed by a horizon line inside a keyline square —
     the letter, the sea, the table.
     --------------------------------------------------------- */
  const MARK = (cls = '') => `
    <svg class="${cls}" viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">
      <rect x="1.5" y="1.5" width="37" height="37" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"/>
      <path d="M14 10.5V27.5H27" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" vector-effect="non-scaling-stroke"/>
      <line x1="7" y1="21" x2="33" y2="21" stroke="currentColor" stroke-width="0.7" opacity="0.65" vector-effect="non-scaling-stroke"/>
    </svg>`;

  /* ---------------------------------------------------------
     1. IMAGE HELPERS
     --------------------------------------------------------- */
  function pictureHTML(key, opts = {}) {
    const { sizes = '100vw', eager = false, className = '' } = opts;
    const src = imgSrc(key, opts.w || 1400);
    const set = imgSrcset(key);
    return `<img class="${className}" src="${src}"${set ? ` srcset="${set}" sizes="${sizes}"` : ''}
      alt="${imgAlt(key).replace(/"/g, '&quot;')}"
      loading="${eager ? 'eager' : 'lazy'}" decoding="${eager ? 'sync' : 'async'}"
      ${eager ? 'fetchpriority="high"' : ''} data-key="${key}">`;
  }

  /** Never show a broken image icon — degrade to a designed plate. */
  function guardImages(root = document) {
    $$('img[data-key]', root).forEach((img) => {
      const fail = () => {
        const fig = img.closest('.fig, .gal__item, .hero__media, .phero__media, .modal__media, .full-bleed');
        if (fig) {
          fig.classList.add('is-fallback');
          if (!fig.getAttribute('data-fallback')) fig.setAttribute('data-fallback', 'Lucia');
        }
      };
      if (img.complete && img.naturalWidth === 0) fail();
      img.addEventListener('error', fail, { once: true });
    });
  }

  /* ---------------------------------------------------------
     2. CHROME — loader, cursor, nav, drawer, footer
     --------------------------------------------------------- */
  const PAGES = [
    { href: 'menu.html',  label: 'Menu' },
    { href: 'about.html', label: 'About' },
    { href: 'table.html', label: 'The Table' },
    { href: 'wine.html',  label: 'Wine' },
    { href: 'visit.html', label: 'Visit' }
  ];

  function buildChrome() {
    const here = (location.pathname.split('/').pop() || 'index.html');
    const overHero = document.body.hasAttribute('data-hero');

    /* loader ------------------------------------------------ */
    if (!REDUCED && !sessionStorage.getItem('lucia-seen')) {
      const l = document.createElement('div');
      l.className = 'loader';
      l.innerHTML = `<div class="loader__inner">
        ${MARK('loader__mark')}
        <div class="loader__line"></div>
        <div class="loader__word">LUCIA</div>
      </div>`;
      document.body.appendChild(l);
      setTimeout(() => {
        l.hidden = true;
        sessionStorage.setItem('lucia-seen', '1');
        setTimeout(() => l.remove(), 600);
      }, 950);
    }

    /* nav --------------------------------------------------- */
    const nav = document.createElement('header');
    nav.className = 'nav' + (overHero ? ' nav--over' : ' nav--solid');
    nav.innerHTML = `
      <a class="nav__brand" href="index.html" aria-label="LUCIA — home">
        ${MARK('nav__mark')}<span>LUCIA</span>
      </a>
      <nav class="nav__links" aria-label="Primary">
        ${PAGES.map(p => `<a class="nav__link" href="${p.href}"${here === p.href ? ' aria-current="page"' : ''}>${p.label}</a>`).join('')}
        <a class="nav__cta" href="visit.html#reserve">Reserve</a>
      </nav>
      <button class="nav__burger" type="button" aria-expanded="false" aria-controls="drawer" aria-label="Open menu"><span></span></button>`;
    document.body.prepend(nav);

    const drawer = document.createElement('div');
    drawer.className = 'drawer';
    drawer.id = 'drawer';
    drawer.innerHTML = `
      <nav aria-label="Mobile">
        ${PAGES.map(p => `<a class="drawer__link" href="${p.href}">${p.label}</a>`).join('')}
      </nav>
      <div class="drawer__foot">
        <a class="btn btn--light" href="visit.html#reserve">Reserve a table<i class="btn__arrow"></i></a>
      </div>`;
    document.body.appendChild(drawer);

    /* theme toggle -------------------------------------------
       One shared control, rendered into both the desktop nav and
       the mobile drawer foot. Persisted so the choice survives a
       reload; defaults to the visitor's OS preference until they
       pick one explicitly. */
    const SUN = '<svg class="i-sun" viewBox="0 0 24 24" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M4.6 12H2M22 12h-2.6M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/></svg>';
    const MOON = '<svg class="i-moon" viewBox="0 0 24 24" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z"/></svg>';
    const applyTheme = (mode) => {
      document.documentElement.setAttribute('data-theme', mode);
      $$('.theme-toggle').forEach(b => b.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'));
      $$('.theme-toggle').forEach(b => b.setAttribute('aria-pressed', String(mode === 'dark')));
    };
    const savedTheme = (() => { try { return localStorage.getItem('lucia-theme'); } catch (e) { return null; } })();
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    let theme = savedTheme || (systemDark ? 'dark' : 'light');
    applyTheme(theme);
    const toggleTheme = () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      try { localStorage.setItem('lucia-theme', theme); } catch (e) { /* private mode: ignore */ }
    };
    const themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.className = 'theme-toggle';
    themeBtn.innerHTML = SUN + MOON;
    themeBtn.addEventListener('click', toggleTheme);
    $('.nav__links', nav).insertBefore(themeBtn, $('.nav__cta', nav));

    const drawerThemeBtn = document.createElement('button');
    drawerThemeBtn.type = 'button';
    drawerThemeBtn.className = 'theme-toggle';
    drawerThemeBtn.innerHTML = SUN + MOON;
    drawerThemeBtn.addEventListener('click', toggleTheme);
    $('.drawer__foot', drawer).appendChild(drawerThemeBtn);
    applyTheme(theme); // re-apply so the freshly-added buttons get correct label/pressed state

    /* drawer open/close + focus management ------------------- */
    const burger = $('.nav__burger', nav);
    let lastFocused = null;
    const focusables = (root) => $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', root)
      .filter(el => el.offsetParent !== null || el === document.activeElement);

    const toggleDrawer = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      drawer.classList.toggle('is-open', open);
      drawer.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('is-locked', open);
      if (open) {
        nav.classList.add('nav--over'), nav.classList.remove('nav--solid');
        lastFocused = document.activeElement;
        const first = focusables(drawer)[0];
        if (first) first.focus();
      } else {
        /* Restore the correct header treatment immediately. Without this,
           closing the drawer on a non-hero page could leave the nav in its
           transparent overlay style until the next scroll event. */
        const solid = !overHero || window.scrollY > (overHero ? Math.max(window.innerHeight * 0.72, 300) : 40);
        nav.classList.toggle('nav--solid', solid);
        nav.classList.toggle('nav--over', !solid && overHero);
        if (lastFocused) {
          lastFocused.focus();
          lastFocused = null;
        }
      }
    };
    drawer.setAttribute('aria-hidden', 'true');
    burger.addEventListener('click', () => toggleDrawer(burger.getAttribute('aria-expanded') !== 'true'));
    $$('.drawer__link, .drawer__foot a', drawer).forEach(a => a.addEventListener('click', () => toggleDrawer(false)));
    document.addEventListener('keydown', (e) => {
      if (!drawer.classList.contains('is-open')) return;
      if (e.key === 'Escape') { toggleDrawer(false); return; }
      if (e.key !== 'Tab') return;
      const items = focusables(drawer);
      if (!items.length) return;
      const firstEl = items[0], lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    });

    /* nav state on scroll -------------------------------------
       Solid background once the visitor scrolls past the hero (or
       almost immediately on pages without one); the bar tucks
       itself away while they scroll down to read, and comes back
       the moment they scroll up to look for it — rather than
       reappearing on every pause, which is what made it feel like
       it never left. */
    let lastY = window.scrollY, hidden = false, ticking = false;
    const threshold = overHero ? Math.max(window.innerHeight * 0.72, 300) : 40;
    const applyScrollState = () => {
      const y = Math.max(0, window.scrollY);
      if (!drawer.classList.contains('is-open')) {
        const solid = y > threshold;
        nav.classList.toggle('nav--solid', solid);
        nav.classList.toggle('nav--over', !solid && overHero);
        const delta = y - lastY;
        if (y < threshold + 60) hidden = false;
        else if (delta > 6) hidden = true;
        else if (delta < -6) hidden = false;
        nav.classList.toggle('nav--hide', hidden);
      }
      lastY = y;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(applyScrollState); }
    }, { passive: true });
    applyScrollState();

    /* footer ------------------------------------------------ */
    const foot = document.createElement('footer');
    foot.className = 'foot';
    const hourLines = RESTAURANT.hours.map(h =>
      `<li>${h.label}${h.time ? ', ' + h.time : ''}</li>`).join('');
    foot.innerHTML = `
      <div class="wrap">
        <div class="foot__top">
          <div>
            <div class="foot__brand">LUCIA</div>
            <div class="foot__tag">${RESTAURANT.taglineCaps}</div>
          </div>
          <div>
            <h4>Find us</h4>
            <ul>
              <li>${RESTAURANT.address[0]}</li>
              <li>${RESTAURANT.address[1]}</li>
              <li><a href="tel:${RESTAURANT.phoneHref}">${RESTAURANT.phone}</a></li>
              <li><a href="mailto:${RESTAURANT.email}">${RESTAURANT.email}</a></li>
            </ul>
          </div>
          <div>
            <h4>Hours</h4>
            <ul>${hourLines}</ul>
            <h4 style="margin-top:26px">Menu</h4>
            <ul>
              <li><a href="menu.html">Read on screen</a></li>
              <li><a href="menu/LUCIA-Menu.pdf" download>Download PDF</a></li>
            </ul>
          </div>
        </div>
        <div class="foot__bottom">
          <span>${MARK('foot__mark')}</span>
          <span>Porto Selva · ${RESTAURANT.cuisine}</span>
          <span>Fictional restaurant · portfolio project</span>
        </div>
      </div>`;
    document.body.appendChild(foot);

    const dis = document.createElement('div');
    dis.className = 'disclaimer';
    dis.innerHTML = `LUCIA is a fictional restaurant created as a portfolio piece. The address, telephone number,
      email, producers and wine labels are invented. Photography is licensed from Pexels — see IMAGE_SOURCES.md.`;
    document.body.appendChild(dis);

    /* cursor ------------------------------------------------ */
    if (FINE_POINTER && !REDUCED) {
      const dot = document.createElement('div');
      dot.className = 'cursor';
      document.body.appendChild(dot);
      let x = 0, y = 0, cx = 0, cy = 0;
      window.addEventListener('mousemove', (e) => {
        x = e.clientX; y = e.clientY;
        dot.classList.add('is-on');
      }, { passive: true });
      const loop = () => {
        cx += (x - cx) * 0.22; cy += (y - cy) * 0.22;
        dot.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
        requestAnimationFrame(loop);
      };
      loop();
      document.addEventListener('mouseover', (e) => {
        const hot = e.target.closest('a, button, input, select, .gal__item, .sig-card');
        dot.classList.toggle('is-hot', !!hot);
      });
      document.addEventListener('mouseleave', () => dot.classList.remove('is-on'));
    }
  }

  /* ---------------------------------------------------------
     3. MOTION — reveals, hero, parallax
     --------------------------------------------------------- */
  function initReveals() {
    const targets = $$('.rv, .mask, .dish');
    if (REDUCED || !('IntersectionObserver' in window)) {
      targets.forEach(t => t.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(t => io.observe(t));
  }

  /** Stagger dish rows within a course so they arrive one by one. */
  function staggerDishes() {
    $$('.dishes').forEach((list) => {
      $$('.dish', list).forEach((d, i) => {
        d.style.transitionDelay = `${Math.min(i, 9) * 0.055}s`;
      });
    });
  }

  function initHero() {
    const hero = $('.hero');
    if (!hero) return;
    const title = $('.hero__title', hero);
    if (title && !REDUCED) {
      const word = title.textContent.trim();
      title.innerHTML = word.split('').map((c, i) =>
        `<span class="ch" style="animation-delay:${0.72 + i * 0.075}s">${c}</span>`).join('');
    }
    requestAnimationFrame(() => hero.classList.add('is-in'));
  }

  function initParallax() {
    if (REDUCED) return;
    const layers = $$('[data-px]');
    if (!layers.length) return;
    let ticking = false;
    const run = () => {
      const vh = window.innerHeight;
      layers.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const amount = parseFloat(el.dataset.px) || 0.12;
        const centre = r.top + r.height / 2 - vh / 2;
        const img = el.querySelector('img');
        if (img) img.style.transform = `translate3d(0, ${(-centre * amount).toFixed(2)}px, 0) scale(1.14)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(run); }
    }, { passive: true });
    window.addEventListener('resize', run, { passive: true });
    run();
  }

  /* ---------------------------------------------------------
     3b. HOMEPAGE SIGNATURE DISHES
     Renders straight from MENU (via LUCIA_FACTS.featuredDishes —
     any item with featured: true) rather than a second, hand-typed
     copy. Change a name, price or photo in data.js and this grid
     follows on its own.
     --------------------------------------------------------- */
  function renderSignatures(root) {
    const dishes = LUCIA_FACTS.featuredDishes;
    root.innerHTML = dishes.map((it, i) => `
      <a class="sig-card rv" href="menu.html#${it.courseId}" data-d="${i + 1}">
        <figure class="mask fig fig--4x5" data-img="${it.image || ''}" data-sizes="(min-width:1100px) 24vw, (min-width:700px) 45vw, 90vw"></figure>
        <span class="sig-card__shade"></span>
        <span class="sig-card__body">
          <span class="sig-card__name">${it.name}</span>
          <span class="sig-card__desc">${it.description}</span>
          <span class="sig-card__more">${euro(it.price)} € — on the menu</span>
        </span>
      </a>`).join('');
  }

  /* ---------------------------------------------------------
     4. MENU PAGE
     --------------------------------------------------------- */
  function tagsHTML(list) {
    if (!list || !list.length) return '';
    return `<div class="dish__tags">${list.map(t =>
      `<span class="tag${t === 'SP' ? ' tag--sp' : ''}" title="${(DIETARY_LEGEND.find(d => d.key === t) || {}).label || t}">${t}</span>`
    ).join('')}</div>`;
  }

  function dishHTML(item, courseId, index) {
    const clickable = item.featured || item.ingredients;
    const tag = clickable ? 'button' : 'div';
    const attrs = clickable
      ? ` type="button" class="dish dish--clickable" data-dish="${courseId}:${index}" aria-haspopup="dialog"`
      : ' class="dish"';
    return `<${tag}${attrs} data-diet="${(item.dietary || []).join(' ')}">
      <span class="dish__name">${item.name}</span>
      <span class="dish__price">${euro(item.price)}</span>
      ${item.description ? `<span class="dish__desc">${item.description}</span>` : ''}
      ${tagsHTML(item.dietary)}
    </${tag}>`;
  }

  function renderMenu(root) {
    /* sticky category navigation */
    const nav = document.createElement('div');
    nav.className = 'catnav';
    nav.innerHTML = `
      <div class="catnav__row">
        ${MENU.map(c => `<a class="catnav__btn" href="#${c.id}" data-cat="${c.id}">${c.title}</a>`).join('')}
        <a class="catnav__btn" href="wine.html">Wine</a>
        <div class="catnav__tools">
          ${DIETARY_LEGEND.filter(d => d.key !== 'SP').map(d =>
            `<button class="filter" type="button" data-filter="${d.key}" aria-pressed="false">${d.label}</button>`).join('')}
        </div>
      </div>
      <div class="mfilters">
        ${DIETARY_LEGEND.filter(d => d.key !== 'SP').map(d =>
          `<button class="filter" type="button" data-filter="${d.key}" aria-pressed="false">${d.label}</button>`).join('')}
      </div>`;
    root.before(nav);

    /* courses */
    root.innerHTML = MENU.map((course) => {
      const feat = course.items.filter(i => i.featured);
      const rest = course.items.filter(i => !i.featured);
      /* split so a signature dish sits mid-course, editorially */
      const cut = rest.length > 5 ? Math.ceil(rest.length / 2) : rest.length;
      const partA = rest.slice(0, cut);
      const partB = rest.slice(cut);

      return `
      <section class="course" id="${course.id}" aria-labelledby="h-${course.id}">
        <div class="wrap wrap--narrow">
          <header class="course__head rv">
            <span class="label label--brass">${course.kicker || ''}</span>
            <h2 class="course__title" id="h-${course.id}">${course.title}</h2>
            ${course.intro ? `<p class="course__intro">${course.intro}</p>` : ''}
            ${course.note ? `<p class="course__note">${course.note}</p>` : ''}
          </header>
        </div>

        ${course.opener ? `
        <div class="wrap">
          <figure class="course__opener mask mask--curtain fig fig--16x9 px" data-px="0.06">
            ${pictureHTML(course.opener, { sizes: '100vw' })}
          </figure>
        </div>` : ''}

        <div class="wrap wrap--narrow">
          <div class="dishes${partA.length > 5 ? ' dishes--two' : ''}">
            ${partA.map((it, i) => dishHTML(it, course.id, course.items.indexOf(it))).join('')}
          </div>
        </div>

        ${feat.map((it, k) => `
        <div class="wrap wrap--narrow">
          <article class="feature${k % 2 ? ' feature--flip' : ''} rv" data-menu-item data-diet="${(it.dietary || []).join(' ')}">
            <figure class="feature__media mask fig fig--4x5">
              ${pictureHTML(it.image || course.opener, { sizes: '(min-width:900px) 52vw, 100vw' })}
              <figcaption class="feature__badge">Signature</figcaption>
            </figure>
            <div>
              <span class="label label--brass">${course.title}</span>
              <h3 class="feature__name">${it.name}</h3>
              <p class="feature__desc">${it.description}</p>
              ${it.note ? `<p class="feature__note">${it.note}</p>` : ''}
              <div class="feature__foot">
                <span class="feature__price">${euro(it.price)}&nbsp;<span style="font-size:0.6em">€</span></span>
                ${tagsHTML(it.dietary)}
                <button class="btn btn--ghost" type="button" data-dish="${course.id}:${course.items.indexOf(it)}" aria-haspopup="dialog">
                  Ingredients<i class="btn__arrow"></i>
                </button>
              </div>
            </div>
          </article>
        </div>`).join('')}

        ${partB.length ? `
        <div class="wrap wrap--narrow">
          <div class="dishes${partB.length > 5 ? ' dishes--two' : ''}">
            ${partB.map(it => dishHTML(it, course.id, course.items.indexOf(it))).join('')}
          </div>
        </div>` : ''}
      </section>`;
    }).join('');

    /* legend + note */
    const tail = document.createElement('div');
    tail.className = 'wrap wrap--narrow section--tight';
    tail.innerHTML = `
      <div class="legend rv">
        ${DIETARY_LEGEND.map(d => `<span><b>${d.key}</b>${d.label}</span>`).join('')}
      </div>
      <p class="menu-foot-note rv" style="margin-top:26px">
        Prices in euro, service included. Please tell us about allergies when you sit down — almost everything
        can be adjusted, and we would rather know before the fire than after it. A discretionary charge is
        never added to your bill.
      </p>
      <div class="rv" style="margin-top:34px;display:flex;gap:12px;flex-wrap:wrap">
        <a class="btn btn--ink" href="menu/LUCIA-Menu.pdf" download>Download menu (PDF)<i class="btn__arrow"></i></a>
        <a class="btn btn--ghost" href="wine.html">Wine list<i class="btn__arrow"></i></a>
      </div>`;
    const empty = document.createElement('div');
    empty.id = 'menu-filter-empty';
    empty.className = 'wrap wrap--narrow menu-filter-empty';
    empty.hidden = true;
    empty.setAttribute('role', 'status');
    empty.innerHTML = '<p>No dishes match all selected dietary filters. Try removing one of the filters.</p>';
    root.appendChild(empty);
    root.appendChild(tail);

    initCatNav();
    initFilters();
    initDishModal();
  }

  function initCatNav() {
    const btns = $$('.catnav__btn[data-cat]');
    const sections = MENU.map(c => document.getElementById(c.id)).filter(Boolean);
    const row = $('.catnav__row');

    const setActive = (id) => {
      btns.forEach((b) => {
        const on = b.dataset.cat === id;
        b.classList.toggle('is-active', on);
        if (on && row) {
          const r = b.getBoundingClientRect(), rr = row.getBoundingClientRect();
          if (r.left < rr.left + 8 || r.right > rr.right - 8) {
            row.scrollTo({ left: b.offsetLeft - 24, behavior: REDUCED ? 'auto' : 'smooth' });
          }
        }
      });
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        const vis = entries.filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      }, { rootMargin: '-30% 0px -58% 0px' });
      sections.forEach(s => io.observe(s));
    }
    setActive(MENU[0].id);
  }

  function initFilters() {
    const active = new Set();
    const items = () => $$('.dish, [data-menu-item]');
    const apply = () => {
      items().forEach((d) => {
        const diet = (d.dataset.diet || '').split(' ').filter(Boolean);
        const ok = [...active].every(k => diet.includes(k));
        d.classList.toggle('is-hidden', !ok);
      });
      /* Hide a course only when every dish AND signature feature is filtered out. */
      $$('.course').forEach((c) => {
        const any = $$('.dish, [data-menu-item]', c).some(d => !d.classList.contains('is-hidden'));
        c.style.display = any ? '' : 'none';
      });
      const empty = $('#menu-filter-empty');
      if (empty) empty.hidden = $$('.course').some(c => c.style.display !== 'none');
    };
    $$('.filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.filter;
        const on = btn.getAttribute('aria-pressed') === 'true';
        /* keep the desktop + mobile copies of each filter in sync */
        $$(`.filter[data-filter="${k}"]`).forEach(b => b.setAttribute('aria-pressed', String(!on)));
        on ? active.delete(k) : active.add(k);
        apply();
      });
    });
  }

  /* ---------------------------------------------------------
     5. DISH MODAL
     --------------------------------------------------------- */
  let modal, lastFocus;

  function buildModal() {
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modal-name');
    modal.setAttribute('aria-hidden', 'true');
    modal.hidden = false;
    modal.innerHTML = `
      <div class="modal__scrim" data-close></div>
      <div class="modal__panel">
        <button class="modal__close" type="button" data-close aria-label="Close">
          <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"><path d="M1 1l13 13M14 1L1 14" stroke="currentColor" stroke-width="1.2"/></svg>
        </button>
        <figure class="modal__media fig"></figure>
        <div class="modal__body">
          <span class="label label--brass" data-course></span>
          <h2 class="modal__name" id="modal-name"></h2>
          <p class="modal__desc"></p>
          <p class="modal__note"></p>
          <div class="modal__ing">
            <span class="label">Ingredients</span>
            <ul></ul>
          </div>
          <div class="modal__foot">
            <span class="modal__price"></span>
            <span class="dish__tags" data-tags></span>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Tab') trapFocus(e, modal);
    });
  }

  function trapFocus(e, root) {
    const f = $$('a[href], button, input, select, [tabindex]:not([tabindex="-1"])', root)
      .filter(el => !el.disabled && el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  }

  function openModal(courseId, index) {
    const course = MENU.find(c => c.id === courseId);
    if (!course) return;
    const it = course.items[index];
    if (!it) return;

    lastFocus = document.activeElement;
    const fig = $('.modal__media', modal);
    fig.classList.remove('is-fallback');
    fig.innerHTML = pictureHTML(it.image || course.opener, { sizes: '(min-width:860px) 50vw, 100vw', eager: true });
    guardImages(fig);

    $('[data-course]', modal).textContent = course.title;
    $('.modal__name', modal).textContent = it.name;
    $('.modal__desc', modal).textContent = it.description || '';
    const note = $('.modal__note', modal);
    note.textContent = it.note || '';
    note.style.display = it.note ? '' : 'none';

    const ingWrap = $('.modal__ing', modal);
    const ul = $('ul', ingWrap);
    ul.innerHTML = (it.ingredients || []).map(i => `<li>${i}</li>`).join('');
    ingWrap.style.display = (it.ingredients && it.ingredients.length) ? '' : 'none';

    $('.modal__price', modal).innerHTML = `${euro(it.price)}&nbsp;<span style="font-size:0.58em">€</span>`;
    $('[data-tags]', modal).innerHTML = (it.dietary || []).map(t =>
      `<span class="tag${t === 'SP' ? ' tag--sp' : ''}">${t}</span>`).join('');

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    setTimeout(() => $('.modal__close', modal).focus(), 60);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    if (lastFocus) lastFocus.focus();
  }

  function initDishModal() {
    if (!modal) buildModal();
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-dish]');
      if (!t) return;
      const [id, i] = t.dataset.dish.split(':');
      openModal(id, Number(i));
    });
  }

  /* ---------------------------------------------------------
     6. GALLERY + LIGHTBOX
     --------------------------------------------------------- */
  function initGallery() {
    const gal = $('[data-gallery]');
    if (!gal) return;

    const keys = gal.dataset.gallery.split(',').map(s => s.trim()).filter(Boolean);
    const shapes = ['a', 'b', 'c', 'd', 'e', 'c', 'e', 'a', 'b', 'd', 'c', 'e'];
    gal.className = 'gal';
    gal.innerHTML = keys.map((k, i) => `
      <button class="gal__item gal__item--${shapes[i % shapes.length]} mask rv" type="button"
              data-lb="${i}" data-d="${i % 4}" aria-label="Open photograph: ${imgAlt(k)}">
        ${pictureHTML(k, { sizes: '(min-width:760px) 50vw, 100vw' })}
        <span class="gal__cap">${imgAlt(k).split(',')[0]}</span>
      </button>`).join('');

    /* lightbox */
    const lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Photograph viewer');
    lb.setAttribute('aria-hidden', 'true');
    lb.innerHTML = `
      <div class="lb__scrim" data-close></div>
      <button class="lb__close" type="button" data-close aria-label="Close viewer">
        <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"><path d="M1 1l13 13M14 1L1 14" stroke="currentColor" stroke-width="1.2"/></svg>
      </button>
      <button class="lb__nav lb__prev" type="button" aria-label="Previous photograph">
        <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden="true"><path d="M11 1L2 10l9 9" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>
      </button>
      <figure class="lb__stage"><img alt=""><figcaption class="lb__cap" aria-live="polite"></figcaption></figure>
      <button class="lb__nav lb__next" type="button" aria-label="Next photograph">
        <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden="true"><path d="M1 1l9 9-9 9" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>
      </button>`;
    document.body.appendChild(lb);

    let idx = 0, opener = null;
    const show = (i) => {
      idx = (i + keys.length) % keys.length;
      const k = keys[idx];
      $('.lb__stage img', lb).src = imgSrc(k, 1920);
      $('.lb__stage img', lb).alt = imgAlt(k);
      $('.lb__cap', lb).textContent = `${idx + 1} / ${keys.length} — ${imgAlt(k)}`;
    };
    const open = (i) => {
      opener = document.activeElement;
      show(i);
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      setTimeout(() => $('.lb__close', lb).focus(), 50);
    };
    const close = () => {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      if (opener) opener.focus();
    };

    gal.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lb]');
      if (b) open(Number(b.dataset.lb));
    });
    lb.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) return close();
      if (e.target.closest('.lb__next')) return show(idx + 1);
      if (e.target.closest('.lb__prev')) return show(idx - 1);
    });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'Tab') trapFocus(e, lb);
    });

    /* swipe on touch */
    let sx = null;
    lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 48) show(idx + (dx < 0 ? 1 : -1));
      sx = null;
    }, { passive: true });

    guardImages(gal);
  }

  /* ---------------------------------------------------------
     7. WINE LIST
     --------------------------------------------------------- */
  function renderWine(root) {
    root.innerHTML = WINE.map(group => `
      <section class="wine-sec" id="${group.id}" aria-labelledby="wh-${group.id}">
        <div class="wrap wrap--narrow">
          <header class="rv">
            <h2 class="wine-sec__title" id="wh-${group.id}">${group.title}</h2>
            <p class="wine-sec__intro">${group.intro}</p>
          </header>
          <div class="wlist">
            ${group.wines.map((w, i) => `
              <article class="wine rv" data-d="${Math.min(i, 4)}">
                <button class="wine__btn" type="button" aria-expanded="false" aria-controls="w-${group.id}-${i}">
                  <span class="wine__name">${w.name}</span>
                  <span class="wine__meta">${w.region} · ${w.grape} · ${w.vintage}</span>
                  <span class="wine__prices">
                    <span class="wine__p"><span>Glass</span><b>${euro(w.glass)}</b></span>
                    <span class="wine__p"><span>Bottle</span><b>${euro(w.bottle)}</b></span>
                  </span>
                  <span class="wine__chev" aria-hidden="true"></span>
                </button>
                <div class="wine__panel" id="w-${group.id}-${i}" role="region" aria-hidden="true">
                  <div class="wine__panel-in">
                    <p>${w.note}</p>
                    <div class="wine__spec">
                      <div><span>Producer</span><b>${w.producer}</b></div>
                      <div><span>Region</span><b>${w.region}</b></div>
                      <div><span>Grape</span><b>${w.grape}</b></div>
                      <div><span>Vintage</span><b>${w.vintage}</b></div>
                    </div>
                  </div>
                </div>
              </article>`).join('')}
          </div>
        </div>
      </section>`).join('');

    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.wine__btn');
      if (!btn) return;
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      panel.setAttribute('aria-hidden', String(open));
      panel.style.height = open ? '0px' : panel.firstElementChild.offsetHeight + 'px';
    });
  }

  /* ---------------------------------------------------------
     8. RESERVATION DEMO
     ------------------------------------------------------------
     Reads every rule (closed days, bookable times, party-size cap,
     hold time) from RESTAURANT.reservation in data.js rather than
     encoding any of it here, so the form can never drift from what
     the rest of the site says. This is a static-portfolio demo —
     nothing is ever actually sent — and the copy says so plainly
     rather than implying a real booking was made.
     --------------------------------------------------------- */
  function initReservation() {
    const form = $('#reserve-form');
    if (!form) return;
    const RES = RESTAURANT.reservation;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const isClosedDay = (d) => RES.closedWeekdays.includes(d.getDay());
    const toISO = (d) => {
      const off = d.getTimezoneOffset();
      return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
    };

    /* policy line — held-for and large-party copy, from data */
    const policy = $('#reserve-policy');
    if (policy) {
      policy.textContent = `Tables are held for ${RES.holdMinutes} minutes. ${RES.largePartyNote}`;
    }

    /* time options — generated from data, not typed twice */
    const timeSelect = $('#r-time', form);
    timeSelect.innerHTML = `
      <optgroup label="Lunch">${RES.lunchTimes.map(t =>
        `<option${t === RES.defaultTime ? ' selected' : ''}>${t}</option>`).join('')}</optgroup>
      <optgroup label="Dinner">${RES.dinnerTimes.map(t =>
        `<option${t === RES.defaultTime ? ' selected' : ''}>${t}</option>`).join('')}</optgroup>`;
    if (!RES.lunchTimes.concat(RES.dinnerTimes).includes(RES.defaultTime)) {
      timeSelect.options[0].selected = true;
    }

    /* default date: the next open day, never a closed one */
    const today = new Date();
    let d = new Date(today);
    d.setDate(d.getDate() + 1);
    while (isClosedDay(d)) d.setDate(d.getDate() + 1);
    const defaultISO = toISO(d);
    const dateInput = $('#r-date', form);
    dateInput.min = toISO(today);
    dateInput.value = defaultISO;
    const dateError = $('#r-date-error', form);

    const validateDate = () => {
      if (!dateInput.value) {
        setError(dateInput, dateError, 'Pick a date.');
        return false;
      }
      const chosen = new Date(dateInput.value + 'T00:00:00');
      if (isClosedDay(chosen)) {
        setError(dateInput, dateError, `We're closed on ${dayNames[chosen.getDay()]}s — choose another date.`);
        return false;
      }
      if (toISO(chosen) < toISO(today)) {
        setError(dateInput, dateError, 'Pick a date from today onward.');
        return false;
      }
      clearError(dateInput, dateError);
      return true;
    };
    dateInput.addEventListener('change', validateDate);

    /* Bespoke date + time pickers: keep native form values underneath,
       but present controls that belong to LUCIA rather than browser chrome. */
    const dateBtn = $('#r-date-button', form);
    const dateDisplay = $('#r-date-display', form);
    const calendar = $('#r-calendar', form);
    const timeBtn = $('#r-time-button', form);
    const timeDisplay = $('#r-time-display', form);
    const timePopover = $('#r-time-popover', form);
    const prettyDate = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'long' });
    const closePickers = () => {
      calendar.hidden = true; timePopover.hidden = true;
      dateBtn.setAttribute('aria-expanded','false'); timeBtn.setAttribute('aria-expanded','false');
    };
    dateDisplay.textContent = prettyDate(dateInput.value);
    timeDisplay.textContent = timeSelect.value;

    let viewMonth = new Date(dateInput.value + 'T00:00:00');
    viewMonth.setDate(1);
    const renderCalendar = () => {
      const y=viewMonth.getFullYear(), m=viewMonth.getMonth();
      const first=new Date(y,m,1), last=new Date(y,m+1,0);
      const cells=[];
      for(let i=0;i<first.getDay();i++) cells.push('<span></span>');
      for(let day=1;day<=last.getDate();day++){
        const dt=new Date(y,m,day), iso=toISO(dt);
        const disabled=iso<toISO(today)||isClosedDay(dt);
        const cls=['cal__day',iso===dateInput.value?'is-selected':'',iso===toISO(today)?'is-today':''].filter(Boolean).join(' ');
        cells.push(`<button type="button" class="${cls}" data-date="${iso}" ${disabled?'disabled':''}>${day}</button>`);
      }
      calendar.innerHTML=`<div class="cal__head"><button type="button" class="cal__nav" data-cal-prev aria-label="Previous month">←</button><strong class="cal__title">${viewMonth.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</strong><button type="button" class="cal__nav" data-cal-next aria-label="Next month">→</button></div><div class="cal__grid">${['Su','Mo','Tu','We','Th','Fr','Sa'].map(x=>`<span class="cal__dow">${x}</span>`).join('')}${cells.join('')}</div>`;
    };
    renderCalendar();
    dateBtn.addEventListener('click',()=>{ const open=calendar.hidden; closePickers(); calendar.hidden=!open; dateBtn.setAttribute('aria-expanded',String(open)); if(open) renderCalendar(); });
    calendar.addEventListener('click',e=>{
      if(e.target.closest('[data-cal-prev]')){ viewMonth.setMonth(viewMonth.getMonth()-1); renderCalendar(); return; }
      if(e.target.closest('[data-cal-next]')){ viewMonth.setMonth(viewMonth.getMonth()+1); renderCalendar(); return; }
      const day=e.target.closest('[data-date]'); if(!day)return; dateInput.value=day.dataset.date; dateDisplay.textContent=prettyDate(dateInput.value); validateDate(); closePickers();
    });
    const renderTimes=()=>{
      const group=(label,times)=>`<div class="time-group"><span class="time-group__label">${label}</span><div class="time-grid">${times.map(t=>`<button type="button" class="time-option ${t===timeSelect.value?'is-selected':''}" data-time="${t}">${t}</button>`).join('')}</div></div>`;
      timePopover.innerHTML=group('Lunch',RES.lunchTimes)+group('Dinner',RES.dinnerTimes);
    };
    renderTimes();
    timeBtn.addEventListener('click',()=>{ const open=timePopover.hidden; closePickers(); timePopover.hidden=!open; timeBtn.setAttribute('aria-expanded',String(open)); if(open)renderTimes(); });
    timePopover.addEventListener('click',e=>{ const opt=e.target.closest('[data-time]'); if(!opt)return; timeSelect.value=opt.dataset.time; timeDisplay.textContent=timeSelect.value; timeSelect.dispatchEvent(new Event('change')); closePickers(); });
    document.addEventListener('click',e=>{ if(!e.target.closest('.field') && !e.target.closest('.booking-popover')) closePickers(); });

    /* guests: real chips 1..max, plus a distinct "large party" chip
       that does not submit as a normal value — it hands the visitor
       to email/phone instead, per the site's own stated policy. */
    const chips = $('#r-guests-chips', form);
    const guestsInput = $('#r-guests', form);
    const guestsNote = $('#r-guests-note', form);
    const submitBtn = $('#reserve-submit', form);
    const values = [];
    for (let n = 1; n <= RES.maxPartySize; n++) values.push(n);
    const largeLabel = (RES.maxPartySize + 1) + '+';
    chips.innerHTML = values.map(n =>
      `<button class="chip" type="button" data-g="${n}" aria-pressed="${n === 2}">${n}</button>`
    ).join('') + `<button class="chip" type="button" data-g="large" aria-pressed="false">${largeLabel}</button>`;

    const setLargeParty = (on) => {
      submitBtn.disabled = on;
      submitBtn.setAttribute('aria-disabled', String(on));
      guestsNote.style.display = on ? '' : 'none';
      guestsNote.textContent = on
        ? `${RES.largePartyNote} Call ${RESTAURANT.phone} or email ${RESTAURANT.email}.`
        : '';
    };
    chips.addEventListener('click', (e) => {
      const b = e.target.closest('[data-g]');
      if (!b) return;
      $$('.chip', chips).forEach(c => c.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      const g = b.dataset.g;
      if (g === 'large') {
        guestsInput.value = '';
        setLargeParty(true);
      } else {
        guestsInput.value = g;
        setLargeParty(false);
      }
    });

    /* generic field helpers */
    function setError(input, errorEl, message) {
      input.setAttribute('aria-invalid', 'true');
      if (errorEl) errorEl.textContent = message;
    }
    function clearError(input, errorEl) {
      input.removeAttribute('aria-invalid');
      if (errorEl) errorEl.textContent = '';
    }
    function validateRequired(input, errorEl, message) {
      if (!input.value.trim()) { setError(input, errorEl, message); return false; }
      clearError(input, errorEl);
      return true;
    }
    function validateEmail(input, errorEl) {
      if (!input.value.trim()) { setError(input, errorEl, 'Enter an email address.'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) {
        setError(input, errorEl, 'That email address doesn\u2019t look complete.');
        return false;
      }
      clearError(input, errorEl);
      return true;
    }

    const nameInput = $('#r-name', form);
    const emailInput = $('#r-email', form);

    /* Clear stale errors as soon as the visitor fixes a field. */
    nameInput.addEventListener('input', () => {
      if (nameInput.value.trim()) clearError(nameInput, $('#r-name-error', form));
    });
    emailInput.addEventListener('input', () => {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
        clearError(emailInput, $('#r-email-error', form));
      }
    });
    timeSelect.addEventListener('change', () => {
      if (timeSelect.value) clearError(timeSelect, $('#r-time-error', form));
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (guestsInput.value === '') {
        /* large party selected: form isn't submittable this way */
        setLargeParty(true);
        const largeChip = $('.chip[data-g="large"]', chips);
        if (largeChip) largeChip.focus();
        return;
      }

      const okDate = validateDate();
      let okTime = true;
      if (!timeSelect.value) {
        setError(timeSelect, $('#r-time-error', form), 'Pick a time.');
        okTime = false;
      } else {
        clearError(timeSelect, $('#r-time-error', form));
      }
      const okName = validateRequired(nameInput, $('#r-name-error', form), 'Tell us who the table is for.');
      const okEmail = validateEmail(emailInput, $('#r-email-error', form));

      if (!(okDate && okTime && okName && okEmail)) {
        const firstInvalid = $('[aria-invalid="true"]', form);
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const data = new FormData(form);
      const panel = $('#reserve-confirm');
      const fmt = new Date(data.get('date') + 'T00:00:00')
        .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
      const guests = data.get('guests');

      $('#c-name', panel).textContent = data.get('name');
      $('#c-when', panel).textContent = `${fmt}, ${data.get('time')}`;
      $('#c-guests', panel).textContent = guests + (guests === '1' ? ' guest' : ' guests');
      $('#c-contact', panel).textContent = data.get('email');

      form.style.display = 'none';
      panel.classList.add('is-on');
      panel.setAttribute('tabindex', '-1');
      panel.focus();
      panel.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
    });

    $('#reserve-again').addEventListener('click', () => {
      $('#reserve-confirm').classList.remove('is-on');
      form.style.display = '';
      form.reset();
      dateInput.value = defaultISO;
      timeSelect.value = RES.lunchTimes.concat(RES.dinnerTimes).includes(RES.defaultTime)
        ? RES.defaultTime
        : timeSelect.options[0].value;
      dateDisplay.textContent = prettyDate(dateInput.value);
      timeDisplay.textContent = timeSelect.value;
      viewMonth = new Date(dateInput.value + 'T00:00:00'); viewMonth.setDate(1); renderCalendar(); renderTimes();
      guestsInput.value = '2';
      setLargeParty(false);
      $$('.chip', chips).forEach(c => c.setAttribute('aria-pressed', c.dataset.g === '2' ? 'true' : 'false'));
      $$('.field-error', form).forEach(e => { e.textContent = ''; });
      $$('[aria-invalid]', form).forEach(el => el.removeAttribute('aria-invalid'));
      form.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
    });
  }

  /* ---------------------------------------------------------
     9b. DERIVED COUNTS
     Fills any element that wants to say how big the menu or wine
     list is, straight from LUCIA_FACTS — see data.js. Nothing here
     is typed as a literal number, so it can't go stale the way
     the old hard-coded marquee text once did.
     --------------------------------------------------------- */
  function applyFacts() {
    const F = LUCIA_FACTS;
    const menuCounts = $('#menu-counts');
    if (menuCounts) {
      menuCounts.textContent =
        `${capitalize(wordNum(F.courseCount))} courses \u00b7 ${capitalize(wordNum(F.dishCount))} dishes`;
    }
    $$('#wine-count-word, #home-wine-count').forEach((el) => {
      el.textContent = capitalize(wordNum(F.wineCount));
    });
  }

  /* ---------------------------------------------------------
     9. DECLARATIVE IMAGE SLOTS
     Any element with data-img="key" gets the photograph.
     --------------------------------------------------------- */
  function fillImageSlots(root = document) {
    $$('[data-img]', root).forEach((el) => {
      const key = el.dataset.img;
      if (!key) return;
      const eager = el.hasAttribute('data-eager');
      el.insertAdjacentHTML('afterbegin', pictureHTML(key, {
        eager,
        sizes: el.dataset.sizes || '100vw',
        w: eager ? 1920 : 1400
      }));
      if (!el.getAttribute('data-fallback')) el.setAttribute('data-fallback', 'Lucia');
    });
  }

  /* ---------------------------------------------------------
     10. BOOT
     --------------------------------------------------------- */
  function boot() {
    buildChrome();

    const sigGrid = $('#sig-grid');
    if (sigGrid) renderSignatures(sigGrid);

    fillImageSlots();
    applyFacts();

    const menuRoot = $('#menu-root');
    if (menuRoot) renderMenu(menuRoot);

    const wineRoot = $('#wine-root');
    if (wineRoot) renderWine(wineRoot);

    initGallery();
    initReservation();

    guardImages();
    staggerDishes();
    initHero();
    initReveals();
    initParallax();

    /* anchor offset for in-page links */
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href').slice(1);
        const t = id && document.getElementById(id);
        if (!t) return;
        e.preventDefault();
        const top = t.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) + 56);
        window.scrollTo({ top, behavior: REDUCED ? 'auto' : 'smooth' });
        history.replaceState(null, '', '#' + id);
      });
    });

    /* deep links (menu.html#desserts, visit.html#reserve, …): the
       target section is built by renderMenu()/renderWine() after
       this script runs, so the browser's own attempt to jump to the
       URL hash on load happens before the element exists and does
       nothing. Do it ourselves once rendering has settled, and
       again after the load event in case webfonts or images shift
       the layout in the meantime. */
    const scrollToHash = () => {
      if (!location.hash) return;
      const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (!t) return;
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
      const top = t.getBoundingClientRect().top + window.scrollY - (navH + 56);
      window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    };
    requestAnimationFrame(() => requestAnimationFrame(scrollToHash));
    window.addEventListener('load', scrollToHash, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
