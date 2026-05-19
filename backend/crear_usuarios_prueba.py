"""
Script para crear usuarios de prueba en la BD
Ejecutar desde la carpeta backend:
    python crear_usuarios_prueba.py
"""

from database import SessionLocal
from models import Usuario
from datetime import date

def crear_usuarios():
    db = SessionLocal()

    try:
        # Limpiar usuarios existentes (opcional)
        db.query(Usuario).filter(Usuario.usuario.in_(["admin", "supervisor1", "lider1", "auxiliar1"])).delete()
        db.commit()
        print("✓ Usuarios previos eliminados")
    except:
        pass

    # Crear GDH
    gdh = Usuario(
        dni="99999999",
        usuario="admin",
        password="admin123",
        nombre="Admin GDH",
        cargo="Gerente RH",
        area="RH",
        rol="gdh",
        estado="activo",
        fecha_ingreso=date(2023, 1, 1),
        fecha_cumpleanos=date(1990, 1, 15)
    )
    db.add(gdh)
    print("✓ GDH creado: admin / admin123")

    # Crear Supervisor
    supervisor = Usuario(
        dni="88888888",
        usuario="supervisor1",
        password="sup123",
        nombre="Supervisor Almacén",
        cargo="Supervisor",
        area="Almacén",
        rol="supervisor",
        estado="activo",
        fecha_ingreso=date(2022, 6, 1),
        fecha_cumpleanos=date(1992, 3, 20)
    )
    db.add(supervisor)
    print("✓ Supervisor creado: supervisor1 / sup123 (Área: Almacén)")

    # Crear Líder
    lider = Usuario(
        dni="77777777",
        usuario="lider1",
        password="lider123",
        nombre="Líder Ventas",
        cargo="Líder",
        area="Ventas",
        rol="lider",
        estado="activo",
        fecha_ingreso=date(2022, 6, 1),
        fecha_cumpleanos=date(1993, 5, 10)
    )
    db.add(lider)
    print("✓ Líder creado: lider1 / lider123 (Área: Ventas)")

    # Crear Coordinador
    coordinador = Usuario(
        dni="66666666",
        usuario="coordinador1",
        password="coord123",
        nombre="Coordinador Logística",
        cargo="Coordinador",
        area="Logística",
        rol="coordinador",
        estado="activo",
        fecha_ingreso=date(2023, 1, 1),
        fecha_cumpleanos=date(1994, 7, 25)
    )
    db.add(coordinador)
    print("✓ Coordinador creado: coordinador1 / coord123 (Área: Logística)")

    # Crear Auxiliar
    auxiliar = Usuario(
        dni="55555555",
        usuario="auxiliar1",
        password="aux123",
        nombre="Auxiliar Almacén",
        cargo="Auxiliar Logístico",
        area="Almacén",
        rol="auxiliar",
        estado="activo",
        fecha_ingreso=date(2023, 3, 15),
        fecha_cumpleanos=date(2000, 9, 5)
    )
    db.add(auxiliar)
    print("✓ Auxiliar creado: auxiliar1 / aux123 (Área: Almacén)")

    # Crear más personal para pruebas
    personal = [
        Usuario(
            dni="11111111",
            usuario="juan.perez",
            password="pass123",
            nombre="Juan Pérez García",
            cargo="Operario",
            area="Almacén",
            rol="auxiliar",
            estado="activo",
            fecha_ingreso=date(2022, 1, 10),
            fecha_cumpleanos=date(1995, 2, 14)
        ),
        Usuario(
            dni="22222222",
            usuario="maria.silva",
            password="pass123",
            nombre="María Silva López",
            cargo="Auxiliar de Oficina",
            area="Almacén",
            rol="auxiliar",
            estado="activo",
            fecha_ingreso=date(2022, 5, 20),
            fecha_cumpleanos=date(1998, 6, 30)
        ),
        Usuario(
            dni="33333333",
            usuario="carlos.ramos",
            password="pass123",
            nombre="Carlos Ramos Díaz",
            cargo="Vendedor",
            area="Ventas",
            rol="auxiliar",
            estado="activo",
            fecha_ingreso=date(2023, 2, 1),
            fecha_cumpleanos=date(1997, 8, 12)
        ),
        Usuario(
            dni="44444444",
            usuario="ana.torres",
            password="pass123",
            nombre="Ana Torres Gómez",
            cargo="Ejecutiva de Ventas",
            area="Ventas",
            rol="auxiliar",
            estado="activo",
            fecha_ingreso=date(2023, 1, 15),
            fecha_cumpleanos=date(1996, 4, 22)
        ),
    ]

    for p in personal:
        db.add(p)
    db.commit()
    print(f"✓ {len(personal)} usuarios adicionales creados")

    print("\n" + "="*60)
    print("✅ USUARIOS CREADOS EXITOSAMENTE")
    print("="*60)
    print("\n📋 USUARIOS DE PRUEBA:\n")
    print("GDH:")
    print("  usuario: admin")
    print("  contraseña: admin123")
    print("  rol: gdh\n")

    print("Supervisor:")
    print("  usuario: supervisor1")
    print("  contraseña: sup123")
    print("  rol: supervisor (Almacén)\n")

    print("Líder:")
    print("  usuario: lider1")
    print("  contraseña: lider123")
    print("  rol: lider (Ventas)\n")

    print("Coordinador:")
    print("  usuario: coordinador1")
    print("  contraseña: coord123")
    print("  rol: coordinador (Logística)\n")

    print("Auxiliar:")
    print("  usuario: auxiliar1")
    print("  contraseña: aux123")
    print("  rol: auxiliar (Almacén)\n")

    print("="*60)
    db.close()

if __name__ == "__main__":
    crear_usuarios()
