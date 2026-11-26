// popup.js – NatoH Systems GMaps Leads Scraper Pro (rev-30)
const DEFAULT_BACKEND = 'http://149.50.128.73:8484';

const el = id => document.getElementById(id);

let running = false;
let paused = false;
let tabId = null;
let currentTarget = null;
let skippedTargetKeys = [];
let catalogCache = null;
let zonesHistoryCache = [];
let settings = {
  direction: 'bottom-up',
  skipExistingLeads: true,
  skipScannedZones: true,
  speedPreset: 'balanced'
};

const COLORS = { info: '#38bdf8', warn: '#fbbf24', error: '#f87171', success: '#34d399' };

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function appendLog(message, level = 'info', ts = null) {
  const logBox = el('logArea');
  if (!logBox) return;
  const div = document.createElement('div');
  div.className = 'log-line';
  const timeStr = ts || new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  div.innerHTML = `<span class="log-ts">[${escapeHtml(timeStr)}]</span><span style="color:${COLORS[level] || '#cbd5e1'}">${escapeHtml(message)}</span>`;
  logBox.appendChild(div);
  while (logBox.children.length > 70) logBox.removeChild(logBox.firstChild);
  logBox.scrollTop = logBox.scrollHeight;
}

function sendBg(msg) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(msg, (resp) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(resp || {});
      }
    });
  });
}

function normalizeBackendUrl(url) {
  if (!url) return '';
  let out = String(url).trim();
  if (!out) return '';
  if (!/^https?:\/\//i.test(out)) out = `http://${out}`;
  return out.replace(/\/+$/, '');
}

function formatUptime(secs) {
  const total = Math.max(0, Math.floor(secs));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function setRunningUI(isRunning, isPaused = false, progress = null, targetLabel = '') {
  running = Boolean(isRunning);
  paused = Boolean(isPaused);

  el('agent1Btn').disabled = running;
  el('currentViewBtn').disabled = running;
  el('startBtn').disabled = running;

  const banner = el('liveBanner');
  banner.classList.toggle('active', running);

  if (running) {
    el('pauseBtn').textContent = paused ? '▶️ Reanudar' : '⏸️ Pausar';
    if (targetLabel) el('liveTitle').textContent = paused ? `⏸️ En pausa · ${targetLabel}` : `🚀 ${targetLabel}`;
    if (progress) {
      const total = progress.total || 0;
      const cur = progress.current || 0;
      const pct = total > 0 ? Math.min(100, Math.round((cur / total) * 100)) : 0;
      el('livePct').textContent = total > 0 ? `${cur}/${total} (${pct}%)` : (progress.phase === 'scrolling' ? 'Scrolleando...' : 'Iniciando...');
      el('liveBar').style.width = `${pct}%`;
      el('kpiQual').textContent = String(progress.qualified || 0);
      el('kpiDup').textContent = String(progress.duplicates || 0);
      el('kpiDisc').textContent = String(progress.discarded || 0);
      el('kpiDir').textContent = progress.direction === 'top-down' ? '⬇ Abajo' : '⬆ Arriba';
    }
  }
}

function applySettingsToUI(s) {
  settings = { ...settings, ...(s || {}) };
  el('dirBottomUp').classList.toggle('active', settings.direction !== 'top-down');
  el('dirTopDown').classList.toggle('active', settings.direction === 'top-down');
  el('speedPreset').value = settings.speedPreset || 'balanced';
  el('chkSkipExisting').checked = settings.skipExistingLeads !== false;
  el('chkSkipZones').checked = settings.skipScannedZones !== false;
}

async function persistSettings(patch, syncToBackend = true) {
  settings = { ...settings, ...patch };
  applySettingsToUI(settings);
  await sendBg({ action: 'saveSettings', patch: settings, syncToBackend });
}

/* ───── Tabs ───── */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
    if (tab === 'zones') loadZonesHistory();
  });
});

