// content.js – GMaps Leads Scraper (rev-26, Ariadne Agent 1 GPS + Anti-Stale-DOM)
//  • mantiene todo lo que ya funcionaba (título, scroll, logs etc.)
//  • agrega pausa "humana" de 3-10 s entre tarjetas
//  • la señal stopScraping detiene ambos bucles de inmediato y se resetea al iniciar
//  • espera cambio real de h1 para evitar falsos duplicados (Stale DOM)
//  • micro-scroll en panel de detalle para cargar reseñas reales de Google Maps
//  • soporta scrapeCurrentView y modo autónomo GPS de Agente 1

(() => {
  /* ───── helpers básicos ───── */
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const rwait = () => delay(rand(400, 800));

  const log = (m, l = 'info') => {
    const C = { info: '#3498db', warn: '#f39c12', error: '#e74c3c', success: '#2ecc71' }[l] || '#3498db';
    console.log(`%c[scraper] ${m}`, `color:${C};font-weight:bold`);
    try {
      chrome.runtime.sendMessage({ type: 'scraper-log', level: l, message: m }, () => {
        if (chrome.runtime.lastError) {}
      });
    } catch (e) {}
  };

  async function waitFor(fn, timeout = 15000, poll = 200) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (fn()) return true;
      await delay(poll);
    }
    throw new Error('Timeout');
  }
  const waitForSel = (s, t = 15000) => waitFor(() => document.querySelector(s), t).then(() => document.querySelector(s));
  const isVisible = el => {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (!style || style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const xp = (path, ctx = document) =>
    document.evaluate(path, ctx, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

  // Función mejorada para esperar un elemento usando CSS o XPath
  async function waitForInput(timeout = 20000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const cssSelectors = [
        '#searchboxinput',
        'form#searchboxform input',
        'form[role="search"] input',
        'input[aria-label="Buscar en Google Maps"]',
        'input[aria-label="Search Google Maps"]',
        'input[aria-label*="Google Maps"]',
        'input[aria-label*="Buscar"]',
        'input[aria-label*="Search"]',
        'input[placeholder*="Buscar"]',
        'input[placeholder*="Search"]',
        'input[type="search"]',
        'input[role="combobox"]',
        'input.gLFyf'
      ];
      for (const sel of cssSelectors) {
        const el = document.querySelector(sel);
        if (isVisible(el)) {
          return el;
        }
      }

      const xpathSelectors = [
        '/html/body/div[1]/div[2]/div[9]/div[3]/div[1]/div[1]/div/div[2]/form/input',
        '//*[@id="searchboxinput"]',
        '//form[@id="searchboxform"]//input',
        '//form[@role="search"]//input',
        '//*[@role="search"]//input',
        '//input[@type="text" and contains(@aria-label, "Buscar")]',
        '//input[@type="text" and contains(@aria-label, "Search")]',
        '//input[contains(@placeholder, "Buscar")]',
        '//input[contains(@placeholder, "Search")]',
        '//input[@type="search"]',
        '//form//input[1]'
      ];
      for (const xpath of xpathSelectors) {
        try {
          const el = xp(xpath);
          if (isVisible(el)) {
            return el;
          }
        } catch (e) {}
      }

      await delay(200);
    }
    throw new Error('Timeout: No se pudo encontrar el input de búsqueda');
  }

  /* ───── notificación de finalización ───── */
  function notifyScrapingDone() {
    try {
      const mensaje = 'Federico, se ha completado el scrapping, vení.';
      const utt = new SpeechSynthesisUtterance(mensaje);
      utt.lang = 'es-ES';
      const elegirVoz = () => {
        const voces = speechSynthesis.getVoices();
        if (!voces.length) return;
        const femenina = voces.find(v => v.lang.startsWith('es') && /female|mujer/i.test(v.name)) ||
          voces.find(v => v.lang.startsWith('es'));
        if (femenina) utt.voice = femenina;
        speechSynthesis.speak(utt);
      };
      if (!speechSynthesis.getVoices().length) {
        speechSynthesis.onvoiceschanged = elegirVoz;
      } else {
        elegirVoz();
      }
    } catch (e) {
      try {
        const beep = new Audio(chrome.runtime.getURL('notification.mp3'));
        beep.play();
      } catch {}
    }
  }

  /* ───── filtro de duplicados ───── */
  const sentLeads = new Set();
  const getLeadKey = lead => `${lead.name}|${lead.phone}|${lead.address}`.toLowerCase().trim();

  const isDuplicate = lead => {
    const key = getLeadKey(lead);
    if (sentLeads.has(key)) {
      log(`⏭️ Lead duplicado en sesión: ${lead.name}`, 'warn');
      return true;
    }
    sentLeads.add(key);
    return false;
  };

  /* ───── selectores robustos ───── */
  const TITLE_CSS = [
    '[data-attrid="title"] h1',
    'h1.fontHeadlineLarge',
    'h1.DUwDvf',
    '[role="main"] h1:not(.gLFyf)'
  ];
  const TITLE_XP = [
    '//h1[@data-attrid="title"]',
    '//h1[contains(@class,"fontHeadlineLarge") or contains(@class,"DUwDvf")]',
    '//div[@role="main"]//h1'
  ];
  const PHONE_CSS = ['a[href^="tel:"]', 'button[data-item-id*="phone"]'];
  const PHONE_XP = [
    '//button[contains(@data-item-id,"phone")]/div/div[2]/div[1]',
    '//a[starts-with(@href,"tel:")]'
  ];
  const ADDR_CSS = ['button[data-item-id="address"]', 'button[data-item-id="address"] .Io6YTe'];
  const ADDR_XP = ['//button[@data-item-id="address"]/div/div[2]/div[1]'];
  const WEB_CSS = ['a[data-item-id="authority"]'];
  const WEB_XP = ['//a[@data-item-id="authority"]'];
  const CAT_CSS = ['button.DkEaL', 'button[jsaction*="category"]'];
  const CAT_XP = ['//button[contains(@class, "DkEaL")]'];

  function readCurrentTitleText() {
    for (const s of TITLE_CSS) {
      const el = document.querySelector(s);
      if (el?.innerText?.trim()) return el.innerText.trim();
    }
    for (const p of TITLE_XP) {
      const el = xp(p);
      if (el?.textContent?.trim()) return el.textContent.trim();
    }
    return '';
  }

  async function getUpdatedTitleText(prevTitle, expectedLabel, timeout = 8000) {
    const t0 = Date.now();
    const normExpected = (expectedLabel || '').toLowerCase().trim();
    const normPrev = (prevTitle || '').toLowerCase().trim();

    while (Date.now() - t0 < timeout) {
      const cur = readCurrentTitleText();
      if (cur) {
        const normCur = cur.toLowerCase().trim();
        // Si coincide con el aria-label de la tarjeta clickeada, es el título nuevo
        if (normExpected && (normCur === normExpected || normCur.includes(normExpected) || normExpected.includes(normCur))) {
          return cur;
        }
        // Si cambió respecto al título anterior del panel, ya se actualizó el DOM
        if (!normPrev || normCur !== normPrev) {
          return cur;
        }
        // Si pasaron más de 4.2s y el título sigue igual (caso raro de 2 sucursales seguidas con igual nombre), aceptarlo
        if (Date.now() - t0 > 4200) {
          return cur;
        }
      }
      await delay(200);
    }
    const fallback = readCurrentTitleText();
    if (fallback) return fallback;
    throw new Error('Título no cargado');
  }

  /* ───── control de parada ───── */
  let stopRequested = false;
  const checkStop = () => stopRequested;

  /* ───── feed y tarjetas ───── */
  const FEED_SELECTORS = [
    '[role="feed"]',
    'div[role="feed"]',
    'div[role="region"][aria-label*="Resultados"]',
    'div[role="region"][aria-label*="Results"]'
  ];
  const getFeed = () => {
    for (const sel of FEED_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  };
  const waitForFeed = (t = 15000) => waitFor(() => getFeed(), t).then(() => getFeed());
  const cardsList = () => {
    const nodes = [
      ...document.querySelectorAll('[role="feed"] [role="article"]'),
      ...document.querySelectorAll('a.hfpxzc[href*="/maps/place/"]')
    ];
    return Array.from(new Set(nodes));
  };

  async function scrollFeed() {
    const feed = await waitForFeed(20000);
    let scrollCount = 0;
    const maxScrolls = 45;
    let lastScrollHeight = 0;
    let lastCardsCount = 0;
    let unchangedCount = 0;

    log('📜 Iniciando scroll inteligente del feed...', 'info');

    const END_TEXT_CSS = [
      'p.fontBodyMedium span.HlvSq',
      'p.fontBodyMedium span span',
      'p.fontBodyMedium'
    ];
    const END_TEXT_XP = [
      '//p[@class="fontBodyMedium"]//span[contains(text(),"Has llegado al final de la lista")]',
      '//span[contains(@class,"HlvSq") and contains(text(),"Has llegado al final de la lista")]',
      '//p[contains(@class,"fontBodyMedium")]//span[contains(text(),"final de la lista")]'
    ];

    const checkEndReached = () => {
      const endTexts = ['Has llegado al final de la lista', "You've reached the end of the list", 'No hay más resultados'];
      for (const selector of END_TEXT_CSS) {
        const el = document.querySelector(selector);
        if (el?.textContent && endTexts.some(t => el.textContent.includes(t))) {
          return true;
        }
      }
      for (const xpath of END_TEXT_XP) {
        const el = xp(xpath);
        if (el?.textContent && endTexts.some(t => el.textContent.includes(t))) {
          return true;
        }
      }
      return false;
    };

    while (scrollCount < maxScrolls && !checkStop()) {
      feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
      scrollCount++;

      await delay(rand(1800, 3000));
      if (checkStop()) break;

      if (checkEndReached()) {
        log(`🏁 Scroll ${scrollCount}: ¡Llegamos al final de la lista!`, 'success');
        break;
      }

      const currentHeight = feed.scrollHeight;
      const currentCards = cardsList().length;

      if (currentHeight === lastScrollHeight && currentCards === lastCardsCount) {
        unchangedCount++;
        if (unchangedCount >= 3) {
          log(`🏁 Scroll ${scrollCount}: Sin nuevos resultados tras 3 intentos (${currentCards} tarjetas).`, 'success');
          break;
        }
      } else {
        unchangedCount = 0;
        lastScrollHeight = currentHeight;
        lastCardsCount = currentCards;
      }

      log(`📈 Scroll ${scrollCount}: ${currentCards} tarjetas cargadas...`, 'info');
    }

    const totalCards = cardsList().length;
    log(`✅ Feed listo - ${totalCards} tarjetas encontradas`, 'success');
  }

  /* ───── búsqueda ───── */
  const setInputValue = (input, value) => {
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (desc?.set) {
      desc.set.call(input, value);
    } else {
      input.value = value;
    }
  };

  async function doSearch(q) {
    try {
      log(`🔍 Buscando: "${q}"`, 'info');
      const input = await waitForInput(25000);
      if (!input) throw new Error('Input no encontrado');

      input.focus();
      input.click();
      setInputValue(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      await delay(200);

      setInputValue(input, q);
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      await delay(500);

      ['keydown', 'keyup', 'keypress'].forEach(e =>
        input.dispatchEvent(new KeyboardEvent(e, { key: 'Enter', keyCode: 13, bubbles: true, cancelable: true }))
      );
      await delay(300);

      const buttonSelectors = [
        '#searchbox-searchbutton',
        'button[aria-label*="Buscar"]',
        'button[aria-label*="Search"]',
        'button[type="submit"]',
        'button[jsaction*="search"]'
      ];

      let buttonClicked = false;
      for (const sel of buttonSelectors) {
        const btn = document.querySelector(sel);
        if (isVisible(btn)) {
          btn.click();
          buttonClicked = true;
          break;
        }
      }

      if (!buttonClicked) {
        const form = input.closest('form');
        if (form?.requestSubmit) {
          form.requestSubmit();
          buttonClicked = true;
        } else if (form) {
          form.submit();
          buttonClicked = true;
        }
      }

      log(`🔎 Búsqueda enviada → ${q}`, 'success');
      await delay(2000);
    } catch (error) {
      log(`❌ Error en doSearch: ${error.message}`, 'error');
      throw error;
    }
  }

  /* ───── utilidades de extracción ───── */
  const getText = (css, xpArr, scope) => {
    for (const s of css) { const el = scope.querySelector(s); if (el?.innerText?.trim()) return el.innerText.trim(); }
    for (const p of xpArr) { const el = xp(p, scope); if (el?.textContent?.trim()) return el.textContent.trim(); }
    return '';
  };
  const getHref = (css, xpArr, scope) => {
    for (const s of css) { const el = scope.querySelector(s); if (el?.href) return el.href; }
    for (const p of xpArr) { const el = xp(p, scope); if (el?.href) return el.href; }
    return '';
  };

  /* ───── abrir tarjeta y sacar datos ───── */
  async function openAndExtract(card, kw, loc, zoneMeta = {}, tries = 3) {
    for (let at = 0; at < tries; at++) {
      if (checkStop()) return null;
      try {
        const prevTitle = readCurrentTitleText();
        const anchor = card.querySelector('a[href*="/maps/place/"]') || card;
        const expectedLabel = (
          card.getAttribute('aria-label') ||
          anchor.getAttribute('aria-label') ||
          card.querySelector('.qBF1Pd, .fontHeadlineSmall')?.textContent ||
          ''
        ).trim();

        anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await rwait();
        anchor.click();

        await waitForSel('[role="main"]', 15000);
        const titleText = await getUpdatedTitleText(prevTitle, expectedLabel, 8000);
        // Pausa breve para asegurar que teléfono, web y dirección del nuevo panel hayan renderizado
        await delay(450);

        const main = document.querySelector('[role="main"]');
        if (!main) throw new Error('Panel principal no disponible');

        const lead = {
          name: titleText,
          phone: getText(PHONE_CSS, PHONE_XP, main),
          address: getText(ADDR_CSS, ADDR_XP, main),
          website: getHref(WEB_CSS, WEB_XP, main),
          keyword: kw,
          location: loc,
          zoneId: zoneMeta.zoneId || undefined,
          zoneName: zoneMeta.zoneName || undefined,
          mapsUrl: location.href.split(/[?#]/)[0],
          category: getText(CAT_CSS, CAT_XP, main)
        };

        // Extraer Rating
        let ratingStr = getText(['div.F7nice span[aria-hidden="true"]'], [], main);
        if (!ratingStr) {
          const starsEl = main.querySelector('span[role="img"][aria-label*="estrella"], span[role="img"][aria-label*="star"]');
          if (starsEl && starsEl.getAttribute('aria-label')) {
            const match = starsEl.getAttribute('aria-label').match(/([\d,\.]+)/);
            if (match) ratingStr = match[1];
          }
        }
        if (ratingStr) lead.rating = parseFloat(ratingStr.replace(',', '.'));

        // Extraer ReviewCount
        let reviewsStr = getText(['span[aria-label*="reseña"]', 'span[aria-label*="review"]', 'button[jsaction*="pane.rating.moreReviews"]'], [], main);
        if (reviewsStr) {
          const val = parseInt(reviewsStr.replace(/\D/g, ''), 10);
          if (!isNaN(val)) lead.reviewCount = val;
        }

        // Micro-scroll en el panel de detalle para que Google Maps cargue los snippets de reseñas (lazy load)
        try {
          const scrollablePane = main.querySelector('div.m6QErb.DxyBCb') || main;
          if (scrollablePane) {
            scrollablePane.scrollBy({ top: 650, behavior: 'smooth' });
            await delay(500);
          }
        } catch {}

        // Extraer Reseñas visibles (Review Snippets para minería de dolores)
        lead.reviews = [];
        try {
          const seenReviewTexts = new Set();
          const cardReviews = main.querySelectorAll('div.jftiEf, div[data-review-id]');
          if (cardReviews.length > 0) {
            cardReviews.forEach(cr => {
              if (lead.reviews.length >= 8) return;
              const textEl = cr.querySelector('span.wiI7pd, div.MyEned');
              const text = textEl ? textEl.innerText.trim() : '';
              if (text && text.length > 10 && !seenReviewTexts.has(text)) {
                seenReviewTexts.add(text);
                const authorEl = cr.querySelector('div.d4r55, div.WNx5W');
                const author = authorEl ? authorEl.innerText.trim() : '';
                const starEl = cr.querySelector('span.kvMYJc, span[role="img"]');
                let starRating = null;
                if (starEl && starEl.getAttribute('aria-label')) {
                  const m = starEl.getAttribute('aria-label').match(/([\d,\.]+)/);
                  if (m) starRating = parseFloat(m[1].replace(',', '.'));
                }
                const dateEl = cr.querySelector('span.rsqaWe');
                const timeStr = dateEl ? dateEl.innerText.trim() : '';
                lead.reviews.push({ text, rating: starRating, author, time: timeStr });
              }
            });
          }

          if (lead.reviews.length === 0) {
            const snippetEls = main.querySelectorAll('span.wiI7pd');
            snippetEls.forEach(snip => {
              if (lead.reviews.length >= 8) return;
              const text = snip.innerText.trim();
              if (text && text.length > 10 && !seenReviewTexts.has(text)) {
                seenReviewTexts.add(text);
                lead.reviews.push({ text });
              }
            });
          }
          if (lead.reviews.length > 0) {
            log(`⭐ Extraídas ${lead.reviews.length} reseñas para ${lead.name}`, 'info');
          }
        } catch {}

        if (isDuplicate(lead)) {
          return null;
        }

        log(`📇 Lead extraído → ${lead.name} ${lead.phone ? '(' + lead.phone + ')' : '(sin tel)'}`, 'success');
        return lead;
      } catch (e) {
        log(`⚠️ Intento ${at + 1} fallido: ${e.message}`, 'warn');
        if (at === tries - 1) return null;
        await delay(rand(800, 1200));
      }
    }
    return null;
  }

  /* ───── backend via background.js ───── */
  const sendLead = l => new Promise(r => {
    try {
      chrome.runtime.sendMessage({ action: 'lead', lead: l }, res => {
        if (chrome.runtime.lastError) {
          log(`❌ Error de conexión al enviar lead: ${chrome.runtime.lastError.message}`, 'error');
          r(false);
          return;
        }
        if (res?.ok) {
          log(`✅ Lead enviado al CRM: ${l.name}`, 'success');
          r(true);
        } else {
          log(`❌ Error envío backend: ${res?.error}`, 'error');
          r(false);
        }
      });
    } catch (e) {
      log(`❌ Excepción al enviar lead: ${e.message}`, 'error');
      r(false);
    }
  });

  // Inferir rubro y ubicación de la URL o input si el usuario usó "Raspar Vista Actual" sin llenar campos
  function inferQueryFromPage(defaultKw, defaultLoc) {
    let kw = defaultKw || '';
    let loc = defaultLoc || '';
    if (kw && loc) return { kw, loc };

    const inputEl = document.querySelector('#searchboxinput, form[role="search"] input');
    const rawSearch = inputEl?.value?.trim() || '';
    if (rawSearch) {
      if (!kw) kw = rawSearch;
      if (!loc) loc = 'Vista Maps';
      return { kw, loc };
    }

    const m = decodeURIComponent(window.location.pathname).match(/\/maps\/search\/([^/]+)/);
    if (m && m[1]) {
      const cleaned = m[1].replace(/\+/g, ' ').trim();
      if (!kw) kw = cleaned;
      if (!loc) loc = 'Vista GPS';
      return { kw, loc };
    }

    return { kw: kw || 'General', loc: loc || 'Zona Actual' };
  }

  /* ───── listener desde el popup / background ───── */
  chrome.runtime.onMessage.addListener((msg, _, reply) => {
    /* --- 1. Raspar Vista Actual o Objetivo GPS de Agente 1 --- */
    if (msg.action === 'scrapeCurrentView') {
      stopRequested = false;
      reply?.({ success: true });

      (async () => {
        const { kw, loc } = inferQueryFromPage(msg.keyword, msg.location);
        const zoneMeta = { zoneId: msg.zoneId, zoneName: msg.zoneName };
        let leadsSent = 0;

        log(`📍 Raspando vista GPS: "${kw}" en "${loc}"`, 'info');

        try {
          // Esperar a que haya tarjetas en la vista actual (o buscar si la URL no abrió el feed)
          let hasCards = false;
          try {
            await waitFor(() => cardsList().length > 0, 14000);
            hasCards = true;
          } catch {
            if (msg.searchQuery || (kw && kw !== 'General')) {
              const q = msg.searchQuery || `${kw} ${loc}`.trim();
              log(`🔍 Feed no detectado en vista directa, ejecutando búsqueda: "${q}"`, 'info');
              await doSearch(q);
              await waitFor(() => cardsList().length > 0, 20000);
              hasCards = true;
            }
          }

          if (hasCards && !checkStop()) {
            await delay(1500);
            await scrollFeed();
            const cards = cardsList();
            log(`📋 ${cards.length} negocios encontrados en esta zona`, 'info');

            for (let i = 0; i < cards.length; i++) {
              if (checkStop()) break;
              log(`➡️ Procesando negocio (${i + 1}/${cards.length})`, 'info');
              const lead = await openAndExtract(cards[i], kw, loc, zoneMeta);
              if (lead) {
                const ok = await sendLead(lead);
                if (ok) leadsSent++;
              }
              await delay(rand(2500, 6500));
            }
          } else if (!hasCards) {
            log(`⚠️ No se encontraron negocios en esta zona`, 'warn');
          }
        } catch (err) {
          log(`❌ Error raspando vista: ${err.message}`, 'error');
        }

        if (msg.isAgent1Auto || msg.zoneId) {
          try {
            chrome.runtime.sendMessage({
              action: 'zoneFinished',
              zoneId: msg.zoneId,
              keyword: kw,
              leadsFound: leadsSent,
              isAgent1Auto: Boolean(msg.isAgent1Auto),
              stopped: checkStop()
            });
          } catch {}
        } else {
          checkStop()
            ? log('⏹️ Scraping detenido por usuario', 'warn')
            : log(`🏁 Vista actual finalizada (${leadsSent} leads enviados)`, 'success');
          notifyScrapingDone();
          try {
            chrome.runtime.sendMessage({ action: 'scrapingFinished' });
          } catch {}
        }
      })();
      return true;
    }

    /* --- 2. Iniciar Cola Manual --- */
    if (msg.action === 'startScrapingQueue' && Array.isArray(msg.queue)) {
      stopRequested = false;
      reply?.({ success: true, total: msg.queue.length });
      (async () => {
        log(`🚦 Scraping iniciado – total búsquedas: ${msg.queue.length}`, 'info');
        sentLeads.clear();
        log(`🧹 Filtro de duplicados reiniciado`, 'info');

        outer:
        for (const { keyword, location } of msg.queue) {
          if (checkStop()) break;

          try {
            const searchQuery = `${keyword} ${location}`;
            log(`🔍 Iniciando búsqueda: "${searchQuery}"`, 'info');

            await doSearch(searchQuery);

            log(`⏳ Esperando resultados de búsqueda...`, 'info');
            try {
              await waitFor(() => cardsList().length > 0, 25000);
              await delay(2000);
            } catch (e) {
              log(`⚠️ No se encontraron tarjetas para "${searchQuery}": ${e.message}`, 'warn');
              continue;
            }

            await scrollFeed();
            const cards = cardsList();
            log(`📋 ${cards.length} tarjetas encontradas para "${searchQuery}"`, 'info');

            if (cards.length === 0) continue;

            for (let i = 0; i < cards.length; i++) {
              if (checkStop()) break outer;
              log(`➡️ Procesando tarjeta (${i + 1}/${cards.length})`, 'info');
              const lead = await openAndExtract(cards[i], keyword, location);
              if (lead) await sendLead(lead);
              await delay(rand(3000, 8000));
            }
          } catch (searchError) {
            log(`❌ Error procesando búsqueda "${keyword} ${location}": ${searchError.message}`, 'error');
            continue;
          }
        }
        checkStop()
          ? log('⏹️ Scraping detenido por usuario', 'warn')
          : log('🏁 Scraping finalizado', 'success');

        notifyScrapingDone();
        try {
          chrome.runtime.sendMessage({ action: 'scrapingFinished' }, () => {
            if (chrome.runtime.lastError) {}
          });
        } catch {}
      })();
      return true;
    }

    /* --- 3. Detener --- */
    if (msg.action === 'stopScraping') {
      stopRequested = true;
      reply?.({ stopped: true });
      log('⏸️ Señal de stop recibida', 'warn');
    }
  });

  log('🟢 GMaps Leads Scraper cargado (rev-26) - Agente 1 GPS & Anti-Stale-DOM activo');
})();
