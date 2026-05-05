use tauri::Manager;

#[tauri::command]
async fn set_mini_player(window: tauri::Window, enabled: bool) -> Result<(), String> {
    if enabled {
        window
            .set_size(tauri::Size::Logical(tauri::LogicalSize {
                width: 280.0,
                height: 120.0,
            }))
            .map_err(|e| e.to_string())?;
        window.set_always_on_top(true).map_err(|e| e.to_string())?;
    } else {
        window
            .set_size(tauri::Size::Logical(tauri::LogicalSize {
                width: 800.0,
                height: 600.0,
            }))
            .map_err(|e| e.to_string())?;
        window.set_always_on_top(false).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![set_mini_player])
        .setup(|app| {
            let win = app.get_webview_window("main").unwrap();
            let win_clone = win.clone();
            win.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(focused) = event {
                    if *focused {
                        win_clone.emit("window-focus", ()).ok();
                    } else {
                        win_clone.emit("window-blur", ()).ok();
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
