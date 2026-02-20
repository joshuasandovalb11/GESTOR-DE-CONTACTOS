/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  FaSync,
  FaFileExcel,
  FaSearch,
  FaEdit,
  FaTrash,
  FaSave,
  FaTimes,
  FaFileUpload,
  FaSpinner,
  FaExclamationTriangle,
  FaCheckCircle,
  FaFilter,
  FaChevronDown,
  FaPlus,
  FaMobileAlt,
  FaFolderOpen,
  FaHandPointUp,
  FaMobile,
} from "react-icons/fa";
import type { Contacto, ApiResponse } from "../types";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowBigDownDash, UserRoundPen, X } from "lucide-react";

interface ImportError {
  row: number;
  name: string;
  phone: string;
  reason: string;
}

interface ContactTableProps {
  deviceName?: string;
}

const API_URL = import.meta.env.DEV ? "http://localhost:5000" : "";

const cleanPhoneNumber = (phone: string) => {
  const cleaned = String(phone || "").replace(/\D/g, "");
  return cleaned.length > 10 ? cleaned.slice(-10) : cleaned;
};

const formatPhoneNumber = (value: string) => {
  if (!value) return "";
  const phoneNumber = cleanPhoneNumber(value);
  const phoneNumberLength = phoneNumber.length;

  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 7) {
    return `${phoneNumber.slice(0, 3)} ${phoneNumber.slice(3)}`;
  }
  return `${phoneNumber.slice(0, 3)} ${phoneNumber.slice(3, 6)} ${phoneNumber.slice(6, 10)}`;
};

