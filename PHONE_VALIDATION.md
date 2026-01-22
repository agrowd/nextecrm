# 📞 Doble Validación de Teléfonos

## 🎯 Descripción

El sistema ahora incluye una **doble verificación** de números de teléfono para mejorar la precisión y confiabilidad de la validación. Esto ayuda a:

- ✅ Reducir errores de envío de mensajes
- ✅ Mejorar la tasa de entrega exitosa
- ✅ Identificar números inválidos antes del envío
- ✅ Obtener información adicional sobre los números (carrier, tipo de línea, etc.)

## 🔧 Funcionamiento

### 1. **Validación Local** (Primera Capa)
- Verifica el formato argentino
- Valida códigos de área
- Detecta números de prueba
- Formatea al estándar internacional

### 2. **Validación con API** (Segunda Capa - Opcional)
- Verifica que el número existe realmente
- Obtiene información del carrier
- Confirma el país de origen
- Identifica el tipo de línea (móvil/fijo)

## 🚀 APIs Soportadas

### NumVerify API
- **URL**: https://numverify.com/
- **Plan gratuito**: 100 requests/mes
- **Variables**: `NUMVERIFY_API_KEY`

### Abstract API
- **URL**: https://www.abstractapi.com/phone-validation-api
- **Plan gratuito**: 100 requests/mes
- **Variables**: `ABSTRACT_API_KEY`

## 📋 Configuración

### 1. Variables de Entorno
Agrega al archivo `.env`:

```env
# APIs de validación de teléfonos (opcional)
NUMVERIFY_API_KEY=tu_api_key_aqui
ABSTRACT_API_KEY=tu_api_key_aqui
```

### 2. Obtener API Keys

#### NumVerify
1. Ve a https://numverify.com/
2. Regístrate para una cuenta gratuita
3. Copia tu API key
4. Agrega `NUMVERIFY_API_KEY=tu_key` al `.env`

#### Abstract API
1. Ve a https://www.abstractapi.com/phone-validation-api
2. Regístrate para una cuenta gratuita
3. Copia tu API key
4. Agrega `ABSTRACT_API_KEY=tu_key` al `.env`

## 🧪 Pruebas

### Script de Prueba
```bash
node test-phone-validation.js
```

Este script prueba:
- ✅ Diferentes formatos de números argentinos
- ✅ Validación local y con APIs
- ✅ Números inválidos y de prueba
- ✅ Estadísticas de validación

### Ejemplo de Salida
```
🧪 Iniciando pruebas de validación de teléfonos...

📞 Probando: "5491112345678"
  ✅ VÁLIDO
     Formateado: +5491112345678
     Método: double
     API: Claro Argentina

📞 Probando: "011 123-4567"
  ❌ INVÁLIDO
     Error: Formato no reconocido
     Método: local
```

## 📊 Métodos de Validación

### 1. **Local** (Solo validación local)
- Usado cuando no hay APIs configuradas
- Rápido y sin costos
- Validación básica de formato

### 2. **Double** (Doble validación)
- Validación local + API externa
- Máxima precisión
- Información adicional del carrier

### 3. **API** (Solo API)
- Cuando la validación local falla pero la API es exitosa
- Casos edge de formato

## 🔍 Formatos Soportados

### Números Válidos
```
+5491112345678
5491112345678
011 1234-5678
011 12345678
11 1234-5678
11 12345678
1234-5678
12345678
```

### Códigos de Área Válidos
- **Buenos Aires**: 11, 220-239
- **Córdoba**: 351-359
- **Santa Fe**: 340-349
- **Mendoza**: 260-269
- **Tucumán**: 381-389
- Y muchos más...

## 📈 Logging Mejorado

El bot ahora muestra logs detallados:

```
🔍 Validando número: 011 1234-5678
📋 Validación local: ✅ OK
🌐 Validación API (numverify): ✅ OK
✅ Número validado: +5491112345678 (método: double)
📱 Verificando registro en WhatsApp: +5491112345678
✅ Número registrado en WhatsApp: +5491112345678
```

## ⚠️ Consideraciones

### 1. **Límites de API**
- NumVerify: 100 requests/mes (gratuito)
- Abstract API: 100 requests/mes (gratuito)
- El sistema usa validación local como fallback

### 2. **Rendimiento**
- Validación local: ~1ms
- Validación con API: ~200-500ms
- El sistema cachea resultados para evitar requests duplicados

### 3. **Fallback**
- Si las APIs no están disponibles, usa solo validación local
- Si una API falla, continúa con la otra
- Si ambas fallan, usa solo validación local

## 🛠️ Uso en el Código

### Validación Individual
```javascript
const phoneValidator = require('./bot/services/phoneValidator');

const result = await phoneValidator.doubleValidatePhone('011 1234-5678');
if (result.success) {
  console.log(`Número válido: ${result.formatted}`);
} else {
  console.log(`Error: ${result.error}`);
}
```

### Validación Múltiple
```javascript
const numbers = ['011 1234-5678', '11 5678-1234'];
const stats = await phoneValidator.getValidationStats(numbers);

console.log(`Válidos: ${stats.valid}/${stats.total}`);
```

### Método de Compatibilidad
```javascript
// Para uso síncrono (sin APIs)
const result = phoneValidator.formatForWhatsAppSync('011 1234-5678');
```

## 🔄 Migración

El sistema es **compatible hacia atrás**:
- Los métodos existentes siguen funcionando
- La nueva funcionalidad es opcional
- Se puede activar/desactivar con las variables de entorno

## 📝 Changelog

### v2.0.0
- ✅ Doble validación con APIs externas
- ✅ Logging mejorado
- ✅ Detección de carrier
- ✅ Métodos de compatibilidad
- ✅ Script de pruebas
- ✅ Documentación completa

### v1.0.0
- ✅ Validación local básica
- ✅ Formateo para WhatsApp
- ✅ Detección de números de prueba 