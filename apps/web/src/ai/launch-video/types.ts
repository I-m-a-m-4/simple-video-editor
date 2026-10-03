export type LaunchThemeId =
	| "obsidian-amber"
	| "cyber-cyan"
	| "deep-violet"
	| "minimal-light";

export type LaunchAspectRatio = "16:9" | "9:16" | "1:1";

export interface LaunchThemeConfig {
	id: LaunchThemeId;
	name: string;
	canvasBg: string;
	textPrimary: string;
	textSecondary: string;
	textAccent: string;
	badgeBg: string;
	badgeBorder: string;
	cardBg: string;
	fontFamily: string;
}

export const LAUNCH_THEMES: Record<LaunchThemeId, LaunchThemeConfig> = {
	"obsidian-amber": {
		id: "obsidian-amber",
		name: "Obsidian Amber",
		canvasBg: "#09090b",
		textPrimary: "#f8fafc",
		textSecondary: "#94a3b8",
		textAccent: "#f59e0b",
		badgeBg: "#272010",
		badgeBorder: "#f59e0b",
		cardBg: "#18181b",
		fontFamily: "Outfit",
	},
	"cyber-cyan": {
		id: "cyber-cyan",
		name: "Cyber Cyan",
		canvasBg: "#030712",
		textPrimary: "#ffffff",
		textSecondary: "#9ca3af",
		textAccent: "#06b6d4",
		badgeBg: "#082f49",
		badgeBorder: "#06b6d4",
		cardBg: "#111827",
		fontFamily: "Inter",
	},
	"deep-violet": {
		id: "deep-violet",
		name: "Deep Violet",
		canvasBg: "#0b0814",
		textPrimary: "#fdf4ff",
		textSecondary: "#c084fc",
		textAccent: "#ec4899",
		badgeBg: "#2e1065",
		badgeBorder: "#a855f7",
		cardBg: "#1e1136",
		fontFamily: "Inter",
	},
	"minimal-light": {
		id: "minimal-light",
		name: "Clean Monochrome",
		canvasBg: "#121214",
		textPrimary: "#ffffff",
		textSecondary: "#a1a1aa",
		textAccent: "#ffffff",
		badgeBg: "#27272a",
		badgeBorder: "#52525b",
		cardBg: "#1f1f23",
		fontFamily: "Inter",
	},
};

export type LaunchSceneLayout =
	| "hook-reveal"
	| "hero-headline"
	| "code-demo"
	| "bento-metrics"
	| "architecture"
	| "cta-outro";

export interface BentoStatCard {
	stat: string;
	label: string;
	description?: string;
}

export interface LaunchSceneDefinition {
	id: string;
	name: string;
	layout: LaunchSceneLayout;
	durationSec: number;
	badge?: {
		text: string;
		color?: string;
		bgColor?: string;
	};
	headline: {
		text: string;
		fontSize?: number;
		color?: string;
		fontWeight?: "normal" | "bold";
	};
	subheadline?: {
		text: string;
		fontSize?: number;
		color?: string;
	};
	bentoCards?: BentoStatCard[];
	screenRecording?: {
		label: string;
		preferredAssetId?: string;
		position?: "center" | "right";
		scale?: number;
	};
	voiceoverScript?: string;
}

export interface LaunchVideoBlueprint {
	title: string;
	description?: string;
	theme: LaunchThemeId;
	aspectRatio: LaunchAspectRatio;
	scenes: LaunchSceneDefinition[];
}
