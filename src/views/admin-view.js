function bannerMarkup(flash) {
  if (!flash) return "";
  return `<div class="status-banner ${flash.tone}">${flash.message}</div>`;
}

function sectionButton(label, key, active, helper = "") {
  return `
    <button class="dashboard-tile ${active ? "active" : ""}" data-section="${key}" type="button">
      <strong>${label}</strong>
      <span>${helper}</span>
    </button>
  `;
}

function studentRows(students) {
  return students
    .map(
      (student) => `
        <tr data-student-row data-codigo="${student.codigo}" data-nombre="${student.nombre}" data-materia="${student.materia}" data-profesor="${student.profesor}" data-grupo="${student.grupo}" data-activo="${student.activo ? "1" : "0"}">
          <td><input data-field="codigo" value="${student.codigo}" /></td>
          <td><input data-field="nombre" value="${student.nombre}" /></td>
          <td><input data-field="materia" value="${student.materia}" /></td>
          <td><input data-field="profesor" value="${student.profesor}" /></td>
          <td><input data-field="grupo" value="${student.grupo}" /></td>
          <td>
            <select data-field="activo">
              <option value="1" ${student.activo ? "selected" : ""}>Activo</option>
              <option value="0" ${student.activo ? "" : "selected"}>Inactivo</option>
            </select>
          </td>
          <td class="actions-cell">
            <button class="btn-secondary" type="button" data-save-student="${student.id}">Guardar</button>
            <button class="btn-danger" type="button" data-delete-student="${student.id}">Eliminar</button>
          </td>
        </tr>
      `
    )
    .join("");
}

function equipmentRows(equipment) {
  return equipment
    .map(
      (item) => `
        <tr data-equipment-row data-numero="${item.numero}" data-descripcion="${item.descripcion}" data-estado="${item.estado}" data-activo="${item.activo ? "1" : "0"}">
          <td><input data-field="numero" value="${item.numero}" /></td>
          <td><input data-field="descripcion" value="${item.descripcion}" /></td>
          <td>
            <select data-field="estado">
              <option value="disponible" ${item.estado === "disponible" ? "selected" : ""}>disponible</option>
              <option value="prestado" ${item.estado === "prestado" ? "selected" : ""}>prestado</option>
            </select>
          </td>
          <td>
            <select data-field="activo">
              <option value="1" ${item.activo ? "selected" : ""}>Activo</option>
              <option value="0" ${item.activo ? "" : "selected"}>Inactivo</option>
            </select>
          </td>
          <td class="actions-cell">
            <button class="btn-secondary" type="button" data-save-equipment="${item.id}">Guardar</button>
            <button class="btn-danger" type="button" data-delete-equipment="${item.id}">Eliminar</button>
          </td>
        </tr>
      `
    )
    .join("");
}

function adminRows(admins) {
  return admins
    .map(
      (admin) => `
        <tr data-admin-row data-usuario="${admin.usuario}" data-nombre="${admin.nombre}" data-activo="${admin.activo ? "1" : "0"}">
          <td><input data-field="usuario" value="${admin.usuario}" /></td>
          <td><input data-field="nombre" value="${admin.nombre}" /></td>
          <td><input data-field="password" type="password" placeholder="Dejar en blanco para conservar" /></td>
          <td>
            <select data-field="activo">
              <option value="1" ${admin.activo ? "selected" : ""}>Activo</option>
              <option value="0" ${admin.activo ? "" : "selected"}>Inactivo</option>
            </select>
          </td>
          <td class="actions-cell">
            <button class="btn-secondary" type="button" data-save-admin="${admin.id}">Guardar</button>
            <button class="btn-danger" type="button" data-delete-admin="${admin.id}">Eliminar</button>
          </td>
        </tr>
      `
    )
    .join("");
}

function recordRows(records) {
  return records
    .map(
      (item) => `
        <tr data-record-row data-tipo="${item.tipo}" data-codigo="${item.codigo}" data-nombre="${item.alumno_nombre}" data-materia="${item.materia}" data-profesor="${item.profesor}" data-grupo="${item.grupo}" data-equipo="${item.equipo_numero}" data-observaciones="${item.observaciones || ""}">
          <td>${item.fecha}</td>
          <td>${item.tipo.toUpperCase()}</td>
          <td>${item.codigo}</td>
          <td>${item.alumno_nombre}</td>
          <td>${item.materia}</td>
          <td>${item.profesor}</td>
          <td>${item.grupo}</td>
          <td>${item.equipo_numero}</td>
          <td>${item.observaciones || "-"}</td>
        </tr>
      `
    )
    .join("");
}

