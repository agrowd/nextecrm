# Conversación: Migración del Scraper a la VPS (2026-05-22)

## Pregunta del Usuario:
> como podemos mejorar el scrapping para que lo corra el servidor en la vps y deje de usarse una extension de google chrome

---

## Análisis y Propuesta Técnica

Para eliminar la dependencia de la extensión de Google Chrome y lograr que el scraping se ejecute de forma 100% automatizada e independiente en la VPS, existen dos caminos principales:

### Opción 1: Desarrollar un Scraper Propio en la VPS con Puppeteer (Stealth + Proxies)
Consiste en trasladar la lógica que hoy corre en la extensión (`extension/content.js`) a un servicio backend en Node.js que controle un navegador Chromium headless en la VPS.

#### 1. Arquitectura en la VPS
```
[ CRM Dashboard ] ──(WebSocket/HTTP)──> [ Server API ] ──> [ MongoDB (Scraping Queue) ]
                                              │
                                              ▼ (Background Worker)
                                        [ Puppeteer Stealth ]
                                              │
                                              ▼ (Proxies Residenciales)
                                       [ Google Maps ]
```

#### 2. Componentes Clave Requeridos
*   **Gestión de Cola (Job Queue):** Evitar correr múltiples navegadores a la vez para no saturar la RAM de la VPS. Creamos una colección `ScrapingTask` en MongoDB para encolar búsquedas de forma secuencial.
*   **Puppeteer Stealth (`puppeteer-extra-plugin-stealth`):** Google detecta y bloquea navegadores automatizados de inmediato. Este plugin oculta firmas internas del navegador, simula códecs reales y desactiva banderas de automatización.
*   **Red de Proxies Residenciales (Crucial):** Las direcciones IP de servidores VPS (Hostinger, AWS, DigitalOcean) están catalogadas como datacenters y Google las bloquea o les exige CAPTCHA en segundos. Necesitamos pasar el tráfico de Puppeteer por proxies residenciales rotativos (ej. Webshare, Smartproxy, Bright Data) que simulan conexiones hogareñas reales.
*   **Optimización de Recursos (Sin imágenes/CSS):** Para que no consuma demasiada RAM en la VPS, configuramos Puppeteer para bloquear la descarga de imágenes, hojas de estilo (CSS) y fuentes tipográficas.

---

### Opción 2: Integrar un API de Scraping de Terceros (Recomendado para Estabilidad)
La opción más profesional y con menor costo de mantenimiento a largo plazo es consumir una API especializada en extracción de Google Maps, como **Outscraper** o **Apify**.

#### ¿Por qué es la mejor opción?
1.  **Cero Mantenimiento de Selectores:** Google Maps actualiza constantemente sus clases de CSS y su estructura HTML. Si creamos nuestro propio scraper, cada pocos meses se "romperá" y tendremos que modificar los selectores CSS manuales. Las APIs de terceros resuelven esto de forma transparente.
2.  **Ahorro en Proxies y CAPTCHAs:** Estas plataformas ya cuentan con millones de proxies residenciales y sistemas avanzados para resolver CAPTCHAs.
3.  **Costos Extremadamente Bajos:** Outscraper regala 500 leads/mes gratis y luego cuesta aprox. USD $2 por cada 1,000 leads extraídos. Esto es más barato que mantener una suscripción mensual de proxies residenciales propios.

---

## Plan de Acción Recomendado
1.  **Fase 1 (Clarificación):** Decidir si preferís una solución propia 100% in-house (Puppeteer Stealth + Proxies en tu VPS) o una integración con API de terceros (Outscraper/Apify).
2.  **Fase 2 (Backend):** Crear el endpoint de encolado y el worker en `server/` para que la VPS procese las búsquedas en segundo plano.
3.  **Fase 3 (Dashboard):** Adaptar la interfaz del CRM para poder programar las palabras clave y ver el progreso en tiempo real.

---

## Pregunta del Usuario:
> como seria la opcion a?

---

## Diseño Detallado de la Opción A (In-House Puppeteer Stealth + Cola MongoDB)

Desarrollar la Opción A implica crear una infraestructura robusta dentro de tu servidor Node.js que realice las mismas tareas que la extensión, pero de forma headless. Aquí detallamos los componentes de código necesarios:

### 1. Modelo de Datos para la Cola (`server/models/ScrapeQueue.js`)
Para evitar sobrecargar la VPS y gestionar los trabajos de forma ordenada, creamos un esquema en MongoDB:

