import EditorClient from "./editor-client";

export function generateStaticParams() {
	return [{ project_id: "default" }];
}

export default async function EditorPage({
	params,
}: {
	params: Promise<{ project_id: string }>;
}) {
	const resolvedParams = await params;
	return <EditorClient projectId={resolvedParams?.project_id} />;
}