// Modal generico
const Modal = ({
  children,
  onClose,
  className = "bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100",
}: {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className={className}
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 20, stiffness: 300, mass: 0.8 }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

export default function ContactTable({
  deviceName = "Android",
}: ContactTableProps) {
  const [contacts, setContacts] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [editingContact, setEditingContact] = useState<Contacto | null>(null);
  const [editForm, setEditForm] = useState({ newName: "", newPhone: "" });
  const [formErrors, setFormErrors] = useState({ name: "", phone: "" });

  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [validContactsToUpload, setValidContactsToUpload] = useState<any[]>([]);

  const [contactToDelete, setContactToDelete] = useState<Contacto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [vcfInstructions, setVcfInstructions] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [unchangedCount, setUnchangedCount] = useState(0);
  const [newInsertCount, setNewInsertCount] = useState(0);
  const [excelDuplicateCount, setExcelDuplicateCount] = useState(0);

  const [filterType, setFilterType] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [generatedFileName, setGeneratedFileName] = useState("");

  const isFormValid = () => {
    const cleanPhone = cleanPhoneNumber(editForm.newPhone);
    return editForm.newName.trim() !== "" && cleanPhone.length === 10;
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await axios.get<ApiResponse>(`${API_URL}/get-contacts`, {
        params: { deviceName: deviceName },
      });

      if (response.data.success) {
        const loadedContacts = response.data.preview || [];
        setContacts(loadedContacts);
        setHasSynced(true);

        if ((response.data as any).fileName) {
          setGeneratedFileName((response.data as any).fileName);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const executeDownload = (fileName: string) => {
    const fileUrl = `${API_URL}/files/${fileName}`;
    const link = document.createElement("a");
    link.href = fileUrl;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Descarga iniciada.");
  };

  const downloadExcel = () => {
    if (!hasSynced) {
      toast.warning("Sincroniza los contactos primero.");
      return;
    }

    if (contacts.length === 0) {
      toast("La lista está vacía", {
        description: "¿Deseas descargar una plantilla vacía?",
        action: {
          label: "Descargar",
          onClick: () => {
            const finalFileName =
              generatedFileName || `Plantilla_Contactos.xlsx`;
            executeDownload(finalFileName);
          },
        },
      });
      return;
    }

    const finalFileName =
      generatedFileName || `Contactos_Clientes - ${deviceName}.xlsx`;
    executeDownload(finalFileName);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasSynced) {
      toast.warning("Debes sincronizar antes de importar", {
        description:
          "Esto evita duplicar contactos existentes en el dispositivo.",
        duration: 5000,
      });
      e.target.value = "";
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data: any[] = XLSX.utils.sheet_to_json(ws);

      if (data.length === 0) {
        toast.error("El archivo Excel está vacío.");
        return;
      }

      const firstRow = data[0];
      if (!("Nombre" in firstRow) || !("Telefono" in firstRow)) {
        toast.error(
          "Formato inválido. Requiere columnas 'Nombre' y 'Telefono'.",
        );
        return;
      }

      validateExcelData(data);
    };
    reader.readAsBinaryString(file);
  };

  const validateExcelData = (data: any[]) => {
    const errors: ImportError[] = [];
    const batchOps: any[] = [];
    const seenInExcel = new Set<string>();

    let unchangedCountLocal = 0;
    let newInsertCountLocal = 0;
    let excelDuplicateCountLocal = 0;

    data.forEach((row, index) => {
      const realRowNumber = index + 2;
      const rawPhone = String(row.Telefono || "");
      const cleanPhone = cleanPhoneNumber(rawPhone);
      const rowName = String(row.Nombre || "").trim();
      const uniqueKey = `${rowName.toLowerCase()}|${cleanPhone}`;

      if (cleanPhone.length !== 10) {
        errors.push({
          row: realRowNumber,
          name: rowName || "Desconocido",
          phone: rawPhone,
          reason: `Teléfono inválido (${cleanPhone.length} dígitos).`,
        });
        return;
      }

      if (!rowName) {
        errors.push({
          row: realRowNumber,
          name: "---",
          phone: rawPhone,
          reason: "Nombre vacío.",
        });
        return;
      }

      if (seenInExcel.has(uniqueKey)) {
        excelDuplicateCountLocal++;
        return;
      }
      seenInExcel.add(uniqueKey);

      let existingContact = null;

      if (row.ID_Telefono) {
        existingContact = contacts.find(
          (c) => String(c.ID_Telefono) === String(row.ID_Telefono),
        );
      }

      if (!existingContact) {
        existingContact = contacts.find((c) => {
          const dbPhone = cleanPhoneNumber(c.Telefono);
          const dbName = c.Nombre.trim();
          const isSameFull = dbName === rowName && dbPhone === cleanPhone;

          const isSameNameDifferentPhone =
            dbName === rowName && dbPhone !== cleanPhone;

          return isSameFull || isSameNameDifferentPhone;
        });
      }

      if (existingContact) {
        const dbPhone = cleanPhoneNumber(existingContact.Telefono);
        const dbName = existingContact.Nombre.trim();

        if (dbName === rowName && dbPhone === cleanPhone) {
          unchangedCountLocal++;
          return;
        }

        batchOps.push({
          type: "UPDATE",
          ID_Contacto: existingContact.ID_Contacto,
          ID_Telefono: existingContact.ID_Telefono,
          Nombre: rowName,
          Telefono: cleanPhone,
        });
      } else {
        newInsertCountLocal++;
        batchOps.push({
          type: "INSERT",
          Nombre: rowName,
          Telefono: cleanPhone,
        });
      }
    });

    setUnchangedCount(unchangedCountLocal);
    setNewInsertCount(newInsertCountLocal);
    setExcelDuplicateCount(excelDuplicateCountLocal);
    setImportErrors(errors);
    setValidContactsToUpload(batchOps);

    if (
      errors.length > 0 ||
      batchOps.length > 0 ||
      excelDuplicateCountLocal > 0
    ) {
      setShowErrorModal(true);
    } else {
      toast.info(
        `Análisis: Sin cambios detectados. ${unchangedCountLocal} ya están al día.`,
      );
    }
  };

  const finishVcfProcess = () => {
    setImporting(false);
    setImportSuccess(false);
    setVcfInstructions(false);
    fetchContacts();
  };

  const startBatchUpdate = async (opsToProcess: any[]) => {
    setShowErrorModal(false);
    setImporting(true);
    setImportSuccess(false);
    setVcfInstructions(false);

    setProgress({ current: 0, total: opsToProcess.length });

    const inserts = opsToProcess
      .filter((op) => op.type === "INSERT")
      .map((op) => ({
        newName: op.Nombre,
        newPhone: op.Telefono,
      }));

    const updates = opsToProcess.filter((op) => op.type === "UPDATE");

    let vcfUsed = false;
    let processedCount = 0;

    if (inserts.length > 0) {
      try {
        const response = await axios.post(`${API_URL}/try-vcf-import`, {
          contacts: inserts,
        });

        if (response.data.success && response.data.method === "vcf") {
          vcfUsed = true;
          processedCount += inserts.length;
          setProgress({ current: processedCount, total: opsToProcess.length });
        }
      } catch (error) {
        console.warn("No se pudo usar VCF, intentando método manual...", error);
      }
    }

    if (!vcfUsed && inserts.length > 0) {
      for (let i = 0; i < inserts.length; i++) {
        const op = inserts[i];
        try {
          await axios.get(`${API_URL}/add-contact`, {
            params: {
              newName: op.newName,
              newPhone: op.newPhone,
            },
          });
        } catch (error) {
          console.error(`Error insertando manual ${op.newName}`, error);
        }
        processedCount++;
        setProgress({ current: processedCount, total: opsToProcess.length });
      }
    }

    if (updates.length > 0) {
      for (let i = 0; i < updates.length; i++) {
        const op = updates[i];
        try {
          await axios.get(`${API_URL}/update-contact`, {
            params: {
              contactId: op.ID_Contacto,
              phoneId: op.ID_Telefono,
              newName: op.Nombre,
              newPhone: op.Telefono,
            },
          });
        } catch (error) {
          console.error(`Error actualizando fila ${i}`, error);
        }
        processedCount++;
        setProgress({ current: processedCount, total: opsToProcess.length });
      }
    }

    setImportSuccess(true);

    if (vcfUsed) {
      setVcfInstructions(true);
      toast.info("Acción requerida en el dispositivo.");
    } else {
      toast.success("Importación completada con éxito.");
      setTimeout(() => {
        setImporting(false);
        setImportSuccess(false);
        fetchContacts();
      }, 2500);
    }
  };

  const openEditModal = (contact: Contacto) => {
    setFormErrors({ name: "", phone: "" });
    setEditingContact(contact);
    setSaveSuccess(false);
    setEditForm({
      newName: contact.Nombre,
      newPhone: formatPhoneNumber(contact.Telefono),
    });
  };

  const closeEditModal = () => {
    if (!saving) {
      setEditingContact(null);
      setSaveSuccess(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    const cleanValue = rawValue.replace(/\D/g, "");

    if (cleanValue.length > 10) return;

    setEditForm({ ...editForm, newPhone: formatPhoneNumber(rawValue) });

    if (cleanValue.length === 10) {
      setFormErrors((prev) => ({ ...prev, phone: "" }));
    }
  };

  const hasChanges = () => {
    if (!editingContact) return false;

    const currentCleanPhone = cleanPhoneNumber(editForm.newPhone);
    const originalCleanPhone = cleanPhoneNumber(editingContact.Telefono);

    const currentName = editForm.newName.trim();
    const originalName = editingContact.Nombre.trim();

    return (
      currentCleanPhone !== originalCleanPhone || currentName !== originalName
    );
  };

  const handleSaveContact = async () => {
    if (!editingContact || !isFormValid() || !hasChanges()) return;

    setSaving(true);
    const cleanPhone = cleanPhoneNumber(editForm.newPhone);

    try {
      const response = await axios.get<ApiResponse>(
        `${API_URL}/update-contact`,
        {
          params: {
            contactId: editingContact.ID_Contacto,
            phoneId: editingContact.ID_Telefono,
            newName: editForm.newName,
            newPhone: cleanPhone,
          },
        },
      );

      if (response.data.success) {
        setContacts((prev) =>
          prev.map((c) =>
            c.ID_Contacto === editingContact.ID_Contacto
              ? { ...c, Nombre: editForm.newName, Telefono: cleanPhone }
              : c,
          ),
        );

        setSaveSuccess(true);
        setSaving(false);
        toast.success("Contacto actualizado.");

        setTimeout(() => {
          setEditingContact(null);
          setSaveSuccess(false);
          fetchContacts();
        }, 1500);
      } else {
        toast.error("Error del backend: " + response.data.message);
        setSaving(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar cambios.");
      setSaving(false);
    }
  };

  const handleDeleteClick = (contact: Contacto) => {
    setContactToDelete(contact);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;

    setIsDeleting(true);
    try {
      const response = await axios.get(`${API_URL}/delete-contact`, {
        params: { contactId: contactToDelete.ID_Contacto },
      });

      if (response.data.success) {
        setContacts((prev) =>
          prev.filter((c) => c.ID_Contacto !== contactToDelete.ID_Contacto),
        );
        toast.success("Contacto eliminado.");
        setContactToDelete(null);
      } else {
        toast.error("No se pudo eliminar: " + response.data.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión al eliminar.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.Telefono.includes(searchTerm);

    let matchesType = true;
    const cleanPhone = cleanPhoneNumber(c.Telefono);

    if (filterType === "invalid") {
      matchesType = cleanPhone.length !== 10;
    } else if (filterType === "no-name") {
      matchesType =
        !c.Nombre ||
        c.Nombre.trim() === "" ||
        c.Nombre.toLowerCase() === "desconocido";
    } else if (filterType === "clean-names") {
      matchesType = !/\d/.test(c.Nombre);
    }

    return matchesSearch && matchesType;
  });

  return (
    <div className="w-full animate-fade-in-up relative">
      {/* MODAL DE RESUMEN DE IMPORTACIÓN */}
      <AnimatePresence>
        {showErrorModal && (
          <Modal
            key="import-modal"
            onClose={() => setShowErrorModal(false)}
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-up"
          >
            <div
              className={`${importErrors.length > 0 ? "bg-red-600" : "bg-blue-600"} p-4 text-white flex justify-between items-center shadow-md`}
            >
              <h3 className="font-bold text-lg flex items-center gap-2">
                {importErrors.length > 0 ? (
                  <FaExclamationTriangle />
                ) : (
                  <FaSync />
                )}
                {importErrors.length > 0
                  ? "Reporte de Validación"
                  : "Confirmar Importación"}
              </h3>
              <button
                onClick={() => setShowErrorModal(false)}
                className="hover:bg-white/20 p-1 rounded-full transition-colors cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-50">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 border-b border-slate-100 pb-2">
                  Resumen de Acciones
                </h4>
                <ul className="space-y-3 text-sm">
                  {/* DETALLE DE DUPLICADOS EN EL EXCEL */}
                  {excelDuplicateCount > 0 && (
                    <li className="flex items-start gap-3">
                      <div className="bg-orange-100 text-orange-600 p-1.5 rounded-full mt-0.5">
                        <FaFilter className="w-3 h-3" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 text-lg block leading-none">
                          {excelDuplicateCount}
                        </span>
                        <span className="text-slate-500">
                          Registros <strong>duplicados</strong> dentro del
                          archivo han sido filtrados automáticamente.
                        </span>
                      </div>
                    </li>
                  )}

                  {/* DETALLE DE NUEVOS INSERTADOS (DATOS LIMPIOS) */}
                  {newInsertCount > 0 && (
                    <li className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-600 p-1.5 rounded-full mt-0.5">
                        <FaPlus className="w-3 h-3" />
                      </div>
                      <div>
                        <span className="font-bold text-blue-700 text-lg block leading-none">
                          {newInsertCount}
                        </span>
                        <span className="text-slate-500">
                          Contactos <strong>nuevos</strong> se añadirán al
                          dispositivo.
                        </span>
                      </div>
                    </li>
                  )}

                  {/* DETALLE DE ACTUALIZACIONES */}
                  {validContactsToUpload.length - newInsertCount > 0 && (
                    <li className="flex items-start gap-3">
                      <div className="bg-amber-100 text-amber-600 p-1.5 rounded-full mt-0.5">
                        <FaSync className="w-3 h-3" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 text-lg block leading-none">
                          {validContactsToUpload.length - newInsertCount}
                        </span>
                        <span className="text-slate-500">
                          Contactos <strong>existentes</strong> que se
                          actualizarán.
                        </span>
                      </div>
                    </li>
                  )}

                  {unchangedCount > 0 && (
                    <li className="flex items-start gap-3 opacity-75">
                      <div className="bg-slate-200 text-slate-500 p-1.5 rounded-full mt-0.5">
                        <FaTimes className="w-3 h-3" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-600 text-lg block leading-none">
                          {unchangedCount}
                        </span>
                        <span className="text-slate-500">
                          Contactos ignorados (ya están actualizados).
                        </span>
                      </div>
                    </li>
                  )}

                  {importErrors.length > 0 && (
                    <li className="flex items-start gap-3">
                      <div className="bg-red-100 text-red-600 p-1.5 rounded-full mt-0.5">
                        <FaExclamationTriangle className="w-3 h-3" />
                      </div>
                      <div>
                        <span className="font-bold text-red-600 text-lg block leading-none">
                          {importErrors.length}
                        </span>
                        <span className="text-red-600 font-medium">
                          Filas con errores (No se procesarán).
                        </span>
                      </div>
                    </li>
                  )}
                </ul>
              </div>

              {importErrors.length > 0 && (
                <div className="border border-red-100 rounded-lg overflow-hidden bg-white">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-100 text-xs font-bold text-red-800 uppercase">
                    Detalle de Errores
                  </div>
                  <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 sticky top-0">
                        <tr>
                          <th className="p-2 pl-4">Fila</th>
                          <th className="p-2">Nombre</th>
                          <th className="p-2">Telefono</th>
                          <th className="p-2">Problema</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importErrors.map((err, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-red-50/50 transition-colors"
                          >
                            <td className="p-2 pl-4 font-mono text-slate-400">
                              {err.row}
                            </td>
                            <td className="p-2 font-medium text-slate-700">
                              {err.name}
                            </td>
                            <td className="p-2 font-medium text-slate-700">
                              {err.phone}
                            </td>
                            <td className="p-2 text-red-500">{err.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3 z-10">
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors text-sm cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={() => startBatchUpdate(validContactsToUpload)}
                disabled={validContactsToUpload.length === 0}
                className={`px-6 py-2.5 rounded-lg text-white font-bold flex items-center gap-2 shadow-sm transition-all text-sm
                    ${
                      validContactsToUpload.length > 0
                        ? "bg-blue-600 hover:bg-blue-700 hover:shadow-md cursor-pointer active:scale-95"
                        : "bg-slate-300 cursor-not-allowed opacity-70"
                    }`}
              >
                {validContactsToUpload.length > 0 ? (
                  <>
                    <FaSync className={importing ? "animate-spin" : ""} />
                    Procesar {validContactsToUpload.length} Contactos
                  </>
                ) : (
                  "Nada que procesar"
                )}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* MODAL DE EDICIÓN */}
      <AnimatePresence>
        {editingContact && (
          <Modal
            key="edit-modal"
            onClose={closeEditModal}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-colors scale-100 relative"
          >
            {/* Botón Cerrar Flotante */}
            {!saveSuccess && (
              <button
                onClick={closeEditModal}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Pantalla de confirmación */}
            {saveSuccess ? (
              <div className="p-12 flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <FaCheckCircle className="text-5xl text-green-500 animate-bounce" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  ¡Actualizado!
                </h3>
                <p className="text-slate-500 text-sm">
                  La información del contacto se ha guardado correctamente.
                </p>
              </div>
            ) : (
              <>
                {/* Cabecera Visual con Avatar */}
                <div className="bg-white pt-10 px-4 pb-2 flex flex-col items-center justify-center text-slate-800 relative overflow-hidden">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-blue-100">
                    <UserRoundPen className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="relative z-10 font-bold text-lg text-center max-w-xs truncate">
                    {editForm.newName || "Sin Nombre"}
                  </h3>
                  <p className="relative z-10 text-slate-500 text-xs mt-1 font-mono px-3 py-1 rounded-full backdrop-blur-sm">
                    ID: {editingContact.ID_Contacto}
                  </p>
                </div>

                {/* Formulario */}
                <div className="p-8 flex flex-col gap-6">
                  {/* Input Nombre */}
                  <div className="relative group">
                    <label className="absolute -top-2.5 left-3 bg-white px-2 text-xs font-bold text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      className={`w-full p-4 bg-slate-50 border-2 rounded-xl outline-none transition-all font-medium text-slate-700
                        ${
                          editForm.newName.trim() === ""
                            ? "border-slate-200 focus:border-red-300 bg-red-50/10"
                            : "border-slate-100 focus:border-blue-500 focus:bg-white"
                        }`}
                      value={editForm.newName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, newName: e.target.value })
                      }
                      placeholder="Ej. Juan Pérez"
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-xs mt-2 flex items-center gap-1 ml-1 animate-pulse">
                        <FaExclamationTriangle /> {formErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Input Teléfono */}
                  <div className="relative group">
                    <label className="absolute -top-2.5 left-3 bg-white px-2 text-xs font-bold text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      Teléfono Móvil
                    </label>
                    <input
                      type="tel"
                      maxLength={14}
                      placeholder="000 000 0000"
                      className={`w-full p-4 bg-slate-50 border-2 rounded-xl outline-none transition-all font-mono text-lg tracking-wide text-slate-700
                        ${
                          cleanPhoneNumber(editForm.newPhone).length < 7
                            ? "border-slate-200 focus:border-orange-300"
                            : "border-slate-100 focus:border-green-500 focus:bg-white"
                        }`}
                      value={editForm.newPhone}
                      onChange={handlePhoneChange}
                    />
                    <div className="flex justify-between mt-2 px-1">
                      {formErrors.phone ? (
                        <p className="text-red-500 text-xs flex items-center gap-1 animate-pulse">
                          <FaExclamationTriangle /> {formErrors.phone}
                        </p>
                      ) : (
                        <span></span>
                      )}
                      <p className="text-[11px] font-bold text-slate-400">
                        {cleanPhoneNumber(editForm.newPhone).length}/10 Digitos
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer de Acción */}
                <div className="p-6 pt-2 pb-8 flex gap-4 justify-center">
                  <button
                    onClick={handleSaveContact}
                    disabled={saving || !isFormValid() || !hasChanges()}
                    className={`w-full py-4 rounded-xl font-bold text-white text-sm flex justify-center items-center gap-2 shadow-lg transition-all transform active:scale-[0.98]
                      ${
                        saving || !isFormValid() || !hasChanges()
                          ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                          : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30 hover:shadow-blue-500/40"
                      }`}
                  >
                    {saving ? (
                      <>
                        <FaSpinner className="animate-spin" /> Guardando...
                      </>
                    ) : (
                      <>
                        <FaSave /> Guardar Cambios
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </Modal>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
      <AnimatePresence>
        {contactToDelete && (
          <Modal
            key="delete-modal"
            onClose={() => !isDeleting && setContactToDelete(null)}
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up border-t-4 border-red-500"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaTrash className="text-3xl text-red-500" />
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-2">
                ¿Eliminar Contacto?
              </h3>

              <p className="text-slate-500 text-sm mb-6">
                Estás a punto de borrar a{" "}
                <strong className="text-slate-800">
                  {contactToDelete.Nombre}
                </strong>
                .
                <br />
                <span className="text-red-500 font-medium text-xs bg-red-50 px-2 py-1 rounded mt-2 inline-block">
                  Esta acción es permanente y no se puede deshacer.
                </span>
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setContactToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 cursor-pointer bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 cursor-pointer bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors shadow-red-200 shadow-md flex justify-center items-center gap-2"
                >
                  {isDeleting ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaTrash />
                  )}
                  {isDeleting ? "Borrando..." : "Sí, Eliminar"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* VISTA DE PROGRESO Y CARGA (ESTADO IMPORTING) */}
      {importing && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-md text-white animate-fade-in">
          {/* CASO 1: INSTRUCCIONES MANUALES PARA VCF */}
          {vcfInstructions ? (
            <div className="bg-white text-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
              <div className="bg-blue-600 p-6 text-white text-center">
                <FaMobileAlt className="text-5xl mx-auto mb-3 animate-pulse" />
                <h2 className="text-2xl font-bold">Acción Requerida</h2>
                <p className="text-blue-100 text-sm mt-1">
                  Complete el proceso en su dispositivo
                </p>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-lg">
                    <FaMobile className="text-base" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">
                      Revisa tu celular
                    </h4>
                    <p className="text-slate-500 text-xs">
                      Se ha abierto la carpeta de <strong>Descargas</strong>{" "}
                      automáticamente. (Si no, selecciona "Mis Archivos" o
                      "Administrador de Archivos").
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-lg">
                    <FaFolderOpen className="text-base" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">
                      Busca el archivo
                    </h4>
                    <p className="text-slate-500 text-xs">
                      Encuentra el archivo llamado: <br />
                      <code className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono text-slate-600 border border-slate-300 mt-1 inline-block">
                        IMPORTAR_CONTACTOS_...vcf
                      </code>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-lg">
                    <FaHandPointUp className="text-base" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">
                      Toque para importar
                    </h4>
                    <p className="text-slate-500 text-xs">
                      Seleccione el archivo y confirma la importación si el
                      sistema lo solicita.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-lg">
                    <ArrowBigDownDash className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">
                      Guardar contactos
                    </h4>
                    <p className="text-slate-500 text-xs">
                      Indica el lugar de almacenamiento (Ej. "Teléfono", "SIM" o
                      "Samsung Account") y confirma la acción.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={finishVcfProcess}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                >
                  Listo, ya importé los contactos
                </button>
                <p className="text-xs text-slate-400 mt-3">
                  Al hacer clic, se actualizará la lista en pantalla.
                </p>
              </div>
            </div>
          ) : !importSuccess ? (
            /* CASO 2: BARRA DE PROGRESO (CARGANDO) */
            <>
              <FaSpinner className="text-6xl animate-spin mb-6 text-blue-400" />
              <h2 className="text-2xl font-bold">Sincronizando...</h2>
              <p className="text-slate-300 mt-2 text-center max-w-md">
                No desconectes el dispositivo.
                <br />
                Procesando registro {progress.current} de {progress.total}
              </p>

              <div className="w-full max-w-lg bg-slate-700 rounded-full h-4 mt-8 overflow-hidden border border-slate-600">
                <div
                  className="bg-blue-500 h-full transition-all duration-300 ease-out"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                  }}
                ></div>
              </div>
              <p className="mt-4 font-mono text-xl">
                {Math.round((progress.current / progress.total) * 100)}%
              </p>
            </>
          ) : (
            /* CASO 3: ÉXITO AUTOMÁTICO (SOLO PARA MÉTODO MANUAL) */
            <div className="flex flex-col items-center animate-scale-in">
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(34,197,94,0.6)]">
                <FaCheckCircle className="text-5xl text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                ¡Sincronización Completa!
              </h2>
              <p className="text-slate-300 text-lg">
                Se actualizaron {progress.total} contactos correctamente.
              </p>
            </div>
          )}
        </div>
      )}

      {/* BARRA DE HERRAMIENTAS (Búsqueda y Filtros) */}
      <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 gap-4">
        <div className="flex w-full lg:w-1/2 gap-2">
          {/* Input de Búsqueda */}
          <div className="relative w-full group">
            <FaSearch className="absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre o numero..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Dropdown de Filtros */}
          <div className="relative min-w-[180px]">
            <div className="absolute left-3 top-3 text-slate-500 pointer-events-none text-sm">
              <FaFilter />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`w-full pl-4 indent-6 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm appearance-none cursor-pointer font-medium
                ${filterType !== "all" ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-600"}
              `}
            >
              <option value="all">Todos</option>
              <option value="invalid">Números Inválidos</option>
              <option value="no-name">Sin Nombre</option>
              <option value="clean-names">Nombres Sin Números</option>
            </select>

            <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400 text-xs">
              <FaChevronDown />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 w-full lg:w-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".xlsx, .xls"
          />

          <button
            onClick={fetchContacts}
            disabled={loading}
            className="flex items-center cursor-pointer gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm disabled:opacity-70 text-sm font-medium active:scale-95"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaSync />}
            {loading ? "Leyendo..." : "Sincronizar"}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing || !hasSynced}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all shadow-sm text-sm font-medium active:scale-95
            ${
              importing || !hasSynced
                ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                : "bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
            }`}
            title={
              !hasSynced
                ? "Primero debes sincronizar los contactos"
                : "Importar archivo Excel"
            }
          >
            <FaFileUpload />
            Importar Excel
          </button>

          <button
            onClick={downloadExcel}
            className="flex items-center cursor-pointer gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm text-sm font-medium active:scale-95"
          >
            <FaFileExcel />
            Descargar Excel
          </button>
        </div>
      </div>

      {/* TABLA DE CLIENTES */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-slate-100 border-b border-slate-200 grid grid-cols-12 text-xs font-bold text-slate-600 uppercase tracking-wider">
          <div className="col-span-1 p-4 text-center">#</div>
          <div className="col-span-1 p-4">ID</div>
          <div className="col-span-4 p-4">Nombre</div>
          <div className="col-span-4 p-4">Teléfono</div>
          <div className="col-span-2 p-4 text-center">Acciones</div>
        </div>

        <div className="overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact, index) => (
              <div
                key={`${contact.ID_Contacto}-${index}`}
                className="grid grid-cols-12 text-sm text-slate-700 border-b border-slate-100 hover:bg-blue-50 transition-colors items-center group"
              >
                <div className="col-span-1 p-4 text-center font-mono text-slate-400">
                  {index + 1}
                </div>
                <div className="col-span-1 p-4 font-mono text-xs text-slate-400">
                  {contact.ID_Contacto}
                </div>
                <div className="col-span-4 p-4 font-medium text-slate-800">
                  {contact.Nombre}
                </div>
                <div className="col-span-4 p-4 font-mono tracking-wide text-slate-600">
                  {formatPhoneNumber(contact.Telefono)}
                </div>
                <div className="col-span-2 pl-7 py-4 text-center flex justify-center gap-2">
                  {" "}
                  {/* Botón Editar */}
                  <button
                    onClick={() => openEditModal(contact)}
                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-all cursor-pointer"
                    title="Editar"
                  >
                    <FaEdit />
                  </button>
                  {/* Botón Eliminar */}
                  <button
                    onClick={() => handleDeleteClick(contact)}
                    className="text-slate-400 hover:text-red-600 hover:bg-red-100 p-2 rounded-lg transition-all cursor-pointer"
                    title="Eliminar permanentemente"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))
          ) : loading ? (
            <div className="text-center py-10">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <FaSpinner className="text-4xl text-blue-500 animate-spin mx-auto mb-4 opacity-70" />
              </div>
              <p className="text-slate-600 font-medium mb-1 animate-pulse">
                Escaneando contactos...
              </p>
              <p className="text-sm text-slate-400 max-w-md mx-auto animate-pulse">
                Esto puede tomar unos segundos.
              </p>
            </div>
          ) : (
            <div className="text-sm p-12 text-center text-slate-500 flex flex-col items-center">
              {!hasSynced ? (
                <>
                  <div className="mb-8">
                    <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaSearch className="text-4xl text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium mb-1">
                      Sin datos para mostrar
                    </p>
                    <p>
                      Presiona "Sincronizar" para cargar la lista desde el
                      teléfono.
                    </p>
                  </div>
                  <button
                    onClick={fetchContacts}
                    disabled={loading}
                    className="flex items-center cursor-pointer rounded-full gap-2 px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm disabled:opacity-70 text-sm font-medium active:scale-95"
                  >
                    {loading ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaSync />
                    )}
                    {loading ? "Leyendo..." : "Sincronizar"}
                  </button>
                </>
              ) : contacts.length === 0 ? (
                <>
                  <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaFileUpload className="text-4xl text-slate-400" />
                  </div>
                  <p>
                    El dispositivo no tiene contactos. Puedes importar un Excel
                    ahora.
                  </p>
                </>
              ) : (
                <>
                  <div className="bg-slate-1000 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaFilter className="text-4xl text-slate-400" />
                  </div>
                  <p>No se encontraron contactos con ese criterio.</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between px-6">
          <span>Mostrando {filteredContacts.length} contactos</span>
          <span>Total: {contacts.length}</span>
        </div>
      </div>
    </div>
  );
}
