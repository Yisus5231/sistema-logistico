import { useState, useRef } from "react";
import { Upload, AlertCircle, CheckCircle, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

export default function TareoUpload() {
  const [archivo, setArchivo] = useState(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const inputRef = useRef(null);
  const user = api.getUser();

  if (user?.rol !== "gdh") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700 font-semibold">Acceso Denegado</p>
        <p className="text-red-600">Solo GDH puede subir archivos de tareo</p>
      </div>
    );
  }

  const handleArchivoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (
        !file.name.endsWith(".xlsx") &&
        !file.name.endsWith(".xls") &&
        !file.name.endsWith(".csv")
      ) {
        toast.error("Solo se aceptan archivos Excel (.xlsx, .xls) o CSV");
        return;
      }
      setArchivo(file);
      setResultado(null);
    }
  };

  const handleSubir = async () => {
    if (!archivo) {
      toast.error("Selecciona un archivo");
      return;
    }
    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
      toast.error("La fecha desde no puede ser mayor que la fecha hasta");
      return;
    }

    setCargando(true);
    try {
      const res = await api.subirTareoExcel(archivo, fechaInicio, fechaFin);

      if (res.exitoso) {
        setResultado(res);
        toast.success("Archivo subido correctamente");
        setArchivo(null);
        if (inputRef.current) inputRef.current.value = "";
      } else if (res.error) {
        setResultado(res);
        toast.error("Error: " + res.error);
      } else {
        setResultado({ error: "Error desconocido al procesar archivo" });
        toast.error("Error al subir archivo");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message || "Error al subir archivo";
      setResultado({ error: errorMsg });
      toast.error(errorMsg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">📤 Subir Tareo</h1>
        <p className="text-gray-600 mb-6">
          Sube archivos Excel con datos de asistencia y horarios
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <CalendarDays size={16} />
              Desde
            </span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <CalendarDays size={16} />
              Hasta
            </span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </label>
        </div>

        {/* Area de Carga */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-red-500 transition">
          <Upload size={40} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-700 font-semibold mb-2">
            Arrastra tu archivo aquí o haz clic para seleccionar
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Formatos soportados: Excel (.xlsx, .xls)
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleArchivoChange}
            hidden
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Seleccionar Archivo
          </button>
        </div>

        {/* Archivo Seleccionado */}
        {archivo && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
            <div>
              <p className="font-semibold text-gray-800">{archivo.name}</p>
              <p className="text-sm text-gray-600">
                {(archivo.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <button
              onClick={() => {
                setArchivo(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Botón Subir */}
        <button
          onClick={handleSubir}
          disabled={!archivo || cargando}
          className="w-full mt-6 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
        >
          <Upload size={18} />
          {cargando ? "Subiendo..." : "Subir Archivo"}
        </button>
      </div>

      {/* Resultado */}
      {resultado && (
        resultado.error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle size={24} className="text-red-600" />
              <h3 className="text-lg font-bold text-red-800">Error en la Carga</h3>
            </div>
            <p className="text-red-700 text-sm mb-3">{resultado.error}</p>
            {resultado.columnas_encontradas && (
              <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
                <p className="font-semibold mb-1">Columnas encontradas:</p>
                <p>{resultado.columnas_encontradas.join(", ")}</p>
              </div>
            )}
          </div>
        ) : resultado.exitoso ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle size={24} className="text-green-600" />
              <h3 className="text-lg font-bold text-green-800">Carga Exitosa</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Creados</p>
                <p className="text-2xl font-bold text-blue-600">
                  {resultado.creados || 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Actualizados</p>
                <p className="text-2xl font-bold text-purple-600">
                  {resultado.actualizados || 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Incompletos</p>
                <p className="text-2xl font-bold text-amber-600">
                  {resultado.incompletos || 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Fuera de rango</p>
                <p className="text-2xl font-bold text-gray-600">
                  {resultado.omitidos_fuera_rango || 0}
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Se procesaron <strong>{(resultado.creados || 0) + (resultado.actualizados || 0)}</strong> registros de tareo exitosamente.
              </p>
            </div>

            {resultado.errores && resultado.errores.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-semibold text-yellow-800 mb-2">Advertencias:</p>
                <ul className="text-xs text-yellow-700 space-y-1">
                  {resultado.errores.slice(0, 5).map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                  {resultado.errores.length > 5 && (
                    <li>... y {resultado.errores.length - 5} más</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        ) : null
      )}

      {/* Instrucciones */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-bold text-gray-800 mb-3">📋 Formato del Archivo</h3>
        <p className="text-sm text-gray-700 mb-3">
          Tu archivo Excel debe tener las siguientes columnas:
        </p>
        <ul className="text-sm text-gray-600 space-y-2 ml-4">
          <li>• <strong>Empleado</strong> - Nombre completo del colaborador (o similar)</li>
          <li>• <strong>Identificación</strong> - DNI/Documento de identidad (ej: 12345678)</li>
          <li>• <strong>Fecha</strong> - Fecha del registro (formato DD/MM/YYYY)</li>
          <li>• <strong>Primera</strong> - Primera marcación del día; para turno noche puede ser la salida de la mañana</li>
          <li>• <strong>Última</strong> - Última marcación del día; para turno noche puede ser el ingreso nocturno</li>
        </ul>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-800 mb-2">✨ Asistencia Automática:</p>
          <p className="text-xs text-blue-700 mb-2">
            El sistema calcula automáticamente el turno interpretando las marcaciones del día:
          </p>
          <ul className="text-xs text-blue-700 ml-4 space-y-1">
            <li>• <strong>M</strong> (Mañana): Primera marcación entre 06:30 y 09:00</li>
            <li>• <strong>T</strong> (Tarde): Primera marcación entre 13:00 y 14:59</li>
            <li>• <strong>N</strong> (Noche): Ingreso registrado desde 18:30</li>
            <li>• <strong>F</strong> (Falta): Sin marcación o fuera de rango</li>
            <li>• <strong>Especial:</strong> Si la última marcación es desde 18:30, prevalece turno noche aunque la primera sea por la mañana</li>
            <li>• <strong>Salida nocturna:</strong> Una primera marcación entre 06:00 y 06:29 no acredita por sí sola un turno del día</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-semibold text-green-800 mb-2">📊 Resultado:</p>
          <p className="text-xs text-green-700">
            Después de procesar, verás el total de registros creados/actualizados y las estadísticas de asistencia en Panel RH.
          </p>
        </div>
      </div>
    </div>
  );
}
