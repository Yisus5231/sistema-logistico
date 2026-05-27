"""
REGLAS DE TURNOS v3 - Con lógica de salida para diferenciar M vs T

REGLA ESPECIAL PARA MAÑANA:
  Si entrada entre 12:00-15:00 Y salida >= 16:00
  → Es M (Mañana) - turno extendido
  → No es T (Tarde) - porque se queda trabajando hasta tarde

TURNOS:
  M (Mañana):   05:00:00 - 13:00:00  (entrada)
  T (Tarde):    12:00:00 - 15:00:00  (entrada Y salida antes de 16:00)
  N (Noche):    18:00:00 - 23:00:00  (entrada)
  F (Falta):    Sin entrada o no coincide
"""

from datetime import datetime, time

TURNOS_ORDENADOS = [
    ("T", {"nombre": "Tarde", "desde": time(12, 0, 0), "hasta": time(15, 0, 0)}),
    ("N", {"nombre": "Noche", "desde": time(18, 0, 0), "hasta": time(23, 0, 0)}),
    ("M", {"nombre": "Mañana", "desde": time(5, 0, 0), "hasta": time(13, 0, 0)}),
]


def determinar_turno(hora_entrada: str, hora_salida: str = None) -> str:
    """
    Determina el código de turno basado en entrada y salida.
    
    REGLA ESPECIAL:
    Si entrada 12:00-15:00 Y salida >= 16:00 → M (no T)
    
    Args:
        hora_entrada: String HH:MM:SS o None
        hora_salida:  String HH:MM:SS o None (opcional)
    
    Returns:
        "M" (Mañana) | "T" (Tarde) | "N" (Noche) | "F" (Falta)
    
    Ejemplos:
        determinar_turno("06:30:00", "13:30:00") → "M"
        determinar_turno("12:00:00", "14:00:00") → "T"  (Sale antes de 16:00)
        determinar_turno("12:30:00", "16:30:00") → "M"  (Sale a las 16:30 - regla especial)
        determinar_turno("20:00:00", None)       → "N"
        determinar_turno(None, None)            → "F"
    """
    
    # Si no hay hora de entrada, es FALTA
    if not hora_entrada or hora_entrada.strip() == "":
        return "F"
    
    try:
        # Convertir string entrada
        if isinstance(hora_entrada, str):
            hora_entrada_obj = datetime.strptime(hora_entrada.strip(), "%H:%M:%S").time()
        else:
            return "F"
        
        # Convertir string salida (si existe)
        hora_salida_obj = None
        if hora_salida and hora_salida.strip():
            try:
                hora_salida_obj = datetime.strptime(hora_salida.strip(), "%H:%M:%S").time()
            except (ValueError, AttributeError):
                pass  # Si salida es inválida, ignorar y evaluar solo entrada
        
        # ===== REGLA ESPECIAL: Entrada en rango T + Salida >= 16:00 = M =====
        rango_t_desde = time(12, 0, 0)
        rango_t_hasta = time(15, 0, 0)
        limite_salida_m = time(16, 0, 0)  # 4 PM
        
        if (rango_t_desde <= hora_entrada_obj <= rango_t_hasta and 
            hora_salida_obj and 
            hora_salida_obj >= limite_salida_m):
            # Entrada en T pero sale tarde → Es M (turno extendido)
            return "M"
        
        # ===== EVALUACIÓN NORMAL EN ORDEN DE PRIORIDAD =====
        for codigo, turno in TURNOS_ORDENADOS:
            desde = turno["desde"]
            hasta = turno["hasta"]
            
            if desde <= hora_entrada_obj <= hasta:
                return codigo
        
        return "F"
    
    except (ValueError, AttributeError):
        return "F"


def procesar_registros_tareo(registros: list) -> list:
    """
    Procesa registros de Excel y asigna automáticamente el turno.
    
    Considera AMBAS columnas: entrada (primera) y salida (última)
    
    Args:
        registros: Lista de dicts con: dni, nombre, fecha, primera, ultima, etc.
    
    Returns:
        Mismos registros con campo 'asistencia' agregado
    """
    for registro in registros:
        hora_entrada = registro.get("primera") or registro.get("hora_entrada") or ""
        hora_salida = registro.get("ultima") or registro.get("hora_salida") or None
        
        asistencia = determinar_turno(hora_entrada, hora_salida)
        registro["asistencia"] = asistencia
    
    return registros


if __name__ == "__main__":
    print("="*70)
    print("REGLAS DE TURNOS v3 - CON LÓGICA DE SALIDA")
    print("="*70)
    print("\n⚠️  REGLA ESPECIAL PARA MAÑANA:")
    print("   Si entrada 12:00-15:00 Y salida >= 16:00 → M (turno extendido)")
    print("="*70)
    
    print("\n✅ CASOS DE PRUEBA:\n")
    print(f"{'Entrada':<12} {'Salida':<12} {'Resultado':<10} {'Descripción':<40}")
    print("─" * 80)
    
    casos = [
        ("05:00:00", "13:30:00", "M", "M puro, termina normal"),
        ("06:30:00", "14:00:00", "M", "M puro, termina dentro"),
        ("12:00:00", "14:00:00", "T", "T puro, sale antes de 16:00"),
        ("12:30:00", "15:00:00", "T", "T puro, sale a las 3 PM"),
        ("12:00:00", "16:00:00", "M", "⚠️ REGLA ESPECIAL: Sale a las 4 PM"),
        ("12:30:00", "16:30:00", "M", "⚠️ REGLA ESPECIAL: Sale después 4 PM"),
        ("13:00:00", "17:00:00", "M", "⚠️ REGLA ESPECIAL: Sale 5 PM"),
        ("13:00:00", "15:59:00", "T", "Entra tarde pero sale antes 16:00"),
        ("18:00:00", "23:00:00", "N", "N puro"),
        ("20:00:00", "23:30:00", "N", "N puro, sale después"),
        ("04:59:59", "13:00:00", "F", "Entrada fuera de rango"),
        ("16:00:00", "20:00:00", "F", "Entre rangos"),
        (None, None, "F", "Sin entrada"),
        ("12:00:00", None, "T", "Entrada T, sin salida registrada"),
    ]
    
    for entrada, salida, esperado, desc in casos:
        resultado = determinar_turno(entrada, salida)
        estado = "✓" if resultado == esperado else "✗"
        marca = "⚠️" if "ESPECIAL" in desc else ""
        print(f"{marca} {estado} {str(entrada):<12} {str(salida):<12} {resultado:<10} {desc:<40}")
    
    print("\n" + "="*70)
    print("LÓGICA DE DECISIÓN:")
    print("="*70)
    print("""
1. Si NO hay entrada → F (Falta)

2. Si entrada 12:00-15:00 (potencial T):
   ├─ Y salida >= 16:00 → M (turno extendido de mañana)
   └─ Y salida < 16:00  → T (tarde normal)

3. Si entrada 18:00-23:00 → N (Noche)

4. Si entrada 05:00-13:00 (y no coincide 12-15 con salida >= 16:00) → M

5. Si no coincide ninguno → F (Falta)
    """)

