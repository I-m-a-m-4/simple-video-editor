"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Sparkles,
	Scissors,
	Type,
	Music,
	Sliders,
	History,
	Eye,
	Play,
	Zap,
	Layers,
	CheckCircle2,
	ChevronRight,
} from "lucide-react";

interface ToolItem {
	name: string;
	description: string;
	category: string;
	example: string;
}

const TOOLS: ToolItem[] = [
	{
		name: "get_timeline_state",
		description: "Inspects full project tracks, durations, element IDs, playhead time, canvas resolution, and selection state.",
		category: "Timeline Inspection",
		example: "Check what clips are on the timeline",
	},
	{
		name: "list_media_assets",
		description: "Retrieves media library items (videos, audios, images) with durations and asset IDs.",
		category: "Media Library",
		example: "Find imported drone footage",
	},
	{
		name: "add_media_to_timeline",
		description: "Inserts a video, audio, or image asset onto a specified or automatic track at any timestamp.",
		category: "Clip Placement",
		example: "Place intro.mp4 at timestamp 00:00",
	},
	{
		name: "split_at_playhead",
		description: "Cuts whatever clip is underneath the current playhead into two distinct editable clips.",
		category: "Timeline Editing",
		example: "Slice current clip right here",
	},
	{
		name: "split_element",
		description: "Cuts a specific element by ID at an exact split timestamp.",
		category: "Timeline Editing",
		example: "Cut clip_2 at 00:08.500",
	},
	{
		name: "trim_element",
		description: "Adjusts the start and end in/out points of a clip while preserving position.",
		category: "Timeline Editing",
		example: "Trim the first 3 seconds off clip_1",
	},
	{
		name: "move_element",
		description: "Relocates a clip to a new start time or moves it across tracks.",
		category: "Timeline Editing",
		example: "Shift ending clip to 00:30",
	},
	{
		name: "set_element_duration",
		description: "Modifies the active duration of an element on the timeline.",
		category: "Timeline Editing",
		example: "Extend title duration to 6 seconds",
	},
	{
		name: "add_text",
		description: "Creates styled text layers with custom content, font family, font size, color, and alignment.",
		category: "Graphics & Text",
		example: "Overlay bold yellow title 'EPIC VLOG'",
	},
	{
		name: "update_element_params",
		description: "Fine-tunes element scale, position (x, y), rotation, opacity (0-1), volume, and muting.",
		category: "Transforms & Volume",
		example: "Shrink clip to 50% and position in bottom-right",
	},
	{
		name: "add_audio_from_url",
		description: "Fetches and places background music or sound effects directly from a web audio URL.",
		category: "Audio & Music",
		example: "Add synthwave soundtrack from URL",
	},
	{
		name: "list_available_effects",
		description: "Discovers all supported GPU shader effects (blur, color grading, adjustments).",
		category: "GPU Effects",
		example: "Query what effects can be applied",
	},
	{
		name: "add_effect",
		description: "Attaches a GPU shader effect onto any video or graphic element.",
		category: "GPU Effects",
		example: "Apply gaussian blur effect to background",
	},
	{
		name: "update_effect_params",
		description: "Adjusts effect intensity or custom shader parameters in real time.",
		category: "GPU Effects",
		example: "Increase blur radius to 25px",
	},
	{
		name: "remove_effect",
		description: "Detaches an effect instance from an element.",
		category: "GPU Effects",
		example: "Remove color grading effect",
	},
	{
		name: "seek_playhead",
		description: "Jumps the scrubber to an exact timestamp in seconds.",
		category: "Playback Engine",
		example: "Jump playhead to second 12.5",
	},
	{
		name: "toggle_playback",
		description: "Starts or pauses timeline preview playback.",
		category: "Playback Engine",
		example: "Play the video preview",
	},
	{
		name: "select_elements",
		description: "Selects one or more clips for batch editing or inspection.",
		category: "Selection Engine",
		example: "Select all clips on track 2",
	},
	{
		name: "undo",
		description: "Reverts the previous edit action on the timeline history stack.",
		category: "History Engine",
		example: "Undo the last split operation",
	},
	{
		name: "redo",
		description: "Re-applies the reverted edit action.",
		category: "History Engine",
		example: "Redo previous timeline change",
	},
];

const CATEGORIES = [
	"All (21)",
	"Timeline Editing",
	"Graphics & Text",
	"Transforms & Volume",
	"Audio & Music",
	"GPU Effects",
	"Playback Engine",
];

