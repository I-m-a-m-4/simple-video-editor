import type { LaunchVideoBlueprint } from "./types";
import { TYPESAFE_JEV_LAUNCH_BLUEPRINT, SAAS_LAUNCH_BLUEPRINT } from "./templates";
import { GROQ_API_URL } from "../types";

export interface GenerateBlueprintOptions {
	prompt: string;
	apiKey?: string;
	model?: string;
	aspectRatio?: "16:9" | "9:16" | "1:1";
	theme?: "obsidian-amber" | "cyber-cyan" | "deep-violet" | "minimal-light";
}

export async function generateLaunchBlueprintWithGroq({
	prompt,
	apiKey,
	model = "openai/gpt-oss-120b",
	aspectRatio = "16:9",
	theme = "obsidian-amber",
}: GenerateBlueprintOptions): Promise<LaunchVideoBlueprint> {
	const trimmed = prompt.trim();

	// Check if this is the TypeSafe / Meet Jev prompt
	if (
		trimmed.toLowerCase().includes("typesafe") ||
		trimmed.toLowerCase().includes("jev") ||
		trimmed.toLowerCase().includes("system one model") ||
		trimmed.toLowerCase().includes("rlcd")
	) {
		return {
			...TYPESAFE_JEV_LAUNCH_BLUEPRINT,
			aspectRatio,
			theme,
		};
	}

	if (!apiKey) {
		// Return template populated with prompt as headline
		return {
			...SAAS_LAUNCH_BLUEPRINT,
			title: prompt.slice(0, 40) || "Product Launch Announcement",
			aspectRatio,
			theme,
			scenes: [
				{
					id: "s1",
					name: "Scene 1: The Reveal",
					layout: "hook-reveal",
					durationSec: 5.0,
					badge: { text: "NEW RELEASE" },
					headline: { text: prompt.slice(0, 36) || "Welcome to the Future", fontSize: 40 },
					subheadline: { text: "Speed, intelligence, and reliability combined.", fontSize: 20 },
				},
				{
					id: "s2",
					name: "Scene 2: Screen Recording & Demo",
					layout: "code-demo",
					durationSec: 7.0,
					badge: { text: "LIVE DEMO" },
					headline: { text: "Engineered for Performance", fontSize: 34 },
					subheadline: { text: "Watch it in action on the live feed.", fontSize: 18 },
					screenRecording: { label: "App & Code Walkthrough" },
				},
				{
					id: "s3",
					name: "Scene 3: Bento Metrics",
					layout: "bento-metrics",
					durationSec: 6.0,
					badge: { text: "BENCHMARK PERFORMANCE" },
					headline: { text: "Unfair Advantage", fontSize: 32 },
					bentoCards: [
						{ stat: "10–100×", label: "Faster", description: "Ultra-low latency" },
						{ stat: "100%", label: "Reliable", description: "Calibrated outputs" },
						{ stat: "0ms", label: "Lag", description: "Local-first execution" },
					],
				},
				{
					id: "s4",
					name: "Scene 4: Call to Action",
					layout: "cta-outro",
					durationSec: 5.0,
					badge: { text: "GET STARTED" },
					headline: { text: "Experience It Today", fontSize: 40 },
					subheadline: { text: "Join innovators testing the new frontier.", fontSize: 20 },
				},
			],
		};
	}

	const systemPrompt = `You are an elite motion graphics director and storyboard artist for high-end tech launch videos (similar to Apple, Linear, Stripe, and Vercel launch announcements).
Convert the user's product launch announcement or notes into a compelling, multi-scene video storyboard blueprint.
You MUST output strictly a JSON object conforming to this exact schema (NO markdown fences, NO preamble):
{
  "title": "string (Video Title)",
  "theme": "obsidian-amber" | "cyber-cyan" | "deep-violet" | "minimal-light",
  "aspectRatio": "${aspectRatio}",
  "scenes": [
    {
      "id": "s_1",
      "name": "Scene 1: Hook / Teaser",
      "layout": "hook-reveal" | "hero-headline" | "code-demo" | "bento-metrics" | "architecture" | "cta-outro",
      "durationSec": 5.0,
      "badge": { "text": "SHORT BADGE (under 4 words)" },
      "headline": { "text": "Punchy Headline (under 6 words)", "fontSize": 40 },
      "subheadline": { "text": "Sub-headline explaining the benefit (1 sentence)", "fontSize": 20 },
      "bentoCards": [ // optional, for bento-metrics
        { "stat": "20–200×", "label": "FASTER", "description": "Short explanation" }
      ],
      "screenRecording": { "label": "Screen Demo Name" }, // optional for code-demo
      "voiceoverScript": "Script for narration"
    }
  ]
}
Create between 4 and 6 polished scenes that tell a complete story: Hook -> Hero Product Unveil -> Screen Demo / Innovation -> Key Metrics (Bento) -> Final Call to Action.`;

	try {
		const response = await fetch(GROQ_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: trimmed },
				],
				temperature: 0.25,
				max_tokens: 1500,
			}),
		});

		if (response.ok) {
			const data = await response.json();
			const content = data.choices?.[0]?.message?.content?.trim();
			if (content) {
				const cleaned = content
					.replace(/```(?:json)?/gi, "")
					.replace(/```/g, "")
					.trim();
				const parsed = JSON.parse(cleaned) as LaunchVideoBlueprint;
				if (parsed && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
					return {
						...parsed,
						theme: theme || parsed.theme || "obsidian-amber",
						aspectRatio: aspectRatio || parsed.aspectRatio || "16:9",
					};
				}
			}
		}
	} catch (err) {
		console.warn("Groq launch video generator error, falling back to curated blueprint:", err);
	}

	return {
		...SAAS_LAUNCH_BLUEPRINT,
		title: prompt.slice(0, 40) || "Product Launch Announcement",
		aspectRatio,
		theme,
	};
}
