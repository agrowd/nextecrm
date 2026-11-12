/**
 * 📱 VALIDADOR Y NORMALIZADOR DE TELÉFONOS ARGENTINOS
 * 
 * Convierte formatos locales (+54 9 11, 011, 15, etc.) al estándar internacional
 * de WhatsApp: 549 + código de área sin 0 + número sin 15.
 */

function cleanAndFormatArgentinianNumber(raw) {
    if (!raw) {
        return { valid: false, isValid: false, formatted: null, cleanWhatsappNumber: null, error: 'Sin teléfono', reason: 'Sin teléfono' };
    }
    let num = String(raw).replace(/[^0-9]/g, ''); // Solo números

    if (!num || num.length < 8) {
        return { valid: false, isValid: false, formatted: null, cleanWhatsappNumber: null, error: 'Número demasiado corto', reason: 'Número demasiado corto' };
    }

    // 0️⃣ DESCARTAR LÍNEAS GRATUITAS / CORPORATIVAS SIN WHATSAPP DIRECTO (0800 / 0810)
    if (num.startsWith('0800') || num.startsWith('0810') || num.startsWith('800') || num.startsWith('810') || num.startsWith('54800') || num.startsWith('54810') || num.startsWith('549800') || num.startsWith('549810')) {
        const err = 'Línea corporativa 0800/0810 (sin WhatsApp directo)';
        return { valid: false, isValid: false, formatted: null, cleanWhatsappNumber: null, error: err, reason: err };
    }

    // 1️⃣ DETECCIÓN DE FORMATO INTERNACIONAL YA EXISTENTE
    if (num.startsWith('549') && num.length === 13) {
        return { valid: true, isValid: true, formatted: num, cleanWhatsappNumber: num };
    }

    // Si empieza con 549 o 54 pero no es longitud final, quitamos prefijo para re-procesar
    if (num.startsWith('549')) num = num.slice(3);
    else if (num.startsWith('54')) num = num.slice(2);

    // 2️⃣ LIMPIEZA DE PREFIJO NACIONAL (0)
    if (num.startsWith('0')) num = num.slice(1);

    // Re-chequear 800/810 tras quitar prefijos
    if (num.startsWith('800') || num.startsWith('810')) {
        const err = 'Línea corporativa 0800/0810 (sin WhatsApp directo)';
        return { valid: false, isValid: false, formatted: null, cleanWhatsappNumber: null, error: err, reason: err };
    }

    // 3️⃣ DETECCIÓN DE CÓDIGO DE ÁREA
    let code = '';
    let rest = '';

    if (num.startsWith('11')) {
        code = '11';
        rest = num.slice(2);
    } else {
        // Probar con 3 dígitos (ej: 223 Mar del Plata, 351 Córdoba, 341 Rosario)
        code = num.slice(0, 3);
        rest = num.slice(3);

        // Si el resto es muy corto, probar con 4 (ej: 2323 Luján)
        if (code.length < 3 || rest.length < 6) {
            code = num.slice(0, 4);
            rest = num.slice(4);
        }
    }

    // 4️⃣ REMOVER '15' DE MÓVILES LOCALES
    if (rest.startsWith('15')) rest = rest.slice(2);

    // 5️⃣ UNIR CON FORMATO INTERNACIONAL (54 + 9 + codigo + numero)
    const final = `549${code}${rest}`;

    // 6️⃣ VALIDACIÓN FINAL (estándar argentino de 12 a 14 dígitos con prefijo internacional)
    if (final.length < 12 || final.length > 14) {
        const err = `Longitud inválida tras formateo (${final.length} dígitos)`;
        return { valid: false, isValid: false, formatted: null, cleanWhatsappNumber: null, error: err, reason: err };
    }

    return { valid: true, isValid: true, formatted: final, cleanWhatsappNumber: final };
}

module.exports = {
    cleanAndFormatArgentinianNumber
};
