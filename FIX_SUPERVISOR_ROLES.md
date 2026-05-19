# 🔧 FIX: Roles de Supervisor No Funcionaban

## ❌ Problemas Identificados

### 1. Login.jsx - Bug de Redirección Incorrecto

**Código Antiguo (INCORRECTO)**:
```javascript
if (data.rol === "admin") navigate("/admin");
else navigate("/auxiliar");
```

**Problema**: 
- El rol que viene del backend es `"gdh"` NO `"admin"`
- Cuando supervisor1 hace login con rol `"supervisor"`, no coincide con `"admin"`
- Como es `else`, redirige automáticamente a `/auxiliar`
- El usuario supervisor1 termina viendo la interfaz de auxiliar

**Solución (NUEVO)**:
```javascript
if (data.rol === "gdh") {
  navigate("/admin");
} else {
  // Todos los demás roles van a dashboard
  navigate("/dashboard");
}
```

---

### 2. Usuarios en la Base de Datos

**Problema**: 
Los usuarios pueden no estar creados correctamente en la BD con los roles adecuados.

**Solución**:
Ejecutar el script `crear_usuarios_prueba.py` para crear usuarios correctamente.

---

## 🔧 Cómo Arreglarlo

### Paso 1: Actualizar Login.jsx ✅ (YA HECHO)

El archivo fue actualizado automáticamente. Las líneas 14-21 ahora tienen:

```javascript
useEffect(() => {
  const user = getUser();
  if (user) {
    if (user.rol === "gdh") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  }
}, []);
```

Y las líneas 38-43 ahora tienen:

```javascript
if (data.rol === "gdh") {
  navigate("/admin");
} else {
  navigate("/dashboard");
}
```

### Paso 2: Crear/Actualizar Usuarios en la BD

**Opción A: Automático (Recomendado)**

```bash
# En una terminal en la carpeta backend:
cd tareo-app/backend
python crear_usuarios_prueba.py
```

Esto creará automáticamente:
- admin (GDH)
- supervisor1 (Supervisor - Almacén)
- lider1 (Líder - Ventas)
- coordinador1 (Coordinador - Logística)
- auxiliar1 (Auxiliar - Almacén)
- Y 4 usuarios adicionales de prueba

**Opción B: Manual**

Si prefieres hacer un DELETE y recrear, ejecuta en SQLite:

```sql
-- Eliminar usuarios de prueba
DELETE FROM usuarios WHERE usuario IN ('admin', 'supervisor1', 'lider1', 'auxiliar1', 'coordinador1');

-- Insertar GDH
INSERT INTO usuarios (dni, usuario, password, nombre, cargo, area, rol, estado, fecha_ingreso, fecha_cumpleanos)
VALUES ('99999999', 'admin', 'admin123', 'Admin GDH', 'Gerente RH', 'RH', 'gdh', 'activo', '2023-01-01', '1990-01-15');

-- Insertar Supervisor
INSERT INTO usuarios (dni, usuario, password, nombre, cargo, area, rol, estado, fecha_ingreso, fecha_cumpleanos)
VALUES ('88888888', 'supervisor1', 'sup123', 'Supervisor Almacén', 'Supervisor', 'Almacén', 'supervisor', 'activo', '2022-06-01', '1992-03-20');

-- Insertar Líder
INSERT INTO usuarios (dni, usuario, password, nombre, cargo, area, rol, estado, fecha_ingreso, fecha_cumpleanos)
VALUES ('77777777', 'lider1', 'lider123', 'Líder Ventas', 'Líder', 'Ventas', 'lider', 'activo', '2022-06-01', '1993-05-10');

-- Insertar Coordinador
INSERT INTO usuarios (dni, usuario, password, nombre, cargo, area, rol, estado, fecha_ingreso, fecha_cumpleanos)
VALUES ('66666666', 'coordinador1', 'coord123', 'Coordinador Logística', 'Coordinador', 'Logística', 'coordinador', 'activo', '2023-01-01', '1994-07-25');

-- Insertar Auxiliar
INSERT INTO usuarios (dni, usuario, password, nombre, cargo, area, rol, estado, fecha_ingreso, fecha_cumpleanos)
VALUES ('55555555', 'auxiliar1', 'aux123', 'Auxiliar Almacén', 'Auxiliar Logístico', 'Almacén', 'auxiliar', 'activo', '2023-03-15', '2000-09-05');
```

