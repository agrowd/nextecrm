// Configuración para VPS: Frontend (8485) -> Backend (8484)
// Si estamos en local (localhost), asumimos que el backend puede estar en el mismo o en 8484/3001.
// Si estamos en producción (IP o dominio), el backend está en el puerto 8484.
const API_URL = `${window.location.protocol}//${window.location.hostname}:8484`;
const REFRESH_INTERVAL = 5000;

// State
let currentState = {
    view: 'dashboard',
    conversations: {},
    activeChatPhone: null,
    leads: [],
    leadsPage: 1,
    leadsTotalPages: 1,
    leadsTotalCount: 0,
    filter: 'all',
    bots: new Map(),
    scrapers: [],
    templates: []
};

// Real-time Connection
let socket;
function initSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('📡 Dashboard conectado');
        socket.emit('identify', { type: 'dashboard' });
    });

    socket.on('bot_list_update', (botsArray) => {
        currentState.bots = new Map(botsArray);
        renderBotControls();
        updateBotFilters(); // Actualizar filtros de bots dinámicamente
    });

    socket.on('bot_status_update', (data) => {
        const { instanceId, status, wid, qr } = data;
        const current = currentState.bots.get(instanceId) || {};
        currentState.bots.set(instanceId, { ...current, status, wid, qr });
        renderBotControls();
    });

    socket.on('realtime_message', (data) => handleIncomingRealtimeMessage(data));
    socket.on('realtime_bot_log', (data) => appendConsoleLog(data));
    socket.on('scraper_status_update', (scrapers) => {
        currentState.scrapers = scrapers;
        updateScraperUI();
    });

    socket.on('error_notification', (data) => alert(`❌ Error: ${data.message}`));

    // 🚨 CRASH ALERT - Play sound and show notification when a bot crashes
    socket.on('bot_crash_alert', (data) => {
        console.log('🚨 BOT CRASH ALERT:', data);

        // Play alert sound
        playAlertSound();

        // Show notification
        const botNum = data.instanceId.replace('bot_', '');
        const msg = `🚨 ¡ALERTA! Bot ${botNum} se cayó\n\nRazón: ${data.reason}\nHora: ${new Date(data.timestamp).toLocaleTimeString()}`;

        // Browser notification if permitted
        if (Notification.permission === 'granted') {
            new Notification('Bot Caído', {
                body: `Bot ${botNum} se cayó: ${data.reason}`,
                icon: 'assets/logo.png'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('Bot Caído', {
                        body: `Bot ${botNum} se cayó: ${data.reason}`,
                        icon: 'assets/logo.png'
                    });
                }
            });
        }

        // Also show alert
        alert(msg);

        // Refresh bot controls
        renderBotControls();
    });
}

// Alert sound function
function playAlertSound() {
    try {
        // Create audio context for alert sound
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Create oscillator for beep sound
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // Configure sound - urgent beep pattern
        oscillator.frequency.value = 800; // Higher pitch for urgency
        oscillator.type = 'square';
        gainNode.gain.value = 0.3;

        oscillator.start();

        // Beep pattern: 3 beeps
        setTimeout(() => { gainNode.gain.value = 0; }, 200);
        setTimeout(() => { gainNode.gain.value = 0.3; }, 300);
        setTimeout(() => { gainNode.gain.value = 0; }, 500);
        setTimeout(() => { gainNode.gain.value = 0.3; }, 600);
        setTimeout(() => { gainNode.gain.value = 0; }, 800);
        setTimeout(() => { oscillator.stop(); audioCtx.close(); }, 900);
    } catch (e) {
        console.warn('Could not play alert sound:', e);
    }
}

// DOM Elements Helpers
const getEl = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => init());

function init() {
    setupNavigation();
    setupChatListeners();
    setupLeadsListeners();
    setupSettingsListeners();

    fetchStats();
    fetchConversations();
    fetchLeads();
    fetchBotConfig();
    fetchTemplates();
    initSocket();
    setupTemplateListeners();

    // Fallback: Si no llegan bots por socket, intentar fetch manual
    fetchBotList();

    // Refresh stats every 15 seconds
    setInterval(() => {
        if (currentState.view === 'dashboard') fetchStats();
        if (currentState.view === 'stats') fetchCategoryStats();
        if (currentState.view === 'connection') {
            fetchBotList();
            renderBotControls();
        }
    }, 15000);

    // Initial setup
    setupDelegatedListeners();
    setupTemplateListeners();

    // Refresh realtime stats more frequently (every 10 seconds)
    setInterval(() => {
        if (currentState.view === 'dashboard') fetchRealtimeStats();
    }, 10000);
}

// --- NAVIGATION ---
function setupNavigation() {
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', () => switchView(item.dataset.view));
    });

    const refreshStats = getEl('refreshStats');
    if (refreshStats) refreshStats.addEventListener('click', fetchStats);

    const refreshLeads = getEl('refreshLeads');
    if (refreshLeads) refreshLeads.addEventListener('click', fetchLeads);

    const refreshTemplates = getEl('refreshTemplates');
    if (refreshTemplates) refreshTemplates.addEventListener('click', fetchTemplates);
}

function switchView(viewId) {
    currentState.view = viewId;
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewId);
    });
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.toggle('active', section.id === `view-${viewId}`);
    });

    if (viewId === 'dashboard') fetchStats();
    if (viewId === 'chats') fetchConversations();
    if (viewId === 'leads') fetchLeads();
    if (viewId === 'stats') fetchAdvancedStats();
    if (viewId === 'settings') fetchGlobalConfig();
    if (viewId === 'messages') fetchTemplates();
}

// --- DASHBOARD & SCRAPER ---
async function fetchStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        const data = await response.json();
        if (data.success) {
            const scat = getEl('statContacted'); if (scat) scat.textContent = data.stats.contacted_leads || 0;
            const sint = getEl('statInterested'); if (sint) sint.textContent = data.stats.interested_leads || 0;
            const smsg = getEl('statMessages'); if (smsg) smsg.textContent = data.stats.total_messages || 0;
            renderActivityLog(data.stats);
        }
        // Also fetch bot stats and realtime stats
        fetchBotStats();
        fetchRealtimeStats();
    } catch (e) { console.error(e); }
}

// --- REALTIME STATS ---
async function fetchRealtimeStats() {
    try {
        const response = await fetch(`${API_URL}/stats/realtime`);
        const data = await response.json();
        if (data.success) {
            const stats = data.stats;

            // Update queue count
            const rtQueue = getEl('rtLeadsQueue');
            if (rtQueue) rtQueue.textContent = stats.queue.total;

            // Update messages today
            const rtToday = getEl('rtMessagesToday');
            if (rtToday) rtToday.textContent = stats.messages.today;

            // Update delivered/failed counts
            const rtDelivered = getEl('rtDelivered');
            if (rtDelivered) rtDelivered.textContent = stats.messages.deliveredToday || 0;

            const rtFailed = getEl('rtFailed');
            if (rtFailed) rtFailed.textContent = stats.messages.failedToday || 0;

            // Update contactados today
            const rtContactados = getEl('rtContactados');
            if (rtContactados) rtContactados.textContent = stats.leads.contactedToday || 0;

            // Update leads failed
            const rtLeadsFailed = getEl('rtLeadsFailed');
            if (rtLeadsFailed) rtLeadsFailed.textContent = stats.leads.failedToday || 0;

            // Update last message
            const rtLast = getEl('rtLastMessage');
            const rtLastInfo = getEl('rtLastMessageInfo');
            if (stats.messages.lastMessage) {
                const lastTime = new Date(stats.messages.lastMessage.time);
                if (rtLast) rtLast.textContent = lastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                if (rtLastInfo) rtLastInfo.textContent = `${stats.messages.lastMessage.bot} → ${stats.messages.lastMessage.leadName?.substring(0, 15) || 'Lead'}...`;
            } else {
                if (rtLast) rtLast.textContent = '--:--';
                if (rtLastInfo) rtLastInfo.textContent = 'Sin mensajes aún';
            }

            // Update per-bot daily stats dinamically
            if (stats.bots.todayStats) {
                stats.bots.todayStats.forEach(b => {
                    const el = getEl(`${b.instanceId}Today`);
                    if (el) el.textContent = b.messagestoday;
                });
            }
        }
    } catch (e) { console.error('Error fetching realtime stats:', e); }
}

// --- FETCH BOTS ---
async function fetchBotList() {
    try {
        const res = await fetch(`${API_URL}/api/bots/list`);
        const data = await res.json();
        if (data.success && Array.isArray(data.bots) && data.bots.length > 0) {
            // Actualizar map
            data.bots.forEach(b => {
                const current = currentState.bots.get(b.instanceId) || {};
                currentState.bots.set(b.instanceId, { ...current, status: b.status, wid: b.wid, qr: b.qr });
            });
            renderBotControls();
            updateBotFilters();
        } else {
            // Si falla o viene vacío, renderizar con fallback
            renderBotControls();
        }
    } catch (e) { console.warn("No se pudo obtener lista de bots, usando fallback"); renderBotControls(); }
}

