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
	const { isAuthenticated, isLoading } = useAuth();

	useEffect(() => {
		if (isTauriEnvironment() && !isLoading) {
			if (isAuthenticated) {
				router.replace("/projects");
			} else {
				router.replace("/login");
			}
		}
	}, [isAuthenticated, isLoading, router]);

	return null;
}