### Paso 3: Limpiar localStorage (IMPORTANTE)

```javascript
// En la consola del navegador (F12):
localStorage.clear();
// Refrescar página
location.reload();
```

### Paso 4: Probar

```
1. Ir a http://localhost:5173/
2. Login con supervisor1 / sup123
3. Debería ver menú con:
   ✅ Mi Personal
   ✅ Anuncios
   ❌ NO: Subir Excel, Admin, etc.
4. Click "Mi Personal"
   ✅ Debería ver equipo del Almacén
5. Click "Anuncios"
   ✅ Debería ver formulario de crear anuncio
   ✅ Mensaje: "📌 Este anuncio será visible solo para tu área (Almacén)"
```

---

## ✅ Lo que fue Arreglado

| Aspecto | Antes | Después |
|---------|-------|---------|
| Redirección después login | Iba a /auxiliar | Va a /dashboard (excepto GDH) |
| Menú para supervisor | No aparecía | Aparece "Mi Personal" |
| Anuncios supervisor | No funcionaba | Sí funciona crear anuncios |
| Personal supervisor | No existía | Existe sección "Mi Personal" |
| Rol en BD | Posiblemente incorrecto | Se crea correctamente con script |

---

## 📋 Resumen de Cambios

### Archivos Modificados

```
✏️ ACTUALIZADO:
  └─ frontend/src/pages/Login.jsx
     - Arreglada redirección según rol
     - Cambio: "admin" → "gdh" 
     - Cambio: else navigate("/auxiliar") → else navigate("/dashboard")

✨ NUEVO:
  └─ backend/crear_usuarios_prueba.py
     - Script para crear usuarios de prueba correctamente
```

---

## 🚀 Próximos Pasos

1. **Ejecutar**: `python crear_usuarios_prueba.py`
2. **Limpiar localStorage**: F12 → Console → `localStorage.clear()`
3. **Refrescar**: `Ctrl + R` o `Cmd + R`
4. **Probar**: Login con supervisor1 / sup123
5. **Verificar**: Menú, Personal, Anuncios

---

## 🐛 Si Aún No Funciona

### Verificar Usuarios en BD

```sql
-- En SQLite, ejecutar:
SELECT usuario, rol, area FROM usuarios;
```

Deberías ver:
```
admin       | gdh        | RH
supervisor1 | supervisor | Almacén
lider1      | lider      | Ventas
auxiliar1   | auxiliar   | Almacén
coordinador1| coordinador| Logística
```

### Verificar Login Response

En DevTools → Network → login request:
```json
{
  "token": "eyJ...",
  "id": 2,
  "dni": "88888888",
  "nombre": "Supervisor Almacén",
  "rol": "supervisor",        // ✅ Debe ser "supervisor"
  "area": "Almacén",
  "cargo": "Supervisor"
}
```

### Verificar localStorage

En DevTools → Application → LocalStorage:
```
token: eyJ...
user: {
  "id": 2,
  "dni": "88888888",
  "nombre": "Supervisor Almacén",
  "rol": "supervisor",        // ✅ Debe ser "supervisor"
  "area": "Almacén"
}
```

---

## 📞 Soporte

Si aún hay problemas:

1. Compartir screenshot del error
2. Ver console.log (F12 → Console)
3. Verificar Network tab (F12 → Network)
4. Confirmar que `crear_usuarios_prueba.py` se ejecutó sin errores

---

Última actualización: 2026-05-18
