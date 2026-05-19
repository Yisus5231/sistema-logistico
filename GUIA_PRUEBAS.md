# 🧪 Guía de Pruebas - Sistema de Gestión de Colaboradores

## 🚀 Antes de Empezar

### Requisitos
- Backend corriendo en `http://localhost:8000`
- Frontend corriendo en `http://localhost:5173`
- Base de datos SQLite con usuarios de prueba

### Usuarios de Prueba Precargados
```
Usuario: admin / Contraseña: admin123 / Rol: gdh
Usuario: supervisor1 / Contraseña: sup123 / Rol: supervisor / Área: Almacén
Usuario: lider1 / Contraseña: lider123 / Rol: lider / Área: Ventas
Usuario: auxiliar1 / Contraseña: aux123 / Rol: auxiliar / Área: Almacén
```

---

## 📋 Suite de Pruebas

### 1️⃣ TEST: Autenticación y Login

**Objetivo**: Verificar que el login funciona correctamente

#### 1.1 Login Exitoso - GDH
```
1. Abrir http://localhost:5173/
2. Usuario: admin
3. Contraseña: admin123
4. Click en "Entrar"
   ✅ Debería redirigir a /dashboard
   ✅ Debería mostrar "Bienvenido admin"
```

#### 1.2 Login con Rol Supervisor
```
1. http://localhost:5173/login
2. Usuario: supervisor1
3. Contraseña: sup123
4. Click en "Entrar"
   ✅ Debería redirigir a /dashboard
   ✅ Rol debe ser "supervisor"
```

#### 1.3 Credenciales Incorrectas
```
1. Usuario: admin
2. Contraseña: incorrecta
3. Click en "Entrar"
   ❌ Debería mostrar error "Credenciales incorrectas"
```

---

### 2️⃣ TEST: Controles de Acceso por Rol (Routes)

**Objetivo**: Verificar que cada rol solo puede acceder a sus rutas

#### 2.1 GDH - Acceso Completo
```
1. Login como admin (GDH)
2. Verificar menú lateral muestra:
   ✅ Dashboard
   ✅ Colaboradores
   ✅ Anuncios
   ✅ Subir Excel
   ✅ Tareo Excel
   ✅ Ver Tareo
   ✅ Calendario
   ✅ Admin (Anuncios GDH)
   ✅ Historial
   ✅ Mi Perfil

3. Intentar acceder directamente:
   ✅ http://localhost:5173/admin → Carga correctamente
   ✅ http://localhost:5173/historial → Carga correctamente
   ✅ http://localhost:5173/subir-excel → Carga correctamente
```

#### 2.2 Supervisor - Acceso Limitado
```
1. Login como supervisor1
2. Verificar menú lateral muestra:
   ✅ Dashboard
   ✅ Colaboradores (solo su área: Almacén)
   ✅ Anuncios
   ❌ NO: Subir Excel
   ❌ NO: Tareo Excel
   ❌ NO: Ver Tareo
   ✅ Calendario
   ❌ NO: Admin (Anuncios GDH)
   ❌ NO: Historial
   ✅ Mi Perfil

3. Intentar acceder directamente:
   ❌ http://localhost:5173/subir-excel → Redirige a /dashboard
   ❌ http://localhost:5173/admin → Redirige a /dashboard
```

#### 2.3 Auxiliar - Acceso Mínimo
```
1. Login como auxiliar1
2. Verificar menú lateral muestra:
   ✅ Dashboard
   ❌ NO: Colaboradores
   ✅ Anuncios
   ❌ NO: Subir Excel
   ❌ NO: Tareo Excel
   ✅ Calendario
   ✅ Mi Perfil

3. Intentar acceder a colaboradores:
   ❌ http://localhost:5173/colaboradores → Redirige a /dashboard
```

---

### 3️⃣ TEST: Feature - Anuncios

**Objetivo**: Verificar creación, visualización y reacciones de anuncios

#### 3.1 GDH Crea Anuncio Global
```
1. Login como admin (GDH)
2. Click en "Anuncios" en menú
3. Debería cargar AnunciosFeed.jsx
4. Debería mostrar formulario "Crear Anuncio"
5. Llenar:
   - Contenido: "Este es un anuncio de GDH"
   - (Opcional) Imagen/Video
6. Click "Publicar Anuncio"
   ✅ Debería mostrar "Anuncio creado correctamente"
   ✅ Anuncio debería aparecer en la lista
   ✅ Debería mostrar autor "admin"
   ✅ Debería mostrar "👨‍💼 GDH"
```

