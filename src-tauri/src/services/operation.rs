use std::path::Path;

use chrono::Local;
use rusqlite::{params, OptionalExtension, Transaction};

use crate::{
    db,
    models::{ActiveLoan, EquipmentItem, LoanRecord, RecordItem, StudentLookup, StudentOperationPayload},
    services::{AppError, AppResult},
};

pub fn find_student_by_code(db_path: &Path, codigo: &str) -> AppResult<StudentLookup> {
    let conn = db::get_connection(db_path)?;
    let mut student = conn
        .query_row(
            "
            SELECT id, codigo, nombre, materia, profesor, grupo, activo
            FROM alumnos
            WHERE codigo = ?1
            ",
            params![codigo.trim()],
            |row| {
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
            },
        )
        .optional()?
        .ok_or(AppError::NotFound)?;

    student.prestamo_activo = conn
        .query_row(
            "
            SELECT p.id, e.id, e.numero, p.fecha_prestamo
            FROM prestamos p
            INNER JOIN equipos e ON e.id = p.equipo_id
            WHERE p.alumno_id = ?1 AND p.estado = 'activo'
            ",
            params![student.id],
            |row| {
                Ok(ActiveLoan {
                    prestamo_id: row.get(0)?,
                    equipo_id: row.get(1)?,
                    equipo_numero: row.get(2)?,
                    fecha_prestamo: row.get(3)?,
                })
            },
        )
        .optional()?;

    Ok(student)
}

pub fn list_available_equipment(db_path: &Path) -> AppResult<Vec<EquipmentItem>> {
    let conn = db::get_connection(db_path)?;
    let mut stmt = conn.prepare(
        "
        SELECT id, numero, tipo, descripcion, estado, activo
        FROM equipos
        WHERE activo = 1 AND estado = 'disponible'
        ORDER BY numero
        ",
    )?;
    let rows = stmt.query_map([], map_equipment)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

pub fn register_student_operation(db_path: &Path, payload: StudentOperationPayload) -> AppResult<LoanRecord> {
    match payload.tipo.trim().to_lowercase().as_str() {
        "prestamo" => register_loan(db_path, payload),
        "devolucion" => register_return(db_path, payload),
        _ => Err(AppError::Validation("Tipo de registro inválido".into())),
    }
}

pub fn get_student_history(db_path: &Path, codigo: &str) -> AppResult<Vec<RecordItem>> {
    let conn = db::get_connection(db_path)?;
    let mut stmt = conn.prepare(
        "
        SELECT h.id, h.fecha, h.tipo_evento, a.id, a.nombre, a.codigo, a.materia, a.profesor, a.grupo, e.numero, h.observaciones
        FROM historial_eventos h
        INNER JOIN prestamos p ON p.id = h.prestamo_id
        INNER JOIN alumnos a ON a.id = p.alumno_id
        INNER JOIN equipos e ON e.id = p.equipo_id
        WHERE a.codigo = ?1
        ORDER BY h.fecha DESC, h.id DESC
        LIMIT 100
        ",
    )?;
    let rows = stmt.query_map(params![codigo.trim()], map_record)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

fn register_loan(db_path: &Path, payload: StudentOperationPayload) -> AppResult<LoanRecord> {
    let equipo_id = payload
        .equipo_id
        .ok_or_else(|| AppError::Validation("Seleccione un equipo".into()))?;
    let mut conn = db::get_connection(db_path)?;
    let tx = conn.transaction()?;
    let alumno = find_student_basic(&tx, &payload.codigo)?.ok_or(AppError::NotFound)?;

    if !alumno.activo {
        return Err(AppError::Validation("El alumno está inactivo".into()));
    }

    let active_loan = tx
        .query_row(
            "SELECT 1 FROM prestamos WHERE alumno_id = ?1 AND estado = 'activo'",
            params![alumno.id],
            |_| Ok(()),
        )
        .optional()?;
    if active_loan.is_some() {
        return Err(AppError::Validation("El alumno ya tiene un préstamo activo".into()));
    }

    let equipo = tx
        .query_row(
            "SELECT numero, estado, activo FROM equipos WHERE id = ?1",
            params![equipo_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, i64>(2)? == 1)),
        )
        .optional()?
        .ok_or_else(|| AppError::Validation("Equipo no encontrado".into()))?;

    if !equipo.2 {
        return Err(AppError::Validation("El equipo está inactivo".into()));
    }
    if equipo.1 != "disponible" {
        return Err(AppError::Validation("No se puede prestar un equipo ocupado".into()));
    }

    let now = now_string();
    tx.execute(
        "INSERT INTO prestamos (alumno_id, equipo_id, fecha_prestamo, estado, updated_at) VALUES (?1, ?2, ?3, 'activo', ?3)",
        params![alumno.id, equipo_id, now],
    )?;
    let prestamo_id = tx.last_insert_rowid();
    tx.execute("UPDATE equipos SET estado = 'prestado', updated_at = ?2 WHERE id = ?1", params![equipo_id, now])?;
    tx.execute(
        "INSERT INTO historial_eventos (tipo_evento, prestamo_id, fecha, observaciones) VALUES ('prestamo', ?1, ?2, ?3)",
        params![prestamo_id, now, normalize_optional(payload.observaciones)],
    )?;
    tx.commit()?;
    get_loan_record(db_path, prestamo_id)
}

fn register_return(db_path: &Path, payload: StudentOperationPayload) -> AppResult<LoanRecord> {
    let mut conn = db::get_connection(db_path)?;
    let tx = conn.transaction()?;
    let alumno = find_student_basic(&tx, &payload.codigo)?.ok_or(AppError::NotFound)?;

    let prestamo = tx
        .query_row(
            "SELECT id, equipo_id FROM prestamos WHERE alumno_id = ?1 AND estado = 'activo' ORDER BY fecha_prestamo DESC LIMIT 1",
            params![alumno.id],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?)),
        )
        .optional()?
        .ok_or_else(|| AppError::Validation("No se puede registrar una devolución inválida".into()))?;

    let now = now_string();
    tx.execute(
        "UPDATE prestamos SET fecha_devolucion = ?2, estado = 'devuelto', updated_at = ?2 WHERE id = ?1",
        params![prestamo.0, now],
    )?;
    tx.execute("UPDATE equipos SET estado = 'disponible', updated_at = ?2 WHERE id = ?1", params![prestamo.1, now])?;
    tx.execute(
        "INSERT INTO historial_eventos (tipo_evento, prestamo_id, fecha, observaciones) VALUES ('devolucion', ?1, ?2, ?3)",
        params![prestamo.0, now, normalize_optional(payload.observaciones)],
    )?;
    tx.commit()?;
    get_loan_record(db_path, prestamo.0)
}

