import { useEditor } from "@/editor/use-editor";
import { useElementSelection } from "@/timeline/hooks/element/use-element-selection";
import {
	TooltipProvider,
	Tooltip,
	TooltipTrigger,
	TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
	SplitButton,
	SplitButtonLeft,
	SplitButtonRight,
	SplitButtonSeparator,
} from "@/components/ui/split-button";
import { Slider } from "@/components/ui/slider";
import { TIMELINE_ZOOM_BUTTON_FACTOR } from "./interaction";
import { TIMELINE_ZOOM_MAX } from "@/timeline/scale";
import { sliderToZoom, zoomToSlider } from "@/timeline/zoom-utils";
import { ScenesView } from "@/components/editor/scenes-view";
import { type TActionWithOptionalArgs, invokeAction } from "@/actions";
import {
	canToggleSourceAudio,
	getSourceAudioActionLabel,
	isSourceAudioSeparated,
} from "@/timeline/audio-separation";
import { hasMediaId } from "@/timeline";
import { cn } from "@/utils/ui";
import { useTimelineStore } from "@/timeline/timeline-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Bookmark02Icon,
	Delete02Icon,
	SnowIcon,
	ScissorIcon,
	MagnetIcon,
	SearchAddIcon,
	SearchMinusIcon,
	Copy01Icon,
	AlignLeftIcon,
	AlignRightIcon,
	Link02Icon,
	Layers01Icon,
	Chart03Icon,
	Unlink02Icon,
	MusicNote03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { OcRippleIcon } from "@/components/icons";
import { GraphEditorPopover } from "./graph-editor/popover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGraphEditorController } from "./graph-editor/use-controller";
import { Info, Keyboard } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function TimelineToolbar({
	zoomLevel,
	minZoom,
	setZoomLevel,
}: {
	zoomLevel: number;
	minZoom: number;
	setZoomLevel: ({ zoom }: { zoom: number }) => void;
}) {
	const isMobile = useIsMobile();
	const handleZoom = ({ direction }: { direction: "in" | "out" }) => {
		const newZoomLevel =
			direction === "in"
				? Math.min(TIMELINE_ZOOM_MAX, zoomLevel * TIMELINE_ZOOM_BUTTON_FACTOR)
				: Math.max(minZoom, zoomLevel / TIMELINE_ZOOM_BUTTON_FACTOR);
		setZoomLevel({ zoom: newZoomLevel });
	};

	return (
		<div className="w-full overflow-x-auto overflow-y-hidden scrollbar-hidden touch-pan-x bg-background/95 border-b select-none">
			<div className="flex h-10 items-center justify-between gap-2.5 px-2 py-1 min-w-max w-full">
				<ToolbarLeftSection isMobile={isMobile} />

				<SceneSelector isMobile={isMobile} />

				<ToolbarRightSection
					isMobile={isMobile}
					zoomLevel={zoomLevel}
					minZoom={minZoom}
					onZoomChange={(zoom) => setZoomLevel({ zoom })}
					onZoom={handleZoom}
				/>
			</div>
		</div>
	);
}

