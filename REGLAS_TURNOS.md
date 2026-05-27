# 📋 REGLAS DE TURNOS - DETERMINACIÓN AUTOMÁTICA (v3)

## 🎯 RESUMEN EJECUTIVO

El sistema **calcula automáticamente** el código de asistencia (M/T/N/F) basándose en:
- **Hora de entrada (Primera)**
- **Hora de salida (Última)** ← NUEVO: ahora considera la salida para diferenciar M vs T

```
Si entrada entre 05:00-13:00 → M (Mañana)
Si entrada entre 12:00-15:00 Y salida >= 16:00 → M (ESPECIAL: turno extendido)
Si entrada entre 12:00-15:00 Y salida < 16:00 → T (Tarde normal)
Si entrada entre 18:00-23:00 → N (Noche)
Si NO hay entrada → F (Falta)
```

---

## 📊 TABLA DE TURNOS

| Código | Turno | Entrada | Salida | Regla |
|--------|-------|---------|--------|-------|
| **M** | Mañana | 05:00:00 | Abierto | Turno normal o extendido |
| **T** | Tarde | 12:00:00-15:00 | < 16:00 | Solo si sale antes de las 4 PM |
| **M** | Mañana (Extendido) | 12:00:00-15:00 | ≥ 16:00 | **REGLA ESPECIAL** |
| **N** | Noche | 18:00:00 | Abierto | Turno nocturno |
| **F** | Falta | ─ | ─ | Sin entrada |
| **V** | Vacaciones | Manual | Manual | Se marca manualmente |
| **L** | Licencia | Manual | Manual | Se marca manualmente |

---

## ⚠️ REGLA ESPECIAL: MAÑANA EXTENDIDA

### ¿Cuándo se aplica?

**Si:**
- Entrada entre **12:00:00 - 15:00:00** (normalmente sería Tarde)
- Y salida >= **16:00:00** (a partir de las 4 PM)

**Entonces:** Es **M (Mañana)**, no T (Tarde)

### ¿Por qué?

El personal que entra a mediodía pero trabaja hasta las 4 PM o más tarde está realizando un **turno extendido de Mañana**, no un turno de Tarde normal.

- Tarde normal: 12:00 - 15:00 (entrada y salida)
- Mañana extendida: 05:00+ - 16:00+ (con entrada entre 12:00-15:00)

### Ejemplos

```
Juan entra 12:00, sale 14:30 → T (Tarde, salió antes de 16:00)
Maria entra 12:30, sale 16:00 → M (Mañana extendida, salió a las 4 PM)
Pedro entra 13:00, sale 17:30 → M (Mañana extendida, salió a las 5:30 PM)
Rosa entra 11:30, sale 16:00 → M (Mañana puro, entrada antes de 12:00)
```

---

## 🔍 LÓGICA DE DECISIÓN (Paso a Paso)

```
┌─────────────────────────────────────────┐
│ ¿Hay hora de entrada (Primera)?         │
└─────────────────────────────────────────┘
              │
              ├─ NO → F (Falta)
              │
              └─ SÍ
                  │
                  ▼
┌─────────────────────────────────────────┐
│ ¿Entrada entre 12:00-15:00?             │
└─────────────────────────────────────────┘
              │
              ├─ SÍ
              │   │
              │   ▼
              │ ┌─────────────────────────┐
              │ │ ¿Salida >= 16:00?       │
              │ └─────────────────────────┘
              │   │
              │   ├─ SÍ → M (Mañana extendida) ⚠️
              │   │
              │   └─ NO → T (Tarde)
              │
              └─ NO
                  │
                  ▼
┌─────────────────────────────────────────┐
│ ¿Entrada entre 18:00-23:00?             │
└─────────────────────────────────────────┘
              │
              ├─ SÍ → N (Noche)
              │
              └─ NO
                  │
                  ▼
┌─────────────────────────────────────────┐
│ ¿Entrada entre 05:00-13:00?             │
└─────────────────────────────────────────┘
              │
              ├─ SÍ → M (Mañana)
              │
              └─ NO → F (Falta)
```

