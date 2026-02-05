const fs = require('fs');
const path = require('path');

const botFolders = ['bot', 'bot_2', 'bot_3', 'bot_4'];
const baseDir = process.argv[2] || '.';

const newStartLeadProcessing = `  startLeadProcessing() {
    console.log('[SMART LOOP] 🚀 Iniciando ciclo de procesamiento inteligente...');
    
    // Función de ciclo inteligente (reemplaza a scheduleNextProcessing)
    const smartLoop = async () => {
      // 1. Evitar superposición
      if (this.isProcessing) {
        console.log('[SMART LOOP] ⏳ Ya existe proceso activo. Reintentando en 30s...');
        this.processingTimer = setTimeout(smartLoop, 30000); 
        return;
      }

      // 2. Verificar Rate Limit ANTES de procesar
      // Esto nos permite dormir el tiempo EXACTO si estamos limitados
      try {
        const rateStatus = await this.rateLimiter.canSendNow();
        
        if (!rateStatus.allowed) {
            const now = Date.now();
            let waitTime = 3600000; // Default 1 hora (para daily limit o fallo)
            let reason = rateStatus.reason || 'unknown';

            if (rateStatus.nextAvailable) {
                const targetTime = new Date(rateStatus.nextAvailable).getTime();
                waitTime = Math.max(0, targetTime - now);
                // Agregar jitter humano (10-30 seg) para no ser robótico al despertar
                waitTime += (Math.random() * 20000) + 10000;
                reason = 'outside_business_hours';
            } else if (rateStatus.reason === 'daily_limit_reached') {
                 // Si alcanzamos límite diario, checkear cada 1 hora por si resetean manual
                 waitTime = 60 * 60 * 1000; 
            }

            // Log detallado
            const waitMin = (waitTime / 60000).toFixed(1);
            console.log(\`[SMART LOOP] ⏸️ Rate Limit (\${reason}). Durmiendo \${waitMin} min hasta próxima ventana.\`);
            
            this.processingTimer = setTimeout(smartLoop, waitTime);
            return;
        }

        // 3. Ejecutar procesamiento (Rate Limit OK)
        // await processNextLead maneja su propio try/catch interno pero lo envolvemos por seguridad
        await this.processNextLead(); 

      } catch (e) {
         console.error('[SMART LOOP] ❌ Error crítico en ciclo:', e);
      }

      // 4. Calcular próximo ciclo (Normal)
      // Si procesamos (o intentamos), dormimos un intervalo "humano" de polling
      // Base: valor del .env (default 5 min)
      
      const baseInterval = this.interval || 300000;
      
      // Factor aleatorio (0.8x a 1.2x) - Menos varianza que antes (0.5-2.0 era mucho)
      const factor = 0.8 + (Math.random() * 0.4); 
      // Jitter pequeño (-30s a +60s)
      const jitter = (Math.random() * 90000) - 30000;
      
      let nextDelay = Math.floor((baseInterval * factor) + jitter);
      // Mínimo 2 minutos siempre para no saturar si baseInterval es bajo
      nextDelay = Math.max(120000, nextDelay);

      console.log(\`[SMART LOOP] ✅ Ciclo finalizado. Próximo chequeo en \${(nextDelay/60000).toFixed(1)} min\`);
      this.processingTimer = setTimeout(smartLoop, nextDelay);
    };

    // Iniciar primer ciclo
    this.isReady = true;
    // Pequeño delay inicial aleatorio (2-10s) para desincronizar bots al inicio
    setTimeout(smartLoop, Math.random() * 8000 + 2000);
  }`;

botFolders.forEach(folder => {
    const filePath = path.join(baseDir, folder, 'index.js');

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ File not found: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Regex to find startLeadProcessing method block
    // It captures "startLeadProcessing() {" until the matching closing brace BEFORE "setInterval" (which usually follows)
    // Or we can simple replace the known block if we match specific lines.

    // Strategy: Read file, find "startLeadProcessing() {", find "this.processingTimer = setTimeout(scheduleNextProcessing, clampedInterval);"
    // and find the closing brace after it.

    const startMarker = 'startLeadProcessing() {';
    // Unique string inside the OLD function to ensure we replace correct block
    const uniqueString = 'const clampedInterval = Math.max(120000, Math.min(900000, finalInterval));';

    const startIdx = content.indexOf(startMarker);
    if (startIdx === -1) {
        console.log(`❌ Method startLeadProcessing not found in ${folder}`);
        return;
    }

    // Find end of function (heuristic: it ends before the setInterval for cleanup or cache)
    // The previous code had "this.processingTimer = ..." then "};"
    // Let's rely on Indentation or next method.
    // actually, let's just find the closing brace that matches indentation? No, that's hard.

    // Better: Search for unique string inside, find start brace, match braces.
    let braceCount = 1; // We start after '{' of startLeadProcessing
    let currentIdx = startIdx + startMarker.length;
    let endIdx = -1;

    while (currentIdx < content.length) {
        if (content[currentIdx] === '{') braceCount++;
        if (content[currentIdx] === '}') braceCount--;

        if (braceCount === 0) {
            endIdx = currentIdx + 1; // Include the closing brace
            break;
        }
        currentIdx++;
    }

    if (endIdx !== -1) {
        const originalFunc = content.substring(startIdx, endIdx);
        // Verify it contains our unique string to be safe
        if (!originalFunc.includes(uniqueString)) {
            console.log(`⚠️ Function content mismatch in ${folder} (safety check failed)`);
            // console.log(originalFunc);
            return;
        }

        const newContent = content.substring(0, startIdx) + newStartLeadProcessing + content.substring(endIdx);
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ Updated startLeadProcessing in: ${filePath}`);
    } else {
        console.log(`❌ Could not determine function end in ${folder}`);
    }
});
