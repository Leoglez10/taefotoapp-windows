function bannerMarkup(flash) {
  if (!flash) return "";
  return `<div class="status-banner ${flash.tone}">${flash.message}</div>`;
}

function operationTypeButtons(currentType, student) {
  const hasActiveLoan = Boolean(student?.prestamo_activo);
  return `
    <div class="mode-toggle" role="tablist" aria-label="Tipo de movimiento">
      <button class="mode-pill ${currentType === "prestamo" ? "active" : ""}" type="button" data-operation-type="prestamo">
        <span>Préstamo</span>
        <small>${hasActiveLoan ? "Ya tiene uno activo" : "Registrar salida"}</small>
      </button>
      <button class="mode-pill ${currentType === "devolucion" ? "active" : ""}" type="button" data-operation-type="devolucion">
        <span>Devolución</span>
        <small>${hasActiveLoan ? "Registrar regreso" : "Sin equipo por devolver"}</small>
      </button>
    </div>
  `;
}

function studentCard(student) {
  if (!student) {
    return `
      <div class="lookup-result student-card empty">
        <div class="student-card-head">
          <strong>Sin alumno seleccionado</strong>
          <span class="pill-tag neutral">Esperando código</span>
        </div>
        <p class="muted">Capture el código y presione Enter para cargar al siguiente alumno.</p>
      </div>
    `;
  }

  const hasLoan = student.prestamo_activo;
  return `
    <div class="lookup-result student-card ${hasLoan ? "has-loan" : ""}">
      <div class="student-card-head">
        <div>
          <p class="eyebrow">Alumno identificado</p>
          <h3>${student.nombre}</h3>
        </div>
        <span class="pill-tag ${hasLoan ? "warn" : "success"}">
          ${hasLoan ? "CON PRÉSTAMO ACTIVO" : "Listo para préstamo"}
        </span>
      </div>
      <div class="student-meta-grid">
        <article><span>Código</span><strong>${student.codigo}</strong></article>
        <article><span>Grupo</span><strong>${student.grupo}</strong></article>
        <article><span>Materia</span><strong>${student.materia}</strong></article>
        <article><span>Profesor</span><strong>${student.profesor}</strong></article>
      </div>
      ${
        hasLoan
          ? `<div class="loan-alert">
               <div class="loan-alert-icon">⚠️</div>
               <div class="loan-alert-content">
                 <strong>Equipo prestado actualmente:</strong>
                 <span class="loan-equipo">${student.prestamo_activo.equipo_numero}</span>
                 <span class="loan-date">Desde: ${student.prestamo_activo.fecha_prestamo}</span>
               </div>
             </div>`
          : `<div class="status-banner success">Sin préstamos activos. Puede registrar una salida nueva.</div>`
      }
    </div>
  `;
}

function equipmentOptions(equipment) {
  if (!equipment.length) {
    return `<option value="">No hay equipos disponibles</option>`;
  }

  return equipment
    .map((item) => `<option value="${item.id}">${item.numero} · ${item.descripcion}</option>`)
    .join("");
}

