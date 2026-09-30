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
	smartSuggestionsCount: 142,
	colorBetterCount: 89,
	colorConsistentCount: 64,
	volumeConsistentCount: 118,
	voiceClearerCount: 173,
	videoHdCount: 97,
	faceRetouchCount: 52,
	exportCount: 384,
	audioTracksCount: 221,
	transactionsCount: 14,
	events: [
		{
			id: "evt-init-1",
			type: "voice_clearer",
			name: "Voice Clarity Filter",
			timestamp: "2 mins ago",
			details: "Web Audio DSP high-pass & vocal boost applied to dialogue track",
		},
		{
			id: "evt-init-2",
			type: "smart_suggestions",
			name: "Smart Suggestions Analysis",
			timestamp: "7 mins ago",
			details: "AI timeline scan completed with 3 automated recommendations",
		},
		{
			id: "evt-init-3",
			type: "volume_consistent",
			name: "Dynamic Gain Leveling",
			timestamp: "12 mins ago",
			details: "Multi-track audio normalized to standard 0 dB loudness target",
		},
		{
			id: "evt-init-4",
			type: "color_better",
			name: "AI Color Enhancement",
			timestamp: "25 mins ago",
			details: "Vibrancy and saturation boosted across 4 video timeline clips",
		},
		{
			id: "evt-init-5",
			type: "face_retouch",
			name: "Face Retouch & Smoothing",
			timestamp: "42 mins ago",
			details: "Facial contouring and skin smoothing applied to interview portrait",
		},
		{
			id: "evt-init-6",
			type: "video_hd",
			name: "Super-Resolution HD",
			timestamp: "1 hour ago",
			details: "Upscale sharpening enabled for 4K video export canvas",
		},
	],
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
