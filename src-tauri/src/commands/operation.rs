use tauri::State;

use crate::{
    models::{EquipmentItem, LoanRecord, RecordItem, StudentLookup, StudentOperationPayload},
    services,
    AppState,
};

#[tauri::command]
pub fn find_student_by_code(state: State<'_, AppState>, codigo: String) -> Result<StudentLookup, String> {
    services::operation::find_student_by_code(&state.db_path, &codigo).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn list_available_equipment(state: State<'_, AppState>) -> Result<Vec<EquipmentItem>, String> {
    services::operation::list_available_equipment(&state.db_path).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn register_student_operation(state: State<'_, AppState>, payload: StudentOperationPayload) -> Result<LoanRecord, String> {
    services::operation::register_student_operation(&state.db_path, payload).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn get_student_history(state: State<'_, AppState>, codigo: String) -> Result<Vec<RecordItem>, String> {
    services::operation::get_student_history(&state.db_path, &codigo).map_err(|err| err.to_string())
}
