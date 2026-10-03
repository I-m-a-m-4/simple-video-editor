"use client";

import { useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { useEditor } from "@/editor/use-editor";
import { CREATIVE_FILTERS, type CreativeFilter } from "@/effects/creative-filters";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
	SlidersHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Palette,
	Sliders,
	Check,
	Sparkles,
	RotateCcw,
} from "lucide-react";

export function AdjustmentView() {
	const editor = useEditor();
	const activeScene = useEditor((e) => e.scenes.getActiveSceneOrNull());
	const selectedElementIds = useEditor((e) => e.selection.getSelectedIds());

	const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
	const [vibrancy, setVibrancy] = useState<number>(100);
	const [saturation, setSaturation] = useState<number>(100);
	const [contrast, setContrast] = useState<number>(100);
	const [brightness, setBrightness] = useState<number>(100);

	const mainElements = activeScene?.tracks.main?.elements ?? [];
	const trackId = activeScene?.tracks.main?.id ?? "main";

	const applyFilterToClips = (filter: CreativeFilter, applyToAll = false) => {
		if (mainElements.length === 0) {
			toast.info("Add a video or image to the timeline first.");
			return;
		}

		setActiveFilterId(filter.id);

		const targetIds =
			applyToAll || selectedElementIds.length === 0
				? mainElements.map((el) => el.id)
				: selectedElementIds;

		const updates = mainElements
			.filter((el) => targetIds.includes(el.id))
			.map((el) => ({
				trackId,
				elementId: el.id,
				patch: {
					params: {
						...el.params,
						...filter.params,
					},
				} as any,
			}));

		if (updates.length > 0) {
			editor.timeline.updateElements({ updates });
			toast.success(
				`Applied "${filter.name}" filter to ${updates.length} clip${updates.length > 1 ? "s" : ""}!`,
			);
		}
	};

	const applyManualAdjustment = (applyToAll = false) => {
		if (mainElements.length === 0) return;

		const targetIds =
			applyToAll || selectedElementIds.length === 0
				? mainElements.map((el) => el.id)
				: selectedElementIds;

		const updates = mainElements
			.filter((el) => targetIds.includes(el.id))
			.map((el) => ({
				trackId,
				elementId: el.id,
				patch: {
					params: {
						...el.params,
						colorEnhance: true,
						vibrancy: vibrancy / 100,
						saturation: saturation / 100,
						contrast: contrast / 100,
						brightness: brightness / 100,
					},
				} as any,
			}));

		if (updates.length > 0) {
			editor.timeline.updateElements({ updates });
			toast.success(
				`Adjusted color settings on ${updates.length} clip${updates.length > 1 ? "s" : ""}!`,
			);
		}
	};

	const resetAdjustments = () => {
		setVibrancy(100);
		setSaturation(100);
		setContrast(100);
		setBrightness(100);
		setActiveFilterId(null);
		applyManualAdjustment(true);
		toast.info("Reset color adjustments.");
	};

	return (
		<PanelView title="Adjustment & Filters">
			<div className="flex flex-col gap-4 p-3">
				{/* Creative Filters */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
							<Palette className="size-3.5 text-amber-500" />
							Creative Color Filters
						</span>
						<Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">
							Preset LUTs
						</Badge>
					</div>

					<div className="grid grid-cols-2 gap-2">
						{CREATIVE_FILTERS.map((filter) => {
							const isActive = activeFilterId === filter.id;
							return (
								<button
									key={filter.id}
									type="button"
									onClick={() => applyFilterToClips(filter, false)}
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
										{isActive && <Check className="size-3 text-amber-500" />}
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

				{/* Manual Color Sliders */}
				<div className="space-y-3 pt-3 border-t border-border/50">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
							<Sliders className="size-3.5 text-blue-500" />
							Custom Color Grading
						</span>
						<Button
							size="sm"
							variant="ghost"
							onClick={resetAdjustments}
							className="h-6 text-[10px] px-1.5 gap-1 text-muted-foreground hover:text-foreground"
						>
							<RotateCcw className="size-3" />
							Reset
						</Button>
					</div>

					{/* Vibrancy */}
					<div className="space-y-1">
						<div className="flex justify-between text-[11px]">
							<span className="text-muted-foreground">Vibrancy</span>
							<span className="font-mono font-medium">{vibrancy}%</span>
						</div>
						<Slider
							value={[vibrancy]}
							min={50}
							max={180}
							step={5}
							onValueChange={([val]) => {
								setVibrancy(val);
								applyManualAdjustment();
							}}
						/>
					</div>

					{/* Saturation */}
					<div className="space-y-1">
						<div className="flex justify-between text-[11px]">
							<span className="text-muted-foreground">Saturation</span>
							<span className="font-mono font-medium">{saturation}%</span>
						</div>
						<Slider
							value={[saturation]}
							min={0}
							max={200}
							step={5}
							onValueChange={([val]) => {
								setSaturation(val);
								applyManualAdjustment();
							}}
						/>
					</div>

					{/* Contrast */}
					<div className="space-y-1">
						<div className="flex justify-between text-[11px]">
							<span className="text-muted-foreground">Contrast</span>
							<span className="font-mono font-medium">{contrast}%</span>
						</div>
						<Slider
							value={[contrast]}
							min={50}
							max={180}
							step={5}
							onValueChange={([val]) => {
								setContrast(val);
								applyManualAdjustment();
							}}
						/>
					</div>

					{/* Brightness */}
					<div className="space-y-1">
						<div className="flex justify-between text-[11px]">
							<span className="text-muted-foreground">Brightness</span>
							<span className="font-mono font-medium">{brightness}%</span>
						</div>
						<Slider
							value={[brightness]}
							min={50}
							max={160}
							step={5}
							onValueChange={([val]) => {
								setBrightness(val);
								applyManualAdjustment();
							}}
						/>
					</div>

					<Button
						size="sm"
						variant="secondary"
						onClick={() => applyManualAdjustment(true)}
						className="w-full h-7 text-xs rounded-lg mt-2"
					>
						Apply Grade to All Timeline Clips
					</Button>
				</div>
			</div>
		</PanelView>
	);
}
