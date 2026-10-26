import { type NextRequest, NextResponse } from "next/server";

interface DesktopSession {
	id: string;
	code: string;
	status: "pending" | "completed" | "expired";
	user?: {
		id: string;
		name: string;
		email: string;
		image?: string;
	};
	createdAt: number;
}

// Global in-memory cache for desktop auth sessions
const sessions = new Map<string, DesktopSession>();

// Cleanup stale sessions older than 15 minutes
function cleanupOldSessions() {
	const now = Date.now();
	const maxAge = 15 * 60 * 1000;
	for (const [key, session] of sessions.entries()) {
		if (now - session.createdAt > maxAge) {
			sessions.delete(key);
		}
	}
}

export const dynamic = "force-static";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: corsHeaders,
	});
}

export async function GET(req: NextRequest) {
	if (process.env.TAURI_EXPORT === "true") {
		return NextResponse.json({ status: "not_found" }, { headers: corsHeaders });
	}
	cleanupOldSessions();
	const { searchParams } = new URL(req.url);
	const sessionId = searchParams.get("session");
	const code = searchParams.get("code");

	if (!sessionId && !code) {
		return NextResponse.json({ error: "Session ID or code required" }, { status: 400, headers: corsHeaders });
	}

	let matched: DesktopSession | undefined;

	if (sessionId && sessions.has(sessionId)) {
		matched = sessions.get(sessionId);
	} else if (code) {
		for (const session of sessions.values()) {
			if (session.code === code) {
				matched = session;
				break;
			}
		}
	}

	if (!matched) {
		return NextResponse.json({ status: "not_found" }, { status: 404, headers: corsHeaders });
	}

	return NextResponse.json({
		status: matched.status,
		user: matched.user,
		code: matched.code,
	}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
	if (process.env.TAURI_EXPORT === "true") {
		return NextResponse.json({ error: "Not available in desktop" }, { status: 400, headers: corsHeaders });
	}
	cleanupOldSessions();
	try {
		const body = await req.json();
		const { action, sessionId, code, user } = body;

		if (action === "create") {
			if (!sessionId) {
				return NextResponse.json({ error: "Missing sessionId" }, { status: 400, headers: corsHeaders });
			}

			const newSession: DesktopSession = {
				id: sessionId,
				code: code || Math.floor(100000 + Math.random() * 900000).toString(),
				status: "pending",
				createdAt: Date.now(),
			};

			sessions.set(sessionId, newSession);
			return NextResponse.json({ success: true, session: newSession }, { headers: corsHeaders });
		}

		if (action === "complete") {
			if (!sessionId && !code) {
				return NextResponse.json({ error: "Missing sessionId or code" }, { status: 400, headers: corsHeaders });
			}

			let target = sessionId ? sessions.get(sessionId) : undefined;
			if (!target && code) {
				for (const s of sessions.values()) {
					if (s.code === code) {
						target = s;
						break;
					}
				}
			}

			if (!target) {
				// If session wasn't already in in-memory cache, register it directly as completed
				const completedSession: DesktopSession = {
					id: sessionId || `session_${Date.now()}`,
					code: code || "000000",
					status: "completed",
					user,
					createdAt: Date.now(),
				};
				if (sessionId) sessions.set(sessionId, completedSession);
				return NextResponse.json({ success: true, session: completedSession }, { headers: corsHeaders });
			}

			target.status = "completed";
			target.user = user;
			sessions.set(target.id, target);

			return NextResponse.json({ success: true, session: target }, { headers: corsHeaders });
		}

		return NextResponse.json({ error: "Invalid action" }, { status: 400, headers: corsHeaders });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Failed to process" }, { status: 500, headers: corsHeaders });
	}
}
