mod commands;
mod db;
mod models;
mod services;

use std::{
    fs,
    path::{Path, PathBuf},
};
use tauri::Manager;

#[derive(Clone)]
pub struct AppState {
    pub db_path: PathBuf,
    pub app_data_dir: PathBuf,
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;
            let db_path = app_data_dir.join("prestamos.sqlite");
            migrate_legacy_database(app, &db_path)?;
            db::init_database(&db_path)?;
            app.manage(AppState { db_path, app_data_dir });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::operation::find_student_by_code,
            commands::operation::list_available_equipment,
            commands::operation::register_student_operation,
            commands::operation::get_student_history,
            commands::admin::admin_login,
            commands::admin::list_admins,
            commands::admin::create_admin,
            commands::admin::update_admin,
            commands::admin::delete_admin,
            commands::admin::get_dashboard_summary,
            commands::admin::import_excel_data,
            commands::admin::backup_database,
            commands::admin::list_backups,
            commands::admin::restore_database,
            commands::admin::list_students,
            commands::admin::create_student,
            commands::admin::update_student,
            commands::admin::delete_student,
            commands::admin::list_equipment,
            commands::admin::create_equipment,
            commands::admin::update_equipment,
            commands::admin::delete_equipment,
            commands::admin::list_records,
            commands::admin::clear_records,
            commands::admin::export_records_csv,
            commands::admin::get_report_data,
            commands::admin::generate_report_pdf,
            commands::admin::open_file_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn migrate_legacy_database(app: &tauri::App, target_db_path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    if target_db_path.exists() && fs::metadata(target_db_path)?.len() > 0 {
        return Ok(());
    }

    let legacy_candidates = legacy_db_candidates(app)?;
    let source = legacy_candidates.into_iter().find(|path| {
        path != target_db_path && path.exists() && fs::metadata(path).map(|metadata| metadata.len() > 0).unwrap_or(false)
    });

    if let Some(source_path) = source {
        if let Some(parent) = target_db_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(source_path, target_db_path)?;
    }

    Ok(())
}

fn legacy_db_candidates(app: &tauri::App) -> Result<Vec<PathBuf>, Box<dyn std::error::Error>> {
    let mut paths = Vec::new();

    if let Ok(current_dir) = std::env::current_dir() {
        paths.push(current_dir.join("prestamos.sqlite"));
    }

    if let Some(exe_dir) = std::env::current_exe()?.parent() {
        paths.push(exe_dir.join("prestamos.sqlite"));
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        paths.push(resource_dir.join("prestamos.sqlite"));
    }

    Ok(paths)
}
