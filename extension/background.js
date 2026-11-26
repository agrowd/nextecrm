// background.js - NatoH Systems GMaps Leads Scraper Pro (rev-30)
// Hub central: API CRM sin bloqueos Mixed-Content, memoria anti-repetición, logs persistentes y control Agente 1

const DEFAULT_BACKEND = 'http://149.50.128.73:8484';
const DEFAULT_CRM_URL = 'http://149.50.128.73:8080';

const DEFAULT_SETTINGS = {
  direction: 'bottom-up',       // 'bottom-up' (Abajo -> Arriba) | 'top-down' (Arriba -> Abajo)
  skipExistingLeads: true,      // Pre-chequear contra MongoDB y saltar negocios ya en CRM sin cliquear
  skipScannedZones: true,       // Evitar repetir lugares/zonas ya escaneadas
  speedPreset: 'balanced'       // 'safe' | 'balanced' | 'fast'
};

// Estado global de la sesión de scraping
let state = {
  scrapingActive: false,
  paused: false,
  autoAgentMode: false,
  autoAgentCity: '',
  autoAgentRubro: '',
  currentTabId: null,
  awaitingTabLoad: false,
  currentTargetLabel: '',
  progress: {
    current: 0,
    total: 0,
    qualified: 0,
    duplicates: 0,
    discarded: 0,
    errors: 0,
    direction: 'bottom-up',
    phase: 'idle'
  },
  recentLogs: []
};

const safeRuntimeSend = (msg) => {
  try {
    chrome.runtime.sendMessage(msg, () => {
      if (chrome.runtime.lastError) {}
    });
  } catch {}
};

const safeTabSend = (tabId, msg, cb) => {
  if (!tabId) {
    if (cb) cb(null, { message: 'No tabId' });
    return;
  }
  try {
    chrome.tabs.sendMessage(tabId, msg, (res) => {
      if (chrome.runtime.lastError) {
        if (cb) cb(null, chrome.runtime.lastError);
        return;
      }
      if (cb) cb(res, null);
    });
  } catch (err) {
    if (cb) cb(null, err);
  }
};

