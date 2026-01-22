# 🎨 Iconos de la Extensión GMaps Scraper

## 📁 Archivos de Iconos

### SVG (Vectoriales)
- `icon16.svg` - Icono de 16x16 píxeles
- `icon48.svg` - Icono de 48x48 píxeles  
- `icon128.svg` - Icono de 128x128 píxeles

### Conversión a PNG
- `convert-to-png.html` - Herramienta para convertir SVG a PNG

## 🚀 Cómo Usar los Iconos

### Opción 1: Usar SVG directamente (Recomendado)
Los iconos SVG ya están configurados en el `manifest.json` y funcionan perfectamente en Chrome.

### Opción 2: Convertir a PNG
Si prefieres usar PNG:

1. **Abrir el convertidor:**
   ```bash
   # Navegar a la carpeta de iconos
   cd extension/icons
   
   # Abrir en el navegador
   start convert-to-png.html
   ```

2. **Convertir los iconos:**
   - Haz clic en "Convertir Todos"
   - Descarga cada icono como PNG
   - Reemplaza los archivos SVG con los PNG

3. **Actualizar manifest.json:**
   ```json
   "icons": {
     "16": "icons/icon16.png",
     "48": "icons/icon48.png", 
     "128": "icons/icon128.png"
   }
   ```

## 🎨 Diseño de los Iconos

### Colores
- **Primario**: `#1a73e8` (Azul Google)
- **Secundario**: `#1557b0` (Azul oscuro)
- **Acento**: `#ffffff` (Blanco)

### Elementos
- **Mapa**: Símbolo de ubicación geográfica
- **Lupa**: Elemento de búsqueda
- **Texto**: "GM" en iconos pequeños, "GMaps Scraper" en el grande
- **Gradiente**: Efecto visual en el icono de 128px

### Estilo
- **Bordes redondeados**: Para un look moderno
- **Sombras**: Profundidad visual
- **Escalabilidad**: Vectoriales para cualquier tamaño

## 🔧 Personalización

### Cambiar Colores
Edita los archivos SVG y modifica:
```svg
fill="#1a73e8"  <!-- Color principal -->
fill="#1557b0"  <!-- Color secundario -->
```

### Cambiar Símbolos
Reemplaza los paths SVG con nuevos iconos:
- Usa herramientas como Figma, Sketch o Inkscape
- Exporta como SVG
- Mantén las dimensiones especificadas

### Agregar Efectos
Los iconos SVG soportan:
- Gradientes
- Sombras
- Animaciones (CSS)
- Filtros

## 📱 Compatibilidad

### Chrome/Edge
- ✅ SVG nativo
- ✅ PNG tradicional
- ✅ Todos los tamaños

### Firefox
- ✅ SVG nativo
- ✅ PNG tradicional
- ⚠️ Algunos efectos SVG avanzados

### Safari
- ✅ SVG nativo
- ✅ PNG tradicional
- ⚠️ Gradientes complejos

## 🛠️ Herramientas Recomendadas

### Editores SVG
- **Inkscape** (Gratuito)
- **Figma** (Web, gratuito)
- **Adobe Illustrator** (Pago)
- **Sketch** (Mac)

### Conversores
- **convert-to-png.html** (Incluido)
- **Online SVG to PNG**
- **Inkscape** (Exportar como PNG)

## 📋 Checklist de Iconos

- [ ] Icono 16x16 creado
- [ ] Icono 48x48 creado
- [ ] Icono 128x128 creado
- [ ] Referencias en manifest.json
- [ ] Pruebas en Chrome
- [ ] Pruebas en otros navegadores
- [ ] Optimización de tamaño

## 🎯 Consejos

1. **Mantén consistencia** entre todos los tamaños
2. **Usa colores de marca** (Google Blue)
3. **Prueba en diferentes fondos** (claro/oscuro)
4. **Optimiza el tamaño** de archivo
5. **Mantén simplicidad** para tamaños pequeños

---

**¡Los iconos están listos para usar! 🎉** 