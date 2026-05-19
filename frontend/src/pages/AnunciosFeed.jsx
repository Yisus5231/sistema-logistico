import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Megaphone,
  Heart,
  Trash2,
  Image,
  Video,
  X,
  RefreshCw,
  Send,
  AlertTriangle,
  MapPin,
  Shield,
  FileImage,
  FileVideo,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

// Skeleton loader for announcements
function AnuncioSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-slate-200 rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded w-32 mb-2" />
          <div className="h-3 bg-slate-100 rounded w-48" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-4/5" />
        <div className="h-3 bg-slate-100 rounded w-3/5" />
      </div>
      <div className="h-8 bg-slate-100 rounded-lg w-20" />
    </div>
  );
}

// Confirm dialog component
function ConfirmDialog({ abierto, titulo, mensaje, onConfirmar, onCancelar }) {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancelar}
      />
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 p-6 w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">{titulo}</h3>
            <p className="text-slate-500 text-sm mt-1">{mensaje}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// Role badge component
function RolBadge({ rol }) {
  const config =
    rol === "gdh"
      ? {
          label: "GDH",
          bg: "bg-red-100",
          text: "text-red-700",
          icon: Shield,
        }
      : {
          label: "Supervisor",
          bg: "bg-blue-100",
          text: "text-blue-700",
          icon: Shield,
        };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.bg} ${config.text}`}
    >
      <Icon size={11} />
      {config.label}
    </span>
  );
}

export default function AnunciosFeed() {
  const [searchParams] = useSearchParams();
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contenido, setContenido] = useState("");
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoBase64, setVideoBase64] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [creando, setCreando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);
  const targetAnuncioId = searchParams.get("anuncio");

  const imgInputRef = useRef(null);
  const vidInputRef = useRef(null);
  const anuncioRefs = useRef({});
  const user = api.getUser();

  const cargarAnuncios = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setLoading(true);
      else setRefreshing(true);

      try {
        const params = new URLSearchParams();
        if (user?.rol === "Supervisor" && user?.area) {
          params.append("area", user.area);
        }
        const query = params.toString();
        const data = await api.get(`/anuncios${query ? "?" + query : ""}`);
        setAnuncios(data || []);
      } catch (err) {
        toast.error("Error cargando anuncios");
        console.error(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.rol, user?.area]
  );

  useEffect(() => {
    cargarAnuncios();
  }, [cargarAnuncios]);

  useEffect(() => {
    if (!targetAnuncioId || loading) return;
    const target = anuncioRefs.current[targetAnuncioId];
    if (!target) return;
    window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  }, [targetAnuncioId, loading, anuncios]);

  // Handle image selection with preview
  const manejarImagen = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target.result.split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  // Handle video selection with preview
  const manejarVideo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVideoPreview(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target.result.split(",")[1];
      setVideoBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const limpiarImagen = () => {
    setImageBase64(null);
    setImagePreview(null);
    if (imgInputRef.current) imgInputRef.current.value = "";
  };

  const limpiarVideo = () => {
    setVideoBase64(null);
    setVideoPreview(null);
    if (vidInputRef.current) vidInputRef.current.value = "";
  };

  // Create announcement
  const crearAnuncio = async () => {
    if (!contenido.trim()) {
      toast.error("Escribe un contenido para el anuncio");
      return;
    }

    setCreando(true);
    try {
      const payload = {
        contenido,
        imagen_base64: imageBase64,
        video_base64: videoBase64,
      };

      if (user?.rol === "Supervisor" && user?.area) {
        payload.area_publicacion = user.area;
      }

      const data = await api.post("/anuncios", payload);

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Anuncio publicado");
      setContenido("");
      limpiarImagen();
      limpiarVideo();
      cargarAnuncios(true);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Error creando anuncio";
      toast.error(msg);
      console.error(err);
    } finally {
      setCreando(false);
    }
  };

  // React to announcement
  const reaccionar = async (anuncioId) => {
    try {
      await api.post(`/anuncios/${anuncioId}/reaccionar`);
      cargarAnuncios(true);
    } catch (err) {
      toast.error("Error en reaccion");
      console.error(err);
    }
  };

  // Delete announcement
  const eliminarAnuncio = async (anuncioId) => {
    try {
      await api.delete(`/anuncios/${anuncioId}`);
      toast.success("Anuncio eliminado");
      setConfirmarEliminar(null);
      cargarAnuncios(true);
    } catch (err) {
      toast.error("Error eliminando anuncio");
      console.error(err);
    }
  };

  const puedeCrear = user && ["gdh", "Supervisor"].includes(user.rol);

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Megaphone size={20} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Anuncios</h1>
            <p className="text-sm text-slate-500">
              {anuncios.length} anuncio{anuncios.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => cargarAnuncios(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={refreshing ? "animate-spin" : ""}
          />
          Actualizar
        </button>
      </div>

      {/* Create Form */}
      {puedeCrear && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            Crear anuncio
          </h2>

          <textarea
            className="w-full p-3.5 mb-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all duration-150 resize-none text-sm"
            placeholder="Escribe tu anuncio aqui..."
            rows="4"
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
          />

          {/* File Previews */}
          {(imagePreview || videoPreview) && (
            <div className="flex gap-3 mb-4 flex-wrap">
              {imagePreview && (
                <div className="relative group">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-24 w-24 object-cover rounded-lg border border-slate-200"
                  />
                  <button
                    onClick={limpiarImagen}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {videoPreview && (
                <div className="relative group">
                  <video
                    src={videoPreview}
                    className="h-24 w-36 object-cover rounded-lg border border-slate-200"
                  />
                  <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                    <FileVideo size={20} className="text-white" />
                  </div>
                  <button
                    onClick={limpiarVideo}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                ref={imgInputRef}
                type="file"
                accept="image/*"
                onChange={manejarImagen}
                className="hidden"
              />
              <button
                onClick={() => imgInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150"
              >
                <Image size={16} />
                Imagen
              </button>

              <input
                ref={vidInputRef}
                type="file"
                accept="video/*"
                onChange={manejarVideo}
                className="hidden"
              />
              <button
                onClick={() => vidInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150"
              >
                <Video size={16} />
                Video
              </button>
            </div>

            <button
              onClick={crearAnuncio}
              disabled={creando || !contenido.trim()}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:hover:bg-red-500 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-150 shadow-sm shadow-red-500/20"
            >
              <Send size={15} />
              {creando ? "Publicando..." : "Publicar"}
            </button>
          </div>

          {/* Supervisor area restriction notice */}
          {user?.rol === "Supervisor" && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
              <MapPin size={14} className="text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-600">
                Este anuncio sera visible solo para tu area:{" "}
                <span className="font-semibold">{user.area}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {loading ? (
          <>
            <AnuncioSkeleton />
            <AnuncioSkeleton />
            <AnuncioSkeleton />
          </>
        ) : anuncios.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone size={24} className="text-slate-400" />
            </div>
            <p className="text-base font-medium text-slate-500 mb-1">
              No hay anuncios disponibles
            </p>
            <p className="text-sm text-slate-400">
              Los anuncios publicados apareceran aqui
            </p>
          </div>
        ) : (
          anuncios.map((anuncio) => (
            <div
              key={anuncio.id}
              ref={(node) => {
                if (node) anuncioRefs.current[anuncio.id] = node;
              }}
              className={`bg-white border rounded-xl p-6 transition-all duration-300 shadow-sm ${
                String(anuncio.id) === String(targetAnuncioId)
                  ? "border-[#e30613] ring-4 ring-red-100 shadow-xl"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {anuncio.autor_nombre?.charAt(0)?.toUpperCase() || "A"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {anuncio.autor_nombre}
                      </p>
                      <RolBadge rol={anuncio.autor_rol} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-400">
                        {formatearFecha(anuncio.fecha_creacion)}
                      </p>
                      {anuncio.area_publicacion && (
                        <>
                          <span className="text-slate-300">-</span>
                          <span className="inline-flex items-center gap-1 text-xs text-red-500">
                            <MapPin size={11} />
                            {anuncio.area_publicacion}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete button (GDH only) */}
                {user?.rol === "gdh" && (
                  <button
                    onClick={() => setConfirmarEliminar(anuncio.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150"
                    title="Eliminar anuncio"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              {/* Content */}
              <p className="text-sm text-slate-700 mb-4 whitespace-pre-wrap leading-relaxed">
                {anuncio.contenido}
              </p>

              {/* Image */}
              {anuncio.imagen_url && (
                <div className="mb-4">
                  <img
                    src={`${api.getBaseUrl()}${anuncio.imagen_url}`}
                    alt="Anuncio"
                    className="max-h-80 rounded-xl w-full object-cover border border-slate-100"
                  />
                </div>
              )}

              {/* Video */}
              {anuncio.video_url && (
                <div className="mb-4">
                  <video
                    controls
                    className="max-h-80 rounded-xl w-full border border-slate-100"
                    src={`${api.getBaseUrl()}${anuncio.video_url}`}
                  />
                </div>
              )}

              {/* Reactions */}
              <button
                onClick={() => reaccionar(anuncio.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  anuncio.usuario_reacciono
                    ? "bg-red-50 text-red-500 border border-red-100 hover:bg-red-100"
                    : "bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100 hover:text-slate-500"
                }`}
              >
                <Heart
                  size={15}
                  className={anuncio.usuario_reacciono ? "fill-red-500" : ""}
                />
                {anuncio.reacciones_count > 0 && (
                  <span>{anuncio.reacciones_count}</span>
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        abierto={confirmarEliminar !== null}
        titulo="Eliminar anuncio"
        mensaje="Esta accion no se puede deshacer. El anuncio sera eliminado permanentemente."
        onConfirmar={() => eliminarAnuncio(confirmarEliminar)}
        onCancelar={() => setConfirmarEliminar(null)}
      />
    </div>
  );
}
