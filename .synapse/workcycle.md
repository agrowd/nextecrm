# 🔄 WORK CYCLE LOG

## Current Session: 2026-08-20 (09:48 Argentina)
- **Objective:** Diagnosticar y resolver la causa raíz por la cual Puppeteer Chromium no iniciaba al ejecutar `start_bot`, provocando que el bot quedara en estado `Listo (Sin sesión)` sin generar ni emitir el código QR de WhatsApp Web.
- **Status:** ✅ COMPLETED & SYNCHRONIZED
- **Git Info:** master (pending push)
- **Deploy:** Listo para desplegar en VPS (`git pull` en `/srv/rascafull`).

### 56. Fix Crítico: Invocación de `this.client.initialize()` en la Construcción de Instancias del Bot
- **Causa Raíz:**
  1. En `bot/index.js`, la función `initializeWhatsApp()` creaba el objeto `Client` de `whatsapp-web.js` y configuraba sus listeners de eventos (`qr`, `ready`, `authenticated`), **pero omitía llamar a `this.client.initialize()` al finalizar la configuración**.
  2. Como resultado, Puppeteer Chromium nunca se ejecutaba en segundo plano, la página de WhatsApp Web no se cargaba y por ende el evento `qr` jamás se emitía, manteniendo la tarjeta estancada en `Listo (Sin sesión)`.
- **Solución Realizada:**
  1. **Bot (`bot/index.js`)**:
     - Se añadió la invocación explícita `this.client.initialize()` tras adjuntar todos los listeners dentro de `initializeWhatsApp()`.
     - Se reforzó el manejador del comando `start_bot` para reiniciar suavemente la instancia si no se encuentra en estado `ready`.
     - Sincronizado en toda la flota de bots (`bot_1/`, `bot_2/`, `bot_3/`, `bot_4/`).

## Previous Session: 2026-08-20 (09:41 Argentina)
- **Objective:** Resolver el fallo de generación de código QR al presionar "Generar Código QR" en la vista de Conexión de Bots del CRM Dashboard.
- **Status:** ✅ COMPLETED & SYNCHRONIZED
- **Git Info:** master (pending push)
- **Deploy:** Listo para desplegar en VPS (`git pull` en `/srv/rascafull`).

### 55. Fix de Generación y Renderizado de Código QR para Conexión de WhatsApp
- **Causa Raíz:**
  1. Al presionar "Generar Código QR", el bot recibía el comando `start_bot` via Socket.io. Si el bot ya tenía una instancia de Puppeteer instanciada (`isStarted === true`), intentaba re-ejecutar `await this.client.initialize()` sobre el cliente existente en vez de re-crear la sesión, lo que no volvía a emitir el evento `qr`.
  2. En `bot/index.js`, el evento `this.client.on('qr')` no guardaba la variable `this.lastQr = qr`, haciendo que la respuesta a consultas posteriores fuera `undefined`.
  3. En `server/index.js`, el endpoint `/api/bot/:instanceId/generate-qr` no comprobaba ni enviaba inmediatamente el `existingQr` guardado en memoria (`botQRS`).
  4. En `crm-dashboard/app.js`, `requestBotQR` no cambiaba el estado a `starting` de forma síncrona en la UI para dar feedback visual al usuario.
- **Solución Realizada:**
  1. **Bot (`bot/index.js`)**:
     - `this.lastQr = qr` se almacena al recibir el evento `qr` de Puppeteer y se limpia al estar `ready`.
     - Si se recibe el comando `start_bot` o `generate_qr` y el cliente estaba en estado no-autenticado, se destruye y re-inicializa el navegador Puppeteer para forzar la emisión de un nuevo QR de WhatsApp Web.
     - Sincronizado en toda la flota (`bot_1/`, `bot_2/`, `bot_3/`, `bot_4/`).
  2. **Backend (`server/index.js`)**:
     - `/api/bot/:instanceId/generate-qr` verifica si ya existe un QR activo en `botQRS`, actualiza `botStatuses` y lo emite inmediatamente a todos los clientes Socket.io.
  3. **Dashboard (`crm-dashboard/app.js`)**:
     - `requestBotQR` actualiza inmediatamente la tarjeta del bot a estado de carga `starting` ("Generando QR...") y renderiza el QR tan pronto como se recibe en la API o el socket.

## Previous Session: 2026-08-20 (09:25 Argentina)
- **Objective:** Implementación completa de los 5 Módulos de Mejora aprobados para Rascafull CRM: IA Comercial Enriquecida, Snippets 1-Click para Vendedores, Alertas Sonoras y Push para Leads Interesados, Filtros Rápidos en Chats y Script DevOps de Sincronización de Bots.
- **Status:** ✅ COMPLETED & SYNCHRONIZED
- **Git Info:** master (pending push)
- **Deploy:** Listo para desplegar en VPS (`git pull` en `/srv/rascafull`).

### 54. Implementación de 5 Módulos de Mejora (IA Comercial, Snippets, Alertas, Filtros & DevOps Sync)
- **Solución Realizada:**
  1. **IA Comercial Enriquecida (`bot/services/responseAnalyzer.js`)**: El motor de respuestas IA responde preguntas de precios y demos citando las ofertas vigentes ($180k IA NatoH, $250k Web, $350k Software, $690k Combo) y notificando al asesor.
  2. **Snippets 1-Click (`crm-dashboard/index.html` & `app.js`)**: Barra de accesos rápidos sobre el input de chat para enviar respuestas comerciales (`Demos Web`, `Asistente IA`, `Tarifario Promo`, `Agendar Llamada`, `Turnero Online`, `Carta QR Gastro`).
  3. **Alertas Sonoras y Push (`crm-dashboard/app.js`)**: Web Audio API Chime + Browser Push Notifications en tiempo real cuando un cliente responde con intención "Interesado ⭐".
  4. **Filtros Rápidos en Chats (`crm-dashboard/index.html` & `app.js`)**: Pestañas de filtrado de 1-clic (`Todos`, `⭐ Interesados`, `💬 Respuestas`, `⏸️ Manual`).
  5. **Script DevOps Sync (`scripts/sync-bots.js`)**: Script para propagar cambios de `bot/` a `bot_1/`, `bot_2/`, `bot_3/`, `bot_4/`.

## Previous Session: 2026-08-20 (05:05 Argentina)
- **Objective:** Resolver la aparición de números largos (LIDs de WhatsApp Business como `222011322274011`) en la lista de chats del CRM en lugar del nombre real del negocio o su número de teléfono.
- **Status:** ✅ COMPLETED & SYNCHRONIZED
- **Git Info:** master (pending push)
- **Deploy:** Listo para desplegar en VPS (`git pull` en `/srv/rascafull`).

### 53. Resolución Inteligente de WhatsApp LIDs a Nombres y Teléfonos Reales
- **Causa Raíz:**
  1. WhatsApp Business asigna a los negocios un `LID` (Linked Device ID) de 15 dígitos (ej. `222011322274011@lid`).
  2. En `bot/index.js`, `saveMessageToBackend` extraía la parte inicial del JID (`msg.from` o `msg.to`), enviando la cadena `222011322274011` como campo `phone` a la API central sin resolver previamente el contacto a su número GSM real (`54911...`).
  3. Al guardarse `phone: "222011322274011"` en MongoDB sin vincular `leadId` ni `leadName`, el dashboard formateaba la conversación usando el campo bruto como `+222011322274011`.
