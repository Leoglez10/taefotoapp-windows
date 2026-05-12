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
      <div class="student-hero empty">
        <div class="student-avatar">?</div>
        <div class="student-name-display">
          <h3 class="student-name-empty">Sin alumno seleccionado</h3>
          <p class="muted">Capture el código y presione Enter</p>
        </div>
        <span class="pill-tag neutral">Esperando código</span>
      </div>
    `;
  }

  const hasLoan = student.prestamo_activo;
  return `
    <div class="student-hero ${hasLoan ? "has-loan" : ""}">
      <div class="student-avatar ${hasLoan ? "warning" : "success"}">
        ${hasLoan ? "!" : "✓"}
      </div>
      <div class="student-name-display">
        <h3 class="student-name">${student.nombre}</h3>
        <p class="student-info">
          <span class="info-tag">📚 ${student.materia}</span>
          <span class="info-tag">👥 ${student.grupo}</span>
          <span class="info-tag">👨‍🏫 ${student.profesor}</span>
        </p>
      </div>
      <span class="pill-tag ${hasLoan ? "warn" : "success"}">
        ${hasLoan ? "⚠️ CON PRÉSTAMO" : "✅ Disponible"}
      </span>
      ${hasLoan ? `
        <div class="loan-badge">
          <span class="loan-label">Equipo prestado:</span>
          <span class="loan-equipo-num">${student.prestamo_activo.equipo_numero}</span>
          <span class="loan-date">Desde: ${student.prestamo_activo.fecha_prestamo}</span>
        </div>
      ` : ""}
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
  const submitLabel = hasLoan ? "📥 Registrar devolución" : "📤 Registrar préstamo";
  const submitClass = hasLoan ? "btn-danger" : "btn";
  const equipmentDisabled = currentType === "devolucion" || !state.selectedStudent || availableEquipment.length === 0;
  const selectPlaceholder = currentType === "devolucion" ? "📥 Devolución automática" : "📦 Seleccione equipo";

  root.innerHTML = `
    <section class="hero-card">
      <div>
        <h2>📋 Préstamo de Equipos</h2>
        <p class="muted">Capture el código del aluno y presione Enter</p>
      </div>
      <div class="hero-stats">
        <article class="stat">Alumnos<strong>${dashboard.alumnos_activos}</strong></article>
        <article class="stat">Disponibles<strong>${dashboard.equipos_disponibles}</strong></article>
        <article class="stat">Prestados<strong>${dashboard.prestamos_activos}</strong></article>
      </div>
    </section>

    ${bannerMarkup(state.flash)}

    <section class="operation-layout">
      <div class="left-column">
        <article class="panel panel-code">
          <div class="code-input-wrapper">
            <label for="student-code" class="big-label">Código del Alumno</label>
            <input 
              id="student-code" 
              name="codigo" 
              autocomplete="off" 
              class="big-input"
              placeholder="🔍 Escanear o escribir código..."
              value="${state.selectedStudent?.codigo || ""}"
            />
            <span class="input-hint">Presione Enter para buscar</span>
          </div>
        </article>

        ${!hasLoan ? `
        <article class="panel panel-equipment">
          <h3>🎯 Seleccionar Equipo</h3>
          <div class="equipment-grid">
            ${availableEquipment.length === 0 
              ? `<div class="no-equipment">⚠️ No hay equipos disponibles</div>`
              : availableEquipment.map(item => `
                <button type="button" class="equipment-btn" data-equipment-id="${item.id}">
                  <span class="eq-num">${item.numero}</span>
                  <span class="eq-desc">${item.descripcion || ""}</span>
                </button>
              `).join("")
            }
          </div>
          <input type="hidden" name="equipo_id" id="selected-equipment-id" value="" />
        </article>
        ` : ""}

        <article class="panel">
          <h3>📝 Observaciones</h3>
          <input name="observaciones" id="observaciones" class="obs-input" placeholder="${hasLoan ? "Notas opcionales (devolución)..." : "Notas opcionales..."}" />
        </article>

        <button class="btn btn-block btn-xl ${submitClass}" id="submit-btn" type="button">
          ${submitLabel}
        </button>
      </div>

      <div class="right-column">
        <article class="panel panel-student">
          ${studentCard(state.selectedStudent)}
        </article>

        <article class="panel panel-history">
          <h3>📜 Historial</h3>
          ${historyTable(state.studentHistory)}
        </article>
      </div>
    </section>
  `;

  const codeInput = root.querySelector("#student-code");
  const submitBtn = root.querySelector("#submit-btn");
  const equipmentInput = root.querySelector("#selected-equipment-id");

  codeInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const code = codeInput.value.trim();
      if (code) {
        await store.actions.findStudentByCode(code);
      }
    }
  });

  root.querySelectorAll(".equipment-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".equipment-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      if (equipmentInput) equipmentInput.value = btn.dataset.equipmentId;
    });
    btn.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitBtn.click();
      }
    });
  });

  const obsInput = root.querySelector("#observaciones");
  obsInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitBtn.click();
    }
  });

  submitBtn.addEventListener("click", async () => {
    const currentState = store.getState();
    const equipoId = equipmentInput?.value;
    const observaciones = root.querySelector("#observaciones")?.value?.trim() || "";
    const student = currentState.selectedStudent;

    if (!student) {
      return;
    }

    if (student.prestamo_activo) {
      const equipoIdDev = student.prestamo_activo.equipo_id;
      await store.actions.registerStudentOperation({
        codigo: student.codigo,
        tipo: "devolucion",
        equipo_id: equipoIdDev,
        observaciones: observaciones || null
      });
    } else if (equipoId) {
      await store.actions.registerStudentOperation({
        codigo: student.codigo,
        tipo: "prestamo",
        equipo_id: Number(equipoId),
        observaciones: observaciones || null
      });
    }

    if (equipmentInput) equipmentInput.value = "";
    root.querySelectorAll(".equipment-btn").forEach(b => b.classList.remove("selected"));
    root.querySelector("#observaciones").value = "";
    codeInput.value = "";
    codeInput.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (equipmentInput) equipmentInput.value = "";
      root.querySelectorAll(".equipment-btn").forEach(b => b.classList.remove("selected"));
      root.querySelector("#observaciones").value = "";
      codeInput.value = "";
      codeInput.focus();
    }
  });

  codeInput.focus();
}
