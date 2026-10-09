#[tauri::command]
fn open_browser(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let _ = std::process::Command::new("cmd")
            .args(["/c", "start", "", &url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(&url).spawn();
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open").arg(&url).spawn();
        return Ok(());
    }

    #[allow(unreachable_code)]
    Ok(())
}

#[tauri::command]
fn get_cli_media_path() -> Option<String> {
    std::env::args().skip(1).find(|arg| {
        let lower = arg.to_lowercase();
        lower.ends_with(".mp4")
            || lower.ends_with(".mkv")
            || lower.ends_with(".mov")
            || lower.ends_with(".webm")
            || lower.ends_with(".avi")
            || lower.ends_with(".m4v")
            || lower.ends_with(".wmv")
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![open_browser, get_cli_media_path])
        .run(tauri::generate_context!())
        .expect("error while running OpenCut application");
}
