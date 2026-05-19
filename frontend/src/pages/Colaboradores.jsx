import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, ChevronRight, Search, Users } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <td key={item} className="px-4 py-3">
          <div className="h-4 rounded-lg bg-slate-100" />
        </td>
      ))}
      <td className="px-4 py-3" />
    </tr>
  );
}

export default function Colaboradores() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [colaboradores, setColaboradores] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const vista = searchParams.get("vista") || "personas";
  const filtroArea = searchParams.get("area") || "";
  const filtroEstado = searchParams.get("estado") || "";

  useEffect(() => {
    loadAreas();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadColaboradores(), 250);
    return () => clearTimeout(timer);
  }, [filtroArea, filtroEstado, vista]);

  const updateParams = (next) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params, { replace: true });
  };

  const loadAreas = async () => {
    try {
      setAreas(await api.getAreas());
    } catch {
      toast.error("Error al cargar areas");
    }
  };

  const loadColaboradores = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroArea) params.set("area", filtroArea);
      params.set("estado", filtroEstado);
      const data = await api.get(`/colaboradores?${params.toString()}`);
      setColaboradores(data || []);
    } catch {
      toast.error("Error al cargar colaboradores");
      setColaboradores([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = colaboradores.filter((colaborador) => {
    if (!busqueda) return true;
    const query = busqueda.toLowerCase();
    return colaborador.nombre?.toLowerCase().includes(query) || colaborador.dni?.includes(query);
  });

  const areaStats = useMemo(() => {
    return areas
      .map((area) => {
        const areaName = typeof area === "string" ? area : area?.nombre;
        const miembros = colaboradores.filter((colaborador) => colaborador.area === areaName);
        return {
          area: areaName,
          total: miembros.length,
          activos: miembros.filter((item) => item.estado === "activo").length,
          inactivos: miembros.filter((item) => item.estado === "inactivo").length,
        };
      })
      .filter((item) => item.area);
  }, [areas, colaboradores]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
          {vista === "areas" ? <Building2 size={20} className="text-red-600" /> : <Users size={20} className="text-red-600" />}
        </div>
        <div>
          <h1 className="text-2xl font-black text-[#06264a]">
            {vista === "areas" ? "Areas" : "Colaboradores"}
          </h1>
          <p className="text-sm text-slate-500">
            {vista === "areas" ? "Resumen por unidad operativa" : "Gestion del equipo completo"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateParams({ vista: "personas" })}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${vista !== "areas" ? "bg-[#06264a] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          Personal
        </button>
        <button
          type="button"
          onClick={() => updateParams({ vista: "areas", area: "", estado: "" })}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${vista === "areas" ? "bg-[#06264a] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          Areas
        </button>
      </div>

      {vista === "areas" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {areaStats.map((item) => (
            <button
              key={item.area}
              type="button"
              onClick={() => updateParams({ vista: "personas", area: item.area, estado: "activo" })}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#e30613]/25 hover:shadow-lg"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <Building2 size={21} />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-black text-[#06264a]">{item.area}</h2>
                  <p className="text-xs font-semibold text-slate-500">Click para ver personal activo</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <AreaStat label="Total" value={item.total} />
                <AreaStat label="Activos" value={item.activos} />
                <AreaStat label="Inactivos" value={item.inactivos} />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Buscar
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Nombre o DNI..."
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="min-w-[180px]">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Area
              </label>
              <select
                value={filtroArea}
                onChange={(event) => updateParams({ area: event.target.value })}
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Todas las areas</option>
                {areas.map((area) => {
                  const value = typeof area === "string" ? area : area?.nombre;
                  return <option key={value} value={value}>{value}</option>;
                })}
              </select>
            </div>

            <div className="min-w-[150px]">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(event) => updateParams({ estado: event.target.value })}
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Todos</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            <div className="pb-2.5 text-sm text-slate-500">
              {!loading && <span className="font-bold text-slate-700">{filtered.length}</span>} {!loading && "resultado(s)"}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">DNI</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Cargo</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Area</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Fecha ingreso</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, index) => <SkeletonRow key={index} />)
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                            <Users size={22} className="text-slate-400" />
                          </div>
                          <p className="font-medium text-slate-500">No se encontraron colaboradores</p>
                          <p className="text-xs text-slate-400">Intenta ajustar los filtros</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((colaborador) => (
                      <tr
                        key={colaborador.dni}
                        onClick={() => navigate(`/colaborador/${colaborador.dni}`)}
                        className="group cursor-pointer transition-colors hover:bg-red-50/50"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{colaborador.dni}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-xs font-bold text-white">
                              {colaborador.nombre?.[0]}
                            </div>
                            <span className="font-medium text-slate-800">{colaborador.nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{colaborador.cargo || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{colaborador.area || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${colaborador.estado === "activo" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-red-200 bg-red-50 text-red-700"}`}>
                            {colaborador.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{colaborador.fecha_ingreso || "-"}</td>
                        <td className="px-4 py-3">
                          <ChevronRight size={16} className="text-slate-300 transition-colors group-hover:text-red-400" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AreaStat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-[#06264a]">{value}</p>
    </div>
  );
}
