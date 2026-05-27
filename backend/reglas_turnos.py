"""
REGLAS DE TURNOS - Sistema Logístico v3.2 (VERSIÓN FINAL)

Turnos (en ORDEN DE PRIORIDAD):
  1. T (Tarde):    12:00:00 - 15:00:00   [PRIORIDAD ALTA]
  2. N (Noche):    18:00:00 - 23:00:00
  3. M (Mañana):   05:00:00 - 13:00:00   [PRIORIDAD BAJA]
  4. F (Falta):    Sin marcación
  5. V (Vacaciones): Manual
  6. L (Licencia):   Manual
"""

from datetime import datetime, time

TURNOS_ORDENADOS = [
    ("T", {"nombre": "Tarde", "desde": time(12, 0, 0), "hasta": time(15, 0, 0)}),
    ("N", {"nombre": "Noche", "desde": time(18, 0, 0), "hasta": time(23, 0, 0)}),
    ("M", {"nombre": "Mañana", "desde": time(5, 0, 0), "hasta": time(13, 0, 0)}),
]


def determinar_turno(hora_entrada: str) -> str:
    """
    Determina automáticamente el código de turno.
    
    Args:
        hora_entrada: String HH:MM:SS o None
    
    Returns:
        "M" (Mañana) | "T" (Tarde) | "N" (Noche) | "F" (Falta)
    """
    
    if not hora_entrada or hora_entrada.strip() == "":
        return "F"
    
    try:
        if isinstance(hora_entrada, str):
            hora_obj = datetime.strptime(hora_entrada.strip(), "%H:%M:%S").time()
        else:
            return "F"
        
        # Evaluar en orden de prioridad (T > N > M)
        for codigo, turno in TURNOS_ORDENADOS:
            desde = turno["desde"]
            hasta = turno["hasta"]
            
            if desde <= hora_obj <= hasta:
                return codigo
        
        return "F"
    
    except (ValueError, AttributeError):
        return "F"


def procesar_registros_tareo(registros: list) -> list:
    """
    Procesa registros de Excel y asigna automáticamente el turno.
    
    Args:
        registros: Lista de dicts con campos: dni, nombre, fecha, primera, etc.
    
    Returns:
        Mismos registros con campo 'asistencia' agregado
    """
    for registro in registros:
        hora = registro.get("primera") or registro.get("hora_entrada") or ""
        registro["asistencia"] = determinar_turno(hora)
    
    return registros


# ============================================================================
# TABLA DE REFERENCIA
# ============================================================================

TABLA_REFERENCIA = """
╔════════════════════════════════════════════════════════════════════╗
║         REGLAS DE ASISTENCIA - SISTEMA LOGÍSTICO v3.2             ║
╚════════════════════════════════════════════════════════════════════╝

DETERMINACIÓN AUTOMÁTICA DE TURNO (según hora de entrada):
────────────────────────────────────────────────────────────────────

┌─────┬─────────┬───────────┬───────────┬────────────────────────┐
│ Cod │ Turno   │ Desde     │ Hasta     │ Descripción            │
├─────┼─────────┼───────────┼───────────┼────────────────────────┤
│  M  │ Mañana  │ 05:00:00  │ 13:00:00  │ Madrugada a tarde      │
│  T  │ Tarde   │ 12:00:00  │ 15:00:00  │ Mediodía a media tarde │
│  N  │ Noche   │ 18:00:00  │ 23:00:00  │ Anochecer a nocturno   │
│  F  │ Falta   │ ─         │ ─         │ Sin marcación          │
│  V  │ Vacación│ ─         │ ─         │ Descanso autorizado    │
│  L  │ Licencia│ ─         │ ─         │ Permiso/Incapacidad    │
└─────┴─────────┴───────────┴───────────┴────────────────────────┘

NOTAS IMPORTANTES:
────────────────────────────────────────────────────────────────────

1. SOLAPAMIENTOS:
   • 12:00-13:00 está en AMBOS rangos (M y T)
   • Se da PRIORIDAD a TARDE (T)
   • Orden: T > N > M

2. AUTOMATIZACIÓN:
   • M, T, N se calculan automáticamente
   • V y L se marcan manualmente en el sistema
   • F se asigna si no hay hora de entrada

3. EJEMPLO CON EL EXCEL:
   ┌─────────┬────────────┬────────┐
   │ Empleado│ Fecha      │Primera │ → Asistencia
   ├─────────┼────────────┼────────┤
   │ Juan    │ 2026-05-26 │06:30   │ → M (Mañana)
   │ Maria   │ 2026-05-26 │13:45   │ → F (Fuera de rango)
   │ Pedro   │ 2026-05-26 │20:00   │ → N (Noche)
   │ Rosa    │ 2026-05-26 │ ─      │ → F (Sin marcación)
   └─────────┴────────────┴────────┘

════════════════════════════════════════════════════════════════════
"""

if __name__ == "__main__":
    print(TABLA_REFERENCIA)
    
    print("\n✅ CASOS DE PRUEBA:\n")
    
    casos = [
        ("05:00:00", "M"),
        ("06:30:00", "M"),
        ("11:59:59", "M"),
        ("12:00:00", "T"),  # SOLAPAMIENTO - Prioridad T
        ("12:30:00", "T"),  # SOLAPAMIENTO - Prioridad T
        ("13:00:00", "T"),  # SOLAPAMIENTO - Prioridad T
        ("13:00:01", "F"),  # Fuera de rangos
        ("15:00:00", "T"),
        ("15:00:01", "F"),  # Fuera de rangos
        ("17:59:59", "F"),  # Entre rangos
        ("18:00:00", "N"),
        ("20:00:00", "N"),
        ("23:00:00", "N"),
        ("23:00:01", "F"),  # Fuera de rango
        (None, "F"),
        ("", "F"),
        ("24:00:00", "F"),  # Inválido
    ]
    
    print(f"{'Hora':<12} {'Resultado':<10} {'Estado':<5}")
    print("─" * 35)
    for hora, esperado in casos:
        resultado = determinar_turno(hora)
        estado = "✓" if resultado == esperado else "✗"
        print(f"{str(hora):<12} {resultado:<10} {estado:<5}")

