"""
Módulo de autenticación - JWT + Hashing de contraseñas

Seguridad:
- Hashing SHA-256 con salt fijo (compatibilidad con BD existente).
  MIGRATION PATH: para upgradeuar a bcrypt, generar nuevo hash en el primer login
  exitoso y reemplazar el almacenado; detectar el formato por longitud/prefijo.
  Ejemplo: if hashed.startswith("$2b$"): usar bcrypt.checkpw(...) else: sha256.
- Rate limiting en memoria (se reinicia con el proceso; usar Redis en producción).
- SECRET_KEY con advertencia si usa valor por defecto.
- Soporte de token refresh mediante `crear_token_refresh`.
"""
import os
import hashlib
import logging
import time
from collections import defaultdict
from threading import Lock
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Header, Query, Depends
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════
# CONFIGURACIÓN
# ═══════════════════════════════════════════

_DEFAULT_SECRET = "sgc-tareo-secret-key-2024-prod-change-me"
SECRET_KEY = os.getenv("SECRET_KEY", _DEFAULT_SECRET)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("TOKEN_EXPIRE_MINUTES", "480"))  # 8 horas
REFRESH_TOKEN_EXPIRE_MINUTES = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 días

if SECRET_KEY == _DEFAULT_SECRET:
    logger.warning(
        "ADVERTENCIA DE SEGURIDAD: SECRET_KEY está usando el valor por defecto. "
        "Define la variable de entorno SECRET_KEY con un valor seguro antes de pasar a producción."
    )


# ═══════════════════════════════════════════
# RATE LIMITING (en memoria)
# ═══════════════════════════════════════════

# Estructura: {identifier: [(timestamp, intentos_fallidos), ...]}
_rate_limit_store: dict = defaultdict(list)
_rate_limit_lock = Lock()

# Configuración de límites
RATE_LIMIT_MAX_INTENTOS = int(os.getenv("RATE_LIMIT_MAX_INTENTOS", "10"))
RATE_LIMIT_VENTANA_SEGUNDOS = int(os.getenv("RATE_LIMIT_VENTANA_SEGUNDOS", "300"))  # 5 minutos


def verificar_rate_limit(identifier: str) -> None:
    """Verifica si el identificador ha superado el límite de intentos fallidos.

    Lanza HTTPException 429 si se superó el límite.
    Llama a `registrar_intento_fallido` después de un login fallido
    y a `limpiar_intentos` después de uno exitoso.

    Args:
        identifier: Clave única (ej. nombre de usuario o IP) para agrupar intentos.

    Raises:
        HTTPException: 429 si se supera el límite de intentos en la ventana de tiempo.
    """
    ahora = time.time()
    ventana_inicio = ahora - RATE_LIMIT_VENTANA_SEGUNDOS

    with _rate_limit_lock:
        # Limpiar intentos fuera de la ventana
        _rate_limit_store[identifier] = [
            ts for ts in _rate_limit_store[identifier] if ts > ventana_inicio
        ]
        intentos_recientes = len(_rate_limit_store[identifier])

    if intentos_recientes >= RATE_LIMIT_MAX_INTENTOS:
        logger.warning(
            "Rate limit alcanzado para '%s': %d intentos en los últimos %ds",
            identifier, intentos_recientes, RATE_LIMIT_VENTANA_SEGUNDOS
        )
        raise HTTPException(
            status_code=429,
            detail=(
                f"Demasiados intentos fallidos. "
                f"Intenta de nuevo en {RATE_LIMIT_VENTANA_SEGUNDOS // 60} minutos."
            )
        )


def registrar_intento_fallido(identifier: str) -> None:
    """Registra un intento de login fallido para el identificador dado.

    Args:
        identifier: Clave única (ej. nombre de usuario o IP).
    """
    with _rate_limit_lock:
        _rate_limit_store[identifier].append(time.time())


def limpiar_intentos(identifier: str) -> None:
    """Elimina el historial de intentos fallidos tras un login exitoso.

    Args:
        identifier: Clave única (ej. nombre de usuario o IP).
    """
    with _rate_limit_lock:
        _rate_limit_store.pop(identifier, None)


# ═══════════════════════════════════════════
# HASHING DE CONTRASEÑAS
# ═══════════════════════════════════════════

# MIGRATION PATH hacia bcrypt:
#   1. Instalar: pip install passlib[bcrypt]
#   2. En verify_password: si hashed_password empieza con "$2b$", usar bcrypt.
#   3. En hash_password o en el login exitoso: re-hashear con bcrypt y guardar.
#   4. Después de que todos los usuarios hayan logueado una vez, retirar SHA-256.

