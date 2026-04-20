use rusqlite::Connection;

fn main() {
    let db_path = std::env::args().nth(1).expect("db path required");
    let conn = Connection::open(db_path).expect("open db");

    let total_students: i64 = conn
        .query_row("SELECT COUNT(*) FROM alumnos", [], |row| row.get(0))
        .expect("count alumnos");
    let active_students: i64 = conn
        .query_row("SELECT COUNT(*) FROM alumnos WHERE activo = 1", [], |row| row.get(0))
        .expect("count active alumnos");
    let total_equipment: i64 = conn
        .query_row("SELECT COUNT(*) FROM equipos", [], |row| row.get(0))
        .expect("count equipos");
    let available_equipment: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM equipos WHERE activo = 1 AND estado = 'disponible'",
            [],
            |row| row.get(0),
        )
        .expect("count available");
    let active_loans: i64 = conn
        .query_row("SELECT COUNT(*) FROM prestamos WHERE estado = 'activo'", [], |row| row.get(0))
        .expect("count prestamos");

    println!("total_students={total_students}");
    println!("active_students={active_students}");
    println!("total_equipment={total_equipment}");
    println!("available_equipment={available_equipment}");
    println!("active_loans={active_loans}");

    let mut student_stmt = conn
        .prepare("SELECT id, codigo, nombre, materia, profesor, grupo, activo FROM alumnos ORDER BY nombre, codigo LIMIT 20")
        .expect("prepare alumnos");
    let student_rows = student_stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, i64>(6)?,
            ))
        })
        .expect("query alumnos");

    for row in student_rows {
        let (id, codigo, nombre, materia, profesor, grupo, activo) = row.expect("student row");
        println!(
            "alumno id={id} codigo={codigo} nombre={nombre} materia={materia} profesor={profesor} grupo={grupo} activo={activo}"
        );
    }

    let mut stmt = conn
        .prepare("SELECT id, numero, descripcion, estado, activo FROM equipos ORDER BY id LIMIT 20")
        .expect("prepare equipos");
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i64>(4)?,
            ))
        })
        .expect("query equipos");

    for row in rows {
        let (id, numero, descripcion, estado, activo) = row.expect("row");
        println!("equipo id={id} numero={numero} descripcion={descripcion} estado={estado} activo={activo}");
    }

    let mut loan_stmt = conn
        .prepare(
            "SELECT p.id, a.codigo, e.numero, p.estado, p.fecha_prestamo, COALESCE(p.fecha_devolucion, '') \
             FROM prestamos p \
             INNER JOIN alumnos a ON a.id = p.alumno_id \
             INNER JOIN equipos e ON e.id = p.equipo_id \
             ORDER BY p.id DESC LIMIT 20",
        )
        .expect("prepare prestamos");
    let loan_rows = loan_stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
            ))
        })
        .expect("query prestamos");

    for row in loan_rows {
        let (id, codigo, numero, estado, fecha_prestamo, fecha_devolucion) = row.expect("loan row");
        println!(
            "prestamo id={id} codigo={codigo} equipo={numero} estado={estado} fecha_prestamo={fecha_prestamo} fecha_devolucion={fecha_devolucion}"
        );
    }
}
