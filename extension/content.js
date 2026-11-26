// content.js – NatoH Systems GMaps Leads Scraper Pro (rev-30)
//  • FIX DEFINITIVO DEL LOOP QUE VOLVÍA ARRIBA: deduplicación estricta por PlaceKey único (nunca duplica [role="article"] + a.hfpxzc)
//  • RASPADO ABAJO → ARRIBA POR DEFECTO (bottom-up): tras scrollear al final del feed, sube tarjeta por tarjeta sin saltar al inicio
//  • Búsqueda en vivo del nodo DOM por PlaceKey + soporte de virtualización de Google Maps
//  • Pre-chequeo por lote contra MongoDB (salta negocios ya guardados en el CRM en 0ms sin cliquearlos)
//  • Memoria anti-repetición de lugares sincronizada con el CRM (aviso en vivo en el HUD + auto-guardado al finalizar)
//  • Badges visuales de estado en cada tarjeta de Google Maps + HUD flotante arrastrable, colapsable y con Pausa/Reanudar

(() => {
  /* ───── helpers básicos ───── */
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const rwait = () => delay(rand(350, 700));

  const SPEED_RANGES = {
    safe: [2500, 5000],
    balanced: [1700, 3400],
    fast: [950, 2100]
  };

  let activeSettings = {
    direction: 'bottom-up',
    skipExistingLeads: true,
    skipScannedZones: true,
    speedPreset: 'balanced'
  };

  let isCurrentlyScraping = false;
  let stopRequested = false;
  let pauseRequested = false;
  let lastExtractedName = '-';
  let lastCheckedZoneSignature = '';

  const sessionStats = {
    current: 0,
    total: 0,
    qualified: 0,
    duplicates: 0,
    discarded: 0,
    errors: 0
  };

  // Set global de PlaceKeys ya procesados en esta pestaña (impide 100% repetir tarjetas)
  const sessionProcessedKeys = new Set();
  const sentLeadFingerprints = new Set();

  const checkStop = () => stopRequested;
  async function waitWhilePaused() {
    while (pauseRequested && !stopRequested) {
      await delay(350);
    }
  }

  function sendBg(msg) {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage(msg, (resp) => {
          if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message });
          else resolve(resp || {});
        });
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
  }

  function getInterCardDelay() {
    const [min, max] = SPEED_RANGES[activeSettings.speedPreset] || SPEED_RANGES.balanced;
    return rand(min, max);
  }

  /* ───── PlaceKey canónico + GPS URL + Detección de Anuncios Patrocinados ───── */
  function extractCoordsFromCurrentUrl() {
    const m = window.location.href.match(/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+(?:\.\d+)?)z/);
    if (m) {
      return { lat: parseFloat(m[1]), lng: parseFloat(m[2]), zoom: Math.round(parseFloat(m[3])) };
    }
    return null;
  }

  function isSponsoredCard(anchor) {
    try {
      const article = anchor?.closest('[role="article"]') || anchor?.parentElement;
      if (!article) return false;
      const txt = (article.innerText || '').slice(0, 140);
      return /\b(patrocinado|sponsored|anuncio)\b/i.test(txt);
    } catch {
      return false;
    }
  }

  function extractPlaceKey(href = '', fallbackLabel = '') {
    if (href) {
      // 1. Hex CID único de Google Maps (ej: !1s0x95bcca...:0x...)
      const cidMatch = href.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
      if (cidMatch && cidMatch[1]) return cidMatch[1].toLowerCase();
      // 2. ChIJ Place ID
      const chijMatch = href.match(/!19s(ChIJ[^!&?]+)/);
      if (chijMatch && chijMatch[1]) return chijMatch[1];
      // 3. Slug de /maps/place/<nombre>/
      const slugMatch = href.match(/\/maps\/place\/([^/?#]+)/);
      if (slugMatch && slugMatch[1]) {
        try { return 'slug:' + decodeURIComponent(slugMatch[1]).toLowerCase().trim(); } catch {}
        return 'slug:' + slugMatch[1].toLowerCase().trim();
      }
    }
    const cleanLbl = String(fallbackLabel || '').toLowerCase().trim();
    return cleanLbl ? `lbl:${cleanLbl}` : '';
  }

  function getCardLabelFromAnchor(anchor) {
    if (!anchor) return '';
    const article = anchor.closest('[role="article"]');
    return (
      anchor.getAttribute('aria-label') ||
      article?.getAttribute('aria-label') ||
      article?.querySelector('.qBF1Pd, .fontHeadlineSmall')?.textContent ||
      ''
    ).trim();
  }

  /* ───── Lista única de tarjetas (SOLO a.hfpxzc deduplicado por PlaceKey) ───── */
  function collectVisibleCardObjects() {
    const feed = getFeed();
    const root = feed || document;
    let anchors = Array.from(root.querySelectorAll('a.hfpxzc[href*="/maps/place/"]'));
    if (anchors.length === 0) {
      anchors = Array.from(root.querySelectorAll('[role="article"] a[href*="/maps/place/"]'));
    }
    const uniqueMap = new Map();
    for (const a of anchors) {
      if (isSponsoredCard(a)) continue; // Saltar anuncios patrocinados que contaminan la zona
      const href = a.getAttribute('href') || a.href || '';
      const label = getCardLabelFromAnchor(a);
      const key = extractPlaceKey(href, label);
      if (!key || uniqueMap.has(key)) continue;
      uniqueMap.set(key, {
        key,
        href,
        cleanUrl: (a.href || href).split(/[?#]/)[0],
        label,
        anchor: a
      });
    }
    return Array.from(uniqueMap.values());
  }

  /* ───── Badge visual directo en cada tarjeta de Google Maps ───── */
  function paintCardBadge(anchorOrKey, statusType, text) {
    try {
      let anchor = typeof anchorOrKey === 'string'
        ? collectVisibleCardObjects().find(c => c.key === anchorOrKey)?.anchor
        : anchorOrKey;
      if (!anchor || !anchor.isConnected) return;

      const host = anchor.closest('[role="article"]') || anchor.parentElement;
      if (!host) return;
      if (window.getComputedStyle(host).position === 'static') {
        host.style.position = 'relative';
      }

      const palette = {
        active: { bg: '#0284c7', border: '#38bdf8', color: '#fff' },
        saved: { bg: '#065f46', border: '#10b981', color: '#ecfdf5' },
        crm: { bg: '#1e3a5f', border: '#38bdf8', color: '#e0f2fe' },
        discarded: { bg: '#78350f', border: '#f59e0b', color: '#fef3c7' },
        error: { bg: '#7f1d1d', border: '#ef4444', color: '#fee2e2' }
      }[statusType] || { bg: '#1e293b', border: '#475569', color: '#f1f5f9' };

      let pill = host.querySelector('.natoh-card-pill');
      if (!pill) {
        pill = document.createElement('div');
        pill.className = 'natoh-card-pill';
        pill.style.cssText = `
          position: absolute; top: 8px; right: 10px; z-index: 50;
          padding: 2px 8px; border-radius: 99px; font-size: 10.5px; font-weight: 700;
          pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;
        host.appendChild(pill);
      }
      pill.style.background = palette.bg;
      pill.style.border = `1px solid ${palette.border}`;
      pill.style.color = palette.color;
      pill.textContent = text;
    } catch {}
  }

  /* ───── HUD & Logging ───── */
  function updateHud(statusText = null, color = null, progressText = null, phase = null) {
    const badge = document.getElementById('natoh-hud-status');
    const prog = document.getElementById('natoh-hud-progress');
    const bar = document.getElementById('natoh-hud-bar');
    const pctEl = document.getElementById('natoh-hud-pct');
    const cCards = document.getElementById('natoh-hud-cards');
    const cQual = document.getElementById('natoh-hud-qual');
    const cDup = document.getElementById('natoh-hud-dup');
    const cDisc = document.getElementById('natoh-hud-disc');
    const lastEl = document.getElementById('natoh-hud-last');
    const miniPill = document.getElementById('natoh-hud-mini-summary');
    const pauseBtn = document.getElementById('natoh-btn-pause');

    if (badge && statusText) {
      badge.textContent = statusText;
      if (color) {
        badge.style.background = `${color}24`;
        badge.style.color = color;
        badge.style.borderColor = `${color}66`;
      }
    }
    if (prog && progressText !== null) prog.textContent = progressText;

    const pct = sessionStats.total > 0 ? Math.min(100, Math.round((sessionStats.current / sessionStats.total) * 100)) : 0;
    if (bar) bar.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = sessionStats.total > 0 ? `${sessionStats.current}/${sessionStats.total} (${pct}%)` : '0%';
    if (cCards) cCards.textContent = String(sessionStats.total || collectVisibleCardObjects().length);
    if (cQual) cQual.textContent = String(sessionStats.qualified);
    if (cDup) cDup.textContent = String(sessionStats.duplicates);
    if (cDisc) cDisc.textContent = String(sessionStats.discarded);
    if (lastEl) lastEl.textContent = lastExtractedName;
    if (miniPill) {
      miniPill.textContent = sessionStats.total > 0
        ? `${sessionStats.current}/${sessionStats.total} · ✅ ${sessionStats.qualified}`
        : `📋 ${collectVisibleCardObjects().length}`;
    }
    if (pauseBtn) {
      pauseBtn.textContent = pauseRequested ? '▶️ Reanudar' : '⏸️ Pausar';
      pauseBtn.style.display = isCurrentlyScraping ? 'inline-flex' : 'none';
    }

    if (isCurrentlyScraping || phase) {
      sendBg({
        action: 'progressUpdate',
        paused: pauseRequested,
        progress: {
          ...sessionStats,
          direction: activeSettings.direction,
          phase: phase || (isCurrentlyScraping ? 'scraping' : 'idle')
        }
      });
    }
  }

  const log = (m, l = 'info') => {
    const C = { info: '#38bdf8', warn: '#fbbf24', error: '#f87171', success: '#34d399' }[l] || '#38bdf8';
    console.log(`%c[NatoH Scraper] ${m}`, `color:${C};font-weight:bold`);
    updateHud(null, null, m.substring(0, 74));
    try {
      chrome.runtime.sendMessage({ type: 'scraper-log', level: l, message: m }, () => {
        if (chrome.runtime.lastError) {}
      });
    } catch {}
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

  async function waitForInput(timeout = 20000) {
    const t0 = Date.now();
    const cssSelectors = [
      '#searchboxinput', 'form#searchboxform input', 'form[role="search"] input',
      'input[aria-label*="Google Maps"]', 'input[aria-label*="Buscar"]', 'input[aria-label*="Search"]',
      'input[placeholder*="Buscar"]', 'input[placeholder*="Search"]', 'input[type="search"]', 'input[role="combobox"]'
    ];
    while (Date.now() - t0 < timeout) {
      for (const sel of cssSelectors) {
        const el = document.querySelector(sel);
        if (isVisible(el)) return el;
      }
      await delay(200);
    }
    throw new Error('Timeout: Input de búsqueda no encontrado');
  }

  function notifyScrapingDone() {
    try {
      const utt = new SpeechSynthesisUtterance('Raspado completado en Google Maps.');
      utt.lang = 'es-AR';
      speechSynthesis.speak(utt);
    } catch {
      try { new Audio(chrome.runtime.getURL('notification.mp3')).play(); } catch {}
    }
  }

  /* ───── Selectores robustos de ficha de negocio ───── */
  const TITLE_CSS = ['[data-attrid="title"] h1', 'h1.fontHeadlineLarge', 'h1.DUwDvf', '[role="main"] h1:not(.gLFyf)'];
  const TITLE_XP = ['//h1[@data-attrid="title"]', '//h1[contains(@class,"fontHeadlineLarge") or contains(@class,"DUwDvf")]', '//div[@role="main"]//h1'];
  const PHONE_CSS = ['a[href^="tel:"]', 'button[data-item-id*="phone"]'];
  const PHONE_XP = ['//button[contains(@data-item-id,"phone")]/div/div[2]/div[1]', '//a[starts-with(@href,"tel:")]'];
  const ADDR_CSS = ['button[data-item-id="address"]', 'button[data-item-id="address"] .Io6YTe'];
  const ADDR_XP = ['//button[@data-item-id="address"]/div/div[2]/div[1]'];
  const WEB_CSS = ['a[data-item-id="authority"]'];
  const WEB_XP = ['//a[@data-item-id="authority"]'];
  const CAT_CSS = ['button.DkEaL', 'button[jsaction*="category"]'];
  const CAT_XP = ['//button[contains(@class, "DkEaL")]'];

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
        if (normExpected && (normCur === normExpected || normCur.includes(normExpected) || normExpected.includes(normCur))) {
          return cur;
        }
        if (!normPrev || normCur !== normPrev) {
          return cur;
        }
        if (Date.now() - t0 > 3800) return cur;
      }
      await delay(180);
    }
    const fallback = readCurrentTitleText();
    if (fallback) return fallback;
    throw new Error('Título de ficha no cargado');
  }

  /* ───── Scroll inteligente recolectando PlaceKeys únicos hasta el fondo ───── */
  async function scrollFeedAndCollect() {
    const feed = await waitForFeed(20000);
    const discovered = new Map();

    const absorbVisible = () => {
      let addedNow = 0;
      for (const c of collectVisibleCardObjects()) {
        if (!discovered.has(c.key)) {
          discovered.set(c.key, { key: c.key, href: c.href, cleanUrl: c.cleanUrl, label: c.label });
          addedNow++;
        }
      }
      return addedNow;
    };

    const checkEndReached = () => {
      const endTexts = ['Has llegado al final de la lista', "You've reached the end of the list", 'No hay más resultados'];
      for (const selector of ['p.fontBodyMedium span.HlvSq', 'p.fontBodyMedium span span', 'p.fontBodyMedium']) {
        const el = document.querySelector(selector);
        if (el?.textContent && endTexts.some(t => el.textContent.includes(t))) return true;
      }
      return false;
    };

    absorbVisible();
    let scrollCount = 0;
    const maxScrolls = 60;
    let lastHeight = 0;
    let unchanged = 0;

    updateHud('Cargando lista...', '#38bdf8', `Escaneando tarjetas en Google Maps...`, 'scrolling');
    log('📜 Cargando lista completa de Google Maps...', 'info');

    while (scrollCount < maxScrolls && !checkStop()) {
      await waitWhilePaused();
      if (checkStop()) break;

      feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
      scrollCount++;
      await delay(rand(1400, 2300));

      const addedNow = absorbVisible();
      sessionStats.total = discovered.size;
      updateHud('Cargando lista...', '#38bdf8', `Scroll #${scrollCount}: ${discovered.size} negocios únicos detectados`, 'scrolling');

      if (checkEndReached()) {
        log(`🏁 Final de la lista alcanzado (${discovered.size} negocios únicos)`, 'success');
        break;
      }

      const curHeight = feed.scrollHeight;
      if (addedNow === 0 && curHeight === lastHeight) {
        unchanged++;
        if (unchanged >= 3) {
          log(`🏁 Lista completa (${discovered.size} negocios únicos sin nuevos resultados)`, 'success');
          break;
        }
      } else {
        unchanged = 0;
        lastHeight = curHeight;
      }
    }

    absorbVisible();
    return Array.from(discovered.values());
  }

  /* ───── Encontrar nodo DOM vivo para un PlaceKey (sin saltar al tope ni repetir) ───── */
  async function findLiveAnchorForTarget(target, direction = 'bottom-up') {
    const direct = collectVisibleCardObjects().find(c => c.key === target.key);
    if (direct?.anchor && direct.anchor.isConnected) return direct.anchor;

    const feed = getFeed();
    if (!feed) return null;

    // Desplazar suavemente en el sentido activo buscando el elemento si fue virtualizado
    const stepPx = direction === 'bottom-up' ? -520 : 520;
    for (let step = 0; step < 14; step++) {
      if (checkStop()) return null;
      const before = feed.scrollTop;
      feed.scrollBy({ top: stepPx, behavior: 'auto' });
      await delay(260);
      const found = collectVisibleCardObjects().find(c => c.key === target.key);
      if (found?.anchor && found.anchor.isConnected) return found.anchor;
      if (feed.scrollTop === before) break;
    }

    // Último intento: verificar en dirección opuesta (por si el usuario movió el scroll con el mouse)
    const revStepPx = -stepPx;
    for (let step = 0; step < 10; step++) {
      if (checkStop()) return null;
      const before = feed.scrollTop;
      feed.scrollBy({ top: revStepPx, behavior: 'auto' });
      await delay(240);
      const found = collectVisibleCardObjects().find(c => c.key === target.key);
      if (found?.anchor && found.anchor.isConnected) return found.anchor;
      if (feed.scrollTop === before) break;
    }

    return null;
  }

  /* ───── Búsqueda en Google Maps ───── */
  const setInputValue = (input, value) => {
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (desc?.set) desc.set.call(input, value);
    else input.value = value;
  };

  async function doSearch(q) {
    log(`🔍 Buscando en Maps: "${q}"`, 'info');
    const input = await waitForInput(25000);
    input.focus();
    input.click();
    setInputValue(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(180);

    setInputValue(input, q);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await delay(450);

    ['keydown', 'keyup', 'keypress'].forEach(e =>
      input.dispatchEvent(new KeyboardEvent(e, { key: 'Enter', keyCode: 13, bubbles: true }))
    );
    await delay(280);

    for (const sel of ['#searchbox-searchbutton', 'button[aria-label*="Buscar"]', 'button[aria-label*="Search"]', 'button[type="submit"]']) {
      const btn = document.querySelector(sel);
      if (isVisible(btn)) { btn.click(); break; }
    }
    await delay(2000);
  }

  /* ───── Extracción enriquecida de ficha (incluye horarios, estado cerrado, teléfono robusto y expansión de reseñas) ───── */
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

  function extractPhoneRobust(main) {
    // 1. data-item-id="phone:tel:+549..." (fuente más confiable en Google Maps moderno)
    const phoneBtn = main.querySelector('button[data-item-id^="phone:tel:"]');
    if (phoneBtn) {
      const attr = phoneBtn.getAttribute('data-item-id') || '';
      const cleanFromAttr = attr.replace(/^phone:tel:/i, '').trim();
      if (cleanFromAttr.replace(/\D/g, '').length >= 7) return cleanFromAttr;
      const txt = (phoneBtn.innerText || '').trim();
      if (txt) return txt;
    }
    // 2. Link tel: o botón con aria-label Teléfono
    const telLink = main.querySelector('a[href^="tel:"]');
    if (telLink) {
      const cleanHref = (telLink.getAttribute('href') || '').replace(/^tel:/i, '').trim();
      if (cleanHref.replace(/\D/g, '').length >= 7) return cleanHref;
    }
    const ariaBtn = main.querySelector('button[aria-label*="Teléfono:"], button[aria-label*="Phone:"]');
    if (ariaBtn) {
      const m = (ariaBtn.getAttribute('aria-label') || '').match(/(?:Teléfono|Phone):\s*(.+)$/i);
      if (m && m[1]) return m[1].trim();
    }
    return getText(PHONE_CSS, PHONE_XP, main);
  }

  function extractBusinessStatus(main) {
    const txt = (main.innerText || '').slice(0, 900);
    if (/cerrado permanentemente|permanently closed/i.test(txt)) return 'permanently_closed';
    if (/cerrado temporalmente|temporarily closed/i.test(txt)) return 'temporarily_closed';
    return 'open';
  }

  function extractOpeningHours(main) {
    try {
      const hrEl = main.querySelector('div[aria-label*="Horario"], button[data-item-id="oh"], div.t39EBf');
      const aria = hrEl?.getAttribute('aria-label') || hrEl?.innerText || '';
      return aria.replace(/\s+/g, ' ').trim().slice(0, 220);
    } catch {
      return '';
    }
  }

  async function extractFromCurrentMainPanel(target, kw, loc, zoneMeta = {}) {
    const main = document.querySelector('[role="main"]');
    if (!main) throw new Error('Panel principal no disponible');

    const titleText = readCurrentTitleText() || target.label || '';
    if (!titleText) throw new Error('Título de ficha vacío');

    const rawWebHref = getHref(WEB_CSS, WEB_XP, main);
    let instagramUrl = '';
    let facebookUrl = '';
    let externalPlatform = '';

    if (rawWebHref) {
      const lw = rawWebHref.toLowerCase();
      if (lw.includes('instagram.com/')) { instagramUrl = rawWebHref; externalPlatform = 'instagram'; }
      else if (lw.includes('facebook.com/') || lw.includes('fb.com/')) { facebookUrl = rawWebHref; externalPlatform = 'facebook'; }
      else if (lw.includes('linktr.ee/') || lw.includes('bio.link/') || lw.includes('beacons.ai/')) externalPlatform = 'linktree';
      else if (lw.includes('pedidosya.com') || lw.includes('rappi.com')) externalPlatform = 'pedidosya';
      else if (lw.includes('wa.me/') || lw.includes('api.whatsapp.com')) externalPlatform = 'whatsapp_link';
      else if (lw.includes('tiendanube') || lw.includes('mitiendanube')) externalPlatform = 'tiendanube';
    }

    try {
      main.querySelectorAll('a[href]').forEach(a => {
        const h = (a.href || '').toLowerCase();
        if (!instagramUrl && h.includes('instagram.com/')) instagramUrl = a.href;
        if (!facebookUrl && (h.includes('facebook.com/') || h.includes('fb.com/'))) facebookUrl = a.href;
      });
    } catch {}

    const coordsNow = extractCoordsFromCurrentUrl();
    const lead = {
      name: titleText,
      phone: extractPhoneRobust(main),
      address: getText(ADDR_CSS, ADDR_XP, main),
      website: rawWebHref,
      instagramUrl: instagramUrl || undefined,
      facebookUrl: facebookUrl || undefined,
      externalPlatform: externalPlatform || undefined,
      openingHours: extractOpeningHours(main) || undefined,
      businessStatus: extractBusinessStatus(main),
      placeKey: target.key || extractPlaceKey(window.location.href, titleText),
      lat: coordsNow?.lat ?? zoneMeta.center?.lat ?? undefined,
      lng: coordsNow?.lng ?? zoneMeta.center?.lng ?? undefined,
      keyword: kw,
      location: loc,
      zoneId: zoneMeta.zoneId || undefined,
      zoneName: zoneMeta.zoneName || undefined,
      province: zoneMeta.province || undefined,
      mapsUrl: target.cleanUrl || location.href.split(/[?#]/)[0],
      category: getText(CAT_CSS, CAT_XP, main)
    };

    const headerScope = main.querySelector('div.TIHn2, div.lMbq3e') || main;
    let ratingStr = getText(['div.F7nice span[aria-hidden="true"]'], [], headerScope);
    if (!ratingStr) {
      const starsEl = headerScope.querySelector('span[role="img"][aria-label*="estrella"], span[role="img"][aria-label*="star"]');
      const m = starsEl?.getAttribute('aria-label')?.match(/([\d,\.]+)/);
      if (m) ratingStr = m[1];
    }
    if (ratingStr) {
      const rVal = parseFloat(ratingStr.replace(',', '.'));
      if (!isNaN(rVal) && rVal > 0 && rVal <= 5) lead.rating = rVal;
    }

    let reviewsStr = getText(['span[aria-label*="reseña"]', 'span[aria-label*="review"]', 'button[jsaction*="pane.rating.moreReviews"]'], [], headerScope);
    if (!reviewsStr) {
      const m = headerScope.querySelector('div.F7nice')?.innerText?.match(/\(([\d\.,]+)\)/);
      if (m) reviewsStr = m[1];
    }
    if (reviewsStr) {
      const v = parseInt(reviewsStr.replace(/\D/g, ''), 10);
      if (!isNaN(v) && v > 0) lead.reviewCount = v;
    }

    // Micro-scroll del panel de detalle y expansión de botón "Más" para capturar dolores completos en reseñas
    try {
      const pane = main.querySelector('div.m6QErb.DxyBCb') || main;
      if (pane) {
        pane.scrollBy({ top: 680, behavior: 'smooth' });
        await delay(420);
        main.querySelectorAll('button.w8nwRe, button[aria-label*="Ver más"]').forEach((b, idx) => {
          if (idx < 4) { try { b.click(); } catch {} }
        });
        await delay(180);
      }
    } catch {}

    lead.reviews = [];
    try {
      const seen = new Set();
      main.querySelectorAll('div.jftiEf, div[data-review-id]').forEach(cr => {
        if (lead.reviews.length >= 6) return;
        const text = (cr.querySelector('span.wiI7pd, div.MyEned')?.innerText || '').trim();
        if (text.length > 10 && !seen.has(text)) {
          seen.add(text);
          const author = (cr.querySelector('div.d4r55, div.WNx5W')?.innerText || '').trim();
          const starM = cr.querySelector('span.kvMYJc, span[role="img"]')?.getAttribute('aria-label')?.match(/([\d,\.]+)/);
          const starRating = starM ? parseFloat(starM[1].replace(',', '.')) : null;
          const timeStr = (cr.querySelector('span.rsqaWe')?.innerText || '').trim();
          lead.reviews.push({ text, rating: starRating, author, time: timeStr });
        }
      });
    } catch {}

    return lead;
  }

  async function openAndExtract(target, anchor, kw, loc, zoneMeta = {}, tries = 2) {
    for (let at = 0; at < tries; at++) {
      if (checkStop()) return null;
      try {
        const prevTitle = readCurrentTitleText();
        const expectedLabel = target.label || getCardLabelFromAnchor(anchor);

        anchor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        await rwait();
        paintCardBadge(anchor, 'active', '⚡ Raspando...');
        anchor.click();

        await waitForSel('[role="main"]', 14000);
        await getUpdatedTitleText(prevTitle, expectedLabel, 7500);
        await delay(420);

        const lead = await extractFromCurrentMainPanel(target, kw, loc, zoneMeta);

        if (lead.businessStatus === 'permanently_closed') {
          sessionStats.discarded++;
          paintCardBadge(anchor, 'discarded', '🚫 Cerrado');
          log(`🚫 Cerrado permanentemente: ${lead.name}`, 'warn');
          return null;
        }

        const fp = `${lead.name}|${lead.phone}|${lead.address}`.toLowerCase().trim();
        if (sentLeadFingerprints.has(fp)) {
          sessionStats.duplicates++;
          paintCardBadge(anchor, 'crm', '🔄 Duplicado');
          return null;
        }
        sentLeadFingerprints.add(fp);

        lastExtractedName = lead.name.substring(0, 30);
        return lead;
      } catch (e) {
        log(`⚠️ Reintento ${at + 1}/${tries} en "${target.label || 'tarjeta'}": ${e.message}`, 'warn');
        if (at === tries - 1) return null;
        await delay(rand(700, 1100));
      }
    }
    return null;
  }

  async function sendLeadToBackend(lead, anchor) {
    const res = await sendBg({ action: 'lead', lead });
    if (res?.ok && res.data) {
      const d = res.data;
      if (d.added > 0) {
        sessionStats.qualified++;
        paintCardBadge(anchor, 'saved', '✅ Guardado');
        log(`✅ Guardado en CRM: ${lead.name} (${lead.phone || 'móvil'})`, 'success');
      } else if (d.duplicates > 0) {
        sessionStats.duplicates++;
        paintCardBadge(anchor, 'crm', '🔄 Ya en CRM');
        log(`🔄 Ya estaba en CRM: ${lead.name}`, 'info');
      } else {
        sessionStats.discarded++;
        paintCardBadge(anchor, 'discarded', lead.phone ? '🚫 Tel. fijo' : '🚫 Sin tel.');
        log(`🚫 Descartado (${lead.phone ? 'fijo/no móvil' : 'sin teléfono'}): ${lead.name}`, 'warn');
      }
      updateHud();
      return true;
    } else {
      sessionStats.errors++;
      paintCardBadge(anchor, 'error', '❌ Error');
      log(`❌ Error enviando "${lead.name}": ${res?.error || 'sin respuesta'}`, 'error');
      updateHud();
      return false;
    }
  }

  /* ───── Inferir Rubro y Lugar de la página actual ───── */
  function inferQueryFromPage(defaultKw, defaultLoc) {
    const hudKw = document.getElementById('natoh-hud-kw')?.value?.trim() || '';
    const hudLoc = document.getElementById('natoh-hud-loc')?.value?.trim() || '';

    let kw = defaultKw || hudKw || '';
    let loc = defaultLoc || hudLoc || '';
    if (kw && loc) return { kw, loc, rawSearch: `${kw} en ${loc}` };

    const inputEl = document.querySelector('#searchboxinput, form[role="search"] input');
    const rawSearch = inputEl?.value?.trim() || '';
    if (rawSearch) {
      const parts = rawSearch.split(/\s+en\s+/i);
      if (parts.length === 2) {
        if (!kw) kw = parts[0].trim();
        if (!loc) loc = parts[1].trim();
      } else {
        if (!kw) kw = rawSearch;
        if (!loc) loc = 'Vista Maps';
      }
      return { kw, loc, rawSearch };
    }

    const m = decodeURIComponent(window.location.pathname).match(/\/maps\/search\/([^/]+)/);
    if (m && m[1]) {
      const cleaned = m[1].replace(/\+/g, ' ').trim();
      const parts = cleaned.split(/\s+en\s+/i);
      if (parts.length === 2) {
        if (!kw) kw = parts[0].trim();
        if (!loc) loc = parts[1].trim();
      } else {
        if (!kw) kw = cleaned;
        if (!loc) loc = 'Vista GPS';
      }
      return { kw, loc, rawSearch: cleaned };
    }

    return { kw: kw || 'General', loc: loc || 'Zona Actual', rawSearch: `${kw || 'General'} ${loc || 'Zona Actual'}` };
  }

  /* ───── Verificador en vivo de Zona ya Escaneada en el HUD (con Coordenadas GPS reales) ───── */
  async function checkCurrentViewZoneMemory(force = false) {
    const pill = document.getElementById('natoh-hud-zone-mem');
    if (!pill || isCurrentlyScraping) return;
    const { kw, loc, rawSearch } = inferQueryFromPage('', '');
    const coords = extractCoordsFromCurrentUrl();
    const coordSig = coords ? `${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}` : '';
    const sig = `${kw}|${loc}|${rawSearch}|${coordSig}`.toLowerCase();
    if (!force && (sig === lastCheckedZoneSignature || kw === 'General')) return;
    lastCheckedZoneSignature = sig;

    const res = await sendBg({
      action: 'apiCheckZone',
      payload: {
        keyword: kw,
        location: loc,
        searchQuery: rawSearch,
        googleMapsUrl: window.location.href,
        center: coords || undefined
      }
    });
    if (res?.ok && res.data?.success) {
      const resolvedLabel = res.data.resolved?.zoneName
        ? `${res.data.resolved.zoneName}${res.data.resolved.province ? ` (${res.data.resolved.province})` : ''}`
        : loc;
      if (res.data.alreadyScanned && res.data.record) {
        const rec = res.data.record;
        const dt = rec.lastScannedAt || rec.scannedAt;
        const dtStr = dt ? new Date(dt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '';
        pill.textContent = `⚠️ Ya raspado: ${resolvedLabel} (${dtStr} · ${rec.validLeadsIngested || 0} calif.)`;
        pill.style.background = 'rgba(245,158,11,0.16)';
        pill.style.borderColor = 'rgba(245,158,11,0.5)';
        pill.style.color = '#fbbf24';
      } else {
        pill.textContent = `🟢 Virgen: ${resolvedLabel} · ${kw}`;
        pill.style.background = 'rgba(0,212,161,0.13)';
        pill.style.borderColor = 'rgba(0,212,161,0.4)';
        pill.style.color = '#34d399';
      }
    }
  }

  /* ───── Ejecutor Principal de Raspado de Vista (Bottom-Up/Top-Down + Checkpoints Garantizados + Cero Loops) ───── */
  async function processLoadedFeed({ kw, kwLabel = '', loc, rawSearch = '', zoneMeta = {}, isAgent1Auto = false }) {
    sessionStats.current = 0;
    sessionStats.total = 0;
    sessionStats.qualified = 0;
    sessionStats.duplicates = 0;
    sessionStats.discarded = 0;
    sessionStats.errors = 0;

    const sampleAddresses = [];
    let checkpointSent = false;
    const coords = zoneMeta.center?.lat ? zoneMeta.center : extractCoordsFromCurrentUrl();

    const saveZoneCheckpoint = async (status = 'in_progress') => {
      try {
        checkpointSent = true;
        await sendBg({
          action: 'apiCheckpointZone',
          payload: {
            zoneId: zoneMeta.zoneId || '',
            zoneName: zoneMeta.zoneName || loc,
            location: loc,
            city: zoneMeta.city || 'custom',
            province: zoneMeta.province || '',
            keyword: kw,
            keywordLabel: kwLabel || kw,
            searchQuery: rawSearch,
            googleMapsUrl: window.location.href,
            center: coords || undefined,
            zoom: coords?.zoom || zoneMeta.zoom || 15,
            sampleAddresses: sampleAddresses.slice(0, 12),
            scrapeDirection: activeSettings.direction,
            totalLeadsFound: sessionStats.total,
            validLeadsIngested: sessionStats.qualified,
            discardedLeads: sessionStats.discarded,
            duplicatesSkipped: sessionStats.duplicates,
            status,
            source: isAgent1Auto ? 'extension_auto' : 'extension_manual'
          }
        });
      } catch {}
    };

    // 1. Scroll completo hasta el final recolectando PlaceKeys únicos (excluyendo anuncios patrocinados)
    const discoveredTargets = await scrollFeedAndCollect();
    if (checkStop()) return { totalCards: discoveredTargets.length, sampleAddresses, checkpointSent };

    if (discoveredTargets.length === 0) {
      log('⚠️ No se encontraron tarjetas en esta vista de Google Maps', 'warn');
      return { totalCards: 0, sampleAddresses, checkpointSent };
    }

    // 2. Pre-chequeo por lote contra MongoDB (salta negocios ya existentes en el CRM sin cliquear)
    let existingInCrmKeys = new Set();
    if (activeSettings.skipExistingLeads) {
      updateHud('Verificando CRM...', '#38bdf8', `Chequeando ${discoveredTargets.length} negocios contra CRM...`, 'precheck');
      const chk = await sendBg({
        action: 'apiCheckPlaces',
        places: discoveredTargets.map(t => ({ key: t.key, name: t.label, mapsUrl: t.cleanUrl }))
      });
      if (chk?.ok && Array.isArray(chk.data?.existingKeys)) {
        existingInCrmKeys = new Set(chk.data.existingKeys);
        if (existingInCrmKeys.size > 0) {
          log(`⚡ Pre-chequeo CRM: ${existingInCrmKeys.size}/${discoveredTargets.length} ya existen (se saltan en 0ms)`, 'info');
          existingInCrmKeys.forEach(k => paintCardBadge(k, 'crm', '🔄 En CRM'));
        }
      }
    }

    // 3. Ordenar según dirección elegida: ABAJO → ARRIBA por defecto (ya estamos al final del scroll!)
    const direction = activeSettings.direction === 'top-down' ? 'top-down' : 'bottom-up';
    const orderedTargets = direction === 'bottom-up'
      ? [...discoveredTargets].reverse()
      : [...discoveredTargets];

    if (direction === 'top-down') {
      const feed = getFeed();
      if (feed) {
        feed.scrollTo({ top: 0, behavior: 'auto' });
        await delay(600);
      }
    }

    sessionStats.total = orderedTargets.length;
    log(
      `🧭 Iniciando raspado ${direction === 'bottom-up' ? '⬆️ ABAJO → ARRIBA' : '⬇️ ARRIBA → ABAJO'} de ${orderedTargets.length} negocios únicos`,
      'success'
    );

    // Checkpoint inicial inmediato para asegurar que la zona ya quede registrada
    await saveZoneCheckpoint('in_progress');

    // 4. Iterar sin repetir jamás una tarjeta ni saltar de vuelta arriba
    for (let i = 0; i < orderedTargets.length; i++) {
      await waitWhilePaused();
      if (checkStop()) break;

      const target = orderedTargets[i];
      sessionStats.current = i + 1;

      if (sessionProcessedKeys.has(target.key)) {
        sessionStats.duplicates++;
        updateHud(`Raspando ${i + 1}/${orderedTargets.length}`, '#00d4a1', `⏭️ Ya procesado: ${target.label}`);
        continue;
      }

      if (existingInCrmKeys.has(target.key)) {
        sessionProcessedKeys.add(target.key);
        sessionStats.duplicates++;
        paintCardBadge(target.key, 'crm', '🔄 En CRM');
        updateHud(`Raspando ${i + 1}/${orderedTargets.length}`, '#00d4a1', `⚡ Saltado (ya en CRM): ${target.label}`);
        continue;
      }

      updateHud(`Raspando ${i + 1}/${orderedTargets.length}`, '#00d4a1', `${direction === 'bottom-up' ? '⬆️' : '⬇️'} ${target.label || 'Abriendo ficha...'}`);

      const liveAnchor = await findLiveAnchorForTarget(target, direction);
      if (!liveAnchor) {
        log(`⏭️ Tarjeta no visible tras scroll (${target.label || target.key}), continuando...`, 'warn');
        continue;
      }

      const lead = await openAndExtract(target, liveAnchor, kw, loc, zoneMeta);
      sessionProcessedKeys.add(target.key);

      if (lead) {
        if (lead.address && sampleAddresses.length < 15) sampleAddresses.push(lead.address);
        await sendLeadToBackend(lead, liveAnchor);
      }

      // Checkpoint cada 6 tarjetas para que nunca se pierda la zona aunque se cierre el navegador
      if ((i + 1) % 6 === 0) {
        saveZoneCheckpoint('in_progress');
      }

      if (i < orderedTargets.length - 1 && !checkStop()) {
        await delay(getInterCardDelay());
      }
    }

    return {
      totalCards: orderedTargets.length,
      direction,
      kw,
      kwLabel: kwLabel || kw,
      loc,
      rawSearch,
      zoneMeta,
      sampleAddresses,
      checkpointSent,
      isAgent1Auto
    };
  }

  async function executeScrapeCurrentView(msg = {}) {
    if (isCurrentlyScraping) {
      log('⚠️ Ya hay un raspado en curso en esta pestaña.', 'warn');
      return;
    }

    if (msg.settings) activeSettings = { ...activeSettings, ...msg.settings };
    else {
      const st = await sendBg({ action: 'getSettings' });
      if (st?.settings) activeSettings = { ...activeSettings, ...st.settings };
    }

    stopRequested = false;
    pauseRequested = false;
    isCurrentlyScraping = true;

    const { kw, loc, rawSearch } = inferQueryFromPage(msg.keyword, msg.location);
    const liveCoords = extractCoordsFromCurrentUrl();
    const zoneMeta = {
      zoneId: msg.zoneId || '',
      zoneName: msg.zoneName || loc,
      city: msg.city || 'custom',
      province: msg.province || '',
      center: (msg.center && typeof msg.center.lat === 'number') ? msg.center : (liveCoords || undefined),
      zoom: msg.zoom || liveCoords?.zoom || 15
    };

    if (msg.isAiRecommended && msg.aiReason) {
      const pill = document.getElementById('natoh-hud-zone-mem');
      if (pill) {
        pill.textContent = `🧠 ${msg.province || 'IA'}: ${msg.aiReason.slice(0, 58)}`;
        pill.style.background = 'rgba(139,92,246,0.18)';
        pill.style.borderColor = 'rgba(139,92,246,0.55)';
        pill.style.color = '#d8b4fe';
      }
    }

    updateHud('Iniciando...', '#00d4a1', `Preparando "${kw}" en "${loc}"`, 'starting');
    log(`📍 Iniciando vista: "${kw}" en "${loc}" (${activeSettings.direction === 'bottom-up' ? '⬆️ Abajo→Arriba' : '⬇️ Arriba→Abajo'})`, 'info');

    let summary = { totalCards: 0, sampleAddresses: [], checkpointSent: false };
    try {
      let hasCards = false;
      try {
        await waitFor(() => collectVisibleCardObjects().length > 0, 10000);
        hasCards = true;
      } catch {
        // Verificar si Maps abrió directamente una ficha única en lugar del feed lateral
        const directMainTitle = readCurrentTitleText();
        if (directMainTitle && !getFeed() && !msg.searchQuery) {
          log(`📇 Ficha única detectada en pantalla: "${directMainTitle}"`, 'info');
          const singleLead = await extractFromCurrentMainPanel(
            { key: extractPlaceKey(window.location.href, directMainTitle), cleanUrl: window.location.href.split(/[?#]/)[0], label: directMainTitle },
            kw, loc, zoneMeta
          );
          if (singleLead) {
            if (singleLead.address) summary.sampleAddresses.push(singleLead.address);
            summary.totalCards = 1;
            sessionStats.total = 1;
            sessionStats.current = 1;
            await sendLeadToBackend(singleLead, null);
          }
        } else if (msg.searchQuery || (kw && kw !== 'General')) {
          const q = msg.searchQuery || `${kw} en ${loc}`.trim();
          await doSearch(q);
          await waitFor(() => collectVisibleCardObjects().length > 0, 20000);
          hasCards = true;
        }
      }

      if (hasCards && !checkStop()) {
        await delay(900);
        summary = await processLoadedFeed({
          kw,
          kwLabel: msg.keywordLabel || kw,
          loc,
          rawSearch: msg.searchQuery || rawSearch,
          zoneMeta,
          isAgent1Auto: Boolean(msg.isAgent1Auto)
        });
      } else if (!hasCards && summary.totalCards === 0) {
        log('⚠️ No se encontraron negocios en esta vista', 'warn');
      }
    } catch (err) {
      log(`❌ Error raspando vista: ${err.message}`, 'error');
    } finally {
      isCurrentlyScraping = false;
      pauseRequested = false;
    }

    const finalCoords = zoneMeta.center?.lat ? zoneMeta.center : extractCoordsFromCurrentUrl();
    const shouldSaveZone = msg.isAgent1Auto || sessionStats.current > 0 || (summary.totalCards > 0 && !checkStop());

    // Guardar SIEMPRE en la memoria del CRM (con coordenadas GPS + direcciones reales para que NUNCA quede como "Vista GPS")
    await sendBg({
      action: 'zoneFinished',
      zoneId: zoneMeta.zoneId,
      zoneName: zoneMeta.zoneName || loc,
      location: loc,
      city: zoneMeta.city,
      province: zoneMeta.province,
      keyword: kw,
      keywordLabel: msg.keywordLabel || kw,
      searchQuery: msg.searchQuery || rawSearch,
      googleMapsUrl: msg.googleMapsUrl || window.location.href,
      center: finalCoords || undefined,
      zoom: finalCoords?.zoom || zoneMeta.zoom,
      sampleAddresses: summary.sampleAddresses || [],
      direction: activeSettings.direction,
      totalCards: summary.totalCards || sessionStats.total,
      qualifiedCount: sessionStats.qualified,
      discardedCount: sessionStats.discarded,
      duplicatesCount: sessionStats.duplicates,
      status: checkStop() && sessionStats.current < Math.floor(sessionStats.total * 0.5) ? 'in_progress' : 'completed',
      alreadyCheckpointed: Boolean(summary.checkpointSent),
      isAgent1Auto: Boolean(msg.isAgent1Auto),
      stopped: checkStop(),
      skipMarkScanned: !shouldSaveZone
    });

    if (!msg.isAgent1Auto) {
      if (checkStop()) {
        updateHud('Detenido', '#fbbf24', `Detenido en ${sessionStats.current}/${sessionStats.total} (zona guardada)`, 'idle');
        log('⏹️ Scraping detenido por el usuario (progreso de zona guardado en CRM)', 'warn');
      } else {
        updateHud('Completado ✓', '#34d399', `Listo: ${sessionStats.qualified} nuevos · ${sessionStats.duplicates} ya en CRM`, 'done');
        log(`🏁 Finalizado y zona guardada: ${sessionStats.qualified} nuevos | ${sessionStats.duplicates} ya en CRM | ${sessionStats.discarded} desc.`, 'success');
      }
      notifyScrapingDone();
      checkCurrentViewZoneMemory(true);
    }
  }

  /* ───── HUD FLOTANTE PRO EN GOOGLE MAPS (Arrastrable + Colapsable + Memoria CRM) ───── */
  function injectFloatingHud() {
    if (document.getElementById('natoh-gmaps-hud')) return;

    const hud = document.createElement('div');
    hud.id = 'natoh-gmaps-hud';
    hud.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; width: 326px;
      background: rgba(11, 18, 25, 0.94); backdrop-filter: blur(12px);
      color: #edf2f7; border: 1px solid rgba(0, 212, 161, 0.45);
      border-radius: 14px; box-shadow: 0 14px 40px rgba(0,0,0,0.6);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 999999; overflow: hidden; transition: width 0.2s ease;
    `;

    hud.innerHTML = `
      <div id="natoh-hud-header" style="background: linear-gradient(135deg, #0c2329, #141f31); padding: 9px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #243647; cursor: grab; user-select: none;">
        <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
          <div style="width: 24px; height: 24px; border-radius: 7px; background: linear-gradient(135deg, #00d4a1, #0284c7); display:flex; align-items:center; justify-content:center; font-size: 13px; flex-shrink:0;">🎯</div>
          <div style="min-width:0;">
            <div style="font-size: 12px; font-weight: 800; color: #fff; line-height: 1.1;">NatoH Scraper Pro</div>
            <div id="natoh-hud-mini-summary" style="font-size: 9.5px; color: #8fa3b8;">📋 0 tarjetas</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <span id="natoh-hud-status" style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: rgba(0,212,161,0.16); color: #00d4a1; border: 1px solid rgba(0,212,161,0.45);">Listo</span>
          <button id="natoh-hud-crm" title="Abrir CRM" style="background: rgba(255,255,255,0.07); border: 1px solid #2b4054; color: #00d4a1; cursor: pointer; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px;">CRM</button>
          <button id="natoh-hud-toggle" title="Minimizar/Expandir" style="background: none; border: none; color: #8fa3b8; cursor: pointer; font-size: 13px; padding: 0 3px;">➖</button>
        </div>
      </div>

      <div id="natoh-hud-body" style="padding: 10px 12px;">
        <!-- Banner memoria de zona -->
        <div id="natoh-hud-zone-mem" style="font-size: 10.5px; font-weight: 600; padding: 5px 8px; border-radius: 7px; margin-bottom: 8px; background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); color: #7dd3fc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          🧭 Memoria CRM activa — sin repetir zonas
        </div>

        <!-- Barra de progreso -->
        <div style="display:flex; justify-content:space-between; font-size:10px; color:#8fa3b8; margin-bottom:4px;">
          <span id="natoh-hud-last" style="color:#e2e8f0; font-weight:600; max-width:210px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Listo para raspar</span>
          <strong id="natoh-hud-pct" style="color:#00d4a1;">0%</strong>
        </div>
        <div style="height: 5px; background: rgba(255,255,255,0.08); border-radius: 99px; overflow: hidden; margin-bottom: 8px;">
          <div id="natoh-hud-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #00d4a1, #38bdf8); transition: width 0.25s ease;"></div>
        </div>

        <!-- 4 Mini KPIs -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-bottom: 8px;">
          <div style="background:#14202b; border:1px solid #243647; border-radius:7px; padding:4px 5px; text-align:center;">
            <div style="font-size:9px; color:#8fa3b8;">Tarjetas</div>
            <strong id="natoh-hud-cards" style="font-size:12px; color:#e2e8f0;">0</strong>
          </div>
          <div style="background:#14202b; border:1px solid #243647; border-radius:7px; padding:4px 5px; text-align:center;">
            <div style="font-size:9px; color:#8fa3b8;">Nuevos</div>
            <strong id="natoh-hud-qual" style="font-size:12px; color:#34d399;">0</strong>
          </div>
          <div style="background:#14202b; border:1px solid #243647; border-radius:7px; padding:4px 5px; text-align:center;">
            <div style="font-size:9px; color:#8fa3b8;">En CRM</div>
            <strong id="natoh-hud-dup" style="font-size:12px; color:#38bdf8;">0</strong>
          </div>
          <div style="background:#14202b; border:1px solid #243647; border-radius:7px; padding:4px 5px; text-align:center;">
            <div style="font-size:9px; color:#8fa3b8;">Desc.</div>
            <strong id="natoh-hud-disc" style="font-size:12px; color:#fbbf24;">0</strong>
          </div>
        </div>

        <!-- Rubro / Zona manual opcional + Sentido -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 7px;">
          <input id="natoh-hud-kw" type="text" placeholder="Rubro (auto)" style="background:#162330; border:1px solid #293d50; color:#fff; border-radius:7px; padding:5px 7px; font-size:11px; outline:none; width:100%; box-sizing:border-box;">
          <input id="natoh-hud-loc" type="text" placeholder="Lugar (auto)" style="background:#162330; border:1px solid #293d50; color:#fff; border-radius:7px; padding:5px 7px; font-size:11px; outline:none; width:100%; box-sizing:border-box;">
        </div>

        <!-- Selector rápido de sentido -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; background:#091017; border:1px solid #243647; border-radius:8px; padding:3px; margin-bottom:8px;">
          <button id="natoh-dir-up" style="border:none; border-radius:6px; padding:5px 4px; font-size:10.5px; font-weight:700; cursor:pointer; background:#1d3345; color:#fff;">⬆️ Abajo → Arriba</button>
          <button id="natoh-dir-down" style="border:none; border-radius:6px; padding:5px 4px; font-size:10.5px; font-weight:700; cursor:pointer; background:transparent; color:#8fa3b8;">⬇️ Arriba → Abajo</button>
        </div>

        <!-- Botones de acción -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button id="natoh-btn-scrape-view" style="background: linear-gradient(135deg, #00c496, #0284c7); color: #05161a; border: none; border-radius: 8px; padding: 8px 10px; font-size: 12px; font-weight: 800; cursor: pointer;">
            📍 Raspar Esta Vista (Sin Repetir)
          </button>
          <div style="display: flex; gap: 5px;">
            <button id="natoh-btn-next-zone" style="flex: 1.4; background: linear-gradient(135deg, #7c3aed, #2563eb); color: #fff; border: none; border-radius: 8px; padding: 7px 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
              🤖 Siguiente Zona
            </button>
            <button id="natoh-btn-pause" style="display:none; flex: 1; align-items:center; justify-content:center; background: rgba(245,158,11,0.2); border: 1px solid rgba(245,158,11,0.55); color: #fcd34d; border-radius: 8px; padding: 7px 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
              ⏸️ Pausar
            </button>
            <button id="natoh-btn-stop" style="flex: 0.9; background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.55); color: #fca5a5; border-radius: 8px; padding: 7px 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
              ⏹️ Stop
            </button>
          </div>
        </div>

        <div id="natoh-hud-progress" style="margin-top: 7px; font-size: 10px; color: #8fa3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          Elegí sentido y tocá Raspar o Siguiente Zona CRM
        </div>
      </div>
    `;

    document.body.appendChild(hud);

    // Restaurar posición arrastrada si existía
    try {
      chrome.storage.local.get(['hudPos', 'scraperSettings'], (st) => {
        if (st?.hudPos && typeof st.hudPos.left === 'number' && typeof st.hudPos.top === 'number') {
          hud.style.right = 'auto';
          hud.style.bottom = 'auto';
          hud.style.left = `${Math.max(10, Math.min(window.innerWidth - 260, st.hudPos.left))}px`;
          hud.style.top = `${Math.max(10, Math.min(window.innerHeight - 80, st.hudPos.top))}px`;
        }
        if (st?.scraperSettings) {
          activeSettings = { ...activeSettings, ...st.scraperSettings };
          syncHudDirectionButtons();
        }
      });
    } catch {}

    function syncHudDirectionButtons() {
      const up = document.getElementById('natoh-dir-up');
      const down = document.getElementById('natoh-dir-down');
      if (!up || !down) return;
      const isUp = activeSettings.direction !== 'top-down';
      up.style.background = isUp ? '#1d3345' : 'transparent';
      up.style.color = isUp ? '#fff' : '#8fa3b8';
      down.style.background = !isUp ? '#1d3345' : 'transparent';
      down.style.color = !isUp ? '#fff' : '#8fa3b8';
    }

    // Arrastrar HUD desde el header
    const headerEl = document.getElementById('natoh-hud-header');
    let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
    headerEl.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      dragging = true;
      const rect = hud.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      origLeft = rect.left;
      origTop = rect.top;
      headerEl.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const nextLeft = Math.max(8, Math.min(window.innerWidth - hud.offsetWidth - 8, origLeft + (e.clientX - startX)));
      const nextTop = Math.max(8, Math.min(window.innerHeight - 60, origTop + (e.clientY - startY)));
      hud.style.right = 'auto';
      hud.style.bottom = 'auto';
      hud.style.left = `${nextLeft}px`;
      hud.style.top = `${nextTop}px`;
    });
    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      headerEl.style.cursor = 'grab';
      const rect = hud.getBoundingClientRect();
      try { chrome.storage.local.set({ hudPos: { left: rect.left, top: rect.top } }); } catch {}
    });

    // Minimizar / Expandir
    let collapsed = false;
    document.getElementById('natoh-hud-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      collapsed = !collapsed;
      document.getElementById('natoh-hud-body').style.display = collapsed ? 'none' : 'block';
      e.target.textContent = collapsed ? '➕' : '➖';
      hud.style.width = collapsed ? '255px' : '326px';
    });

    document.getElementById('natoh-hud-crm').addEventListener('click', (e) => {
      e.stopPropagation();
      sendBg({ action: 'openCrmDashboard' });
    });

    document.getElementById('natoh-dir-up').addEventListener('click', () => {
      activeSettings.direction = 'bottom-up';
      syncHudDirectionButtons();
      sendBg({ action: 'saveSettings', patch: { direction: 'bottom-up' }, syncToBackend: true });
    });
    document.getElementById('natoh-dir-down').addEventListener('click', () => {
      activeSettings.direction = 'top-down';
      syncHudDirectionButtons();
      sendBg({ action: 'saveSettings', patch: { direction: 'top-down' }, syncToBackend: true });
    });

    document.getElementById('natoh-btn-scrape-view').addEventListener('click', () => {
      sendBg({ action: 'scrapeCurrentView', direction: activeSettings.direction });
      executeScrapeCurrentView({ settings: activeSettings });
    });

    document.getElementById('natoh-btn-next-zone').addEventListener('click', () => {
      stopRequested = false;
      updateHud('Agente 1 GPS...', '#8b5cf6', 'Pidiendo próximo lugar virgen al CRM...');
      sendBg({ action: 'startAgent1Auto' });
    });

    document.getElementById('natoh-btn-pause').addEventListener('click', () => {
      pauseRequested = !pauseRequested;
      updateHud(pauseRequested ? 'En Pausa' : 'Raspando...', pauseRequested ? '#fbbf24' : '#00d4a1');
      sendBg({ action: 'togglePause' });
    });

    document.getElementById('natoh-btn-stop').addEventListener('click', () => {
      stopRequested = true;
      pauseRequested = false;
      isCurrentlyScraping = false;
      updateHud('Detenido', '#fbbf24', 'Raspado detenido por el operador', 'idle');
      sendBg({ action: 'stopScraping' });
    });

    // Polling ligero para contador de tarjetas visibles + chequeo de memoria de zona en vivo
    setInterval(() => {
      try {
        if (!isCurrentlyScraping) {
          const count = collectVisibleCardObjects().length;
          const cardsEl = document.getElementById('natoh-hud-cards');
          const miniEl = document.getElementById('natoh-hud-mini-summary');
          if (cardsEl) cardsEl.textContent = String(count);
          if (miniEl) miniEl.textContent = `📋 ${count} tarjetas`;
          checkCurrentViewZoneMemory(false);
        }
      } catch {}
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(injectFloatingHud, 1000));
  } else {
    setTimeout(injectFloatingHud, 1000);
  }

  /* ───── Listener de mensajes desde Popup / Background ───── */
  chrome.runtime.onMessage.addListener((msg, _, reply) => {
    if (msg.action === 'settingsUpdated' && msg.settings) {
      activeSettings = { ...activeSettings, ...msg.settings };
      return false;
    }

    if (msg.action === 'setPaused') {
      pauseRequested = Boolean(msg.paused);
      updateHud(pauseRequested ? 'En Pausa' : 'Raspando...', pauseRequested ? '#fbbf24' : '#00d4a1');
      return false;
    }

    if (msg.action === 'scrapeCurrentView') {
      reply?.({ success: true });
      executeScrapeCurrentView(msg);
      return true;
    }

    if (msg.action === 'startScrapingQueue' && Array.isArray(msg.queue)) {
      if (msg.settings) activeSettings = { ...activeSettings, ...msg.settings };
      stopRequested = false;
      pauseRequested = false;
      isCurrentlyScraping = true;
      reply?.({ success: true, total: msg.queue.length });

      (async () => {
        updateHud('Cola Manual...', '#00d4a1', `Cola de ${msg.queue.length} búsquedas`, 'starting');
        log(`🚦 Cola iniciada: ${msg.queue.length} combinaciones (${activeSettings.direction === 'bottom-up' ? '⬆️ Abajo→Arriba' : '⬇️ Arriba→Abajo'})`, 'info');

        for (let qIdx = 0; qIdx < msg.queue.length; qIdx++) {
          if (checkStop()) break;
          await waitWhilePaused();
          const { keyword, location } = msg.queue[qIdx];
          const searchQuery = `${keyword} en ${location}`;

          // Anti-repetición en cola manual: si ya fue escaneada y la regla está activa, saltar automáticamente
          if (activeSettings.skipScannedZones) {
            const chk = await sendBg({
              action: 'apiCheckZone',
              payload: { keyword, location, searchQuery }
            });
            if (chk?.ok && chk.data?.alreadyScanned) {
              log(`⏭️ Saltando "${searchQuery}" — ya fue escaneada en el CRM`, 'warn');
              continue;
            }
          }

          try {
            updateHud(`Cola ${qIdx + 1}/${msg.queue.length}`, '#38bdf8', `Buscando: ${searchQuery}`, 'searching');
            await doSearch(searchQuery);
            await waitFor(() => collectVisibleCardObjects().length > 0, 22000);
            await delay(1400);

            const summary = await processLoadedFeed({
              kw: keyword,
              kwLabel: keyword,
              loc: location,
              rawSearch: searchQuery,
              zoneMeta: { zoneName: location },
              isAgent1Auto: false
            });

            if (!checkStop()) {
              await sendBg({
                action: 'apiMarkZoneScanned',
                payload: {
                  zoneName: location,
                  location,
                  keyword,
                  keywordLabel: keyword,
                  searchQuery,
                  googleMapsUrl: window.location.href,
                  scrapeDirection: activeSettings.direction,
                  totalLeadsFound: summary.totalCards || sessionStats.total,
                  validLeadsIngested: sessionStats.qualified,
                  discardedLeads: sessionStats.discarded,
                  duplicatesSkipped: sessionStats.duplicates,
                  source: 'extension_manual'
                }
              });
            }
          } catch (searchErr) {
            log(`❌ Error en "${searchQuery}": ${searchErr.message}`, 'error');
          }
        }

        isCurrentlyScraping = false;
        pauseRequested = false;
        updateHud(checkStop() ? 'Detenido' : 'Completado ✓', checkStop() ? '#fbbf24' : '#34d399', 'Cola manual finalizada', 'done');
        log(checkStop() ? '⏹️ Cola detenida por el usuario' : '🏁 Cola manual completada y guardada en CRM', checkStop() ? 'warn' : 'success');
        notifyScrapingDone();
        sendBg({ action: 'scrapingFinished' });
      })();
      return true;
    }

    if (msg.action === 'stopScraping') {
      stopRequested = true;
      pauseRequested = false;
      isCurrentlyScraping = false;
      updateHud('Detenido', '#fbbf24', 'Señal de parada recibida', 'idle');
      reply?.({ stopped: true });
      log('⏹️ Señal de stop recibida', 'warn');
    }
  });

  log('🟢 NatoH GMaps Scraper Pro (rev-30) activo — Abajo→Arriba sin loops + Memoria CRM');
})();
