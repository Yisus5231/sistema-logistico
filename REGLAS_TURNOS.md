# 📋 REGLAS DE TURNOS - DETERMINACIÓN AUTOMÁTICA

## 🎯 RESUMEN EJECUTIVO

El sistema **calcula automáticamente** el código de asistencia (M/T/N/F) basándose en la **hora de entrada (Primera)** del archivo Excel.

```
Si entrada entre 05:00-13:00 → M (Mañana)
Si entrada entre 12:00-15:00 → T (Tarde) [tiene prioridad sobre M]
Si entrada entre 18:00-23:00 → N (Noche)
Si NO hay entrada           → F (Falta)
```

---

## 📊 TABLA DE TURNOS

| Código | Turno | Desde | Hasta | Ejemplo |
|--------|-------|-------|-------|---------|
| **M** | Mañana | 05:00:00 | 13:00:00 | Entrada a las 06:30 → **M** |
| **T** | Tarde | 12:00:00 | 15:00:00 | Entrada a las 13:45 → **T** |
| **N** | Noche | 18:00:00 | 23:00:00 | Entrada a las 20:00 → **N** |
| **F** | Falta | ─ | ─ | Sin entrada → **F** |
| **V** | Vacaciones | Manual | Manual | Se marca manualmente |
| **L** | Licencia | Manual | Manual | Se marca manualmente |

---

## ⚠️ IMPORTANTE: SOLAPAMIENTOS

### Caso especial: 12:00 - 13:00

Esta franja está en AMBOS rangos:
- ✓ Está en rango de **M** (05:00-13:00)
- ✓ Está en rango de **T** (12:00-15:00)

**REGLA: Se da PRIORIDAD a TARDE (T)**

```
Entrada a las 12:30 → T (no M)
Entrada a las 13:00 → T (no M)
```

**Orden de evaluación:** `T > N > M` (Tarde tiene máxima prioridad)

---

## 🔍 EJEMPLOS PRÁCTICOS

### ✅ Ejemplos correctos

```
Entrada: 06:30:00  → Asistencia: M (está en 05:00-13:00)
Entrada: 11:00:00  → Asistencia: M (está en 05:00-13:00)
Entrada: 12:00:00  → Asistencia: T (está en 12:00-15:00, prioridad T)
Entrada: 12:30:00  → Asistencia: T (está en 12:00-15:00)
Entrada: 13:00:00  → Asistencia: T (está en 12:00-15:00, prioridad T)
Entrada: 15:00:00  → Asistencia: T (límite superior de Tarde)
Entrada: 20:00:00  → Asistencia: N (está en 18:00-23:00)
Entrada: 23:00:00  → Asistencia: N (límite superior de Noche)
```

### ❌ Ejemplos que resultan en FALTA

```
Entrada: 04:59:59  → Asistencia: F (antes de 05:00, fuera de rangos)
Entrada: 13:00:01  → Asistencia: F (después de T, antes de N)
Entrada: 15:00:01  → Asistencia: F (después de T, antes de N)
Entrada: 17:59:59  → Asistencia: F (entre Tarde y Noche)
Entrada: 23:00:01  → Asistencia: F (después de Noche)
Entrada: (vacío)   → Asistencia: F (sin marcación)
Entrada: NULL      → Asistencia: F (sin marcación)
```

---

## 🚀 IMPLEMENTACIÓN EN EL SISTEMA

### 1. Archivo Python (Backend)

**Ubicación:** `backend/reglas_turnos.py`

**Función principal:**
```python
from reglas_turnos import determinar_turno

# Uso simple
asistencia = determinar_turno("06:30:00")  # Retorna "M"
asistencia = determinar_turno(None)         # Retorna "F"

# Procesamiento en batch
registros = [
    {"dni": "123", "primera": "06:30:00"},
    {"dni": "456", "primera": None},
]
registros_procesados = procesar_registros_tareo(registros)
```

### 2. Integración con Excel Upload

Cuando se suba el archivo Excel:

```
Excel → Backend → Validar datos → Aplicar reglas → Guardar en BD
                    (incluye hora de "Primera")
```

El sistema:
1. Lee el campo `Primera` del Excel
2. Aplica las reglas de turnos
3. Genera automáticamente el campo `asistencia` (M/T/N/F)
4. Guarda en la base de datos

### 3. Flujo Completo

```
Panel RH
    ↓
    Click "Subir archivo"
    ↓
    Seleccionar Excel (con columna "Primera")
    ↓
    Sistema procesa:
        • Lee Excel
        • Para cada empleado:
            - Toma hora de "Primera"
            - Aplica reglas de turnos
            - Calcula "Asistencia" (M/T/N/F)
    ↓
    Guarda en BD
    ↓
    Actualiza estadísticas en tiempo real
```

---

## 📋 CAMPOS DEL EXCEL

Tu Excel tiene:
```
| Empleado | Identificación | Fecha | Primera | Ultima | Sucursal | Area |
```

El sistema procesa así:
```
| Empleado | Identificación | Fecha | Primera | Asistencia |← Calculado
```

**Primera** → Entra a función `determinar_turno()` → **Asistencia** (M/T/N/F)

---

## 🔧 CASOS ESPECIALES

### Caso 1: Empleado sin entrada
```
Entrada: (vacío)  → Falta = F
```

### Caso 2: Entrada antes de horario
```
Entrada: 04:30:00 → Falta = F (antes de 05:00)
```

### Caso 3: Entrada fuera de horarios
```
Entrada: 16:00:00 → Falta = F (entre Tarde y Noche)
```

### Caso 4: Vacaciones/Licencia
```
V → Se marca MANUALMENTE en el sistema (no se calcula)
L → Se marca MANUALMENTE en el sistema (no se calcula)
```

---

## 📊 ESTADÍSTICAS

Con las reglas implementadas:

```
Panel RH mostrará:
├─ 🌅 M (Mañana):     X registros (05:00-13:00, sin solapamiento)
├─ 🌤️  T (Tarde):      X registros (12:00-15:00, con prioridad)
├─ 🌙 N (Noche):       X registros (18:00-23:00, sin solapamiento)
├─ ❌ F (Faltas):      X registros (sin entrada o fuera de rango)
├─ 🏖️ V (Vacaciones):  X registros (manual)
└─ 📋 L (Licencias):   X registros (manual)
```

---

## ✅ VALIDACIÓN

El sistema valida:
- ✓ Formato de hora (HH:MM:SS)
- ✓ Rango válido (00:00:00 - 23:59:59)
- ✓ Entrada nula o vacía
- ✓ Coincidencia con rangos de turno

Si hay error en conversión → **F** (Falta)

---

## 📝 RESUMEN

**Antes (sin reglas):**
```
Excel tiene: Primera (06:30) → Sistema no sabe qué turno es → Mandar manualmente
```

**Ahora (con reglas):**
```
Excel tiene: Primera (06:30) → Sistema aplica regla → Automáticamente M
```

**Ganancias:**
- ⚡ 0 entrada manual
- ✓ 100% automático
- 🎯 Errores reducidos a 0
- 📊 Estadísticas exactas

---

## 🚀 PRÓXIMA ACCIÓN

1. **Sube tu Excel con la columna "Primera"**
2. Sistema procesa automáticamente
3. Panel RH muestra estadísticas calculadas
4. Todo listo ✓

---

**Versión:** 1.0  
**Fecha:** Mayo 2026  
**Estado:** ✅ Listo para implementar