export function AiAgentSection() {
	const [selectedCategory, setSelectedCategory] = useState("All (21)");
	const [activePromptIndex, setActivePromptIndex] = useState(0);

	const sampleWorkflows = [
		{
			title: "Automatic Jump-Cut & Polish",
			prompt: "Inspect the timeline, cut the silent portion at 00:03.50, and overlay a bold title 'SMASH THE LIKE BUTTON'.",
			tools: ["get_timeline_state", "split_element", "trim_element", "add_text"],
			result: "Clean cut executed at 3.5s with text overlay on Track 2",
		},
		{
			title: "Cinematic B-Roll Overlay",
			prompt: "Mute the background audio, add lo-fi soundtrack from URL, and apply a subtle blur to the opening 4 seconds.",
			tools: ["update_element_params", "add_audio_from_url", "add_effect", "update_effect_params"],
			result: "Volume set to 0%, audio URL attached to Track 3, blur effect initialized",
		},
		{
			title: "Picture-in-Picture Gaming Layout",
			prompt: "Scale webcam clip to 35%, position it in the top-right corner, and extend its duration to match the main gameplay.",
			tools: ["get_timeline_state", "update_element_params", "set_element_duration"],
			result: "Transform position updated to (x: 520, y: -280) with scale 0.35",
		},
	];

	const filteredTools =
		selectedCategory === "All (21)"
			? TOOLS
			: TOOLS.filter(
					(t) =>
						t.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
						(selectedCategory === "Timeline Editing" &&
							(t.category === "Timeline Inspection" ||
								t.category === "Media Library" ||
								t.category === "Clip Placement" ||
								t.category === "Timeline Editing")),
				);

	return (
		<section id="ai-agent" className="relative py-20 bg-background/50 border-t border-border/40">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
				<div className="text-center max-w-3xl mx-auto">
					<Badge variant="outline" className="gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 border-amber-500/30">
						<Sparkles className="size-3.5" />
						Groq Agentic Architecture
					</Badge>
					<h2 className="mt-4 text-3xl font-extrabold sm:text-5xl tracking-tight">
						The AI Doesn&apos;t Just Chat. <br />
						<span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
							It Operates The Timeline.
						</span>
					</h2>
					<p className="mt-4 text-base sm:text-lg text-muted-foreground font-light leading-relaxed">
						Unlike chat wrappers that only talk, Simple Video Editor provides Groq AI with 21 direct programmatic tool handles.
						The agent inspects project state, performs edits, verifies the result, and loops until your instruction is fully realized.
					</p>
				</div>

				{/* Interactive Workflow Simulation */}
				<div className="mt-14 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-md shadow-xl">
					<div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
						Live Agent Execution Simulator
					</div>

					{/* Workflow Selector Tabs */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
						{sampleWorkflows.map((workflow, idx) => (
							<button
								key={workflow.title}
								type="button"
								onClick={() => setActivePromptIndex(idx)}
								className={`rounded-xl p-3 text-left transition-all border ${
									activePromptIndex === idx
										? "border-primary/60 bg-primary/10 shadow-sm"
										: "border-border/40 bg-background/40 hover:bg-background/80"
								}`}
							>
								<div className="text-xs font-semibold text-foreground flex items-center justify-between">
									<span>{workflow.title}</span>
									{activePromptIndex === idx && <Sparkles className="size-3.5 text-amber-400" />}
								</div>
								<div className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
									{workflow.prompt}
								</div>
							</button>
						))}
					</div>

					{/* Workflow Execution Details */}
					<div className="rounded-xl border border-border/40 bg-background/90 p-5 space-y-4">
						<div>
							<div className="text-[11px] uppercase tracking-wider text-primary font-mono font-semibold">User Command</div>
							<p className="mt-1 text-sm font-medium text-foreground">
								&ldquo;{sampleWorkflows[activePromptIndex].prompt}&rdquo;
							</p>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-border/40">
							{sampleWorkflows[activePromptIndex].tools.map((tool) => (
								<div
									key={tool}
									className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/60 px-3 py-2 text-xs font-mono"
								>
									<CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
									<span className="truncate text-foreground/90">{tool}()</span>
								</div>
							))}
						</div>

							<div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 flex items-center justify-between text-xs text-emerald-400">
								<span><strong>Outcome:</strong> {sampleWorkflows[activePromptIndex].result}</span>
								<span className="text-[10px] font-mono opacity-80">&lt; 380ms Groq Inference</span>
							</div>
					</div>
				</div>

				{/* 21 Tools Catalog Filter & Grid */}
				<div className="mt-16">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
						<div>
							<h3 className="text-xl font-bold tracking-tight text-foreground">
								Full Catalog of 21 Agentic Tools
							</h3>
							<p className="text-xs text-muted-foreground mt-0.5">
								Directly bound to the Rust &amp; WebAssembly timeline core.
							</p>
						</div>

						{/* Category Pills */}
						<div className="flex flex-wrap gap-1.5">
							{CATEGORIES.map((cat) => (
								<button
									key={cat}
									type="button"
									onClick={() => setSelectedCategory(cat)}
									className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
										selectedCategory === cat
											? "bg-primary text-primary-foreground shadow-sm"
											: "bg-muted/60 text-muted-foreground hover:bg-muted"
									}`}
								>
									{cat}
								</button>
							))}
						</div>
					</div>

					{/* Tool Cards Grid */}
					<div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{filteredTools.map((tool) => (
							<Card
								key={tool.name}
								className="border-border/50 bg-card/50 hover:bg-card/80 transition-all hover:border-primary/40 shadow-sm"
							>
								<CardContent className="p-4 space-y-2">
									<div className="flex items-center justify-between">
										<code className="text-xs font-bold text-amber-400 font-mono">
											{tool.name}
										</code>
										<Badge variant="outline" className="text-[10px] py-0 border-border/60">
											{tool.category}
										</Badge>
									</div>
									<p className="text-xs text-muted-foreground leading-relaxed">
										{tool.description}
									</p>
									<div className="pt-1 text-[11px] text-foreground/75 font-mono flex items-center gap-1.5">
										<span className="text-muted-foreground">Ex:</span>
										<span className="italic truncate">&quot;{tool.example}&quot;</span>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
