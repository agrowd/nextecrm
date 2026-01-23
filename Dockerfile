FROM node:20-slim

# Instalar dependencias para Puppeteer/Chrome
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Configurar directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencia primero para cache
COPY package*.json ./
COPY bot_2/package*.json ./bot_2/
COPY bot_3/package*.json ./bot_3/ 
COPY server/package*.json ./server/

# Instalar dependencias del root
RUN npm install

# Instalar dependencias de los bots y server
RUN cd bot_2 && npm install
RUN cd bot_3 && npm install
RUN cd server && npm install

# Instalar PM2 y serve global
RUN npm install -g pm2 serve

# Copiar el resto del código
COPY . .

# Variables de entorno para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Exponer puertos
EXPOSE 8484 8485

# Iniciar con PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
