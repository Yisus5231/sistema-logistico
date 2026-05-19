import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

export default function SubirExcel() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".xlsx")) {
      if (droppedFile.size > 10 * 1024 * 1024) {
        toast.error("El archivo no debe superar los 10MB");
        return;
      }
      setFile(droppedFile);
      setResultado(null);
    } else {
      toast.error("Solo se aceptan archivos .xlsx");
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.size > 10 * 1024 * 1024) {
      toast.error("El archivo no debe superar los 10MB");
      return;
    }
    if (selected) { setFile(selected); setResultado(null); }
  };

  const handleUpload = async () => {
    if (!file) { toast.error("Selecciona un archivo primero"); return; }
    setLoading(true);
    setResultado(null);
    try {
      const res = await api.subirExcel(file);
      if (res.exitoso) {
        setResultado({ success: true, stats: res.stats });
        toast.success("Excel sincronizado correctamente");
        setFile(null);
      } else {
        setResultado({ success: false, error: res.error || "Error desconocido" });
        toast.error("Error: " + (res.error || "Error desconocido"));
      }
    } catch (err) {
      setResultado({ success: false, error: err.response?.data?.error || "Error de conexión con el servidor" });
      toast.error("Error al subir archivo");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <Upload size={20} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sincronizar Excel</h1>
          <p className="text-sm text-slate-500">Actualizar base de colaboradores</p>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`bg-white rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
          dragOver
            ? "border-red-400 bg-red-50"
            : "border-slate-300 hover:border-red-300 hover:bg-slate-50"
        }`}
      >
        <input ref={inputRef} type="file" accept=".xlsx" onChange={handleFileChange} className="hidden" />
        <div className="flex flex-col items-center gap-3">
          {file ? (
            <>
              <FileSpreadsheet size={48} className="text-green-500" />
              <p className="text-lg font-medium text-slate-700">{file.name}</p>
              <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB — Listo para subir</p>
            </>
          ) : (
            <>
              <Upload size={48} className="text-slate-400" />
              <p className="text-lg font-medium text-slate-600">Arrastra tu archivo Excel aquí</p>
              <p className="text-sm text-slate-400">o haz clic para seleccionar (.xlsx)</p>
            </>
          )}
        </div>
      </div>

      {/* Upload Button */}
      {file && (
        <div className="flex justify-center">
          <button onClick={handleUpload} disabled={loading}
            className="px-8 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-red-500/20">
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Procesando...
              </span>
            ) : "Sincronizar Excel"}
          </button>
        </div>
      )}

      {/* Results */}
      {resultado && (
        <div className={`rounded-xl border p-6 animate-scale-in ${
          resultado.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {resultado.success ? <CheckCircle size={24} className="text-green-500" /> : <AlertCircle size={24} className="text-red-500" />}
            <h3 className={`text-lg font-semibold ${resultado.success ? "text-green-700" : "text-red-700"}`}>
              {resultado.success ? "Sincronización exitosa" : "Error en la sincronización"}
            </h3>
          </div>

          {resultado.success && resultado.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBadge label="Total procesados" value={resultado.stats.total} />
              <StatBadge label="Creados" value={resultado.stats.creados} color="green" />
              <StatBadge label="Actualizados" value={resultado.stats.actualizados} color="blue" />
              <StatBadge label="Inactivados" value={resultado.stats.inactivados} color="red" />
            </div>
          )}

          {!resultado.success && resultado.error && (
            <p className="text-red-600 text-sm">{resultado.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatBadge({ label, value, color = "gray" }) {
  const colors = { gray: "text-slate-700", green: "text-green-700", blue: "text-blue-700", red: "text-red-700" };
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
