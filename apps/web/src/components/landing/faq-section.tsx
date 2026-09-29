"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { HelpCircle } from "lucide-react";

export function FaqSection() {
	const faqs = [
		{
			question: "How does the Groq Agentic AI edit my video timeline?",
			answer:
				"The AI copilot uses Groq's high-speed LPU infrastructure running models like Llama 3.3 70B Versatile and Llama 3.1 8B Instant. It connects directly to EditorCore via 21 specialized function-calling tools. When you ask it to split clips, adjust volume, add text overlays, or attach GPU effects, it inspects the project state, executes the programmatic commands on the timeline, verifies the result, and reports back — all while keeping the video canvas live.",
		},
		{
			question: "Do I need a Groq API key to use the AI?",
			answer:
				"A working default Groq API key is already configured for instant testing out of the box! You can also provide your own personal Groq API key (available for free at console.groq.com) directly in the AI Assistant settings drawer in the editor. Your key is stored locally in your browser and never leaves your machine.",
		},
		{
			question: "Can I run this in my browser using 'npm run dev'?",
			answer:
				"Yes! You can run 'npm run dev' or 'bun dev' in the root repository. Turbopack will spin up the web application immediately at http://localhost:3000 where you can create projects, import media, and use the AI copilot directly in Chrome, Edge, Firefox, or Safari.",
		},
		{
			question: "How do I get the Windows MSI desktop installer?",
			answer:
				"You can build the desktop app locally with 'bun build:msstore' or 'bun build:desktop:tauri' which creates a native Windows MSI and NSIS setup in target/release/bundle/. Alternatively, our automated GitHub Actions workflow compiles the Windows MSI on Microsoft runners for every commit and tag, allowing you to download the installer directly from the GitHub repository releases and Actions artifacts.",
		},
		{
			question: "Is my video uploaded to the cloud or private?",
			answer:
				"All video processing, frame rendering, audio decoding, and project timeline storage occurs 100% locally on your machine using WebAssembly and IndexedDB. Only your text prompts and timeline metadata (clip timestamps and parameters) are sent to Groq for tool execution. Your heavy media files never leave your device.",
		},
	];

	return (
		<section className="relative py-20 bg-background border-t border-border/40">
			<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<Badge variant="outline" className="gap-1.5 px-3 py-1 bg-muted text-muted-foreground border-border/60">
						<HelpCircle className="size-3.5" />
						Frequently Asked Questions
					</Badge>
					<h2 className="mt-4 text-3xl font-extrabold sm:text-4xl tracking-tight text-foreground">
						Everything You Need to Know
					</h2>
				</div>

				<div className="mt-10">
					<Accordion type="single" collapsible className="w-full space-y-3">
						{faqs.map((faq, index) => (
							<AccordionItem
								key={faq.question}
								value={`item-${index}`}
								className="rounded-xl border border-border/50 bg-card/40 px-4"
							>
								<AccordionTrigger className="text-left text-sm font-semibold text-foreground hover:no-underline py-4">
									{faq.question}
								</AccordionTrigger>
								<AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4">
									{faq.answer}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</div>
			</div>
		</section>
	);
}