function reportRows(reportData) {
  if (!reportData) {
    return `<tr><td colspan="3">Seleccione un reporte y presione consultar.</td></tr>`;
  }
  return (
    reportData.filas
      .map(
        (item) => `
          <tr>
            <td>${item.etiqueta}</td>
            <td>${item.valor}</td>
            <td>${item.detalle}</td>
          </tr>
        `
      )
      .join("") || `<tr><td colspan="3">Sin resultados.</td></tr>`
  );
}

function reportPreviewModal(state) {
  if (!state.reportPreviewOpen || !state.reportData) return "";

  const rows = state.reportData.filas
    .map(
      (item) => `
        <tr>
          <td>${item.etiqueta}</td>
          <td>${item.valor}</td>
          <td>${item.detalle}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div class="modal-backdrop" data-close-report-preview="true">
      <div class="modal-card report-preview-modal" role="dialog" aria-modal="true" aria-labelledby="report-preview-title">
        <div class="report-preview-sheet">
          <div class="report-preview-head">
            <div>
              <p class="eyebrow">Vista previa antes de descargar</p>
              <h3 id="report-preview-title">${state.reportData.titulo}</h3>
            </div>
            <div class="report-preview-stamp">PDF</div>
          </div>
          <p class="muted">Generado: ${state.reportData.generado_en}</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Concepto</th><th>Total</th><th>Detalle</th></tr></thead>
              <tbody>${rows || `<tr><td colspan="3">Sin resultados.</td></tr>`}</tbody>
            </table>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" type="button" data-print-report-preview="true">Imprimir vista</button>
          <button class="ghost-btn" type="button" data-close-report-preview="true">Cerrar</button>
          <button class="btn" type="button" data-generate-report-from-preview="true">Generar PDF</button>
        </div>
      </div>
    </div>
  `;
}

function buildPrintableReportHtml(reportData) {
  const rows = reportData.filas
    .map(
      (item) => `
        <tr>
          <td>${item.etiqueta}</td>
          <td>${item.valor}</td>
          <td>${item.detalle}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${reportData.titulo}</title>
        <style>
          body {
            font-family: "Segoe UI", Tahoma, sans-serif;
            color: #1d2430;
            margin: 0;
            padding: 36px;
            background: #ffffff;
          }
          .sheet {
            border: 2px solid #243753;
            border-radius: 20px;
            padding: 28px;
          }
          .head {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: start;
            margin-bottom: 20px;
          }
          .badge {
            border: 1px solid #8ea6cb;
            padding: 10px 14px;
            border-radius: 12px;
            font-weight: 700;
            color: #243753;
            background: #edf2fa;
          }
          h1 {
            margin: 0 0 8px;
            color: #243753;
            font-size: 28px;
          }
          p {
            margin: 0;
            color: #596579;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #d4ddea;
            padding: 12px 14px;
            text-align: left;
          }
          th {
            background: #edf2fa;
            color: #243753;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="head">
            <div>
              <p>Preparatoria Quince</p>
              <h1>${reportData.titulo}</h1>
              <p>Generado: ${reportData.generado_en}</p>
            </div>
            <div class="badge">Vista previa</div>
          </div>
          <table>
            <thead>
              <tr><th>Concepto</th><th>Total</th><th>Detalle</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </body>
    </html>
  `;
}

function printReportPreview(reportData) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  iframe.srcdoc = buildPrintableReportHtml(reportData);
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1000);
  };
}

function dashboardSummary(summary, activeAdmins) {
  if (!summary) return "";
  return `
    <div class="summary-grid">
      <article class="stat">Alumnos<strong>${summary.alumnos_activos}</strong></article>
      <article class="stat">Disponibles<strong>${summary.equipos_disponibles}</strong></article>
      <article class="stat">Prestados<strong>${summary.prestamos_activos}</strong></article>
      <article class="stat">Registros<strong>${summary.registros_totales}</strong></article>
      <article class="stat">Admins<strong>${activeAdmins}</strong></article>
    </div>
  `;
}

function updateVisibleCount(root, counterId, total, visible) {
  const node = root.querySelector(`#${counterId}`);
  if (node) {
    node.textContent = `${visible} de ${total} visibles`;
  }
}

