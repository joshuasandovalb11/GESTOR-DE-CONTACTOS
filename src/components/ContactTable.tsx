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
} from "react-icons/fa";
import type { Contacto, ApiResponse } from "../types";
import { AnimatePresence, motion } from "framer-motion";

interface ImportError {
  row: number;
  name: string;
  phone: string;
  reason: string;
}

const API_URL = import.meta.env.DEV ? "http://localhost:5000" : "";

const cleanPhoneNumber = (phone: string) => {
  return String(phone || "").replace(/\D/g, "");
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

export default function ContactTable() {
  const [contacts, setContacts] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(false);
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
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [unchangedCount, setUnchangedCount] = useState(0);
  const [filterType, setFilterType] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFormValid = () => {
    const cleanPhone = cleanPhoneNumber(editForm.newPhone);
    return editForm.newName.trim() !== "" && cleanPhone.length === 10;
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await axios.get<ApiResponse>(`${API_URL}/get-contacts`);
      if (response.data.success && response.data.preview) {
        setContacts(response.data.preview);
      }
    } catch (error) {
      console.error(error);
      alert(
        "Error al conectar con el servidor. Revisa que el backend esté corriendo.",
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (contacts.length === 0) {
      alert("Primero sincroniza los contactos para poder exportarlos.");
      return;
    }
    const fileUrl = `${API_URL}/files/Contactos_Clientes.xlsx`;

    const link = document.createElement("a");
    link.href = fileUrl;

    link.setAttribute("download", "Contactos_Clientes.xlsx");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (contacts.length === 0) {
      alert(
        "ALERTA: Debes sincronizar los contactos antes de importar un Excel.\n\nEsto es necesario para detectar qué contactos han cambiado y evitar sobrescribir todo innecesariamente.",
      );
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
        alert("El archivo Excel está vacío.");
        return;
      }
      const firstRow = data[0];
      const requiredColumns = [
        "ID_Contacto",
        "ID_Telefono",
        "Nombre",
        "Telefono",
      ];
      const missingColumns = requiredColumns.filter(
        (col) => !(col in firstRow),
      );

      if (missingColumns.length > 0) {
        alert(
          `Error de formato: Faltan columnas: ${missingColumns.join(", ")}`,
        );
        return;
      }

      validateExcelData(data);
    };
    reader.readAsBinaryString(file);
  };

  const validateExcelData = (data: any[]) => {
    const errors: ImportError[] = [];
    const changesBatch: any[] = [];
    let unchangedCountLocal = 0;

    data.forEach((row, index) => {
      const realRowNumber = index + 2;

      if (!row.ID_Contacto || !row.ID_Telefono) {
        errors.push({
          row: realRowNumber,
          name: row.Nombre || "Desconocido",
          phone: row.Telefono || "---",
          reason: "Faltan IDs para sincronizar",
        });
        return;
      }

      const rawPhone = String(row.Telefono || "");
      const cleanPhone = rawPhone.replace(/\D/g, "");

      if (cleanPhone.length !== 10) {
        errors.push({
          row: realRowNumber,
          name: row.Nombre || "Desconocido",
          phone: row.Telefono,
          reason: `Longitud inválida (${cleanPhone.length} dígitos).`,
        });
        return;
      }

      if (!row.Nombre || String(row.Nombre).trim() === "") {
        errors.push({
          row: realRowNumber,
          name: "---",
          phone: row.Telefono,
          reason: "Nombre vacío.",
        });
        return;
      }

      const originalContact = contacts.find(
        (c) => String(c.ID_Telefono) === String(row.ID_Telefono),
      );

      if (originalContact) {
        const originalCleanPhone = cleanPhoneNumber(originalContact.Telefono);

        if (
          originalContact.Nombre === row.Nombre &&
          originalCleanPhone === cleanPhone
        ) {
          unchangedCountLocal++;
          return;
        }
      }

      changesBatch.push({
        ...row,
        Telefono: cleanPhone,
      });
    });

    setUnchangedCount(unchangedCountLocal);
    setImportErrors(errors);
    setValidContactsToUpload(changesBatch);

    if (errors.length > 0 || changesBatch.length > 0) {
      setShowErrorModal(true);
    } else {
      alert(
        `Análisis completado: No se encontraron cambios.\n${unchangedCountLocal} contactos ya están actualizados en el sistema.`,
      );
    }
  };

  const startBatchUpdate = async (contactsToProcess: any[]) => {
    setShowErrorModal(false);
    setImporting(true);
    setProgress({ current: 0, total: contactsToProcess.length });

    for (let i = 0; i < contactsToProcess.length; i++) {
      const row = contactsToProcess[i];
      try {
        await axios.get(`${API_URL}/update-contact`, {
          params: {
            contactId: row.ID_Contacto,
            phoneId: row.ID_Telefono,
            newName: row.Nombre,
            newPhone: row.Telefono,
          },
        });
      } catch (error) {
        console.error(`Error fila ${i}`, error);
      }
      setProgress({ current: i + 1, total: contactsToProcess.length });
    }

    setImporting(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      fetchContacts();
    }, 2000);
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
    const currentClean = cleanPhoneNumber(rawValue);

    if (currentClean.length <= 10) {
      setEditForm({ ...editForm, newPhone: formatPhoneNumber(rawValue) });

      if (currentClean.length === 10) {
        setFormErrors((prev) => ({ ...prev, phone: "" }));
      }
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

        setTimeout(() => {
          setEditingContact(null);
          setSaveSuccess(false);
        }, 1500);
      } else {
        alert("Error del backend: " + response.data.message);
        setSaving(false);
      }
    } catch (error) {
      console.error(error);
      alert("Error al guardar cambios.");
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
        setContactToDelete(null);
      } else {
        alert("No se pudo eliminar: " + response.data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión al eliminar.");
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
    <div className="w-full max-w-5xl animate-fade-in-up relative">
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
                  : "Confirmar Actualización"}
              </h3>
              <button
                onClick={() => setShowErrorModal(false)}
                className="hover:bg-white/20 p-1 rounded-full transition-colors cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-50">
              {/* CAJA DE RESUMEN PRINCIPAL */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 border-b border-slate-100 pb-2">
                  Análisis del Archivo
                </h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <div className="bg-green-100 text-green-600 p-1.5 rounded-full mt-0.5">
                      <FaSync className="w-3 h-3" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 text-lg block leading-none">
                        {validContactsToUpload.length}
                      </span>
                      <span className="text-slate-500">
                        Contactos tienen <strong>cambios reales</strong> y serán
                        actualizados.
                      </span>
                    </div>
                  </li>

                  {/* 2. IGNORADOS */}
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
                          Contactos son <strong>idénticos</strong> al sistema.
                        </span>
                      </div>
                    </li>
                  )}

                  {/* 3. ERRORES */}
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
                          Filas contienen errores y NO se procesarán.
                        </span>
                      </div>
                    </li>
                  )}
                </ul>
              </div>

              {/* TABLA DE ERRORES */}
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

            {/* FOOTER ACCIONES */}
            <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3 z-10">
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors text-sm cursor-pointer"
              >
                Cancelar Operación
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
                    Procesar {validContactsToUpload.length} Cambios
                  </>
                ) : (
                  "No hay cambios válidos"
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-colors scale-100"
          >
            {/* Pantalla de confirmación */}
            {saveSuccess ? (
              <div className="p-10 flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <FaCheckCircle className="text-5xl text-green-500 animate-bounce" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">
                  ¡Guardado!
                </h3>
                <p className="text-slate-500 mt-2">
                  El contacto ha sido actualizado correctamente.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <FaEdit /> Editar Contacto
                  </h3>
                  <button
                    onClick={closeEditModal}
                    className="hover:bg-blue-700 p-1 rounded-full transition-colors cursor-pointer"
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="p-6 flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Nombre
                    </label>
                    <input
                      type="text"
                      className={`w-full mt-1 p-3 border rounded-lg focus:ring-2 outline-none transition-colors duration-200
                            ${editForm.newName.trim() === "" ? "border-slate-300" : "border-slate-300 focus:ring-blue-500"}`}
                      value={editForm.newName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, newName: e.target.value })
                      }
                    />

                    {formErrors.name && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <FaExclamationTriangle /> {formErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Teléfono (10 Dígitos)
                    </label>
                    <input
                      type="text"
                      placeholder="*** *** ****"
                      className={`w-full mt-1 p-3 border rounded-lg focus:ring-2 outline-none transition-colors duration-200 font-mono text-lg
                            ${cleanPhoneNumber(editForm.newPhone).length < 10 ? "border-slate-300 focus:ring-orange-200" : "border-green-300 focus:ring-green-500"}`}
                      value={editForm.newPhone}
                      onChange={handlePhoneChange}
                    />
                    <p className="text-xs text-slate-400 mt-1 text-right">
                      {cleanPhoneNumber(editForm.newPhone).length} / 10 dígitos
                    </p>

                    {formErrors.phone && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <FaExclamationTriangle /> {formErrors.phone}
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 font-mono border border-slate-100">
                    ID Sistema: {editingContact.ID_Contacto} <br />
                    ID Tel: {editingContact.ID_Telefono}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
                  <button
                    onClick={closeEditModal}
                    className="px-4 py-2 text-slate-600 border border-slate-300 font-medium hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    disabled={saving}
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleSaveContact}
                    disabled={saving || !isFormValid() || !hasChanges()}
                    className={`px-6 py-2 font-medium rounded-lg transition-colors flex items-center gap-2 
                      ${
                        saving || !isFormValid() || !hasChanges()
                          ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                      }`}
                    title={
                      !hasChanges()
                        ? "No has realizado ningún cambio"
                        : !isFormValid()
                          ? "Completa 10 dígitos para guardar"
                          : "Guardar Cambios"
                    }
                  >
                    {saving ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaSave />
                    )}
                    {saving ? "Guardando..." : "Guardar Cambios"}
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

      {importing && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-md text-white">
          <FaSpinner className="text-6xl animate-spin mb-6 text-blue-400" />
          <h2 className="text-2xl font-bold">Importando Contactos...</h2>
          <p className="text-slate-300 mt-2 text-center max-w-md">
            No desconectes el dispositivo. Verificando y actualizando registros.
          </p>
          <div className="w-full max-w-lg bg-slate-700 rounded-full h-4 mt-8 overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
          <p className="mt-4 font-mono text-xl">
            {progress.current} / {progress.total}
          </p>
        </div>
      )}

      {/* BARRA DE HERRAMIENTAS (Búsqueda y Filtros) */}
      <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 gap-4">
        <div className="flex w-full lg:w-1/2 gap-4">
          {/* Input de Búsqueda */}
          <div className="relative w-full group">
            <FaSearch className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar por nombre o numero..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Dropdown de Filtros */}
          <div className="relative min-w-[180px]">
            <div className="absolute left-3 top-4 text-slate-500 pointer-events-none text-sm">
              <FaFilter />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`w-full pl-4 indent-6 pr-8 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm appearance-none cursor-pointer font-medium
                ${filterType !== "all" ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-600"}
              `}
            >
              <option value="all">Todos</option>
              <option value="invalid">Números Inválidos</option>
              <option value="no-name">Sin Nombre</option>
              <option value="clean-names">Nombres Sin Números</option>
            </select>

            <div className="absolute right-3 top-4.5 pointer-events-none text-slate-400 text-xs">
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
            className="flex items-center cursor-pointer gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm disabled:opacity-70 text-sm font-medium active:scale-95"
          >
            <FaSync className={loading ? "animate-spin" : ""} />
            {loading ? "Leyendo..." : "Sincronizar"}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing || contacts.length === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all shadow-sm text-sm font-medium active:scale-95
            ${
              importing || contacts.length === 0
                ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                : "bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
            }`}
            title={
              contacts.length === 0
                ? "Primero debes sincronizar los contactos"
                : "Importar archivo Excel"
            }
          >
            <FaFileUpload />
            Importar Excel
          </button>

          <button
            onClick={downloadExcel}
            className="flex items-center cursor-pointer gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm text-sm font-medium active:scale-95"
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
          ) : (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center">
              <FaSearch className="text-4xl mb-4 text-slate-200" />
              {contacts.length === 0
                ? 'Presiona "Sincronizar" para cargar la lista desde el teléfono.'
                : "No se encontraron contactos con ese criterio."}
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
