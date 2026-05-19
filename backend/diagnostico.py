"""
Script de DIAGNÓSTICO - Ver estado actual de usuarios
Ejecutar desde la carpeta backend:
    python diagnostico.py
"""

from database import SessionLocal
from models import Usuario

def diagnostico():
    db = SessionLocal()

    print("\n" + "="*70)
    print("🔍 DIAGNÓSTICO DE USUARIOS Y ROLES")
    print("="*70 + "\n")

    usuarios = db.query(Usuario).all()

    if not usuarios:
        print("❌ NO HAY USUARIOS EN LA BASE DE DATOS\n")
        print("Ejecutar primero:")
        print("  python crear_usuarios_prueba.py\n")
        db.close()
        return

    print(f"📊 Total de usuarios: {len(usuarios)}\n")
    print("-"*70)
    print(f"{'Usuario':<15} | {'Nombre':<30} | {'Rol':<12} | {'Área':<15}")
    print("-"*70)

    for u in usuarios:
        print(f"{u.usuario:<15} | {u.nombre:<30} | {u.rol:<12} | {u.area:<15}")

    print("-"*70 + "\n")

    # Contar por rol
    print("📈 Distribución por rol:")
    roles_set = set(u.rol for u in usuarios)
    for rol in sorted(roles_set):
        count = len([u for u in usuarios if u.rol == rol])
        print(f"  {rol}: {count} usuario(s)")

    print("\n" + "="*70)
    print("PROBLEMAS IDENTIFICADOS:")
    print("="*70 + "\n")

    problemas = False

    # Problema 1: Revisar si hay usuarios con rol "auxiliar" que deberían ser supervisores
    auxiliares = [u for u in usuarios if u.rol == "auxiliar"]
    if auxiliares:
        print(f"⚠️  {len(auxiliares)} usuario(s) con rol 'auxiliar':")
        for u in auxiliares:
            print(f"   - {u.usuario} ({u.nombre}) - Área: {u.area}")
        print("\n   Si alguno de estos DEBERÍA SER SUPERVISOR, ejecutar:")
        print("   python actualizar_roles.py\n")
        problemas = True

    # Problema 2: Revisar si hay usuario sin rol GDH
    gdh_list = [u for u in usuarios if u.rol == "gdh"]
    if not gdh_list:
        print("❌ NO HAY USUARIO CON ROL 'gdh'\n")
        print("   Necesario ejecutar:")
        print("   python crear_usuarios_prueba.py\n")
        problemas = True

    # Problema 3: Revisar si hay supervisor
    supervisores = [u for u in usuarios if u.rol == "supervisor"]
    if not supervisores:
        print("❌ NO HAY USUARIO CON ROL 'supervisor'\n")
        print("   Necesario ejecutar:")
        print("   python crear_usuarios_prueba.py\n")
        problemas = True

    if not problemas:
        print("✅ TODO ESTÁ CORRECTO\n")

    print("="*70)
    print("\n📝 PRÓXIMOS PASOS:\n")
    print("1. Si falta usuario GDH o Supervisor:")
    print("   python crear_usuarios_prueba.py\n")
    print("2. Si roles están incorrectos:")
    print("   python actualizar_roles.py\n")
    print("3. Luego en el navegador:")
    print("   - Presiona F12")
    print("   - Ve a Console")
    print("   - Ejecuta: localStorage.clear()")
    print("   - Presiona Ctrl+Shift+R (hard refresh)\n")

    db.close()

if __name__ == "__main__":
    diagnostico()