// --- BOT STATISTICS ---
let botStatsData = null;
let countdownInterval = null;

async function fetchBotStats() {
    try {
        const response = await fetch(`${API_URL}/stats/bots`);
        const data = await response.json();
        if (data.success) {
            botStatsData = data.stats;
            renderBotStats();
            startCountdown();
        }
    } catch (e) { console.error('Error fetching bot stats:', e); }
}

function renderBotStats() {
    if (!botStatsData) return;

    // Update time counter
    updateTimeDisplay();

    // Update pending/queued/active counts
    const pending = getEl('pendingLeadsCount');
    const queued = getEl('queuedLeadsCount');
    const active = getEl('activeBotsCount');
    if (pending) pending.textContent = botStatsData.estimated.pendingLeads;
    if (queued) queued.textContent = botStatsData.estimated.queuedLeads;
    if (active) active.textContent = botStatsData.estimated.activeBots;

    // Render bot cards
    const grid = getEl('botStatsGrid');
    if (grid) {
        grid.innerHTML = '';

        // Get all bots from currentState.bots
        const allBots = Array.from(currentState.bots.keys()).sort();
        const botColors = { 'bot_1': '#00a884', 'bot_2': '#7e57c2', 'bot_3': '#ff9800' };

        allBots.forEach(botId => {
            const botData = botStatsData.bots.find(b => b.instanceId === botId) || { total: 0, today: 0, failed: 0 };
            const leadsData = botStatsData.leadsByBot.find(l => l.instanceId === botId) || { count: 0 };
            const color = botColors[botId] || '#00bcd4';
            const botStatus = currentState.bots.get(botId);
            const isActive = botStatus?.status === 'ready';

            grid.insertAdjacentHTML('beforeend', `
                <div class="bot-stat-card" style="background: #111b21; border: 1px solid ${color}40; border-radius: 12px; padding: 20px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; right: 0; width: 80px; height: 80px; background: ${color}15; border-radius: 0 0 0 100%;"></div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
                        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${isActive ? '#25d366' : '#888'}; box-shadow: ${isActive ? '0 0 8px #25d366' : 'none'};"></div>
                        <h4 style="color: ${color}; font-size: 16px; font-weight: 600; margin: 0;">${botId.toUpperCase().replace('_', ' ')}</h4>
                        <span style="font-size: 11px; color: #8696a0; margin-left: auto;">${isActive ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <div style="font-size: 28px; font-weight: 700; color: #fff;">${botData.today}</div>
                            <div style="font-size: 11px; color: #8696a0;">Hoy <span id="${botId}TodayIndicator"></span></div>
                        </div>
                        <div>
                            <div style="font-size: 28px; font-weight: 700; color: #8696a0;">${botData.total}</div>
                            <div style="font-size: 11px; color: #8696a0;">Total</div>
                        </div>
                    </div>
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #2f3b43; display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: #8696a0;">Leads contactados:</span>
                        <span style="color: ${color}; font-weight: 600;">${leadsData.count}</span>
                    </div>
                    ${botData.failed > 0 ? `<div style="margin-top: 8px; font-size: 11px; color: #f44336;">⚠ ${botData.failed} fallidos</div>` : ''}
                </div>
            `);
        });
    }

    // Render rejection stats
    const rej = botStatsData.rejections;
    const totalRej = getEl('totalRejections'); if (totalRej) totalRej.textContent = rej.total;
    const rejBounced = getEl('rejPhoneBounced'); if (rejBounced) rejBounced.textContent = rej.byType.phoneBounced;
    const rejInvalid = getEl('rejPhoneInvalid'); if (rejInvalid) rejInvalid.textContent = rej.byType.phoneInvalid;
    const rejNoWA = getEl('rejNoWhatsApp'); if (rejNoWA) rejNoWA.textContent = rej.byType.noWhatsApp;
    const rejWeb = getEl('rejWithWebsite'); if (rejWeb) rejWeb.textContent = rej.byType.withWebsite;

    // Render rejection reasons list
    const reasonsList = getEl('rejectionReasonsList');
    if (reasonsList && rej.reasons?.length > 0) {
        reasonsList.innerHTML = rej.reasons.slice(0, 5).map(r => `
            <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #1a2e38; border-radius: 6px; margin-bottom: 6px; font-size: 12px;">
                <span style="color: #8696a0;">${r.reason}</span>
                <span style="color: #fff; font-weight: 600;">${r.count}</span>
            </div>
        `).join('');
    }
}

function updateTimeDisplay() {
    if (!botStatsData) return;
    const counter = getEl('timeCounterDisplay');
    if (!counter) return;

    const est = botStatsData.estimated;
    const h = String(est.hours).padStart(2, '0');
    const m = String(est.minutes).padStart(2, '0');
    const s = String(est.seconds).padStart(2, '0');
    counter.textContent = `${h}:${m}:${s}`;
}

function startCountdown() {
    // Clear any existing interval
    if (countdownInterval) clearInterval(countdownInterval);

    // Update every second (visual countdown)
    countdownInterval = setInterval(() => {
        if (!botStatsData || !botStatsData.estimated) return;
        const est = botStatsData.estimated;

        // Decrease by 1 second
        if (est.totalSeconds > 0) {
            est.totalSeconds--;
            est.hours = Math.floor(est.totalSeconds / 3600);
            est.minutes = Math.floor((est.totalSeconds % 3600) / 60);
            est.seconds = est.totalSeconds % 60;
            updateTimeDisplay();
        }
    }, 1000);
}

function updateScraperUI() {
    const badge = getEl('scraperStatusBadge');
    const card = getEl('scraperStatusCard');
    const label = getEl('activeScraperLabel');
    const count = getEl('scraperCount');
    const lastKeyword = getEl('scraperLastKeyword');

    if (!currentState.scrapers || currentState.scrapers.length === 0) {
        if (badge) {
            badge.className = 'scraper-badge offline';
            badge.textContent = 'Scraper: Inactivo';
            badge.style.background = '#222';
            badge.style.color = '#fff';
        }
        if (card) card.style.borderColor = '#444';
        if (label) label.textContent = 'Scraper: Inactivo';
        if (count) count.textContent = '0 activos';
        return;
    }

    const first = currentState.scrapers[0][1];
    if (badge) {
        badge.className = 'scraper-badge online';
        badge.textContent = 'Scraper: ACTIVO';
        badge.style.background = '#00a884';
        badge.style.color = '#fff';
    }
    if (card) card.style.borderColor = '#00a884';
    if (label) label.textContent = 'Scraper: ACTIVO';
    if (count) count.textContent = `${currentState.scrapers.length} instancia(s)`;
    if (lastKeyword) lastKeyword.textContent = `Buscando: ${first.keyword || '...'}`;
}

function renderActivityLog(stats) {
    const activity = getEl('activityList');
    if (!activity) return;
    const time = new Date().toLocaleTimeString();
    activity.innerHTML = `
        <li style="padding:10px; border-bottom:1px solid #1f2c33; color: #d1d7db; font-size:13px;">
            <span style="color:#00a884; font-weight:bold;">${time}</span> - Salud del sistema: OK. ${stats.pending_leads} leads en cola.
        </li>
    `;
}

// --- CONSOLE ---
function appendConsoleLog(data) {
    // Append to main console
    const consoleOut = getEl('consoleOutput');
    if (consoleOut) {
        const line = document.createElement('div');
        line.style.marginBottom = '2px';
        const time = new Date(data.timestamp).toLocaleTimeString();
        const color = data.level === 'warn' ? '#ff9800' : (data.level === 'error' ? '#f44336' : '#0f0');
        const instanceColor = data.instanceId === 'bot_2' ? '#7e57c2' : (data.instanceId === 'bot_3' ? '#ff9800' : '#00a884');

        line.innerHTML = `<span style="color:#666;">[${time}]</span> <span style="color:${instanceColor}; font-weight:600;">[${data.instanceId || 'system'}]</span> <span style="color:${color};">${data.message}</span>`;
        consoleOut.appendChild(line);

        const wrapper = consoleOut.parentElement;
        wrapper.scrollTop = wrapper.scrollHeight;

        // Limit lines
        while (consoleOut.children.length > 200) {
            consoleOut.removeChild(consoleOut.firstChild);
        }
    }

    // Also append to individual console based on instanceId
    let targetId = null;
    if (data.instanceId === 'bot_1') targetId = 'consoleBot1Output';
    else if (data.instanceId === 'bot_2') targetId = 'consoleBot2Output';
    else if (data.instanceId === 'bot_3') targetId = 'consoleBot3Output';
    else if (data.instanceId === 'scraper') targetId = 'consoleScraperOutput';
    else if (data.instanceId === 'server') targetId = 'consoleServerOutput';

    if (targetId) {
        const targetConsole = getEl(targetId);
        if (targetConsole) {
            const line = document.createElement('div');
            line.style.marginBottom = '2px';
            const time = new Date(data.timestamp).toLocaleTimeString();
            const color = data.level === 'warn' ? '#ff9800' : (data.level === 'error' ? '#f44336' : '#0f0');
            line.innerHTML = `<span style="color:#666;">[${time}]</span> <span style="color:${color};">${data.message}</span>`;
            targetConsole.appendChild(line);

            // Limit lines
            while (targetConsole.children.length > 100) {
                targetConsole.removeChild(targetConsole.firstChild);
            }
        }
    }
}

