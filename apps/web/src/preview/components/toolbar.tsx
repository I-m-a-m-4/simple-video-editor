"use client";

import { useState, useEffect } from "react";
import { useEditor } from "@/editor/use-editor";
import { formatTimecode } from "opencut-wasm";
import { invokeAction } from "@/actions";
import { EditableTimecode } from "@/components/editable-timecode";
import { Button } from "@/components/ui/button";
import {
	FullScreenIcon,
	PauseIcon,
	PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Separator } from "@/components/ui/separator";
import {
	Select,
	SelectTrigger,
	SelectContent,
	SelectItem,
	SelectSeparator,
} from "@/components/ui/select";
import { PREVIEW_ZOOM_PRESETS } from "@/preview/zoom";
import { usePreviewViewport } from "./preview-viewport";
import { Volume2, VolumeX, Zap } from "lucide-react";
import { GridPopover } from "./guide-popover";
import { usePreviewStore } from "@/preview/preview-store";
import type { MediaTime } from "@/wasm";

export function PreviewToolbar({
	onToggleFullscreen,
}: {
	onToggleFullscreen: () => void;
}) {
	return (
		<div className="grid grid-cols-[1fr_auto_1fr] items-center pb-3 pt-5 px-5">
			<TimecodeDisplay />
			<PlayPauseButton />
			<div className="justify-self-end flex items-center gap-2.5">
				<AudioBoosterControl />
				<Separator orientation="vertical" className="h-4" />
				<ZoomSelect />
				<Separator orientation="vertical" className="h-4" />
				{/* v0.4.0 */}
				{/* <GridPopover>
					<Button
						variant={activeGuideDefinition ? "secondary" : "text"}
						size="icon"
					>
						{activeGuideDefinition ? (
							activeGuideDefinition.renderTriggerIcon()
						) : (
							<HugeiconsIcon icon={GridTableIcon} />
						)}
					</Button>
				</GridPopover> */}
				<Button variant="text" onClick={onToggleFullscreen}>
					<HugeiconsIcon icon={FullScreenIcon} />
				</Button>
			</div>
		</div>
	);
}

function TimecodeDisplay() {
	const editor = useEditor();
	const totalDuration = useEditor((e) => e.timeline.getTotalDuration());
	const fps = useEditor((e) => e.project.getActive().settings.fps);
	const [currentTime, setCurrentTime] = useState<MediaTime>(() =>
		editor.playback.getCurrentTime(),
	);

	useEffect(() => {
		const unsubscribeUpdate = editor.playback.onUpdate(setCurrentTime);
		const unsubscribeSeek = editor.playback.onSeek(setCurrentTime);
		return () => {
			unsubscribeUpdate();
			unsubscribeSeek();
		};
	}, [editor.playback]);

	return (
		<div className="flex items-center">
			<EditableTimecode
				time={currentTime}
				duration={totalDuration}
				format="HH:MM:SS:FF"
				fps={fps}
				onTimeChange={({ time }) => editor.playback.seek({ time })}
				className="text-center"
			/>
			<span className="text-muted-foreground px-2 font-mono text-xs">/</span>
			<span className="text-muted-foreground font-mono text-xs">
				{formatTimecode({
					time: totalDuration,
					format: "HH:MM:SS:FF",
					rate: fps,
				})}
			</span>
		</div>
	);
}

