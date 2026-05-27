# ✅ CHECKLIST DE INSTALACIÓN

## 📋 CAMBIOS REALIZADOS

Este documento sirve para verificar que todos los cambios se han aplicado correctamente.

---

## 🎯 ARCHIVOS NUEVOS

### Frontend
```
✓ frontend/src/pages/PanelRH.jsx
✓ frontend/src/pages/MiTareo.jsx
```

### Documentación
```
✓ CAMBIOS_IMPLEMENTADOS.md
✓ GUIA_RAPIDA.md
✓ CHECKLIST_INSTALACION.md (este archivo)
```

---

## 🔧 ARCHIVOS MODIFICADOS

### Frontend
```
✓ frontend/src/App.jsx
  - Importar: PanelRH, MiTareo
  - Agregar rutas /panel-rh y /mi-tareo

✓ frontend/src/components/Layout.jsx
  - Importar: BarChart3
  - Actualizar NAV_ITEMS con nuevas opciones
```

### Backend
```
✓ backend/main.py
  - Mejorar endpoint GET /tareo/estadisticas
```

---

## 🚀 PASOS PARA INSTALAR

### 1. Backend

```bash
# Ya el endpoint está en main.py, solo necesita reload
# Si usas uvicorn:
uvicorn backend.main:app --reload
```

### 2. Frontend

```bash
# Asegúrate de tener las dependencias
cd frontend
npm install

# Si necesitas añadir algún icon (ya debería estar):
# Los icons de lucide-react ya están importados

# Iniciar desarrollo
npm run dev
```

### 3. Verificar cambios en código

Abre estos archivos y verifica que existan:

```
✓ App.jsx - línea con "import PanelRH"
✓ App.jsx - línea con "import MiTareo"
✓ App.jsx - ruta "/panel-rh"
✓ App.jsx - ruta "/mi-tareo"
✓ Layout.jsx - importación "BarChart3"
✓ Layout.jsx - NAV_ITEMS con "/panel-rh" y "/mi-tareo"
```

---

## 🧪 TESTING CHECKLIST

### A. Panel RH (Rol: GDH)

```bash
# 1. Login como GDH
Username: gdh_1
Password: 123456

# 2. Ir a panel-rh
- Debe cargar el componente PanelRH
- Debe mostrar cards de estadísticas
- Debe mostrar área de upload

# 3. Subir un archivo
- Arrastra archivo Excel o click
- Click en "Sincronizar"
- Debe mostrar resultado

# 4. Verificar estadísticas cargan
- Las 6 métricas deben tener números
- Si no cargan, verificar que endpoint /tareo/estadisticas funciona

# 5. Ir a tabla de tareo
- Menú → "Registro tareo"
- Debe mostrar tabla completa
```

### B. Mi Tareo (Rol: Auxiliar)

```bash
# 1. Login como Auxiliar
Username: auxiliar_1
Password: 123456

# 2. Ir a /mi-tareo
- Debe cargar calendario
- Debe mostrar mes actual

# 3. Navegar meses
- Click botón ◀️ (mes anterior)
- Click botón ▶️ (mes siguiente)
- Debe actualizar el calendario

# 4. Verificar datos
- Si hay registros de tareo, deben aparecer en el calendario
- Cards de resumen deben tener valores

# 5. Tabla de registros
- Scroll down debe mostrar tabla
- Debe listar registros del mes actual
```

---

## 🔍 DEBUGGING

Si algo no funciona, revisa:

### 1. Consola del navegador (F12)

```javascript
// Ejecutar en consola:
console.log(localStorage.getItem('auth'))
// Debe mostrar token válido

// Verificar rol:
const user = JSON.parse(localStorage.getItem('auth'))
console.log(user.rol)
// Debe ser "gdh" o "Auxiliar"
```

### 2. Network tab (F12)

```
- Buscar request a /tareo/estadisticas
- Response debe tener estructura:
  {
    "asistido_dia": X,
    "asistido_tarde": X,
    ...
  }
```

### 3. Backend logs

```bash
# Verificar que endpoint retorna datos:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/tareo/estadisticas

# Debe retornar JSON con estadísticas
```

---

## 📊 ERRORES COMUNES

### ❌ Error: "Cannot find module 'PanelRH'"

**Solución:** Verifica que exista archivo:
```
frontend/src/pages/PanelRH.jsx
```

### ❌ Error: "404 - endpoint not found"

**Solución:** El backend debe estar en `/tareo/estadisticas` (ya debería estar)

### ❌ "Panel RH no aparece en menú"

**Solución:** Verifica:
1. Tu rol es "gdh"
2. Layout.jsx importa BarChart3
3. NAV_ITEMS tiene `/panel-rh` con `roles: ["gdh"]`

### ❌ "Mi Tareo no muestra datos"

**Solución:**
1. Verifica que hay registros de tareo cargados
2. Que tu usuario es Auxiliar
3. Que el endpoint `/tareo?dni=XXX` retorna datos

### ❌ "Estadísticas muestran 0"

**Solución:**
1. Sube un archivo de tareo primero
2. Espera a que se procese
3. Recarga la página (Ctrl+R)

---

## 🎬 FLUJO COMPLETO DE PRUEBA

```
1. Backend activo (uvicorn running)
   └─ Verificar: http://localhost:8000/health

2. Frontend activo (npm run dev)
   └─ Verificar: http://localhost:5173

3. Login como GDH
   └─ Aparecer: "Panel RH" en menú

4. Ir a Panel RH
   └─ Ver: Cards de estadísticas + upload area

5. Subir archivo Excel de tareo
   └─ Ver: Resultado de sincronización

6. Logout

7. Login como Auxiliar
   └─ Aparecer: "Mi Tareo" en menú

8. Ir a Mi Tareo
   └─ Ver: Calendario + estadísticas personales

9. Navegar meses
   └─ Verificar: Calendario actualiza correctamente
```

---

## ✨ FEATURES VERIFICADAS

- [x] Panel RH carga correctamente
- [x] Upload de archivo funciona
- [x] Estadísticas se actualizan
- [x] Mi Tareo muestra calendario
- [x] Navegación de meses funciona
- [x] Tabla de registros se muestra
- [x] Roles verificados (GDH/Auxiliar)
- [x] Menú actualizado

---

## 📝 NOTAS IMPORTANTES

1. **Los cambios NO afectan funcionalidad existente**
   - Todas las rutas antiguas siguen funcionando
   - Solo se agregan nuevas opciones

2. **Compatibilidad**
   - Versión mínima Node.js: 16+
   - Navegadores: Chrome, Firefox, Safari, Edge (actualizados)

3. **Base de datos**
   - No hay cambios en schema
   - Compatible con BD existente

4. **Autenticación**
   - Sistema JWT sin cambios
   - Roles verificados en backend y frontend

---

## 🚀 DESPLIEGUE A PRODUCCIÓN

```bash
# 1. Backend
# Asegúrate que main.py tiene cambios
# Reinicia servicio si está en producción

# 2. Frontend
npm run build
# Sube archivos de dist/ a servidor

# 3. Verificar
# Prueba todas las rutas nuevas
# Verifica que rol GDH ve Panel RH
# Verifica que rol Auxiliar ve Mi Tareo
```

---

## 📞 SOPORTE

Si hay problemas:

1. **Verificar esta lista primero**
2. **Limpiar caché** (Ctrl+Shift+Delete)
3. **Recargar página** (Ctrl+R)
4. **Reiniciar backend** (Ctrl+C, npm run dev)
5. **Contactar IT** con screenshot del error

---

**Fecha:** Mayo 2026  
**Estado:** ✅ Listo para producción  
**Versión:** 3.2
