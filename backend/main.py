"""
Sistema de Gestión de Colaboradores + Anuncios + Tareo
Backend - FastAPI v3.1
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, date, timedelta
import os
import tempfile
import base64
import binascii
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

# Crear tablas
Base.metadata.create_all(bind=engine)
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
# ═══════════════════════════════════════════
# APP
# ═══════════════════════════════════════════
app = FastAPI(
    title="Sistema de Gestión de Colaboradores",
    description="Gestión integral de colaboradores - Tareo, Anuncios, Observaciones",
    version="3.1"
)

# CORS - configurar según entorno
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir archivos estáticos (uploads)
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


# ═══════════════════════════════════════════
# MODELOS PYDANTIC
# ═══════════════════════════════════════════

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
            raise ValueError("La contraseña debe tener al menos 6 caracteres")
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
    """Payload para que un Auxiliar envíe un comentario sobre su asistencia."""
    fecha: str
    comentario: str

    @field_validator("comentario")
    @classmethod
    def not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("El comentario no puede estar vacío")
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


# ═══════════════════════════════════════════
# ENDPOINTS - AUTENTICACIÓN
# ═══════════════════════════════════════════

@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Login con usuario y contraseña.

    Aplica rate limiting por nombre de usuario para limitar ataques de fuerza bruta.
    Devuelve un access token (corta duración) y un refresh token (larga duración).
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
    """Obtiene un nuevo access token usando un refresh token válido."""
    from models import Usuario as UsuarioModel

    payload = verificar_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")

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


# ═══════════════════════════════════════════
# ENDPOINTS - SINCRONIZACIÓN EXCEL
# ═══════════════════════════════════════════

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


# ═══════════════════════════════════════════
# ENDPOINTS - ANUNCIOS
# ═══════════════════════════════════════════

@app.get("/anuncios")
def obtener_anuncios(db: Session = Depends(get_db), usuario: Usuario = Depends(obtener_usuario_actual)):
    """Obtiene anuncios filtrados por rol y área"""
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
    """Crea un nuevo anuncio (GDH para todos, Supervisor para su área)"""
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
            contenido=f"{usuario.nombre} publicó un nuevo anuncio"
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


# ═══════════════════════════════════════════
# ENDPOINTS - REACCIONES
# ═══════════════════════════════════════════

@app.post("/anuncios/{anuncio_id}/reaccionar")
def reaccionar_anuncio(
    anuncio_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Toggle reacción a un anuncio"""
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
        return {"msg": "Reacción removida", "activa": False}

    db.add(Reaccion(
        anuncio_id=anuncio_id,
        usuario_id=usuario.id,
        usuario_nombre=usuario.nombre,
        tipo="corazon"
    ))
    db.commit()
    return {"msg": "Reacción agregada", "activa": True}


# ═══════════════════════════════════════════
# ENDPOINTS - NOTIFICACIONES
# ═══════════════════════════════════════════

