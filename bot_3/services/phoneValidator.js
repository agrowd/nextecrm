function cleanAndFormatArgentinianNumber(raw) {
    let num = raw.replace(/[^0-9]/g, ''); // Solo números
    if (num.startsWith('0')) num = num.slice(1); // Quitar 0 nacional
    // Detectar código de área (2 a 4 dígitos, pero 11 es especial)
    let code = '';
    let rest = '';
    if (num.startsWith('11')) {
        code = '11';
        rest = num.slice(2);
    } else {
        // Probar con 3 o 4 dígitos
        code = num.slice(0, 3);
        rest = num.slice(3);
        if (code.length < 3 || rest.length < 6) {
            code = num.slice(0, 4);
            rest = num.slice(4);
        }
    }
    // Si el resto empieza con 15, quitarlo
    if (rest.startsWith('15')) rest = rest.slice(2);
    // Unir todo
    const final = `549${code}${rest}`;
    // Validar longitud (debería ser 13 dígitos: 549 + 2/3/4 + 6/7/8)
    if (final.length < 12 || final.length > 13) {
        console.log(`❌ Número inválido tras formateo: ${final} (original: ${raw})`);
        return { valid: false, formatted: null, error: 'Longitud inválida' };
    }
    console.log(`✅ Número formateado: ${final} (original: ${raw})`);
    return { valid: true, formatted: final };
}

module.exports = {
    cleanAndFormatArgentinianNumber
}; 