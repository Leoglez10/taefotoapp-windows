use std::{
    ffi::OsStr,
    fs,
    path::Path,
    process::Command,
    time::SystemTime,
};

use chrono::{Datelike, Local};
use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    db,
    models::{
        AdminInput, AdminLoginPayload, AdminUser, BackupHistory, BackupItem, DashboardSummary,
        DatabaseImportPayload, EquipmentInput, EquipmentItem, ExcelImportPayload, ExcelImportSummary,
        ExcelWorkbookImport, LoginResult, PdfResult, RecordFilter, RecordItem, ReportData, ReportRequest,
        ReportRow, StudentInput, StudentLookup,
    },
    services::{AppError, AppResult},
};

const EXCEL_READER_PS1: &str = include_str!("../../../scripts/read_excel_strict.ps1");

pub fn admin_login(db_path: &Path, payload: AdminLoginPayload) -> AppResult<LoginResult> {
    let conn = db::get_connection(db_path)?;
    let admin = conn
        .query_row(
            "
            SELECT id, usuario, nombre, activo
            FROM administradores
            WHERE usuario = ?1 AND password = ?2 AND activo = 1
            ",
            params![payload.usuario.trim(), payload.password],
            map_admin,
        )
        .optional()?;

    Ok(LoginResult {
        ok: admin.is_some(),
        admin,
    })
}