---

## ✅ TABLA DE EJEMPLOS COMPLETA

| Entrada | Salida | Asistencia | Razón |
|---------|--------|------------|-------|
| 05:30 | 13:30 | M | M puro, dentro de rango |
| 06:00 | 14:00 | M | M puro, dentro de rango |
| **12:00** | **14:00** | **T** | Tarde normal, sale antes de 16:00 |
| **12:30** | **15:00** | **T** | Tarde normal, sale a las 3 PM |
| **12:00** | **16:00** | **M** | ⚠️ ESPECIAL: Sale a las 4 PM |
| **12:30** | **16:30** | **M** | ⚠️ ESPECIAL: Sale después de 4 PM |
| **13:00** | **17:00** | **M** | ⚠️ ESPECIAL: Sale a las 5 PM |
| 13:00 | 15:59 | T | T, sale antes de 16:00 |
| 18:00 | 23:00 | N | N puro |
| 20:00 | 23:30 | N | N puro |
| 04:59 | 13:00 | F | Fuera de rango |
| 16:00 | 20:00 | F | Entre rangos (no existe) |
| (vacío) | (vacío) | F | Sin entrada |
| 12:00 | (vacío) | T | Solo entrada, asume T |

---

## 🚀 IMPLEMENTACIÓN EN EL SISTEMA

### 1. Archivo Python (Backend)

**Ubicación:** `backend/reglas_turnos.py`

**Función principal:**
```python
from reglas_turnos import determinar_turno

# Ahora requiere AMBAS horas
asistencia = determinar_turno("12:30:00", "16:30:00")  # Retorna "M"
asistencia = determinar_turno("12:30:00", "14:30:00")  # Retorna "T"
asistencia = determinar_turno("06:30:00")              # Retorna "M"
```

### 2. Flujo de Procesamiento de Excel

```
Excel upload
    ↓
Backend lee: Empleado, DNI, Fecha, Primera (entrada), Ultima (salida)
    ↓
Para cada registro:
    • Lee hora de "Primera"
    • Lee hora de "Ultima"
    • Aplica reglas de turnos (considerando ambas)
    • Calcula "Asistencia" (M/T/N/F) automáticamente
    ↓
Guarda en BD con turno asignado
    ↓
Panel RH muestra estadísticas actualizadas en tiempo real
```

### 3. Columnas Requeridas en Excel

Tu Excel debe tener:
```
Empleado | Identificación | Fecha | Primera | Ultima | Sucursal | Area
```

El sistema automáticamente:
1. Lee `Primera` y `Ultima`
2. Aplica reglas
3. Genera campo `asistencia`

---

## 📈 ESTADÍSTICAS EN PANEL RH

```
Panel RH mostrará:
├─ 🌅 M (Mañana):     X registros (incluye extendidos)
├─ 🌤️  T (Tarde):      X registros (solo si salida < 16:00)
├─ 🌙 N (Noche):       X registros
├─ ❌ F (Faltas):      X registros
├─ 🏖️ V (Vacaciones):  X registros
└─ 📋 L (Licencias):   X registros
```

---

## 🔧 VALIDACIÓN

El sistema valida:
- ✓ Formato de hora (HH:MM:SS)
- ✓ Rango válido (00:00:00 - 23:59:59)
- ✓ Entrada nula o vacía → F
- ✓ Salida inválida (ignora y evalúa solo entrada)
- ✓ Coincidencia con rangos de turno

Si hay error → **F** (Falta)

---

## 📝 RESUMEN DE CAMBIOS v3

| Cambio | Impacto |
|--------|---------|
| Considera salida (`Ultima`) | Diferencia M puro vs M extendido vs T |
| Regla especial 12:00-15:00 + ≥16:00 | M (turno extendido) |
| 12:00-15:00 + <16:00 | T (tarde normal) |
| Lógica más precisa | Mejor clasificación de turnos |

---

**Versión:** 3.0  
**Fecha:** Mayo 2026  
**Estado:** ✅ Listo para implementar  
**Cambios:** Ahora considera hora de salida para regla de Mañana extendida

