import { useState, useRef, useEffect } from "react";
import { Send, Heart, Upload, Image as ImageIcon, Video } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

export default function AnunciosFeed() {
  const [anuncios, setAnuncios] = useState([]);
  const [nuevoAnuncio, setNuevoAnuncio] = useState("");
  const [imagenPreview, setImagenPreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [imagenBase64, setImagenBase64] = useState(null);
  const [videoBase64, setVideoBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const user = api.getUser();
  const imagenRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    cargarAnuncios();
    const interval = setInterval(cargarAnuncios, 5000);
    return () => clearInterval(interval);
  }, []);

  const cargarAnuncios = async () => {
    setLoading(true);
    try {
      const res = await api.get("/anuncios");
      setAnuncios(res || []);
    } catch (err) {
      console.error("Error cargando anuncios");
    } finally {
      setLoading(false);
    }
  };

  const handleImagenChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenBase64(reader.result.split(",")[1]);
        setImagenPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoBase64(reader.result.split(",")[1]);
        setVideoPreview(URL.createObjectURL(file));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublicar = async () => {
    if (!nuevoAnuncio.trim() && !imagenBase64 && !videoBase64) {
      toast.error("Escribe un mensaje o sube contenido");
      return;
    }

    setEnviando(true);
    try {
      await api.post("/anuncios", {
        contenido: nuevoAnuncio,
        imagen_base64: imagenBase64,
        video_base64: videoBase64,
      });

      setNuevoAnuncio("");
      setImagenBase64(null);
      setVideoBase64(null);
      setImagenPreview(null);
      setVideoPreview(null);
      toast.success("Anuncio publicado");
      cargarAnuncios();
    } catch (err) {
      toast.error("Error al publicar");
    } finally {
      setEnviando(false);
    }
  };

  const handleReaccionar = async (anuncioId) => {
    try {
      await api.post(`/anuncios/${anuncioId}/reaccionar`, {});
      cargarAnuncios();
    } catch (err) {
      toast.error("Error al reaccionar");
    }
  };

  const handleEliminar = async (anuncioId) => {
    if (window.confirm("¿Eliminar anuncio?")) {
      try {
        await api.delete(`/anuncios/${anuncioId}`);
        toast.success("Anuncio eliminado");
        cargarAnuncios();
      } catch (err) {
        toast.error("Error al eliminar");
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Crear Anuncio - Solo GDH */}
      {user.rol === "gdh" && (
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Crear Anuncio</h3>

          <textarea
            value={nuevoAnuncio}
            onChange={(e) => setNuevoAnuncio(e.target.value)}
            placeholder="¿Qué necesitas comunicar?"
            className="w-full p-4 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            rows="4"
          />

          {/* Preview Imagen */}
          {imagenPreview && (
            <div className="mb-4 relative">
              <img src={imagenPreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
              <button
                onClick={() => {
                  setImagenPreview(null);
                  setImagenBase64(null);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          )}

          {/* Preview Video */}
          {videoPreview && (
            <div className="mb-4 relative">
              <video src={videoPreview} className="w-full h-40 object-cover rounded-lg" controls />
              <button
                onClick={() => {
                  setVideoPreview(null);
                  setVideoBase64(null);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          )}

          {/* Botones de Upload */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => imagenRef.current?.click()}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
            >
              <ImageIcon size={18} /> Imagen
            </button>
            <button
              onClick={() => videoRef.current?.click()}
              className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition"
            >
              <Video size={18} /> Video
            </button>
          </div>

          <input ref={imagenRef} type="file" accept="image/*" onChange={handleImagenChange} hidden />
          <input ref={videoRef} type="file" accept="video/*" onChange={handleVideoChange} hidden />

          <button
            onClick={handlePublicar}
            disabled={enviando}
            className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 disabled:bg-gray-400 transition"
          >
            <Send size={20} /> {enviando ? "Publicando..." : "Publicar"}
          </button>
        </div>
      )}

      {/* Feed de Anuncios */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">📢 Anuncios</h2>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Cargando anuncios...</p>
          </div>
        ) : anuncios.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-500">Sin anuncios aún</p>
          </div>
        ) : (
          anuncios.map((anuncio) => (
            <div key={anuncio.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
              {/* Header */}
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-red-50 to-transparent border-b">
                <div>
                  <p className="font-bold text-gray-800">{anuncio.autor_nombre}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(anuncio.fecha_creacion).toLocaleDateString()}
                  </p>
                </div>
                {user.rol === "gdh" && (
                  <button
                    onClick={() => handleEliminar(anuncio.id)}
                    className="text-red-500 hover:text-red-700 font-bold text-xl"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Contenido */}
              <div className="p-4">
                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{anuncio.contenido}</p>

                {/* Imagen */}
                {anuncio.imagen_url && (
                  <img src={anuncio.imagen_url} alt="Anuncio" className="w-full rounded-lg mb-4 max-h-96 object-cover" />
                )}

                {/* Video */}
                {anuncio.video_url && (
                  <video src={anuncio.video_url} controls className="w-full rounded-lg mb-4 max-h-96" />
                )}
              </div>

              {/* Footer - Reacciones */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 border-t">
                <button
                  onClick={() => handleReaccionar(anuncio.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                    anuncio.usuario_reacciono
                      ? "bg-red-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-red-100"
                  }`}
                >
                  <Heart size={18} fill={anuncio.usuario_reacciono ? "currentColor" : "none"} />
                  {anuncio.reacciones_count}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
