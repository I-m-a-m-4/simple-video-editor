"use client";

import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProStore, isUserAdmin } from "@/stores/pro-store";
import { useAuth } from "@/auth/auth-context";
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
import { recordTelemetryEvent } from "@/stores/telemetry-store";
import { saveRealTransaction } from "@/services/transactions";

declare global {
	interface Window {
		FlutterwaveCheckout?: (options: any) => void;
	}
}

export function ProUpgradeModal() {
	const { isModalOpen, closeModal, isPro, plan, setProStatus, grantAdminAccess } = useProStore();
	const { user, isAuthenticated } = useAuth();
	const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
	const [customerEmail, setCustomerEmail] = useState("");
	const [customerName, setCustomerName] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const activeEmail = user?.email || customerEmail.trim();
	const isAdmin = isUserAdmin(activeEmail);

	// Automatically recognize admin account and unlock all PRO capabilities for free
	useEffect(() => {
		if (isAdmin && !isPro) {
			grantAdminAccess(activeEmail || "belloimam431@gmail.com");
			toast.success("Admin Recognized: Lifetime Pro has been activated for free!", {
				id: "admin-pro-active",
			});
		}
	}, [isAdmin, isPro, activeEmail, grantAdminAccess]);

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
			icon: <Film className="size-4 text-orange-500" />,
			title: "4K 60fps & Ultra HD Export",
			desc: "Full hardware-accelerated rendering up to 4K resolution.",
		},
		{
			icon: <Sparkles className="size-4 text-orange-500" />,
			title: "AI Smart Suggestions",
			desc: "Automated timeline analysis for exposure, color, and audio balancing.",
		},
		{
			icon: <Sliders className="size-4 text-orange-500" />,
			title: "Global Edits & Color Match",
			desc: "One-click cinematic grade and consistent multi-clip exposure.",
		},
		{
			icon: <Mic className="size-4 text-orange-500" />,
			title: "Studio Voice Clarity",
			desc: "Background noise suppression and vocal isolation filters.",
		},
		{
			icon: <Zap className="size-4 text-orange-500" />,
			title: "Unlimited Audio & Video Tracks",
			desc: "Create complex multi-layered soundtracks and overlay composites.",
		},
		{
			icon: <Cloud className="size-4 text-orange-500" />,
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
		const email = user?.email || customerEmail.trim() || "creator@opencut.app";
		const name = user?.name || customerName.trim() || "Video Creator";

		if (isUserAdmin(email) || isAdmin) {
			grantAdminAccess(email);
			toast.success("Admin Recognized: Lifetime Pro activated for free!");
			return;
		}

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
						saveRealTransaction({
							id: `tx_${response.transaction_id || Date.now()}`,
							tx_ref: txRef,
							email: email,
							customer: name || email.split("@")[0],
							plan: billingCycle === "annual" ? "Annual Pro" : "Monthly Pro",
							amountNgn: currentPlan.amountNgn,
							amountUsd: billingCycle === "annual" ? 79.99 : 9.99,
							status: "successful",
							date: new Date().toLocaleString(),
							method: "Card",
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
						saveRealTransaction({
							id: `tx_${response.transaction_id || Date.now()}`,
							tx_ref: txRef,
							email: email,
							customer: name || email.split("@")[0],
							plan: billingCycle === "annual" ? "Annual Pro" : "Monthly Pro",
							amountNgn: currentPlan.amountNgn,
							amountUsd: billingCycle === "annual" ? 79.99 : 9.99,
							status: "successful",
							date: new Date().toLocaleString(),
							method: "Card",
						});
						toast.success("Welcome to PRO!");
					}
				} finally {
					setIsLoading(false);
					recordTelemetryEvent("payment_completed", "Flutterwave Pro Upgrade", `${billingCycle} plan - ${currentPlan.displayNgn}`);
				}
			},
			onclose: () => {
				setIsLoading(false);
			},
		});
	};

	return (
		<Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
			<DialogContent className="max-w-xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden shadow-2xl rounded-xl">
				{/* Top Minimalist Header */}
				<div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<div className="flex size-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500">
								<Crown className="size-4" />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<DialogTitle className="text-lg font-bold font-clash text-zinc-900 dark:text-zinc-100 tracking-tight">
										Upgrade to Pro
									</DialogTitle>
									<Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[10px] uppercase font-semibold">
										PRO
									</Badge>
								</div>
								<DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
									Professional editing tools, 4K export, and AI suggestions
								</DialogDescription>
							</div>
						</div>
					</div>

					{/* Minimalist Billing Cycle Switcher */}
					<div className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200 dark:border-zinc-800 max-w-xs mx-auto">
						<button
							type="button"
							onClick={() => setBillingCycle("monthly")}
							className={`flex-1 rounded-md py-1 text-xs font-medium transition-all ${
								billingCycle === "monthly"
									? "bg-orange-500 text-white shadow-xs font-semibold"
									: "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
							}`}
						>
							Monthly
						</button>
						<button
							type="button"
							onClick={() => setBillingCycle("annual")}
							className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1 text-xs font-medium transition-all ${
								billingCycle === "annual"
									? "bg-orange-500 text-white shadow-xs font-semibold"
									: "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
							}`}
						>
							<span>Annual</span>
							<span className={`text-[9px] px-1 py-0.5 rounded font-bold ${
								billingCycle === "annual"
									? "bg-white/20 text-white"
									: "bg-orange-500/10 text-orange-600 dark:text-orange-400"
							}`}>
								-35%
							</span>
						</button>
					</div>
				</div>

				{/* Body Content */}
				<div className="p-6 space-y-5 bg-white dark:bg-zinc-950">
					{isPro ? (
						<div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 text-center space-y-2">
							<CheckCircle2 className="size-6 text-orange-500 mx-auto" />
							<h3 className="text-sm font-bold text-orange-600 dark:text-orange-400 font-clash">
								{plan === "admin" || isAdmin ? "Admin Lifetime Pro Access" : "Active Pro Subscription"}
							</h3>
							<p className="text-xs text-zinc-600 dark:text-zinc-400">
								{plan === "admin" || isAdmin
									? `Admin privileges recognized for ${activeEmail || "belloimam431@gmail.com"}. All 4K exports, AI smart tools, studio clarity, and unlimited tracks are 100% free forever.`
									: "All professional features, AI suggestions, and 4K exporting are enabled."}
							</p>
							<div className="pt-2 flex justify-center">
								<Button
									variant="outline"
									size="sm"
									onClick={closeModal}
									className="text-xs h-8 border-orange-500/30 text-orange-500 hover:bg-orange-500/10 font-semibold"
								>
									Done
								</Button>
							</div>
						</div>
					) : (
						<>
							{/* Features Minimalist Grid */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
								{proFeatures.map((item, idx) => (
									<div
										key={idx}
										className="flex items-start gap-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-2.5 hover:border-orange-500/30 transition-colors shadow-xs"
									>
										<div className="mt-0.5 shrink-0 rounded-md bg-white dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700">
											{item.icon}
										</div>
										<div className="space-y-0.5">
											<div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
												{item.title}
											</div>
											<div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight font-normal">
												{item.desc}
											</div>
										</div>
									</div>
								))}
							</div>

							{/* Account Details - Automatically pre-filled if authenticated */}
							{isAdmin ? (
								<div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center justify-between shadow-xs">
									<div className="flex items-center gap-2.5">
										<div className="size-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 flex items-center justify-center font-bold text-xs">
											<ShieldCheck className="size-4" />
										</div>
										<div className="text-left">
											<div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
												<span>{user?.name || "Admin User"}</span>
												<Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] py-0 px-1 font-semibold">
													Admin • 100% Free
												</Badge>
											</div>
											<div className="text-[11px] text-zinc-600 dark:text-zinc-400 font-normal">
												{activeEmail || "belloimam431@gmail.com"}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
										<CheckCircle2 className="size-3.5" />
										<span>Lifetime Pro</span>
									</div>
								</div>
							) : isAuthenticated && user ? (
								<div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 flex items-center justify-between shadow-xs">
									<div className="flex items-center gap-2.5">
										<div className="size-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center font-bold text-xs uppercase">
											{user.name ? user.name[0] : user.email[0]}
										</div>
										<div className="text-left">
											<div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
												<span>{user.name || "Video Creator"}</span>
												<Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] py-0 px-1 font-medium">
													Verified Account
												</Badge>
											</div>
											<div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
												{user.email}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400 font-medium">
										<CheckCircle2 className="size-3.5" />
										<span>Auto-Linked</span>
									</div>
								</div>
							) : (
								<div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-3 space-y-2">
									<div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
										<span>Account Information</span>
										<span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
											<ShieldCheck className="size-3 text-orange-500" /> Flutterwave
										</span>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
										<input
											type="email"
											placeholder="Email address"
											value={customerEmail}
											onChange={(e) => setCustomerEmail(e.target.value)}
											className="h-8 rounded-md bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
										/>
										<input
											type="text"
											placeholder="Full name (optional)"
											value={customerName}
											onChange={(e) => setCustomerName(e.target.value)}
											className="h-8 rounded-md bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
										/>
									</div>
								</div>
							)}

							{/* Checkout Action Bar */}
							<div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
								<div>
									<div className="flex items-baseline gap-1.5">
										<span className="text-xl font-bold font-clash text-zinc-900 dark:text-zinc-100">
											{isAdmin ? "₦0" : currentPlan.displayNgn}
										</span>
										<span className="text-xs text-zinc-500 dark:text-zinc-400">
											{isAdmin ? "/ lifetime" : currentPlan.period}
										</span>
										<span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
											{isAdmin ? "(Free for Admin)" : `(${currentPlan.displayUsd})`}
										</span>
									</div>
									<div className="text-[10px] text-zinc-500 dark:text-zinc-400">
										{isAdmin ? "Admin privilege: Zero payment required" : "Cards, Bank Transfer, USSD • Cancel anytime"}
									</div>
								</div>

								<Button
									onClick={handleSubscribe}
									disabled={isLoading}
									className={`w-full sm:w-auto px-5 py-2 h-9 text-white font-semibold rounded-md shadow-xs transition-all text-xs flex items-center justify-center gap-2 ${
										isAdmin
											? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10"
											: "bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-orange-500/10"
									}`}
								>
									{isAdmin ? <CheckCircle2 className="size-3.5" /> : <Crown className="size-3.5" />}
									<span>
										{isLoading
											? "Connecting..."
											: isAdmin
												? "Activate Admin Pro (Free)"
												: "Pay with Flutterwave"}
									</span>
								</Button>
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
