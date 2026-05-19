import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, Calendar, Briefcase, MapPin } from "lucide-react";
import api from "../api";
import toast from "react-hot-toast";

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-slate-200" />
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded-lg w-3/4 mb-2" />
          <div className="h-3 bg-slate-100 rounded-lg w-1/3" />
        </div>
        <div className="h-5 w-16 bg-slate-200 rounded-full" />
      </div>
      <div className="border-t border-slate-100 pt-4 space-y-3">
        <div className="h-3 bg-slate-100 rounded-lg w-full" />
        <div className="h-3 bg-slate-100 rounded-lg w-2/3" />
        <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
      </div>
    </div>
  );
}

export default function Personal() {
  const [personal, setPersonal] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("activo");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = api.getUser();

  useEffect(() => {
    cargarPersonal();
  }, [filtroEstado]);

  const cargarPersonal = async () => {
    setLoading(true);
    try {
      const data = await api.getColaboradores(
        user?.area,
        filtroEstado || null
      );
      setPersonal(data);
    } catch (err) {
      toast.error("Error cargando personal");
      console.error(err);
      setPersonal([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = personal.filter((p) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.dni.includes(q) ||
      p.cargo.toLowerCase().includes(q)
    );
  });

  if (user?.rol !== "Supervisor") {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 text-lg">
          Esta seccion es solo para supervisores
        </p>
      </div>
    );
  }

  const getInitials = (nombre) => {
    if (!nombre) return "?";
    const parts = nombre.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <Users size={22} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Mi Personal</h1>
            <p className="text-sm text-slate-500">
              {loading
                ? "Cargando..."
                : `${personal.length} integrante${
                    personal.length !== 1 ? "s" : ""
                  } en`}{" "}
              <span className="font-semibold text-red-600">
                {user?.area}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o cargo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white transition-colors"
          />
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
        >
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
          <option value="">Todos</option>
        </select>
      </div>

      {/* Grid de Personal */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <Users size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">
            No se encontraron integrantes
          </p>
          {busqueda && (
            <p className="text-sm text-slate-400 mt-1">
              Intenta con otro termino de busqueda
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Count pill */}
          {busqueda && (
            <p className="text-sm text-slate-500 mb-3">
              Mostrando <span className="font-semibold">{filtered.length}</span>{" "}
              de <span className="font-semibold">{personal.length}</span>{" "}
              integrante{personal.length !== 1 ? "s" : ""}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((integrante) => (
              <div
                key={integrante.dni}
                onClick={() => navigate(`/colaborador/${integrante.dni}`)}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-red-300 transition-all cursor-pointer group"
              >
                {/* Header Tarjeta */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-sm">
                    {getInitials(integrante.nombre)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate group-hover:text-red-600 transition-colors">
                      {integrante.nombre}
                    </h3>
                    <p className="text-sm text-slate-400 font-mono">
                      {integrante.dni}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      integrante.estado === "activo"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {integrante.estado}
                  </span>
                </div>

                {/* Informacion */}
                <div className="space-y-2.5 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2.5">
                    <Briefcase
                      size={15}
                      className="text-red-500 flex-shrink-0"
                    />
                    <span className="text-sm text-slate-600 truncate">
                      {integrante.cargo}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <MapPin
                      size={15}
                      className="text-blue-500 flex-shrink-0"
                    />
                    <span className="text-sm text-slate-600 truncate">
                      {integrante.area}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Calendar
                      size={15}
                      className="text-purple-500 flex-shrink-0"
                    />
                    <span className="text-sm text-slate-600">
                      {integrante.vacaciones_pendientes} dias de vacaciones
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Calendar
                      size={15}
                      className="text-indigo-500 flex-shrink-0"
                    />
                    <span className="text-sm text-slate-600">
                      Ingreso{" "}
                      {new Date(integrante.fecha_ingreso).toLocaleDateString(
                        "es-ES"
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