- **Solución Realizada:**
  1. **Bot (`bot/index.js`)**:
     - `saveMessageToBackend(msg)` detecta si el JID es un LID (`@lid` o números de >=14 dígitos).
     - Asocia automáticamente con `this.currentlyProcessingLead` in-memory si está activo.
     - Ejecuta `msg.getContact()` / `chat.getContact()` en Puppeteer para obtener el número real `contact.number`.
     - Si es necesario, consulta al backend para recuperar el `name` y `_id` del Lead antes de guardar.
     - Sincronizado en `bot_1/`, `bot_2/`, `bot_3/`, `bot_4/`.
  2. **Backend (`server/index.js`)**:
     - Endpoint `POST /api/fix-lid-messages` que analiza mensajes con números LID en MongoDB y los re-vincula por `instanceId` y rango de tiempo con su correspondiente `Lead` en la base de datos.
  3. **CRM Dashboard (`crm-dashboard`)**:
     - `processConversations` en `app.js` prioriza `lead.phone` (teléfono canónico) sobre el string LID.
     - Asigna siempre `displayName = lead.name || lead.businessName`, eliminando los nombres con números largos.
     - Ejecuta automáticamente `/fix-lid-messages` en segundo plano al cargar chats.

## Previous Session: 2026-08-20 (04:58 Argentina)
- **Objective:** Solucionar la dirección/burbujas invertidas de los mensajes en la vista de chats del CRM y mejorar los controles para pausar/reactivar la IA directamente desde la sección de Chats.
- **Status:** ✅ COMPLETED & SYNCHRONIZED
- **Git Info:** master (pending push)
- **Deploy:** Listo para desplegar en VPS (`git pull` en `/srv/rascafull`).

### 52. Dirección Correcta de Mensajes (Emisor/Receptor) y Control de Pausa desde Chats
- **Problema:**
  1. En los mensajes salientes de prospección (mensajes 1-4 de la secuencia), `fromMe: true` no se incluía explícitamente en el payload de `axios.post('/messages')` en `bot/index.js`.
  2. En el backend, esto guardaba `fromMe: false` en MongoDB e incrementaba erróneamente `unreadCount`.
  3. En `crm-dashboard/app.js`, `renderMessages` usaba una verificación simplificada en vez de la función robusta `isOutboundMsg(msg)`, haciendo que los mensajes de prospección enviados por el bot se mostraran en la izquierda (estilo cliente) como si los hubiese enviado el prospecto.
- **Solución Realizada:**
  1. **Backend (`server/index.js`)**:
     - En `POST /messages`, se evalúa automáticamente `type === 'oferta_servicio' || messageNumber > 0 || type === 'respuesta_automatica' || type === 'mensaje_manual'`, forzando `fromMe: true`.
     - Nuevo endpoint `POST /api/fix-message-directions` que corrige en lote todos los mensajes en MongoDB existentes a `fromMe: true`.
  2. **Bot (`bot/index.js`)**:
     - Añadido `fromMe: true` explícito en todos los envíos de `sendMessageSequence` y respuestas automáticas.
     - Sincronizado en `bot_1/`, `bot_2/`, `bot_3/`, `bot_4/`.
  3. **CRM Dashboard (`crm-dashboard`)**:
     - Se actualizó `isOutboundMsg(msg)` en `app.js` para detectar correctamente `oferta_servicio`, `messageNumber > 0`, `mensaje_manual` y metadata.
     - Se vinculó `renderMessages` para invocar `isOutboundMsg(msg)` siempre, garantizando que los mensajes del bot aparezcan en la derecha en verde con tildes de envío.
     - **Control de Pausa en Chats**:
       - Botón directo en la cabecera del chat (`btnToggleBotIA`).
       - Botón destacado en el panel lateral derecho (Ficha del Negocio).
       - Banner de aviso `Atención Manual` al abrir chats pausados.
       - Distintivo visual `⏸️ Manual` en la lista de chats de la izquierda.
       - Auto-pausa instantánea si el operador responde manualmente desde el input del chat.
     - Cache buster actualizado a `v=3.0`.

## Previous Session: 2026-08-20 (04:53 Argentina)
- **Objective:** Verificar y re-confirmar el filtro estricto de seguridad de campaña en la recepción de mensajes de WhatsApp (`handleIncomingMessage` en `bot/index.js` y `/lead/check-messages` en `server/index.js`), asegurando que la IA y las respuestas automáticas SOLO respondan a prospectos que recibieron mensajes de la cola de Rascafull CRM y NUNCA a contactos personales o no pertenecientes a la campaña.
- **Status:** ✅ VERIFIED & AUDITED
- **Git Info:** master
- **Deploy:** Actualizado en master.

### 51. Auditoría de Filtro Estricto de Seguridad por Lead de Campaña
- **Comprobación Realizada:**
  1. `handleIncomingMessage(message)` descarta automáticamente chats propios (`fromMe`), grupos (`@g.us`) y estados (`status@broadcast`).
  2. Ejecuta la **Regla Fundamental de Seguridad de Campaña**:
     - Verifica si el remitente es el lead actualmente en memoria (`currentlyProcessingLead`).
     - Si no lo es, consulta `/lead/check-messages` en el servidor backend.
     - `server/index.js` busca en MongoDB (colecciones `messages` y `leads`) por coincidencia exacta o por sufijo de los últimos 8 dígitos.
  3. **Resultado:** Si el remitente NO es un lead de la campaña al que Rascafull CRM le envió mensajes (`isCampaignLead === false`), el bot registra `👤 [IGNORADO REGLA DE CAMPAÑA]` y **RETORNA INMEDIATAMENTE SIN RESPONDER**.
  4. Si el remitente SÍ es un lead pero está pausado o etiquetado en WhatsApp/CRM (`isLabeledOrPaused === true`), tampoco responde y cede el control al operador humano.

## Previous Session: 2026-08-19 (20:25 Argentina)
- **Objective:** Rediseñar el motor de secuencias de prospección (`advancedTemplateGenerator.js`) con hiper-personalización por datos scrapeados de Maps (rating, opiniones, auditoría web, ubicación), segmentación inteligente por rubros (Salud, Gastro, Fitness/Estética, Comercio, Servicios) y múltiples combinaciones anti-spam para cada mensaje.
- **Status:** ✅ COMPLETED & SYNCHRONIZED
- **Git Info:** master (pending push)
- **Deploy:** Listo para desplegar en VPS (`git pull` en `/srv/rascafull`).

### 50. Segmentación de Mensajes por Rubro, Variables Scrapeadas y Variantes Anti-Spam
- **Problema:**
  1. Los mensajes posteriores al 2do eran idénticos y genéricos para todos los negocios (un menú completo de opciones que no encajaba con el dolor específico del rubro).
  2. El mensaje 1 no aprovechaba la riqueza de datos scrapeados de Google Maps (calificación de estrellas, cantidad de reseñas, presencia o ausencia de sitio web, falta de botón de WhatsApp).
  3. Riesgo de detección de spam por enviar exactamente la misma estructura de texto a todos los prospectos.
- **Solución Realizada:**
  1. **Mensaje 1 (Hiper-Personalizado con Scraped Data)**:
     - 30 saludos iniciales aleatorios.
     - Detección y mención dinámica de rating y cantidad de opiniones de Maps (ej. *"con 4.9 estrellas y más de 120 opiniones"*).
     - Detección técnica web (sin web en Maps, con web pero sin botón flotante de WhatsApp, o presencia online consolidada).
  2. **Mensaje 2 (Dolor y Valor Específico por Categoría)**:
     - **Salud/Odontología**: Turnero médico online, agendas, reducción de ausentismo con confirmación automática y fichas de pacientes.
     - **Gastronomía**: Carta digital QR, bot de pedidos a WhatsApp sin comisiones de apps (PedidosYa/Rappi) y reservas.
     - **Estética/Fitness**: Asistente virtual 24/7 para consultas de precios y planes, validación de señas/pagos y software de turnos/socios.
     - **Comercio/Indumentaria**: Tienda E-Commerce con Mercado Pago, catálogo online y bot de stock/talles 24/7.
     - **Servicios/Profesionales**: Web de alta conversión, posicionamiento #1 en Google Maps en la zona y cotizador automático.
  3. **Mensaje 3 (Propuesta Comercial Adaptada)**:
     - Tarifarios específicos por rubro con precios vigentes en promoción (Software $350k, IA NatoH $180k, Web $250k / E-Commerce $500k, Maps $150k, Combos $690k).
  4. **Mensaje 4 (Call to Action con Demos del Rubro)**:
     - Ofrece ejemplos reales y demos de sistemas/webs del rubro correspondiente.
  5. Sincronizado en todas las carpetas de bots (`bot/`, `bot_1/`, `bot_2/`, `bot_3/`, `bot_4/`).

