import { EditorCore } from "@/core";
import type { TimelineElement } from "@/timeline";
import { resolveAnimationTarget } from "@/timeline/animation-targets";
import { upsertPathKeyframe } from "@/animation";
import type { AnimationPath, ElementAnimations } from "@/animation/types";
import {
	mediaTimeFromSeconds,
	mediaTimeToSeconds,
	type MediaTime,
	ZERO_MEDIA_TIME,
} from "@/wasm";

export type TransitionType =
	| "cross_dissolve"
	| "dip_to_black"
	| "dip_to_white"
	| "zoom_in"
	| "zoom_out"
	| "slide_left"
	| "slide_right"
	| "push_up"
	| "push_down"
	| "glitch";

export interface TransitionDefinition {
	id: TransitionType;
	name: string;
	category: "basic" | "movement" | "light" | "fx";
	description: string;
	defaultDuration: number; // in seconds
	iconName: string;
}

export const TRANSITION_DEFINITIONS: TransitionDefinition[] = [
	{
		id: "cross_dissolve",
		name: "Cross Dissolve",
		category: "basic",
		description: "Smoothly dissolves outgoing clip into incoming clip",
		defaultDuration: 0.8,
		iconName: "Blend",
	},
	{
		id: "dip_to_black",
		name: "Dip to Black",
		category: "basic",
		description: "Fades outgoing clip to black, then reveals incoming clip",
		defaultDuration: 0.8,
		iconName: "Moon",
	},
	{
		id: "dip_to_white",
		name: "Flash to White",
		category: "light",
		description: "Brilliant light flash transition between cuts",
		defaultDuration: 0.5,
		iconName: "Zap",
	},
	{
		id: "zoom_in",
		name: "Whip Zoom In",
		category: "movement",
		description: "Rapid energetic scale punch into the next scene",
		defaultDuration: 0.6,
		iconName: "Maximize2",
	},
	{
		id: "zoom_out",
		name: "Zoom Out Pull",
		category: "movement",
		description: "Expansive camera pull-back reveal into next clip",
		defaultDuration: 0.6,
		iconName: "Minimize2",
	},
	{
		id: "slide_left",
		name: "Slide Left",
		category: "movement",
		description: "Seamless lateral wipe transition sliding to the left",
		defaultDuration: 0.7,
		iconName: "ArrowLeft",
	},
	{
		id: "slide_right",
		name: "Slide Right",
		category: "movement",
		description: "Seamless lateral wipe transition sliding to the right",
		defaultDuration: 0.7,
		iconName: "ArrowRight",
	},
	{
		id: "push_up",
		name: "Push Up",
		category: "movement",
		description: "Dynamic upward camera whip transition",
		defaultDuration: 0.7,
		iconName: "ArrowUp",
	},
	{
		id: "push_down",
		name: "Push Down",
		category: "movement",
		description: "Dynamic downward camera whip transition",
		defaultDuration: 0.7,
		iconName: "ArrowDown",
	},
	{
		id: "glitch",
		name: "Cyber Glitch",
		category: "fx",
		description: "Digital artifact jitter and chromatic shift transition",
		defaultDuration: 0.4,
		iconName: "Radio",
	},
];

function addKeyframeToElement(
	element: TimelineElement,
	animations: ElementAnimations | undefined,
	path: AnimationPath,
	timeInSeconds: number,
	value: number,
): ElementAnimations | undefined {
	const target = resolveAnimationTarget({ element, path });
	if (!target) return animations;

	const time: MediaTime = mediaTimeFromSeconds({ seconds: Math.max(0, timeInSeconds) });

	return upsertPathKeyframe({
		animations,
		propertyPath: path,
		time,
		value,
		interpolation: "linear",
		channelLayout: target.channelLayout,
		coerceValue: target.coerceValue,
	});
}

/**
 * Applies real keyframes to create a transition at the cut between outgoing and incoming clips.
 */
