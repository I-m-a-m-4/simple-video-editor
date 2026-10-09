import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import {
	downloadVideoFromLink,
	convertToShort,
	getTempDirectory,
} from "@/services/media-grabber/video-processor";
import {
	setDownloadProgress,
	clearDownloadProgress,
} from "@/services/media-grabber/progress-tracker";

export const dynamic = "force-dynamic";

export async function GET() {
	return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
	if (process.env.TAURI_EXPORT === "true") {
		return NextResponse.json(
			{ error: "Not available in desktop" },
			{ status: 400 },
		);
	}

	let sessionDir: string | null = null;
	let currentDownloadId: string | undefined;

	try {
		const body = await request.json();
		const {
			url,
			downloadId,
			convertToShort: shouldConvertToShort = false,
			startTime = "00:00:00",
			duration = 30,
			cropMode = "crop_center",
		} = body;

		currentDownloadId = downloadId;

		if (!url || typeof url !== "string") {
			return NextResponse.json(
				{ error: "A valid video URL is required." },
				{ status: 400 },
			);
		}

		if (downloadId) {
			setDownloadProgress(downloadId, {
				percent: 0,
				stage: "initializing",
				message: "Connecting to media stream...",
			});
		}

		const baseTemp = getTempDirectory();
		sessionDir = path.join(baseTemp, `grab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
		fs.mkdirSync(sessionDir, { recursive: true });

		// Step 1: Download from URL using yt-dlp with progress callback
		const { filePath: downloadedPath, title } = await downloadVideoFromLink(
			url,
			sessionDir,
			downloadId
				? (p) => setDownloadProgress(downloadId, p)
				: undefined,
		);

		let finalFilePath = downloadedPath;
		let finalTitle = title;

		// Step 2: Convert to vertical Short/Reel if requested
		if (shouldConvertToShort) {
			if (downloadId) {
				setDownloadProgress(downloadId, {
					percent: 92,
					stage: "processing",
					message: "Converting to vertical short (9:16)...",
				});
			}
			const shortOutputPath = path.join(sessionDir, `short_${Date.now()}.mp4`);
			await convertToShort({
				inputPath: downloadedPath,
				outputPath: shortOutputPath,
				startTime,
				duration: Number(duration) || 30,
				cropMode,
			});
			finalFilePath = shortOutputPath;
			finalTitle = `${title} (Vertical Short)`;
		}

		if (downloadId) {
			setDownloadProgress(downloadId, {
				percent: 100,
				stage: "completed",
				message: "Finalizing and preparing asset...",
			});
		}

		if (!fs.existsSync(finalFilePath)) {
			throw new Error("Target video output file was not found after processing.");
		}

		const fileBuffer = fs.readFileSync(finalFilePath);
		const safeTitle = finalTitle.replace(/[^a-zA-Z0-9_-]/g, "_");

		// Clean up files in background
		setTimeout(() => {
			if (currentDownloadId) {
				clearDownloadProgress(currentDownloadId);
			}
			if (sessionDir && fs.existsSync(sessionDir)) {
				try {
					fs.rmSync(sessionDir, { recursive: true, force: true });
				} catch (err) {
					console.error("Temp cleanup error:", err);
				}
			}
		}, 10_000);

		return new Response(fileBuffer, {
			status: 200,
			headers: {
				"Content-Type": "video/mp4",
				"Content-Length": fileBuffer.length.toString(),
				"X-Video-Title": encodeURIComponent(finalTitle),
				"Content-Disposition": `attachment; filename="${safeTitle}.mp4"`,
			},
		});
	} catch (error: any) {
		console.error("Media grab error:", error);
		if (currentDownloadId) {
			setDownloadProgress(currentDownloadId, {
				percent: 0,
				stage: "error",
				message: error?.message || "Failed to download and process video.",
			});
		}
		if (sessionDir && fs.existsSync(sessionDir)) {
			try {
				fs.rmSync(sessionDir, { recursive: true, force: true });
			} catch {}
		}
		return NextResponse.json(
			{
				error: error?.message || "Failed to download and process video.",
			},
			{ status: 500 },
		);
	}
}