function attachTableFilters(root) {
  const applyStudents = () => {
    const query = root.querySelector("#student-search")?.value.trim().toLowerCase() || "";
    const status = root.querySelector("#student-status-filter")?.value || "all";
    const rows = [...root.querySelectorAll("#students-table tbody tr[data-student-row]")];
    let visible = 0;
    rows.forEach((row) => {
      const haystack = `${row.dataset.codigo} ${row.dataset.nombre} ${row.dataset.materia} ${row.dataset.profesor} ${row.dataset.grupo}`.toLowerCase();
      const activo = row.dataset.activo === "1";
      const show = (!query || haystack.includes(query)) && (status === "all" || (status === "active" && activo) || (status === "inactive" && !activo));
      row.hidden = !show;
      if (show) visible += 1;
    });
    updateVisibleCount(root, "students-visible-count", rows.length, visible);
  };

  const applyEquipment = () => {
    const query = root.querySelector("#equipment-search")?.value.trim().toLowerCase() || "";
    const status = root.querySelector("#equipment-status-filter")?.value || "all";
    const active = root.querySelector("#equipment-active-filter")?.value || "all";
    const rows = [...root.querySelectorAll("#equipment-table tbody tr[data-equipment-row]")];
    let visible = 0;
    rows.forEach((row) => {
      const haystack = `${row.dataset.numero} ${row.dataset.descripcion}`.toLowerCase();
      const activo = row.dataset.activo === "1";
      const show =
        (!query || haystack.includes(query)) &&
        (status === "all" || row.dataset.estado === status) &&
        (active === "all" || (active === "active" && activo) || (active === "inactive" && !activo));
      row.hidden = !show;
      if (show) visible += 1;
    });
    updateVisibleCount(root, "equipment-visible-count", rows.length, visible);
  };

  const applyAdmins = () => {
    const query = root.querySelector("#admin-search")?.value.trim().toLowerCase() || "";
    const status = root.querySelector("#admin-status-filter")?.value || "all";
    const rows = [...root.querySelectorAll("#admins-table tbody tr[data-admin-row]")];
    let visible = 0;
    rows.forEach((row) => {
      const haystack = `${row.dataset.usuario} ${row.dataset.nombre}`.toLowerCase();
      const activo = row.dataset.activo === "1";
      const show = (!query || haystack.includes(query)) && (status === "all" || (status === "active" && activo) || (status === "inactive" && !activo));
      row.hidden = !show;
      if (show) visible += 1;
    });
    updateVisibleCount(root, "admins-visible-count", rows.length, visible);
  };

  const applyRecords = () => {
    const query = root.querySelector("#records-search")?.value.trim().toLowerCase() || "";
    const type = root.querySelector("#records-type-filter")?.value || "all";
    const rows = [...root.querySelectorAll("#records-table tbody tr[data-record-row]")];
    let visible = 0;
    rows.forEach((row) => {
      const haystack = `${row.dataset.codigo} ${row.dataset.nombre} ${row.dataset.materia} ${row.dataset.profesor} ${row.dataset.grupo} ${row.dataset.equipo} ${row.dataset.observaciones}`.toLowerCase();
      const show = (!query || haystack.includes(query)) && (type === "all" || row.dataset.tipo === type);
      row.hidden = !show;
      if (show) visible += 1;
    });
    updateVisibleCount(root, "records-visible-count", rows.length, visible);
  };

  root.querySelector("#student-search")?.addEventListener("input", applyStudents);
  root.querySelector("#student-status-filter")?.addEventListener("change", applyStudents);
  root.querySelector("#equipment-search")?.addEventListener("input", applyEquipment);
  root.querySelector("#equipment-status-filter")?.addEventListener("change", applyEquipment);
  root.querySelector("#equipment-active-filter")?.addEventListener("change", applyEquipment);
  root.querySelector("#admin-search")?.addEventListener("input", applyAdmins);
  root.querySelector("#admin-status-filter")?.addEventListener("change", applyAdmins);
  root.querySelector("#records-search")?.addEventListener("input", applyRecords);
  root.querySelector("#records-type-filter")?.addEventListener("change", applyRecords);

  root.querySelectorAll("[data-reset-filters]").forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.dataset.resetFilters;
      if (section === "students") {
        root.querySelector("#student-search").value = "";
        root.querySelector("#student-status-filter").value = "all";
        applyStudents();
      }
      if (section === "equipment") {
        root.querySelector("#equipment-search").value = "";
        root.querySelector("#equipment-status-filter").value = "all";
        root.querySelector("#equipment-active-filter").value = "all";
        applyEquipment();
      }
      if (section === "admins") {
        root.querySelector("#admin-search").value = "";
        root.querySelector("#admin-status-filter").value = "all";
        applyAdmins();
      }
      if (section === "records") {
        root.querySelector("#records-search").value = "";
        root.querySelector("#records-type-filter").value = "all";
        applyRecords();
      }
    });
  });

  applyStudents();
  applyEquipment();
  applyAdmins();
  applyRecords();
}