function ToolbarLeftSection({ isMobile }: { isMobile?: boolean }) {
	const editor = useEditor();
	const mediaAssets = useEditor((currentEditor) =>
		currentEditor.media.getAssets(),
	);
	const { selectedElements } = useElementSelection();
	const graphEditor = useGraphEditorController();
	const isCurrentlyBookmarked = useEditor((e) =>
		e.scenes.isBookmarked({ time: e.playback.getCurrentTime() }),
	);
	const selectedElement =
		selectedElements.length === 1
			? (editor.timeline.getElementsWithTracks({
					elements: selectedElements,
				})[0] ?? null)
			: null;
	const selectedMediaAsset = (() => {
		if (!selectedElement) {
			return null;
		}

		const { element } = selectedElement;
		if (!hasMediaId(element)) {
			return null;
		}

		return mediaAssets.find((asset) => asset.id === element.mediaId) ?? null;
	})();
	const canToggleSelectedSourceAudio =
		!!selectedElement &&
		canToggleSourceAudio(selectedElement.element, selectedMediaAsset);
	const sourceAudioLabel =
		selectedElement?.element.type === "video"
			? getSourceAudioActionLabel({
					element: selectedElement.element,
				})
			: "Extract audio";
	const isSelectedSourceAudioSeparated =
		selectedElement?.element.type === "video" &&
		isSourceAudioSeparated({
			element: selectedElement.element,
		});

	const handleAction = ({
		action,
		event,
	}: {
		action: TActionWithOptionalArgs;
		event: React.MouseEvent;
	}) => {
		event.stopPropagation();
		invokeAction(action);
	};

	return (
		<div className="flex items-center gap-1 shrink-0">
			<TooltipProvider delayDuration={100}>
				<ToolbarButton
					icon={<HugeiconsIcon icon={ScissorIcon} />}
					tooltip="Split clip at playhead (S)"
					onClick={({ event }) => handleAction({ action: "split", event })}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={AlignLeftIcon} />}
					tooltip="Trim start to playhead (Q)"
					onClick={({ event }) => handleAction({ action: "split-left", event })}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={AlignRightIcon} />}
					tooltip="Trim end to playhead (W)"
					onClick={({ event }) =>
						handleAction({ action: "split-right", event })
					}
				/>

				<ToolbarButton
					icon={
						<HugeiconsIcon
							icon={isSelectedSourceAudioSeparated ? Unlink02Icon : Link02Icon}
						/>
					}
					tooltip={`${sourceAudioLabel} (Separate/Link)`}
					disabled={!canToggleSelectedSourceAudio}
					onClick={({ event }) =>
						handleAction({ action: "toggle-source-audio", event })
					}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={Copy01Icon} />}
					tooltip="Duplicate selected clip (Ctrl+D)"
					onClick={({ event }) =>
						handleAction({ action: "duplicate-selected", event })
					}
				/>

				{!isMobile && (
					<ToolbarButton
						icon={<HugeiconsIcon icon={SnowIcon} />}
						tooltip="Freeze frame (coming soon)"
						disabled={true}
						onClick={({ event: _event }) => {}}
					/>
				)}

				<ToolbarButton
					icon={<HugeiconsIcon icon={Delete02Icon} />}
					tooltip="Delete selected clip (Del / Backspace)"
					onClick={({ event }) =>
						handleAction({ action: "delete-selected", event })
					}
				/>

				<div className="bg-border mx-1 h-6 w-px" />

				<ToolbarButton
					icon={<HugeiconsIcon icon={MusicNote03Icon} className="text-amber-400" />}
					tooltip="Add Audio Track (+ Audio)"
					onClick={({ event }) => {
						event.stopPropagation();
						editor.timeline.addTrack({ type: "audio" });
						toast.success("Added new audio track to timeline");
					}}
				/>

				<Tooltip>
					<ToolbarButton
						icon={<HugeiconsIcon icon={Bookmark02Icon} />}
						isActive={isCurrentlyBookmarked}
						tooltip={isCurrentlyBookmarked ? "Remove bookmark (B)" : "Add bookmark (B)"}
						onClick={({ event }) =>
							handleAction({ action: "toggle-bookmark", event })
						}
					/>
				</Tooltip>

				<GraphEditorPopover
					open={graphEditor.open}
					onOpenChange={graphEditor.onOpenChange}
					value={
						graphEditor.state.status === "ready"
							? graphEditor.state.cubicBezier
							: null
					}
					message={graphEditor.state.message}
					componentOptions={graphEditor.state.componentOptions}
					activeComponentKey={graphEditor.state.activeComponentKey}
					onActiveComponentKeyChange={graphEditor.onActiveComponentKeyChange}
					onPreviewValue={graphEditor.onPreviewValue}
					onCommitValue={graphEditor.onCommitValue}
					onCancelPreview={graphEditor.onCancelPreview}
				>
					<ToolbarButton
						icon={<HugeiconsIcon icon={Chart03Icon} />}
						tooltip={graphEditor.tooltip}
						disabled={!graphEditor.canOpen}
						buttonWrapper={(button) =>
							graphEditor.canOpen ? (
								<PopoverTrigger asChild>{button}</PopoverTrigger>
							) : (
								button
							)
						}
					/>
				</GraphEditorPopover>
			</TooltipProvider>
		</div>
	);
}

