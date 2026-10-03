const TICKS_PER_SECOND = 120_000;

/**
 * Format media duration in ticks into a readable time string (MM:SS or HH:MM:SS).
 * Implemented in pure TypeScript so it can run safely in SSR and client environments
 * without requiring the WebAssembly module to be initialized.
 */
export function formatMediaDuration({
	duration,
}: {
	duration: number | undefined;
}): string | null {
	if (duration === undefined) return null;
	const totalSeconds = Math.max(0, Math.floor(duration / TICKS_PER_SECOND));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
	}
	return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
