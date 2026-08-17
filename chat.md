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

---

## Actualización: Promo Otoño, Tarifas B2B & Ganchos Seguros (2026-05-24)

### Solicitud del Usuario:
> el de promo abril ponele promo otoño y subi el sitio web a 500 pero por promocion 250.000 en 2 pagos y el ecommerce desde 0 a 500.000 en vez de 800.000. Despues mostrame los demas valores asi los cambiamos y actualizar lo que dice asi decimos que nos pidan ejemplos de sitios web hechos
> Te doy el ok ademas fijate si podes mejorar los mensajes que se le envia a cada uno, un ejemplo si tiene web que no le envie que la web se cayo o cosas asi, como verificarlo bien, lo mismo cuando se menciona el posicionamiento. hacer que funcione perfecto o simplemente sacarlo y hacerlo mas general

### Solución Implementada:

1. **Reestructuración de Tarifas B2B y Promo Otoño 2026:**
   - Se actualizaron las 10 variantes de propuestas comerciales (`this.propuestas`) en `advancedTemplateGenerator.js` con las nuevas tarifas profesionales B2B:
     - **Página Web:** Normal $500.000 → Promo Otoño: $250.000 (en 2 pagos).
     - **Tienda Online / E-commerce:** Normal $800.000 → Promo Otoño: $500.000.
     - **Google Maps + SEO Local:** Normal $300.000 → Promo Otoño: $150.000.
     - **Redes Sociales (CM):** Normal $180.000/mes → Promo Otoño: $100.000/mes.
     - **Bot de WhatsApp + Gestión:** Normal $200.000 → Promo Otoño: $100.000.
     - **Publicidad Digital (Google/Meta Ads):** Normal $280.000/mes → Promo Otoño: $180.000/mes (pauta aparte).
     - **Combo Completo Otoño (Web + Google + CM + Bot):** Normal $950.000 → Promo Otoño: $420.000 (Ahorro directo de $530.000).

2. **Descripción de Software y Sistemas a Medida:**
   - Se incorporó en todas las propuestas una descripción explícita de desarrollo de software a medida para clínicas, centros de estética, ferreterías, CRMs, etc.

3. **Ganchos Generales y Seguros (Blindaje del Bot):**
   - Se removió la división condicional entre `hooksNoWeb` y `hooksConWeb`.
   - Se unificaron los copys a un conjunto de **30 frases altamente persuasivas y 100% seguras** (`hooksGenerales`) enfocadas en el crecimiento local, la optimización de procesos y el rendimiento digital.
   - El bot ahora siempre genera un Mensaje 1 natural, garantizando una excelente primera impresión.

4. **Invitación a Solicitar Portafolio (CTA):**
   - Se modificaron las 10 variantes de llamados a la acción (`this.ctasReunion`) para incluir ganchos que invitan al lead a pedir ejemplos reales de sitios web ya diseñados por Nexte.

5. **Sincronización Multibot & Git Push:**
   - Se corrió el script de sincronización global en todos los slots de bots (`bot_1` a `bot_4`).

---

## Actualización: Corrección Matemática de Ahorro y Corrección de Sintaxis de Plantillas (2026-05-24)

### Solicitud del Usuario:
> de normal a la promo no se descuentnan solo 180.000. o se entiende eso, pero esta mal, verifica todo nuevmente o se mas claro. Hablo de esto
> Combo Otoño Todo Junto: Normal 950.000→PromoOtoño: 420.000 (¡Ahorro directo de $180.000!).

### Solución Implementada:

1. **Corrección de Cálculo de Ahorros del Combo:**
   - Se corrigieron todas las plantillas para mostrar el ahorro matemático real y transparente sobre el precio de lista normal: **$530.000** (Normal $950.000 - Promo $420.000).

2. **Resolución de Error de Sintaxis Crítico en Plantillas:**
   - Se reescribió y saneó de forma limpia la transición entre `this.presentaciones` y `this.propuestas`, eliminando remanentes duplicados y escapando correctamente las comillas en la variante 9.

3. **Sincronización y Validación Global:**
   - Se ejecutó `sync-bots.js` para propagar el generador de plantillas saneado y corregido a todos los bots (`bot_1` a `bot_4`).
   - Se verificó la correcta compilación de todos los bots con `node -c` y se pusheó exitosamente al repositorio master de GitHub.

