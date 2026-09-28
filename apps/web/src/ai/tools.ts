import { EditorCore } from "@/core";
import { effectsRegistry } from "@/effects";
import {
	buildElementFromMedia,
	buildLibraryAudioElement,
	buildTextElement,
	getElementsAtTime,
} from "@/timeline/element-utils";
import type { TimelineElement } from "@/timeline";
import type { GroqToolDefinition } from "./types";
import {
	mediaTimeFromSeconds,
	mediaTimeToSeconds,
	type MediaTime,
	ZERO_MEDIA_TIME,
} from "@/wasm";

interface JsonSchemaProperty {
	type: "string" | "number" | "boolean" | "array" | "object";
	description?: string;
	enum?: string[];
	items?: { type: "string" | "number" };
}

export interface AiToolDefinition {
	name: string;
	description: string;
	parameters: {
		type: "object";
		properties: Record<string, JsonSchemaProperty>;
		required?: string[];
	};
	execute: (args: Record<string, unknown>) => unknown;
}

function getEditor(): EditorCore {
	return EditorCore.getInstance();
}

function fromSeconds(seconds: number): MediaTime {
	return mediaTimeFromSeconds({ seconds });
}

function toSeconds(time: MediaTime): number {
	return Number(mediaTimeToSeconds({ time }).toFixed(3));
}

function requireString(
	args: Record<string, unknown>,
	key: string,
): string {
	const value = args[key];
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`Missing required string argument: "${key}"`);
	}
	return value;
}

function optionalNumber(
	args: Record<string, unknown>,
	key: string,
): number | undefined {
	const value = args[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error(`Argument "${key}" must be a number`);
	}
	return value;
}

function requireNumber(
	args: Record<string, unknown>,
	key: string,
): number {
	const value = optionalNumber(args, key);
	if (value === undefined) {
		throw new Error(`Missing required number argument: "${key}"`);
	}
	return value;
}

function findElementById(
	editor: EditorCore,
	elementId: string,
): { trackId: string; element: TimelineElement } {
	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) throw new Error("No active scene");
	const allTracks = [
		...scene.tracks.overlay,
		scene.tracks.main,
		...scene.tracks.audio,
	];
	for (const track of allTracks) {
		const element = track.elements.find((item) => item.id === elementId);
		if (element) return { trackId: track.id, element };
	}
	throw new Error(`Element not found: ${elementId}`);
}

function serializeElement(editor: EditorCore, element: TimelineElement) {
	const result: Record<string, unknown> = {
		id: element.id,
		name: element.name,
		type: element.type,
		startTimeSec: toSeconds(element.startTime),
		durationSec: toSeconds(element.duration),
	};
	if (element.sourceDuration !== undefined) {
		result.sourceDurationSec = toSeconds(element.sourceDuration);
		result.trimStartSec = toSeconds(element.trimStart);
		result.trimEndSec = toSeconds(element.trimEnd);
	}
	if ("mediaId" in element && element.mediaId) {
		const asset = editor.media
			.getAssets()
			.find((item) => item.id === element.mediaId);
		result.mediaId = element.mediaId;
		result.mediaName = asset?.name ?? null;
	}
	if (element.type === "text") {
		result.text = element.params.content ?? null;
	}
	if (element.type === "audio") {
		result.sourceType = element.sourceType;
	}
	if ("retime" in element && element.retime) {
		result.speed = element.retime.rate;
	}
	const effects =
		"effects" in element ? (element.effects ?? []) : [];
	if (effects.length > 0) {
		result.effects = effects.map((effect) => ({
			id: effect.id,
			type: effect.type,
			enabled: effect.enabled,
		}));
	}
	const elementParams = element.params as Record<string, unknown> | undefined;
	if (elementParams?.volume !== undefined) {
		result.volumeDb = elementParams.volume;
	}
	if (elementParams?.opacity !== undefined) {
		result.opacity = elementParams.opacity;
	}
	return result;
}

function getTimelineTracks(editor: EditorCore) {
	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) throw new Error("No active scene");
	return scene.tracks;
}