export function applyTransitionBetweenClips({
	outgoingClip,
	incomingClip,
	trackId,
	transitionType,
	duration = 0.8,
	editor,
}: {
	outgoingClip: TimelineElement;
	incomingClip: TimelineElement;
	trackId: string;
	transitionType: TransitionType;
	duration?: number;
	editor: EditorCore;
}): boolean {
	const outgoingDuration = Number(
		mediaTimeToSeconds({ time: outgoingClip.duration }).toFixed(3),
	);
	const incomingDuration = Number(
		mediaTimeToSeconds({ time: incomingClip.duration }).toFixed(3),
	);

	const halfDur = duration / 2;
	const outDur = Math.min(halfDur, outgoingDuration * 0.4);
	const inDur = Math.min(halfDur, incomingDuration * 0.4);

	let outAnimations = outgoingClip.animations ? { ...outgoingClip.animations } : undefined;
	let inAnimations = incomingClip.animations ? { ...incomingClip.animations } : undefined;

	switch (transitionType) {
		case "cross_dissolve":
		case "dip_to_black":
			// Outgoing fades from 1.0 down to 0.0
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"opacity",
				Math.max(0, outgoingDuration - outDur),
				1.0,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"opacity",
				outgoingDuration,
				0.0,
			);

			// Incoming fades from 0.0 up to 1.0
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "opacity", 0, 0.0);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "opacity", inDur, 1.0);
			break;

		case "dip_to_white":
			// Fast dip to 0 with quick flash
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"opacity",
				Math.max(0, outgoingDuration - outDur),
				1.0,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"opacity",
				outgoingDuration,
				0.05,
			);

			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "opacity", 0, 0.05);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "opacity", inDur, 1.0);
			break;

		case "zoom_in":
			// Outgoing scales up to 1.35
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.scaleX",
				Math.max(0, outgoingDuration - outDur),
				1.0,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.scaleX",
				outgoingDuration,
				1.35,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.scaleY",
				Math.max(0, outgoingDuration - outDur),
				1.0,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.scaleY",
				outgoingDuration,
				1.35,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"opacity",
				Math.max(0, outgoingDuration - outDur * 0.5),
				1.0,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"opacity",
				outgoingDuration,
				0.0,
			);

			// Incoming scales from 0.7 up to 1.0
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.scaleX", 0, 0.7);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.scaleX", inDur, 1.0);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.scaleY", 0, 0.7);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.scaleY", inDur, 1.0);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "opacity", 0, 0.0);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "opacity", inDur * 0.5, 1.0);
			break;

		case "zoom_out":
			// Outgoing scales down to 0.7
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.scaleX",
				Math.max(0, outgoingDuration - outDur),
				1.0,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.scaleX",
				outgoingDuration,
				0.7,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.scaleY",
				Math.max(0, outgoingDuration - outDur),
				1.0,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.scaleY",
				outgoingDuration,
				0.7,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"opacity",
				Math.max(0, outgoingDuration - outDur),
				1.0,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"opacity",
				outgoingDuration,
				0.0,
			);

			// Incoming scales from 1.3 down to 1.0
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.scaleX", 0, 1.3);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.scaleX", inDur, 1.0);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.scaleY", 0, 1.3);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.scaleY", inDur, 1.0);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "opacity", 0, 0.0);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "opacity", inDur, 1.0);
			break;

		case "slide_left":
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.positionX",
				Math.max(0, outgoingDuration - outDur),
				0.0,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.positionX",
				outgoingDuration,
				-0.9,
			);

			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.positionX", 0, 0.9);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.positionX", inDur, 0.0);
			break;

		case "slide_right":
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.positionX",
				Math.max(0, outgoingDuration - outDur),
				0.0,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.positionX",
				outgoingDuration,
				0.9,
			);

			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.positionX", 0, -0.9);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.positionX", inDur, 0.0);
			break;

		case "push_up":
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.positionY",
				Math.max(0, outgoingDuration - outDur),
				0.0,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.positionY",
				outgoingDuration,
				-0.9,
			);

			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.positionY", 0, 0.9);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.positionY", inDur, 0.0);
			break;

		case "push_down":
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.positionY",
				Math.max(0, outgoingDuration - outDur),
				0.0,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.positionY",
				outgoingDuration,
				0.9,
			);

			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.positionY", 0, -0.9);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.positionY", inDur, 0.0);
			break;

		case "glitch":
			// Opacity and jitter
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.scaleX",
				Math.max(0, outgoingDuration - outDur),
				1.0,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"transform.scaleX",
				Math.max(0, outgoingDuration - outDur * 0.3),
				1.15,
			);
			outAnimations = addKeyframeToElement(
				outgoingClip,
				outAnimations,
				"opacity",
				outgoingDuration,
				0.0,
			);

			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.scaleX", 0, 1.15);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "transform.scaleX", inDur, 1.0);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "opacity", 0, 0.0);
			inAnimations = addKeyframeToElement(incomingClip, inAnimations, "opacity", inDur, 1.0);
			break;
	}

	editor.timeline.updateElements({
		updates: [
			{
				trackId,
				elementId: outgoingClip.id,
				patch: { animations: outAnimations } as any,
			},
			{
				trackId,
				elementId: incomingClip.id,
				patch: { animations: inAnimations } as any,
			},
		],
	});

	return true;
}

