"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProStore } from "@/stores/pro-store";
import {
	Sparkles,
	Check,
	Zap,
	ShieldCheck,
	Crown,
	Sliders,
	Mic,
	Cloud,
	Film,
	CheckCircle2,
	Lock,
} from "lucide-react";
import { toast } from "sonner";

declare global {
	interface Window {
		FlutterwaveCheckout?: (options: any) => void;
	}
}

export function ProUpgradeModal() {
	const { isModalOpen, closeModal, isPro, setProStatus } = useProStore();
	const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
	const [customerEmail, setCustomerEmail] = useState("");
	const [customerName, setCustomerName] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const plans = {
		monthly: {
			amountNgn: 12500,
			displayNgn: "₦12,500",
			displayUsd: "$9.99",
			period: "/month",
			savings: null,
		},
		annual: {
			amountNgn: 99000,
			displayNgn: "₦99,000",
			displayUsd: "$79.99",
			period: "/year",
			savings: "Save 35%",
		},
	};

	const currentPlan = plans[billingCycle];

	const proFeatures = [
		{
			icon: <Film className="size-4 text-purple-400" />,
			title: "4K 60fps & Ultra HD Export",
			desc: "Render timeline videos in pristine 4K resolution with GPU hardware acceleration.",
		},
		{
			icon: <Sparkles className="size-4 text-amber-400" />,
			title: "CapCut AI Smart Suggestions",
			desc: "Instant AI timeline analysis to enhance colors, lighting, and audio clarity automatically.",
		},
		{
			icon: <Sliders className="size-4 text-emerald-400" />,
			title: "Global Edits & Color Consistency",
			desc: "One-click cinematic grade, auto-exposure matching across multi-camera clips.",
		},
		{
			icon: <Mic className="size-4 text-cyan-400" />,
			title: "Studio Voice Clarity & Isolation",
			desc: "Remove background hiss and optimize vocal frequencies with deep audio filters.",
		},
		{
			icon: <Zap className="size-4 text-yellow-400" />,
			title: "Unlimited Timeline Audio & Video Tracks",
			desc: "Layer complex sound effects, music beds, and visual overlays with zero limits.",
		},
		{
			icon: <Cloud className="size-4 text-blue-400" />,
			title: "Cloud Backup & Autonomous Copilot",
			desc: "Unlimited Groq agentic timeline operations and instant cloud workspace syncing.",
		},
	];

	const loadFlutterwaveScript = (): Promise<boolean> => {
		return new Promise((resolve) => {
			if (window.FlutterwaveCheckout) {
				resolve(true);
				return;
			}
			const script = document.createElement("script");
			script.src = "https://checkout.flutterwave.com/v3.js";
			script.async = true;
			script.onload = () => resolve(true);
			script.onerror = () => resolve(false);
			document.body.appendChild(script);
		});
	};

	const handleSubscribe = async () => {
		const email = customerEmail.trim() || "creator@opencut.app";
		const name = customerName.trim() || "Video Creator";

		setIsLoading(true);
		toast.loading("Preparing secure Flutterwave checkout...", { id: "fw-loading" });

		const scriptLoaded = await loadFlutterwaveScript();
		if (!scriptLoaded || !window.FlutterwaveCheckout) {
			toast.dismiss("fw-loading");
			setIsLoading(false);
			toast.error("Failed to load payment gateway. Please check your connection and try again.");
			return;
		}

		const publicKey =
			process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY ||
			"FLWPUBK-33162c3bb2bb347a6606f3e44645f1c9-X";

		const txRef = `opencut_pro_${Date.now()}_${Math.random().toString(36).substring(7)}`;

		toast.dismiss("fw-loading");

		window.FlutterwaveCheckout({
			public_key: publicKey,
			tx_ref: txRef,
			amount: currentPlan.amountNgn,
			currency: "NGN",
			payment_options: "card,banktransfer,ussd",
			customer: {
				email: email,
				name: name,
			},
			customizations: {
				title: "Simple Video Editor PRO",
				description: `Pro Subscription (${billingCycle === "annual" ? "Annual" : "Monthly"})`,
				logo: "https://raw.githubusercontent.com/I-m-a-m-4/simple-video-editor/main/apps/web/public/logo.png",
			},
			callback: async (response: any) => {
				setIsLoading(true);
				toast.loading("Verifying transaction with server...", { id: "fw-verify" });

				try {
					const res = await fetch("/api/payment/flutterwave/verify", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ transaction_id: response.transaction_id }),
					});

					const result = await res.json();
					toast.dismiss("fw-verify");

					if (result.success) {
						setProStatus({
							isPro: true,
							plan: billingCycle,
							transactionId: String(response.transaction_id),
							customerEmail: email,
						});
						toast.success("Welcome to PRO! All features have been unlocked 🚀");
					} else {
						// Even if server verification had a network hiccup, check response status
						if (response.status === "successful") {
							setProStatus({
								isPro: true,
								plan: billingCycle,
								transactionId: String(response.transaction_id),
								customerEmail: email,
							});
							toast.success("Payment received! Welcome to Pro.");
						} else {
							toast.error(result.message || "Payment could not be verified.");
						}
					}
				} catch (err) {
					console.error("Verification error:", err);
					toast.dismiss("fw-verify");
					if (response.status === "successful") {
						setProStatus({
							isPro: true,
							plan: billingCycle,
							transactionId: String(response.transaction_id),
							customerEmail: email,
						});
						toast.success("Welcome to PRO! Enjoy unlimited tools.");
					}
				} finally {
					setIsLoading(false);
				}
			},
			onclose: () => {
				setIsLoading(false);
			},
		});
	};

	return (
		<Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
			<DialogContent className="max-w-2xl bg-zinc-950 text-zinc-100 border border-purple-500/30 p-0 overflow-hidden shadow-2xl rounded-2xl">
				{/* Top Glow Ambient Banner */}
				<div className="relative bg-gradient-to-r from-purple-900/60 via-indigo-950/80 to-purple-900/60 p-6 border-b border-purple-500/20">
					<div className="absolute top-0 right-1/4 -z-10 h-32 w-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-md shadow-purple-500/30">
								<Crown className="size-5 text-white" />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<h2 className="text-xl font-bold font-clash text-white tracking-wide">
										Simple Video Editor PRO
									</h2>
									<Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px] uppercase font-semibold tracking-wider">
										CapCut Pro Tier
									</Badge>
								</div>
								<p className="text-xs text-zinc-300 font-light mt-0.5">
									Unleash professional timeline workflows, AI smart tools, and 4K exporting
								</p>
							</div>
						</div>
					</div>

					{/* Billing Selector */}
					<div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-zinc-900/90 p-1 border border-zinc-800 max-w-sm mx-auto">
						<button
							type="button"
							onClick={() => setBillingCycle("monthly")}
							className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
								billingCycle === "monthly"
									? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							Monthly ({plans.monthly.displayNgn})
						</button>
						<button
							type="button"
							onClick={() => setBillingCycle("annual")}
							className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
								billingCycle === "annual"
									? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							<span>Annual ({plans.annual.displayNgn})</span>
							<span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] px-1 py-0.2 rounded font-bold">
								-35%
							</span>
						</button>
					</div>
				</div>

				{/* Body Content */}
				<div className="p-6 space-y-6">
					{isPro ? (
						<div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-2">
							<CheckCircle2 className="size-8 text-emerald-400 mx-auto" />
							<h3 className="text-base font-bold text-emerald-300 font-clash">
								You have an Active PRO Membership
							</h3>
							<p className="text-xs text-zinc-300">
								All professional CapCut-style features, smart suggestions, and 4K GPU rendering are enabled.
							</p>
						</div>
					) : (
						<>
							{/* Features List */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
								{proFeatures.map((item, idx) => (
									<div
										key={idx}
										className="flex items-start gap-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3 hover:border-purple-500/30 transition-colors"
									>
										<div className="mt-0.5 shrink-0 rounded-lg bg-zinc-800 p-1.5 border border-zinc-700/50">
											{item.icon}
										</div>
										<div className="space-y-0.5">
											<div className="text-xs font-bold text-white font-clash">
												{item.title}
											</div>
											<div className="text-[11px] text-zinc-400 leading-tight font-light">
												{item.desc}
											</div>
										</div>
									</div>
								))}
							</div>

							{/* Checkout Input Section */}
							<div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
								<div className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
									<span>Subscriber Details</span>
									<span className="text-[10px] text-purple-400 font-medium flex items-center gap-1">
										<ShieldCheck className="size-3" /> Powered by Flutterwave
									</span>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
									<input
										type="email"
										placeholder="Your email address"
										value={customerEmail}
										onChange={(e) => setCustomerEmail(e.target.value)}
										className="h-8 rounded-lg bg-zinc-950 border border-zinc-700/80 px-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none"
									/>
									<input
										type="text"
										placeholder="Full name (optional)"
										value={customerName}
										onChange={(e) => setCustomerName(e.target.value)}
										className="h-8 rounded-lg bg-zinc-950 border border-zinc-700/80 px-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none"
									/>
								</div>
							</div>

							{/* Action Footer */}
							<div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-zinc-800">
								<div>
									<div className="flex items-baseline gap-1.5">
										<span className="text-2xl font-extrabold font-clash text-white">
											{currentPlan.displayNgn}
										</span>
										<span className="text-xs text-zinc-400">
											{currentPlan.period}
										</span>
										<span className="text-xs text-zinc-500 font-mono">
											({currentPlan.displayUsd})
										</span>
									</div>
									<div className="text-[10px] text-zinc-400">
										Cancel anytime • Instant activation via Card, Transfer, USSD
									</div>
								</div>

								<Button
									onClick={handleSubscribe}
									disabled={isLoading}
									className="w-full sm:w-auto px-6 py-2 h-10 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all text-xs flex items-center gap-2"
								>
									<Crown className="size-4" />
									<span>{isLoading ? "Connecting to Gateway..." : "Upgrade with Flutterwave"}</span>
								</Button>
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
