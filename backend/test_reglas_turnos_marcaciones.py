import unittest

from reglas_turnos import determinar_turno


class ReglasTurnosMarcacionesTest(unittest.TestCase):
    def test_turno_noche_cuando_primera_es_salida_y_ultima_es_ingreso(self):
        self.assertEqual(determinar_turno("06:10:00", "20:55:00"), "N")
        self.assertEqual(determinar_turno("06:45:00", "20:55:00"), "N")

    def test_salida_temprana_sola_no_acredita_turno_noche(self):
        self.assertEqual(determinar_turno("06:15:00", None), "F")

    def test_turno_noche_con_ingreso_en_primera(self):
        self.assertEqual(determinar_turno("21:00:00", "2"), "N")

    def test_turno_manana_empieza_desde_las_seis_y_media(self):
        self.assertEqual(determinar_turno("06:30:00", "16:00:00"), "M")
        self.assertEqual(determinar_turno("09:00:00", "16:00:00"), "M")

    def test_turno_tarde_no_se_confunde_con_ingreso_noche(self):
        self.assertEqual(determinar_turno("13:10:00", "22:40:00"), "T")
        self.assertEqual(determinar_turno("14:15:00", "23:10:00"), "T")

    def test_marcacion_fuera_de_los_rangos_es_falta(self):
        self.assertEqual(determinar_turno("11:00:00", "16:00:00"), "F")


if __name__ == "__main__":
    unittest.main()
