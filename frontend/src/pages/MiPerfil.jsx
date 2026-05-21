import { useState, useEffect } from "react";
import { Save, Key, Calendar, Shield, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

export default function MiPerfil() {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newBirthday, setNewBirthday] = useState("");
  const [saving, setSaving] = useState(false);
  const user = api.getUser();
  const isAuxiliar = user?.rol?.toLowerCase() === "auxiliar";

  useEffect(() => { loadPerfil(); }, []);

  const loadPerfil = async () => {
    try { setPerfil(await api.getMiPerfil()); }
    catch { toast.error("Error al cargar perfil"); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) { toast.error("Ingresa tu contrasena actual"); return; }
    if (!newPassword) { toast.error("Ingresa la nueva contraseña"); return; }
    if (newPassword !== confirmPassword) { toast.error("Las contraseñas no coinciden"); return; }
    if (newPassword.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return; }

    setSaving(true);
    try {
      const res = await api.post("/cambiar-password", { password_actual: currentPassword, password_nuevo: newPassword });
      if (res.error || res.detail) { toast.error(res.error || res.detail); }
      else { toast.success("Contraseña actualizada"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
    } catch (err) { toast.error(err.response?.data?.detail || "Error al cambiar contraseña"); }
    finally { setSaving(false); }
  };

  const handleChangeBirthday = async () => {
    if (!newBirthday) { toast.error("Selecciona una fecha"); return; }
    if (!window.confirm("Solo puedes cambiar tu fecha de cumpleaños UNA VEZ. ¿Estás seguro?")) return;

    setSaving(true);
    try {
      const res = await api.updateColaborador(perfil.dni, { fecha_cumpleanos: newBirthday });
      if (res.error || res.detail) { toast.error(res.error || res.detail); }
      else { toast.success("Fecha de cumpleaños actualizada"); setNewBirthday(""); loadPerfil(); }
    } catch (err) { toast.error(err.response?.data?.detail || "Error al cambiar fecha"); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="skeleton h-8 w-40 rounded-xl" />
        <div className="skeleton h-48 rounded-xl" />
        <div className="skeleton h-40 rounded-xl" />
      </div>
    );
  }

  if (!perfil) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Mi Perfil</h1>

      {/* Profile Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-red-500/20">
            {perfil.nombre?.[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{perfil.nombre}</h2>
            <p className="text-sm text-slate-500">{perfil.cargo} · {perfil.area}</p>
            <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              perfil.estado === "activo" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {perfil.estado}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
          <InfoField label="DNI" value={perfil.dni} />
          <InfoField label={isAuxiliar ? "Cargo" : "Rol"} value={isAuxiliar ? perfil.cargo : perfil.rol} />
          <InfoField label="Fecha de ingreso" value={perfil.fecha_ingreso} />
          <InfoField label="Fecha de cumpleaños" value={perfil.fecha_cumpleanos} />
          <InfoField label="Vacaciones pendientes" value={`${perfil.vacaciones_pendientes} días`} />
        </div>
      </div>

      {/* Change Password */}
      {!isAuxiliar ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Key size={18} className="text-red-500" />
            Cambiar contraseña
          </h3>
          <div className="space-y-3 max-w-sm">
            <input type="password" placeholder="Contrasena actual" value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" />
            <input type="password" placeholder="Nueva contraseña" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" />
            {newPassword && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${
                    newPassword.length < 6 ? "w-1/4 bg-red-500" :
                    newPassword.length < 8 ? "w-1/2 bg-amber-500" :
                    newPassword.length < 12 ? "w-3/4 bg-blue-500" :
                    "w-full bg-emerald-500"
                  }`} />
                </div>
                <span className={`text-xs font-medium ${
                  newPassword.length < 6 ? "text-red-500" :
                  newPassword.length < 8 ? "text-amber-500" :
                  newPassword.length < 12 ? "text-blue-500" :
                  "text-emerald-500"
                }`}>
                  {newPassword.length < 6 ? "Débil" : newPassword.length < 8 ? "Regular" : newPassword.length < 12 ? "Buena" : "Fuerte"}
                </span>
              </div>
            )}
            <input type="password" placeholder="Confirmar contraseña" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" />
            <button onClick={handleChangePassword} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition text-sm font-medium disabled:opacity-50 shadow-sm">
              <Save size={16} /> Cambiar contraseña
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-amber-700 text-sm">
              Los auxiliares no pueden cambiar su contraseña. Contacta a RH si necesitas soporte.
            </p>
          </div>
        </div>
      )}

      {/* Change Birthday */}
      {!perfil.cambio_cumpleanos && !isAuxiliar && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-red-500" />
            Cambiar fecha de cumpleaños
          </h3>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-sm text-amber-700">
              Solo puedes cambiar tu fecha de cumpleaños UNA VEZ. Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex items-center gap-3 max-w-sm">
            <input type="date" value={newBirthday} onChange={(e) => setNewBirthday(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" />
            <button onClick={handleChangeBirthday} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition text-sm font-medium disabled:opacity-50 shadow-sm">
              <Save size={16} /> Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-slate-800 font-medium">{value || "—"}</p>
    </div>
  );
}