def hash_password(password: str) -> str:
    """Genera hash SHA-256 con salt fijo para compatibilidad con la BD existente.

    NOTE: SHA-256 con salt fijo es débil ante ataques de diccionario.
    Ver comentario MIGRATION PATH en este archivo para actualizar a bcrypt.

    Args:
        password: Contraseña en texto plano.

    Returns:
        Cadena hexadecimal de 64 caracteres (SHA-256).
    """
    salt = "sgc-tareo-salt-2024"
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña contra su hash almacenado.

    Soporta comparación directa (contraseñas en texto plano sin migrar)
    y hashes SHA-256 de 64 caracteres.

    Args:
        plain_password: Contraseña ingresada por el usuario.
        hashed_password: Hash (o texto plano) almacenado en BD.

    Returns:
        True si la contraseña es válida, False en caso contrario.
    """
    # Compatibilidad: si el almacenado no es un hash SHA-256, comparar directo
    if len(hashed_password) != 64:  # SHA-256 siempre produce 64 chars hex
        return plain_password == hashed_password
    return hash_password(plain_password) == hashed_password


# ═══════════════════════════════════════════
# TOKEN JWT
# ═══════════════════════════════════════════

def crear_token(data: dict) -> str:
    """Crea un access token JWT con expiración configurable.

    Args:
        data: Payload a incluir en el token (debe contener 'dni' y 'rol').

    Returns:
        Token JWT firmado como string.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def crear_token_refresh(data: dict) -> str:
    """Crea un refresh token JWT de larga duración (7 días por defecto).

    El refresh token solo debe usarse para obtener un nuevo access token,
    no para autenticar peticiones normales.

    Args:
        data: Payload mínimo (debe contener 'dni').

    Returns:
        Refresh token JWT firmado como string.
    """
    to_encode = {"dni": data.get("dni"), "type": "refresh"}
    expire = datetime.utcnow() + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verificar_token(token: str) -> Optional[dict]:
    """Verifica y decodifica un JWT (access o refresh).

    Args:
        token: Token JWT como string.

    Returns:
        Payload decodificado si el token es válido, None si no lo es.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ═══════════════════════════════════════════
# UTILIDADES DE ROL
# ═══════════════════════════════════════════

def es_rol(usuario_rol: str, rol_esperado: str) -> bool:
    """Compara el rol del usuario con uno esperado, ignorando mayúsculas/minúsculas.

    Args:
        usuario_rol: Rol del usuario autenticado.
        rol_esperado: Rol contra el que se compara.

    Returns:
        True si los roles coinciden (case-insensitive).
    """
    if not usuario_rol or not rol_esperado:
        return False
    return usuario_rol.lower() == rol_esperado.lower()


def es_rol_en(usuario_rol: str, roles_esperados: list) -> bool:
    """Verifica si el rol del usuario está dentro de una lista de roles permitidos.

    Args:
        usuario_rol: Rol del usuario autenticado.
        roles_esperados: Lista de roles permitidos.

    Returns:
        True si el rol del usuario está en la lista (case-insensitive).
    """
    if not usuario_rol:
        return False
    return usuario_rol.lower() in [r.lower() for r in roles_esperados]


# ═══════════════════════════════════════════
# DEPENDENCY - USUARIO ACTUAL
# ═══════════════════════════════════════════

def obtener_usuario_actual(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """FastAPI dependency: extrae y valida el usuario del token JWT.

    Orden de búsqueda del token:
      1. Header 'Authorization: Bearer <token>'
      2. Query param '?token=<token>'

    Args:
        authorization: Valor del header Authorization.
        token: Token enviado como query param (fallback).
        db: Sesión de base de datos inyectada por FastAPI.

    Returns:
        Instancia del modelo Usuario autenticado y activo.

    Raises:
        HTTPException 401: Token ausente, inválido o expirado.
        HTTPException 403: Usuario inactivo.
        HTTPException 404: DNI del token no corresponde a ningún usuario.
    """
    from models import Usuario

    token_final = None

    # 1. Header Authorization: Bearer {token}
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token_final = parts[1]
        else:
            token_final = authorization

    # 2. Query param fallback
    if not token_final and token:
        token_final = token

    if not token_final:
        raise HTTPException(status_code=401, detail="Token de autenticación requerido")

    payload = verificar_token(token_final)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    # Rechazar refresh tokens usados como access tokens
    if payload.get("type") == "refresh":
        raise HTTPException(status_code=401, detail="Token de refresco no válido para autenticación")

    dni = payload.get("dni")
    if not dni:
        raise HTTPException(status_code=401, detail="Token malformado: falta DNI")

    usuario = db.query(Usuario).filter(Usuario.dni == dni).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if usuario.estado == "inactivo":
        raise HTTPException(status_code=403, detail="Usuario inactivo. Contacta a RH.")

    return usuario