function toggleConsole(id) {
    const consoleEl = getEl(`console-${id}`);
    const toggle = getEl(`toggle-${id}`);
    if (!consoleEl) return;

    const isCollapsed = consoleEl.classList.contains('collapsed');

    if (isCollapsed) {
        consoleEl.classList.remove('collapsed');
        consoleEl.style.height = '150px';
        consoleEl.style.padding = '15px';
        consoleEl.style.overflow = 'auto';
        if (toggle) toggle.textContent = 'expand_more';
    } else {
        consoleEl.classList.add('collapsed');
        consoleEl.style.height = '0';
        consoleEl.style.padding = '0'; // Change from '0 15px' to '0' to avoid jump
        consoleEl.style.overflow = 'hidden';
        if (toggle) toggle.textContent = 'expand_less';
    }
}

function clearAllConsoles() {
    const consoleIds = ['consoleOutput', 'consoleScraperOutput', 'consoleServerOutput', 'consoleBot1Output', 'consoleBot2Output', 'consoleBot3Output'];
    consoleIds.forEach(id => {
        const el = getEl(id);
        if (el) el.innerHTML = '';
    });
}

// --- SETTINGS ---
async function fetchBotConfig() {
    try {
        const res = await fetch(`${API_URL}/bot/config`);
        const data = await res.json();
        if (data.success && data.config) {
            const dMin = getEl('cfgDelayMin'); if (dMin) dMin.value = data.config.delays?.min || 45;
            const dMax = getEl('cfgDelayMax'); if (dMax) dMax.value = data.config.delays?.max || 90;
            const aMod = getEl('cfgAiModel'); if (aMod) aMod.value = data.config.ai?.model || 'gemini-1.5-flash';
            const sPro = getEl('cfgSystemPrompt'); if (sPro) sPro.value = data.config.ai?.systemPrompt || '';
            const mLea = getEl('cfgMaxLeads'); if (mLea) mLea.value = data.config.sequences?.maxMessagesPerDay || 200;
            const cOff = getEl('cfgCoolOff'); if (cOff) cOff.value = data.config.sequences?.coolOffPeriod || 15;
        }
    } catch (e) { console.error("Error al cargar config:", e); }
}

