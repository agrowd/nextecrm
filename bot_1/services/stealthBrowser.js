const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Configurar stealth
puppeteer.use(StealthPlugin());

/**
 * Stealth Browser Manager
 * Gestiona navegador Puppeteer con anti-detección total
 * 
 * Características:
 * - Oculta webdriver flags
 * - Canvas fingerprinting randomizado
 * - WebGL fingerprinting modificado
 * - User-Agent rotativo
 * - Plugins y lenguajes realistas
 */
class StealthBrowserManager {
    constructor() {
        this.browser = null;

        // User-Agents argentinos realistas
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
        ];
    }

    async launch() {
        const randomUA = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];

        console.log('🔒 Lanzando navegador con stealth mode...');
        console.log(`🎭 User-Agent: ${randomUA.substring(0, 50)}...`);

        this.browser = await puppeteer.launch({
            headless: false, // IMPORTANTE: headless se detecta más fácil
            executablePath: process.env.CHROME_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled', // ⭐ Crítico
                '--disable-features=IsolateOrigins,site-per-process,RelatedWebsiteSets,FirstPartySets', // 🛡️ CRÍTICO para prevenir locking
                '--disable-web-security',
                `--user-agent=${randomUA}`,
                '--window-size=1920,1080',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-infobars',
                '--window-position=0,0',
                '--ignore-certifcate-errors',
                '--ignore-certifcate-errors-spki-list',
                '--disable-breakpad', // 🛡️ CRÍTICO: Evita locking de archivos de crash dumps
                '--disable-component-update' // 🛡️ CRÍTICO: Evita locking por updates
            ],
            ignoreDefaultArgs: ['--enable-automation'], // ⭐ No mostrar "controlado por software"
            defaultViewport: null
        });

        // Aplicar evasiones adicionales
        const pages = await this.browser.pages();
        const page = pages[0];

        await this.applyEvasions(page);

        console.log('✅ Browser stealth configurado correctamente');

        return this.browser;
    }

    /**
     * Aplicar técnicas de evasión al page
     */
    async applyEvasions(page) {
        // Evadir detección de WebDriver
        await page.evaluateOnNewDocument(() => {
            // 1. Ocultar webdriver
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });

            // 2. Sobrescribir el ChromeDriver
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

            // 3. Simular plugins realistas
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    {
                        0: { type: "application/pdf", suffixes: "pdf", description: "Portable Document Format" },
                        description: "Portable Document Format",
                        filename: "internal-pdf-viewer",
                        length: 1,
                        name: "Chrome PDF Plugin"
                    },
                    {
                        0: { type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format" },
                        description: "Portable Document Format",
                        filename: "internal-pdf-viewer",
                        length: 1,
                        name: "Chrome PDF Viewer"
                    },
                    {
                        0: { type: "application/x-nacl", suffixes: "", description: "Native Client Executable" },
                        1: { type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable" },
                        description: "Native Client",
                        filename: "internal-nacl-plugin",
                        length: 2,
                        name: "Native Client"
                    }
                ]
            });

            // 4. Simular lenguajes realistas (Argentina)
            Object.defineProperty(navigator, 'languages', {
                get: () => ['es-AR', 'es', 'en-US', 'en']
            });

            // 5. Randomizar Canvas Fingerprint
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function (type) {
                // Agregar ruido mínimo pero suficiente
                const shift = (Math.random() - 0.5) * 0.0002;
                const context = this.getContext('2d');
                const imageData = context.getImageData(0, 0, this.width, this.height);

                for (let i = 0; i < imageData.data.length; i += 4) {
                    imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + shift * 255));
                }

                context.putImageData(imageData, 0, 0);
                return originalToDataURL.apply(this, arguments);
            };

            // 6. Modificar WebGL Fingerprint
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function (parameter) {
                // Vendor
                if (parameter === 37445) {
                    return 'Intel Inc.';
                }
                // Renderer (variar ligeramente)
                if (parameter === 37446) {
                    const renderers = [
                        'Intel Iris OpenGL Engine',
                        'ANGLE (Intel, Intel(R) UHD Graphics 620, OpenGL 4.1)',
                        'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650, OpenGL 4.5)'
                    ];
                    return renderers[Math.floor(Math.random() * renderers.length)];
                }
                return getParameter.apply(this, arguments);
            };

            // 7. Simular timezone (Argentina)
            const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
            Date.prototype.getTimezoneOffset = function () {
                return -180; // UTC-3 (Argentina)
            };

            // 8. Simular permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission, onchange: null }) :
                    originalQuery(parameters)
            );

            // 9. Ocultar automation en navigator
            if (navigator.webdriver === false) {
                delete navigator.webdriver;
            }

            // 10. Simular hardware concurrency realista
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 8 // CPU de 8 cores (común)
            });

            // 11. Simular device memory
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8 // 8GB RAM (común)
            });

            // 12. Simular connection
            Object.defineProperty(navigator, 'connection', {
                get: () => ({
                    effectiveType: '4g',
                    rtt: 50,
                    downlink: 10,
                    saveData: false
                })
            });

            console.log('🔒 Evasiones aplicadas correctamente');
        });

        // Setear headers adicionales
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7'
        });

        // Simular timezone
        await page.emulateTimezone('America/Argentina/Buenos_Aires');

        // Simular geolocation (Buenos Aires)
        await page.setGeolocation({
            latitude: -34.6037,
            longitude: -58.3816,
            accuracy: 100
        });
    }

    async close() {
        if (this.browser) {
            console.log('🔒 Cerrando navegador stealth...');
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Obtener página con evasiones aplicadas
     */
    async getPage() {
        if (!this.browser) {
            await this.launch();
        }

        const pages = await this.browser.pages();
        if (pages.length > 0) {
            return pages[0];
        }

        const newPage = await this.browser.newPage();
        await this.applyEvasions(newPage);
        return newPage;
    }

    /**
     * Test de detección (verificar si funciona)
     */
    async testDetection() {
        console.log('🧪 Ejecutando test de detección...');

        const page = await this.getPage();
        await page.goto('https://bot.sannysoft.com/');

        await new Promise(resolve => setTimeout(resolve, 5000));

        // Tomar screenshot del resultado
        await page.screenshot({ path: 'detection-test.png', fullPage: true });

        console.log('✅ Screenshot guardado en detection-test.png');
        console.log('👀 Revisa el screenshot - todos los checks deben estar en verde');
    }
}

module.exports = StealthBrowserManager;
