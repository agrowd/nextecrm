// popup.js – GMaps Leads Scraper (rev-17  botón inmediato)
const kwInp   = document.getElementById('keywords');
const locInp  = document.getElementById('locations');
const startBtn= document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const logBox  = document.getElementById('logArea');
const backendInp = document.getElementById('backendUrl');
const backendSaveBtn = document.getElementById('saveBackendBtn');
const backendStatus = document.getElementById('backendStatus');
const backendDot = document.getElementById('backendDot');
const backendRefresh = document.getElementById('backendRefresh');

let running=false, tabId=null;
const COLORS={info:'#87cefa',warn:'#ffd700',error:'#ff6b6b',success:'#68d391'};

const log=(t,l='info')=>{
  const div=document.createElement('div'); div.style.color=COLORS[l]||'#ccc';
  div.textContent=t; logBox.appendChild(div); logBox.scrollTop=logBox.scrollHeight;
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
  const url = normalizeBackendUrl(backendInp.value);
  if (!url) {
    setBackendStatus(false, 'Desconectado');
    return;
  }
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
  const normalized = normalizeBackendUrl(backendUrl);
  backendInp.value = normalized || '';
  await refreshBackendStatus();
};
const parse=s=>s.split(',').map(x=>x.trim()).filter(Boolean);
const queue=(k,l)=>{const r=[],n=Math.max(k.length,l.length);for(let i=0;i<n;i++)r.push({keyword:k[i%k.length],location:l[i%l.length]});return r;};

backendSaveBtn.onclick=async()=>{
  const normalized = normalizeBackendUrl(backendInp.value);
  if (!normalized) {
    log('URL de backend invalida','warn');
    setBackendStatus(false, 'Desconectado');
    return;
  }
  await chrome.storage.local.set({ backendUrl: normalized });
  backendInp.value = normalized;
  await refreshBackendStatus();
  log('URL de backend guardada','success');
};

backendRefresh.onclick=()=>{
  refreshBackendStatus();
};

loadBackendUrl();

startBtn.onclick=async()=>{
  if(running) return;
  /* ▼▼  Cambios: UI se actualiza antes de hablar con el content-script */
  running=true; startBtn.disabled=true; stopBtn.style.display='block';

  const kws=parse(kwInp.value), locs=parse(locInp.value);
  if(!kws.length||!locs.length){
    log('Completa rubros y ubicaciones','warn');
    running=false; startBtn.disabled=false; stopBtn.style.display='none';
    return;
  }
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab||!tab.url.includes('google.com/maps')){
    log('Abre Google Maps antes de empezar','error');
    running=false; startBtn.disabled=false; stopBtn.style.display='none';
    return;
  }
  tabId=tab.id;
  chrome.tabs.sendMessage(tabId,{action:'startScrapingQueue',queue:queue(kws,locs)},resp=>{
    if(!resp?.success){
      log('No se pudo iniciar (content script inactivo)','error');
      running=false; startBtn.disabled=false; stopBtn.style.display='none';
    } else {
      log(`Scraping iniciado – total cola ${resp.total}`,'success');
    }
  });
};

stopBtn.onclick=()=>{
  if(running&&tabId){
    chrome.tabs.sendMessage(tabId,{action:'stopScraping'},()=>{
      log('Deteniendo scraping...','warn');
      running=false; startBtn.disabled=false; stopBtn.style.display='none';
    });
  }
};

chrome.runtime.onMessage.addListener(msg=>{
  if(msg.type==='scraper-log')      log(msg.message,msg.level);
  if(msg.action==='scrapingFinished'){
    running=false; startBtn.disabled=false; stopBtn.style.display='none';
    log('Scraping finalizado','success');
  }
});
