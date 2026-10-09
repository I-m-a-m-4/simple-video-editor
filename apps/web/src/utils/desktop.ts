/**
 * Utility functions for desktop environment detection and native interactions (Tauri)
 */

export function isDesktopApp(): boolean {
	if (typeof window === "undefined") return false;
	return (
		"__TAURI_INTERNALS__" in window ||
		"__TAURI__" in window ||
		navigator.userAgent.includes("Tauri")
	);
}

/**
 * Open a URL in the user's default system web browser (Chrome, Edge, Firefox, Safari)
 */
export async function openInExternalBrowser(url: string): Promise<boolean> {
	if (typeof window === "undefined") return false;

	// 1. Try Tauri v2 opener plugin via window.__TAURI__
	try {
		const tauri = (window as any).__TAURI__;
		if (tauri?.core?.invoke) {
			await tauri.core.invoke("plugin:opener|open_url", { url });
			return true;
		}
	} catch (err) {
		console.warn("Tauri opener open_url via __TAURI__.core.invoke failed:", err);
	}

	// 2. Try Tauri v2 opener plugin via window.__TAURI_INTERNALS__
	try {
		const internals = (window as any).__TAURI_INTERNALS__;
		if (internals?.invoke) {
			await internals.invoke("plugin:opener|open_url", { url });
			return true;
		}
	} catch (err) {
		console.warn("Tauri opener open_url via __TAURI_INTERNALS__.invoke failed:", err);
	}

	// 3. Try custom open_browser command
	try {
		const tauri = (window as any).__TAURI__;
		if (tauri?.core?.invoke) {
			await tauri.core.invoke("open_browser", { url });
			return true;
		}
	} catch (err) {
		console.warn("Tauri open_browser via __TAURI__.core.invoke failed:", err);
	}

	try {
		const internals = (window as any).__TAURI_INTERNALS__;
		if (internals?.invoke) {
			await internals.invoke("open_browser", { url });
			return true;
		}
	} catch (err) {
		console.warn("Tauri open_browser via __TAURI_INTERNALS__.invoke failed:", err);
	}

	// 4. Try alternative open command name
	try {
		const internals = (window as any).__TAURI_INTERNALS__;
		if (internals?.invoke) {
			await internals.invoke("plugin:opener|open", { path: url });
			return true;
		}
	} catch (err) {
		console.warn("Tauri opener open via __TAURI_INTERNALS__.invoke failed:", err);
	}

	// 5. Fallback to standard window.open
	try {
		const win = window.open(url, "_blank", "noopener,noreferrer");
		if (win) return true;
	} catch (err) {
		console.warn("window.open failed:", err);
	}

	return false;
}

/**
 * Get public web app base URL suitable for external browser sign in
 */
export function getAuthBaseUrl(): string {
	if (typeof window !== "undefined") {
		const origin = window.location.origin;
		// If running under Tauri's internal origin (e.g. tauri://localhost or http://tauri.localhost)
		if (origin.startsWith("tauri:") || origin.includes("tauri.localhost")) {
			return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
		}
		if (origin.startsWith("http://") || origin.startsWith("https://")) {
			return origin;
		}
	}
	return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
