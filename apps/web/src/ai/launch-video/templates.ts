import type { LaunchVideoBlueprint } from "./types";

export const TYPESAFE_JEV_LAUNCH_BLUEPRINT: LaunchVideoBlueprint = {
	title: "TypeSafe - Meet Jev: System One Model",
	description:
		"Official animation launch video for TypeSafe announcing Jev, the first public System One model optimized for programmatic code.",
	theme: "obsidian-amber",
	aspectRatio: "16:9",
	scenes: [
		{
			id: "scene-1-hook",
			name: "Scene 1: Hook & Brand Entrance",
			layout: "hook-reveal",
			durationSec: 4.5,
			badge: {
				text: "OFFICIAL ANNOUNCEMENT",
				color: "#f59e0b",
				bgColor: "rgba(245, 158, 11, 0.15)",
			},
			headline: {
				text: "Welcome inside TypeSafe",
				fontSize: 38,
				fontWeight: "bold",
				color: "#ffffff",
			},
			subheadline: {
				text: "The new paradigm for reliable programmatic intelligence",
				fontSize: 20,
				color: "#94a3b8",
			},
			voiceoverScript:
				"Welcome inside TypeSafe. Today we're unveiling a new class of AI models.",
		},
		{
			id: "scene-2-hero",
			name: "Scene 2: Meet Jev",
			layout: "hero-headline",
			durationSec: 6.0,
			badge: {
				text: "FIRST PUBLIC SYSTEM ONE MODEL",
				color: "#f59e0b",
				bgColor: "rgba(245, 158, 11, 0.2)",
			},
			headline: {
				text: "Meet Jev",
				fontSize: 48,
				fontWeight: "bold",
				color: "#ffffff",
			},
			subheadline: {
				text: "Optimized for programmatic code. Think: Smart if-statements.",
				fontSize: 22,
				color: "#fbbf24",
			},
			voiceoverScript:
				"Meet Jev, our first System One model designed for inside code.",
		},
		{
			id: "scene-3-demo",
			name: "Scene 3: RLCD Innovation & Screen Demo",
			layout: "code-demo",
			durationSec: 7.5,
			badge: {
				text: "BREAKTHROUGH ALGORITHM",
				color: "#38bdf8",
				bgColor: "rgba(56, 189, 248, 0.15)",
			},
			headline: {
				text: "RLCD: Calibrated Decisions",
				fontSize: 34,
				fontWeight: "bold",
				color: "#ffffff",
			},
			subheadline: {
				text: "2 years researching RLCD to conquer hallucinations, mode dropping & RLHF flaws.",
				fontSize: 18,
				color: "#94a3b8",
			},
			screenRecording: {
				label: "TypeSafe IDE & Console Live Recording",
				position: "center",
			},
			voiceoverScript:
				"Built on RLCD, Jev delivers calibrated probabilistic outputs with true confidence values.",
		},
		{
			id: "scene-4-metrics",
			name: "Scene 4: Unfair Advantage (Bento Metrics)",
			layout: "bento-metrics",
			durationSec: 6.5,
			badge: {
				text: "BENCHMARK PERFORMANCE",
				color: "#10b981",
				bgColor: "rgba(16, 185, 129, 0.15)",
			},
			headline: {
				text: "The Bitterest Lesson: Real Advantage",
				fontSize: 32,
				fontWeight: "bold",
				color: "#ffffff",
			},
			bentoCards: [
				{
					stat: "20–200×",
					label: "Faster",
					description: "Parallel sampling for fast decisions",
				},
				{
					stat: "40–1,000×",
					label: "Cheaper",
					description: "Ultra-lean inference economics",
				},
				{
					stat: "System 1",
					label: "Frontier",
					description: "Instinctive common sense over code & text",
				},
			],
			voiceoverScript:
				"20 to 200 times faster, and up to 1,000 times cheaper than generic frontier models.",
		},
		{
			id: "scene-5-architecture",
			name: "Scene 5: Architecture & Calibrated Probabilities",
			layout: "architecture",
			durationSec: 6.0,
			badge: {
				text: "HONEST TRADEOFFS",
				color: "#f59e0b",
				bgColor: "rgba(245, 158, 11, 0.15)",
			},
			headline: {
				text: "Structured & Machine-Native",
				fontSize: 34,
				fontWeight: "bold",
				color: "#ffffff",
			},
			subheadline: {
				text: "Consistent calibrated results. Each decision returns a confidence score you can use in code.",
				fontSize: 18,
				color: "#94a3b8",
			},
			voiceoverScript:
				"Machine-native structured outputs with exact confidence scores you can safely branch on.",
		},
		{
			id: "scene-6-cta",
			name: "Scene 6: Call To Action & Sign-off",
			layout: "cta-outro",
			durationSec: 5.5,
			badge: {
				text: "READY TO TEST OUR CLAIMS?",
				color: "#f59e0b",
				bgColor: "rgba(245, 158, 11, 0.2)",
			},
			headline: {
				text: "Enter Console: Meet Jev",
				fontSize: 40,
				fontWeight: "bold",
				color: "#ffffff",
			},
			subheadline: {
				text: "May your intelligence be ever reliable — Diogo, Erik, and Sasha",
				fontSize: 20,
				color: "#cbd5e1",
			},
			voiceoverScript:
				"Ready to test our claims? Enter the console and meet Jev today.",
		},
	],
};

export const SAAS_LAUNCH_BLUEPRINT: LaunchVideoBlueprint = {
	title: "SaaS 2.0 Product Launch",
	theme: "cyber-cyan",
	aspectRatio: "16:9",
	scenes: [
		{
			id: "s1",
			name: "Scene 1: Teaser",
			layout: "hook-reveal",
			durationSec: 4.0,
			badge: { text: "INTRODUCING 2.0" },
			headline: { text: "The Workspace Reimagined", fontSize: 40 },
			subheadline: { text: "Speed without complexity.", fontSize: 20 },
		},
		{
			id: "s2",
			name: "Scene 2: Screen Walkthrough",
			layout: "code-demo",
			durationSec: 7.0,
			badge: { text: "LIVE DEMO" },
			headline: { text: "Fluid Realtime Collaboration", fontSize: 32 },
			subheadline: { text: "Zero lag. Instant synchronization.", fontSize: 18 },
			screenRecording: { label: "App Screen Demo" },
		},
		{
			id: "s3",
			name: "Scene 3: Key Metrics",
			layout: "bento-metrics",
			durationSec: 5.5,
			badge: { text: "SCALE & PERFORMANCE" },
			headline: { text: "Engineered for High Velocity", fontSize: 32 },
			bentoCards: [
				{ stat: "10×", label: "Productivity", description: "Fewer clicks to finish" },
				{ stat: "99.99%", label: "Uptime", description: "Global edge network" },
				{ stat: "0ms", label: "Input Delay", description: "Local-first architecture" },
			],
		},
		{
			id: "s4",
			name: "Scene 4: Call to Action",
			layout: "cta-outro",
			durationSec: 4.5,
			badge: { text: "START FREE" },
			headline: { text: "Experience the Future Today", fontSize: 38 },
			subheadline: { text: "Deploy in 60 seconds with no credit card required.", fontSize: 20 },
		},
	],
};
