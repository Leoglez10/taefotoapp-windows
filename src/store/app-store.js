const invoke =
  window.__TAURI_INTERNALS__?.invoke ||
  window.__TAURI__?.core?.invoke ||
  window.__TAURI__?.invoke ||
  (() =>
    Promise.reject(
      new Error("Tauri API no disponible. Abre la app con `npm run tauri dev`.")
    ));

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function messageFromError(error) {
  if (typeof error === "string" && error.trim()) return error;
  if (error?.message) return error.message;
  if (error?.toString && error.toString() !== "[object Object]") return error.toString();
  return "Ocurrió un error inesperado";
}

function cleanAdminAccessState() {
  return {
    adminAuthenticated: false,
    currentAdmin: null,
    adminSection: "dashboard",
    reportPreviewOpen: false
  };
}

const initialState = {
  loading: false,
  flash: null,
  role: null,
  adminAuthenticated: false,
  currentAdmin: null,
  adminSection: "dashboard",
  dashboard: null,
  availableEquipment: [],
  students: [],
  equipment: [],
  admins: [],
  records: [],
  selectedStudent: null,
  studentHistory: [],
  operationType: "prestamo",
  operationModal: null,
  reportData: null,
  reportPreviewOpen: false,
  reportRequest: null,
  lastGeneratedPdfPath: null,
  importSummary: null,
  backups: {
    directory: "",
    items: []
  },
  adminFilters: {
    studentsQuery: "",
    studentsStatus: "all",
    equipmentQuery: "",
    equipmentStatus: "all",
    equipmentActive: "all",
    adminsQuery: "",
    adminsStatus: "all",
    recordsQuery: "",
    recordsType: "all"
  },
  recordFilters: {
    alumno_query: "",
    fecha_inicio: "",
    fecha_fin: ""
  }
};

