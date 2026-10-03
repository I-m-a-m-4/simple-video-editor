export interface CreativeFilter {
	id: string;
	name: string;
	category: "cinematic" | "retro" | "moody" | "vibrant";
	description: string;
	iconColor: string;
	params: {
		colorEnhance?: boolean;
		vibrancy?: number;
		saturation?: number;
		contrast?: number;
		brightness?: number;
		temperature?: number;
		tint?: string;
		filterPreset?: string;
	};
}

export const CREATIVE_FILTERS: CreativeFilter[] = [
	{
		id: "filter-cinema-warm",
		name: "Cinema Warm",
		category: "cinematic",
		description: "Rich cinematic warm highlights with natural golden skin tones",
		iconColor: "#f59e0b",
		params: {
			colorEnhance: true,
			vibrancy: 1.2,
			saturation: 1.1,
			contrast: 1.15,
			brightness: 1.02,
			temperature: 15,
			filterPreset: "cinema-warm",
		},
	},
	{
		id: "filter-teal-orange",
		name: "Teal & Orange",
		category: "cinematic",
		description: "Hollywood blockbuster aesthetic with saturated blues and warm subject tones",
		iconColor: "#06b6d4",
		params: {
			colorEnhance: true,
			vibrancy: 1.35,
			saturation: 1.25,
			contrast: 1.22,
			brightness: 1.0,
			temperature: 5,
			filterPreset: "teal-orange",
		},
	},
	{
		id: "filter-cyber-neon",
		name: "Cyber Neon",
		category: "moody",
		description: "Futuristic nighttime high-contrast with punchy purples and electric blues",
		iconColor: "#a855f7",
		params: {
			colorEnhance: true,
			vibrancy: 1.4,
			saturation: 1.3,
			contrast: 1.28,
			brightness: 0.98,
			filterPreset: "cyber-neon",
		},
	},
	{
		id: "filter-vintage-film",
		name: "Vintage 90s Film",
		category: "retro",
		description: "Classic analog tape warmth with softened black levels and timeless grain feel",
		iconColor: "#d97706",
		params: {
			colorEnhance: true,
			vibrancy: 1.05,
			saturation: 0.95,
			contrast: 1.1,
			brightness: 1.05,
			temperature: 20,
			filterPreset: "vintage-film",
		},
	},
	{
		id: "filter-noir-bw",
		name: "Noir B&W",
		category: "retro",
		description: "High-contrast monochrome with deep shadows and striking highlights",
		iconColor: "#71717a",
		params: {
			colorEnhance: false,
			vibrancy: 0,
			saturation: 0,
			contrast: 1.35,
			brightness: 1.02,
			filterPreset: "noir-bw",
		},
	},
	{
		id: "filter-vivid-pop",
		name: "Vivid Pop",
		category: "vibrant",
		description: "Supercharged colors and brilliant mid-tones designed for social media feeds",
		iconColor: "#ec4899",
		params: {
			colorEnhance: true,
			vibrancy: 1.45,
			saturation: 1.3,
			contrast: 1.18,
			brightness: 1.06,
			filterPreset: "vivid-pop",
		},
	},
];

export interface EndingAnimationPreset {
	id: string;
	name: string;
	description: string;
	duration: number; // in seconds
	type: "fade_out" | "zoom_out" | "slide_down" | "fade_in" | "ken_burns";
}

export const ENDING_ANIMATIONS: EndingAnimationPreset[] = [
	{
		id: "anim-fade-black",
		name: "Fade to Black",
		description: "Smooth cinematic opacity dissolve into darkness over the clip's outro",
		duration: 1.2,
		type: "fade_out",
	},
	{
		id: "anim-zoom-shrink",
		name: "Zoom Out Shrink",
		description: "Scales the video down towards the center with a gentle ease-out curve",
		duration: 1.5,
		type: "zoom_out",
	},
	{
		id: "anim-slide-exit",
		name: "Slide Down Outro",
		description: "Clip slides smoothly down off-screen to close the sequence",
		duration: 1.0,
		type: "slide_down",
	},
	{
		id: "anim-slow-zoom",
		name: "Ken Burns Push In",
		description: "Continuous subtle forward motion (+15% scale) adding dramatic tension",
		duration: 3.0,
		type: "ken_burns",
	},
];
