# 🔐 Controles de Acceso por Rol - Sistema de Gestión de Colaboradores

## 📋 Matriz de Permisos

| Funcionalidad | GDH | Supervisor | Líder | Coordinador | Auxiliar |
|---|---|---|---|---|---|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ver Colaboradores** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Ver Detalle Colaborador** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Subir Excel Colaboradores** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Subir Excel Tareo** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ver Tareo** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ver Calendario** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ver Anuncios** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Crear Anuncios Globales** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Crear Anuncios de Área** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Eliminar Anuncios** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Reaccionar a Anuncios** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ver Historial Cambios** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ver Notificaciones** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ver Mi Perfil** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🔑 Roles Definidos

### GDH (Gestión de Recursos Humanos)
- **Descripción**: Administrador del sistema con acceso total
- **Permisos especiales**:
  - Crear anuncios globales (visibles para todos)
  - Subir/sincronizar Excel
  - Ver historial de cambios
  - Eliminar anuncios
  - Gestionar todos los colaboradores

### Supervisor
- **Descripción**: Líder de área con capacidades limitadas
- **Permisos especiales**:
  - Crear anuncios solo para su área
  - Ver colaboradores de su área (si la ruta lo permite)
  - Recibir notificaciones de su área

### Líder
- **Descripción**: Rol informativo, sin permisos especiales de creación
- **Permisos**:
  - Acceso básico al dashboard
  - Ver colaboradores
  - Ver calendario

### Coordinador
- **Descripción**: Rol similar a Líder
- **Permisos**:
  - Acceso básico al dashboard
  - Ver colaboradores
  - Ver calendario

### Auxiliar
- **Descripción**: Rol de ejecución sin acceso administrativo
- **Permisos**:
  - Ver dashboard
  - Ver calendario
  - Ver anuncios
  - Reaccionar a anuncios

---

## 🛣️ Rutas y Control de Acceso (Frontend)

```javascript
// App.jsx
/login                 // ❌ No requiere autenticación
/dashboard             // ✅ Todos autenticados
/colaboradores         // 🔒 ["gdh", "supervisor", "lider", "coordinador"]
/colaborador/:dni      // ✅ Todos autenticados
/subir-excel           // 🔒 ["gdh"]
/historial             // 🔒 ["gdh"]
/tareo-upload          // 🔒 ["gdh"]
/tareo                 // 🔒 ["gdh"]
/calendario            // ✅ Todos autenticados
/anuncios              // ✅ Todos autenticados
/admin                 // 🔒 ["gdh"]
/mi-perfil             // ✅ Todos autenticados
```

---

## 🔌 Endpoints Backend y Validaciones

### Autenticación
```
POST /login
- No requiere token
- Valida DNI + contraseña
- Retorna token JWT
```

### Colaboradores
```
GET /colaboradores
- Requiere autenticación
- GDH: ve todos
- Otros: ven según área (por implementar)
```

### Excel
```
POST /sincronizar-excel
- Requiere rol: GDH
```

### Anuncios
```
GET /anuncios
- Requiere autenticación
- GDH: ve todos
- Otros: ven anuncios de su área + globales

POST /anuncios
- Requiere rol: GDH o supervisor
- GDH: crea globales (area_publicacion = NULL)
- Supervisor: crea para su área (area_publicacion = usuario.area)

DELETE /anuncios/{id}
- Requiere rol: GDH

POST /anuncios/{id}/reaccionar
- Requiere autenticación
```

### Notificaciones
```
GET /notificaciones
- Requiere autenticación
- Ve solo sus notificaciones
```

---

## ✅ Estado de Implementación

### Backend ✅ COMPLETADO
- [x] Autenticación con JWT
- [x] Validación de roles en endpoints
- [x] Anuncios con filtrado por área
- [x] Reacciones a anuncios
- [x] Notificaciones

### Frontend ✅ COMPLETO
- [x] Login
- [x] ProtectedRoute con validación de roles
- [x] Layout con menú dinámico según rol
- [x] Dashboard
- [x] AnunciosFeed (crear, ver, reaccionar)
- [x] Notificaciones
- [x] Calendario
- [x] Mi Perfil

---

## 🚀 Pruebas Recomendadas

### Test 1: Login y Roles
```
1. Login con GDH (admin/admin123)
2. Verificar acceso a /admin y /anuncios
3. Login con Supervisor
4. Verificar que solo ve anuncios de su área
5. Logout y repetir con otros roles
```

### Test 2: Anuncios
```
1. GDH crea anuncio global
2. Supervisor crea anuncio de área
3. Verificar visibilidad en otros usuarios
4. Probar reacciones
5. GDH elimina anuncio
```

### Test 3: Acceso Denegado
```
1. Auxiliar intenta acceder a /subir-excel → 403
2. Supervisor intenta acceder a /tareo → 403
3. Líder intenta crear anuncio → no muestra formulario
```

---

## 📝 Notas de Seguridad

1. **Token**: Almacenado en sessionStorage (más seguro que localStorage)
2. **CORS**: Habilitado en backend para desarrollo
3. **Validación Frontend**: Las rutas están protegidas con ProtectedRoute
4. **Validación Backend**: Todos los endpoints validan el token y rol
5. **Anuncios de Área**: El backend valida `area_publicacion` automáticamente

---

## 🔄 Flujo de Autorización

```
1. Usuario accede a /login
2. Backend valida DNI + password
3. Backend crea token JWT con DNI y rol
4. Frontend almacena token + datos usuario
5. Frontend valida rol en ProtectedRoute
6. Backend valida token en cada endpoint
7. Backend valida rol en endpoint (según lógica)
8. Backend retorna 401 si token inválido
9. Backend retorna 403 si rol insuficiente
```

---

Última actualización: 2026-05-18
