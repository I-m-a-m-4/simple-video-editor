"use client";

import { useState, useEffect } from "react";
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
import { useEditor } from "@/editor/use-editor";
import { toast } from "sonner";
import {
	Video,
	Smartphone,
	Square,
	Tv,
	Sparkles,
	Wand2,
	Scissors,
	ArrowRight,
	Loader2,
	Check,
	Film,
	Sliders,
} from "lucide-react";
import type { TCanvasSize } from "@/project/types";

export type ProjectMode = "standard" | "shorts" | "ai-video" | "ai-image" | "ai-model";

interface CreateProjectModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	initialMode?: ProjectMode;
	initialName?: string;
}

interface AspectRatioOption {
	id: string;
	label: string;
	ratio: string;
	size: TCanvasSize;
	icon: any;
	description: string;
	popular?: boolean;
}

const ASPECT_RATIOS: AspectRatioOption[] = [
	{
		id: "16:9",
		label: "Landscape",
		ratio: "16:9",
		size: { width: 1920, height: 1080 },
		icon: Tv,
		description: "YouTube, PC, TV",
		popular: true,
	},
	{
		id: "9:16",
		label: "Portrait",
		ratio: "9:16",
		size: { width: 1080, height: 1920 },
		icon: Smartphone,
		description: "TikTok, Shorts, Reels",
		popular: true,
	},
	{
		id: "1:1",
		label: "Square",
		ratio: "1:1",
		size: { width: 1080, height: 1080 },
		icon: Square,
		description: "Instagram, Social Post",
	},
	{
		id: "4:5",
		label: "Feed",
		ratio: "4:5",
		size: { width: 1080, height: 1350 },
		icon: Smartphone,
		description: "Instagram, Facebook",
	},
	{
		id: "21:9",
		label: "Cinematic",
		ratio: "21:9",
		size: { width: 2560, height: 1080 },
		icon: Film,
		description: "Ultra-wide Screen",
	},
];

