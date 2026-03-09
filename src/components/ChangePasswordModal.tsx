/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  X,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { FaSpinner } from "react-icons/fa";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePassword({
  isOpen,
  onClose,
}: ChangePasswordModalProps) {
  const { changePassword, user } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validaciones en tiempo real
  const hasMinLength = newPassword.length >= 6;
  const hasNoSpaces = !/\s/.test(newPassword) && newPassword.length > 0;
  const passwordsMatch =
    newPassword === confirmPassword && newPassword.length > 0;

  useEffect(() => {
    if (isOpen) {
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    setter(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasMinLength || !hasNoSpaces || !passwordsMatch) {
      setError("Por favor, cumple con todos los requisitos de seguridad.");
      return;
    }

    setLoading(true);

    try {
      await changePassword(newPassword);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/requires-recent-login") {
        setError(
          "Por seguridad, cierra sesión y vuelve a entrar para continuar.",
        );
      } else {
        setError("No se pudo actualizar la contraseña. Inténtalo más tarde.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Tarjeta Modal */}
          <motion.div
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón Cerrar */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Contenido Principal */}
            <div className="px-8 pt-10 pb-8">
              {success ? (
                <div className="flex flex-col items-center text-center py-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6"
                  >
                    <ShieldCheck className="w-12 h-12 text-green-500" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">
                    ¡Protección Actualizada!
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Tu contraseña ha sido modificada exitosamente.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Cabecera */}
                  <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-blue-100">
                      <KeyRound className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">
                      Nueva Contraseña
                    </h2>
                    <p className="flex text-xs text-slate-400 mt-1 gap-1">
                      Usuario:
                      <p className="text-slate-600">{user?.email}</p>
                    </p>
                  </div>

                  {/* Mensaje Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-4 border border-red-100 font-medium text-center"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-4">
                    {/* Input Nueva */}
                    <div className="relative group">
                      <div className="absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                        placeholder="Nueva contraseña"
                        value={newPassword}
                        onChange={(e) => handleInputChange(e, setNewPassword)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {/* Input Confirmar */}
                    <div className="relative group">
                      <div className="absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                        placeholder="Confirmar contraseña"
                        value={confirmPassword}
                        onChange={(e) =>
                          handleInputChange(e, setConfirmPassword)
                        }
                      />
                    </div>
                  </div>

                  {/* Validadores Visuales */}
                  <div className="mt-6 space-y-2">
                    <RequirementItem
                      met={hasMinLength}
                      label="Mínimo 6 caracteres"
                    />
                    <RequirementItem
                      met={hasNoSpaces}
                      label="Sin espacios en blanco"
                    />
                    <RequirementItem
                      met={passwordsMatch}
                      label="Las contraseñas coinciden"
                    />
                  </div>

                  {/* Botón Acción */}
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !hasMinLength ||
                      !hasNoSpaces ||
                      !passwordsMatch
                    }
                    className={`w-full mt-8 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg flex justify-center items-center gap-2 transition-all transform active:scale-[0.98]
                      ${
                        loading ||
                        !hasMinLength ||
                        !hasNoSpaces ||
                        !passwordsMatch
                          ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                          : "bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/25"
                      }`}
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="animate-spin" /> Actualizando...
                      </>
                    ) : (
                      "Actualizar Contraseña"
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Subcomponente para los requisitos
const RequirementItem = ({ met, label }: { met: boolean; label: string }) => (
  <div
    className={`flex items-center gap-2 text-xs transition-colors duration-300 ${
      met ? "text-green-600 font-medium" : "text-slate-400"
    }`}
  >
    <div
      className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all duration-300 ${
        met
          ? "bg-green-500 border-green-500"
          : "border-slate-300 bg-transparent"
      }`}
    >
      {met && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
    </div>
    <span>{label}</span>
  </div>
);
