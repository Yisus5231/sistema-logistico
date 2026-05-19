import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle, Eye, ArrowLeft, FileText, Clock,
  CheckCircle, XCircle, Send, X, AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";
import ChatObservacion from "../components/ChatObservacion";

const StatusDot = ({ estado }) => {
  const colors = {
    Pendiente: "bg-yellow-400",
    "Revisado por Supervisor": "bg-blue-500",
    Observado: "bg-red-400",
    Aprobado: "bg-green-500",
    Rechazado: "bg-red-500",
  };
  return (
    <div className={`w-3 h-3 rounded-full ${colors[estado] || "bg-slate-300"}`} />
  );
};

const PriorityBadge = ({ prioridad }) => {
  const cls =
    prioridad === "Alta"
      ? "bg-red-50 text-red-700 border border-red-200"
      : prioridad === "Media"
      ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
      : "bg-green-50 text-green-700 border border-green-200";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {prioridad}
    </span>
  );
};

export default function ObservacionesGDH() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [observaciones, setObservaciones] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [stats, setStats] = useState(null);
  const [filtro, setFiltro] = useState(searchParams.get("estado") || null);
  const [accionPendiente, setAccionPendiente] = useState(null); // { id, accion }
  const [mensajeAccion, setMensajeAccion] = useState("");

  const cargarObservaciones = async (estado = null) => {
    setCargando(true);
    try {
      const data = await api.get(`/observaciones/mi-area${estado ? "?estado=" + estado : ""}`);
      setObservaciones(data || []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Error al cargar");
    } finally {
      setCargando(false);
    }
  };

  const cargarStats = async () => {
    try {
      const data = await api.get("/observaciones/estadisticas/mi-area");
      setStats(data);
    } catch (err) {
      console.error("Error al cargar estadísticas");
    }
  };

  useEffect(() => {
    cargarObservaciones(filtro);
    cargarStats();
  }, [filtro]);

  useEffect(() => {
    setFiltro(searchParams.get("estado") || null);
  }, [searchParams]);

  const handleAprobar = async (obsId, accion) => {
    try {
      await api.put(`/observaciones/${obsId}/aprobar`, {
        mensaje: mensajeAccion,
        accion,
      });
      toast.success(`Observación ${accion.toLowerCase()}`);
      setAccionPendiente(null);
      setMensajeAccion("");
      cargarObservaciones(filtro);
      cargarStats();
      setSeleccionada(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Error al procesar observación");
    }
  };

  const estaFinalizada = (estado) => {
    return estado === "Aprobado" || estado === "Rechazado";
  };

  const filtros = [null, "Pendiente", "Revisado por Supervisor", "Observado", "Aprobado", "Rechazado"];

  if (seleccionada) {
    return (
      <div className="h-full flex flex-col">
        <button
          onClick={() => { setSeleccionada(null); setAccionPendiente(null); setMensajeAccion(""); }}
          className="mb-4 flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition w-fit"
        >
          <ArrowLeft size={18} />
          Volver
        </button>
        <div className="flex-1">
          <ChatObservacion observacion={seleccionada} onRefresh={() => {
            cargarObservaciones(filtro);
            cargarStats();
          }} />
        </div>

        {/* Action buttons GDH */}
        {!estaFinalizada(seleccionada.estado) && (
          <div className="mt-4 space-y-3">
            {accionPendiente?.id === seleccionada.id ? (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  {accionPendiente.accion === "Aprobar" && "Mensaje de aprobación (opcional)"}
                  {accionPendiente.accion === "Rechazar" && "Motivo de rechazo"}
                  {accionPendiente.accion === "Observar" && "Observación a comunicar"}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mensajeAccion}
                    onChange={(e) => setMensajeAccion(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAprobar(seleccionada.id, accionPendiente.accion);
                      if (e.key === "Escape") { setAccionPendiente(null); setMensajeAccion(""); }
                    }}
                  />
                  <button
                    onClick={() => handleAprobar(seleccionada.id, accionPendiente.accion)}
                    className={`px-4 py-2.5 rounded-xl text-white transition font-medium ${
                      accionPendiente.accion === "Aprobar" ? "bg-green-500 hover:bg-green-600" :
                      accionPendiente.accion === "Rechazar" ? "bg-red-500 hover:bg-red-600" :
                      "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    <Send size={18} />
                  </button>
                  <button
                    onClick={() => { setAccionPendiente(null); setMensajeAccion(""); }}
                    className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                {seleccionada.estado !== "Aprobado" && (
                  <button
                    onClick={() => { setAccionPendiente({ id: seleccionada.id, accion: "Aprobar" }); setMensajeAccion(""); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-medium shadow-sm"
                  >
                    <CheckCircle size={18} />
                    Aprobar
                  </button>
                )}
                {seleccionada.estado !== "Rechazado" && (
                  <button
                    onClick={() => { setAccionPendiente({ id: seleccionada.id, accion: "Rechazar" }); setMensajeAccion(""); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium shadow-sm"
                  >
                    <XCircle size={18} />
                    Rechazar
                  </button>
                )}
                {seleccionada.estado !== "Observado" && (
                  <button
                    onClick={() => { setAccionPendiente({ id: seleccionada.id, accion: "Observar" }); setMensajeAccion(""); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium shadow-sm"
                  >
                    <AlertTriangle size={18} />
                    Observar
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {estaFinalizada(seleccionada.estado) && (
          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle size={20} className="text-blue-600" />
              <p className="text-blue-700 font-semibold">
                Observación {seleccionada.estado}
              </p>
            </div>
            <p className="text-blue-600 text-sm text-center mt-1">
              Esta observación ha sido finalizada y no se puede cambiar el estado.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Gestión Global de Observaciones</h1>
        <p className="text-slate-500 mt-1">Supervisa todas las observaciones del sistema</p>
      </div>

      {/* Estadísticas */}
      {stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <FileText size={20} className="text-slate-600" />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendientes}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Aprobadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.aprobadas}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <XCircle size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Rechazadas</p>
                <p className="text-2xl font-bold text-red-600">{stats.rechazadas}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Observadas</p>
                <p className="text-2xl font-bold text-red-600">{stats.observadas}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="animate-pulse flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-16" />
                  <div className="h-6 bg-slate-100 rounded w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {filtros.map((estado) => (
          <button
            key={estado || "todas"}
            onClick={() => {
              setFiltro(estado);
              const params = new URLSearchParams(searchParams);
              if (estado) params.set("estado", estado);
              else params.delete("estado");
              setSearchParams(params, { replace: true });
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filtro === estado
                ? "bg-red-500 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {estado || "Todas"}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-3 h-3 bg-slate-200 rounded-full" />
                <div className="flex-1 grid grid-cols-7 gap-4">
                  {[...Array(7)].map((_, j) => (
                    <div key={j} className="h-4 bg-slate-100 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : observaciones.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">No hay observaciones con este filtro</p>
            <p className="text-slate-400 text-sm mt-1">Prueba con otro filtro</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">DNI</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Trabajador</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Área</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Prioridad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {observaciones.map((obs) => (
                  <tr key={obs.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <StatusDot estado={obs.estado} />
                        <span className="text-xs text-slate-500 hidden lg:inline">{obs.estado}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {new Date(obs.fecha_asistencia).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500 font-mono">{obs.dni}</td>
                    <td className="px-4 py-3.5 text-sm font-medium text-slate-800">{obs.nombre}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{obs.area}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{obs.tipo}</td>
                    <td className="px-4 py-3.5">
                      <PriorityBadge prioridad={obs.prioridad} />
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setSeleccionada(obs)}
                        className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium flex items-center gap-1"
                      >
                        <Eye size={13} />
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
