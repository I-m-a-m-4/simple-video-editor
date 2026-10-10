"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
import { useEditor } from "@/editor/use-editor";
import { processMediaAssets } from "@/media/processing";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { mediaTimeFromSeconds } from "@/wasm";
import { toast } from "sonner";
import {
	Link01Icon,
	Download01Icon,
	Film01Icon,
	PlayIcon,
	CheckmarkCircle02Icon,
	CropIcon,
	SlidersHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Minimize2, Maximize2, X, Minus } from "lucide-react";
import Image from "next/image";
import { Progress } from "@/components/ui/progress";

interface UrlImportModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export function UrlImportModal({ isOpen, onOpenChange }: UrlImportModalProps) {
	const editor = useEditor();

	const [url, setUrl] = useState("");
	const [isLoadingInfo, setIsLoadingInfo] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [isMinimized, setIsMinimized] = useState(false);
	const [progressStep, setProgressStep] = useState<string>("");
	const [downloadPercent, setDownloadPercent] = useState<number>(0);
	const [downloadSpeed, setDownloadSpeed] = useState<string>("");
	const [downloadEta, setDownloadEta] = useState<string>("");

	const abortControllerRef = useRef<AbortController | null>(null);
	const currentDownloadIdRef = useRef<string | null>(null);

	const [videoInfo, setVideoInfo] = useState<{
		title: string;
		duration?: number;
		thumbnail?: string;
		uploader?: string;
	} | null>(null);

	// Conversion settings
	const [convertToShort, setConvertToShort] = useState(false);
	const [cropMode, setCropMode] = useState<"crop_center" | "blur_background">(
		"crop_center",
	);
	const [startTime, setStartTime] = useState("00:00:00");
	const [durationSec, setDurationSec] = useState(30);
	const [addToTimeline, setAddToTimeline] = useState(true);

