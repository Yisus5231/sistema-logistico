from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Date, ForeignKey, Float
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

# ═══════════════════════════════════════════
# MODELO: USUARIO
# ═══════════════════════════════════════════

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)

    # 🔑 IDENTIDAD (INMUTABLE)
    dni = Column(String(20), unique=True, index=True, nullable=False)

    # 👤 DATOS PERSONALES
    nombre = Column(String(150), nullable=False)
    cargo = Column(String(100), nullable=True)
    area = Column(String(100), nullable=True, index=True)

    # 📅 FECHAS
    fecha_cumpleanos = Column(Date, nullable=True)
    fecha_ingreso = Column(Date, nullable=True)

    # 🏖️ VACACIONES
    vacaciones_pendientes = Column(Float, default=0)

    # 🔐 AUTENTICACIÓN
    usuario = Column(String(20), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    primer_acceso = Column(Boolean, default=True)

    # 👑 CONTROL DE ACCESO
    rol = Column(String(20), default="auxiliar")
    estado = Column(String(20), default="activo")

    # ✏️ EDICIONES
    cambio_cumpleanos = Column(Boolean, default=False)

    # 🕐 AUDITORÍA
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_ultima_modificacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    cambios = relationship(
        "HistorialCambios",
        foreign_keys="HistorialCambios.usuario_id",
        back_populates="usuario",
        cascade="all, delete-orphan"
    )
    cambios_hechos = relationship(
        "HistorialCambios",
        foreign_keys="HistorialCambios.usuario_que_cambio_id",
        back_populates="usuario_que_cambio"
    )


# ═══════════════════════════════════════════
# MODELO: HISTORIAL DE CAMBIOS (AUDITORÍA)
# ═══════════════════════════════════════════

class HistorialCambios(Base):
    __tablename__ = "historial_cambios"

    id = Column(Integer, primary_key=True, index=True)

    # Usuario afectado
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    usuario = relationship(
        "Usuario",
        foreign_keys=[usuario_id],
        back_populates="cambios",
        primaryjoin="HistorialCambios.usuario_id==Usuario.id"
    )

    # Cambio
    campo = Column(String, nullable=False)
    valor_anterior = Column(Text, nullable=True)
    valor_nuevo = Column(Text, nullable=False)

    # Quién hizo el cambio
    usuario_que_cambio_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    usuario_que_cambio = relationship(
        "Usuario",
        foreign_keys=[usuario_que_cambio_id],
        back_populates="cambios_hechos",
        primaryjoin="HistorialCambios.usuario_que_cambio_id==Usuario.id"
    )

    # Auditoria
    tipo_cambio = Column(String)
    fecha = Column(DateTime, default=datetime.utcnow, index=True)
    descripcion = Column(Text, nullable=True)


# ═══════════════════════════════════════════
# MODELO: SINCRONIZACIÓN
# ═══════════════════════════════════════════

class SincronizacionExcel(Base):
    __tablename__ = "sincronizacion_excel"

    id = Column(Integer, primary_key=True, index=True)

    # Detalles de la carga
    fecha_carga = Column(DateTime, default=datetime.utcnow)
    usuario_que_cargo = Column(String)
    nombre_archivo = Column(String)

    # Estadísticas
    total_registros = Column(Integer)
    usuarios_creados = Column(Integer, default=0)
    usuarios_actualizados = Column(Integer, default=0)
    usuarios_inactivados = Column(Integer, default=0)

    # Log
    log_errores = Column(Text, nullable=True)
    estado = Column(String)


# ═══════════════════════════════════════════
# MODELO: ANUNCIOS
# ═══════════════════════════════════════════

class Anuncio(Base):
    __tablename__ = "anuncios"

    id = Column(Integer, primary_key=True, index=True)
    contenido = Column(Text, nullable=False)
    imagen_url = Column(String, nullable=True)
    video_url = Column(String, nullable=True)
    autor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    autor_nombre = Column(String, nullable=False)
    autor_rol = Column(String, default="gdh")
    area_publicacion = Column(String, nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow, index=True)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reacciones = relationship("Reaccion", back_populates="anuncio", cascade="all, delete-orphan")


# ═══════════════════════════════════════════
# MODELO: REACCIONES
# ═══════════════════════════════════════════

class Reaccion(Base):
    __tablename__ = "reacciones"

    id = Column(Integer, primary_key=True, index=True)
    anuncio_id = Column(Integer, ForeignKey("anuncios.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    usuario_nombre = Column(String, nullable=False)
    tipo = Column(String, default="corazon")
    fecha_creacion = Column(DateTime, default=datetime.utcnow)

    anuncio = relationship("Anuncio", back_populates="reacciones")


# ═══════════════════════════════════════════
# MODELO: NOTIFICACIONES
# ═══════════════════════════════════════════

class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo = Column(String)
    anuncio_id = Column(Integer, ForeignKey("anuncios.id"), nullable=True)
    contenido = Column(Text)
    leida = Column(Boolean, default=False)
    fecha_creacion = Column(DateTime, default=datetime.utcnow, index=True)


# ═══════════════════════════════════════════
# MODELO: TAREO (ASISTENCIA)
# ═══════════════════════════════════════════

class Tareo(Base):
    __tablename__ = "tareo"

    id = Column(Integer, primary_key=True, index=True)
    dni = Column(String(20), index=True, nullable=False)
    nombre = Column(String(150), nullable=False)
    fecha = Column(Date, nullable=False, index=True)
    asistencia = Column(String(10), nullable=False)
    comentario_gdh = Column(Text, nullable=True)
    primera_marcacion = Column(String(20), nullable=True)
    ultima_marcacion = Column(String(20), nullable=True)
    salida_refrigerio = Column(String(20), nullable=True)
    retorno_refrigerio = Column(String(20), nullable=True)
    total_tiempo_refrigerio = Column(String(20), nullable=True)
    marcaciones_detalle = Column(Text, nullable=True)
    asistencia_incompleta = Column(Boolean, default=False)
    origen = Column(String)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ═══════════════════════════════════════════
# MODELO: COMENTARIOS AUXILIAR
# ═══════════════════════════════════════════

class ComentarioAuxiliar(Base):
    __tablename__ = "comentarios_auxiliar"

    id = Column(Integer, primary_key=True, index=True)
    dni = Column(String(20), index=True, nullable=False)
    nombre = Column(String(150), nullable=False)
    fecha = Column(Date, nullable=False)
    comentario = Column(Text, nullable=False)
    estado_revision = Column(String, default="pendiente")
    fecha_creacion = Column(DateTime, default=datetime.utcnow)


# ═══════════════════════════════════════════
# MODELO: OBSERVACIONES DE ASISTENCIA
# ═══════════════════════════════════════════

class Observacion(Base):
    __tablename__ = "observaciones"

    id = Column(Integer, primary_key=True, index=True)

    # Usuario que crea la observación
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    dni = Column(String(20), index=True, nullable=False)
    nombre = Column(String(150), nullable=False)

    # Información del área y supervisor
    area = Column(String(100), nullable=False, index=True)
    supervisor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    # Fecha de asistencia relacionada
    fecha_asistencia = Column(Date, nullable=False, index=True)

    # Tipo y contenido
    tipo = Column(String(50), nullable=False)  # Error en tareo, Falta justificada, etc.
    comentario = Column(Text, nullable=False)

    # Estado del flujo
    estado = Column(String(30), default="Pendiente", index=True)  # Pendiente, Revisado por Supervisor, Observado, Aprobado, Rechazado
    prioridad = Column(String(20), default="Baja")  # Alta, Media, Baja

    # Respuestas y auditoría
    respuesta_final_gdh = Column(Text, nullable=True)
    gdh_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    # Auditoría
    fecha_creacion = Column(DateTime, default=datetime.utcnow, index=True)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    mensajes = relationship("MensajeObservacion", back_populates="observacion", cascade="all, delete-orphan")
    archivos = relationship("ArchivoObservacion", back_populates="observacion", cascade="all, delete-orphan")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    supervisor = relationship("Usuario", foreign_keys=[supervisor_id])
    gdh = relationship("Usuario", foreign_keys=[gdh_id])


# ═══════════════════════════════════════════
# MODELO: MENSAJES DE OBSERVACIÓN (CHAT)
# ═══════════════════════════════════════════

class MensajeObservacion(Base):
    __tablename__ = "mensajes_observacion"

    id = Column(Integer, primary_key=True, index=True)
    observacion_id = Column(Integer, ForeignKey("observaciones.id"), nullable=False)

    # Remitente
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    nombre = Column(String(150), nullable=False)
    rol = Column(String(20), nullable=False)  # Auxiliar, Supervisor, GDH

    # Contenido
    mensaje = Column(Text, nullable=False)

    # Auditoría
    fecha = Column(DateTime, default=datetime.utcnow, index=True)

    # Relaciones
    observacion = relationship("Observacion", back_populates="mensajes")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])


# ═══════════════════════════════════════════
# MODELO: ARCHIVOS DE OBSERVACIÓN
# ═══════════════════════════════════════════

class ArchivoObservacion(Base):
    __tablename__ = "archivos_observacion"

    id = Column(Integer, primary_key=True, index=True)
    observacion_id = Column(Integer, ForeignKey("observaciones.id"), nullable=False)

    # Info del archivo
    nombre_archivo = Column(String(255), nullable=False)
    ruta = Column(String(500), nullable=False)
    tipo = Column(String(50), nullable=False)  # imagen, pdf, documento
    tamanio = Column(Integer, nullable=True)  # en bytes

    # Usuario que subió
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    nombre_usuario = Column(String(150), nullable=False)

    # Auditoría
    fecha_subida = Column(DateTime, default=datetime.utcnow, index=True)

    # Relaciones
    observacion = relationship("Observacion", back_populates="archivos")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