pub fn list_admins(db_path: &Path) -> AppResult<Vec<AdminUser>> {
    let conn = db::get_connection(db_path)?;
    let mut stmt = conn.prepare(
        "
        SELECT id, usuario, nombre, activo
        FROM administradores
        ORDER BY activo DESC, nombre ASC, usuario ASC
        ",
    )?;
    let rows = stmt.query_map([], map_admin)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

pub fn create_admin(db_path: &Path, payload: AdminInput) -> AppResult<AdminUser> {
    validate_admin(&payload, true)?;
    let conn = db::get_connection(db_path)?;
    conn.execute(
        "
        INSERT INTO administradores (usuario, nombre, password, activo, updated_at)
        VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
        ",
        params![
            payload.usuario.trim(),
            payload.nombre.trim(),
            payload.password.unwrap_or_default().trim(),
            payload.activo.unwrap_or(true) as i64
        ],
    )?;
    get_admin_by_id(db_path, conn.last_insert_rowid())
}

pub fn update_admin(db_path: &Path, payload: AdminInput) -> AppResult<AdminUser> {
    validate_admin(&payload, false)?;
    let id = payload.id.ok_or_else(|| AppError::Validation("Falta el id del administrador".into()))?;
    let mut conn = db::get_connection(db_path)?;
    let tx = conn.transaction()?;
    let password = payload.password.as_ref().map(|value| value.trim()).unwrap_or("");

    if password.is_empty() {
        tx.execute(
            "
            UPDATE administradores
            SET usuario = ?2, nombre = ?3, activo = ?4, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?1
            ",
            params![id, payload.usuario.trim(), payload.nombre.trim(), payload.activo.unwrap_or(true) as i64],
        )?;
    } else {
        tx.execute(
            "
            UPDATE administradores
            SET usuario = ?2, nombre = ?3, password = ?4, activo = ?5, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?1
            ",
            params![
                id,
                payload.usuario.trim(),
                payload.nombre.trim(),
                password,
                payload.activo.unwrap_or(true) as i64
            ],
        )?;
    }

    ensure_active_admin_exists(&tx)?;
    tx.commit()?;
    get_admin_by_id(db_path, id)
}

pub fn delete_admin(db_path: &Path, admin_id: i64) -> AppResult<()> {
    let mut conn = db::get_connection(db_path)?;
    let tx = conn.transaction()?;
    let is_active = tx
        .query_row(
            "SELECT activo FROM administradores WHERE id = ?1",
            params![admin_id],
            |row| row.get::<_, i64>(0),
        )
        .optional()?
        .ok_or(AppError::NotFound)?;

    tx.execute("DELETE FROM administradores WHERE id = ?1", params![admin_id])?;

    if is_active == 1 {
        ensure_active_admin_exists(&tx)?;
    }

    tx.commit()?;
    Ok(())
}

pub fn get_dashboard_summary(db_path: &Path) -> AppResult<DashboardSummary> {
    let conn = db::get_connection(db_path)?;
    Ok(DashboardSummary {
        alumnos_activos: count_query(&conn, "SELECT COUNT(*) FROM alumnos WHERE activo = 1")?,
        equipos_disponibles: count_query(&conn, "SELECT COUNT(*) FROM equipos WHERE activo = 1 AND estado = 'disponible'")?,
        prestamos_activos: count_query(&conn, "SELECT COUNT(*) FROM prestamos WHERE estado = 'activo'")?,
        registros_totales: count_query(&conn, "SELECT COUNT(*) FROM historial_eventos")?,
    })
}

pub fn list_students(db_path: &Path, query: Option<String>) -> AppResult<Vec<StudentLookup>> {
    let conn = db::get_connection(db_path)?;
    let search = query.unwrap_or_default().trim().to_string();
    let like = format!("%{search}%");
    let mut stmt = conn.prepare(
        "
        SELECT id, codigo, nombre, materia, profesor, grupo, activo
        FROM alumnos
        WHERE (?1 = '' OR codigo LIKE ?2 OR nombre LIKE ?2 OR materia LIKE ?2 OR profesor LIKE ?2 OR grupo LIKE ?2)
        ORDER BY nombre, codigo
        ",
    )?;
    let rows = stmt.query_map(params![search, like], map_student)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

pub fn create_student(db_path: &Path, payload: StudentInput) -> AppResult<StudentLookup> {
    validate_student(&payload)?;
    let mut conn = db::get_connection(db_path)?;
    let tx = conn.transaction()?;
    let (group_id, _) = ensure_group_exists(&tx, payload.grupo.trim())?;
    tx.execute(
        "
        INSERT INTO alumnos (codigo, nombre, materia, profesor, grupo, grupo_id, activo, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP)
        ",
        params![
            payload.codigo.trim(),
            payload.nombre.trim(),
            payload.materia.trim(),
            payload.profesor.trim(),
            payload.grupo.trim(),
            group_id,
            payload.activo.unwrap_or(true) as i64
        ],
    )?;
    let student_id = tx.last_insert_rowid();
    tx.commit()?;
    get_student_by_id(db_path, student_id)
}

pub fn update_student(db_path: &Path, payload: StudentInput) -> AppResult<StudentLookup> {
    validate_student(&payload)?;
    let id = payload.id.ok_or_else(|| AppError::Validation("Falta el id del alumno".into()))?;
    let mut conn = db::get_connection(db_path)?;
    let tx = conn.transaction()?;
    let (group_id, _) = ensure_group_exists(&tx, payload.grupo.trim())?;
    tx.execute(
        "
        UPDATE alumnos
        SET codigo = ?2, nombre = ?3, materia = ?4, profesor = ?5, grupo = ?6, grupo_id = ?7, activo = ?8, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1
        ",
        params![
            id,
            payload.codigo.trim(),
            payload.nombre.trim(),
            payload.materia.trim(),
            payload.profesor.trim(),
            payload.grupo.trim(),
            group_id,
            payload.activo.unwrap_or(true) as i64
        ],
    )?;
    tx.commit()?;
    get_student_by_id(db_path, id)
}

pub fn delete_student(db_path: &Path, student_id: i64) -> AppResult<()> {
    let mut conn = db::get_connection(db_path)?;
    let tx = conn.transaction()?;
    let active = tx
        .query_row(
            "SELECT 1 FROM prestamos WHERE alumno_id = ?1 AND estado = 'activo'",
            params![student_id],
            |_| Ok(()),
        )
        .optional()?;
    if active.is_some() {
        return Err(AppError::Validation("No se puede eliminar un alumno con préstamo activo".into()));
    }
    tx.execute(
        "DELETE FROM historial_eventos WHERE prestamo_id IN (SELECT id FROM prestamos WHERE alumno_id = ?1)",
        params![student_id],
    )?;
    tx.execute("DELETE FROM prestamos WHERE alumno_id = ?1", params![student_id])?;
    tx.execute("DELETE FROM alumnos WHERE id = ?1", params![student_id])?;
    tx.commit()?;
    Ok(())
}

pub fn list_equipment(db_path: &Path, query: Option<String>) -> AppResult<Vec<EquipmentItem>> {
    let conn = db::get_connection(db_path)?;
    let search = query.unwrap_or_default().trim().to_string();
    let like = format!("%{search}%");
    let mut stmt = conn.prepare(
        "
        SELECT id, numero, tipo, descripcion, estado, activo
        FROM equipos
        WHERE (?1 = '' OR numero LIKE ?2 OR descripcion LIKE ?2 OR tipo LIKE ?2)
        ORDER BY numero
        ",
    )?;
    let rows = stmt.query_map(params![search, like], map_equipment)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

pub fn create_equipment(db_path: &Path, payload: EquipmentInput) -> AppResult<EquipmentItem> {
    validate_equipment(&payload)?;
    let conn = db::get_connection(db_path)?;
    conn.execute(
        "
        INSERT INTO equipos (numero, tipo, descripcion, estado, activo, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)
        ",
        params![
            payload.numero.trim(),
            payload.tipo.trim(),
            payload.descripcion.trim(),
            payload.estado.trim(),
            payload.activo.unwrap_or(true) as i64
        ],
    )?;
    get_equipment_by_id(db_path, conn.last_insert_rowid())
}

pub fn update_equipment(db_path: &Path, payload: EquipmentInput) -> AppResult<EquipmentItem> {
    validate_equipment(&payload)?;
    let id = payload.id.ok_or_else(|| AppError::Validation("Falta el id del equipo".into()))?;
    let next_estado = payload.estado.trim();
    let mut conn = db::get_connection(db_path)?;
    let tx = conn.transaction()?;
    let active_loan = tx
        .query_row(
            "SELECT id FROM prestamos WHERE equipo_id = ?1 AND estado = 'activo' ORDER BY fecha_prestamo DESC LIMIT 1",
            params![id],
            |row| row.get::<_, i64>(0),
        )
        .optional()?;

    if let Some(prestamo_id) = active_loan {
        if next_estado == "disponible" {
            let now = now_string();
            tx.execute(
                "
                UPDATE prestamos
                SET fecha_devolucion = ?2, estado = 'devuelto', updated_at = ?2
                WHERE id = ?1
                ",
                params![prestamo_id, now],
            )?;
            tx.execute(
                "INSERT INTO historial_eventos (tipo_evento, prestamo_id, fecha, observaciones) VALUES ('devolucion', ?1, ?2, ?3)",
                params![prestamo_id, now, "Devolucion registrada desde panel admin"],
            )?;
        } else if next_estado != "prestado" {
            return Err(AppError::Validation("El equipo tiene un préstamo activo. Márquelo como disponible para liberarlo.".into()));
        }
    } else {
        if next_estado == "prestado" {
             return Err(AppError::Validation("No se puede marcar como prestado manualmente sin un registro de préstamo.".into()));
        }
    }

    tx.execute(
        "
        UPDATE equipos
        SET numero = ?2, tipo = ?3, descripcion = ?4, estado = ?5, activo = ?6, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1
        ",
        params![
            id,
            payload.numero.trim(),
            payload.tipo.trim(),
            payload.descripcion.trim(),
            next_estado,
            payload.activo.unwrap_or(true) as i64
        ],
    )?;
    tx.commit()?;
    get_equipment_by_id(db_path, id)
}

pub fn delete_equipment(db_path: &Path, equipment_id: i64) -> AppResult<()> {
    let mut conn = db::get_connection(db_path)?;
    let tx = conn.transaction()?;
    let active = tx
        .query_row(
            "SELECT 1 FROM prestamos WHERE equipo_id = ?1 AND estado = 'activo'",
            params![equipment_id],
            |_| Ok(()),
        )
        .optional()?;
    if active.is_some() {
        return Err(AppError::Validation("No se puede eliminar un equipo con préstamo activo".into()));
    }
    tx.execute(
        "DELETE FROM historial_eventos WHERE prestamo_id IN (SELECT id FROM prestamos WHERE equipo_id = ?1)",
        params![equipment_id],
    )?;
    tx.execute("DELETE FROM prestamos WHERE equipo_id = ?1", params![equipment_id])?;
    tx.execute("DELETE FROM equipos WHERE id = ?1", params![equipment_id])?;
    tx.commit()?;
    Ok(())
}

pub fn list_records(db_path: &Path, filters: RecordFilter) -> AppResult<Vec<RecordItem>> {
    let conn = db::get_connection(db_path)?;
    let student_query = filters.alumno_query.unwrap_or_default().trim().to_string();
    let student_like = format!("%{student_query}%");
    let mut stmt = conn.prepare(
        "
        SELECT h.id, h.fecha, h.tipo_evento, a.id, a.nombre, a.codigo, a.materia, a.profesor, a.grupo, e.numero, h.observaciones
        FROM historial_eventos h
        INNER JOIN prestamos p ON p.id = h.prestamo_id
        INNER JOIN alumnos a ON a.id = p.alumno_id
        INNER JOIN equipos e ON e.id = p.equipo_id
        WHERE (?1 IS NULL OR a.id = ?1)
          AND (?2 = '' OR a.codigo LIKE ?3 OR a.nombre LIKE ?3)
          AND (?4 IS NULL OR date(h.fecha) >= date(?4))
          AND (?5 IS NULL OR date(h.fecha) <= date(?5))
        ORDER BY h.fecha DESC, h.id DESC
        LIMIT 1000
        ",
    )?;
    let rows = stmt.query_map(
        params![filters.alumno_id, student_query, student_like, filters.fecha_inicio, filters.fecha_fin],
        map_record,
    )?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

pub fn clear_records(db_path: &Path) -> AppResult<()> {
    let conn = db::get_connection(db_path)?;
    conn.execute("DELETE FROM historial_eventos", [])?;
    let _ = conn.execute("DELETE FROM sqlite_sequence WHERE name = 'historial_eventos'", []);
    Ok(())
}

pub fn export_records_csv(db_path: &Path, app_data_dir: &Path, filters: RecordFilter) -> AppResult<PdfResult> {
    let records = list_records(db_path, filters)?;
    let reports_dir = app_data_dir.join("reports");
    fs::create_dir_all(&reports_dir)?;
    let timestamp = Local::now().format("%Y%m%d-%H%M%S").to_string();
    let csv_path = reports_dir.join(format!("historial-registros-{timestamp}.csv"));

    let mut csv = String::from("\u{feff}Fecha,Tipo,Codigo,Nombre,Materia,Profesor,Grupo,Equipo,Observaciones\r\n");
    for record in records {
        let observaciones = record.observaciones.unwrap_or_default();
        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{},{}\r\n",
            csv_escape(&record.fecha),
            csv_escape(&record.tipo),
            csv_escape(&record.codigo),
            csv_escape(&record.alumno_nombre),
            csv_escape(&record.materia),
            csv_escape(&record.profesor),
            csv_escape(&record.grupo),
            csv_escape(&record.equipo_numero),
            csv_escape(&observaciones),
        ));
    }

    fs::write(&csv_path, csv)?;
    Ok(PdfResult {
        path: csv_path.to_string_lossy().to_string(),
    })
}

pub fn backup_database(db_path: &Path, app_data_dir: &Path) -> AppResult<PdfResult> {
    let backups_dir = app_data_dir.join("backups");
    fs::create_dir_all(&backups_dir)?;
    let timestamp = Local::now().format("%Y%m%d-%H%M%S").to_string();
    let backup_path = backups_dir.join(format!("prestamos-backup-{timestamp}.sqlite"));
    fs::copy(db_path, &backup_path)?;
    Ok(PdfResult {
        path: backup_path.to_string_lossy().to_string(),
    })
}

pub fn list_backups(app_data_dir: &Path) -> AppResult<BackupHistory> {
    let backups_dir = app_data_dir.join("backups");
    fs::create_dir_all(&backups_dir)?;
    let mut items = fs::read_dir(&backups_dir)?
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| {
            let path = entry.path();
            let metadata = entry.metadata().ok()?;
            if !metadata.is_file() {
                return None;
            }

            let file_name = path.file_name()?.to_string_lossy().to_string();
            let modified = metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH);
            let modified_at = chrono::DateTime::<Local>::from(modified)
                .format("%Y-%m-%d %H:%M:%S")
                .to_string();

            Some(BackupItem {
                file_name,
                path: path.to_string_lossy().to_string(),
                size_bytes: metadata.len(),
                modified_at,
            })
        })
        .collect::<Vec<_>>();

    items.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));

    Ok(BackupHistory {
        directory: backups_dir.to_string_lossy().to_string(),
        items,
    })
}

