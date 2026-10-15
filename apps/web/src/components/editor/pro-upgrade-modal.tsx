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
import { useProStore, isUserAdmin, type ProPlanTier } from "@/stores/pro-store";
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
	Check,
	Layers,
	Video,
	Wand2,
	Clapperboard,
} from "lucide-react";
import { toast } from "sonner";
import { recordTelemetryEvent } from "@/stores/telemetry-store";
import { saveRealTransaction } from "@/services/transactions";

declare global {
	interface Window {
		FlutterwaveCheckout?: (options: any) => void;
	}
}

interface PlanDefinition {
	id: "creator" | "director";
	name: string;
	badge: string;
	tagline: string;
	isPopular?: boolean;
	pricing: {
		monthly: {
			amountNgn: number;
			displayNgn: string;
			displayUsd: string;
			period: string;
		};
		annual: {
			amountNgn: number;
			displayNgn: string;
			displayUsd: string;
			period: string;
			savings: string;
		};
	};
	features: string[];
}

const PLANS: PlanDefinition[] = [
	{
		id: "creator",
		name: "Creator Studio",
		badge: "CREATOR",
		tagline: "Essential AI tools for YouTubers, TikTokers & content creators",
		pricing: {
			monthly: {
				amountNgn: 14500,
				displayNgn: "₦14,500",
				displayUsd: "$11.99",
				period: "/month",
			},
			annual: {
				amountNgn: 99000,
				displayNgn: "₦99,000",
				displayUsd: "$79.99",
				period: "/year",
				savings: "Save 43%",
			},
		},
		features: [
			"4K 60fps & Ultra HD hardware export",
			"AI Long Video to Shorts Generator (Multi-clip cuts)",
			"Auto-Transitions between cuts (Zoom, Dissolve, Glitch)",
			"Amber AI Voice Studio & Dynamic Auto-Captions",
			"Studio Voice Clarity & Background Noise Removal",
			"35+ GPU Shaders, Keyframe Transitions & Effects",
			"Up to 15 Video & Audio timeline tracks",
		],
	},
	{
		id: "director",
		name: "Director Suite",
		badge: "MOST POPULAR • STUDIO PRO",
		tagline: "Full-scale production toolkit for filmmakers, agencies & power editors",
		isPopular: true,
		pricing: {
			monthly: {
				amountNgn: 29500,
				displayNgn: "₦29,500",
				displayUsd: "$24.99",
				period: "/month",
			},
			annual: {
				amountNgn: 198000,
				displayNgn: "₦198,000",
				displayUsd: "$159.99",
				period: "/year",
				savings: "Save 44%",
			},
		},
		features: [
			"Everything in Creator Studio, plus:",
			"4K ProRes & Ultra HD Lossless GPU Rendering",
			"Unlimited Video & Audio Timeline Tracks",
			"Autonomous Amber AI Editing Agent Copilot",
			"Multi-Scene Workspaces & Timeline Nesting",
			"Global Cinematic Color Match & Exposure Grade",
			"Motion Graphics Launch Video Generator",
			"Priority Cloud Project Backup & Device Sync",
		],
	},
];

