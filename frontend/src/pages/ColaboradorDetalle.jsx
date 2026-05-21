import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit2, Save, X, User } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-slate-800 font-medium">{value || "—"}</p>
    </div>
  );
}

export default function ColaboradorDetalle() {
  const { dni } = useParams();
  const navigate = useNavigate();
  const user = api.getUser();
  const isGDH = user?.rol?.toLowerCase() === "gdh";

  const [colaborador, setColaborador] = useState(null);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    loadData();
  }, [dni]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [colab, areasData] = await Promise.all([
        api.getColaborador(dni),
        api.getAreas().catch(() => []),
      ]);
      if (!colab || colab.detail) {
        setNotFound(true);
      } else {
        setColaborador(colab);
        setForm({
          nombre: colab.nombre || "",
          cargo: colab.cargo || "",
          area: colab.area || "",
          rol: colab.rol || "",
          estado: colab.estado || "activo",
          vacaciones_pendientes: colab.vacaciones_pendientes ?? 0,
          password: "",
        });
        setAreas(areasData);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error("Error al cargar colaborador");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      const res = await api.updateColaborador(dni, payload);
      if (res?.error || res?.detail) {
        toast.error(res.error || res.detail);
      } else {
        toast.success("Colaborador actualizado");
        setEditMode(false);
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    if (colaborador) {
      setForm({
        nombre: colaborador.nombre || "",
        cargo: colaborador.cargo || "",
        area: colaborador.area || "",
        rol: colaborador.rol || "",
        estado: colaborador.estado || "activo",
        vacaciones_pendientes: colaborador.vacaciones_pendientes ?? 0,
        password: "",
      });
    }
  };

  const inputCls = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition bg-white";
  const isAuxiliarColaborador = colaborador?.rol?.toLowerCase() === "auxiliar";

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="skeleton h-8 w-32 rounded-xl" />
        <div className="skeleton h-40 rounded-xl" />
        <div className="skeleton h-56 rounded-xl" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl">
        <button
          onClick={() => navigate("/colaboradores")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Volver a colaboradores
        </button>
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <User size={24} className="text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Colaborador no encontrado</h2>
          <p className="text-slate-500 text-sm">No se encontró ningún colaborador con DNI <span className="font-mono font-medium">{dni}</span>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate("/colaboradores")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft size={16} /> Volver a colaboradores
      </button>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-red-500/20 flex-shrink-0">
              {colaborador.nombre?.[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{colaborador.nombre}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{colaborador.cargo} · {colaborador.area}</p>
              <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                colaborador.estado === "activo"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {colaborador.estado}
              </span>
            </div>
          </div>

          {isGDH && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition text-sm font-medium flex-shrink-0"
            >
              <Edit2 size={15} /> Editar
            </button>
          )}
        </div>

        {/* Info Fields */}
        {!editMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
            <InfoField label="DNI" value={colaborador.dni} />
            <InfoField label={isAuxiliarColaborador ? "Cargo" : "Rol"} value={isAuxiliarColaborador ? colaborador.cargo : colaborador.rol} />
            <InfoField label="Fecha de ingreso" value={colaborador.fecha_ingreso} />
            <InfoField label="Fecha de cumpleaños" value={colaborador.fecha_cumpleanos} />
            <InfoField label="Vacaciones pendientes" value={`${colaborador.vacaciones_pendientes ?? 0} días`} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre</label>
                <input type="text" value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Cargo</label>
                <input type="text" value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Área</label>
                <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={inputCls}>
                  {areas.map((area) => {
                    const value = typeof area === "string" ? area : area?.nombre;
                    return <option key={value} value={value}>{value}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rol</label>
                <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} className={inputCls}>
                  <option value="Auxiliar">Auxiliar</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Lider">Lider</option>
                  <option value="Coordinador">Coordinador</option>
                  <option value="gdh">GDH</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Estado</label>
                <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className={inputCls}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Vacaciones pendientes (días)</label>
                <input type="number" min={0} value={form.vacaciones_pendientes}
                  onChange={(e) => setForm({ ...form, vacaciones_pendientes: Number(e.target.value) })}
                  className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nueva contraseña (dejar vacío para no cambiar)</label>
              <input type="password" placeholder="Nueva contraseña..." value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputCls} />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition text-sm font-medium disabled:opacity-50 shadow-sm">
                <Save size={15} /> {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button onClick={handleCancel} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition text-sm font-medium disabled:opacity-50">
                <X size={15} /> Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Extra info (read-only always) */}
      {!editMode && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Información adicional</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
            <InfoField label="DNI" value={colaborador.dni} />
            <InfoField label={isAuxiliarColaborador ? "Cargo" : "Rol del sistema"} value={isAuxiliarColaborador ? colaborador.cargo : colaborador.rol} />
            <InfoField label="Área asignada" value={colaborador.area} />
            <InfoField label="Fecha de ingreso" value={colaborador.fecha_ingreso} />
            <InfoField label="Fecha de cumpleaños" value={colaborador.fecha_cumpleanos} />
            <InfoField label="Vacaciones pendientes" value={`${colaborador.vacaciones_pendientes ?? 0} días`} />
          </div>
        </div>
      )}
    </div>
  );
}
