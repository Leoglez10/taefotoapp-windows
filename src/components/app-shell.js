import { renderOperationView } from "../views/operation-view.js";
import { renderAdminView } from "../views/admin-view.js";

function getAdminFocusSnapshot(root) {
  const active = document.activeElement;
  if (!active || !root.contains(active)) {
    return { scrollY: window.scrollY };
  }

  const snapshot = { scrollY: window.scrollY, focus: null };

  if (active.id) {
    snapshot.focus = { type: "id", id: active.id };
  } else if (active.name) {
    snapshot.focus = { type: "name", name: active.name };
  } else if (active.dataset.field) {
    const row = active.closest("tr");
    const studentButton = row?.querySelector("[data-save-student]");
    const equipmentButton = row?.querySelector("[data-save-equipment]");
    const adminButton = row?.querySelector("[data-save-admin]");

    if (studentButton) {
      snapshot.focus = { type: "student-row", id: studentButton.dataset.saveStudent, field: active.dataset.field };
    } else if (equipmentButton) {
      snapshot.focus = { type: "equipment-row", id: equipmentButton.dataset.saveEquipment, field: active.dataset.field };
    } else if (adminButton) {
      snapshot.focus = { type: "admin-row", id: adminButton.dataset.saveAdmin, field: active.dataset.field };
    }
  }

  if (snapshot.focus && typeof active.selectionStart === "number" && typeof active.selectionEnd === "number") {
    snapshot.focus.selectionStart = active.selectionStart;
    snapshot.focus.selectionEnd = active.selectionEnd;
  }

  return snapshot;
}

function restoreAdminFocus(root, snapshot) {
  if (!snapshot?.focus) return;

  let target = null;
  const focus = snapshot.focus;
  if (focus.type === "id") {
    target = root.querySelector(`#${focus.id}`);
  } else if (focus.type === "name") {
    target = root.querySelector(`[name="${focus.name}"]`);
  } else if (focus.type === "student-row") {
    target = root.querySelector(`[data-save-student="${focus.id}"]`)?.closest("tr")?.querySelector(`[data-field="${focus.field}"]`);
  } else if (focus.type === "equipment-row") {
    target = root.querySelector(`[data-save-equipment="${focus.id}"]`)?.closest("tr")?.querySelector(`[data-field="${focus.field}"]`);
  } else if (focus.type === "admin-row") {
    target = root.querySelector(`[data-save-admin="${focus.id}"]`)?.closest("tr")?.querySelector(`[data-field="${focus.field}"]`);
  }

  if (!target) return;
  target.focus();
  if (typeof target.setSelectionRange === "function" && typeof focus.selectionStart === "number" && typeof focus.selectionEnd === "number") {
    target.setSelectionRange(focus.selectionStart, focus.selectionEnd);
  }
}

export function createAppShell(root, store) {
  let initialized = false;

  const draw = () => {
    const state = store.getState();
    const adminUiSnapshot = state.role === "admin" ? getAdminFocusSnapshot(root) : null;

    root.innerHTML = `
      <div class="app-shell">
        <div class="ambient-orb orb-a"></div>
        <div class="ambient-orb orb-b"></div>
        <div class="ambient-grid"></div>
        <header class="topbar">
          <div class="brand-lockup">
            <div class="logo-placeholder">
              <img src="./logo-p15.png" alt="Logo Preparatoria Quince" class="brand-logo" />
            </div>
            <div>
              <div class="brand-kicker">TAE Foto App</div>
              <h1>Control de Préstamos</h1>
              <p>Operación rápida para estudio, laboratorio y resguardo de equipo.</p>
            </div>
          </div>
          ${
            state.role
              ? `<button class="ghost-btn" type="button" data-action="go-home">Inicio</button>`
              : ""
          }
        </header>
        <main class="content"></main>
      </div>
    `;

    const content = root.querySelector(".content");
    if (!state.role) {
      content.innerHTML = `
        <section class="role-select">
          <div class="welcome-card compact-home">
            <div class="welcome-kicker">Sistema de control</div>
            <h2>Seleccione modo de acceso</h2>
          </div>
          <div class="role-grid">
            <button class="role-card student-role" data-role="student" type="button">
              <span class="role-eyebrow">Atención rápida</span>
              <strong>ESTUDIANTE</strong>
              <small>Captura código, registra préstamo o devolución y sigue con el siguiente.</small>
            </button>
            <button class="role-card admin-role" data-role="admin" type="button">
              <span class="role-eyebrow">Panel de control</span>
              <strong>ADMINISTRADOR</strong>
              <small>Gestiona Excel, alumnos, equipos, administradores, registros y reportes.</small>
            </button>
          </div>
        </section>
      `;

      content.querySelectorAll("[data-role]").forEach((button) => {
        button.addEventListener("click", () => store.actions.setRole(button.dataset.role));
      });
    } else if (state.role === "student") {
      renderOperationView(content, store);
    } else {
      renderAdminView(content, store);
      requestAnimationFrame(() => {
        window.scrollTo({ top: adminUiSnapshot?.scrollY || 0, behavior: "auto" });
        restoreAdminFocus(root, adminUiSnapshot);
      });
    }

    root.querySelector("[data-action='go-home']")?.addEventListener("click", () => {
      store.actions.setRole(null);
    });
  };

  store.actions.subscribe(draw);
  if (!initialized) {
    initialized = true;
    store.actions.bootstrap();
  }
}
