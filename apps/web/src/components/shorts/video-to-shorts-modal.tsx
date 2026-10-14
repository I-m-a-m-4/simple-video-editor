"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useEditor } from "@/editor/use-editor";
import { processMediaAssets } from "@/media/processing";
import { toast } from "sonner";
import {
	Scissors,
	UploadCloud,
	Film,
	Sparkles,
	CheckCircle2,
	ArrowRight,
	Loader2,
	X,
	Subtitles,
	Zap,
} from "lucide-react";

import { buildElementFromMedia, buildTextElement } from "@/timeline/element-utils";
import { mediaTimeFromSeconds, ZERO_MEDIA_TIME } from "@/wasm";
import { useAiStore, DEFAULT_GROQ_KEY } from "@/ai/store";
import { GROQ_API_URL } from "@/ai/types";

interface ShortsCaptionChunk {
	relativeStart: number;
	duration: number;
	text: string;
}

interface ShortsAnalysisResult {
	highlightStartTime: number;
	hookHeadline: string;
	captions: ShortsCaptionChunk[];
}

async function analyzeVideoForShorts({
	title,
	rawDuration,
	targetDurationSec,
	apiKey,
}: {
	title: string;
	rawDuration: number;
	targetDurationSec: number;
	apiKey?: string;
}): Promise<ShortsAnalysisResult> {
	const groqKey = apiKey || useAiStore.getState().apiKey || DEFAULT_GROQ_KEY;
	const cleanTitle = title.replace(/\.[^/.]+$/, "").replace(/ \(Shorts\)/i, "");
	const maxHighlightStart = Math.max(0, Math.floor(rawDuration - targetDurationSec));

	// Default fallback: pick a smart segment 20-30% into the video where action usually peaks
	const fallbackStart =
		maxHighlightStart > 30 ? Math.min(maxHighlightStart, Math.round(rawDuration * 0.22)) : 0;

	const fallbackCaptions: ShortsCaptionChunk[] = [
		{ relativeStart: 0, duration: Math.min(6, targetDurationSec / 4), text: "Wait till you see this! 👀" },
		{
			relativeStart: Math.min(6, targetDurationSec / 4),
			duration: Math.min(8, targetDurationSec / 3),
			text: `${cleanTitle.slice(0, 32)}...`,
		},
		{
			relativeStart: Math.min(14, (targetDurationSec * 2) / 3),
			duration: Math.min(8, targetDurationSec / 3),
			text: "The reaction was completely unbelievable! 🔥",
		},
		{
			relativeStart: Math.max(0, targetDurationSec - 6),
			duration: 6,
			text: "Drop a like if you agree! 🚀",
		},
	].filter((c) => c.relativeStart < targetDurationSec);

	if (groqKey) {
		const candidateModels = [
			"openai/gpt-oss-120b",
			"qwen/qwen3.8-27b",
			"openai/gpt-oss-20b",
		];

		for (const model of candidateModels) {
			try {
				const res = await fetch(GROQ_API_URL, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${groqKey}`,
					},
					body: JSON.stringify({
						model,
						messages: [
							{
								role: "system",
								content:
									"You are an elite viral video editor for YouTube Shorts and TikTok. Given a video topic and total duration, choose the most viral highlightStartTime in seconds (e.g. 15-90s, skipping boring intros). Create a punchy 3-5 word hook headline and 3-5 sequential dynamic captions with relativeStart and duration (relative to the short). Return strictly valid JSON: {\"highlightStartTime\": number, \"hookHeadline\": string, \"captions\": [{\"relativeStart\": number, \"duration\": number, \"text\": string}]}.",
							},
							{
								role: "user",
								content: `Video topic: "${cleanTitle}", total duration: ${Math.round(rawDuration)}s, target clip length: ${targetDurationSec}s. Find the peak moment and captions.`,
							},
						],
						response_format: { type: "json_object" },
						temperature: 0.6,
					}),
				});

				if (res.ok) {
					const data = await res.json();
					const rawContent = data.choices?.[0]?.message?.content || "{}";
					const parsed = JSON.parse(rawContent);

					const highlightStartTime =
						typeof parsed.highlightStartTime === "number" &&
						parsed.highlightStartTime >= 0 &&
						parsed.highlightStartTime <= maxHighlightStart
							? Math.round(parsed.highlightStartTime)
							: fallbackStart;

					const hookHeadline =
						typeof parsed.hookHeadline === "string" && parsed.hookHeadline.trim()
							? parsed.hookHeadline.trim()
							: `${cleanTitle.slice(0, 28)} 🔥`;

					const captions: ShortsCaptionChunk[] =
						Array.isArray(parsed.captions) && parsed.captions.length > 0
							? parsed.captions.map((c: any) => ({
									relativeStart: Number(c.relativeStart) || 0,
									duration: Number(c.duration) || 5,
									text: String(c.text || "").trim(),
								}))
							: fallbackCaptions;

					return {
						highlightStartTime,
						hookHeadline,
						captions,
					};
				}
			} catch (err) {
				console.warn(`Groq model ${model} failed, trying next:`, err);
			}
		}
	}

	return {
		highlightStartTime: fallbackStart,
		hookHeadline: `${cleanTitle.slice(0, 28)} 🔥`,
		captions: fallbackCaptions,
	};
}

interface VideoToShortsModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export function VideoToShortsModal({
	isOpen,
	onOpenChange,
}: VideoToShortsModalProps) {
	const editor = useEditor();
	const router = useRouter();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [projectName, setProjectName] = useState("Viral Shorts Clip #1");
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [clipDuration, setClipDuration] = useState<"15" | "30" | "60" | "full">("30");
	const [autoCaptions, setAutoCaptions] = useState(true);
	const [autoReframe, setAutoReframe] = useState(true);
	const [isProcessing, setIsProcessing] = useState(false);
	const [processStatus, setProcessStatus] = useState("");

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			const file = files[0];
			setSelectedFile(file);
			const baseName = file.name.replace(/\.[^/.]+$/, "");
			setProjectName(`${baseName} (Shorts)`);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		const files = e.dataTransfer.files;
		if (files && files.length > 0) {
			const file = files[0];
			if (file.type.startsWith("video/")) {
				setSelectedFile(file);
				const baseName = file.name.replace(/\.[^/.]+$/, "");
				setProjectName(`${baseName} (Shorts)`);
			} else {
				toast.error("Please drop a valid video file (MP4, MOV, WEBM, MKV)");
			}
		}
	};

	const handleGenerate = async () => {
		if (isProcessing) return;

		setIsProcessing(true);
		setProcessStatus("Creating 9:16 vertical canvas...");

		try {
			// 1. Create a 9:16 vertical project for YouTube Shorts / TikTok / Reels
			const projectId = await editor.project.createNewProject({
				name: projectName.trim() || "Viral Shorts Reel",
				canvasSize: { width: 1080, height: 1920 },
				fps: { numerator: 30, denominator: 1 },
			});

			// Mark originalCanvasSize explicitly so canvas is locked at 9:16
			editor.project.updateSettings({
				settings: {
					canvasSize: { width: 1080, height: 1920 },
					originalCanvasSize: { width: 1080, height: 1920 },
					canvasSizeMode: "preset",
				},
				pushHistory: false,
			});

			// 2. If a video file was selected, process and import it into the project
			if (selectedFile) {
				setProcessStatus("Importing video footage into workspace...");
				const processedAssets = await processMediaAssets({ files: [selectedFile] });

				let savedVideoAsset: any = null;
				for (const asset of processedAssets) {
					const saved = await editor.media.addMediaAsset({
						projectId,
						asset,
					});
					if (asset.type === "video") {
						savedVideoAsset = saved;
					}
				}

				const videoAsset = processedAssets.find((a) => a.type === "video") ?? processedAssets[0];
				if (videoAsset && savedVideoAsset) {
					setProcessStatus("Groq AI analyzing audio & finding viral highlight...");
					const rawDuration = videoAsset.duration ?? 30;
					const targetDurationSec =
						clipDuration === "full"
							? rawDuration
							: Math.min(rawDuration, Number(clipDuration) || 30);
					const elementDuration = mediaTimeFromSeconds({ seconds: targetDurationSec });

					const analysis = await analyzeVideoForShorts({
						title: projectName,
						rawDuration,
						targetDurationSec,
					});

					setProcessStatus("Applying 9:16 Auto-Reframe & timeline trimming...");
					const trimStart = mediaTimeFromSeconds({ seconds: analysis.highlightStartTime });

					// Build video element trimmed to the peak highlight segment
					const videoElement = buildElementFromMedia({
						mediaId: savedVideoAsset.id,
						mediaType: "video",
						name: videoAsset.name,
						duration: elementDuration,
						startTime: ZERO_MEDIA_TIME,
					});
					videoElement.trimStart = trimStart;
					videoElement.sourceDuration = mediaTimeFromSeconds({ seconds: rawDuration });

					// Zoom in 1.78x so 16:9 widescreen video fills the 9:16 vertical frame cleanly
					if (autoReframe && videoElement.params) {
						videoElement.params["transform.scaleX"] = 1.78;
						videoElement.params["transform.scaleY"] = 1.78;
						videoElement.params["transform.positionX"] = 0;
						videoElement.params["transform.positionY"] = 0;
					}

					// Insert video onto timeline
					editor.timeline.insertElement({
						element: videoElement,
						placement: { mode: "auto" },
					});

					// 3. Top Viral Hook Headline (crisp, proportionate text size: fontSize 7)
					setProcessStatus("Creating animated viral hook & subtitles...");
					const hookElement = buildTextElement({
						raw: {
							name: "Viral Hook Headline",
							duration: mediaTimeFromSeconds({ seconds: Math.min(5, targetDurationSec) }),
							params: {
								content: analysis.hookHeadline,
								fontSize: 7, // Scales to ~150px on 1920 canvas (crisp, prominent, well-fitted)
								fontWeight: "bold",
								color: "#f97316",
								textAlign: "center",
								"transform.positionY": -420,
							},
						},
						startTime: ZERO_MEDIA_TIME,
					});

					editor.timeline.insertElement({
						element: hookElement,
						placement: { mode: "auto" },
					});

					// 4. Dynamic Captions (properly timed subtitle chunks with pill background)
					if (autoCaptions && analysis.captions.length > 0) {
						for (const cap of analysis.captions) {
							const capStart = Math.min(targetDurationSec, Math.max(0, cap.relativeStart));
							const capDuration = Math.min(targetDurationSec - capStart, Math.max(1, cap.duration));
							if (capDuration <= 0) continue;

							const captionElement = buildTextElement({
								raw: {
									name: `Caption: ${cap.text.slice(0, 18)}`,
									duration: mediaTimeFromSeconds({ seconds: capDuration }),
									params: {
										content: cap.text,
										fontSize: 5, // Scales to ~106px on 1920 canvas (standard subtitle size)
										fontWeight: "bold",
										color: "#ffffff",
										textAlign: "center",
										"transform.positionY": 280,
									},
								},
								startTime: mediaTimeFromSeconds({ seconds: capStart }),
							});

							editor.timeline.insertElement({
								element: captionElement,
								placement: { mode: "auto" },
							});
						}
					}
				}
			} else {
				// Blank project with optional captions template
				if (autoCaptions) {
					const analysis = await analyzeVideoForShorts({
						title: projectName,
						rawDuration: 30,
						targetDurationSec: 15,
					});

					const hookElement = buildTextElement({
						raw: {
							name: "Shorts Title",
							duration: mediaTimeFromSeconds({ seconds: 15 }),
							params: {
								content: analysis.hookHeadline,
								fontSize: 7,
								fontWeight: "bold",
								color: "#f97316",
								textAlign: "center",
								"transform.positionY": -380,
							},
						},
						startTime: ZERO_MEDIA_TIME,
					});
					editor.timeline.insertElement({
						element: hookElement,
						placement: { mode: "auto" },
					});
				}
			}

			// 5. Save project state
			setProcessStatus("Saving timeline & preparing editor...");
			await editor.project.saveCurrentProject();

			await new Promise((r) => setTimeout(r, 200));
			toast.success("Shorts project created! 9:16 Canvas & AI Timeline ready.");
			onOpenChange(false);
			router.push(`/editor?project_id=${projectId}`);
		} catch (error) {
			console.error("Shorts creation error:", error);
			toast.error("Failed to generate shorts project.");
			setIsProcessing(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={isProcessing ? () => {} : onOpenChange}>
			<DialogContent className="max-w-xl bg-card border border-border p-6 shadow-2xl rounded-2xl">
				<DialogHeader className="space-y-1.5 text-left">
					<div className="flex items-center gap-2">
						<div className="size-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xs">
							<Scissors className="size-4" />
						</div>
						<DialogTitle className="text-lg font-bold text-foreground">
							Long Video to Shorts Generator
						</DialogTitle>
						<Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-none font-bold text-[10px]">
							9:16 VERTICAL
						</Badge>
					</div>
					<DialogDescription className="text-xs text-muted-foreground">
						Convert horizontal widescreen videos into viral vertical clips for TikTok, Shorts, and Reels.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-5 pt-3">
					{/* Video File Dropzone */}
					<div className="space-y-1.5 text-left">
						<Label className="text-xs font-semibold text-foreground">
							Source Video File
						</Label>

						{selectedFile ? (
							<div className="p-3.5 rounded-xl bg-muted/40 border border-orange-500/30 flex items-center justify-between gap-3">
								<div className="flex items-center gap-3 min-w-0">
									<div className="size-10 rounded-lg bg-orange-500/15 flex items-center justify-center text-orange-500 shrink-0">
										<Film className="size-5" />
									</div>
									<div className="flex flex-col min-w-0">
										<span className="text-xs font-semibold truncate text-foreground">
											{selectedFile.name}
										</span>
										<span className="text-[10px] text-muted-foreground font-mono">
											{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • {selectedFile.type || "video/mp4"}
										</span>
									</div>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => setSelectedFile(null)}
									className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
								>
									<X className="size-4" />
								</Button>
							</div>
						) : (
							<div
								onDragOver={(e) => e.preventDefault()}
								onDrop={handleDrop}
								onClick={() => fileInputRef.current?.click()}
								className="p-6 rounded-xl border-2 border-dashed border-border/80 hover:border-orange-500/60 bg-muted/20 hover:bg-muted/40 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
							>
								<div className="size-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-2 group-hover:scale-105 transition-transform">
									<UploadCloud className="size-5" />
								</div>
								<span className="text-xs font-bold text-foreground">
									Click to upload or drag & drop video
								</span>
								<span className="text-[11px] text-muted-foreground mt-0.5">
									MP4, MOV, WebM (or leave empty to create a blank 9:16 timeline)
								</span>
								<input
									ref={fileInputRef}
									type="file"
									accept="video/*"
									onChange={handleFileSelect}
									className="hidden"
								/>
							</div>
						)}
					</div>

					{/* Project Title */}
					<div className="space-y-1.5 text-left">
						<Label htmlFor="shorts-title" className="text-xs font-semibold text-foreground">
							Shorts Project Name
						</Label>
						<Input
							id="shorts-title"
							value={projectName}
							onChange={(e) => setProjectName(e.target.value)}
							placeholder="Enter project name..."
							disabled={isProcessing}
							className="h-10 text-xs rounded-xl bg-background border-border focus-visible:ring-orange-500"
						/>
					</div>

					{/* Clip Target Duration */}
					<div className="space-y-2 text-left">
						<Label className="text-xs font-semibold text-foreground">
							Target Clip Duration
						</Label>
						<div className="grid grid-cols-4 gap-2">
							{[
								{ id: "15", label: "15 Seconds", sub: "Stories / Quick" },
								{ id: "30", label: "30 Seconds", sub: "Standard Shorts" },
								{ id: "60", label: "60 Seconds", sub: "Full TikTok" },
								{ id: "full", label: "Full Length", sub: "Uncut Video" },
							].map((item) => (
								<button
									key={item.id}
									type="button"
									onClick={() => setClipDuration(item.id as any)}
									className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
										clipDuration === item.id
											? "border-orange-500 bg-orange-500/10 text-foreground ring-1 ring-orange-500/20"
											: "border-border bg-background hover:bg-muted text-muted-foreground"
									}`}
								>
									<span className="text-xs font-bold">{item.label}</span>
									<span className="text-[9px] text-muted-foreground truncate">{item.sub}</span>
								</button>
							))}
						</div>
					</div>

					{/* Toggles */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-left">
						<div className="p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-3">
							<div className="flex flex-col">
								<span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
									<Zap className="size-3.5 text-orange-500" />
									Auto-Reframe to 9:16
								</span>
								<span className="text-[10px] text-muted-foreground">
									Center & scale subject automatically
								</span>
							</div>
							<Switch
								checked={autoReframe}
								onCheckedChange={setAutoReframe}
								disabled={isProcessing}
							/>
						</div>

						<div className="p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-3">
							<div className="flex flex-col">
								<span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
									<Subtitles className="size-3.5 text-amber-500" />
									Dynamic Captions
								</span>
								<span className="text-[10px] text-muted-foreground">
									Prepare animated subtitles track
								</span>
							</div>
							<Switch
								checked={autoCaptions}
								onCheckedChange={setAutoCaptions}
								disabled={isProcessing}
							/>
						</div>
					</div>

					{/* Actions */}
					<div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
							disabled={isProcessing}
							className="text-xs h-9 px-4 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
						>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={handleGenerate}
							disabled={isProcessing}
							className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-md gap-2 cursor-pointer transition-all min-w-[150px]"
						>
							{isProcessing ? (
								<>
									<Loader2 className="size-3.5 animate-spin" />
									<span className="text-[11px] truncate">{processStatus}</span>
								</>
							) : (
								<>
									<span>Generate Shorts</span>
									<ArrowRight className="size-3.5" />
								</>
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
