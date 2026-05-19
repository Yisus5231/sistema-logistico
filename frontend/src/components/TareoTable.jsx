import { useState, useEffect } from "react";
import { Search, Edit2, Save, X, Clock } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

const ASISTENCIA_CODES = {
  M: { label: "Mañana", color: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
  T: { label: "Tarde", color: "bg-red-50 text-red-700 border border-red-200" },
  N: { label: "Noche", color: "bg-blue-50 text-blue-700 border border-blue-200" },
  F: { label: "Falta", color: "bg-red-50 text-red-700 border border-red-200" },
  V: { label: "Vacaciones", color: "bg-green-50 text-green-700 border border-green-200" },
  L: { label: "Licencia", color: "bg-purple-50 text-purple-700 border border-purple-200" },
};

export default function TareoTable() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null);
  const [comentario, setComentario] = useState("");
  const [pagina, setPagina] = useState(1);
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const porPagina = 20;
  const user = api.getUser();

  useEffect(() => {
    const timer = setTimeout(() => {
      setBusquedaAplicada(busqueda.trim());
      setPagina(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  useEffect(() => { cargarRegistros(); }, [busquedaAplicada]);

  const cargarRegistros = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", busquedaAplicada ? "5000" : "1000");
      if (busquedaAplicada) params.set("q", busquedaAplicada);
      setRegistros(await api.get(`/tareo?${params.toString()}`) || []);
    }
    catch { toast.error("Error cargando registros"); }
    finally { setCargando(false); }
  };

  const registrosFiltrados = registros;
  const totalPaginas = Math.ceil(registrosFiltrados.length / porPagina);
  const registrosPaginados = registrosFiltrados.slice((pagina - 1) * porPagina, pagina * porPagina);

  const guardarComentario = async (id) => {
    try {
      await api.put(`/tareo/${id}`, { comentario_gdh: comentario });
      toast.success("Comentario guardado");
      setEditando(null);
      cargarRegistros();
    } catch { toast.error("Error al guardar comentario"); }
  };

  if (user?.rol !== "gdh") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-700 font-semibold">Acceso Denegado</p>
        <p className="text-red-600 text-sm mt-1">Solo GDH puede ver y editar tareos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <Clock size={20} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Registro de Tareo</h1>
          <p className="text-sm text-slate-500">{registrosFiltrados.length} registros</p>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar por nombre o DNI..." value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white transition" />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-4">
                {[...Array(6)].map((_, j) => <div key={j} className="h-4 bg-slate-100 rounded flex-1" />)}
              </div>
            ))}
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <Clock size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">No hay registros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">DNI</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Asistencia</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Comentario</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {registrosPaginados.map((registro) => (
                  <tr key={registro.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3.5 font-mono text-slate-600">{registro.dni}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">{registro.nombre}</td>
                    <td className="px-4 py-3.5 text-slate-600">{new Date(registro.fecha).toLocaleDateString("es-ES")}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        ASISTENCIA_CODES[registro.asistencia]?.color || "bg-slate-100 text-slate-700"
                      }`}>
                        {ASISTENCIA_CODES[registro.asistencia]?.label || registro.asistencia}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {editando === registro.id ? (
                        <input type="text" value={comentario} onChange={(e) => setComentario(e.target.value)}
                          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                          placeholder="Agregar comentario..."
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") guardarComentario(registro.id); if (e.key === "Escape") setEditando(null); }} />
                      ) : (
                        <span className="text-slate-500">{registro.comentario_gdh || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {editando === registro.id ? (
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => guardarComentario(registro.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition" title="Guardar">
                            <Save size={15} />
                          </button>
                          <button onClick={() => setEditando(null)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition" title="Cancelar">
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditando(registro.id); setComentario(registro.comentario_gdh || ""); }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Editar">
                          <Edit2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-500">
            Mostrando {(pagina - 1) * porPagina + 1}-{Math.min(pagina * porPagina, registrosFiltrados.length)} de {registrosFiltrados.length}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
              Anterior
            </button>
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