function importSection(state) {
  const backupRows =
    state.backups?.items?.length
      ? state.backups.items
          .map(
            (item) => `
              <tr>
                <td>${item.file_name}</td>
                <td>${item.modified_at}</td>
                <td>${Math.max(1, Math.round(item.size_bytes / 1024))} KB</td>
                <td><button class="ghost-btn" type="button" data-open-backup="${item.path}">Abrir</button></td>
              </tr>
            `
          )
          .join("")
      : `<tr><td colspan="4">Sin respaldos todavía.</td></tr>`;

  const summary = state.importSummary
    ? `
      <div class="import-summary">
        <div class="import-summary-head">
          <div>
            <p class="eyebrow">Archivo importado</p>
            <h3>${state.importSummary.archivo}</h3>
          </div>
          <div class="import-badge">${state.importSummary.formato || "-"}</div>
        </div>
        <div class="import-metrics">
          <article class="import-metric">
            <span>Alumnos insertados</span>
            <strong>${state.importSummary.alumnos_insertados}</strong>
          </article>
          <article class="import-metric">
            <span>Alumnos actualizados</span>
            <strong>${state.importSummary.alumnos_actualizados}</strong>
          </article>
          <article class="import-metric">
            <span>Alumnos omitidos</span>
            <strong>${state.importSummary.alumnos_omitidos}</strong>
          </article>
          <article class="import-metric">
            <span>Grupos insertados</span>
            <strong>${state.importSummary.grupos_insertados ?? 0}</strong>
          </article>
          <article class="import-metric">
            <span>Grupos actualizados</span>
            <strong>${state.importSummary.grupos_actualizados ?? 0}</strong>
          </article>
          <article class="import-metric">
            <span>Grupos omitidos</span>
            <strong>${state.importSummary.grupos_omitidos ?? 0}</strong>
          </article>
        </div>
        <div class="import-sheet-row">
          <span class="import-sheet-label">Hojas validadas</span>
          <div class="import-chip-row">
            ${
              Array.isArray(state.importSummary.hojas_validadas) && state.importSummary.hojas_validadas.length
                ? state.importSummary.hojas_validadas
                    .map((sheet) => `<span class="import-chip">${sheet}</span>`)
                    .join("")
                : `<span class="import-chip muted-chip">-</span>`
            }
          </div>
        </div>
      </div>
    `
    : `<div class="import-summary soft"><p>La app acepta <strong>ALUMNOS</strong>, <strong>GRUPOS</strong> o ambas. Tambien conserva el formato legado <strong>GRUPOS + REGISTRO</strong>. Si cambian columnas, nombres o el orden esperado, el archivo se rechaza.</p></div>`;

  return `
    <div class="admin-stack">
      <div class="panel">
        <div class="section-head">
          <div>
            <h3>Importar Excel</h3>
            <p class="muted">Carga un archivo con hojas separadas o el formato legado, sin renombrar columnas ni hojas.</p>
          </div>
          <div class="hero-actions">
            <label class="file-picker">
              <input id="excel-file" type="file" accept=".xlsx,.xlsm" />
              <span class="btn">Seleccionar Excel</span>
            </label>
            <button class="btn-secondary" type="button" data-backup-database="true">Respaldar base</button>
            <label class="file-picker">
              <input id="database-file" type="file" accept=".sqlite,.db" />
              <span class="ghost-btn">Restaurar base</span>
            </label>
          </div>
        </div>
        ${summary}
      </div>
      <div class="spec-grid">
        <article class="panel">
          <h3>Especificaciones</h3>
          <ul class="spec-list">
            <li>Solo se aceptan archivos <strong>.xlsx</strong> y <strong>.xlsm</strong>.</li>
            <li>Puedes subir solo <strong>ALUMNOS</strong>, solo <strong>GRUPOS</strong> o ambas hojas en el mismo libro.</li>
            <li>La hoja <strong>ALUMNOS</strong> debe tener: <strong>Código</strong>, <strong>Nombre</strong>, <strong>Materia</strong>, <strong>Profesor(a)</strong> y <strong>Grupo</strong>.</li>
            <li>La hoja <strong>GRUPOS</strong> debe tener: <strong>Grupo</strong>, <strong>Turno</strong> y <strong>Ciclo escolar</strong>. El turno debe ser <strong>MAT</strong> o <strong>VES</strong>.</li>
            <li>Tambien se acepta el formato legado con <strong>GRUPOS</strong> y <strong>REGISTRO</strong>.</li>
            <li>Si el codigo del alumno ya existe, se actualiza; si no, se crea. Si el grupo ya existe por grupo, turno y ciclo, se actualiza; si no, se crea.</li>
            <li><strong>Respaldar base</strong> crea una copia completa de la base actual en la carpeta de respaldos de la app.</li>
            <li><strong>Restaurar base</strong> reemplaza la base actual por un archivo <strong>.sqlite</strong> o <strong>.db</strong> válido y genera un respaldo automático antes.</li>
          </ul>
        </article>
        <article class="panel">
          <div class="section-head">
            <div>
              <h3>Historial de respaldos</h3>
              <p class="muted">Carpeta: ${state.backups?.directory || "No disponible"}</p>
            </div>
            <button class="ghost-btn" type="button" data-open-backups-folder="${state.backups?.directory || ""}">Abrir carpeta</button>
          </div>
          <div class="table-wrap compact-table">
            <table>
              <thead><tr><th>Archivo</th><th>Fecha</th><th>Tamaño</th><th>Acción</th></tr></thead>
              <tbody>${backupRows}</tbody>
            </table>
          </div>
        </article>
        <article class="panel">
          <h3>Ejemplo ALUMNOS</h3>
          <div class="table-wrap compact-table">
            <table>
              <thead><tr><th>Código</th><th>Nombre</th><th>Materia</th><th>Profesor(a)</th><th>Grupo</th></tr></thead>
              <tbody>
                <tr><td>240145</td><td>María Pérez</td><td>Fotografía</td><td>Laura Soto</td><td>5AV</td></tr>
                <tr><td>240146</td><td>Diego Núñez</td><td>Iluminación</td><td>Rafael Cruz</td><td>5AV</td></tr>
                <tr><td>240147</td><td>Ana López</td><td>Edición</td><td>Mariana Vega</td><td>5BV</td></tr>
              </tbody>
            </table>
          </div>
          <h3 style="margin-top: 20px;">Ejemplo GRUPOS</h3>
          <div class="table-wrap compact-table">
            <table>
              <thead><tr><th>Grupo</th><th>Turno</th><th>Ciclo escolar</th></tr></thead>
              <tbody>
                <tr><td>5AV</td><td>MAT</td><td>2025-2026</td></tr>
                <tr><td>5BV</td><td>VES</td><td>2025-2026</td></tr>
                <tr><td>6AV</td><td>MAT</td><td>2025-2026</td></tr>
              </tbody>
            </table>
          </div>
          <p class="muted" style="margin-top: 12px;">Formato legado: si subes <strong>GRUPOS + REGISTRO</strong>, se sigue validando como antes.</p>
        </article>
      </div>
    </div>
  `;
}