@app.get("/notificaciones")
def obtener_notificaciones(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual),
    leidas: Optional[bool] = None,
    skip: int = Query(default=0, ge=0, description="Registros a omitir (paginación)"),
    limit: int = Query(default=50, ge=1, le=200, description="Máximo de notificaciones a devolver"),
):
    """Obtiene las notificaciones del usuario con paginación opcional (skip/limit)."""
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
    """Marca una notificación como leída"""
    notif = db.query(Notificacion).filter(
        Notificacion.id == notificacion_id,
        Notificacion.usuario_id == usuario.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    notif.leida = True
    db.commit()
    return {"msg": "Notificación marcada como leída"}


@app.put("/notificaciones/leer-todas")
def marcar_todas_leidas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Marca todas las notificaciones como leídas"""
    db.query(Notificacion).filter(
        Notificacion.usuario_id == usuario.id,
        Notificacion.leida == False
    ).update({"leida": True})
    db.commit()
    return {"msg": "Todas las notificaciones marcadas como leídas"}


# ═══════════════════════════════════════════
# ENDPOINTS - TAREO (ASISTENCIA)
# ═══════════════════════════════════════════

@app.post("/tareo/subir-excel")
async def subir_tareo_excel(
    archivo: UploadFile = File(...),
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
        errores = []

        if "Datos" in sheet_names and "Asistencia Total" in sheet_names:
            creados, actualizados, errores = procesar_tareo_transpuesto(tmp_path, db, excel_file)
        else:
            df = pd.read_excel(tmp_path, sheet_name=0, engine='openpyxl')
            df.columns = [str(col).strip() for col in df.columns]

            def find_column(df_cols, names):
                col_lower = {col.lower(): col for col in df_cols}
                for name in names:
                    if name.lower() in col_lower:
                        return col_lower[name.lower()]
                return None

            dni_col = find_column(df.columns, ["DNI", "Cedula", "Documento"])
            fecha_col = find_column(df.columns, ["Fecha", "Date"])
            asistencia_col = find_column(df.columns, ["Asistencia", "Tipo", "Status", "Turno"])
            observacion_col = find_column(df.columns, ["Observaciones", "Comentario", "Notas"])

            if not dni_col or not fecha_col or not asistencia_col:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Columnas requeridas no encontradas. Se necesita: DNI, Fecha, Asistencia. "
                        f"Columnas encontradas: {list(df.columns)}"
                    )
                )

            for idx, row in df.iterrows():
                try:
                    dni = str(row[dni_col]).strip()
                    if not dni or dni.lower() == "nan":
                        continue

                    try:
                        fecha_valor = row[fecha_col]
                        fecha = pd.to_datetime(fecha_valor).date() if isinstance(fecha_valor, str) else pd.Timestamp(fecha_valor).date()
                    except Exception:
                        errores.append(f"Fila {idx + 2}: Fecha inválida")
                        continue

                    asistencia = str(row[asistencia_col]).strip().upper()
                    comentario = ""
                    if observacion_col and pd.notna(row[observacion_col]):
                        comentario = str(row[observacion_col]).strip()

                    usr = db.query(Usuario).filter(Usuario.dni == dni).first()
                    nombre = usr.nombre if usr else dni

                    tareo = db.query(Tareo).filter(Tareo.dni == dni, Tareo.fecha == fecha).first()

                    if tareo:
                        tareo.asistencia = asistencia
                        if comentario:
                            tareo.comentario_gdh = comentario
                        tareo.fecha_actualizacion = datetime.utcnow()
                        actualizados += 1
                    else:
                        db.add(Tareo(
                            dni=dni, nombre=nombre, fecha=fecha,
                            asistencia=asistencia, comentario_gdh=comentario,
                            origen="excel_upload"
                        ))
                        creados += 1

                except Exception as row_error:
                    errores.append(f"Fila {idx + 2}: {str(row_error)}")

        db.commit()
        return {
            "exitoso": True,
            "creados": creados,
            "actualizados": actualizados,
            "total": creados + actualizados,
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
    skip: int = Query(default=0, ge=0, description="Registros a omitir (paginación)"),
    limit: int = Query(default=1000, ge=1, le=5000, description="Máximo de registros a devolver"),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Obtiene registros de tareo con paginación opcional (skip/limit)."""
    query = db.query(Tareo)

    if es_rol(usuario.rol, "Auxiliar"):
        query = query.filter(Tareo.dni == usuario.dni)
    elif dni and es_rol_en(usuario.rol, ["gdh", "Supervisor"]):
        query = query.filter(Tareo.dni == dni)
    elif es_rol(usuario.rol, "Supervisor"):
        # Supervisor ve solo su área
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
    """Obtiene estadísticas de tareo"""
    if es_rol(usuario.rol, "Auxiliar"):
        registros = db.query(Tareo).filter(Tareo.dni == usuario.dni).all()
    else:
        registros = db.query(Tareo).all()

    stats = {}
    for reg in registros:
        stats[reg.asistencia] = stats.get(reg.asistencia, 0) + 1

    return {"total": len(registros), "por_tipo": stats}


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


# ═══════════════════════════════════════════
# ENDPOINTS - COMENTARIOS AUXILIAR
# ═══════════════════════════════════════════

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


# ═══════════════════════════════════════════
# ENDPOINTS - COLABORADORES
# ═══════════════════════════════════════════

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
    """Lista de áreas"""
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
    """Cambia la contraseña del usuario actual"""
    if es_rol(usuario.rol, "Auxiliar"):
        raise HTTPException(status_code=403, detail="Los auxiliares no pueden cambiar su contraseña")

    if not verify_password(data.password_actual, usuario.password):
        raise HTTPException(status_code=401, detail="Contraseña actual incorrecta")

    usuario.password = hash_password(data.password_nuevo)
    usuario.fecha_ultima_modificacion = datetime.utcnow()

    db.add(HistorialCambios(
        usuario_id=usuario.id,
        usuario_que_cambio_id=usuario.id,
        campo="password",
        valor_anterior="***",
        valor_nuevo="***",
        tipo_cambio="cambio_password",
        descripcion="Usuario cambió su contraseña"
    ))
    db.commit()
    return {"msg": "Contraseña actualizada correctamente"}


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
            descripcion="Usuario actualizó su nombre"
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


# ═══════════════════════════════════════════
# ENDPOINTS - DASHBOARD STATS
# ═══════════════════════════════════════════

@app.get("/dashboard/stats")
def obtener_dashboard_stats(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Estadísticas del dashboard según rol"""
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
    """Health check: verifica que la aplicación y la BD estén operativas."""
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
        "sistema": "SGC - Sistema de Gestión de Colaboradores",
        "version": "3.1",
        "estado": "operativo"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