function ZoomSelect() {
	const { isAtFit, zoomPercent, fitToScreen, setViewportPercent } =
		usePreviewViewport();

	const displayLabel = isAtFit ? "Fit" : `${zoomPercent}%`;

	const onValueChange = (value: string) => {
		if (value === "fit") {
			fitToScreen();
		} else {
			setViewportPercent({ percent: Number(value) });
		}
	};

	return (
		<Select
			value={isAtFit ? "fit" : String(zoomPercent)}
			onValueChange={onValueChange}
		>
			<SelectTrigger className="tabular-nums">{displayLabel}</SelectTrigger>
			<SelectContent>
				<SelectItem value="fit">Fit</SelectItem>
				<SelectSeparator />
				{PREVIEW_ZOOM_PRESETS.map((preset) => (
					<SelectItem key={preset} value={String(preset)}>
						{preset}%
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function PlayPauseButton() {
	const isPlaying = useEditor((e) => e.playback.getIsPlaying());

	return (
		<Button
			variant="text"
			size="icon"
			onClick={() => invokeAction("toggle-play")}
		>
			<HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} />
		</Button>
	);
}

function AudioBoosterControl() {
	const editor = useEditor();
	const volume = useEditor((e) => e.playback.getVolume());
	const isMuted = useEditor((e) => e.playback.isMuted());
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		const handleClickOutside = () => setIsOpen(false);
		if (isOpen) {
			window.addEventListener("click", handleClickOutside);
			return () => window.removeEventListener("click", handleClickOutside);
		}
	}, [isOpen]);

	const isBoosted = volume > 1;

	const handleSetVolume = (val: number) => {
		editor.playback.setVolume({ volume: val });
	};

	return (
		<div className="relative">
			<Button
				variant="text"
				size="sm"
				onClick={(e) => {
					e.stopPropagation();
					setIsOpen((prev) => !prev);
				}}
				className={`h-7 px-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
					isBoosted
						? "bg-orange-500/15 text-orange-500 hover:bg-orange-500/20"
						: "text-muted-foreground hover:text-foreground"
				}`}
				title={isBoosted ? `Audio Boost: ${Math.round(volume * 100)}%` : "Audio Booster & Volume"}
			>
				{isMuted || volume === 0 ? (
					<VolumeX className="size-3.5" />
				) : isBoosted ? (
					<Zap className="size-3.5 text-orange-500 fill-orange-500" />
				) : (
					<Volume2 className="size-3.5" />
				)}
				<span className="font-mono text-[11px]">
					{isMuted ? "0%" : `${Math.round(volume * 100)}%`}
				</span>
			</Button>

			{isOpen && (
				<div
					className="absolute bottom-9 right-0 z-50 w-64 p-3.5 rounded-xl bg-popover/95 border border-border backdrop-blur-xl text-popover-foreground shadow-xl space-y-3 select-none"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="flex items-center justify-between border-b border-border/80 pb-2">
						<div className="flex items-center gap-1.5 text-xs font-bold font-clash">
							<Zap className="size-3.5 text-orange-500 fill-orange-500" />
							<span>Audio Booster &amp; Master</span>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => editor.playback.toggleMute()}
							className="size-6 text-muted-foreground hover:text-foreground"
							title={isMuted ? "Unmute" : "Mute"}
						>
							{isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
						</Button>
					</div>

					{/* Volume / Booster Slider */}
					<div className="space-y-1.5">
						<div className="flex items-center justify-between text-[11px] text-muted-foreground">
							<span>Output Level</span>
							<span className={`font-mono font-bold ${isBoosted ? "text-orange-500" : "text-foreground"}`}>
								{isMuted ? "Muted" : `${Math.round(volume * 100)}% ${isBoosted ? `(+${((volume - 1) * 6).toFixed(1)}dB)` : ""}`}
							</span>
						</div>
						<input
							type="range"
							min={0}
							max={3}
							step={0.05}
							value={isMuted ? 0 : volume}
							onChange={(e) => handleSetVolume(parseFloat(e.target.value))}
							className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-orange-500"
						/>
						<div className="flex justify-between text-[10px] text-muted-foreground/60 font-mono">
							<span>0%</span>
							<span>100%</span>
							<span>200%</span>
							<span className="text-orange-500 font-bold">300% Boost</span>
						</div>
					</div>

					{/* Boost Presets */}
					<div className="grid grid-cols-4 gap-1 pt-1">
						{[
							{ label: "100%", val: 1.0 },
							{ label: "150%", val: 1.5 },
							{ label: "200%", val: 2.0 },
							{ label: "300%", val: 3.0 },
						].map((preset) => (
							<button
								key={preset.val}
								type="button"
								onClick={() => handleSetVolume(preset.val)}
								className={`h-6 rounded text-[10px] font-bold transition-all cursor-pointer ${
									Math.abs(volume - preset.val) < 0.05 && !isMuted
										? "bg-orange-500 text-white shadow-xs"
										: "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
								}`}
							>
								{preset.label}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

