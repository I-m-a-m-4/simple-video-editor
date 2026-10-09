import { execFile, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";

const execFileAsync = promisify(execFile);

function findInSystemPath(command: string): string | null {
	const isWindows = process.platform === "win32";
	const exeName = isWindows && !command.endsWith(".exe") ? `${command}.exe` : command;
	const pathEnv = process.env.PATH || process.env.Path || "";
	const dirs = pathEnv.split(path.delimiter);

	for (const dir of dirs) {
		if (!dir) continue;
		const fullPath = path.join(dir, exeName);
		try {
			if (fs.existsSync(fullPath)) {
				return fullPath;
			}
		} catch {}
	}
	return null;
}

function resolveExecutable(candidates: (string | undefined)[], defaultCmd: string): string {
	// 1. Check explicit candidate paths
	for (const candidate of candidates) {
		if (!candidate) continue;
		try {
			if (fs.existsSync(candidate)) {
				return candidate;
			}
		} catch {}
	}

	// 2. Search in system PATH
	const inPath = findInSystemPath(defaultCmd);
	if (inPath) {
		return inPath;
	}

	// 3. Fallback to command name
	const isWindows = process.platform === "win32";
	return isWindows && !defaultCmd.endsWith(".exe") ? `${defaultCmd}.exe` : defaultCmd;
}

const localAppData = process.env.LOCALAPPDATA || process.env.LocalAppData || "";

const YTDLP_CANDIDATES = [
	process.env.YTDLP_PATH,
	// Prefer system PATH first before hardcoded folders
	findInSystemPath("yt-dlp") || undefined,
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
];

const FFMPEG_CANDIDATES = [
	process.env.FFMPEG_PATH,
	findInSystemPath("ffmpeg") || undefined,
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
	const args = [
		"--dump-json",
		"--no-playlist",
		"--skip-download",
		"--no-warnings",
		"--socket-timeout",
		"20",
		"--extractor-args",
		"youtube:player_client=default,ios,mweb",
		url,
	];

	try {
		const { stdout } = await execFileAsync(ytdlp, args, { maxBuffer: 25 * 1024 * 1024 });
		const data = JSON.parse(stdout.trim().split("\n")[0] || "{}");

		return {
			title: data.title || "Downloaded Video",
			duration: typeof data.duration === "number" ? data.duration : undefined,
			thumbnail: data.thumbnail || data.thumbnails?.[0]?.url,
			uploader: data.uploader || data.channel,
			webpageUrl: data.webpage_url || url,
		};
	} catch (err: any) {
		console.warn("Get video info note:", err?.message || err);
		return {
			title: "Online Video",
			webpageUrl: url,
		};
	}
}

export interface DownloadProgressInfo {
	percent: number;
	speed?: string;
	eta?: string;
	stage: "initializing" | "downloading" | "processing" | "completed";
	message?: string;
}

/**
 * 1. Download video from any URL with progress streaming
 */
export async function downloadVideoFromLink(
	url: string,
	outputDirectory: string,
	onProgress?: (info: DownloadProgressInfo) => void,
): Promise<{ filePath: string; title: string }> {
	const ytdlp = resolveExecutable(YTDLP_CANDIDATES, "yt-dlp");
	const ffmpeg = resolveExecutable(FFMPEG_CANDIDATES, "ffmpeg");
	const outputTemplate = path.join(outputDirectory, "%(title).50s-%(id)s.%(ext)s").replace(/\\/g, "/");

	const args = [
		url,
		"--no-playlist",
		"--no-warnings",
		"--newline",
		"--socket-timeout",
		"30",
		"--retries",
		"5",
		"--fragment-retries",
		"5",
		"--extractor-args",
		"youtube:player_client=default,ios,mweb",
		"-f",
		"bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080][ext=mp4]/best[height<=1080]/best",
		"--merge-output-format",
		"mp4",
		"-o",
		outputTemplate,
	];

	args.push("--newline");

	if (ffmpeg && fs.existsSync(ffmpeg)) {
		args.push("--ffmpeg-location", path.dirname(ffmpeg));
	}

	let ytdlpError = "";
	await new Promise<void>((resolve, reject) => {
		onProgress?.({
			percent: 0,
			stage: "initializing",
			message: "Connecting to media stream...",
		});

		const child = spawn(ytdlp, args, {
			cwd: outputDirectory,
			shell: false,
		});

		let maxPercent = 0;
		let downloadPhase: "video" | "audio" | "merging" = "video";
		let streamsSeen = 0;

		const handleOutput = (data: Buffer | string) => {
			const str = data.toString();

			if (str.includes("[Merger]") || str.includes("Merging formats")) {
				downloadPhase = "merging";
				maxPercent = Math.max(maxPercent, 94);
				onProgress?.({
					percent: maxPercent,
					stage: "processing",
					message: "Merging video and audio streams...",
				});
				return;
			}

			if (str.includes("[download] Destination:")) {
				streamsSeen++;
				if (streamsSeen > 1 || str.includes(".m4a") || str.includes(".f140") || str.includes(".mp3")) {
					downloadPhase = "audio";
				}
			}

			// Parse percentage matches
			const matches = [...str.matchAll(/(\d+(?:\.\d+)?)%/g)];
			if (matches.length > 0) {
				const lastMatch = matches[matches.length - 1];
				const rawPercent = Math.min(100, Math.max(0, parseFloat(lastMatch[1])));
				const speedMatch = str.match(/at\s+([^\s]+(?:B|iB)\/s)/i);
				const etaMatch = str.match(/ETA\s+([0-9:]+)/i);

				let calculatedPercent = rawPercent;
				if (downloadPhase === "video") {
					// Video stream occupies 0% - 75%
					calculatedPercent = rawPercent * 0.75;
				} else if (downloadPhase === "audio") {
					// Audio stream occupies 75% - 93%
					calculatedPercent = 75 + rawPercent * 0.18;
				} else {
					calculatedPercent = 94 + (rawPercent / 100) * 4;
				}

				// Strictly monotonic: never decrease
				maxPercent = Math.min(99, Math.max(maxPercent, calculatedPercent));

				const phaseText =
					downloadPhase === "video"
						? "Downloading video stream"
						: downloadPhase === "audio"
							? "Downloading audio stream"
							: "Processing media";

				onProgress?.({
					percent: Number(maxPercent.toFixed(1)),
					speed: speedMatch?.[1],
					eta: etaMatch?.[1],
					stage: "downloading",
					message: `${phaseText} (${maxPercent.toFixed(0)}%)...`,
				});
			}
		};

		child.stdout?.on("data", handleOutput);
		child.stderr?.on("data", (data) => {
			const str = data.toString();
			ytdlpError += str;
			if (str.includes("%")) {
				handleOutput(data);
			}
		});

		child.on("error", (err) => {
			reject(err);
		});

		child.on("close", () => {
			resolve();
		});
	});

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
		if (ytdlpError) {
			if (ytdlpError.includes("429") || ytdlpError.includes("Too Many Requests")) {
				throw new Error("YouTube is temporarily rate-limiting requests (HTTP 429). Please wait a moment or try another video.");
			}
			if (ytdlpError.includes("Private video") || ytdlpError.includes("Sign in")) {
				throw new Error("This video is private, restricted, or requires login.");
			}
			if (ytdlpError.includes("unreachable network") || ytdlpError.includes("getaddrinfo failed")) {
				throw new Error("Network connection error. Please check your internet connection.");
			}
			const lines = ytdlpError.split("\n").map((l) => l.trim()).filter(Boolean);
			const errorLine = lines.find((l) => l.includes("ERROR:")) || lines[lines.length - 1];
			if (errorLine) {
				throw new Error(errorLine.replace(/^ERROR:\s*/, ""));
			}
		}
		throw new Error("Unable to download media from the specified link. Please verify the URL.");
	}

	let targetPath = validFiles[0];

	// If output is not mp4, remux or transcode to mp4 for browser playback
	if (path.extname(targetPath).toLowerCase() !== ".mp4") {
		onProgress?.({
			percent: 95,
			stage: "processing",
			message: "Converting to MP4 for browser compatibility...",
		});
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

	onProgress?.({
		percent: 100,
		stage: "completed",
		message: "Download complete!",
	});

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
