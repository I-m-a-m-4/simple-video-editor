import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { webEnv } from "@/env/web";

let redis: Redis | null = null;
let baseRateLimit: Ratelimit | null = null;

try {
	if (webEnv.UPSTASH_REDIS_REST_URL && webEnv.UPSTASH_REDIS_REST_TOKEN) {
		redis = new Redis({
			url: webEnv.UPSTASH_REDIS_REST_URL,
			token: webEnv.UPSTASH_REDIS_REST_TOKEN,
		});

		baseRateLimit = new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(100, "1 m"),
			analytics: false,
			prefix: "rate-limit",
		});
	}
} catch {
	// Redis client initialization skipped
}

let warnedOffline = false;

export async function checkRateLimit({ request }: { request: Request }) {
	if (!baseRateLimit) {
		return { success: true, limited: false };
	}

	try {
		const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
		// Timeout after 300ms if Redis is unreachable to avoid blocking requests
		const timeoutPromise = new Promise<{ success: boolean }>((_, reject) =>
			setTimeout(() => reject(new Error("Rate limit timeout")), 300)
		);

		const { success } = await Promise.race([baseRateLimit.limit(ip), timeoutPromise]);
		return { success, limited: !success };
	} catch {
		if (!warnedOffline) {
			warnedOffline = true;
			console.warn(
				`[RateLimit] Redis is unreachable at ${webEnv.UPSTASH_REDIS_REST_URL || "configured URL"}. Rate limiting bypassed.`
			);
		}
		// Fail open when rate limit service is unavailable (e.g. local dev without Docker)
		return { success: true, limited: false };
	}
}
