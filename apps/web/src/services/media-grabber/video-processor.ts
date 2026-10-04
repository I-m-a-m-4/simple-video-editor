import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";

const execFileAsync = promisify(execFile);

function resolveExecutable(candidates: (string | undefined)[], defaultCmd: string): string {
	for (const candidate of candidates) {
		if (!candidate) continue;
		if (fs.existsSync(candidate)) return candidate;
	}
	const isWindows = process.platform === "win32";
	const exeName = isWindows && !defaultCmd.endsWith(".exe") ? `${defaultCmd}.exe` : defaultCmd;
	return exeName;
}

const localAppData = process.env.LOCALAPPDATA || "";
const userProfile = process.env.USERPROFILE || "";

const YTDLP_CANDIDATES = [
	process.env.YTDLP_PATH,
	localAppData
		? path.join(
				localAppData,
				"Microsoft",
				"WinGet",
				"Packages",
				"yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe",
				"yt-dlp.exe",
			)
		: undefined,
	userProfile
		? path.join(
				userProfile,
				"Documents",
				"media-grabber",
				"src-tauri",
				"bin",
				"yt-dlp-x86_64-pc-windows-msvc.exe",
			)
		: undefined,
	"yt-dlp.exe",
	"yt-dlp",
];

const FFMPEG_CANDIDATES = [
	process.env.FFMPEG_PATH,
	localAppData
		? path.join(
				localAppData,
				"Microsoft",
				"WinGet",
				"Packages",
				"yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
				"ffmpeg-N-125365-g9a01c1cb6a-win64-gpl",
				"bin",
				"ffmpeg.exe",
			)
		: undefined,
	"ffmpeg.exe",
	"ffmpeg",
];

export interface ShortOptions {
	inputPath: string;
	outputPath: string;
	startTime?: string; // e.g., "00:01:15"
	duration?: number; // seconds (e.g., 30 or 60)
	cropMode?: "crop_center" | "blur_background"; // 9:16 format style
}

export interface VideoInfo {
	title: string;
	duration?: number;
	thumbnail?: string;
	uploader?: string;
	webpageUrl: string;
}

/**
 * Get video metadata from any URL using yt-dlp
 */
export async function getVideoInfo(url: string): Promise<VideoInfo> {
	const ytdlp = resolveExecutable(YTDLP_CANDIDATES, "yt-dlp");
	const args = ["--dump-json", "--skip-download", url];

	const { stdout } = await execFileAsync(ytdlp, args, { maxBuffer: 10 * 1024 * 1024 });
	const data = JSON.parse(stdout.trim().split("\n")[0] || "{}");

	return {
		title: data.title || "Downloaded Video",
		duration: typeof data.duration === "number" ? data.duration : undefined,
		thumbnail: data.thumbnail || data.thumbnails?.[0]?.url,
		uploader: data.uploader || data.channel,
		webpageUrl: data.webpage_url || url,
	};
}

/**
 * 1. Download video from any URL
 */
export async function downloadVideoFromLink(
	url: string,
	outputDirectory: string,
): Promise<{ filePath: string; title: string }> {
	const ytdlp = resolveExecutable(YTDLP_CANDIDATES, "yt-dlp");
	const ffmpeg = resolveExecutable(FFMPEG_CANDIDATES, "ffmpeg");
	const outputTemplate = path.join(outputDirectory, "%(title).50s-%(id)s.%(ext)s");

	const args = [
		url,
		"--no-playlist",
		"--no-warnings",
		"-f",
		"b[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/bv*+ba/best",
		"--merge-output-format",
		"mp4",
		"-o",
		outputTemplate,
	];

	if (ffmpeg && fs.existsSync(ffmpeg)) {
		args.push("--ffmpeg-location", path.dirname(ffmpeg));
	}

	try {
		await execFileAsync(ytdlp, args, { maxBuffer: 30 * 1024 * 1024 });
	} catch (err: any) {
		console.warn("Media download run note:", err?.message || err);
	}

	// Read output directory to find the generated media file
	const mediaExtensions = [".mp4", ".mkv", ".webm", ".mov", ".m4a", ".mp3"];
	const dirFiles = fs.readdirSync(outputDirectory);
	const validFiles = dirFiles
		.filter((f) => {
			const ext = path.extname(f).toLowerCase();
			return mediaExtensions.includes(ext) && !f.endsWith(".part") && !f.endsWith(".ytdl");
		})
		.map((f) => path.join(outputDirectory, f))
		.filter((f) => fs.existsSync(f) && fs.statSync(f).size > 1024)
		.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);

	if (validFiles.length === 0) {
		throw new Error("Unable to download media from the specified link. Please verify the URL.");
	}

	let targetPath = validFiles[0];

	// If output is not mp4, remux or transcode to mp4 for browser playback
	if (path.extname(targetPath).toLowerCase() !== ".mp4") {
		const mp4Path = path.join(outputDirectory, `${path.basename(targetPath, path.extname(targetPath))}.mp4`);
		try {
			await execFileAsync(ffmpeg, ["-i", targetPath, "-c:v", "libx264", "-c:a", "aac", "-y", mp4Path]);
			if (fs.existsSync(mp4Path) && fs.statSync(mp4Path).size > 1024) {
				targetPath = mp4Path;
			}
		} catch (convErr) {
			console.warn("Remuxing to mp4 fallback:", convErr);
		}
	}

	const baseName = path.basename(targetPath, path.extname(targetPath));
	const title = baseName.replace(/-[a-zA-Z0-9_-]{11}$/, "").trim() || baseName;

	return { filePath: targetPath, title };
}

