# 🎯 Implementación: Asignación Automática de Roles por Cargo

**Fecha**: 2026-05-18  
**Estado**: ✅ COMPLETADO

---

## 📋 Resumen

Se implementó un sistema **automático** que asigna roles a los usuarios basado en su **cargo** (columna D del Excel de colaboradores).

### Roles Disponibles

```
┌─────────────────────┬──────────────────────────────┐
│ Rol                 │ Se asigna a cargos como:     │
├─────────────────────┼──────────────────────────────┤
│ lider               │ Líder, Jefe, Supervisor      │
│ soporte             │ Técnico, Soporte, Asistente  │
│ coordinador         │ Coordinador, Jefe de Log.    │
│ auxiliar (default)  │ Auxiliar, Operario, etc.     │
└─────────────────────┴──────────────────────────────┘
```

---

## 🔧 Cambios Implementados

### 1. Archivo: `sync_excel.py`

**Cambios**:
1. ✅ Agregada función `obtener_rol_por_cargo(cargo: str) -> str`
2. ✅ Agregado diccionario `CARGO_A_ROL` con mapeos
3. ✅ Actualizada lógica de **crear usuario** para asignar rol automáticamente
4. ✅ Actualizada lógica de **actualizar usuario** para cambiar rol si cambia el cargo

**Flujo**:
```
Excel (Columna D: Cargo)
    ↓
sincronizar() lee cargo
    ↓
obtener_rol_por_cargo(cargo)
    ↓
Asigna rol: "lider" | "soporte" | "coordinador" | "auxiliar"
    ↓
BD: usuario.rol = rol_asignado
```

### 2. Archivo Nuevo: `MAPEO_CARGO_ROL.md`

Documentación completa del sistema:
- Mapeo de cargos a roles
- Cómo personalizar
- Casos de uso
- Auditoría

### 3. Archivo Nuevo: `test_mapeo_roles.py`

Script de prueba que valida el mapeo:
```bash
python test_mapeo_roles.py
```

---

## 🚀 Cómo Usar

### Flujo: Subir Excel de Colaboradores

```
1. Preparar Excel:
   Columna A: DNI
   Columna B: Nombre
   Columna C: Área
   Columna D: Cargo     ← IMPORTANTE
   Columna E: Otras columnas

2. En la app:
   Login → Click "Subir Excel"
   Seleccionar archivo → Click "Subir"

3. Sistema automáticamente:
   ✅ Lee cada fila
   ✅ Obtiene el cargo (columna D)
   ✅ Mapea cargo → rol
   ✅ Crea o actualiza usuario con rol correcto
   ✅ Registra cambios en historial

4. Resultado:
   - Usuario nuevo: Se crea con rol automático
   - Usuario existente: Si cambia cargo, cambia rol
```

### Ejemplo Práctico

**Excel**:
```
DNI        | Nombre          | Área      | Cargo
-----------|-----------------|-----------|------------------
12345678   | Juan García     | Almacén   | Líder de Almacén
87654321   | María López     | TI        | Técnico de Sistemas
55555555   | Carlos Rodríguez| Logística | Coordinador
99999999   | Ana Silva       | Almacén   | Apilador
```

**Resultado en BD**:
```
DNI        | Nombre          | Cargo                | Rol
-----------|-----------------|----------------------|-----------
12345678   | Juan García     | Líder de Almacén     | lider
87654321   | María López     | Técnico de Sistemas  | soporte
55555555   | Carlos Rodríguez| Coordinador          | coordinador
99999999   | Ana Silva       | Apilador             | auxiliar
```

**Acceso en la App**:
- Juan García: Ve "Mi Personal" (solo líderes)
- María López: Ve opciones de soporte
- Carlos: Ve opciones de coordinador
- Ana: Solo acceso básico (auxiliar)

---

## 🎯 Mapeo Completo

### LIDER (Rol: "lider")
Se asigna a cargos que contengan:
- `lider` | `líder` | `leader`
- `jefe` | `jefe de`
- `supervisor`

**Permisos**: Ver personal de su área, crear anuncios de área

### SOPORTE (Rol: "soporte")
Se asigna a cargos que contengan:
- `soporte` | `support`
- `técnico` | `tecnico`
- `asistente` | `asistencia`
- `it`

**Permisos**: Acceso especializado a soporte

### COORDINADOR (Rol: "coordinador")
Se asigna a cargos que contengan:
- `coordinador` | `coordinator`
- `jefe de logística`

**Permisos**: Coordinación de logística

### AUXILIAR (Rol: "auxiliar") - DEFAULT
Se asigna a:
- `auxiliar`
- `operario` | `operador`
- `vendedor` | `ejecutivo`
- `apilador` | `ayudante`
- **Cualquier cargo no mapeado**

**Permisos**: Acceso básico

---

## ✅ Testing

### Ejecutar Tests

```bash
cd tareo-app/backend
python test_mapeo_roles.py
```

**Salida esperada**:
```
🧪 TEST: MAPEO DE CARGO → ROL

✅ Cargo: 'Lider'
   Esperado: lider | Obtenido: lider

✅ Cargo: 'Técnico de Sistemas'
   Esperado: soporte | Obtenido: soporte

✅ Cargo: 'Operario'
   Esperado: auxiliar | Obtenido: auxiliar

...

📊 RESULTADOS: 26/26 pasados, 0/26 fallidos

✅ ¡TODOS LOS TESTS PASARON!
```

