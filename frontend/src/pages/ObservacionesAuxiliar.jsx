import { useState, useEffect } from "react";
import { Plus, MessageCircle, ArrowLeft, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
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

export default function ObservacionesAuxiliar() {
  const [observaciones, setObservaciones] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [stats, setStats] = useState(null);
  const user = api.getUser();

  const [formData, setFormData] = useState({
    fecha_asistencia: new Date().toISOString().split("T")[0],
    tipo: "Error en tareo",
    comentario: "",
  });

  const tipos = [
    "Error en tareo",
    "Falta justificada",
    "Descanso médico",
    "Horas extras",
    "Tardanza justificada",
    "Vacaciones",
    "Cambio de turno",
    "Otro",
  ];

  const cargarObservaciones = async () => {
    setCargando(true);
    try {
      const data = await api.get("/observaciones/mi-area");
      setObservaciones(data || []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Error al cargar observaciones");
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
    cargarObservaciones();
    cargarStats();
  }, []);

  const handleCrear = async () => {
    if (!formData.comentario.trim()) {
      toast.error("Escribe un comentario");
      return;
    }

    try {
      await api.post("/observaciones/crear", formData);
      toast.success("Observación creada");
      setMostrarForm(false);
      setFormData({
        fecha_asistencia: new Date().toISOString().split("T")[0],
        tipo: "Error en tareo",
        comentario: "",
      });
      cargarObservaciones();
      cargarStats();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Error al crear observación");
    }
  };

  const estaFinalizada = (estado) => {
    return estado === "Aprobado" || estado === "Rechazado";
  };

  if (seleccionada) {
    return (
      <div className="h-full flex flex-col">
        <button
          onClick={() => setSeleccionada(null)}
          className="mb-4 flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition w-fit"
        >
          <ArrowLeft size={18} />
          Volver
        </button>
        <div className="flex-1">
          <ChatObservacion observacion={seleccionada} onRefresh={cargarObservaciones} />
        </div>

        {estaFinalizada(seleccionada.estado) && (
          <div className={`mt-4 p-4 rounded-xl border ${
            seleccionada.estado === "Aprobado"
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}>
            <div className="flex items-center justify-center gap-2">
              {seleccionada.estado === "Aprobado" ? (
                <CheckCircle size={20} className="text-green-600" />
              ) : (
                <XCircle size={20} className="text-red-600" />
              )}
              <p className={`font-semibold ${
                seleccionada.estado === "Aprobado" ? "text-green-700" : "text-red-700"
              }`}>
                {seleccionada.estado === "Aprobado" ? "Observación Aprobada" : "Observación Rechazada"}
              </p>
            </div>
            <p className={`text-sm text-center mt-1 ${
              seleccionada.estado === "Aprobado" ? "text-green-600" : "text-red-600"
            }`}>
              {seleccionada.estado === "Aprobado"
                ? "Tu observación fue aprobada y procesada."
                : "Tu observación fue rechazada. Si tienes dudas, contacta a tu supervisor."}
            </p>
            <p className="text-slate-500 text-xs text-center mt-2">
              Puedes crear una nueva observación si lo necesitas.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Mis Observaciones</h1>
          <p className="text-slate-500 mt-1">Gestiona tus observaciones de asistencia</p>
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium shadow-sm"
        >
          <Plus size={20} />
          Nueva Observación
        </button>
      </div>

      {/* Formulario */}
      {mostrarForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-slate-800 text-lg">Crear Nueva Observación</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Fecha de Asistencia
              </label>
              <input
                type="date"
                value={formData.fecha_asistencia}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_asistencia: e.target.value })
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Tipo
              </label>
              <select
                value={formData.tipo}
                onChange={(e) =>
                  setFormData({ ...formData, tipo: e.target.value })
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
              >
                {tipos.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Comentario
            </label>
            <textarea
              value={formData.comentario}
              onChange={(e) =>
                setFormData({ ...formData, comentario: e.target.value })
              }
              rows="4"
              placeholder="Describe el problema..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCrear}
              className="px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium shadow-sm"
            >
              Crear Observación
            </button>
            <button
              onClick={() => setMostrarForm(false)}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      {stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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

      {/* Lista */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="p-6 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-3 h-3 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-40" />
                  <div className="h-3 bg-slate-100 rounded w-24" />
                </div>
                <div className="h-5 bg-slate-100 rounded-full w-14" />
              </div>
            ))}
          </div>
        ) : observaciones.length === 0 ? (
          <div className="p-12 text-center">
            <MessageCircle size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">No tienes observaciones aún</p>
            <p className="text-slate-400 text-sm mt-1">Crea una nueva observación para comenzar</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {observaciones.map((obs) => (
              <div
                key={obs.id}
                onClick={() => setSeleccionada(obs)}
                className="p-4 hover:bg-slate-50 cursor-pointer transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <StatusDot estado={obs.estado} />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{obs.tipo}</p>
                    <p className="text-sm text-slate-400">
                      {new Date(obs.fecha_asistencia).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <PriorityBadge prioridad={obs.prioridad} />
                  <span className="text-sm text-slate-500 hidden sm:inline">{obs.estado}</span>
                  <ArrowLeft size={16} className="text-slate-300 rotate-180 opacity-0 group-hover:opacity-100 transition" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
