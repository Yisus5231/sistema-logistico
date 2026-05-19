"""
Script para verificar y crear/actualizar usuario admin
"""
from database import engine, SessionLocal
from models import Base, Usuario
from datetime import date

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    # Eliminar admin anterior si existe
    admin_anterior = db.query(Usuario).filter(Usuario.usuario == "admin").first()
    if admin_anterior:
        print(f"❌ Eliminando usuario admin anterior...")
        db.delete(admin_anterior)
        db.commit()

    # Crear nuevo admin
    admin = Usuario(
        dni="00000000",
        nombre="Administrador GDH",
        usuario="admin",
        password="admin123",
        rol="gdh",
        area="GDH",
        cargo="Administrador",
        estado="activo",
        primer_acceso=False,
        fecha_ingreso=date.today(),
        fecha_cumpleanos=date(2000, 1, 1),
    )
    db.add(admin)
    db.commit()
    print("✅ Usuario ADMIN creado correctamente")
    print(f"   Usuario: admin")
    print(f"   Password: admin123")
    print(f"   Rol: gdh")

    # Crear auxiliar de prueba
    auxiliar = Usuario(
        dni="12345678",
        nombre="Usuario Auxiliar Test",
        usuario="12345678",
        password="adecco2026",
        rol="auxiliar",
        area="Logistica",
        cargo="Auxiliar Logístico",
        estado="activo",
        primer_acceso=True,
        fecha_ingreso=date.today(),
        fecha_cumpleanos=date(1990, 5, 15),
    )
    db.add(auxiliar)
    db.commit()
    print("\n✅ Usuario AUXILIAR creado correctamente")
    print(f"   Usuario: 12345678")
    print(f"   Password: adecco2026")
    print(f"   Rol: auxiliar")

    # Verificar que existen
    print("\n📋 Verificando usuarios en BD:")
    usuarios = db.query(Usuario).all()
    for u in usuarios:
        print(f"   - {u.usuario} ({u.rol}) - Estado: {u.estado}")

finally:
    db.close()