/* ───── Backend Health & Config ───── */
async function refreshBackendStatus() {
  const url = normalizeBackendUrl(el('backendUrl').value) || DEFAULT_BACKEND;
  try {
    const res = await fetch(`${url}/health`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const uptime = typeof data.uptime === 'number' ? formatUptime(data.uptime) : null;
    el('backendDot').classList.add('ok');
    el('backendStatus').textContent = uptime ? `CRM Online · ${uptime}` : 'CRM Online';
    return true;
  } catch {
    el('backendDot').classList.remove('ok');
    el('backendStatus').textContent = 'Sin conexión al VPS';
    return false;
  }
}

async function loadCatalogAndTarget() {
  const catRes = await sendBg({ action: 'apiGetCatalog' });
  if (catRes?.ok && catRes.data?.success) {
    catalogCache = catRes.data;
    const citySel = el('cityFilter');
    const rubroSel = el('rubroFilter');
    const prevCity = citySel.value;
    const prevRubro = rubroSel.value;

    citySel.innerHTML = '<option value="">🌎 Todas (Config CRM)</option>' +
      (catRes.data.cities || [])
        .filter(c => c.enabled !== false)
        .map(c => `<option value="${escapeHtml(c.id)}">${c.id === 'custom' ? '⭐' : '📍'} ${escapeHtml(c.name)}</option>`)
        .join('');

    rubroSel.innerHTML = '<option value="">🏢 Todos (Prioridad CRM)</option>' +
      (catRes.data.rubros || [])
        .filter(r => r.enabled !== false)
        .map(r => `<option value="${escapeHtml(r.id)}">${r.isCustom ? '⭐ ' : ''}${escapeHtml(r.label)}</option>`)
        .join('');

    if (prevCity) citySel.value = prevCity;
    if (prevRubro) rubroSel.value = prevRubro;

    // Chips rápidos en pestaña Manual
    const topRubros = (catRes.data.rubros || []).filter(r => r.enabled !== false).slice(0, 6);
    el('rubroChips').innerHTML = topRubros.map(r =>
      `<span class="chip" data-kw="${escapeHtml(r.query)}">+ ${escapeHtml(r.label.split(' ')[0])}</span>`
    ).join('');
    el('rubroChips').querySelectorAll('.chip').forEach(c => {
      c.onclick = () => appendCommaValue(el('keywords'), c.getAttribute('data-kw'));
    });

    const topZones = (catRes.data.subZones || []).filter(z => z.enabled !== false).slice(0, 6);
    el('zoneChips').innerHTML = topZones.map(z =>
      `<span class="chip" data-loc="${escapeHtml(z.name.replace(/\(.*\)/, '').trim())}">+ ${escapeHtml(z.name.split('(')[0].trim())}</span>`
    ).join('');
    el('zoneChips').querySelectorAll('.chip').forEach(c => {
      c.onclick = () => appendCommaValue(el('locations'), c.getAttribute('data-loc'));
    });
  }

  await refreshNextTarget(false);
}

function appendCommaValue(inputEl, val) {
  const parts = inputEl.value.split(',').map(x => x.trim()).filter(Boolean);
  if (!parts.some(p => p.toLowerCase() === val.toLowerCase())) {
    parts.push(val);
    inputEl.value = parts.join(', ');
  }
}

async function refreshNextTarget(skipCurrent = false) {
  if (skipCurrent && currentTarget?.zone?.id && currentTarget?.rubro?.id) {
    const key = `${currentTarget.zone.id}::${currentTarget.rubro.id}`;
    if (!skippedTargetKeys.includes(key)) skippedTargetKeys.push(key);
    if (skippedTargetKeys.length > 25) skippedTargetKeys.shift();
  } else if (!skipCurrent) {
    skippedTargetKeys = [];
  }

  el('targetZoneName').textContent = 'Buscando lugar virgen...';
  const res = await sendBg({
    action: 'apiGetNextTarget',
    city: el('cityFilter').value || '',
    rubro: el('rubroFilter').value || '',
    exclude: skippedTargetKeys
  });

  if (res?.ok && res.data?.success) {
    currentTarget = res.data;
    const t = res.data;
    el('targetZoneName').textContent = t.zone ? `📍 ${t.zone.name}` : 'Sin zonas';
    el('targetRubroLabel').textContent = t.rubro ? `🏢 ${t.rubro.label}` : '—';
    el('targetReason').textContent = t.reason || '';
    const badge = el('targetBadge');
    if (t.allExhausted) {
      badge.textContent = '100% Completado';
      badge.className = 'badge warn';
    } else {
      badge.textContent = `${t.remainingVirginCount ?? '?'} vírgenes`;
      badge.className = 'badge';
    }
  } else {
    el('targetZoneName').textContent = 'Sin conexión con Agente 1';
    el('targetRubroLabel').textContent = res?.error || 'Verificá el servidor VPS';
  }
}

async function loadZonesHistory() {
  const res = await sendBg({ action: 'apiGetZonesHistory', limit: 200 });
  if (!res?.ok || !res.data?.success) return;
  const d = res.data;
  zonesHistoryCache = d.records || [];
  el('tabZonesCount').textContent = String(d.totalScannedCombinations || zonesHistoryCache.length);
  el('zonesCoverageBadge').textContent = `${d.coveragePercent || 0}% (${d.totalScannedCombinations || 0}/${d.totalPossibleCombinations || 0})`;
  el('zonesCovBar').style.width = `${Math.min(100, d.coveragePercent || 0)}%`;
  renderZonesHistoryList();
}

function renderZonesHistoryList() {
  const box = el('zonesHistoryList');
  const q = (el('zonesSearchInp').value || '').toLowerCase().trim();
  const list = zonesHistoryCache.filter(r => {
    if (!q) return true;
    return `${r.zoneName || ''} ${r.zoneId || ''} ${r.keywordLabel || ''} ${r.keyword || ''} ${r.searchQuery || ''}`.toLowerCase().includes(q);
  });

  if (list.length === 0) {
    box.innerHTML = `<div style="font-size:11px;color:var(--muted);text-align:center;padding:16px">
      ${q ? 'No hay lugares que coincidan con ese filtro.' : 'Todavía no hay lugares escaneados en memoria.'}
    </div>`;
    return;
  }

  box.innerHTML = list.slice(0, 60).map(r => {
    const dt = r.lastScannedAt || r.scannedAt || r.updatedAt;
    const dtStr = dt ? new Date(dt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '';
    return `
      <div class="zone-item">
        <div class="zone-item-main">
          <div class="zone-item-title">📍 ${escapeHtml(r.zoneName || r.zoneId)}</div>
          <div class="zone-item-sub">🏢 ${escapeHtml(r.keywordLabel || r.keyword)} · ✅ ${r.validLeadsIngested || 0} calif. ${dtStr ? `· ${dtStr}` : ''}</div>
        </div>
        <div class="row" style="gap:4px">
          ${r.googleMapsUrl ? `<button class="mini-btn map" data-url="${escapeHtml(r.googleMapsUrl)}" title="Abrir en Google Maps">🗺️</button>` : ''}
          <button class="mini-btn del" data-del="${escapeHtml(String(r._id))}" title="Liberar para volver a raspar">🔄</button>
        </div>
      </div>`;
  }).join('');

  box.querySelectorAll('[data-url]').forEach(btn => {
    btn.onclick = () => chrome.tabs.create({ url: btn.getAttribute('data-url') });
  });
  box.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-del');
      const r = await sendBg({ action: 'apiDeleteScannedZone', id });
      if (r?.ok) {
        appendLog('🔄 Lugar liberado del historial. Ya puede volver a rasparse.', 'info');
        await loadZonesHistory();
        await refreshNextTarget(false);
      }
    };
  });
}