function studentsSection(state) {
  return `
    <div class="admin-grid wide">
      <article class="panel">
        <h3>Agregar alumno</h3>
        <form id="student-create-form" class="form-grid">
          <label>Código<input name="codigo" required /></label>
          <label>Nombre<input name="nombre" required /></label>
          <label>Materia<input name="materia" required /></label>
          <label>Profesor<input name="profesor" required /></label>
          <label>Grupo<input name="grupo" required /></label>
          <button class="btn" type="submit">Agregar alumno</button>
        </form>
      </article>
      <article class="panel">
        <div class="section-head">
          <div>
            <h3>Alumnos</h3>
            <p id="students-visible-count" class="muted">${state.students.length} de ${state.students.length} visibles</p>
          </div>
          <button class="ghost-btn" type="button" data-reset-filters="students">Limpiar filtros</button>
        </div>
        <div class="toolbar-filters">
          <input id="student-search" placeholder="Buscar alumno" />
          <select id="student-status-filter">
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
        <div class="table-wrap">
          <table id="students-table">
            <thead><tr><th>Código</th><th>Nombre</th><th>Materia</th><th>Profesor</th><th>Grupo</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>${studentRows(state.students) || `<tr><td colspan="7">Sin alumnos.</td></tr>`}</tbody>
          </table>
        </div>
      </article>
    </div>
  `;
}

function equipmentSection(state) {
  return `
    <div class="admin-grid wide">
      <article class="panel">
        <h3>Agregar equipo</h3>
        <form id="equipment-create-form" class="form-grid">
          <label>Número<input name="numero" required /></label>
          <label>Descripción<input name="descripcion" required /></label>
          <label>
            Estado
            <select name="estado">
              <option value="disponible">disponible</option>
              <option value="prestado">prestado</option>
            </select>
          </label>
          <button class="btn" type="submit">Agregar equipo</button>
        </form>
      </article>
      <article class="panel">
        <div class="section-head">
          <div>
            <h3>Equipos</h3>
            <p id="equipment-visible-count" class="muted">${state.equipment.length} de ${state.equipment.length} visibles</p>
          </div>
          <button class="ghost-btn" type="button" data-reset-filters="equipment">Limpiar filtros</button>
        </div>
        <div class="toolbar-filters three-up">
          <input id="equipment-search" placeholder="Buscar equipo" />
          <select id="equipment-status-filter">
            <option value="all">Todos los estados</option>
            <option value="disponible">Disponibles</option>
            <option value="prestado">Prestados</option>
          </select>
          <select id="equipment-active-filter">
            <option value="all">Activos e inactivos</option>
            <option value="active">Solo activos</option>
            <option value="inactive">Solo inactivos</option>
          </select>
        </div>
        <div class="table-wrap">
          <table id="equipment-table">
            <thead><tr><th>Número</th><th>Descripción</th><th>Estado</th><th>Activo</th><th>Acciones</th></tr></thead>
            <tbody>${equipmentRows(state.equipment) || `<tr><td colspan="5">Sin equipos.</td></tr>`}</tbody>
          </table>
        </div>
      </article>
    </div>
  `;
}