function setupSettingsListeners() {
    const saveBtn = getEl('saveConfigBtn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async () => {
        const settings = {
            delays: {
                min: parseInt(getEl('cfgDelayMin').value),
                max: parseInt(getEl('cfgDelayMax').value)
            },
            ai: {
                model: getEl('cfgAiModel').value,
                systemPrompt: getEl('cfgSystemPrompt').value
            },
            sequences: {
                maxMessagesPerDay: parseInt(getEl('cfgMaxLeads').value),
                coolOffPeriod: parseInt(getEl('cfgCoolOff').value)
            }
        };

        try {
            const res = await fetch(`${API_URL}/bot/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings })
            });
            const data = await res.json();
            if (data.success) alert("🚀 Configuración guardada y enviada a toda la flota!");
        } catch (e) { alert("Error guardando settings"); }
    });
}

// --- CHATS ---
async function fetchConversations() {
    try {
        const response = await fetch(`${API_URL}/conversations?limit=500`);
        const data = await response.json();
        if (data.success) {
            processConversations(data.data);
            renderChatList();
            if (currentState.activeChatPhone) renderMessages(currentState.activeChatPhone);
        }
    } catch (e) { console.error(e); }
}

function processConversations(messages) {
    const newConvs = {};
    messages.forEach(msg => {
        const phone = msg.phone;
        if (!newConvs[phone]) newConvs[phone] = { phone, name: msg.leadName || phone, messages: [], lastMessage: '', lastTime: null, instanceId: msg.instanceId };
        newConvs[phone].messages.push(msg);
    });
    Object.values(newConvs).forEach(chat => {
        chat.messages.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
        const last = chat.messages[chat.messages.length - 1];
        chat.lastMessage = last.content; chat.lastTime = last.sentAt; chat.instanceId = last.instanceId;
    });
    currentState.conversations = newConvs;
}

function renderChatList() {
    const list = getEl('chatList'); if (!list) return;
    list.innerHTML = '';
    let chats = Object.values(currentState.conversations);
    if (currentState.filter !== 'all') chats = chats.filter(c => c.instanceId === currentState.filter);

    const sInput = getEl('searchInput');
    if (sInput && sInput.value) {
        const term = sInput.value.toLowerCase();
        chats = chats.filter(c => c.name.toLowerCase().includes(term) || c.phone.includes(term));
    }
    chats.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
    chats.forEach(chat => {
        const isActive = currentState.activeChatPhone === chat.phone ? 'active' : '';
        const time = new Date(chat.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(chat.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
        const botColor = chat.instanceId === 'bot_2' ? '#7e57c2' : (chat.instanceId === 'bot_3' ? '#ff9800' : '#00a884');
        list.insertAdjacentHTML('beforeend', `
            <div class="chat-item ${isActive}" data-phone="${chat.phone}">
                <div class="chat-item-avatar"><img src="${avatar}"></div>
                <div class="chat-item-content">
                    <div class="chat-row-1"><span class="chat-name">${chat.name}</span><span class="chat-time">${time}</span></div>
                    <div class="chat-row-2"><span class="chat-last-msg">${chat.lastMessage.substring(0, 30)}...</span>
                        <span class="bot-badge" style="background:${botColor}; font-size:10px;">${chat.instanceId ? (chat.instanceId === 'bot' ? 'B1' : chat.instanceId.replace('bot_', 'B')) : 'B1'}</span>
                    </div>
                </div>
            </div>`);
    });
    document.querySelectorAll('.chat-item').forEach(item => item.addEventListener('click', () => openChat(item.dataset.phone)));
}

function openChat(phone) {
    currentState.activeChatPhone = phone; renderChatList();
    const chat = currentState.conversations[phone]; if (!chat) return;
    const es = getEl('emptyState'); if (es) es.style.display = 'none';
    const acc = getEl('activeChatContainer'); if (acc) acc.classList.remove('hidden');

    // Truncar nombre si es muy largo y agregar teléfono entre paréntesis
    const maxNameLength = 25;
    let displayName = chat.name || 'Sin nombre';
    if (displayName.length > maxNameLength) {
        displayName = displayName.substring(0, maxNameLength) + '...';
    }

    const cn = getEl('activeChatName');
    if (cn) cn.innerHTML = `${displayName} <span style="color: #8696a0; font-weight: 400; font-size: 13px;">(+${chat.phone})</span>`;

    const cp = getEl('activeChatPhone');
    if (cp) cp.textContent = chat.instanceId ? (chat.instanceId === 'bot' ? 'Bot 1' : `Bot ${chat.instanceId.replace('bot_', '')}`) : '';

    const ca = getEl('activeChatAvatar');
    if (ca) ca.src = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(chat.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

    const badge = getEl('activeChatBotBadge');
    if (badge) {
        badge.textContent = chat.instanceId ? (chat.instanceId === 'bot' ? 'BOT 1' : `BOT ${chat.instanceId.replace('bot_', '')}`) : 'BOT 1';
        badge.style.background = chat.instanceId === 'bot_2' ? '#7e57c2' : (chat.instanceId === 'bot_3' ? '#ff9800' : '#00a884');
    }
    renderMessages(phone);
}

function renderMessages(phone) {
    const container = getEl('messagesContainer'); if (!container) return;
    const chat = currentState.conversations[phone]; if (!chat) return;
    container.innerHTML = '';

    chat.messages.forEach(msg => {
        // Determinar si es mensaje saliente (enviado por el bot) o entrante (del cliente)
        const isOutbound = msg.fromMe === true || msg.from === 'me' || msg.metadata?.manual || msg.botInstance;
        const time = new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Determinar el estado de los ticks según el status del mensaje
        let ticksHtml = '';
        if (isOutbound) {
            const status = msg.status || 'sent';
            if (status === 'sent') {
                ticksHtml = '<span class="material-icons" style="font-size:14px; color:#8696a0;">done</span>';
            } else if (status === 'delivered') {
                ticksHtml = '<span class="material-icons" style="font-size:14px; color:#8696a0;">done_all</span>';
            } else if (status === 'read') {
                ticksHtml = '<span class="material-icons" style="font-size:14px; color:#53bdeb;">done_all</span>';
            } else if (status === 'failed') {
                ticksHtml = '<span class="material-icons" style="font-size:14px; color:#f44336;">error_outline</span>';
            }
        }

        // El mensaje saliente va a la derecha (class="out"), entrante a la izquierda (class="in")
        container.insertAdjacentHTML('beforeend', `
            <div class="message-bubble ${isOutbound ? 'out' : 'in'}" style="
                max-width: 65%;
                padding: 8px 12px;
                border-radius: ${isOutbound ? '8px 8px 0 8px' : '8px 8px 8px 0'};
                margin: 4px 0;
                margin-${isOutbound ? 'left' : 'right'}: auto;
                background: ${isOutbound ? '#005c4b' : '#202c33'};
                position: relative;
            ">
                <span class="msg-text" style="word-wrap: break-word; white-space: pre-wrap;">${msg.content}</span>
                <div class="msg-meta" style="display: flex; justify-content: flex-end; align-items: center; gap: 4px; margin-top: 4px;">
                    <span class="msg-time" style="font-size: 11px; color: #8696a0;">${time}</span>
                    ${ticksHtml}
                </div>
            </div>
        `);
    });
    container.scrollTop = container.scrollHeight;
}

function setupChatListeners() {
    const sInput = getEl('searchInput'); if (sInput) sInput.addEventListener('input', renderChatList);
    const chatInput = getEl('chatInput');
    const sendBtn = getEl('sendMessageBtn');

    const handleSend = () => {
        if (!chatInput) return;
        const text = chatInput.value.trim(); if (!text || !currentState.activeChatPhone) return;
        const chat = currentState.conversations[currentState.activeChatPhone];
        socket.emit('command_bot', { instanceId: chat.instanceId || 'bot_1', command: 'send_whatsapp_message', payload: { phone: currentState.activeChatPhone, message: text } });
        chatInput.value = '';
    };
    if (sendBtn) sendBtn.addEventListener('click', handleSend);
    if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

    document.querySelectorAll('.filter-buttons-mini .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-buttons-mini .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active'); currentState.filter = btn.dataset.filter; renderChatList();
        });
    });
}

function updateBotFilters() {
    const container = document.querySelector('.filter-buttons-mini');
    if (!container) return;

    // Guardar el filtro actual
    const currentFilter = currentState.filter;

    // Generar botones dinámicamente
    let html = `<button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>`;

    // Obtener IDs de bots ordenados
    const botIds = Array.from(currentState.bots.keys()).sort();

    botIds.forEach(id => {
        const shortId = id.includes('_') ? id.split('_')[1].toUpperCase() : id.toUpperCase();
        html += `<button class="filter-btn ${currentFilter === id ? 'active' : ''}" data-filter="${id}">${shortId}</button>`;
    });

    container.innerHTML = html;

    // Re-vincular eventos
    container.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentState.filter = btn.dataset.filter;
            renderChatList();
        });
    });
}

function handleIncomingRealtimeMessage(data) {
    const { from, to, body, timestamp, instanceId } = data;
    const phone = from === 'me' ? to.split('@')[0] : from.split('@')[0];
    if (!currentState.conversations[phone]) { fetchConversations(); return; }
    const chat = currentState.conversations[phone];
    chat.messages.push({ phone, content: body, sentAt: new Date(timestamp), fromMe: from === 'me', instanceId });
    chat.lastMessage = body; chat.lastTime = new Date(timestamp);
    if (currentState.activeChatPhone === phone) renderMessages(phone);
    renderChatList();
}

function renderBotControls() {
    const grid = getEl('botControlGrid'); if (!grid) return;
    grid.innerHTML = '';

    // Obtener todos los bots de currentState.bots
    let botIds = Array.from(currentState.bots.keys()).sort();

    // FALLBACK: Si la lista está vacía, usar los predefinidos (para que no desaparezcan)
    if (botIds.length === 0) {
        botIds = ['bot_1', 'bot_2', 'bot_3'];
        // Rellenar estado dummy para que no falle
        botIds.forEach(id => {
            if (!currentState.bots.has(id)) {
                currentState.bots.set(id, { status: 'not_running' });
            }
        });
    }

    const botColors = { 'bot': '#00a884', 'bot_1': '#00a884', 'bot_2': '#7e57c2', 'bot_3': '#ff9800' };

    botIds.forEach(id => {
        const bot = currentState.bots.get(id) || { status: 'not_running' };
        const color = botColors[id] || '#00bcd4';
        const card = document.createElement('div');
        card.className = `qr-card bot-${bot.status}`;
        card.style.borderColor = color + '40';
        card.style.position = 'relative';

        // Manejar alias: bot -> Bot 1
        const displayName = id === 'bot' ? 'Bot 1' : `Bot ${id.replace('bot_', '')}`;

        let statusHtml = '', actionHtml = '', statusColor = '#888';

        // Lógica de estados mejorada
        if (bot.status === 'not_running' || !bot.status) {
            statusColor = '#888';
            statusHtml = `<span class="status-dot" style="background:${statusColor}"></span> Inactivo`;
            actionHtml = `
                <button class="action-btn start-btn" onclick="startBotProcess('${id}')" style="background: ${color}; color: white; border: none; width: 100%; padding: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <span class="material-icons">play_arrow</span> INICIAR INSTANCIA
                </button>
            `;
        } else if (bot.status === 'offline') {
            statusColor = '#f44336';
            statusHtml = `<span class="status-dot" style="background:${statusColor}"></span> Fuera de línea`;
            actionHtml = `
                <button class="action-btn start-btn" onclick="startBotProcess('${id}')">REINICIAR</button>
                <button class="action-btn stop-btn" style="margin-top: 8px;" onclick="stopBotProcess('${id}')">DETENER PM2</button>
            `;
        } else if (bot.status === 'online') {
            statusColor = '#ff9800';
            statusHtml = `<span class="status-dot" style="background:${statusColor}"></span> Conectado (Sin sesión)`;
            actionHtml = `
                <button class="action-btn start-btn" onclick="sendCommand('${id}', 'start_bot')">ESCANEARE QR</button>
                <button class="action-btn stop-btn" style="margin-top: 8px;" onclick="stopBotProcess('${id}')">DETENER</button>
            `;
        } else if (bot.status === 'qr_required') {
            statusColor = '#ff9800';
            statusHtml = `<span class="status-dot" style="background:${statusColor}"></span> Escanea el QR`;
            actionHtml = `
                <div class="qr-display" style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: center;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(bot.qr || '')}" style="width: 150px; height: 150px;">
                </div>
                <button class="action-btn stop-btn" onclick="sendCommand('${id}', 'stop_bot')">CANCELAR QR</button>
            `;
        } else if (bot.status === 'ready') {
            statusColor = '#25d366';
            statusHtml = `<span class="status-dot" style="background:${statusColor}; box-shadow: 0 0 8px ${statusColor};"></span> Operativo`;
            actionHtml = `
                <div style="font-size:12px; color:#25d366; margin-bottom: 15px; text-align: center;">📱 ${bot.wid || 'Conectado'}</div>
                <button class="action-btn stop-btn" style="width: 100%;" onclick="stopBotProcess('${id}')">DESCONECTAR & CERRAR</button>
            `;
        }

        // Botón de eliminar (esquina superior)
        const deleteBtn = (id !== 'bot_1') ? `
            <button onclick="event.stopPropagation(); deleteBotInstance('${id}')" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: #f44336; cursor: pointer; opacity: 0.6;" title="Eliminar bot">
                <span class="material-icons" style="font-size: 18px;">delete</span>
            </button>
        ` : '';

        card.innerHTML = `
            ${deleteBtn}
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                <h3 style="margin: 0; color: ${color}; text-transform: uppercase;">${id.replace('_', ' ')}</h3>
                <div style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor};"></div>
            </div>
            <div class="qr-status" style="margin-bottom: 15px; text-align: center; font-weight: 600;">${statusHtml}</div>
            <div class="qr-actions" style="margin-top: auto;">${actionHtml}</div>
        `;
        grid.appendChild(card);
    });
}

async function startBotProcess(id) {
    try {
        const res = await fetch(`${API_URL}/api/bot/${id}/start`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            console.log(`Bot ${id} iniciado desde UI`);
            // El estado se actualizará vía socket cuando el bot se conecte
        } else { alert("Error: " + data.error); }
    } catch (e) { alert("Error conectando al servidor"); }
}

async function stopBotProcess(id) {
    if (!confirm(`¿Deseas detener completamente el proceso de ${id}?`)) return;
    try {
        const res = await fetch(`${API_URL}/api/bot/${id}/stop`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            console.log(`Bot ${id} detenido`);
            // Actualizar estado local inmediatamente para feedback visual
            const current = currentState.bots.get(id) || {};
            currentState.bots.set(id, { ...current, status: 'not_running' });
            renderBotControls();
        } else { alert("Error: " + data.error); }
    } catch (e) { alert("Error conectando al servidor"); }
}

async function deleteBotInstance(id) {
    if (!confirm(`¿Deseas ELIMINAR permanentemente el bot ${id} y todos sus archivos?`)) return;
    try {
        const res = await fetch(`${API_URL}/api/bot/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            currentState.bots.delete(id);
            renderBotControls();
            updateBotFilters();
        } else { alert("Error: " + data.message); }
    } catch (e) { alert("Error conectando al servidor"); }
}