## Previous Session: 2026-08-17 (11:55 Argentina)
- **Objective:** Solucionar generación y carga del Código QR en "Conexión de Bots" (Bot 1 "Listo sin sesión" no generaba/cargaba QR).
- **Status:** ✅ COMPLETED & SYNCHRONIZED
- **Git Info:** master (pending push)
- **Deploy:** Listo para desplegar en VPS (`git pull` en `/srv/rascafull`).

### 49. Reparación Integral de Generación de QR y Puppeteer
- **Causa Raíz:**
  1. En `bot/index.js`, `this.isStarted` bloqueaba la generación de QR si el bot ya había intentado un inicio previo sin emitir el evento `qr`.
  2. Puppeteer en Debian/Docker usaba `headless: 'shell'`, lo cual crasheaba con `/usr/bin/chromium` estándar en Linux Slim.
  3. En el frontend, el QR dependía exclusivamente de un servicio de imágenes externo (`api.qrserver.com`) sin renderizado local.
  4. Faltaba un endpoint REST HTTP como vía redundante a los sockets para forzar el inicio del bot y la generación del QR.
- **Solución Realizada:**
  1. Se reescribió el handler `start_bot` / `generate_qr` en `bot/index.js` para re-emitir el QR si ya existe o reintentar la inicialización limpia de Puppeteer.
  2. Se configuró `headless: process.env.HEADLESS === 'false' ? false : true` y `executablePath` seguro para `/usr/bin/chromium`.
  3. Se integró `qrcode.min.js` (generación local vía Canvas/SVG) con fallback visual y botón de "Regenerar QR".
  4. Se añadieron los endpoints REST `POST /api/bot/:instanceId/generate-qr` y `POST /bot/:instanceId/generate-qr` en `server/index.js`.
  5. Se actualizó el cache buster a `v=2.9`.

## Previous Session: 2026-08-15 (20:55 Argentina)
- **Objective:** Corregir detección de respuesta de clientes (evitar mostrar mensajes propios del bot), mejorar auditor web (detección precisa de botón WhatsApp, CMS, GA4 y Meta Pixel), resolver identificadores LID a nombres y teléfonos reales, y habilitar acciones operativas y re-auditoría masiva.
- **Status:** ✅ COMPLETED & SYNCHRONIZED
- **Git Info:** master (pending push)
- **Deploy:** Listo para desplegar en VPS (`git pull` en `/srv/rascafull`).

### 48. Precisión de Respuestas, Detección Web Completa y Normalización LID
- **Problema:**
  1. En "Última Respuesta del Cliente", se mostraba el 4to mensaje enviado por nuestro propio bot en vez de esperar una respuesta real del cliente, debido a que `fromMe` no estaba en el Schema de Mongoose y el filtro de mensajes entrantes no discriminaba mensajes de secuencia salientes.
  2. El auditor web marcaba "Botón WA: NO" en `queenfit.com.ar` y otros sitios a pesar de contar con widgets flotantes (`wa.me`, `api.whatsapp.com`, `joinchat`, `wp-block-whatsapp`, etc.).
  3. Los chats de contactos sin nombre de contacto (o recibidos con LID de WhatsApp Business) mostraban cadenas numéricas crudas sin formatear en vez del nombre del negocio o teléfono formateado.
  4. Los botones de acción rápida y re-auditoría requerían comprobación funcional integral y soporte de re-auditoría masiva en background.
- **Solución Realizada:**
  1. **Diferenciación de Mensajes Inbound vs Outbound**:
     - Se añadió `fromMe` y `direction` (`inbound`/`outbound`) en `server/models/Message.js`.
     - Se creó la función helper `isOutboundMsg(msg)` en `app.js` para discriminar ofertas y mensajes generados por el bot.
     - La caja de "Última Respuesta del Cliente" ahora solo muestra respuestas entrantes verídicas o "Sin respuesta del cliente aún".
  2. **Auditor Web de Alta Precisión (`webScraper.js` & `websiteAuditor.js`)**:
     - Soporte para 15+ variantes de botones y widgets de WhatsApp (`wa.me`, `wa.link`, `api.whatsapp.com`, `joinchat`, `wp-block-whatsapp`, `floating-whatsapp`, etc.).
     - Detección de CMS (WordPress, Shopify, Tiendanube, Wix, WooCommerce, Webflow, VTEX, etc.), GA4, GTM, y Meta Pixel.
     - Nuevo endpoint `POST /api/leads/re-audit-all` y botón "Re-auditar Todos" en el dashboard.
  3. **Normalización y Resolución de LIDs a Leads**:
     - `GET /lead/by-phone/:phone` ahora busca en el historial de mensajes para asociar LIDs con el lead correspondiente.
     - `processConversations` formatea visualmente los números con `formatPhoneDisplay` si no tienen nombre.
  4. Cache buster actualizado a `v=2.8`.

## Previous Session: 2026-08-15 (20:40 Argentina)
- **Objective:** Solucionar bloqueo de navegación en el Navbar (los botones hacían animación pero no abrían las vistas).
- **Status:** ✅ COMPLETED & SYNCHRONIZED
- **Git Info:** master (pending push)
- **Deploy:** Listo para desplegar en VPS (`git pull`).

### 47. Corrección de Estructura DOM y Cierre de Función en Frontend
- **Causa Raíz:**
  1. En `crm-dashboard/index.html`, la sección `<section id="view-dashboard">` carecía del tag de cierre `</section>`, provocando que todas las vistas subsiguientes (`view-chats`, `view-leads`, etc.) quedaran anidadas dentro del dashboard y fueran ocultadas por el CSS `.view-section:not(.active)` al cambiar de vista.
  2. En `crm-dashboard/app.js`, la función `setupSettingsListeners` tenía una llave de cierre faltante en el bloque del botón guardar, lo que generaba un `SyntaxError: Unexpected end of input` que interrumpía la ejecución del script antes de registrar los eventos de navegación.
  3. Existía una sección duplicada de `view-settings` mal cerrada en `index.html`.
- **Solución Realizada:**
  1. Se cerró correctamente `<section id="view-dashboard">` y se limpiaron y unificaron las secciones en `index.html`.
  2. Se reparó la sintaxis en `app.js` verificando que `node --check crm-dashboard/app.js` pase al 100% sin errores.
  3. Se actualizó el cache buster a `v=2.7` en `index.html`.

## Previous Session: 2026-08-15 (20:30 Argentina)
- **Objective:** Rediseño completo y robustecimiento de la vista de Chats (3 Paneles), Ficha de Negocio en vivo, Sincronización en tiempo real, Avatares dinámicos con iniciales y métricas de envío/IA.
- **Status:** ✅ COMPLETED & SYNCHRONIZED
- **Git Info:** master (pending push)
- **Deploy:** Listo para desplegar en VPS (`git pull` en `/srv/rascafull`).

