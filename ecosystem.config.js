module.exports = {
    apps: [
        {
            name: "nexte-backend",
            script: "./server/index.js",
            env: {
                PORT: 8484,
                NODE_ENV: "production",
                MONGODB_URI: "mongodb://localhost:27017/gmaps-leads-scraper",
                BACKEND_URL: "http://localhost:8484"
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
        }
    ]
};
