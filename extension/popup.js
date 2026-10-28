// popup.js – GMaps Leads Scraper (rev-26, Ariadne Agent 1 GPS Sync)
const DEFAULT_BACKEND = 'http://149.50.128.73:8484';

const kwInp = document.getElementById('keywords');
const locInp = document.getElementById('locations');
const startBtn = document.getElementById('startBtn');
const agent1Btn = document.getElementById('agent1Btn');
const currentViewBtn = document.getElementById('currentViewBtn');
const stopBtn = document.getElementById('stopBtn');
const logBox = document.getElementById('logArea');
const backendInp = document.getElementById('backendUrl');
const backendSaveBtn = document.getElementById('saveBackendBtn');
const backendStatus = document.getElementById('backendStatus');
const backendDot = document.getElementById('backendDot');
const backendRefresh = document.getElementById('backendRefresh');

let running = false;
let tabId = null;
const COLORS = { info: '#38bdf8', warn: '#facc15', error: '#f87171', success: '#4ade80' };

const log = (t, l = 'info') => {
  const div = document.createElement('div');
  div.style.color = COLORS[l] || '#cbd5e1';
  div.textContent = t;
  logBox.appendChild(div);
  logBox.scrollTop = logBox.scrollHeight;
};

const setRunningUI = (isRunning) => {
  running = isRunning;
  startBtn.disabled = isRunning;
  agent1Btn.disabled = isRunning;
  currentViewBtn.disabled = isRunning;
  stopBtn.style.display = isRunning ? 'block' : 'none';
};

const normalizeBackendUrl = (url) => {
  if (!url) return '';
  let out = String(url).trim();
  if (!out) return '';
  if (!/^https?:\/\//i.test(out)) out = `http://${out}`;
  out = out.replace(/\/+$/, '');
  return out;
};

const formatUptime = (secs) => {
  const total = Math.max(0, Math.floor(secs));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const setBackendStatus = (ok, text) => {
  backendStatus.textContent = text;
  backendDot.classList.toggle('ok', ok);
};

const refreshBackendStatus = async () => {
  const url = normalizeBackendUrl(backendInp.value) || DEFAULT_BACKEND;
  try {
    const res = await fetch(`${url}/health`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const uptime = typeof data.uptime === 'number' ? formatUptime(data.uptime) : null;
    setBackendStatus(true, uptime ? `Conectado (${uptime})` : 'Conectado');
  } catch {
    setBackendStatus(false, 'Desconectado');
  }
};

const loadBackendUrl = async () => {
  const { backendUrl } = await chrome.storage.local.get('backendUrl');
  const normalized = normalizeBackendUrl(backendUrl) || DEFAULT_BACKEND;
  backendInp.value = normalized;
  if (!backendUrl) {
    await chrome.storage.local.set({ backendUrl: normalized });
  }
  await refreshBackendStatus();
};

const parse = s => s.split(',').map(x => x.trim()).filter(Boolean);

// Producto cartesiano completo: todos los rubros × todas las ubicaciones
const queue = (k, l) => {
  const r = [];
  for (const kw of k) {
    for (const loc of l) {
      r.push({ keyword: kw, location: loc });
    }
  }
  return r;
};

backendSaveBtn.onclick = async () => {
  const normalized = normalizeBackendUrl(backendInp.value);
  if (!normalized) {
    log('URL de backend inválida', 'warn');
    setBackendStatus(false, 'Desconectado');
    return;
  }
  await chrome.storage.local.set({ backendUrl: normalized });
  backendInp.value = normalized;
  await refreshBackendStatus();
  log('URL de backend guardada', 'success');
};

backendRefresh.onclick = () => {
  refreshBackendStatus();
};

// Sincronizar estado si ya estaba corriendo en background
chrome.runtime.sendMessage({ action: 'getScrapingStatus' }, (st) => {
  if (st?.scrapingActive) {
    tabId = st.currentTabId;
    setRunningUI(true);
    log(st.autoAgentMode ? '🤖 Modo Auto-Agente 1 en ejecución...' : '🚀 Scraping en ejecución...', 'info');
  }
});

loadBackendUrl();

// 1. Modo Autónomo Agente 1 (Zonas GPS desde VPS)
agent1Btn.onclick = async () => {
  if (running) return;
  setRunningUI(true);

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    log('No se encontró pestaña activa', 'error');
    setRunningUI(false);
    return;
  }

  tabId = tab.id;
  log('🤖 Iniciando Modo Autónomo Agente 1 (Zonas GPS)...', 'info');
  chrome.runtime.sendMessage({
    action: 'startAgent1Auto',
    tabId: tab.id
  }, (resp) => {
    if (chrome.runtime.lastError || !resp?.success) {
      log('Error al iniciar Agente 1 en background', 'error');
      setRunningUI(false);
    }
  });
};

// 2. Raspar Vista Actual de Google Maps (sin volver a buscar en el input)
currentViewBtn.onclick = async () => {
  if (running) return;
  setRunningUI(true);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url?.includes('google.com/maps')) {
    log('Abre Google Maps antes de raspar la vista actual', 'error');
    setRunningUI(false);
    return;
  }

  tabId = tab.id;
  const kw = parse(kwInp.value)[0] || '';
  const loc = parse(locInp.value)[0] || '';

  chrome.runtime.sendMessage({ action: 'scrapeCurrentView', tabId });
  chrome.tabs.sendMessage(tabId, {
    action: 'scrapeCurrentView',
    keyword: kw,
    location: loc,
    isAgent1Auto: false
  }, (resp) => {
    if (chrome.runtime.lastError || !resp?.success) {
      log('Error: Recarga la pestaña de Google Maps (F5) e intenta de nuevo', 'error');
      setRunningUI(false);
    } else {
      log('📍 Raspando vista actual de Google Maps...', 'success');
    }
  });
};

// 3. Cola Manual (Rubros × Ubicaciones)
startBtn.onclick = async () => {
  if (running) return;
  setRunningUI(true);

  const kws = parse(kwInp.value), locs = parse(locInp.value);
  if (!kws.length || !locs.length) {
    log('Completa al menos un rubro y una ubicación', 'warn');
    setRunningUI(false);
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url?.includes('google.com/maps')) {
    log('Abre Google Maps antes de empezar', 'error');
    setRunningUI(false);
    return;
  }
  tabId = tab.id;
  const q = queue(kws, locs);
  chrome.runtime.sendMessage({ action: 'startScrapingQueue', tabId });
  chrome.tabs.sendMessage(tabId, { action: 'startScrapingQueue', queue: q }, resp => {
    if (chrome.runtime.lastError || !resp?.success) {
      log('Error: Recarga la página de Google Maps (F5) e intenta de nuevo', 'error');
      setRunningUI(false);
    } else {
      log(`🔍 Scraping iniciado – total combinaciones: ${resp.total}`, 'success');
    }
  });
};

stopBtn.onclick = () => {
  chrome.runtime.sendMessage({ action: 'stopScraping' }, () => {
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { action: 'stopScraping' }, () => {
        if (chrome.runtime.lastError) {}
      });
    }
    log('⏹️ Deteniendo scraping...', 'warn');
    setRunningUI(false);
  });
};

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'scraper-log') log(msg.message, msg.level);
  if (msg.action === 'scrapingFinished' || msg.action === 'stopScraping') {
    setRunningUI(false);
    if (msg.action === 'scrapingFinished') {
      log('🏁 Scraping finalizado', 'success');
    }
  }
});