### 46. Rediseño de Vista de Chats & Ficha de Inteligencia de Negocios
- **Problema:**
  1. En la vista de chat, al no tener seleccionado ningún chat, los elementos del header y footer quedaban sobrepuestos al Empty State porque `.hidden` no tenía `display: none !important;`.
  2. Íconos rotos (`alt="User"`, `alt="WhatsApp"`) procedentes de URLs externas o SVG faltantes.
  3. No se podía ver el perfil completo del negocio desde el chat (rubro, dirección, rating de Google Maps, web audit con GA4/Pixel/CMS, cantidad de mensajes enviados en la secuencia, respuesta del cliente, bot asignado).
- **Solución Realizada:**
  1. **Arquitectura de 3 Paneles**: Panel Izquierdo (Lista de Chats con avatares de iniciales y gradientes de color HSL, filtros por bot B1-B4, búsqueda rápida), Panel Central (Feed de mensajes WhatsApp en tiempo real con burbujas temáticas `#005c4b`/`#202c33`, ticks de entrega y switch de control de IA), y Panel Derecho (**Ficha del Negocio** deslizable).
  2. **Ficha de Inteligencia del Negocio**:
     - Nombre comercial, rubro, rating Google Maps ⭐, teléfono limpio formateado y dirección.
     - **Métricas de Prospección & IA**: Bot asignado, barra de progreso de secuencia (ej: `4/4`), estado de generación IA (ChatGPT 4o-mini), cita textual de última respuesta del cliente, intención detectada con certeza porcentual.
     - **Auditoría Técnica Web**: Enlace directo, CMS detectado, GA4 (Sí/No), Meta Pixel (Sí/No), Widget WhatsApp (Sí/No) y botón de re-auditoría manual en 1 clic.
     - **Gestor de Etiquetas CRM**: Creación interactiva de tags (`+ Agregar`) y borrado individual en vivo.
     - **Acciones Rápidas**: Enlace a WhatsApp Web, Google Maps, y calificación de interés (`👍 Interesado`, `👎 No Interesado`).
  3. **Sincronización en Tiempo Real**: Socket listener para `lead_updated` y `new_message` que refresca instantáneamente la lista, burbujas y ficha de negocio sin recargar la página.
  4. Cache-busting actualizado a `v=2.6`.

## Previous Session: 2026-08-15 (20:20 Argentina)
- **Objective:** Restaurar inicio de `nexte-backend` y mantener `crm-dashboard` montado en vivo.
- **Status:** ✅ VERIFIED & OPERATIONAL ON VPS (`6c3462d`)
- **PM2 State:** `nexte-backend` (online, 81.5mb), `nexte-frontend` (online, 48.1mb).
- **Frontend Changes Active:** Grids fluidos sin desborde, sidebar compacto con scroll invisible, eliminación de la sección editor de mensajes variables.

### 45. Ajuste de Volúmenes en Docker Compose
- **Diagnóstico:** El montaje de `./server` interfería con los módulos internos compilados en la imagen Docker, provocando el error en `nexte-backend`.
- **Solución:** Se mantuvo únicamente `./crm-dashboard:/app/crm-dashboard` como volumen en vivo (estático sin dependencias), restaurando la estabilidad del backend y permitiendo la actualización inmediata del frontend.

## Current Session: 2026-08-15 (20:00 Argentina)
- **Objective:** Solución a la falta de actualización en VPS: Montaje de volúmenes de `crm-dashboard` y `server` en `docker-compose.yml` + Cache-busting `v=2.5`.
- **Status:** ✅ COMPLETED & SYNCHRONIZED
- **Git Info:** master (`9581b91`)
- **Deploy:** Listo para desplegar en VPS (`git pull` + `docker-compose down && docker-compose up -d`).

### 44. Montaje de Volúmenes en Docker & Cache Buster
- **Causa Raíz:** `docker-compose.yml` solo tenía montadas las carpetas de `bot/`, `bot_2/`, etc. La carpeta `crm-dashboard/` y `server/` quedaban fijadas en la imagen interna de Docker. Por ende, `git pull` actualizaba los archivos en el host VPS pero el contenedor seguía sirviendo la versión vieja copiada en el build inicial.
- **Solución:**
  1. Se agregaron `- ./crm-dashboard:/app/crm-dashboard` y `- ./server:/app/server` a los volúmenes de `docker-compose.yml`.
  2. Se añadió cache-busting `style.css?v=2.5` y `app.js?v=2.5` en `index.html`.

## Current Session: 2026-08-15 (19:50 Argentina)
- **Objective:** Eliminación de la sección y botón de "Editor de Mensajes Variables" del navbar y dashboard.
- **Status:** ✅ COMPLETED & SYNCHRONIZED
- **Git Info:** master (`6eacecf`)
- **Deploy:** Listo para desplegar en VPS (git pull + docker-compose restart).

### 43. Eliminación del Editor de Mensajes Variables
- **Acción:** Se removió el ícono `edit_note` del menú lateral y la vista `view-messages` del dashboard, ya que las secuencias de mensajes ahora se generan 100% con IA ChatGPT y no mediante plantillas estáticas.

## Current Session: 2026-08-15 (19:46 Argentina)
- **Objective:** Ajuste del Navbar vertical (Sidebar) para que todos los íconos quepan y se vean completos en cualquier resolución/pantalla.
- **Status:** ✅ COMPLETED & SYNCHRONIZED
- **Git Info:** master (`3532603`)
- **Deploy:** Listo para desplegar en VPS (git pull + docker-compose restart).

### 42. Ajuste de Altura y Espaciado del Navbar Lateral
- **Problema:** En pantallas de laptops o ventanas con barras de marcadores/herramientas, el último ícono del menú lateral ("Editar Mensajes") quedaba cortado abajo porque el navbar tenía altura total rígida, `gap: 12px` y `overflow: hidden`.
- **Solución Realizada:**
  1. Se compactaron los íconos de `48px` a `44px` con `gap: 6px`, reduciendo la altura total requerida a solo ~450px.
  2. Se habilitó scroll fluido invisible (`overflow-y: auto; scrollbar-width: none;`) para garantizar que nunca se corte ningún ícono independientemente de la altura de la ventana.

## Current Session: 2026-08-15 (19:43 Argentina)
- **Objective:** Corrección del layout y responsive grid en el Dashboard para evitar desbordes visuales.
- **Status:** ✅ COMPLETED & SYNCHRONIZED
- **Git Info:** master (`b79365d`)
- **Deploy:** Listo para desplegar en VPS (git pull + docker-compose restart).

### 41. Corrección de Desborde de Layout en Dashboard
- **Problema:** Las tarjetas de métricas, realtime stats y slots de bots se desbordaban por el lateral derecho de la pantalla en monitores estándar / ventanas ajustadas debido a grids con anchos mínimos rígidos (`minmax(220px, 1fr)`) y padding excesivo.
- **Solución Realizada:**
  1. Se ajustaron los grids principales (`.stats-grid`, `.realtime-stats`, `.per-bot-stats`) para usar columnas fluidas con `min-width: 0`, `max-width: 100%` y `box-sizing: border-box`.
  2. Se eliminaron estilos inline que forzaban `repeat(4, 1fr)` rígidos en `index.html`.
  3. Se añadieron media queries dinámicas para 1400px, 1100px y 768px.
  4. Se aseguró `overflow-x: hidden` en `.view-section` y `.content-area`.

## Previous Session: 2026-08-15 (19:35 Argentina)
- **Objective:** Control de IA en Chats, Exclusión estricta de contactos etiquetados y auto-pausa por intervención manual.
- **Status:** ✅ COMPLETED & SYNCHRONIZED
- **Git Info:** master
- **Deploy:** Listo para desplegar en VPS (git pull + docker-compose up -d --build).

