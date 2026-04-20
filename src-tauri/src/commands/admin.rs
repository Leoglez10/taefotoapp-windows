use tauri::State;

use crate::{
    models::{
        AdminInput, AdminLoginPayload, AdminUser, BackupHistory, DashboardSummary, DatabaseImportPayload,
        EquipmentInput, EquipmentItem, ExcelImportPayload, ExcelImportSummary, LoginResult, PdfResult, RecordFilter,
        RecordItem, ReportData, ReportRequest, StudentInput, StudentLookup,
    },
    services,
    AppState,
};

#[tauri::command]
pub fn admin_login(state: State<'_, AppState>, payload: AdminLoginPayload) -> Result<LoginResult, String> {
    services::admin::admin_login(&state.db_path, payload).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn list_admins(state: State<'_, AppState>) -> Result<Vec<AdminUser>, String> {
    services::admin::list_admins(&state.db_path).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn create_admin(state: State<'_, AppState>, payload: AdminInput) -> Result<AdminUser, String> {
    services::admin::create_admin(&state.db_path, payload).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn update_admin(state: State<'_, AppState>, payload: AdminInput) -> Result<AdminUser, String> {
    services::admin::update_admin(&state.db_path, payload).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn delete_admin(state: State<'_, AppState>, admin_id: i64) -> Result<(), String> {
    services::admin::delete_admin(&state.db_path, admin_id).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn get_dashboard_summary(state: State<'_, AppState>) -> Result<DashboardSummary, String> {
    services::admin::get_dashboard_summary(&state.db_path).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn import_excel_data(state: State<'_, AppState>, payload: ExcelImportPayload) -> Result<ExcelImportSummary, String> {
    services::admin::import_excel_data(&state.db_path, &state.app_data_dir, payload).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn backup_database(state: State<'_, AppState>) -> Result<PdfResult, String> {
    services::admin::backup_database(&state.db_path, &state.app_data_dir).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn list_backups(state: State<'_, AppState>) -> Result<BackupHistory, String> {
    services::admin::list_backups(&state.app_data_dir).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn restore_database(state: State<'_, AppState>, payload: DatabaseImportPayload) -> Result<PdfResult, String> {
    services::admin::restore_database(&state.db_path, &state.app_data_dir, payload).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn list_students(state: State<'_, AppState>, query: Option<String>) -> Result<Vec<StudentLookup>, String> {
    services::admin::list_students(&state.db_path, query).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn create_student(state: State<'_, AppState>, payload: StudentInput) -> Result<StudentLookup, String> {
    services::admin::create_student(&state.db_path, payload).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn update_student(state: State<'_, AppState>, payload: StudentInput) -> Result<StudentLookup, String> {
    services::admin::update_student(&state.db_path, payload).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn delete_student(state: State<'_, AppState>, student_id: i64) -> Result<(), String> {
    services::admin::delete_student(&state.db_path, student_id).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn list_equipment(state: State<'_, AppState>, query: Option<String>) -> Result<Vec<EquipmentItem>, String> {
    services::admin::list_equipment(&state.db_path, query).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn create_equipment(state: State<'_, AppState>, payload: EquipmentInput) -> Result<EquipmentItem, String> {
    services::admin::create_equipment(&state.db_path, payload).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn update_equipment(state: State<'_, AppState>, payload: EquipmentInput) -> Result<EquipmentItem, String> {
    services::admin::update_equipment(&state.db_path, payload).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn delete_equipment(state: State<'_, AppState>, equipment_id: i64) -> Result<(), String> {
    services::admin::delete_equipment(&state.db_path, equipment_id).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn list_records(state: State<'_, AppState>, filters: Option<RecordFilter>) -> Result<Vec<RecordItem>, String> {
    services::admin::list_records(&state.db_path, filters.unwrap_or_default()).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn clear_records(state: State<'_, AppState>) -> Result<(), String> {
    services::admin::clear_records(&state.db_path).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn export_records_csv(state: State<'_, AppState>, filters: Option<RecordFilter>) -> Result<PdfResult, String> {
    services::admin::export_records_csv(&state.db_path, &state.app_data_dir, filters.unwrap_or_default())
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn get_report_data(state: State<'_, AppState>, request: ReportRequest) -> Result<ReportData, String> {
    services::admin::get_report_data(&state.db_path, request).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn generate_report_pdf(state: State<'_, AppState>, request: ReportRequest) -> Result<PdfResult, String> {
    services::admin::generate_report_pdf(&state.db_path, &state.app_data_dir, request).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn open_file_path(path: String) -> Result<(), String> {
    services::admin::open_file_path(&path).map_err(|err| err.to_string())
}
