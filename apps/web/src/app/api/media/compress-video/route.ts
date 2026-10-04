import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import {
	compressVideo,
	getTempDirectory,
} from "@/services/media-grabber/video-processor";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	let sessionDir: string | null = null;
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File | null;
		const qualityPreset = (formData.get("qualityPreset") as any) || "balanced";
		const resolution = (formData.get("resolution") as any) || "original";
		const audioBitrate = (formData.get("audioBitrate") as any) || "96k";

		if (!file) {
			return NextResponse.json(
				{ error: "A video file is required for compression." },
				{ status: 400 },
			);
		}

		const baseTemp = getTempDirectory();
		sessionDir = path.join(
			baseTemp,
			`compress_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
		);
		fs.mkdirSync(sessionDir, { recursive: true });

		const inputExt = path.extname(file.name) || ".mp4";
		const inputPath = path.join(sessionDir, `input${inputExt}`);
		const outputPath = path.join(sessionDir, `compressed_${Date.now()}.mp4`);

		const arrayBuffer = await file.arrayBuffer();
		fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

		const { originalSize, compressedSize } = await compressVideo({
			inputPath,
			outputPath,
			qualityPreset,
			resolution,
			audioBitrate,
		});

		if (!fs.existsSync(outputPath)) {
			throw new Error("Video compression failed to produce an output file.");
		}

		const fileBuffer = fs.readFileSync(outputPath);
		const baseName = path.basename(file.name, inputExt);
		const cleanFileName = `${baseName}_compressed.mp4`;

		// Cleanup files after stream starts
		setTimeout(() => {
			if (sessionDir && fs.existsSync(sessionDir)) {
				try {
					fs.rmSync(sessionDir, { recursive: true, force: true });
				} catch {}
			}
		}, 10_000);

		return new Response(fileBuffer, {
			status: 200,
			headers: {
				"Content-Type": "video/mp4",
				"Content-Length": fileBuffer.length.toString(),
				"X-Original-Size": originalSize.toString(),
				"X-Compressed-Size": compressedSize.toString(),
				"Content-Disposition": `attachment; filename="${cleanFileName}"`,
			},
		});
	} catch (error: any) {
		console.error("Video compression error:", error);
		if (sessionDir && fs.existsSync(sessionDir)) {
			try {
				fs.rmSync(sessionDir, { recursive: true, force: true });
			} catch {}
		}
		return NextResponse.json(
			{
				error: error?.message || "Failed to compress video.",
			},
			{ status: 500 },
		);
	}
}
