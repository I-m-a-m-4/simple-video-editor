import type { NextRequest } from "next/server";

export const dynamic = "force-static";

export function generateStaticParams() {
	return [{ all: ["session"] }];
}

export async function GET(request: NextRequest) {
	if (process.env.TAURI_EXPORT === "true") {
		return new Response(JSON.stringify({}), {
			headers: { "Content-Type": "application/json" },
		});
	}
	const { auth } = await import("@/auth/server");
	const { toNextJsHandler } = await import("better-auth/next-js");
	return toNextJsHandler(auth).GET(request);
}

export async function POST(request: NextRequest) {
	if (process.env.TAURI_EXPORT === "true") {
		return new Response(JSON.stringify({}), {
			headers: { "Content-Type": "application/json" },
		});
	}
	const { auth } = await import("@/auth/server");
	const { toNextJsHandler } = await import("better-auth/next-js");
	return toNextJsHandler(auth).POST(request);
}
