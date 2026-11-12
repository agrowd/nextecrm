// background.js - GMaps Leads Scraper (rev-27, NatoH Systems GPS Sync + In-Page HUD)
const DEFAULT_BACKEND = 'http://149.50.128.73:8484';

// Estado global del scraping
let scrapingActive = false;
let autoAgentMode = false;
let autoAgentCity = '';
let autoAgentRubro = '';
let currentTabId = null;
let awaitingTabLoad = false;

const safeRuntimeSend = (msg) => {
  chrome.runtime.sendMessage(msg, () => {
    if (chrome.runtime.lastError) {
      // Ignore when no extension pages are listening.
    }
  });
};

const safeTabSend = (tabId, msg, cb) => {
  chrome.tabs.sendMessage(tabId, msg, (res) => {
    if (chrome.runtime.lastError) {
      if (cb) cb(null, chrome.runtime.lastError);
      return;
    }
    if (cb) cb(res, null);
  });
};

const normalizeBackendUrl = (url) => {
  if (!url) return '';
  let out = String(url).trim();
  if (!out) return '';
  if (!/^https?:\/\//i.test(out)) out = `http://${out}`;
  out = out.replace(/\/+$/, '');
  return out;
};

const getBackendUrl = async () => {
  try {
    const { backendUrl } = await chrome.storage.local.get('backendUrl');
    return normalizeBackendUrl(backendUrl) || DEFAULT_BACKEND;
  } catch {
    return DEFAULT_BACKEND;
  }
};

const emitLog = (message, level = 'info') => {
  console.log(`[background][${level}] ${message}`);
  safeRuntimeSend({ type: 'scraper-log', level, message });
};

async function postLead(lead, retries = 3) {
  const baseUrl = await getBackendUrl();
  let lastErr = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const r = await fetch(`${baseUrl}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      console.log(`Lead enviado al backend: ${lead.name}`);
      return await r.json();
    } catch (err) {
      lastErr = err;
      console.warn(`Intento ${attempt}/${retries} fallido enviando lead ${lead.name}: ${err.message}`);
      if (attempt < retries) {
        await new Promise(res => setTimeout(res, 1500 * attempt));
      }
    }
  }
  throw lastErr;
}

async function fetchNextAgentTarget(city = '', rubro = '') {
  const baseUrl = await getBackendUrl();
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (rubro) params.set('rubro', rubro);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const r = await fetch(`${baseUrl}/api/scraper/next-target${qs}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}

async function markZoneScannedInBackend(zoneId, keyword, leadsFound = 0, zoneName = '') {
  if (!zoneId || !keyword) return;
  try {
    const baseUrl = await getBackendUrl();
    await fetch(`${baseUrl}/api/scraper/mark-scanned`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zoneId,
        zoneName: zoneName || zoneId,
        keyword,
        totalLeadsFound: leadsFound,
        validLeadsIngested: leadsFound
      })
    });
    emitLog(`🗺️ Zona marcada como escaneada: ${zoneId} (${keyword}) -> ${leadsFound} leads`, 'success');
  } catch (err) {
    emitLog(`⚠️ No se pudo marcar zona en backend: ${err.message}`, 'warn');
  }
}