function adminsSection(state) {
  return `
    <div class="admin-grid wide">
      <article class="panel">
        <h3>Agregar administrador</h3>
        <form id="admin-create-form" class="form-grid">
          <label>Usuario<input name="usuario" required /></label>
          <label>Nombre<input name="nombre" required /></label>
          <label>Contraseña<input name="password" type="password" required /></label>
          <button class="btn" type="submit">Agregar administrador</button>
        </form>
      </article>
      <article class="panel">
        <div class="section-head">
          <div>
            <h3>Administradores</h3>
            <p id="admins-visible-count" class="muted">${state.admins.length} de ${state.admins.length} visibles</p>
          </div>
          <button class="ghost-btn" type="button" data-reset-filters="admins">Limpiar filtros</button>
        </div>
        <div class="toolbar-filters">
          <input id="admin-search" placeholder="Buscar administrador" />
          <select id="admin-status-filter">
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
        <div class="table-wrap">
          <table id="admins-table">
            <thead><tr><th>Usuario</th><th>Nombre</th><th>Nueva contraseña</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>${adminRows(state.admins) || `<tr><td colspan="5">Sin administradores.</td></tr>`}</tbody>
          </table>
        </div>
      </article>
    </div>
  `;
}

function recordsSection(state) {
  return `
    <div class="admin-grid wide">
      <article class="panel">
        <h3>Filtros de registros</h3>
        <form id="records-filter-form" class="form-grid">
          <label>Alumno<input name="alumno_query" value="${state.recordFilters.alumno_query || ""}" placeholder="Código o nombre" /></label>
          <div class="two-col">
            <label>Fecha inicio<input type="date" name="fecha_inicio" value="${state.recordFilters.fecha_inicio || ""}" /></label>
            <label>Fecha fin<input type="date" name="fecha_fin" value="${state.recordFilters.fecha_fin || ""}" /></label>
          </div>
          <button class="btn" type="submit">Filtrar</button>
        </form>
      </article>
      <article class="panel">
        <div class="section-head">
          <div>
            <h3>Registros</h3>
            <p id="records-visible-count" class="muted">${state.records.length} de ${state.records.length} visibles</p>
          </div>
          <div class="hero-actions">
            <button class="ghost-btn" type="button" data-reset-filters="records">Limpiar filtros</button>
            <button class="btn-secondary" type="button" data-export-records="true">Exportar CSV</button>
            <button class="btn-danger" type="button" data-clear-records="true">Borrar historial</button>
          </div>
        </div>
        <div class="toolbar-filters">
          <input id="records-search" placeholder="Buscar en resultados cargados" />
          <select id="records-type-filter">
            <option value="all">Todos los tipos</option>
            <option value="prestamo">Préstamos</option>
            <option value="devolucion">Devoluciones</option>
          </select>
        </div>
        <div class="table-wrap">
          <table id="records-table">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Código</th><th>Nombre</th><th>Materia</th><th>Profesor</th><th>Grupo</th><th>Equipo</th><th>Obs.</th></tr></thead>
            <tbody>${recordRows(state.records) || `<tr><td colspan="9">Sin registros.</td></tr>`}</tbody>
          </table>
        </div>
      </article>
    </div>
  `;
}

function reportsSection(state) {
  const studentOptions = state.students
    .map((student) => `<option value="${student.id}">${student.codigo} · ${student.nombre}</option>`)
    .join("");

  return `
    <div class="admin-grid wide">
      <article class="panel">
        <h3>Reportes</h3>
        <form id="report-form" class="form-grid">
          <label>
            Tipo de reporte
            <select name="report_type">
              <option value="prestamos_por_alumno">Préstamos por alumno</option>
              <option value="prestamos_por_fecha">Préstamos por fecha</option>
              <option value="equipos_mas_usados">Equipos más usados</option>
            </select>
          </label>
          <label>
            Alumno
            <select name="alumno_id">
              <option value="">Todos</option>
              ${studentOptions}
            </select>
          </label>
          <div class="two-col">
            <label>Fecha inicio<input type="date" name="fecha_inicio" /></label>
            <label>Fecha fin<input type="date" name="fecha_fin" /></label>
          </div>
          <div class="two-col">
            <button class="btn" type="submit" data-report-action="preview">Vista previa</button>
            <button class="btn-secondary" type="submit" data-report-action="table">Solo consultar</button>
          </div>
        </form>
        ${
          state.lastGeneratedPdfPath
            ? `<div class="report-quick-actions"><button class="ghost-btn" type="button" data-open-last-pdf="true">Abrir último PDF generado</button></div>`
            : ""
        }
      </article>
      <article class="panel">
        <h3>${state.reportData?.titulo || "Vista previa"}</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Concepto</th><th>Total</th><th>Detalle</th></tr></thead>
            <tbody>${reportRows(state.reportData)}</tbody>
          </table>
        </div>
      </article>
    </div>
  `;
}