### 40. Control de IA en Chats, Etiquetas y Pausa de Respuestas Automáticas
- **Problema:** El bot respondía automáticamente a todo contacto entrante, interfiriendo con conversaciones personales, contactos etiquetados en WhatsApp/CRM y chats donde interviene un operador humano.
- **Solución Realizada:**
  1. **Filtro de Campaña Estricto:** La IA solo procesa y responde si el número pertenece a un lead existente en la base de datos al que se le envió la secuencia de prospección.
  2. **Detección de Etiquetas (WhatsApp & CRM):** Si el chat tiene etiquetas en WhatsApp Business (`chat.labels`) o en el CRM (`lead.tags` / `lead.labels`), la IA se desactiva y el bot omite cualquier respuesta automática.
  3. **Control Interactivo en CRM Chat:** En el header de conversación se integró el botón interactivo **`[🤖 IA: ACTIVA / PAUSADA]`**, selector dinámico de etiquetas (`🏷️ Cliente`, `🏷️ Manual`, `🏷️ En Seguimiento`, `🏷️ No Responder`), y banner visual de aviso.
  4. **Auto-Pausa por Intervención Manual:** Al redactar y enviar un mensaje manual desde el CRM Chat (o WhatsApp), el sistema marca automáticamente `manualIntervention: true` y `botPaused: true` para que el bot nunca interrumpa al operador humano.
  5. **Endpoints Backend:** Creados `GET/PUT /lead/by-phone/:phone` y `PUT /api/lead/:id/bot-control` con soporte de emisión Socket.io en tiempo real.
  6. **Sincronización:** Actualizado `server/models/Lead.js`, `server/index.js`, `crm-dashboard/`, y todas las instancias de bots (`bot/`, `bot_1/` a `bot_4/`).

## Previous Session: 2026-06-11 (23:55 Argentina)
- **Objective:** Mejoras estéticas front, visualización de píxeles Meta/Google, enlaces a redes e intención IA.
- **Status:** ✅ COMPLETED
- **Git Info:** master
- **Deploy:** Listo para desplegar en VPS (git pull + docker-compose up --build).

### 32. Integración de Auditoría Web, Badges IA y Rediseño de Flota
- **Solución:**
  1. Se modificó el esquema de `Lead.js` agregando los campos de seguimiento IA.
  2. Se actualizó el endpoint de actualización y el de conversaciones unificadas (populando `leadId`).
  3. Se actualizó el payload del bot para enviar la intención detallada de la IA al CRM.
  4. Se implementaron badges dinámicos con Material Icons para intenciones de IA en la bandeja de entrada y tabla de leads.
  5. Se expuso la auditoría web detallada con badges `[FB]` (Meta Pixel) y `[GG]` (Google Analytics/GTM) en la tabla y modal de leads.
  6. Se agregaron accesos premium a redes sociales (Instagram/Facebook) detectadas.
  7. Se atenuaron a opacidad del 55% los slots de bots inactivos (`not_running`) con transiciones fluidas en hover.
  8. Se sincronizaron todas las instancias (`bot_1` a `bot_4`) y se validó sintácticamente.

## Previous Session: 2026-06-11 (11:00 Argentina)
- **Objective:** Actualización de plantillas de mensajes para reflejar el año 2026 y más de 10 años de trayectoria.
- **Status:** ✅ COMPLETED
- **Git Info:** Sincronizado y verificado.
- **Deploy:** Listo para desplegar en VPS (git pull + docker-compose up --build).

### 31. Actualización de Plantillas a 2026 y más de 10 años de trayectoria
- **Problema:** Los templates de prospección en frío hacían referencia a la trayectoria de 10 años (2015-2025) y promociones de 2025. Al estar en el año 2026, esto daba una imagen desactualizada.
- **Solución:**
  1. Se modificó `bot/services/advancedTemplateGenerator.js` actualizando la trayectoria a "más de 10 años (2015-2026)" y las ofertas de categorías a "PROMO 2026" / "Arrancá 2026".
  2. Se modificó `bot/services/aiTextGenerator.js` en los prompts e insights para referenciar "más de 10 años de experiencia (2015-2026)".
  3. Se actualizó el prompt en `bot/services/responseAnalyzer.js` para indicar "más de 10 años de trayectoria".
  4. Se actualizaron los textos fijos en `bot/services/smartTemplateGenerator.js` a "más de 10 años".
  5. Se actualizaron las variaciones de presentación en `bot/services/whatsappChecker.js` de "10 años (2015-2025)" a "más de 10 años (2015-2026)".
  6. Se actualizó la lógica de detección del mensaje 2 en `bot/index.js` para incluir "2015-2026" en los keywords de seguimiento de prospección.
  7. Se sincronizó la flota completa con `node scripts/sync-bots.js` y se verificó la compilación sintáctica exitosamente.

## Previous Session: 2026-06-11 (09:20 Argentina)
- **Objective:** Implementación del warm-up inteligente entre bots y corrección de logs en tiempo real.
- **Status:** ✅ COMPLETED
- **Git Info:** Sincronizado y verificado.
- **Deploy:** Listo para desplegar en VPS (git pull + docker-compose up --build).

### 30. Warm-up Inteligente con Protocolo de 3 Pasos y Corrección de Logs
- **Problema:** 
  1. El sistema de calentamiento anterior causaba un bucle infinito de mensajes entre los bots ya que se respondían infinitamente.
  2. Falta de inicialización de `global.io` y `global.botStatuses` en `server/index.js`, lo que rompía la emisión de logs en tiempo real y eventos de leads a la UI.
- **Solución:**
  1. Diseñado e implementado un protocolo de calentamiento de 3 pasos (`initiators`, `responses`, `closers`) que previene bucles infinitos y simula diálogos humanos de forma inteligente.
  2. Actualizado `server/warmupConfig.json` con los números de teléfono reales detectados de la flota de bots.
  3. Corregido `server/index.js` asignando `global.io = io` y `global.botStatuses = botStatuses` de manera explícita y segura, y haciendo que `safeLog` use `global.io`.
  4. Sincronizadas las carpetas de bots con `sync-bots.js` y validada la sintaxis sin errores.

## Previous Session: 2026-06-11 (08:45 Argentina)
- **Objective:** Diseñar y realizar la alineación de logs y conectividad entre frontend, servidor y bots.
- **Status:** ✅ COMPLETED
- **Git Info:** Cambios de alineación de logs y UI aplicados y sincronizados.
- **Deploy:** Listo para desplegar en VPS mediante git pull + docker-compose up --build.

### 29. Alineación de Conectividad y Logs del Sistema (Servidor, Bots, Dashboard)
- **Problema:** El usuario quiere que el servidor, los bots y la UI estén completamente alineados y conectados, incluyendo poder ver los logs del servidor y los detalles de los bots en tiempo real desde el dashboard. Actualmente, la mayoría de los logs de depuración (tanto del servidor como de los bots) usan `console.log` estándar y no se envían a MongoDB ni al WebSocket de la UI. Además, falta soporte UI para Bot 4 y existen redundancias de funciones en `app.js`.
- **Solución Realizada:**
  1. Implementada la intercepción global de consola (`console.log`, `console.error`, `console.warn`, `console.info`) en el servidor y en los bots (con flag anti-recursión) canalizando todo a la BD de logs y Socket.io.
  2. Registrado el socket del bot de manera global (`global.botSocket = this.socket`) para acceso del interceptor de consola.
  3. Agregada la consola de Bot 4 en `index.html`.
  4. Eliminadas las redundancias en `crm-dashboard/app.js` y actualizado `clearAllConsoles()` para soportar Bot 4.
  5. Sincronizadas las modificaciones a las carpetas `bot_1` a `bot_4` usando `sync-bots.js`.