---

## Actualización: Corrección de Cuelgues de Chrome y Caídas Cruzadas de Bots en Docker (2026-05-24)

### Síntoma Reportado:
- Al levantar los bots en la VPS tras la reconstrucción del contenedor:
  1. `bot_1` se quedaba congelado indefinidamente en `? Inicializando cliente WhatsApp...` sin mostrar el código QR.
  2. `bot_2` fallaba inmediatamente al iniciar con el error `TargetCloseError: Protocol error (Runtime.callFunctionOn): Target closed`.
  3. Prender el segundo bot provocaba que el primero se desconectara/muriera.

### Diagnóstico Técnico Realizado:
1. **Inestabilidad del Nuevo Headless Mode (Puppeteer v22+):** El bot usaba `headless: true` que lanza la nueva y pesada versión headless de Chrome. En entornos Linux simplificados (Docker slim), esta versión consume muchísima CPU/RAM y suele colgarse indefinidamente o crashearse durante el arranque de `client.initialize()`.
2. **Conflicto Crítico de pkill entre Bots:** En el arranque, cada instancia llamaba a `ProfileManager.killZombieChrome()`, el cual ejecutaba el comando global `pkill -9 -f chromium`. Dado que todos los bots (`bot_1` a `bot_4`) se ejecutan dentro del **mismo contenedor** (`rascafull-crm`), iniciar cualquier bot mataba de inmediato la instancia activa de Chromium de todos los demás bots, causando caídas cruzadas catastróficas.

### Solución Implementada:

1. **Configuración de Headless Estable (Clásica):**
   - Se modificó `bot/index.js` para cambiar `headless` a `'shell'` cuando la variable de entorno `HEADLESS` es verdadera (`headless: process.env.HEADLESS === 'true' ? 'shell' : ...`), alineándolo con la decisión de diseño bloqueada **D-01**.
   - Esto utiliza el motor de headless clásico, sumamente estable y liviano en Docker, previniendo cuelgues indefinidos.

2. **Aislamiento Quirúrgico de Procesos (Targeted pkill):**
   - Se reescribió `ProfileManager.killZombieChrome(instanceId)` en `profileManager.js` para recibir el `instanceId` del bot actual.
   - El bot ahora ejecuta un filtrado y matado selectivo (`pgrep -f "browser-${instanceId}"` y `pkill -9 -f "browser-${instanceId}"`).
   - Esto garantiza que un bot **únicamente** limpie y mate sus propios procesos huérfanos/zombie (basado en su `--user-data-dir` único `browser-bot_X`), dejando a los demás bots activos corriendo de manera pacífica e ininterrumpida.

3. **Sincronización y Validación:**
   - Se corrió `sync-bots.js` para propagar los archivos corregidos a todos los slots (`bot_1` a `bot_4`).
   - Se validó con éxito que todos compilaran de forma limpia.

---

## Diagnóstico: nexte-bot1 Inactivo y Fuera de Horario (2026-06-11)

### Síntoma Reportado:
- El bot no envía mensajes de forma automática.
- En los logs se muestra: `[SMART LOOP] ⏸️ Rate Limit (outside_business_hours). Durmiendo 818.2 min hasta próxima ventana.`
- Se muestra: `❌ GEMINI_API_KEY no configurada en .env` y usa fallback de plantillas.
- Un mensaje de `@lid` fue ignorado con el log: `No se encontró lead para 167954796826725@lid - IGNORANDO MENSAJE`.

### Diagnóstico Técnico:
1. **Sleep por Horario Comercial Aleatorio (outside_business_hours):**
   - El bot calcula de forma aleatoria su hora de inicio (9:00 - 10:00 AM) y fin (7:00 - 8:00 PM) para simular comportamiento humano (D-24).
   - El 10 de junio el horario aleatorio asignado fue **09:07 - 19:38**.
   - A las 19:52 Argentina (22:52 UTC), el bot detectó que estaba fuera del rango y entró en modo sleep por 818.2 minutos, programando su próximo check para hoy (11 de junio) a las 09:30 AM Argentina.
   - Dado que la hora actual de la consulta es las **06:28 AM**, el bot está respondiendo al diseño y sigue dormido. Despertará, reseteará estadísticas del nuevo día y reanudará envíos una vez que comience la nueva ventana laboral de hoy (después de las 9 AM).