#### 3.2 Supervisor Crea Anuncio de Área
```
1. Login como supervisor1
2. Click en "Anuncios"
3. Debería mostrar formulario "Crear Anuncio"
4. Debería mostrar mensaje: "📌 Este anuncio será visible solo para tu área (Almacén)"
5. Llenar:
   - Contenido: "Anuncio para el área de Almacén"
6. Click "Publicar Anuncio"
   ✅ Debería mostrar "Anuncio creado correctamente"
   ✅ Anuncio debería mostrar "📍 Área: Almacén"
```

#### 3.3 Visibilidad de Anuncios Filtrados
```
1. Logout y login como supervisor1
2. Click en "Anuncios"
   ✅ Debería ver anuncio global de GDH
   ✅ Debería ver su propio anuncio de Almacén
   ❌ NO debería ver anuncios de otras áreas

3. Logout y login como lider1 (Área: Ventas)
   ✅ Debería ver anuncio global de GDH
   ❌ NO debería ver anuncio de Almacén
   ❌ NO debería ver formulario de crear
```

#### 3.4 Reaccionar a Anuncios
```
1. Login como cualquier usuario
2. Click en "Anuncios"
3. Click botón "🤍" en cualquier anuncio
   ✅ Debería cambiar a "❤️"
   ✅ El contador debería aumentar
4. Click nuevamente
   ✅ Debería volver a "🤍"
   ✅ El contador debería disminuir
```

#### 3.5 GDH Elimina Anuncio
```
1. Login como admin (GDH)
2. Click en "Anuncios"
3. Debería aparecer botón "✕" en cada anuncio
4. Click en "✕" de un anuncio
5. Confirmar en el diálogo
   ✅ Debería mostrar "Anuncio eliminado"
   ✅ Anuncio debería desaparecer de la lista
```

#### 3.6 Supervisor NO Puede Eliminar
```
1. Login como supervisor1
2. Click en "Anuncios"
3. Debería NO aparecer botón "✕" en los anuncios
```

---

### 4️⃣ TEST: Feature - Colaboradores

**Objetivo**: Verificar filtrado de colaboradores por área

#### 4.1 GDH Ve Todos
```
1. Login como admin (GDH)
2. Click en "Colaboradores"
   ✅ Debería ver colaboradores de todas las áreas
   ✅ Debería poder filtrar por área
```

#### 4.2 Supervisor Ve Solo Su Área
```
1. Login como supervisor1
2. Click en "Colaboradores"
   ✅ Debería ver solo colaboradores del área "Almacén"
   ❌ NO debería ver colaboradores de otras áreas
   ❌ NO debería ver opción de filtrar por área
```

---

### 5️⃣ TEST: Feature - Tareo (Asistencia)

**Objetivo**: Verificar upload y visualización de tareo

#### 5.1 GDH Sube Excel Tareo
```
1. Login como admin (GDH)
2. Click en "Subir Excel" en menú
   ✅ Debería cargar página SubirExcel.jsx
3. Click en "Tareo Excel"
   ✅ Debería cargar página TareoUpload.jsx
4. Seleccionar archivo Excel con tareo
5. Click "Subir"
   ✅ Debería mostrar resultado de sincronización
   ✅ Debería mostrar "creados" y "actualizados"
```

#### 5.2 GDH Ve Tareo
```
1. Login como admin (GDH)
2. Click en "Ver Tareo"
   ✅ Debería mostrar registros de asistencia
   ✅ Debería poder filtrar por DNI y rango de fechas
```

#### 5.3 Supervisor NO Puede Subir Tareo
```
1. Login como supervisor1
2. Click en menú
   ❌ NO debería aparecer "Subir Excel"
   ❌ NO debería aparecer "Tareo Excel"
   ❌ NO debería aparecer "Ver Tareo"
3. Intentar acceso directo:
   ❌ http://localhost:5173/tareo-upload → Redirige a /dashboard
```

---

### 6️⃣ TEST: Feature - Notificaciones

**Objetivo**: Verificar sistema de notificaciones

#### 6.1 Notificaciones de Nuevo Anuncio (GDH)
```
1. Login como admin (GDH)
2. Click en "Anuncios"
3. Crear un anuncio
4. Logout
5. Login como supervisor1
   ✅ Debería ver notificación roja en la campana
   ✅ Debería aparecer "admin publicó un nuevo anuncio"
```