## Previous Session: 2026-06-11 (06:30 Argentina)
- **Objective:** Analizar los logs de producción de `nexte-bot1` y diagnosticar por qué no está enviando mensajes.
- **Status:** ✅ DIAGNOSTICADO
- **Git Info:** Sin cambios de código necesarios en esta fase de diagnóstico.
- **Deploy:** N/A (Verificación de logs de PM2 en VPS).

### 28. Diagnóstico de Inactividad de Envío en nexte-bot1
- **Problema:** El usuario reporta que el bot no está enviando mensajes de forma automática a los leads, a pesar de estar online en PM2 y haber enviado una respuesta manual de prueba.
- **Causa Raíz:**
  1. **Horario Laboral Aleatorio:** El bot está dormido bajo la restricción `outside_business_hours`. El día de ayer (10 de junio) calculó un horario de operación aleatorio de **09:07 a 19:38** (hora Argentina). A las 19:52 Arg (22:52 UTC), al estar fuera de ese rango, entró en modo de suspensión inteligente por **818.2 minutos** (13.6 horas).
  2. **Hora de la Consulta:** Actualmente son las **06:28 AM** en Argentina, por lo que el bot sigue dentro del periodo de sueño programado hasta aproximadamente las 09:30 AM Arg (cuando despertará, detectará el cambio de fecha local, reseteará stats y asignará una nueva ventana aleatoria para el día).
  3. **Ausencia de API Key de Gemini:** Los logs muestran `❌ GEMINI_API_KEY no configurada en .env`, por lo que el generador de texto está usando el **Modo Templates Fallback** (las 10 variantes preestablecidas por mensaje), lo cual es estable y correcto para evitar costos o fallas de IA.
  4. **Mensaje Ignorado de LID:** Se recibió un mensaje entrante de un número de negocio (`167954796826725@lid`), el cual se resolvió a número real pero no se encontró en la cola de leads pendientes, por lo que fue ignorado correctamente para no responder spam.

## Previous Session: 2026-05-24 (13:20 Argentina)
- **Objective:** Fix math discrepancy in combo savings ($180k to $530k) and resolve syntax corruption in template generator across all bots.
- **Status:** 🟡 PENDING DEPLOY ON VPS (Timeout encountered)
- **Git Info:** Synced bot folders, pushed master.
- **Deploy:** Timeout `UnixHTTPConnectionPool` (60s) encountered on VPS while creating container. Need to increase timeout and restart Docker.

### 27. Pricing Discount Math Correction & Syntax Repair
- **Problema:** El combo Otoño indicaba un "Ahorro directo de $180.000" cuando el precio normal es $950.000 y la promo es $420.000 (el ahorro matemático correcto es **$530.000**). Además, el archivo `advancedTemplateGenerator.js` en `bot/services/` tenía una sintaxis rota y código duplicado remanente que impedía compilar/ejecutar el bot.
- **Solución:**
  1. Se reparó la sintaxis en `bot/services/advancedTemplateGenerator.js`, cerrando limpiamente el array `this.presentaciones` y reescribiendo de manera consolidada `this.propuestas` con exactamente 10 propuestas válidas y limpias.
  2. Se corrigió el valor de ahorro en todas las propuestas del combo para reflejar con precisión el ahorro de **$530.000** sobre el precio de lista.
  3. Se sincronizaron las mejoras en todas las réplicas de bots (`bot_1`, `bot_2`, `bot_3`, `bot_4`) con `sync-bots.js`.
  4. Se validó la correcta compilación de cada uno con `node -c`.
- **Archivos:** `bot/services/advancedTemplateGenerator.js` y sincronizaciones.

## Previous Session: 2026-05-22 (11:20 Argentina)
- **Objective:** Implement randomized bot daily schedule (9-10 AM to 7-8 PM) and strictly cap daily limits at 50 leads/day.
- **Status:** ✅ COMPLETED & SYNCHRONIZED
- **Git Info:** Synced rateLimiter.js modifications across all bot slots.
- **Deploy:** Ready to push to GitHub and update VPS.

## Previous Session: 2026-02-23 (12:00-12:30 Argentina)
- **Objective:** Fix Bot 2 inactivity, status@broadcast DB crash, and Bot 1 hands.
- **Status:** ✅ ALL FIXES DEPLOYED.
- **Git Info:** Changes committed.
- **Deploy:** Ready for deployment via Docker build.


## Previous Session: 2026-02-18 (02:00-05:10 Argentina)

## Estado Actual de los Bots (FUNCIONANDO)
| Bot | Número | Status | Fixes Aplicados |
|:---|:---|:---|:---|
| Bot 1 (`bot/`) | +549 11 5735-1676 | ✅ ready | isQuickAutoReply + ack msg + smart discard + retry counter |
| Bot 2 (`bot_2/`) | +549 11 2817-9269 | ✅ ready | isQuickAutoReply + ack msg (no necesitaba smart discard) |

## Validación en Producción
```
🤖 Auto-reply ignorado en análisis de rechazo: "No comprendí tu mensaje. Si deseás ser atendido por un aseso..."
```
↑ Esto apareció en los logs inmediatamente al prender Bot 1. El fix funciona.

## Fixes Applied This Session

### 26. Randomized Hours Schedule & Strict 50 Limit Capping
- **Problema:** El usuario solicitó mantener la funcionalidad actual pero con un inicio aleatorio entre las 9 y 10 AM y finalización entre las 7 y 8 PM (Argentina). También requirió respetar estrictamente el límite de 50 leads al día (sin escalar hasta 200).
- **Solución:** Modificado `bot/services/rateLimiter.js` para generar `dailyStartHour` (9.0 a 10.0 decimal) y `dailyEndHour` (19.0 a 20.0 decimal). Se limitó `targetLeads` y `startLeads` a `50` y el `increment` a `0`. En `loadStats()` se agregó un guard para forzar el clampado a 50 de cualquier archivo stats preexistente. Corregido y validado con `node -c`. Sincronizado a todas las instancias `bot_1` a `bot_4` usando `sync-bots.js`.
- **Archivos:** `bot/services/rateLimiter.js` y sincronización a todos los bots.

### 19. Fix Bot 2 Inactivity (ERR-13, RateLimiter instanceId bug)
- **Problema:** Bot 2 se quedaba inactivo ("ready" pero durmiendo +600 mins por `outside_business_hours`).
- **Solución:** Descubrimos que `IntelligentRateLimiter` necesitaba el `instanceId` en su inicialización (`new IntelligentRateLimiter(this.instanceId)`). Al no enviarlo, los bots compartían el archivo de estado `global`, pisándose las cuotas. Corregido en los 4 bots.
- **Archivos:** `bot/index.js`, `bot_2/index.js`, `bot_3/index.js`, `bot_4/index.js`.

### 20. Fix `status@broadcast` DB Crash (ERR-14)
- **Problema:** Errores 500 y promesas rotas en Node.js al guardar mensajes en la DB, causadas por estados de WhatsApp (`status@broadcast`). Al no tener formato de teléfono válido, crasheaba al limpiarlo en el server.
- **Solución:** Filtro en `handleIncomingMessage` y `saveMessageToBackend` para abortar si el emisor/receptor es `status@broadcast`. Validación de `null`/`undefined` phone en el endpoint de Express `/messages`.
- **Archivos:** `bot/index.js`, `bot_2/index.js`, `bot_3/index.js`, `bot_4/index.js`, `server/index.js`.

### 21. Multi-Bot Services Synchronization & Quarantine List
- **Problema:** Desincronización de código, causando falsos positivos de QuickVerify y faltaba mecanismo para aislar leads problemáticos.
- **Solución:** Copiados los `bot_2/services` hacia el resto, con parcheos correctos de "Sales Pitch injection". Implementado script `export-manual-review.js` y estado BD de Quarantine (`manual_review`).

## Previous Fixes (2026-02-18)