pub fn restore_database(db_path: &Path, app_data_dir: &Path, payload: DatabaseImportPayload) -> AppResult<PdfResult> {
    validate_database_import(&payload)?;

    let tmp_dir = app_data_dir.join("tmp");
    fs::create_dir_all(&tmp_dir)?;
    let tmp_restore_path = tmp_dir.join(format!("restore-{}.sqlite", Local::now().timestamp_millis()));
    fs::write(&tmp_restore_path, &payload.bytes)?;
    validate_database_file(&tmp_restore_path)?;

    let backup = backup_database(db_path, app_data_dir)?;
    fs::copy(&tmp_restore_path, db_path)?;
    let _ = fs::remove_file(&tmp_restore_path);
    db::init_database(db_path)?;

    Ok(backup)
}

pub fn import_excel_data(db_path: &Path, app_data_dir: &Path, payload: ExcelImportPayload) -> AppResult<ExcelImportSummary> {
    let temp_dir = app_data_dir.join("tmp");
    fs::create_dir_all(&temp_dir)?;
    let extension = Path::new(payload.file_name.as_str())
        .extension()
        .and_then(OsStr::to_str)
        .unwrap_or("xlsx");
    let workbook_path = temp_dir.join(format!("import-{}.{}", Local::now().timestamp_millis(), extension));
    let script_path = temp_dir.join("read_excel_strict.ps1");

    fs::write(&workbook_path, payload.bytes)?;
    fs::write(&script_path, EXCEL_READER_PS1)?;

    let output = Command::new("powershell")
        .arg("-NoProfile")
        .arg("-ExecutionPolicy")
        .arg("Bypass")
        .arg("-File")
        .arg(&script_path)
        .arg("-ExcelPath")
        .arg(&workbook_path)
        .output()?;

    let _ = fs::remove_file(&workbook_path);
    let _ = fs::remove_file(&script_path);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let message = if !stderr.is_empty() { stderr } else { stdout };
        return Err(AppError::Validation(if message.is_empty() {
            "El archivo Excel no tiene el formato correcto. Verifique los nombres de las columnas.".into()
        } else {
            message
        }));
    }

    let workbook: ExcelWorkbookImport = serde_json::from_slice(&output.stdout)?;
    let mut conn = db::get_connection(db_path)?;
    let tx = conn.transaction()?;
    let mut student_inserted = 0_i64;
    let mut student_updated = 0_i64;
    let mut student_skipped = 0_i64;
    let mut group_inserted = 0_i64;
    let mut group_updated = 0_i64;
    let mut group_skipped = 0_i64;

    for row in workbook.groups {
        let grupo = row.grupo.trim();
        let turno = row.turno.trim().to_uppercase();
        let ciclo_escolar = row.ciclo_escolar.trim();

        if grupo.is_empty() || turno.is_empty() || ciclo_escolar.is_empty() {
            group_skipped += 1;
            continue;
        }

        if !matches!(turno.as_str(), "MAT" | "VES") {
            return Err(AppError::Validation(format!(
                "Turno invalido para el grupo '{}'. Use MAT o VES.",
                grupo
            )));
        }

        let existing = tx
            .query_row(
                "SELECT id FROM grupos WHERE nombre = ?1 AND turno = ?2 AND ciclo_escolar = ?3",
                params![grupo, turno, ciclo_escolar],
                |db_row| db_row.get::<_, i64>(0),
            )
            .optional()?;

        if let Some(id) = existing {
            tx.execute(
                "
                UPDATE grupos
                SET nombre = ?2, turno = ?3, ciclo_escolar = ?4, activo = 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?1
                ",
                params![id, grupo, turno, ciclo_escolar],
            )?;
            group_updated += 1;
        } else {
            tx.execute(
                "
                INSERT INTO grupos (nombre, turno, ciclo_escolar, activo, updated_at)
                VALUES (?1, ?2, ?3, 1, CURRENT_TIMESTAMP)
                ",
                params![grupo, turno, ciclo_escolar],
            )?;
            group_inserted += 1;
        }
    }

    for row in workbook.students {
        let codigo = row.codigo.trim();
        let nombre = row.nombre.trim();
        let materia = row.materia.trim();
        let profesor = row.profesor.trim();
        let grupo = row.grupo.trim();

        if codigo.is_empty() || nombre.is_empty() {
            student_skipped += 1;
            continue;
        }

        let group_id = if grupo.is_empty() {
            None
        } else {
            let (group_id, created) = ensure_group_exists(&tx, grupo)?;
            if created {
                group_inserted += 1;
            }
            Some(group_id)
        };

        let existing = tx
            .query_row(
                "SELECT id FROM alumnos WHERE codigo = ?1",
                params![codigo],
                |db_row| db_row.get::<_, i64>(0),
            )
            .optional()?;

        if let Some(id) = existing {
            tx.execute(
                "
                UPDATE alumnos
                SET nombre = ?2, materia = ?3, profesor = ?4, grupo = ?5, grupo_id = ?6, activo = 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?1
                ",
                params![id, nombre, materia, profesor, grupo, group_id],
            )?;
            student_updated += 1;
        } else {
            tx.execute(
                "
                INSERT INTO alumnos (codigo, nombre, materia, profesor, grupo, grupo_id, activo, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, CURRENT_TIMESTAMP)
                ",
                params![codigo, nombre, materia, profesor, grupo, group_id],
            )?;
            student_inserted += 1;
        }
    }

    tx.commit()?;

    Ok(ExcelImportSummary {
        archivo: payload.file_name,
        formato: workbook.format,
        alumnos_insertados: student_inserted,
        alumnos_actualizados: student_updated,
        alumnos_omitidos: student_skipped,
        grupos_insertados: group_inserted,
        grupos_actualizados: group_updated,
        grupos_omitidos: group_skipped,
        hojas_validadas: workbook.validated_sheets,
    })
}

