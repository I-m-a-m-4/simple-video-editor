"use client";

import { useState } from "react";
import {
	Rocket,
	Sparkles,
	Video,
	Monitor,
	Play,
	Sliders,
	CheckCircle2,
	Palette,
	Maximize2,
	Layers,
	FileText,
	ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEditor } from "@/editor/use-editor";
import { useAiStore } from "../store";
import {
	buildLaunchVideoOnTimeline,
	generateLaunchBlueprintWithGroq,
	SAAS_LAUNCH_BLUEPRINT,
	TYPESAFE_JEV_LAUNCH_BLUEPRINT,
	LAUNCH_THEMES,
	type LaunchAspectRatio,
	type LaunchThemeId,
	type LaunchVideoBlueprint,
} from "../launch-video";
import { toast } from "sonner";
import { ZERO_MEDIA_TIME } from "@/wasm";

const DEFAULT_LAUNCH_PROMPT = `Announcing AmberCut 2.0

The next evolution in browser-native video editing.
- 10× faster timeline rendering with Rust WASM
- Built-in Agentic Groq AI video copilot
- Zero software installation required

Key Innovations:
- Local-first canvas rendering
- Instant audio DSP noise removal & vocal enhance
- Multi-track animated kinetic text and bento cards

Performance:
- 60 FPS smooth scrubbing
- 0ms server latency
- 100% private in-browser processing

Try it now at ambercut.app`;

