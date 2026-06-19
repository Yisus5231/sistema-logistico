"""
Sistema de GestiÃ³n de Colaboradores + Anuncios + Tareo
Backend - FastAPI v3.1
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, date, timedelta
import os
import tempfile
import base64
import binascii
import unicodedata
from uuid import uuid4

from database import SessionLocal, engine, get_db
from models import (Base, Usuario, HistorialCambios, SincronizacionExcel,
                    Anuncio, Reaccion, Notificacion, Tareo, ComentarioAuxiliar,
                    Observacion, MensajeObservacion, ArchivoObservacion)
from sync_excel import SincronizadorExcel, calcular_vacaciones_acumuladas
from auth import (
    crear_token, crear_token_refresh, verificar_token, verify_password, hash_password,
    es_rol, es_rol_en, obtener_usuario_actual,
    verificar_rate_limit, registrar_intento_fallido, limpiar_intentos
)
from observaciones_endpoints import router as observaciones_router
from reglas_turnos import determinar_turno

# Crear tablas
Base.metadata.create_all(bind=engine)


def asegurar_columnas_tareo():
    inspector = inspect(engine)
    if "tareo" not in inspector.get_table_names():
        return

    columnas = {col["name"] for col in inspector.get_columns("tareo")}
    nuevas_columnas = {
        "primera_marcacion": "VARCHAR(20)",
        "ultima_marcacion": "VARCHAR(20)",
        "marcaciones_detalle": "TEXT",
        "asistencia_incompleta": "BOOLEAN DEFAULT 0",
    }

    with engine.begin() as conn:
        for nombre, tipo in nuevas_columnas.items():
            if nombre not in columnas:
                conn.execute(text(f"ALTER TABLE tareo ADD COLUMN {nombre} {tipo}"))


asegurar_columnas_tareo()
# Auto-seed usuarios si no existen
from database import SessionLocal as _SessionLocal
from models import Usuario as _Usuario
def _auto_seed():
    db = _SessionLocal()
    if db.query(_Usuario).count() == 0:
        from crear_usuarios_prueba import crear_usuarios
        crear_usuarios()
    db.close()
_auto_seed()
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# APP
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
app = FastAPI(
    title="Sistema de GestiÃ³n de Colaboradores",
    description="GestiÃ³n integral de colaboradores - Tareo, Anuncios, Observaciones",
    version="3.1"
)

# CORS - configurar segÃºn entorno
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir archivos estÃ¡ticos (uploads)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Routers
app.include_router(observaciones_router)


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# MODELOS PYDANTIC
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

class LoginRequest(BaseModel):
    usuario: str
    password: str

    @field_validator("usuario", "password")
    @classmethod
    def not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Campo requerido")
        return v.strip()


class CambiarPasswordRequest(BaseModel):
    password_actual: str
    password_nuevo: str

    @field_validator("password_nuevo")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("La contraseÃ±a debe tener al menos 6 caracteres")
        return v


class ActualizarPerfilRequest(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None


class ActualizarColaboradorRequest(BaseModel):
    nombre: Optional[str] = None
    cargo: Optional[str] = None
    area: Optional[str] = None
    rol: Optional[str] = None
    estado: Optional[str] = None
    vacaciones_pendientes: Optional[float] = None
    fecha_cumpleanos: Optional[date] = None
    password: Optional[str] = None

    @field_validator("nombre", "cargo", "area", "rol", "estado", "password")
    @classmethod
    def strip_text(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("rol")
    @classmethod
    def rol_valido(cls, v):
        if v is None:
            return v
        roles = {"gdh", "supervisor", "auxiliar", "lider", "coordinador"}
        if v.lower() not in roles:
            raise ValueError("Rol no valido")
        return "gdh" if v.lower() == "gdh" else v.capitalize()

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v):
        if v is None:
            return v
        if v.lower() not in {"activo", "inactivo"}:
            raise ValueError("Estado no valido")
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_valida(cls, v):
        if v is not None and v and len(v) < 6:
            raise ValueError("La contrasena debe tener al menos 6 caracteres")
        return v


class AnuncioRequest(BaseModel):
    contenido: str
    imagen_base64: Optional[str] = None
    video_base64: Optional[str] = None

    @field_validator("contenido")
    @classmethod
    def not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("El contenido es requerido")
        return v.strip()


class ActualizarTareoRequest(BaseModel):
    """Payload para actualizar un registro de tareo."""
    comentario_gdh: Optional[str] = None


class ComentarioTareoRequest(BaseModel):
    """Payload para que un Auxiliar envÃ­e un comentario sobre su asistencia."""
    fecha: str
    comentario: str

    @field_validator("comentario")
    @classmethod
    def not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("El comentario no puede estar vacÃ­o")
        return v.strip()

    @field_validator("fecha")
    @classmethod
    def fecha_valida(cls, v):
        if not v or not v.strip():
            raise ValueError("La fecha es requerida")
        return v.strip()


MAX_MEDIA_BYTES = 8 * 1024 * 1024


def guardar_media_base64(raw_base64: str, kind: str) -> str:
    _, _, payload = raw_base64.partition(",")
    payload = payload or raw_base64

    try:
        content = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=422, detail="Archivo base64 invalido")

    if len(content) > MAX_MEDIA_BYTES:
        raise HTTPException(status_code=413, detail="Archivo demasiado grande")

    if kind == "image":
        if content.startswith(b"\xff\xd8\xff"):
            ext = "jpg"
        elif content.startswith(b"\x89PNG\r\n\x1a\n"):
            ext = "png"
        elif content.startswith(b"RIFF"):
            ext = "webp"
        else:
            raise HTTPException(status_code=422, detail="Formato de imagen no permitido")
    elif kind == "video":
        if b"ftyp" not in content[:24]:
            raise HTTPException(status_code=422, detail="Formato de video no permitido")
        ext = "mp4"
    else:
        raise HTTPException(status_code=422, detail="Tipo de archivo no permitido")

    filename = f"anuncio_{kind}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid4().hex[:10]}.{ext}"
    filepath = os.path.join("uploads", filename)
    with open(filepath, "wb") as f:
        f.write(content)
    return f"/uploads/{filename}"


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# ENDPOINTS - AUTENTICACIÃ“N
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Login con usuario y contraseÃ±a.

    Aplica rate limiting por nombre de usuario para limitar ataques de fuerza bruta.
    Devuelve un access token (corta duraciÃ³n) y un refresh token (larga duraciÃ³n).
    """
    # Verificar rate limit antes de consultar la BD
    verificar_rate_limit(data.usuario)

    usuario = db.query(Usuario).filter(
        Usuario.usuario == data.usuario
    ).first()

    if not usuario or not verify_password(data.password, usuario.password):
        registrar_intento_fallido(data.usuario)
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    if usuario.estado == "inactivo":
        raise HTTPException(status_code=403, detail="Usuario inactivo. Contacta a RH.")

    # Login exitoso: limpiar contador de intentos fallidos
    limpiar_intentos(data.usuario)

    token_data = {"dni": usuario.dni, "rol": usuario.rol}
    token = crear_token(token_data)
    refresh_token = crear_token_refresh(token_data)

    return {
        "token": token,
        "refresh_token": refresh_token,
        "id": usuario.id,
        "dni": usuario.dni,
        "nombre": usuario.nombre,
        "rol": usuario.rol,
        "area": usuario.area,
        "cargo": usuario.cargo,
        "primer_acceso": usuario.primer_acceso
    }


