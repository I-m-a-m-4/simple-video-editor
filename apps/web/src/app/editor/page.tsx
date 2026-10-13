"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import EditorClient from "./[project_id]/editor-client";

function EditorQueryWrapper() {
	const searchParams = useSearchParams();
	const projectId = searchParams?.get("project_id") || searchParams?.get("id") || "default";
	return <EditorClient projectId={projectId} />;
}

export default function EditorRootPage() {
	return (
		<Suspense
			fallback={
				<div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground font-mono text-xs">
					<div className="flex items-center gap-2">
						<span className="size-2 rounded-full bg-orange-500 animate-ping" />
						<span>Loading AmberCut Studio...</span>
					</div>
				</div>
			}
		>
			<EditorQueryWrapper />
		</Suspense>
	);
}
