# 🎯 Sistema de Roles - Versión Final

**Status**: ✅ SIMPLIFICADO Y LISTO

---

## 📋 Roles Únicos (5 Total)

```
1. Supervisor
2. Lider
3. Auxiliar
4. Coordinador
5. gdh (Admin - especial)
```

**No hay más roles que estos.**

---

## 🔄 Cómo Se Asignan Los Roles

### Basado ÚNICAMENTE en el Cargo del Excel

Cuando subes el Excel de colaboradores:

```
Columna D: CARGO
    ↓
Sistema lee el cargo
    ↓
obtener_rol_por_cargo(cargo)
    ↓
Asigna rol automáticamente
```

### Mapeo Simple

```python
def obtener_rol_por_cargo(cargo: str) -> str:
    if "supervisor" in cargo.lower():
        return "Supervisor"
    
    if "lider" in cargo.lower() or "líder" in cargo.lower():
        return "Lider"
    
    if "coordinador" in cargo.lower():
        return "Coordinador"
    
    # DEFAULT: Cualquier otro cargo
    return "Auxiliar"
```

### Ejemplos

| Cargo en Excel | Rol Asignado |
|---|---|
| Supervisor de Almacén | Supervisor |
| Supervisor - Recepción Importados | Supervisor |
| Líder de Proyecto | Lider |
| Lider de Equipo | Lider |
| Coordinador de Logística | Coordinador |
| Coordinador | Coordinador |
| Auxiliar | Auxiliar |
| Operario | Auxiliar |
| Vendedor | Auxiliar |
| Ejecutivo de Ventas | Auxiliar |
| Cualquier otro cargo | Auxiliar |

---

## 👤 Usuario Especial: admin (gdh)

```
Usuario: admin
Contraseña: admin123
Rol: gdh (NUNCA CAMBIA)
```

El usuario `admin` siempre será `gdh` sin importar qué diga el Excel.

---

## 🚀 Flujo Completo

### Paso 1: Preparar Excel

```
colaboradores.xlsx:

DNI        | Nombre             | Área      | Cargo
-----------|-------------------|-----------|------------------
11111111   | Juan García       | Almacén   | Supervisor de Almacén
22222222   | María López       | TI        | Líder de Proyecto
33333333   | Carlos Rodríguez  | Logística | Coordinador
44444444   | Ana Silva         | Almacén   | Auxiliar
```

### Paso 2: Subir en la App

```
1. Login como admin (gdh)
2. Click "Subir Excel"
3. Selecciona colaboradores.xlsx
4. Click "Subir"
```

### Paso 3: Sistema Asigna Roles

```
Sistema procesa cada fila:

DNI 11111111: Cargo = "Supervisor de Almacén"
  ├─ obtener_rol_por_cargo("Supervisor de Almacén")
  ├─ Contiene "supervisor" → rol = "Supervisor"
  └─ Usuario creado/actualizado con rol="Supervisor"

DNI 22222222: Cargo = "Líder de Proyecto"
  ├─ obtener_rol_por_cargo("Líder de Proyecto")
  ├─ Contiene "líder" → rol = "Lider"
  └─ Usuario creado/actualizado con rol="Lider"

DNI 33333333: Cargo = "Coordinador"
  ├─ obtener_rol_por_cargo("Coordinador")
  ├─ Contiene "coordinador" → rol = "Coordinador"
  └─ Usuario creado/actualizado con rol="Coordinador"

DNI 44444444: Cargo = "Auxiliar"
  ├─ obtener_rol_por_cargo("Auxiliar")
  ├─ No contiene Supervisor/Lider/Coordinador → rol = "Auxiliar" (default)
  └─ Usuario creado/actualizado con rol="Auxiliar"
```

### Paso 4: Resultado en BD

```
DNI        | Nombre             | Cargo                  | Rol
-----------|-------------------|------------------------|-------------
11111111   | Juan García       | Supervisor de Almacén  | Supervisor
22222222   | María López       | Líder de Proyecto      | Lider
33333333   | Carlos Rodríguez  | Coordinador            | Coordinador
44444444   | Ana Silva         | Auxiliar               | Auxiliar
```

