"use client";

import { useEditor } from "@/editor/use-editor";
import { useElementSelection } from "@/timeline/hooks/element/use-element-selection";
import { invokeAction } from "@/actions";
import { useAssetsPanelStore, type Tab } from "@/components/editor/panels/assets/assets-panel-store";
import {
	FileVideo,
	Type,
	Sparkles,
	Music,
	Sliders,
	Bot,
	Scissors,
	Trash2,
	Copy,
	Volume2,
	Play,
	Pause,
} from "lucide-react";
import { cn } from "@/utils/ui";
import { TICKS_PER_SECOND } from "@/wasm";

interface MobileEditorDockProps {
	activeSheet: "assets" | "properties" | null;
	onOpenSheet: (sheet: "assets" | "properties", tab?: Tab) => void;
	onCloseSheet: () => void;
}

export function MobileEditorDock({
	activeSheet,
	onOpenSheet,
	onCloseSheet,
}: MobileEditorDockProps) {
	const editor = useEditor();
	const { selectedElements } = useElementSelection();
	const isPlaying = useEditor((e) => e.playback.getIsPlaying());
	const { activeTab } = useAssetsPanelStore();

	const hasSelection = selectedElements.length > 0;

	const handlePlayPause = () => {
		if (isPlaying) {
			editor.playback.pause();
		} else {
			editor.playback.play();
		}
	};

	const handleSplit = (e: React.MouseEvent) => {
		e.stopPropagation();
		invokeAction("split");
	};

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		invokeAction("delete-selected");
	};

	const handleDuplicate = (e: React.MouseEvent) => {
		e.stopPropagation();
		invokeAction("duplicate-selected");
	};

	return (
		<div className="fixed bottom-0 inset-x-0 z-100 flex flex-col pointer-events-auto bg-background/95 backdrop-blur-lg border-t border-border shadow-2xl safe-area-pb">
			{/* Contextual Clip Action Strip (Shown when 1 or more clips are selected) */}
			{hasSelection && (
				<div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 border-b border-border/50 text-xs animate-in slide-in-from-bottom-2 duration-150">
					<div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hidden">
						<button
							type="button"
							onClick={handleSplit}
							className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium active:scale-95 transition-transform"
							title="Split clip at playhead"
						>
							<Scissors className="size-3 text-orange-500" />
							<span>Split</span>
						</button>

						<button
							type="button"
							onClick={() => onOpenSheet("properties")}
							className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium active:scale-95 transition-transform"
							title="Adjust volume and voice enhance"
						>
							<Volume2 className="size-3 text-amber-500" />
							<span>Enhance</span>
						</button>

						<button
							type="button"
							onClick={handleDuplicate}
							className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium active:scale-95 transition-transform"
							title="Duplicate clip"
						>
							<Copy className="size-3 text-blue-400" />
							<span>Duplicate</span>
						</button>

						<button
							type="button"
							onClick={handleDelete}
							className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25 font-medium active:scale-95 transition-transform"
							title="Delete clip"
						>
							<Trash2 className="size-3" />
							<span>Delete</span>
						</button>
					</div>

					<button
						type="button"
						onClick={handlePlayPause}
						className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 ml-2 active:scale-90 transition-transform shadow-sm"
						title={isPlaying ? "Pause" : "Play"}
					>
						{isPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current ml-0.5" />}
					</button>
				</div>
			)}

			{/* Main Mobile Navigation Dock */}
			<nav className="flex items-center justify-around h-14 px-1">
				{/* 1. Media */}
				<button
					type="button"
					onClick={() => onOpenSheet("assets", "media")}
					className={cn(
						"flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors text-[10px] font-medium",
						activeSheet === "assets" && activeTab === "media"
							? "text-primary font-semibold"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					<FileVideo className="size-4" />
					<span>Media</span>
				</button>

				{/* 2. Text */}
				<button
					type="button"
					onClick={() => onOpenSheet("assets", "text")}
					className={cn(
						"flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors text-[10px] font-medium",
						activeSheet === "assets" && activeTab === "text"
							? "text-primary font-semibold"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					<Type className="size-4" />
					<span>Text</span>
				</button>

				{/* 3. Audio */}
				<button
					type="button"
					onClick={() => onOpenSheet("assets", "sounds")}
					className={cn(
						"flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors text-[10px] font-medium",
						activeSheet === "assets" && activeTab === "sounds"
							? "text-primary font-semibold"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					<Music className="size-4" />
					<span>Audio</span>
				</button>

				{/* 4. Effects */}
				<button
					type="button"
					onClick={() => onOpenSheet("assets", "effects")}
					className={cn(
						"flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors text-[10px] font-medium",
						activeSheet === "assets" && activeTab === "effects"
							? "text-primary font-semibold"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					<Sparkles className="size-4" />
					<span>Effects</span>
				</button>

				{/* 5. Adjust / Properties */}
				<button
					type="button"
					onClick={() => onOpenSheet("properties")}
					className={cn(
						"flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors text-[10px] font-medium relative",
						activeSheet === "properties"
							? "text-primary font-semibold"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					<Sliders className="size-4" />
					<span>Adjust</span>
					{hasSelection && (
						<span className="absolute top-1 right-3 size-1.5 rounded-full bg-orange-500 animate-pulse" />
					)}
				</button>

				{/* 6. Amber AI Copilot */}
				<button
					type="button"
					onClick={() => onOpenSheet("assets", "ai")}
					className={cn(
						"flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors text-[10px] font-medium",
						activeSheet === "assets" && activeTab === "ai"
							? "text-amber-500 font-semibold"
							: "text-amber-500/80 hover:text-amber-400",
					)}
				>
					<Bot className="size-4 text-amber-500" />
					<span className="text-amber-500">Amber AI</span>
				</button>
			</nav>
		</div>
	);
}