export function CreateProjectModal({
	isOpen,
	onOpenChange,
	initialMode = "standard",
	initialName = "",
}: CreateProjectModalProps) {
	const editor = useEditor();
	const router = useRouter();

	const [projectName, setProjectName] = useState(initialName || "New Project");
	const [selectedRatio, setSelectedRatio] = useState<string>(
		initialMode === "shorts" ? "9:16" : "16:9",
	);
	const [fps, setFps] = useState<number>(30);
	const [isCreating, setIsCreating] = useState(false);
	const [creationStep, setCreationStep] = useState<string>("Configuring canvas...");

	// Sync defaults when modal opens or initialMode changes
	useEffect(() => {
		if (isOpen) {
			if (initialMode === "shorts") {
				setProjectName(initialName || "Viral Shorts Reel");
				setSelectedRatio("9:16");
			} else if (initialMode === "ai-video") {
				setProjectName(initialName || "AI Generated Video");
				setSelectedRatio("16:9");
			} else {
				setProjectName(initialName || "New Project");
				setSelectedRatio("16:9");
			}
			setIsCreating(false);
		}
	}, [isOpen, initialMode, initialName]);

	const handleCreate = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (isCreating) return;

		const trimmedName = projectName.trim() || "Untitled Project";
		const selectedConfig =
			ASPECT_RATIOS.find((r) => r.id === selectedRatio) || ASPECT_RATIOS[0];

		setIsCreating(true);
		setCreationStep("Setting up workspace...");

		try {
			await new Promise((r) => setTimeout(r, 200));
			setCreationStep("Initializing GPU canvas & timeline...");

			const projectId = await editor.project.createNewProject({
				name: trimmedName,
				canvasSize: selectedConfig.size,
				fps: { numerator: fps, denominator: 1 },
			});

			await new Promise((r) => setTimeout(r, 250));
			setCreationStep("Opening editor...");

			onOpenChange(false);
			router.push(`/editor/${projectId}`);
		} catch (error) {
			toast.error("Failed to create project");
			setIsCreating(false);
		}
	};

	const selectedConfig =
		ASPECT_RATIOS.find((r) => r.id === selectedRatio) || ASPECT_RATIOS[0];

	return (
		<Dialog open={isOpen} onOpenChange={isCreating ? () => {} : onOpenChange}>
			<DialogContent className="max-w-lg bg-card border border-border p-6 shadow-2xl rounded-2xl">
				<DialogHeader className="space-y-1.5 text-left">
					<div className="flex items-center gap-2">
						<div className="size-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xs">
							{initialMode === "shorts" ? (
								<Scissors className="size-4" />
							) : initialMode === "ai-video" ? (
								<Wand2 className="size-4" />
							) : (
								<Video className="size-4" />
							)}
						</div>
						<DialogTitle className="text-lg font-bold text-foreground">
							{initialMode === "shorts"
								? "Create Shorts Project"
								: initialMode === "ai-video"
									? "AI Video Studio Project"
									: "Create New Project"}
						</DialogTitle>
					</div>
					<DialogDescription className="text-xs text-muted-foreground">
						Select canvas dimensions and project settings for your timeline.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleCreate} className="space-y-5 pt-3">
					{/* Project Name */}
					<div className="space-y-1.5 text-left">
						<Label htmlFor="proj-name" className="text-xs font-semibold text-foreground">
							Project Name
						</Label>
						<Input
							id="proj-name"
							value={projectName}
							onChange={(e) => setProjectName(e.target.value)}
							placeholder="Enter project title..."
							disabled={isCreating}
							className="h-10 text-xs rounded-xl bg-background border-border focus-visible:ring-orange-500"
							autoFocus
						/>
					</div>

					{/* Canvas Aspect Ratio */}
					<div className="space-y-2 text-left">
						<div className="flex items-center justify-between">
							<Label className="text-xs font-semibold text-foreground">
								Aspect Ratio & Canvas
							</Label>
							<span className="text-[11px] text-muted-foreground font-mono">
								{selectedConfig.size.width} × {selectedConfig.size.height}
							</span>
						</div>

						<div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
							{ASPECT_RATIOS.map((item) => {
								const isSelected = selectedRatio === item.id;
								const Icon = item.icon;
								return (
									<button
										key={item.id}
										type="button"
										onClick={() => setSelectedRatio(item.id)}
										disabled={isCreating}
										className={`relative p-2.5 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer ${
											isSelected
												? "border-orange-500 bg-orange-500/10 text-orange-500 ring-2 ring-orange-500/20 shadow-xs"
												: "border-border bg-background/50 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
										}`}
									>
										{item.popular && (
											<span className="absolute -top-1.5 -right-1 text-[8px] bg-orange-500 text-white px-1 py-0 rounded font-bold">
												HOT
											</span>
										)}
										<Icon className={`size-5 ${isSelected ? "text-orange-500" : ""}`} />
										<span className="text-xs font-bold font-mono">{item.ratio}</span>
										<span className="text-[10px] text-muted-foreground truncate w-full">
											{item.label}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Framerate & Resolution */}
					<div className="grid grid-cols-2 gap-3 pt-1 text-left">
						<div className="space-y-1.5">
							<Label className="text-xs font-semibold text-foreground">
								Framerate
							</Label>
							<div className="grid grid-cols-2 gap-1.5 bg-muted/40 p-1 rounded-xl border border-border">
								{[30, 60].map((rate) => (
									<button
										key={rate}
										type="button"
										onClick={() => setFps(rate)}
										disabled={isCreating}
										className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
											fps === rate
												? "bg-background text-foreground shadow-xs"
												: "text-muted-foreground hover:text-foreground"
										}`}
									>
										{rate} FPS
									</button>
								))}
							</div>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs font-semibold text-foreground">
								Composition
							</Label>
							<div className="flex items-center justify-between h-[38px] px-3 bg-muted/30 border border-border rounded-xl text-xs">
								<span className="text-muted-foreground font-medium">Standard</span>
								<Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-none font-bold text-[10px]">
									1080p HD
								</Badge>
							</div>
						</div>
					</div>

					{/* Actions */}
					<div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
							disabled={isCreating}
							className="text-xs h-9 px-4 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isCreating}
							className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-md gap-2 cursor-pointer transition-all min-w-[130px]"
						>
							{isCreating ? (
								<>
									<Loader2 className="size-3.5 animate-spin" />
									<span className="text-[11px] truncate">{creationStep}</span>
								</>
							) : (
								<>
									<span>Launch Editor</span>
									<ArrowRight className="size-3.5" />
								</>
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