---

## 🔍 Verificación en BD

### Ver usuarios creados/actualizados

```sql
SELECT 
  dni,
  nombre,
  cargo,
  rol,
  estado,
  fecha_ultima_modificacion
FROM usuarios
WHERE fecha_ultima_modificacion >= datetime('now', '-1 hour')
ORDER BY fecha_ultima_modificacion DESC;
```

### Ver historial de cambios de rol

```sql
SELECT 
  u.nombre,
  hc.valor_anterior,
  hc.valor_nuevo,
  hc.descripcion,
  hc.fecha
FROM historial_cambios hc
JOIN usuarios u ON hc.usuario_id = u.id
WHERE hc.campo = 'rol'
ORDER BY hc.fecha DESC;
```

---

## 🛠️ Personalización

Si necesitas agregar más cargos o cambiar los roles:

### Opción 1: Editar `sync_excel.py`

```python
# Ubicación: línea ~16
CARGO_A_ROL = {
    "lider": "lider",
    "soporte": "soporte",
    "coordinador": "coordinador",
    # Agregue aquí más cargos
    "gerente": "lider",  # Gerentes = líderes
    "especialista": "soporte",  # Especialistas = soporte
}
```

### Opción 2: Modificar la lógica de búsqueda

La función `obtener_rol_por_cargo()` busca en este orden:
1. Coincidencia exacta
2. Coincidencia parcial
3. Default: "auxiliar"

```python
def obtener_rol_por_cargo(cargo: str) -> str:
    # Aquí puedes agregar lógica personalizada
    # Ej: if "gerente" in cargo.lower(): return "lider"
```

---

## 📊 Auditoría

Cada cambio de rol se registra automáticamente:

**Tabla**: `historial_cambios`

**Campos**:
- `usuario_id`: Usuario que cambió
- `campo`: "rol" (siempre)
- `valor_anterior`: Rol anterior
- `valor_nuevo`: Rol nuevo
- `tipo_cambio`: "carga_excel"
- `descripcion`: "Rol actualizado automáticamente por cambio de cargo"

**Ejemplo de entrada**:
```
usuario_id: 5
campo: rol
valor_anterior: auxiliar
valor_nuevo: lider
tipo_cambio: carga_excel
descripcion: Rol actualizado automáticamente por cambio de cargo
fecha: 2026-05-18 10:30:45
```

---

## ⚠️ Casos Especiales

### GDH (Admin)

El rol **"gdh"** NUNCA se modifica por Excel. Es especial.

```python
# En sincronizar():
if usuario.rol != "gdh":  # ← Protege GDH
    # Actualizar rol
```

### Inactivación

Si un usuario desaparece del Excel:
- Estado → "inactivo"
- Rol → **Se mantiene** (para reactivación)

### Reactivación

Si un usuario reaparece en Excel:
- Estado → "activo"
- Rol → **Se actualiza** por nuevo cargo

---

## 🎓 Ejemplo Completo

### Paso 1: Crear Excel

```
colaboradores.xlsx:

DNI        | Nombre             | Área      | Cargo
-----------|-------------------|-----------|------------------
11111111   | Juan Pérez        | Almacén   | Líder de Almacén
22222222   | María García      | TI        | Técnico Sistemas
33333333   | Carlos López      | Logística | Coordinador
44444444   | Ana Rodríguez     | Almacén   | Auxiliar
```

### Paso 2: Subir Excel en la App

```
1. Login como GDH
2. Click "Subir Excel"
3. Seleccionar colaboradores.xlsx
4. Click "Subir"
```

### Paso 3: Verificar Asignación de Roles

```sql
SELECT nombre, cargo, rol FROM usuarios 
WHERE dni IN ('11111111', '22222222', '33333333', '44444444');
```

**Resultado**:
```
nombre             | cargo                | rol
-------------------|---------------------|-------------
Juan Pérez        | Líder de Almacén     | lider
María García      | Técnico Sistemas     | soporte
Carlos López      | Coordinador          | coordinador
Ana Rodríguez     | Auxiliar             | auxiliar
```

### Paso 4: Los Usuarios Pueden Logear

- Juan: Verá su sección "Mi Personal"
- María: Verá opciones de soporte
- Carlos: Verá opciones de coordinador
- Ana: Acceso básico

---

## ✨ Características

✅ Asignación automática por cargo  
✅ Actualización de rol si cambia cargo  
✅ Auditoría completa en historial  
✅ Default a "auxiliar" si no coincide  
✅ GDH protegido (no se modifica)  
✅ Búsqueda flexible (exacta y parcial)  
✅ Fácil de personalizar  
✅ Tests incluidos  

---

## 🚀 Próximos Pasos

1. **Ejecutar tests**: `python test_mapeo_roles.py`
2. **Subir Excel** de colaboradores
3. **Verificar roles** en la BD
4. **Logear con diferentes usuarios** para validar acceso
5. **Revisar historial** para confirmar auditoría

---

**Status**: ✅ Ready for Production

Última actualización: 2026-05-18