2. **Uso de Fallback de Plantillas (Gemini API Key):**
   - La falta de `GEMINI_API_KEY` en el archivo `.env` activa automáticamente el **modo templates fallback**, el cual es estable y utiliza las 10 variantes preestablecidas de mensajes sin requerir IA.
3. **Resolución de LID y Filtrado de Leads:**
   - El bot detectó un mensaje entrante de un número de negocio (`@lid`), resolvió exitosamente el número real a `167954796826725`, pero al no estar registrado como lead pendiente en la base de datos, lo ignoró correctamente para evitar responder spam o chats externos.

---

## Actualización: Alineación de Logs del Sistema y Soporte para Bot 4 (2026-06-11)

### Solicitud del Usuario:
> Quiero que analices el front, el server y el bot para que se alinie todo en el crm y este todo conectado, se puedan ver logs del servidor etc, si revisas por completo el crm vas a ver que esta preparado para ello

### Solución Implementada:

1. **Intercepción Global de Consola en el Servidor:**
   - Se añadió un interceptor global a nivel de proceso para `console.log`, `console.warn`, `console.error` y `console.info` al inicio de `server/index.js`.
   - Todos los logs generados se almacenan automáticamente en la colección de MongoDB `Log` y se emiten al canal WebSocket de Socket.io (`realtime_bot_log`) con `instanceId: 'server'`, garantizando que la pestaña "Servidor" del dashboard se actualice en tiempo real.
   - Se ajustó el método auxiliar `log` para imprimir utilizando el canal directo `originalConsoleLog` y así evitar bucles infinitos de loggeo.

2. **Intercepción Global de Consola en los Bots:**
   - Se implementó la misma intercepción global en el archivo maestro de arranque del bot (`bot/index.js`).
   - Los bots envían sus mensajes al dashboard central vía Socket.io a través del canal `bot_log`, lo que permite monitorear eventos de Puppeteer, escaneo de códigos QR, pings de keep-alive y warnings de forma remota.
   - Para que el interceptor tenga acceso al WebSocket en cualquier parte de la ejecución (incluidas librerías externas), se guardó el socket en el constructor mediante `global.botSocket = this.socket`.
   - Se ajustó el método de registro `log` nativo de los bots para evitar redundancia y loops recursivos.

3. **Soporte de Consola para Bot 4 en la UI:**
   - Se añadió la sección de salida HTML colapsable para `Bot 4` (`consoleBot4Output`) en `crm-dashboard/index.html` con su respectiva cabecera y color de borde distintivo (`#2196f340`).
   - Se saneó el archivo `crm-dashboard/app.js` eliminando definiciones duplicadas y redundantes de `appendConsoleLog`, `toggleConsole` y `clearAllConsoles`.
   - Se reescribió `clearAllConsoles()` para asegurar la limpieza total tanto de las consolas de servidor y scraper como de las 4 consolas estáticas individuales (`Bot 1` a `Bot 4`).

4. **Sincronización y Compilación de Flota:**
   - Se ejecutó el script `node scripts/sync-bots.js` para propagar los cambios y parches a las instancias individuales `bot_1`, `bot_2`, `bot_3` y `bot_4`.
   - Se validó la sintaxis en todos los archivos de bot y del servidor con `node -c`, confirmando que el sistema compila de manera limpia.

---

## Actualización: Warm-up Inteligente con Protocolo de 3 Pasos y Corrección de Logs (2026-06-11 - Sesión 2)

### Solicitud del Usuario:
> quiero que que definamos un archivo estático de configuración en el servidor con los números de teléfono activos de los bots para que se manden mensajes de calentamiento únicamente entre ellos, o que se manden mensaje en momentos del dia si es que hay mas de 1 conectado, que sea inteligente y practico. Hace esto mas todo el plan de arriba de los logs en el crm

### Solución Implementada:

