import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Clock,
  CheckCircle2,
  History,
  MessageCircle,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  AlertCircle,
  BarChart3,
  Zap,
  CheckCircle,
  Megaphone,
  Heart,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";
import { getRolLabel } from "../auth";

export default function Dashboard() {
  const user = api.getUser();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [tareoStats, setTareoStats] = useState(null);
  const [anuncios, setAnuncios] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Upload state
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const inputRef = useRef(null);

  const isGDH = user?.rol?.toLowerCase() === "gdh";

  // Cargar datos al montar
  useEffect(() => {
    loadData();
  }, []);

  // Recargar stats después de subir tareo
  useEffect(() => {
    if (resultado?.exitoso) {
      const timer = setTimeout(() => loadData(), 1000);
      return () => clearTimeout(timer);
    }
  }, [resultado]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashStats, profileData, anunciosList] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getMiPerfil().catch(() => null),
        api.getAnuncios?.().catch(() => []),
      ]);
      setStats(dashStats);
      setPerfil(profileData);
      setAnuncios(anunciosList || []);

      if (isGDH) {
        const tareoStats = await api.get("/tareo/estadisticas").catch(() => null);
        setTareoStats(tareoStats);
      }
    } catch (err) {
      setError(err.normalized?.message || "Error al cargar datos");
    } finally {
      setLoading(false);
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

    setCargando(true);
    try {
      const res = await api.subirTareoExcel(archivo);
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

  const role = user?.rol?.toLowerCase();
  const isSupervisor = ["supervisor", "lider", "coordinador"].includes(role);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  // Métricas para GDH
  const gdkMetrics = useMemo(() => {
    if (!stats) return [];
    return [
      { icon: UserCheck, label: "Activos", value: stats.activos ?? 0, color: "emerald", to: "/colaboradores" },
      { icon: Users, label: "Total", value: stats.inactivos ?? 0, color: "slate", to: "/colaboradores" },
      { icon: Building2, label: "Areas", value: stats.areas ?? 0, color: "blue", to: "/colaboradores" },
      { icon: AlertCircle, label: "Pendientes", value: stats.obs_pendientes ?? 0, color: "red", to: "/observaciones-gdh" },
    ];
  }, [stats]);

  const tareoMetrics = useMemo(() => {
    if (!tareoStats) return [];
    return [
      { icon: TrendingUp, label: "Mañana", value: tareoStats.mañana ?? 0, color: "amber" },
      { icon: Clock, label: "Tarde", value: tareoStats.tarde ?? 0, color: "orange" },
      { icon: Zap, label: "Noche", value: tareoStats.noche ?? 0, color: "indigo" },
      { icon: AlertCircle, label: "Faltas", value: tareoStats.faltas ?? 0, color: "red" },
    ];
  }, [tareoStats]);

  // Acciones rápidas
  const quickActions = useMemo(() => {
    if (isGDH) {
      return [
        { icon: Upload, label: "Sincronizar usuarios", to: "/subir-excel", color: "blue" },
        { icon: Users, label: "Ver colaboradores", to: "/colaboradores", color: "slate" },
        { icon: Clock, label: "Registro de tareo", to: "/tareo", color: "emerald" },
        { icon: History, label: "Ver historial", to: "/historial", color: "purple" },
      ];
    }

    if (isSupervisor) {
      return [
        { icon: Users, label: "Mi equipo", to: "/personal", color: "blue" },
        { icon: MessageCircle, label: "Observaciones", to: "/observaciones-supervisor", color: "red" },
      ];
    }

    return [
      { icon: Clock, label: "Mi tareo", to: "/calendario", color: "blue" },
      { icon: MessageCircle, label: "Observaciones", to: "/observaciones", color: "red" },
    ];
  }, [isGDH, isSupervisor]);

  if (error && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-[#e30613] uppercase tracking-wide">
          {greeting}, {user?.nombre?.split(" ")[0]}
        </p>
        <h1 className="text-4xl font-black text-gray-900 mt-1">
          {isGDH ? "Panel de Control" : "Bienvenido"}
        </h1>
        <p className="text-gray-500 mt-2">
          {isGDH
            ? "Gestiona colaboradores, tareos y observaciones"
            : `${getRolLabel(user?.rol)}`}
        </p>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* COLUMNA IZQUIERDA - Anuncios (1 col) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-fit">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Megaphone size={20} className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Anuncios</h2>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {anuncios && anuncios.length > 0 ? (
                anuncios.slice(0, 5).map((anuncio, idx) => (
                  <div
                    key={idx}
                    className="p-3 border-l-4 border-red-500 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition"
                  >
                    <p className="font-semibold text-gray-900 text-sm">{anuncio.titulo || "Sin título"}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {anuncio.contenido || "Sin contenido"}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {anuncio.fecha_creacion
                        ? new Date(anuncio.fecha_creacion).toLocaleDateString()
                        : "Sin fecha"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Megaphone size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">Sin anuncios</p>
                </div>
              )}
            </div>

            {anuncios && anuncios.length > 5 && (
              <button
                onClick={() => navigate("/anuncios")}
                className="w-full mt-4 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition font-medium text-gray-700 text-sm"
              >
                Ver todos
              </button>
            )}
          </div>
        </div>

        {/* COLUMNA CENTRAL - Métricas, Upload, Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Métricas de Colaboradores (GDH) */}
          {isGDH && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Users size={20} className="text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Colaboradores</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {gdkMetrics.map((metric, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(metric.to)}
                    className="p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition group cursor-pointer text-left"
                  >
                    <p className="text-xs font-medium text-gray-500">
                      {metric.label}
                    </p>
                    <p className="text-2xl font-black text-gray-900 mt-1">
                      {metric.value.toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sección de Upload (GDH) */}
          {isGDH && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Upload size={20} className="text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Sincronizar Tareo</h2>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition group"
              >
                <div className="flex justify-center mb-4">
                  <Upload size={32} className="text-gray-400 group-hover:text-red-600 transition" />
                </div>
                <p className="font-semibold text-gray-900">Arrastra tu Excel aquí</p>
                <p className="text-sm text-gray-500 mt-1">o haz clic para seleccionar</p>
                <p className="text-xs text-gray-400 mt-2">Formato: .xlsx, .xls</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleArchivoChange}
                  hidden
                />
              </div>

              {archivo && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                  <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-emerald-900 truncate">{archivo.name}</p>
                    <p className="text-xs text-emerald-700">{(archivo.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={() => {
                      setArchivo(null);
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                    className="text-emerald-600 hover:text-emerald-700 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {archivo && (
                <button
                  onClick={handleSubir}
                  disabled={cargando}
                  className="w-full mt-4 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {cargando ? "Procesando..." : "Sincronizar"}
                </button>
              )}

              {resultado?.exitoso && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <p className="font-semibold text-emerald-900">Sincronización exitosa</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-emerald-700 font-medium">{resultado.creados || 0}</p>
                      <p className="text-xs text-emerald-600">Creados</p>
                    </div>
                    <div>
                      <p className="text-emerald-700 font-medium">{resultado.actualizados || 0}</p>
                      <p className="text-xs text-emerald-600">Actualizados</p>
                    </div>
                    <div>
                      <p className="text-emerald-700 font-medium">{resultado.errores?.length || 0}</p>
                      <p className="text-xs text-emerald-600">Errores</p>
                    </div>
                  </div>
                </div>
              )}

              {resultado?.error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{resultado.error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA - Perfil, Stats, Acciones */}
        <div className="lg:col-span-1 space-y-6">
          {/* Perfil Card */}
          {perfil && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-black text-white">
                    {user?.nombre
                      ?.split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">{perfil.nombre || user?.nombre}</h3>
                <p className="text-sm text-gray-500">{getRolLabel(user?.rol)}</p>
                {perfil.estado && (
                  <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                    {perfil.estado}
                  </span>
                )}
              </div>

              <div className="space-y-3 text-sm border-t border-gray-100 pt-4">
                {perfil.dni && (
                  <div>
                    <p className="text-gray-500 text-xs font-medium">DNI</p>
                    <p className="font-semibold text-gray-900">{perfil.dni}</p>
                  </div>
                )}
                {perfil.cargo && (
                  <div>
                    <p className="text-gray-500 text-xs font-medium">CARGO</p>
                    <p className="font-semibold text-gray-900">{perfil.cargo}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate("/mi-perfil")}
                className="w-full mt-4 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition font-medium text-gray-700 text-sm flex items-center justify-center gap-2"
              >
                Ver detalles
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Tareo Stats (GDH) */}
          {isGDH && tareoStats && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <BarChart3 size={20} className="text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Asistencia</h2>
              </div>

              <div className="space-y-3">
                {tareoMetrics.map((metric, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-600">{metric.label}</p>
                      <p className="text-lg font-black text-gray-900">
                        {metric.value.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate("/tareo")}
                className="w-full mt-4 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition font-medium text-gray-700 text-sm flex items-center justify-center gap-2"
              >
                Ver detalles
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Acciones Rápidas */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Acciones rápidas</h2>

            <div className="space-y-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(action.to)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition group"
                >
                  <action.icon size={18} className="text-gray-600" />
                  <span className="font-medium text-gray-900 text-sm flex-1 text-left">{action.label}</span>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