```javascript
const mongoose = require('mongoose');

const ScrapeQueueSchema = new mongoose.Schema({
  keyword: { type: String, required: true },
  location: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  leadsFound: { type: Number, default: 0 },
  error: { type: String },
  startedAt: { type: Date },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ScrapeQueue', ScrapeQueueSchema);
```

### 2. Servicio del Scraper con Puppeteer Stealth (`server/services/gmapsScraper.js`)
Este servicio realiza las búsquedas, scrollea el feed y extrae los datos utilizando selectores similares a los de la extensión actual, pero adaptados para Puppeteer y configurados con proxies:

```javascript
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Función principal del scraper
async function scrapeGoogleMaps(keyword, locationStr, onLeadExtracted, proxyConfig = null) {
  const query = `${keyword} ${locationStr}`;
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  
  const launchOptions = {
    headless: 'shell',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ]
  };

  // Carga de Proxy si está configurado
  if (proxyConfig) {
    launchOptions.args.push(`--proxy-server=${proxyConfig.server}`);
  }

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  // Autenticación de proxy
  if (proxyConfig && proxyConfig.username && proxyConfig.password) {
    await page.authenticate({ username: proxyConfig.username, password: proxyConfig.password });
  }

  try {
    // 1. Bloquear recursos innecesarios (RAM y Ancho de banda)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 2. Configurar User Agent real
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    console.log(`🔍 Navegando a: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // 3. Esperar que cargue el feed
    const feedSelector = '[role="feed"]';
    await page.waitForSelector(feedSelector, { timeout: 30000 });

    // 4. Scroll infinito (simulación humana)
    let reachedEnd = false;
    let lastHeight = await page.evaluate(sel => document.querySelector(sel).scrollHeight, feedSelector);
    
    while (!reachedEnd) {
      await page.evaluate(sel => {
        const feed = document.querySelector(sel);
        feed.scrollTo(0, feed.scrollHeight);
      }, feedSelector);

      await new Promise(r => setTimeout(r, 2000 + Math.random() * 1500)); // Delay humano

      // Verificar si hay texto de "final de la lista"
      reachedEnd = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Has llegado al final de la lista') || text.includes("You've reached the end of the list");
      });

      let newHeight = await page.evaluate(sel => document.querySelector(sel).scrollHeight, feedSelector);
      if (newHeight === lastHeight) {
        // Fallback: si no cambia la altura en dos iteraciones, asumimos final
        break;
      }
      lastHeight = newHeight;
    }

    // 5. Obtener los enlaces a todas las fichas del feed
    const cardLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a.hfpxzc[href*="/maps/place/"]'));
      return links.map(a => a.href);
    });

    console.log(`📋 Se encontraron ${cardLinks.length} fichas en total.`);

    // 6. Procesar cada ficha una a una de manera secuencial
    for (let i = 0; i < cardLinks.length; i++) {
      const link = cardLinks[i];
      try {
        console.log(`➡️ Procesando ficha (${i + 1}/${cardLinks.length}): ${link}`);
        await page.goto(link, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('h1', { timeout: 15000 });

        // Extraer datos usando la misma lógica de content.js
        const lead = await page.evaluate((keyword, locationStr, link) => {
          const main = document.querySelector('[role="main"]') || document.body;
          
          const titleEl = main.querySelector('h1');
          const name = titleEl ? titleEl.innerText.trim() : '';
          
          const phoneEl = main.querySelector('a[href^="tel:"]') || main.querySelector('button[data-item-id*="phone"]');
          const phone = phoneEl ? phoneEl.innerText.trim() : '';

          const addrEl = main.querySelector('button[data-item-id="address"]');
          const address = addrEl ? addrEl.innerText.trim() : '';

          const webEl = main.querySelector('a[data-item-id="authority"]');
          const website = webEl ? webEl.href : '';

          const catEl = main.querySelector('button.DkEaL') || main.querySelector('button[jsaction*="category"]');
          const category = catEl ? catEl.innerText.trim() : '';

          return { name, phone, address, website, category, keyword, location: locationStr, mapsUrl: link };
        }, keyword, locationStr, link);

        if (lead.name && lead.phone) {
          await onLeadExtracted(lead);
        }

        // Retraso de cortesía para evitar baneos
        await new Promise(r => setTimeout(r, 4000 + Math.random() * 5000));
      } catch (err) {
        console.error(`⚠️ Error al extraer ficha ${link}:`, err.message);
      }
    }

  } catch (error) {
    console.error('❌ Error crítico en scraping:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeGoogleMaps };
```

### 3. Worker en Segundo Plano (`server/workers/scraperWorker.js`)
Un demonio (worker) que revisa de forma constante si hay tareas de scraping pendientes, garantizando concurrencia única (1 solo Puppeteer corriendo a la vez):

```javascript
const ScrapeQueue = require('../models/ScrapeQueue');
const Lead = require('../models/Lead'); // Tu modelo de Leads actual
const { scrapeGoogleMaps } = require('../services/gmapsScraper');

let isWorkerRunning = false;

async function startScraperWorker() {
  if (isWorkerRunning) return;
  isWorkerRunning = true;

  console.log('👷 Scraper Worker inicializado en segundo plano.');

  // Bucle infinito de revisión
  while (true) {
    try {
      // Buscar la siguiente tarea pendiente
      const task = await ScrapeQueue.findOne({ status: 'pending' }).sort({ createdAt: 1 });
      
      if (!task) {
        // No hay tareas, dormir 10 segundos antes de volver a verificar
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }

      console.log(`🚀 Iniciando tarea de scraping: "${task.keyword} ${task.location}"`);
      task.status = 'processing';
      task.startedAt = new Date();
      await task.save();

      let leadsFoundCount = 0;

      // Definir la función callback que procesa cada lead apenas se extrae
      const handleNewLead = async (leadData) => {
        // Chequear duplicados en base de datos
        const existing = await Lead.findOne({ phone: leadData.phone });
        if (!existing) {
          const newLead = new Lead({
            ...leadData,
            status: 'pending' // Entra listo para la cola de WhatsApp
          });
          await newLead.save();
          leadsFoundCount++;
          console.log(`📥 Guardado lead en DB: ${leadData.name} - ${leadData.phone}`);
          
          // Emitir progreso por WebSocket si crm-dashboard está conectado
          if (global.io) {
            global.io.emit('scraper_lead_extracted', { taskId: task._id, lead: leadData });
          }
        }
      };

      // Configuración de proxies residenciales opcionales
      const proxy = process.env.RESIDENTIAL_PROXY ? {
        server: process.env.RESIDENTIAL_PROXY, // ej: "http://proxy.webshare.io:80"
        username: process.env.PROXY_USERNAME,
        password: process.env.PROXY_PASSWORD
      } : null;

      // Correr el scraper de Puppeteer
      await scrapeGoogleMaps(task.keyword, task.location, handleNewLead, proxy);

      // Tarea exitosa
      task.status = 'completed';
      task.leadsFound = leadsFoundCount;
      task.completedAt = new Date();
      await task.save();

      console.log(`✅ Tarea de scraping finalizada exitosamente: ${leadsFoundCount} nuevos leads.`);
      
    } catch (error) {
      console.error('❌ Error en el worker de scraping:', error);
      // Reintentar o marcar fallida
      // ...
    }
  }
}
```

---

## Actualización: Planificación de Horarios Aleatorios y Límite de 50 Leads (2026-05-22)

### Solicitud del Usuario:
> Mejor dejemos eso asi por ahora, con la funcionalidad actual. quiero que los bots inicien entre un rango aleatorio de 9 am a 10 am y terminen en un rango aleatorio entre 7pm y 8pm siempre respetando si tienen leads para enviar o si ya enviaron los 50 del dia

### Solución Implementada:
1. **Rango de Horarios Dinámicos y Aleatorios:**
   - Cada bot calcula un horario de inicio aleatorio entre las **9:00 AM y 10:00 AM** en su fecha diaria local (Argentina).
   - Cada bot calcula un horario de fin aleatorio entre las **7:00 PM y 8:00 PM** (19:00 a 20:00) en su fecha diaria local (Argentina).
   - Los horarios se persisten en el archivo de estadísticas de cada bot para asegurar que no cambien de forma caótica en reinicios repentinos en el mismo día, y se recalculan limpiamente en el cambio de fecha.

2. **Límite Estricto Capped de 50 Leads/Día:**
   - Desactivado el escalado dinámico incrementador (que aumentaba la cuota de 50 a 200). El límite es de exactamente **50 leads por día**.
   - Añadida lógica para **clampar** a 50 automáticamente en el inicio si el archivo de configuración o estadísticas previo en producción tenía un límite mayor (por ejemplo 75, 100 o 200).

3. **Sincronización Multibot:**
   - Se propagaron todas las modificaciones del servicio `rateLimiter.js` y el resto de los servicios unificados de forma segura a todas las carpetas correspondientes (`bot_1`, `bot_2`, `bot_3`, `bot_4`).

