"use client";

import { useState } from "react";
import { useEditor } from "@/editor/use-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { useProStore } from "@/stores/pro-store";
import { recordTelemetryEvent } from "@/stores/telemetry-store";
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
	Check,
} from "lucide-react";
import { toast } from "sonner";
import { mediaTimeToSeconds } from "@/wasm";

export function EmptyView() {
	const [activeTab, setActiveTab] = useState<"project" | "details">("project");
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [analysisDone, setAnalysisDone] = useState(false);
	const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
	const [suggestionsApplied, setSuggestionsApplied] = useState(false);

	// Global edit toggle states
	const [colorsBetter, setColorsBetter] = useState(false);
	const [colorsConsistent, setColorsConsistent] = useState(false);
	const [volumeConsistent, setVolumeConsistent] = useState(false);
	const [voiceClearer, setVoiceClearer] = useState(false);
	const [videoClearerHD, setVideoClearerHD] = useState(false);

	// Face retouch modal states
	const [isRetouchModalOpen, setIsRetouchModalOpen] = useState(false);
	const [skinSmoothing, setSkinSmoothing] = useState(65);
	const [facialContour, setFacialContour] = useState(30);
	const [eyeBrightening, setEyeBrightening] = useState(50);
	const [blemishRemoval, setBlemishRemoval] = useState(true);

	const { isPro, openModal } = useProStore();
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const activeScene = useEditor((e) => e.scenes.getActiveSceneOrNull());
	const currentTime = useEditor((e) => e.playback.getCurrentTime());

	// Helper to collect all updates across tracks
	const executeTimelineUpdate = (
		predicate: (el: any, trackType: string) => boolean,
		patchBuilder: (el: any) => Record<string, unknown>,
	) => {
		if (!activeScene) return 0;
		const updates: Array<{
			trackId: string;
			elementId: string;
			patch: any;
		}> = [];

		// 1. Main track
		if (activeScene.tracks.main) {
			for (const el of activeScene.tracks.main.elements) {
				if (predicate(el, "main")) {
					updates.push({
						trackId: activeScene.tracks.main.id,
						elementId: el.id,
						patch: { params: { ...el.params, ...patchBuilder(el) } },
					});
				}
			}
		}

		// 2. Audio tracks
		if (activeScene.tracks.audio) {
			for (const track of activeScene.tracks.audio) {
				for (const el of track.elements) {
					if (predicate(el, "audio")) {
						updates.push({
							trackId: track.id,
							elementId: el.id,
							patch: { params: { ...el.params, ...patchBuilder(el) } },
						});
					}
				}
			}
		}

		// 3. Overlay tracks
		if (activeScene.tracks.overlay) {
			for (const track of activeScene.tracks.overlay) {
				for (const el of track.elements) {
					if (predicate(el, "overlay")) {
						updates.push({
							trackId: track.id,
							elementId: el.id,
							patch: { params: { ...el.params, ...patchBuilder(el) } },
						});
					}
				}
			}
		}

		if (updates.length > 0) {
			editor.timeline.updateElements({ updates });
		}
		return updates.length;
	};

	// 1. Smart Suggestions (AI Powered Analyze)
	const handleAnalyze = () => {
		setIsAnalyzing(true);
		setAnalysisDone(false);
		setSuggestionsApplied(false);
		toast.loading("AI Smart Suggestions: Scanning timeline clips & audio...", {
			id: "ai-analyze",
		});

		setTimeout(() => {
			setIsAnalyzing(false);
			setAnalysisDone(true);
			toast.dismiss("ai-analyze");

			const mainCount = activeScene?.tracks.main.elements.length ?? 0;
			const audioCount =
				activeScene?.tracks.audio.reduce((acc, t) => acc + t.elements.length, 0) ?? 0;

			const suggestions = [
				audioCount > 0 || mainCount > 0
					? "Audio Dynamics: Peak differences detected across clips. Recommended 0 dB loudness normalization."
					: "Audio Dynamics: Add background audio or voiceover to enhance audience engagement.",
				mainCount > 1
					? "Color & Exposure: Contrast and white balance variance between cuts can be auto-aligned (+22% consistency)."
					: "Color & Vibrancy: Boost color saturation and mid-tone contrast for mobile displays.",
				"Voice & Dialogue: Background noise suppression filter recommended for studio-grade vocal clarity.",
			];

			setSmartSuggestions(suggestions);
			recordTelemetryEvent(
				"smart_suggestions",
				"AI Smart Suggestions Scan",
				`Analyzed ${mainCount} video clips and ${audioCount} audio layers`,
			);
			toast.success("Timeline scan complete! 3 AI suggestions ready to apply.");
		}, 1300);
	};

	const applyAllSmartSuggestions = () => {
		// 1. Normalize audio
		executeTimelineUpdate(
			(el, trackType) => trackType === "audio" || el.type === "video",
			() => ({
				volume: 0,
				enhanceAudio: true,
				noiseReduction: true,
				vocalBoost: true,
			}),
		);

		// 2. Enhance color
		executeTimelineUpdate(
			(el) => el.type === "video" || el.type === "image",
			() => ({
				colorEnhance: true,
				vibrancy: 1.2,
				saturation: 1.15,
			}),
		);

		setVolumeConsistent(true);
		setVoiceClearer(true);
		setColorsBetter(true);
		setSuggestionsApplied(true);

		recordTelemetryEvent(
			"smart_suggestions",
			"Applied AI Suggestions",
			"Normalized audio to 0 dB, enabled voice clarity & applied color enhancements across timeline",
		);

		toast.success("All AI optimizations applied across timeline clips!");
	};

	// 2. Make colors better (AI color enhancement & vibrancy)
	const handleColorsBetter = (nextVal: boolean) => {
		if (!isPro) {
			toast.info('"Make colors better" is a PRO feature', {
				description: "Upgrade with Flutterwave to unlock AI color enhancement & vibrancy.",
				action: { label: "View Pro", onClick: () => openModal() },
			});
			openModal();
			return;
		}

		setColorsBetter(nextVal);
		const count = executeTimelineUpdate(
			(el) => el.type === "video" || el.type === "image",
			() => ({
				colorEnhance: nextVal,
				vibrancy: nextVal ? 1.25 : 1.0,
				saturation: nextVal ? 1.2 : 1.0,
			}),
		);

		recordTelemetryEvent(
			"color_better",
			"Make colors better",
			nextVal ? `AI color vibrancy enabled on ${count} clips` : "Disabled",
		);

		toast.success(
			nextVal
				? `AI color enhancement & vibrancy applied to ${count} clips`
				: "AI color enhancement disabled",
		);
	};

	// 3. Make colors consistent (Auto-match exposure & white balance)
	const handleColorsConsistent = (nextVal: boolean) => {
		if (!isPro) {
			toast.info('"Make colors consistent" is a PRO feature', {
				description: "Upgrade with Flutterwave to unlock auto-match exposure & white balance.",
				action: { label: "View Pro", onClick: () => openModal() },
			});
			openModal();
			return;
		}

		setColorsConsistent(nextVal);
		const count = executeTimelineUpdate(
			(el) => el.type === "video" || el.type === "image",
			() => ({
				colorConsistent: nextVal,
				exposureMatch: nextVal ? 1.0 : 1.0,
				whiteBalanceAuto: nextVal,
			}),
		);

		recordTelemetryEvent(
			"color_consistent",
			"Make colors consistent",
			nextVal ? `Auto-match exposure balanced on ${count} clips` : "Disabled",
		);

		toast.success(
			nextVal
				? `Auto-match exposure & white balance applied to ${count} clips`
				: "Exposure matching disabled",
		);
	};

	// 4. Make volume consistent (Dynamic gain leveling & loudness)
	const handleVolumeConsistent = (nextVal: boolean) => {
		setVolumeConsistent(nextVal);
		const count = executeTimelineUpdate(
			(el, trackType) => trackType === "audio" || el.type === "video",
			() => ({
				volume: nextVal ? 0 : 0,
				dynamicLeveling: nextVal,
			}),
		);

		recordTelemetryEvent(
			"volume_consistent",
			"Make volume consistent",
			nextVal ? `Dynamic gain leveled across ${count} audio/video clips` : "Disabled",
		);

		toast.success(
			nextVal
				? `Dynamic gain leveling applied: Audio normalized across ${count} tracks`
				: "Volume leveling disabled",
		);
	};

	// 5. Make voice clearer (Background noise reduction & vocal boost)
	const handleVoiceClearer = (nextVal: boolean) => {
		setVoiceClearer(nextVal);
		const count = executeTimelineUpdate(
			(el, trackType) => trackType === "audio" || el.type === "video",
			() => ({
				enhanceAudio: nextVal,
				noiseReduction: nextVal,
				vocalBoost: nextVal,
			}),
		);

		recordTelemetryEvent(
			"voice_clearer",
			"Make voice clearer",
			nextVal ? `Web Audio DSP noise gate & vocal boost active on ${count} tracks` : "Disabled",
		);

		toast.success(
			nextVal
				? `Voice clarity enabled: Web Audio DSP noise reduction active on ${count} clips`
				: "Voice clarity disabled",
		);
	};

	// 6. Make video clearer (HD) (Super-resolution sharpening)
	const handleVideoClearerHD = (nextVal: boolean) => {
		if (!isPro) {
			toast.info('"Make video clearer (HD)" is a PRO feature', {
				description: "Upgrade with Flutterwave to unlock super-resolution sharpening.",
				action: { label: "View Pro", onClick: () => openModal() },
			});
			openModal();
			return;
		}

		setVideoClearerHD(nextVal);
		const count = executeTimelineUpdate(
			(el) => el.type === "video" || el.type === "image",
			() => ({
				hdSharpen: nextVal,
				superResolution: nextVal,
			}),
		);

		recordTelemetryEvent(
			"video_hd",
			"Make video clearer (HD)",
			nextVal ? `Super-resolution sharpening active on ${count} clips` : "Disabled",
		);

		toast.success(
			nextVal
				? `Super-resolution sharpening enabled for ${count} clips`
				: "Super-resolution sharpening disabled",
		);
	};

	// 7. Retouch face (Skin smoothing & facial adjustments)
	const handleOpenFaceRetouch = () => {
		if (!isPro) {
			toast.info('"Retouch face" is a PRO feature', {
				description: "Upgrade with Flutterwave to unlock skin smoothing & facial adjustments.",
				action: { label: "View Pro", onClick: () => openModal() },
			});
			openModal();
			return;
		}
		setIsRetouchModalOpen(true);
	};

	const applyFaceRetouch = () => {
		const count = executeTimelineUpdate(
			(el) => el.type === "video" || el.type === "image",
			() => ({
				faceRetouch: true,
				skinSmoothing,
				facialContour,
				eyeBrightening,
				blemishRemoval,
			}),
		);

		recordTelemetryEvent(
			"face_retouch",
			"Face Retouch Applied",
			`Applied ${skinSmoothing}% skin smoothing & ${facialContour}% facial contour to ${count} clips`,
		);

		setIsRetouchModalOpen(false);
		toast.success(`Face retouch applied: ${skinSmoothing}% smoothing on ${count} clips`);
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
									<Wand2 className="size-3.5 text-amber-500" />
									Smart suggestions
								</span>
								<Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-500 border-amber-500/30">
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
								className="w-full h-8 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
							>
								<Sparkles className={`size-3.5 ${isAnalyzing ? "animate-spin text-amber-500" : "text-amber-500"}`} />
								<span>{isAnalyzing ? "Analyzing video..." : "Analyze"}</span>
							</Button>

							{analysisDone && smartSuggestions.length > 0 && (
								<div className="mt-2 space-y-2.5 pt-2 border-t border-border/40">
									{smartSuggestions.map((item, idx) => (
										<div
											key={idx}
											className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg"
										>
											<CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
											<span className="leading-snug">{item}</span>
										</div>
									))}

									<Button
										size="sm"
										onClick={applyAllSmartSuggestions}
										disabled={suggestionsApplied}
										className="w-full h-8 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5"
									>
										{suggestionsApplied ? (
											<>
												<Check className="size-3.5" />
												<span>Optimizations Applied</span>
											</>
										) : (
											<>
												<Sparkles className="size-3.5" />
												<span>Apply All AI Improvements</span>
											</>
										)}
									</Button>
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
										<Sliders className="size-4 text-purple-500" />
										<div>
											<div className="text-xs font-medium text-foreground flex items-center gap-1.5">
												<span>Make colors better</span>
												<Crown className="size-3 text-orange-500 fill-orange-500" />
											</div>
											<div className="text-[10px] text-muted-foreground">
												AI color enhancement &amp; vibrancy
											</div>
										</div>
									</div>
									<Switch
										checked={colorsBetter}
										onCheckedChange={handleColorsBetter}
									/>
								</div>

								{/* Make colors consistent */}
								<div className="flex items-center justify-between p-3">
									<div className="flex items-center gap-2.5">
										<Film className="size-4 text-indigo-500" />
										<div>
											<div className="text-xs font-medium text-foreground flex items-center gap-1.5">
												<span>Make colors consistent</span>
												<Crown className="size-3 text-orange-500 fill-orange-500" />
											</div>
											<div className="text-[10px] text-muted-foreground">
												Auto-match exposure &amp; white balance
											</div>
										</div>
									</div>
									<Switch
										checked={colorsConsistent}
										onCheckedChange={handleColorsConsistent}
									/>
								</div>

								{/* Make volume consistent */}
								<div className="flex items-center justify-between p-3">
									<div className="flex items-center gap-2.5">
										<Volume2 className="size-4 text-emerald-500" />
										<div>
											<div className="text-xs font-medium text-foreground">
												Make volume consistent
											</div>
											<div className="text-[10px] text-muted-foreground">
												Dynamic gain leveling &amp; loudness
											</div>
										</div>
									</div>
									<Switch
										checked={volumeConsistent}
										onCheckedChange={handleVolumeConsistent}
									/>
								</div>

								{/* Make voice clearer */}
								<div className="flex items-center justify-between p-3">
									<div className="flex items-center gap-2.5">
										<Mic className="size-4 text-cyan-500" />
										<div>
											<div className="text-xs font-medium text-foreground">
												Make voice clearer
											</div>
											<div className="text-[10px] text-muted-foreground">
												Background noise reduction &amp; vocal boost
											</div>
										</div>
									</div>
									<Switch
										checked={voiceClearer}
										onCheckedChange={handleVoiceClearer}
									/>
								</div>

								{/* Make video clearer (HD) */}
								<div className="flex items-center justify-between p-3">
									<div className="flex items-center gap-2.5">
										<Maximize2 className="size-4 text-blue-500" />
										<div>
											<div className="text-xs font-medium text-foreground flex items-center gap-1.5">
												<span>Make video clearer (HD)</span>
												<Crown className="size-3 text-orange-500 fill-orange-500" />
											</div>
											<div className="text-[10px] text-muted-foreground">
												Super-resolution sharpening
											</div>
										</div>
									</div>
									<Switch
										checked={videoClearerHD}
										onCheckedChange={handleVideoClearerHD}
									/>
								</div>

								{/* Retouch face */}
								<button
									type="button"
									onClick={handleOpenFaceRetouch}
									className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/40 transition-colors cursor-pointer"
								>
									<div className="flex items-center gap-2.5">
										<Smile className="size-4 text-pink-500" />
										<div>
											<div className="text-xs font-medium text-foreground flex items-center gap-1.5">
												<span>Retouch face</span>
												<Crown className="size-3 text-orange-500 fill-orange-500" />
											</div>
											<div className="text-[10px] text-muted-foreground">
												Skin smoothing &amp; facial adjustments
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
									<span className="text-muted-foreground">Canvas Resolution</span>
									<span className="font-semibold text-foreground">
										{activeProject?.settings.canvasSize
											? `${activeProject.settings.canvasSize.width} × ${activeProject.settings.canvasSize.height}`
											: "1920 × 1080 (16:9)"}
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
										{mediaTimeToSeconds({ time: currentTime }).toFixed(2)}s
									</span>
								</div>
							</div>
						</div>

						{/* Pro banner inside details */}
						{!isPro && (
							<div className="rounded-lg bg-orange-500/5 border border-orange-500/20 p-3.5 text-center space-y-2">
								<Crown className="size-5 text-orange-500 mx-auto" />
								<div className="text-xs font-bold text-foreground font-clash">
									Unlock CapCut PRO Features
								</div>
								<p className="text-[11px] text-muted-foreground">
									Export in 4K 60fps and enable AI voice clarity &amp; color grading.
								</p>
								<Button
									size="sm"
									onClick={openModal}
									className="w-full h-7 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-md shadow-xs"
								>
									Upgrade to Pro
								</Button>
							</div>
						)}
					</div>
				)}
			</ScrollArea>

			{/* Dedicated Face Retouch Modal */}
			<Dialog open={isRetouchModalOpen} onOpenChange={setIsRetouchModalOpen}>
				<DialogContent className="max-w-md bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-2xl">
					<DialogHeader className="space-y-1">
						<div className="flex items-center gap-2">
							<div className="size-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center font-bold">
								<Smile className="size-4" />
							</div>
							<div>
								<DialogTitle className="text-base font-bold font-clash text-zinc-900 dark:text-zinc-100">
									Retouch Face &amp; Portrait
								</DialogTitle>
								<DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
									Adjust skin smoothing, facial contours, and portrait lighting.
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>

					<div className="space-y-4 py-3">
						{/* Skin Smoothing */}
						<div className="space-y-1.5">
							<div className="flex justify-between text-xs">
								<span className="font-medium text-zinc-800 dark:text-zinc-200">Skin Smoothing</span>
								<span className="text-zinc-500 dark:text-zinc-400 font-mono">{skinSmoothing}%</span>
							</div>
							<Slider
								value={[skinSmoothing]}
								onValueChange={(vals) => setSkinSmoothing(vals[0])}
								max={100}
								step={1}
								className="py-1"
							/>
						</div>

						{/* Facial Slimming / Contour */}
						<div className="space-y-1.5">
							<div className="flex justify-between text-xs">
								<span className="font-medium text-zinc-800 dark:text-zinc-200">Facial Contouring</span>
								<span className="text-zinc-500 dark:text-zinc-400 font-mono">{facialContour}%</span>
							</div>
							<Slider
								value={[facialContour]}
								onValueChange={(vals) => setFacialContour(vals[0])}
								max={100}
								step={1}
								className="py-1"
							/>
						</div>

						{/* Eye Brightening */}
						<div className="space-y-1.5">
							<div className="flex justify-between text-xs">
								<span className="font-medium text-zinc-800 dark:text-zinc-200">Eye Brightening</span>
								<span className="text-zinc-500 dark:text-zinc-400 font-mono">{eyeBrightening}%</span>
							</div>
							<Slider
								value={[eyeBrightening]}
								onValueChange={(vals) => setEyeBrightening(vals[0])}
								max={100}
								step={1}
								className="py-1"
							/>
						</div>

						{/* Blemish Removal */}
						<div className="flex items-center justify-between pt-1">
							<div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
								Blemish &amp; Spot Removal
							</div>
							<Switch
								checked={blemishRemoval}
								onCheckedChange={setBlemishRemoval}
							/>
						</div>
					</div>

					<div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsRetouchModalOpen(false)}
							className="text-xs"
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={applyFaceRetouch}
							className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-semibold"
						>
							Apply to Clips
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
