/* eslint-disable @typescript-eslint/no-explicit-any */
// src/types/index.ts

export interface Contacto {
  ID_Telefono: string; // ID de la fila del número
  ID_Contacto: string; // ID del contacto
  Nombre: string;
  Telefono: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  details?: any;
  preview?: Contacto[];
}
