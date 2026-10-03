"use client";

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
		| "payment_completed";
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
	events: TelemetryEvent[];
}

const STORAGE_KEY = "opencut_telemetry_data_v1";

const INITIAL_BASE: TelemetrySummary = {
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
			events: parsed.events || INITIAL_BASE.events,
		};
	} catch (e) {
		return INITIAL_BASE;
	}
}

export function recordTelemetryEvent(
	type: TelemetryEvent["type"],
	name: string,
	details?: string,
): void {
	if (typeof window === "undefined") return;

	try {
		const current = getTelemetryData();
		const countMap: Record<TelemetryEvent["type"], keyof TelemetrySummary> = {
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
			details,
		};

		current.events = [newEvent, ...(current.events || []).slice(0, 49)];
		localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
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

