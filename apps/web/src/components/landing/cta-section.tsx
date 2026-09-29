"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Download, Sparkles } from "lucide-react";

export function CtaSection() {
	return (
		<section className="relative py-24 overflow-hidden bg-background border-t border-border/40">
			{/* Glow */}
			<div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
				<div className="h-72 w-[600px] rounded-full bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-primary/20 blur-3xl" />
			</div>

			<div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
				<div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 mb-6">
					<Sparkles className="size-3.5" />
					Start Editing in Seconds
				</div>
				<h2 className="text-3xl font-extrabold sm:text-5xl tracking-tight text-foreground">
					Experience the Future of Video Editing Today.
				</h2>
				<p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground font-light leading-relaxed">
					No signup required to try. Test the Groq Agentic Copilot directly in your browser or install the native Windows desktop app.
				</p>

				<div className="mt-8 flex flex-wrap items-center justify-center gap-4">
					<Link href="/projects">
						<Button size="lg" className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25">
							<Play className="mr-2 size-4 fill-current" />
							Launch Editor Now
							<ArrowRight className="ml-2 size-4" />
						</Button>
					</Link>
					<a href="#desktop">
						<Button variant="outline" size="lg" className="h-12 px-6 text-base font-medium">
							<Download className="mr-2 size-4" />
							Download Windows MSI
						</Button>
					</a>
				</div>
			</div>
		</section>
	);
}
