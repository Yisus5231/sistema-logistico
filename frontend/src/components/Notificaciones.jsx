import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, Check, CheckCheck, BellOff } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

export default function Notificaciones() {
  const navigate = useNavigate();
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrar, setMostrar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);
  const user = api.getUser();

  const cargarNotificaciones = useCallback(async () => {
    const token = api.getToken();
    if (!token) return;

    try {
      const res = await api.get("/notificaciones");
      setNotificaciones(res || []);
    } catch (err) {
      console.error("Error cargando notificaciones:", err.response?.status);
      if (err.response?.status === 401) {
        setNotificaciones([]);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    cargarNotificaciones();
    const interval = setInterval(cargarNotificaciones, 30000);
    return () => clearInterval(interval);
  }, [user, cargarNotificaciones]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        mostrar &&
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setMostrar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mostrar]);

  const marcarComoLeida = async (id) => {
    try {
      await api.put(`/notificaciones/${id}/leer`, {});
      cargarNotificaciones();
    } catch (err) {
      toast.error("Error al marcar notificacion");
    }
  };

  const abrirNotificacion = async (notif) => {
    if (!notif.leida) {
      try {
        await api.put(`/notificaciones/${notif.id}/leer`, {});
      } catch {
        toast.error("Error al marcar notificacion");
      }
    }

    setMostrar(false);
    cargarNotificaciones();

    if (notif.anuncio_id) {
      navigate(`/anuncios?anuncio=${notif.anuncio_id}`);
      return;
    }

    if (notif.tipo?.includes("observacion")) {
      navigate("/observaciones-gdh?estado=Pendiente");
    }
  };

  const marcarTodasComoLeidas = async () => {
    try {
      await api.put("/notificaciones/leer-todas", {});
      cargarNotificaciones();
      toast.success("Todas las notificaciones marcadas como leidas");
    } catch (err) {
      toast.error("Error al marcar notificaciones");
    }
  };

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const formatearFecha = (fecha) => {
    const d = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Ahora";
    if (diffMin < 60) return `Hace ${diffMin}m`;
    if (diffHr < 24) return `Hace ${diffHr}h`;
    if (diffDias < 7) return `Hace ${diffDias}d`;
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={btnRef}
        onClick={() => setMostrar(!mostrar)}
        className="relative p-2 text-slate-500 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all duration-200"
      >
        <Bell size={22} />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 badge-pulse">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {mostrar && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-[380px] bg-white/80 backdrop-blur-xl rounded-xl shadow-2xl shadow-black/10 z-50 border border-slate-200/60 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white/60">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 text-sm">
                Notificaciones
              </h3>
              {noLeidas > 0 && (
                <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">
                  {noLeidas} nueva{noLeidas !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {noLeidas > 0 && (
                <button
                  onClick={marcarTodasComoLeidas}
                  className="text-xs text-slate-500 hover:text-red-500 px-2 py-1 rounded-md hover:bg-red-50 transition-all duration-150 flex items-center gap-1"
                  title="Marcar todas como leidas"
                >
                  <CheckCheck size={14} />
                  <span className="hidden sm:inline">Leer todas</span>
                </button>
              )}
              <button
                onClick={() => setMostrar(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-all duration-150"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto overscroll-contain">
            {notificaciones.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BellOff size={22} className="text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">
                  Sin notificaciones
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Cuando tengas nuevas notificaciones apareceran aqui
                </p>
              </div>
            ) : (
              <div>
                {notificaciones.map((notif, idx) => (
                  <div
                    key={notif.id}
                    onClick={() => abrirNotificacion(notif)}
                    className={`group px-5 py-3.5 transition-all duration-150 cursor-pointer border-b border-slate-50 last:border-b-0 ${
                      !notif.leida
                        ? "bg-red-50/60 hover:bg-red-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm leading-relaxed ${
                            !notif.leida
                              ? "text-slate-800 font-medium"
                              : "text-slate-600"
                          }`}
                        >
                          {notif.contenido}
                        </p>
                        {notif.anuncio_preview && (
                          <div className="mt-2 rounded-lg border border-red-100 bg-white/80 px-3 py-2">
                            <p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-600">
                              {notif.anuncio_preview}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-slate-400 mt-1.5">
                          {formatearFecha(notif.fecha_creacion)}
                        </p>
                      </div>
                      {!notif.leida && (
                        <div className="flex-shrink-0 mt-1.5">
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                        </div>
                      )}
                      {notif.leida && (
                        <div className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Check size={14} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
