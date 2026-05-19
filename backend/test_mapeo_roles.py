"""
Script de prueba para verificar el mapeo de cargo → rol
Ejecutar desde la carpeta backend:
    python test_mapeo_roles.py
"""

from sync_excel import obtener_rol_por_cargo

def test_mapeo():
    """Prueba el mapeo de cargos a roles"""

    print("\n" + "="*70)
    print("🧪 TEST: MAPEO DE CARGO → ROL")
    print("="*70)
    print("ROLES VÁLIDOS: Supervisor, Lider, Auxiliar, Coordinador, gdh\n")

    # Casos de prueba
    casos_prueba = [
        # SUPERVISORES
        ("Supervisor", "Supervisor"),
        ("Supervisor de Almacén", "Supervisor"),
        ("Supervisor - Recepción Importados", "Supervisor"),
        ("Supervisor de Turno", "Supervisor"),

        # LÍDERES
        ("Lider", "Lider"),
        ("Líder de Almacén", "Lider"),
        ("Líder de Proyecto", "Lider"),
        ("Leader", "Lider"),
        ("Líder de Equipo", "Lider"),

        # COORDINADORES
        ("Coordinador", "Coordinador"),
        ("Coordinador de Logística", "Coordinador"),
        ("Coordinator", "Coordinador"),
        ("Coordinador de Operaciones", "Coordinador"),

        # AUXILIARES (Default para cualquier otro)
        ("Auxiliar", "Auxiliar"),
        ("Auxiliar Logístico", "Auxiliar"),
        ("Operario", "Auxiliar"),
        ("Operador de Grúa", "Auxiliar"),
        ("Vendedor", "Auxiliar"),
        ("Ejecutivo de Ventas", "Auxiliar"),
        ("Apilador", "Auxiliar"),
        ("Ayudante", "Auxiliar"),
        ("Técnico de Sistemas", "Auxiliar"),
        ("Asistente de Oficina", "Auxiliar"),

        # CASOS EDGE
        ("", "Auxiliar"),  # Cargo vacío → default
        ("Unknown Job", "Auxiliar"),  # Cargo no mapeado → default
        ("Gerente", "Auxiliar"),  # No coincide → default
    ]

    total = len(casos_prueba)
    pasados = 0
    fallidos = 0

    for cargo, rol_esperado in casos_prueba:
        rol_obtenido = obtener_rol_por_cargo(cargo)
        estado = "✅" if rol_obtenido == rol_esperado else "❌"

        if rol_obtenido == rol_esperado:
            pasados += 1
        else:
            fallidos += 1

        print(f"{estado} Cargo: '{cargo}'")
        print(f"   Esperado: {rol_esperado} | Obtenido: {rol_obtenido}")

        if rol_obtenido != rol_esperado:
            print(f"   ⚠️  MISMATCH")

        print()

    print("="*70)
    print(f"📊 RESULTADOS: {pasados}/{total} pasados, {fallidos}/{total} fallidos")
    print("="*70)

    if fallidos == 0:
        print("\n✅ ¡TODOS LOS TESTS PASARON!\n")
    else:
        print(f"\n❌ {fallidos} tests fallaron\n")

    return fallidos == 0

if __name__ == "__main__":
    test_mapeo()
