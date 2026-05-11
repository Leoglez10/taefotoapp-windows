param(
    [Parameter(Mandatory = $true)]
    [string]$ExcelPath,
    [Parameter(Mandatory = $true)]
    [string]$DatabasePath,
    [string]$CatalogSheet = "Catalogo",
    [string]$EventsSheet = "Eventos",
    [string]$DefaultCicloEscolar = "2025-2026",
    [string]$DefaultTurno = "MAT"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExcelPath = (Resolve-Path $ExcelPath).Path

if (Test-Path $DatabasePath) {
    $DatabasePath = (Resolve-Path $DatabasePath).Path
}
else {
    $DatabasePath = [System.IO.Path]::GetFullPath($DatabasePath)
}

function Normalize-Text {
    param([object]$Value)
    if ($null -eq $Value) { return "" }
    return ([string]$Value).Trim()
}

function Get-WorksheetRows {
    param($Sheet)
    $range = $Sheet.UsedRange
    $rowCount = $range.Rows.Count
    $colCount = $range.Columns.Count
    $headers = @{}

    for ($col = 1; $col -le $colCount; $col++) {
        $headers[$col] = Normalize-Text $range.Cells.Item(1, $col).Text
    }

    $rows = @()
    for ($row = 2; $row -le $rowCount; $row++) {
        $item = [ordered]@{}
        for ($col = 1; $col -le $colCount; $col++) {
            $item["_col$col"] = Normalize-Text $range.Cells.Item($row, $col).Text
            $header = $headers[$col]
            if ($header -ne "") {
                $item[$header] = Normalize-Text $range.Cells.Item($row, $col).Text
            }
        }
        $rows += [pscustomobject]$item
    }

    return $rows
}

$excel = $null
$workbook = $null
$catalogJson = $null
$eventsJson = $null

try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $workbook = $excel.Workbooks.Open($ExcelPath)

    $catalogRows = Get-WorksheetRows -Sheet $workbook.Worksheets.Item($CatalogSheet)
    $eventRows = Get-WorksheetRows -Sheet $workbook.Worksheets.Item($EventsSheet)

    $catalogJson = Join-Path $env:TEMP ("catalog_" + [guid]::NewGuid().ToString() + ".json")
    $eventsJson = Join-Path $env:TEMP ("events_" + [guid]::NewGuid().ToString() + ".json")

    $catalogRows | ConvertTo-Json -Depth 6 | Set-Content -Path $catalogJson -Encoding UTF8
    $eventRows | ConvertTo-Json -Depth 6 | Set-Content -Path $eventsJson -Encoding UTF8

    @'
import json
import sqlite3
import sys

db_path, catalog_path, events_path, ciclo, turno = sys.argv[1:]

def text(value):
    return (value or "").strip()

with open(catalog_path, "r", encoding="utf-8-sig") as fh:
    catalog_rows = json.load(fh) or []

with open(events_path, "r", encoding="utf-8-sig") as fh:
    event_rows = json.load(fh) or []

conn = sqlite3.connect(db_path)
conn.execute("PRAGMA foreign_keys = ON")
cur = conn.cursor()

def pick(row, *keys):
    for key in keys:
        if key in row and text(row.get(key)):
            return text(row.get(key))
    return ""

def parse_grupo(raw):
    value = text(raw)
    if not value:
        return "", turno

    upper = value.upper()
    parsed_turno = turno

    if "VES" in upper:
        parsed_turno = "VES"
    elif "MAT" in upper:
        parsed_turno = "MAT"

    normalized = upper.replace("T/", " ").replace(".", " ")
    normalized = normalized.replace("/MAT", "").replace("/VES", "")
    normalized = normalized.replace("MAT", "").replace("VES", "")
    normalized = " ".join(normalized.split())
    return normalized, parsed_turno

for row in catalog_rows:
    codigo = pick(row, "Código", "Código:", "CÓDIGO", "CODIGO", "_col2")
    nombre = pick(row, "Nombre", "Nombre:", "NOMBRE", "_col3")
    materia = pick(row, "Materia", "Materia:", "MATERIA", "_col4")
    profesor = pick(row, "Profesor(a)", "Profesor(a):", "PROFESOR", "Profesor", "_col5")
    grupo_raw = pick(row, "Grupo", "Grupo:", "GRUPO", "_col6")

    grupo, grupo_turno = parse_grupo(grupo_raw)
    if not grupo or not codigo or codigo.lower().startswith("código"):
        continue

    cur.execute(
        "INSERT OR IGNORE INTO grupos (nombre, turno, ciclo_escolar, activo) VALUES (?, ?, ?, 1)",
        (grupo, grupo_turno, ciclo),
    )
    cur.execute(
        """
        INSERT OR IGNORE INTO alumnos (codigo, nombre, grupo_id, activo)
        SELECT ?, ?, g.id, 1
        FROM grupos g
        WHERE g.nombre = ? AND g.turno = ? AND g.ciclo_escolar = ?
        """,
        (codigo, nombre, grupo, grupo_turno, ciclo),
    )
    if materia:
        cur.execute("INSERT OR IGNORE INTO materias (nombre, activo) VALUES (?, 1)", (materia,))
    if profesor:
        cur.execute("INSERT OR IGNORE INTO profesores (nombre, activo) VALUES (?, 1)", (profesor,))
    if codigo and materia:
        cur.execute(
            """
            INSERT OR IGNORE INTO alumno_materia (alumno_id, materia_id, profesor_id, activo)
            SELECT a.id, m.id, p.id, 1
            FROM alumnos a
            INNER JOIN materias m ON m.nombre = ?
            LEFT JOIN profesores p ON p.nombre = ?
            WHERE a.codigo = ?
            """,
            (materia, profesor if profesor else None, codigo),
        )

for row in event_rows:
    fecha = pick(row, "Fecha", "FECHA", "_col1")
    codigo = pick(row, "Código", "Código:", "CÓDIGO", "CODIGO", "_col2")
    nombre = pick(row, "Nombre", "NOMBRE", "_col3")
    materia = pick(row, "Materia", "MATERIA", "_col4")
    profesor = pick(row, "Profesor(a)", "Profesor(a):", "PROFESOR", "Profesor", "_col5")
    grupo_raw = pick(row, "Grupo", "Grupo:", "GRUPO", "_col6")
    tipo = pick(row, "Tipo", "TIPO DE REGISTRO", "TIPO", "_col7").lower()
    equipo = pick(row, "Número de equipo", "LAP TOP", "LAPTOP", "NUMERO DE EQUIPO", "_col8")
    observaciones = pick(row, "Observaciones", "OBSERVACIONES", "_col9")
    grupo, grupo_turno = parse_grupo(grupo_raw)

    if not codigo or not equipo or not tipo or codigo.lower().startswith("código"):
        continue

    if grupo:
        cur.execute(
            "INSERT OR IGNORE INTO grupos (nombre, turno, ciclo_escolar, activo) VALUES (?, ?, ?, 1)",
            (grupo, grupo_turno, ciclo),
        )
    if codigo and nombre and grupo:
        cur.execute(
            """
            INSERT OR IGNORE INTO alumnos (codigo, nombre, grupo_id, activo)
            SELECT ?, ?, g.id, 1
            FROM grupos g
            WHERE g.nombre = ? AND g.turno = ? AND g.ciclo_escolar = ?
            """,
            (codigo, nombre, grupo, grupo_turno, ciclo),
        )
    if materia:
        cur.execute("INSERT OR IGNORE INTO materias (nombre, activo) VALUES (?, 1)", (materia,))
    if profesor:
        cur.execute("INSERT OR IGNORE INTO profesores (nombre, activo) VALUES (?, 1)", (profesor,))
    if codigo and materia:
        cur.execute(
            """
            INSERT OR IGNORE INTO alumno_materia (alumno_id, materia_id, profesor_id, activo)
            SELECT a.id, m.id, p.id, 1
            FROM alumnos a
            INNER JOIN materias m ON m.nombre = ?
            LEFT JOIN profesores p ON p.nombre = ?
            WHERE a.codigo = ?
            """,
            (materia, profesor if profesor else None, codigo),
        )

    cur.execute(
        "INSERT OR IGNORE INTO equipos (numero, tipo, estado, activo) VALUES (?, 'laptop', 'disponible', 1)",
        (equipo,),
    )

    if tipo.startswith("pr"):
        cur.execute(
            """
            INSERT INTO prestamos (alumno_id, equipo_id, fecha_prestamo, estado)
            SELECT a.id, e.id, ?, 'activo'
            FROM alumnos a, equipos e
            WHERE a.codigo = ? AND e.numero = ?
              AND NOT EXISTS (SELECT 1 FROM prestamos p WHERE p.alumno_id = a.id AND p.estado = 'activo')
              AND NOT EXISTS (SELECT 1 FROM prestamos p WHERE p.equipo_id = e.id AND p.estado = 'activo')
            """,
            (fecha, codigo, equipo),
        )
        cur.execute(
            """
            INSERT INTO historial_eventos (tipo_evento, prestamo_id, fecha, observaciones)
            SELECT 'prestamo', p.id, ?, ?
            FROM prestamos p
            INNER JOIN alumnos a ON a.id = p.alumno_id
            INNER JOIN equipos e ON e.id = p.equipo_id
            WHERE a.codigo = ? AND e.numero = ? AND p.fecha_prestamo = ?
            """,
            (fecha, observaciones or "Importado desde Excel", codigo, equipo, fecha),
        )
        cur.execute(
            """
            UPDATE equipos
            SET estado = 'prestado'
            WHERE numero = ?
              AND EXISTS (SELECT 1 FROM prestamos WHERE equipo_id = equipos.id AND estado = 'activo')
            """,
            (equipo,),
        )
    else:
        cur.execute(
            """
            UPDATE prestamos
            SET fecha_devolucion = ?, estado = 'devuelto'
            WHERE id = (
                SELECT p.id
                FROM prestamos p
                INNER JOIN alumnos a ON a.id = p.alumno_id
                INNER JOIN equipos e ON e.id = p.equipo_id
                WHERE a.codigo = ? AND e.numero = ? AND p.estado = 'activo'
                ORDER BY p.fecha_prestamo DESC
                LIMIT 1
            )
            """,
            (fecha, codigo, equipo),
        )
        cur.execute(
            """
            INSERT INTO historial_eventos (tipo_evento, prestamo_id, fecha, observaciones)
            SELECT 'devolucion', p.id, ?, ?
            FROM prestamos p
            INNER JOIN alumnos a ON a.id = p.alumno_id
            INNER JOIN equipos e ON e.id = p.equipo_id
            WHERE a.codigo = ? AND e.numero = ? AND p.fecha_devolucion = ?
            """,
            (fecha, observaciones or "Importado desde Excel", codigo, equipo, fecha),
        )
        cur.execute(
            """
            UPDATE equipos
            SET estado = 'disponible'
            WHERE numero = ?
              AND NOT EXISTS (SELECT 1 FROM prestamos WHERE equipo_id = equipos.id AND estado = 'activo')
            """,
            (equipo,),
        )

conn.commit()
conn.close()
'@ | python - $DatabasePath $catalogJson $eventsJson $DefaultCicloEscolar $DefaultTurno

    Write-Output "Importacion completada."
}
finally {
    if ($catalogJson -and (Test-Path $catalogJson)) { Remove-Item $catalogJson -Force }
    if ($eventsJson -and (Test-Path $eventsJson)) { Remove-Item $eventsJson -Force }
    if ($workbook) { $workbook.Close($false) }
    if ($excel) { $excel.Quit() }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
