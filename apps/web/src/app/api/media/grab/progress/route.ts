import { NextResponse } from "next/server";
import { getDownloadProgress } from "@/services/media-grabber/progress-tracker";

export const dynamic = "force-static";

export async function GET(request: Request) {
	if (process.env.TAURI_EXPORT === "true") {
		return NextResponse.json({
			success: true,
			progress: {
				percent: 0,
				stage: "idle",
				message: "",
			},
		});
	}
	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");

	if (!id) {
		return NextResponse.json({ error: "id is required" }, { status: 400 });
	}

	const progress = getDownloadProgress(id);
	return NextResponse.json({
		success: true,
		progress: progress || {
			percent: 0,
			stage: "initializing",
			message: "Connecting to stream...",
		},
	});
}
