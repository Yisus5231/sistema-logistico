# 📊 GUÍA DE FORMATOS EXCEL

## ✅ EXCEL DE COLABORADORES (Sincronización de Usuarios)

**Endpoint:** `/sincronizar-excel`
**Ubicación en App:** Lado → "Subir Excel"
**Rol Requerido:** GDH

### Estructura Requerida

| Columna | Tipo | Obligatorio | Ejemplo |
|---------|------|-----------|---------|
| Estado | Texto | ✅ | Activo |
| DNI | Número/Texto | ✅ | 12345678 |
| Nombre | Texto | ✅ | Juan Pérez García |
| Cargo | Texto | ✅ | Operario |
| Área | Texto | ✅ | Logística |
| Fecha Cumple | Fecha | ✅ | 15/03/1990 |
| Fecha Ingreso | Fecha | ✅ | 01/01/2023 |

### Ejemplo Correcto:

```
Estado    | DNI      | Nombre           | Cargo    | Área       | Fecha Cumple | Fecha Ingreso
----------|----------|------------------|----------|------------|--------------|---------------
Activo    | 12345678 | Juan Pérez       | Operario | Logística  | 15/03/1990   | 01/01/2023
Activo    | 87654321 | María García     | Supervisor| Almacén   | 22/05/1988   | 15/02/2022
Activo    | 11111111 | Carlos López     | Auxiliar | Recursos   | 10/08/1995   | 10/06/2024
```

### Puntos Importantes:

- ✅ **DNI debe ser único** por fila
- ✅ **Fechas en formato DD/MM/YYYY** o usar el formato de fechas de Excel
- ✅ **No incluir espacios al inicio/final** en los campos
- ✅ **"Activo" o "Inactivo"** en la columna Estado
- ⚠️ Los usuarios no en el Excel se **inactivarán automáticamente**
- ⚠️ Los cambios en Nombre, Cargo, Área se **registran en auditoría**

---

## ✅ EXCEL DE TAREO (Asistencia)

**Endpoint:** `/tareo/subir-excel`
**Ubicación en App:** Lado → "Tareo Excel"
**Rol Requerido:** GDH

### Estructura Requerida

| Columna | Tipo | Obligatorio | Ejemplo |
|---------|------|-----------|---------|
| DNI | Número/Texto | ✅ | 12345678 |
| Fecha | Fecha | ✅ | 01/05/2026 |
| Asistencia | Texto | ✅ | M |
| Observaciones | Texto | ❌ | Puntual |

### Códigos de Asistencia:

| Código | Significado | Color |
|--------|-----------|-------|
| M | Mañana (turno) | 🟨 Amarillo |
| T | Tarde (turno) | 🟧 Naranja |
| N | Noche (turno) | 🟦 Azul |
| F | Falta | 🟥 Rojo |
| V | Vacaciones | 🟩 Verde |
| L | Licencia | 🟪 Púrpura |

### Ejemplo Correcto:

```
DNI      | Fecha      | Asistencia | Observaciones
---------|------------|-----------|-------------------
12345678 | 01/05/2026 | M         | Puntual
87654321 | 01/05/2026 | T         | Retardo 30 minutos
11111111 | 01/05/2026 | F         | Enfermedad
12345678 | 02/05/2026 | M         | 
87654321 | 02/05/2026 | N         | Cubría festivo
```

### Puntos Importantes:

- ✅ **DNI debe existir en base de datos** (del Excel de colaboradores)
- ✅ **Fechas en formato DD/MM/YYYY**
- ✅ **Asistencia debe ser M, T, N, F, V o L** (mayúsculas)
- ✅ **Observaciones es opcional**
- ⚠️ Si el DNI no existe, se **crea el registro con el DNI como nombre**
- ⚠️ Si existe un registro con DNI+Fecha, se **actualiza**
- 🔄 Los cambios se ven en "Ver Tareo" y en el Calendario

---

## 🚀 CÓMO DESCARGAR FORMATOS

Usa estos formatos como plantilla:

### Plantilla Colaboradores (Excel de Usuarios):
```excel
Estado    | DNI      | Nombre     | Cargo    | Área     | Fecha Cumple | Fecha Ingreso
Activo    | 12345678 | Tu Nombre  | Tu Cargo | Tu Área  | DD/MM/YYYY   | DD/MM/YYYY
```

### Plantilla Tareo (Excel de Asistencia):
```excel
DNI      | Fecha     | Asistencia | Observaciones
12345678 | DD/MM/YYYY| M          | Tu observación
```

---

## ⚠️ ERRORES COMUNES Y SOLUCIONES

### Error: "Columnas faltantes"
**Causa:** Faltan columnas requeridas
**Solución:** Verifica los nombres exactos (respeta mayúsculas y espacios)

### Error: "Error procesando Excel"
**Causa:** Formato incorrecto de fechas o datos
**Solución:** 
- Asegura que las fechas sean DD/MM/YYYY o usa formato de fecha de Excel
- Verifica que DNI sea texto o número
- No incluyas caracteres especiales en datos

### Error: "Columnas faltantes: Fecha"
**Causa:** La columna de Fecha no se encontró
**Solución:** Asegura que sea exactamente "Fecha" (con acento y mayúscula)

### "Creados: 0, Actualizados: 0"
**Causa:** El Excel tiene datos pero no se procesa
**Soluciones:**
- Verifica que los DNI sean válidos (sin espacios)
- Comprueba que el formato de fechas sea correcto
- Asegura que no haya filas vacías al inicio

---

## ✅ CHECKLIST ANTES DE SUBIR

### Para Excel de Colaboradores:
- [ ] Tiene columnas: Estado, DNI, Nombre, Cargo, Área, Fecha Cumple, Fecha Ingreso
- [ ] Todos los DNI son únicos
- [ ] Todas las fechas están en DD/MM/YYYY
- [ ] No hay espacios al inicio/final de campos
- [ ] La primera fila es el encabezado

### Para Excel de Tareo:
- [ ] Tiene columnas: DNI, Fecha, Asistencia (Observaciones es opcional)
- [ ] Los DNI existen en la base de datos de colaboradores
- [ ] Las fechas están en DD/MM/YYYY
- [ ] Asistencia es M, T, N, F, V o L
- [ ] No hay filas vacías al inicio

---

## 📌 NOTAS IMPORTANTES

1. **Orden de Carga:** Primero carga el Excel de Colaboradores, luego el de Tareo
2. **Actualizaciones:** Puedes subir los archivos múltiples veces, se actualizarán los registros existentes
3. **Auditoría:** Todos los cambios en colaboradores se registran (quién cambió qué y cuándo)
4. **Notificaciones:** El calendario se actualiza automáticamente después de cargar tareo

---

¿Necesitas ayuda? Verifica:
1. Los nombres exactos de columnas en esta guía
2. El formato de fechas (DD/MM/YYYY)
3. Los códigos de asistencia (M, T, N, F, V, L)
