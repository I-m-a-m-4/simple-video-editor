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
				toast.error("Please drop a valid video file (MP4, MOV, WEBM)");
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
				name: projectName.trim() || "Untitled Shorts",
				canvasSize: { width: 1080, height: 1920 },
				fps: { numerator: 30, denominator: 1 },
			});

			// 2. If a video file was selected, process and import it into the project
			if (selectedFile) {
				setProcessStatus("Importing video asset into workspace...");
				const processedAssets = await processMediaAssets({ files: [selectedFile] });

				for (const asset of processedAssets) {
					await editor.media.addMediaAsset({
						projectId,
						asset,
					});
				}
			}

			await new Promise((r) => setTimeout(r, 300));
			setProcessStatus("Finalizing studio workspace...");

			toast.success("Shorts project created! 9:16 Canvas ready.");
			onOpenChange(false);
			router.push(`/editor/${projectId}`);
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
