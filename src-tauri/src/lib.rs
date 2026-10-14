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

use std::path::PathBuf;

fn find_binary(cmd: &str) -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let mut check_cmd = std::process::Command::new("where");
        check_cmd.arg(cmd);
        check_cmd.creation_flags(CREATE_NO_WINDOW);
        if let Ok(output) = check_cmd.output() {
            if output.status.success() {
                if let Ok(s) = String::from_utf8(output.stdout) {
                    if let Some(first_line) = s.lines().next() {
                        let p = PathBuf::from(first_line.trim());
                        if p.exists() {
                            return Some(p);
                        }
                    }
                }
            }
        }

        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let base = PathBuf::from(local_app_data)
                .join("Microsoft")
                .join("WinGet")
                .join("Packages");

            if cmd == "yt-dlp" {
                let candidate = base
                    .join("yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe")
                    .join("yt-dlp.exe");
                if candidate.exists() {
                    return Some(candidate);
                }
            } else if cmd == "ffmpeg" {
                let candidate = base
                    .join("yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe")
                    .join("ffmpeg-N-125365-g9a01c1cb6a-win64-gpl")
                    .join("bin")
                    .join("ffmpeg.exe");
                if candidate.exists() {
                    return Some(candidate);
                }
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(output) = std::process::Command::new("which").arg(cmd).output() {
            if output.status.success() {
                if let Ok(s) = String::from_utf8(output.stdout) {
                    if let Some(first_line) = s.lines().next() {
                        let p = PathBuf::from(first_line.trim());
                        if p.exists() {
                            return Some(p);
                        }
                    }
                }
            }
        }
    }

    None
}

#[tauri::command]
fn get_video_info(url: String) -> Result<serde_json::Value, String> {
    let ytdlp = find_binary("yt-dlp")
        .ok_or_else(|| "yt-dlp executable not found. Please install yt-dlp.".to_string())?;

    let mut cmd = std::process::Command::new(ytdlp);
    cmd.args(["--dump-single-json", "--no-warnings", "--no-playlist", &url]);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd.output().map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp error: {}", err));
    }

    let raw_json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse video info JSON: {}", e))?;

    let title = raw_json["title"].as_str().unwrap_or("Untitled Video").to_string();
    let duration = raw_json["duration"].as_f64();
    let thumbnail = raw_json["thumbnail"].as_str().map(|s| s.to_string());
    let uploader = raw_json["uploader"].as_str().or_else(|| raw_json["channel"].as_str()).map(|s| s.to_string());

    Ok(serde_json::json!({
        "success": true,
        "title": title,
        "duration": duration,
        "thumbnail": thumbnail,
        "uploader": uploader,
        "webpageUrl": url,
    }))
}

#[tauri::command]
fn download_video_stream(
    url: String,
    convert_to_short: Option<bool>,
    start_time: Option<String>,
    duration: Option<u32>,
) -> Result<serde_json::Value, String> {
    let ytdlp = find_binary("yt-dlp")
        .ok_or_else(|| "yt-dlp executable not found. Please install yt-dlp.".to_string())?;

    let temp_dir = std::env::temp_dir().join("ambercut_downloads");
    let _ = std::fs::create_dir_all(&temp_dir);

    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let base_name = format!("video_{}", nanos);
    let out_template = temp_dir.join(format!("{}.%(ext)s", base_name)).to_string_lossy().to_string();

    let mut cmd = std::process::Command::new(ytdlp);
    cmd.args([
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format", "mp4",
        "--no-playlist",
        "-o", &out_template,
        &url,
    ]);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd.output().map_err(|e| format!("Failed to download video: {}", e))?;
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Download failed: {}", err));
    }

    let mut final_path = temp_dir.join(format!("{}.mp4", base_name));
    if !final_path.exists() {
        if let Ok(entries) = std::fs::read_dir(&temp_dir) {
            for entry in entries.flatten() {
                if let Some(name) = entry.file_name().to_str() {
                    if name.starts_with(&base_name) {
                        final_path = entry.path();
                        break;
                    }
                }
            }
        }
    }

    if !final_path.exists() {
        return Err("Downloaded file not found".to_string());
    }

    // Optional short trimming/reframing via ffmpeg if requested
    let mut actual_return_path = final_path.clone();
    if convert_to_short.unwrap_or(false) {
        if let Some(ffmpeg) = find_binary("ffmpeg") {
            let short_path = temp_dir.join(format!("{}_short.mp4", base_name));
            let start = start_time.unwrap_or_else(|| "00:00:00".to_string());
            let dur = duration.unwrap_or(30).to_string();

            let mut ff_cmd = std::process::Command::new(ffmpeg);
            ff_cmd.args([
                "-ss", &start,
                "-i", final_path.to_str().unwrap(),
                "-t", &dur,
                "-vf", "crop=ih*9/16:ih",
                "-c:v", "libx264",
                "-c:a", "aac",
                "-y",
                short_path.to_str().unwrap(),
            ]);

            #[cfg(target_os = "windows")]
            {
                use std::os::windows::process::CommandExt;
                const CREATE_NO_WINDOW: u32 = 0x08000000;
                ff_cmd.creation_flags(CREATE_NO_WINDOW);
            }

            if let Ok(ff_out) = ff_cmd.output() {
                if ff_out.status.success() && short_path.exists() {
                    actual_return_path = short_path;
                }
            }
        }
    }

    Ok(serde_json::json!({
        "success": true,
        "filePath": actual_return_path.to_string_lossy(),
        "fileName": actual_return_path.file_name().and_then(|n| n.to_str()).unwrap_or("video.mp4"),
    }))
}

#[tauri::command]
fn read_binary_file(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_browser,
            get_cli_media_path,
            get_video_info,
            download_video_stream,
            read_binary_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running OpenCut application");
}
