// Phone View: built-in HTTP + WebSocket server that exposes a fullscreen
// read-only timer view to other devices on the local network (typically the
// user's phone). The phone connects to `http://<LAN_IP>:<port>/` and the
// embedded HTML opens a WebSocket to `/ws` that receives timer state JSON
// pushed from the desktop frontend whenever the timer changes.
//
// SECURITY NOTE: There is intentionally NO authentication on this server.
// The assumption is single-user, trusted local network only. Anyone on the
// same Wi-Fi can view the timer. Do not expose this port to the internet.

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use serde::Serialize;
use serde_json::Value;
use std::{
    net::{IpAddr, SocketAddr},
    sync::{Arc, Mutex},
};
use tokio::sync::broadcast;

const PORT_CANDIDATES: &[u16] = &[17777, 17778, 17779];

/// Shared state: a broadcast channel for pushing timer state JSON to all
/// connected WebSocket clients, plus the last-known state so that newly
/// connected clients can render something immediately.
#[derive(Clone)]
pub struct PhoneViewState {
    pub tx: broadcast::Sender<String>,
    pub last_state: Arc<Mutex<Option<String>>>,
    pub bound_port: Arc<Mutex<Option<u16>>>,
}

impl PhoneViewState {
    pub fn new() -> Self {
        let (tx, _rx) = broadcast::channel::<String>(64);
        Self {
            tx,
            last_state: Arc::new(Mutex::new(None)),
            bound_port: Arc::new(Mutex::new(None)),
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhoneViewUrl {
    pub interface_name: String,
    pub url: String,
    pub primary: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhoneViewUrls {
    pub urls: Vec<PhoneViewUrl>,
    pub error: Option<String>,
}

const PHONE_VIEW_HTML: &str = include_str!("phone_view.html");

async fn index_handler() -> impl IntoResponse {
    Html(PHONE_VIEW_HTML)
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<PhoneViewState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: PhoneViewState) {
    // Immediately send the last-known state, if any, so the phone has
    // something to render before the next push arrives.
    if let Some(snapshot) = state.last_state.lock().ok().and_then(|s| s.clone()) {
        let _ = socket.send(Message::Text(snapshot.into())).await;
    }

    let mut rx = state.tx.subscribe();

    loop {
        tokio::select! {
            // Forward broadcasts to this client.
            msg = rx.recv() => {
                match msg {
                    Ok(json) => {
                        if socket.send(Message::Text(json.into())).await.is_err() {
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(_) => break,
                }
            }
            // Drain inbound messages (we ignore them — read-only view).
            // This is also how we detect the client closing the socket.
            incoming = socket.recv() => {
                match incoming {
                    Some(Ok(Message::Close(_))) | None => break,
                    Some(Err(_)) => break,
                    _ => {}
                }
            }
        }
    }
}

/// Start the phone-view server. Tries ports in PORT_CANDIDATES in order;
/// the first one that binds successfully wins. The server binds all local
/// interfaces; URL discovery happens dynamically each time the frontend asks.
pub fn start(state: PhoneViewState) {
    let app = Router::new()
        .route("/", get(index_handler))
        .route("/ws", get(ws_handler))
        .with_state(state.clone());

    // Use Tauri's async runtime to guarantee the task is scheduled even when
    // called from a non-async context (Tauri's `setup` closure is sync).
    tauri::async_runtime::spawn(async move {
        for &port in PORT_CANDIDATES {
            let addr: SocketAddr = match format!("0.0.0.0:{port}").parse() {
                Ok(a) => a,
                Err(_) => continue,
            };

            match tokio::net::TcpListener::bind(addr).await {
                Ok(listener) => {
                    if let Ok(mut guard) = state.bound_port.lock() {
                        *guard = Some(port);
                    }
                    // Serve forever. If this returns, the task exits — Tauri's
                    // runtime will clean up when the app shuts down.
                    let _ = axum::serve(listener, app.into_make_service()).await;
                    return;
                }
                Err(_) => continue,
            }
        }
    });
}

/// Tauri command: return all currently usable phone-view URLs. This resolves
/// live network interfaces each time, so Wi-Fi/Ethernet/VPN changes are picked
/// up without rebuilding or hardcoding an address.
#[tauri::command]
pub fn get_phone_view_urls(state: tauri::State<'_, PhoneViewState>) -> PhoneViewUrls {
    let port = state
        .bound_port
        .lock()
        .ok()
        .and_then(|g| *g);

    let Some(port) = port else {
        return PhoneViewUrls {
            urls: Vec::new(),
            error: Some("Phone view: server is not listening — check firewall".to_string()),
        };
    };

    let interfaces = match local_ip_address::list_afinet_netifas() {
        Ok(interfaces) => interfaces,
        Err(err) => {
            return PhoneViewUrls {
                urls: Vec::new(),
                error: Some(format!("Phone view: network detection failed — {err}")),
            };
        }
    };

    let urls = build_phone_view_urls(port, interfaces);
    let error = if urls.is_empty() {
        Some("Phone view: no LAN IPv4 address detected".to_string())
    } else {
        None
    };

    PhoneViewUrls { urls, error }
}

/// Backward-compatible single URL command. Prefer `get_phone_view_urls`.
#[tauri::command]
pub fn get_phone_view_url(state: tauri::State<'_, PhoneViewState>) -> String {
    let payload = get_phone_view_urls(state);
    payload
        .urls
        .into_iter()
        .find(|candidate| candidate.primary)
        .map(|candidate| candidate.url)
        .unwrap_or_else(|| payload.error.unwrap_or_else(|| "Phone view: detection failed — check firewall".to_string()))
}

fn build_phone_view_urls(port: u16, interfaces: Vec<(String, IpAddr)>) -> Vec<PhoneViewUrl> {
    let mut urls: Vec<PhoneViewUrl> = interfaces
        .into_iter()
        .filter_map(|(interface_name, ip)| match ip {
            IpAddr::V4(ipv4) if !ipv4.is_loopback() && !ipv4.is_unspecified() => {
                Some((interface_name, ipv4))
            }
            _ => None,
        })
        .map(|(interface_name, ip)| PhoneViewUrl {
            interface_name,
            url: format!("http://{ip}:{port}"),
            primary: false,
        })
        .collect();

    urls.sort_by(|a, b| {
        let a_private = url_host_is_private_ipv4(&a.url);
        let b_private = url_host_is_private_ipv4(&b.url);
        b_private
            .cmp(&a_private)
            .then_with(|| a.interface_name.cmp(&b.interface_name))
            .then_with(|| a.url.cmp(&b.url))
    });
    urls.dedup_by(|a, b| a.url == b.url);

    if let Some(first) = urls.first_mut() {
        first.primary = true;
    }

    urls
}

fn url_host_is_private_ipv4(url: &str) -> bool {
    url.strip_prefix("http://")
        .and_then(|rest| rest.split(':').next())
        .and_then(|host| host.parse::<std::net::Ipv4Addr>().ok())
        .is_some_and(|ip| ip.is_private())
}

/// Tauri command: frontend calls this on timer state changes. Stores the
/// latest snapshot and broadcasts it to all WebSocket clients. Errors are
/// swallowed — pushing is best-effort.
#[tauri::command]
pub fn push_timer_state(state: tauri::State<'_, PhoneViewState>, payload: Value) -> Result<(), String> {
    let json = payload.to_string();
    if let Ok(mut guard) = state.last_state.lock() {
        *guard = Some(json.clone());
    }
    // Ignore SendError — no subscribers is fine.
    let _ = state.tx.send(json);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

    #[test]
    fn builds_urls_for_each_non_loopback_ipv4_interface() {
        let urls = build_phone_view_urls(
            17777,
            vec![
                ("Loopback".to_string(), IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1))),
                ("Wi-Fi".to_string(), IpAddr::V4(Ipv4Addr::new(192, 168, 1, 42))),
                ("Ethernet".to_string(), IpAddr::V4(Ipv4Addr::new(10, 0, 0, 12))),
                ("IPv6".to_string(), IpAddr::V6(Ipv6Addr::LOCALHOST)),
            ],
        );

        assert_eq!(urls.len(), 2);
        assert!(urls.iter().any(|candidate| candidate.url == "http://192.168.1.42:17777"));
        assert!(urls.iter().any(|candidate| candidate.url == "http://10.0.0.12:17777"));
        assert!(urls[0].primary);
        assert!(urls.iter().skip(1).all(|candidate| !candidate.primary));
    }
}