/**
 * 2. Cut & convert long video into a 9:16 vertical Short/Reel
 */
export async function convertToShort({
	inputPath,
	outputPath,
	startTime = "00:00:00",
	duration = 30,
	cropMode = "crop_center",
}: ShortOptions): Promise<void> {
	const ffmpeg = resolveExecutable(FFMPEG_CANDIDATES, "ffmpeg");
	let filterGraph = "";

	if (cropMode === "crop_center") {
		// Centers and crops 16:9 to vertical 9:16 (1080x1920)
		filterGraph = "crop=ih*(9/16):ih,scale=1080:1920";
	} else {
		// Blurred background with original video centered
		filterGraph =
			"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,boxblur=20:20[bg];" +
			"[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg];" +
			"[bg][fg]overlay=(W-w)/2:(H-h)/2";
	}

	const args = [
		"-ss",
		startTime,
		"-i",
		inputPath,
		"-t",
		duration.toString(),
		"-vf",
		filterGraph,
		"-c:v",
		"libx264",
		"-preset",
		"fast",
		"-crf",
		"22",
		"-c:a",
		"aac",
		"-b:a",
		"192k",
		"-y",
		outputPath,
	];

	await execFileAsync(ffmpeg, args, { maxBuffer: 20 * 1024 * 1024 });
}

export interface VideoCompressOptions {
	inputPath: string;
	outputPath: string;
	qualityPreset?: "high" | "balanced" | "compact";
	resolution?: "original" | "1080p" | "720p" | "480p";
	audioBitrate?: "128k" | "96k" | "64k";
}

/**
 * 3. Video Compression
 */
export async function compressVideo({
	inputPath,
	outputPath,
	qualityPreset = "balanced",
	resolution = "original",
	audioBitrate = "96k",
}: VideoCompressOptions): Promise<{ originalSize: number; compressedSize: number }> {
	const ffmpeg = resolveExecutable(FFMPEG_CANDIDATES, "ffmpeg");

	const crfMap = {
		high: "23",
		balanced: "28",
		compact: "33",
	};
	const crf = crfMap[qualityPreset] || "28";

	const args = ["-i", inputPath];

	if (resolution === "1080p") {
		args.push("-vf", "scale=-2:1080");
	} else if (resolution === "720p") {
		args.push("-vf", "scale=-2:720");
	} else if (resolution === "480p") {
		args.push("-vf", "scale=-2:480");
	}

	args.push(
		"-c:v",
		"libx264",
		"-preset",
		"medium",
		"-crf",
		crf,
		"-c:a",
		"aac",
		"-b:a",
		audioBitrate,
		"-movflags",
		"+faststart",
		"-y",
		outputPath,
	);

	await execFileAsync(ffmpeg, args, { maxBuffer: 30 * 1024 * 1024 });

	const originalSize = fs.existsSync(inputPath) ? fs.statSync(inputPath).size : 0;
	const compressedSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;

	return { originalSize, compressedSize };
}

export function getTempDirectory(): string {
	const dir = path.join(os.tmpdir(), "opencut-media-grabber");
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	return dir;
}
