"""
🗣️ MÓDULO DE OBSERVACIONES DE ASISTENCIA
Sistema de gestión de observaciones tipo conversación/chat
Roles: Auxiliar, Supervisor, GDH
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, date
import os

from database import get_db, SessionLocal
from models import Usuario, Observacion, MensajeObservacion, ArchivoObservacion
from auth import obtener_usuario_actual, es_rol, es_rol_en

# ═══════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════

router = APIRouter(prefix="/observaciones", tags=["observaciones"])

# ═══════════════════════════════════════════
# MODELOS PYDANTIC
# ═══════════════════════════════════════════

class CrearObservacionRequest(BaseModel):
    fecha_asistencia: date
    tipo: str  # Error en tareo, Falta justificada, etc.
    comentario: str


class AgregarMensajeRequest(BaseModel):
    mensaje: str


class RespuestaGDHRequest(BaseModel):
    mensaje: str
    accion: str  # Aprobar, Rechazar, Observar


# ═══════════════════════════════════════════
# UTILIDADES
# ═══════════════════════════════════════════

def obtener_prioridad(tipo: str) -> str:
    """Obtiene prioridad automática según tipo"""
    tipo_lower = tipo.lower()

    alta = ["falta", "descanso médico", "horas extras"]
    media = ["tardanza"]

    for t in alta:
        if t in tipo_lower:
            return "Alta"

    for t in media:
        if t in tipo_lower:
            return "Media"

    return "Baja"


# ═══════════════════════════════════════════
# ENDPOINTS - OBSERVACIONES
# ═══════════════════════════════════════════

@router.post("/crear")
def crear_observacion(
    data: CrearObservacionRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Crea una observación (Solo Auxiliar puede crear)"""

    # Solo auxiliares pueden crear observaciones
    if not es_rol(usuario.rol, "Auxiliar"):
        raise HTTPException(status_code=403, detail="Solo auxiliares pueden crear observaciones")

    # Encontrar supervisor del área
    supervisor = db.query(Usuario).filter(
        Usuario.area == usuario.area,
        Usuario.rol.ilike("supervisor")
    ).first()

    # Crear observación
    observacion = Observacion(
        usuario_id=usuario.id,
        dni=usuario.dni,
        nombre=usuario.nombre,
        area=usuario.area,
        supervisor_id=supervisor.id if supervisor else None,
        fecha_asistencia=data.fecha_asistencia,
        tipo=data.tipo,
        comentario=data.comentario,
        estado="Pendiente",
        prioridad=obtener_prioridad(data.tipo)
    )
    db.add(observacion)
    db.flush()

    # Crear mensaje inicial (la observación misma)
    mensaje = MensajeObservacion(
        observacion_id=observacion.id,
        usuario_id=usuario.id,
        nombre=usuario.nombre,
        rol=usuario.rol,
        mensaje=data.comentario
    )
    db.add(mensaje)

    db.commit()

    return {
        "id": observacion.id,
        "msg": "Observación creada exitosamente",
        "estado": observacion.estado,
        "prioridad": observacion.prioridad
    }


