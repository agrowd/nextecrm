// content.js – GMaps Leads Scraper (rev-25, 2025-07-14)
//  • mantiene todo lo que ya funcionaba (título, scroll, logs etc.)
//  • agrega pausa "humana" de 3-10 s entre tarjetas
//  • la señal stopScraping detiene ambos bucles de inmediato
//  • extrae título, teléfono, dirección y web con CSS y XPath
//  • FILTRA DUPLICADOS en sesión para evitar envíos innecesarios

(() => {
  /* ───── helpers básicos ───── */
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const rand  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const rwait = () => delay(rand(400, 800));

  const log = (m, l = 'info') => {
    const C = { info: '#3498db', warn: '#f39c12', error: '#e74c3c', success: '#2ecc71' }[l] || '#3498db';
    console.log(`%c[scraper] ${m}`, `color:${C};font-weight:bold`);
    try {
      chrome.runtime.sendMessage({ type: 'scraper-log', level: l, message: m }, (response) => {
        // Ignorar errores de conexión silenciosamente
        if (chrome.runtime.lastError) {
          // El mensaje no se pudo enviar, pero continuamos sin interrumpir el flujo
        }
      });
    } catch (e) {
      // Ignorar errores de envío de mensajes
    }
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

  // Función mejorada para esperar un elemento usando CSS o XPath
  async function waitForInput(timeout = 20000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      // Estrategia 1: Selectores CSS comunes
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
          log(`✅ Input encontrado con selector: ${sel}`, 'success');
          return el;
        }
      }
      
      // Estrategia 2: XPath proporcionado por el usuario
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
            log(`✅ Input encontrado con XPath`, 'success');
            return el;
          }
        } catch (e) {
          // Continuar con el siguiente selector
        }
      }
      
      await delay(200);
    }
    throw new Error('Timeout: No se pudo encontrar el input de búsqueda');
  }

  const xp = (path, ctx = document) =>
    document.evaluate(path, ctx, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

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
  const sentLeads = new Set(); // leads ya enviados en esta sesión
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
  const PHONE_XP  = [
    '//button[contains(@data-item-id,"phone")]/div/div[2]/div[1]',
    '//a[starts-with(@href,"tel:")]'
  ];
  const ADDR_CSS  = ['button[data-item-id="address"]', 'button[data-item-id="address"] .Io6YTe'];
  const ADDR_XP   = ['//button[@data-item-id="address"]/div/div[2]/div[1]'];
  const WEB_CSS   = ['a[data-item-id="authority"]'];
  const WEB_XP    = ['//a[@data-item-id="authority"]'];

  async function getTitleEl(timeout = 20000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      for (const s of TITLE_CSS) {
        const el = document.querySelector(s);
        if (el?.innerText.trim()) return el;
      }
      for (const p of TITLE_XP) {
        const el = xp(p);
        if (el?.textContent.trim()) return el;
      }
      await delay(250);
    }
    throw new Error('Título no cargado');
  }

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
    const maxScrolls = 50; // Aumentar significativamente para casos con muchos resultados
    
    log('📜 Iniciando scroll del feed...', 'info');
    
    // Selectores para el texto "Has llegado al final de la lista"
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
    
    // Función para verificar si llegamos al final
    const checkEndReached = () => {
      const endTexts = ['Has llegado al final de la lista', "You've reached the end of the list"];
      // Buscar con CSS selectors
      for (const selector of END_TEXT_CSS) {
        const el = document.querySelector(selector);
        if (el?.textContent && endTexts.some(t => el.textContent.includes(t))) {
          return true;
        }
      }
      
      // Buscar con XPath
      for (const xpath of END_TEXT_XP) {
        const el = xp(xpath);
        if (el?.textContent && endTexts.some(t => el.textContent.includes(t))) {
          return true;
        }
      }
      
      return false;
    };
    
    while (scrollCount < maxScrolls) {
      feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
      scrollCount++;
      
      // Esperar para que carguen más resultados
      await delay(rand(2000, 3500));
      
      // Verificar si llegamos al final
      if (checkEndReached()) {
        log(`🏁 Scroll ${scrollCount}: ¡Llegamos al final de la lista!`, 'success');
        break;
      }
      
      log(`📈 Scroll ${scrollCount}: Continuando...`, 'info');
    }
    
    const totalCards = cardsList().length;
    log(`✅ Feed scrolleado completamente - ${totalCards} tarjetas encontradas`, 'success');
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
      log(`🔍 Buscando input para: "${q}"`, 'info');
      
      // Buscar el input con múltiples estrategias
      const input = await waitForInput(25000);
      
      if (!input) {
        throw new Error('Input no encontrado después de múltiples intentos');
      }

      // Limpiar el input primero
      input.focus();
      input.click();
      setInputValue(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      await delay(200);
      
      // Escribir la búsqueda
      setInputValue(input, q);
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      await delay(500);
      
      // Disparar eventos de teclado
      ['keydown', 'keyup', 'keypress'].forEach(e =>
        input.dispatchEvent(new KeyboardEvent(e, { key: 'Enter', keyCode: 13, bubbles: true, cancelable: true }))
      );
      await delay(300);
      
      // Buscar y hacer click en el botón de búsqueda con múltiples estrategias
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
          log(`✅ Botón de búsqueda encontrado y clickeado con: ${sel}`, 'success');
          break;
        }
      }
      
      // Si no se encontró el botón, intentar presionar Enter en el input
      if (!buttonClicked) {
        const form = input.closest('form');
        if (form?.requestSubmit) {
          form.requestSubmit();
          buttonClicked = true;
          log('OK: form submit via requestSubmit()', 'info');
        } else if (form) {
          form.submit();
          buttonClicked = true;
          log('OK: form submit()', 'info');
        }
      }

      if (!buttonClicked) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
        await delay(100);
        input.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
        await delay(100);
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
        log(`?o. Enter presionado en input (bot??n no encontrado)`, 'info');
      }
      
      log(`🔎 Búsqueda enviada → ${q}`, 'success');
      await delay(2000); // Esperar a que la búsqueda se procese
      
    } catch (error) {
      log(`❌ Error en doSearch: ${error.message}`, 'error');
      throw error;
    }
  }

  /* ───── utilidades de extracción ───── */
  const getText = (css, xpArr, scope) => {
    for (const s of css)  { const el = scope.querySelector(s); if (el?.innerText.trim()) return el.innerText.trim(); }
    for (const p of xpArr){ const el = xp(p, scope);             if (el?.textContent.trim()) return el.textContent.trim(); }
    return '';
  };
  const getHref = (css, xpArr, scope) => {
    for (const s of css)  { const el = scope.querySelector(s); if (el?.href) return el.href; }
    for (const p of xpArr){ const el = xp(p, scope);           if (el?.href) return el.href; }
    return '';
  };

  /* ───── abrir tarjeta y sacar datos ───── */
  async function openAndExtract(card, kw, loc, tries = 3) {
    for (let at = 0; at < tries; at++) {
      try {
        const anchor = card.querySelector('a[href*="/maps/place/"]') || card;
        anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await rwait(); anchor.click();

        await waitForSel('[role="main"]', 15000);
        const main  = document.querySelector('[role="main"]');
        const title = await getTitleEl();

        const lead = {
          name    : title.textContent.trim(),
          phone   : getText(PHONE_CSS, PHONE_XP, main),
          address : getText(ADDR_CSS,  ADDR_XP,  main),
          website : getHref(WEB_CSS,   WEB_XP,   main),
          keyword : kw,
          location: loc,
          mapsUrl : location.href.split(/[?#]/)[0]
        };

        // Verificar si es duplicado antes de enviar
        if (isDuplicate(lead)) {
          log(`⏭️ Saltando lead duplicado: ${lead.name}`, 'warn');
          return null;
        }

        log(`📇 Lead extraído → ${lead.name}`, 'success');
        return lead;
      } catch (e) {
        log(`⚠️ Intento ${at + 1} fallido: ${e.message}`, 'warn');
        if (at === tries - 1) return null;
        await delay(rand(800, 1200));
      }
    }
  }

  /* ───── backend via background.js ───── */
  const sendLead = l => new Promise(r => {
    try {
      chrome.runtime.sendMessage({ action: 'lead', lead: l }, res => {
        if (chrome.runtime.lastError) {
          log(`❌ Error de conexión al enviar lead: ${chrome.runtime.lastError.message}`, 'error');
          r();
          return;
        }
        res?.ok
          ? log(`✅ Lead enviado: ${l.name}`, 'success')
          : log(`❌ Error envío backend: ${res?.error}`, 'error');
        r();
      });
    } catch (e) {
      log(`❌ Excepción al enviar lead: ${e.message}`, 'error');
      r();
    }
  });

  /* ───── control de parada ───── */
  let stopRequested = false;
  const checkStop = () => stopRequested;

  /* ───── listener desde el popup ───── */
  chrome.runtime.onMessage.addListener((msg, _, reply) => {
    /* --- iniciar cola --- */
    if (msg.action === 'startScrapingQueue' && Array.isArray(msg.queue)) {
      reply?.({ success: true, total: msg.queue.length });
      (async () => {
        log(`🚦 Scraping iniciado – total búsquedas: ${msg.queue.length}`, 'info');
        sentLeads.clear(); // Limpiar duplicados al iniciar nueva sesión
        log(`🧹 Filtro de duplicados reiniciado`, 'info');
        
        outer:
        for (const { keyword, location } of msg.queue) {
          if (checkStop()) break;
          
          try {
            const searchQuery = `${keyword} ${location}`;
            log(`🔍 Iniciando búsqueda: "${searchQuery}"`, 'info');
            
            await doSearch(searchQuery);
            
            // Esperar a que aparezcan las tarjetas con más tiempo y mejor manejo
            log(`⏳ Esperando resultados de búsqueda...`, 'info');
            try {
              await waitFor(() => {
                const cards = cardsList();
                return cards.length > 0;
              }, 25000);
              
              // Dar tiempo adicional para que se carguen más elementos
              await delay(2000);
              
            } catch (e) {
              log(`⚠️ No se encontraron tarjetas para "${searchQuery}": ${e.message}`, 'warn');
              log(`⏭️ Continuando con la siguiente búsqueda...`, 'info');
              continue; // Continuar con la siguiente búsqueda
            }
            
            await scrollFeed();
            const cards = cardsList();
            log(`📋 ${cards.length} tarjetas encontradas para "${searchQuery}"`, 'info');
            
            if (cards.length === 0) {
              log(`⚠️ No hay tarjetas para procesar en "${searchQuery}"`, 'warn');
              continue;
            }

            for (let i = 0; i < cards.length; i++) {
              if (checkStop()) break outer;
              log(`➡️ Procesando tarjeta (${i + 1}/${cards.length})`, 'info');
              const lead = await openAndExtract(cards[i], keyword, location);
              if (lead) await sendLead(lead);
              /* pausa "humana" de 3-10 s */
              await delay(rand(3000, 10000));
            }
          } catch (searchError) {
            log(`❌ Error procesando búsqueda "${keyword} ${location}": ${searchError.message}`, 'error');
            log(`⏭️ Continuando con la siguiente búsqueda...`, 'info');
            continue; // Continuar con la siguiente búsqueda en lugar de detener todo
          }
        }
        checkStop()
          ? log('⏹️ Scraping detenido por usuario', 'warn')
          : log('🏁 Scraping finalizado', 'success');

        notifyScrapingDone();
        try {
          chrome.runtime.sendMessage({ action: 'scrapingFinished' }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn('Error al notificar finalización:', chrome.runtime.lastError.message);
            }
          });
        } catch (e) {
          console.warn('Excepción al notificar finalización:', e.message);
        }
      })();
      return true; // keep port open
    }

    /* --- detener --- */
    if (msg.action === 'stopScraping') {
      stopRequested = true;
      reply?.({ stopped: true });
      log('⏸️ Señal de stop recibida', 'warn');
    }
  });

  log('🟢 GMaps Leads Scraper cargado (rev-25) - Filtro de duplicados activo');
})();