fn ensure_group_exists(
    tx: &rusqlite::Transaction<'_>,
    grupo: &str,
 ) -> AppResult<(i64, bool)> {
    let existing = tx
        .query_row(
            "SELECT id FROM grupos WHERE nombre = ?1 ORDER BY activo DESC, updated_at DESC, id DESC LIMIT 1",
            params![grupo],
            |db_row| db_row.get::<_, i64>(0),
        )
        .optional()?;

    if let Some(id) = existing {
        return Ok((id, false));
    }

    let turno = infer_group_turno(grupo);
    let ciclo_escolar = current_school_cycle();

    tx.execute(
        "
        INSERT INTO grupos (nombre, turno, ciclo_escolar, activo, updated_at)
        VALUES (?1, ?2, ?3, 1, CURRENT_TIMESTAMP)
        ",
        params![grupo, turno, ciclo_escolar],
    )?;

    Ok((tx.last_insert_rowid(), true))
}

fn infer_group_turno(grupo: &str) -> &'static str {
    let uppercase = grupo.trim().to_uppercase();
    if uppercase.ends_with('V') {
        "VES"
    } else {
        "MAT"
    }
}

fn current_school_cycle() -> String {
    let now = Local::now();
    let year = now.year();
    let month = now.month();
    if month >= 7 {
        format!("{}-{}", year, year + 1)
    } else {
        format!("{}-{}", year - 1, year)
    }
}

