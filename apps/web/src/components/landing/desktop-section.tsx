"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Monitor,
	Download,
	Cpu,
	Zap,
	ShieldCheck,
	HardDrive,
	Terminal,
	Store,
	Github,
	CheckCircle,
} from "lucide-react";

export function DesktopSection() {
	return (
		<section id="desktop" className="relative py-20 bg-background border-t border-border/40">
			{/* Ambient background glow */}
			<div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl" />

			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
				<div className="text-center max-w-3xl mx-auto">
					<Badge variant="outline" className="gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 border-blue-500/30">
						<Monitor className="size-3.5" />
						Desktop Native Shell
					</Badge>
					<h2 className="mt-4 text-3xl font-extrabold sm:text-5xl tracking-tight">
						Lightweight Desktop Power. <br />
						<span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
							Tauri v2 &amp; Microsoft Store Ready.
						</span>
					</h2>
					<p className="mt-4 text-base sm:text-lg text-muted-foreground font-light leading-relaxed">
						Say goodbye to bloated 200MB+ Electron apps that eat your RAM. Simple Video Editor is wrapped in a modern
						Rust-powered Tauri v2 shell that launches in milliseconds, works offline, and compiles directly into Windows MSI installers.
					</p>
				</div>

				{/* Desktop Highlights Grid */}
				<div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
					<Card className="border-border/50 bg-card/50 backdrop-blur-sm">
						<CardContent className="p-6 space-y-3">
							<div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
								<HardDrive className="size-5" />
							</div>
							<h3 className="text-lg font-bold text-foreground">Under 15MB Binary</h3>
							<p className="text-xs text-muted-foreground leading-relaxed">
								Instead of bundling Chromium and Node.js, Tauri leverages native Windows WebView2 and Rust, keeping memory usage down to a fraction of traditional video software.
							</p>
							<div className="pt-2 flex items-center gap-2 text-xs text-emerald-400 font-mono">
								<CheckCircle className="size-3.5" />
								<span>~90% less memory than Electron</span>
							</div>
						</CardContent>
					</Card>

					<Card className="border-border/50 bg-card/50 backdrop-blur-sm">
						<CardContent className="p-6 space-y-3">
							<div className="flex size-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
								<Store className="size-5" />
							</div>
							<h3 className="text-lg font-bold text-foreground">Microsoft Store Ready</h3>
							<p className="text-xs text-muted-foreground leading-relaxed">
								Configured with MSI, NSIS, and AppX bundle targets in <code className="text-primary font-mono text-[11px]">tauri.conf.json</code>. Ready for direct distribution or Windows Store submission.
							</p>
							<div className="pt-2 flex items-center gap-2 text-xs text-emerald-400 font-mono">
								<CheckCircle className="size-3.5" />
								<span>Windows 10 &amp; 11 Certified Target</span>
							</div>
						</CardContent>
					</Card>

					<Card className="border-border/50 bg-card/50 backdrop-blur-sm">
						<CardContent className="p-6 space-y-3">
							<div className="flex size-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
								<Zap className="size-5" />
							</div>
							<h3 className="text-lg font-bold text-foreground">Automated GitHub CI/CD</h3>
							<p className="text-xs text-muted-foreground leading-relaxed">
								Every commit pushes to GitHub Actions to automatically compile the Windows MSI installer on Microsoft runners and upload downloadable release artifacts.
							</p>
							<div className="pt-2 flex items-center gap-2 text-xs text-emerald-400 font-mono">
								<CheckCircle className="size-3.5" />
								<span>Instant downloadable MSI artifacts</span>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* CLI & Build Command Box */}
				<div className="mt-12 rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur-md">
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
						<div className="flex items-center gap-3">
							<Terminal className="size-5 text-primary" />
							<div>
								<div className="text-sm font-bold text-foreground">Developer Quick Commands</div>
								<div className="text-xs text-muted-foreground">Run locally in browser or build native desktop MSI installer</div>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<a
								href="https://github.com/I-m-a-m-4/simple-video-editor/actions"
								target="_blank"
								rel="noreferrer"
							>
								<Button variant="outline" size="sm" className="gap-2 text-xs">
									<Github className="size-3.5" />
									View GitHub Actions Builds
								</Button>
							</a>
						</div>
					</div>

					<div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
						<div className="rounded-xl border border-border/40 bg-background/90 p-3.5 font-mono text-xs space-y-1">
							<div className="text-[11px] text-muted-foreground font-sans font-semibold">1. Run in Browser</div>
							<div className="text-amber-400 font-bold">npm run dev</div>
							<div className="text-[11px] text-muted-foreground font-sans">Starts Turbopack at http://localhost:3000</div>
						</div>

						<div className="rounded-xl border border-border/40 bg-background/90 p-3.5 font-mono text-xs space-y-1">
							<div className="text-[11px] text-muted-foreground font-sans font-semibold">2. Run Tauri Desktop Dev</div>
							<div className="text-blue-400 font-bold">bun dev:desktop:tauri</div>
							<div className="text-[11px] text-muted-foreground font-sans">Opens native 1440×900 desktop window</div>
						</div>

						<div className="rounded-xl border border-border/40 bg-background/90 p-3.5 font-mono text-xs space-y-1">
							<div className="text-[11px] text-muted-foreground font-sans font-semibold">3. Build Windows MSI Installer</div>
							<div className="text-emerald-400 font-bold">bun build:msstore</div>
							<div className="text-[11px] text-muted-foreground font-sans">Generates .msi &amp; .exe in target/release/bundle</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
