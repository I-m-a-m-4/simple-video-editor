"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProStore } from "@/stores/pro-store";
import {
	Sparkles,
	Zap,
	ShieldCheck,
	Crown,
	Sliders,
	Mic,
	Cloud,
	Film,
	CheckCircle2,
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
			icon: <Film className="size-4 text-orange-400" />,
			title: "4K 60fps & Ultra HD Export",
			desc: "Full hardware-accelerated rendering up to 4K resolution.",
		},
		{
			icon: <Sparkles className="size-4 text-orange-400" />,
			title: "AI Smart Suggestions",
			desc: "Automated timeline analysis for exposure, color, and audio balancing.",
		},
		{
			icon: <Sliders className="size-4 text-orange-400" />,
			title: "Global Edits & Color Match",
			desc: "One-click cinematic grade and consistent multi-clip exposure.",
		},
		{
			icon: <Mic className="size-4 text-orange-400" />,
			title: "Studio Voice Clarity",
			desc: "Background noise suppression and vocal isolation filters.",
		},
		{
			icon: <Zap className="size-4 text-orange-400" />,
			title: "Unlimited Audio & Video Tracks",
			desc: "Create complex multi-layered soundtracks and overlay composites.",
		},
		{
			icon: <Cloud className="size-4 text-orange-400" />,
			title: "Cloud Backup & Agent Copilot",
			desc: "Autonomous Groq agent timeline tools and workspace syncing.",
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
		toast.loading("Opening secure Flutterwave checkout...", { id: "fw-loading" });

		const scriptLoaded = await loadFlutterwaveScript();
		if (!scriptLoaded || !window.FlutterwaveCheckout) {
			toast.dismiss("fw-loading");
			setIsLoading(false);
			toast.error("Failed to load payment gateway. Please check your internet connection.");
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
				toast.loading("Verifying transaction...", { id: "fw-verify" });

				try {
					const res = await fetch("/api/payment/flutterwave/verify", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ transaction_id: response.transaction_id }),
					});

					const result = await res.json();
					toast.dismiss("fw-verify");

					if (result.success || response.status === "successful") {
						setProStatus({
							isPro: true,
							plan: billingCycle,
							transactionId: String(response.transaction_id),
							customerEmail: email,
						});
						toast.success("Welcome to PRO! Features unlocked.");
					} else {
						toast.error(result.message || "Payment could not be verified.");
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
						toast.success("Welcome to PRO!");
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
			<DialogContent className="max-w-xl bg-zinc-950 text-zinc-100 border border-zinc-800 p-0 overflow-hidden shadow-2xl rounded-xl">
				{/* Top Minimalist Header */}
				<div className="p-6 border-b border-zinc-800/80 bg-zinc-900/30">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<div className="flex size-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
								<Crown className="size-4" />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<h2 className="text-lg font-bold font-clash text-white tracking-tight">
										Upgrade to Pro
									</h2>
									<Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px] uppercase font-semibold">
										PRO
									</Badge>
								</div>
								<p className="text-xs text-zinc-400 font-light">
									Professional editing tools, 4K export, and AI suggestions
								</p>
							</div>
						</div>
					</div>

					{/* Minimalist Billing Cycle Switcher */}
					<div className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 p-1 border border-zinc-800 max-w-xs mx-auto">
						<button
							type="button"
							onClick={() => setBillingCycle("monthly")}
							className={`flex-1 rounded-md py-1 text-xs font-medium transition-all ${
								billingCycle === "monthly"
									? "bg-orange-500 text-white shadow-xs"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							Monthly
						</button>
						<button
							type="button"
							onClick={() => setBillingCycle("annual")}
							className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1 text-xs font-medium transition-all ${
								billingCycle === "annual"
									? "bg-orange-500 text-white shadow-xs"
									: "text-zinc-400 hover:text-white"
							}`}
						>
							<span>Annual</span>
							<span className={`text-[9px] px-1 py-0.5 rounded font-bold ${
								billingCycle === "annual"
									? "bg-white/20 text-white"
									: "bg-orange-500/20 text-orange-400"
							}`}>
								-35%
							</span>
						</button>
					</div>
				</div>

				{/* Body Content */}
				<div className="p-6 space-y-5">
					{isPro ? (
						<div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 text-center space-y-2">
							<CheckCircle2 className="size-6 text-orange-400 mx-auto" />
							<h3 className="text-sm font-bold text-orange-300 font-clash">
								Active Pro Subscription
							</h3>
							<p className="text-xs text-zinc-400">
								All professional features, AI suggestions, and 4K exporting are enabled.
							</p>
						</div>
					) : (
						<>
							{/* Features Minimalist Grid */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
								{proFeatures.map((item, idx) => (
									<div
										key={idx}
										className="flex items-start gap-2.5 rounded-lg border border-zinc-850 bg-zinc-900/40 p-2.5 hover:border-orange-500/20 transition-colors"
									>
										<div className="mt-0.5 shrink-0 rounded-md bg-zinc-800/80 p-1 border border-zinc-700/40">
											{item.icon}
										</div>
										<div className="space-y-0.5">
											<div className="text-xs font-semibold text-zinc-200">
												{item.title}
											</div>
											<div className="text-[11px] text-zinc-400 leading-tight font-light">
												{item.desc}
											</div>
										</div>
									</div>
								))}
							</div>

							{/* Customer Email Input */}
							<div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
								<div className="text-xs font-medium text-zinc-300 flex items-center justify-between">
									<span>Account Information</span>
									<span className="text-[10px] text-zinc-500 flex items-center gap-1">
										<ShieldCheck className="size-3 text-orange-400/80" /> Flutterwave
									</span>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									<input
										type="email"
										placeholder="Email address"
										value={customerEmail}
										onChange={(e) => setCustomerEmail(e.target.value)}
										className="h-8 rounded-md bg-zinc-950 border border-zinc-800 px-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none"
									/>
									<input
										type="text"
										placeholder="Full name (optional)"
										value={customerName}
										onChange={(e) => setCustomerName(e.target.value)}
										className="h-8 rounded-md bg-zinc-950 border border-zinc-800 px-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none"
									/>
								</div>
							</div>

							{/* Checkout Action Bar */}
							<div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
								<div>
									<div className="flex items-baseline gap-1.5">
										<span className="text-xl font-bold font-clash text-white">
											{currentPlan.displayNgn}
										</span>
										<span className="text-xs text-zinc-400">
											{currentPlan.period}
										</span>
										<span className="text-xs text-zinc-500">
											({currentPlan.displayUsd})
										</span>
									</div>
									<div className="text-[10px] text-zinc-500">
										Cards, Bank Transfer, USSD • Cancel anytime
									</div>
								</div>

								<Button
									onClick={handleSubscribe}
									disabled={isLoading}
									className="w-full sm:w-auto px-5 py-2 h-9 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-md shadow-xs shadow-orange-500/10 transition-all text-xs flex items-center gap-2"
								>
									<Crown className="size-3.5" />
									<span>{isLoading ? "Connecting..." : "Pay with Flutterwave"}</span>
								</Button>
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
