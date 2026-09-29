"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Layers,
	Cpu,
	Sliders,
	Eye,
	Volume2,
	Lock,
	Film,
	Sparkles,
	Clock,
} from "lucide-react";

export function FeaturesGrid() {
	const features = [
		{
			icon: <Layers className="size-5 text-amber-400" />,
			title: "Infinite Multi-Track Timeline",
			description:
				"Stack unlimited video, audio, text, and sticker layers. Drag, drop, group, snap, and trim with sub-frame precision.",
		},
		{
			icon: <Cpu className="size-5 text-orange-400" />,
			title: "WebAssembly & Rust Core",
			description:
				"Engineered with opencut-wasm and Rust. Delivers smooth 60fps playback, fast frame demuxing, and hardware-accelerated rendering.",
		},
		{
			icon: <Sliders className="size-5 text-blue-400" />,
			title: "Transforms & Spatial Controls",
			description:
				"Control position (X/Y), scaling, 360° rotation, opacity, and audio gain with intuitive canvas handles or Groq AI commands.",
		},
		{
			icon: <Eye className="size-5 text-emerald-400" />,
			title: "GPU Shader Effects",
			description:
				"Instant WebGL filters and GPU shaders including customizable Gaussian blur, color grading, saturation, and contrast.",
		},
		{
			icon: <Volume2 className="size-5 text-purple-400" />,
			title: "Audio Waveforms & Mixing",
			description:
				"Visual soundwave peaks for beat-matching, custom volume fading, mute toggles, and direct URL music streaming.",
		},
		{
			icon: <Lock className="size-5 text-rose-400" />,
			title: "100% Local-First Privacy",
			description:
				"Your raw media never leaves your device. Projects are stored locally in IndexedDB, keeping your footage completely private.",
		},
	];

	return (
		<section className="relative py-20 bg-background/60 border-t border-border/40">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<div className="text-center max-w-3xl mx-auto">
					<Badge variant="outline" className="gap-1.5 px-3 py-1 bg-primary/10 text-primary border-primary/30">
						<Film className="size-3.5" />
						Full-Featured Video Engine
					</Badge>
					<h2 className="mt-4 text-3xl font-extrabold sm:text-5xl tracking-tight">
						Built for Creators, Powered by Code.
					</h2>
					<p className="mt-4 text-base sm:text-lg text-muted-foreground font-light leading-relaxed">
						Everything you expect from professional timeline software — without the bloated subscription fees or clunky cloud uploads.
					</p>
				</div>

				<div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{features.map((feature) => (
						<Card
							key={feature.title}
							className="border-border/50 bg-card/40 hover:bg-card/70 transition-all hover:border-primary/40 shadow-sm"
						>
							<CardContent className="p-6 space-y-3">
								<div className="flex size-10 items-center justify-center rounded-lg bg-card border border-border/40">
									{feature.icon}
								</div>
								<h3 className="text-lg font-bold text-foreground">{feature.title}</h3>
								<p className="text-xs text-muted-foreground leading-relaxed">
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
