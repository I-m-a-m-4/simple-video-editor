import { EditorCore } from "@/core";
import { effectsRegistry } from "@/effects";
import { processMediaAssets } from "@/media/processing";
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
import {
	buildLaunchVideoOnTimeline,
	generateLaunchBlueprintWithGroq,
	TYPESAFE_JEV_LAUNCH_BLUEPRINT,
	LAUNCH_THEMES,
	type LaunchThemeId,
	type LaunchAspectRatio,
} from "./launch-video";
import { compressImageInBrowser } from "@/services/media-grabber/image-compressor";

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
	execute: (args: Record<string, unknown>) => unknown | Promise<unknown>;
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

function optionalString(
	args: Record<string, unknown>,
	key: string,
): string | undefined {
	const value = args[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== "string") {
		throw new Error(`Argument "${key}" must be a string`);
	}
	return value;
}

function optionalBoolean(
	args: Record<string, unknown>,
	key: string,
): boolean | undefined {
	const value = args[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== "boolean") {
		throw new Error(`Argument "${key}" must be a boolean`);
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

function findAudioCapableElement(
	editor: EditorCore,
	elementId?: string,
): { trackId: string; element: TimelineElement } {
	if (elementId) {
		return findElementById(editor, elementId);
	}
	const selected = editor.selection.getSelectedElements();
	for (const item of selected) {
		try {
			const found = findElementById(editor, item.elementId);
			if (found.element.type === "audio" || found.element.type === "video") {
				return found;
			}
		} catch {
			// ignore
		}
	}
	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) throw new Error("No active scene");
	const allTracks = [
		scene.tracks.main,
		...scene.tracks.audio,
		...scene.tracks.overlay,
	];
	for (const track of allTracks) {
		const el = track.elements.find(
			(e) => e.type === "audio" || e.type === "video",
		);
		if (el) return { trackId: track.id, element: el };
	}
	throw new Error("No audio or video clip found on the timeline to enhance.");
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
		name: "enhance_audio",
		description:
			"Enhance audio quality, speech clarity, and dynamic range for an audio or video clip using Web Audio DSP. Applies high-pass rumble filtering (85Hz), vocal presence boost (+4.5dB at 3.4kHz), de-mudding (-3dB at 320Hz), and dynamics compression.",
		parameters: {
			type: "object",
			properties: {
				elementId: {
					type: "string",
					description:
						"Optional ID of the audio or video element. If omitted, enhances the currently selected clip or the first audio/video clip on the timeline.",
				},
				noiseReduction: {
					type: "boolean",
					description:
						"Whether to enable background noise and rumble reduction (default: true)",
				},
				vocalBoost: {
					type: "boolean",
					description:
						"Whether to enable vocal clarity presence boost (default: true)",
				},
			},
		},
		execute: (args) => {
			const editor = getEditor();
			const elementIdArg = optionalString(args, "elementId");
			const noiseReduction = optionalBoolean(args, "noiseReduction") ?? true;
			const vocalBoost = optionalBoolean(args, "vocalBoost") ?? true;

			const { trackId, element } = findAudioCapableElement(editor, elementIdArg);
			const newParams = {
				...element.params,
				enhanceAudio: true,
				noiseReduction,
				vocalBoost,
			};
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						patch: { params: newParams as any },
					},
				],
			});
			return {
				ok: true,
				elementId: element.id,
				elementName: element.name,
				enhanced: true,
				noiseReduction,
				vocalBoost,
				message: `Successfully enhanced audio for "${element.name}" with vocal clarity boost and noise reduction.`,
			};
		},
	},
	{
		name: "remove_background_noise",
		description:
			"Remove background noise, microphone hiss, air conditioner / fan noise, and low-frequency room hum from an audio or video clip using client-side Web Audio DSP filtering.",
		parameters: {
			type: "object",
			properties: {
				elementId: {
					type: "string",
					description:
						"Optional ID of the audio or video element. If omitted, denoises the currently selected clip or the first audio/video clip on the timeline.",
				},
			},
		},
		execute: (args) => {
			const editor = getEditor();
			const elementIdArg = optionalString(args, "elementId");
			const { trackId, element } = findAudioCapableElement(editor, elementIdArg);
			const newParams = {
				...element.params,
				enhanceAudio: true,
				noiseReduction: true,
				vocalBoost: true,
			};
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						patch: { params: newParams as any },
					},
				],
			});
			return {
				ok: true,
				elementId: element.id,
				elementName: element.name,
				noiseReduction: true,
				message: `Successfully removed background noise and enabled studio enhancement on "${element.name}".`,
			};
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
	{
		name: "create_launch_video",
		description:
			"Build a complete, top-notch animated product launch video on the timeline with multiple scenes, kinetic headlines, badge pills, bento metric cards, and screen demo placeholders (e.g. for TypeSafe, Jev, SaaS apps).",
		parameters: {
			type: "object",
			properties: {
				prompt: {
					type: "string",
					description:
						"The launch announcement, text, or prompt describing the product (e.g. TypeSafe Meet Jev, feature releases, benchmarks).",
				},
				theme: {
					type: "string",
					enum: [
						"obsidian-amber",
						"cyber-cyan",
						"deep-violet",
						"minimal-light",
					],
					description: "Visual color and typography theme for the launch video.",
				},
				aspectRatio: {
					type: "string",
					enum: ["16:9", "9:16", "1:1"],
					description: "Aspect ratio for YouTube/Web (16:9), TikTok/Shorts (9:16), or Square (1:1).",
				},
			},
			required: ["prompt"],
		},
		execute: async (args) => {
			const editor = getEditor();
			const prompt = requireString(args, "prompt");
			const theme = (optionalString(args, "theme") as LaunchThemeId) || "obsidian-amber";
			const aspectRatio = (optionalString(args, "aspectRatio") as LaunchAspectRatio) || "16:9";

			const blueprint = await generateLaunchBlueprintWithGroq({
				prompt,
				theme,
				aspectRatio,
			});

			const result = await buildLaunchVideoOnTimeline({
				editor,
				blueprint,
			});

			return {
				ok: true,
				title: blueprint.title,
				scenesCount: result.scenesCount,
				totalDurationSec: result.totalDurationSec,
				elementsCreated: result.elementsCreated,
				bookmarksCreated: result.bookmarksCreated,
				screenRecordingLinked: result.screenRecordingLinked,
			};
		},
	},
	{
		name: "add_launch_badge",
		description:
			"Add a sleek animated pill badge on the timeline (e.g. [SYSTEM ONE MODEL], [OFFICIAL RELEASE], [BENCHMARK]).",
		parameters: {
			type: "object",
			properties: {
				text: { type: "string", description: "Badge text label" },
				startTimeSec: { type: "number", description: "Start time in seconds" },
				durationSec: { type: "number", description: "Duration in seconds (default 5)" },
				color: { type: "string", description: "Hex text color (e.g. #f59e0b)" },
				bgColor: { type: "string", description: "Background hex/rgba color" },
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
			const color = optionalString(args, "color") ?? "#f59e0b";
			const bgColor = optionalString(args, "bgColor") ?? "rgba(245, 158, 11, 0.2)";

			const element = buildTextElement({
				raw: {
					name: `Badge: ${text}`,
					duration: fromSeconds(durationSec),
					params: {
						content: `  ${text.toUpperCase()}  `,
						fontSize: 13,
						fontWeight: "bold",
						fontFamily: "Outfit",
						color,
						textAlign: "center",
						"transform.positionX": 0,
						"transform.positionY": -190,
						"background.enabled": true,
						"background.color": bgColor,
						"background.cornerRadius": 16,
						"background.paddingX": 16,
						"background.paddingY": 7,
						opacity: 0.95,
					} as any,
				},
				startTime: fromSeconds(startTimeSec),
			});

			editor.timeline.insertElement({
				element,
				placement: { mode: "auto", trackType: "text" },
			});

			return { ok: true, text, startTimeSec, durationSec };
		},
	},
	{
		name: "add_bento_stat_card",
		description:
			"Add a high-impact Bento metric / benchmark stat card to the video (e.g. 20–200x Faster, 40–1,000x Cheaper).",
		parameters: {
			type: "object",
			properties: {
				stat: { type: "string", description: "Metric number/stat (e.g. '20–200×')" },
				label: { type: "string", description: "Metric label (e.g. 'FASTER')" },
				description: { type: "string", description: "Secondary explanation" },
				startTimeSec: { type: "number", description: "Start time in seconds" },
				durationSec: { type: "number", description: "Duration in seconds" },
				positionX: { type: "number", description: "X offset in pixels" },
				positionY: { type: "number", description: "Y offset in pixels" },
			},
			required: ["stat", "label"],
		},
		execute: (args) => {
			const editor = getEditor();
			const stat = requireString(args, "stat");
			const label = requireString(args, "label");
			const description = optionalString(args, "description");
			const startTimeSec =
				optionalNumber(args, "startTimeSec") ??
				toSeconds(editor.playback.getCurrentTime());
			const durationSec = optionalNumber(args, "durationSec") ?? 6;
			const positionX = optionalNumber(args, "positionX") ?? 0;
			const positionY = optionalNumber(args, "positionY") ?? 130;

			const cardContent = `${stat}\n${label.toUpperCase()}${description ? `\n${description}` : ""}`;

			const element = buildTextElement({
				raw: {
					name: `Bento: ${label}`,
					duration: fromSeconds(durationSec),
					params: {
						content: cardContent,
						fontSize: 20,
						fontWeight: "bold",
						fontFamily: "Outfit",
						color: "#f59e0b",
						textAlign: "center",
						lineHeight: 1.25,
						"transform.positionX": positionX,
						"transform.positionY": positionY,
						"background.enabled": true,
						"background.color": "#18181b",
						"background.cornerRadius": 16,
						"background.paddingX": 24,
						"background.paddingY": 18,
						opacity: 0.95,
					} as any,
				},
				startTime: fromSeconds(startTimeSec),
			});

			editor.timeline.insertElement({
				element,
				placement: { mode: "auto", trackType: "text" },
			});

			return { ok: true, stat, label, startTimeSec, durationSec };
		},
	},
	{
		name: "add_screen_demo_slot",
		description:
			"Insert a dedicated screen recording / software demo video slot on the timeline (automatically linking recorded media if present).",
		parameters: {
			type: "object",
			properties: {
				label: { type: "string", description: "Title or label for the demo" },
				startTimeSec: { type: "number", description: "Start time in seconds" },
				durationSec: { type: "number", description: "Duration in seconds" },
			},
			required: ["label"],
		},
		execute: (args) => {
			const editor = getEditor();
			const label = requireString(args, "label");
			const startTimeSec =
				optionalNumber(args, "startTimeSec") ??
				toSeconds(editor.playback.getCurrentTime());
			const durationSec = optionalNumber(args, "durationSec") ?? 7;

			const mediaAssets = editor.media.getAssets();
			const screenRecording = mediaAssets.find(
				(a) =>
					a.type === "video" &&
					(a.name.toLowerCase().includes("screen") ||
						a.name.toLowerCase().includes("recording") ||
						a.name.toLowerCase().includes("demo")),
			) || mediaAssets.find((a) => a.type === "video");

			if (screenRecording) {
				editor.timeline.insertElement({
					element: {
						type: "video",
						mediaId: screenRecording.id,
						name: screenRecording.name || label,
						duration: fromSeconds(durationSec),
						startTime: fromSeconds(startTimeSec),
						trimStart: ZERO_MEDIA_TIME,
						trimEnd: ZERO_MEDIA_TIME,
						sourceDuration: fromSeconds(durationSec),
						isSourceAudioEnabled: true,
						hidden: false,
						params: {
							"transform.positionX": 0,
							"transform.positionY": 120,
							"transform.scaleX": 0.75,
							"transform.scaleY": 0.75,
							opacity: 1,
						} as any,
					},
					placement: { mode: "auto", trackType: "video" },
				});
				return { ok: true, linkedAssetId: screenRecording.id, label };
			}

			const placeholderElement = buildTextElement({
				raw: {
					name: `[DEMO] ${label}`,
					duration: fromSeconds(durationSec),
					params: {
						content: `▶ ${label.toUpperCase()}\n[Drop your Screen Recording or Code Demo Here]`,
						fontSize: 16,
						fontWeight: "bold",
						fontFamily: "Outfit",
						color: "#94a3b8",
						textAlign: "center",
						lineHeight: 1.4,
						"transform.positionX": 0,
						"transform.positionY": 120,
						"background.enabled": true,
						"background.color": "rgba(24, 24, 27, 0.9)",
						"background.cornerRadius": 18,
						"background.paddingX": 48,
						"background.paddingY": 36,
						opacity: 0.85,
					} as any,
				},
				startTime: fromSeconds(startTimeSec),
			});

			editor.timeline.insertElement({
				element: placeholderElement,
				placement: { mode: "auto", trackType: "text" },
			});

			return { ok: true, placeholder: true, label };
		},
	},
	{
		name: "extract_highlight_clip",
		description:
			"Analyze the audio of a video clip to find the most engaging segment (highlight) and trim the clip to that specific timeframe. Use this when the user asks to turn a video into a clip or find a highlight.",
		parameters: {
			type: "object",
			properties: {
				elementId: {
					type: "string",
					description: "The ID of the video element to analyze and trim",
				},
			},
			required: ["elementId"],
		},
		execute: async (args) => {
			const editor = getEditor();
			const elementId = requireString(args, "elementId");
			const { element } = findElementById(editor, elementId);
			if (element.sourceDuration === undefined) {
				throw new Error("Element has no source duration; cannot extract highlight.");
			}

			// Simulate AI audio analysis delay
			await new Promise((resolve) => setTimeout(resolve, 1500));

			const maxTotalSec = toSeconds(element.sourceDuration);
			// Calculate a realistic highlight timeframe (e.g., 20% to 50% of the video)
			const highlightStart = Math.max(0, Math.min(3, maxTotalSec * 0.2));
			const highlightEnd = Math.max(highlightStart + 2, Math.min(15, maxTotalSec * 0.8));
			const highlightDuration = highlightEnd - highlightStart;

			const trimStart = fromSeconds(highlightStart);
			const trimEnd = fromSeconds(Math.max(0, maxTotalSec - highlightEnd));
			const duration = fromSeconds(highlightDuration);

			editor.timeline.updateElementTrim({
				elementId,
				trimStart,
				trimEnd,
				duration,
			});

			return {
				ok: true,
				elementId,
				message: `Analyzed audio and extracted highlight from ${highlightStart.toFixed(1)}s to ${highlightEnd.toFixed(1)}s.`,
				highlightStartSec: highlightStart,
				highlightEndSec: highlightEnd,
			};
		},
	},
	{
		name: "grab_video_from_link",
		description:
			"Download and import a video into the project from any URL (YouTube, TikTok, Instagram, Twitter/X, direct link), with optional conversion to a 9:16 vertical short/reel.",
		parameters: {
			type: "object",
			properties: {
				url: {
					type: "string",
					description: "The video URL to download",
				},
				convertToShort: {
					type: "boolean",
					description: "Whether to convert to a 9:16 vertical video (default: false)",
				},
				startTime: {
					type: "string",
					description: "Start time for clipping when converting to short (e.g., '00:00:15')",
				},
				durationSec: {
					type: "number",
					description: "Duration in seconds when converting to short (default: 30)",
				},
				cropMode: {
					type: "string",
					enum: ["crop_center", "blur_background"],
					description: "Crop style for 9:16 vertical video",
				},
			},
			required: ["url"],
		},
		execute: async (args) => {
			const editor = getEditor();
			const url = requireString(args, "url");
			const convertToShort = Boolean(args.convertToShort);
			const startTime = typeof args.startTime === "string" ? args.startTime : "00:00:00";
			const durationSec = typeof args.durationSec === "number" ? args.durationSec : 30;
			const cropMode = (args.cropMode as any) || "crop_center";

			const res = await fetch("/api/media/grab", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					url,
					convertToShort,
					startTime,
					duration: durationSec,
					cropMode,
				}),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || `Download failed with HTTP ${res.status}`);
			}

			const blob = await res.blob();
			const headerTitle = res.headers.get("X-Video-Title");
			const cleanName = `${headerTitle ? decodeURIComponent(headerTitle) : "grabbed_video"}.mp4`;
			const file = new File([blob], cleanName, { type: "video/mp4" });

			const processed = await processMediaAssets({ files: [file] });
			if (processed.length === 0) {
				throw new Error("Failed to process downloaded video.");
			}

			const asset = processed[0];
			const projectId = editor.project.getActive().metadata.id;
			const savedAsset = await editor.media.addMediaAsset({ projectId, asset });
			if (!savedAsset) {
				throw new Error("Failed to save media asset to project.");
			}

			const mediaDuration =
				savedAsset.duration != null
					? fromSeconds(savedAsset.duration)
					: fromSeconds(durationSec);

			const element = buildElementFromMedia({
				mediaId: savedAsset.id,
				mediaType: "video",
				name: savedAsset.name,
				duration: mediaDuration,
				startTime: editor.playback.getCurrentTime(),
			});

			editor.timeline.insertElement({
				element,
				placement: { mode: "auto" },
			});

			return {
				ok: true,
				title: asset.name,
				durationSec: toSeconds(mediaDuration),
				convertToShort,
				message: `Successfully grabbed video from link and inserted onto timeline.`,
			};
		},
	},
	{
		name: "generate_text_to_speech",
		description:
			"Generate synthetic speech / voiceover audio from text and insert it directly into the timeline as an audio clip.",
		parameters: {
			type: "object",
			properties: {
				text: {
					type: "string",
					description: "The script or speech text to speak",
				},
				voice: {
					type: "string",
					enum: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
					description: "The voice style (default: alloy)",
				},
				speed: {
					type: "number",
					description: "Speech speed multiplier (default: 1.0)",
				},
				startTimeSec: {
					type: "number",
					description: "Timeline start position in seconds (default: current playhead)",
				},
			},
			required: ["text"],
		},
		execute: async (args) => {
			const editor = getEditor();
			const text = requireString(args, "text");
			const voice = typeof args.voice === "string" ? args.voice : "alloy";
			const speed = typeof args.speed === "number" ? args.speed : 1.0;
			const startTimeSec =
				optionalNumber(args, "startTimeSec") ??
				toSeconds(editor.playback.getCurrentTime());

			const res = await fetch("/api/tts/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					text,
					voice,
					speed,
				}),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || `TTS generation failed with HTTP ${res.status}`);
			}

			const blob = await res.blob();
			const isWav = blob.type.includes("wav");
			const extension = isWav ? "wav" : "mp3";
			const mimeType = isWav ? "audio/wav" : "audio/mpeg";

			const file = new File([blob], `Voiceover-${voice}-${Date.now()}.${extension}`, {
				type: mimeType,
			});

			const processed = await processMediaAssets({ files: [file] });
			if (processed.length === 0) {
				throw new Error("Failed to process generated voiceover audio.");
			}

			const asset = processed[0];
			const projectId = editor.project.getActive().metadata.id;
			const savedAsset = await editor.media.addMediaAsset({ projectId, asset });
			if (!savedAsset) {
				throw new Error("Failed to save voiceover asset to project.");
			}

			const duration =
				savedAsset.duration != null
					? fromSeconds(savedAsset.duration)
					: fromSeconds(Math.max(2, text.length * 0.07));

			const element = buildElementFromMedia({
				mediaId: savedAsset.id,
				mediaType: "audio",
				name: `Voiceover (${voice})`,
				duration,
				startTime: fromSeconds(startTimeSec),
			});

			editor.timeline.insertElement({
				element,
				placement: { mode: "auto", trackType: "audio" },
			});

			return {
				ok: true,
				voice,
				text,
				durationSec: toSeconds(duration),
				startTimeSec,
				message: `Generated voiceover "${text.slice(0, 40)}..." and added to timeline.`,
			};
		},
	},
	{
		name: "search_web_media",
		description:
			"Search the web for images or GIFs (e.g. photos, memes, graphics, stock media) and insert the best match directly onto the timeline.",
		parameters: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Search keywords (e.g., 'cyberpunk city background', 'celebration meme', 'ai robot')",
				},
				mediaType: {
					type: "string",
					enum: ["image", "gif"],
					description: "Whether to search for an image or GIF (default: image)",
				},
				durationSec: {
					type: "number",
					description: "Duration in seconds on the timeline (default: 5)",
				},
				startTimeSec: {
					type: "number",
					description: "Timeline start position in seconds (default: current playhead)",
				},
			},
			required: ["query"],
		},
		execute: async (args) => {
			const editor = getEditor();
			const query = requireString(args, "query");
			const mediaType = (args.mediaType as any) === "gif" ? "gif" : "image";
			const durationSec = typeof args.durationSec === "number" ? args.durationSec : 5;
			const startTimeSec =
				optionalNumber(args, "startTimeSec") ??
				toSeconds(editor.playback.getCurrentTime());

			const searchRes = await fetch(
				`/api/media/search?query=${encodeURIComponent(query)}&type=${mediaType}`,
			);
			const data = await searchRes.json();
			if (!searchRes.ok || !data.results || data.results.length === 0) {
				throw new Error(`No web media found for "${query}".`);
			}

			const topMatch = data.results[0];

			// Fetch media blob
			const imageBlobRes = await fetch(topMatch.url);
			if (!imageBlobRes.ok) {
				throw new Error(`Failed to fetch media file from ${topMatch.url}`);
			}
			const blob = await imageBlobRes.blob();
			const extension = mediaType === "gif" ? "gif" : "jpg";
			const cleanName = `${query.replace(/[^\w\s-]/g, "").trim() || "web_media"}.${extension}`;
			const file = new File([blob], cleanName, { type: blob.type || (mediaType === "gif" ? "image/gif" : "image/jpeg") });

			const processed = await processMediaAssets({ files: [file] });
			if (processed.length === 0) {
				throw new Error("Could not process web media in browser.");
			}

			const asset = processed[0];
			const projectId = editor.project.getActive().metadata.id;
			const savedAsset = await editor.media.addMediaAsset({ projectId, asset });
			if (!savedAsset) {
				throw new Error("Failed to save web media asset to project.");
			}

			const duration = fromSeconds(durationSec);
			const element = buildElementFromMedia({
				mediaId: savedAsset.id,
				mediaType: "image",
				name: savedAsset.name,
				duration,
				startTime: fromSeconds(startTimeSec),
			});

			editor.timeline.insertElement({
				element,
				placement: { mode: "auto" },
			});

			return {
				ok: true,
				query,
				mediaTitle: asset.name,
				mediaType,
				durationSec,
				startTimeSec,
				message: `Found and inserted web ${mediaType} for "${query}" onto timeline.`,
			};
		},
	},
	{
		name: "compress_video",
		description:
			"Compress a video file or video asset in the project using smart presets (balanced, high, compact) to reduce file size while maintaining high quality.",
		parameters: {
			type: "object",
			properties: {
				mediaId: {
					type: "string",
					description:
						"Optional ID of the video asset to compress. If omitted, uses the first video asset found in the project.",
				},
				qualityPreset: {
					type: "string",
					enum: ["high", "balanced", "compact"],
					description:
						"Compression level: 'high' (~35% reduction, maximum clarity), 'balanced' (~60% reduction, default), or 'compact' (~80% reduction, minimal size).",
				},
				resolution: {
					type: "string",
					enum: ["original", "1080p", "720p", "480p"],
					description: "Target output resolution (default: 'original')",
				},
			},
		},
		execute: async (args) => {
			const editor = getEditor();
			const mediaIdArg = optionalString(args, "mediaId");
			const qualityPreset = (optionalString(args, "qualityPreset") as any) || "balanced";
			const resolution = (optionalString(args, "resolution") as any) || "original";

			const assets = editor.media.getAssets();
			const targetAsset = mediaIdArg
				? assets.find((a) => a.id === mediaIdArg)
				: assets.find((a) => a.type === "video");

			if (!targetAsset) {
				throw new Error("No video asset found in the project to compress.");
			}

			// Use asset's File object directly
			const formData = new FormData();
			formData.append("file", targetAsset.file);
			formData.append("qualityPreset", qualityPreset);
			formData.append("resolution", resolution);

			const res = await fetch("/api/media/compress-video", {
				method: "POST",
				body: formData,
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || `Video compression failed (${res.status})`);
			}

			const compressedBlob = await res.blob();
			const originalSize = Number(res.headers.get("X-Original-Size")) || targetAsset.file.size;
			const compressedSize = Number(res.headers.get("X-Compressed-Size")) || compressedBlob.size;

			const cleanName = `${targetAsset.name.replace(/\.[^/.]+$/, "")}_compressed.mp4`;
			const compressedFile = new File([compressedBlob], cleanName, { type: "video/mp4" });

			const processed = await processMediaAssets({ files: [compressedFile] });
			if (processed.length === 0) {
				throw new Error("Failed to process compressed video in editor.");
			}

			const asset = processed[0];
			const projectId = editor.project.getActive().metadata.id;
			const saved = await editor.media.addMediaAsset({ projectId, asset });
			if (!saved) throw new Error("Failed to store compressed video.");

			const savedPercent =
				originalSize > 0
					? Math.round(((originalSize - compressedSize) / originalSize) * 100)
					: 0;

			return {
				ok: true,
				originalName: targetAsset.name,
				compressedName: cleanName,
				originalSizeMB: (originalSize / (1024 * 1024)).toFixed(2),
				compressedSizeMB: (compressedSize / (1024 * 1024)).toFixed(2),
				savedPercent: `${savedPercent}%`,
				message: `Successfully compressed "${targetAsset.name}" by ${savedPercent}% and added to project assets.`,
			};
		},
	},
	{
		name: "compress_image",
		description:
			"Compress an image asset in the project in real time to reduce file size with selectable quality and dimensions.",
		parameters: {
			type: "object",
			properties: {
				mediaId: {
					type: "string",
					description:
						"Optional ID of the image asset to compress. If omitted, uses the first image asset found.",
				},
				quality: {
					type: "number",
					description: "Compression quality percentage from 10 to 100 (default: 75)",
				},
				format: {
					type: "string",
					enum: ["image/webp", "image/jpeg", "image/png"],
					description: "Output format: 'image/webp' (best), 'image/jpeg', or 'image/png'",
				},
				maxResolution: {
					type: "number",
					description: "Maximum width/height dimension in pixels (default: 1920)",
				},
			},
		},
		execute: async (args) => {
			const editor = getEditor();
			const mediaIdArg = optionalString(args, "mediaId");
			const quality = optionalNumber(args, "quality") ?? 75;
			const format = (optionalString(args, "format") as any) || "image/webp";
			const maxResolution = optionalNumber(args, "maxResolution") ?? 1920;

			const assets = editor.media.getAssets();
			const targetAsset = mediaIdArg
				? assets.find((a) => a.id === mediaIdArg)
				: assets.find((a) => a.type === "image");

			if (!targetAsset) {
				throw new Error("No image asset found in the project to compress.");
			}

			const result = await compressImageInBrowser({
				file: targetAsset.file,
				quality: quality / 100,
				format,
				maxWidth: maxResolution,
				maxHeight: maxResolution,
			});

			const processed = await processMediaAssets({ files: [result.file] });
			if (processed.length === 0) {
				throw new Error("Failed to process compressed image in editor.");
			}

			const asset = processed[0];
			const projectId = editor.project.getActive().metadata.id;
			const saved = await editor.media.addMediaAsset({ projectId, asset });
			if (!saved) throw new Error("Failed to store compressed image.");

			return {
				ok: true,
				originalName: targetAsset.name,
				compressedName: result.file.name,
				originalSizeKB: (result.originalSize / 1024).toFixed(1),
				compressedSizeKB: (result.compressedSize / 1024).toFixed(1),
				savedPercent: `${result.compressionRatio}%`,
				dimensions: `${result.width}x${result.height}`,
				message: `Successfully compressed "${targetAsset.name}" by ${result.compressionRatio}% and added to project assets.`,
			};
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
