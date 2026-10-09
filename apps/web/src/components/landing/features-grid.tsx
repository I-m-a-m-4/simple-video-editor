"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Sliders,
	Volume2,
	Mic,
	Film,
	Smile,
	Sparkles,
	Crown,
	Zap,
	Maximize2,
	Layers,
	Music,
	Bot,
} from "lucide-react";

export function FeaturesGrid() {
	const features = [
		{
			icon: <Sparkles className="size-5 text-orange-500" />,
			badge: "AI Powered",
			title: "AI Smart Suggestions",
			description:
				"Instant intelligent scanning across timeline cuts, audio levels, and exposure to give you actionable 1-click recommendations.",
		},
		{
			icon: <Sliders className="size-5 text-purple-500" />,
			badge: "Pro",
			title: "Make Colors Better",
			description:
				"AI color enhancement and vibrancy boost tailored to make videos pop on mobile screens, TikTok, Instagram Reels, and YouTube.",
		},
		{
			icon: <Film className="size-5 text-indigo-500" />,
			badge: "Pro",
			title: "Make Colors Consistent",
			description:
				"Auto-match exposure and white balance across multiple camera angles, lighting conditions, and B-roll clips with zero colorist hassle.",
		},
		{
			icon: <Volume2 className="size-5 text-emerald-500" />,
			badge: "DSP",
			title: "Make Volume Consistent",
			description:
				"Dynamic gain leveling and loudness normalization that locks all dialogue, music, and SFX to clean broadcast 0 dB standards.",
		},
		{
			icon: <Mic className="size-5 text-cyan-500" />,
			badge: "Studio",
			title: "Make Voice Clearer",
			description:
				"Studio-grade background noise suppression, low-frequency rumble filter, de-mud dip, and a 3.4kHz vocal clarity presence boost.",
		},
		{
			icon: <Maximize2 className="size-5 text-blue-500" />,
			badge: "Ultra HD",
			title: "Make Video Clearer (HD)",
			description:
				"Super-resolution sharpening algorithms that eliminate compression blur and optimize export quality up to 4K 60fps.",
		},
		{
			icon: <Smile className="size-5 text-pink-500" />,
			badge: "Pro",
			title: "Retouch Face & Portrait",
			description:
				"Facial contouring, skin smoothing, and eye brightening designed specifically for talking-head videos, interviews, and vlogs.",
		},
		{
			icon: <Music className="size-5 text-amber-500" />,
			badge: "Built-In",
			title: "Text-Encoded Sound Library",
			description:
				"Royalty-free whooshes, pop effects, cinematic impacts, and cash chimes stored right in your browser with zero storage delays.",
		},
		{
			icon: <Bot className="size-5 text-orange-500" />,
			badge: "Copilot",
			title: "Autonomous AI Timeline Agent",
			description:
				"Powered by Amber AI. Describe your edits in plain English and let the agent split clips, add B-roll, and arrange music automatically.",
		},
	];

	return (
		<section id="features" className="relative py-24 bg-background border-t border-border/50">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<div className="text-center max-w-3xl mx-auto space-y-3">
					<Badge variant="outline" className="px-3 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 text-xs font-semibold">
						<Crown className="size-3.5 mr-1" />
						All-In-One SaaS Feature Suite
					</Badge>
					<h2 className="text-3xl sm:text-5xl font-extrabold font-clash tracking-tight text-foreground">
						CapCut Simplicity. <br />
						<span className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
							Studio-Grade Output.
						</span>
					</h2>
					<p className="text-sm sm:text-base text-muted-foreground font-light leading-relaxed">
						Stop spending hours manually balancing multi-track audio and color grading footage. Every AI tool runs with one click.
					</p>
				</div>

				<div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{features.map((feature) => (
						<Card
							key={feature.title}
							className="border-border/60 bg-card hover:bg-card/90 transition-all hover:border-orange-500/40 shadow-xs hover:shadow-md"
						>
							<CardContent className="p-6 space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 border border-border">
										{feature.icon}
									</div>
									<Badge variant="outline" className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400 border-orange-500/20 bg-orange-500/5">
										{feature.badge}
									</Badge>
								</div>
								<h3 className="text-base font-bold font-clash text-foreground">{feature.title}</h3>
								<p className="text-xs text-muted-foreground leading-relaxed font-light">
									{feature.description}
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
