use std::path::Path;

use rusqlite::Connection;

use crate::services::AppResult;

const SCHEMA_SQL: &str = include_str!("../../../db/schema.sql");

pub fn get_connection(db_path: &Path) -> AppResult<Connection> {
    Ok(Connection::open(db_path)?)
}

pub fn init_database(db_path: &Path) -> AppResult<()> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch(SCHEMA_SQL)?;
    run_migrations(&conn)?;
    Ok(())
}

fn run_migrations(conn: &Connection) -> AppResult<()> {
    add_column_if_missing(conn, "alumnos", "materia", "TEXT NOT NULL DEFAULT ''")?;
    add_column_if_missing(conn, "alumnos", "profesor", "TEXT NOT NULL DEFAULT ''")?;
    add_column_if_missing(conn, "alumnos", "grupo", "TEXT NOT NULL DEFAULT ''")?;
    add_column_if_missing(conn, "equipos", "descripcion", "TEXT NOT NULL DEFAULT ''")?;
    create_admins_table(conn)?;

    conn.execute(
        "
        UPDATE alumnos
        SET grupo = COALESCE(NULLIF(grupo, ''), (
            SELECT g.nombre FROM grupos g WHERE g.id = alumnos.grupo_id
        ), '')
        ",
        [],
    )?;

    conn.execute(
        "
        UPDATE alumnos
        SET materia = COALESCE(NULLIF(materia, ''), (
            SELECT m.nombre
            FROM alumno_materia am
            INNER JOIN materias m ON m.id = am.materia_id
            WHERE am.alumno_id = alumnos.id
            ORDER BY am.id DESC
            LIMIT 1
        ), '')
        ",
        [],
    )?;

    conn.execute(
        "
        UPDATE alumnos
        SET profesor = COALESCE(NULLIF(profesor, ''), (
            SELECT p.nombre
            FROM alumno_materia am
            INNER JOIN profesores p ON p.id = am.profesor_id
            WHERE am.alumno_id = alumnos.id
            ORDER BY am.id DESC
            LIMIT 1
        ), '')
        ",
        [],
    )?;

    conn.execute("UPDATE equipos SET descripcion = COALESCE(NULLIF(descripcion, ''), tipo, '')", [])?;
    conn.execute("UPDATE equipos SET estado = 'disponible' WHERE estado NOT IN ('disponible', 'prestado')", [])?;
    conn.execute(
        "
        INSERT OR IGNORE INTO administradores (id, usuario, nombre, password, activo, created_at, updated_at)
        VALUES (1, 'admin', 'Administrador principal', '1234', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ",
        [],
    )?;
    Ok(())
}

fn add_column_if_missing(conn: &Connection, table: &str, column: &str, definition: &str) -> AppResult<()> {
    let pragma = format!("PRAGMA table_info({table})");
    let mut stmt = conn.prepare(&pragma)?;
    let mut rows = stmt.query_map([], |row| row.get::<_, String>(1))?;
    let mut exists = false;
    while let Some(name) = rows.next() {
      if name? == column {
        exists = true;
        break;
      }
    }

    if !exists {
        let sql = format!("ALTER TABLE {table} ADD COLUMN {column} {definition}");
        conn.execute(&sql, [])?;
    }

    Ok(())
}

fn create_admins_table(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS administradores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT NOT NULL UNIQUE,
            nombre TEXT NOT NULL,
            password TEXT NOT NULL,
            activo INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        ",
    )?;
    Ok(())
}
