import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { FaUsb, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import {
  MonitorSmartphone,
  Loader2,
  User,
  ChevronDown,
  KeyRound,
  LogOut,
  TriangleAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import ChangePassword from "./components/ChangePasswordModal";
import ContactTable from "./components/ContactTable";
import type { ApiResponse } from "./types";

const RealisticUsbDisconnect = ({
  onDisconnect,
}: {
  onDisconnect: () => void;
}) => {
  return (
    <motion.button
      onClick={onDisconnect}
      className="group relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm hover:border-red-300 hover:ring-2 ring-red-400 transition-all cursor-pointer overflow-hidden"
      whileTap={{ scale: 0.97 }}
      initial="connected"
      whileHover="disconnected"
    >
      <motion.div
        className="absolute inset-0 bg-red-50 z-0"
        variants={{
          connected: { x: "-100%" },
          disconnected: { x: "0%" },
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
      <span className="relative z-10 text-xs font-bold text-slate-700 group-hover:text-red-700 transition-colors">
        Desconectar
      </span>

      <div className="relative flex items-center h-6 w-16 ml-1 perspective-[60px]">
        <div className="relative z-20 h-full flex items-center">
          <div className="h-4.5 w-5 bg-slate-800 rounded-l-sm border-y border-l border-slate-600 shadow-md relative flex flex-col justify-evenly pl-0.5">
            <div className="w-2.5 h-px bg-yellow-600 rounded-full"></div>
            <div className="w-2.5 h-px bg-yellow-600 rounded-full"></div>
            <div className="w-2.5 h-px bg-yellow-600 rounded-full"></div>
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-slate-500 rounded-full blur-[0.5px] z-30"></div>
        </div>

        <motion.div
          className="relative z-10 flex items-center shadow-sm -ml-1"
          variants={{
            connected: { x: -6 },
            disconnected: { x: 12 },
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="h-3 w-4 bg-linear-to-r from-slate-300 via-slate-100 to-slate-400 border-y border-r border-slate-500 rounded-r-xs flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-px h-px w-full bg-white/60"></div>
          </div>

          <div className="h-5 w-6 bg-slate-700 rounded-r border-y border-r border-slate-600 flex items-center relative -ml-px">
            <motion.div
              className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_3px_rgba(34,197,94,0.8)] absolute right-2"
              variants={{
                connected: { backgroundColor: "#22c55e" },
                disconnected: { backgroundColor: "#FF0000" },
              }}
            />
            <div className="absolute top-1 left-1.5 right-1.5 h-px bg-slate-800/50 rounded-full"></div>
            <div className="absolute bottom-1 left-1.5 right-1.5 h-px bg-slate-800/50 rounded-full"></div>
            <div className="absolute left-full top-1/2 -translate-y-1/2 h-1.5 w-10 bg-slate-700 -ml-px"></div>
          </div>
        </motion.div>
      </div>
    </motion.button>
  );
};

function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [isLoginTransition, setIsLoginTransition] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>("Esperando conexión...");
  const [deviceModel, setDeviceModel] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [connectionSuccess, setConnectionSuccess] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [showGlobalLoader, setShowGlobalLoader] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);

  const API_URL = import.meta.env.DEV ? "http://localhost:5000" : "";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    setStatus("Buscando dispositivo Android...");
    setConnectionSuccess(false);
    setConnectionError(false);

    try {
      const response = await axios.get<ApiResponse>(`${API_URL}/check-device`);

      if (response.data.success) {
        const rawModel = response.data.details
          ? response.data.details[0]
          : "Android";
        setDeviceModel(rawModel.replace("device", "").trim());
        setStatus("¡Dispositivo Encontrado!");

        setLoading(false);
        setConnectionSuccess(true);

        setTimeout(() => {
          setConnectionSuccess(false);
          setShowGlobalLoader(true);

          setTimeout(() => {
            setShowGlobalLoader(false);
            setConnected(true);
          }, 2000);
        }, 1500);
      }
    } catch (error) {
      console.error(error);
      setStatus("No se encontró ningún dispositivo. Revisa el cable USB.");
      setConnected(false);
      setConnectionSuccess(false);
      setConnectionError(true);
      setLoading(false);
      setDeviceModel("");
    }
  };

  const handleDisconnect = () => {
    setConnected(false);
    setConnectionSuccess(false);
    setConnectionError(false);
    setShowGlobalLoader(false);
    setStatus("Esperando conexión...");
    setDeviceModel("");
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
    <div className="min-h-screen flex flex-col bg-slate-50/50 font-sans">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg shadow-blue-200 shadow-md">
            <MonitorSmartphone className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">
              Gestor de Contactos
            </h1>
            <p className="text-xs text-slate-500">Android v1.0</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`flex items-center cursor-pointer gap-2 pl-2 pr-2 py-1 rounded-full border transition-all ${
                isUserMenuOpen
                  ? "bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-100"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <User className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium hidden sm:block max-w-[100px] truncate">
                {user.email?.split("@")[0]}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${isUserMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 origin-top-right"
                >
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                      Cuenta Actual
                    </p>
                    <p
                      className="text-sm font-medium text-slate-800 truncate"
                      title={user.email || ""}
                    >
                      {user.email}
                    </p>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsPasswordModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2.5 cursor-pointer text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg flex items-center gap-3 transition-colors"
                    >
                      <KeyRound className="w-4 h-4" />
                      Cambiar Contraseña
                    </button>

                    <div className="h-px bg-slate-100 my-1 mx-2"></div>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsLogoutModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2.5 cursor-pointer text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-3 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex justify-center items-start p-4 md:p-8 transition-all">
        {showGlobalLoader ? (
          <div className="flex flex-col items-center justify-center mt-20 animate-fade-in">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FaUsb className="text-slate-300 text-xl" />
              </div>
            </div>
            <h3 className="mt-6 text-xl font-bold text-slate-700">
              Inicializando Sistema
            </h3>
            <p className="text-slate-500 mt-2 animate-pulse">
              Leyendo configuración del dispositivo...
            </p>
          </div>
        ) : !connected ? (
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 animate-fade-in-up transition-all duration-500">
            <div
              className={`p-6 border-b border-slate-100 text-center transition-colors duration-500 
              ${connectionSuccess ? "bg-green-50" : connectionError ? "bg-red-50" : "bg-slate-50"}`}
            >
              <h2
                className={`text-lg font-semibold ${connectionSuccess ? "text-green-700" : connectionError ? "text-red-700" : "text-slate-700"}`}
              >
                {connectionSuccess
                  ? "¡Conexión Establecida!"
                  : connectionError
                    ? "Error de Conexión"
                    : "Estado de Conexión"}
              </h2>
              <p
                className={`text-sm ${connectionSuccess ? "text-green-600" : connectionError ? "text-red-600" : "text-slate-500"}`}
              >
                {connectionSuccess
                  ? "Redirigiendo al panel..."
                  : connectionError
                    ? "Verifica que la depuración USB esté activa"
                    : "Conecta tu celular por USB para comenzar"}
              </p>
            </div>

            <div className="p-8 flex flex-col items-center gap-6">
              <div
                className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 shadow-inner 
                  ${connectionSuccess ? "bg-green-100 text-green-600 scale-110 shadow-green-200" : connectionError ? "bg-red-100 text-red-600 shadow-red-200" : "bg-slate-100 text-slate-400"}`}
              >
                {connectionSuccess ? (
                  <FaCheckCircle className="text-6xl animate-bounce" />
                ) : connectionError ? (
                  <FaExclamationCircle className="text-6xl animate-pulse" />
                ) : (
                  <FaUsb className="text-5xl" />
                )}
              </div>

              <div className="text-center h-14 flex flex-col justify-center">
                <h3
                  className={`text-xl font-bold transition-colors duration-300 ${connectionSuccess ? "text-green-600" : connectionError ? "text-red-600" : "text-slate-700"}`}
                >
                  {connectionSuccess
                    ? "Listo"
                    : connectionError
                      ? "Desconectado"
                      : "Desconectado"}
                </h3>
                <p
                  className={`text-sm mt-1 transition-colors duration-300 ${connectionSuccess ? "text-green-600 font-medium" : connectionError ? "text-red-500" : "text-slate-500"}`}
                >
                  {status}
                </p>
              </div>

              <button
                onClick={checkConnection}
                disabled={loading || connectionSuccess}
                className={`w-full py-3 px-6 mt-4 rounded-xl font-bold text-white shadow-md transition-all transform active:scale-[0.98] flex justify-center items-center gap-3 cursor-pointer
                  ${loading ? "bg-slate-400 cursor-not-allowed" : connectionSuccess ? "bg-green-500 cursor-default shadow-green-300" : connectionError ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" /> Verificando...
                  </>
                ) : connectionSuccess ? (
                  <>
                    <FaCheckCircle /> ¡Conectado!
                  </>
                ) : connectionError ? (
                  "Reintentar Conexión"
                ) : (
                  "Conectar Dispositivo"
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-4 animate-fade-in">
            <div className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-4 mb-2">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  Mis Contactos
                  <FaCheckCircle
                    className="text-green-500 text-lg"
                    title="Conexión estable"
                  />
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Gestionando dispositivo:{" "}
                  <span className="font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-800 font-bold border border-slate-300">
                    {deviceModel || "Android"}
                  </span>
                </p>
              </div>

              <RealisticUsbDisconnect onDisconnect={handleDisconnect} />
            </div>

            <ContactTable />
          </div>
        )}
      </main>

      <AnimatePresence>
        {isLogoutModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-10 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsLogoutModalOpen(false)}
          >
            <motion.div
              className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border-t-4 border-red-500"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
                  <TriangleAlert className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  ¿Cerrar Sesión?
                </h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  ¿Estás seguro de que quieres salir? Tendrás que volver a
                  ingresar tus credenciales.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setIsLogoutModalOpen(false)}
                    className="flex-1 px-4 py-2.5 cursor-pointer text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setIsLogoutModalOpen(false);
                      logout();
                    }}
                    className="flex-1 px-4 py-2.5 cursor-pointer text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
                  >
                    Salir
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChangePassword
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}

export default App;
