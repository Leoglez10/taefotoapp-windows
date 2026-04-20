use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActiveLoan {
    pub prestamo_id: i64,
    pub equipo_id: i64,
    pub equipo_numero: String,
    pub fecha_prestamo: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StudentLookup {
    pub id: i64,
    pub codigo: String,
    pub nombre: String,
    pub materia: String,
    pub profesor: String,
    pub grupo: String,
    pub activo: bool,
    pub prestamo_activo: Option<ActiveLoan>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StudentInput {
    pub id: Option<i64>,
    pub codigo: String,
    pub nombre: String,
    pub materia: String,
    pub profesor: String,
    pub grupo: String,
    pub activo: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EquipmentItem {
    pub id: i64,
    pub numero: String,
    pub descripcion: String,
    pub estado: String,
    pub activo: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EquipmentInput {
    pub id: Option<i64>,
    pub numero: String,
    pub descripcion: String,
    pub estado: String,
    pub activo: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoanRecord {
    pub prestamo_id: i64,
    pub alumno_id: i64,
    pub alumno_nombre: String,
    pub codigo: String,
    pub materia: String,
    pub profesor: String,
    pub grupo: String,
    pub equipo_id: i64,
    pub equipo_numero: String,
    pub fecha_prestamo: String,
    pub fecha_devolucion: Option<String>,
    pub estado: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StudentOperationPayload {
    pub codigo: String,
    pub tipo: String,
    pub equipo_id: Option<i64>,
    pub observaciones: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DashboardSummary {
    pub alumnos_activos: i64,
    pub equipos_disponibles: i64,
    pub prestamos_activos: i64,
    pub registros_totales: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct RecordFilter {
    pub alumno_id: Option<i64>,
    pub alumno_query: Option<String>,
    pub fecha_inicio: Option<String>,
    pub fecha_fin: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecordItem {
    pub id: i64,
    pub fecha: String,
    pub tipo: String,
    pub alumno_id: i64,
    pub alumno_nombre: String,
    pub codigo: String,
    pub materia: String,
    pub profesor: String,
    pub grupo: String,
    pub equipo_numero: String,
    pub observaciones: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExcelImportPayload {
    pub file_name: String,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DatabaseImportPayload {
    pub file_name: String,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExcelStudentRow {
    #[serde(rename = "Codigo")]
    pub codigo: String,
    #[serde(rename = "Nombre")]
    pub nombre: String,
    #[serde(rename = "Materia")]
    pub materia: String,
    #[serde(rename = "Profesor")]
    pub profesor: String,
    #[serde(rename = "Grupo")]
    pub grupo: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExcelGroupRow {
    #[serde(rename = "Grupo")]
    pub grupo: String,
    #[serde(rename = "Turno")]
    pub turno: String,
    #[serde(rename = "CicloEscolar")]
    pub ciclo_escolar: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExcelWorkbookImport {
    #[serde(rename = "validatedSheets")]
    pub validated_sheets: Vec<String>,
    pub format: String,
    pub students: Vec<ExcelStudentRow>,
    pub groups: Vec<ExcelGroupRow>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExcelImportSummary {
    pub archivo: String,
    pub formato: String,
    pub alumnos_insertados: i64,
    pub alumnos_actualizados: i64,
    pub alumnos_omitidos: i64,
    pub grupos_insertados: i64,
    pub grupos_actualizados: i64,
    pub grupos_omitidos: i64,
    pub hojas_validadas: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdminLoginPayload {
    pub usuario: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoginResult {
    pub ok: bool,
    pub admin: Option<AdminUser>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdminUser {
    pub id: i64,
    pub usuario: String,
    pub nombre: String,
    pub activo: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdminInput {
    pub id: Option<i64>,
    pub usuario: String,
    pub nombre: String,
    pub password: Option<String>,
    pub activo: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReportRequest {
    pub report_type: String,
    pub alumno_id: Option<i64>,
    pub fecha_inicio: Option<String>,
    pub fecha_fin: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReportRow {
    pub etiqueta: String,
    pub valor: i64,
    pub detalle: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReportData {
    pub titulo: String,
    pub generado_en: String,
    pub filas: Vec<ReportRow>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PdfResult {
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackupItem {
    pub file_name: String,
    pub path: String,
    pub size_bytes: u64,
    pub modified_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackupHistory {
    pub directory: String,
    pub items: Vec<BackupItem>,
}