1. **Protocolo de Calentamiento de 3 Pasos (Smart Warm-up):**
   - Se rediseñó por completo el `WarmupManager` (`bot/services/warmupManager.js`) para evitar el bucle infinito de mensajes entre los bots de la flota.
   - Se establecieron 3 pools de mensajes distintos en la conversación de calentamiento: `initiators` (Paso 1), `responses` (Paso 2) y `closers` (Paso 3).
   - Cuando un bot A inicia el ping enviando un mensaje de `initiators`, el bot B lo detecta, responde con un mensaje de `responses` y finaliza allí. El bot A, al recibir la respuesta, envía un mensaje de `closers` para cerrar la interacción. El bot B recibe el closer y, al detectarlo en su pool, detiene el ciclo evitando loops infinitos de spam de forma 100% stateless y robusta.

2. **Archivo Estático de Configuración (`warmupConfig.json`):**
   - Se completó `server/warmupConfig.json` con los números de teléfono reales detectados en la base de datos de la flota de bots: `5491157351676`, `5491128179269`, `5491128761317`, `5491126642674`, `5491130194045`.
   - El endpoint `/api/bot/warmup-numbers` lee este archivo estático y cruza la información con el estado de conexión de los bots (`status === 'ready'`).

3. **Corrección de Referencias Globales de Logs y Sockets:**
   - Se diagnosticó que `global.io` y `global.botStatuses` eran `undefined` en `server/index.js` porque no se inicializaban en el objeto global. Esto causaba que los eventos de logs del servidor y del bot no llegaran al panel de control en tiempo real.
   - Se corrigió `server/index.js` asignando explícitamente `global.io = io` y `global.botStatuses = botStatuses` al arrancar el servidor.
   - Se actualizó el interceptor de logs `safeLog` para utilizar `global.io` de manera segura evitando TDZ (Temporal Dead Zone) y referencias no resueltas.

4. **Sincronización Global de los Bots:**
   - Se sincronizaron todas las instancias `bot_1` a `bot_4` mediante `node scripts/sync-bots.js` y se verificó sintácticamente que todos los archivos compilen correctamente (`node -c`).

---

## Actualización: Análisis de Intención con IA y Respuestas Automáticas a Leads (2026-06-11 - Sesión 3)

### Solicitud del Usuario:
> Quiero que agregues que si la persona envia un mensaje, lo analice la ia, asi se genera una respuesta y realmente se sabe si quiere el servicio o esta enojado porque le hablo alguien en frio etc etc
> No solo los mensajes con ia, si entra un mensaje de una persona que no le interesa, que se interprete con la ia y que se le pida disculpas, se ponga que no esta interesada en la base de datos, y se corte el envio de mensajes asi no reporta spam

### Solución Implementada:

1. **Orquestación y Corte Inmediato:**
   - Se actualizó `bot/index.js` para que, en cuanto entre un mensaje real de un lead, se aborte la secuencia saliente de mensajes de prospección (`stopSending = true` y `abortCurrentSequence = true`), eliminando el riesgo de que el bot continúe enviando el siguiente mensaje de la secuencia fría y sea reportado como spam.

2. **Ayudante Unificado de IA (`aiHelper.js`):**
   - Se creó un módulo unificado (`AIHelper`) que gestiona el consumo de IA y soporta tanto OpenAI como Google Gemini (1.5 Flash) como plan de contingencia (failover automático). Esto asegura el funcionamiento de la IA tanto en entornos locales como en la VPS de producción (donde solo se configuró `GEMINI_API_KEY`).

3. **Análisis de Intención Consolidado en una sola petición (`responseAnalyzer.js`):**
   - Se implementó `analyzeIncomingMessage(message, leadName, leadCategory)` que clasifica el sentimiento en cinco intenciones principales (`rejection`, `anger`, `interest`, `question`, `neutral`) y genera al mismo tiempo la respuesta adecuada.
   - El tono de las respuestas es rioplatense (profesional, amigable y usando "vos" y "che" con naturalidad).

4. **Actualización de Estado en MongoDB:**
   - La respuesta del bot actualiza el estado del lead de forma inteligente en el CRM backend: `interested` para interés y dudas, `not_interested` para rechazos cordiales, `discarded` para enojados y spam, o `manual_review` para neutros.

