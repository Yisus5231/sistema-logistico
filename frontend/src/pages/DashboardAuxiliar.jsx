import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Clock,
  MessageCircle,
  Megaphone,
} from "lucide-react";
import api from "../api";
import { getRolLabel } from "../auth";
import AnunciosLista from "../components/AnunciosLista";

export default function DashboardAuxiliar() {
  const user = api.getUser();
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const profileData = await api.getMiPerfil().catch(() => null);
      setPerfil(profileData);
    } catch (err) {
      console.error("Error cargando perfil:", err);
    } finally {
      setLoading(false);
    }
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  const quickActions = [
    { icon: Clock, label: "Calendario", to: "/calendario" },
    { icon: MessageCircle, label: "Observaciones", to: "/observaciones" },
  ];

  const formatearFecha = (fecha) => {
    if (!fecha) return "—";
    try {
      return new Date(fecha).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return fecha;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      
      {/* COLUMNA IZQUIERDA - 2 de 5 (40%) */}
      <div className="lg:col-span-2 space-y-6 p-6 lg:p-0">
        {/* Header */}
        <div>
          <p className="text-sm font-semibold text-[#e30613] uppercase tracking-wide">
            {greeting}, {user?.nombre?.split(" ")[0]}
          </p>
          <h1 className="text-4xl font-black text-gray-900 mt-1">Bienvenido</h1>
          <p className="text-gray-500 mt-2">{getRolLabel(user?.rol)}</p>
        </div>

        {/* Acciones Rápidas */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Acciones rápidas</h2>

          <div className="space-y-3">
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

        {/* Mi Perfil - Completo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Mi Perfil</h2>
          </div>

          <div className="p-6">
            {perfil ? (
              <div className="space-y-5">
                {/* Avatar y Nombre */}
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl font-black text-white">
                      {user?.nombre
                        ?.split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg leading-tight">
                    {perfil.nombre || user?.nombre}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {perfil.cargo || "Auxiliar"}
                    {perfil.area ? ` · ${perfil.area}` : ""}
                  </p>
                  {perfil.estado && (
                    <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                      {perfil.estado}
                    </span>
                  )}
                </div>

                {/* Info Detalles - Grid 2 columnas */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm border-t border-gray-100 pt-5">
                  <div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">DNI</p>
                    <p className="font-semibold text-gray-900">{perfil.dni || "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Cargo</p>
                    <p className="font-semibold text-gray-900">{perfil.cargo || "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Fecha de ingreso</p>
                    <p className="font-semibold text-gray-900">{formatearFecha(perfil.fecha_ingreso)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Cumpleaños</p>
                    <p className="font-semibold text-gray-900">{formatearFecha(perfil.fecha_cumpleanos)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Vacaciones pendientes</p>
                    <p className="font-semibold text-gray-900">
                      {perfil.vacaciones_pendientes ?? 0} días
                    </p>
                  </div>
                </div>

                {/* Botón Ver Detalles */}
                <button
                  onClick={() => navigate("/mi-perfil")}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition font-medium text-gray-700 text-sm flex items-center justify-center gap-2"
                >
                  Ver detalles
                  <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {loading ? "Cargando perfil..." : "No se pudo cargar el perfil"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COLUMNA DERECHA - 3 de 5 (60%) - Anuncios completos */}
      <div className="lg:col-span-3 p-6 lg:p-0">
        <div className="bg-white rounded-2xl border-2 border-red-500 shadow-sm flex flex-col h-full">
          <div className="p-6 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Megaphone size={20} className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Anuncios</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <AnunciosLista />
          </div>
        </div>
      </div>
    </div>
  );
}
