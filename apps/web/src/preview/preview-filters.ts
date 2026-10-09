/**
 * Computes hardware-accelerated CSS filters for real-time video/image preview.
 */
export function computeElementCssFilter(params?: Record<string, any> | null): string {
	if (!params) return "none";
	const filters: string[] = [];

	// 1. Creative Filter Presets (Preset specific grading)
	if (params.filterPreset) {
		switch (params.filterPreset) {
			case "cinema-warm":
				filters.push("sepia(0.18)", "saturate(1.22)", "contrast(1.12)", "brightness(1.03)");
				break;
			case "teal-orange":
				filters.push("contrast(1.22)", "saturate(1.28)", "hue-rotate(-8deg)");
				break;
			case "cyber-neon":
				filters.push("contrast(1.3)", "saturate(1.42)", "hue-rotate(18deg)");
				break;
			case "vintage-film":
				filters.push("sepia(0.24)", "contrast(1.1)", "brightness(1.04)", "saturate(0.95)");
				break;
			case "noir-bw":
				filters.push("grayscale(1)", "contrast(1.35)", "brightness(1.02)");
				break;
			case "vivid-pop":
				filters.push("saturate(1.48)", "contrast(1.16)");
				break;
			default:
				break;
		}
	}

	// 2. Color Enhancement / Vibrancy
	if (params.colorEnhance) {
		const vib = typeof params.vibrancy === "number" ? params.vibrancy : 1.25;
		const sat = typeof params.saturation === "number" ? params.saturation : 1.2;
		const con = typeof params.contrast === "number" ? params.contrast : 1.08;
		const bri = typeof params.brightness === "number" ? params.brightness : 1.02;

		filters.push(`saturate(${Math.round(sat * vib * 100)}%)`);
		filters.push(`contrast(${Math.round(con * 100)}%)`);
		filters.push(`brightness(${Math.round(bri * 100)}%)`);
	} else {
		if (typeof params.saturation === "number" && params.saturation !== 1) {
			filters.push(`saturate(${Math.round(params.saturation * 100)}%)`);
		}
		if (typeof params.contrast === "number" && params.contrast !== 1) {
			filters.push(`contrast(${Math.round(params.contrast * 100)}%)`);
		}
		if (typeof params.brightness === "number" && params.brightness !== 1) {
			filters.push(`brightness(${Math.round(params.brightness * 100)}%)`);
		}
	}

	// 3. Color Consistency (Exposure & White balance auto-match)
	if (params.colorConsistent) {
		filters.push("contrast(106%)", "brightness(102%)", "sepia(4%)");
	}

	// 4. Super-Resolution Sharpening (HD)
	if (params.hdSharpen || params.superResolution) {
		filters.push("contrast(112%)", "brightness(101%)");
	}

	// 5. Face Retouch (Soft beauty glow & tone)
	if (params.faceRetouch) {
		filters.push("brightness(103%)", "contrast(98%)");
	}

	// Temperature / Warmth
	if (typeof params.temperature === "number" && params.temperature !== 0) {
		const temp = params.temperature;
		if (temp > 0) {
			filters.push(`sepia(${Math.min(30, Math.round(temp * 0.8))}%)`);
		} else {
			filters.push(`hue-rotate(${Math.max(-20, Math.round(temp * 0.5))}deg)`);
		}
	}

	return filters.length > 0 ? filters.join(" ") : "none";
}