// Lanzar siguiente objetivo de Agente 1
async function launchNextAgentTarget() {
  if (!scrapingActive || !autoAgentMode || !currentTabId) return;
  try {
    emitLog('🤖 Consultando próximo objetivo GPS a Agente 1 (NatoH Systems)...', 'info');
    const data = await fetchNextAgentTarget(autoAgentCity, autoAgentRubro);
    const targetObj = data?.target || data;
    if (!data?.success || !targetObj?.zone || !targetObj?.rubro) {
      emitLog('🏁 Agente 1 completó todas las zonas disponibles.', 'success');
      stopScraping();
      safeRuntimeSend({ action: 'scrapingFinished' });
      return;
    }

    const { zone, rubro, googleMapsUrl, searchQuery } = targetObj;
    emitLog(`🎯 Objetivo Agente 1: ${rubro.label} en ${zone.name}`, 'success');

    awaitingTabLoad = true;
    await chrome.tabs.update(currentTabId, { url: googleMapsUrl });

    // Esperar a que la pestaña termine de cargar y enviar orden a content.js
    const waitAndStart = (attempts = 0) => {
      if (!scrapingActive || !currentTabId) return;
      chrome.tabs.get(currentTabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          stopScraping();
          return;
        }
        if (tab.status === 'complete') {
          awaitingTabLoad = false;
          setTimeout(() => {
            if (!scrapingActive || !currentTabId) return;
            safeTabSend(currentTabId, {
              action: 'scrapeCurrentView',
              keyword: rubro.id,
              searchQuery: searchQuery || `${rubro.query} ${zone.name}`,
              location: zone.name,
              zoneId: zone.id,
              zoneName: zone.name,
              isAgent1Auto: true
            }, (resp, err) => {
              if (err || !resp?.success) {
                if (attempts < 8) {
                  setTimeout(() => waitAndStart(attempts + 1), 1500);
                } else {
                  emitLog('❌ No se pudo conectar con content.js tras cargar Maps', 'error');
                  stopScraping();
                }
              }
            });
          }, 2500);
        } else if (attempts < 20) {
          setTimeout(() => waitAndStart(attempts + 1), 1000);
        }
      });
    };

    setTimeout(() => waitAndStart(0), 2000);
  } catch (err) {
    emitLog(`❌ Error obteniendo objetivo de Agente 1: ${err.message}`, 'error');
    stopScraping();
    safeRuntimeSend({ action: 'scrapingFinished' });
  }
}

// Función para detener el scraping
function stopScraping() {
  if (currentTabId) {
    safeTabSend(currentTabId, { action: 'stopScraping' });
  }
  scrapingActive = false;
  autoAgentMode = false;
  awaitingTabLoad = false;
  currentTabId = null;
  console.log('🛑 Scraping detenido desde background');
}

// Detectar cuando se cierra la pestaña donde corre el scraper
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === currentTabId) {
    console.log('📑 Pestaña cerrada, deteniendo scraping');
    stopScraping();
  }
});

// Detectar solo si la pestaña del scraper sale de Google Maps
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (scrapingActive && !awaitingTabLoad && tabId === currentTabId && changeInfo.url) {
    if (!changeInfo.url.includes('google.com/maps')) {
      console.log('🔄 La pestaña salió de Google Maps, deteniendo scraping');
      stopScraping();
    }
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'lead') {
    postLead(msg.lead)
      .then((res) => sendResponse({ ok: true, data: res }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.action === 'getScrapingStatus') {
    sendResponse({ scrapingActive, autoAgentMode, currentTabId });
    return false;
  }

  if (msg.action === 'startScrapingQueue' || msg.action === 'scrapeCurrentView') {
    scrapingActive = true;
    autoAgentMode = Boolean(msg.isAgent1Auto);
    currentTabId = msg.tabId || sender.tab?.id || currentTabId;
    console.log(`🚀 Scraping activo en pestaña ${currentTabId}`);
  }

  if (msg.action === 'startAgent1Auto') {
    scrapingActive = true;
    autoAgentMode = true;
    autoAgentCity = msg.city || '';
    autoAgentRubro = msg.rubro || '';
    currentTabId = msg.tabId || sender.tab?.id || currentTabId;
    sendResponse({ success: true });
    launchNextAgentTarget();
    return false;
  }

  if (msg.action === 'zoneFinished') {
    (async () => {
      await markZoneScannedInBackend(msg.zoneId, msg.keyword, msg.leadsFound || 0, msg.zoneName);
      if (scrapingActive && autoAgentMode && !msg.stopped) {
        emitLog('⏭️ Avanzando automáticamente a la siguiente zona GPS...', 'info');
        setTimeout(() => launchNextAgentTarget(), 2500);
      } else {
        scrapingActive = false;
        autoAgentMode = false;
        currentTabId = null;
        safeRuntimeSend({ action: 'scrapingFinished' });
      }
    })();
    sendResponse({ ok: true });
    return false;
  }

  if (msg.action === 'scrapingFinished') {
    if (!autoAgentMode) {
      scrapingActive = false;
      currentTabId = null;
      console.log('✅ Scraping finalizado');
      safeRuntimeSend(msg);
    }
    return false;
  }

  if (msg.action === 'stopScraping') {
    stopScraping();
    sendResponse({ stopped: true });
    return false;
  }
});
