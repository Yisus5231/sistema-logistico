"""
Script URGENTE para actualizar roles de usuarios
Ejecutar desde la carpeta backend:
    python actualizar_roles.py
"""

from database import SessionLocal
from models import Usuario

def actualizar_roles():
    db = SessionLocal()

    print("🔍 Buscando usuarios que necesitan actualización de rol...\n")

    # Definir mapeo: DNI → Rol correcto
    # Agregar aquí todos los usuarios que necesitan cambio de rol
    mapeo_roles = {
        # Supervisores
        "73670561": "supervisor",  # ABAD BALLESTEROS SAMUEL ARMANDO (de la captura)
        # Agregar más supervisores aquí si existen

        # Líderes
        # Agregar líderes aquí

        # Coordinadores
        # Agregar coordinadores aquí
    }

    actualizados = 0

    for dni, rol_correcto in mapeo_roles.items():
        usuario = db.query(Usuario).filter(Usuario.dni == dni).first()

        if usuario:
            rol_anterior = usuario.rol
            if rol_anterior != rol_correcto:
                usuario.rol = rol_correcto
                db.commit()
                print(f"✅ DNI {dni}: {usuario.nombre}")
                print(f"   Rol anterior: {rol_anterior} → Rol nuevo: {rol_correcto}\n")
                actualizados += 1
            else:
                print(f"⚠️  DNI {dni}: Ya tiene rol correcto ({rol_correcto})\n")
        else:
            print(f"❌ DNI {dni}: Usuario NO encontrado en BD\n")

    print("="*60)
    print(f"✅ {actualizados} usuarios actualizados")
    print("="*60)

    # Mostrar todos los usuarios
    print("\n📋 USUARIOS EN BD DESPUÉS DE LA ACTUALIZACIÓN:\n")
    usuarios = db.query(Usuario).all()
    for u in usuarios:
        print(f"  {u.usuario:20} | {u.nombre:30} | Rol: {u.rol:12} | Área: {u.area}")

    db.close()

if __name__ == "__main__":
    actualizar_roles()
