"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/auth-context";

export function isTauriEnvironment(): boolean {
	if (typeof window === "undefined") return false;
	return (
		"__TAURI_INTERNALS__" in window ||
		"__TAURI__" in window ||
		window.navigator.userAgent.includes("Tauri") ||
		Boolean((window as unknown as { __TAURI_METADATA__?: unknown }).__TAURI_METADATA__)
	);
}

export function DesktopAutoRedirect() {
	const router = useRouter();

	useEffect(() => {
		if (isTauriEnvironment()) {
			router.replace("/projects");
		}
	}, [router]);

	return null;
}