async function generateNewBot() {
    const btn = event?.currentTarget;
    const originalText = btn?.innerHTML || '';

    if (confirm('¿Estás seguro de que deseas generar una nueva instancia de bot?')) {
        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span class="material-icons rotating" style="font-size:18px;">sync</span> Generando...`;
            }

            const response = await fetch(`${API_URL}/api/bot/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            const data = await response.json();
            if (data.success) {
                alert(`🚀 ¡Éxito! Nueva instancia '${data.bot.instanceId}' creada correctamente.

Para iniciar el bot:
1. Terminal: ${data.bot.startCommand}
2. PM2: ${data.bot.pm2Command}

El bot aparecerá en el dashboard cuando se conecte.`);

                // Refresh bot list
                renderBotControls();
            } else {
                alert(`❌ Error: ${data.message || data.error}`);
            }
        } catch (e) {
            console.error(e);
            alert('Error al intentar generar la instancia: ' + e.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    }
}

function sendCommand(instanceId, command, payload = {}) { socket.emit('command_bot', { instanceId, command, payload }); }

// --- LEADS PAGE ---
let currentLeadId = null;

async function fetchLeads() {
    try {
        const searchInput = getEl('leadSearchInput');
        const statusFilter = getEl('leadStatusFilter');
        const term = searchInput ? searchInput.value.trim() : '';
        const status = statusFilter ? statusFilter.value : '';

        const page = currentState.leadsPage || 1;
        const limit = 500;

        const url = new URL(`${API_URL}/json/leads`);
        url.searchParams.append('page', page);
        url.searchParams.append('limit', limit);
        if (status) url.searchParams.append('status', status);
        if (term) url.searchParams.append('search', term);

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            currentState.leads = data.leads;
            currentState.leadsTotalCount = data.pagination.total;
            currentState.leadsTotalPages = data.pagination.totalPages;
            renderLeadsTable();
        }
    } catch (e) { console.error(e); }
}

function renderLeadsTable() {
    const body = getEl('leadsTableBody'); if (!body) return;
    const leads = currentState.leads || [];

    body.innerHTML = '';

    const statusColors = {
        'pending': { bg: '#2f3b43', color: '#8696a0', text: 'Pendiente' },
        'queued': { bg: '#ff980025', color: '#ff9800', text: 'En cola' },
        'contacted': { bg: '#00a88425', color: '#00a884', text: 'Contactado' },
        'interested': { bg: '#25d36625', color: '#25d366', text: 'Interesado' },
        'not_interested': { bg: '#f4433625', color: '#f44336', text: 'No interesado' },
        'completed': { bg: '#7e57c225', color: '#7e57c2', text: 'Completado' }
    };

    leads.forEach(lead => {
        const st = statusColors[lead.status] || statusColors['pending'];
        const hasWeb = lead.hasWebsite || lead.website;
        const webIcon = hasWeb ?
            '<span class="material-icons" style="font-size:16px; color:#f44336;">language</span>' :
            '<span class="material-icons" style="font-size:16px; color:#25d366;">check_circle</span>';

        body.insertAdjacentHTML('beforeend', `
            <tr data-lead-id="${lead._id}" style="cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#1a2e38'" onmouseout="this.style.background=''">
                <td style="font-weight:600; color:#fff;">
                    ${lead.name || 'Sin nombre'}
                    ${lead.address ? `<div style="font-size:11px; color:#8696a0; margin-top:2px;">${lead.address.substring(0, 40)}${lead.address.length > 40 ? '...' : ''}</div>` : ''}
                </td>
                <td>${lead.phone || '-'}</td>
                <td style="color:#8696a0; font-size:12px;">${lead.location || '-'}</td>
                <td style="color:#8696a0; font-size:12px;">${lead.keyword || lead.category || '-'}</td>
                <td><span style="background:${st.bg}; color:${st.color}; padding:3px 8px; border-radius:4px; font-size:11px;">${st.text}</span></td>
                <td style="text-align:center;">${webIcon}</td>
                <td style="text-align:center; color:#8696a0;">${lead.messagesSent || 0}</td>
                <td>
                    <button class="delete-lead-btn" data-id="${lead._id}" style="background:none; border:none; cursor:pointer;">
                        <span class="material-icons" style="color:#f44336; font-size:18px;">delete</span>
                    </button>
                    <button class="view-lead-btn" data-id="${lead._id}" style="background:none; border:none; cursor:pointer; margin-left:5px;">
                        <span class="material-icons" style="color:#8696a0; font-size:18px;">visibility</span>
                    </button>
                </td>
            </tr>
        `);
    });

    // Update count and pagination UI
    const countEl = getEl('leadsCount');
    if (countEl) countEl.textContent = `${currentState.leadsTotalCount} leads encontrados`;

    const prevPage = getEl('prevPage');
    const nextPage = getEl('nextPage');
    const pageInfo = getEl('pageInfo');

    if (prevPage) prevPage.disabled = currentState.leadsPage <= 1;
    if (nextPage) nextPage.disabled = currentState.leadsPage >= currentState.leadsTotalPages;
    if (pageInfo) pageInfo.textContent = `Página ${currentState.leadsPage} de ${currentState.leadsTotalPages || 1}`;
}

function setupLeadsListeners() {
    const lsi = getEl('leadSearchInput');
    const lsf = getEl('leadStatusFilter');

    if (lsi) lsi.addEventListener('input', debounce(() => {
        currentState.leadsPage = 1;
        fetchLeads();
    }, 500));

    if (lsf) lsf.addEventListener('change', () => {
        currentState.leadsPage = 1;
        fetchLeads();
    });
}

function changePage(delta) {
    currentState.leadsPage += delta;
    if (currentState.leadsPage < 1) currentState.leadsPage = 1;
    if (currentState.leadsPage > currentState.leadsTotalPages) currentState.leadsPage = currentState.leadsTotalPages;
    fetchLeads();
}

async function deleteLeadFromList(leadId) {
    if (!confirm('¿Estás seguro de eliminar este lead?')) return;
    try {
        await fetch(`${API_URL}/lead/${leadId}`, { method: 'DELETE' });
        fetchLeads();
    } catch (e) { alert('Error: ' + e.message); }
}

function downloadLeadsJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentState.leads, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `leads_page_${currentState.leadsPage}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function openLeadModal(leadId) {
    // Asegurar que comparamos strings
    const lead = currentState.leads.find(l => String(l._id) === String(leadId));
    if (!lead) {
        console.error('Lead no encontrado para modal:', leadId);
        return;
    }

    currentLeadId = leadId;
    const modal = getEl('leadDetailModal');
    const nameEl = getEl('modalLeadName');
    const contentEl = getEl('modalLeadContent');

    if (nameEl) nameEl.textContent = lead.name || 'Sin nombre';

    const statusColors = {
        'pending': '#8696a0', 'queued': '#ff9800', 'contacted': '#00a884',
        'interested': '#25d366', 'not_interested': '#f44336', 'completed': '#7e57c2',
        'failed': '#f44336'
    };

    if (contentEl) {
        // Formatear reviews para mostrar texto si es array o string
        let reviewsHtml = '<span style="color:#666; font-style:italic;">Sin reseñas registradas</span>';
        if (lead.reviews) {
            if (Array.isArray(lead.reviews) && lead.reviews.length > 0) {
                reviewsHtml = `<ul style="padding-left:15px; margin:0;">${lead.reviews.map(r => `<li>"${r}"</li>`).join('')}</ul>`;
            } else if (typeof lead.reviews === 'string' && lead.reviews.length > 0) {
                reviewsHtml = lead.reviews;
            }
        }

        contentEl.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <!-- COLUMNA 1: INFO PRINCIPAL -->
                <div>
                    <h4 style="color:#00a884; font-size:12px; margin-bottom:8px; border-bottom: 1px solid #2f3b43; padding-bottom:5px;">📋 INFORMACIÓN DEL NEGOCIO</h4>
                    <div style="background:#1a2e38; padding:15px; border-radius:8px; margin-bottom:20px;">
                        <div style="margin-bottom:12px;">
                            <label style="color:#8696a0; font-size:11px;">Teléfono</label>
                            <div style="color:#fff; font-size:16px; font-weight:600;">
                                ${lead.phone || '<span style="color:#f44336">No disponible</span>'}
                                ${lead.phoneValidated ? '✅' : ''}
                            </div>
                        </div>
                         <div style="margin-bottom:12px;">
                            <label style="color:#8696a0; font-size:11px;">Categoría / Keyword</label>
                            <div style="color:#fff; font-size:14px;">${lead.category || lead.keyword || '-'}</div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="color:#8696a0; font-size:11px;">Dirección</label>
                            <div style="color:#fff; font-size:14px;">${lead.address || '-'}</div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="color:#8696a0; font-size:11px;">Ubicación (Zona)</label>
                            <div style="color:#fff; font-size:14px;">${lead.location || '-'}</div>
                        </div>
                         <div style="margin-bottom:12px;">
                            <label style="color:#8696a0; font-size:11px;">Sitio Web</label>
                            <div style="color:${lead.hasWebsite ? '#f44336' : '#25d366'}; font-size:14px;">
                                ${lead.website ? `<a href="${lead.website}" target="_blank" style="color:#53bdeb; text-decoration:none;">🔗 ${lead.website}</a>` : 'Sin sitio web'}
                            </div>
                        </div>
                    </div>

                    <h4 style="color:#00a884; font-size:12px; margin-bottom:8px; border-bottom: 1px solid #2f3b43; padding-bottom:5px;">⭐ REPUTACIÓN</h4>
                    <div style="background:#1a2e38; padding:15px; border-radius:8px;">
                        <div style="margin-bottom:12px;">
                            <label style="color:#8696a0; font-size:11px;">Rating Google Maps</label>
                            <div style="color:#ff9800; font-size:14px;">
                                ${lead.rating ? `⭐ <b>${lead.rating}</b> (${lead.reviewCount || 0} opiniones)` : 'Sin calificación'}
                            </div>
                        </div>
                        <div>
                            <label style="color:#8696a0; font-size:11px;">Reseñas Destacadas</label>
                            <div style="color:#d1d7db; font-size:12px; margin-top:5px; background:#111b21; padding:8px; border-radius:4px;">
                                ${reviewsHtml}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- COLUMNA 2: ESTADO CRM -->
                <div>
                    <h4 style="color:#7e57c2; font-size:12px; margin-bottom:8px; border-bottom: 1px solid #2f3b43; padding-bottom:5px;">🤖 ESTADO EN CRM</h4>
                    <div style="background:#1a2e38; padding:15px; border-radius:8px; margin-bottom:20px;">
                        <div style="margin-bottom:12px;">
                            <label style="color:#8696a0; font-size:11px;">Estado Actual</label>
                            <div><span style="background:${statusColors[lead.status] || '#888'}25; color:${statusColors[lead.status] || '#888'}; padding:4px 10px; border-radius:4px; font-size:12px; font-weight:600; text-transform:uppercase;">${lead.status}</span></div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="color:#8696a0; font-size:11px;">Bot Asignado</label>
                            <div style="color:#fff; font-size:14px;">${lead.assignedToInstance ? lead.assignedToInstance.replace('_', ' ').toUpperCase() : 'Ninguno'}</div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="color:#8696a0; font-size:11px;">Mensajes Enviados</label>
                            <div style="color:#fff; font-size:14px;">${lead.messagesSent || 0}</div>
                        </div>
                        <div>
                             <label style="color:#8696a0; font-size:11px;">Última Actividad</label>
                            <div style="color:#fff; font-size:14px;">${lead.lastMessageAt ? new Date(lead.lastMessageAt).toLocaleString() : 'Nunca'}</div>
                        </div>
                    </div>

                    ${lead.whatsappResponse ? `
                    <h4 style="color:#25d366; font-size:12px; margin-bottom:8px; border-bottom: 1px solid #2f3b43; padding-bottom:5px;">💬 RESPUESTA DEL CLIENTE</h4>
                    <div style="background:#005c4b; padding:15px; border-radius:8px; color:#fff; font-size:14px; border-left: 4px solid #25d366;">
                        "${lead.whatsappResponse}"
                    </div>
                    ` : ''}

                    <div style="margin-top:20px;">
                        <a href="${lead.mapsUrl}" target="_blank" class="action-btn" style="width:100%; display:block; text-align:center; background:#202c33; text-decoration:none; margin-bottom:10px;">
                            🗺️ Ver en Google Maps
                        </a>
                        ${lead.phone ? `
                            <a href="https://wa.me/${lead.phone}" target="_blank" class="action-btn" style="width:100%; display:block; text-align:center; background:#25d366; text-decoration:none;">
                                💬 Abrir WhatsApp Web
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <!-- DEBUG INFO (Occulto por defecto o pequeño) -->
            <div style="margin-top:30px; border-top:1px solid #2f3b43; padding-top:10px;">
                <details>
                    <summary style="color:#666; font-size:11px; cursor:pointer;">Ver JSON crudo (Debug)</summary>
                    <pre style="background:#000; color:#0f0; padding:10px; font-size:10px; overflow:auto; max-height:150px;">${JSON.stringify(lead, null, 2)}</pre>
                </details>
            </div>
        `;
    }

    if (modal) modal.style.display = 'flex';
}

function closeLeadModal() {
    const modal = getEl('leadDetailModal');
    if (modal) modal.style.display = 'none';
    currentLeadId = null;
}

async function reQueueLead() {
    if (!currentLeadId) return;
    try {
        await fetch(`${API_URL}/lead/${currentLeadId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'pending' })
        });
        alert('Lead vuelto a la cola');
        closeLeadModal();
        fetchLeads();
    } catch (e) { alert('Error: ' + e.message); }
}

