PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS grupos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    turno TEXT NOT NULL CHECK (turno IN ('MAT', 'VES')),
    activo INTEGER NOT NULL DEFAULT 1,
    ciclo_escolar TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nombre, turno, ciclo_escolar)
);

CREATE TABLE IF NOT EXISTS alumnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    grupo_id INTEGER,
    materia TEXT NOT NULL DEFAULT '',
    profesor TEXT NOT NULL DEFAULT '',
    grupo TEXT NOT NULL DEFAULT '',
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id)
);

CREATE TABLE IF NOT EXISTS materias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profesores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alumno_materia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alumno_id INTEGER NOT NULL,
    materia_id INTEGER NOT NULL,
    profesor_id INTEGER,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id),
    FOREIGN KEY (materia_id) REFERENCES materias(id),
    FOREIGN KEY (profesor_id) REFERENCES profesores(id),
    UNIQUE(alumno_id, materia_id, profesor_id)
);

CREATE TABLE IF NOT EXISTS equipos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL DEFAULT 'Equipo',
    descripcion TEXT NOT NULL DEFAULT '',
    estado TEXT NOT NULL CHECK (estado IN ('disponible', 'prestado')),
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prestamos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alumno_id INTEGER NOT NULL,
    equipo_id INTEGER NOT NULL,
    fecha_prestamo TEXT NOT NULL,
    fecha_devolucion TEXT,
    estado TEXT NOT NULL CHECK (estado IN ('activo', 'devuelto', 'retrasado')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id),
    FOREIGN KEY (equipo_id) REFERENCES equipos(id)
);

CREATE TABLE IF NOT EXISTS historial_eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('prestamo', 'devolucion')),
    prestamo_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    observaciones TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prestamo_id) REFERENCES prestamos(id)
);

CREATE TABLE IF NOT EXISTS administradores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    password TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prestamos_alumno_activo
ON prestamos(alumno_id)
WHERE estado = 'activo';

CREATE UNIQUE INDEX IF NOT EXISTS idx_prestamos_equipo_activo
ON prestamos(equipo_id)
WHERE estado = 'activo';

CREATE INDEX IF NOT EXISTS idx_alumnos_grupo_id ON alumnos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON prestamos(estado);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_eventos(fecha);
CREATE INDEX IF NOT EXISTS idx_grupos_ciclo ON grupos(ciclo_escolar, activo);
CREATE INDEX IF NOT EXISTS idx_alumnos_codigo_nombre ON alumnos(codigo, nombre);

INSERT OR IGNORE INTO grupos (id, nombre, turno, activo, ciclo_escolar)
VALUES
    (1, '5A', 'MAT', 1, '2025-2026'),
    (2, '5B', 'VES', 1, '2025-2026');

INSERT OR IGNORE INTO alumnos (id, codigo, nombre, grupo_id, activo)
VALUES
    (1, 'A001', 'Ana Torres', 1, 1),
    (2, 'A002', 'Luis Ramirez', 2, 1);

INSERT OR IGNORE INTO equipos (id, numero, tipo, estado, activo)
VALUES
    (1, 'EQ-101', 'Laptop', 'disponible', 1),
    (2, 'EQ-102', 'Cámara', 'disponible', 1),
    (3, 'EQ-103', 'Laptop', 'disponible', 1);

INSERT OR IGNORE INTO administradores (id, usuario, nombre, password, activo)
VALUES
    (1, 'admin', 'Administrador principal', '1234', 1);