function currentSection(state) {
  switch (state.adminSection) {
    case "import":
      return importSection(state);
    case "students":
      return studentsSection(state);
    case "equipment":
      return equipmentSection(state);
    case "admins":
      return adminsSection(state);
    case "records":
      return recordsSection(state);
    case "reports":
      return reportsSection(state);
    default:
      return `
        <div class="panel">
          <h3>Dashboard admin</h3>
          ${dashboardSummary(state.dashboard, state.admins.filter((admin) => admin.activo).length)}
        </div>
      `;
  }
}

function findRowValues(row) {
  const values = {};
  row.querySelectorAll("[data-field]").forEach((input) => {
    values[input.dataset.field] = input.value;
  });
  return values;
}

export function renderAdminView(root, store) {
  const state = store.getState();

  if (!state.adminAuthenticated) {
    root.innerHTML = `
      <section class="login-wrap">
        <article class="panel login-card">
          <h2>Login administrador</h2>
          ${bannerMarkup(state.flash)}
          <form id="admin-login-form" class="form-grid" autocomplete="off">
            <label>Usuario<input name="usuario" autocomplete="off" /></label>
            <label>Password<input type="password" name="password" autocomplete="new-password" /></label>
            <button class="btn btn-block" type="submit">INGRESAR</button>
          </form>
        </article>
      </section>
    `;

    root.querySelector("#admin-login-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      await store.actions.adminLogin(String(data.get("usuario") || ""), String(data.get("password") || ""));
    });
    return;
  }

  root.innerHTML = `
    <section class="hero-card">
      <div>
        <h2>Dashboard administrador</h2>
        <p class="muted">Gestión completa de alumnos, equipos, registros, importación y acceso de administradores.</p>
      </div>
      <div class="hero-actions stacked">
        <div class="admin-chip">Sesión: ${state.currentAdmin?.nombre || state.currentAdmin?.usuario || "Administrador"}</div>
        <button class="ghost-btn" type="button" data-action="logout-admin">Cerrar sesión</button>
      </div>
    </section>

    ${bannerMarkup(state.flash)}

    <section class="dashboard-grid dashboard-grid-admin">
      ${sectionButton("IMPORTAR EXCEL", "import", state.adminSection === "import", "Especificaciones")}
      ${sectionButton("ALUMNOS", "students", state.adminSection === "students", "Altas y edición")}
      ${sectionButton("EQUIPOS", "equipment", state.adminSection === "equipment", "Inventario")}
      ${sectionButton("ADMINS", "admins", state.adminSection === "admins", "Agregar y editar")}
      ${sectionButton("REGISTROS", "records", state.adminSection === "records", "Historial")}
      ${sectionButton("REPORTES", "reports", state.adminSection === "reports", "Vista y PDF")}
    </section>

    ${currentSection(state)}
    ${reportPreviewModal(state)}
  `;

  root.querySelector("[data-action='logout-admin']").addEventListener("click", () => store.actions.logoutAdmin());
  root.querySelectorAll("[data-section]").forEach((button) => {
    button.addEventListener("click", () => store.actions.setAdminSection(button.dataset.section));
  });

  root.querySelector("#excel-file")?.addEventListener("change", async (event) => {
    const [file] = event.currentTarget.files || [];
    if (file) {
      await store.actions.importExcelFile(file);
      event.currentTarget.value = "";
    }
  });

  root.querySelector("[data-backup-database='true']")?.addEventListener("click", async () => {
    await store.actions.backupDatabase();
  });

  root.querySelector("[data-open-backups-folder]")?.addEventListener("click", async (event) => {
    const path = event.currentTarget.dataset.openBackupsFolder;
    if (path) {
      await store.actions.openPath(path);
    }
  });

  root.querySelectorAll("[data-open-backup]").forEach((button) => {
    button.addEventListener("click", async () => {
      await store.actions.openPath(button.dataset.openBackup);
    });
  });

  root.querySelector("#database-file")?.addEventListener("change", async (event) => {
    const [file] = event.currentTarget.files || [];
    if (!file) return;
    const confirmed = window.confirm("Se reemplazará la base de datos actual con el archivo seleccionado. Antes se creará un respaldo automático. ¿Deseas continuar?");
    if (confirmed) {
      await store.actions.restoreDatabase(file);
    }
    event.currentTarget.value = "";
  });

  root.querySelector("#student-create-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await store.actions.createStudent({
      codigo: String(data.get("codigo") || "").trim(),
      nombre: String(data.get("nombre") || "").trim(),
      materia: String(data.get("materia") || "").trim(),
      profesor: String(data.get("profesor") || "").trim(),
      grupo: String(data.get("grupo") || "").trim(),
      activo: true
    });
    event.currentTarget.reset();
  });

  root.querySelectorAll("[data-save-student]").forEach((button) => {
    button.addEventListener("click", async () => {
      const row = button.closest("tr");
      const values = findRowValues(row);
      await store.actions.updateStudent({
        id: Number(button.dataset.saveStudent),
        codigo: values.codigo.trim(),
        nombre: values.nombre.trim(),
        materia: values.materia.trim(),
        profesor: values.profesor.trim(),
        grupo: values.grupo.trim(),
        activo: values.activo === "1"
      });
    });
  });

  root.querySelectorAll("[data-delete-student]").forEach((button) => {
    button.addEventListener("click", async () => {
      await store.actions.deleteStudent(Number(button.dataset.deleteStudent));
    });
  });

  root.querySelector("#equipment-create-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await store.actions.createEquipment({
      numero: String(data.get("numero") || "").trim(),
      descripcion: String(data.get("descripcion") || "").trim(),
      estado: String(data.get("estado") || "disponible"),
      activo: true
    });
    event.currentTarget.reset();
  });

  root.querySelectorAll("[data-save-equipment]").forEach((button) => {
    button.addEventListener("click", async () => {
      const row = button.closest("tr");
      const values = findRowValues(row);
      await store.actions.updateEquipment({
        id: Number(button.dataset.saveEquipment),
        numero: values.numero.trim(),
        descripcion: values.descripcion.trim(),
        estado: values.estado,
        activo: values.activo === "1"
      });
    });
  });

  root.querySelectorAll("[data-delete-equipment]").forEach((button) => {
    button.addEventListener("click", async () => {
      await store.actions.deleteEquipment(Number(button.dataset.deleteEquipment));
    });
  });

  root.querySelector("#admin-create-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await store.actions.createAdmin({
      usuario: String(data.get("usuario") || "").trim(),
      nombre: String(data.get("nombre") || "").trim(),
      password: String(data.get("password") || "").trim(),
      activo: true
    });
    event.currentTarget.reset();
  });

  root.querySelectorAll("[data-save-admin]").forEach((button) => {
    button.addEventListener("click", async () => {
      const row = button.closest("tr");
      const values = findRowValues(row);
      await store.actions.updateAdmin({
        id: Number(button.dataset.saveAdmin),
        usuario: values.usuario.trim(),
        nombre: values.nombre.trim(),
        password: values.password.trim() || null,
        activo: values.activo === "1"
      });
    });
  });

  root.querySelectorAll("[data-delete-admin]").forEach((button) => {
    button.addEventListener("click", async () => {
      await store.actions.deleteAdmin(Number(button.dataset.deleteAdmin));
    });
  });

  root.querySelector("#records-filter-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await store.actions.loadRecords({
      alumno_query: String(data.get("alumno_query") || "").trim() || null,
      fecha_inicio: String(data.get("fecha_inicio") || "").trim() || null,
      fecha_fin: String(data.get("fecha_fin") || "").trim() || null
    });
  });

  root.querySelector("[data-clear-records='true']")?.addEventListener("click", async () => {
    const confirmed = window.confirm("Se borrará todo el historial de préstamos y devoluciones. Esta acción no se puede deshacer.");
    if (!confirmed) return;
    await store.actions.clearRecords();
  });

  root.querySelector("[data-export-records='true']")?.addEventListener("click", async () => {
    await store.actions.exportRecordsCsv();
  });

  root.querySelector("#report-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const request = {
      report_type: String(data.get("report_type") || ""),
      alumno_id: data.get("alumno_id") ? Number(data.get("alumno_id")) : null,
      fecha_inicio: String(data.get("fecha_inicio") || "").trim() || null,
      fecha_fin: String(data.get("fecha_fin") || "").trim() || null
    };
    const submitterAction = event.submitter?.dataset.reportAction || "preview";
    if (submitterAction === "preview") {
      await store.actions.openReportPreview(request);
    } else {
      await store.actions.loadReportData(request);
    }
  });

  root.querySelectorAll("[data-close-report-preview]").forEach((button) => {
    button.addEventListener("click", () => {
      store.actions.closeReportPreview();
    });
  });

  root.querySelector("[data-generate-report-from-preview='true']")?.addEventListener("click", async () => {
    await store.actions.generateReportPdf();
  });

  root.querySelector("[data-print-report-preview='true']")?.addEventListener("click", () => {
    if (state.reportData) {
      printReportPreview(state.reportData);
    }
  });

  root.querySelector("[data-open-last-pdf='true']")?.addEventListener("click", async () => {
    await store.actions.openGeneratedPdf();
  });

  attachTableFilters(root);
}
