"""Reglas para asignar el turno usando la primera marcacion del dia."""

from datetime import datetime, time


MANANA_DESDE = time(6, 0)
MANANA_HASTA = time(12, 59, 59)
TARDE_DESDE = time(13, 0)
TARDE_HASTA = time(15, 59, 59)
NOCHE_DESDE = time(18, 0)
NOCHE_MADRUGADA_HASTA = time(1, 59, 59)
FIN_DIA = time(23, 59, 59)


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
    """Retorna el turno segun la primera marcacion.

    ``F`` se usa solamente cuando no existe una primera marcacion valida. Una
    marcacion real fuera de los rangos configurados conserva la asistencia con
    el codigo generico ``A`` para no convertirla incorrectamente en falta.
    ``ultima_marcacion`` se mantiene por compatibilidad con los consumidores.
    """

    primera = _parse_hora(primera_marcacion)

    if primera is None:
        return "F"
    if _entre(primera, MANANA_DESDE, MANANA_HASTA):
        return "M"
    if _entre(primera, TARDE_DESDE, TARDE_HASTA):
        return "T"
    if _entre(primera, NOCHE_DESDE, FIN_DIA) or primera <= NOCHE_MADRUGADA_HASTA:
        return "N"
    return "A"


def procesar_registros_tareo(registros: list) -> list:
    """Agrega el codigo de asistencia a registros con marcaciones."""

    for registro in registros:
        registro["asistencia"] = determinar_turno(
            registro.get("primera") or registro.get("hora_entrada") or "",
            registro.get("ultima") or registro.get("hora_salida") or None,
        )
    return registros