function historyTable(history) {
  const rows = history
    .map(
      (item) => `
        <tr>
          <td>${item.fecha}</td>
          <td>${item.tipo.toUpperCase()}</td>
          <td>${item.equipo_numero}</td>
          <td>${item.observaciones || "-"}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Fecha</th><th>Tipo</th><th>Equipo</th><th>Observaciones</th></tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="4">Sin historial para este alumno.</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

export function renderOperationView(root, store) {
  const state = store.getState();
  const dashboard = state.dashboard || { alumnos_activos: 0, equipos_disponibles: 0, prestamos_activos: 0 };
  const currentType = state.operationType || "prestamo";
  const sortByNumero = (arr) =>
    [...arr].sort((a, b) => {
      const aNum = parseFloat(a.numero) || 0;
      const bNum = parseFloat(b.numero) || 0;
      if (aNum !== bNum) return aNum - bNum;
      return String(a.numero).localeCompare(String(b.numero), "es");
    });

  const availableEquipment = sortByNumero(
    state.availableEquipment.length > 0
      ? state.availableEquipment
      : state.equipment.filter((item) => item.activo && item.estado === "disponible")
  );

  const hasLoan = state.selectedStudent?.prestamo_activo;
  const submitLabel = hasLoan ? "Registrar devolución" : "Registrar préstamo";
  const submitClass = hasLoan ? "btn-danger" : "btn";
  const equipmentDisabled = currentType === "devolucion" || !state.selectedStudent || availableEquipment.length === 0;
  const selectPlaceholder = currentType === "devolucion" ? "Devolución automática" : "Seleccione equipo";

  root.innerHTML = `
    <section class="hero-card">
      <div>
        <h2>Modo estudiante</h2>
        <p class="muted">Flujo ágil: llega el alumno, captura código, registra y sigue el siguiente.</p>
      </div>
      <div class="hero-stats">
        <article class="stat">Alumnos<strong>${dashboard.alumnos_activos}</strong></article>
        <article class="stat">Disponibles<strong>${dashboard.equipos_disponibles}</strong></article>
        <article class="stat">Prestados<strong>${dashboard.prestamos_activos}</strong></article>
      </div>
    </section>

    ${bannerMarkup(state.flash)}

    <section class="operation-grid three-col">
      <article class="panel">
        <h3>Datos del alumno</h3>
        <form id="student-form" class="form-grid">
          <label for="student-code">
            Código del alumno
            <span class="label-hint">Escanee o escriba y presione Enter</span>
          </label>
          <input 
            id="student-code" 
            name="codigo" 
            autocomplete="off" 
            placeholder="Ingrese código y presione Enter" 
            value="${state.selectedStudent?.codigo || ""}"
            aria-describedby="code-hint"
          />
          <p id="code-hint" class="sr-only">Presione Enter para buscar al alumno</p>
          <div class="input-hint">Presione Enter para buscar</div>
        </form>
      </article>

      <article class="panel">
        <h3>Historial</h3>
        ${historyTable(state.studentHistory)}
      </article>

      <article class="panel panel-info">
        <h3>Información del alumno</h3>
        ${studentCard(state.selectedStudent)}
      </article>
    </section>

    <section class="operation-grid">
      <article class="panel">
        <h3>Registrar movimiento</h3>
        <form id="operation-form" class="form-grid">
          ${operationTypeButtons(currentType, state.selectedStudent)}
          <div class="two-col aligned-end">
            <label for="student-equipment">
              Equipo
              <span class="label-hint">${selectPlaceholder}</span>
            </label>
            <select name="equipo_id" id="student-equipment" ${equipmentDisabled ? "disabled" : ""}>
              <option value="">${selectPlaceholder}</option>
              ${equipmentOptions(availableEquipment)}
            </select>
          </div>
          ${
            !availableEquipment.length
              ? `<div class="status-banner warn">No hay equipos activos disponibles para prestar.</div>`
              : ""
          }
          <label for="observaciones">
            Observaciones
            <span class="label-hint">Opcional</span>
          </label>
          <input name="observaciones" id="observaciones" placeholder="Notas adicionales (opcional)" />
          <button class="btn btn-block btn-xl ${submitClass}" type="submit">${submitLabel}</button>
        </form>
      </article>

      <article class="panel panel-highlight">
        <h3>Acciones rápidas</h3>
        ${hasLoan 
          ? `<div class="quick-action-card warning">
               <div class="quick-action-icon">⚠️</div>
               <div class="quick-action-text">
                 <strong>El alumno tiene equipo prestado</strong>
                 <span>Equipo: ${state.selectedStudent.prestamo_activo.equipo_numero}</span>
               </div>
               <button class="btn btn-danger btn-lg" id="quick-return-btn">
                 📥 Regresar equipo
               </button>
             </div>`
          : `<div class="quick-action-card success">
               <div class="quick-action-icon">✓</div>
               <div class="quick-action-text">
                 <strong>Sin préstamos activos</strong>
                 <span>El aluno puede tomar un equipo prestado</span>
               </div>
               <button class="btn btn-lg" id="quick-loan-btn">
                 📤 Tomar prestado
               </button>
             </div>`
        }
        <div class="quick-help">
          <p><strong>Atajos de teclado:</strong></p>
          <ul>
            <li><kbd>Enter</kbd> - Buscar alumno / Confirmar</li>
            <li><kbd>Escape</kbd> - Limpiar formulario</li>
          </ul>
        </div>
      </article>
    </section>

    ${
      state.operationModal
        ? `
          <div class="modal-backdrop" data-close-operation-modal="true">
            <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="operation-modal-title">
              <div class="modal-icon">${state.operationModal.tipo === "devolucion" ? "↩️" : "✓"}</div>
              <h3 id="operation-modal-title">${state.operationModal.title}</h3>
              <p><strong>${state.operationModal.studentName}</strong></p>
              <p class="muted">${state.operationModal.tipo === "devolucion" ? `El equipo ${state.operationModal.equipmentNumber} ha sido devuelto.` : `Quedó registrado con el equipo ${state.operationModal.equipmentNumber}.`}</p>
              <button class="btn btn-block" type="button" data-close-operation-modal="true">Continuar</button>
            </div>
          </div>
        `
        : ""
    }
  `;

  const codeForm = root.querySelector("#student-form");
  const operationForm = root.querySelector("#operation-form");
  const codeInput = root.querySelector("#student-code");
  const equipmentSelect = root.querySelector("#student-equipment");

  const syncType = () => {
    const currentState = store.getState();
    const currentAvailableEquipment =
      currentState.availableEquipment.length > 0
        ? currentState.availableEquipment
        : currentState.equipment.filter((item) => item.activo && item.estado === "disponible");
    equipmentSelect.disabled =
      currentState.operationType === "devolucion" || !currentState.selectedStudent || currentAvailableEquipment.length === 0;
  };

  codeInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const code = codeInput.value.trim();
      if (code) {
        await store.actions.findStudentByCode(code);
      }
    }
  });

  root.querySelectorAll("[data-operation-type]").forEach((button) => {
    button.addEventListener("click", () => {
      store.actions.setOperationType(button.dataset.operationType);
      syncType();
    });
  });

  operationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(operationForm);
    const currentState = store.getState();

    await store.actions.registerStudentOperation({
      codigo: String(data.get("codigo") || "").trim(),
      tipo: currentState.operationType,
      equipo_id: data.get("equipo_id") ? Number(data.get("equipo_id")) : null,
      observaciones: String(data.get("observaciones") || "").trim() || null
    });
    operationForm.reset();
    syncType();
    codeInput.focus();
  });

  const quickReturnBtn = root.querySelector("#quick-return-btn");
  if (quickReturnBtn) {
    quickReturnBtn.addEventListener("click", async () => {
      const currentState = store.getState();
      if (currentState.selectedStudent?.prestamo_activo) {
        await store.actions.registerStudentOperation({
          codigo: currentState.selectedStudent.codigo,
          tipo: "devolucion",
          equipo_id: currentState.selectedStudent.prestamo_activo.equipo_id,
          observaciones: null
        });
        operationForm.reset();
        syncType();
        codeInput.focus();
      }
    });
  }

  const quickLoanBtn = root.querySelector("#quick-loan-btn");
  if (quickLoanBtn) {
    quickLoanBtn.addEventListener("click", () => {
      store.actions.setOperationType("prestamo");
      syncType();
      equipmentSelect.focus();
    });
  }

  root.querySelectorAll("[data-close-operation-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      store.actions.closeOperationModal();
      setTimeout(() => codeInput.focus(), 0);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      operationForm.reset();
      syncType();
      codeInput.focus();
    }
  });

  syncType();
  codeInput.focus();
}
