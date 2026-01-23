import { useState } from "react";
import axios from "axios";
import { FaUsb, FaCheckCircle } from "react-icons/fa";
import { Loader2, Smartphone, TriangleAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import { Toaster } from "sonner";

import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import ChangePassword from "./components/ChangePasswordModal";
import ContactTable from "./components/ContactTable";
import MediaManager from "./components/MediaManager";
import RestoreManager from "./components/RestoreManager";
import type { ApiResponse } from "./types";

const API_URL = import.meta.env.DEV ? "http://localhost:5000" : "";

function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("contacts");

  // Estados de UI Globales
  const [isLoginTransition, setIsLoginTransition] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Estados de Conexión
  const [status, setStatus] = useState<string>("Esperando conexión...");
  const [loading, setLoading] = useState<boolean>(false);
  const [connectionSuccess, setConnectionSuccess] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [deviceInfo, setDeviceInfo] = useState({ name: "", serial: "" });

  const checkConnection = async () => {
    setLoading(true);
    setStatus("Procesando conexión...");
    setConnectionSuccess(false);
    setConnectionError(false);

    const loadingTime = new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const [response] = await Promise.all([
        axios.get<ApiResponse>(`${API_URL}/check-device`),
        loadingTime,
      ]);

      if (response.data.success) {
        setDeviceInfo({
          name: response.data.deviceName || "Android",
          serial: response.data.serial || "S/N Desconocido",
        });

        setLoading(false);
        setConnectionSuccess(true);
        setStatus("¡Dispositivo Autorizado!");

        setTimeout(() => {
          setConnected(true);
        }, 1500);
      }
    } catch (error) {
      console.error(error);

      await loadingTime;

      setStatus("No se detectó dispositivo o falta autorización.");
      setConnected(false);
      setConnectionError(true);
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setConnected(false);
    setConnectionSuccess(false);
    setDeviceInfo({ name: "", serial: "" });
    setActiveTab("contacts");
    setStatus("Esperando conexión...");
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 h-10 w-10" />
      </div>
    );
  }

  if (!user || isLoginTransition) {
    return <Login onLoginTransition={setIsLoginTransition} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Toaster */}
      <Toaster richColors position="top-center" closeButton />

      {/* Sidebar Fijo */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        deviceInfo={deviceInfo}
        connected={connected}
        userEmail={user.email || ""}
        onLogout={() => setIsLogoutModalOpen(true)}
        onChangePassword={() => setIsPasswordModalOpen(true)}
        onDisconnect={handleDisconnect}
      />

      {/* Área Principal Dinámica */}
      <main className="flex-1 ml-64 overflow-hidden h-screen flex flex-col transition-all">
        {/* VISTA DE CONEXIÓN */}
        {!connected ? (
          <div className="h-full flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col md:flex-row">
              <div
                className={`w-full md:w-5/12 p-10 flex flex-col items-center justify-center transition-colors duration-500 relative overflow-hidden
                ${connectionSuccess ? "bg-green-50" : connectionError ? "bg-red-50" : "bg-blue-50"}
              `}
              >
                <div
                  className={`absolute w-64 h-64 rounded-full blur-3xl opacity-20 -top-10 -left-10
                   ${connectionSuccess ? "bg-green-400" : connectionError ? "bg-red-400" : "bg-blue-400"}
                `}
                ></div>

                <div
                  className={`relative z-10 w-40 h-40 rounded-full flex items-center justify-center mb-6 shadow-lg bg-white transition-all duration-500
                   ${connectionSuccess ? "text-green-600 ring-4 ring-green-100" : connectionError ? "text-red-500 ring-4 ring-red-100" : "text-blue-500 ring-4 ring-blue-100"}
                `}
                >
                  {loading ? (
                    <Loader2 className="w-20 h-20 animate-spin opacity-50" />
                  ) : connectionSuccess ? (
                    <FaCheckCircle className="w-20 h-20 animate-bounce" />
                  ) : connectionError ? (
                    <TriangleAlert
                      className="w-20 h-20 animate-pulse"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <Smartphone
                      className="w-20 h-20 animate-pulse"
                      strokeWidth={1.5}
                    />
                  )}
                </div>
              </div>

              <div className="w-full md:w-7/12 p-10 flex flex-col justify-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  {connectionSuccess ? "Conectado" : "Bienvenido"}
                </h2>
                <p
                  className={`text-md mb-8 font-medium ${connectionError ? "text-red-500" : "text-slate-500"}`}
                >
                  {status}
                </p>

                <button
                  onClick={checkConnection}
                  disabled={loading || connectionSuccess}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-lg text-white shadow-lg transition-all transform active:scale-[0.98] flex justify-center items-center gap-3 cursor-pointer
                    ${
                      loading
                        ? "bg-slate-300 cursor-not-allowed shadow-none text-slate-500"
                        : connectionSuccess
                          ? "bg-green-500 hover:bg-green-600 shadow-green-500/30"
                          : connectionError
                            ? "bg-red-500 hover:bg-red-600 shadow-red-500/30"
                            : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 hover:shadow-blue-500/40"
                    }
                  `}
                >
                  {loading ? <Loader2 className="animate-spin" /> : <FaUsb />}
                  {loading
                    ? "Verificando..."
                    : connectionSuccess
                      ? "Iniciando..."
                      : "Conectar Dispositivo"}
                </button>

                {/* Guía Rápida */}
                {!connectionSuccess && !loading && (
                  <div className="mt-8 pt-8 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                      Requisitos previos
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          1
                        </div>
                        <span>Conectar cable USB al PC</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          2
                        </div>
                        <span>
                          Activar{" "}
                          <span className="font-bold">
                            Opciones de Desarrollador
                          </span>
                        </span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          3
                        </div>
                        <span>
                          Habilitar{" "}
                          <span className="font-bold">Depuración USB</span>
                        </span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* VISTA DEL DASHBOARD */
          <div className="flex-1 overflow-y-auto p-8 animate-fade-in flex flex-col">
            <div className="max-w-6xl mx-auto w-full flex flex-col flex-1">
              {/* Header de la Vista */}
              <div className="flex justify-between items-end mb-6 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    {activeTab === "contacts" && "Gestión de Contactos"}
                    {activeTab === "media" && "Respaldo de Multimedia"}
                    {activeTab === "restore" && "Limpieza del Dispositivo"}
                  </h2>
                  <p className="text-slate-500 mt-1">
                    {activeTab === "contacts" &&
                      "Administra, edita e importa los contactos."}
                    {activeTab === "media" &&
                      "Respalda fotos y videos del dispositivo."}
                    {activeTab === "restore" &&
                      "Elimina aplicaciones, contactos, archivos y datos personales."}
                  </p>
                </div>
              </div>

              {/* Contenido Dinámico */}
              <div className="min-h-[500px]">
                {activeTab === "contacts" && (
                  <ContactTable deviceName={deviceInfo.name} />
                )}
                {activeTab === "media" && (
                  <MediaManager deviceName={deviceInfo.name} />
                )}
                {activeTab === "restore" && <RestoreManager />}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modales Globales */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <ModalLogout
            onClose={() => setIsLogoutModalOpen(false)}
            onConfirm={logout}
          />
        )}
      </AnimatePresence>

      <ChangePassword
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}

// Modal Logout
const ModalLogout = ({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <motion.div
    className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
  >
    <motion.div
      className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border-t-4 border-red-500"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
          <TriangleAlert className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          ¿Cerrar Sesión?
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Tendrás que volver a ingresar tus credenciales.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
          >
            Salir
          </button>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

export default App;