export const aiTools: AiToolDefinition[] = [
	{
		name: "get_timeline_state",
		description:
			"Get the full current state of the video project timeline: all tracks, clips/elements with their IDs, times in seconds, text content, effects, the playhead position, playback state, selection, and project settings (fps, canvas size). Call this first when the user asks for any edit so you know the exact element IDs to operate on.",
		parameters: { type: "object", properties: {} },
		execute: () => {
			const editor = getEditor();
			const tracks = getTimelineTracks(editor);
			const project = editor.project.getActive();
			const serializeTrack = (track: {
				id: string;
				name: string;
				type: string;
				elements: TimelineElement[];
			}) => ({
				id: track.id,
				name: track.name,
				type: track.type,
				elements: track.elements.map((element) =>
					serializeElement(editor, element),
				),
			});
			return {
				project: project
					? {
							name: project.metadata.name,
							fps: project.settings.fps,
							canvas: project.settings.canvasSize,
						}
					: null,
				durationSec: toSeconds(editor.timeline.getTotalDuration()),
				playheadSec: toSeconds(editor.playback.getCurrentTime()),
				isPlaying: editor.playback.getIsPlaying(),
				selectedElementIds:
					editor.selection.getSelectedElements().map((item) => item.elementId),
				tracks: [
					...tracks.overlay.map(serializeTrack),
					serializeTrack(tracks.main),
					...tracks.audio.map(serializeTrack),
				],
			};
		},
	},
	{
		name: "list_media_assets",
		description:
			"List the media assets in the project media library (videos, images, audio the user imported). Returns asset IDs, names, types and durations. Use the IDs with add_media_to_timeline.",
		parameters: { type: "object", properties: {} },
		execute: () => {
			const editor = getEditor();
			return editor.media.getAssets().map((asset) => ({
				id: asset.id,
				name: asset.name,
				type: asset.type,
				durationSec:
					asset.duration !== undefined
						? Number(asset.duration.toFixed(3))
						: null,
				width: asset.width ?? null,
				height: asset.height ?? null,
				fps: asset.fps ?? null,
			}));
		},
	},
	{
		name: "add_media_to_timeline",
		description:
			"Add a media asset (video, image, or audio) from the project media library onto the timeline. If the user asks to add/use a clip, first call list_media_assets to find the right asset ID.",
		parameters: {
			type: "object",
			properties: {
				mediaId: {
					type: "string",
					description: "The media asset ID from list_media_assets",
				},
				startTimeSec: {
					type: "number",
					description:
						"Where on the timeline the element starts, in seconds. Defaults to the current playhead position.",
				},
				durationSec: {
					type: "number",
					description:
						"Clip duration in seconds. Defaults to the full source duration.",
				},
			},
			required: ["mediaId"],
		},
		execute: (args) => {
			const editor = getEditor();
			const mediaId = requireString(args, "mediaId");
			const asset = editor.media
				.getAssets()
				.find((item) => item.id === mediaId);
			if (!asset) throw new Error(`Media asset not found: ${mediaId}`);
			const startTimeSec =
				optionalNumber(args, "startTimeSec") ??
				toSeconds(editor.playback.getCurrentTime());
			let duration: MediaTime | undefined;
			const requestedDurationSec = optionalNumber(args, "durationSec");
			if (requestedDurationSec !== undefined && asset.duration) {
				duration = fromSeconds(
					Math.min(requestedDurationSec, asset.duration),
				);
			}
			const element = buildElementFromMedia({
				mediaId,
				mediaType: asset.type,
				name: asset.name,
				duration: duration ?? fromSeconds(asset.duration ?? 5),
				startTime: fromSeconds(startTimeSec),
			});
			editor.timeline.insertElement({
				element,
				placement: { mode: "auto" },
			});
			return {
				ok: true,
				mediaName: asset.name,
				mediaType: asset.type,
				startTimeSec,
				durationSec: toSeconds(
					duration ?? fromSeconds(asset.duration ?? 5),
				),
			};
		},
	},
	{
		name: "add_text",
		description:
			"Add a text element to the timeline with styling. Times are in seconds.",
		parameters: {
			type: "object",
			properties: {
				text: { type: "string", description: "The text content" },
				startTimeSec: {
					type: "number",
					description: "Start time in seconds (default: playhead)",
				},
				durationSec: {
					type: "number",
					description: "Duration in seconds (default: 5)",
				},
				fontSize: { type: "number", description: "Font size (default 15)" },
				color: { type: "string", description: "Hex color, e.g. #ffffff" },
				fontFamily: { type: "string", description: "Font family (default Arial)" },
				fontWeight: { type: "string", enum: ["normal", "bold"] },
				fontStyle: { type: "string", enum: ["normal", "italic"] },
				textAlign: { type: "string", enum: ["left", "center", "right"] },
				positionX: {
					type: "number",
					description: "X position offset from center in canvas pixels",
				},
				positionY: {
					type: "number",
					description: "Y position offset from center in canvas pixels",
				},
				opacity: { type: "number", description: "Opacity 0-1" },
			},
			required: ["text"],
		},
		execute: (args) => {
			const editor = getEditor();
			const text = requireString(args, "text");
			const startTimeSec =
				optionalNumber(args, "startTimeSec") ??
				toSeconds(editor.playback.getCurrentTime());
			const durationSec = optionalNumber(args, "durationSec") ?? 5;
			const params: Record<string, unknown> = { content: text };
			const numberKeys = ["fontSize", "opacity", "positionX", "positionY"];
			const stringKeys = [
				"color",
				"fontFamily",
				"fontWeight",
				"fontStyle",
				"textAlign",
			];
			const keyMap: Record<string, string> = {
				positionX: "transform.positionX",
				positionY: "transform.positionY",
			};
			for (const key of numberKeys) {
				const value = optionalNumber(args, key);
				if (value !== undefined) params[keyMap[key] ?? key] = value;
			}
			for (const key of stringKeys) {
				const value = args[key];
				if (typeof value === "string") params[keyMap[key] ?? key] = value;
			}
			const element = buildTextElement({
				raw: { params: params as any, duration: fromSeconds(durationSec) },
				startTime: fromSeconds(startTimeSec),
			});
			editor.timeline.insertElement({
				element,
				placement: { mode: "auto" },
			});
			return { ok: true, text, startTimeSec, durationSec };
		},
	},
	{
		name: "add_audio_from_url",
		description:
			"Add a library audio element (e.g. a music track URL) to the timeline.",
		parameters: {
			type: "object",
			properties: {
				url: { type: "string", description: "Direct URL to the audio file" },
				name: { type: "string", description: "Display name for the audio" },
				startTimeSec: {
					type: "number",
					description: "Start time in seconds (default: playhead)",
				},
				durationSec: {
					type: "number",
					description: "Duration in seconds (default: 30)",
				},
			},
			required: ["url"],
		},
		execute: (args) => {
			const editor = getEditor();
			const url = requireString(args, "url");
			const name =
				typeof args.name === "string" ? args.name : "Audio from URL";
			const startTimeSec =
				optionalNumber(args, "startTimeSec") ??
				toSeconds(editor.playback.getCurrentTime());
			const durationSec = optionalNumber(args, "durationSec") ?? 30;
			const element = buildLibraryAudioElement({
				sourceUrl: url,
				name,
				duration: fromSeconds(durationSec),
				startTime: fromSeconds(startTimeSec),
			});
			editor.timeline.insertElement({
				element,
				placement: { mode: "auto" },
			});
			return { ok: true, name, startTimeSec, durationSec };
		},
	},
	{
		name: "split_element",
		description:
			"Split a single clip/element at a specific time into two clips.",
		parameters: {
			type: "object",
			properties: {
				elementId: { type: "string" },
				splitTimeSec: {
					type: "number",
					description:
						"The timeline time in seconds where the split happens (must be inside the element)",
				},
			},
			required: ["elementId", "splitTimeSec"],
		},
		execute: (args) => {
			const editor = getEditor();
			const elementId = requireString(args, "elementId");
			const splitTimeSec = requireNumber(args, "splitTimeSec");
			const { trackId } = findElementById(editor, elementId);
			editor.timeline.splitElements({
				elements: [{ trackId, elementId }],
				splitTime: fromSeconds(splitTimeSec),
			});
			return { ok: true, elementId, splitTimeSec };
		},
	},
	{
		name: "split_at_playhead",
		description:
			"Split the currently selected elements (or all elements under the playhead if nothing is selected) at the playhead position.",
		parameters: { type: "object", properties: {} },
		execute: () => {
			const editor = getEditor();
			const time = editor.playback.getCurrentTime();
			const selected = editor.selection.getSelectedElements();
			const elements =
				selected.length > 0
					? selected
					: getElementsAtTime({
							tracks: getTimelineTracks(editor),
							time,
						});
			if (elements.length === 0) {
				return { ok: false, message: "No elements at the playhead to split" };
			}
			editor.timeline.splitElements({ elements, splitTime: time });
			return { ok: true, splitCount: elements.length };
		},
	},
	{
		name: "delete_elements",
		description:
			"Delete one or more clips/elements from the timeline by their IDs. This is undoable.",
		parameters: {
			type: "object",
			properties: {
				elementIds: {
					type: "array",
					items: { type: "string" },
					description: "The element IDs to delete",
				},
			},
			required: ["elementIds"],
		},
		execute: (args) => {
			const editor = getEditor();
			const rawIds = args.elementIds;
			if (!Array.isArray(rawIds)) {
				throw new Error("elementIds must be an array of strings");
			}
			const targets: Array<{ trackId: string; elementId: string }> = [];
			for (const elementId of rawIds) {
				if (typeof elementId !== "string") continue;
				const found = findElementById(editor, elementId);
				targets.push({ trackId: found.trackId, elementId });
			}
			if (targets.length === 0) {
				return { ok: false, message: "No valid elements to delete" };
			}
			editor.timeline.deleteElements({ elements: targets });
			return { ok: true, deletedCount: targets.length };
		},
	},
	{
		name: "duplicate_elements",
		description:
			"Duplicate one or more clips/elements, placing the copies right after the originals.",
		parameters: {
			type: "object",
			properties: {
				elementIds: {
					type: "array",
					items: { type: "string" },
					description: "The element IDs to duplicate",
				},
			},
			required: ["elementIds"],
		},
		execute: (args) => {
			const editor = getEditor();
			const rawIds = args.elementIds;
			if (!Array.isArray(rawIds)) {
				throw new Error("elementIds must be an array of strings");
			}
			const targets: Array<{ trackId: string; elementId: string }> = [];
			for (const elementId of rawIds) {
				if (typeof elementId !== "string") continue;
				const found = findElementById(editor, elementId);
				targets.push({ trackId: found.trackId, elementId });
			}
			if (targets.length === 0) {
				return { ok: false, message: "No valid elements to duplicate" };
			}
			editor.timeline.duplicateElements({ elements: targets });
			return { ok: true, duplicatedCount: targets.length };
		},
	},
	{
		name: "move_element",
		description:
			"Move a clip/element to a new start time on the timeline (in seconds).",
		parameters: {
			type: "object",
			properties: {
				elementId: { type: "string" },
				startTimeSec: {
					type: "number",
					description: "The new start time in seconds",
				},
			},
			required: ["elementId", "startTimeSec"],
		},
		execute: (args) => {
			const editor = getEditor();
			const elementId = requireString(args, "elementId");
			const startTimeSec = requireNumber(args, "startTimeSec");
			const { trackId } = findElementById(editor, elementId);
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId,
						patch: { startTime: fromSeconds(startTimeSec) },
					},
				],
			});
			return { ok: true, elementId, startTimeSec };
		},
	},
	{
		name: "set_element_duration",
		description:
			"Set the on-timeline duration of a clip/element in seconds. For media clips the duration is clamped to the available source length; use trim_element for precise source in/out control.",
		parameters: {
			type: "object",
			properties: {
				elementId: { type: "string" },
				durationSec: { type: "number", description: "New duration in seconds" },
			},
			required: ["elementId", "durationSec"],
		},
		execute: (args) => {
			const editor = getEditor();
			const elementId = requireString(args, "elementId");
			const durationSec = requireNumber(args, "durationSec");
			const { trackId, element } = findElementById(editor, elementId);
			let newDuration = fromSeconds(durationSec);
			if (element.sourceDuration !== undefined) {
				const availableSec =
					toSeconds(element.sourceDuration) -
					toSeconds(element.trimStart) -
					toSeconds(element.trimEnd);
				if (durationSec > availableSec) {
					newDuration = fromSeconds(Math.max(0, availableSec));
				}
			}
			const patch: Record<string, unknown> = { duration: newDuration };
			if (element.sourceDuration !== undefined) {
				const trimEndSec = Math.max(
					0,
					toSeconds(element.sourceDuration) -
						toSeconds(element.trimStart) -
						toSeconds(newDuration),
				);
				patch.trimEnd = fromSeconds(trimEndSec);
			}
			editor.timeline.updateElements({
				updates: [{ trackId, elementId, patch }],
			});
			return { ok: true, elementId, durationSec: toSeconds(newDuration) };
		},
	},
	{
		name: "trim_element",
		description:
			"Trim a media clip by setting source in/out points (trimStart/trimEnd in seconds). The element duration becomes sourceDuration - trimStart - trimEnd.",
		parameters: {
			type: "object",
			properties: {
				elementId: { type: "string" },
				trimStartSec: {
					type: "number",
					description: "Source in-point in seconds (default: keep current)",
				},
				trimEndSec: {
					type: "number",
					description:
						"Source out-point offset from the end, in seconds (default: keep current)",
				},
			},
			required: ["elementId"],
		},
		execute: (args) => {
			const editor = getEditor();
			const elementId = requireString(args, "elementId");
			const { element } = findElementById(editor, elementId);
			if (element.sourceDuration === undefined) {
				throw new Error(
					"Element has no source duration; trimming applies to media clips only",
				);
			}
			const trimStartSec =
				optionalNumber(args, "trimStartSec") ?? toSeconds(element.trimStart);
			const trimEndSec =
				optionalNumber(args, "trimEndSec") ?? toSeconds(element.trimEnd);
			const maxTotalSec = toSeconds(element.sourceDuration);
			if (trimStartSec + trimEndSec >= maxTotalSec) {
				throw new Error(
					`trimStartSec + trimEndSec must be less than the source duration (${maxTotalSec}s)`,
				);
			}
			const trimStart = fromSeconds(Math.max(0, trimStartSec));
			const trimEnd = fromSeconds(Math.max(0, trimEndSec));
			const duration = fromSeconds(
				Math.max(0, maxTotalSec - trimStartSec - trimEndSec),
			);
			editor.timeline.updateElementTrim({
				elementId,
				trimStart,
				trimEnd,
				duration,
			});
			return {
				ok: true,
				elementId,
				trimStartSec: toSeconds(trimStart),
				trimEndSec: toSeconds(trimEnd),
				newDurationSec: toSeconds(duration),
			};
		},
	},
	{
		name: "update_element_params",
		description:
			"Update style/property parameters of an element. For text elements use keys like content, fontSize, color, fontFamily, fontWeight, textAlign, letterSpacing, lineHeight. All visual elements support opacity (0-1), transform.positionX, transform.positionY, transform.scaleX, transform.scaleY, transform.rotate (degrees). Audio/video support volume (decibels, -60 to 20) and muted (boolean).",
		parameters: {
			type: "object",
			properties: {
				elementId: { type: "string" },
				params: {
					type: "object",
					description:
						"Key-value map of parameter names to new values, e.g. {\"fontSize\": 32, \"color\": \"#ff0000\"}",
				},
			},
			required: ["elementId", "params"],
		},
		execute: (args) => {
			const editor = getEditor();
			const elementId = requireString(args, "elementId");
			const params = args.params;
			if (
				typeof params !== "object" ||
				params === null ||
				Array.isArray(params)
			) {
				throw new Error('params must be an object, e.g. {"fontSize": 32}');
			}
			const { trackId } = findElementById(editor, elementId);
			editor.timeline.updateElements({
				updates: [{ trackId, elementId, patch: { params: params as any } }],
			});
			return { ok: true, elementId, updatedParams: params };
		},
	},
	{
		name: "list_available_effects",
		description:
			"List the clip effects available in this editor with their parameter definitions. Use with add_effect.",
		parameters: { type: "object", properties: {} },
		execute: () => {
			return effectsRegistry.getAll().map((def) => ({
				type: def.type,
				name: def.name,
				params: def.params.map((param) => ({
					key: param.key,
					type: param.type,
					default: param.default,
					min: "min" in param ? param.min : null,
					max: "max" in param ? param.max : null,
				})),
			}));
		},
	},
	{
		name: "add_effect",
		description:
			"Add a clip effect (e.g. blur) to a visual element. Call list_available_effects for valid effect types.",
		parameters: {
			type: "object",
			properties: {
				elementId: { type: "string" },
				effectType: { type: "string", description: "Effect type, e.g. blur" },
			},
			required: ["elementId", "effectType"],
		},
		execute: (args) => {
			const editor = getEditor();
			const elementId = requireString(args, "elementId");
			const effectType = requireString(args, "effectType");
			if (!effectsRegistry.has(effectType)) {
				throw new Error(
					`Unknown effect type "${effectType}". Call list_available_effects for valid types.`,
				);
			}
			const { trackId } = findElementById(editor, elementId);
			const effectId = editor.timeline.addClipEffect({
				trackId,
				elementId,
				effectType,
			});
			return { ok: true, effectId, effectType, elementId };
		},
	},
	{
		name: "update_effect_params",
		description:
			"Update the parameters of an effect applied to a clip (e.g. blur strength).",
		parameters: {
			type: "object",
			properties: {
				elementId: { type: "string" },
				effectId: { type: "string" },
				params: {
					type: "object",
					description: "Key-value map of effect parameter names to values",
				},
			},
			required: ["elementId", "effectId", "params"],
		},
		execute: (args) => {
			const editor = getEditor();
			const elementId = requireString(args, "elementId");
			const effectId = requireString(args, "effectId");
			const params = args.params;
			if (typeof params !== "object" || params === null) {
				throw new Error("params must be an object");
			}
			const { trackId } = findElementById(editor, elementId);
			editor.timeline.updateClipEffectParams({
				trackId,
				elementId,
				effectId,
				params,
			});
			return { ok: true, elementId, effectId, params };
		},
	},
	{
		name: "remove_effect",
		description: "Remove an effect from a clip.",
		parameters: {
			type: "object",
			properties: {
				elementId: { type: "string" },
				effectId: { type: "string" },
			},
			required: ["elementId", "effectId"],
		},
		execute: (args) => {
			const editor = getEditor();
			const elementId = requireString(args, "elementId");
			const effectId = requireString(args, "effectId");
			const { trackId } = findElementById(editor, elementId);
			editor.timeline.removeClipEffect({ trackId, elementId, effectId });
			return { ok: true, elementId, effectId };
		},
	},
	{
		name: "set_element_speed",
		description:
			"Change the playback speed/rate of a video or audio clip (e.g. 0.5 for slow motion, 2 for double speed).",
		parameters: {
			type: "object",
			properties: {
				elementId: { type: "string" },
				rate: {
					type: "number",
					description: "Speed multiplier, e.g. 0.5 or 2",
				},
			},
			required: ["elementId", "rate"],
		},
		execute: (args) => {
			const editor = getEditor();
			const elementId = requireString(args, "elementId");
			const rate = requireNumber(args, "rate");
			if (rate <= 0) throw new Error("rate must be positive");
			const { trackId } = findElementById(editor, elementId);
			editor.timeline.updateElementRetime({
				trackId,
				elementId,
				retime: { rate },
			});
			return { ok: true, elementId, rate };
		},
	},
	{
		name: "play",
		description: "Start timeline playback from the current playhead.",
		parameters: { type: "object", properties: {} },
		execute: () => {
			getEditor().playback.play();
			return { ok: true, playing: true };
		},
	},
	{
		name: "pause",
		description: "Pause timeline playback.",
		parameters: { type: "object", properties: {} },
		execute: () => {
			getEditor().playback.pause();
			return { ok: true, playing: false };
		},
	},
	{
		name: "seek",
		description: "Move the playhead to a specific time in seconds.",
		parameters: {
			type: "object",
			properties: {
				timeSec: { type: "number", description: "Target time in seconds" },
			},
			required: ["timeSec"],
		},
		execute: (args) => {
			const editor = getEditor();
			const timeSec = requireNumber(args, "timeSec");
			editor.playback.seek({ time: fromSeconds(timeSec) });
			return { ok: true, playheadSec: timeSec };
		},
	},
	{
		name: "undo",
		description:
			"Undo the last edit. Use when the user asks to revert or when a previous tool call made an unwanted change.",
		parameters: { type: "object", properties: {} },
		execute: () => {
			const editor = getEditor();
			if (!editor.command.canUndo()) {
				return { ok: false, message: "Nothing to undo" };
			}
			editor.command.undo();
			return { ok: true };
		},
	},
	{
		name: "redo",
		description: "Redo the last undone edit.",
		parameters: { type: "object", properties: {} },
		execute: () => {
			const editor = getEditor();
			if (!editor.command.canRedo()) {
				return { ok: false, message: "Nothing to redo" };
			}
			editor.command.redo();
			return { ok: true };
		},
	},
];

export function executeAiTool(
	name: string,
	args: Record<string, unknown>,
): unknown {
	const tool = aiTools.find((item) => item.name === name);
	if (!tool) {
		throw new Error(`Unknown tool: ${name}`);
	}
	return tool.execute(args);
}

export function toGroqTools(): GroqToolDefinition[] {
	return aiTools.map((tool) => ({
		type: "function" as const,
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters,
		},
	}));
}
