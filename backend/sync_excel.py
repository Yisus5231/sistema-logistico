"""
Módulo de sincronización de Excel
Maneja la carga y sincronización automática de datos de colaboradores
"""

import pandas as pd
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session
from models import Usuario, HistorialCambios, SincronizacionExcel
import logging
import unicodedata

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════
# MAPEO DE CARGO → ROL (SIMPLE)
# ═══════════════════════════════════════════
# ROLES ÚNICOS: Supervisor, Lider, Auxiliar, Coordinador, gdh

CARGO_ROL_MAP = {
    "AUXILIAR DE ALMACEN": "Auxiliar",
    "LIDER DE OPERACIONES": "Lider",
    "SUPERVISOR DE OPERACIONES": "Supervisor",
    "COORDINADOR DE OPERACIONES": "Coordinador",
    "OPERARIO DE PICKING": "Auxiliar",
    "INVENTARIADOR": "Auxiliar",
    "ANALISTA DE CONTROL": "Auxiliar",
    "ASISTENTE DE CONTROL": "Auxiliar",
    "ASISTENTE DE OPERACIONES": "Auxiliar",
    "AUXILIAR DE CAMPANA": "Auxiliar",
    "OPERADOR DUAL": "Auxiliar",
    "OPERADOR DE APILADOR": "Auxiliar",
    "OPERADOR DE MONTACARGA": "Auxiliar",
    "OPERADOR APILADOR": "Auxiliar",
    "JEFE DE OPERACIONES": "gdh",
    "ASISTENTE DE INVENTARIO": "Auxiliar",
    "ASISTENTE DE GESTION HUMANA": "gdh",
    "PREVENCIONISTA DE RIESGO": "Auxiliar",
    "RESPONSABLE DE GESTION": "Auxiliar",
    "ANALISTA DE OPERACIONES": "Auxiliar",
    "CONSULTOR SELECCION JUNIOR 2": "Auxiliar",
    "COORDINADOR DE ASEGURAMIENTO DE LA CALIDAD": "Auxiliar",
    "SUPERVISOR SSOMA": "Supervisor",
    "ASISTENTE SSOMA": "Auxiliar",
}

AREA_FINAL_MAP = {
    "AMR": "Amr",
    "SORTER": "Sorter",
    "ADAPTO": "Adapto",
    "ALMACENAJE": "Almacenaje",
    "DESPACHO": "Despacho",
    "ECOMMERCE": "Ecommerce",
    "PICKING CASES": "Picking Cases",
    "ESTIBA": "Estiba",
    "INVENTARIO": "Inventario",
    "PICKING PANTERA": "Picking",
    "PICKING ELECTRO": "Picking",
    "ELECTRO-CROSS": "Recepcion Electro",
    "IMPORTADOS": "Recepcion Importados",
    "NACIONAL - FC": "Recepcion Nacional",
    "UULL": "Recepcion Uull",
    "OPERADORES": "Operadores",
    "GDH": "Gdh",
    "SSOMA": "Ssoma",
}


def normalizar_cargo(cargo: str) -> str:
    if not cargo:
        return ""
    texto = unicodedata.normalize("NFKD", str(cargo).strip())
    texto = "".join(char for char in texto if not unicodedata.combining(char))
    return " ".join(texto.upper().split())


def obtener_area_final(area: str) -> str:
    if not area:
        return ""
    area_key = normalizar_cargo(area)
    return AREA_FINAL_MAP.get(area_key, str(area).strip().title())


def obtener_rol_por_cargo(cargo: str) -> str:
    """
    Mapea un cargo a su rol correspondiente de forma simple.

    Lógica:
    - Si cargo contiene "Supervisor" → "Supervisor"
    - Si cargo contiene "Lider" o "Líder" → "Lider"
    - Si cargo contiene "Coordinador" → "Coordinador"
    - Si no coincide → "Auxiliar" (default)

    Args:
        cargo: String del cargo del usuario

    Returns:
        str: "Supervisor" | "Lider" | "Coordinador" | "Auxiliar"
    """
    if not cargo:
        return "Auxiliar"

    cargo_key = normalizar_cargo(cargo)
    if cargo_key in CARGO_ROL_MAP:
        return CARGO_ROL_MAP[cargo_key]

    cargo_lower = cargo_key.lower()

    # SUPERVISOR
    if "supervisor" in cargo_lower:
        return "Supervisor"

    # LIDER
    if "lider" in cargo_lower or "líder" in cargo_lower or "leader" in cargo_lower:
        return "Lider"

    # COORDINADOR
    if "coordinador" in cargo_lower or "coordinator" in cargo_lower:
        return "Coordinador"

    # DEFAULT: AUXILIAR
    return "Auxiliar"


