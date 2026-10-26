import { db } from "@/services/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export interface TelemetryEvent {
	id: string;
	type:
		| "smart_suggestions"
		| "color_better"
		| "color_consistent"
		| "volume_consistent"
		| "voice_clearer"
		| "video_hd"
		| "face_retouch"
		| "export"
		| "audio_track_added"
		| "payment_completed"
		| "ms_store_launch";
	name: string;
	timestamp: string;
	details?: string;
}

export interface TelemetrySummary {
	smartSuggestionsCount: number;
	colorBetterCount: number;
	colorConsistentCount: number;
	volumeConsistentCount: number;
	voiceClearerCount: number;
	videoHdCount: number;
	faceRetouchCount: number;
	exportCount: number;
	audioTracksCount: number;
	transactionsCount: number;
	totalMicrosoftStoreDownloads: number;
	activeDesktopInstalls: number;
	webAppUsers: number;
	storeRating: number;
	crashFreeRate: number;
	events: TelemetryEvent[];
}

const STORAGE_KEY = "opencut_telemetry_data_v1";

export const INITIAL_BASE: TelemetrySummary = {
	smartSuggestionsCount: 0,
	colorBetterCount: 0,
	colorConsistentCount: 0,
	volumeConsistentCount: 0,
	voiceClearerCount: 0,
	videoHdCount: 0,
	faceRetouchCount: 0,
	exportCount: 0,
	audioTracksCount: 0,
	transactionsCount: 0,
	totalMicrosoftStoreDownloads: 0,
	activeDesktopInstalls: 0,
	webAppUsers: 0,
	storeRating: 5.0,
	crashFreeRate: 100,
	events: [],
};

export function getTelemetryData(): TelemetrySummary {
	if (typeof window === "undefined") return INITIAL_BASE;

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BASE));
			return INITIAL_BASE;
		}
		const parsed = JSON.parse(raw);
		return {
			...INITIAL_BASE,
			...parsed,
			totalMicrosoftStoreDownloads: Number(parsed.totalMicrosoftStoreDownloads) || 0,
			activeDesktopInstalls: Number(parsed.activeDesktopInstalls) || 0,
			webAppUsers: Number(parsed.webAppUsers) || 0,
			storeRating: Number(parsed.storeRating) || 5.0,
			crashFreeRate: Number(parsed.crashFreeRate) || 100,
			events: Array.isArray(parsed.events) ? parsed.events : [],
		};
	} catch (e) {
		return INITIAL_BASE;
	}
}

/**
 * Fetch live aggregated telemetry from Firestore with local fallback
 */
export async function getGlobalTelemetryData(): Promise<TelemetrySummary> {
	const local = getTelemetryData();

	try {
		const docRef = doc(db, "analytics", "overview");
		const snap = await getDoc(docRef);

		if (snap.exists()) {
			const data = snap.data();
			const merged: TelemetrySummary = {
				...local,
				totalMicrosoftStoreDownloads: Number(data.totalMicrosoftStoreDownloads) || local.totalMicrosoftStoreDownloads,
				activeDesktopInstalls: Number(data.totalDesktopInstalls || data.activeDesktopInstalls) || local.activeDesktopInstalls,
				webAppUsers: Number(data.totalWebAppUsers || data.webAppUsers) || local.webAppUsers,
				exportCount: Number(data.totalExports || data.exportCount) || local.exportCount,
				smartSuggestionsCount: Number(data.smartAiTasks || data.smartSuggestionsCount) || local.smartSuggestionsCount,
				storeRating: Number(data.storeRating) || local.storeRating,
				crashFreeRate: Number(data.crashFreeRate) || local.crashFreeRate,
			};
			if (typeof window !== "undefined") {
				try {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
				} catch {}
			}
			return merged;
		}
	} catch (e) {
		console.warn("Could not load Firestore analytics overview:", e);
	}

	return local;
}

export function recordTelemetryEvent(
	type: TelemetryEvent["type"],
	name: string,
	details?: string,
): void {
	if (typeof window === "undefined") return;

	try {
		const current = getTelemetryData();
		const countMap: Record<string, keyof TelemetrySummary> = {
			smart_suggestions: "smartSuggestionsCount",
			color_better: "colorBetterCount",
			color_consistent: "colorConsistentCount",
			volume_consistent: "volumeConsistentCount",
			voice_clearer: "voiceClearerCount",
			video_hd: "videoHdCount",
			face_retouch: "faceRetouchCount",
			export: "exportCount",
			audio_track_added: "audioTracksCount",
			payment_completed: "transactionsCount",
		};

		const countKey = countMap[type];
		if (countKey && typeof current[countKey] === "number") {
			(current[countKey] as number) += 1;
		}

		const newEvent: TelemetryEvent = {
			id: `evt-${Date.now()}-${Math.random().toString(36).substring(7)}`,
			type,
			name,
			timestamp: "Just now",
			details: details || "Desktop / Web Video Editor Client",
		};

		current.events = [newEvent, ...(current.events || []).slice(0, 49)];
		localStorage.setItem(STORAGE_KEY, JSON.stringify(current));

		// Background sync to Firestore analytics
		try {
			const docRef = doc(db, "analytics", "overview");
			setDoc(docRef, {
				totalExports: current.exportCount,
				smartAiTasks: current.smartSuggestionsCount,
				lastActivityAt: serverTimestamp(),
			}, { merge: true }).catch(() => {});
		} catch {}
	} catch (e) {
		console.warn("Failed to record telemetry:", e);
	}
}

export function clearTelemetryData(): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BASE));
	} catch (e) {
		console.warn("Failed to clear telemetry:", e);
	}
}

