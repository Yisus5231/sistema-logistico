import { useState, useEffect } from "react";
import { Search, History as HistoryIcon } from "lucide-react";
import api from "../api";

export default function Historial() {
  const [historial, setHistorial] = useState([]);
  const [filtroDni, setFiltroDni] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => { loadHistorial(); }, 400);
    return () => clearTimeout(timer);
  }, [filtroDni, filtroTipo]);

  const loadHistorial = async () => {
    setLoading(true);
    try { setHistorial(await api.getHistorial(filtroDni || null, filtroTipo || null)); }
    catch { setHistorial([]); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <HistoryIcon size={20} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Historial de Cambios</h1>
          <p className="text-sm text-slate-500">Auditoría de modificaciones</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Buscar por DNI</label>
          <input type="text" placeholder="DNI del colaborador..." value={filtroDni}
            onChange={(e) => setFiltroDni(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de cambio</label>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer">
            <option value="">Todos</option>
            <option value="carga_excel">Carga Excel</option>
            <option value="manual">Manual</option>
            <option value="reactivacion">Reactivación</option>
          </select>
        </div>
        <button onClick={loadHistorial}
          className="px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition text-sm font-medium shadow-sm">
          Filtrar
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-4">
                {[...Array(7)].map((_, j) => <div key={j} className="h-4 bg-slate-100 rounded flex-1" />)}
              </div>
            ))}
          </div>
        ) : historial.length === 0 ? (
          <div className="p-12 text-center">
            <HistoryIcon size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">No hay registros de cambios</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Campo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Anterior</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nuevo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quién cambió</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historial.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(h.fecha).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{h.usuario_nombre}</p>
                      <p className="text-xs text-slate-400 font-mono">{h.usuario_dni}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{h.campo}</td>
                    <td className="px-4 py-3 text-red-600 text-xs font-mono">{h.valor_anterior || "—"}</td>
                    <td className="px-4 py-3 text-green-600 text-xs font-mono">{h.valor_nuevo}</td>
                    <td className="px-4 py-3 text-slate-600">{h.quien_lo_cambio}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        h.tipo_cambio === "carga_excel" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                        h.tipo_cambio === "manual" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                        "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        {h.tipo_cambio}
                      </span>
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