pub fn get_report_data(db_path: &Path, request: ReportRequest) -> AppResult<ReportData> {
    let conn = db::get_connection(db_path)?;
    let generated_at = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let rows = match request.report_type.as_str() {
        "prestamos_por_alumno" => report_loans_by_student(&conn, &request)?,
        "prestamos_por_fecha" => report_loans_by_date(&conn, &request)?,
        "equipos_mas_usados" => report_most_used_equipment(&conn, &request)?,
        _ => return Err(AppError::Validation("Tipo de reporte inválido".into())),
    };

    let title = match request.report_type.as_str() {
        "prestamos_por_alumno" => "Préstamos por alumno",
        "prestamos_por_fecha" => "Préstamos por fecha",
        _ => "Equipos más usados",
    };

    Ok(ReportData {
        titulo: title.into(),
        generado_en: generated_at,
        filas: rows,
    })
}

pub fn generate_report_pdf(db_path: &Path, app_data_dir: &Path, request: ReportRequest) -> AppResult<PdfResult> {
    let report = get_report_data(db_path, request)?;
    let reports_dir = app_data_dir.join("reports");
    fs::create_dir_all(&reports_dir)?;
    let timestamp = Local::now().format("%Y%m%d-%H%M%S").to_string();
    let html_path = reports_dir.join(format!("report-{timestamp}.html"));
    let pdf_path = reports_dir.join(format!("report-{timestamp}.pdf"));
    fs::write(&html_path, render_report_html(&report))?;

    let output = Command::new(r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe")
        .arg("--encoding")
        .arg("utf-8")
        .arg(&html_path)
        .arg(&pdf_path)
        .output()?;

    let _ = fs::remove_file(&html_path);

    if !output.status.success() {
        return Err(AppError::Process(String::from_utf8_lossy(&output.stderr).trim().to_string()));
    }

    Ok(PdfResult {
        path: pdf_path.to_string_lossy().to_string(),
    })
}

pub fn open_file_path(path: &str) -> AppResult<()> {
    let status = Command::new("explorer.exe").arg(path).status()?;
    if !status.success() {
        return Err(AppError::Process("No se pudo abrir el archivo generado".into()));
    }
    Ok(())
}

fn count_query(conn: &Connection, sql: &str) -> AppResult<i64> {
    conn.query_row(sql, [], |row| row.get(0)).map_err(AppError::from)
}

fn get_student_by_id(db_path: &Path, id: i64) -> AppResult<StudentLookup> {
    let conn = db::get_connection(db_path)?;
    conn.query_row(
        "SELECT id, codigo, nombre, materia, profesor, grupo, activo FROM alumnos WHERE id = ?1",
        params![id],
        map_student,
    )
    .map_err(AppError::from)
}

fn get_equipment_by_id(db_path: &Path, id: i64) -> AppResult<EquipmentItem> {
    let conn = db::get_connection(db_path)?;
    conn.query_row(
        "SELECT id, numero, tipo, descripcion, estado, activo FROM equipos WHERE id = ?1",
        params![id],
        map_equipment,
    )
    .map_err(AppError::from)
}

fn get_admin_by_id(db_path: &Path, id: i64) -> AppResult<AdminUser> {
    let conn = db::get_connection(db_path)?;
    conn.query_row(
        "SELECT id, usuario, nombre, activo FROM administradores WHERE id = ?1",
        params![id],
        map_admin,
    )
    .map_err(AppError::from)
}

fn map_student(row: &rusqlite::Row<'_>) -> rusqlite::Result<StudentLookup> {
    Ok(StudentLookup {
        id: row.get(0)?,
        codigo: row.get(1)?,
        nombre: row.get(2)?,
        materia: row.get(3)?,
        profesor: row.get(4)?,
        grupo: row.get(5)?,
        activo: row.get::<_, i64>(6)? == 1,
        prestamo_activo: None,
    })
}

fn map_equipment(row: &rusqlite::Row<'_>) -> rusqlite::Result<EquipmentItem> {
    Ok(EquipmentItem {
        id: row.get(0)?,
        numero: row.get(1)?,
        tipo: row.get(2)?,
        descripcion: row.get(3)?,
        estado: row.get(4)?,
        activo: row.get::<_, i64>(5)? == 1,
    })
}

fn map_record(row: &rusqlite::Row<'_>) -> rusqlite::Result<RecordItem> {
    Ok(RecordItem {
        id: row.get(0)?,
        fecha: row.get(1)?,
        tipo: row.get(2)?,
        alumno_id: row.get(3)?,
        alumno_nombre: row.get(4)?,
        codigo: row.get(5)?,
        materia: row.get(6)?,
        profesor: row.get(7)?,
        grupo: row.get(8)?,
        equipo_numero: row.get(9)?,
        observaciones: row.get(10)?,
    })
}

fn map_admin(row: &rusqlite::Row<'_>) -> rusqlite::Result<AdminUser> {
    Ok(AdminUser {
        id: row.get(0)?,
        usuario: row.get(1)?,
        nombre: row.get(2)?,
        activo: row.get::<_, i64>(3)? == 1,
    })
}

fn validate_student(payload: &StudentInput) -> AppResult<()> {
    if payload.codigo.trim().is_empty()
        || payload.nombre.trim().is_empty()
        || payload.materia.trim().is_empty()
        || payload.profesor.trim().is_empty()
        || payload.grupo.trim().is_empty()
    {
        return Err(AppError::Validation("Complete código, nombre, materia, profesor y grupo".into()));
    }
    Ok(())
}

fn validate_equipment(payload: &EquipmentInput) -> AppResult<()> {
    if payload.numero.trim().is_empty() || payload.descripcion.trim().is_empty() {
        return Err(AppError::Validation("Complete número y descripción del equipo".into()));
    }
    if !matches!(payload.estado.trim(), "disponible" | "prestado") {
        return Err(AppError::Validation("Estado de equipo inválido".into()));
    }
    Ok(())
}

fn validate_admin(payload: &AdminInput, require_password: bool) -> AppResult<()> {
    if payload.usuario.trim().is_empty() || payload.nombre.trim().is_empty() {
        return Err(AppError::Validation("Complete usuario y nombre del administrador".into()));
    }

    if require_password && payload.password.as_ref().map(|value| value.trim().is_empty()).unwrap_or(true) {
        return Err(AppError::Validation("Capture una contraseña para el administrador".into()));
    }

    Ok(())
}

fn validate_database_import(payload: &DatabaseImportPayload) -> AppResult<()> {
    let lower = payload.file_name.trim().to_lowercase();
    if !(lower.ends_with(".sqlite") || lower.ends_with(".db")) {
        return Err(AppError::Validation("Seleccione un archivo .sqlite o .db".into()));
    }
    if payload.bytes.is_empty() {
        return Err(AppError::Validation("El archivo de base de datos está vacío".into()));
    }
    Ok(())
}

fn validate_database_file(path: &Path) -> AppResult<()> {
    let conn = Connection::open(path)?;
    let required_tables = ["alumnos", "equipos", "prestamos", "historial_eventos"];
    for table in required_tables {
        let exists = conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
            params![table],
            |row| row.get::<_, i64>(0),
        )?;
        if exists == 0 {
            return Err(AppError::Validation(format!(
                "La base importada no es válida. Falta la tabla requerida: {table}"
            )));
        }
    }
    Ok(())
}

