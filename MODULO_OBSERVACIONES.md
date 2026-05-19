# 🗣️ MÓDULO DE OBSERVACIONES DE ASISTENCIA

**Fecha**: 2026-05-18  
**Estado**: ✅ BACKEND COMPLETADO - Frontend en próxima fase

---

## 📋 Resumen

Sistema completo de gestión de observaciones de asistencia con:
- ✅ Flujo de conversación tipo Chat/WhatsApp
- ✅ Validación por roles (Auxiliar, Supervisor, GDH)
- ✅ Estados automáticos (Pendiente → Revisado → Aprobado/Rechazado)
- ✅ Prioridad automática (Alta, Media, Baja)
- ✅ Historial conversacional completo
- ✅ Adjuntos de archivos
- ✅ Notificaciones por rol
- ✅ Auditoría completa

---

## 🗄️ Estructura de Base de Datos

### Tabla: `observaciones`

```sql
CREATE TABLE observaciones (
    id INTEGER PRIMARY KEY,
    usuario_id INTEGER FK,
    dni VARCHAR,
    nombre VARCHAR,
    area VARCHAR,
    supervisor_id INTEGER FK,
    fecha_asistencia DATE,
    tipo VARCHAR,
    comentario TEXT,
    estado VARCHAR DEFAULT 'Pendiente',
    prioridad VARCHAR DEFAULT 'Baja',
    respuesta_final_gdh TEXT,
    gdh_id INTEGER FK,
    fecha_creacion DATETIME,
    fecha_actualizacion DATETIME
)
```

### Tabla: `mensajes_observacion`

```sql
CREATE TABLE mensajes_observacion (
    id INTEGER PRIMARY KEY,
    observacion_id INTEGER FK,
    usuario_id INTEGER FK,
    nombre VARCHAR,
    rol VARCHAR,
    mensaje TEXT,
    fecha DATETIME
)
```

### Tabla: `archivos_observacion`

```sql
CREATE TABLE archivos_observacion (
    id INTEGER PRIMARY KEY,
    observacion_id INTEGER FK,
    nombre_archivo VARCHAR,
    ruta VARCHAR,
    tipo VARCHAR,
    tamanio INTEGER,
    usuario_id INTEGER FK,
    nombre_usuario VARCHAR,
    fecha_subida DATETIME
)
```

---

## 🔌 ENDPOINTS API

### 1. CREAR OBSERVACIÓN

**POST** `/observaciones/crear`

```json
Request:
{
  "fecha_asistencia": "2026-05-18",
  "tipo": "Error en tareo",
  "comentario": "No marcaron mi entrada"
}

Response:
{
  "id": 1,
  "msg": "Observación creada exitosamente",
  "estado": "Pendiente",
  "prioridad": "Baja"
}
```

**Restricciones:**
- ✅ Solo Auxiliares pueden crear
- ✅ Asigna automáticamente supervisor del área
- ✅ Calcula prioridad basado en tipo

---

### 2. OBTENER OBSERVACIONES POR ROL

**GET** `/observaciones/mi-area?estado=Pendiente`

**Auxiliar:**
```json
Response:
[
  {
    "id": 1,
    "fecha_asistencia": "2026-05-18",
    "tipo": "Error en tareo",
    "estado": "Pendiente",
    "prioridad": "Baja",
    "comentario": "No marcaron mi entrada"
  }
]
```

**Supervisor:**
- Ve solo observaciones de su área
- Filtro automático por `area`

**GDH:**
- Ve todas las observaciones
- Sin restricciones

---

### 3. OBTENER DETALLE DE OBSERVACIÓN

**GET** `/observaciones/{observacion_id}`

