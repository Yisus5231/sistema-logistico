"""Reglas para asignar turno a partir del reporte de primera/ultima marcacion.

El reporte diario no siempre entrega entrada y salida de una unica jornada:
para el turno noche, ``Primera`` puede ser la salida de la madrugada y
``Ultima`` puede ser la nueva entrada nocturna del mismo dia.
"""

from datetime import datetime, time


MANANA_DESDE = time(6, 30)
MANANA_HASTA = time(9, 0)
TARDE_DESDE = time(13, 0)
TARDE_HASTA = time(14, 59, 59)
NOCHE_INGRESO_DESDE = time(18, 30)
FIN_DIA = time(23, 59, 59)
NOCHE_SALIDA_DESDE = time(6, 0)
NOCHE_SALIDA_HASTA = time(6, 29, 59)


def _parse_hora(value):
    if isinstance(value, time):
        return value
    if not isinstance(value, str) or not value.strip():
        return None
    for formato in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(value.strip(), formato).time()
        except ValueError:
            continue
    return None


def _entre(value, desde, hasta):
    return value is not None and desde <= value <= hasta


def determinar_turno(primera_marcacion: str, ultima_marcacion: str = None) -> str:
    """Retorna ``M``, ``T``, ``N`` o ``F`` para una fila del reporte diario.

    La tarde se evalua primero porque una salida tarde a las 22:00 o 23:00
    tambien cae en el rango horario de ingreso nocturno. Luego la noche tiene
    prioridad sobre manana para corregir filas como ``06:10 -> 20:55``.
    """

    primera = _parse_hora(primera_marcacion)
    ultima = _parse_hora(ultima_marcacion)

    if _entre(primera, TARDE_DESDE, TARDE_HASTA):
        return "T"

    ingreso_noche = (
        _entre(primera, NOCHE_INGRESO_DESDE, FIN_DIA)
        or _entre(ultima, NOCHE_INGRESO_DESDE, FIN_DIA)
    )
    salida_noche = _entre(primera, NOCHE_SALIDA_DESDE, NOCHE_SALIDA_HASTA)
    if ingreso_noche or salida_noche:
        return "N"

    if _entre(primera, MANANA_DESDE, MANANA_HASTA):
        return "M"

    return "F"


def procesar_registros_tareo(registros: list) -> list:
    """Agrega el codigo de asistencia a registros con ``primera`` y ``ultima``."""

    for registro in registros:
        registro["asistencia"] = determinar_turno(
            registro.get("primera") or registro.get("hora_entrada") or "",
            registro.get("ultima") or registro.get("hora_salida") or None,
        )
    return registros
