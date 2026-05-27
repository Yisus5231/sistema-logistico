import { useState, useEffect, useCallback } from "react";
import { Megaphone, Heart, MapPin, Shield } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

function AnuncioSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 bg-slate-200 rounded-full" />
        <div className="flex-1">
          <div className="h-3.5 bg-slate-200 rounded w-28 mb-2" />
          <div className="h-2.5 bg-slate-100 rounded w-40" />
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-2.5 bg-slate-100 rounded w-full" />
        <div className="h-2.5 bg-slate-100 rounded w-4/5" />
      </div>
      <div className="h-7 bg-slate-100 rounded-lg w-16" />
    </div>
  );
}

function RolBadge({ rol }) {
  const config =
    rol === "gdh"
      ? { label: "GDH", bg: "bg-red-100", text: "text-red-700" }
      : { label: "Supervisor", bg: "bg-blue-100", text: "text-blue-700" };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.bg} ${config.text}`}
    >
      <Shield size={11} />
      {config.label}
    </span>
  );
}

export default function AnunciosLista() {
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = api.getUser();

  const cargarAnuncios = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.rol === "Supervisor" && user?.area) {
        params.append("area", user.area);
      }
      const query = params.toString();
      const data = await api.get(`/anuncios${query ? "?" + query : ""}`);
      setAnuncios(data || []);
    } catch (err) {
      console.error("Error cargando anuncios:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.rol, user?.area]);

  useEffect(() => {
    cargarAnuncios();
  }, [cargarAnuncios]);

  const reaccionar = async (anuncioId) => {
    try {
      await api.post(`/anuncios/${anuncioId}/reaccionar`);
      cargarAnuncios(true);
    } catch (err) {
      toast.error("Error en reacción");
      console.error(err);
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <AnuncioSkeleton />
        <AnuncioSkeleton />
      </div>
    );
  }

  if (anuncios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Megaphone size={24} className="text-slate-400" />
        </div>
        <p className="text-base font-medium text-slate-500 mb-1">
          No hay anuncios disponibles
        </p>
        <p className="text-sm text-slate-400">
          Los anuncios publicados aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {anuncios.map((anuncio) => (
        <div
          key={anuncio.id}
          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all duration-200 shadow-sm"
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {anuncio.autor_nombre?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
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
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-1 text-xs text-red-500">
                      <MapPin size={11} />
                      {anuncio.area_publicacion}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <p className="text-sm text-slate-700 mb-3 whitespace-pre-wrap leading-relaxed">
            {anuncio.contenido}
          </p>

          {/* Image */}
          {anuncio.imagen_url && (
            <div className="mb-3">
              <img
                src={`${api.getBaseUrl()}${anuncio.imagen_url}`}
                alt="Anuncio"
                className="max-h-72 rounded-xl w-full object-cover border border-slate-100"
              />
            </div>
          )}

          {/* Video */}
          {anuncio.video_url && (
            <div className="mb-3">
              <video
                controls
                className="max-h-72 rounded-xl w-full border border-slate-100"
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
      ))}
    </div>
  );
}