class SincronizadorExcel:
    """Sincroniza datos de Excel con la base de datos"""

    def __init__(self, db: Session):
        self.db = db
        self.stats = {
            "total": 0,
            "creados": 0,
            "actualizados": 0,
            "inactivados": 0,
            "reactivados": 0,
            "errores": []
        }

    def sincronizar(self, archivo_path: str, usuario_gdh_id: int) -> dict:
        """
        Sincroniza un archivo Excel con la base de datos

        Proceso:
        1. Lee el Excel
        2. Valida estructura
        3. Procesa cada fila
        4. Inactiva ausentes
        5. Registra en auditoría
        """
        try:
            # Leer Excel
            df = pd.read_excel(archivo_path)
            print(f"✅ Excel leído: {len(df)} registros")

            # Validar columnas requeridas
            columnas_requeridas = ["Estado", "DNI", "Nombre", "Cargo", "Área",
                                  "Fecha Cumple", "Fecha Ingreso"]
            columnas_faltantes = [col for col in columnas_requeridas if col not in df.columns]

            if columnas_faltantes:
                return {
                    "exitoso": False,
                    "error": f"Columnas faltantes: {', '.join(columnas_faltantes)}",
                    "columnas_encontradas": list(df.columns)
                }

            # Procesar filas
            dnis_excel = set()

            for idx, row in df.iterrows():
                try:
                    dni = str(row["DNI"]).strip()
                    estado = str(row["Estado"]).strip().lower()
                    nombre = str(row["Nombre"]).strip()
                    cargo = str(row["Cargo"]).strip()
                    area = str(row["Área"]).strip()

                    area = obtener_area_final(area)

                    # Validar DNI
                    if not dni or dni == "nan" or dni == "":
                        continue

                    dnis_excel.add(dni)

                    # Parsear fechas
                    fecha_cumpleanos = self._parse_fecha(row.get("Fecha Cumple"))
                    fecha_ingreso = self._parse_fecha(row.get("Fecha Ingreso"))

                    # Buscar usuario existente
                    usuario = self.db.query(Usuario).filter(Usuario.dni == dni).first()

                    if usuario:
                        # ✏️ ACTUALIZAR USUARIO EXISTENTE
                        cambios_detectados = False

                        # Nombre
                        if usuario.nombre != nombre:
                            self._registrar_cambio(usuario, "nombre", usuario.nombre, nombre, usuario_gdh_id, "carga_excel")
                            usuario.nombre = nombre
                            cambios_detectados = True

                        # Cargo (y rol asociado)
                        if usuario.cargo != cargo:
                            self._registrar_cambio(usuario, "cargo", usuario.cargo, cargo, usuario_gdh_id, "carga_excel")
                            usuario.cargo = cargo

                            # Actualizar rol automáticamente basado en el cargo
                            rol_nuevo = obtener_rol_por_cargo(cargo)
                            if usuario.rol != rol_nuevo:
                                self._registrar_cambio(usuario, "rol", usuario.rol, rol_nuevo, usuario_gdh_id, "carga_excel",
                                                     f"Rol actualizado automáticamente por cambio de cargo")
                                usuario.rol = rol_nuevo

                            cambios_detectados = True

                        # Área
                        if usuario.area != area:
                            self._registrar_cambio(usuario, "area", usuario.area, area, usuario_gdh_id, "carga_excel")
                            usuario.area = area
                            cambios_detectados = True

                        # Fecha de cumpleaños
                        if usuario.fecha_cumpleanos != fecha_cumpleanos:
                            self._registrar_cambio(usuario, "fecha_cumpleanos",
                                                  str(usuario.fecha_cumpleanos), str(fecha_cumpleanos),
                                                  usuario_gdh_id, "carga_excel")
                            usuario.fecha_cumpleanos = fecha_cumpleanos
                            cambios_detectados = True

                        # Estado: reactivar si estaba inactivo
                        if usuario.estado == "inactivo" and estado in ["activo", "vigente"]:
                            self._registrar_cambio(usuario, "estado", "inactivo", "activo",
                                                  usuario_gdh_id, "reactivacion",
                                                  "Reactivado automáticamente (reaparece en Excel)")
                            usuario.estado = "activo"
                            self.stats["reactivados"] += 1
                            cambios_detectados = True

                        if cambios_detectados:
                            self.stats["actualizados"] += 1
                            usuario.fecha_ultima_modificacion = datetime.utcnow()

                    else:
                        # ➕ CREAR NUEVO USUARIO
                        # Asignar rol automáticamente basado en el cargo
                        rol_asignado = obtener_rol_por_cargo(cargo)

                        usuario = Usuario(
                            dni=dni,
                            nombre=nombre,
                            cargo=cargo,
                            area=area,
                            usuario=dni,
                            password="adecco2026",
                            primer_acceso=True,
                            rol=rol_asignado,  # ✅ Asignado automáticamente
                            estado="activo",
                            fecha_ingreso=fecha_ingreso,
                            fecha_cumpleanos=fecha_cumpleanos,
                        )
                        self.db.add(usuario)
                        self.db.flush()

                        # Registrar creación
                        self._registrar_cambio(usuario, "creacion", None, dni,
                                             usuario_gdh_id, "carga_excel",
                                             f"Usuario creado automáticamente desde Excel | Cargo: {cargo} | Rol asignado: {rol_asignado}")

                        self.stats["creados"] += 1

                    self.stats["total"] += 1

                except Exception as e:
                    error_msg = f"Fila {idx + 2}: {str(e)}"
                    self.stats["errores"].append(error_msg)
                    logger.error(error_msg)

            # ❌ INACTIVAR USUARIOS NO PRESENTES EN EXCEL (excepto GDH)
            usuarios_activos = self.db.query(Usuario).filter(Usuario.estado == "activo").all()
            for usuario in usuarios_activos:
                if usuario.dni not in dnis_excel and usuario.rol != "gdh":
                    self._registrar_cambio(usuario, "estado", "activo", "inactivo",
                                         usuario_gdh_id, "carga_excel",
                                         "Inactivado: no aparece en Excel")
                    usuario.estado = "inactivo"
                    self.stats["inactivados"] += 1

            # Guardar cambios
            self.db.commit()

            # Registrar sincronización
            sync = SincronizacionExcel(
                fecha_carga=datetime.utcnow(),
                usuario_que_cargo="gdh",
                nombre_archivo="datos_personal.xlsx",
                total_registros=self.stats["total"],
                usuarios_creados=self.stats["creados"],
                usuarios_actualizados=self.stats["actualizados"],
                usuarios_inactivados=self.stats["inactivados"],
                estado="exitosa" if not self.stats["errores"] else "parcial",
                log_errores=str(self.stats["errores"]) if self.stats["errores"] else None
            )
            self.db.add(sync)
            self.db.commit()

            return {
                "exitoso": True,
                "stats": self.stats
            }

        except Exception as e:
            logger.error(f"Error en sincronización: {e}")
            return {
                "exitoso": False,
                "error": str(e)
            }

    def _parse_fecha(self, valor) -> date:
        """Parsea una fecha desde el Excel"""
        if pd.isna(valor) or valor is None or valor == "":
            return None

        try:
            if isinstance(valor, str):
                # Intentar diferentes formatos
                for fmt in ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"]:
                    try:
                        return datetime.strptime(valor, fmt).date()
                    except:
                        continue
                # Si falla, intentar con pandas
                return pd.to_datetime(valor).date()
            else:
                # Si ya es datetime/date
                if hasattr(valor, "date"):
                    return valor.date()
                return valor
        except:
            return None

    def _registrar_cambio(self, usuario: Usuario, campo: str, valor_anterior, valor_nuevo,
                         usuario_gdh_id: int, tipo_cambio: str, descripcion: str = None):
        """Registra un cambio en el historial"""
        cambio = HistorialCambios(
            usuario_id=usuario.id,
            usuario_que_cambio_id=usuario_gdh_id,
            campo=campo,
            valor_anterior=str(valor_anterior) if valor_anterior is not None else "—",
            valor_nuevo=str(valor_nuevo) if valor_nuevo is not None else "—",
            tipo_cambio=tipo_cambio,
            descripcion=descripcion or f"{campo} cambió a '{valor_nuevo}'"
        )
        self.db.add(cambio)


def calcular_vacaciones_acumuladas(fecha_ingreso: date) -> float:
    """
    Calcula vacaciones acumuladas
    Regla: 2.5 días por mes desde fecha de ingreso
    """
    if not fecha_ingreso:
        return 0

    hoy = date.today()
    if hoy < fecha_ingreso:
        return 0

    # Calcular meses transcurridos
    months = (hoy.year - fecha_ingreso.year) * 12 + (hoy.month - fecha_ingreso.month)

    # 2.5 días por mes
    return round(months * 2.5, 2)
