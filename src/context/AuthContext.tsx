// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  updatePassword,
  type User,
} from "firebase/auth";
import { auth } from "../firebaseConfig";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔵 Iniciando AuthProvider...");

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        console.log(
          "🟢 Firebase respondió. Usuario:",
          currentUser ? "SÍ" : "NO",
        );
        setUser(currentUser);
        setLoading(false);
      },
      (error) => {
        console.error("🔴 Error en Firebase Auth:", error);
        setLoading(false);
      },
    );

    const safetyTimer = setTimeout(() => {
      setLoading((currentLoading) => {
        if (currentLoading) {
          console.warn("⚠️ Firebase tardó demasiado. Forzando carga a false.");
          return false;
        }
        return currentLoading;
      });
    }, 4000);

    return () => {
      unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const changePassword = async (newPassword: string) => {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, newPassword);
    } else {
      throw new Error("No hay usuario autenticado");
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-sans text-sm animate-pulse">
          Conectando servicios...
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};
