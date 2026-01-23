export interface Contacto {
  ID_Telefono: string;
  ID_Contacto: string;
  Nombre: string;
  Telefono: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  deviceName?: string;
  serial?: string;
  preview?: Contacto[];
}
