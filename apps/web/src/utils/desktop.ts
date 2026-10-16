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

export const PRODUCTION_SITE_URL = "https://ambercut.vercel.app";

/**
 * Get public web app base URL suitable for external browser sign in.
 * External browser OAuth flow must always point to the live hosted application
 * (https://ambercut.vercel.app) where Firebase Google Auth is securely configured.
 */
export function getAuthBaseUrl(): string {
	// 1. If an explicit environment variable is set and is NOT localhost, use it
	const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
	if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
		return envUrl.replace(/\/+$/, "");
	}

	// 2. If running inside a live browser on a production HTTPS domain (not localhost/tauri)
	if (typeof window !== "undefined") {
		const origin = window.location.origin;
		if (
			origin.startsWith("https://") &&
			!origin.includes("localhost") &&
			!origin.includes("tauri")
		) {
			return origin.replace(/\/+$/, "");
		}
	}

	// 3. For desktop app (Tauri) and local dev, always direct external browser
	// to the live production web app https://ambercut.vercel.app
	return PRODUCTION_SITE_URL;
}
