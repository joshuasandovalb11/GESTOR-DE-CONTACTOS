import {
  MonitorSmartphone,
  Contact,
  Image,
  LogOut,
  KeyRound,
  User,
  BrushCleaning,
  Unplug,
} from "lucide-react";
import { FaUsb } from "react-icons/fa";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  deviceInfo: { name: string; serial: string };
  connected: boolean;
  onLogout: () => void;
  onChangePassword: () => void;
  onDisconnect: () => void;
  userEmail: string;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  deviceInfo,
  connected,
  onLogout,
  onChangePassword,
  onDisconnect,
  userEmail,
}: SidebarProps) {
  const menuItems = [
    { id: "contacts", label: "Contactos", icon: Contact },
    { id: "media", label: "Multimedia", icon: Image },
    { id: "restore", label: "Formatear", icon: BrushCleaning, disabled: false },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 z-50 shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3 text-white">
          <div className="bg-blue-600 p-2 rounded-lg">
            <MonitorSmartphone className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Android Manager</h1>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-500">v2.0</span>
              <span className="font-mono text-[11px] text-slate-500">
                20/02/2026
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Estado del Dispositivo */}
      <div className="px-4 py-6">
        <div className={`rounded-xl px-4 py-3 transition-colors bg-slate-800`}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-2 h-2 rounded-full ${
                connected
                  ? "bg-green-500 shadow-[0_0_8px_#22c55e]"
                  : "bg-red-500 animate-pulse"
              }`}
            ></div>
            <span
              className={`text-xs font-bold tracking-wide ${
                connected ? "text-green-400" : "text-red-400 animate-pulse"
              }`}
            >
              {connected ? "Conectado" : "Desconectado"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-white font-medium truncate mb-1">
            <FaUsb className={connected ? "text-blue-400" : "text-slate-600"} />
            <span className="truncate text-sm">
              {connected ? deviceInfo.name : "Sin dispositivo"}
            </span>
          </div>

          {connected && (
            <>
              <p className="text-[10px] text-slate-400 font-mono ml-6 truncate mb-3">
                N/S: {deviceInfo.serial}
              </p>

              {/* 4. BOTÓN DE DESCONEXIÓN AÑADIDO AQUÍ */}
              <button
                onClick={onDisconnect}
                className="w-full flex items-center justify-center gap-2 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Unplug className="w-3 h-3" /> Desconectar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Menú Principal */}
      <nav className="flex-1 px-3 space-y-1">
        <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-2">
          Gestión
        </p>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.disabled && setActiveTab(item.id)}
            disabled={!connected || item.disabled}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all
              ${
                activeTab === item.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "hover:bg-slate-800 text-slate-400 hover:text-white"
              }
              ${(!connected || item.disabled) && "opacity-50 cursor-not-allowed grayscale"}
            `}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
            {item.disabled && (
              <span className="ml-auto text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                Pronto
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer Usuario */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {userEmail?.split("@")[0]}
            </p>
            <p className="text-xs text-slate-500 truncate" title={userEmail}>
              {userEmail}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onChangePassword}
            className="flex flex-col items-center justify-center cursor-pointer gap-1 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors text-xs"
          >
            <KeyRound className="w-4 h-4" />
            <span>Contraseña</span>
          </button>
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center cursor-pointer gap-1 p-2 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 transition-colors text-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
