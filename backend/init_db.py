"""
Inicializa la base de datos y crea el usuario GDH por defecto
"""
from database import engine, SessionLocal
from models import Base, Usuario
from datetime import date


def init():
    # Crear todas las tablas
    Base.metadata.create_all(bind=engine)
    print("Tablas creadas correctamente.")

    # Crear usuario GDH por defecto si no existe
    db = SessionLocal()
    try:
        gdh_user = db.query(Usuario).filter(Usuario.rol == "gdh").first()
        if not gdh_user:
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
            print("Usuario GDH creado: usuario=admin, password=admin123")
        else:
            print("Usuario GDH ya existe.")
    finally:
        db.close()


if __name__ == "__main__":
    init()