/* ───── Event Listeners ───── */
el('toggleCfgBtn').onclick = () => el('backendDrawer').classList.toggle('open');
el('openCrmBtn').onclick = () => sendBg({ action: 'openCrmDashboard' });
el('openZonesInCrmBtn').onclick = () => sendBg({ action: 'openCrmDashboard' });
el('backendRefresh').onclick = async () => {
  await refreshBackendStatus();
  await loadCatalogAndTarget();
  await loadZonesHistory();
};

el('saveBackendBtn').onclick = async () => {
  const normalized = normalizeBackendUrl(el('backendUrl').value);
  if (!normalized) return appendLog('URL de backend inválida', 'warn');
  await chrome.storage.local.set({ backendUrl: normalized });
  el('backendUrl').value = normalized;
  const ok = await refreshBackendStatus();
  appendLog(ok ? '✅ Servidor conectado y guardado' : '⚠️ URL guardada pero no responde /health', ok ? 'success' : 'warn');
  if (ok) {
    await loadCatalogAndTarget();
    await loadZonesHistory();
  }
};

el('cityFilter').onchange = () => refreshNextTarget(false);
el('rubroFilter').onchange = () => refreshNextTarget(false);
el('shuffleTargetBtn').onclick = () => refreshNextTarget(true);
el('zonesSearchInp').oninput = () => renderZonesHistoryList();

