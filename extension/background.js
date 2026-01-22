// background.js - GMaps Leads Scraper (rev-17, julio 2025)
const DEFAULT_BACKEND = 'http://localhost:3001';

// Estado global del scraping
let scrapingActive = false;
let currentTabId = null;

const safeRuntimeSend = (msg) => {
  chrome.runtime.sendMessage(msg, () => {
    if (chrome.runtime.lastError) {
      // Ignore when no extension pages are listening.
    }
  });
};

const safeTabSend = (tabId, msg) => {
  chrome.tabs.sendMessage(tabId, msg, () => {
    if (chrome.runtime.lastError) {
      // Ignore when the content script is not available.
    }
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

async function postLead(lead) {
  try {
    const baseUrl = await getBackendUrl();
    const r = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    console.log(`Lead enviado al backend: ${lead.name}`);
    return r.json();
  } catch (err) {
    console.error(`Error enviando lead: ${err.message}`);
    throw err;
  }
}

// Función para detener el scraping
function stopScraping() {
  if (scrapingActive && currentTabId) {
    safeTabSend(currentTabId, { action: 'stopScraping' });
    scrapingActive = false;
    currentTabId = null;
    console.log('🛑 Scraping detenido desde background');
  }
}

// Detectar cuando se cierra una pestaña
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === currentTabId) {
    console.log('📑 Pestaña cerrada, deteniendo scraping');
    stopScraping();
  }
});

// Detectar cuando se cambia de pestaña
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (scrapingActive && activeInfo.tabId !== currentTabId) {
    console.log('🔄 Cambio de pestaña detectado, deteniendo scraping');
    stopScraping();
  }
});

// Detectar cuando se actualiza una pestaña
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (scrapingActive && tabId === currentTabId && changeInfo.status === 'loading') {
    console.log('🔄 Pestaña actualizada, deteniendo scraping');
    stopScraping();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'lead') {
    postLead(msg.lead)
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;               // puerto abierto
  }
  
  if (msg.action === 'startScrapingQueue') {
    // Marcar que el scraping está activo
    scrapingActive = true;
    currentTabId = sender.tab.id;
    console.log(`🚀 Scraping iniciado en pestaña ${currentTabId}`);
  }
  
  if (msg.action === 'scrapingFinished') {
    // Marcar que el scraping terminó
    scrapingActive = false;
    currentTabId = null;
    console.log('✅ Scraping finalizado');
  }
  
  if (msg.type === 'scraper-log' || msg.action === 'scrapingFinished' || msg.action === 'stopScraping') {
    safeRuntimeSend(msg);  // reenvío al popup
  }
});

// evita warning del service-worker
self.addEventListener('fetch', e => {
  if (e.preloadResponse) e.waitUntil(e.preloadResponse);
});

console.log('🟢 GMaps Leads Scraper background.js cargado (rev-17)');
