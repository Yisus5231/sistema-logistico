import { useState, useRef } from "react";
import { Send, Paperclip, Download, Upload, FileText } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

const ROLE_COLORS = {
  auxiliar: "bg-blue-100 text-blue-700",
  supervisor: "bg-purple-100 text-purple-700",
  gdh: "bg-red-100 text-red-700",
};

const ESTADO_COLORS = {
  Pendiente: "bg-yellow-400",
  "Revisado por Supervisor": "bg-blue-400",
  Observado: "bg-red-400",
  Aprobado: "bg-emerald-400",
  Rechazado: "bg-red-400",
};

export default function ChatObservacion({ observacion, onRefresh }) {
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargandoArchivo, setCargandoArchivo] = useState(false);
  const fileInputRef = useRef(null);
  const user = api.getUser();

  const handleEnviarMensaje = async () => {
    if (!nuevoMensaje.trim()) {
      toast.error("Escribe un mensaje");
      return;
    }

    setEnviando(true);
    try {
      await api.post(`/observaciones/${observacion.id}/comentar`, {
        mensaje: nuevoMensaje,
      });
      toast.success("Mensaje enviado");
      setNuevoMensaje("");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error enviando mensaje");
    } finally {
      setEnviando(false);
    }
  };

  const handleSubirArchivo = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCargandoArchivo(true);
    try {
      await api.upload(
        `/observaciones/${observacion.id}/subir-archivo`,
        file,
        "file"
      );
      toast.success("Archivo subido");
      if (onRefresh) onRefresh();
      fileInputRef.current.value = "";
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al subir archivo");
    } finally {
      setCargandoArchivo(false);
    }
  };

  const obtenerColorRol = (rol) => {
    return ROLE_COLORS[rol?.toLowerCase()] || "bg-slate-100 text-slate-700";
  };

  const estaFinalizada = (estado) => {
    return estado === "Aprobado" || estado === "Rechazado";
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-white border-l-4 border-red-500 px-5 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-lg font-semibold text-slate-800">
            {observacion.tipo}
          </h3>
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                ESTADO_COLORS[observacion.estado] || "bg-slate-300"
              }`}
            />
            <span className="text-sm font-medium text-slate-600">
              {observacion.estado}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>
            {new Date(observacion.fecha_asistencia).toLocaleDateString("es-ES")}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              observacion.prioridad === "Alta"
                ? "bg-red-100 text-red-700"
                : observacion.prioridad === "Media"
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {observacion.prioridad}
          </span>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {observacion.mensajes && observacion.mensajes.length > 0 ? (
          observacion.mensajes.map((msg) => {
            const esMio = msg.usuario_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${esMio ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 shadow-sm ${
                    esMio
                      ? "bg-red-500 text-white rounded-2xl rounded-br-md"
                      : "bg-white text-slate-800 rounded-2xl rounded-bl-md border border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-semibold text-sm ${
                        esMio ? "text-white" : "text-slate-800"
                      }`}
                    >
                      {msg.nombre}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                        esMio
                          ? "bg-white/20 text-white"
                          : obtenerColorRol(msg.rol)
                      }`}
                    >
                      {msg.rol}
                    </span>
                  </div>
                  <p className="text-sm break-words leading-relaxed">
                    {msg.mensaje}
                  </p>
                  <p
                    className={`text-xs mt-1.5 ${
                      esMio ? "text-white/70" : "text-slate-400"
                    }`}
                  >
                    {new Date(msg.fecha).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <p className="text-sm">Sin mensajes aun</p>
          </div>
        )}
      </div>

      {/* Archivos */}
      {observacion.archivos && observacion.archivos.length > 0 && (
        <div className="border-t border-slate-200 px-5 py-3 bg-white">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Archivos adjuntos
          </p>
          <div className="space-y-2">
            {observacion.archivos.map((archivo) => (
              <a
                key={archivo.id}
                href={`${api.getBaseUrl()}${archivo.ruta}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-red-300 hover:bg-red-50/50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 group-hover:bg-red-200 transition-colors">
                  <FileText size={16} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {archivo.nombre_archivo}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(archivo.tamanio / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Download
                  size={16}
                  className="text-slate-400 group-hover:text-red-500 transition-colors flex-shrink-0"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Input / Finalizada */}
      {estaFinalizada(observacion.estado) ? (
        <div className="border-t border-slate-200 px-5 py-4 bg-white">
          <div
            className={`rounded-xl p-4 ${
              observacion.estado === "Aprobado"
                ? "bg-emerald-50 border border-emerald-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <p
              className={`font-medium text-sm ${
                observacion.estado === "Aprobado"
                  ? "text-emerald-700"
                  : "text-red-700"
              }`}
            >
              Observacion finalizada
            </p>
            <p
              className={`text-sm mt-1 ${
                observacion.estado === "Aprobado"
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {observacion.estado === "Aprobado"
                ? "Esta observacion ha sido aprobada. No se pueden agregar mas comentarios."
                : "Esta observacion ha sido rechazada. No se pueden agregar mas comentarios."}
            </p>
            <p
              className={`text-xs mt-2 ${
                observacion.estado === "Aprobado"
                  ? "text-emerald-500"
                  : "text-red-500"
              }`}
            >
              Para continuar, crea una nueva observacion.
            </p>
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-200 px-4 py-3 bg-white">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleSubirArchivo}
              disabled={cargandoArchivo}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={cargandoArchivo || enviando}
              className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargandoArchivo ? (
                <Upload size={20} className="animate-spin" />
              ) : (
                <Paperclip size={20} />
              )}
            </button>
            <input
              type="text"
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleEnviarMensaje();
                }
              }}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white transition-colors disabled:bg-slate-100"
              disabled={enviando}
            />
            <button
              onClick={handleEnviarMensaje}
              disabled={enviando || !nuevoMensaje.trim()}
              className="p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
