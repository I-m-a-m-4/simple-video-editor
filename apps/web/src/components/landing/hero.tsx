"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Sparkles,
	ArrowRight,
	Play,
	Sliders,
	Mic,
	Film,
	Smile,
	Crown,
	CheckCircle2,
	Zap,
	Volume2,
} from "lucide-react";
import { useAuth } from "@/auth/auth-context";

export function Hero() {
	const { isAuthenticated } = useAuth();
	const editorTarget = isAuthenticated ? "/projects" : "/signup?redirect=/projects";
	return (
		<section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
			{/* Ambient background glows */}
			<div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[850px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-orange-500/20 via-amber-500/15 to-orange-600/20 blur-3xl opacity-75" />
			<div className="pointer-events-none absolute top-1/3 -left-48 -z-10 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
			<div className="pointer-events-none absolute top-1/2 -right-48 -z-10 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Top Status Announcement Pill */}
				<motion.div
					initial={{ opacity: 0, y: -12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4 }}
					className="flex justify-center"
				>
					<div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-medium text-orange-600 dark:text-orange-400 shadow-sm backdrop-blur-md">
						<Sparkles className="size-3.5 animate-pulse text-orange-500" />
						<span>The Modern AI Video Editor</span>
						<span className="hidden sm:inline-block h-3 w-px bg-orange-500/30" />
						<span className="hidden sm:inline-block text-muted-foreground">Pro CapCut-Style Suite</span>
					</div>
				</motion.div>

				{/* Main Headline */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="mt-8 text-center"
				>
					<h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl font-clash text-foreground">
						Create Viral Studio Videos with{" "}
						<span className="bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-sm">
							CapCut AI Power
						</span>
					</h1>
					<p className="mx-auto mt-6 max-w-3xl text-base sm:text-xl text-muted-foreground font-light leading-relaxed">
						Turn raw footage into broadcast-ready content in minutes. Built for creators, marketers, and video agencies with automated voice clarity, dynamic audio leveling, multi-camera color matching, and 4K exports.
					</p>
				</motion.div>

				{/* Primary Call to Action buttons */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className="mt-10 flex flex-wrap items-center justify-center gap-3.5"
				>
					<Link href={editorTarget}>
						<Button size="lg" className="h-12 px-7 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 transition-all">
							<Play className="mr-2 size-4 fill-current" />
							Start Editing Free
							<ArrowRight className="ml-2 size-4" />
						</Button>
					</Link>

					<a href="#pricing">
						<Button variant="outline" size="lg" className="h-12 px-6 text-sm font-semibold border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10">
							<Crown className="mr-2 size-4 text-orange-500" />
							View Pro Plans &amp; Pricing
						</Button>
					</a>
				</motion.div>

				{/* Social Proof Stats */}
				<div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
					<div className="flex items-center gap-1.5">
						<CheckCircle2 className="size-4 text-emerald-500" />
						<span>No Credit Card Required</span>
					</div>
					<div className="hidden sm:flex items-center gap-1.5">
						<CheckCircle2 className="size-4 text-emerald-500" />
						<span>Flutterwave Verified Checkout</span>
					</div>
					<div className="flex items-center gap-1.5">
						<CheckCircle2 className="size-4 text-emerald-500" />
						<span>Instant 4K Export</span>
					</div>
				</div>

				{/* Key Value Prop Badges */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.6, delay: 0.3 }}
					className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4"
				>
					<div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 p-3.5 text-left backdrop-blur-sm shadow-xs">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
							<Sparkles className="size-4" />
						</div>
						<div>
							<div className="text-xs font-semibold text-foreground">AI Smart Suggestions</div>
							<div className="text-[11px] text-muted-foreground">Automated Timeline Scan</div>
						</div>
					</div>

					<div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 p-3.5 text-left backdrop-blur-sm shadow-xs">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
							<Mic className="size-4" />
						</div>
						<div>
							<div className="text-xs font-semibold text-foreground">Voice Clarity (DSP)</div>
							<div className="text-[11px] text-muted-foreground">Noise Gate &amp; Vocal Boost</div>
						</div>
					</div>

					<div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 p-3.5 text-left backdrop-blur-sm shadow-xs">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
							<Volume2 className="size-4" />
						</div>
						<div>
							<div className="text-xs font-semibold text-foreground">Volume Leveling</div>
							<div className="text-[11px] text-muted-foreground">0 dB Dynamic Gain</div>
						</div>
					</div>

					<div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 p-3.5 text-left backdrop-blur-sm shadow-xs">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
							<Sliders className="size-4" />
						</div>
						<div>
							<div className="text-xs font-semibold text-foreground">AI Color Grading</div>
							<div className="text-[11px] text-muted-foreground">Auto-Match Exposure</div>
						</div>
					</div>
				</motion.div>

				{/* Visual Mock / Interactive Preview Frame */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.7, delay: 0.35 }}
					className="mt-14 relative rounded-2xl border border-border/80 bg-gradient-to-b from-card/90 via-card/70 to-background/95 p-2 sm:p-4 shadow-2xl shadow-black/30 backdrop-blur-xl"
				>
					{/* Window header chrome */}
					<div className="flex items-center justify-between border-b border-border/40 px-3 py-2 text-xs text-muted-foreground">
						<div className="flex items-center gap-2">
							<span className="size-3 rounded-full bg-red-500/80" />
							<span className="size-3 rounded-full bg-yellow-500/80" />
							<span className="size-3 rounded-full bg-green-500/80" />
							<span className="ml-2 font-mono text-[11px]">AmberCut • AI Video Studio Suite</span>
						</div>
						<div className="flex items-center gap-2 font-mono text-[10px]">
							<span className="rounded bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-orange-500 font-bold">PRO SUITE</span>
							<span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-emerald-500">4K 60FPS</span>
						</div>
					</div>

					{/* Mock Workspace Content */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-2 sm:p-4 bg-background/50 rounded-xl mt-2">
						{/* Left: Video Preview Canvas */}
						<div className="lg:col-span-8 rounded-xl border border-border/60 bg-black/60 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px] sm:min-h-[360px] p-6 text-center">
							<div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 via-transparent to-amber-500/10 pointer-events-none" />
							
							<div className="size-16 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-500 flex items-center justify-center mb-4 shadow-lg">
								<Film className="size-8" />
							</div>

							<h2 className="text-xl sm:text-2xl font-bold font-clash text-white tracking-tight">
								Professional Video Workspace
							</h2>
							<p className="text-xs text-zinc-400 max-w-md mt-2 leading-relaxed">
								Multi-layer timeline with audio waveforms, text titles, and hardware-accelerated WebGPU rendering.
							</p>

							{/* Video Controls overlay */}
							<div className="mt-6 flex items-center gap-3">
								<Link href={editorTarget}>
									<Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-md">
										<Play className="size-3.5 mr-1.5 fill-current" /> Launch Editor
									</Button>
								</Link>
								<Badge variant="outline" className="text-zinc-300 border-zinc-700 bg-zinc-900/60 font-mono text-xs">
									00:01:24:18
								</Badge>
							</div>
						</div>

						{/* Right: CapCut AI Inspector Panel */}
						<div className="lg:col-span-4 rounded-xl border border-border/80 bg-card p-4 space-y-4 text-left">
							<div className="flex items-center justify-between border-b border-border/60 pb-2">
								<span className="text-xs font-bold font-clash text-foreground flex items-center gap-1.5">
									<Sparkles className="size-3.5 text-orange-500" />
									CapCut AI Inspector
								</span>
								<Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[9px] uppercase font-bold">
									ACTIVE
								</Badge>
							</div>

							{/* Smart Suggestions Mock */}
							<div className="rounded-lg bg-muted/40 border border-border p-3 space-y-2">
								<div className="flex items-center justify-between text-xs font-semibold">
									<span className="text-foreground">Smart suggestions</span>
									<span className="text-[10px] text-emerald-500 flex items-center gap-1">
										<CheckCircle2 className="size-3" /> Ready
									</span>
								</div>
								<p className="text-[11px] text-muted-foreground leading-tight">
									Audio normalized to 0 dB, multi-clip white balance matched.
								</p>
							</div>

							{/* Feature Toggles List */}
							<div className="space-y-2 text-xs">
								<div className="flex items-center justify-between p-2 rounded-md bg-muted/20 border border-border/40">
									<span className="flex items-center gap-2 font-medium">
										<Sliders className="size-3.5 text-purple-500" /> Make colors better
									</span>
									<Badge className="bg-emerald-500/10 text-emerald-500 text-[10px]">ON</Badge>
								</div>

								<div className="flex items-center justify-between p-2 rounded-md bg-muted/20 border border-border/40">
									<span className="flex items-center gap-2 font-medium">
										<Volume2 className="size-3.5 text-emerald-500" /> Make volume consistent
									</span>
									<Badge className="bg-emerald-500/10 text-emerald-500 text-[10px]">ON</Badge>
								</div>

								<div className="flex items-center justify-between p-2 rounded-md bg-muted/20 border border-border/40">
									<span className="flex items-center gap-2 font-medium">
										<Mic className="size-3.5 text-cyan-500" /> Make voice clearer
									</span>
									<Badge className="bg-emerald-500/10 text-emerald-500 text-[10px]">ON</Badge>
								</div>

								<div className="flex items-center justify-between p-2 rounded-md bg-muted/20 border border-border/40">
									<span className="flex items-center gap-2 font-medium">
										<Smile className="size-3.5 text-pink-500" /> Retouch face
									</span>
									<Badge className="bg-pink-500/10 text-pink-500 text-[10px]">PRO</Badge>
								</div>
							</div>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
