import { NextResponse } from "next/server";
import { getDownloadProgress } from "@/services/media-grabber/progress-tracker";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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
