"use client";

import { useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { useEditor } from "@/editor/use-editor";
import {
	TRANSITION_DEFINITIONS,
	applyTransitionBetweenClips,
	type TransitionDefinition,
	type TransitionType,
} from "../apply-transition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
	ArrowRightDoubleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Blend,
	Moon,
	Zap,
	Maximize2,
	Minimize2,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	ArrowDown,
	Radio,
	Sparkles,
	Check,
} from "lucide-react";
import { mediaTimeToSeconds, addMediaTime } from "@/wasm";

const ICON_MAP: Record<string, any> = {
	Blend,
	Moon,
	Zap,
	Maximize2,
	Minimize2,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	ArrowDown,
	Radio,
};

export function TransitionsView() {
	const editor = useEditor();
	const activeScene = useEditor((e) => e.scenes.getActiveSceneOrNull());
	const selectedElementIds = useEditor((e) => e.selection.getSelectedIds());
	const currentTime = useEditor((e) => e.playback.getCurrentTime());

	const [activeCategory, setActiveCategory] = useState<string>("all");
	const [duration, setDuration] = useState<number>(0.8);
	const [appliedTransitionId, setAppliedTransitionId] = useState<string | null>(null);

	const categories = ["all", "basic", "movement", "light", "fx"];

	const filteredTransitions =
		activeCategory === "all"
			? TRANSITION_DEFINITIONS
			: TRANSITION_DEFINITIONS.filter((t) => t.category === activeCategory);

	const mainElements = activeScene?.tracks.main?.elements ?? [];
	const trackId = activeScene?.tracks.main?.id ?? "main";

	const handleApplyTransition = (transition: TransitionDefinition, applyToAll = false) => {
		if (mainElements.length < 2) {
			toast.info("Need at least 2 video clips on the main timeline to apply transitions.", {
				description: "Split your video clip or add another clip to create cuts.",
			});
			return;
		}

		if (applyToAll) {
			let appliedCount = 0;
			for (let i = 0; i < mainElements.length - 1; i++) {
				const outgoing = mainElements[i];
				const incoming = mainElements[i + 1];
				if (outgoing && incoming) {
					const success = applyTransitionBetweenClips({
						outgoingClip: outgoing,
						incomingClip: incoming,
						trackId,
						transitionType: transition.id,
						duration,
						editor,
					});
					if (success) appliedCount++;
				}
			}

			setAppliedTransitionId(transition.id);
			toast.success(
				`Applied "${transition.name}" (${duration}s) across all ${appliedCount} cuts on the timeline!`,
			);
			return;
		}

		// Single transition: find cut based on selection or playhead
		let targetCutIndex = 0;

		// 1. Check if an element is selected
		if (selectedElementIds.length > 0) {
			const selectedId = selectedElementIds[0];
			const idx = mainElements.findIndex((el) => el.id === selectedId);
			if (idx !== -1) {
				// If selected clip is not the last clip, apply between it and next clip
				targetCutIndex = idx < mainElements.length - 1 ? idx : Math.max(0, idx - 1);
			}
		} else {
			// 2. Find cut closest to current playhead
			const currentSec = Number(mediaTimeToSeconds({ time: currentTime }).toFixed(3));
			let minDiff = Infinity;
			for (let i = 0; i < mainElements.length - 1; i++) {
				const cutTime = Number(
					mediaTimeToSeconds({
						time: addMediaTime({
							a: mainElements[i].startTime,
							b: mainElements[i].duration,
						}),
					}).toFixed(3),
				);
				const diff = Math.abs(currentSec - cutTime);
				if (diff < minDiff) {
					minDiff = diff;
					targetCutIndex = i;
				}
			}
		}

		const outgoing = mainElements[targetCutIndex];
		const incoming = mainElements[targetCutIndex + 1];

		if (!outgoing || !incoming) {
			toast.error("Could not find adjacent clips at cut point.");
			return;
		}

		const success = applyTransitionBetweenClips({
			outgoingClip: outgoing,
			incomingClip: incoming,
			trackId,
			transitionType: transition.id,
			duration,
			editor,
		});

		if (success) {
			setAppliedTransitionId(transition.id);
			toast.success(
				`Applied "${transition.name}" transition between "${outgoing.name}" and "${incoming.name}"!`,
			);
		}
	};

	return (
		<PanelView title="Transitions">
			<div className="flex flex-col gap-3 p-3">
				{/* Category Pills */}
				<div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
					{categories.map((cat) => (
						<button
							key={cat}
							type="button"
							onClick={() => setActiveCategory(cat)}
							className={`px-2.5 py-1 text-[11px] font-medium rounded-full capitalize transition-all cursor-pointer ${
								activeCategory === cat
									? "bg-primary text-primary-foreground shadow-xs"
									: "bg-muted/50 text-muted-foreground hover:bg-muted"
							}`}
						>
							{cat}
						</button>
					))}
				</div>

				{/* Duration selector */}
				<div className="flex items-center justify-between text-xs px-1 py-1 rounded-lg bg-muted/30 border border-border/50">
					<span className="text-[11px] text-muted-foreground font-medium pl-1">
						Duration:
					</span>
					<div className="flex items-center gap-1">
						{[0.5, 0.8, 1.2, 1.5].map((d) => (
							<button
								key={d}
								type="button"
								onClick={() => setDuration(d)}
								className={`px-2 py-0.5 text-[10px] rounded-md transition-all font-semibold cursor-pointer ${
									duration === d
										? "bg-background text-foreground shadow-xs border"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								{d}s
							</button>
						))}
					</div>
				</div>

				{/* Cut notice */}
				<div className="text-[11px] text-muted-foreground px-1 leading-snug">
					{mainElements.length < 2 ? (
						<span className="text-amber-500">
							Split clips on the timeline to create cuts for transitions.
						</span>
					) : (
						<span>
							Select a clip or position the playhead near a cut, then tap a transition to apply.
						</span>
					)}
				</div>

				{/* Transitions Grid */}
				<div className="grid grid-cols-2 gap-2.5">
					{filteredTransitions.map((t) => {
						const Icon = ICON_MAP[t.iconName] || Blend;
						const isApplied = appliedTransitionId === t.id;

						return (
							<div
								key={t.id}
								className={`flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all hover:border-primary/50 group bg-card/40 ${
									isApplied
										? "border-primary/80 bg-primary/5 shadow-xs"
										: "border-border/70 hover:bg-muted/20"
								}`}
							>
								<div className="flex items-center justify-between mb-2">
									<div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
										<Icon className="size-4" />
									</div>
									<Badge
										variant="outline"
										className="text-[9px] px-1 py-0 uppercase font-mono text-muted-foreground"
									>
										{t.category}
									</Badge>
								</div>

								<div className="mb-2">
									<span className="text-xs font-semibold text-foreground line-clamp-1">
										{t.name}
									</span>
									<span className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
										{t.description}
									</span>
								</div>

								<div className="flex items-center gap-1 pt-1 border-t border-border/40">
									<Button
										size="sm"
										variant="default"
										onClick={() => handleApplyTransition(t, false)}
										className="h-6 text-[10px] px-2 flex-1 rounded-md"
									>
										Apply
									</Button>
									<Button
										size="sm"
										variant="outline"
										onClick={() => handleApplyTransition(t, true)}
										title="Apply to all cuts on the timeline"
										className="h-6 text-[10px] px-1.5 rounded-md text-muted-foreground hover:text-foreground"
									>
										All
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</PanelView>
	);
}