fn ensure_active_admin_exists(tx: &rusqlite::Transaction<'_>) -> AppResult<()> {
    let active_admins = tx
        .query_row("SELECT COUNT(*) FROM administradores WHERE activo = 1", [], |row| row.get::<_, i64>(0))
        .map_err(AppError::from)?;
    if active_admins == 0 {
        return Err(AppError::Validation("Debe existir al menos un administrador activo".into()));
    }
    Ok(())
}

fn now_string() -> String {
    Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

fn csv_escape(value: &str) -> String {
    let escaped = value.replace('"', "\"\"");
    format!("\"{escaped}\"")
}

fn report_loans_by_student(conn: &Connection, request: &ReportRequest) -> AppResult<Vec<ReportRow>> {
    let mut stmt = conn.prepare(
        "
        SELECT a.nombre, COUNT(*), printf('Código: %s · Grupo: %s', a.codigo, a.grupo)
        FROM historial_eventos h
        INNER JOIN prestamos p ON p.id = h.prestamo_id
        INNER JOIN alumnos a ON a.id = p.alumno_id
        WHERE h.tipo_evento = 'prestamo'
          AND (?1 IS NULL OR a.id = ?1)
          AND (?2 IS NULL OR date(h.fecha) >= date(?2))
          AND (?3 IS NULL OR date(h.fecha) <= date(?3))
        GROUP BY a.id, a.nombre, a.codigo, a.grupo
        ORDER BY COUNT(*) DESC, a.nombre ASC
        ",
    )?;
    let rows = stmt.query_map(params![request.alumno_id, request.fecha_inicio, request.fecha_fin], |row| {
        Ok(ReportRow {
            etiqueta: row.get(0)?,
            valor: row.get(1)?,
            detalle: row.get(2)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

fn report_loans_by_date(conn: &Connection, request: &ReportRequest) -> AppResult<Vec<ReportRow>> {
    let mut stmt = conn.prepare(
        "
        SELECT date(h.fecha), COUNT(*), 'Préstamos registrados'
        FROM historial_eventos h
        INNER JOIN prestamos p ON p.id = h.prestamo_id
        WHERE h.tipo_evento = 'prestamo'
          AND (?1 IS NULL OR p.alumno_id = ?1)
          AND (?2 IS NULL OR date(h.fecha) >= date(?2))
          AND (?3 IS NULL OR date(h.fecha) <= date(?3))
        GROUP BY date(h.fecha)
        ORDER BY date(h.fecha) DESC
        ",
    )?;
    let rows = stmt.query_map(params![request.alumno_id, request.fecha_inicio, request.fecha_fin], |row| {
        Ok(ReportRow {
            etiqueta: row.get(0)?,
            valor: row.get(1)?,
            detalle: row.get(2)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

fn report_most_used_equipment(conn: &Connection, request: &ReportRequest) -> AppResult<Vec<ReportRow>> {
    let mut stmt = conn.prepare(
        "
        SELECT e.numero, COUNT(*), e.descripcion
        FROM historial_eventos h
        INNER JOIN prestamos p ON p.id = h.prestamo_id
        INNER JOIN equipos e ON e.id = p.equipo_id
        WHERE h.tipo_evento = 'prestamo'
          AND (?1 IS NULL OR p.alumno_id = ?1)
          AND (?2 IS NULL OR date(h.fecha) >= date(?2))
          AND (?3 IS NULL OR date(h.fecha) <= date(?3))
        GROUP BY e.id, e.numero, e.descripcion
        ORDER BY COUNT(*) DESC, e.numero ASC
        ",
    )?;
    let rows = stmt.query_map(params![request.alumno_id, request.fecha_inicio, request.fecha_fin], |row| {
        Ok(ReportRow {
            etiqueta: row.get(0)?,
            valor: row.get(1)?,
            detalle: row.get(2)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

fn render_report_html(report: &ReportData) -> String {
    let rows = report
        .filas
        .iter()
        .map(|row| {
            format!(
                "<tr><td>{}</td><td>{}</td><td>{}</td></tr>",
                escape_html(&row.etiqueta),
                row.valor,
                escape_html(&row.detalle)
            )
        })
        .collect::<Vec<_>>()
        .join("");

    format!(
        r#"<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>{}</title>
  <style>
    body {{ font-family: Arial, sans-serif; color: #163b73; padding: 24px; }}
    h1 {{ margin-bottom: 4px; }}
    p {{ color: #4d6b99; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 24px; }}
    th, td {{ border: 1px solid #cfe0fb; padding: 10px 12px; text-align: left; }}
    th {{ background: #1f5fbf; color: #fff; }}
    tr:nth-child(even) {{ background: #f5f9ff; }}
  </style>
</head>
<body>
  <h1>{}</h1>
  <p>Generado: {}</p>
  <table>
    <thead>
      <tr><th>Concepto</th><th>Total</th><th>Detalle</th></tr>
    </thead>
    <tbody>{}</tbody>
  </table>
</body>
</html>"#,
        escape_html(&report.titulo),
        escape_html(&report.titulo),
        escape_html(&report.generado_en),
        rows
    )
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}