function SceneSelector({ isMobile }: { isMobile?: boolean }) {
	const editor = useEditor();
	const currentScene = editor.scenes.getActiveScene();

	return (
		<div className="shrink-0">
			<SplitButton className="border-foreground/10 border">
				<SplitButtonLeft className={isMobile ? "max-w-28 truncate text-xs px-2" : "text-xs"}>
					{currentScene?.name || "No Scene"}
				</SplitButtonLeft>
				<SplitButtonSeparator />
				<ScenesView>
					<SplitButtonRight onClick={() => {}}>
						<HugeiconsIcon icon={Layers01Icon} className="size-4" />
					</SplitButtonRight>
				</ScenesView>
			</SplitButton>
		</div>
	);
}

function ToolbarRightSection({
	isMobile,
	zoomLevel,
	minZoom,
	onZoomChange,
	onZoom,
}: {
	isMobile?: boolean;
	zoomLevel: number;
	minZoom: number;
	onZoomChange: (zoom: number) => void;
	onZoom: (options: { direction: "in" | "out" }) => void;
}) {
	const snappingEnabled = useTimelineStore((s) => s.snappingEnabled);
	const rippleEditingEnabled = useTimelineStore((s) => s.rippleEditingEnabled);
	const toggleSnapping = useTimelineStore((s) => s.toggleSnapping);
	const toggleRippleEditing = useTimelineStore((s) => s.toggleRippleEditing);

	return (
		<div className="flex items-center gap-1 shrink-0">
			<TooltipProvider delayDuration={100}>
				<ToolbarButton
					icon={<HugeiconsIcon icon={MagnetIcon} />}
					isActive={snappingEnabled}
					tooltip="Auto snapping to clips & playhead (M)"
					onClick={() => toggleSnapping()}
				/>

				<ToolbarButton
					icon={<OcRippleIcon size={24} className="scale-110" />}
					isActive={rippleEditingEnabled}
					tooltip="Ripple editing (Auto-shift clips on trim)"
					onClick={() => toggleRippleEditing()}
				/>
			</TooltipProvider>

			<div className="bg-border mx-1 h-6 w-px" />

			<div className="flex items-center gap-1">
				<TooltipProvider delayDuration={100}>
					<ToolbarButton
						icon={<HugeiconsIcon icon={SearchMinusIcon} />}
						tooltip="Zoom out timeline (Ctrl -)"
						onClick={() => onZoom({ direction: "out" })}
					/>
				</TooltipProvider>
				{!isMobile && (
					<Slider
						className="w-28"
						value={[zoomToSlider({ zoomLevel, minZoom })]}
						onValueChange={(values) =>
							onZoomChange(sliderToZoom({ sliderPosition: values[0], minZoom }))
						}
						min={0}
						max={1}
						step={0.005}
					/>
				)}
				<TooltipProvider delayDuration={100}>
					<ToolbarButton
						icon={<HugeiconsIcon icon={SearchAddIcon} />}
						tooltip="Zoom in timeline (Ctrl +)"
						onClick={() => onZoom({ direction: "in" })}
					/>
				</TooltipProvider>
			</div>

			{!isMobile && (
				<>
					<div className="bg-border mx-1 h-6 w-px" />
					<ToolbarShortcutsInfo />
				</>
			)}
		</div>
	);
}

