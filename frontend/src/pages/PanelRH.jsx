import { useState, useRef, useEffect } from "react";
import { Upload, TrendingUp, Users, Clock, Zap, AlertCircle, CheckCircle, Activity, BarChart3, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

export default function PanelRH() {
  const [archivo, setArchivo] = useState(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  const [cargandoStats, setCargandoStats] = useState(true);
  const inputRef = useRef(null);
  const user = api.getUser();

  // Cargar estadísticas al montar
  useEffect(() => {
    cargarEstadisticas();
  }, []);

  // Recargar stats después de subir tareo
  useEffect(() => {
    if (resultado?.exitoso) {
      const timer = setTimeout(() => cargarEstadisticas(), 1000);
      return () => clearTimeout(timer);
    }
  }, [resultado]);

  const cargarEstadisticas = async () => {
    setCargandoStats(true);
    try {
      const stats = await api.get("/tareo/estadisticas");
      setEstadisticas(stats);
    } catch (err) {
      console.error("Error cargando estadísticas:", err);
    } finally {
      setCargandoStats(false);
    }
  };

  const handleArchivoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        toast.error("Solo se aceptan archivos Excel (.xlsx, .xls)");
        return;
      }
      setArchivo(file);
      setResultado(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      setArchivo(file);
      setResultado(null);
    } else {
      toast.error("Solo se aceptan archivos Excel (.xlsx, .xls)");
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
        toast.success("✅ Tareo sincronizado correctamente");
        setArchivo(null);
        if (inputRef.current) inputRef.current.value = "";
      } else {
        setResultado(res);
        toast.error("Error: " + (res.error || "Error desconocido"));
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || "Error al subir";
      setResultado({ error: errorMsg });
      toast.error(errorMsg);
    } finally {
      setCargando(false);
    }
  };

  if (user?.rol?.toLowerCase() !== "gdh") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="mx-auto mb-2 text-red-600" size={24} />
        <p className="text-red-700 font-semibold">Acceso Denegado</p>
        <p className="text-red-600 text-sm">Solo GDH puede acceder a este panel</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <BarChart3 size={20} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Panel RH - Gestión de Tareo</h1>
          <p className="text-sm text-slate-500">Sincroniza archivos y monitorea estadísticas en tiempo real</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA 1: Upload */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">📤 Subir Archivo de Tareo</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-1.5">
                  <CalendarDays size={14} />
                  Desde
                </span>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-1.5">
                  <CalendarDays size={14} />
                  Hasta
                </span>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </label>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition"
            >
              <Upload size={32} className="mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">Arrastra aquí tu archivo</p>
              <p className="text-xs text-slate-500">o haz clic para seleccionar</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleArchivoChange}
                hidden
              />
            </div>

            {archivo && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm font-medium text-green-700">✓ {archivo.name}</p>
                <p className="text-xs text-green-600">{(archivo.size / 1024).toFixed(1)} KB</p>
              </div>
            )}

            {archivo && (
              <button
                onClick={handleSubir}
                disabled={cargando}
                className="w-full bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cargando ? "Procesando..." : "Sincronizar"}
              </button>
            )}

            {resultado?.exitoso && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex gap-2 mb-2">
                  <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-green-700">Sincronización exitosa</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center p-2 bg-white rounded">
                    <p className="font-bold text-slate-800">{resultado.total || resultado.stats?.total || 0}</p>
                    <p className="text-slate-600">Procesados</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded">
                    <p className="font-bold text-green-600">{resultado.creados || resultado.stats?.creados || 0}</p>
                    <p className="text-slate-600">Nuevos</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded">
                    <p className="font-bold text-amber-600">{resultado.incompletos || 0}</p>
                    <p className="text-slate-600">Incompletos</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded">
                    <p className="font-bold text-slate-600">{resultado.omitidos_fuera_rango || 0}</p>
                    <p className="text-slate-600">Fuera rango</p>
                  </div>
                </div>
              </div>
            )}

            {resultado?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-700">Error en sincronización</p>
                <p className="text-xs text-red-600 mt-1">{resultado.error}</p>
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA 2-3: Estadísticas */}
        <div className="lg:col-span-2 space-y-4">
          {/* Cards de métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={Users}
              label="Asistido (Día)"
              value={estadisticas?.asistido_dia || 0}
              color="blue"
              loading={cargandoStats}
            />
            <StatCard
              icon={Clock}
              label="Asistido (Tarde)"
              value={estadisticas?.asistido_tarde || 0}
              color="orange"
              loading={cargandoStats}
            />
            <StatCard
              icon={Zap}
              label="Asistido (Noche)"
              value={estadisticas?.asistido_noche || 0}
              color="purple"
              loading={cargandoStats}
            />
            <StatCard
              icon={Activity}
              label="Vacaciones"
              value={estadisticas?.vacaciones || 0}
              color="green"
              loading={cargandoStats}
            />
          </div>

          {/* Cards adicionales */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={AlertCircle}
              label="Faltas"
              value={estadisticas?.faltas || 0}
              color="red"
              loading={cargandoStats}
              secondary
            />
            <StatCard
              icon={TrendingUp}
              label="Total Registros"
              value={estadisticas?.total_registros || 0}
              color="cyan"
              loading={cargandoStats}
              secondary
            />
          </div>

          {/* Tabla resumen si hay datos */}
          {estadisticas && !cargandoStats && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Resumen de Últimos 7 Días</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">Registros procesados hoy</span>
                  <span className="text-lg font-bold text-blue-600">{estadisticas?.registros_hoy || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">Último archivo procesado</span>
                  <span className="text-xs text-slate-600">
                    {estadisticas?.ultimo_archivo ? new Date(estadisticas.ultimo_archivo).toLocaleDateString("es-ES") : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = "slate", loading = false, secondary = false }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    green: "bg-green-50 text-green-600 border-green-100",
    red: "bg-red-50 text-red-600 border-red-100",
    cyan: "bg-cyan-50 text-cyan-600 border-cyan-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100",
  };

  return (
    <div className={`${colorMap[color]} border rounded-lg p-4 ${secondary ? "col-span-1" : ""}`}>
      {loading ? (
        <div className="h-12 bg-white/30 rounded animate-pulse" />
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <Icon size={20} />
          </div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs opacity-75 mt-1">{label}</p>
        </>
      )}
    </div>
  );
}
