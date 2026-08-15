// Usar ruta relativa si estamos en el mismo puerto que el servidor API (8484)
// De lo contrario, usar URL absoluta (ej. si se accede por el puerto 8485)
const API_URL = window.location.port === '8484' ? '' : `http://${window.location.hostname}:8484`;
const REFRESH_INTERVAL = 5000;

function formatPhoneClean(phone) {
    if (!phone) return '';
    let clean = String(phone).replace('@c.us', '').replace('@lid', '').replace(/\D/g, '');
    if (clean.startsWith('549')) {
        if (clean.length === 13) {
            return `+54 9 ${clean.substring(3, 5)} ${clean.substring(5, 9)}-${clean.substring(9)}`;
        }
        return `+54 9 ${clean.substring(3)}`;
    } else if (clean.startsWith('54')) {
        return `+54 ${clean.substring(2)}`;
    }
    return `+${clean}`;
}

// Wrapper para fetch que maneja el prefijo /api/, credenciales y redirección a login
async function fetchAPI(endpoint, options = {}) {
    // Asegurar que el endpoint empiece con /api/ si no lo tiene
    const path = endpoint.startsWith('http') ? endpoint : (endpoint.startsWith('/api/') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`);
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${path}`;

    // Forzar el envío de cookies de sesión
    options.credentials = 'include';

    try {
        console.log(`📡 Fetching API: ${url}`);
        const response = await fetch(url, options);

        // Si la respuesta es 401 o contiene loginRequired, redirigir al login
        if (response.status === 401) {
            console.warn("⚠️ Sesión expirada o no autorizada. Redirigiendo a login...");
            const redirectUrl = API_URL ? `${API_URL}/login.html` : '/login.html';
            window.location.href = redirectUrl;
            throw new Error("No autorizado");
        }

        if (!response.ok) {
            console.error(`❌ API Error [${response.status}]: ${response.statusText} en ${url}`);
        }

        // Clonar la respuesta para poder leer el cuerpo sin consumirlo
        const clonedResponse = response.clone();
        try {
            const data = await clonedResponse.json();
            console.log(`✅ [${path}] Response:`, data);
        } catch (parseError) {
            // No es JSON, ignorar el log del cuerpo
        }

        return response;
    } catch (error) {
        console.error(`🚨 Network Error at ${url}:`, error);
        throw error;
    }
}

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

// UI Helpers
const ui = {
    modal: {
        show: (title, message, iconType = 'info', buttons = []) => {
            return new Promise((resolve) => {
                const modal = document.getElementById('genericModal');
                const titleEl = document.getElementById('genericModalTitle');
                const msgEl = document.getElementById('genericModalMessage');
                const iconEl = document.getElementById('genericModalIcon');
                const btnContainer = document.getElementById('genericModalButtons');

                titleEl.textContent = title;
                msgEl.textContent = message;

                // Icon
                let iconHtml = '';
                if (iconType === 'info') iconHtml = '<span class="material-icons" style="font-size: 48px; color: #2196f3;">info</span>';
                if (iconType === 'success') iconHtml = '<span class="material-icons" style="font-size: 48px; color: #25d366;">check_circle</span>';
                if (iconType === 'warning') iconHtml = '<span class="material-icons" style="font-size: 48px; color: #ff9800;">warning</span>';
                if (iconType === 'error') iconHtml = '<span class="material-icons" style="font-size: 48px; color: #f44336;">error</span>';
                iconEl.innerHTML = iconHtml;

                // Buttons
                btnContainer.innerHTML = '';
                buttons.forEach(btn => {
                    const button = document.createElement('button');
                    button.textContent = btn.text;
                    button.className = 'action-btn';
                    button.style.background = btn.color || '#202c33';
                    button.style.padding = '8px 20px';
                    button.onclick = () => {
                        modal.style.display = 'none';
                        resolve(btn.value);
                    };
                    btnContainer.appendChild(button);
                });

                modal.style.display = 'flex';
            });
        },
        alert: async (title, message, type = 'info') => {
            await ui.modal.show(title, message, type, [{ text: 'Entendido', value: true, color: '#00a884' }]);
        },
        confirm: async (title, message, type = 'warning') => {
            return await ui.modal.show(title, message, type, [
                { text: 'Cancelar', value: false, color: '#202c33' },
                { text: 'Confirmar', value: true, color: '#00a884' }
            ]);
        }
    }
};

// Real-time Connection
let socket;
function initSocket() {
    socket = io(API_URL);

    socket.on('connect', () => {
        console.log('📡 Dashboard conectado');
        socket.emit('identify', { type: 'dashboard' });
    });

    socket.on('bot_list_update', (botsArray) => {
        console.log('🔄 bot_list_update recibido:', botsArray);
        // botsArray viene del servidor como Array.from(botStatuses.entries()) = [['bot_1', {...}], ...]
        if (Array.isArray(botsArray) && botsArray.length > 0) {
            // Verificar formato: puede ser [[id, status], ...] o [{instanceId, status}, ...]
            if (Array.isArray(botsArray[0])) {
                // Formato Map entries: [['bot_1', {status:...}], ...]
                currentState.bots = new Map(botsArray);
            } else if (botsArray[0].instanceId) {
                // Formato objetos: [{instanceId: 'bot_1', status:...}, ...]
                botsArray.forEach(b => {
                    currentState.bots.set(b.instanceId, { status: b.status, wid: b.wid, qr: b.qr });
                });
            }
        }
        renderBotControls();
        updateBotFilters(); // Actualizar filtros de bots dinámicamente
    });

    socket.on('bot_status_update', (data) => {
        const { instanceId, status, wid, qr, battery, limits, statusInfo } = data;
        const current = currentState.bots.get(instanceId) || {};
        currentState.bots.set(instanceId, { 
            ...current, 
            status: status || current.status, 
            wid: wid !== undefined ? wid : current.wid, 
            qr: qr !== undefined ? qr : current.qr,
            battery: battery !== undefined ? battery : current.battery,
            limits: limits !== undefined ? limits : current.limits,
            statusInfo: statusInfo !== undefined ? statusInfo : current.statusInfo
        });
        renderBotControls();
    });

    socket.on('new_message', (data) => handleIncomingRealtimeMessage(data));
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
    fetchLogsHistory();

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
        const response = await fetchAPI('/stats');
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
        const response = await fetchAPI('/stats/realtime');
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
            const s = data.stats;
            if (getEl('rtLeadsQueue')) getEl('rtLeadsQueue').innerText = s.queue.total || 0;
            if (getEl('rtMessagesToday')) getEl('rtMessagesToday').innerText = s.messages.today || 0;
            if (getEl('rtDelivered')) getEl('rtDelivered').innerText = s.messages.deliveredToday || 0;
            if (getEl('rtFailed')) getEl('rtFailed').innerText = s.messages.failedToday || 0;
            if (getEl('rtContactados')) getEl('rtContactados').innerText = s.leads.contactedToday || 0;
            if (getEl('rtLeadsFailed')) getEl('rtLeadsFailed').innerText = s.leads.failedToday || 0;

            if (s.businessHours && getEl('statBizHours')) {
                getEl('statBizHours').innerText = `${s.businessHours.start} a ${s.businessHours.end}`;
            }

            if (s.lastMessage) {
                const last = s.lastMessage;
                if (getEl('rtLastMessage')) getEl('rtLastMessage').innerText = new Date(last.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                if (getEl('rtLastMessageInfo')) getEl('rtLastMessageInfo').innerText = `${last.instanceId} → ${last.leadName || 'Lead'}`;
            }

            // Renderizado dinámico de tarjetas de bots
            renderBotSessionCards(s.bots);

            // Actualizar historial histórico
            fetchBotHistory();
        }
    } catch (e) { console.error('Error fetching realtime stats:', e); }
}