export function LaunchVideoStudio() {
	const editor = useEditor();
	const { apiKey, model } = useAiStore();

	const [prompt, setPrompt] = useState(DEFAULT_LAUNCH_PROMPT);
	const [theme, setTheme] = useState<LaunchThemeId>("obsidian-amber");
	const [aspectRatio, setAspectRatio] = useState<LaunchAspectRatio>("16:9");
	const [isBuilding, setIsBuilding] = useState(false);
	const [lastBlueprint, setLastBlueprint] =
		useState<LaunchVideoBlueprint | null>(SAAS_LAUNCH_BLUEPRINT);

	// Check if user has uploaded or recorded any screen recordings
	const mediaAssets = editor.media.getAssets();
	const screenRecordings = mediaAssets.filter(
		(a) =>
			a.type === "video" &&
			(a.name.toLowerCase().includes("screen") ||
				a.name.toLowerCase().includes("recording") ||
				a.name.toLowerCase().includes("demo")),
	);

	const handleGenerateWithGroq = async () => {
		if (!prompt.trim()) {
			toast.error("Please enter a launch prompt or announcement text");
			return;
		}

		setIsBuilding(true);
		try {
			toast.loading("Analyzing launch announcement with Groq AI...", {
				id: "launch-gen",
			});

			const blueprint = await generateLaunchBlueprintWithGroq({
				prompt,
				apiKey,
				model,
				aspectRatio,
				theme,
			});

			setLastBlueprint(blueprint);

			toast.loading("Building animated scenes on the timeline...", {
				id: "launch-gen",
			});

			const result = await buildLaunchVideoOnTimeline({
				editor,
				blueprint,
			});

			toast.success(
				`Launch Video "${blueprint.title}" Ready on Studio Timeline!`,
				{
					id: "launch-gen",
					description: `Generated ${result.scenesCount} animated scenes with ${result.elementsCreated} elements. Everything is ready to edit.`,
				},
			);
		} catch (err) {
			console.error("Failed to generate launch video:", err);
			toast.error("Failed to generate launch video", {
				id: "launch-gen",
				description: err instanceof Error ? err.message : "Unknown error",
			});
		} finally {
			setIsBuilding(false);
		}
	};

	const handleInstantBuild = async () => {
		setIsBuilding(true);
		try {
			const blueprint: LaunchVideoBlueprint =
				prompt.toLowerCase().includes("typesafe") ||
				prompt.toLowerCase().includes("jev")
					? { ...TYPESAFE_JEV_LAUNCH_BLUEPRINT, theme, aspectRatio }
					: await generateLaunchBlueprintWithGroq({
							prompt,
							apiKey: undefined, // instant heuristic template
							aspectRatio,
							theme,
						});

			setLastBlueprint(blueprint);

			const result = await buildLaunchVideoOnTimeline({
				editor,
				blueprint,
			});

			toast.success(`Built "${blueprint.title}" on Timeline!`, {
				description: `${result.scenesCount} scenes created. Click on any clip or text to customize.`,
			});
		} catch (err) {
			console.error("Build error:", err);
			toast.error("Failed to build timeline elements");
		} finally {
			setIsBuilding(false);
		}
	};

	const handlePlayFromStart = () => {
		editor.playback.seek({ time: ZERO_MEDIA_TIME });
		editor.playback.play();
	};

	return (
		<div className="flex flex-col h-full overflow-y-auto px-4 py-3 gap-4 text-xs">
			{/* Banner / Header */}
			<div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="size-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
							<Rocket className="size-3.5" />
						</div>
						<h3 className="text-sm font-bold text-foreground">
							Launch Video Generator
						</h3>
					</div>
					<Badge
						variant="outline"
						className="border-amber-500/40 text-amber-400 text-[10px] font-semibold"
					>
						Groq Agentic Motion
					</Badge>
				</div>
				<p className="text-muted-foreground text-[11px] leading-relaxed">
					Turn product launches, AI announcements, and release notes into
					multi-scene animated videos with kinetic text, bento metric cards, and
					screen demo slots on the studio timeline.
				</p>
			</div>

			{/* Presets Row */}
			<div className="flex flex-col gap-1.5">
				<span className="text-[11px] font-semibold text-muted-foreground">
					One-Click Templates
				</span>
				<div className="flex flex-wrap gap-1.5">
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setPrompt(DEFAULT_LAUNCH_PROMPT);
							setTheme("obsidian-amber");
							setAspectRatio("16:9");
						}}
						className="h-7 text-[11px] rounded-lg border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300"
					>
						<Sparkles className="size-3 mr-1 text-amber-400" />
						AmberCut 2.0 Launch
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setPrompt(
								`Announcing CloudFlow 2.0\n\nThe next evolution in edge computing.\n- 10× faster deployments\n- 99.999% global uptime\n- Instant zero-config setup\n\nExperience seamless performance today.`,
							);
							setTheme("cyber-cyan");
							setAspectRatio("16:9");
						}}
						className="h-7 text-[11px] rounded-lg"
					>
						SaaS Product 2.0
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setPrompt(
								`Mobile App Update v3.5\n\nDesigned for speed.\n- New Glassmorphic UI\n- 60 FPS smooth gestures\n- Offline-first storage\n\nDownload on the App Store now.`,
							);
							setTheme("deep-violet");
							setAspectRatio("9:16");
						}}
						className="h-7 text-[11px] rounded-lg"
					>
						Mobile Feature Drop (9:16)
					</Button>
				</div>
			</div>

			{/* Announcement Prompt Area */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between">
					<label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
						<FileText className="size-3.5 text-primary" />
						Launch Announcement & Script
					</label>
					<span className="text-[10px] text-muted-foreground">
						{prompt.length} chars
					</span>
				</div>
				<Textarea
					value={prompt}
					onChange={(e) => setPrompt(e.target.value)}
					placeholder="Paste your product announcement, release notes, or launch copy here..."
					className="min-h-[140px] text-xs font-mono bg-muted/30 resize-none border-border/80 focus-visible:ring-1 focus-visible:ring-amber-500 rounded-lg p-2.5"
				/>
			</div>

			{/* Controls: Theme & Aspect Ratio */}
			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1.5">
					<label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
						<Palette className="size-3 text-primary" />
						Motion Theme
					</label>
					<Select
						value={theme}
						onValueChange={(val) => setTheme(val as LaunchThemeId)}
					>
						<SelectTrigger className="h-8 text-xs bg-muted/40">
							<SelectValue placeholder="Theme" />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(LAUNCH_THEMES).map(([id, t]) => (
								<SelectItem key={id} value={id} className="text-xs">
									<div className="flex items-center gap-2">
										<span
											className="size-2.5 rounded-full"
											style={{ backgroundColor: t.textAccent }}
										/>
										<span>{t.name}</span>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-col gap-1.5">
					<label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
						<Maximize2 className="size-3 text-primary" />
						Canvas Format
					</label>
					<Select
						value={aspectRatio}
						onValueChange={(val) => setAspectRatio(val as LaunchAspectRatio)}
					>
						<SelectTrigger className="h-8 text-xs bg-muted/40">
							<SelectValue placeholder="Aspect Ratio" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="16:9" className="text-xs">
								16:9 Landscape (YouTube)
							</SelectItem>
							<SelectItem value="9:16" className="text-xs">
								9:16 Vertical (TikTok/Shorts)
							</SelectItem>
							<SelectItem value="1:1" className="text-xs">
								1:1 Square (Twitter/Social)
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Screen Recording Integration Status */}
			<div className="p-3 rounded-lg bg-muted/30 border border-border flex items-start gap-2.5">
				<Monitor className="size-4 text-primary shrink-0 mt-0.5" />
				<div className="flex flex-col gap-1 flex-1">
					<div className="flex items-center justify-between">
						<span className="font-semibold text-foreground text-[11px]">
							Screen Recording Demo Slot
						</span>
						{screenRecordings.length > 0 ? (
							<Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px]">
								{screenRecordings.length} Recorded Available
							</Badge>
						) : (
							<span className="text-[10px] text-muted-foreground">
								Placeholder Demo Container
							</span>
						)}
					</div>
					<p className="text-[10px] text-muted-foreground leading-normal">
						{screenRecordings.length > 0
							? `Found "${screenRecordings[0].name}". It will be automatically placed in the live demo scene!`
							: "The launch video will include dedicated screen-demo slots. You can record your screen anytime with the studio recorder."}
					</p>
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex flex-col gap-2 pt-1">
				<Button
					onClick={handleGenerateWithGroq}
					disabled={isBuilding || !prompt.trim()}
					className="w-full gap-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-5 rounded-lg shadow-md shadow-amber-500/20 text-xs transition-all"
				>
					<Sparkles className="size-4" />
					{isBuilding ? "Synthesizing Video..." : "Generate Launch Video with Groq"}
				</Button>

				<Button
					variant="outline"
					size="sm"
					onClick={handleInstantBuild}
					disabled={isBuilding || !prompt.trim()}
					className="w-full gap-1.5 text-xs rounded-lg border-border hover:bg-muted/50"
				>
					<Rocket className="size-3.5 text-muted-foreground" />
					Instant Build on Timeline (1-Sec Fast Path)
				</Button>
			</div>

			{/* Storyboard / Scene Breakdown Preview */}
			{lastBlueprint && (
				<div className="flex flex-col gap-2 pt-2 border-t border-border">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
							<Layers className="size-3.5 text-primary" />
							<span>Active Storyboard Blueprint</span>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={handlePlayFromStart}
							className="h-6 px-2 text-[10px] text-amber-400 hover:text-amber-300 gap-1"
						>
							<Play className="size-2.5 fill-current" />
							Preview Timeline
						</Button>
					</div>

					<div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
						{lastBlueprint.scenes.map((scene, idx) => (
							<div
								key={scene.id || idx}
								className="p-2.5 rounded-lg bg-card/60 border border-border/70 flex flex-col gap-1 transition-colors hover:border-amber-500/30"
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-1.5 font-medium text-foreground">
										<span className="size-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[9px] font-bold">
											{idx + 1}
										</span>
										<span className="font-semibold">{scene.name}</span>
									</div>
									<span className="text-[10px] text-muted-foreground font-mono">
										{scene.durationSec}s
									</span>
								</div>

								{scene.badge && (
									<div className="flex items-center gap-1">
										<span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold">
											{scene.badge.text}
										</span>
									</div>
								)}

								<span className="text-[11px] font-semibold text-foreground/90">
									{scene.headline?.text}
								</span>

								{scene.subheadline && (
									<span className="text-[10px] text-muted-foreground line-clamp-1">
										{scene.subheadline.text}
									</span>
								)}

								{scene.bentoCards && scene.bentoCards.length > 0 && (
									<div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
										{scene.bentoCards.map((card, cIdx) => (
											<span
												key={cIdx}
												className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/50"
											>
												{card.stat} {card.label}
											</span>
										))}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