### 15. Auto-Reply Detection + Acknowledgment (ERR-09, D-21, D-23)
- **Problema:** Auto-replies de WhatsApp Business abortaban la secuencia.
- **Solución:** `isQuickAutoReply()` detecta por keywords/estructura/timing. Si es auto-reply → bot envía "Veo que tienen respuesta automática" y sigue. Si es respuesta real → corta secuencia.
- **Archivos:** `bot/index.js`, `bot_2/index.js`

### 16. Smart Lead Discard — No Infinite Loop (ERR-10, D-22)
- **Problema:** `no_phone`/`invalid_phone` → `pending` → loop infinito.
- **Solución:** `no_phone`/`invalid_phone` → `discarded` (permanente). `internal_error` → retry 3x con `retryCount`, después `failed`.
- **Archivos:** `bot/index.js`, `server/models/Lead.js`

### 17. Bot 2 Sync (ERR-11)
- **Problema:** bot_2 no tenía ninguno de los fixes.
- **Solución:** Sincronizado `isQuickAutoReply()` + guards + ack msg + `autoReplyDetected` flag.
- **Bug encontrado:** `else` perdido en el if/else del handler → corregido.
- **Archivos:** `bot_2/index.js`

### 18. Auto-Reply Timestamp Bugfix (ERR-12)
- **Problema:** Auto-respuesta triggeraba en mensajes muy antiguos (ej: +24hs) al reiniciarse el bot o recargar el chat.
- **Solución:** Agregado check `isRecent` (últimos 5 minutos) en `bot_1`, `bot_2`, `bot_3` y `bot_4`.
- **Incidente:** El parcheo inicial rompió la sintaxis en los 4 bots (ERR-12). Se arregló usando `node -c` para validar.
- **Archivos:** `bot/index.js`, `bot_2/index.js`, `bot_3/index.js`, `bot_4/index.js`

## Lecciones Clave de Esta Sesión
1. **NUNCA poner errores permanentes como `pending`** — crea loops infinitos. Usar `discarded`.
2. **Cada bot tiene código independiente (D-11)** — SIEMPRE verificar que fixes estén en TODOS los bots (incluyendo bot 3 y 4).
3. **Al hacer multi-replace en el mismo archivo, verificar que el if/else no se rompa** — además, cuidado con los cierres de corchetes `{}` al agregar nuevas condiciones.
4. **Validar sintaxis antes de dar por terminado** — siempre correr `node -c [archivo]` después de refactors.
5. **`docker system prune -af --volumes`** libera espacio (43GB en este caso) cuando el build falla por `no space left on device`.

## Previous Session: 2026-02-11 (20:00 Argentina)
- **Objective:** Fix 3 critical bot issues causing lead burning.
- **Status:** ✅ FIXES PUSHED (3 commits).

## Fixes Applied This Session

### 11. session_dead Detection Fix (ERR-06)
- **Commit:** `ee23cb3` — Inner catch blocks now detect detached/closed errors and return `session_dead`.

### 12. QuickVerify False Negatives Fix (ERR-07, D-19)
- **Commit:** `41b7e10` + `872359d` — When quickVerify says no, check last 100 messages. If we already sent → `contacted`. If no history → `check_failed`.
- **⚠️ Lección:** `sendMessage('.')` crea chats para CUALQUIER número. No es verificación válida.

### 13. In-Memory Lead Tracking + Stop on Response (ERR-08, D-20)
- **Commit:** `41b7e10` — `currentlyProcessingLead` con flag `stopSending`. Message handler resuelve LID y compara. Secuencia se corta al recibir respuesta.

### 14. Recovery Script (Bot 1)
- **Archivo:** `server/recover-burned-bot1.js` — 6 leads quemados por falsos negativos.

---

## Previous Session: 2026-02-05 (08:40 Argentina)
- **Objective:** Fix bot_1 not sending + bot_2 WAPhoneUtils error.
- **Status:** ✅ FIXES PUSHED.

## Fixes Applied This Session

### 1. Timezone Bug in rateLimiter.js (ERR-01)
- **Problema:** `getNextBusinessHour()` y `getSmartDelay()` usaban hora UTC.
- **Solución:** Cambiado a usar `getArgentinaHour()` y `getArgentinaDay()`.
- **Commit:** `e7010e4`

### 2. WAPhoneUtils Error in bot_2 (ERR-02)  
- **Evolución del diagnóstico:**
  1. purpule-fox fork → tarball 404
  2. npm ^1.34.6 → NO tiene el fix
  3. **DESCUBIERTO:** bot_1 funciona porque usa git master
- **Solución:** `bot_2/package.json` ahora usa:
  ```
  "whatsapp-web.js": "git+https://github.com/pedroslopez/whatsapp-web.js.git"
  "puppeteer": "^22.15.0"
  ```
- **Commit:** `6eeea0f`

### 3. Anti-Spam URLs in Templates (MSG 3)
- **Problema:** URLs como `www.tunegocio.com.ar` pueden ser marcadas como spam.
- **Solución:** Reemplazado por `tunegocio punto com punto ar` y removidas comillas de URL.
- **Commit:** `912a752`

### 4. Anniversary Promo & Urgency (MSG 3 & 5)
- **Cambio:** Agregada mención "ANIVERSARIO: SOLO HOY" en Propuestas y CTAs.
- **Objetivo:** Generar urgencia y justificar el descuento.
- **Commit:** `912a752`

## VPS Deploy Commands (Para el Usuario)
```bash
cd /srv/rascafull
git pull
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose logs -f
```

### 5. Smart Sleep Loop (Zero Dead Time)
- **Problema:** El bot dormía intervalos random de 15m aunque el RateLimiter pidiera esperar solo 2m.
- **Solución:** Implementado `Smart Loop` en `startLeadProcessing` que duerme el tiempo EXACTO (`nextAvailable - now`) + pequeño jitter.
- **Script:** `update-sleep-logic.js`

### 6. Fix for Validator & DB Repair (CRITICAL)
- **Problem:** Validator was corrupting valid numbers by double-prefixing.
- **Problem 2:** Fix script crashed on `E11000 duplicate key` when correcting numbers to an existing phone.
- **Problem 3:** Scripts failed in Docker due to local URI default vs Atlas requirement.
- **Solution:** 
  1. Updated Validator regex.
  2. Updated `fix-all-leads.js` to DELETE duplicates instead of crashing.
  3. Updated scripts to load `.env` correctly from `server/` to access Atlas URI.
- **Result:** Script successfully processed 4595 leads, fixing/cleaning 2427 of them. System is healthy.

### 6. Fix Phone Validator (Double Prefix)
- **Problema:** Números válidos eran rechazados porque el validador forzaba `549` incluso si ya lo tenían (ej: `549 + 54911...` = 15 dígitos).
- **Solución:** Detectar si ya empieza con `549` o `54` y limpiarlo antes de formatear.
- **Script:** `update-validator.js`

## Decisions Locked This Session
- **D-02 UPDATED:** Use git master for whatsapp-web.js (not npm)
- **D-09 UPDATED:** npm v1.34.6 does NOT fix WAPhoneUtils
- **D-10 NEW:** Timezone bug fixed in rateLimiter.js
- **D-12 NEW:** Anti-Spam URLs implemented
- **D-13 NEW:** Anniversary Promo urgency added
- **D-14 NEW:** Smart Sleep Loop (Exact Wait Times)
- **D-15 NEW:** Validator Fix (Prevent Double Prefix)

### 7. Code Synchronization (CRITICAL)
- **Problem:** `bot_2` runs from `bot_2/` folder, but fixes were applied to `bot/`.
- **Solution:** Copied `bot/services/whatsappChecker.js` (with Retry V2) to `bot_2/`, `bot_3/`, and `bot_4/`.
- **Commit:** `sync-bots`