const normalizeBackendUrl = (url) => {
  if (!url) return '';
  let out = String(url).trim();
  if (!out) return '';
  if (!/^https?:\/\//i.test(out)) out = `http://${out}`;
  return out.replace(/\/+$/, '');
};

const getBackendUrl = async () => {
  try {
    const { backendUrl } = await chrome.storage.local.get('backendUrl');
    return normalizeBackendUrl(backendUrl) || DEFAULT_BACKEND;
  } catch {
    return DEFAULT_BACKEND;
  }
};

const getCrmDashboardUrl = async () => {
  const backend = await getBackendUrl();
  try {
    const u = new URL(backend);
    if (u.port === '8484') {
      u.port = '8080';
      return u.toString().replace(/\/+$/, '');
    }
    return DEFAULT_CRM_URL;
  } catch {
    return DEFAULT_CRM_URL;
  }
};

const getSettings = async () => {
  try {
    const { scraperSettings } = await chrome.storage.local.get('scraperSettings');
    return { ...DEFAULT_SETTINGS, ...(scraperSettings || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

const saveSettings = async (patch = {}, syncToBackend = false) => {
  const current = await getSettings();
  const next = { ...current, ...patch };
  try {
    await chrome.storage.local.set({ scraperSettings: next });
  } catch {}
  if (syncToBackend) {
    try {
      const baseUrl = await getBackendUrl();
      await fetch(`${baseUrl}/api/scraper/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultDirection: next.direction,
          skipExistingLeads: next.skipExistingLeads,
          skipScannedZones: next.skipScannedZones,
          speedPreset: next.speedPreset
        })
      });
    } catch {}
  }
  return next;
};

const syncSettingsFromCrm = async () => {
  try {
    const baseUrl = await getBackendUrl();
    const r = await fetch(`${baseUrl}/api/scraper/config`, { method: 'GET' });
    if (!r.ok) return await getSettings();
    const data = await r.json();
    if (data?.success && data.config) {
      const merged = await saveSettings({
        direction: data.config.defaultDirection || DEFAULT_SETTINGS.direction,
        skipExistingLeads: data.config.skipExistingLeads !== false,
        skipScannedZones: data.config.skipScannedZones !== false,
        speedPreset: data.config.speedPreset || DEFAULT_SETTINGS.speedPreset
      }, false);
      return merged;
    }
  } catch {}
  return await getSettings();
};

const emitLog = (message, level = 'info') => {
  const entry = {
    ts: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    level,
    message: String(message || '')
  };
  state.recentLogs.push(entry);
  if (state.recentLogs.length > 60) state.recentLogs.shift();
  try {
    chrome.storage.local.set({ recentLogs: state.recentLogs });
  } catch {}
  console.log(`[background][${level}] ${message}`);
  safeRuntimeSend({ type: 'scraper-log', level, message, ts: entry.ts });
};

const broadcastState = () => {
  safeRuntimeSend({ type: 'scraper-state', state });
};

/* ───── API Wrappers hacia el VPS / CRM ───── */
async function apiFetchJson(path, options = {}) {
  const baseUrl = await getBackendUrl();
  const r = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  let data = null;
  try { data = await r.json(); } catch {}
  if (!r.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${r.status}`);
  }
  return data;
}

async function postLead(lead, retries = 3) {
  const baseUrl = await getBackendUrl();
  let lastErr = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const r = await fetch(`${baseUrl}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lead, skipAutoZoneMark: true })
      });
      let json = null;
      try { json = await r.json(); } catch {}
      if (!r.ok) {
        throw new Error(json?.error || `HTTP ${r.status}`);
      }
      return json;
    } catch (err) {
      lastErr = err;
      console.warn(`Intento ${attempt}/${retries} fallido enviando lead ${lead.name}: ${err.message}`);
      if (attempt < retries) {
        await new Promise(res => setTimeout(res, 1200 * attempt));
      }
    }
  }
  throw lastErr;
}

async function fetchNextAgentTarget(city = '', rubro = '', exclude = []) {
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (rubro) params.set('rubro', rubro);
  if (Array.isArray(exclude) && exclude.length > 0) params.set('exclude', exclude.join(','));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return await apiFetchJson(`/api/scraper/next-target${qs}`, { method: 'GET' });
}

async function markZoneScannedInBackend(payload = {}) {
  if (!payload.zoneId && !payload.zoneName && !payload.location && !payload.keyword) return null;
  try {
    const res = await apiFetchJson('/api/scraper/mark-scanned', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const zLabel = res?.scannedZone?.zoneName || payload.zoneName || payload.location || payload.zoneId;
    const kLabel = res?.scannedZone?.keywordLabel || payload.keywordLabel || payload.keyword;
    emitLog(`🗺️ Guardado en memoria CRM (no se repetirá): ${zLabel} · ${kLabel} (${payload.validLeadsIngested || 0} calif.)`, 'success');
    return res;
  } catch (err) {
    emitLog(`⚠️ No se pudo guardar zona en CRM: ${err.message}`, 'warn');
    return null;
  }
}

/* ───── Lanzar siguiente objetivo virgen de Agente 1 ───── */
async function launchNextAgentTarget() {
  if (!state.scrapingActive || !state.autoAgentMode || !state.currentTabId) return;
  try {
    emitLog('🤖 Consultando próximo lugar virgen al CRM (Agente 1)...', 'info');
    const settings = await getSettings();
    const data = await fetchNextAgentTarget(state.autoAgentCity, state.autoAgentRubro);
    const targetObj = data?.target || data;

    if (!data?.success || !targetObj?.zone || !targetObj?.rubro) {
      emitLog('🏁 Agente 1 no encontró más objetivos disponibles.', 'success');
      stopScraping();
      safeRuntimeSend({ action: 'scrapingFinished' });
      return;
    }

    if (data.allExhausted && settings.skipScannedZones) {
      emitLog('🏁 ¡100% de las zonas habilitadas ya fueron escaneadas! Agregá nuevos lugares desde el CRM.', 'success');
      stopScraping();
      safeRuntimeSend({ action: 'scrapingFinished' });
      return;
    }

    const { zone, rubro, googleMapsUrl, searchQuery } = targetObj;
    const provTag = zone.province ? ` [${zone.province}]` : '';
    state.currentTargetLabel = `${rubro.label} · ${zone.name}`;
    emitLog(
      data.isAiRecommended
        ? `🧠 Ruta IA${provTag}: ${rubro.label} en ${zone.name}`
        : `🎯 Objetivo virgen${provTag}: ${rubro.label} en ${zone.name}`,
      'success'
    );
    broadcastState();

    state.awaitingTabLoad = true;
    await chrome.tabs.update(state.currentTabId, { url: googleMapsUrl });

    const waitAndStart = (attempts = 0) => {
      if (!state.scrapingActive || !state.currentTabId) return;
      chrome.tabs.get(state.currentTabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          stopScraping();
          return;
        }
        if (tab.status === 'complete') {
          state.awaitingTabLoad = false;
          setTimeout(async () => {
            if (!state.scrapingActive || !state.currentTabId) return;
            const activeSettings = await getSettings();
            safeTabSend(state.currentTabId, {
              action: 'scrapeCurrentView',
              keyword: rubro.id,
              keywordLabel: rubro.label,
              searchQuery: searchQuery || `${rubro.query} ${zone.name}`,
              location: zone.name,
              zoneId: zone.id,
              zoneName: zone.name,
              city: zone.city,
              province: zone.province || '',
              center: zone.center,
              zoom: zone.zoom,
              googleMapsUrl,
              aiReason: data.reason || '',
              isAiRecommended: Boolean(data.isAiRecommended),
              isAgent1Auto: true,
              settings: activeSettings
            }, (resp, err) => {
              if (err || !resp?.success) {
                if (attempts < 10) {
                  setTimeout(() => waitAndStart(attempts + 1), 1500);
                } else {
                  emitLog('❌ No se pudo conectar con content.js tras cargar Maps', 'error');
                  stopScraping();
                }
              }
            });
          }, 2600);
        } else if (attempts < 24) {
          setTimeout(() => waitAndStart(attempts + 1), 1000);
        }
      });
    };

    setTimeout(() => waitAndStart(0), 2200);
  } catch (err) {
    emitLog(`❌ Error obteniendo objetivo de Agente 1: ${err.message}`, 'error');
    stopScraping();
    safeRuntimeSend({ action: 'scrapingFinished' });
  }
}

function stopScraping() {
  if (state.currentTabId) {
    safeTabSend(state.currentTabId, { action: 'stopScraping' });
  }
  state.scrapingActive = false;
  state.paused = false;
  state.autoAgentMode = false;
  state.awaitingTabLoad = false;
  state.currentTabId = null;
  state.progress.phase = 'idle';
  broadcastState();
  console.log('🛑 Scraping detenido desde background');
}

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === state.currentTabId) {
    emitLog('📑 Pestaña cerrada, deteniendo scraping', 'warn');
    stopScraping();
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (state.scrapingActive && !state.awaitingTabLoad && tabId === state.currentTabId && changeInfo.url) {
    if (!changeInfo.url.includes('google.com/maps') && !changeInfo.url.includes('google.com.ar/maps')) {
      emitLog('🔄 La pestaña salió de Google Maps, deteniendo scraping', 'warn');
      stopScraping();
    }
  }
});

// Sincronizar config desde CRM al iniciar el Service Worker
syncSettingsFromCrm().catch(() => {});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 1. Ingesta de lead individual
  if (msg.action === 'lead') {
    postLead(msg.lead)
      .then((res) => sendResponse({ ok: true, data: res }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  // 2. Proxy de endpoints /api/scraper/* para content.js y popup.js (evita Mixed Content HTTPS -> HTTP)
  if (msg.action === 'apiCheckZone') {
    apiFetchJson('/api/scraper/check-zone', { method: 'POST', body: JSON.stringify(msg.payload || {}) })
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.action === 'apiCheckPlaces') {
    apiFetchJson('/api/scraper/check-places', { method: 'POST', body: JSON.stringify({ places: msg.places || [] }) })
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.action === 'apiGetCatalog') {
    apiFetchJson('/api/scraper/catalog', { method: 'GET' })
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.action === 'apiGetNextTarget') {
    fetchNextAgentTarget(msg.city || '', msg.rubro || '', msg.exclude || [])
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.action === 'apiGetZonesHistory') {
    apiFetchJson(`/api/scraper/zones-history?limit=${msg.limit || 200}`, { method: 'GET' })
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.action === 'apiDeleteScannedZone') {
    apiFetchJson(`/api/scraper/zones-history/${encodeURIComponent(msg.id)}`, { method: 'DELETE' })
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.action === 'apiMarkZoneScanned') {
    markZoneScannedInBackend(msg.payload || {})
      .then(data => sendResponse({ ok: Boolean(data), data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.action === 'apiSaveConfig') {
    apiFetchJson('/api/scraper/config', { method: 'PUT', body: JSON.stringify(msg.payload || {}) })
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.action === 'apiGetAiRoutePlan') {
    apiFetchJson(`/api/scraper/ai-route-plan${msg.force ? '?force=true' : ''}`, { method: 'GET' })
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.action === 'apiRunAiRoutePlan') {
    apiFetchJson('/api/scraper/ai-plan-route', { method: 'POST', body: JSON.stringify({ focus: msg.focus || 'national' }) })
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.action === 'apiAnalyzeAll') {
    apiFetchJson('/api/scraper/analyze-all', { method: 'POST', body: JSON.stringify({}) })
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.action === 'apiCheckpointZone') {
    apiFetchJson('/api/scraper/mark-scanned', {
      method: 'POST',
      body: JSON.stringify({ ...(msg.payload || {}), isCheckpoint: true })
    })
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.action === 'openCrmDashboard') {
    getCrmDashboardUrl().then(url => {
      chrome.tabs.create({ url });
      sendResponse({ ok: true, url });
    });
    return true;
  }

  // 3. Settings & Estado compartido
  if (msg.action === 'getSettings') {
    (msg.syncCrm ? syncSettingsFromCrm() : getSettings())
      .then(settings => sendResponse({ ok: true, settings }));
    return true;
  }

  if (msg.action === 'saveSettings') {
    saveSettings(msg.patch || {}, Boolean(msg.syncToBackend))
      .then(settings => {
        if (state.currentTabId) {
          safeTabSend(state.currentTabId, { action: 'settingsUpdated', settings });
        }
        sendResponse({ ok: true, settings });
      });
    return true;
  }

  if (msg.action === 'getScrapingStatus') {
    chrome.storage.local.get(['recentLogs', 'scraperSettings'], (stored) => {
      if (state.recentLogs.length === 0 && Array.isArray(stored.recentLogs)) {
        state.recentLogs = stored.recentLogs;
      }
      sendResponse({
        ...state,
        settings: { ...DEFAULT_SETTINGS, ...(stored.scraperSettings || {}) }
      });
    });
    return true;
  }

  // 4. Sincronización de progreso y logs desde content.js
  if (msg.type === 'scraper-log') {
    const entry = {
      ts: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      level: msg.level || 'info',
      message: String(msg.message || '')
    };
    state.recentLogs.push(entry);
    if (state.recentLogs.length > 60) state.recentLogs.shift();
    try { chrome.storage.local.set({ recentLogs: state.recentLogs }); } catch {}
    return false;
  }

  if (msg.action === 'progressUpdate') {
    state.progress = { ...state.progress, ...(msg.progress || {}) };
    if (msg.currentTargetLabel) state.currentTargetLabel = msg.currentTargetLabel;
    if (typeof msg.paused === 'boolean') state.paused = msg.paused;
    broadcastState();
    return false;
  }

  // 5. Control de ejecución (Inicio / Pausa / Reanudar / Stop)
  if (msg.action === 'startScrapingQueue' || msg.action === 'scrapeCurrentView') {
    state.scrapingActive = true;
    state.paused = false;
    state.autoAgentMode = Boolean(msg.isAgent1Auto);
    state.currentTabId = msg.tabId || sender.tab?.id || state.currentTabId;
    state.progress = { current: 0, total: 0, qualified: 0, duplicates: 0, discarded: 0, errors: 0, direction: msg.direction || 'bottom-up', phase: 'starting' };
    broadcastState();
    sendResponse({ ok: true });
    return false;
  }

  if (msg.action === 'startAgent1Auto') {
    state.scrapingActive = true;
    state.paused = false;
    state.autoAgentMode = true;
    state.autoAgentCity = msg.city || '';
    state.autoAgentRubro = msg.rubro || '';
    state.currentTabId = msg.tabId || sender.tab?.id || state.currentTabId;
    state.progress = { current: 0, total: 0, qualified: 0, duplicates: 0, discarded: 0, errors: 0, direction: 'bottom-up', phase: 'fetching_target' };
    broadcastState();
    sendResponse({ success: true });
    launchNextAgentTarget();
    return false;
  }

  if (msg.action === 'togglePause') {
    state.paused = !state.paused;
    if (state.currentTabId) {
      safeTabSend(state.currentTabId, { action: 'setPaused', paused: state.paused });
    }
    emitLog(state.paused ? '⏸️ Raspado en pausa' : '▶️ Raspado reanudado', 'warn');
    broadcastState();
    sendResponse({ ok: true, paused: state.paused });
    return false;
  }

  if (msg.action === 'zoneFinished') {
    (async () => {
      if (!msg.skipMarkScanned) {
        await markZoneScannedInBackend({
          zoneId: msg.zoneId || '',
          zoneName: msg.zoneName || msg.location || '',
          location: msg.location || msg.zoneName || '',
          city: msg.city || 'custom',
          province: msg.province || '',
          keyword: msg.keyword || '',
          keywordLabel: msg.keywordLabel || msg.keyword || '',
          searchQuery: msg.searchQuery || '',
          googleMapsUrl: msg.googleMapsUrl || '',
          center: msg.center,
          zoom: msg.zoom,
          sampleAddresses: msg.sampleAddresses || [],
          scrapeDirection: msg.direction || 'bottom-up',
          totalLeadsFound: msg.totalCards || msg.leadsFound || 0,
          validLeadsIngested: msg.qualifiedCount || 0,
          discardedLeads: msg.discardedCount || 0,
          duplicatesSkipped: msg.duplicatesCount || 0,
          status: msg.status || 'completed',
          isCheckpoint: Boolean(msg.alreadyCheckpointed),
          source: msg.isAgent1Auto ? 'extension_auto' : 'extension_manual'
        });
      }

      if (state.scrapingActive && state.autoAgentMode && !msg.stopped) {
        emitLog('⏭️ Avanzando automáticamente al próximo lugar virgen...', 'info');
        setTimeout(() => launchNextAgentTarget(), 2500);
      } else {
        state.scrapingActive = false;
        state.paused = false;
        state.autoAgentMode = false;
        state.currentTabId = null;
        state.progress.phase = 'done';
        broadcastState();
        safeRuntimeSend({ action: 'scrapingFinished' });
      }
    })();
    sendResponse({ ok: true });
    return false;
  }

  if (msg.action === 'scrapingFinished') {
    if (!state.autoAgentMode) {
      state.scrapingActive = false;
      state.paused = false;
      state.currentTabId = null;
      state.progress.phase = 'done';
      broadcastState();
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
