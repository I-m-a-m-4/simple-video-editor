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
	Palette,
	Video,
	Activity,
	Zap,
} from "lucide-react";
import { toast } from "sonner";
import { mediaTimeToSeconds } from "@/wasm";
import {
	analyzeTimelineWithGroq,
	applySuggestionAction,
	type SmartSuggestionItem,
} from "@/ai/smart-suggestions";
import {
	CREATIVE_FILTERS,
	ENDING_ANIMATIONS,
	type CreativeFilter,
	type EndingAnimationPreset,
} from "@/effects/creative-filters";

export function EmptyView() {
	const [activeTab, setActiveTab] = useState<"project" | "details">("project");
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [analysisDone, setAnalysisDone] = useState(false);
	const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestionItem[]>([]);
	const [suggestionsApplied, setSuggestionsApplied] = useState(false);
	const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
	const [activeAnimationId, setActiveAnimationId] = useState<string | null>(null);

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

	// 1. Smart Suggestions (AI Powered Analyze with Groq API)
	const handleAnalyze = async () => {
		setIsAnalyzing(true);
		setAnalysisDone(false);
		setSuggestionsApplied(false);
		toast.loading("AI Smart Suggestions: Scanning timeline with Groq AI...", {
			id: "ai-analyze",
		});

		try {
			const suggestions = await analyzeTimelineWithGroq(editor, activeScene);
			setIsAnalyzing(false);
			setAnalysisDone(true);
			setSmartSuggestions(suggestions);
			toast.dismiss("ai-analyze");
			toast.success(`Timeline analysis complete! ${suggestions.length} AI suggestions ready.`);
			recordTelemetryEvent(
				"smart_suggestions",
				"AI Smart Suggestions Groq Scan",
				`Analyzed timeline and found ${suggestions.length} recommendations`,
			);
		} catch (err) {
			setIsAnalyzing(false);
			setAnalysisDone(true);
			toast.dismiss("ai-analyze");
			toast.error("Analysis completed with fallback.");
		}
	};

	const handleApplyIndividualSuggestion = (id: string) => {
		const target = smartSuggestions.find((s) => s.id === id);
		if (!target || target.applied) return;

		const count = applySuggestionAction(target.actionType, editor, activeScene);
		setSmartSuggestions((prev) =>
			prev.map((s) => (s.id === id ? { ...s, applied: true } : s)),
		);

		if (target.actionType === "normalize_audio") setVolumeConsistent(true);
		if (target.actionType === "enhance_color") setColorsBetter(true);
		if (target.actionType === "voice_clarity") setVoiceClearer(true);
		if (target.actionType === "cinematic_filter") setColorsConsistent(true);

		toast.success(`Applied "${target.title}" on ${count} timeline clips!`);
	};

	const applyAllSmartSuggestions = () => {
		let total = 0;
		for (const sug of smartSuggestions) {
			if (!sug.applied) {
				total += applySuggestionAction(sug.actionType, editor, activeScene);
			}
		}

		setVolumeConsistent(true);
		setVoiceClearer(true);
		setColorsBetter(true);
		setColorsConsistent(true);
		setSuggestionsApplied(true);
		setSmartSuggestions((prev) => prev.map((s) => ({ ...s, applied: true })));

		toast.success("All AI optimizations applied across timeline clips!");
	};

	const handleApplyFilter = (filter: CreativeFilter) => {
		setActiveFilterId(filter.id);
		const count = executeTimelineUpdate(
			(el) => el.type === "video" || el.type === "image",
			() => ({
				...filter.params,
			}),
		);
		recordTelemetryEvent(
			"color_better",
			`Creative Filter: ${filter.name}`,
			`Applied ${filter.name} on ${count} clips`,
		);
		toast.success(`Applied "${filter.name}" filter on ${count} clips!`);
	};

	const handleApplyEndingAnimation = (anim: EndingAnimationPreset) => {
		setActiveAnimationId(anim.id);
		const count = executeTimelineUpdate(
			(el, trackType) => trackType === "main" && el.type === "video",
			(el) => {
				const durationSec = Number(mediaTimeToSeconds({ time: el.duration }).toFixed(2));
				const animDuration = Math.min(anim.duration, Math.max(0.5, durationSec * 0.5));
				return {
					endingAnimation: anim.type,
					endingAnimationDuration: animDuration,
					endingFadeOut: anim.type === "fade_out",
					endingZoomOut: anim.type === "zoom_out",
				};
			},
		);
		toast.success(`Applied "${anim.name}" ending animation on ${count} main video clips!`);
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
									{smartSuggestions.map((item) => (
										<div
											key={item.id}
											className="flex flex-col gap-1.5 text-[11px] bg-muted/40 p-2.5 rounded-lg border border-border/50"
										>
											<div className="flex items-center justify-between gap-1">
												<div className="flex items-center gap-1.5 font-semibold text-foreground">
													<CheckCircle2
														className={`size-3.5 shrink-0 ${
															item.applied ? "text-emerald-500" : "text-amber-500"
														}`}
													/>
													<span>{item.title}</span>
												</div>
												<Badge
													variant="secondary"
													className="text-[9px] px-1.5 py-0 uppercase tracking-wider text-muted-foreground"
												>
													{item.category}
												</Badge>
											</div>

											<p className="text-muted-foreground leading-snug pl-5">
												{item.description}
											</p>

											<div className="flex items-center justify-between pt-1 pl-5">
												<span className="text-[10px] text-amber-500 font-medium">
													{item.impact}
												</span>
												<Button
													size="sm"
													variant={item.applied ? "outline" : "default"}
													disabled={item.applied}
													onClick={() => handleApplyIndividualSuggestion(item.id)}
													className="h-6 text-[10px] px-2 py-0 gap-1 rounded-md"
												>
													{item.applied ? (
														<>
															<Check className="size-3 text-emerald-500" />
															<span>Applied</span>
														</>
													) : (
														<>
															<Sparkles className="size-3 text-amber-400" />
															<span>Apply</span>
														</>
													)}
												</Button>
											</div>
										</div>
									))}

									<Button
										size="sm"
										onClick={applyAllSmartSuggestions}
										disabled={suggestionsApplied || smartSuggestions.every((s) => s.applied)}
										className="w-full h-8 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5"
									>
										{suggestionsApplied || smartSuggestions.every((s) => s.applied) ? (
											<>
												<Check className="size-3.5" />
												<span>All AI Improvements Applied</span>
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

						{/* Cinematic Video & Image Filters Section */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-foreground uppercase tracking-wider font-clash flex items-center gap-1.5">
									<Palette className="size-3.5 text-amber-500" />
									Cinematic Video Filters
								</span>
								<Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">
									Video &amp; Photo
								</Badge>
							</div>
							<p className="text-[11px] text-muted-foreground">
								Apply curated color grades across all timeline clips with a single tap.
							</p>

							<div className="grid grid-cols-2 gap-2">
								{CREATIVE_FILTERS.map((filter) => {
									const isActive = activeFilterId === filter.id;
									return (
										<button
											key={filter.id}
											type="button"
											onClick={() => handleApplyFilter(filter)}
											className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
												isActive
													? "border-amber-500/80 bg-amber-500/10 shadow-xs"
													: "border-border/70 bg-card/40 hover:bg-muted/30"
											}`}
										>
											<div className="flex items-center justify-between w-full mb-1">
												<div
													className="size-3 rounded-full"
													style={{ backgroundColor: filter.iconColor }}
												/>
												{isActive && (
													<Check className="size-3 text-amber-500" />
												)}
											</div>
											<span className="text-xs font-semibold text-foreground">
												{filter.name}
											</span>
											<span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
												{filter.description}
											</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* Ending & Outro Animations Section */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-foreground uppercase tracking-wider font-clash flex items-center gap-1.5">
									<Video className="size-3.5 text-blue-500" />
									Ending Animations
								</span>
								<Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">
									Outro Presets
								</Badge>
							</div>
							<p className="text-[11px] text-muted-foreground">
								Professional pre-made ending animations to smoothly conclude your video.
							</p>

							<div className="space-y-2">
								{ENDING_ANIMATIONS.map((anim) => {
									const isApplied = activeAnimationId === anim.id;
									return (
										<div
											key={anim.id}
											className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-card/40 hover:bg-muted/20 transition-all"
										>
											<div className="flex flex-col gap-0.5">
												<span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
													<span>{anim.name}</span>
													<span className="text-[10px] text-muted-foreground font-normal">
														({anim.duration}s)
													</span>
												</span>
												<span className="text-[10px] text-muted-foreground">
													{anim.description}
												</span>
											</div>
											<Button
												size="sm"
												variant={isApplied ? "outline" : "secondary"}
												onClick={() => handleApplyEndingAnimation(anim)}
												className="h-7 text-xs px-2.5 shrink-0 ml-2"
											>
												{isApplied ? (
													<>
														<Check className="size-3 text-emerald-500 mr-1" />
														<span>Applied</span>
													</>
												) : (
													<span>Add</span>
												)}
											</Button>
										</div>
									);
								})}
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