### 8. Manual Stats Reset (Bot 1)
- **Problem:** Bot 1 stopped at 50/50 leads, but user reported only 22 sent (likely counted from previous tests).
- **Solution:** Manually reset `leadsProcessed` to 22 via `docker exec`.
- **Discovery:** Stats file is `/app/bot/stats/daily-limits.json` (global), NOT `daily-limits-bot_1.json`.

### 9. Zombie Leads Recovery (CRITICAL)
- **Problem:** User reported `0` pending leads but database had ~4800 total.
- **Diagnosis:** 3285 leads were stuck in `processing` and 5 in `queued` (zombies from previous crash/restart).
- **Solution:** Created `recover.js` script to reset `processing/queued` -> `pending`.
- **Result:** **3290 leads recovered** and available for processing.

### 10. Recovery Script (recover-leads.js)
- **Objetivo:** Analizar la DB y corregir leads que quedaron como `failed` o `phoneInvalid` por el bug del doble prefijo.
- **Script:** `/gmaps-leads-scraper/server/recover-leads.js`
- **Backup:** Solo modifica leads inválidos y los pone en `pending`.

### 22. Add NexteMarketing Services List to 4th Message
- **Problem:** The user requested to add the Nexte Marketing services after the promotion message (Message 3), meaning a 5-message sequence total.
- **Solution:** Edited `bot/services/advancedTemplateGenerator.js` to include 10 variations of 'serviciosCompletos' and ensured the script returns 5 messages instead of 4. Updated `aiTextGenerator.js` fallback array from 4 to 5 messages to match. Synced bots.
- **Archivos:** `bot/services/advancedTemplateGenerator.js`, `bot/services/aiTextGenerator.js`, `scripts/sync-bots.js`

### 23. Remove Promo Expiration from Message 5 (CTA)
- **Problem:** The user requested the removal of the urgency clauses (promo valid until Saturday) from the final call to action message.
- **Solution:** Edited `bot/services/advancedTemplateGenerator.js` to remove the  clauses from all 10 CTA variations. Synced bots.
- **Archivos:** `bot/services/advancedTemplateGenerator.js`, `scripts/sync-bots.js`

### 24. Heavy Refactor of Bot Messages (B2B, Short, No Emojis)
- **Problem:** The user requested the removal of all long, spam-looking texts and legacy unused arrays from the bot's messaging system, moving to a short, serious, B2B tone with dynamic variables.
- **Solution:** Fully rewrote `bot/services/advancedTemplateGenerator.js`. Removed legacy `saludos`, `introsNegocio`, `categoryKeywords`, `categoryPhrases`, and old fallback arrays. Created 5 clean arrays (`mensajes1ConWeb`, `mensajes1NoWeb`, `mensajes2Presentacion`, `mensajes3Propuesta`, `mensajes4Precios`, `mensajes5Cta`) with 10 high-quality variations each. Added support for `{rubro}`, `{rating}`, and `{reviews}` injection strings by extracting data directly from the lead object. Updated `aiTextGenerator.js` fallback to match the serious tone. Synced bots.
- **Archivos:** `bot/services/advancedTemplateGenerator.js`, `bot/services/aiTextGenerator.js`

### 25. Extension Scraper Update (Rating, Reviews, Category)
- **Problem:** The Chrome Extension scraper did not natively extract rating, review count, or category from Maps, making the newly proposed dynamic variables incomplete.
- **Solution:** Injected robust CSS and RegExp extraction targeting 'aria-label' and '.fontBodyMedium' directly into `extension/content.js`. Pushed to GitHub.
- **Archivos:** `extension/content.js`

## Current Session: 2026-06-16 (16:40 Argentina)
- **Objective:** Diagnosticar la restricción de 7 días de WhatsApp y proveer soluciones.
- **Status:** ✅ COMPLETED
- **Git Info:** master
- **Deploy:** N/A (Acción operativa en la VPS).

### 33. Diagnóstico de Restricción de WhatsApp de 7 Días
- **Problema:** El usuario compartió una captura de pantalla que muestra que la cuenta de WhatsApp fue restringida en dispositivos vinculados por 7 días debido a sospechas de spam/mensajes automáticos.
- **Causa Raíz:** WhatsApp detectó patrones de automatización o reportes de spam de los leads y bloqueó la funcionalidad de WhatsApp Web (Linked Devices) del número por 7 días.
- **Solución:** 
  1. Diagnosticar el impacto en el bot.
  2. Proveer las dos opciones: esperar los 7 días (y bajar el límite diario a 10-15 leads al reiniciar) o vincular un nuevo número inmediatamente.
  3. Detallar comandos para limpiar los archivos de sesión del bot en la VPS si deciden cambiar de número para forzar la generación de un nuevo código QR.

## Current Session: 2026-07-03 (08:55 Argentina)
- **Objective:** Resolver falta de espacio en el servidor VPS NatoH (DonWeb).
- **Status:** ✅ COMPLETED
- **Git Info:** master
- **Deploy:** N/A (Mantenimiento de servidor).

### 34. Limpieza y Recuperación de Almacenamiento en VPS (NatoH)
- **Problema:** El servidor se quedó sin almacenamiento (4.56% libre, 59.10 GB ocupados de 61.93 GB).
- **Causa Raíz:** Acumulación de cache de build de Docker, logs de contenedores y temporales de Chromium.
- **Solución:** Diseñar y entregar una guía de limpieza profunda y segura de Docker y del sistema operativo Linux para liberar hasta un 70% de espacio.

## Current Session: 2026-07-29 (12:09 Argentina)
- **Objective:** Implementación y sincronización de la secuencia de 4 mensajes 100% generados con ChatGPT (Sin Ads, Enfoque Software e IA NatoH).
- **Status:** ✅ COMPLETED
- **Git Info:** master
- **Deploy:** Listo para deploy en el VPS.

### 35. Rediseño Total de Secuencia con ChatGPT (100% IA Personalizada sin Ads)
- **Acción:** Diseñado el nuevo flujo dinámico de 4 mensajes con `gpt-4o-mini`:
  1. Msg 1: Saludo + Enganche ultra-personalizado basado en datos reales de Maps sin plantillas robóticas.
  2. Msg 2: Presentación adaptada al rubro específico y trayectoria (+10 años / 2015-2026).
  3. Msg 3: Propuesta a medida enfocada en Software/Sistemas a medida, IA NatoH, Web/E-commerce, Contenido y SEO Local (Sin Publicidad/Ads). Combo con descuento personalizado.
  4. Msg 4: Cierre natural ofreciendo ejemplos de trabajos realizados y agendamiento.
  5. Elaborado ejemplo demostrativo completo para validación del usuario.

## Current Session: 2026-08-03 (09:54 Argentina)
- **Objective:** Visualización de último envío en tarjeta de bot (nombre + hora) y formateo limpio de teléfonos para notificaciones de Admin.
- **Status:** ✅ COMPLETED
- **Git Info:** master
- **Deploy:** Pushed to origin/master (ecb97d6).

### 39. Visualización de Último Envío & Formateo de Teléfonos
- **Frontend CRM:** Agregada la fila **"Último Envío"** en la tarjeta de cada bot (ej. `FedericoNatoH (09:42 hs)`).
- **Backend & Bot Statuses:** Registra dinámicamente `lastSentInfo` (nombre del lead, teléfono y hora local) y lo emite en tiempo real vía Socket.io.
- **Formateo de Teléfonos para Admin:** Integrada función `formatPhoneClean(phone)` que formatea números a formato limpio internacional (ej. `+54 9 11 5832-6331`) en alertas y notificaciones al admin `5491126642674`.
- **Logs del VPS:** Entregados comandos exactos para inspeccionar el historial y estado real de envíos de mensajes del Bot 1.