5. **Respuestas Automáticas con Delay Humano:**
   - Si corresponde responder, el bot agenda el envío del mensaje generado por IA con un retraso aleatorio (5 a 13 segundos). La respuesta es guardada en la base de datos (`POST /messages`) para registrarla en el historial de chat del panel del CRM.

6. **Sincronización de Flota y Verificación Sintáctica:**
   - Se sincronizaron todas las instancias `bot_1` a `bot_4` usando `node scripts/sync-bots.js` y se verificó sintácticamente que todos los archivos compilen correctamente (`node -c`).

---

## Pregunta del Usuario (2026-06-11):
> Arreglar este tipo de mensajes ya que es 2026 y tiene que decir mas de 10 años o algo asi, dejo un ejemplo
> Nexte tiene 10 años de trayectoria (2015-2025) ayudando a negocios a digitalizarse de verdad.

---

## Solución Implementada:

Se modificaron todos los archivos del bot que hacían referencia a la trayectoria de 10 años y al año 2025 para actualizarlos a **más de 10 años** y al rango **2015-2026**:
1. **`advancedTemplateGenerator.js`**: Actualizado "10 años (2015-2025)" a "más de 10 años (2015-2026)" y todas las referencias y comentarios de campañas de "PROMO 2025" a "PROMO 2026".
2. **`aiTextGenerator.js`**: Actualizados los prompts e insights utilizados por OpenAI para referenciar "más de 10 años de experiencia (2015-2026)".
3. **`responseAnalyzer.js`**: Corregido el prompt de sistema del analizador para pasar a "más de 10 años de trayectoria".
4. **`smartTemplateGenerator.js`**: Se actualizaron las plantillas estáticas de todas las categorías de "10 años" a "más de 10 años".
5. **`whatsappChecker.js`**: Actualizados los templates de presentación en frío de "10 años (2015-2025)" a "más de 10 años (2015-2026)".
6. **`bot/index.js`**: Se añadieron `"2015-2026"` y los correspondientes patrones a las listas de palabras clave para que el bot pueda detectar si el mensaje 2 de presentación ya ha sido enviado a un lead histórico o actual.
7. **Sincronización y Validación**: Se ejecutó `node scripts/sync-bots.js` y se verificó sintácticamente (`node -c`) toda la flota de bots (`bot_1` a `bot_4`), confirmando que compila limpiamente sin warnings ni errores.

---

## Pregunta del Usuario (2026-06-16):
> [Imagen de WhatsApp: Cuenta restringida en los dispositivos vinculados por 7 días]
> Esta es la razon por la cual no se enviaban

---

## Diagnóstico y Respuesta del Bot:
El bot identificó que la causa raíz de la inactividad es el bloqueo preventivo de WhatsApp de 7 días para dispositivos vinculados (WhatsApp Web/Desktop). Se presentaron al usuario las dos vías de acción:
1. **Opción A (Esperar 7 días):** Dejar pasar la restricción y luego reactivar con un límite diario más bajo (10-15 leads) para calentamiento.
2. **Opción B (Cambiar de número inmediatamente):** Limpiar los archivos de sesión en la VPS para forzar un nuevo código QR en el dashboard. Se provyeron los comandos necesarios para realizar esta limpieza.

---

## Pregunta del Usuario (2026-07-03):
> Como resolvemos esto. Utiliza la memoria global, es un mail de donweb para el servidor natoh / nexte
> Tu Cloud Server Server NatoH se quedó sin espacio de almacenamiento.
> Almacenamiento libre: 4.56 %
> Ocupado: 59.10 GB
> Libre: 2.83 GB
> Total: 61.93 GB

---

## Diagnóstico y Respuesta del Bot:
El bot recordó la lección global sobre la falta de espacio en la VPS (ERR-03 y anteriores), donde el demonio de Docker y las compilaciones previas consumen gran parte del disco. Se proporcionó al usuario un plan de limpieza exhaustivo paso a paso para liberar espacio de forma segura en el servidor, incluyendo:
1. Pruning global de Docker (imágenes, contenedores inactivos y cache de compilación).
2. Limpieza y truncado de logs de contenedores activos.
3. Eliminación de perfiles temporales de Puppeteer en `/tmp`.
4. Monitoreo del espacio del disco con comandos del sistema (`df -h`).