el('markTargetDoneBtn').onclick = async () => {
  if (!currentTarget?.zone || !currentTarget?.rubro) return;
  const { zone, rubro } = currentTarget;
  await sendBg({
    action: 'apiMarkZoneScanned',
    payload: {
      zoneId: zone.id,
      zoneName: zone.name,
      city: zone.city,
      keyword: rubro.id,
      keywordLabel: rubro.label,
      center: zone.center,
      zoom: zone.zoom,
      googleMapsUrl: currentTarget.googleMapsUrl,
      searchQuery: currentTarget.searchQuery,
      source: 'extension_manual',
      notes: 'Marcada manualmente desde Extensión'
    }
  });
  await loadZonesHistory();
  await refreshNextTarget(false);
};

el('quickAddZoneBtn').onclick = async () => {
  const val = el('quickCustomZoneInp').value.trim();
  if (!val) return;
  const currentZones = catalogCache?.config?.customZones || [];
  const res = await sendBg({
    action: 'apiSaveConfig',
    payload: { customZones: [...currentZones, { name: val, city: 'custom', enabled: true }] }
  });
  if (res?.ok) {
    el('quickCustomZoneInp').value = '';
    appendLog(`📍 Lugar "${val}" agregado al CRM y disponible para raspar`, 'success');
    await loadCatalogAndTarget();
  } else {
    appendLog(`❌ Error agregando lugar: ${res?.error}`, 'error');
  }
};

// Settings toggles
el('dirBottomUp').onclick = () => persistSettings({ direction: 'bottom-up' }, true);
el('dirTopDown').onclick = () => persistSettings({ direction: 'top-down' }, true);
el('speedPreset').onchange = () => persistSettings({ speedPreset: el('speedPreset').value }, true);
el('chkSkipExisting').onchange = () => persistSettings({ skipExistingLeads: el('chkSkipExisting').checked }, true);
el('chkSkipZones').onchange = () => persistSettings({ skipScannedZones: el('chkSkipZones').checked }, true);

el('clearLogBtn').onclick = async () => {
  el('logArea').innerHTML = '';
  await chrome.storage.local.set({ recentLogs: [] });
};

// 1. Iniciar Auto-Raspado Agente 1
el('agent1Btn').onclick = async () => {
  if (running) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return appendLog('No se encontró pestaña activa', 'error');

  tabId = tab.id;
  setRunningUI(true, false, { current: 0, total: 0, direction: settings.direction, phase: 'fetching_target' }, 'Agente 1 Auto GPS');
  appendLog(`🤖 Iniciando Auto-Raspado (${settings.direction === 'bottom-up' ? 'Abajo → Arriba' : 'Arriba → Abajo'})...`, 'info');
  const resp = await sendBg({
    action: 'startAgent1Auto',
    tabId: tab.id,
    city: el('cityFilter').value || '',
    rubro: el('rubroFilter').value || ''
  });
  if (!resp?.success) {
    appendLog('❌ No se pudo iniciar Agente 1', 'error');
    setRunningUI(false);
  }
};

// 2. Raspar Vista Actual de Maps
el('currentViewBtn').onclick = async () => {
  if (running) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || (!tab.url?.includes('google.com/maps') && !tab.url?.includes('google.com.ar/maps'))) {
    return appendLog('Abrí Google Maps antes de raspar la vista actual', 'error');
  }
  tabId = tab.id;
  setRunningUI(true, false, { current: 0, total: 0, direction: settings.direction, phase: 'starting' }, 'Vista Actual de Maps');
  await sendBg({ action: 'scrapeCurrentView', tabId, direction: settings.direction });

  chrome.tabs.sendMessage(tabId, {
    action: 'scrapeCurrentView',
    keyword: el('keywords').value.split(',')[0]?.trim() || '',
    location: el('locations').value.split(',')[0]?.trim() || '',
    isAgent1Auto: false,
    settings
  }, (resp) => {
    if (chrome.runtime.lastError || !resp?.success) {
      appendLog('⚠️ Recargá la pestaña de Google Maps (F5) e intentá de nuevo', 'error');
      setRunningUI(false);
    } else {
      appendLog(`📍 Raspando vista actual (${settings.direction === 'bottom-up' ? 'Abajo → Arriba' : 'Arriba → Abajo'})`, 'success');
    }
  });
};

// 3. Pre-chequear Cola Manual contra memoria CRM
const parseCsv = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
function buildQueue() {
  const kws = parseCsv(el('keywords').value);
  const locs = parseCsv(el('locations').value);
  const out = [];
  for (const kw of kws) {
    for (const loc of locs) out.push({ keyword: kw, location: loc });
  }
  return out;
}