```json
Response:
{
  "observacion": {
    "id": 1,
    "dni": "12345678",
    "nombre": "Juan García",
    "area": "Picking",
    "tipo": "Error en tareo",
    "estado": "Pendiente",
    "prioridad": "Baja",
    "comentario": "No marcaron mi entrada"
  },
  "mensajes": [
    {
      "id": 1,
      "usuario_id": 5,
      "nombre": "Juan García",
      "rol": "Auxiliar",
      "mensaje": "No marcaron mi entrada",
      "fecha": "2026-05-18T10:30:00"
    },
    {
      "id": 2,
      "usuario_id": 3,
      "nombre": "Carlos López",
      "rol": "Supervisor",
      "mensaje": "Confirmo que asistió",
      "fecha": "2026-05-18T11:00:00"
    }
  ],
  "archivos": [
    {
      "id": 1,
      "nombre_archivo": "evidencia.pdf",
      "ruta": "/uploads/obs_1_evidencia.pdf",
      "tipo": "pdf",
      "usuario_id": 5,
      "nombre_usuario": "Juan García"
    }
  ]
}
```

---

### 4. AGREGAR COMENTARIO

**POST** `/observaciones/{observacion_id}/comentar`

```json
Request:
{
  "mensaje": "Revisé el tareo y confirmo asistencia"
}

Response:
{
  "id": 2,
  "msg": "Comentario agregado"
}
```

**Quién puede comentar:**
- ✅ Auxiliar (solo su observación)
- ✅ Supervisor (solo su área)
- ✅ GDH (todas)

---

### 5. SUPERVISOR VALIDA

**PUT** `/observaciones/{observacion_id}/validar`

```json
Response:
{
  "msg": "Observación validada",
  "estado": "Revisado por Supervisor"
}
```

**Automáticamente:**
- ✅ Cambia estado a "Revisado por Supervisor"
- ✅ Agrega comentario: "Supervisor validó preliminarmente..."

---

### 6. GDH APRUEBA/RECHAZA

**PUT** `/observaciones/{observacion_id}/aprobar`

```json
Request:
{
  "mensaje": "Se validará corrección del tareo",
  "accion": "Aprobar"
}

Response:
{
  "msg": "Observación aprobada",
  "estado": "Aprobado"
}
```

**Acciones disponibles:**
- `Aprobar` → Estado: "Aprobado" (🟢 Verde)
- `Rechazar` → Estado: "Rechazado" (🔴 Rojo)
- `Observar` → Estado: "Observado" (🟠 Naranja)

---

### 7. SUPERVISOR ESCALA A GDH

**POST** `/observaciones/{observacion_id}/escalar`

```json
Request:
{
  "mensaje": "Requiere revisión urgente"
}

Response:
{
  "msg": "Observación escalada a GDH"
}
```

---

### 8. ESTADÍSTICAS POR ROL

**GET** `/observaciones/estadisticas/mi-area`

**Auxiliar:**
```json
{
  "total": 5,
  "pendientes": 1,
  "aprobadas": 3,
  "rechazadas": 1
}
```

**Supervisor:**
```json
{
  "total": 25,
  "pendientes": 8,
  "por_validar": 5,
  "area": "Picking"
}
```

**GDH:**
```json
{
  "total": 125,
  "pendientes": 45,
  "aprobadas": 60,
  "rechazadas": 15,
  "observadas": 5
}
```

---

## 🔄 FLUJO COMPLETO

### Ejemplo: Auxiliar reclama error en tareo

```
1️⃣ AUXILIAR CREA
   POST /observaciones/crear
   {
     "fecha_asistencia": "2026-05-18",
     "tipo": "Error en tareo",
     "comentario": "No marcaron mi entrada"
   }
   Estado: Pendiente 🟡

2️⃣ SUPERVISOR REVISA
   GET /observaciones/{id}
   Lee comentario original
   Agrega comentario: "Confirmo que asistió"
   
3️⃣ SUPERVISOR VALIDA
   PUT /observaciones/{id}/validar
   Estado: Revisado por Supervisor 🔵
   Automáticamente agrega: "Supervisor validó preliminarmente..."

4️⃣ GDH REVISA
   GET /observaciones/{id}
   Lee todo el historial
   Lee comentarios de supervisor
   Lee documentos adjuntos

5️⃣ GDH APRUEBA
   PUT /observaciones/{id}/aprobar
   {
     "mensaje": "Se corregirá tareo en nómina",
     "accion": "Aprobar"
   }
   Estado: Aprobado 🟢

6️⃣ AUXILIAR RECIBE RESPUESTA
   Notificación: "Tu observación fue aprobada"
   Ve respuesta final de GDH
```