// --- FETCH BOTS ---
async function renderBotSessionCards(bots) {
    const container = getEl('perBotStatsContainer');
    if (!container) return;

    const botColors = { 'bot_1': '#00a884', 'bot_2': '#7e57c2', 'bot_3': '#ff9800', 'bot_4': '#2196f3' };

    // Si no hay bots activos, mostrar placeholder
    if (!bots || bots.length === 0) {
        container.innerHTML = '<div style="color: #666; font-size: 13px; text-align: center; width: 100%;">Esperando conexión de bots...</div>';
        return;
    }

    container.innerHTML = bots.map(bot => {
        const color = botColors[bot.instanceId] || '#00bcd4';
        const startStr = bot.startedAt ? new Date(bot.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

        let batteryHtml = '';
        if (bot.battery) {
            const battIcon = bot.battery.plugged ? '⚡' : '';
            batteryHtml = `<div style="font-size: 10px; color: #8696a0;">🔋 ${bot.battery.level}% ${battIcon}</div>`;
        }
        let limitHtml = '';
        if (bot.limits) {
            limitHtml = `<div style="font-size: 10px; color: #8696a0;">🎯 Límite: ${bot.limits.processed}/${bot.limits.max}</div>`;
        }
        let sleepHtml = '';
        if (bot.statusInfo) {
            let sleepText = 'Activo';
            let sleepColor = '#25d366';
            if (bot.statusInfo.outsideHours) {
                sleepText = '🌙 Fuera de hora';
                sleepColor = '#ff9800';
            } else if (bot.statusInfo.sleepMode) {
                sleepText = '💤 Suspendido';
                sleepColor = '#2196f3';
            }
            sleepHtml = `<div style="font-size: 10px; color: ${sleepColor}; font-weight: 600;">${sleepText}</div>`;
        }

        return `
            <div class="bot-daily-card" style="background: #111b21; border: 1px solid ${color}40; border-radius: 10px; padding: 15px; display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 32px; height: 32px; background: ${color}20; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: ${color};">
                        ${bot.instanceId.split('_')[1] || '1'}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 11px; color: #8696a0; text-transform: uppercase;">${bot.instanceId.replace('_', ' ')}</div>
                        <div style="font-size: 10px; color: ${bot.status === 'ready' ? '#25d366' : '#ff9800'}; font-weight: 600;">${bot.status.toUpperCase()}</div>
                    </div>
                    <div style="text-align: right;">
                        ${sleepHtml || `
                        <div style="font-size: 10px; color: #666;">Iniciado</div>
                        <div style="font-size: 11px; color: #8696a0;">${startStr}</div>
                        `}
                    </div>
                </div>
                ${(batteryHtml || limitHtml) ? `
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #2f3b4350; padding-top: 8px; margin-top: 5px;">
                    ${batteryHtml}
                    ${limitHtml}
                </div>
                ` : ''}
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-top: 1px solid #2f3b4350; padding-top: 10px; margin-top: 5px;">
                    <div style="text-align: center;">
                        <div style="font-size: 18px; font-weight: 700; color: #fff;">${bot.sessionLeads}</div>
                        <div style="font-size: 9px; color: #8696a0; text-transform: uppercase;">Leads hoy</div>
                    </div>
                    <div style="text-align: center; border-left: 1px solid #2f3b4350;">
                        <div style="font-size: 18px; font-weight: 700; color: #fff;">${bot.sessionMessages}</div>
                        <div style="font-size: 9px; color: #8696a0; text-transform: uppercase;">Mensajes</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
async function fetchBotHistory() {
    try {
        const res = await fetchAPI('/api/stats/history');
        const data = await res.json();
        if (data.success) {
            const tbody = getEl('botHistoryTableBody');
            if (!tbody) return;

            if (!data.history || data.history.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #666;">Sin datos históricos aún.</td></tr>';
                return;
            }

            tbody.innerHTML = data.history.map(h => {
                const numbersStr = h.numbers.length > 0 ? h.numbers.join(', ') : '<span style="color:#666">Ninguno</span>';
                const lastSeen = h.lastSeenAt ? new Date(h.lastSeenAt).toLocaleString() : 'N/A';

                // Formatear logs de desconexión (mostrar los últimos 2 motivos)
                const logsStr = h.disconnectionLogs && h.disconnectionLogs.length > 0
                    ? h.disconnectionLogs.slice(-2).map(l => `<div style="font-size:10px; color:#ff9800;">• ${l.reason} (${new Date(l.timestamp).toLocaleDateString()})</div>`).join('')
                    : '<span style="color:#666; font-size:10px;">Sin registros</span>';

                return `
                    <tr style="border-top: 1px solid #2f3b43;">
                        <td style="padding: 15px; font-weight: bold; color: #00a884;">${h.instanceId.toUpperCase()}</td>
                        <td style="padding: 15px;">
                            <span style="background: ${h.logoutCount > 5 ? '#f44336' : '#202c33'}; padding: 4px 8px; border-radius: 4px;">
                                ${h.logoutCount}
                            </span>
                        </td>
                        <td style="padding: 15px; font-weight: bold;">${h.totalMessages || 0}</td>
                        <td style="padding: 15px; font-size: 11px; font-family: monospace; max-width: 200px; word-break: break-all;">
                            ${numbersStr}
                        </td>
                        <td style="padding: 15px;">${logsStr}</td>
                        <td style="padding: 15px; font-size: 11px; color: #8696a0;">${lastSeen}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (e) { console.error('Error fetching bot history:', e); }
}

async function fetchBotList() {
    try {
        const res = await fetchAPI('/bots/list');
        const data = await res.json();
        console.log('📋 fetchBotList response:', data);

        if (data.success && Array.isArray(data.bots) && data.bots.length > 0) {
            console.log('📋 Bots detectados:', data.bots.map(b => `${b.instanceId}:${b.status}`).join(', '));
            // Actualizar map
            data.bots.forEach(b => {
                if (b.instanceId) {
                    const current = currentState.bots.get(b.instanceId) || {};
                    currentState.bots.set(b.instanceId, { ...current, status: b.status, wid: b.wid, qr: b.qr });
                }
            });
            renderBotControls();
            updateBotFilters();
        } else {
            console.warn('⚠️ Respuesta de bots vacía o inválida, usando fallback');
            renderBotControls();
        }
    } catch (e) {
        console.error("❌ Error en fetchBotList:", e);
        renderBotControls();
    }
}

// --- BOT STATISTICS ---
let botStatsData = null;
let countdownInterval = null;

async function fetchBotStats() {
    try {
        const response = await fetchAPI('/stats/bots');
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

// (Console functions appendConsoleLog, toggleConsole, and clearAllConsoles removed here; defined at end of file)

// --- SETTINGS ---
async function fetchBotConfig() {
    try {
        const res = await fetchAPI('/bot/config');
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
            const res = await fetchAPI('/bot/config', {
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
        const response = await fetchAPI(`/conversations?limit=500`);
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
        if (!newConvs[phone]) {
            newConvs[phone] = { 
                phone, 
                name: msg.leadName || phone, 
                messages: [], 
                lastMessage: '', 
                lastTime: null, 
                instanceId: msg.instanceId,
                lead: msg.leadId || null
            };
        } else if (!newConvs[phone].lead && msg.leadId) {
            newConvs[phone].lead = msg.leadId;
        }
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
        
        const lead = chat.lead;
        let aiBadge = '';
        let tagPills = '';
        if (lead) {
            aiBadge = getAiIntentBadge(lead);
            aiBadge = aiBadge.replace('margin-top: 4px;', 'margin-top: 0;');

            if (lead.botPaused || lead.manualIntervention) {
                tagPills += `<span style="background: rgba(255, 152, 0, 0.2); color: #ff9800; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: 700;" title="IA Pausada / Manual">⏸️ Manual</span>`;
            }
            if (lead.tags && Array.isArray(lead.tags) && lead.tags.length > 0) {
                tagPills += `<span style="background: rgba(83, 189, 235, 0.15); color: #53bdeb; font-size: 9px; padding: 1px 4px; border-radius: 3px;" title="Etiquetas: ${lead.tags.join(', ')}">🏷️ ${lead.tags[0]}</span>`;
            }
        }

        list.insertAdjacentHTML('beforeend', `
            <div class="chat-item ${isActive}" data-phone="${chat.phone}">
                <div class="chat-item-avatar"><img src="${avatar}"></div>
                <div class="chat-item-content">
                    <div class="chat-row-1">
                        <span class="chat-name">${chat.name}</span>
                        <span class="chat-time">${time}</span>
                    </div>
                    <div class="chat-row-2" style="display:flex; justify-content:space-between; align-items:center; margin-top: 4px;">
                        <div style="display:flex; align-items:center; gap:5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:78%;">
                            ${aiBadge}
                            ${tagPills}
                            <span class="chat-last-msg" style="margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${chat.lastMessage}</span>
                        </div>
                        <span class="bot-badge" style="background:${botColor}; font-size:10px; flex-shrink:0;">${chat.instanceId ? (chat.instanceId === 'bot' ? 'B1' : chat.instanceId.replace('bot_', 'B')) : 'B1'}</span>
                    </div>
                </div>
            </div>`);
    });
    document.querySelectorAll('.chat-item').forEach(item => item.addEventListener('click', () => openChat(item.dataset.phone)));
}

async function openChat(phone) {
    currentState.activeChatPhone = phone; 
    renderChatList();
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

    // Actualizar controles de IA y etiquetas
    await loadAndRenderActiveChatControls(phone);
    renderMessages(phone);
}

async function loadAndRenderActiveChatControls(phone) {
    let lead = currentState.conversations[phone]?.lead;
    try {
        const res = await fetchAPI(`/lead/by-phone/${encodeURIComponent(phone)}`);
        const data = await res.json();
        if (data.success && data.lead) {
            lead = data.lead;
            if (currentState.conversations[phone]) {
                currentState.conversations[phone].lead = lead;
            }
        }
    } catch (e) {
        // Fallback al lead existente en memoria
    }
    renderActiveChatControls(lead);
}

function renderActiveChatControls(lead) {
    const isPaused = lead ? (lead.botPaused === true || lead.manualIntervention === true) : false;
    const btnToggle = getEl('btnToggleBotIA');
    const txtToggle = getEl('toggleBotIAText');
    const banner = getEl('chatManualNoticeBanner');
    const tagsContainer = getEl('activeChatTagsContainer');

    if (btnToggle && txtToggle) {
        if (isPaused) {
            btnToggle.style.background = '#ff9800';
            btnToggle.style.color = '#111';
            txtToggle.textContent = 'IA: PAUSADA';
            btnToggle.title = 'Hacer clic para reactivar respuestas automáticas de IA';
        } else {
            btnToggle.style.background = '#00a884';
            btnToggle.style.color = '#fff';
            txtToggle.textContent = 'IA: ACTIVA';
            btnToggle.title = 'Hacer clic para pausar la IA y atender manualmente';
        }
    }

    if (banner) {
        banner.style.display = isPaused ? 'flex' : 'none';
    }

    if (tagsContainer) {
        tagsContainer.innerHTML = '';
        const tags = (lead && Array.isArray(lead.tags)) ? lead.tags : [];
        tags.forEach(tag => {
            tagsContainer.insertAdjacentHTML('beforeend', `
                <span style="background: rgba(83, 189, 235, 0.15); color: #53bdeb; border: 1px solid rgba(83, 189, 235, 0.3); padding: 2px 8px; border-radius: 12px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
                    🏷️ ${tag}
                    <button onclick="removeTagFromActiveChat('${tag}')" style="background:none; border:none; color:#ff7043; cursor:pointer; font-size:12px; padding:0; line-height:1;" title="Quitar etiqueta">&times;</button>
                </span>
            `);
        });
    }
}

async function toggleActiveChatBotIA(forceEnable = false) {
    const phone = currentState.activeChatPhone;
    if (!phone) return;

    let lead = currentState.conversations[phone]?.lead;
    const currentlyPaused = lead ? (lead.botPaused === true || lead.manualIntervention === true) : false;
    const newPaused = forceEnable ? false : !currentlyPaused;

    try {
        const res = await fetchAPI(`/lead/by-phone/${encodeURIComponent(phone)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                botPaused: newPaused,
                manualIntervention: newPaused ? true : false
            })
        });
        const data = await res.json();
        if (data.success && data.lead) {
            if (currentState.conversations[phone]) {
                currentState.conversations[phone].lead = data.lead;
            }
            renderActiveChatControls(data.lead);
            renderChatList();
        }
    } catch (e) {
        console.error('Error toggling bot IA:', e);
    }
}

async function promptAddTagToActiveChat() {
    const phone = currentState.activeChatPhone;
    if (!phone) return;

    const tag = prompt('Ingresá una etiqueta (Ej: Cliente, En Seguimiento, No Responder, Cotizado):');
    if (!tag || !tag.trim()) return;

    const cleanTag = tag.trim();
    let lead = currentState.conversations[phone]?.lead;
    const currentTags = (lead && Array.isArray(lead.tags)) ? [...lead.tags] : [];

    if (!currentTags.includes(cleanTag)) {
        currentTags.push(cleanTag);
        try {
            const res = await fetchAPI(`/lead/by-phone/${encodeURIComponent(phone)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags: currentTags })
            });
            const data = await res.json();
            if (data.success && data.lead) {
                if (currentState.conversations[phone]) {
                    currentState.conversations[phone].lead = data.lead;
                }
                renderActiveChatControls(data.lead);
                renderChatList();
            }
        } catch (e) {
            console.error('Error adding tag:', e);
        }
    }
}

async function removeTagFromActiveChat(tagToRemove) {
    const phone = currentState.activeChatPhone;
    if (!phone) return;

    let lead = currentState.conversations[phone]?.lead;
    const currentTags = (lead && Array.isArray(lead.tags)) ? [...lead.tags] : [];
    const updatedTags = currentTags.filter(t => t !== tagToRemove);

    try {
        const res = await fetchAPI(`/lead/by-phone/${encodeURIComponent(phone)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: updatedTags })
        });
        const data = await res.json();
        if (data.success && data.lead) {
            if (currentState.conversations[phone]) {
                currentState.conversations[phone].lead = data.lead;
            }
            renderActiveChatControls(data.lead);
            renderChatList();
        }
    } catch (e) {
        console.error('Error removing tag:', e);
    }
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

    const handleSend = async () => {
        if (!chatInput) return;
        const text = chatInput.value.trim(); if (!text || !currentState.activeChatPhone) return;
        const phone = currentState.activeChatPhone;
        const chat = currentState.conversations[phone];

        // Emitir mensaje al bot
        socket.emit('command_bot', { 
            instanceId: chat?.instanceId || 'bot_1', 
            command: 'send_whatsapp_message', 
            payload: { phone: phone, message: text } 
        });

        // 🛡️ REGLA: Intervención manual pausa automáticamente la IA para este chat
        try {
            await fetchAPI(`/lead/by-phone/${encodeURIComponent(phone)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    botPaused: true,
                    manualIntervention: true
                })
            });
            if (chat && chat.lead) {
                chat.lead.botPaused = true;
                chat.lead.manualIntervention = true;
                renderActiveChatControls(chat.lead);
                renderChatList();
            }
        } catch (e) {
            console.error('Error auto-pausing bot on manual message:', e);
        }

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
    const { from, to, body, content, sentAt, timestamp, instanceId, fromMe, leadName } = data;

    // El servidor puede enviar body o content, y sentAt o timestamp
    const msgContent = body || content || '';
    const msgTime = sentAt || timestamp || new Date();

    // Normalizar teléfono
    let phone;
    if (fromMe === true || from === 'me') {
        phone = (to || '').split('@')[0].replace(/\D/g, '');
    } else {
        phone = (from || '').split('@')[0].replace(/\D/g, '');
    }

    if (!phone) return;

    if (!currentState.conversations[phone]) {
        // Si es un chat nuevo, refrescar lista
        fetchConversations();
        return;
    }

    const chat = currentState.conversations[phone];

    // Evitar duplicados visuales si el mensaje ya llegó por polling o evento previo
    const isDuplicate = chat.messages.some(m =>
        m.content === msgContent &&
        Math.abs(new Date(m.sentAt) - new Date(msgTime)) < 2000
    );

    if (isDuplicate) return;

    chat.messages.push({
        phone,
        content: msgContent,
        sentAt: msgTime,
        fromMe: fromMe === true || from === 'me',
        instanceId,
        leadName: leadName || chat.name
    });

    chat.lastMessage = msgContent;
    chat.lastTime = msgTime;

    if (currentState.activeChatPhone === phone) {
        renderMessages(phone);
    }
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
        
        if (bot.status === 'not_running' || !bot.status) {
            card.style.opacity = '0.55';
            card.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
            card.setAttribute('onmouseover', "this.style.opacity='1';");
            card.setAttribute('onmouseout', "this.style.opacity='0.55';");
        }

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
        } else if (bot.status === 'starting') {
            statusColor = '#2196f3';
            statusHtml = `<span class="status-dot" style="background:${statusColor}; animation: pulse 1s infinite;"></span> Iniciando...`;
            actionHtml = `
                <div style="text-align: center; color: #888; padding: 15px;">
                    <span class="material-icons rotating" style="font-size: 32px; color: ${color};">sync</span>
                    <p style="margin-top: 10px;">Esperando conexión del bot...</p>
                    <p style="font-size: 11px; opacity: 0.7;">El QR aparecerá cuando el bot se conecte</p>
                </div>
                <button class="action-btn stop-btn" style="margin-top: 8px;" onclick="stopBotProcess('${id}')">CANCELAR</button>
            `;
        } else if (bot.status === 'online') {
            statusColor = '#ff9800';
            statusHtml = `<span class="status-dot" style="background:${statusColor}"></span> Listo (Sin sesión)`;
            actionHtml = `
                <button class="action-btn start-btn" onclick="this.innerHTML='<span class=\'material-icons rotating\'>sync</span> Generando QR...'; sendCommand('${id}', 'start_bot')" style="background: ${color}; color: white; border: none; width: 100%; padding: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <span class="material-icons">qr_code_scanner</span> GENERAR CÓDIGO QR
                </button>
                <button class="action-btn stop-btn" style="margin-top: 8px; width: 100%;" onclick="stopBotProcess('${id}')">DETENER</button>
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
            
            const limits = bot.limits || { processed: 0, max: 50 };
            const limitPct = Math.round((limits.processed / limits.max) * 100);

            let sleepText = 'Activo';
            let sleepColor = '#25d366';
            if (bot.statusInfo) {
                if (bot.statusInfo.outsideHours) {
                    sleepText = '🌙 Fuera de horario';
                    sleepColor = '#ff9800';
                } else if (bot.statusInfo.sleepMode) {
                    sleepText = '💤 Suspendido temporal';
                    sleepColor = '#2196f3';
                }
            }

            let batteryHtml = '';
            if (bot.battery) {
                const battIcon = bot.battery.plugged ? 'battery_charging_full' : (bot.battery.level > 80 ? 'battery_full' : (bot.battery.level > 30 ? 'battery_3_bar' : 'battery_alert'));
                const battColor = bot.battery.level > 20 ? '#25d366' : '#f44336';
                batteryHtml = `
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #8696a0; margin-top: 4px;">
                        <span style="display: flex; align-items: center; gap: 4px;">
                            <span class="material-icons" style="font-size: 14px; color: ${battColor};">${battIcon}</span>
                            Batería:
                        </span>
                        <span style="font-weight: 600; color: #fff;">${bot.battery.level}% ${bot.battery.plugged ? '⚡' : ''}</span>
                    </div>
                `;
            }

            let lastSentHtml = '';
            if (bot.lastSentInfo) {
                const cleanPhone = formatPhoneClean(bot.lastSentInfo.phone);
                const displayLeadName = bot.lastSentInfo.leadName || cleanPhone;
                lastSentHtml = `
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #8696a0; margin-top: 6px; border-top: 1px solid #2f3b43; padding-top: 6px;">
                        <span>Último Envío:</span>
                        <span style="font-weight: 600; color: #53bdeb; text-align: right; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${displayLeadName} (${cleanPhone})">
                            ${displayLeadName} (${bot.lastSentInfo.time})
                        </span>
                    </div>
                `;
            } else {
                lastSentHtml = `
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #8696a0; margin-top: 6px; border-top: 1px solid #2f3b43; padding-top: 6px;">
                        <span>Último Envío:</span>
                        <span style="font-weight: 400; color: #667781; text-align: right;">Pendiente</span>
                    </div>
                `;
            }

            let metricsHtml = `
                <div style="margin-top: 10px; text-align: left; background: #202c33; padding: 10px; border-radius: 6px; border: 1px solid #2f3b43; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #8696a0; margin-bottom: 4px;">
                        <span>Progreso Leads Hoy:</span>
                        <span style="font-weight: 600; color: #fff;">${limits.processed}/${limits.max}</span>
                    </div>
                    <div style="width: 100%; background: #111b21; height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                        <div style="background: #00a884; width: ${Math.min(limitPct, 100)}%; height: 100%;"></div>
                    </div>
                    ${batteryHtml}
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #8696a0; margin-top: 4px;">
                        <span>Estado de Espera:</span>
                        <span style="font-weight: 600; color: ${sleepColor};">${sleepText}</span>
                    </div>
                    ${lastSentHtml}
                </div>
            `;

            actionHtml = `
                <div style="font-size:12px; color:#25d366; margin-bottom: 10px; text-align: center;">📱 ${bot.wid || 'Conectado'}</div>
                ${metricsHtml}
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

async function startBotProcess(id, event) {
    if (event) event.preventDefault();

    // UI Modal para confirmar inicio
    const confirmed = await ui.modal.confirm(
        '¿Iniciar Bot?',
        `¿Deseas iniciar el proceso de ${id}? Esto conectará al sistema de leads.`,
        'info'
    );
    if (!confirmed) return;

    console.log(`🚀 [UI] Iniciando bot ${id}...`);

    try {
        const res = await fetchAPI(`/bot/${id}/start`, {
            method: 'POST'
        });
        const data = await res.json();
        console.log(`📬 [UI] Respuesta start ${id}:`, data);

        if (data.success) {
            console.log(`✅ [UI] Bot ${id} proceso iniciado - esperando conexión socket...`);
            // El estado se actualizará vía socket cuando el bot se conecte
            // Actualizar UI local inmediatamente con estado 'starting'
            const current = currentState.bots.get(id) || {};
            currentState.bots.set(id, { ...current, status: 'starting' });
            renderBotControls();

            // Mostrar alerta informativa pequeña o toast si existiera (opcional, por ahora modal success)
            // ui.modal.alert('Iniciando', `El ${id} se está iniciando. Por favor espera a que cambie a "Conectado".`, 'success');
        } else {
            console.error(`❌ [UI] Error iniciando ${id}:`, data.error || data.message);
            // Mostrar error en la UI en lugar de alert
            const current = currentState.bots.get(id) || {};
            currentState.bots.set(id, { ...current, status: 'not_running' });
            renderBotControls();
            ui.modal.alert('Error', `No se pudo iniciar el bot: ${data.message}`, 'error');
        }
    } catch (e) {
        console.error(`🚨 [UI] Error de red iniciando ${id}:`, e);
        ui.modal.alert('Error de Conexión', 'Fallo al conectar con el servidor', 'error');
    }
}

async function stopBotProcess(id, event) {
    if (event) event.preventDefault();

    const confirmed = await ui.modal.confirm(
        '¿Detener Bot?',
        `¿Estás seguro de que deseas detener el proceso de ${id}? El bot dejará de responder mensajes.`,
        'warning'
    );

    if (!confirmed) return;

    console.log(`⏹️ [UI] Deteniendo bot ${id}...`);

    try {
        const res = await fetchAPI(`/bot/${id}/stop`, {
            method: 'POST'
        });
        const data = await res.json();
        console.log(`📬 [UI] Respuesta stop ${id}:`, data);

        if (data.success) {
            ui.modal.alert('Bot Detenido', `El bot ${id} ha sido detenido correctamente.`, 'success');
            // Actualizar estado local
            const current = currentState.bots.get(id) || {};
            currentState.bots.set(id, { ...current, status: 'not_running' });
            renderBotControls();
        } else {
            console.error(`❌ [UI] Error deteniendo ${id}:`, data.error || data.message);
            ui.modal.alert('Error', `No se pudo detener el bot: ${data.message}`, 'error');
        }
    } catch (e) {
        console.error(`🚨 [UI] Error de red deteniendo ${id}:`, e);
        ui.modal.alert('Error de Conexión', 'No se pudo comunicar con el servidor', 'error');
    }
}

async function deleteBotInstance(id) {
    const confirmed = await ui.modal.confirm(
        '¿Eliminar Bot?',
        `⚠️ PELIGRO: Esto eliminará permanentemente la instancia ${id}, sus sesiones y archivos de configuración. ¿Continuar?`,
        'error'
    );

    if (!confirmed) return;

    console.log(`🗑️ [UI] Eliminando bot ${id}...`);
    try {
        const res = await fetchAPI(`/bot/${id}`, { method: 'DELETE' });
        const data = await res.json();
        console.log(`📬 [UI] Respuesta delete ${id}:`, data);
        if (data.success) {
            currentState.bots.delete(id);
            renderBotControls();
            updateBotFilters();
            ui.modal.alert('Eliminado', `La instancia ${id} fue eliminada.`, 'success');
        } else {
            console.error(`❌ [UI] Error eliminando ${id}:`, data.message);
            ui.modal.alert('Error', `No se pudo eliminar: ${data.message}`, 'error');
        }
    } catch (e) {
        console.error(`🚨 [UI] Error de red eliminando ${id}:`, e);
        ui.modal.alert('Error de Conexión', 'Fallo al conectar con el servidor', 'error');
    }
}

async function generateNewBot() {
    const btn = event?.currentTarget;
    const originalText = btn?.innerHTML || '';
    const confirmed = await ui.modal.confirm(
        '¿Generar Nueva Instancia?',
        'Esto creará una nueva carpeta de bot (ej. bot_4) y la preparará para conectar. ¿Deseas continuar?',
        'info'
    );

    if (!confirmed) return;

    console.log('🏗️ [UI] Generando nueva instancia de bot...');

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="material-icons rotating" style="font-size:18px;">sync</span> Generando...`;
        }

        const response = await fetch(`${API_URL}/api/bot/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({})
        });

        const data = await response.json();
        console.log('📬 [UI] Respuesta generate bot:', data);

        if (data.success) {
            console.log(`✅ [UI] Nueva instancia '${data.bot?.instanceId || data.instanceId}' creada`);
            // Actualizar lista de bots inmediatamente
            await fetchBotList();
        } else {
            console.error(`❌ [UI] Error generando bot:`, data.message || data.error);
            ui.modal.alert('Error', `No se pudo generar el bot: ${data.message}`, 'error');
        }
    } catch (e) {
        console.error('🚨 [UI] Error de red generando bot:', e);
        ui.modal.alert('Error Fatal', 'Falló la solicitud al servidor', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

function sendCommand(instanceId, command, payload = {}) { socket.emit('command_bot', { instanceId, command, payload }); }

async function triggerTestSequence() {
    const confirmed = await ui.modal.confirm(
        '🧪 Probar Secuencia IA',
        'Se generará un negocio aleatorio de prueba (como si fuese scrapeado de Google Maps) y se enviará la secuencia de 4 mensajes con ChatGPT al número de admin 5491126642674. ¿Deseas enviarla?',
        'info'
    );
    if (!confirmed) return;

    try {
        console.log('🧪 Enviando secuencia de prueba con IA...');
        const res = await fetchAPI('/bot/test-sequence', {
            method: 'POST',
            body: JSON.stringify({ targetPhone: '5491126642674' })
        });
        const data = await res.json();
        if (data.success) {
            ui.modal.alert('Prueba Lanzada', 'La secuencia de 4 mensajes de prueba con IA ha sido lanzada al número 5491126642674. Revisá tu WhatsApp en unos instantes.', 'success');
        } else {
            ui.modal.alert('Error', data.message || 'No se pudo iniciar la prueba', 'error');
        }
    } catch (e) {
        console.error('Error enviando secuencia de prueba:', e);
        ui.modal.alert('Error de Conexión', 'Fallo al conectar con el servidor', 'error');
    }
}

async function triggerManualWebAudit(leadId) {
    try {
        const btn = getEl(`btnAuditWeb_${leadId}`);
        if (btn) btn.innerHTML = '⏳ Auditando...';

        const res = await fetchAPI(`/api/lead/${leadId}/audit-web`, { method: 'POST' });
        const data = await res.json();

        if (data.success) {
            ui.modal.alert('Auditoría Completa', `Inspección web finalizada para este negocio:\n\n• CMS: ${data.webAudit.cms}\n• Hallazgos:\n${data.webAudit.insights.join('\n')}`, 'success');
            await fetchLeads();
            openLeadModal(leadId);
        } else {
            ui.modal.alert('Error', data.error || 'No se pudo auditar la web', 'error');
        }
    } catch (e) {
        console.error('Error auditando web:', e);
        ui.modal.alert('Error', 'Fallo al conectar con el servidor', 'error');
    }
}

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

        // Construir URL de forma segura
        let url;
        try {
            const baseUrl = API_URL || window.location.origin;
            url = new URL('/api/json/leads', baseUrl.startsWith('http') ? baseUrl : window.location.origin + baseUrl);
        } catch (e) {
            console.error("Error construyendo URL:", e);
            url = new URL(window.location.origin + '/api/json/leads');
        }

        url.searchParams.append('page', page);
        url.searchParams.append('limit', limit);
        if (status) url.searchParams.append('status', status);
        if (term) url.searchParams.append('search', term);

        const response = await fetchAPI(url.toString());
        const data = await response.json();

        if (data.success) {
            currentState.leads = data.leads;
            currentState.leadsTotalCount = data.pagination.total;
            currentState.leadsTotalPages = data.pagination.totalPages;
            renderLeadsTable();
        }
    } catch (e) { console.error(e); }
}