async function remarkLead() {
    if (!currentLeadId) return;
    try {
        await fetch(`${API_URL}/lead/${currentLeadId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'pending', notes: 'REMARKETING' })
        });
        alert('Lead agregado a remarketing');
        closeLeadModal();
        fetchLeads();
    } catch (e) { alert('Error: ' + e.message); }
}

async function deleteLead() {
    if (!currentLeadId) return;
    if (!confirm('¿Estás seguro de eliminar este lead?')) return;
    try {
        await fetch(`${API_URL}/lead/${currentLeadId}`, { method: 'DELETE' });
        alert('Lead eliminado');
        closeLeadModal();
        fetchLeads();
    } catch (e) { alert('Error: ' + e.message); }
}

// --- ADVANCED STATS (CHARTS) ---
let chartInstances = {};

async function fetchAdvancedStats() {
    try {
        const response = await fetch(`${API_URL}/api/stats/advanced`);
        const data = await response.json();
        if (data.success) {
            renderCharts(data);
            fetchCategoryStats(); // Keep table updated too
        }
    } catch (e) { console.error("Error stats advanced:", e); }
}

function renderCharts(data) {
    // 1. Timeline Chart
    const ctxTimeline = document.getElementById('timelineChart').getContext('2d');
    if (chartInstances.timeline) chartInstances.timeline.destroy();

    chartInstances.timeline = new Chart(ctxTimeline, {
        type: 'line',
        data: {
            labels: data.timeline.leads.map(d => d._id),
            datasets: [
                {
                    label: 'Nuevos Leads',
                    data: data.timeline.leads.map(d => d.count),
                    borderColor: '#00a884',
                    backgroundColor: 'rgba(0, 168, 132, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Mensajes Enviados',
                    data: data.timeline.messages.map(d => d.count),
                    borderColor: '#25d366',
                    backgroundColor: 'rgba(37, 211, 102, 0.05)',
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#e9edef' } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#2f3b43' }, ticks: { color: '#8696a0' } },
                x: { grid: { display: false }, ticks: { color: '#8696a0' } }
            }
        }
    });

    // 2. Funnel Chart (Horizontal Bar)
    const ctxFunnel = document.getElementById('funnelChart').getContext('2d');
    if (chartInstances.funnel) chartInstances.funnel.destroy();

    // Calcular porcentajes
    const rates = {
        valid: data.funnel.total > 0 ? Math.round((data.funnel.valid / data.funnel.total) * 100) : 0,
        contacted: data.funnel.valid > 0 ? Math.round((data.funnel.contacted / data.funnel.valid) * 100) : 0,
        replied: data.funnel.contacted > 0 ? Math.round((data.funnel.replied / data.funnel.contacted) * 100) : 0,
        interested: data.funnel.replied > 0 ? Math.round((data.funnel.interested / data.funnel.replied) * 100) : 0
    };

    chartInstances.funnel = new Chart(ctxFunnel, {
        type: 'bar',
        data: {
            labels: ['Total Leads', 'Nros Válidos', 'Contactados', 'Respondieron', 'Interesados'],
            datasets: [{
                label: 'Conversion Funnel',
                data: [data.funnel.total, data.funnel.valid, data.funnel.contacted, data.funnel.replied, data.funnel.interested],
                backgroundColor: [
                    '#202c33',
                    '#8696a0',
                    '#00a884',
                    '#25d366',
                    '#ffd700'
                ],
                borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#2f3b43' }, ticks: { color: '#8696a0' } },
                y: { grid: { display: false }, ticks: { color: '#e9edef' } }
            }
        }
    });

    // Update text stats
    const statsDiv = document.getElementById('funnelStats');
    if (statsDiv) {
        statsDiv.innerHTML = `
            <div style="display:flex; justify-content:space-around; width:100%;">
                <span>📞 Válidos: <b>${rates.valid}%</b></span>
                <span>💬 Contacto: <b>${rates.contacted}%</b></span>
                <span>↩️ Respuesta: <b>${rates.replied}%</b></span>
                <span>⭐ Interés: <b>${rates.interested}%</b></span>
            </div>
        `;
    }

    // 3. Categories Chart (Doughnut)
    const ctxCat = document.getElementById('categoriesChart').getContext('2d');
    if (chartInstances.categories) chartInstances.categories.destroy();

    chartInstances.categories = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: data.categories.map(c => c._id || 'Otros'),
            datasets: [{
                data: data.categories.map(c => c.count),
                backgroundColor: ['#00a884', '#25d366', '#128c7e', '#075e54', '#34b7f1', '#536dfe'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#e9edef' } }
            }
        }
    });

    // 4. Sentiment Chart (Pie)
    const ctxSent = document.getElementById('sentimentChart').getContext('2d');
    if (chartInstances.sentiment) chartInstances.sentiment.destroy();

    // Map status to colors
    const sentData = {
        'pending': data.sentiments.pending || 0,
        'contacted': data.sentiments.contacted || 0,
        'replied': (data.sentiments.interested || 0) + (data.sentiments.not_interested || 0), // Aprox
        'interested': data.sentiments.interested || 0
    };

    chartInstances.sentiment = new Chart(ctxSent, {
        type: 'pie',
        data: {
            labels: ['Pendientes', 'Contactados', 'Interesados', 'Otros'],
            datasets: [{
                data: [sentData.pending, sentData.contacted, sentData.interested, (data.funnel.total - sentData.pending - sentData.contacted - sentData.interested)],
                backgroundColor: ['#8696a0', '#00a884', '#ffd700', '#202c33'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#e9edef', boxWidth: 10 } }
            }
        }
    });

    // 5. Locations Chart (Bar)
    const ctxLoc = document.getElementById('locationsChart').getContext('2d');
    if (chartInstances.locations) chartInstances.locations.destroy();

    chartInstances.locations = new Chart(ctxLoc, {
        type: 'bar',
        data: {
            labels: data.locations.map(l => l._id),
            datasets: [{
                label: 'Leads por Zona',
                data: data.locations.map(l => l.count),
                backgroundColor: '#34b7f1',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#8696a0', font: { size: 10 } } },
                y: { display: false }
            }
        }
    });
}


// --- CATEGORY STATS (LEGACY TABLE) ---
async function fetchCategoryStats() {
    // Legacy support: kept but called by fetchAdvancedStats now
    try {
        const response = await fetch(`${API_URL}/leads/categories`);
        const data = await response.json();
        if (data.success) renderCategoryStats(data.categories);
    } catch (e) { console.error(e); }
}

function renderCategoryStats(categories) {
    const tableBody = getEl('categoryTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    // Grid removed in favor of charts, only updating table
    categories.forEach(cat => {
        tableBody.insertAdjacentHTML('beforeend', `
            <tr><td style="font-weight:600; color:#fff;">${cat.keyword || 'Desconocido'}</td><td>${cat.count}</td><td style="color:#8696a0;">${cat.pending}</td><td style="color:#00a884;">${cat.contacted}</td><td style="color:#25d366;">${cat.interested}</td></tr>
        `);
    });
}

// --- MESSAGE TEMPLATES ---
async function fetchTemplates() {
    try {
        const response = await fetch(`${API_URL}/api/templates`);
        const data = await response.json();
        if (data.success) {
            currentState.templates = data.templates;
            renderTemplates();
            const status = getEl('templatesStatus');
            if (status) status.textContent = `Actualizado: ${new Date().toLocaleTimeString()}`;
        }
    } catch (e) {
        console.error("Error al cargar plantillas:", e);
        const container = getEl('messagesAccordion');
        if (container) container.innerHTML = `<div style="color:var(--danger); text-align:center; padding:20px;">Error al cargar plantillas.</div>`;
    }
}

function renderTemplates() {
    const container = getEl('messagesAccordion');
    if (!container) return;

    if (!currentState.templates || currentState.templates.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 50px; color: #8696a0;">No hay categorías de mensajes disponibles.</div>`;
        return;
    }

    container.innerHTML = '';

    const categoryNames = {
        'saludos': '👋 Saludos Iniciales',
        'introsNegocio': '🏢 Intros de Negocio',
        'hooksNoWeb': '⚠️ Hooks (Sin Web)',
        'hooksConWeb': '🌐 Hooks (Con Web)',
        'presentaciones': '✨ Presentaciones Nexte',
        'propuestas': '🚀 Propuestas Estratégicas',
        'respuestasBotAutomatico': '🤖 Respuestas Bot Automático',
        'serviciosCompletos': '📋 Servicios Completos',
        'ctasReunion': '📞 CTAs Reu/Llamada'
    };

    currentState.templates.forEach(cat => {
        const title = categoryNames[cat.category] || cat.category;
        const item = document.createElement('div');
        item.className = 'accordion-item';

        const variantsHtml = cat.variants.map((v, idx) => `
            <div class="variant-card">
                <div class="variant-header">
                    <span class="variant-title">VARIANTE ${idx + 1}</span>
                    <label style="display: flex; align-items: center; gap: 5px; font-size: 11px; color: #8696a0; cursor: pointer;">
                        <input type="checkbox" class="variant-toggle" data-category="${cat.category}" data-index="${idx}" ${v.isActive ? 'checked' : ''}> Activa
                    </label>
                </div>
                <textarea class="variant-editor" id="editor-${cat.category}-${idx}">${v.content}</textarea>
                <div class="variant-actions">
                    <button class="save-variant-btn" data-category="${cat.category}" data-index="${idx}">
                        <span class="material-icons" style="font-size: 14px;">save</span> Guardar
                    </button>
                </div>
            </div>
        `).join('');

        item.innerHTML = `
            <div class="accordion-header">
                <h3>${title} <span style="font-size: 11px; background: #202c33; padding: 2px 8px; border-radius: 10px; color: #8696a0;">${cat.variants.length}</span></h3>
                <span class="material-icons">expand_more</span>
            </div>
            <div class="accordion-content">
                ${variantsHtml}
                <div style="text-align: center; margin-top: 10px;">
                    <button class="action-btn add-variant-btn" data-category="${cat.category}" style="width: auto; padding: 8px 20px; font-size: 12px; border-color: var(--accent); color: var(--accent);">
                        + Agregar Nueva Variante
                    </button>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

async function saveVariant(category, index) {
    const textarea = document.getElementById(`editor-${category}-${index}`);
    const content = textarea.value.trim();
    if (!content) return alert("El mensaje no puede estar vacío");

    const categoryData = currentState.templates.find(c => c.category === category);
    if (!categoryData) return;

    const btn = event.currentTarget;
    const originalContent = btn.innerHTML;
    btn.classList.add('loading');
    btn.innerHTML = `<span class="material-icons rotating" style="font-size: 14px;">sync</span> Guardando...`;

    categoryData.variants[index].content = content;

    try {
        const response = await fetch(`${API_URL}/api/templates/${category}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variants: categoryData.variants })
        });

        const data = await response.json();
        if (data.success) {
            btn.style.background = '#00a884';
            btn.innerHTML = `<span class="material-icons" style="font-size: 14px;">check</span> Guardado`;
            setTimeout(() => {
                btn.style.background = '';
                btn.innerHTML = originalContent;
                btn.classList.remove('loading');
            }, 2000);
        }
    } catch (e) {
        alert("Error al guardar variante");
        btn.classList.remove('loading');
        btn.innerHTML = originalContent;
    }
}

