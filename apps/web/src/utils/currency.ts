/**
 * Currency & Geolocation Utility for AmberCut
 *
 * Automatically detects if the visitor is located in Nigeria or outside Nigeria.
 * - Nigeria -> Defaults to NGN (₦)
 * - Outside Nigeria -> Defaults to USD ($)
 *
 * Flutterwave natively supports both NGN and USD transactions.
 */

export type SupportedCurrency = "NGN" | "USD";

const CURRENCY_STORAGE_KEY = "ambercut_user_currency";

/**
 * Detects whether the user is located in Nigeria based on timezone and browser locale.
 */
export function isNigerianUser(): boolean {
	if (typeof window === "undefined") {
		return false;
	}

	try {
		// 1. Timezone detection (Africa/Lagos is Nigeria's standard timezone)
		const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
		if (timeZone.toLowerCase().includes("lagos")) {
			return true;
		}

		// 2. Browser locale detection (e.g. en-NG, yo-NG, ha-NG, ig-NG)
		const userLocale = (navigator.language || "").toLowerCase();
		if (userLocale.endsWith("-ng") || userLocale.includes("-ng-")) {
			return true;
		}

		const userLocales = (navigator.languages || []).map((l) => l.toLowerCase());
		if (userLocales.some((l) => l.endsWith("-ng") || l.includes("-ng-"))) {
			return true;
		}
	} catch (err) {
		console.warn("Could not determine user country/timezone:", err);
	}

	return false;
}

/**
 * Gets the active currency. Defaults to NGN for Nigerian visitors and USD for international visitors.
 */
export function detectUserCurrency(): SupportedCurrency {
	if (typeof window === "undefined") {
		return "USD";
	}

	try {
		const stored = localStorage.getItem(CURRENCY_STORAGE_KEY) as SupportedCurrency | null;
		if (stored === "NGN" || stored === "USD") {
			return stored;
		}
	} catch {}

	return isNigerianUser() ? "NGN" : "USD";
}

/**
 * Saves the user's currency preference in localStorage.
 */
export function persistUserCurrency(currency: SupportedCurrency): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
	} catch {}
}
