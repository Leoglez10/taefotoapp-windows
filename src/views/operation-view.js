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

  return `
    <div class="lookup-result student-card">
      <div class="student-card-head">
        <div>
          <p class="eyebrow">Alumno identificado</p>
          <h3>${student.nombre}</h3>
        </div>
        <span class="pill-tag ${student.prestamo_activo ? "warn" : "success"}">
          ${student.prestamo_activo ? "Con préstamo activo" : "Listo para préstamo"}
        </span>
      </div>
      <div class="student-meta-grid">
        <article><span>Código</span><strong>${student.codigo}</strong></article>
        <article><span>Grupo</span><strong>${student.grupo}</strong></article>
        <article><span>Materia</span><strong>${student.materia}</strong></article>
        <article><span>Profesor</span><strong>${student.profesor}</strong></article>
      </div>
      ${
        student.prestamo_activo
          ? `<div class="status-banner warn">Equipo activo: <strong>${student.prestamo_activo.equipo_numero}</strong> desde ${student.prestamo_activo.fecha_prestamo}. Registre la devolución si ya lo entrega.</div>`
          : `<div class="status-banner success">No tiene préstamo activo. Puede registrar una salida nueva.</div>`
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
  const canLoan = Boolean(state.selectedStudent) && currentType === "prestamo" && availableEquipment.length > 0;

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

    <section class="operation-grid">
      <article class="panel">
        <h3>Registrar movimiento</h3>
        <form id="student-form" class="form-grid">
          <label>
            Código
            <input id="student-code" name="codigo" autocomplete="off" placeholder="Escanee o escriba el código" value="${state.selectedStudent?.codigo || ""}" />
          </label>
          ${operationTypeButtons(currentType, state.selectedStudent)}
          ${studentCard(state.selectedStudent)}
          <div class="two-col aligned-end">
            <label>
              Equipo
              <select name="equipo_id" id="student-equipment">
                <option value="">Seleccione</option>
                ${equipmentOptions(availableEquipment)}
              </select>
            </label>
          </div>
          ${
            !availableEquipment.length
              ? `<div class="status-banner warn">No hay equipos activos en estado disponible para prestar.</div>`
              : ""
          }
          <label>
            Observaciones
            <input name="observaciones" placeholder="Opcional" />
          </label>
          <button class="btn btn-block btn-xl" type="submit">Registrar movimiento</button>
        </form>
      </article>

      <article class="panel">
        <h3>Historial del alumno</h3>
        ${historyTable(state.studentHistory)}
      </article>
    </section>

    ${
      state.operationModal
        ? `
          <div class="modal-backdrop" data-close-operation-modal="true">
            <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="operation-modal-title">
              <div class="modal-icon">OK</div>
              <h3 id="operation-modal-title">${state.operationModal.title}</h3>
              <p><strong>${state.operationModal.studentName}</strong> quedó registrado con el equipo <strong>${state.operationModal.equipmentNumber}</strong>.</p>
              <p class="muted">El formulario ya se limpió para capturar al siguiente alumno.</p>
              <button class="btn btn-block" type="button" data-close-operation-modal="true">Continuar</button>
            </div>
          </div>
        `
        : ""
    }
  `;

  const form = root.querySelector("#student-form");
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

  codeInput.addEventListener("change", async () => {
    await store.actions.findStudentByCode(codeInput.value.trim());
  });

  codeInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await store.actions.findStudentByCode(codeInput.value.trim());
    }
  });

  root.querySelectorAll("[data-operation-type]").forEach((button) => {
    button.addEventListener("click", () => {
      store.actions.setOperationType(button.dataset.operationType);
      syncType();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const currentState = store.getState();

    await store.actions.registerStudentOperation({
      codigo: String(data.get("codigo") || "").trim(),
      tipo: currentState.operationType,
      equipo_id: data.get("equipo_id") ? Number(data.get("equipo_id")) : null,
      observaciones: String(data.get("observaciones") || "").trim() || null
    });
    form.reset();
    syncType();
    codeInput.focus();
  });

  root.querySelectorAll("[data-close-operation-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      store.actions.closeOperationModal();
      setTimeout(() => codeInput.focus(), 0);
    });
  });

  syncType();
  codeInput.focus();
}
