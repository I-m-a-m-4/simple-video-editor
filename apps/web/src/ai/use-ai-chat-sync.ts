"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAiStore } from "./store";

/**
 * Hook to sync AI chat messages with Firebase when the project changes.
 * Must be rendered inside a route that has `[project_id]` param.
 */
export function useAiChatSync() {
	const params = useParams();
	const projectId = params?.project_id as string | undefined;
	const loadFromFirebase = useAiStore((s) => s.loadFromFirebase);
	const currentProjectId = useAiStore((s) => s.projectId);

	useEffect(() => {
		if (!projectId) return;
		// Only load when the project actually changes
		if (projectId === currentProjectId) return;

		loadFromFirebase(projectId);
	}, [projectId, currentProjectId, loadFromFirebase]);
}