el('checkManualQueueBtn').onclick = async () => {
  const q = buildQueue();
  const box = el('manualPrecheckBox');
  if (!q.length) {
    box.style.display = 'block';
    box.innerHTML = '<span style="color:#fbbf24">Completá al menos 1 rubro y 1 lugar.</span>';
    return;
  }
  box.style.display = 'block';
  box.innerHTML = '<span style="color:#38bdf8">Verificando contra memoria del CRM...</span>';

  const lines = [];
  for (const item of q) {
    const r = await sendBg({
      action: 'apiCheckZone',
      payload: { keyword: item.keyword, location: item.location, searchQuery: `${item.keyword} en ${item.location}` }
    });
    const done = Boolean(r?.data?.alreadyScanned);
    lines.push(
      done
        ? `<div style="color:#fbbf24">⚠️ <strong>${escapeHtml(item.keyword)} · ${escapeHtml(item.location)}</strong> — Ya escaneada (${r.data.record?.validLeadsIngested || 0} calif.)</div>`
        : `<div style="color:#34d399">🟢 <strong>${escapeHtml(item.keyword)} · ${escapeHtml(item.location)}</strong> — Virgen (lista)</div>`
    );
  }
  box.innerHTML = lines.join('');
};

// 4. Iniciar Cola Manual
el('startBtn').onclick = async () => {
  if (running) return;
  const q = buildQueue();
  if (!q.length) return appendLog('Completá al menos un rubro y un lugar', 'warn');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || (!tab.url?.includes('google.com/maps') && !tab.url?.includes('google.com.ar/maps'))) {
    return appendLog('Abrí Google Maps antes de empezar la cola', 'error');
  }

  tabId = tab.id;
  setRunningUI(true, false, { current: 0, total: 0, direction: settings.direction, phase: 'starting' }, `Cola (${q.length} búsquedas)`);
  await sendBg({ action: 'startScrapingQueue', tabId, direction: settings.direction });

  chrome.tabs.sendMessage(tabId, { action: 'startScrapingQueue', queue: q, settings }, (resp) => {
    if (chrome.runtime.lastError || !resp?.success) {
      appendLog('⚠️ Recargá Google Maps (F5) e intentá de nuevo', 'error');
      setRunningUI(false);
    } else {
      appendLog(`🔍 Cola iniciada: ${resp.total} combinaciones`, 'success');
    }
  });
};

// 5. Pausa / Stop
el('pauseBtn').onclick = async () => {
  const r = await sendBg({ action: 'togglePause' });
  if (r?.ok) setRunningUI(running, r.paused);
};

el('stopBtn').onclick = async () => {
  await sendBg({ action: 'stopScraping' });
  if (tabId) {
    chrome.tabs.sendMessage(tabId, { action: 'stopScraping' }, () => { if (chrome.runtime.lastError) {} });
  }
  appendLog('⏹️ Deteniendo scraping...', 'warn');
  setRunningUI(false);
};

// Listeners en vivo desde background / content
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'scraper-log') appendLog(msg.message, msg.level, msg.ts);
  if (msg.type === 'scraper-state' && msg.state) {
    tabId = msg.state.currentTabId || tabId;
    setRunningUI(msg.state.scrapingActive, msg.state.paused, msg.state.progress, msg.state.currentTargetLabel);
  }
  if (msg.action === 'scrapingFinished' || msg.action === 'stopScraping') {
    setRunningUI(false);
    loadZonesHistory();
    refreshNextTarget(false);
  }
});

/* ───── Bootstrap inicial ───── */
(async () => {
  const { backendUrl } = await chrome.storage.local.get('backendUrl');
  const normalized = normalizeBackendUrl(backendUrl) || DEFAULT_BACKEND;
  el('backendUrl').value = normalized;
  if (!backendUrl) await chrome.storage.local.set({ backendUrl: normalized });

  const st = await sendBg({ action: 'getScrapingStatus' });
  if (st?.settings) applySettingsToUI(st.settings);
  if (Array.isArray(st?.recentLogs)) {
    st.recentLogs.slice(-30).forEach(entry => appendLog(entry.message, entry.level, entry.ts));
  }
  if (st?.scrapingActive) {
    tabId = st.currentTabId;
    setRunningUI(true, st.paused, st.progress, st.currentTargetLabel);
  }

  const ok = await refreshBackendStatus();
  if (ok) {
    const synced = await sendBg({ action: 'getSettings', syncCrm: true });
    if (synced?.settings) applySettingsToUI(synced.settings);
    await Promise.all([loadCatalogAndTarget(), loadZonesHistory()]);
  }
})();
