/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from "react";
import axios from "axios";
import {
  FaCamera,
  FaVideo,
  FaSpinner,
  FaImages,
  FaDownload,
  FaFolderOpen,
  FaCheckCircle,
  FaBoxOpen,
} from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";
import { ScanSearch } from "lucide-react";
import { toast } from "sonner";

const API_URL = "http://localhost:5000";

interface MediaFile {
  path: string;
  name: string;
  size: number;
  type: "photo" | "video";
  folder: string;
}

interface MediaManagerProps {
  deviceName?: string;
}

export default function MediaManager({
  deviceName = "Android",
}: MediaManagerProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [zipPath, setZipPath] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [hasScanned, setHasScanned] = useState(false);

  // Filtros
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeVideos, setIncludeVideos] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const scanMedia = async () => {
    setLoading(true);
    setFiles([]);
    setDownloadSuccess(false);

    const loadingTime = new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const [res] = await Promise.all([
        axios.get(`${API_URL}/scan-media`),
        loadingTime,
      ]);
      if (res.data.success) {
        setFiles(res.data.files);
        setHasScanned(true);
      } else {
        toast.error("Error del sistema: " + res.data.error);
      }
    } catch (error) {
      toast.error("No se pudo conectar con el dispositivo.");
    } finally {
      setLoading(false);
    }
  };

  const downloadZip = async () => {
    const selectedFiles = files.filter((f) => {
      if (f.type === "photo" && includePhotos) return true;
      if (f.type === "video" && includeVideos) return true;
      return false;
    });

    if (selectedFiles.length === 0) return;

    setDownloading(true);
    setDownloadSuccess(false);
    setDownloadProgress(0);
    setStatusMsg("Iniciando transferencia...");

    const progressInterval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev > 20 && prev < 50) setStatusMsg("Descargando archivos...");
        if (prev > 50 && prev < 80) setStatusMsg("Comprimiendo ZIP...");
        if (prev > 80) setStatusMsg("Finalizando...");

        if (prev >= 90) return 90;
        return prev + (100 / selectedFiles.length) * 0.8;
      });
    }, 400);

    try {
      const res = await axios.post(`${API_URL}/download-media-zip`, {
        filesToDownload: selectedFiles,
        deviceName: deviceName,
      });

      clearInterval(progressInterval);
      setDownloadProgress(100);
      setStatusMsg("¡Completado!");

      if (res.data.success) {
        setZipPath(res.data.zipPath);
        setTimeout(() => {
          setDownloading(false);
          setDownloadSuccess(true);
        }, 600);
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error(error);
      toast.error("Ocurrió un error al generar el archivo ZIP.");
      setDownloading(false);
    }
  };

  const photos = files.filter((f) => f.type === "photo");
  const videos = files.filter((f) => f.type === "video");
  const foldersFound = Array.from(new Set(files.map((f) => f.folder)));

  const selectedCount =
    (includePhotos ? photos.length : 0) + (includeVideos ? videos.length : 0);
  const selectedSize =
    (includePhotos ? photos.reduce((a, b) => a + b.size, 0) : 0) +
    (includeVideos ? videos.reduce((a, b) => a + b.size, 0) : 0);

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden animate-fade-in-up h-full flex flex-col">
      {/* Header */}
      <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            <FaImages className="text-blue-500" />
            Contenido Multimedia
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cámara, Screenshots, WhatsApp y Descargas
          </p>
        </div>

        <button
          onClick={scanMedia}
          disabled={loading || downloading}
          className="text-sm cursor-pointer font-medium bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <FaSpinner className="animate-spin" />
          ) : (
            <ScanSearch className="h-4 w-4" />
          )}
          {hasScanned ? "Actualizar Lista" : "Analizar Dispositivo"}
        </button>
      </div>

      <div className="p-6 flex-1 h-full overflow-y-auto relative">
        {/* ESTADO INICIAL */}
        {!hasScanned && !loading && (
          <div className="h-full flex flex-col justify-center items-center text-slate-500 text-center">
            <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaImages className="text-4xl text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium mb-1">
              Sin datos para mostrar
            </p>
            <p className="text-sm max-w-md mx-auto mb-8">
              Presiona "Iniciar Análisis" para escanear el dispositivo y
              preparar la descarga.
            </p>
            <button
              onClick={scanMedia}
              className="bg-blue-600 text-sm text-white px-8 py-3 rounded-full cursor-pointer font-bold shadow-lg shadow-blue-200 hover:bg-blue-500 transition-all active:scale-95 flex items-center gap-2"
            >
              <ScanSearch className="w-5 h-5" /> Iniciar Análisis
            </button>
          </div>
        )}

        {/* LOADING SCAN */}
        {loading && (
          <AnimatePresence>
            <motion.div
              className="h-full flex flex-col justify-center items-center text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <FaSpinner className="text-4xl text-blue-500 opacity-70 animate-spin mx-auto mb-4" />
              <p className="text-slate-600 font-medium mb-1 animate-pulse">
                Analizando almacenamiento...
              </p>
              <p className="text-sm text-slate-400 max-w-md mx-auto animate-pulse">
                Esto puede tomar unos segundos.
              </p>
            </motion.div>
          </AnimatePresence>
        )}

        {/* ESTADO VACÍO DESPUÉS DEL ESCANEO */}
        {hasScanned && !loading && files.length === 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="h-full flex flex-col justify-center items-center text-center text-slate-400"
          >
            <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaBoxOpen className="text-4xl text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium mb-1">Dispositivo vacío</p>
            <p className="text-sm max-w-md mx-auto text-slate-500">
              No se encontraron fotos ni videos en las carpetas escaneadas.
            </p>
          </motion.div>
        )}

        {/* CONTENIDO PRINCIPAL */}
        {hasScanned && !loading && files.length > 0 && (
          <AnimatePresence>
            <motion.div
              className="animate-fade-in"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Resumen de Carpetas */}
              <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Carpetas Detectadas:
                </p>
                <div className="flex flex-wrap gap-2">
                  {foldersFound.map((folder) => (
                    <span
                      key={folder}
                      className="px-2.5 py-1 bg-white text-slate-600 text-xs font-medium rounded-md border border-slate-300 flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>{" "}
                      {folder}
                    </span>
                  ))}
                </div>
              </div>

              {/* Grid de Selección */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Tarjeta FOTOS */}
                <div
                  onClick={() => setIncludePhotos(!includePhotos)}
                  className={`relative overflow-hidden cursor-pointer p-4 rounded-xl border-2 transition-all group
                    ${includePhotos ? "border-blue-500 bg-blue-50/30" : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-3 rounded-lg ${includePhotos ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-500"}`}
                      >
                        <FaCamera className="text-xl" />
                      </div>
                      <div>
                        <p
                          className={`font-bold text-md ${includePhotos ? "text-slate-800" : "text-slate-500"}`}
                        >
                          Fotos
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {photos.length} archivos encontrados
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                        ${includePhotos ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300 bg-white"}
                      `}
                    >
                      {includePhotos && <FaCheckCircle className="text-sm" />}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-dashed border-slate-200/80 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                      Peso Total
                    </span>
                    <span
                      className={`text-sm font-mono font-bold ${includePhotos ? "text-blue-600" : "text-slate-700"}`}
                    >
                      {formatBytes(photos.reduce((a, b) => a + b.size, 0))}
                    </span>
                  </div>
                </div>

                {/* Tarjeta VIDEOS */}
                <div
                  onClick={() => setIncludeVideos(!includeVideos)}
                  className={`relative overflow-hidden cursor-pointer p-4 rounded-xl border-2 transition-all group
                    ${includeVideos ? "border-violet-500 bg-violet-50/30" : "border-slate-200 hover:border-violet-200 hover:bg-slate-50"}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-3 rounded-lg ${includeVideos ? "bg-violet-500 text-white" : "bg-slate-200 text-slate-500"}`}
                      >
                        <FaVideo className="text-xl" />
                      </div>
                      <div>
                        <p
                          className={`font-bold text-md ${includeVideos ? "text-slate-800" : "text-slate-500"}`}
                        >
                          Videos
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {videos.length} archivos encontrados
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                        ${includeVideos ? "border-violet-500 bg-violet-500 text-white" : "border-slate-300 bg-white"}
                      `}
                    >
                      {includeVideos && <FaCheckCircle className="text-sm" />}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-dashed border-slate-200/80 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                      Peso Total
                    </span>
                    <span
                      className={`text-sm font-mono font-bold ${includeVideos ? "text-violet-600" : "text-slate-700"}`}
                    >
                      {formatBytes(videos.reduce((a, b) => a + b.size, 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Área de Acción (Descarga) */}
              <div className="bg-slate-900 rounded-2xl p-15 text-white shadow-xl relative overflow-hidden">
                {/* Fondo decorativo */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 -translate-y-1/2 translate-x-1/2"></div>

                {!downloading && !downloadSuccess ? (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">
                        Resumen de Descarga
                      </p>
                      <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-bold">
                          {selectedCount}
                        </span>
                        <span className="text-sm text-slate-400 font-medium">
                          archivos seleccionados
                        </span>
                      </div>
                      <div className="mt-1 inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        <span className="text-lg font-mono text-green-300">
                          {formatBytes(selectedSize)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={downloadZip}
                      disabled={selectedCount === 0}
                      className={`px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all transform
                            ${
                              selectedCount > 0
                                ? "bg-green-600 hover:bg-green-500 border border-green-500 shadow-lg shadow-green-900/50 active:scale-95 cursor-pointer text-white"
                                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                            }
                            `}
                    >
                      <FaDownload /> Iniciar Descarga (ZIP)
                    </button>
                  </div>
                ) : downloading ? (
                  <div className="relative z-10 py-2">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="font-bold text-lg text-white mb-1">
                          Generando Respaldo...
                        </p>
                        <p className="text-xs text-slate-400 animate-pulse">
                          {statusMsg}
                        </p>
                      </div>
                      <span className="text-2xl font-bold font-mono text-blue-400">
                        {Math.round(downloadProgress)}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                      <motion.div
                        className="bg-blue-500 h-full rounded-full relative"
                        initial={{ width: 0 }}
                        animate={{ width: `${downloadProgress}%` }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]"></div>
                      </motion.div>
                    </div>
                    <p className="text-center text-xs text-slate-500 mt-4">
                      No desconectes el dispositivo USB.
                    </p>
                  </div>
                ) : (
                  /* PANTALLA DE ÉXITO */
                  <div className="relative z-10 flex flex-col items-center justify-center py-4 text-center animate-scale-in">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-900/50">
                      <FaCheckCircle className="text-3xl text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      ¡Descarga Completada!
                    </h3>
                    <p className="text-slate-300 text-sm mb-6 max-w-md mx-auto">
                      Tu archivo ZIP ha sido creado exitosamente y está listo
                      para usarse.
                    </p>

                    <div className="bg-slate-800/80 p-4 rounded-lg border border-slate-700 w-full max-w-lg flex items-center gap-3 mb-6 text-left">
                      <div className="bg-slate-700 p-2 rounded text-slate-300">
                        <FaFolderOpen />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-400 uppercase font-bold">
                          Ubicación del archivo
                        </p>
                        <p
                          className="text-sm text-white truncate font-mono"
                          title={zipPath}
                        >
                          {zipPath}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setDownloadSuccess(false);
                        setFiles([]);
                        setHasScanned(false);
                      }}
                      className="text-sm font-medium text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Realizar otra Descarga
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