export function createStore() {
  let state = cloneState(initialState);
  const listeners = new Set();

  const setState = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener(cloneState(state)));
  };

  const actions = {
    subscribe(listener) {
      listeners.add(listener);
      listener(cloneState(state));
      return () => listeners.delete(listener);
    },

    async bootstrap() {
      setState({ loading: true });
      try {
        const [dashboard, availableEquipment, students, equipment, admins, records, backups] = await Promise.all([
          invoke("get_dashboard_summary"),
          invoke("list_available_equipment"),
          invoke("list_students", { query: null }),
          invoke("list_equipment", { query: null }),
          invoke("list_admins"),
          invoke("list_records", { filters: null }),
          invoke("list_backups")
        ]);

        setState({
          loading: false,
          dashboard,
          availableEquipment,
          students,
          equipment,
          admins,
          records,
          backups
        });
      } catch (error) {
        setState({
          loading: false,
          flash: { tone: "danger", message: messageFromError(error) }
        });
      }
    },

    setRole(role) {
      setState({
        role,
        flash: null,
        operationModal: null,
        selectedStudent: null,
        studentHistory: [],
        operationType: "prestamo",
        ...cleanAdminAccessState()
      });

      if (role === "student" || role === null) {
        actions.bootstrap();
      }
    },

    logoutAdmin() {
      setState({ ...cleanAdminAccessState(), flash: null });
    },

    async adminLogin(usuario, password) {
      try {
        const result = await invoke("admin_login", { payload: { usuario, password } });
        if (!result.ok) {
          throw new Error("Credenciales incorrectas");
        }
        setState({ adminAuthenticated: true, currentAdmin: result.admin, flash: null });
        await actions.bootstrap();
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    setOperationType(operationType) {
      setState({ operationType });
    },

    async findStudentByCode(codigo) {
      if (!codigo) {
        setState({ selectedStudent: null, studentHistory: [], operationType: "prestamo" });
        return;
      }

      try {
        const [student, studentHistory] = await Promise.all([
          invoke("find_student_by_code", { codigo }),
          invoke("get_student_history", { codigo })
        ]);
        setState({
          selectedStudent: student,
          studentHistory,
          operationType: student.prestamo_activo ? "devolucion" : "prestamo",
          flash: null
        });
      } catch (error) {
        setState({
          selectedStudent: null,
          studentHistory: [],
          operationType: "prestamo",
          flash: { tone: "warn", message: messageFromError(error) }
        });
      }
    },

    async registerStudentOperation(payload) {
      try {
        const result = await invoke("register_student_operation", { payload });
        const modalType = payload.tipo === "prestamo" ? "Préstamo registrado" : "Devolución registrada";
        setState({
          flash: null,
          importSummary: null,
          operationModal: {
            title: modalType,
            studentName: result.alumno_nombre,
            code: result.codigo,
            equipmentNumber: result.equipo_numero,
            status: result.estado,
            loanDate: result.fecha_prestamo,
            returnDate: result.fecha_devolucion
          },
          selectedStudent: null,
          studentHistory: [],
          operationType: "prestamo"
        });
        await actions.bootstrap();
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    closeOperationModal() {
      setState({ operationModal: null });
    },

    async loadRecords(filters = {}) {
      try {
        const records = await invoke("list_records", { filters });
        setState({ records, recordFilters: { ...state.recordFilters, ...filters }, flash: null });
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async clearRecords() {
      try {
        await invoke("clear_records");
        setState({
          flash: { tone: "success", message: "Historial de registros eliminado" },
          records: [],
          recordFilters: {
            alumno_query: "",
            fecha_inicio: "",
            fecha_fin: ""
          }
        });
        await actions.bootstrap();
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async exportRecordsCsv(filters = null) {
      try {
        const finalFilters = filters || state.recordFilters;
        const result = await invoke("export_records_csv", { filters: finalFilters });
        await invoke("open_file_path", { path: result.path });
        setState({ flash: { tone: "success", message: `CSV generado en ${result.path}` } });
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async importExcelFile(file) {
      try {
        const buffer = await file.arrayBuffer();
        const summary = await invoke("import_excel_data", {
          payload: {
            file_name: file.name,
            bytes: Array.from(new Uint8Array(buffer))
          }
        });
        setState({
          importSummary: summary,
          flash: { tone: "success", message: "Importación completada" }
        });
        await actions.bootstrap();
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async backupDatabase() {
      try {
        const result = await invoke("backup_database");
        await invoke("open_file_path", { path: result.path });
        const backups = await invoke("list_backups");
        setState({
          backups,
          flash: { tone: "success", message: `Respaldo generado en ${result.path}` }
        });
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async restoreDatabase(file) {
      try {
        const buffer = await file.arrayBuffer();
        const result = await invoke("restore_database", {
          payload: {
            file_name: file.name,
            bytes: Array.from(new Uint8Array(buffer))
          }
        });
        setState({
          backups: await invoke("list_backups"),
          flash: {
            tone: "success",
            message: `Base restaurada. Se creó un respaldo automático en ${result.path}`
          }
        });
        await actions.bootstrap();
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async openPath(path) {
      try {
        await invoke("open_file_path", { path });
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async createStudent(payload) {
      try {
        await invoke("create_student", { payload });
        setState({ flash: { tone: "success", message: "Alumno agregado" } });
        await actions.bootstrap();
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async updateStudent(payload) {
      try {
        await invoke("update_student", { payload });
        setState({ flash: { tone: "success", message: "Alumno actualizado" } });
        await actions.bootstrap();
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async deleteStudent(studentId) {
      try {
        await invoke("delete_student", { studentId });
        setState({ flash: { tone: "success", message: "Alumno eliminado" } });
        await actions.bootstrap();
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async createEquipment(payload) {
      try {
        await invoke("create_equipment", { payload });
        setState({ flash: { tone: "success", message: "Equipo agregado" } });
        await actions.bootstrap();
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async updateEquipment(payload) {
      try {
        await invoke("update_equipment", { payload });
        setState({ flash: { tone: "success", message: "Equipo actualizado" } });
        await actions.bootstrap();
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async deleteEquipment(equipmentId) {
      try {
        await invoke("delete_equipment", { equipmentId });
        setState({ flash: { tone: "success", message: "Equipo eliminado" } });
        await actions.bootstrap();
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async createAdmin(payload) {
      try {
        await invoke("create_admin", { payload });
        setState({ flash: { tone: "success", message: "Administrador agregado" } });
        await actions.bootstrap();
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async updateAdmin(payload) {
      try {
        await invoke("update_admin", { payload });
        setState({ flash: { tone: "success", message: "Administrador actualizado" } });
        await actions.bootstrap();
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async deleteAdmin(adminId) {
      try {
        await invoke("delete_admin", { adminId });
        setState({ flash: { tone: "success", message: "Administrador eliminado" } });
        await actions.bootstrap();
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    setAdminFilters(filters) {
      setState({
        adminFilters: {
          ...state.adminFilters,
          ...filters
        }
      });
    },

    resetAdminFilters(section) {
      const next = { ...state.adminFilters };
      if (section === "students") {
        next.studentsQuery = "";
        next.studentsStatus = "all";
      }
      if (section === "equipment") {
        next.equipmentQuery = "";
        next.equipmentStatus = "all";
        next.equipmentActive = "all";
      }
      if (section === "admins") {
        next.adminsQuery = "";
        next.adminsStatus = "all";
      }
      if (section === "records") {
        next.recordsQuery = "";
        next.recordsType = "all";
      }
      setState({ adminFilters: next });
    },

    async loadReportData(request) {
      try {
        const reportData = await invoke("get_report_data", { request });
        setState({ reportData, reportRequest: request, flash: null });
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async openReportPreview(request) {
      try {
        const reportData = await invoke("get_report_data", { request });
        setState({
          reportData,
          reportRequest: request,
          reportPreviewOpen: true,
          flash: null
        });
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    closeReportPreview() {
      setState({ reportPreviewOpen: false });
    },

    async generateReportPdf(request = null) {
      try {
        const finalRequest = request || state.reportRequest;
        if (!finalRequest) {
          throw new Error("Primero genera una vista previa del reporte");
        }
        const result = await invoke("generate_report_pdf", { request: finalRequest });
        setState({
          reportPreviewOpen: false,
          lastGeneratedPdfPath: result.path,
          flash: { tone: "success", message: `PDF generado en ${result.path}` }
        });
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    async openGeneratedPdf(path = null) {
      try {
        const finalPath = path || state.lastGeneratedPdfPath;
        if (!finalPath) {
          throw new Error("No hay un PDF generado para abrir");
        }
        await invoke("open_file_path", { path: finalPath });
      } catch (error) {
        setState({ flash: { tone: "danger", message: messageFromError(error) } });
      }
    },

    setAdminSection(adminSection) {
      setState({ adminSection, flash: null });
    },

    clearFlash() {
      setState({ flash: null });
    }
  };

  return { getState: () => cloneState(state), actions };
}
