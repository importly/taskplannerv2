use tauri::{Manager, Emitter};
use std::collections::HashMap;

mod phone_view;
use phone_view::{get_phone_view_url, get_phone_view_urls, push_timer_state, PhoneViewState};

#[tauri::command]
async fn exchange_ms_token(
    code: String,
    code_verifier: String,
    redirect_uri: String,
    client_id: String,
    tenant_id: String,
    scope: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut params = HashMap::new();
    params.insert("client_id", client_id.as_str());
    params.insert("code", code.as_str());
    params.insert("code_verifier", code_verifier.as_str());
    params.insert("grant_type", "authorization_code");
    params.insert("redirect_uri", redirect_uri.as_str());
    params.insert("scope", scope.as_str());

    let response = client
        .post(format!(
            "https://login.microsoftonline.com/{}/oauth2/v2.0/token",
            tenant_id
        ))
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    response.text().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn refresh_ms_token(
    refresh_token: String,
    client_id: String,
    tenant_id: String,
    scope: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut params = HashMap::new();
    params.insert("client_id", client_id.as_str());
    params.insert("refresh_token", refresh_token.as_str());
    params.insert("grant_type", "refresh_token");
    params.insert("scope", scope.as_str());

    let response = client
        .post(format!(
            "https://login.microsoftonline.com/{}/oauth2/v2.0/token",
            tenant_id
        ))
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    response.text().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn minimize_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
async fn toggle_maximize_window(window: tauri::Window) -> Result<(), String> {
    if window.is_maximized().map_err(|e| e.to_string())? {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
async fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
async fn start_drag(window: tauri::Window) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

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
                width: 1100.0,
                height: 720.0,
            }))
            .map_err(|e| e.to_string())?;
        window.set_always_on_top(false).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // Forward any deep-link URL from argv to the frontend
            if let Some(url) = argv.iter().find(|a| a.starts_with("accountability://")) {
                let _ = app.emit("deep-link-received", url.clone());
            }
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_focus();
            }
        }))
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            set_mini_player,
            minimize_window,
            toggle_maximize_window,
            close_window,
            start_drag,
            exchange_ms_token,
            refresh_ms_token,
            get_phone_view_urls,
            get_phone_view_url,
            push_timer_state,
        ])
        .setup(|app| {
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            // Phone-view HTTP+WS server: serves a read-only fullscreen timer
            // mirror to other devices on the local network (single-user, no
            // auth — see src/phone_view.rs).
            let phone_view_state = PhoneViewState::new();
            phone_view::start(phone_view_state.clone());
            app.manage(phone_view_state);

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
