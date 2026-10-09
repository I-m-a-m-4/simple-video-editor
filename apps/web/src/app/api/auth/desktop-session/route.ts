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

export async function GET(req: NextRequest) {
	cleanupOldSessions();
	const { searchParams } = new URL(req.url);
	const sessionId = searchParams.get("session");
	const code = searchParams.get("code");

	if (!sessionId && !code) {
		return NextResponse.json({ error: "Session ID or code required" }, { status: 400 });
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
		return NextResponse.json({ status: "not_found" }, { status: 404 });
	}

	return NextResponse.json({
		status: matched.status,
		user: matched.user,
		code: matched.code,
	});
}

export async function POST(req: NextRequest) {
	cleanupOldSessions();
	try {
		const body = await req.json();
		const { action, sessionId, code, user } = body;

		if (action === "create") {
			if (!sessionId) {
				return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
			}

			const newSession: DesktopSession = {
				id: sessionId,
				code: code || Math.floor(100000 + Math.random() * 900000).toString(),
				status: "pending",
				createdAt: Date.now(),
			};

			sessions.set(sessionId, newSession);
			return NextResponse.json({ success: true, session: newSession });
		}

		if (action === "complete") {
			if (!sessionId && !code) {
				return NextResponse.json({ error: "Missing sessionId or code" }, { status: 400 });
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
				return NextResponse.json({ success: true, session: completedSession });
			}

			target.status = "completed";
			target.user = user;
			sessions.set(target.id, target);

			return NextResponse.json({ success: true, session: target });
		}

		return NextResponse.json({ error: "Invalid action" }, { status: 400 });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Failed to process" }, { status: 500 });
	}
}