#### 6.2 Notificaciones de Reacción
```
1. GDH crea un anuncio
2. Supervisor reacciona al anuncio
3. Login como admin (GDH)
   ✅ Debería ver notificación de reacción
   ✅ Debería mostrar "{nombre} le dio me gusta"
```

---

### 7️⃣ TEST: Feature - Historial

**Objetivo**: Verificar registro de cambios

#### 7.1 Solo GDH Ve Historial
```
1. Login como admin (GDH)
2. Click en "Historial"
   ✅ Debería mostrar todos los cambios
   ✅ Cada registro debe mostrar: usuario, acción, fecha

3. Logout y login como supervisor1
   ❌ NO debería poder acceder a historial
```

---

### 8️⃣ TEST: Feature - Mi Perfil

**Objetivo**: Verificar visualización de perfil

#### 8.1 Ver Perfil Propio
```
1. Login como cualquier usuario
2. Click en "Mi Perfil"
   ✅ Debería mostrar:
      - Nombre
      - DNI
      - Rol
      - Área
      - Cargo
      - Fecha de ingreso
      - Fecha de cumpleaños
      - Vacaciones pendientes
```

---

## 🔍 Verificaciones de Seguridad

### 1. CORS y Preflight
```
1. Abrir DevTools → Network
2. Hacer cualquier request a /anuncios
   ✅ Debería haber request OPTIONS (preflight)
   ✅ Response headers debería incluir:
      - Access-Control-Allow-Origin: *
      - Access-Control-Allow-Methods: *
      - Access-Control-Allow-Headers: *
```

### 2. Token en Headers
```
1. Abrir DevTools → Network → Fetch/XHR
2. Hacer request a /anuncios
   ✅ Request headers debería incluir:
      - Authorization: Bearer {token}
   O
   ✅ URL debería incluir: ?token={token}
```

### 3. Error 401 cuando no hay Token
```
1. Abrir DevTools → Console
2. Ejecutar:
   fetch('http://localhost:8000/anuncios')
   ✅ Debería retornar 401 "Token requerido"
```

### 4. Error 403 cuando Rol No Tiene Permisos
```
1. Login como supervisor1
2. DevTools → Console
3. Ejecutar:
   const token = localStorage.getItem('token');
   fetch('http://localhost:8000/subir-excel?token=' + token)
   ✅ Debería retornar 403 "Solo GDH puede..."
```

---

## 📊 Checklist Final

- [ ] Autenticación funciona para todos los roles
- [ ] Cada rol ve solo sus rutas permitidas
- [ ] GDH puede crear anuncios globales
- [ ] Supervisores pueden crear anuncios de área
- [ ] Anuncios se filtran correctamente por área
- [ ] Reacciones funcionan correctamente
- [ ] GDH puede eliminar anuncios
- [ ] Supervisores ven solo colaboradores de su área
- [ ] Tareo solo puede subirlo GDH
- [ ] Notificaciones aparecen correctamente
- [ ] Historial solo es visible para GDH
- [ ] Perfil muestra información correcta
- [ ] Logout limpia la sesión correctamente
- [ ] No hay errores 401 innecesarios
- [ ] No hay errores 403 para acciones permitidas

---

## 🐛 Si Algo No Funciona

### Paso 1: Verificar Backend
```bash
# Backend corriendo?
curl http://localhost:8000/

# Respuesta esperada:
{
  "sistema": "Gestión de Colaboradores + Anuncios + Tareo",
  "version": "3.0",
  "estado": "✅ Operativo"
}
```

### Paso 2: Verificar Frontend
```bash
# Frontend corriendo?
http://localhost:5173/

# Debería cargar página de login
```

### Paso 3: Ver Console del Navegador
```
DevTools (F12) → Console → ¿Hay errores?
DevTools → Network → Ver requests fallidos
```

### Paso 4: Ver Logs del Backend
```
Terminal donde corre el backend:
¿Hay errores de base de datos?
¿Hay errores de validación?
```

---

## 📚 Archivos Relacionados

- Backend: `tareo-app/backend/main.py`
- Frontend: `tareo-app/frontend/src/`
- Modelos: `tareo-app/backend/models.py`
- Autenticación: `tareo-app/backend/auth.py`
- AnunciosFeed: `tareo-app/frontend/src/pages/AnunciosFeed.jsx`
- Controles de Acceso: `CONTROLES_ACCESO.md`

---

Última actualización: 2026-05-18