---

## 🎯 TIPOS DE OBSERVACIÓN

```python
TIPOS = [
    "Error en tareo",
    "Falta justificada",
    "Descanso médico",
    "Horas extras",
    "Tardanza justificada",
    "Vacaciones",
    "Cambio de turno",
    "Otro"
]
```

---

## 📊 ESTADOS Y COLORES

| Estado | Color | Significado |
|--------|-------|------------|
| Pendiente | 🟡 Amarillo | Recién creada |
| Revisado por Supervisor | 🔵 Azul | Supervisor validó |
| Observado | 🟠 Naranja | GDH pide más info |
| Aprobado | 🟢 Verde | Aprobada oficialmente |
| Rechazado | 🔴 Rojo | Rechazada |

---

## 🔐 SEGURIDAD Y VALIDACIONES

### Auxiliar
- ✅ Solo ve SUS observaciones
- ✅ Solo puede crear nuevas
- ✅ NO puede ver otras áreas
- ✅ NO puede aprobar/rechazar

### Supervisor
- ✅ Solo ve observaciones de SU ÁREA
- ✅ Puede comentar y validar
- ✅ Puede escalar a GDH
- ✅ NO puede aprobar oficialmente
- ✅ NO puede ver otras áreas

### GDH
- ✅ Ve TODAS las observaciones
- ✅ Ve todas las áreas
- ✅ Puede aprobar/rechazar/observar
- ✅ Acceso total

---

## 📈 PRIORIDAD AUTOMÁTICA

```python
def obtener_prioridad(tipo: str) -> str:
    if "falta" in tipo.lower():
        return "Alta"
    elif "descanso médico" in tipo.lower():
        return "Alta"
    elif "horas extras" in tipo.lower():
        return "Alta"
    elif "tardanza" in tipo.lower():
        return "Media"
    else:
        return "Baja"
```

---

## 🔔 NOTIFICACIONES

### Auxiliar recibe
- ✅ Respuesta de Supervisor
- ✅ Respuesta de GDH
- ✅ Solicitud de información
- ✅ Aprobación/Rechazo final

### Supervisor recibe
- ✅ Nueva observación del área
- ✅ Respuesta de GDH
- ✅ Nuevos comentarios
- ✅ Escalaciones

### GDH recibe
- ✅ Nuevas observaciones
- ✅ Validaciones de supervisor
- ✅ Nuevos archivos
- ✅ Respuestas de auxiliares

---

## 🎨 Frontend (Próxima Fase)

### Vistas a crear
1. **Observaciones del Auxiliar**
   - Calendario de asistencia
   - Crear observación
   - Ver historial conversacional

2. **Observaciones del Supervisor**
   - Dashboard con estadísticas
   - Tabla de observaciones del área
   - Chat para comentarios
   - Botón de validar/escalar

3. **Observaciones del GDH**
   - Dashboard global
   - Tabla con filtros
   - Chat para respuestas
   - Botones Aprobar/Rechazar/Observar

---

## ✨ Características

✅ Sistema tipo WhatsApp/Messenger  
✅ Estados visuales con colores  
✅ Prioridad automática  
✅ Flujo claro y lineal  
✅ Historial conversacional  
✅ Adjuntos de archivos  
✅ Validaciones por rol  
✅ Auditoría completa  
✅ Notificaciones automáticas  
✅ Dashboard por rol  

---

**Status**: ✅ BACKEND LISTO - Frontend en desarrollo

Última actualización: 2026-05-18