/**
 * Applies a real In or Out keyframe animation directly to a single clip.
 */
export function applyClipAnimation({
	element,
	trackId,
	animationType,
	duration = 1.0,
	editor,
}: {
	element: TimelineElement;
	trackId: string;
	animationType:
		| "fade_in"
		| "fade_out"
		| "zoom_in"
		| "zoom_out"
		| "slide_left"
		| "slide_right"
		| "clear";
	duration?: number;
	editor: EditorCore;
}): boolean {
	const clipDuration = Number(
		mediaTimeToSeconds({ time: element.duration }).toFixed(3),
	);
	const effDuration = Math.min(duration, clipDuration * 0.5);

	let animations = element.animations ? { ...element.animations } : undefined;

	if (animationType === "clear") {
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					patch: { animations: undefined } as any,
				},
			],
		});
		return true;
	}

	switch (animationType) {
		case "fade_in":
			animations = addKeyframeToElement(element, animations, "opacity", 0, 0.0);
			animations = addKeyframeToElement(element, animations, "opacity", effDuration, 1.0);
			break;

		case "fade_out":
			animations = addKeyframeToElement(
				element,
				animations,
				"opacity",
				Math.max(0, clipDuration - effDuration),
				1.0,
			);
			animations = addKeyframeToElement(element, animations, "opacity", clipDuration, 0.0);
			break;

		case "zoom_in":
			animations = addKeyframeToElement(element, animations, "transform.scaleX", 0, 1.0);
			animations = addKeyframeToElement(
				element,
				animations,
				"transform.scaleX",
				clipDuration,
				1.25,
			);
			animations = addKeyframeToElement(element, animations, "transform.scaleY", 0, 1.0);
			animations = addKeyframeToElement(
				element,
				animations,
				"transform.scaleY",
				clipDuration,
				1.25,
			);
			break;

		case "zoom_out":
			animations = addKeyframeToElement(element, animations, "transform.scaleX", 0, 1.25);
			animations = addKeyframeToElement(
				element,
				animations,
				"transform.scaleX",
				clipDuration,
				1.0,
			);
			animations = addKeyframeToElement(element, animations, "transform.scaleY", 0, 1.25);
			animations = addKeyframeToElement(
				element,
				animations,
				"transform.scaleY",
				clipDuration,
				1.0,
			);
			break;

		case "slide_left":
			animations = addKeyframeToElement(element, animations, "transform.positionX", 0, 1.0);
			animations = addKeyframeToElement(
				element,
				animations,
				"transform.positionX",
				effDuration,
				0.0,
			);
			break;

		case "slide_right":
			animations = addKeyframeToElement(element, animations, "transform.positionX", 0, -1.0);
			animations = addKeyframeToElement(
				element,
				animations,
				"transform.positionX",
				effDuration,
				0.0,
			);
			break;
	}

	editor.timeline.updateElements({
		updates: [
			{
				trackId,
				elementId: element.id,
				patch: { animations } as any,
			},
		],
	});

	return true;
}