---

## 📝 Auditoría

Cada cambio de rol se registra en `historial_cambios`:

```sql
SELECT 
  usuario_id,
  campo,
  valor_anterior,
  valor_nuevo,
  descripcion
FROM historial_cambios
WHERE campo = 'rol'
ORDER BY fecha DESC;
```

---

## 🧪 Testing

### Ejecutar Tests

```bash
cd tareo-app/backend
python test_mapeo_roles.py
```

**Salida esperada**:
```
🧪 TEST: MAPEO DE CARGO → ROL
ROLES VÁLIDOS: Supervisor, Lider, Auxiliar, Coordinador, gdh

✅ Cargo: 'Supervisor'
   Esperado: Supervisor | Obtenido: Supervisor

✅ Cargo: 'Líder de Almacén'
   Esperado: Lider | Obtenido: Lider

✅ Cargo: 'Coordinador'
   Esperado: Coordinador | Obtenido: Coordinador

✅ Cargo: 'Auxiliar'
   Esperado: Auxiliar | Obtenido: Auxiliar

...
📊 RESULTADOS: 23/23 pasados
✅ ¡TODOS LOS TESTS PASARON!
```

---

## 🔄 Actualizar Usuarios Existentes

Si quieres actualizar los roles de usuarios existentes basado en su cargo actual:

```bash
python actualizar_supervisores.py
```

**Qué hace**:
1. Lee cada usuario (excepto admin)
2. Lee su cargo
3. Calcula rol correcto
4. Si cambió, actualiza en BD y registra en historial
5. Muestra resumen

---

## 📊 Acceso por Rol

```javascript
// App.jsx - Rutas protegidas por rol

/ /admin → rol="gdh"
/personal → rol="Supervisor" (ver su personal)
/colaboradores → rol="Lider" | "Coordinador"
/anuncios → Todos (pero solo crear si Supervisor/gdh)
```

---

## ✨ Características

✅ **Simple**: Solo 5 roles  
✅ **Automático**: Se asignan por cargo  
✅ **Auditable**: Se registran todos los cambios  
✅ **Admin protegido**: Usuario "admin" es siempre "gdh"  
✅ **Default inteligente**: Si no coincide → "Auxiliar"  
✅ **Flexible**: Actualiza cuando cambia cargo  

---

## 🎯 Casos de Uso

### Caso 1: Nuevo Usuario
```
Excel: DNI=99999999, Cargo="Supervisor"
Sistema → rol="Supervisor"
```

### Caso 2: Promoción (Cambio de Cargo)
```
BD actual: DNI=12345678, Cargo="Auxiliar", Rol="Auxiliar"
Excel nuevo: DNI=12345678, Cargo="Líder"
Sistema → rol="Lider"
```

### Caso 3: Cambio Lateral
```
BD actual: DNI=55555555, Cargo="Operario", Rol="Auxiliar"
Excel nuevo: DNI=55555555, Cargo="Vendedor"
Sistema → rol="Auxiliar" (ambos mapean a Auxiliar, sin cambio)
```

---

## 📋 Resumen

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Roles | 5+ | **5 exactamente** |
| Rol "soporte" | Existía | ❌ Eliminado |
| Asignación | Manual | **Automática por cargo** |
| Admin | Modificable | **Inmutable (siempre gdh)** |
| Auditoría | Sí | **Sí (mejorada)** |

---

## 🚀 Próximos Pasos

1. **Ejecutar test**: `python test_mapeo_roles.py`
2. **Ejecutar actualización**: `python actualizar_supervisores.py`
3. **Limpiar navegador**: `localStorage.clear()`
4. **Subir Excel** de colaboradores
5. **Verificar roles** en BD

---

**Status**: ✅ LISTO PARA PRODUCCIÓN

Última actualización: 2026-05-18
