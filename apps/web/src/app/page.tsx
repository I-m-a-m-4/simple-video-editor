import { Hero } from "@/components/landing/hero";
import { AiAgentSection } from "@/components/landing/ai-agent-section";
import { DesktopSection } from "@/components/landing/desktop-section";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { FaqSection } from "@/components/landing/faq-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";
import { SITE_URL } from "@/site/brand";

export const metadata: Metadata = {
	title: "Simple Video Editor - Autonomous Video Editing with Groq AI & Tauri",
	description:
		"Autonomous video editor powered by ultra-fast Groq LPU models and 21 agentic timeline tools. Runs in browser or as a native Windows desktop app via Tauri v2.",
	alternates: {
		canonical: SITE_URL,
	},
};

export default async function Home() {
	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col">
			<Header />
			<main className="flex-1">
				<Hero />
				<AiAgentSection />
				<DesktopSection />
				<FeaturesGrid />
				<FaqSection />
				<CtaSection />
			</main>
			<Footer />
		</div>
	);
}
