"""
Script para actualizar todos los usuarios con sus roles correctos basado en cargo
NOTA: El usuario "admin" (gdh) nunca se modifica
Ejecutar desde backend:
    python actualizar_supervisores.py
"""

from database import SessionLocal
from models import Usuario, HistorialCambios
from sync_excel import obtener_rol_por_cargo
from datetime import datetime

def actualizar_todos_usuarios():
    db = SessionLocal()

    print("\n" + "="*70)
    print("🔄 ACTUALIZANDO ROLES BASADO EN CARGO...")
    print("="*70)
    print("ROLES VÁLIDOS: Supervisor, Lider, Auxiliar, Coordinador, gdh\n")

    # Obtener todos los usuarios (excepto admin que siempre es gdh)
    usuarios = db.query(Usuario).filter(Usuario.usuario != "admin").all()

    actualizados = 0
    sin_cambios = 0
    sin_cargo = 0

    for usuario in usuarios:
        if not usuario.cargo:
            print(f"⚠️  {usuario.nombre} - Sin cargo definido (mantiene rol: {usuario.rol})")
            sin_cargo += 1
            continue

        # Calcular rol correcto basado en cargo
        rol_correcto = obtener_rol_por_cargo(usuario.cargo)

        if usuario.rol != rol_correcto:
            print(f"✅ {usuario.nombre}")
            print(f"   Cargo: {usuario.cargo}")
            print(f"   Rol: {usuario.rol} → {rol_correcto}\n")

            # Registrar cambio en historial
            cambio = HistorialCambios(
                usuario_id=usuario.id,
                usuario_que_cambio_id=1,  # GDH (admin)
                campo="rol",
                valor_anterior=usuario.rol,
                valor_nuevo=rol_correcto,
                tipo_cambio="actualizacion_manual",
                descripcion=f"Rol actualizado por cargo: {usuario.cargo}"
            )
            db.add(cambio)

            # Actualizar rol
            usuario.rol = rol_correcto
            usuario.fecha_ultima_modificacion = datetime.utcnow()

            actualizados += 1
        else:
            sin_cambios += 1

    # Guardar cambios
    db.commit()

    print("="*70)
    print(f"✅ {actualizados} usuarios actualizados")
    print(f"⚠️  {sin_cambios} usuarios sin cambios (rol ya correcto)")
    print(f"❌ {sin_cargo} usuarios sin cargo definido")
    print("="*70 + "\n")

    # Mostrar resultado final
    print("📋 TODOS LOS USUARIOS:\n")
    todos_usuarios = db.query(Usuario).all()
    for u in todos_usuarios:
        print(f"  {u.nombre:35} | {u.cargo:25} | Rol: {u.rol:15}")

    db.close()

if __name__ == "__main__":
    actualizar_todos_usuarios()
