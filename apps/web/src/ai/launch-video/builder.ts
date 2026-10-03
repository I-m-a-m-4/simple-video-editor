import { EditorCore } from "@/core";
import type { LaunchVideoBlueprint, LaunchThemeConfig } from "./types";
import { LAUNCH_THEMES } from "./types";
import {
	mediaTimeFromSeconds,
	type MediaTime,
	ZERO_MEDIA_TIME,
} from "@/wasm";
import { buildTextElement } from "@/timeline/element-utils";
import type { Bookmark } from "@/timeline";
import { updateSceneInArray } from "@/timeline/scenes";
import { toast } from "sonner";

export interface BuildLaunchVideoResult {
	success: boolean;
	scenesCount: number;
	totalDurationSec: number;
	elementsCreated: number;
	bookmarksCreated: number;
	screenRecordingLinked: boolean;
}

export async function buildLaunchVideoOnTimeline({
	editor,
	blueprint,
}: {
	editor: EditorCore;
	blueprint: LaunchVideoBlueprint;
}): Promise<BuildLaunchVideoResult> {
	const activeScene = editor.scenes.getActiveSceneOrNull();
	if (!activeScene) {
		throw new Error("No active scene in editor");
	}

	const theme: LaunchThemeConfig =
		LAUNCH_THEMES[blueprint.theme] || LAUNCH_THEMES["obsidian-amber"];

	// 1. Configure Canvas resolution & theme background
	let canvasWidth = 1920;
	let canvasHeight = 1080;
	if (blueprint.aspectRatio === "9:16") {
		canvasWidth = 1080;
		canvasHeight = 1920;
	} else if (blueprint.aspectRatio === "1:1") {
		canvasWidth = 1080;
		canvasHeight = 1080;
	}

	await editor.project.updateSettings({
		settings: {
			canvasSize: { width: canvasWidth, height: canvasHeight },
			background: {
				type: "color",
				color: theme.canvasBg,
			},
		},
	});

	// 2. Discover available user media (especially screen recordings)
	const mediaAssets = editor.media.getAssets();
	const screenRecordingAsset = mediaAssets.find(
		(a) =>
			a.type === "video" &&
			(a.name.toLowerCase().includes("screen") ||
				a.name.toLowerCase().includes("recording") ||
				a.name.toLowerCase().includes("demo") ||
				a.name.toLowerCase().includes("capture")),
	) || mediaAssets.find((a) => a.type === "video");

	let currentTimeSec = 0;
	let elementsCreated = 0;
	const newBookmarks: Bookmark[] = [];
	let hasLinkedScreenRecording = false;

	// Scale factor relative to standard 1080p
	const isVertical = blueprint.aspectRatio === "9:16";

	for (let sceneIdx = 0; sceneIdx < blueprint.scenes.length; sceneIdx++) {
		const sceneSpec = blueprint.scenes[sceneIdx];
		const sceneStartSec = currentTimeSec;
		const sceneDurationSec = Math.max(3, sceneSpec.durationSec || 5);
		const sceneStartTime = mediaTimeFromSeconds({ seconds: sceneStartSec });
		const sceneDuration = mediaTimeFromSeconds({ seconds: sceneDurationSec });

		// Add timeline bookmark for this scene chapter
		newBookmarks.push({
			time: sceneStartTime,
			duration: sceneDuration,
			note: `${sceneSpec.name || `Scene ${sceneIdx + 1}`}: ${sceneSpec.headline?.text || ""}`.slice(0, 60),
		});

		// 3a. Insert Badge Pill if present
		if (sceneSpec.badge?.text) {
			const badgeColor = sceneSpec.badge.color || theme.textAccent;
			const badgeBg = sceneSpec.badge.bgColor || theme.badgeBg;
			const badgeY = isVertical ? -380 : -190;

			const badgeElement = buildTextElement({
				raw: {
					name: `Badge: ${sceneSpec.badge.text}`,
					duration: sceneDuration,
					params: {
						content: `  ${sceneSpec.badge.text.toUpperCase()}  `,
						fontSize: isVertical ? 14 : 13,
						fontWeight: "bold",
						fontFamily: theme.fontFamily,
						color: badgeColor,
						textAlign: "center",
						"transform.positionX": 0,
						"transform.positionY": badgeY,
						"background.enabled": true,
						"background.color": badgeBg,
						"background.cornerRadius": 16,
						"background.paddingX": 16,
						"background.paddingY": 7,
						opacity: 0.95,
					} as any,
				},
				startTime: sceneStartTime,
			});

			editor.timeline.insertElement({
				element: badgeElement,
				placement: { mode: "auto", trackType: "text" },
			});
			elementsCreated++;
		}

		// 3b. Insert Main Headline
		if (sceneSpec.headline?.text) {
			const headlineFontSize =
				sceneSpec.headline.fontSize || (isVertical ? 40 : 44);
			const headlineY = isVertical ? -260 : -100;

			const headlineElement = buildTextElement({
				raw: {
					name: `Headline: ${sceneSpec.headline.text}`,
					duration: sceneDuration,
					params: {
						content: sceneSpec.headline.text,
						fontSize: headlineFontSize,
						fontWeight: "bold",
						fontFamily: theme.fontFamily,
						color: sceneSpec.headline.color || theme.textPrimary,
						textAlign: "center",
						letterSpacing: -0.5,
						lineHeight: 1.15,
						"transform.positionX": 0,
						"transform.positionY": headlineY,
						opacity: 1,
					} as any,
				},
				startTime: sceneStartTime,
			});

			editor.timeline.insertElement({
				element: headlineElement,
				placement: { mode: "auto", trackType: "text" },
			});
			elementsCreated++;
		}

		// 3c. Insert Subheadline / Explanation
		if (sceneSpec.subheadline?.text) {
			const subFontSize = sceneSpec.subheadline.fontSize || (isVertical ? 18 : 20);
			const subY = isVertical ? -140 : -20;

			const subElement = buildTextElement({
				raw: {
					name: `Sub: ${sceneSpec.subheadline.text.slice(0, 20)}...`,
					duration: sceneDuration,
					params: {
						content: sceneSpec.subheadline.text,
						fontSize: subFontSize,
						fontWeight: "normal",
						fontFamily: theme.fontFamily,
						color: sceneSpec.subheadline.color || theme.textSecondary,
						textAlign: "center",
						lineHeight: 1.3,
						"transform.positionX": 0,
						"transform.positionY": subY,
						opacity: 0.9,
					} as any,
				},
				startTime: sceneStartTime,
			});

			editor.timeline.insertElement({
				element: subElement,
				placement: { mode: "auto", trackType: "text" },
			});
			elementsCreated++;
		}

		// 3d. Bento Stat Metrics Cards (for benchmark/metrics scene)
		if (sceneSpec.bentoCards && sceneSpec.bentoCards.length > 0) {
			const cards = sceneSpec.bentoCards.slice(0, 3);
			const count = cards.length;
			const totalWidth = isVertical ? 600 : 960;
			const spacing = totalWidth / count;
			const startX = -((count - 1) * spacing) / 2;
			const cardY = isVertical ? 120 : 130;

			cards.forEach((card, idx) => {
				const posX = isVertical ? 0 : startX + idx * spacing;
				const currentCardY = isVertical ? cardY + idx * 130 : cardY;

				const cardContent = `${card.stat}\n${card.label.toUpperCase()}${
					card.description ? `\n${card.description}` : ""
				}`;

				const cardElement = buildTextElement({
					raw: {
						name: `Card: ${card.label}`,
						duration: sceneDuration,
						params: {
							content: cardContent,
							fontSize: isVertical ? 18 : 20,
							fontWeight: "bold",
							fontFamily: theme.fontFamily,
							color: theme.textAccent,
							textAlign: "center",
							lineHeight: 1.25,
							"transform.positionX": posX,
							"transform.positionY": currentCardY,
							"background.enabled": true,
							"background.color": theme.cardBg,
							"background.cornerRadius": 16,
							"background.paddingX": 24,
							"background.paddingY": 18,
							opacity: 0.95,
						} as any,
					},
					startTime: sceneStartTime,
				});

				editor.timeline.insertElement({
					element: cardElement,
					placement: { mode: "auto", trackType: "text" },
				});
				elementsCreated++;
			});
		}

		// 3e. Screen Recording or Interactive Demo Slot
		if (sceneSpec.screenRecording || sceneSpec.layout === "code-demo") {
			const label =
				sceneSpec.screenRecording?.label || "Live Screen Recording Demo";

			if (screenRecordingAsset) {
				// We have an actual user screen recording in the project!
				try {
					editor.timeline.insertElement({
						element: {
							type: "video",
							mediaId: screenRecordingAsset.id,
							name: screenRecordingAsset.name || label,
							duration: sceneDuration,
							startTime: sceneStartTime,
							trimStart: ZERO_MEDIA_TIME,
							trimEnd: ZERO_MEDIA_TIME,
							sourceDuration: sceneDuration,
							isSourceAudioEnabled: true,
							hidden: false,
							params: {
								"transform.positionX": 0,
								"transform.positionY": isVertical ? 220 : 120,
								"transform.scaleX": isVertical ? 0.65 : 0.75,
								"transform.scaleY": isVertical ? 0.65 : 0.75,
								opacity: 1,
							} as any,
						},
						placement: { mode: "auto", trackType: "video" },
					});
					hasLinkedScreenRecording = true;
					elementsCreated++;
				} catch (err) {
					console.warn("Could not auto-insert recorded video asset:", err);
				}
			} else {
				// Create an aesthetic, clearly labeled placeholder container so the user can easily drop their clip in
				const placeholderElement = buildTextElement({
					raw: {
						name: `[DEMO SLOT] ${label}`,
						duration: sceneDuration,
						params: {
							content: `▶ ${label.toUpperCase()}\n[Drop your Screen Recording or App Demo Video Here]`,
							fontSize: 16,
							fontWeight: "bold",
							fontFamily: theme.fontFamily,
							color: theme.textSecondary,
							textAlign: "center",
							lineHeight: 1.4,
							"transform.positionX": 0,
							"transform.positionY": isVertical ? 240 : 120,
							"background.enabled": true,
							"background.color": "rgba(24, 24, 27, 0.9)",
							"background.cornerRadius": 18,
							"background.paddingX": 48,
							"background.paddingY": 36,
							opacity: 0.85,
						} as any,
					},
					startTime: sceneStartTime,
				});

				editor.timeline.insertElement({
					element: placeholderElement,
					placement: { mode: "auto", trackType: "text" },
				});
				elementsCreated++;
			}
		}

		currentTimeSec += sceneDurationSec;
	}

	// 4. Update scene bookmarks so the timeline has visual markers
	const scenes = editor.scenes.getScenes();
	const updatedScenes = updateSceneInArray({
		scenes,
		sceneId: activeScene.id,
		updates: { bookmarks: newBookmarks },
	});
	editor.scenes.setScenes({ scenes: updatedScenes });

	// 5. Seek playhead to 0 and pause so user can inspect from the beginning
	editor.playback.seek({ time: ZERO_MEDIA_TIME });

	toast.success(`Generated Animated Launch Video: "${blueprint.title}"`, {
		description: `Created ${blueprint.scenes.length} scenes (${currentTimeSec.toFixed(1)}s total) with ${elementsCreated} timeline elements.`,
	});

	return {
		success: true,
		scenesCount: blueprint.scenes.length,
		totalDurationSec: currentTimeSec,
		elementsCreated,
		bookmarksCreated: newBookmarks.length,
		screenRecordingLinked: hasLinkedScreenRecording,
	};
}
