import { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, AlertCircle, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../api";

const ASISTENCIA_CODES = {
  M: { label: "Mañana", color: "bg-yellow-50 text-yellow-700 border border-yellow-200", icon: "🌅" },
  T: { label: "Tarde", color: "bg-orange-50 text-orange-700 border border-orange-200", icon: "🌤️" },
  N: { label: "Noche", color: "bg-blue-50 text-blue-700 border border-blue-200", icon: "🌙" },
  F: { label: "Falta", color: "bg-red-50 text-red-700 border border-red-200", icon: "❌" },
  V: { label: "Vacaciones", color: "bg-green-50 text-green-700 border border-green-200", icon: "🏖️" },
  L: { label: "Licencia", color: "bg-purple-50 text-purple-700 border border-purple-200", icon: "📋" },
};

export default function MiTareo() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth());
  const [año, setAño] = useState(new Date().getFullYear());
  const user = api.getUser();

  useEffect(() => {
    cargarRegistros();
  }, [mes, año, user?.dni]);

  const cargarRegistros = async () => {
    setCargando(true);
    try {
      const registrosData = await api.get(`/tareo?dni=${user?.dni}`);
      setRegistros(registrosData || []);
    } catch (err) {
      console.error("Error cargando tareo:", err);
      setRegistros([]);
    } finally {
      setCargando(false);
    }
  };

  // Filtrar registros por mes/año
  const registrosMes = useMemo(() => {
    return registros.filter((reg) => {
      const fecha = new Date(reg.fecha);
      return fecha.getMonth() === mes && fecha.getFullYear() === año;
    });
  }, [registros, mes, año]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    return {
      dia: registrosMes.filter((r) => r.asistencia === "M").length,
      tarde: registrosMes.filter((r) => r.asistencia === "T").length,
      noche: registrosMes.filter((r) => r.asistencia === "N").length,
      vacaciones: registrosMes.filter((r) => r.asistencia === "V").length,
      faltas: registrosMes.filter((r) => r.asistencia === "F").length,
      licencias: registrosMes.filter((r) => r.asistencia === "L").length,
      total: registrosMes.length,
    };
  }, [registrosMes]);

  const diasMes = new Date(año, mes + 1, 0).getDate();
  const primerDia = new Date(año, mes, 1).getDay();

  const cambiarMes = (delta) => {
    let nuevoMes = mes + delta;
    let nuevoAño = año;
    if (nuevoMes < 0) {
      nuevoMes = 11;
      nuevoAño -= 1;
    } else if (nuevoMes > 11) {
      nuevoMes = 0;
      nuevoAño += 1;
    }
    setMes(nuevoMes);
    setAño(nuevoAño);
  };

  const nombreMes = new Date(año, mes).toLocaleString("es-ES", { month: "long", year: "numeric" });

  // Crear grid del calendario
  const dias = [];
  for (let i = 0; i < primerDia; i++) dias.push(null);
  for (let i = 1; i <= diasMes; i++) dias.push(i);

  const getRegistroDelDia = (dia) => {
    const fecha = new Date(año, mes, dia).toISOString().split("T")[0];
    return registrosMes.find((r) => r.fecha.startsWith(fecha));
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Calendar size={20} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Mi Tareo Personal</h1>
          <p className="text-sm text-slate-500">{user?.nombre} • {user?.dni}</p>
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatBadge icon="🌅" label="Mañana" value={stats.dia} color="yellow" />
        <StatBadge icon="🌤️" label="Tarde" value={stats.tarde} color="orange" />
        <StatBadge icon="🌙" label="Noche" value={stats.noche} color="blue" />
        <StatBadge icon="🏖️" label="Vacaciones" value={stats.vacaciones} color="green" />
        <StatBadge icon="❌" label="Faltas" value={stats.faltas} color="red" />
        <StatBadge icon="📋" label="Licencias" value={stats.licencias} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendario */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {/* Navegación de mes */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => cambiarMes(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-800 capitalize">{nombreMes}</h2>
            <button
              onClick={() => cambiarMes(1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Grid de días */}
          <div className="grid grid-cols-7 gap-2">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
              <div key={d} className="text-center text-xs font-bold text-slate-500 py-2">
                {d}
              </div>
            ))}

            {dias.map((dia, idx) => {
              const registro = dia ? getRegistroDelDia(dia) : null;
              const asistencia = registro?.asistencia;
              const codigo = ASISTENCIA_CODES[asistencia];

              return (
                <div
                  key={idx}
                  className={`aspect-square flex items-center justify-center rounded-lg border transition ${
                    !dia
                      ? "bg-slate-50 border-transparent"
                      : registro
                      ? `${codigo?.color} cursor-pointer hover:shadow-md`
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                  title={registro ? `${codigo?.label} - ${registro.comentario_gdh || ""}` : ""}
                >
                  {dia && (
                    <div className="text-center">
                      <p className="text-xs font-semibold">{dia}</p>
                      {registro && <p className="text-lg">{codigo?.icon}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t border-slate-200">
            {Object.entries(ASISTENCIA_CODES).map(([key, { label, icon }]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className="text-lg">{icon}</span>
                <span className="text-slate-600">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel lateral - Detalles del mes */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Resumen del Mes</h3>

            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Mañana</span>
                <span className="text-lg font-bold text-yellow-600">{stats.dia}</span>
              </div>
              <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Tarde</span>
                <span className="text-lg font-bold text-orange-600">{stats.tarde}</span>
              </div>
              <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Noche</span>
                <span className="text-lg font-bold text-blue-600">{stats.noche}</span>
              </div>
              <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Vacaciones</span>
                <span className="text-lg font-bold text-green-600">{stats.vacaciones}</span>
              </div>
              <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Faltas</span>
                <span className="text-lg font-bold text-red-600">{stats.faltas}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-800">Total días</span>
                <span className="text-xl font-bold text-slate-800">{stats.total}</span>
              </div>
            </div>
          </div>

          {/* Info importante */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <Clock size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 text-sm">Información</p>
                <p className="text-xs text-blue-800 mt-1">
                  Los registros se actualizan diariamente. Contacta a RH si hay discrepancias.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de registros del mes */}
      {registrosMes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Registros del Mes ({registrosMes.length})</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Turno</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Comentario</th>
                </tr>
              </thead>
              <tbody>
                {registrosMes.map((reg) => {
                  const codigo = ASISTENCIA_CODES[reg.asistencia];
                  return (
                    <tr key={reg.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {new Date(reg.fecha).toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${codigo?.color}`}
                        >
                          {codigo?.icon} {codigo?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{reg.comentario_gdh || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBadge({ icon, label, value, color }) {
  const colorMap = {
    yellow: "bg-yellow-50 text-yellow-700",
    orange: "bg-orange-50 text-orange-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <div className={`${colorMap[color]} rounded-lg p-4 text-center`}>
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1 opacity-75">{label}</p>
    </div>
  );
}
