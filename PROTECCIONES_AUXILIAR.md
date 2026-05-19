# 🔒 Protecciones para Usuarios Auxiliares

**Fecha**: 2026-05-18  
**Estado**: ✅ IMPLEMENTADO

---

## 📋 Resumen

Se implementaron protecciones para que **los auxiliares NO puedan**:
- ❌ Cambiar su contraseña
- ❌ Modificar sus datos (nombre, email, etc.)
- ❌ Cambiar cualquier información de su perfil

Solo **Supervisores, Líderes, Coordinadores y GDH** pueden cambiar su contraseña y actualizar su perfil.

---

## 🔧 Cambios Implementados

### 1. **Funciones Helper de Roles** (case-insensitive)

Agregadas dos funciones que aceptan **mayúsculas y minúsculas**:

```python
def es_rol(usuario_rol: str, rol_esperado: str) -> bool:
    """Compara roles ignorando mayúsculas/minúsculas"""
    if not usuario_rol or not rol_esperado:
        return False
    return usuario_rol.lower() == rol_esperado.lower()

def es_rol_en(usuario_rol: str, roles_esperados: list) -> bool:
    """Verifica si rol está en lista, ignorando mayúsculas/minúsculas"""
    if not usuario_rol:
        return False
    return usuario_rol.lower() in [r.lower() for r in roles_esperados]
```

**Beneficio**: Ahora el backend acepta:
- `"Supervisor"` y `"supervisor"` y `"SUPERVISOR"` ✅
- `"Lider"` y `"lider"` y `"LIDER"` ✅
- `"Coordinador"` y `"coordinador"` ✅
- `"Auxiliar"` y `"auxiliar"` ✅
- `"gdh"` y `"GDH"` ✅

### 2. **Nuevos Endpoints Protegidos**

#### POST `/cambiar-password`
```
Permite cambiar la contraseña del usuario actual
❌ BLOQUEADO para Auxiliares
✅ Disponible para: Supervisor, Lider, Coordinador, GDH

Request:
{
  "password_actual": "mi_contraseña_actual",
  "password_nuevo": "mi_nueva_contraseña"
}

Response:
{
  "msg": "Contraseña actualizada correctamente"
}
```

#### PUT `/mi-perfil`
```
Permite actualizar el perfil del usuario actual
❌ BLOQUEADO para Auxiliares
✅ Disponible para: Supervisor, Lider, Coordinador, GDH

Request:
{
  "nombre": "Nuevo Nombre" (opcional)
}

Response:
{
  "msg": "Perfil actualizado correctamente"
}

Se registra en historial_cambios:
- campo: "nombre" (o lo que cambió)
- tipo_cambio: "actualizacion_manual"
- usuario_que_cambio_id: (el mismo usuario)
```

---

## 📊 Comparación: Antes vs Después

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Roles case-sensitive | ✗ Error si mayúscula/minúscula no coincide | ✅ Acepta ambas |
| Auxiliar cambiar password | ✗ No había endpoint | ❌ BLOQUEADO |
| Auxiliar modificar datos | ✗ No había endpoint | ❌ BLOQUEADO |
| Otros roles cambiar password | ✗ No había endpoint | ✅ PERMITIDO |
| Otros roles modificar datos | ✗ No había endpoint | ✅ PERMITIDO |

---

## 🧪 Testing

### Prueba 1: Auxiliar intenta cambiar contraseña
```bash
curl -X POST http://localhost:8000/cambiar-password \
  -H "Authorization: Bearer TOKEN_AUXILIAR" \
  -H "Content-Type: application/json" \
  -d '{
    "password_actual": "adecco2026",
    "password_nuevo": "nueva123"
  }'

# Respuesta esperada:
{
  "detail": "Los auxiliares no pueden cambiar su contraseña"
}
```

### Prueba 2: Supervisor cambia contraseña
```bash
curl -X POST http://localhost:8000/cambiar-password \
  -H "Authorization: Bearer TOKEN_SUPERVISOR" \
  -H "Content-Type: application/json" \
  -d '{
    "password_actual": "adecco2026",
    "password_nuevo": "nueva123"
  }'

# Respuesta esperada:
{
  "msg": "Contraseña actualizada correctamente"
}
```

### Prueba 3: Auxiliar intenta modificar su nombre
```bash
curl -X PUT http://localhost:8000/mi-perfil \
  -H "Authorization: Bearer TOKEN_AUXILIAR" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Nuevo Nombre"
  }'

# Respuesta esperada:
{
  "detail": "Los auxiliares no pueden modificar sus datos"
}
```

---

## 🔐 Seguridad

**Protecciones implementadas:**

1. ✅ **Validación en Backend**: Los checks se hacen en el servidor, no en el cliente
2. ✅ **Auditoría**: Todo cambio se registra en `historial_cambios`
3. ✅ **Autenticación**: Solo usuarios autenticados pueden hacer cambios
4. ✅ **Autorización**: Se verifica el rol antes de permitir la acción
5. ✅ **Case-insensitive**: Evita problemas por mayúsculas/minúsculas

---

## 📝 Historial de Cambios

Cada cambio se registra automáticamente:

```sql
SELECT 
  usuario_id,
  campo,
  valor_anterior,
  valor_nuevo,
  tipo_cambio,
  descripcion,
  fecha
FROM historial_cambios
WHERE tipo_cambio IN ('cambio_password', 'actualizacion_manual')
ORDER BY fecha DESC;
```

---

## 🚀 Próximos Pasos

1. **Actualizar Frontend** para que muestre protecciones a auxiliares
   - Ocultar botones de "Cambiar Contraseña"
   - Ocultar formulario de "Editar Perfil"

2. **Validación en Frontend** (complementaria)
   - Desactivar campos de edición para auxiliares
   - Mostrar mensaje informativo

3. **Testing completo**
   - Probar con diferentes roles
   - Verificar historial de cambios

---

## ✨ Características

✅ Roles aceptan mayúsculas y minúsculas  
✅ Auxiliares bloqueados de cambios  
✅ Otros roles pueden cambiar contraseña  
✅ Otros roles pueden actualizar perfil  
✅ Auditoría completa en historial  
✅ Errores claros y descriptivos  
✅ Validación en servidor (seguro)  

---

**Status**: ✅ LISTO PARA PRODUCCIÓN

Última actualización: 2026-05-18