@router.get("/mi-area")
def obtener_observaciones_area(
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """
    Obtiene observaciones según rol:
    - Auxiliar: Solo sus observaciones
    - Supervisor: Observaciones de su área
    - GDH: Todas las observaciones
    """

    query = db.query(Observacion)

    if es_rol(usuario.rol, "Auxiliar"):
        # Auxiliar solo ve sus observaciones
        query = query.filter(Observacion.usuario_id == usuario.id)

    elif es_rol(usuario.rol, "Supervisor"):
        # Supervisor solo ve su área
        query = query.filter(Observacion.area == usuario.area)

    elif es_rol(usuario.rol, "gdh"):
        # GDH ve todas
        pass

    else:
        raise HTTPException(status_code=403, detail="Rol no autorizado")

    # Filtrar por estado si se proporciona
    if estado:
        query = query.filter(Observacion.estado == estado)

    observaciones = query.order_by(Observacion.fecha_creacion.desc()).all()

    return observaciones


@router.get("/{observacion_id}")
def obtener_observacion_detalle(
    observacion_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Obtiene una observación con su historial de mensajes"""

    observacion = db.query(Observacion).filter(
        Observacion.id == observacion_id
    ).first()

    if not observacion:
        raise HTTPException(status_code=404, detail="Observación no encontrada")

    # Validar acceso
    if es_rol(usuario.rol, "Auxiliar"):
        if observacion.usuario_id != usuario.id:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta observación")

    elif es_rol(usuario.rol, "Supervisor"):
        if observacion.area != usuario.area:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta área")

    elif not es_rol(usuario.rol, "gdh"):
        raise HTTPException(status_code=403, detail="Rol no autorizado")

    # Obtener mensajes
    mensajes = db.query(MensajeObservacion).filter(
        MensajeObservacion.observacion_id == observacion_id
    ).order_by(MensajeObservacion.fecha).all()

    # Obtener archivos
    archivos = db.query(ArchivoObservacion).filter(
        ArchivoObservacion.observacion_id == observacion_id
    ).all()

    return {
        "observacion": observacion,
        "mensajes": mensajes,
        "archivos": archivos
    }


@router.post("/{observacion_id}/comentar")
def agregar_comentario(
    observacion_id: int,
    data: AgregarMensajeRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Agrega un comentario a una observación"""

    observacion = db.query(Observacion).filter(
        Observacion.id == observacion_id
    ).first()

    if not observacion:
        raise HTTPException(status_code=404, detail="Observación no encontrada")

    # Validar acceso
    if es_rol(usuario.rol, "Auxiliar"):
        if observacion.usuario_id != usuario.id:
            raise HTTPException(status_code=403, detail="No tienes acceso")

    elif es_rol(usuario.rol, "Supervisor"):
        if observacion.area != usuario.area:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta área")

    elif not es_rol(usuario.rol, "gdh"):
        raise HTTPException(status_code=403, detail="Rol no autorizado")

    # Crear mensaje
    mensaje = MensajeObservacion(
        observacion_id=observacion_id,
        usuario_id=usuario.id,
        nombre=usuario.nombre,
        rol=usuario.rol,
        mensaje=data.mensaje
    )
    db.add(mensaje)

    # Actualizar fecha de actualización
    observacion.fecha_actualizacion = datetime.utcnow()

    db.commit()

    return {
        "id": mensaje.id,
        "msg": "Comentario agregado"
    }


@router.put("/{observacion_id}/validar")
def validar_observacion_supervisor(
    observacion_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Supervisor valida preliminarmente la observación"""

    observacion = db.query(Observacion).filter(
        Observacion.id == observacion_id
    ).first()

    if not observacion:
        raise HTTPException(status_code=404, detail="Observación no encontrada")

    # Solo supervisor de la área puede validar
    if not es_rol(usuario.rol, "Supervisor"):
        raise HTTPException(status_code=403, detail="Solo supervisores pueden validar")

    if observacion.area != usuario.area:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta área")

    # Cambiar estado
    observacion.estado = "Revisado por Supervisor"
    observacion.fecha_actualizacion = datetime.utcnow()

    # Agregar mensaje automático
    mensaje = MensajeObservacion(
        observacion_id=observacion_id,
        usuario_id=usuario.id,
        nombre=usuario.nombre,
        rol=usuario.rol,
        mensaje="Supervisor validó preliminarmente la observación."
    )
    db.add(mensaje)

    db.commit()

    return {"msg": "Observación validada", "estado": observacion.estado}


@router.put("/{observacion_id}/aprobar")
def aprobar_observacion_gdh(
    observacion_id: int,
    data: RespuestaGDHRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """GDH aprueba/rechaza/observa una observación"""

    observacion = db.query(Observacion).filter(
        Observacion.id == observacion_id
    ).first()

    if not observacion:
        raise HTTPException(status_code=404, detail="Observación no encontrada")

    # Solo GDH puede aprobar
    if not es_rol(usuario.rol, "gdh"):
        raise HTTPException(status_code=403, detail="Solo GDH puede aprobar")

    # Validar acción
    acciones_validas = ["Aprobar", "Rechazar", "Observar"]
    if data.accion not in acciones_validas:
        raise HTTPException(status_code=400, detail="Acción inválida")

    # Actualizar observación
    if data.accion == "Aprobar":
        observacion.estado = "Aprobado"
    elif data.accion == "Rechazar":
        observacion.estado = "Rechazado"
    elif data.accion == "Observar":
        observacion.estado = "Observado"

    observacion.gdh_id = usuario.id
    observacion.respuesta_final_gdh = data.mensaje
    observacion.fecha_actualizacion = datetime.utcnow()

    # Agregar mensaje
    mensaje = MensajeObservacion(
        observacion_id=observacion_id,
        usuario_id=usuario.id,
        nombre=usuario.nombre,
        rol=usuario.rol,
        mensaje=f"GDH {data.accion.lower()}: {data.mensaje}"
    )
    db.add(mensaje)

    db.commit()

    return {
        "msg": f"Observación {data.accion.lower()}a",
        "estado": observacion.estado
    }


@router.post("/{observacion_id}/escalar")
def escalar_a_gdh(
    observacion_id: int,
    data: AgregarMensajeRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Supervisor escala una observación a GDH"""

    observacion = db.query(Observacion).filter(
        Observacion.id == observacion_id
    ).first()

    if not observacion:
        raise HTTPException(status_code=404, detail="Observación no encontrada")

    # Solo supervisor puede escalar
    if not es_rol(usuario.rol, "Supervisor"):
        raise HTTPException(status_code=403, detail="Solo supervisores pueden escalar")

    if observacion.area != usuario.area:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta área")

    # Cambiar estado a "Revisado por Supervisor"
    observacion.estado = "Revisado por Supervisor"
    observacion.fecha_actualizacion = datetime.utcnow()

    # Agregar mensaje
    mensaje = MensajeObservacion(
        observacion_id=observacion_id,
        usuario_id=usuario.id,
        nombre=usuario.nombre,
        rol=usuario.rol,
        mensaje=f"Escalada a GDH: {data.mensaje}"
    )
    db.add(mensaje)

    db.commit()

    return {"msg": "Observación escalada a GDH"}


@router.get("/estadisticas/mi-area")
def estadisticas_area(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Obtiene estadísticas de observaciones por rol"""

    if es_rol(usuario.rol, "Auxiliar"):
        # Estadísticas personales
        total = db.query(Observacion).filter(
            Observacion.usuario_id == usuario.id
        ).count()

        pendientes = db.query(Observacion).filter(
            Observacion.usuario_id == usuario.id,
            Observacion.estado == "Pendiente"
        ).count()

        aprobadas = db.query(Observacion).filter(
            Observacion.usuario_id == usuario.id,
            Observacion.estado == "Aprobado"
        ).count()

        rechazadas = db.query(Observacion).filter(
            Observacion.usuario_id == usuario.id,
            Observacion.estado == "Rechazado"
        ).count()

        return {
            "total": total,
            "pendientes": pendientes,
            "aprobadas": aprobadas,
            "rechazadas": rechazadas
        }

    elif es_rol(usuario.rol, "Supervisor"):
        # Estadísticas del área
        total = db.query(Observacion).filter(
            Observacion.area == usuario.area
        ).count()

        pendientes = db.query(Observacion).filter(
            Observacion.area == usuario.area,
            Observacion.estado == "Pendiente"
        ).count()

        por_validar = db.query(Observacion).filter(
            Observacion.area == usuario.area,
            Observacion.estado == "Revisado por Supervisor"
        ).count()

        return {
            "total": total,
            "pendientes": pendientes,
            "por_validar": por_validar,
            "area": usuario.area
        }

    elif es_rol(usuario.rol, "gdh"):
        # Estadísticas globales
        total = db.query(Observacion).count()

        pendientes = db.query(Observacion).filter(
            Observacion.estado == "Pendiente"
        ).count()

        aprobadas = db.query(Observacion).filter(
            Observacion.estado == "Aprobado"
        ).count()

        rechazadas = db.query(Observacion).filter(
            Observacion.estado == "Rechazado"
        ).count()

        observadas = db.query(Observacion).filter(
            Observacion.estado == "Observado"
        ).count()

        return {
            "total": total,
            "pendientes": pendientes,
            "aprobadas": aprobadas,
            "rechazadas": rechazadas,
            "observadas": observadas
        }

    raise HTTPException(status_code=403, detail="Rol no autorizado")


@router.post("/{observacion_id}/subir-archivo")
def subir_archivo_observacion(
    observacion_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """Sube un archivo a una observación"""

    observacion = db.query(Observacion).filter(
        Observacion.id == observacion_id
    ).first()

    if not observacion:
        raise HTTPException(status_code=404, detail="Observación no encontrada")

    # Validar acceso
    if es_rol(usuario.rol, "Auxiliar"):
        if observacion.usuario_id != usuario.id:
            raise HTTPException(status_code=403, detail="No tienes acceso")

    elif es_rol(usuario.rol, "Supervisor"):
        if observacion.area != usuario.area:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta área")

    elif not es_rol(usuario.rol, "gdh"):
        raise HTTPException(status_code=403, detail="Rol no autorizado")

    # Crear directorio de uploads si no existe
    upload_dir = "uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)

    # Guardar archivo
    file_path = f"{upload_dir}/obs_{observacion_id}_{file.filename}"

    try:
        contents = file.file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al guardar archivo: {str(e)}")

    # Crear registro en BD
    archivo = ArchivoObservacion(
        observacion_id=observacion_id,
        nombre_archivo=file.filename,
        ruta=f"/{file_path}",
        tipo=file.content_type,
        tamanio=len(contents),
        usuario_id=usuario.id,
        nombre_usuario=usuario.nombre
    )
    db.add(archivo)

    # Actualizar observación
    observacion.fecha_actualizacion = datetime.utcnow()

    db.commit()

    return {
        "id": archivo.id,
        "msg": "Archivo subido exitosamente",
        "nombre": archivo.nombre_archivo,
        "tamanio": archivo.tamanio
    }