---

## Pregunta del Usuario (2026-07-29):
> Ya esta ahora, hablemos de los mensajes que hay, enviame una muestra de lo que hay ahora en cada mensaje, elegi una variante para mostrarme asi las cambiamos y probamos el sistema despues con la generacion de mensajes con chatgpt

---

## Diagnóstico y Respuesta del Bot:
Se seleccionó y presentó una muestra completa representativa de la secuencia activa de 4 mensajes (Saludo+Hook, Presentación de Trayectoria, Propuestas de Servicios B2B con Promo Otoño 2026, y CTA/Cierre). Se detalló la arquitectura actual (AITextGenerator + OpenAI/Gemini + AdvancedTemplateGenerator) para alinearse en los cambios solicitados.

---

## Pregunta del Usuario (2026-07-29):
> vamos a generar el primer mensaje en base a chatgpt, con informacion real... el segundo tambien con la ia en base al negocio... el tercero vamos a ofrecer en base al negocio (software a medida subiendo precios, web/ecommerce si aplica, contenido, IA natoh, SEO local, SIN publicidad)... El 4to que sea mas natural con chatgpt (ofrecer ejemplos de trabajos realizados y agendamiento). Enviame un ejemplo de como quedaria una cadena.

---

## Diagnóstico y Respuesta del Bot:
Se diseñó la arquitectura de los 4 prompts dinámicos para `gpt-4o-mini` sin variables robóticas y se generó una cadena de muestra real para el negocio "Clínica Dental OdontoSalud" en Palermo, demostrando la personalización fluida del flujo de mensajes.

---

---

## Pregunta del Usuario (2026-08-15):
> Mejora el diseño y hace que no se rompa, que este en sincronizacion real con los mensajes, el bot, el numero que es, que se pueda ver el perfil del negocio etc etc e informacion de cuantas veces se le envio, su respuesta, si se le envio con ia etc. Mejora toda esta parte

---

## Diagnóstico y Solución Aplicada:
1. **Rediseño Completo de la Vista de Chats (3 Paneles)**:
   - Panel 1 (Izquierdo): Lista de chats con avatares de iniciales estilizados (gradientes determinísticos), badges de bot (`B1`, `B2`, etc.), preview de último mensaje, hora y badges de IA/Manual.
   - Panel 2 (Central): Feed de conversación WhatsApp con burbujas de mensaje estilizadas (`#005c4b` / `#202c33`), soporte de saltos de línea, timestamps, ticks de entrega/lectura y barra de control de IA del chat.
   - Panel 3 (Derecho - **Ficha del Negocio**): Panel lateral interactivo con información completa del lead:
     - Nombre comercial, rubro, rating Google Maps ⭐ con cantidad de opiniones, dirección y teléfono formateado.
     - **Métricas de Prospección & IA**: Bot asignado, barra de progreso de secuencia de 4 mensajes (ej. `4/4`), indicador de IA (`✨ Sí (ChatGPT 4o-mini)`), cita textual de última respuesta del cliente, e intención detectada por IA con porcentaje de certeza.
     - **Auditoría Técnica Web**: Enlace a la web, detección de CMS, Google Analytics 4 (GA4), Meta Pixel, Widget flotante de WhatsApp y botón de re-auditoría manual.
     - **Gestión de Etiquetas CRM**: Tags dinámicos con agregado interactivo y borrado individual en 1 clic.
     - **Acciones Rápidas del Operador**: Botón directo a WhatsApp Web, Google Maps, y marcadores de estado (`👍 Interesado` / `👎 No Interesado`).
2. **Sincronización en Tiempo Real**: Socket listener para `lead_updated` y `new_message` que sincroniza al instante el chat activo, la lista y la ficha de negocio.
---

## Pregunta del Usuario (2026-08-15):
> No abre los botones del navbar cuando los presiono, no hacen nada, solo la animacion

---

