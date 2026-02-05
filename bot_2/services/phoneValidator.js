function cleanAndFormatArgentinianNumber(raw) {
    let num = raw.replace(/[^0-9]/g, ''); // Solo números

    // 1️⃣ DETECCIÓN DE FORMATO INTERNACIONAL YA EXISTENTE
    // Si ya empieza con 549 y tiene longitud correcta (13), devolverlo directo
    if (num.startsWith('549') && num.length === 13) {
        console.log(`✅ Número ya formateado detectado: ${num}`);
        return { valid: true, formatted: num };
    }

    // Si empieza con 549 o 54 pero no es longitud final, quitamos prefix para re-procesar
    if (num.startsWith('549')) num = num.slice(3);
    else if (num.startsWith('54')) num = num.slice(2);

    // 2️⃣ LIMPIEZA DE PREFIJO NACIONAL
    if (num.startsWith('0')) num = num.slice(1); // Quitar 0 nacional

    // 3️⃣ DETECCIÓN DE CÓDIGO DE ÁREA
    // (2 a 4 dígitos, pero 11 es especial)
    let code = '';
    let rest = '';
    
    if (num.startsWith('11')) {
        code = '11';
        rest = num.slice(2);
    } else {
        // Probar con 3 dígitos (ej: 223, 351)
        code = num.slice(0, 3);
        rest = num.slice(3);
        
        // Si el resto es muy corto, probar con 4 (ej: 2323)
        if (code.length < 3 || rest.length < 6) {
            code = num.slice(0, 4);
            rest = num.slice(4);
        }
    }

    // 4️⃣ REMOVER '15' DE MÓVILES
    if (rest.startsWith('15')) rest = rest.slice(2);

    // 5️⃣ UNIR TODO CON FORMATO INTERNACIONAL (54 + 9 + codigo + numero)
    // El 9 indica móvil internacionalmente para Argentina
    const final = `549${code}${rest}`;

    // 6️⃣ VALIDACIÓN FINAL
    // Estándar: 13 dígitos total (3 pais + 10 numero)
    // Aceptamos 12 por si acaso alguna zona rara, pero <12 es error.
    if (final.length < 12 || final.length > 14) {
        console.log(`❌ Número inválido tras formateo: ${final} (original: ${raw})`);
        return { valid: false, formatted: null, error: 'Longitud inválida' };
    }
    
    console.log(`✅ Número formateado: ${final} (original: ${raw})`);
    return { valid: true, formatted: final };
}

module.exports = {
    cleanAndFormatArgentinianNumber
};
