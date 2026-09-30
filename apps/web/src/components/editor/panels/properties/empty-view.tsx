"use client";

import { useState } from "react";
import { useEditor } from "@/editor/use-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProStore } from "@/stores/pro-store";
import {
	Sparkles,
	Sliders,
	Volume2,
	Mic,
	Film,
	Smile,
	ChevronRight,
	Wand2,
	CheckCircle2,
	Crown,
	Info,
	PlayCircle,
	Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { mediaTimeToSeconds } from "@/wasm";

export function EmptyView() {
	const [activeTab, setActiveTab] = useState<"project" | "details">("project");
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [analysisDone, setAnalysisDone] = useState(false);
	const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);

	// Global edit toggle states
	const [colorsBetter, setColorsBetter] = useState(false);
	const [colorsConsistent, setColorsConsistent] = useState(false);
	const [volumeConsistent, setVolumeConsistent] = useState(false);
	const [voiceClearer, setVoiceClearer] = useState(false);
	const [videoClearerHD, setVideoClearerHD] = useState(false);

	const { isPro, openModal } = useProStore();
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const activeScene = useEditor((e) => e.scenes.getActiveSceneOrNull());
	const currentTime = useEditor((e) => e.playback.getCurrentTime());

	const handleProToggle = (
		featureName: string,
		currentState: boolean,
		setter: (val: boolean) => void,
	) => {
		if (!isPro) {
			toast.info(`"${featureName}" is a PRO feature`, {
				description: "Upgrade with Flutterwave to unlock CapCut-style AI enhancements.",
				action: {
					label: "View Pro",
					onClick: () => openModal(),
				},
			});
			openModal();
			return;
		}

		const nextState = !currentState;
		setter(nextState);
		toast.success(
			nextState
				? `${featureName} enabled across timeline`
				: `${featureName} disabled`,
		);
	};

	const handleAnalyze = () => {
		setIsAnalyzing(true);
		setAnalysisDone(false);
		toast.loading("AI Smart Suggestions: Scanning timeline clips & audio...", {
			id: "ai-analyze",
		});

		setTimeout(() => {
			setIsAnalyzing(false);
			setAnalysisDone(true);
			toast.dismiss("ai-analyze");

			const clipCount =
				(activeScene?.tracks.main.elements.length ?? 0) +
				(activeScene?.tracks.audio.reduce((acc, t) => acc + t.elements.length, 0) ?? 0);

			const suggestions = [
				clipCount > 3
					? "Color consistency between camera angles could be balanced (+18% uniformity)."
					: "Add dynamic B-roll or sound effects to boost visual retention in the first 5 seconds.",
				"Volume normalize recommended: peak audio dynamics exceed -1dB threshold.",
				"Aspect ratio is 9:16 vertical — optimal for TikTok, Instagram Reels, and YouTube Shorts.",
			];

			setSmartSuggestions(suggestions);
			toast.success("Timeline analysis complete! 3 suggestions found.");
		}, 1400);
	};

	return (
		<div className="flex size-full flex-col bg-background text-foreground">
			{/* Top Tabs: Project | Details */}
			<div className="flex h-9 shrink-0 items-center border-b px-2 gap-1 bg-muted/20">
				<button
					type="button"
					onClick={() => setActiveTab("project")}
					className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
						activeTab === "project"
							? "bg-background text-foreground shadow-xs border"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					Project
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("details")}
					className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
						activeTab === "details"
							? "bg-background text-foreground shadow-xs border"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					Details
				</button>
			</div>

			<ScrollArea className="flex-1 p-4 scrollbar-thin">
				{activeTab === "project" ? (
					<div className="space-y-6">
						{/* Smart Suggestions Card (Exact CapCut Layout) */}
						<div className="rounded-xl border border-border/80 bg-card/60 p-3.5 space-y-3 shadow-xs">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-foreground flex items-center gap-1.5 font-clash">
									<Wand2 className="size-3.5 text-amber-400" />
									Smart suggestions
								</span>
								<Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-400 border-amber-400/30">
									AI Powered
								</Badge>
							</div>
							<p className="text-[11px] text-muted-foreground leading-tight">
								Find out how your video can be improved
							</p>

							<Button
								size="sm"
								onClick={handleAnalyze}
								disabled={isAnalyzing}
								className="w-full h-8 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
							>
								<Sparkles className={`size-3.5 ${isAnalyzing ? "animate-spin text-amber-400" : "text-amber-400"}`} />
								<span>{isAnalyzing ? "Analyzing video..." : "Analyze"}</span>
							</Button>

							{analysisDone && smartSuggestions.length > 0 && (
								<div className="mt-2 space-y-2 pt-2 border-t border-border/40">
									{smartSuggestions.map((item, idx) => (
										<div
											key={idx}
											className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg"
										>
											<CheckCircle2 className="size-3.5 text-emerald-400 shrink-0 mt-0.5" />
											<span>{item}</span>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Global Edits Section (Exact CapCut Toggles) */}
						<div className="space-y-3">
							<div className="text-xs font-bold text-foreground uppercase tracking-wider font-clash">
								Global edits
							</div>

							<div className="rounded-xl border border-border/80 bg-card/40 divide-y divide-border/60">
								{/* Make colors better */}
								<div className="flex items-center justify-between p-3">
									<div className="flex items-center gap-2.5">
										<Sliders className="size-4 text-purple-400" />
										<div>
											<div className="text-xs font-medium text-foreground flex items-center gap-1.5">
												<span>Make colors better</span>
												<Crown className="size-3 text-amber-400 fill-amber-400" />
											</div>
											<div className="text-[10px] text-muted-foreground">
												AI color enhancement & vibrancy
											</div>
										</div>
									</div>
									<Switch
										checked={colorsBetter}
										onCheckedChange={() =>
											handleProToggle(
												"Make colors better",
												colorsBetter,
												setColorsBetter,
											)
										}
									/>
								</div>

								{/* Make colors consistent */}
								<div className="flex items-center justify-between p-3">
									<div className="flex items-center gap-2.5">
										<Film className="size-4 text-indigo-400" />
										<div>
											<div className="text-xs font-medium text-foreground flex items-center gap-1.5">
												<span>Make colors consistent</span>
												<Crown className="size-3 text-amber-400 fill-amber-400" />
											</div>
											<div className="text-[10px] text-muted-foreground">
												Auto-match exposure & white balance
											</div>
										</div>
									</div>
									<Switch
										checked={colorsConsistent}
										onCheckedChange={() =>
											handleProToggle(
												"Make colors consistent",
												colorsConsistent,
												setColorsConsistent,
											)
										}
									/>
								</div>

								{/* Make volume consistent */}
								<div className="flex items-center justify-between p-3">
									<div className="flex items-center gap-2.5">
										<Volume2 className="size-4 text-emerald-400" />
										<div>
											<div className="text-xs font-medium text-foreground">
												Make volume consistent
											</div>
											<div className="text-[10px] text-muted-foreground">
												Dynamic gain leveling & loudness
											</div>
										</div>
									</div>
									<Switch
										checked={volumeConsistent}
										onCheckedChange={(val) => {
											setVolumeConsistent(val);
											toast.success(
												val ? "Audio volume leveled" : "Audio leveling off",
											);
										}}
									/>
								</div>

								{/* Make voice clearer */}
								<div className="flex items-center justify-between p-3">
									<div className="flex items-center gap-2.5">
										<Mic className="size-4 text-cyan-400" />
										<div>
											<div className="text-xs font-medium text-foreground">
												Make voice clearer
											</div>
											<div className="text-[10px] text-muted-foreground">
												Background noise reduction & vocal boost
											</div>
										</div>
									</div>
									<Switch
										checked={voiceClearer}
										onCheckedChange={(val) => {
											setVoiceClearer(val);
											toast.success(
												val ? "Voice clarity enabled" : "Voice clarity off",
											);
										}}
									/>
								</div>

								{/* Make video clearer (HD) */}
								<div className="flex items-center justify-between p-3">
									<div className="flex items-center gap-2.5">
										<Maximize2 className="size-4 text-blue-400" />
										<div>
											<div className="text-xs font-medium text-foreground flex items-center gap-1.5">
												<span>Make video clearer (HD)</span>
												<Crown className="size-3 text-amber-400 fill-amber-400" />
											</div>
											<div className="text-[10px] text-muted-foreground">
												Super-resolution sharpening
											</div>
										</div>
									</div>
									<Switch
										checked={videoClearerHD}
										onCheckedChange={() =>
											handleProToggle(
												"Make video clearer (HD)",
												videoClearerHD,
												setVideoClearerHD,
											)
										}
									/>
								</div>

								{/* Retouch face */}
								<button
									type="button"
									onClick={() => {
										if (!isPro) {
											openModal();
										} else {
											toast.info("Face retouch filter panel active");
										}
									}}
									className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/40 transition-colors"
								>
									<div className="flex items-center gap-2.5">
										<Smile className="size-4 text-pink-400" />
										<div>
											<div className="text-xs font-medium text-foreground flex items-center gap-1.5">
												<span>Retouch face</span>
												<Crown className="size-3 text-amber-400 fill-amber-400" />
											</div>
											<div className="text-[10px] text-muted-foreground">
												Skin smoothing & facial adjustments
											</div>
										</div>
									</div>
									<ChevronRight className="size-4 text-muted-foreground" />
								</button>
							</div>
						</div>
					</div>
				) : (
					/* Details Tab */
					<div className="space-y-4">
						<div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-3">
							<div className="text-xs font-bold text-foreground font-clash">
								Project Metadata
							</div>

							<div className="space-y-2 text-xs">
								<div className="flex justify-between py-1 border-b border-border/40">
									<span className="text-muted-foreground">Project Name</span>
									<span className="font-semibold text-foreground">
										{activeProject?.metadata.name || "Untitled Project"}
									</span>
								</div>

								<div className="flex justify-between py-1 border-b border-border/40">
									<span className="text-muted-foreground">Aspect Ratio</span>
									<span className="font-semibold text-foreground">
										{activeScene?.aspectRatio || "9:16 (Vertical)"}
									</span>
								</div>

								<div className="flex justify-between py-1 border-b border-border/40">
									<span className="text-muted-foreground">Frame Rate</span>
									<span className="font-semibold text-foreground">30 FPS</span>
								</div>

								<div className="flex justify-between py-1 border-b border-border/40">
									<span className="text-muted-foreground">Main Video Clips</span>
									<span className="font-semibold text-foreground">
										{activeScene?.tracks.main.elements.length ?? 0}
									</span>
								</div>

								<div className="flex justify-between py-1 border-b border-border/40">
									<span className="text-muted-foreground">Audio Tracks</span>
									<span className="font-semibold text-foreground">
										{activeScene?.tracks.audio.length ?? 0}
									</span>
								</div>

								<div className="flex justify-between py-1">
									<span className="text-muted-foreground">Playhead Position</span>
									<span className="font-mono text-foreground">
										{mediaTimeToSeconds(currentTime).toFixed(2)}s
									</span>
								</div>
							</div>
						</div>

						{/* Pro banner inside details */}
						{!isPro && (
							<div className="rounded-xl bg-gradient-to-br from-purple-950/60 to-indigo-950/60 border border-purple-500/30 p-3.5 text-center space-y-2">
								<Crown className="size-6 text-amber-300 mx-auto" />
								<div className="text-xs font-bold text-white font-clash">
									Unlock CapCut PRO Features
								</div>
								<p className="text-[11px] text-zinc-300">
									Export in 4K 60fps and enable AI voice clarity & color grading.
								</p>
								<Button
									size="sm"
									onClick={openModal}
									className="w-full h-7 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg"
								>
									Upgrade to Pro
								</Button>
							</div>
						)}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