function ToolbarShortcutsInfo() {
	return (
		<Popover>
			<TooltipProvider delayDuration={100}>
				<Tooltip>
					<TooltipTrigger asChild>
						<PopoverTrigger asChild>
							<Button
								variant="text"
								size="icon"
								className="size-7 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer"
								aria-label="Timeline shortcuts and tips"
							>
								<Info className="size-3.5" />
							</Button>
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent>Timeline Keyboard Shortcuts & Tips</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<PopoverContent
				align="end"
				className="w-80 p-4 text-xs space-y-3 bg-card border-border shadow-xl rounded-xl z-200"
			>
				<div className="flex items-center justify-between pb-2 border-b border-border/60">
					<span className="font-semibold text-foreground flex items-center gap-1.5">
						<Keyboard className="size-4 text-orange-500" />
						Timeline Shortcuts
					</span>
					<span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
						Cheatsheet
					</span>
				</div>

				<div className="space-y-1.5">
					<div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
						Cutting & Editing Tools
					</div>
					<div className="grid grid-cols-2 gap-1.5">
						<div className="flex items-center justify-between p-1.5 rounded bg-muted/40">
							<span className="text-muted-foreground">Split clip</span>
							<kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] font-bold">
								S
							</kbd>
						</div>
						<div className="flex items-center justify-between p-1.5 rounded bg-muted/40">
							<span className="text-muted-foreground">Trim start</span>
							<kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] font-bold">
								Q
							</kbd>
						</div>
						<div className="flex items-center justify-between p-1.5 rounded bg-muted/40">
							<span className="text-muted-foreground">Trim end</span>
							<kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] font-bold">
								W
							</kbd>
						</div>
						<div className="flex items-center justify-between p-1.5 rounded bg-muted/40">
							<span className="text-muted-foreground">Duplicate</span>
							<kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] font-bold">
								Ctrl+D
							</kbd>
						</div>
						<div className="flex items-center justify-between p-1.5 rounded bg-muted/40 col-span-2">
							<span className="text-muted-foreground">Delete clip</span>
							<kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] font-bold">
								Del / Backspace
							</kbd>
						</div>
					</div>
				</div>

				<div className="space-y-1.5">
					<div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
						Playback & Navigation
					</div>
					<div className="grid grid-cols-2 gap-1.5">
						<div className="flex items-center justify-between p-1.5 rounded bg-muted/40">
							<span className="text-muted-foreground">Play / Pause</span>
							<kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] font-bold">
								Space
							</kbd>
						</div>
						<div className="flex items-center justify-between p-1.5 rounded bg-muted/40">
							<span className="text-muted-foreground">Bookmark</span>
							<kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] font-bold">
								B
							</kbd>
						</div>
						<div className="flex items-center justify-between p-1.5 rounded bg-muted/40">
							<span className="text-muted-foreground">Snapping</span>
							<kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] font-bold">
								M
							</kbd>
						</div>
						<div className="flex items-center justify-between p-1.5 rounded bg-muted/40">
							<span className="text-muted-foreground">Zoom track</span>
							<kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] font-bold">
								Ctrl+Scroll
							</kbd>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

function ToolbarButton({
	icon,
	tooltip,
	onClick,
	disabled,
	isActive,
	buttonWrapper,
}: {
	icon: React.ReactNode;
	tooltip: string;
	onClick?: ({ event }: { event: React.MouseEvent }) => void;
	disabled?: boolean;
	isActive?: boolean;
	buttonWrapper?: (button: React.ReactElement) => React.ReactElement;
}) {
	const button = (
		<Button
			variant={isActive ? "secondary" : "text"}
			size="icon"
			disabled={disabled}
			onClick={onClick ? (event) => onClick({ event }) : undefined}
			className={cn(
				"rounded-sm shrink-0 touch-manipulation",
				disabled ? "cursor-not-allowed opacity-50" : "",
			)}
		>
			{icon}
		</Button>
	);
	const trigger = disabled ? (
		<span className="inline-flex">{button}</span>
	) : buttonWrapper ? (
		buttonWrapper(button)
	) : (
		button
	);

	return (
		<Tooltip delayDuration={200}>
			<TooltipTrigger asChild>{trigger}</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}
