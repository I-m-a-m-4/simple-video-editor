import { NextResponse } from "next/server";
import { getVideoInfo } from "@/services/media-grabber/video-processor";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const url = searchParams.get("url");

		if (!url) {
			return NextResponse.json(
				{ error: "URL query parameter is required" },
				{ status: 400 },
			);
		}

		const info = await getVideoInfo(url);
		return NextResponse.json({ success: true, ...info });
	} catch (error: any) {
		console.error("Failed to get video info:", error);
		return NextResponse.json(
			{
				error: error?.message || "Failed to parse video link",
			},
			{ status: 500 },
		);
	}
}
