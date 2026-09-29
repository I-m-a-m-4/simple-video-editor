"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Sparkles,
	ArrowRight,
	Play,
	Monitor,
	Cpu,
	Layers,
	Download,
	Zap,
	ShieldCheck,
	Wand2,
} from "lucide-react";

export function Hero() {
	return (
		<section className="relative overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32">
			{/* Ambient background glows */}
			<div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/20 via-orange-500/10 to-amber-500/20 blur-3xl opacity-70" />
			<div className="pointer-events-none absolute top-1/3 -left-48 -z-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
			<div className="pointer-events-none absolute top-1/2 -right-48 -z-10 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />

			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Top Status Announcement Pill */}
				<motion.div
					initial={{ opacity: 0, y: -12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4 }}
					className="flex justify-center"
				>
					<div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary shadow-sm backdrop-blur-md">
						<Sparkles className="size-3.5 animate-pulse text-amber-400" />
						<span>Simple Video Editor 2.0 • Powered by Groq AI & Tauri v2</span>
						<span className="hidden sm:inline-block h-3 w-px bg-primary/30" />
						<span className="hidden sm:inline-block text-muted-foreground">Microsoft Store Ready</span>
					</div>
				</motion.div>

				{/* Main Headline */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="mt-8 text-center"
				>
					<h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
						Autonomous Video Editing with{" "}
						<span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-sm">
							Groq Agentic AI
						</span>
					</h1>
					<p className="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground sm:text-xl font-light leading-relaxed">
						Edit video timelines at the speed of thought. Powered by ultra-fast{" "}
						<strong className="font-semibold text-foreground">Groq LPUs</strong> with 21 autonomous timeline tools,
						and packaged as a lightning-fast <strong className="font-semibold text-foreground">Tauri desktop app</strong> for Windows and the Microsoft Store.
					</p>
				</motion.div>

				{/* Primary Call to Action buttons */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className="mt-10 flex flex-wrap items-center justify-center gap-4"
				>
					<Link href="/projects">
						<Button size="lg" className="h-12 px-7 text-base font-semibold shadow-lg shadow-primary/20">
							<Play className="mr-2 size-4 fill-current" />
							Launch Editor in Browser
							<ArrowRight className="ml-2 size-4" />
						</Button>
					</Link>

					<a href="#desktop">
						<Button variant="outline" size="lg" className="h-12 px-6 text-base font-medium border-border/80 hover:bg-accent/60">
							<Download className="mr-2 size-4" />
							Get Windows Desktop (MSI)
						</Button>
					</a>

					<a href="#ai-agent">
						<Button variant="ghost" size="lg" className="h-12 px-5 text-base font-medium text-muted-foreground hover:text-foreground">
							<Wand2 className="mr-2 size-4 text-amber-400" />
							See 21 AI Tools
						</Button>
					</a>
				</motion.div>

				{/* Key Value Prop Badges */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.6, delay: 0.3 }}
					className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4"
				>
					<div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-card/40 p-3 text-left backdrop-blur-sm">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
							<Cpu className="size-4" />
						</div>
						<div>
							<div className="text-xs font-semibold text-foreground">Groq LPU Speed</div>
							<div className="text-[11px] text-muted-foreground">500+ tok/s Llama 3.3</div>
						</div>
					</div>

					<div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-card/40 p-3 text-left backdrop-blur-sm">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
							<Wand2 className="size-4" />
						</div>
						<div>
							<div className="text-xs font-semibold text-foreground">21 Agentic Tools</div>
							<div className="text-[11px] text-muted-foreground">Full Timeline Control</div>
						</div>
					</div>

					<div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-card/40 p-3 text-left backdrop-blur-sm">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
							<Monitor className="size-4" />
						</div>
						<div>
							<div className="text-xs font-semibold text-foreground">Tauri v2 Desktop</div>
							<div className="text-[11px] text-muted-foreground">&lt; 15MB MSI Installer</div>
						</div>
					</div>

					<div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-card/40 p-3 text-left backdrop-blur-sm">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
							<ShieldCheck className="size-4" />
						</div>
						<div>
							<div className="text-xs font-semibold text-foreground">100% Client Privacy</div>
							<div className="text-[11px] text-muted-foreground">Local Media & IndexedDB</div>
						</div>
					</div>
				</motion.div>

				{/* Visual Mock / Interactive Preview Frame */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.7, delay: 0.35 }}
					className="mt-14 relative rounded-2xl border border-border/60 bg-gradient-to-b from-card/80 via-card/50 to-background/90 p-2 sm:p-4 shadow-2xl shadow-black/40 backdrop-blur-xl"
				>
					{/* Window header chrome */}
					<div className="flex items-center justify-between border-b border-border/40 px-3 py-2 text-xs text-muted-foreground">
						<div className="flex items-center gap-2">
							<span className="size-3 rounded-full bg-red-500/80" />
							<span className="size-3 rounded-full bg-yellow-500/80" />
							<span className="size-3 rounded-full bg-green-500/80" />
							<span className="ml-2 font-mono text-[11px]">AmberCut • Groq AI Copilot Studio</span>
						</div>
						<div className="flex items-center gap-2 font-mono text-[10px]">
							<span className="rounded bg-primary/20 px-2 py-0.5 text-primary">openai/gpt-oss-120b</span>
							<span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-400">Tauri v2 Shell</span>
						</div>
					</div>

					{/* Editor Mock Interface View */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3">
						{/* Left: AI Assistant Chat Panel Simulation */}
						<div className="lg:col-span-4 rounded-xl border border-border/40 bg-background/80 p-4 flex flex-col justify-between h-[360px]">
							<div className="space-y-3 overflow-hidden">
								<div className="flex items-center justify-between border-b border-border/30 pb-2">
									<div className="flex items-center gap-2 font-semibold text-xs text-foreground">
										<Sparkles className="size-3.5 text-amber-400" />
										<span>Groq AI Assistant</span>
									</div>
									<Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
										Active Agent
									</Badge>
								</div>

								{/* User Prompt */}
								<div className="rounded-lg bg-accent/40 p-2.5 text-xs text-foreground/90 border border-border/30">
									<span className="font-semibold text-primary block text-[10px] uppercase tracking-wider mb-1">User Command</span>
									&ldquo;Scan the timeline, split the clip at the playhead, and add neon yellow title text saying &apos;SUMMER TRIP 2026&apos;&rdquo;
								</div>

								{/* AI Tool Calls */}
								<div className="rounded-lg bg-card/60 p-2.5 text-xs border border-border/40 space-y-2">
									<span className="font-semibold text-amber-400 block text-[10px] uppercase tracking-wider">Executed Autonomous Actions</span>
									<div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
										<span className="size-1.5 rounded-full bg-emerald-400" />
										<span>get_timeline_state()</span>
										<span className="text-[10px] text-emerald-400 font-sans ml-auto">✓ 2 tracks loaded</span>
									</div>
									<div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
										<span className="size-1.5 rounded-full bg-emerald-400" />
										<span>split_at_playhead()</span>
										<span className="text-[10px] text-emerald-400 font-sans ml-auto">✓ Cut at 00:04.2s</span>
									</div>
									<div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
										<span className="size-1.5 rounded-full bg-emerald-400" />
										<span>add_text(content: &quot;SUMMER TRIP 2026&quot;)</span>
										<span className="text-[10px] text-emerald-400 font-sans ml-auto">✓ Added overlay</span>
									</div>
								</div>
							</div>

							<div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-2 text-[11px] text-muted-foreground">
								<Zap className="size-3 text-orange-400" />
								<span>Executed in 340ms via Groq Cloud LPU</span>
							</div>
						</div>

						{/* Right: Live Canvas & Multi-Track Timeline Simulation */}
						<div className="lg:col-span-8 flex flex-col justify-between rounded-xl border border-border/40 bg-background/50 p-4 h-[360px]">
							{/* Video Canvas Preview */}
							<div className="relative flex-1 rounded-lg border border-border/30 bg-black/60 flex items-center justify-center overflow-hidden">
								<div className="absolute inset-0 bg-gradient-to-tr from-orange-950/30 to-slate-900/60" />
								<div className="relative text-center">
									<div className="text-3xl font-black tracking-wider text-amber-400 drop-shadow-[0_2px_12px_rgba(251,191,36,0.5)]">
										SUMMER TRIP 2026
									</div>
									<div className="mt-1 text-xs text-white/70">Canvas 1920 × 1080 • Real-time WebGL Preview</div>
								</div>
								<div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-white/80">
									<span>00:04.200 / 00:15.000</span>
								</div>
							</div>

							{/* Scrubber & Multi-track Timeline */}
							<div className="mt-3 rounded-lg border border-border/30 bg-card/60 p-2.5 space-y-1.5">
								<div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
									<span>00:00</span>
									<span className="text-primary font-bold">▲ 00:04.200</span>
									<span>00:15</span>
								</div>

								{/* Track 1: Text */}
								<div className="h-6 w-full rounded bg-amber-500/20 border border-amber-500/40 px-2 flex items-center justify-between text-[10px] text-amber-300 font-medium">
									<span>T1: [Text] SUMMER TRIP 2026</span>
									<span>Duration: 5.0s</span>
								</div>

								{/* Track 2: Video (Split) */}
								<div className="grid grid-cols-12 gap-1 h-6">
									<div className="col-span-4 rounded bg-primary/20 border border-primary/40 px-2 flex items-center text-[10px] text-primary-foreground/80">
										Clip A
									</div>
									<div className="col-span-8 rounded bg-primary/30 border border-primary/50 px-2 flex items-center text-[10px] text-primary-foreground font-medium">
										Clip B (Cut at playhead)
									</div>
								</div>

								{/* Track 3: Audio Waveform */}
								<div className="h-5 w-full rounded bg-emerald-500/15 border border-emerald-500/30 px-2 flex items-center text-[9px] text-emerald-400 font-mono">
									<span>♫ Background Audio Track (Waveform Active)</span>
								</div>
							</div>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