function getAiIntentBadge(lead) {
    let intent = lead.aiIntent;
    if (!intent) {
        if (lead.status === 'interested') intent = 'interest';
        else if (lead.status === 'not_interested') intent = 'rejection';
        else if (lead.status === 'discarded') intent = 'anger';
        else if (lead.status === 'manual_review') intent = 'neutral';
    }

    if (!intent || lead.status === 'pending' || lead.status === 'queued') {
        return '';
    }

    const configs = {
        'interest': { bg: 'rgba(37, 211, 102, 0.15)', color: '#25d366', text: 'Interesado', icon: 'thumb_up' },
        'question': { bg: 'rgba(66, 165, 245, 0.15)', color: '#42a5f5', text: 'Consulta', icon: 'help_outline' },
        'neutral': { bg: 'rgba(134, 150, 160, 0.15)', color: '#8696a0', text: 'Neutro', icon: 'remove' },
        'rejection': { bg: 'rgba(244, 67, 54, 0.12)', color: '#ef5350', text: 'Rechazo', icon: 'thumb_down' },
        'anger': { bg: 'rgba(239, 83, 80, 0.25)', color: '#ef5350', text: 'Enojado', icon: 'warning' },
        'auto_reply': { bg: 'rgba(255, 152, 0, 0.15)', color: '#ff9800', text: 'Auto-Respuesta', icon: 'smart_toy' }
    };

    const conf = configs[intent] || configs['neutral'];
    return `
        <span class="ai-intent-badge" style="background: ${conf.bg}; color: ${conf.color}; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; border: 1px solid ${conf.color}25; margin-top: 4px;" title="${lead.aiReason || conf.text}">
            <span class="material-icons" style="font-size: 12px;">${conf.icon}</span> ${conf.text}
        </span>
    `;
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
        
        let webContent = '';
        if (hasWeb) {
            const hasFB = lead.pixelFacebook === true;
            const hasGG = lead.pixelGoogle === true;
            const isAudited = lead.websiteValid !== undefined;
            
            const fbBadge = isAudited ? 
                `<span class="audit-pill ${hasFB ? 'has' : 'none'}" style="font-size: 9px; padding: 1px 4px; border-radius: 3px;" title="${hasFB ? 'Pixel de Facebook activo' : 'Sin Pixel de Facebook'}">FB</span>` :
                `<span class="audit-pill" style="font-size: 9px; padding: 1px 4px; border-radius: 3px; background: rgba(255,255,255,0.05); color:#666; border: 1px dashed rgba(255,255,255,0.1);" title="Auditoría pendiente">FB</span>`;
                
            const ggBadge = isAudited ?
                `<span class="audit-pill ${hasGG ? 'has' : 'none'}" style="font-size: 9px; padding: 1px 4px; border-radius: 3px;" title="${hasGG ? 'Google Tag Manager/Analytics activo' : 'Sin Google Tag/Analytics'}">GG</span>` :
                `<span class="audit-pill" style="font-size: 9px; padding: 1px 4px; border-radius: 3px; background: rgba(255,255,255,0.05); color:#666; border: 1px dashed rgba(255,255,255,0.1);" title="Auditoría pendiente">GG</span>`;
            
            webContent = `
                <div style="display: flex; flex-direction: column; gap: 4px; align-items: center;">
                    <a href="${lead.website.startsWith('http') ? lead.website : 'http://' + lead.website}" target="_blank" style="color:#53bdeb; text-decoration:none; font-size:12px; display:flex; align-items:center; gap:2px;" onclick="event.stopPropagation();">
                        <span class="material-icons" style="font-size:13px;">language</span> Web
                    </a>
                    <div style="display: flex; gap: 3px;">
                        ${fbBadge}
                        ${ggBadge}
                    </div>
                </div>
            `;
        } else {
            webContent = `<span style="color:#8696a0; font-size:11px; font-style:italic;">Sin Web</span>`;
        }

        const aiIntentBadge = getAiIntentBadge(lead);

        body.insertAdjacentHTML('beforeend', `
            <tr data-lead-id="${lead._id}" style="cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#1a2e38'" onmouseout="this.style.background=''">
                <td style="font-weight:600; color:#fff;">
                    ${lead.name || 'Sin nombre'}
                    ${lead.address ? `<div style="font-size:11px; color:#8696a0; margin-top:2px;">${lead.address.substring(0, 40)}${lead.address.length > 40 ? '...' : ''}</div>` : ''}
                </td>
                <td>${lead.phone || '-'}</td>
                <td style="color:#8696a0; font-size:12px;">${lead.location || '-'}</td>
                <td style="color:#8696a0; font-size:12px;">${lead.keyword || lead.category || '-'}</td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                        <span style="background:${st.bg}; color:${st.color}; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:600;">${st.text}</span>
                        ${aiIntentBadge}
                    </div>
                </td>
                <td style="text-align:center;">${webContent}</td>
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
        await fetch(`${API_URL}/api/lead/${leadId}`, { method: 'DELETE' });
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
                            <div style="font-size:14px; margin-top:2px;">
                                ${lead.website ? `
                                    <div style="margin-bottom: 6px;">
                                        <a href="${lead.website.startsWith('http') ? lead.website : 'http://' + lead.website}" target="_blank" style="color:#53bdeb; text-decoration:none; font-weight:600;">🔗 ${lead.website}</a>
                                        <button id="btnAuditWeb_${lead._id}" onclick="triggerManualWebAudit('${lead._id}')" style="margin-left: 8px; background: #7e57c2; border: none; color: white; border-radius: 4px; padding: 2px 8px; font-size: 10px; cursor: pointer;">🔍 Auditar Código</button>
                                    </div>
                                    <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
                                        <span style="font-size: 9px; padding: 2px 5px; border-radius: 3px; background: ${lead.webAudit?.cms ? '#7e57c2' : '#333'}; color: white;">CMS: ${lead.webAudit?.cms || 'Desconocido'}</span>
                                        <span style="font-size: 9px; padding: 2px 5px; border-radius: 3px; background: ${lead.webAudit?.hasGA4 ? '#25d366' : '#f44336'}; color: white;">GA4: ${lead.webAudit?.hasGA4 ? 'SI' : 'NO'}</span>
                                        <span style="font-size: 9px; padding: 2px 5px; border-radius: 3px; background: ${lead.webAudit?.hasMetaPixel ? '#25d366' : '#f44336'}; color: white;">Meta Pixel: ${lead.webAudit?.hasMetaPixel ? 'SI' : 'NO'}</span>
                                        <span style="font-size: 9px; padding: 2px 5px; border-radius: 3px; background: ${lead.webAudit?.hasWhatsAppWidget ? '#25d366' : '#ff9800'}; color: white;">Botón WA: ${lead.webAudit?.hasWhatsAppWidget ? 'SI' : 'NO'}</span>
                                    </div>
                                    ${lead.webAudit?.insights?.length ? `
                                        <div style="font-size: 10px; color: #8696a0; margin-top: 6px; background: #111b21; padding: 6px; border-radius: 4px;">
                                            📌 <b>Hallazgos para ChatGPT:</b><br>${lead.webAudit.insights.map(i => `• ${i}`).join('<br>')}
                                        </div>
                                    ` : ''}
                                ` : '<span style="color:#25d366">Sin sitio web</span>'}
                            </div>
                        </div>
                        ${(lead.instagramUrl || lead.facebookUrl) ? `
                        <div style="margin-bottom:12px;">
                            <label style="color:#8696a0; font-size:11px;">Redes Sociales Detectadas</label>
                            <div style="display: flex; gap: 8px; margin-top: 4px;">
                                ${lead.instagramUrl ? `
                                    <a href="${lead.instagramUrl}" target="_blank" style="background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); color: white; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 4px;" onclick="event.stopPropagation();">
                                        📸 Instagram
                                    </a>
                                ` : ''}
                                ${lead.facebookUrl ? `
                                    <a href="${lead.facebookUrl}" target="_blank" style="background: #1877f2; color: white; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 4px;" onclick="event.stopPropagation();">
                                        👤 Facebook
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}
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
                        <div style="margin-bottom:12px;">
                            <label style="color:#8696a0; font-size:11px;">Última Actividad</label>
                            <div style="color:#fff; font-size:14px;">${lead.lastMessageAt ? new Date(lead.lastMessageAt).toLocaleString() : 'Nunca'}</div>
                        </div>
                        ${lead.aiIntent ? `
                        <div style="margin-top:12px; border-top: 1px solid #2f3b4350; padding-top: 10px;">
                            <label style="color:#8696a0; font-size:11px;">Intención de IA</label>
                            <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                ${getAiIntentBadge(lead)}
                                ${lead.aiConfidence ? `<span style="font-size:11px; color:#8696a0;">(${(lead.aiConfidence*100).toFixed(0)}% confianza)</span>` : ''}
                            </div>
                            ${lead.aiReason ? `<div style="font-size:11px; color:#8696a0; font-style:italic; margin-top:5px; background: rgba(0,0,0,0.15); padding: 5px; border-radius: 4px; border-left: 2px solid #8696a0;">${lead.aiReason}</div>` : ''}
                        </div>
                        ` : ''}
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
        await fetch(`${API_URL}/api/lead/${currentLeadId}`, { method: 'DELETE' });
        alert('Lead eliminado');
        closeLeadModal();
        fetchLeads();
    } catch (e) { alert('Error: ' + e.message); }
}

// --- ADVANCED STATS (CHARTS) ---
let chartInstances = {};

async function fetchAdvancedStats() {
    try {
        const response = await fetchAPI('/stats/advanced');
        const data = await response.json();
        if (data.success) {
            renderCharts(data);
            fetchCategoryStats(); // Keep table updated too
            fetchABTestStats(); // Fetch A/B testing statistics
        }
    } catch (e) { console.error("Error stats advanced:", e); }
}

async function fetchABTestStats() {
    try {
        const response = await fetchAPI('/stats/ab-testing');
        const data = await response.json();
        if (data.success) {
            renderABChart(data.stats);
        }
    } catch (e) { console.error("Error fetching A/B testing stats:", e); }
}

function renderABChart(stats) {
    const canvas = document.getElementById('abTestChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstances.abTest) chartInstances.abTest.destroy();

    chartInstances.abTest = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: stats.map(s => `Var ${s.variant}`),
            datasets: [
                {
                    label: 'Enviados',
                    data: stats.map(s => s.sent),
                    backgroundColor: 'rgba(134, 150, 160, 0.4)',
                    borderColor: '#8696a0',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Respuestas',
                    data: stats.map(s => s.responses),
                    backgroundColor: 'rgba(0, 168, 132, 0.6)',
                    borderColor: '#00a884',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Interesados',
                    data: stats.map(s => s.interested),
                    backgroundColor: 'rgba(255, 152, 0, 0.6)',
                    borderColor: '#ff9800',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#e9edef' } },
                tooltip: {
                    callbacks: {
                        afterBody: (context) => {
                            const index = context[0].dataIndex;
                            const rate = stats[index].conversionRate;
                            return `Tasa Conversión: ${rate}%`;
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#2f3b43' }, ticks: { color: '#8696a0' } },
                x: { grid: { display: false }, ticks: { color: '#8696a0' } }
            }
        }
    });
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
        const response = await fetchAPI('/leads/categories');
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
        const response = await fetchAPI('/templates');
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
        const response = await fetchAPI(`/templates/${category}`, {
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
        await fetchAPI(`/templates/${category}`, {
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
                    await fetchAPI(`/templates/${cat.category}`, {
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
window.closeLeadModal = closeLeadModal;
window.saveGlobalConfig = saveGlobalConfig;
window.fetchGlobalConfig = fetchGlobalConfig;




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

// --- CONSOLE HANDLING ---
function toggleConsole(botId) {
    const el = document.getElementById(`console-${botId}`);
    const toggle = document.getElementById(`toggle-${botId}`);
    if (!el) return;

    if (el.classList.contains('collapsed')) {
        el.classList.remove('collapsed');
        el.style.height = '200px';
        el.style.padding = '15px';
        if (toggle) toggle.innerText = 'expand_more';
    } else {
        el.classList.add('collapsed');
        el.style.height = '0';
        el.style.padding = '0 15px';
        if (toggle) toggle.innerText = 'expand_less';
    }
}

function clearAllConsoles() {
    const outputs = [
        'consoleOutput',
        'consoleScraperOutput',
        'consoleServerOutput',
        'consoleBot1Output',
        'consoleBot2Output',
        'consoleBot3Output',
        'consoleBot4Output'
    ];
    // También buscar consolas de bots dinámicas
    const botOutputs = document.querySelectorAll('[id^="consoleBotOutput-"]');

    outputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div class="console-line system" style="color: #666;">-- Consola limpiada --</div>';
    });

    botOutputs.forEach(el => {
        el.innerHTML = '<div class="console-line system" style="color: #666;">-- Consola limpiada --</div>';
    });
}

function appendConsoleLog(data) {
    const { instanceId, level, message, timestamp } = data;
    const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

    const line = document.createElement('div');
    line.className = `console-line ${level || 'info'}`;
    line.style.marginBottom = '4px';

    // Color según nivel
    let color = '#d1d7db'; // info
    if (level === 'warn') color = '#ff9800';
    else if (level === 'error') color = '#f44336';
    else if (level === 'success') color = '#25d366';
    else if (level === 'system') color = '#8696a0';

    line.innerHTML = `<span style="color: #666;">[${time}]</span> <span style="color: #00a884; font-weight: bold;">[${instanceId.toUpperCase()}]</span> <span style="color: ${color};">${message}</span>`;

    // 1. Agregar a la consola principal
    const mainConsole = document.getElementById('consoleOutput');
    if (mainConsole) {
        mainConsole.appendChild(line.cloneNode(true));
        mainConsole.scrollTop = mainConsole.scrollHeight;

        // Limitar a los últimos 300 logs para no saturar el DOM
        if (mainConsole.children.length > 300) mainConsole.removeChild(mainConsole.firstChild);
    }

    // 2. Agregar a la consola específica
    let targetConsoleId = null;
    if (instanceId === 'scraper') targetConsoleId = 'consoleScraperOutput';
    else if (instanceId === 'server' || instanceId === 'backend') targetConsoleId = 'consoleServerOutput';
    else {
        // Mapear bot_1 -> consoleBot1Output
        const botNum = instanceId.replace(/\D/g, ''); // Extraer números (ej: 'bot_1' -> '1')
        if (botNum && !instanceId.includes('scraper') && !instanceId.includes('server')) {
            targetConsoleId = `consoleBot${botNum}Output`;
        } else {
            targetConsoleId = `consoleBotOutput-${instanceId}`; // fallback
        }
    }

    const targetConsole = document.getElementById(targetConsoleId);
    if (targetConsole) {
        targetConsole.appendChild(line);
        targetConsole.scrollTop = targetConsole.scrollHeight;
        if (targetConsole.children.length > 200) targetConsole.removeChild(targetConsole.firstChild);
    }
}

// --- BOT CONTROL FUNCTIONS ---
async function startBotProcess(instanceId) {
    if (!confirm(`¿Iniciar ${instanceId}?`)) return;
    try {
        const response = await fetchAPI(`/bot/${instanceId}/start`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            alert(data.message);
            // Recargar lista de bots para actualizar estado
            setTimeout(() => location.reload(), 1000);
        } else {
            alert('Error: ' + data.error);
        }
    } catch (e) {
        alert('Error de red al iniciar bot');
        console.error(e);
    }
}

async function stopBotProcess(instanceId) {
    if (!confirm(`¿Detener ${instanceId}?`)) return;
    try {
        const response = await fetchAPI(`/bot/${instanceId}/stop`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            alert(data.message);
            setTimeout(() => location.reload(), 1000);
        } else {
            alert('Error: ' + data.error);
        }
    } catch (e) {
        alert('Error de red al detener bot');
        console.error(e);
    }
}

async function deleteBotInstance(instanceId) {
    if (!confirm(`¿ELIMINAR ${instanceId}? Esto borrará sus archivos.`)) return;
    try {
        const response = await fetchAPI(`/bot/${instanceId}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            alert(data.message);
            location.reload();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (e) {
        alert('Error de red al eliminar bot');
        console.error(e);
    }
}

async function fetchLogsHistory() {
    console.log('📜 Recuperando historial de logs...');
    try {
        const response = await fetchAPI(`/log-history?limit=100`);
        const data = await response.json();
        if (data.success && data.logs) {
            data.logs.forEach(log => {
                appendConsoleLog({
                    instanceId: log.instanceId || log.component || 'server',
                    level: log.level,
                    message: log.message,
                    timestamp: log.timestamp
                });
            });
        }
    } catch (e) {
        console.error('Error fetching logs history:', e);
    }
}


// --- CONFIGURACIÓN GLOBAL (Scheduler & Limits) ---
async function fetchGlobalConfig() {
    try {
        const response = await fetchAPI('/config');
        const data = await response.json();

        if (data.success && data.config) {
            const cfg = data.config;
            const sched = cfg.schedule || { enabled: false, startTime: '09:00', endTime: '18:00', timezone: 'America/Argentina/Buenos_Aires', randomness: 15, days: [1, 2, 3, 4, 5] };
            const seq = cfg.sequences || { maxMessagesPerDay: 200, coolOffPeriod: 15 };
            const human = cfg.humanBehavior || { typingSpeed: 1.0 };

            // Hydrate Scheduler
            const tgl = getEl('schedEnabled'); if (tgl) tgl.checked = sched.enabled;
            const start = getEl('schedStartTime'); if (start) start.value = sched.startTime;
            const end = getEl('schedEndTime'); if (end) end.value = sched.endTime;
            const tz = getEl('schedTimezone'); if (tz) tz.value = sched.timezone;
            const rnd = getEl('schedRandomness'); if (rnd) { rnd.value = sched.randomness; }
            const rndVal = getEl('schedRandomVal'); if (rndVal) rndVal.innerText = sched.randomness;

            // Hydrate Limits
            const max = getEl('limitMaxDaily'); if (max) max.value = seq.maxMessagesPerDay;
            const maxVal = getEl('limitMaxDailyVal'); if (maxVal) maxVal.innerText = seq.maxMessagesPerDay;

            const cool = getEl('limitCooloff'); if (cool) cool.value = seq.coolOffPeriod;
            const coolVal = getEl('limitCooloffVal'); if (coolVal) coolVal.innerText = seq.coolOffPeriod;

            const type = getEl('humanTypingSpeed'); if (type) type.value = human.typingSpeed;
            const typeVal = getEl('humanTypingVal'); if (typeVal) typeVal.innerText = human.typingSpeed;
        }
    } catch (e) {
        console.error("Error fetching config:", e);
        alert("Error cargando configuración.");
    }
}

async function saveGlobalConfig() {
    const newSettings = {
        schedule: {
            enabled: tgl ? tgl.checked : false,
            startTime: start ? start.value : '09:00',
            endTime: end ? end.value : '18:00',
            timezone: tz ? tz.value : 'America/Argentina/Buenos_Aires',
            randomness: rnd ? parseInt(rnd.value) : 15,
            days: [1, 2, 3, 4, 5] // Default Mon-Fri for now
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
        const response = await fetchAPI('/config', {
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