struct BasicStudent {
    id: i64,
    activo: bool,
}

fn find_student_basic(tx: &Transaction<'_>, codigo: &str) -> AppResult<Option<BasicStudent>> {
    Ok(tx
        .query_row(
            "SELECT id, activo FROM alumnos WHERE codigo = ?1",
            params![codigo.trim()],
            |row| {
                Ok(BasicStudent {
                    id: row.get(0)?,
                    activo: row.get::<_, i64>(1)? == 1,
                })
            },
        )
        .optional()?)
}

fn get_loan_record(db_path: &Path, prestamo_id: i64) -> AppResult<LoanRecord> {
    let conn = db::get_connection(db_path)?;
    conn.query_row(
        "
        SELECT p.id, a.id, a.nombre, a.codigo, a.materia, a.profesor, a.grupo, e.id, e.numero, p.fecha_prestamo, p.fecha_devolucion, p.estado
        FROM prestamos p
        INNER JOIN alumnos a ON a.id = p.alumno_id
        INNER JOIN equipos e ON e.id = p.equipo_id
        WHERE p.id = ?1
        ",
        params![prestamo_id],
        map_loan,
    )
    .map_err(AppError::from)
}

fn map_loan(row: &rusqlite::Row<'_>) -> rusqlite::Result<LoanRecord> {
    Ok(LoanRecord {
        prestamo_id: row.get(0)?,
        alumno_id: row.get(1)?,
        alumno_nombre: row.get(2)?,
        codigo: row.get(3)?,
        materia: row.get(4)?,
        profesor: row.get(5)?,
        grupo: row.get(6)?,
        equipo_id: row.get(7)?,
        equipo_numero: row.get(8)?,
        fecha_prestamo: row.get(9)?,
        fecha_devolucion: row.get(10)?,
        estado: row.get(11)?,
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

fn normalize_optional(value: Option<String>) -> Option<String> {
    value.and_then(|item| {
        let trimmed = item.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

fn now_string() -> String {
    Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}