@app.post("/token/refresh")
def refrescar_token(refresh_token: str, db: Session = Depends(get_db)):
    """Obtiene un nuevo access token usando un refresh token vÃ¡lido."""
    from models import Usuario as UsuarioModel

    payload = verificar_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token invÃ¡lido o expirado")

    dni = payload.get("dni")
    if not dni:
        raise HTTPException(status_code=401, detail="Refresh token malformado")

    usuario = db.query(UsuarioModel).filter(UsuarioModel.dni == dni).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if usuario.estado == "inactivo":
        raise HTTPException(status_code=403, detail="Usuario inactivo. Contacta a RH.")

    new_token = crear_token({"dni": usuario.dni, "rol": usuario.rol})
    return {"token": new_token}


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# ENDPOINTS - SINCRONIZACIÃ“N EXCEL
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.post("/sincronizar-excel")
async def sincronizar_excel(
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Sincroniza datos de usuarios desde Excel (solo GDH)"""
    if not es_rol(usuario.rol, "gdh"):
        raise HTTPException(status_code=403, detail="Solo GDH puede sincronizar Excel")

    tmp_path = None
    try:
        import pandas as pd
        sincronizador = SincronizadorExcel(db)

        contents = await archivo.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx", mode='wb') as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        resultado = sincronizador.sincronizar(tmp_path, usuario.id)

        if resultado.get("exitoso", False):
            return {"stats": sincronizador.stats, "exitoso": True}
        raise HTTPException(
            status_code=422,
            detail=resultado.get("error", "Error desconocido al sincronizar")
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando Excel: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# ENDPOINTS - ANUNCIOS
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.get("/anuncios")
def obtener_anuncios(db: Session = Depends(get_db), usuario: Usuario = Depends(obtener_usuario_actual)):
    """Obtiene anuncios filtrados por rol y Ã¡rea"""
    query = db.query(Anuncio)

    if not es_rol(usuario.rol, "gdh"):
        query = query.filter(
            (Anuncio.area_publicacion.is_(None)) |
            (Anuncio.area_publicacion == "todas") |
            (Anuncio.area_publicacion == usuario.area)
        )

    anuncios = query.order_by(Anuncio.fecha_creacion.desc()).limit(50).all()

    resultado = []
    for anuncio in anuncios:
        reaccion_usuario = db.query(Reaccion).filter(
            Reaccion.anuncio_id == anuncio.id,
            Reaccion.usuario_id == usuario.id
        ).first()

        resultado.append({
            "id": anuncio.id,
            "contenido": anuncio.contenido,
            "imagen_url": anuncio.imagen_url,
            "video_url": anuncio.video_url,
            "autor_nombre": anuncio.autor_nombre,
            "autor_rol": getattr(anuncio, 'autor_rol', 'gdh'),
            "area_publicacion": getattr(anuncio, 'area_publicacion', None),
            "fecha_creacion": anuncio.fecha_creacion,
            "reacciones_count": len(anuncio.reacciones),
            "usuario_reacciono": reaccion_usuario is not None
        })

    return resultado


@app.post("/anuncios")
async def crear_anuncio(
    data: AnuncioRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Crea un nuevo anuncio (GDH para todos, Supervisor para su Ã¡rea)"""
    if not es_rol_en(usuario.rol, ["gdh", "Supervisor"]):
        raise HTTPException(status_code=403, detail="Solo GDH y Supervisores pueden crear anuncios")

    imagen_url = None
    video_url = None

    if data.imagen_base64:
        imagen_url = guardar_media_base64(data.imagen_base64, "image")

    if data.video_base64:
        video_url = guardar_media_base64(data.video_base64, "video")

    area_publicacion = None
    if es_rol(usuario.rol, "Supervisor"):
        area_publicacion = usuario.area

    anuncio = Anuncio(
        contenido=data.contenido,
        imagen_url=imagen_url,
        video_url=video_url,
        autor_id=usuario.id,
        autor_nombre=usuario.nombre,
        autor_rol=usuario.rol,
        area_publicacion=area_publicacion
    )
    db.add(anuncio)
    db.commit()

    # Notificaciones en batch
    if es_rol(usuario.rol, "gdh"):
        otros = db.query(Usuario).filter(
            Usuario.id != usuario.id, Usuario.estado == "activo"
        ).all()
    else:
        otros = db.query(Usuario).filter(
            Usuario.area == usuario.area,
            Usuario.id != usuario.id,
            Usuario.estado == "activo"
        ).all()

    for otro in otros:
        db.add(Notificacion(
            usuario_id=otro.id,
            tipo="nuevo_anuncio",
            anuncio_id=anuncio.id,
            contenido=f"{usuario.nombre} publicÃ³ un nuevo anuncio"
        ))
    db.commit()

    return {"id": anuncio.id, "msg": "Anuncio creado"}


@app.delete("/anuncios/{anuncio_id}")
def eliminar_anuncio(
    anuncio_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Elimina un anuncio (solo GDH o autor)"""
    anuncio = db.query(Anuncio).filter(Anuncio.id == anuncio_id).first()
    if not anuncio:
        raise HTTPException(status_code=404, detail="Anuncio no encontrado")

    if not es_rol(usuario.rol, "gdh") and anuncio.autor_id != usuario.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este anuncio")

    db.delete(anuncio)
    db.commit()
    return {"msg": "Anuncio eliminado"}


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# ENDPOINTS - REACCIONES
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.post("/anuncios/{anuncio_id}/reaccionar")
def reaccionar_anuncio(
    anuncio_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Toggle reacciÃ³n a un anuncio"""
    anuncio = db.query(Anuncio).filter(Anuncio.id == anuncio_id).first()
    if not anuncio:
        raise HTTPException(status_code=404, detail="Anuncio no encontrado")

    existente = db.query(Reaccion).filter(
        Reaccion.anuncio_id == anuncio_id,
        Reaccion.usuario_id == usuario.id
    ).first()

    if existente:
        db.delete(existente)
        db.commit()
        return {"msg": "ReacciÃ³n removida", "activa": False}

    db.add(Reaccion(
        anuncio_id=anuncio_id,
        usuario_id=usuario.id,
        usuario_nombre=usuario.nombre,
        tipo="corazon"
    ))
    db.commit()
    return {"msg": "ReacciÃ³n agregada", "activa": True}


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# ENDPOINTS - NOTIFICACIONES
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.get("/notificaciones")
def obtener_notificaciones(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual),
    leidas: Optional[bool] = None,
    skip: int = Query(default=0, ge=0, description="Registros a omitir (paginaciÃ³n)"),
    limit: int = Query(default=50, ge=1, le=200, description="MÃ¡ximo de notificaciones a devolver"),
):
    """Obtiene las notificaciones del usuario con paginaciÃ³n opcional (skip/limit)."""
    query = db.query(Notificacion).filter(Notificacion.usuario_id == usuario.id)
    if leidas is not None:
        query = query.filter(Notificacion.leida == leidas)
    notificaciones = query.order_by(Notificacion.fecha_creacion.desc()).offset(skip).limit(limit).all()

    resultado = []
    for notif in notificaciones:
        anuncio_preview = None
        anuncio_autor = None
        anuncio_fecha = None
        if notif.anuncio_id:
            anuncio = db.query(Anuncio).filter(Anuncio.id == notif.anuncio_id).first()
            if anuncio:
                anuncio_preview = anuncio.contenido[:180]
                anuncio_autor = anuncio.autor_nombre
                anuncio_fecha = anuncio.fecha_creacion

        resultado.append({
            "id": notif.id,
            "usuario_id": notif.usuario_id,
            "tipo": notif.tipo,
            "anuncio_id": notif.anuncio_id,
            "contenido": notif.contenido,
            "leida": notif.leida,
            "fecha_creacion": notif.fecha_creacion,
            "anuncio_preview": anuncio_preview,
            "anuncio_autor": anuncio_autor,
            "anuncio_fecha": anuncio_fecha,
        })

    return resultado


@app.put("/notificaciones/{notificacion_id}/leer")
def marcar_notificacion_leida(
    notificacion_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Marca una notificaciÃ³n como leÃ­da"""
    notif = db.query(Notificacion).filter(
        Notificacion.id == notificacion_id,
        Notificacion.usuario_id == usuario.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="NotificaciÃ³n no encontrada")

    notif.leida = True
    db.commit()
    return {"msg": "NotificaciÃ³n marcada como leÃ­da"}


@app.put("/notificaciones/leer-todas")
def marcar_todas_leidas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Marca todas las notificaciones como leÃ­das"""
    db.query(Notificacion).filter(
        Notificacion.usuario_id == usuario.id,
        Notificacion.leida == False
    ).update({"leida": True})
    db.commit()
    return {"msg": "Todas las notificaciones marcadas como leÃ­das"}


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# ENDPOINTS - TAREO (ASISTENCIA)
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

def normalizar_dni(valor) -> Optional[str]:
    if valor is None:
        return None
    texto = str(valor).strip()
    if not texto or texto.lower() == "nan":
        return None
    if texto.endswith(".0"):
        texto = texto[:-2]
    solo_digitos = "".join(ch for ch in texto if ch.isdigit())
    return solo_digitos or texto


def parsear_hora_marcacion(valor) -> Optional[str]:
    if valor is None:
        return None
    texto = str(valor).strip()
    if not texto or texto.lower() == "nan":
        return None
    if hasattr(valor, "strftime"):
        try:
            return valor.strftime("%H:%M")
        except Exception:
            pass
    if " " in texto and ":" in texto:
        texto = texto.split()[-1]
    partes = texto.split(":")
    if len(partes) >= 2:
        return f"{partes[0].zfill(2)}:{partes[1].zfill(2)}"
    return texto


def combinar_comentario_marcacion(comentario: str, incompleta: bool) -> str:
    partes = []
    if comentario:
        partes.append(comentario)
    if incompleta:
        partes.append("Asistencia con marcacion incompleta: falta ultima marcacion")
    return " | ".join(partes)


def normalizar_nombre_columna(valor) -> str:
    texto = str(valor or "").strip().lower()
    texto = "".join(
        char for char in unicodedata.normalize("NFKD", texto)
        if not unicodedata.combining(char)
    )
    return " ".join(texto.split())


@app.post("/tareo/subir-excel")
async def subir_tareo_excel(
    archivo: UploadFile = File(...),
    fecha_inicio: Optional[str] = Form(None),
    fecha_fin: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Carga tareo desde Excel (solo GDH)"""
    if not es_rol(usuario.rol, "gdh"):
        raise HTTPException(status_code=403, detail="Solo GDH puede subir tareo")

    tmp_path = None
    try:
        import pandas as pd

        contents = await archivo.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx", mode='wb') as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        excel_file = pd.ExcelFile(tmp_path, engine='openpyxl')
        sheet_names = excel_file.sheet_names

        creados = 0
        actualizados = 0
        incompletos = 0
        omitidos_fuera_rango = 0
        errores = []
        rango_inicio = pd.to_datetime(fecha_inicio).date() if fecha_inicio else None
        rango_fin = pd.to_datetime(fecha_fin).date() if fecha_fin else None

        if rango_inicio and rango_fin and rango_inicio > rango_fin:
            return {"error": "La fecha desde no puede ser mayor que la fecha hasta", "exitoso": False}

        if "Datos" in sheet_names and "Asistencia Total" in sheet_names:
            creados, actualizados, errores = procesar_tareo_transpuesto(tmp_path, db, excel_file)
        else:
            # Buscar la fila de encabezados dinÃ¡micamente
            df_raw = pd.read_excel(tmp_path, sheet_name=0, engine='openpyxl', header=None)
            header_row = 0
            
            # Buscar la fila que contenga la mayorÃ­a de palabras clave
            keywords = ['empleado', 'identificaciÃ³n', 'primera', 'Ãºltima', 'fecha', 'dni']
            best_row = 0
            best_count = 0
            
            for idx, row in df_raw.iterrows():
                if idx > 20:  # No buscar mÃ¡s allÃ¡ de fila 20
                    break
                row_str = ' '.join(str(v) for v in row if pd.notna(v)).lower()
                keyword_count = sum(1 for kw in keywords if kw in row_str)
                
                if keyword_count > best_count:
                    best_count = keyword_count
                    best_row = idx
            
            header_row = best_row
            df = pd.read_excel(tmp_path, sheet_name=0, engine='openpyxl', header=header_row)
            df.columns = [str(col).strip() for col in df.columns]

            def find_column(df_cols, names):
                col_lower = {normalizar_nombre_columna(col): col for col in df_cols}
                for name in names:
                    normalized = normalizar_nombre_columna(name)
                    if normalized in col_lower:
                        return col_lower[normalized]
                return None

            dni_col = find_column(df.columns, ["DNI", "Cedula", "Documento", "Identificacion"])
            fecha_col = find_column(df.columns, ["Fecha", "Date"])
            asistencia_col = find_column(df.columns, ["Asistencia", "Tipo", "Status", "Turno"])
            primera_col = find_column(df.columns, ["Primera", "Primera Marcacion", "Hora Entrada", "Entrada"])
            ultima_col = find_column(df.columns, ["Ultima", "Ultima Marcacion", "Hora Salida", "Salida"])
            observacion_col = find_column(df.columns, ["Observaciones", "Comentario", "Notas"])

            # Validar que tengamos datos mÃ­nimos
            if not dni_col or not fecha_col:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Columnas requeridas no encontradas. Se necesita: DNI, Fecha. "
                        f"Columnas encontradas: {list(df.columns)}"
                    )
                )

            # Determinar si vamos a calcular la asistencia automÃ¡ticamente
            calcular_asistencia_auto = primera_col and not asistencia_col
            
            if not asistencia_col and not calcular_asistencia_auto:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "No se encontrÃ³ columna de Asistencia ni columnas de horario (Primera/Ãšltima). "
                        "Proporciona una columna 'Asistencia' o 'Primera' (y opcionalmente 'Ãšltima'). "
                        f"Columnas encontradas: {list(df.columns)}"
                    )
                )

            # Cache users once; uploaded DNI values arrive as strings.
            usuarios_cache = {str(u.dni).strip(): u.nombre for u in db.query(Usuario).all()}
            
            # OPTIMIZACIÃ“N: Mover imports fuera del loop
            
            registros_por_clave = {}
            
            for idx, row in df.iterrows():
                try:
                    dni = normalizar_dni(row[dni_col])
                    if not dni:
                        continue

                    try:
                        fecha_valor = row[fecha_col]
                        fecha = pd.to_datetime(fecha_valor).date() if isinstance(fecha_valor, str) else pd.Timestamp(fecha_valor).date()
                    except Exception:
                        errores.append(f"Fila {idx + 2}: Fecha invÃ¡lida")
                        continue

                    if rango_inicio and fecha < rango_inicio:
                        omitidos_fuera_rango += 1
                        continue
                    if rango_fin and fecha > rango_fin:
                        omitidos_fuera_rango += 1
                        continue

                    hora_entrada = parsear_hora_marcacion(row[primera_col]) if primera_col and pd.notna(row[primera_col]) else None
                    hora_salida = parsear_hora_marcacion(row[ultima_col]) if ultima_col and pd.notna(row[ultima_col]) else None
                    asistencia_incompleta = bool(hora_entrada and not hora_salida)

                    # Calcular asistencia automÃ¡ticamente si no existe columna
                    if calcular_asistencia_auto and primera_col:
                        # Aplicar reglas automÃ¡ticas de turnos
                        asistencia = "A" if asistencia_incompleta else determinar_turno(hora_entrada, hora_salida)
                    else:
                        # Usar columna de asistencia si existe
                        asistencia = str(row[asistencia_col]).strip().upper() if asistencia_col and pd.notna(row[asistencia_col]) else "F"
                    
                    comentario = ""
                    if observacion_col and pd.notna(row[observacion_col]):
                        comentario = str(row[observacion_col]).strip()
                    comentario = combinar_comentario_marcacion(comentario, asistencia_incompleta)
                    if asistencia_incompleta:
                        incompletos += 1

                    marcaciones_detalle = " | ".join(
                        item for item in [
                            f"Primera marcacion: {hora_entrada}" if hora_entrada else "",
                            f"Ultima marcacion: {hora_salida}" if hora_salida else "",
                        ]
                        if item
                    )

                    nombre = usuarios_cache.get(dni, dni)
                    key = (dni, fecha)
                    registros_por_clave[key] = {
                        'dni': dni,
                        'fecha': fecha,
                        'asistencia': asistencia,
                        'comentario_gdh': comentario,
                        'nombre': nombre,
                        'primera_marcacion': hora_entrada,
                        'ultima_marcacion': hora_salida,
                        'marcaciones_detalle': marcaciones_detalle,
                        'asistencia_incompleta': asistencia_incompleta,
                    }

                except Exception as row_error:
                    errores.append(f"Fila {idx + 2}: {str(row_error)}")
            
            if registros_por_clave:
                fechas = {fecha for _, fecha in registros_por_clave.keys()}
                existentes = db.query(Tareo).filter(Tareo.fecha.in_(fechas)).all()
                existentes_por_clave = {
                    (registro.dni, registro.fecha): registro
                    for registro in existentes
                    if (registro.dni, registro.fecha) in registros_por_clave
                }

                ahora = datetime.utcnow()
                registros_actualizar = []
                registros_crear = []
                for key, datos in registros_por_clave.items():
                    existente = existentes_por_clave.get(key)
                    if existente:
                        registros_actualizar.append({
                            "id": existente.id,
                            "asistencia": datos["asistencia"],
                            "comentario_gdh": datos["comentario_gdh"],
                            "primera_marcacion": datos["primera_marcacion"],
                            "ultima_marcacion": datos["ultima_marcacion"],
                            "marcaciones_detalle": datos["marcaciones_detalle"],
                            "asistencia_incompleta": datos["asistencia_incompleta"],
                            "fecha_actualizacion": ahora,
                        })
                    else:
                        registros_crear.append({
                            **datos,
                            "origen": "excel_upload",
                            "fecha_creacion": ahora,
                            "fecha_actualizacion": ahora,
                        })

                if registros_actualizar:
                    db.bulk_update_mappings(Tareo, registros_actualizar)
                if registros_crear:
                    db.bulk_insert_mappings(Tareo, registros_crear)

                actualizados = len(registros_actualizar)
                creados = len(registros_crear)

        db.commit()
        return {
            "exitoso": True,
            "creados": creados,
            "actualizados": actualizados,
            "total": creados + actualizados,
            "incompletos": incompletos,
            "omitidos_fuera_rango": omitidos_fuera_rango,
            "rango": {
                "desde": str(rango_inicio) if rango_inicio else None,
                "hasta": str(rango_fin) if rango_fin else None
            },
            "errores": errores if errores else None
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error procesando Excel: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


def procesar_tareo_transpuesto(tmp_path: str, db: Session, excel_file) -> tuple:
    """Procesa formato transpuesto con hojas 'Datos' y 'Asistencia Total'"""
    import pandas as pd

    creados = 0
    actualizados = 0
    errores = []

    try:
        df_datos = pd.read_excel(tmp_path, sheet_name='Datos', engine='openpyxl', header=0)
        dni_nombre_map = {}

        for idx, row in df_datos.iterrows():
            try:
                if len(df_datos.columns) >= 3:
                    dni = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else None
                    nombre = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else None
                    if dni and dni.isdigit():
                        dni_nombre_map[dni] = nombre
            except Exception:
                continue

        df_asistencia = pd.read_excel(tmp_path, sheet_name='Asistencia Total', engine='openpyxl', header=None)

        dni_row = 2
        if len(df_asistencia) > dni_row:
            dnis = [str(x).strip() for x in df_asistencia.iloc[dni_row, 1:]]

            for row_idx in range(3, len(df_asistencia)):
                try:
                    fecha_valor = df_asistencia.iloc[row_idx, 0]
                    if pd.isna(fecha_valor):
                        continue
                    try:
                        fecha = pd.Timestamp(fecha_valor).date()
                    except Exception:
                        continue

                    for col_idx, dni in enumerate(dnis, 1):
                        if not dni or dni.lower() == "nan":
                            continue

                        asistencia_valor = df_asistencia.iloc[row_idx, col_idx]
                        if pd.isna(asistencia_valor):
                            continue

                        asistencia = str(asistencia_valor).strip().upper()
                        if not asistencia or asistencia == "NAN":
                            continue

                        nombre = dni_nombre_map.get(dni, dni)
                        tareo = db.query(Tareo).filter(Tareo.dni == dni, Tareo.fecha == fecha).first()

                        if tareo:
                            tareo.asistencia = asistencia
                            tareo.fecha_actualizacion = datetime.utcnow()
                            actualizados += 1
                        else:
                            db.add(Tareo(
                                dni=dni, nombre=nombre, fecha=fecha,
                                asistencia=asistencia, origen="excel_upload"
                            ))
                            creados += 1

                except Exception as row_error:
                    errores.append(f"Fila {row_idx}: {str(row_error)}")

    except Exception as e:
        errores.append(f"Error procesando formato transpuesto: {str(e)}")

    return creados, actualizados, errores


@app.get("/tareo")
def obtener_tareo(
    dni: Optional[str] = None,
    q: Optional[str] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    skip: int = Query(default=0, ge=0, description="Registros a omitir (paginaciÃ³n)"),
    limit: int = Query(default=1000, ge=1, le=5000, description="MÃ¡ximo de registros a devolver"),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Obtiene registros de tareo con paginaciÃ³n opcional (skip/limit)."""
    query = db.query(Tareo)

    if es_rol(usuario.rol, "Auxiliar"):
        query = query.filter(Tareo.dni == usuario.dni)
    elif dni and es_rol_en(usuario.rol, ["gdh", "Supervisor"]):
        query = query.filter(Tareo.dni == dni)
    elif es_rol(usuario.rol, "Supervisor"):
        # Supervisor ve solo su Ã¡rea
        usuarios_area = db.query(Usuario.dni).filter(Usuario.area == usuario.area).all()
        dnis_area = [u.dni for u in usuarios_area]
        query = query.filter(Tareo.dni.in_(dnis_area))

    if q and es_rol_en(usuario.rol, ["gdh", "Supervisor", "Lider", "Coordinador"]):
        clean_q = q.strip()
        if clean_q:
            pattern = f"%{clean_q}%"
            query = query.filter(
                (Tareo.dni.ilike(pattern)) |
                (Tareo.nombre.ilike(pattern)) |
                (Tareo.asistencia.ilike(pattern))
            )

    if fecha_inicio:
        query = query.filter(Tareo.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.filter(Tareo.fecha <= fecha_fin)

    return query.order_by(Tareo.fecha.desc()).offset(skip).limit(limit).all()


@app.get("/tareo/estadisticas")
def obtener_estadisticas_tareo(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Obtiene estadÃ­sticas de tareo con detalles por turno"""
    if es_rol(usuario.rol, "Auxiliar"):
        registros = db.query(Tareo).filter(Tareo.dni == usuario.dni).all()
    else:
        registros = db.query(Tareo).all()

    # Contar por tipo de asistencia
    asistido_dia = sum(1 for r in registros if r.asistencia == "M")
    asistido_tarde = sum(1 for r in registros if r.asistencia == "T")
    asistido_noche = sum(1 for r in registros if r.asistencia == "N")
    vacaciones = sum(1 for r in registros if r.asistencia == "V")
    faltas = sum(1 for r in registros if r.asistencia == "F")
    licencias = sum(1 for r in registros if r.asistencia == "L")

    # Registros de hoy
    hoy = date.today()
    registros_hoy = sum(1 for r in registros if r.fecha.date() == hoy)

    # Ãšltimo archivo procesado
    ultimo_archivo = db.query(SincronizacionExcel).order_by(SincronizacionExcel.fecha_sincronizacion.desc()).first()

    return {
        "asistido_dia": asistido_dia,
        "asistido_tarde": asistido_tarde,
        "asistido_noche": asistido_noche,
        "vacaciones": vacaciones,
        "faltas": faltas,
        "licencias": licencias,
        "total_registros": len(registros),
        "registros_hoy": registros_hoy,
        "ultimo_archivo": ultimo_archivo.fecha_sincronizacion if ultimo_archivo else None,
    }


@app.put("/tareo/{tareo_id}")
def actualizar_tareo(
    tareo_id: int,
    data: ActualizarTareoRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Actualiza un registro de tareo (solo GDH)."""
    if not es_rol(usuario.rol, "gdh"):
        raise HTTPException(status_code=403, detail="Solo GDH puede actualizar tareo")

    tareo = db.query(Tareo).filter(Tareo.id == tareo_id).first()
    if not tareo:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    if data.comentario_gdh is not None:
        tareo.comentario_gdh = data.comentario_gdh

    tareo.fecha_actualizacion = datetime.utcnow()
    db.commit()
    return {"msg": "Tareo actualizado"}


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# ENDPOINTS - COMENTARIOS AUXILIAR
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.post("/tareo/comentario")
def crear_comentario_tareo(
    data: ComentarioTareoRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Crea un comentario sobre asistencia (solo Auxiliar)."""
    if not es_rol(usuario.rol, "Auxiliar"):
        raise HTTPException(status_code=403, detail="Solo auxiliares pueden comentar")

    comentario = ComentarioAuxiliar(
        dni=usuario.dni, nombre=usuario.nombre,
        fecha=data.fecha, comentario=data.comentario,
        estado_revision="pendiente"
    )
    db.add(comentario)
    db.commit()
    return {"id": comentario.id, "msg": "Comentario enviado"}


@app.get("/tareo/comentarios")
def obtener_comentarios_tareo(
    dni: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Obtiene comentarios de tareo"""
    query = db.query(ComentarioAuxiliar)

    if es_rol(usuario.rol, "Auxiliar"):
        query = query.filter(ComentarioAuxiliar.dni == usuario.dni)
    elif dni and es_rol(usuario.rol, "gdh"):
        query = query.filter(ComentarioAuxiliar.dni == dni)

    return query.order_by(ComentarioAuxiliar.fecha_creacion.desc()).all()


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# ENDPOINTS - COLABORADORES
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.get("/colaboradores")
def obtener_colaboradores(
    area: Optional[str] = None,
    estado: str = "activo",
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Lista de colaboradores"""
    query = db.query(Usuario)

    if estado:
        query = query.filter(Usuario.estado == estado)

    if es_rol_en(usuario.rol, ["Supervisor", "Lider", "Coordinador"]):
        query = query.filter(Usuario.area == usuario.area)
    elif area and es_rol(usuario.rol, "gdh"):
        query = query.filter(Usuario.area == area)

    return query.order_by(Usuario.nombre).all()


@app.get("/colaborador/{dni}")
def obtener_colaborador(
    dni: str,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Obtiene detalles de un colaborador"""
    colaborador = db.query(Usuario).filter(Usuario.dni == dni).first()
    if not colaborador:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")

    if not es_rol_en(usuario.rol, ["gdh", "supervisor", "lider", "coordinador"]) and usuario.dni != dni:
        raise HTTPException(status_code=403, detail="No tienes permisos")

    return colaborador


@app.put("/colaborador/{dni}")
def actualizar_colaborador(
    dni: str,
    data: ActualizarColaboradorRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Actualiza un colaborador con auditoria y permisos por rol."""
    colaborador = db.query(Usuario).filter(Usuario.dni == dni).first()
    if not colaborador:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")

    is_gdh = es_rol(usuario.rol, "gdh")
    is_self = usuario.dni == dni
    if not is_gdh and not is_self:
        raise HTTPException(status_code=403, detail="No tienes permisos para actualizar este colaborador")

    admin_fields = {
        "nombre": data.nombre,
        "cargo": data.cargo,
        "area": data.area,
        "rol": data.rol,
        "estado": data.estado,
        "vacaciones_pendientes": data.vacaciones_pendientes,
    }

    changes = []

    if is_gdh:
        for field, new_value in admin_fields.items():
            if new_value is None:
                continue
            old_value = getattr(colaborador, field)
            if old_value != new_value:
                changes.append((field, old_value, new_value))
                setattr(colaborador, field, new_value)

        if data.password:
            colaborador.password = hash_password(data.password)
            changes.append(("password", "***", "***"))
    else:
        forbidden = [field for field, value in admin_fields.items() if value is not None]
        if forbidden or data.password:
            raise HTTPException(status_code=403, detail="Solo GDH puede modificar datos administrativos")

    if data.fecha_cumpleanos is not None:
        if not is_gdh and colaborador.cambio_cumpleanos:
            raise HTTPException(status_code=403, detail="La fecha de cumpleanos solo se puede cambiar una vez")
        if colaborador.fecha_cumpleanos != data.fecha_cumpleanos:
            changes.append(("fecha_cumpleanos", colaborador.fecha_cumpleanos, data.fecha_cumpleanos))
            colaborador.fecha_cumpleanos = data.fecha_cumpleanos
            if not is_gdh:
                colaborador.cambio_cumpleanos = True

    if not changes:
        return {"msg": "Sin cambios"}

    colaborador.fecha_ultima_modificacion = datetime.utcnow()
    for field, old_value, new_value in changes:
        db.add(HistorialCambios(
            usuario_id=colaborador.id,
            usuario_que_cambio_id=usuario.id,
            campo=field,
            valor_anterior=str(old_value) if old_value is not None else "",
            valor_nuevo=str(new_value) if new_value is not None else "",
            tipo_cambio="actualizacion_manual",
            descripcion=f"{usuario.nombre} actualizo {field}"
        ))

    db.commit()
    db.refresh(colaborador)
    return {"msg": "Colaborador actualizado", "colaborador": colaborador}


@app.get("/areas")
def obtener_areas(db: Session = Depends(get_db)):
    """Lista de Ã¡reas"""
    areas = db.query(Usuario.area).distinct().filter(Usuario.area.isnot(None)).all()
    return sorted([area[0] for area in areas])


@app.get("/mi-perfil")
def obtener_mi_perfil(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Obtiene el perfil del usuario actual"""
    return usuario


@app.post("/cambiar-password")
def cambiar_password(
    data: CambiarPasswordRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Cambia la contraseÃ±a del usuario actual"""
    if es_rol(usuario.rol, "Auxiliar"):
        raise HTTPException(status_code=403, detail="Los auxiliares no pueden cambiar su contraseÃ±a")

    if not verify_password(data.password_actual, usuario.password):
        raise HTTPException(status_code=401, detail="ContraseÃ±a actual incorrecta")

    usuario.password = hash_password(data.password_nuevo)
    usuario.fecha_ultima_modificacion = datetime.utcnow()

    db.add(HistorialCambios(
        usuario_id=usuario.id,
        usuario_que_cambio_id=usuario.id,
        campo="password",
        valor_anterior="***",
        valor_nuevo="***",
        tipo_cambio="cambio_password",
        descripcion="Usuario cambiÃ³ su contraseÃ±a"
    ))
    db.commit()
    return {"msg": "ContraseÃ±a actualizada correctamente"}


@app.put("/mi-perfil")
def actualizar_mi_perfil(
    data: ActualizarPerfilRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Actualiza el perfil del usuario actual"""
    if es_rol(usuario.rol, "Auxiliar"):
        raise HTTPException(status_code=403, detail="Los auxiliares no pueden modificar sus datos")

    if data.nombre and usuario.nombre != data.nombre:
        db.add(HistorialCambios(
            usuario_id=usuario.id,
            usuario_que_cambio_id=usuario.id,
            campo="nombre",
            valor_anterior=usuario.nombre,
            valor_nuevo=data.nombre,
            tipo_cambio="actualizacion_manual",
            descripcion="Usuario actualizÃ³ su nombre"
        ))
        usuario.nombre = data.nombre

    usuario.fecha_ultima_modificacion = datetime.utcnow()
    db.commit()
    return {"msg": "Perfil actualizado correctamente"}


@app.get("/historial")
def obtener_historial(
    limite: int = 100,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Obtiene el historial de cambios (solo GDH)"""
    if not es_rol(usuario.rol, "gdh"):
        raise HTTPException(status_code=403, detail="Solo GDH puede ver el historial")
    return db.query(HistorialCambios).order_by(HistorialCambios.fecha.desc()).limit(limite).all()


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# ENDPOINTS - DASHBOARD STATS
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@app.get("/dashboard/stats")
def obtener_dashboard_stats(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """EstadÃ­sticas del dashboard segÃºn rol"""
    if es_rol(usuario.rol, "gdh"):
        activos = db.query(Usuario).filter(Usuario.estado == "activo").count()
        inactivos = db.query(Usuario).filter(Usuario.estado == "inactivo").count()
        areas = db.query(Usuario.area).distinct().filter(Usuario.area.isnot(None)).count()
        anuncios_hoy = db.query(Anuncio).filter(
            Anuncio.fecha_creacion >= datetime.utcnow().replace(hour=0, minute=0, second=0)
        ).count()
        obs_pendientes = db.query(Observacion).filter(Observacion.estado == "Pendiente").count()

        return {
            "activos": activos,
            "inactivos": inactivos,
            "areas": areas,
            "anuncios_hoy": anuncios_hoy,
            "obs_pendientes": obs_pendientes
        }

    elif es_rol_en(usuario.rol, ["Supervisor", "Lider", "Coordinador"]):
        colaboradores = db.query(Usuario).filter(
            Usuario.area == usuario.area, Usuario.estado == "activo"
        ).count()
        obs_area = db.query(Observacion).filter(
            Observacion.area == usuario.area, Observacion.estado == "Pendiente"
        ).count()

        return {
            "colaboradores": colaboradores,
            "obs_pendientes": obs_area,
            "area": usuario.area
        }

    else:
        # Auxiliar
        tareo_count = db.query(Tareo).filter(Tareo.dni == usuario.dni).count()
        obs_count = db.query(Observacion).filter(Observacion.usuario_id == usuario.id).count()

        return {
            "tareo_registros": tareo_count,
            "observaciones": obs_count
        }


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check: verifica que la aplicaciÃ³n y la BD estÃ©n operativas."""
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "version": "3.1",
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/")
def root():
    return {
        "sistema": "SGC - Sistema de GestiÃ³n de Colaboradores",
        "version": "3.1",
        "estado": "operativo"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
