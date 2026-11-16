module.exports = {
    apps: [
        {
            name: "nexte-backend",
            script: "./server/index.js",
            env: {
                PORT: 8484,
                NODE_ENV: "production",
                // MONGODB_URI se hereda del entorno Docker (env_file .env)
                BACKEND_URL: "http://localhost:8484",
                HEADLESS: "true"
            }
        },
        {
            name: "nexte-frontend",
            script: "serve",
            env: {
                PM2_SERVE_PATH: "./crm-dashboard",
                PM2_SERVE_PORT: 8485,
                PM2_SERVE_SPA: "true",
                PM2_SERVE_HOMEPAGE: "/index.html"
            }
        },
        {
            name: "nexte-bot1",
            cwd: "./bot",
            script: "./index.js",
            env: {
                NODE_ENV: "production",
                BOT_INSTANCE_ID: "bot_1",
                AUTO_START: "true",
                BACKEND_URL: "http://localhost:8484",
                HEADLESS: "true"
            }
        }
    ]
};
