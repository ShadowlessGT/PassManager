#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // No remote content, filesystem, shell, or native-messaging bridge.
    // The existing Parola React vault runs as bundled local assets.
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to launch Parola desktop");
}