export function ProUpgradeModal() {
	const { isModalOpen, closeModal, isPro, plan, setProStatus, grantAdminAccess } = useProStore();
	const { user, isAuthenticated } = useAuth();
	const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
	const [customerEmail, setCustomerEmail] = useState("");
	const [customerName, setCustomerName] = useState("");
	const [selectedPlanId, setSelectedPlanId] = useState<"creator" | "director">("director");
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

	const handleSubscribe = async (planDef: PlanDefinition) => {
		const email = user?.email || customerEmail.trim() || "creator@ambercut.app";
		const name = user?.name || customerName.trim() || "Video Creator";

		if (isUserAdmin(email) || isAdmin) {
			grantAdminAccess(email);
			toast.success("Admin Recognized: Lifetime Pro activated for free!");
			return;
		}

		setIsLoading(true);
		toast.loading("Opening secure checkout...", { id: "checkout-loading" });

		const scriptLoaded = await loadFlutterwaveScript();
		if (!scriptLoaded || !window.FlutterwaveCheckout) {
			toast.dismiss("checkout-loading");
			setIsLoading(false);
			toast.error("Failed to load payment gateway. Please check your internet connection.");
			return;
		}

		const currentPricing = planDef.pricing[billingCycle];
		const publicKey =
			process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY ||
			"FLWPUBK-33162c3bb2bb347a6606f3e44645f1c9-X";

		const txRef = `ambercut_${planDef.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

		toast.dismiss("checkout-loading");

		window.FlutterwaveCheckout({
			public_key: publicKey,
			tx_ref: txRef,
			amount: currentPricing.amountNgn,
			currency: "NGN",
			payment_options: "card,banktransfer,ussd",
			customer: {
				email: email,
				name: name,
			},
			customizations: {
				title: `AmberCut ${planDef.name}`,
				description: `${planDef.name} Subscription (${billingCycle === "annual" ? "Annual" : "Monthly"})`,
				logo: "https://raw.githubusercontent.com/I-m-a-m-4/simple-video-editor/main/apps/web/public/logo.png",
			},
			callback: async (response: any) => {
				setIsLoading(true);
				toast.loading("Verifying transaction...", { id: "pay-verify" });

				try {
					const res = await fetch("/api/payment/flutterwave/verify", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ transaction_id: response.transaction_id }),
					});

					const result = await res.json();
					toast.dismiss("pay-verify");

					const resolvedTier: ProPlanTier =
						planDef.id === "director"
							? billingCycle === "annual"
								? "director_annual"
								: "director_monthly"
							: billingCycle === "annual"
								? "creator_annual"
								: "creator_monthly";

					if (result.success || response.status === "successful") {
						setProStatus({
							isPro: true,
							plan: resolvedTier,
							transactionId: String(response.transaction_id),
							customerEmail: email,
						});
						saveRealTransaction({
							id: `tx_${response.transaction_id || Date.now()}`,
							tx_ref: txRef,
							email: email,
							customer: name || email.split("@")[0],
							plan: billingCycle === "annual" ? "Annual Pro" : "Monthly Pro",
							amountNgn: currentPricing.amountNgn,
							amountUsd: billingCycle === "annual" ? (planDef.id === "director" ? 159.99 : 79.99) : (planDef.id === "director" ? 24.99 : 11.99),
							status: "successful",
							date: new Date().toLocaleString(),
							method: "Card",
						});
						toast.success(`Welcome to AmberCut ${planDef.name}! All features unlocked.`);
					} else {
						toast.error(result.message || "Payment could not be verified.");
					}
				} catch (err) {
					console.error("Verification error:", err);
					toast.dismiss("pay-verify");
					if (response.status === "successful") {
						const resolvedTier: ProPlanTier =
							planDef.id === "director"
								? billingCycle === "annual"
									? "director_annual"
									: "director_monthly"
								: billingCycle === "annual"
									? "creator_annual"
									: "creator_monthly";

						setProStatus({
							isPro: true,
							plan: resolvedTier,
							transactionId: String(response.transaction_id),
							customerEmail: email,
						});
						saveRealTransaction({
							id: `tx_${response.transaction_id || Date.now()}`,
							tx_ref: txRef,
							email: email,
							customer: name || email.split("@")[0],
							plan: billingCycle === "annual" ? "Annual Pro" : "Monthly Pro",
							amountNgn: currentPricing.amountNgn,
							amountUsd: billingCycle === "annual" ? (planDef.id === "director" ? 159.99 : 79.99) : (planDef.id === "director" ? 24.99 : 11.99),
							status: "successful",
							date: new Date().toLocaleString(),
							method: "Card",
						});
						toast.success(`Welcome to AmberCut ${planDef.name}!`);
					}
				} finally {
					setIsLoading(false);
					recordTelemetryEvent(
						"payment_completed",
						`AmberCut ${planDef.name} Upgrade`,
						`${billingCycle} plan - ${currentPricing.displayNgn}`,
					);
				}
			},
			onclose: () => {
				setIsLoading(false);
			},
		});
	};

	return (
		<Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
			<DialogContent className="w-[95vw] sm:max-w-4xl lg:max-w-5xl bg-card border-border text-foreground p-0 overflow-hidden shadow-2xl rounded-2xl max-h-[92vh] flex flex-col">
				{/* Top Minimalist Header */}
				<div className="px-6 py-5 border-b border-border bg-muted/20 shrink-0">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="size-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
								<Crown className="size-5" />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<DialogTitle className="text-xl font-bold tracking-tight">
										Upgrade AmberCut
									</DialogTitle>
									<Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-[10px] font-bold">
										PRO
									</Badge>
								</div>
								<DialogDescription className="text-xs text-muted-foreground mt-0.5">
									Choose the perfect plan tailored for your video editing workflow
								</DialogDescription>
							</div>
						</div>

						{/* Billing Cycle Switcher */}
						<div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border shrink-0 self-start sm:self-auto">
							<button
								type="button"
								onClick={() => setBillingCycle("monthly")}
								className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
									billingCycle === "monthly"
										? "bg-orange-500 text-white shadow-xs"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Monthly
							</button>
							<button
								type="button"
								onClick={() => setBillingCycle("annual")}
								className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
									billingCycle === "annual"
										? "bg-orange-500 text-white shadow-xs"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								<span>Annual</span>
								<span
									className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
										billingCycle === "annual"
											? "bg-white/20 text-white"
											: "bg-orange-500/15 text-orange-600 dark:text-orange-400"
									}`}
								>
									Save ~44%
								</span>
							</button>
						</div>
					</div>
				</div>

				{/* Body Content */}
				<div className="p-6 overflow-y-auto min-h-0 flex-1 space-y-6">
					{isPro ? (
						<div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-6 text-center space-y-3">
							<CheckCircle2 className="size-8 text-orange-500 mx-auto" />
							<h3 className="text-base font-bold text-orange-600 dark:text-orange-400">
								{plan === "admin" || isAdmin
									? "Admin Lifetime Pro Access Active"
									: `Active Plan: ${String(plan || "Pro").toUpperCase()}`}
							</h3>
							<p className="text-xs text-muted-foreground max-w-md mx-auto">
								{plan === "admin" || isAdmin
									? `Admin privileges recognized for ${activeEmail || "belloimam431@gmail.com"}. All 4K exports, AI smart tools, studio voice clarity, and unlimited tracks are 100% free forever.`
									: "All professional video features, 4K exports, Amber AI smart suggestions, and multi-clip shorts tools are unlocked."}
							</p>
							<div className="pt-2 flex justify-center">
								<Button
									variant="outline"
									size="sm"
									onClick={closeModal}
									className="text-xs h-9 px-5 border-orange-500/40 text-orange-500 hover:bg-orange-500/10 font-semibold rounded-xl"
								>
									Continue Editing
								</Button>
							</div>
						</div>
					) : (
						<>
							{/* User Identity Notification */}
							{isAuthenticated && user && (
								<div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
									<div className="flex items-center gap-2 text-foreground font-medium">
										<div className="size-6 rounded-full bg-orange-500/20 text-orange-500 font-bold flex items-center justify-center text-[10px]">
											{user.name ? user.name[0] : user.email[0]}
										</div>
										<span>{user.name || "Creator"}</span>
										<span className="text-muted-foreground font-mono text-[11px]">
											({user.email})
										</span>
									</div>
									<Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none text-[10px]">
										Auto-Linked Account
									</Badge>
								</div>
							)}

							{/* Side-by-Side Dual Pricing Cards */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								{PLANS.map((p) => {
									const pricing = p.pricing[billingCycle];
									const isCurrentSelected = selectedPlanId === p.id;

									return (
										<div
											key={p.id}
											onClick={() => setSelectedPlanId(p.id)}
											className={`relative rounded-2xl p-6 border transition-all flex flex-col justify-between cursor-pointer ${
												p.isPopular
													? "border-orange-500/80 bg-gradient-to-b from-orange-500/[0.07] via-background to-background shadow-xl ring-1 ring-orange-500/30"
													: "border-border bg-card/60 hover:border-orange-500/40 hover:bg-muted/30 shadow-md"
											}`}
										>
											{p.isPopular && (
												<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
													{p.badge}
												</div>
											)}

											<div className="space-y-4">
												{/* Plan Header */}
												<div className="space-y-1">
													<div className="flex items-center justify-between">
														<h4 className="text-lg font-bold text-foreground">
															{p.name}
														</h4>
														{!p.isPopular && (
															<Badge variant="outline" className="text-[10px] text-muted-foreground">
																{p.badge}
															</Badge>
														)}
													</div>
													<p className="text-xs text-muted-foreground min-h-[32px]">
														{p.tagline}
													</p>
												</div>

												{/* Price display */}
												<div className="pt-2 border-t border-border/80">
													<div className="flex items-baseline gap-1.5">
														<span className="text-3xl font-extrabold tracking-tight text-foreground font-clash">
															{pricing.displayNgn}
														</span>
														<span className="text-xs text-muted-foreground font-medium">
															{pricing.period}
														</span>
													</div>
													<div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
														<span>{pricing.displayUsd}</span>
														{"savings" in pricing && (
															<span className="text-orange-500 font-bold">
																• {pricing.savings}
															</span>
														)}
													</div>
												</div>

												{/* Feature Checklist */}
												<div className="pt-4 border-t border-border/80 space-y-2.5">
													<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
														Included Features:
													</span>
													<ul className="space-y-2">
														{p.features.map((feat, idx) => (
															<li
																key={idx}
																className="flex items-start gap-2 text-xs text-foreground/90 leading-tight"
															>
																<div className="size-4 rounded-full bg-orange-500/15 text-orange-500 flex items-center justify-center shrink-0 mt-0.5">
																	<Check className="size-2.5 stroke-[3]" />
																</div>
																<span className={idx === 0 && p.id === "director" ? "font-semibold text-orange-500" : ""}>
																	{feat}
																</span>
															</li>
														))}
													</ul>
												</div>
											</div>

											{/* Pay Button - says 'Pay', not 'Pay with Flutterwave' */}
											<div className="pt-6 mt-4 border-t border-border/60">
												<Button
													onClick={(e) => {
														e.stopPropagation();
														handleSubscribe(p);
													}}
													disabled={isLoading}
													className={`w-full h-10 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer ${
														p.isPopular
															? "bg-orange-500 hover:bg-orange-600 text-white"
															: "bg-foreground hover:bg-foreground/90 text-background"
													}`}
												>
													{isLoading ? (
														"Connecting..."
													) : (
														<span>
															Pay {pricing.displayNgn}
														</span>
													)}
												</Button>
											</div>
										</div>
									);
								})}
							</div>

							{/* Unauthenticated Guest Billing Info */}
							{!isAuthenticated && (
								<div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
									<div className="flex items-center justify-between text-xs font-semibold text-foreground">
										<span>Billing Details</span>
										<span className="text-[10px] text-muted-foreground flex items-center gap-1 font-normal">
											<ShieldCheck className="size-3.5 text-emerald-500" /> 256-Bit SSL Encrypted
										</span>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
										<input
											type="email"
											placeholder="Your email address"
											value={customerEmail}
											onChange={(e) => setCustomerEmail(e.target.value)}
											className="h-9 rounded-xl bg-background border border-border px-3 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-orange-500 focus:outline-none"
										/>
										<input
											type="text"
											placeholder="Your full name (optional)"
											value={customerName}
											onChange={(e) => setCustomerName(e.target.value)}
											className="h-9 rounded-xl bg-background border border-border px-3 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-orange-500 focus:outline-none"
										/>
									</div>
								</div>
							)}

							<div className="text-center text-[11px] text-muted-foreground pt-1">
								<span>Cards, Bank Transfer, Apple Pay &amp; USSD supported • Cancel anytime</span>
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
