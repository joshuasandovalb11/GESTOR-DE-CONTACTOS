/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, type JSX } from "react";
import axios from "axios";
import {
  FaTrash,
  FaAddressBook,
  FaImages,
  FaWhatsapp,
  FaDownload,
  FaPhone,
  FaSms,
  FaCheckCircle,
  FaSpinner,
  FaAndroid,
  FaBan,
  FaSearch,
  FaLock,
  FaArrowLeft,
  FaExclamationTriangle,
  FaTimes,
} from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";
import { ListTodo, Megaphone, ScanSearch } from "lucide-react";
import { toast } from "sonner";

const API_URL = "http://localhost:5000";

interface AppInfo {
  packageName: string;
  label: string;
  isProtected?: boolean;
}

interface ScanReport {
  communication: { contacts: number; calls: number; sms: number };
  media: { camera: number; whatsapp: number; downloads: number };
  apps?: AppInfo[];
}

interface ReviewItem {
  label: string;
  icon: JSX.Element;
  isApp?: boolean;
  type: "target" | "app";
  id: string;
}

type CleanupStep = "selection" | "review" | "processing" | "results";

export default function RestoreManager() {
  const [step, setStep] = useState<CleanupStep>("selection");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [appSearchTerm, setAppSearchTerm] = useState("");

  const [targets, setTargets] = useState({
    contacts: false,
    calls: false,
    sms: false,
    camera: false,
    whatsapp: false,
    downloads: false,
  });

  const [selectedApps, setSelectedApps] = useState<string[]>([]);

  const scanDevice = async () => {
    setLoading(true);
    setReport(null);
    setSelectedApps([]);
    setAppSearchTerm("");
    setStep("selection");

    setTargets({
      contacts: false,
      calls: false,
      sms: false,
      camera: false,
      whatsapp: false,
      downloads: false,
    });

    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const res = await axios.get(`${API_URL}/scan-cleanup`);
      if (res.data.success) {
        setReport(res.data.report);
        setHasScanned(true);
      }
    } catch (error) {
      console.error("Error escaneando:", error);
      toast.error("Error al conectar con el dispositivo.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTarget = (key: keyof typeof targets) => {
    setTargets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleApp = (pkg: string) => {
    setSelectedApps((prev) =>
      prev.includes(pkg) ? prev.filter((p) => p !== pkg) : [...prev, pkg],
    );
  };

  const goToReview = () => {
    setStep("review");
  };

  const executeCleanup = async () => {
    setStep("processing");
    setLogs([]);

    try {
      const res = await axios.post(`${API_URL}/perform-cleanup`, {
        targets,
        appsToDelete: selectedApps,
      });

      if (res.data.success) {
        setLogs(res.data.logs);
        setStep("results");

        setTargets({
          contacts: false,
          calls: false,
          sms: false,
          camera: false,
          whatsapp: false,
          downloads: false,
        });
        setSelectedApps([]);
      }
    } catch (error) {
      toast.error("Error durante la limpieza: " + error);
      setStep("review");
    }
  };

  const finishProcess = () => {
    setStep("selection");
    scanDevice();
  };

  const countGeneral = Object.values(targets).filter(Boolean).length;
  const countApps = selectedApps.length;
  const totalSelected = countGeneral + countApps;
  const appsList = report?.apps || [];

  const filteredApps = appsList.filter((app) => {
    const searchLower = appSearchTerm.toLowerCase();
    return (
      app.label.toLowerCase().includes(searchLower) ||
      app.packageName.toLowerCase().includes(searchLower)
    );
  });

  useEffect(() => {
    if (step === "review" && totalSelected === 0) {
      setStep("selection");
    }
  }, [totalSelected, step]);

  const handleRemoveFromReview = (type: "target" | "app", id: string) => {
    if (type === "target") {
      setTargets((prev) => ({ ...prev, [id]: false }));
    } else {
      setSelectedApps((prev) => prev.filter((pkg) => pkg !== id));
    }
  };

  const getReviewSummary = () => {
    const summary: ReviewItem[] = [];

    if (targets.contacts)
      summary.push({
        label: "Todos los Contactos",
        icon: <FaAddressBook />,
        type: "target",
        id: "contacts",
      });
    if (targets.calls)
      summary.push({
        label: "Historial de Llamadas",
        icon: <FaPhone />,
        type: "target",
        id: "calls",
      });
    if (targets.sms)
      summary.push({
        label: "Mensajes SMS",
        icon: <FaSms />,
        type: "target",
        id: "sms",
      });
    if (targets.camera)
      summary.push({
        label: "Galería (Fotos/Screenshots)",
        icon: <FaImages />,
        type: "target",
        id: "camera",
      });
    if (targets.whatsapp)
      summary.push({
        label: "Multimedia WhatsApp",
        icon: <FaWhatsapp />,
        type: "target",
        id: "whatsapp",
      });
    if (targets.downloads)
      summary.push({
        label: "Carpeta Descargas",
        icon: <FaDownload />,
        type: "target",
        id: "downloads",
      });

    selectedApps.forEach((pkg) => {
      const app = appsList.find((a) => a.packageName === pkg);
      summary.push({
        label: `${app ? app.label : pkg}`,
        icon: <FaAndroid />,
        isApp: true,
        type: "app",
        id: pkg,
      });
    });
    return summary;
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden animate-fade-in-up relative h-full flex flex-col">
      {/* HEADER DINÁMICO */}
      <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            {step === "selection" && (
              <>
                <FaTrash className="text-red-500" /> Limpieza Profunda
              </>
            )}
            {step === "review" && (
              <>
                <FaExclamationTriangle className="text-red-500" /> Confirmar
                Acción
              </>
            )}
            {step === "processing" && (
              <>
                <FaSpinner className="text-blue-500 animate-spin" />{" "}
                Procesando...
              </>
            )}
            {step === "results" && (
              <>
                <FaCheckCircle className="text-green-500" /> Reporte Final
              </>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {step === "selection" &&
              "Selecciona los elementos que deseas eliminar."}
            {step === "review" && "Revisa cuidadosamente antes de continuar."}
            {step === "processing" &&
              "Por favor espera, no desconectes el dispositivo."}
            {step === "results" && "Resumen de las acciones realizadas."}
          </p>
        </div>

        {step === "selection" && (
          <button
            onClick={scanDevice}
            disabled={loading}
            className="text-sm cursor-pointer font-medium bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <ScanSearch className="h-4 w-4" />
            )}
            {hasScanned ? "Actualizar Lista" : "Analizar Dispositivo"}
          </button>
        )}
      </div>

      <div className="p-6 flex-1 h-full overflow-y-auto relative">
        {/* VISTA 1: ESTADO INICIAL / LOADING */}
        {!hasScanned && !loading && step === "selection" && (
          <div className="h-full flex flex-col justify-center items-center text-center text-slate-400">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mb-4">
              <FaTrash className="text-4xl text-slate-300" />
            </div>
            <p className="text-slate-600 font-medium mb-1">
              Sin datos para mostrar
            </p>
            <p className="text-sm max-w-md mx-auto mb-8">
              Presiona "Iniciar Análisis" para escanear el dispositivo y
              preparar la limpieza.
            </p>
            <button
              onClick={scanDevice}
              className="bg-red-600 text-sm text-white px-8 py-3 rounded-full cursor-pointer font-bold shadow-lg shadow-red-200 hover:bg-red-500 transition-all active:scale-95 flex items-center gap-2"
            >
              <ScanSearch className="w-5 h-5" /> Iniciar Análisis
            </button>
          </div>
        )}

        {loading && (
          <div className="h-full flex flex-col justify-center items-center text-center">
            <FaSpinner className="text-4xl text-red-500 opacity-70 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium mb-1 animate-pulse">
              Analizando almacenamiento...
            </p>
            <p className="text-sm text-slate-400 max-w-md mx-auto animate-pulse">
              Esto puede tomar unos segundos.
            </p>
          </div>
        )}

        {/* VISTA 2: SELECCIÓN DE ELEMENTOS */}
        {hasScanned && !loading && step === "selection" && report && (
          <AnimatePresence>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                {/* COLUMNA 1: COMUNICACIÓN */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <CleanupOption
                      label="Contactos"
                      count={report.communication.contacts}
                      icon={<FaAddressBook className="text-blue-500" />}
                      checked={targets.contacts}
                      onChange={() => handleToggleTarget("contacts")}
                    />
                    <CleanupOption
                      label="Llamadas"
                      count={report.communication.calls}
                      icon={<FaPhone className="text-green-500" />}
                      checked={targets.calls}
                      onChange={() => handleToggleTarget("calls")}
                    />
                    <CleanupOption
                      label="Mensajes SMS"
                      count={report.communication.sms}
                      icon={<FaSms className="text-purple-500" />}
                      checked={targets.sms}
                      onChange={() => handleToggleTarget("sms")}
                    />
                  </div>
                </div>

                {/* COLUMNA 2: ARCHIVOS */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <CleanupOption
                      label="Galeria (Fotos)"
                      count={report.media.camera}
                      icon={<FaImages className="text-slate-600" />}
                      checked={targets.camera}
                      onChange={() => handleToggleTarget("camera")}
                    />
                    <CleanupOption
                      label="WhatsApp Media"
                      count={report.media.whatsapp}
                      icon={<FaWhatsapp className="text-green-600" />}
                      checked={targets.whatsapp}
                      onChange={() => handleToggleTarget("whatsapp")}
                    />
                    <CleanupOption
                      label="Descargas"
                      count={report.media.downloads}
                      icon={<FaDownload className="text-orange-500" />}
                      checked={targets.downloads}
                      onChange={() => handleToggleTarget("downloads")}
                    />
                  </div>
                </div>

                {/* COLUMNA 3: APPS */}
                <div className="lg:col-span-1 flex flex-col h-[420px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  <div className="p-3 border-b border-slate-200 bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-md font-bold text-slate-700 flex items-center gap-2">
                        Aplicaciones Instaladas{" "}
                        <div className="bg-green-200 rounded-sm px-2 items-center justify-center">
                          <span className="text-md font-bold">
                            {appsList.length}
                          </span>
                        </div>
                      </h4>
                    </div>
                    <div className="relative">
                      <FaSearch className="absolute left-2.5 top-2.5 text-slate-400 text-xs" />
                      <input
                        type="text"
                        placeholder="Buscar aplicación..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        value={appSearchTerm}
                        onChange={(e) => setAppSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-300">
                    {filteredApps.length === 0 ? (
                      <div className="text-center text-slate-400 mt-10 text-xs">
                        No se encontraron apps
                      </div>
                    ) : (
                      filteredApps.map((app) => (
                        <div
                          key={app.packageName}
                          onClick={() =>
                            !app.isProtected && handleToggleApp(app.packageName)
                          }
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs border
                            ${
                              app.isProtected
                                ? "bg-slate-100 border-transparent opacity-60 cursor-not-allowed"
                                : selectedApps.includes(app.packageName)
                                  ? "bg-red-50 border-red-200"
                                  : "bg-white border-transparent hover:border-slate-200"
                            }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0
                            ${selectedApps.includes(app.packageName) ? "bg-red-500 border-red-500 text-white" : "bg-white border-slate-300"}`}
                          >
                            {app.isProtected ? (
                              <FaLock className="text-[8px] text-slate-400" />
                            ) : (
                              selectedApps.includes(app.packageName) && (
                                <FaCheckCircle className="text-[10px]" />
                              )
                            )}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`font-medium truncate ${selectedApps.includes(app.packageName) ? "text-red-700" : "text-slate-700"}`}
                            >
                              {app.label}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate">
                              {app.packageName}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* FOOTER DE ACCIÓN */}
              <div className="pt-4 bg-white border-t border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div
                    className={`${totalSelected > 0 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"} p-2 rounded-lg`}
                  >
                    <ListTodo className="h-7 w-7" />
                  </div>
                  <div>
                    <p
                      className={`text-sm font-bold ${totalSelected > 0 ? "text-red-600 shadow-2xl shadow-red-500" : "text-slate-700"}`}
                    >
                      {totalSelected} seleccionados
                    </p>
                    <p className="text-xs text-slate-400">
                      Listos para eliminar
                    </p>
                  </div>
                </div>
                <button
                  onClick={goToReview}
                  disabled={totalSelected === 0}
                  className={`text-sm cursor-pointer px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all
                    ${
                      totalSelected > 0
                        ? "bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg active:scale-95"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                >
                  Borrar Seleccionados <FaArrowLeft className="rotate-180" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* VISTA 3: REVISIÓN */}
        {step === "review" && (
          <AnimatePresence>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="h-full flex flex-col relative"
            >
              <div className="flex-1">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex gap-4 items-start">
                  <div className="bg-red-100 p-2 rounded-full shrink-0">
                    <Megaphone className="text-red-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-red-800 font-bold mb-1">
                      Advertencia de Eliminación Permanente
                    </h3>
                    <p className="text-sm text-orange-700 leading-relaxed">
                      Estás a punto de eliminar{" "}
                      <strong>{totalSelected} elementos</strong>. Esta acción es
                      irreversible.
                    </p>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Resumen de elementos
                </h4>

                <div className="max-h-90 overflow-y-auto pr-2 rounded-lg p-1 custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {getReviewSummary().map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm group hover:border-red-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div
                            className={`p-2 rounded-md shrink-0 ${
                              item.isApp
                                ? "bg-green-100 text-green-600"
                                : "bg-red-100 text-red-500"
                            }`}
                          >
                            {item.icon}
                          </div>
                          <span className="text-xs font-bold text-slate-700 truncate">
                            {item.label}
                          </span>
                        </div>

                        <button
                          onClick={() =>
                            handleRemoveFromReview(item.type, item.id)
                          }
                          className="ml-2 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors cursor-pointer"
                          title="Quitar de la lista"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 bg-white border-t border-slate-200 flex justify-center items-center gap-4">
                <button
                  onClick={() => setStep("selection")}
                  className="cursor-pointer w-56 py-2.5 border border-slate-300 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeCleanup}
                  className="cursor-pointer w-56 py-2.5 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-200 transition-colors flex justify-center items-center gap-2"
                >
                  <FaTrash className="text-xs" /> Confirmar Eliminación
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* VISTA 4: PROCESANDO / RESULTADOS */}
        {(step === "processing" || step === "results") && (
          <div className="h-full flex flex-col relative">
            <div className="flex-1 p-6 mb-10 flex flex-col overflow-hidden">
              {/* Encabezado del estado */}
              <div className="text-center mb-6 shrink-0">
                {step === "processing" ? (
                  <div className="animate-pulse">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FaSpinner className="text-3xl text-blue-500 animate-spin" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">
                      Eliminando datos...
                    </h3>
                    <p className="text-sm text-slate-500">
                      Por favor no desconectes el dispositivo
                    </p>
                  </div>
                ) : (
                  <div className="animate-fade-in-up">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FaCheckCircle className="text-3xl text-green-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">
                      ¡Limpieza Finalizada!
                    </h3>
                    <p className="text-sm text-slate-500">
                      El proceso ha terminado correctamente.
                    </p>
                  </div>
                )}
              </div>

              {/* Consola de Logs Estilizada */}
              <div className="flex-1 bg-slate-900 rounded-xl p-4 overflow-y-auto font-mono text-xs text-green-400 shadow-inner border border-slate-800 custom-scrollbar">
                {logs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-600 italic">
                    Iniciando secuencia de comandos...
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {logs.map((log, idx) => (
                      <motion.li
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={idx}
                        className="flex items-start gap-2 border-b border-slate-800 pb-1 last:border-0"
                      >
                        <span className="mt-0.5 opacity-50">➜</span>
                        <span>{log}</span>
                      </motion.li>
                    ))}
                    {step === "processing" && (
                      <li className="flex items-center gap-2 text-slate-400 animate-pulse mt-4 pt-2 border-t border-dashed border-slate-700">
                        <FaSpinner className="animate-spin text-[10px]" />{" "}
                        Procesando siguiente tarea...
                      </li>
                    )}
                    {step === "results" && (
                      <li className="text-green-300 font-bold mt-4 pt-4 border-t border-slate-700 flex items-center gap-2">
                        ✅ PROCESO COMPLETADO
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            <div className="pt-4 bg-white border-t border-slate-200 flex justify-center items-center">
              <button
                onClick={finishProcess}
                disabled={step === "processing"}
                className={`text-sm w-56 py-2.5 rounded-lg font-bold transition-colors shadow-lg flex justify-center items-center gap-2
                  ${
                    step === "processing"
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                      : "bg-slate-800 text-white hover:bg-slate-700 cursor-pointer shadow-slate-300"
                  }`}
              >
                {step === "processing" ? (
                  <>
                    {" "}
                    <FaSpinner className="animate-spin" /> Esperando...{" "}
                  </>
                ) : (
                  "Finalizar y Volver"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Subcomponente Opciones
const CleanupOption = ({ label, count, icon, checked, onChange }: any) => {
  const isDisabled = count === 0;

  return (
    <div
      onClick={!isDisabled ? onChange : undefined}
      className={`flex items-center justify-between p-3 rounded-lg border transition-all
        ${
          isDisabled
            ? "border-slate-100 bg-slate-50 cursor-not-allowed opacity-60"
            : checked
              ? "border-red-500 bg-red-50 cursor-pointer shadow-sm"
              : "border-slate-200 hover:border-red-200 hover:bg-slate-50 cursor-pointer"
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-md ${isDisabled ? "bg-slate-200 text-slate-400" : checked ? "bg-red-100 text-red-500" : "bg-slate-100 text-slate-500"}`}
        >
          {isDisabled ? <FaBan className="text-xs" /> : icon}
        </div>
        <div>
          <p
            className={`font-bold text-xs ${isDisabled ? "text-slate-400" : checked ? "text-red-700" : "text-slate-700"}`}
          >
            {label}
          </p>
          <p className="text-[10px] text-slate-500">
            {count > 0 ? `${count} items` : "Vacío"}
          </p>
        </div>
      </div>
      {!isDisabled && (
        <div
          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors
          ${checked ? "border-red-500 bg-red-500 text-white" : "border-slate-300 bg-white"}`}
        >
          {checked && <FaCheckCircle className="text-[10px]" />}
        </div>
      )}
    </div>
  );
};
