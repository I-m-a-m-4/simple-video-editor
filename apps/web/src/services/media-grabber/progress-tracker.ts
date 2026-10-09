export interface DownloadProgress {
	percent: number;
	speed?: string;
	eta?: string;
	stage: "initializing" | "downloading" | "processing" | "completed" | "error";
	message?: string;
	updatedAt: number;
}

const progressStore = new Map<string, DownloadProgress>();

export function setDownloadProgress(id: string, progress: Omit<DownloadProgress, "updatedAt">): void {
	progressStore.set(id, {
		...progress,
		updatedAt: Date.now(),
	});
}

export function getDownloadProgress(id: string): DownloadProgress | undefined {
	return progressStore.get(id);
}

export function clearDownloadProgress(id: string): void {
	progressStore.delete(id);
}

// Garbage collect entries older than 15 minutes
if (typeof setInterval !== "undefined") {
	setInterval(() => {
		const now = Date.now();
		for (const [id, item] of progressStore.entries()) {
			if (now - item.updatedAt > 15 * 60 * 1000) {
				progressStore.delete(id);
			}
		}
	}, 60 * 1000);
}