async function toggleVariant(category, index) {
    const categoryData = currentState.templates.find(c => c.category === category);
    if (!categoryData) return;

    categoryData.variants[index].isActive = event.target.checked;

    try {
        await fetch(`${API_URL}/api/templates/${category}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variants: categoryData.variants })
        });
    } catch (e) {
        console.error("Error toggling variant:", e);
    }
}

function addVariant(category) {
    const categoryData = currentState.templates.find(c => c.category === category);
    if (!categoryData) return;

    categoryData.variants.push({ content: 'Nueva variante...', isActive: true });
    renderTemplates();
}

function setupTemplateListeners() {
    const jsonInput = getEl('jsonUploadInput');
    if (jsonInput) {
        // Remover listeners anteriores para evitar duplicados si se llama multiples veces
        const newJsonInput = jsonInput.cloneNode(true);
        jsonInput.parentNode.replaceChild(newJsonInput, jsonInput);

        newJsonInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            importTemplatesJSON(file);
            e.target.value = ''; // Reset
        });
    }
}

// --- TEMPLATE JSON IMPORT/EXPORT ---
function exportTemplatesJSON() {
    if (!currentState.templates || currentState.templates.length === 0) {
        alert("No hay plantillas para exportar.");
        return;
    }
    try {
        const blob = new Blob([JSON.stringify(currentState.templates, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "mensajes_bot_nexte.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        alert("Error al exportar JSON: " + e.message);
    }
}

function importTemplatesJSON(file) {
    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const json = JSON.parse(e.target.result);
            if (!Array.isArray(json)) throw new Error("Formato inválido: Se esperaba un array");

            // Validar estructura básica
            const valid = json.every(cat => cat.category && Array.isArray(cat.variants));
            if (!valid) throw new Error("Estructura JSON inválida. Requiere 'category' y array 'variants'.");

            // Subir cada categoría al servidor
            let successCount = 0;
            const statusEl = getEl('templatesStatus');
            if (statusEl) statusEl.textContent = "⏳ Importando...";

            for (const cat of json) {
                try {
                    await fetch(`${API_URL}/api/templates/${cat.category}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ variants: cat.variants })
                    });
                    successCount++;
                } catch (err) {
                    console.error(`Error importando ${cat.category}:`, err);
                }
            }

            alert(`✅ Importación completada: ${successCount} categorías actualizadas.`);
            fetchTemplates();

        } catch (error) {
            alert("Error al leer el archivo JSON: " + error.message);
        }
    };
    reader.readAsText(file);
}

// --- GLOBAL EXPORTS ---
window.openLeadModal = openLeadModal;
window.toggleAccordion = toggleAccordion;
window.exportTemplatesJSON = exportTemplatesJSON;
window.importTemplatesJSON = importTemplatesJSON;
window.deleteLeadFromList = deleteLeadFromList;
window.downloadLeadsJSON = downloadLeadsJSON;
window.startBotProcess = startBotProcess;
window.stopBotProcess = stopBotProcess;
window.deleteBotInstance = deleteBotInstance;
window.generateNewBot = generateNewBot;
window.changePage = changePage;
window.clearAllConsoles = clearAllConsoles;
window.toggleConsole = toggleConsole;
window.saveVariant = saveVariant;
window.toggleVariant = toggleVariant;
window.addVariant = addVariant;
window.toggleAccordion = toggleAccordion;
window.closeLeadModal = closeLeadModal; // Fix: Expose to global scope for inline handler




function setupDelegatedListeners() {
    document.addEventListener('click', (e) => {
        // 1. Accordion Toggle
        const header = e.target.closest('.accordion-header');
        if (header) {
            const item = header.parentElement;
            if (item) item.classList.toggle('active');
            return;
        }

        // 2. Leads Table Actions
        const leadRow = e.target.closest('tr[data-lead-id]');
        if (leadRow) {
            // Check if delete button was clicked
            if (e.target.closest('.delete-lead-btn')) {
                const leadId = e.target.closest('.delete-lead-btn').dataset.id;
                deleteLeadFromList(leadId);
                return;
            }
            // Click anywhere else on the row opens the modal
            const leadId = leadRow.dataset.leadId;
            openLeadModal(leadId);
            return;
        }

        // 3. Variant Actions
        if (e.target.closest('.save-variant-btn')) {
            const btn = e.target.closest('.save-variant-btn');
            const cat = btn.dataset.category;
            const idx = parseInt(btn.dataset.index);
            saveVariant(cat, idx, btn);
            return;
        }

        if (e.target.closest('.add-variant-btn')) {
            const btn = e.target.closest('.add-variant-btn');
            addVariant(btn.dataset.category);
            return;
        }
    });

    // Variant Toggles (Checkbox change)
    document.addEventListener('change', (e) => {
        if (e.target.matches('.variant-toggle')) {
            const cat = e.target.dataset.category;
            const idx = parseInt(e.target.dataset.index);
            toggleVariant(cat, idx, e.target.checked);
        }
    });
}

// --- CONFIGURACIÓN GLOBAL (Scheduler & Limits) ---
async function fetchGlobalConfig() {
    try {
        const response = await fetch(`${API_URL}/api/config`);
        const data = await response.json();
        
        if (data.success && data.config) {
            const cfg = data.config;
            const sched = cfg.schedule || { enabled: false, startTime: '09:00', endTime: '18:00', timezone: 'America/Argentina/Buenos_Aires', randomness: 15, days: [1,2,3,4,5] };
            const seq = cfg.sequences || { maxMessagesPerDay: 200, coolOffPeriod: 15 };
            const human = cfg.humanBehavior || { typingSpeed: 1.0 };

            // Hydrate Scheduler
            const tgl = getEl('schedEnabled'); if(tgl) tgl.checked = sched.enabled;
            const start = getEl('schedStartTime'); if(start) start.value = sched.startTime;
            const end = getEl('schedEndTime'); if(end) end.value = sched.endTime;
            const tz = getEl('schedTimezone'); if(tz) tz.value = sched.timezone;
            const rnd = getEl('schedRandomness'); if(rnd) { rnd.value = sched.randomness; }
            const rndVal = getEl('schedRandomVal'); if(rndVal) rndVal.innerText = sched.randomness;

            // Hydrate Limits
            const max = getEl('limitMaxDaily'); if(max) max.value = seq.maxMessagesPerDay;
            const maxVal = getEl('limitMaxDailyVal'); if(maxVal) maxVal.innerText = seq.maxMessagesPerDay;
            
            const cool = getEl('limitCooloff'); if(cool) cool.value = seq.coolOffPeriod;
            const coolVal = getEl('limitCooloffVal'); if(coolVal) coolVal.innerText = seq.coolOffPeriod;

            const type = getEl('humanTypingSpeed'); if(type) type.value = human.typingSpeed;
            const typeVal = getEl('humanTypingVal'); if(typeVal) typeVal.innerText = human.typingSpeed;
        }
    } catch (e) {
        console.error("Error fetching config:", e);
        alert("Error cargando configuración.");
    }
}

async function saveGlobalConfig() {
    const tgl = getEl('schedEnabled'); 
    const start = getEl('schedStartTime');
    const end = getEl('schedEndTime');
    const tz = getEl('schedTimezone');
    const rnd = getEl('schedRandomness');
    
    const max = getEl('limitMaxDaily');
    const cool = getEl('limitCooloff');
    const type = getEl('humanTypingSpeed');

    const newSettings = {
        schedule: {
            enabled: tgl ? tgl.checked : false,
            startTime: start ? start.value : '09:00',
            endTime: end ? end.value : '18:00',
            timezone: tz ? tz.value : 'America/Argentina/Buenos_Aires',
            randomness: rnd ? parseInt(rnd.value) : 15,
            days: [1,2,3,4,5] // Default Mon-Fri for now
        },
        sequences: {
            maxMessagesPerDay: max ? parseInt(max.value) : 200,
            coolOffPeriod: cool ? parseInt(cool.value) : 15
        },
        humanBehavior: {
            typingSpeed: type ? parseFloat(type.value) : 1.0,
            readingSpeed: 1.0
        }
    };

    try {
        const response = await fetch(`${API_URL}/api/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: newSettings })
        });
        const data = await response.json();
        if (data.success) {
            alert("Configuración guardada y sincronizada con la flota.");
        } else {
            alert("Error guardando configuración: " + (data.error || 'Desconocido'));
        }
    } catch (e) {
        alert("Error de red al guardar.");
    }
}