## Diagnóstico y Solución Aplicada:
1. **Causa Raíz:**
   - En `crm-dashboard/app.js`, la función `setupSettingsListeners` tenía una llave de cierre faltante en el botón de guardado, lo que generaba un `SyntaxError: Unexpected end of input` en la carga del script impidiendo registrar los event listeners de navegación.
   - En `crm-dashboard/index.html`, la sección `<section id="view-dashboard">` carecía de tag de cierre `</section>`, provocando anidamiento de las demás vistas.
2. **Solución:**
   - Se corrigió la sintaxis de `app.js` (validado con `node --check crm-dashboard/app.js` sin errores).
   - Se cerró correctamente `<section id="view-dashboard">` y se unificaron las secciones en `index.html`.
---

## Pregunta del Usuario (2026-08-15):
> el ultimo mensaje no es del cliente es de nosotros. Ademas el sitio si tiene boton de whatspp, o procesa todos los negocios de nuevo para saber o verifica que es lo que pasa. Despues en una captura que te pase se ve que en vez del nombre del negoco aparecen numeros, y deberia aparecer su numero de telefono ya que lo tenemos en la base de datos para comprobarlo. Ademas proba que los botones funcionen en su funcion real, valga la redundancia

---

## Diagnóstico y Solución Aplicada:
1. **Precisión en la Detección de Mensajes de Clientes (Inbound vs Outbound)**:
   - Se corrigió la clasificación de mensajes: ahora la caja "Última Respuesta del Cliente" solo muestra mensajes reales enviados por el cliente (`!isOutboundMsg(m)`). Si el cliente no ha respondido aún, muestra claramente "Sin respuesta del cliente aún" y no muestra las propuestas de nuestro propio bot.
2. **Auditor Web de Alta Precisión & Botón de WhatsApp**:
   - Se actualizó el motor de auditoría (`webScraper.js` y `websiteAuditor.js`) para detectar más de 15 variantes de botones de WhatsApp (`wa.me`, `wa.link`, `api.whatsapp.com`, `joinchat`, `wp-block-whatsapp`, `floating-whatsapp`, etc.).
   - Probado contra `queenfit.com.ar` resultando en: `WordPress`, `Botón WA: SÍ`, `GA4: SÍ`, `Meta Pixel: SÍ`.
   - Se agregó el botón y endpoint `POST /api/leads/re-audit-all` para re-auditar todos los negocios en la base de datos en segundo plano.
3. **Resolución de Nombres e Identificadores Numéricos/LID**:
   - Los números crudos (LID de WhatsApp) se asocian al Lead real mediante coincidencia de sufijos e historial en `Message`.
   - Si no hay nombre comercial registrado, se muestra el teléfono formateado (`+54 9 11 ...`) en lugar de dígitos crudos.
4. **Comprobación de Acciones Operativas**:
   - Enlace directo a WhatsApp Web con teléfono limpio.
   - Enlace a Google Maps verificado.
   - Botones "Interesado" / "No Interesado" y Etiquetas CRM con persistencia en tiempo real.

---

## Pregunta del Usuario (2026-08-17):
> No me carga el qr

---

## Diagnóstico y Solución Aplicada:
1. **Causa Raíz:**
   - En `bot/index.js`, el flag `this.isStarted` bloqueaba la generación de QR si el bot ya había intentado un inicio previo sin emitir el evento `qr`.
   - Puppeteer en Linux Slim (Debian) requería flags específicos (`headless: true` y path a `/usr/bin/chromium`) para no fallar con Chromium.
   - En el dashboard, la imagen del QR dependía exclusivamente del servicio externo `api.qrserver.com` que puede fallar o bloquearse por red/CSP.
2. **Solución Realizada:**
   - **Bot (`bot/index.js`)**: El comando `start_bot` / `generate_qr` ahora re-emite el QR disponible de inmediato o reinicia Puppeteer limpiando bloqueos de sesión anteriores.
   - **Backend (`server/index.js`)**: Nuevos endpoints REST `POST /api/bot/:instanceId/generate-qr` y `POST /bot/:instanceId/generate-qr` como vía redundante a los sockets.
   - **Dashboard (`crm-dashboard`)**: Se integró `qrcode.min.js` para renderizar el QR localmente en Canvas/SVG en el navegador sin depender de APIs externas, más botón de **Regenerar QR**. Cache buster actualizado a `v=2.9`.





