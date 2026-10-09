"use client";

import { useState, useRef, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useEditor } from "@/editor/use-editor";
import { processMediaAssets } from "@/media/processing";
import { toast } from "sonner";
import {
	compressImageInBrowser,
	type ImageCompressResult,
} from "@/services/media-grabber/image-compressor";
import {
	Film01Icon,
	Image01Icon,
	Download01Icon,
	CheckmarkCircle02Icon,
	CloudUploadIcon,
	SparklesIcon,
	Layers01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Minimize2 } from "lucide-react";
import Image from "next/image";

interface MediaCompressorModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	defaultTab?: "video" | "image";
	initialFile?: File | null;
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function MediaCompressorModal({
	isOpen,
	onOpenChange,
	defaultTab = "video",
	initialFile = null,
}: MediaCompressorModalProps) {
	const editor = useEditor();
	const [activeTab, setActiveTab] = useState<"video" | "image">(defaultTab);

	useEffect(() => {
		if (isOpen) {
			if (initialFile) {
				if (initialFile.type.startsWith("image/")) {
					setActiveTab("image");
					setImageFile(initialFile);
					setImageResult(null);
					runImageCompression(initialFile, imageQuality, imageFormat, imageMaxDimension);
				} else if (initialFile.type.startsWith("video/")) {
					setActiveTab("video");
					setVideoFile(initialFile);
					setVideoResult(null);
				}
			} else {
				setActiveTab(defaultTab);
			}
		}
	}, [isOpen, defaultTab, initialFile]);

	// Video compression state
	const [videoFile, setVideoFile] = useState<File | null>(null);
	const [videoQuality, setVideoQuality] = useState<"high" | "balanced" | "compact">("balanced");
	const [videoResolution, setVideoResolution] = useState<"original" | "1080p" | "720p" | "480p">("original");
	const [videoAudioBitrate, setVideoAudioBitrate] = useState<"128k" | "96k" | "64k">("96k");
	const [isCompressingVideo, setIsCompressingVideo] = useState(false);
	const [videoResult, setVideoResult] = useState<{
		file: File;
		originalSize: number;
		compressedSize: number;
		url: string;
	} | null>(null);

	// Image compression state
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imageQuality, setImageQuality] = useState<number>(75);
	const [imageFormat, setImageFormat] = useState<"image/webp" | "image/jpeg" | "image/png">("image/webp");
	const [imageMaxDimension, setImageMaxDimension] = useState<number>(1920);
	const [isCompressingImage, setIsCompressingImage] = useState(false);
	const [imageResult, setImageResult] = useState<ImageCompressResult | null>(null);

	const videoInputRef = useRef<HTMLInputElement>(null);
	const imageInputRef = useRef<HTMLInputElement>(null);

	// Reset state when modal closes
	const handleClose = () => {
		onOpenChange(false);
		setVideoFile(null);
		setVideoResult(null);
		setImageFile(null);
		setImageResult(null);
	};

	// Video Compression Action
	const handleCompressVideo = async () => {
		if (!videoFile) return;
		setIsCompressingVideo(true);
		setVideoResult(null);

		try {
			const formData = new FormData();
			formData.append("file", videoFile);
			formData.append("qualityPreset", videoQuality);
			formData.append("resolution", videoResolution);
			formData.append("audioBitrate", videoAudioBitrate);

			const res = await fetch("/api/media/compress-video", {
				method: "POST",
				body: formData,
			});

			if (!res.ok) {
				const errorJson = await res.json().catch(() => ({}));
				throw new Error(errorJson.error || `Compression failed (${res.status})`);
			}

			const blob = await res.blob();
			const originalSize = Number(res.headers.get("X-Original-Size")) || videoFile.size;
			const compressedSize = Number(res.headers.get("X-Compressed-Size")) || blob.size;

			const cleanName = `${videoFile.name.replace(/\.[^/.]+$/, "")}_compressed.mp4`;
			const compressedFile = new File([blob], cleanName, { type: "video/mp4" });
			const downloadUrl = URL.createObjectURL(blob);

			setVideoResult({
				file: compressedFile,
				originalSize,
				compressedSize,
				url: downloadUrl,
			});

			toast.success("Video compressed successfully!");
		} catch (err: any) {
			console.error(err);
			toast.error(err.message || "Failed to compress video.");
		} finally {
			setIsCompressingVideo(false);
		}
	};

	// Image Compression Trigger
	const runImageCompression = async (fileToCompress = imageFile, quality = imageQuality, format = imageFormat, maxDim = imageMaxDimension) => {
		if (!fileToCompress) return;
		setIsCompressingImage(true);
		try {
			const result = await compressImageInBrowser({
				file: fileToCompress,
				quality: quality / 100,
				format,
				maxWidth: maxDim,
				maxHeight: maxDim,
			});
			setImageResult(result);
		} catch (err: any) {
			console.error(err);
			toast.error(err.message || "Failed to compress image.");
		} finally {
			setIsCompressingImage(false);
		}
	};

	const handleImageSelected = (file: File) => {
		setImageFile(file);
		setImageResult(null);
		runImageCompression(file, imageQuality, imageFormat, imageMaxDimension);
	};

	// Add compressed asset directly to project
	const handleAddToProject = async (file: File) => {
		try {
			const processed = await processMediaAssets({ files: [file] });
			if (processed.length === 0) {
				throw new Error("Could not process asset in editor.");
			}
			const asset = processed[0];
			const projectId = editor.project.getActive().metadata.id;
			const saved = await editor.media.addMediaAsset({ projectId, asset });
			if (!saved) throw new Error("Failed to add compressed asset.");

			toast.success(`Added "${file.name}" to project media library!`);
		} catch (err: any) {
			console.error(err);
			toast.error(err.message || "Failed to add asset to project.");
		}
	};

	const handleAddBothToProject = async (origFile: File | null, compFile: File) => {
		try {
			const filesToAdd: File[] = [];
			if (origFile) {
				filesToAdd.push(origFile);
			}
			filesToAdd.push(compFile);

			const processed = await processMediaAssets({ files: filesToAdd });
			const projectId = editor.project.getActive().metadata.id;
			for (const asset of processed) {
				await editor.media.addMediaAsset({ projectId, asset });
			}
			toast.success(
				origFile
					? "Both original and compressed assets added to media library!"
					: "Added compressed asset to media library!",
			);
		} catch (err: any) {
			console.error(err);
			toast.error(err.message || "Failed to add assets to project.");
		}
	};

	// Download result file
	const handleDownload = (file: File) => {
		const url = URL.createObjectURL(file);
		const a = document.createElement("a");
		a.href = url;
		a.download = file.name;
		a.click();
		URL.revokeObjectURL(url);
		toast.success("Download started!");
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-2xl bg-card border-border text-foreground p-0 overflow-hidden shadow-2xl rounded-2xl">
				<DialogHeader className="px-6 py-4 border-b border-border bg-muted/20">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="size-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
								<Minimize2 className="size-5" />
							</div>
							<div>
								<DialogTitle className="text-base font-semibold flex items-center gap-2">
									Media Compressor
									<Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] font-medium rounded-md">
										Lossless & Smart Presets
									</Badge>
								</DialogTitle>
								<p className="text-xs text-muted-foreground mt-0.5">
									Reduce file sizes dramatically with optimal visual clarity.
								</p>
							</div>
						</div>

						{/* Tab Switcher */}
						<div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50 text-xs">
							<button
								type="button"
								onClick={() => setActiveTab("video")}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
									activeTab === "video"
										? "bg-card text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								<HugeiconsIcon icon={Film01Icon} className="size-3.5" />
								Video Compressor
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("image")}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
									activeTab === "image"
										? "bg-card text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								<HugeiconsIcon icon={Image01Icon} className="size-3.5" />
								Image Compressor
							</button>
						</div>
					</div>
				</DialogHeader>

				<div className="p-6">
					{/* VIDEO COMPRESSOR TAB */}
					{activeTab === "video" && (
						<div className="space-y-5">
							<input
								ref={videoInputRef}
								type="file"
								accept="video/*"
								className="hidden"
								onChange={(e) => {
									const f = e.target.files?.[0];
									if (f) {
										setVideoFile(f);
										setVideoResult(null);
									}
								}}
							/>

							{!videoFile ? (
								<button
									type="button"
									onClick={() => videoInputRef.current?.click()}
									className="w-full border-2 border-dashed border-border/80 hover:border-blue-500/60 rounded-xl p-8 flex flex-col items-center justify-center gap-2 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
								>
									<div className="size-11 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
										<HugeiconsIcon icon={CloudUploadIcon} className="size-5" />
									</div>
									<p className="text-sm font-medium text-foreground">
										Choose or Drop a Video to Compress
									</p>
									<p className="text-xs text-muted-foreground">
										Supports MP4, MOV, WebM, MKV up to 4K
									</p>
								</button>
							) : (
								<div className="space-y-4">
									<div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30">
										<div className="flex items-center gap-3 min-w-0">
											<div className="size-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
												<HugeiconsIcon icon={Film01Icon} className="size-4" />
											</div>
											<div className="min-w-0">
												<p className="text-xs font-semibold truncate text-foreground">
													{videoFile.name}
												</p>
												<p className="text-[11px] text-muted-foreground mt-0.5">
													Original size: {formatBytes(videoFile.size)}
												</p>
											</div>
										</div>
										<Button
											variant="ghost"
											size="sm"
											className="text-xs h-7 text-muted-foreground hover:text-foreground"
											onClick={() => {
												setVideoFile(null);
												setVideoResult(null);
											}}
										>
											Change
										</Button>
									</div>

									{/* Settings Grid */}
									<div className="grid grid-cols-3 gap-3">
										<div className="space-y-1.5">
											<Label className="text-xs font-medium">Quality Preset</Label>
											<div className="grid grid-cols-1 gap-1">
												{[
													{ id: "high", name: "High", desc: "~35% reduction" },
													{ id: "balanced", name: "Balanced", desc: "~60% reduction" },
													{ id: "compact", name: "Maximum", desc: "~80% reduction" },
												].map((opt) => (
													<button
														key={opt.id}
														type="button"
														onClick={() => setVideoQuality(opt.id as any)}
														className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
															videoQuality === opt.id
																? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
																: "border-border/60 hover:bg-muted/40 text-foreground"
														}`}
													>
														<div>{opt.name}</div>
														<div className="text-[10px] text-muted-foreground font-normal">
															{opt.desc}
														</div>
													</button>
												))}
											</div>
										</div>

										<div className="space-y-1.5">
											<Label className="text-xs font-medium">Resolution</Label>
											<div className="grid grid-cols-1 gap-1">
												{[
													{ id: "original", name: "Original (Keep)" },
													{ id: "1080p", name: "1080p Full HD" },
													{ id: "720p", name: "720p HD" },
													{ id: "480p", name: "480p SD" },
												].map((opt) => (
													<button
														key={opt.id}
														type="button"
														onClick={() => setVideoResolution(opt.id as any)}
														className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
															videoResolution === opt.id
																? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
																: "border-border/60 hover:bg-muted/40 text-foreground"
														}`}
													>
														{opt.name}
													</button>
												))}
											</div>
										</div>

										<div className="space-y-1.5">
											<Label className="text-xs font-medium">Audio Bitrate</Label>
											<div className="grid grid-cols-1 gap-1">
												{[
													{ id: "128k", name: "128 kbps (Crisp)" },
													{ id: "96k", name: "96 kbps (Voice/Web)" },
													{ id: "64k", name: "64 kbps (Compact)" },
												].map((opt) => (
													<button
														key={opt.id}
														type="button"
														onClick={() => setVideoAudioBitrate(opt.id as any)}
														className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
															videoAudioBitrate === opt.id
																? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
																: "border-border/60 hover:bg-muted/40 text-foreground"
														}`}
													>
														{opt.name}
													</button>
												))}
											</div>
										</div>
									</div>

									{/* Compression Output Card */}
									{videoResult && (
										<div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<div className="size-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
														<HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
													</div>
													<span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
														Compression Complete!
													</span>
												</div>
												<Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-xs">
													-
													{Math.round(
														((videoResult.originalSize - videoResult.compressedSize) /
															videoResult.originalSize) *
															100,
													)}
													% Smaller
												</Badge>
											</div>

											<div className="flex items-center justify-between text-xs py-1 border-y border-border/50">
												<div>
													<span className="text-muted-foreground">Before: </span>
													<span className="font-semibold">{formatBytes(videoResult.originalSize)}</span>
												</div>
												<div className="text-muted-foreground font-bold">➔</div>
												<div>
													<span className="text-muted-foreground">After: </span>
													<span className="font-semibold text-emerald-600 dark:text-emerald-400">
														{formatBytes(videoResult.compressedSize)}
													</span>
												</div>
											</div>

											<div className="flex gap-2 pt-1">
												<Button
													size="sm"
													onClick={() => handleAddToProject(videoResult.file)}
													className="flex-1 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
												>
													<HugeiconsIcon icon={Layers01Icon} className="size-3.5" />
													Add to Project Assets
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() => handleDownload(videoResult.file)}
													className="text-xs gap-1.5"
												>
													<HugeiconsIcon icon={Download01Icon} className="size-3.5" />
													Download
												</Button>
											</div>
										</div>
									)}

									{!videoResult && (
										<Button
											onClick={handleCompressVideo}
											disabled={isCompressingVideo}
											className="w-full text-xs font-semibold py-2 bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md shadow-blue-500/20"
										>
											{isCompressingVideo ? (
												<>
													<span className="animate-spin text-sm">⏳</span>
													Compressing Video...
												</>
											) : (
												<>
													<Minimize2 className="size-4" />
													Compress Video Now
												</>
											)}
										</Button>
									)}
								</div>
							)}
						</div>
					)}

					{/* IMAGE COMPRESSOR TAB */}
					{activeTab === "image" && (
						<div className="space-y-5">
							<input
								ref={imageInputRef}
								type="file"
								accept="image/*"
								className="hidden"
								onChange={(e) => {
									const f = e.target.files?.[0];
									if (f) handleImageSelected(f);
								}}
							/>

							{!imageFile ? (
								<button
									type="button"
									onClick={() => imageInputRef.current?.click()}
									className="w-full border-2 border-dashed border-border/80 hover:border-indigo-500/60 rounded-xl p-8 flex flex-col items-center justify-center gap-2 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
								>
									<div className="size-11 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
										<HugeiconsIcon icon={CloudUploadIcon} className="size-5" />
									</div>
									<p className="text-sm font-medium text-foreground">
										Choose or Drop an Image to Compress
									</p>
									<p className="text-xs text-muted-foreground">
										PNG, JPEG, WebP, AVIF up to 50MB (Instant In-Browser Compression)
									</p>
								</button>
							) : (
								<div className="space-y-4">
									<div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30">
										<div className="flex items-center gap-3 min-w-0">
											<div className="size-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
												<HugeiconsIcon icon={Image01Icon} className="size-4" />
											</div>
											<div className="min-w-0">
												<p className="text-xs font-semibold truncate text-foreground">
													{imageFile.name}
												</p>
												<p className="text-[11px] text-muted-foreground mt-0.5">
													Original size: {formatBytes(imageFile.size)}
												</p>
											</div>
										</div>
										<Button
											variant="ghost"
											size="sm"
											className="text-xs h-7 text-muted-foreground hover:text-foreground"
											onClick={() => {
												setImageFile(null);
												setImageResult(null);
											}}
										>
											Change
										</Button>
									</div>

									{/* Controls */}
									<div className="grid grid-cols-3 gap-3">
										<div className="space-y-1.5">
											<div className="flex items-center justify-between">
												<Label className="text-xs font-medium">Quality ({imageQuality}%)</Label>
											</div>
											<input
												type="range"
												min={10}
												max={100}
												step={5}
												value={imageQuality}
												onChange={(e) => {
													const val = Number(e.target.value);
													setImageQuality(val);
													runImageCompression(imageFile, val, imageFormat, imageMaxDimension);
												}}
												className="w-full accent-indigo-600"
											/>
											<div className="flex justify-between text-[10px] text-muted-foreground">
												<span>Smaller</span>
												<span>Sharper</span>
											</div>
										</div>

										<div className="space-y-1.5">
											<Label className="text-xs font-medium">Output Format</Label>
											<div className="grid grid-cols-3 gap-1">
												{[
													{ id: "image/webp", label: "WebP" },
													{ id: "image/jpeg", label: "JPEG" },
													{ id: "image/png", label: "PNG" },
												].map((fmt) => (
													<button
														key={fmt.id}
														type="button"
														onClick={() => {
															const f = fmt.id as any;
															setImageFormat(f);
															runImageCompression(imageFile, imageQuality, f, imageMaxDimension);
														}}
														className={`py-1 rounded border text-[11px] font-medium transition-all ${
															imageFormat === fmt.id
																? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
																: "border-border/60 hover:bg-muted/40 text-foreground"
														}`}
													>
														{fmt.label}
													</button>
												))}
											</div>
										</div>

										<div className="space-y-1.5">
											<Label className="text-xs font-medium">Max Resolution</Label>
											<div className="grid grid-cols-3 gap-1">
												{[
													{ val: 3840, label: "4K" },
													{ val: 1920, label: "1080p" },
													{ val: 1280, label: "720p" },
												].map((dim) => (
													<button
														key={dim.val}
														type="button"
														onClick={() => {
															setImageMaxDimension(dim.val);
															runImageCompression(imageFile, imageQuality, imageFormat, dim.val);
														}}
														className={`py-1 rounded border text-[11px] font-medium transition-all ${
															imageMaxDimension === dim.val
																? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
																: "border-border/60 hover:bg-muted/40 text-foreground"
														}`}
													>
														{dim.label}
													</button>
												))}
											</div>
										</div>
									</div>

									{/* Image Result Card */}
									{imageResult && (
										<div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<div className="size-6 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
														<HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
													</div>
													<span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
														Instant Live Compression
													</span>
												</div>
												<Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-xs">
													-{imageResult.compressionRatio}% Reduced
												</Badge>
											</div>

											<div className="flex items-center gap-3">
												{imageResult.previewUrl && (
													<div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border border-border bg-black/40">
														<Image
															src={imageResult.previewUrl}
															alt="Compressed preview"
															fill
															className="object-cover"
															unoptimized
														/>
													</div>
												)}
												<div className="min-w-0 flex-1 space-y-1 text-xs">
													<div className="flex justify-between">
														<span className="text-muted-foreground">Original:</span>
														<span className="font-semibold">{formatBytes(imageResult.originalSize)}</span>
													</div>
													<div className="flex justify-between">
														<span className="text-muted-foreground">Compressed:</span>
														<span className="font-semibold text-emerald-600 dark:text-emerald-400">
															{formatBytes(imageResult.compressedSize)}
														</span>
													</div>
													<div className="flex justify-between text-[11px] text-muted-foreground">
														<span>Dimensions:</span>
														<span>{imageResult.width} × {imageResult.height} px</span>
													</div>
												</div>
											</div>

											<div className="flex gap-2 pt-1 flex-wrap">
												<Button
													size="sm"
													onClick={() => handleAddBothToProject(imageFile, imageResult.file)}
													className="flex-1 min-w-[170px] text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
													title="Keep original and also add the optimized compressed copy to Assets"
												>
													<HugeiconsIcon icon={Layers01Icon} className="size-3.5" />
													Add Both (Original & Compressed)
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() => handleAddToProject(imageResult.file)}
													className="text-xs cursor-pointer"
													title="Add only the compressed version to save project space"
												>
													Compressed Only
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() => handleDownload(imageResult.file)}
													className="text-xs gap-1.5 cursor-pointer"
												>
													<HugeiconsIcon icon={Download01Icon} className="size-3.5" />
													Download
												</Button>
											</div>
										</div>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
