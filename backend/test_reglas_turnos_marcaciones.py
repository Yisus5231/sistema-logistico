import unittest

from reglas_turnos import determinar_turno


class ReglasTurnosMarcacionesTest(unittest.TestCase):
    def test_turno_manana_se_determina_por_primera_marcacion(self):
        self.assertEqual(determinar_turno("06:00:00", None), "M")
        self.assertEqual(determinar_turno("12:59:59", "22:00:00"), "M")

    def test_turno_tarde_se_determina_por_primera_marcacion(self):
        self.assertEqual(determinar_turno("13:00:00", None), "T")
        self.assertEqual(determinar_turno("15:59:59", "23:10:00"), "T")

    def test_turno_noche_incluye_madrugada(self):
        self.assertEqual(determinar_turno("18:00:00", None), "N")
        self.assertEqual(determinar_turno("23:59:59", None), "N")
        self.assertEqual(determinar_turno("00:00:00", None), "N")
        self.assertEqual(determinar_turno("01:59:59", None), "N")

    def test_ultima_marcacion_no_cambia_el_turno(self):
        self.assertEqual(determinar_turno("06:30:00", "20:55:00"), "M")
        self.assertEqual(determinar_turno("13:30:00", "22:40:00"), "T")

    def test_sin_primera_marcacion_es_falta(self):
        self.assertEqual(determinar_turno(None, None), "F")
        self.assertEqual(determinar_turno("", "20:00:00"), "F")
        self.assertEqual(determinar_turno("hora invalida", None), "F")

    def test_marcacion_fuera_de_rango_sigue_siendo_asistencia(self):
        for hora in ("02:00:00", "05:59:59", "16:00:00", "17:59:59"):
            with self.subTest(hora=hora):
                self.assertEqual(determinar_turno(hora, None), "A")


if __name__ == "__main__":
    unittest.main()