	const handleFetchInfo = async () => {
		if (!url.trim()) return;
		setIsLoadingInfo(true);
		setVideoInfo(null);
		try {
			const res = await fetch(`/api/media/info?url=${encodeURIComponent(url.trim())}`);
			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.error || "Could not fetch video information.");
			}
			setVideoInfo({
				title: data.title,
				duration: data.duration,
				thumbnail: data.thumbnail,
				uploader: data.uploader,
			});
			toast.success("Found video: " + data.title);
		} catch (err: any) {
			console.error(err);
			toast.error(err.message || "Failed to inspect video link.");
		} finally {
			setIsLoadingInfo(false);
		}
	};

	const fetchProgress = useCallback(async (id: string) => {
		try {
			const res = await fetch(`/api/media/grab/progress?id=${id}`);
			if (!res.ok) return;
			const data = await res.json();
			if (data?.progress) {
				if (typeof data.progress.percent === "number") {
					setDownloadPercent((prev) => Math.max(prev, data.progress.percent));
				}
				if (data.progress.speed) {
					setDownloadSpeed(data.progress.speed);
				}
				if (data.progress.eta) {
					setDownloadEta(data.progress.eta);
				}
				if (data.progress.message) {
					setProgressStep(data.progress.message);
				}
			}
		} catch {}
	}, []);

	// Keep progress alive and catch up immediately when returning to tab
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible" && isDownloading && currentDownloadIdRef.current) {
				fetchProgress(currentDownloadIdRef.current);
			}
		};
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [isDownloading, fetchProgress]);

	const handleCancelDownload = () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
		setIsDownloading(false);
		setIsMinimized(false);
		setProgressStep("");
		setDownloadPercent(0);
		setDownloadSpeed("");
		setDownloadEta("");
		toast.info("Download cancelled.");
	};

	const handleDownload = async () => {
		if (!url.trim()) {
			toast.error("Please enter a video URL.");
			return;
		}

		setIsDownloading(true);
		setDownloadPercent(0);
		setDownloadSpeed("");
		setDownloadEta("");
		setProgressStep(
			convertToShort
				? "Downloading video & converting to 9:16 vertical short..."
				: "Connecting to media stream...",
		);

		const downloadId = `grab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
		currentDownloadIdRef.current = downloadId;
		const controller = new AbortController();
		abortControllerRef.current = controller;
		let pollInterval: any = null;

		try {
			// Poll real-time progress every 400ms
			pollInterval = setInterval(() => {
				fetchProgress(downloadId);
			}, 400);

			const response = await fetch("/api/media/grab", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				signal: controller.signal,
				body: JSON.stringify({
					url: url.trim(),
					downloadId,
					convertToShort,
					startTime: convertToShort ? startTime : undefined,
					duration: convertToShort ? durationSec : undefined,
					cropMode: convertToShort ? cropMode : undefined,
				}),
			});

			if (!response.ok) {
				const errorJson = await response.json().catch(() => ({}));
				throw new Error(errorJson.error || `Download failed (${response.status})`);
			}

			setDownloadPercent(100);
			setProgressStep("Ingesting into project assets...");

			const blob = await response.blob();
			const headerTitle = response.headers.get("X-Video-Title");
			const decodedTitle = headerTitle
				? decodeURIComponent(headerTitle)
				: videoInfo?.title || "Imported Video";

			const cleanName = `${decodedTitle.replace(/[^\w\s-]/g, "").trim() || "video"}.mp4`;
			const file = new File([blob], cleanName, { type: "video/mp4" });

			// 1. Save video directly to user's PC Downloads folder
			try {
				const downloadUrl = URL.createObjectURL(blob);
				const downloadLink = document.createElement("a");
				downloadLink.href = downloadUrl;
				downloadLink.download = cleanName;
				downloadLink.style.display = "none";
				document.body.appendChild(downloadLink);
				downloadLink.click();
				document.body.removeChild(downloadLink);
				setTimeout(() => URL.revokeObjectURL(downloadUrl), 10_000);
			} catch (downloadErr) {
				console.warn("Could not trigger browser download to PC:", downloadErr);
			}

			// 2. Request persistent storage from browser so data survives reboots
			if (typeof navigator !== "undefined" && navigator.storage?.persist) {
				void navigator.storage.persist().catch(() => {});
			}

			const processed = await processMediaAssets({ files: [file] });
			if (processed.length === 0) {
				throw new Error("Could not process video in browser.");
			}

			const asset = processed[0];
			const projectId = editor.project.getActive().metadata.id;
			const savedAsset = await editor.media.addMediaAsset({ projectId, asset });
			if (!savedAsset) {
				throw new Error("Failed to save media asset to project.");
			}

			if (addToTimeline) {
				const mediaDuration =
					savedAsset.duration != null
						? mediaTimeFromSeconds({ seconds: savedAsset.duration })
						: mediaTimeFromSeconds({ seconds: 5 });

				const element = buildElementFromMedia({
					mediaId: savedAsset.id,
					mediaType: "video",
					name: savedAsset.name,
					duration: mediaDuration,
					startTime: editor.playback.getCurrentTime(),
				});

				editor.timeline.insertElement({
					element,
					placement: { mode: "auto" },
				});
			}

			toast.success(
				convertToShort
					? "Vertical Short saved to your Downloads folder and added to project!"
					: "Video saved to your PC Downloads folder and added to project!",
			);

			onOpenChange(false);
			setIsMinimized(false);
			setUrl("");
			setVideoInfo(null);
		} catch (err: any) {
			if (err.name === "AbortError") {
				return;
			}
			console.error(err);
			toast.error(err.message || "Failed to download media.");
		} finally {
			if (pollInterval) {
				clearInterval(pollInterval);
			}
			currentDownloadIdRef.current = null;
			abortControllerRef.current = null;
			setIsDownloading(false);
			setProgressStep("");
			setDownloadPercent(0);
			setDownloadSpeed("");
			setDownloadEta("");
		}
	};

	return (
		<>
			<Dialog
				open={isOpen && !isMinimized}
				onOpenChange={(open) => {
					if (!open && isDownloading) {
						setIsMinimized(true);
						toast.info("Downloading in background. Click the bottom widget anytime to expand.");
						return;
					}
					onOpenChange(open);
				}}
			>
				<DialogContent className="max-w-xl bg-card border-border text-foreground p-0 overflow-hidden shadow-2xl rounded-xl">
					{isDownloading && (
						<button
							type="button"
							onClick={() => {
								setIsMinimized(true);
								toast.info("Downloading in background. You can continue editing your project!");
							}}
							className="absolute top-5 right-14 cursor-pointer text-muted-foreground opacity-70 hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
							title="Minimize to background"
						>
							<Minus className="size-4" />
							<span className="sr-only">Minimize</span>
						</button>
					)}
				<DialogHeader className="px-5 py-4 border-b border-border bg-muted/20">
					<div className="flex items-center gap-2.5">
						<div className="size-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
							<HugeiconsIcon icon={Link01Icon} className="size-4" />
						</div>
						<div>
							<DialogTitle className="text-base font-semibold flex items-center gap-2">
								Universal Media Grabber
								<Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-[10px] font-medium rounded-md">
									HD / 4K Ready
								</Badge>
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground mt-0.5">
								Paste any link from YouTube, TikTok, Instagram, Twitter/X, or direct MP4.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="p-5 space-y-4">
					{/* Link Input */}
					<div className="space-y-1.5">
						<Label className="text-xs font-medium text-foreground">Video URL</Label>
						<div className="flex gap-2">
							<Input
								value={url}
								onChange={(e) => setUrl(e.target.value)}
								placeholder="https://www.youtube.com/watch?v=... or TikTok / Instagram link"
								className="text-xs bg-muted/40"
								disabled={isDownloading}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleFetchInfo();
									}
								}}
							/>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								onClick={handleFetchInfo}
								disabled={!url.trim() || isLoadingInfo || isDownloading}
								className="text-xs shrink-0"
							>
								{isLoadingInfo ? "Checking..." : "Inspect"}
							</Button>
						</div>
					</div>

					{/* Video Info Preview */}
					{videoInfo && (
						<div className="flex gap-3 p-3 rounded-lg border border-border/60 bg-muted/30">
							{videoInfo.thumbnail && (
								<div className="relative w-24 h-16 rounded overflow-hidden shrink-0 bg-black/40">
									<Image
										src={videoInfo.thumbnail}
										alt={videoInfo.title}
										fill
										className="object-cover"
										unoptimized
									/>
								</div>
							)}
							<div className="min-w-0 flex-1">
								<p className="text-xs font-semibold truncate text-foreground">
									{videoInfo.title}
								</p>
								{videoInfo.uploader && (
									<p className="text-[11px] text-muted-foreground mt-0.5 truncate">
										by {videoInfo.uploader}
									</p>
								)}
								{videoInfo.duration && (
									<p className="text-[11px] text-orange-500 font-medium mt-1">
										Duration: {Math.floor(videoInfo.duration / 60)}:
										{String(Math.floor(videoInfo.duration % 60)).padStart(2, "0")}
									</p>
								)}
							</div>
						</div>
					)}

					{/* 9:16 Shorts Option */}
					<div className="p-3.5 rounded-lg border border-border bg-muted/15 space-y-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<HugeiconsIcon icon={CropIcon} className="size-4 text-orange-500" />
								<div>
									<span className="text-xs font-semibold block text-foreground">
										Convert to 9:16 Vertical Short / Reel
									</span>
									<span className="text-[11px] text-muted-foreground block">
										Automatically cuts & transforms 16:9 widescreen video into mobile portrait format
									</span>
								</div>
							</div>
							<input
								type="checkbox"
								checked={convertToShort}
								onChange={(e) => setConvertToShort(e.target.checked)}
								className="size-4 accent-orange-500 rounded cursor-pointer"
								disabled={isDownloading}
							/>
						</div>

						{convertToShort && (
							<div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-3 text-xs">
								<div className="space-y-1">
									<Label className="text-[11px] text-muted-foreground">Crop Style</Label>
									<select
										value={cropMode}
										onChange={(e) => setCropMode(e.target.value as any)}
										className="w-full h-8 text-xs rounded-md border border-border bg-background px-2"
										disabled={isDownloading}
									>
										<option value="crop_center">Center Crop (1080x1920)</option>
										<option value="blur_background">Blurred Background Fill</option>
									</select>
								</div>
								<div className="space-y-1">
									<Label className="text-[11px] text-muted-foreground">Start Time</Label>
									<Input
										value={startTime}
										onChange={(e) => setStartTime(e.target.value)}
										placeholder="00:00:15"
										className="h-8 text-xs bg-background"
										disabled={isDownloading}
									/>
								</div>
								<div className="space-y-1 col-span-2">
									<Label className="text-[11px] text-muted-foreground flex justify-between">
										<span>Clip Duration: {durationSec} seconds</span>
									</Label>
									<div className="flex gap-2">
										{[15, 30, 60].map((sec) => (
											<Button
												key={sec}
												type="button"
												variant={durationSec === sec ? "default" : "outline"}
												size="sm"
												className="flex-1 h-7 text-xs"
												onClick={() => setDurationSec(sec)}
												disabled={isDownloading}
											>
												{sec}s
											</Button>
										))}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Options */}
					<div className="flex items-center gap-2 pt-1">
						<input
							type="checkbox"
							id="addToTimeline"
							checked={addToTimeline}
							onChange={(e) => setAddToTimeline(e.target.checked)}
							className="size-4 accent-orange-500 rounded cursor-pointer"
							disabled={isDownloading}
						/>
						<Label htmlFor="addToTimeline" className="text-xs cursor-pointer text-muted-foreground">
							Place directly onto timeline at playhead
						</Label>
					</div>

					{/* Real-time Progress feedback */}
					{isDownloading && (
						<div className="p-4 rounded-xl bg-gradient-to-b from-orange-500/10 to-orange-500/5 border border-orange-500/30 space-y-2.5">
							<div className="flex items-center justify-between text-xs">
								<div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-medium">
									<HugeiconsIcon icon={Download01Icon} className="size-4 shrink-0 animate-bounce" />
									<span className="truncate max-w-[320px]">{progressStep || "Downloading media stream..."}</span>
								</div>
								<span className="font-bold text-orange-600 dark:text-orange-400 tabular-nums text-xs">
									{downloadPercent > 0 ? `${downloadPercent.toFixed(0)}%` : "0%"}
								</span>
							</div>

							<Progress
								value={downloadPercent}
								className="h-2 bg-orange-500/20"
							/>

							<div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
								{downloadSpeed ? (
									<span>Speed: <strong className="text-foreground font-medium">{downloadSpeed}</strong></span>
								) : (
									<span>Downloading stream...</span>
								)}
								{downloadEta && (
									<span>ETA: <strong className="text-foreground font-medium">{downloadEta}</strong></span>
								)}
							</div>

							<div className="flex items-center justify-between pt-1 border-t border-orange-500/15">
								<span className="text-[11px] text-muted-foreground">
									Can take several minutes on high resolution
								</span>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-6 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:bg-orange-500/10 px-2 gap-1 font-medium"
									onClick={() => {
										setIsMinimized(true);
										toast.info("Downloading in background. You can continue editing your project!");
									}}
								>
									<Minimize2 className="size-3" />
									Minimize & edit video
								</Button>
							</div>
						</div>
					)}
				</div>

				<div className="px-5 py-3 border-t border-border bg-muted/20 flex justify-end gap-2">
					{isDownloading ? (
						<>
							<Button
								variant="secondary"
								size="sm"
								onClick={() => {
									setIsMinimized(true);
									toast.info("Downloading in background. You can continue editing your project!");
								}}
								className="gap-1.5"
							>
								<Minimize2 className="size-3.5" />
								Minimize to Background
							</Button>
							<Button
								variant="destructive"
								size="sm"
								onClick={handleCancelDownload}
								className="gap-1.5"
							>
								Cancel Download
							</Button>
						</>
					) : (
						<>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button
								variant="default"
								size="sm"
								onClick={handleDownload}
								disabled={!url.trim()}
								className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
							>
								<HugeiconsIcon icon={Download01Icon} className="size-4" />
								{convertToShort ? "Grab & Convert to Short" : "Grab & Import"}
							</Button>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>

		{/* Floating Minimized Widget */}
		{isDownloading && isMinimized && (
			<div
				className="fixed bottom-6 right-6 z-250 bg-card/95 backdrop-blur-md border border-orange-500/40 rounded-2xl shadow-2xl p-3.5 w-84 max-w-[calc(100vw-3rem)] text-foreground flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 transition-all"
				role="status"
				aria-live="polite"
			>
				<div
					className="size-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0 cursor-pointer"
					onClick={() => setIsMinimized(false)}
					title="Click to expand"
				>
					<HugeiconsIcon icon={Download01Icon} className="size-4 animate-bounce" />
				</div>
				<div
					className="flex-1 min-w-0 cursor-pointer"
					onClick={() => setIsMinimized(false)}
					title="Click to expand"
				>
					<div className="flex items-center justify-between text-xs mb-1">
						<span className="font-semibold truncate max-w-[150px]">
							{videoInfo?.title || "Downloading video..."}
						</span>
						<span className="font-bold text-orange-500 tabular-nums">
							{downloadPercent > 0 ? `${downloadPercent.toFixed(0)}%` : "0%"}
						</span>
					</div>
					<Progress value={downloadPercent} className="h-1.5 bg-orange-500/20 [&>div]:bg-orange-500" />
					<div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
						<span>{downloadSpeed || "Downloading..."}</span>
						{downloadEta && <span>ETA {downloadEta}</span>}
					</div>
				</div>
				<div className="flex items-center gap-1 shrink-0">
					<Button
						variant="ghost"
						size="icon"
						className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
						onClick={() => setIsMinimized(false)}
						title="Restore to full view"
					>
						<Maximize2 className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-7 rounded-lg text-muted-foreground hover:text-destructive"
						onClick={handleCancelDownload}
						title="Cancel download"
					>
						<X className="size-3.5" />
					</Button>
				</div>
			</div>
		)}
	</>
	);
}

