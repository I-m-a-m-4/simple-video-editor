"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProStore } from "@/stores/pro-store";
import {
	CheckCircle2,
	Crown,
	Sparkles,
	Zap,
	ShieldCheck,
	Sliders,
	Mic,
	Film,
	Clock,
} from "lucide-react";

import { useAuth } from "@/auth/auth-context";
import { useRouter } from "next/navigation";

export function PricingSection() {
	const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">("annual");
	const { openModal } = useProStore();
	const { isAuthenticated } = useAuth();
	const router = useRouter();

	const plans = [
		{
			id: "free",
			name: "Starter Free",
			tagline: "Essential editing for casual creators and beginners",
			priceNgn: "₦0",
			priceUsd: "$0",
			period: "forever",
			highlight: false,
			badge: null,
			buttonText: "Start Creating Free",
			buttonVariant: "outline" as const,
			action: () => {
				router.push(isAuthenticated ? "/projects" : "/signup?redirect=/projects");
			},
			features: [
				"Standard 1080p 30fps export",
				"Unlimited basic timeline cuts & trims",
				"Text titles, transitions & stickers",
				"Single audio & video tracks",
				"Built-in sound effects library",
				"Client-side local project storage",
			],
			notIncluded: [
				"AI Smart Suggestions & analysis",
				"Dynamic audio loudness leveling",
				"Studio voice clarity & noise reduction",
				"4K 60fps hardware rendering",
				"Multi-camera color consistency",
			],
		},
		{
			id: "pro",
			name: "CapCut Pro Suite",
			tagline: "Full AI editing suite for creators, agencies, and pros",
			priceNgn: billingCycle === "annual" ? "₦99,000" : "₦12,500",
			priceUsd: billingCycle === "annual" ? "$79.99" : "$9.99",
			period: billingCycle === "annual" ? "/year" : "/month",
			highlight: true,
			badge: billingCycle === "annual" ? "SAVE 35% TODAY" : "MOST POPULAR",
			buttonText: "Unlock Pro with Flutterwave",
			buttonVariant: "default" as const,
			action: () => {
				if (!isAuthenticated) {
					router.push("/signup?redirect=/#pricing");
				} else {
					openModal();
				}
			},
			features: [
				"Full 4K 60fps & Ultra HD GPU exports",
				"AI Smart Suggestions & timeline scanner",
				"Make colors better (AI vibrancy grading)",
				"Auto-match exposure & multi-clip white balance",
				"Dynamic gain leveling & broadcast loudness",
				"Studio voice clarity & vocal boost filter",
				"Super-resolution HD sharpening",
				"Face retouch & skin smoothing",
				"Unlimited audio & video tracks",
				"Autonomous Groq AI Copilot assistant",
				"Instant checkout via Cards, Transfer & USSD",
			],
			notIncluded: [],
		},
	];

	return (
		<section id="pricing" className="relative py-24 bg-background border-t border-border/50">
			{/* Ambient background glow */}
			<div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-96 w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-3xl opacity-60" />

			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
				<div className="text-center max-w-3xl mx-auto space-y-4">
					<Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 text-xs px-3 py-1 font-semibold uppercase">
						<Crown className="size-3.5 mr-1" /> Transparent Creator Pricing
					</Badge>
					<h2 className="text-3xl sm:text-5xl font-extrabold font-clash tracking-tight text-foreground">
						Invest in Quality. <br />
						<span className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
							Supercharge Your Video Content.
						</span>
					</h2>
					<p className="text-sm sm:text-base text-muted-foreground font-light leading-relaxed">
						Start editing for free in your browser. Upgrade anytime with Flutterwave to unlock 4K exports and studio AI enhancements.
					</p>

					{/* Billing Cycle Switcher */}
					<div className="pt-2 flex items-center justify-center">
						<div className="flex items-center gap-1.5 rounded-xl bg-muted/80 p-1.5 border border-border max-w-xs shadow-xs">
							<button
								type="button"
								onClick={() => setBillingCycle("monthly")}
								className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
									billingCycle === "monthly"
										? "bg-orange-500 text-white shadow-xs"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Monthly Billing
							</button>
							<button
								type="button"
								onClick={() => setBillingCycle("annual")}
								className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
									billingCycle === "annual"
										? "bg-orange-500 text-white shadow-xs"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								<span>Annual</span>
								<span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
									billingCycle === "annual"
										? "bg-white/20 text-white"
										: "bg-orange-500/20 text-orange-500"
								}`}>
									Save 35%
								</span>
							</button>
						</div>
					</div>
				</div>

				{/* Pricing Cards Grid */}
				<div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
					{plans.map((plan) => (
						<div
							key={plan.id}
							className={`relative rounded-2xl border p-7 sm:p-8 flex flex-col justify-between transition-all shadow-md ${
								plan.highlight
									? "border-orange-500 bg-gradient-to-b from-orange-500/5 via-card to-card ring-2 ring-orange-500/30 shadow-orange-500/5"
									: "border-border bg-card hover:border-border/80"
							}`}
						>
							{plan.badge && (
								<div className="absolute -top-3.5 right-6">
									<Badge className="bg-orange-500 text-white font-bold text-[10px] px-2.5 py-0.5 uppercase shadow-sm">
										{plan.badge}
									</Badge>
								</div>
							)}

							<div>
								<div className="flex items-center gap-2">
									<h3 className="text-xl font-bold font-clash text-foreground">
										{plan.name}
									</h3>
									{plan.highlight && (
										<Crown className="size-4 text-orange-500 fill-orange-500" />
									)}
								</div>
								<p className="mt-1 text-xs text-muted-foreground font-light leading-relaxed">
									{plan.tagline}
								</p>

								{/* Price */}
								<div className="mt-6 flex items-baseline gap-2">
									<span className="text-4xl font-extrabold font-clash text-foreground">
										{plan.priceNgn}
									</span>
									<span className="text-xs text-muted-foreground font-medium">
										{plan.period}
									</span>
									<span className="text-xs text-muted-foreground font-mono">
										({plan.priceUsd})
									</span>
								</div>

								{/* Action CTA Button */}
								<Button
									size="lg"
									onClick={plan.action}
									className={`mt-6 w-full h-11 font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer ${
										plan.highlight
											? "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20"
											: "border border-border hover:bg-muted text-foreground"
									}`}
								>
									{plan.highlight && <Crown className="size-4 mr-1.5" />}
									{plan.buttonText}
								</Button>

								{/* Features List */}
								<div className="mt-8 space-y-3 pt-6 border-t border-border/60">
									<div className="text-[11px] font-bold text-foreground uppercase tracking-wider font-clash">
										Included Features:
									</div>
									<ul className="space-y-2.5">
										{plan.features.map((feat, idx) => (
											<li key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90">
												<CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
												<span className="leading-snug">{feat}</span>
											</li>
										))}
									</ul>

									{plan.notIncluded.length > 0 && (
										<div className="pt-3 space-y-2">
											<div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
												Not Included:
											</div>
											<ul className="space-y-2">
												{plan.notIncluded.map((feat, idx) => (
													<li key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground/60 line-through">
														<span className="size-1.5 rounded-full bg-muted-foreground/40 shrink-0 mt-1.5" />
														<span>{feat}</span>
													</li>
												))}
											</ul>
										</div>
									)}
								</div>
							</div>

							{plan.highlight && (
								<div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
									<span className="flex items-center gap-1.5">
										<ShieldCheck className="size-3.5 text-orange-500" />
										Verified Flutterwave Gateway
									</span>
									<span>Cancel anytime</span>
								</div>
							)}
						</div>
					))}
				</div>

				{/* Payment Trust Footer */}
				<div className="mt-14 rounded-2xl border border-border/60 bg-muted/20 p-6 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
					<div className="flex items-center gap-3">
						<div className="size-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center font-bold">
							💳
						</div>
						<div>
							<div className="text-xs font-bold text-foreground">
								Supported Payment Channels
							</div>
							<div className="text-[11px] text-muted-foreground">
								Mastercard, Visa, Verve, Instant Bank Transfers, USSD, and Apple Pay
							</div>
						</div>
					</div>

					<Button
						variant="outline"
						size="sm"
						onClick={openModal}
						className="text-xs font-semibold border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10"
					>
						Get Started with Pro
					</Button>
				</div>
			</div>
		</section>
	);
}
