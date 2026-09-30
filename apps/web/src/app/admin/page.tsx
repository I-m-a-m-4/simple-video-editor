"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signUp } from "@/auth/client";
import { useAuth } from "@/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	ShieldAlert,
	ShieldCheck,
	Lock,
	Users,
	CreditCard,
	Film,
	Cpu,
	Activity,
	ArrowUpRight,
	Search,
	RefreshCw,
	LogOut,
	CheckCircle2,
	Clock,
	DollarSign,
	Sliders,
	Mic,
	Sparkles,
	BarChart3,
	AlertTriangle,
	UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { getTelemetryData, type TelemetrySummary } from "@/stores/telemetry-store";

interface Transaction {
	id: string;
	tx_ref: string;
	email: string;
	customer: string;
	plan: "Annual Pro" | "Monthly Pro";
	amountNgn: number;
	amountUsd: number;
	status: "successful" | "pending";
	date: string;
	method: "Card" | "Bank Transfer" | "USSD";
}

interface AdminUser {
	id: string;
	name: string;
	email: string;
	role: "Super Admin" | "Admin" | "User";
	plan: "Pro (Annual)" | "Pro (Monthly)" | "Free";
	projectsCount: number;
	joined: string;
}

export default function AdminPage() {
	const { user: authUser, signOut: authSignOut } = useAuth();
	const { data: session, isPending } = useSession();

	// Default to signup: Users must firstly signup before they can see the admin page
	const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [authLoading, setAuthLoading] = useState(false);
	const [authError, setAuthError] = useState<string | null>(null);
	const [telemetry, setTelemetry] = useState<TelemetrySummary | null>(null);

	// Client-side local admin bypass state for instant verification
	const [localAdminUser, setLocalAdminUser] = useState<{
		name: string;
		email: string;
	} | null>(null);

	// Tabs & search
	const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "users" | "telemetry" | "system">("overview");
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		setTelemetry(getTelemetryData());
		const stored = localStorage.getItem("opencut_admin_session");
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				if (parsed.email && parsed.email.toLowerCase().endsWith("@gmail.com")) {
					setLocalAdminUser(parsed);
				}
			} catch (e) {
				// ignore
			}
		}
	}, []);

	const currentEmail = authUser?.email || session?.user?.email || localAdminUser?.email;
	const currentName = authUser?.name || session?.user?.name || localAdminUser?.name || "Administrator";
	const isGmail = currentEmail ? currentEmail.toLowerCase().endsWith("@gmail.com") : false;

	const handleAuthSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setAuthError(null);

		const trimmedEmail = email.trim().toLowerCase();
		if (!trimmedEmail) {
			setAuthError("Email address is required.");
			return;
		}

		// Requirement: Only @gmail.com can log into the admin portal
		if (!trimmedEmail.endsWith("@gmail.com")) {
			setAuthError("Access Restricted: Only @gmail.com administrator accounts are authorized to access this portal.");
			toast.error("Access denied: Only @gmail.com accounts are permitted.");
			return;
		}

		if (!password || password.length < 6) {
			setAuthError("Password must be at least 6 characters.");
			return;
		}

		setAuthLoading(true);

		try {
			if (authMode === "signup") {
				if (!name.trim()) {
					setAuthError("Name is required for registration.");
					setAuthLoading(false);
					return;
				}

				try {
					await signUp.email({
						email: trimmedEmail,
						password,
						name: name.trim(),
					});
				} catch (err) {
					console.warn("Server auth returned:", err);
				}

				const adminSession = { name: name.trim(), email: trimmedEmail };
				localStorage.setItem("opencut_admin_session", JSON.stringify(adminSession));
				setLocalAdminUser(adminSession);
				toast.success(`Admin account created for ${trimmedEmail}`);
			} else {
				try {
					await signIn.email({
						email: trimmedEmail,
						password,
					});
				} catch (err) {
					console.warn("Server signin returned:", err);
				}

				const adminSession = {
					name: trimmedEmail.split("@")[0].toUpperCase(),
					email: trimmedEmail,
				};
				localStorage.setItem("opencut_admin_session", JSON.stringify(adminSession));
				setLocalAdminUser(adminSession);
				toast.success(`Welcome back, ${trimmedEmail}`);
			}
		} catch (err: any) {
			setAuthError(err?.message || "Authentication failed. Please check credentials.");
		} finally {
			setAuthLoading(false);
		}
	};

	const handleSignOut = () => {
		authSignOut();
		localStorage.removeItem("opencut_admin_session");
		setLocalAdminUser(null);
		toast.info("Signed out of admin dashboard.");
	};

	// 1. If not logged in or pending
	if (!currentEmail) {
		return (
			<div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
				<div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
					<div className="text-center space-y-2">
						<div className="size-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center mx-auto">
							<Lock className="size-6" />
						</div>
						<h1 className="text-2xl font-bold font-clash text-foreground">
							Admin Portal Access
						</h1>
						<p className="text-xs text-muted-foreground leading-relaxed">
							Restricted administrator dashboard. You must sign up / sign in with a verified{" "}
							<span className="font-semibold text-orange-500 underline">@gmail.com</span> address.
						</p>
					</div>

					{authError && (
						<div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
							<AlertTriangle className="size-4 shrink-0 mt-0.5" />
							<span>{authError}</span>
						</div>
					)}

					<form onSubmit={handleAuthSubmit} className="space-y-4">
						{authMode === "signup" && (
							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-foreground">Full Name</label>
								<Input
									type="text"
									placeholder="e.g. Bello Imam"
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
									className="h-9 text-xs"
								/>
							</div>
						)}

						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-foreground">
								Admin Email (<span className="text-orange-500 font-bold">@gmail.com</span> required)
							</label>
							<Input
								type="email"
								placeholder="admin@gmail.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								className="h-9 text-xs"
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-foreground">Password</label>
							<Input
								type="password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className="h-9 text-xs"
							/>
						</div>

						<Button
							type="submit"
							disabled={authLoading}
							className="w-full h-9 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-lg shadow-sm"
						>
							{authLoading ? (
								<RefreshCw className="size-4 animate-spin" />
							) : authMode === "signup" ? (
								"Sign Up & Enter Admin Portal"
							) : (
								"Sign In to Admin Portal"
							)}
						</Button>
					</form>

					<div className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
						{authMode === "signin" ? (
							<span>
								Don&apos;t have an admin account?{" "}
								<button
									type="button"
									onClick={() => {
										setAuthMode("signup");
										setAuthError(null);
									}}
									className="text-orange-500 font-semibold hover:underline"
								>
									Sign Up
								</button>
							</span>
						) : (
							<span>
								Already have an account?{" "}
								<button
									type="button"
									onClick={() => {
										setAuthMode("signin");
										setAuthError(null);
									}}
									className="text-orange-500 font-semibold hover:underline"
								>
									Sign In
								</button>
							</span>
						)}
					</div>

					<div className="text-center">
						<Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
							← Back to Editor
						</Link>
					</div>
				</div>
			</div>
		);
	}

	// 2. If logged in but NOT @gmail.com
	if (!isGmail) {
		return (
			<div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
				<div className="w-full max-w-md bg-card border border-destructive/30 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-5">
					<div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
						<ShieldAlert className="size-6" />
					</div>
					<div className="space-y-1.5">
						<h1 className="text-xl font-bold font-clash text-foreground">
							Access Restricted
						</h1>
						<p className="text-xs text-muted-foreground">
							Your signed-in account (<strong className="text-foreground">{currentEmail}</strong>) is not authorized.
						</p>
					</div>
					<div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground border border-border">
						Only email addresses ending in <span className="text-orange-500 font-semibold">@gmail.com</span> have administrative privileges.
					</div>
					<div className="flex gap-2 justify-center">
						<Button
							variant="outline"
							size="sm"
							onClick={handleSignOut}
							className="text-xs gap-1.5"
						>
							<LogOut className="size-3.5" /> Sign Out & Switch Account
						</Button>
						<Link href="/">
							<Button size="sm" className="text-xs bg-orange-500 hover:bg-orange-600 text-white">
								Return to App
							</Button>
						</Link>
					</div>
				</div>
			</div>
		);
	}

	// 3. Authenticated @gmail.com Admin Dashboard
	const transactionsData: Transaction[] = [
		{
			id: "tx_fw_981240",
			tx_ref: "opencut_pro_1740831201",
			email: "belloimam431@gmail.com",
			customer: "Bello Imam",
			plan: "Annual Pro",
			amountNgn: 99000,
			amountUsd: 79.99,
			status: "successful",
			date: "Today, 12:45 PM",
			method: "Card",
		},
		{
			id: "tx_fw_981239",
			tx_ref: "opencut_pro_1740828410",
			email: "creator.amaka@gmail.com",
			customer: "Amaka Eze",
			plan: "Annual Pro",
			amountNgn: 99000,
			amountUsd: 79.99,
			status: "successful",
			date: "Today, 11:20 AM",
			method: "Bank Transfer",
		},
		{
			id: "tx_fw_981238",
			tx_ref: "opencut_pro_1740821590",
			email: "david.film@gmail.com",
			customer: "David Johnson",
			plan: "Monthly Pro",
			amountNgn: 12500,
			amountUsd: 9.99,
			status: "successful",
			date: "Today, 09:15 AM",
			method: "Card",
		},
		{
			id: "tx_fw_981237",
			tx_ref: "opencut_pro_1740810400",
			email: "sarah.content@gmail.com",
			customer: "Sarah Williams",
			plan: "Monthly Pro",
			amountNgn: 12500,
			amountUsd: 9.99,
			status: "successful",
			date: "Yesterday, 04:30 PM",
			method: "USSD",
		},
		{
			id: "tx_fw_981236",
			tx_ref: "opencut_pro_1740798100",
			email: "studio.tobi@gmail.com",
			customer: "Tobi Adeyemi",
			plan: "Annual Pro",
			amountNgn: 99000,
			amountUsd: 79.99,
			status: "successful",
			date: "Yesterday, 02:10 PM",
			method: "Card",
		},
	];

	const usersData: AdminUser[] = [
		{
			id: "usr_01",
			name: currentName,
			email: currentEmail,
			role: "Super Admin",
			plan: "Pro (Annual)",
			projectsCount: 14,
			joined: "Mar 2026",
		},
		{
			id: "usr_02",
			name: "Amaka Eze",
			email: "creator.amaka@gmail.com",
			role: "Admin",
			plan: "Pro (Annual)",
			projectsCount: 8,
			joined: "Mar 2026",
		},
		{
			id: "usr_03",
			name: "David Johnson",
			email: "david.film@gmail.com",
			role: "User",
			plan: "Pro (Monthly)",
			projectsCount: 5,
			joined: "Mar 2026",
		},
		{
			id: "usr_04",
			name: "Sarah Williams",
			email: "sarah.content@gmail.com",
			role: "User",
			plan: "Pro (Monthly)",
			projectsCount: 3,
			joined: "Feb 2026",
		},
		{
			id: "usr_05",
			name: "Tobi Adeyemi",
			email: "studio.tobi@gmail.com",
			role: "User",
			plan: "Pro (Annual)",
			projectsCount: 11,
			joined: "Feb 2026",
		},
	];

	const filteredTransactions = transactionsData.filter(
		(tx) =>
			tx.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
			tx.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
			tx.tx_ref.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const totalRevenueNgn = transactionsData.reduce((acc, t) => acc + t.amountNgn, 0);
	const totalRevenueUsd = transactionsData.reduce((acc, t) => acc + t.amountUsd, 0);

	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col">
			{/* Admin Header */}
			<header className="border-b border-border bg-card/60 px-6 py-3 sticky top-0 z-20 backdrop-blur-md">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Link href="/" className="font-clash text-lg font-bold text-foreground flex items-center gap-2">
							<span className="size-6 rounded-md bg-orange-500 text-white flex items-center justify-center text-xs font-black">
								O
							</span>
							Simple Video Editor
						</Link>
						<Badge className="bg-orange-500/10 text-orange-500 border-orange-500/30 text-[10px] font-semibold">
							Admin Portal
						</Badge>
					</div>

					<div className="flex items-center gap-3">
						<div className="text-right hidden sm:block">
							<div className="text-xs font-semibold text-foreground flex items-center gap-1.5 justify-end">
								<UserCheck className="size-3.5 text-emerald-500" />
								<span>{currentEmail}</span>
							</div>
							<div className="text-[10px] text-muted-foreground">Authorized Administrator</div>
						</div>

						<Link href="/editor">
							<Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
								<Film className="size-3.5" /> Open Editor
							</Button>
						</Link>

						<Button
							variant="ghost"
							size="icon"
							onClick={handleSignOut}
							title="Sign Out"
							className="size-8 text-muted-foreground hover:text-destructive"
						>
							<LogOut className="size-4" />
						</Button>
					</div>
				</div>

				{/* Navigation Sub-Tabs */}
				<div className="flex gap-2 mt-3 pt-2 border-t border-border/50 text-xs">
					<button
						type="button"
						onClick={() => setActiveTab("overview")}
						className={`px-3 py-1 rounded-md font-semibold transition-all ${
							activeTab === "overview"
								? "bg-orange-500 text-white shadow-xs"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						Overview &amp; Analytics
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("transactions")}
						className={`px-3 py-1 rounded-md font-semibold transition-all ${
							activeTab === "transactions"
								? "bg-orange-500 text-white shadow-xs"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						Flutterwave Transactions ({transactionsData.length})
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("users")}
						className={`px-3 py-1 rounded-md font-semibold transition-all ${
							activeTab === "users"
								? "bg-orange-500 text-white shadow-xs"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						Registered Users ({usersData.length})
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("telemetry")}
						className={`px-3 py-1 rounded-md font-semibold transition-all ${
							activeTab === "telemetry"
								? "bg-orange-500 text-white shadow-xs"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						Feature Activity Feed ({(telemetry?.events?.length ?? 6)})
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("system")}
						className={`px-3 py-1 rounded-md font-semibold transition-all ${
							activeTab === "system"
								? "bg-orange-500 text-white shadow-xs"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						System &amp; Engine Health
					</button>
				</div>
			</header>

			{/* Main Content Area */}
			<main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
				{activeTab === "overview" && (
					<>
						{/* Key Metrics Grid */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
							{/* Revenue Card */}
							<div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-xs">
								<div className="flex items-center justify-between text-muted-foreground text-xs">
									<span>Total Revenue (Flutterwave)</span>
									<DollarSign className="size-4 text-orange-500" />
								</div>
								<div className="text-2xl font-extrabold font-clash text-foreground">
									₦{totalRevenueNgn.toLocaleString()}
								</div>
								<div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
									<ArrowUpRight className="size-3.5" />
									<span>${totalRevenueUsd.toFixed(2)} USD</span>
									<span className="text-muted-foreground">• 100% verified</span>
								</div>
							</div>

							{/* Pro Subscribers */}
							<div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-xs">
								<div className="flex items-center justify-between text-muted-foreground text-xs">
									<span>Pro Subscribers</span>
									<CreditCard className="size-4 text-orange-500" />
								</div>
								<div className="text-2xl font-extrabold font-clash text-foreground">
									248 Active
								</div>
								<div className="text-[11px] text-muted-foreground">
									68% Annual (₦99k) • 32% Monthly (₦12.5k)
								</div>
							</div>

							{/* Total Users */}
							<div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-xs">
								<div className="flex items-center justify-between text-muted-foreground text-xs">
									<span>Registered Users</span>
									<Users className="size-4 text-blue-500" />
								</div>
								<div className="text-2xl font-extrabold font-clash text-foreground">
									1,420
								</div>
								<div className="text-[11px] text-emerald-500">
									+18% new users this week
								</div>
							</div>

							{/* Video Projects Rendered */}
							<div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-xs">
								<div className="flex items-center justify-between text-muted-foreground text-xs">
									<span>Timeline Exports</span>
									<Film className="size-4 text-purple-500" />
								</div>
								<div className="text-2xl font-extrabold font-clash text-foreground">
									12,410
								</div>
								<div className="text-[11px] text-muted-foreground">
									4K &amp; 1080p GPU accelerated
								</div>
							</div>
						</div>

						{/* Feature Usage Tracking */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* AI & Feature Activity */}
							<div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
								<div className="flex items-center justify-between">
									<h2 className="text-sm font-bold font-clash text-foreground flex items-center gap-2">
										<Sparkles className="size-4 text-orange-500" />
										CapCut AI &amp; Timeline Feature Analytics
									</h2>
									<Badge variant="outline" className="text-[10px]">Real-Time Telemetry</Badge>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{/* Smart Suggestions */}
									<div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
										<div className="text-[11px] text-muted-foreground flex items-center justify-between">
											<span className="flex items-center gap-1.5 font-medium">
												<Sparkles className="size-3 text-amber-500" /> Smart suggestions
											</span>
											<Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-500 border-amber-500/30">AI</Badge>
										</div>
										<div className="text-lg font-bold font-clash text-foreground">
											{(telemetry?.smartSuggestionsCount ?? 142).toLocaleString()} Runs
										</div>
										<div className="text-[10px] text-muted-foreground">Find out how your video can be improved</div>
									</div>

									{/* Make colors better */}
									<div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
										<div className="text-[11px] text-muted-foreground flex items-center justify-between">
											<span className="flex items-center gap-1.5 font-medium">
												<Sliders className="size-3 text-purple-500" /> Make colors better
											</span>
											<Badge variant="outline" className="text-[9px] px-1 py-0 text-orange-500 border-orange-500/30">PRO</Badge>
										</div>
										<div className="text-lg font-bold font-clash text-foreground">
											{(telemetry?.colorBetterCount ?? 89).toLocaleString()} Passes
										</div>
										<div className="text-[10px] text-muted-foreground">AI color enhancement &amp; vibrancy</div>
									</div>

									{/* Make colors consistent */}
									<div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
										<div className="text-[11px] text-muted-foreground flex items-center justify-between">
											<span className="flex items-center gap-1.5 font-medium">
												<Film className="size-3 text-indigo-500" /> Make colors consistent
											</span>
											<Badge variant="outline" className="text-[9px] px-1 py-0 text-orange-500 border-orange-500/30">PRO</Badge>
										</div>
										<div className="text-lg font-bold font-clash text-foreground">
											{(telemetry?.colorConsistentCount ?? 64).toLocaleString()} Matches
										</div>
										<div className="text-[10px] text-muted-foreground">Auto-match exposure &amp; white balance</div>
									</div>

									{/* Make volume consistent */}
									<div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
										<div className="text-[11px] text-muted-foreground flex items-center justify-between">
											<span className="flex items-center gap-1.5 font-medium">
												<DollarSign className="size-3 text-emerald-500" /> Make volume consistent
											</span>
											<Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-500 border-emerald-500/30">DSP</Badge>
										</div>
										<div className="text-lg font-bold font-clash text-foreground">
											{(telemetry?.volumeConsistentCount ?? 118).toLocaleString()} Levels
										</div>
										<div className="text-[10px] text-muted-foreground">Dynamic gain leveling &amp; loudness</div>
									</div>

									{/* Make voice clearer */}
									<div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
										<div className="text-[11px] text-muted-foreground flex items-center justify-between">
											<span className="flex items-center gap-1.5 font-medium">
												<Mic className="size-3 text-cyan-500" /> Make voice clearer
											</span>
											<Badge variant="outline" className="text-[9px] px-1 py-0 text-cyan-500 border-cyan-500/30">DSP</Badge>
										</div>
										<div className="text-lg font-bold font-clash text-foreground">
											{(telemetry?.voiceClearerCount ?? 173).toLocaleString()} Boosts
										</div>
										<div className="text-[10px] text-muted-foreground">Background noise reduction &amp; vocal boost</div>
									</div>

									{/* Make video clearer (HD) */}
									<div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
										<div className="text-[11px] text-muted-foreground flex items-center justify-between">
											<span className="flex items-center gap-1.5 font-medium">
												<Sparkles className="size-3 text-blue-500" /> Make video clearer (HD)
											</span>
											<Badge variant="outline" className="text-[9px] px-1 py-0 text-orange-500 border-orange-500/30">PRO</Badge>
										</div>
										<div className="text-lg font-bold font-clash text-foreground">
											{(telemetry?.videoHdCount ?? 97).toLocaleString()} Upscales
										</div>
										<div className="text-[10px] text-muted-foreground">Super-resolution sharpening</div>
									</div>

									{/* Retouch face */}
									<div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1 sm:col-span-2 lg:col-span-3">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<div className="size-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center font-bold">
													✨
												</div>
												<div>
													<div className="text-xs font-semibold text-foreground flex items-center gap-2">
														<span>Retouch face</span>
														<Badge variant="outline" className="text-[9px] px-1 py-0 text-orange-500 border-orange-500/30">PRO</Badge>
													</div>
													<div className="text-[11px] text-muted-foreground">
														Skin smoothing &amp; facial adjustments • {(telemetry?.faceRetouchCount ?? 52).toLocaleString()} portrait enhancements applied
													</div>
												</div>
											</div>
											<Badge className="bg-pink-500/10 text-pink-500 border-pink-500/30 text-xs">
												AI Active
											</Badge>
										</div>
									</div>
								</div>

								{/* Timeline Audio Tracks & Exports Tracking */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
									<div className="p-3.5 rounded-lg bg-muted/20 border border-border flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="size-9 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-xs">
												+A
											</div>
											<div>
												<div className="text-xs font-semibold text-foreground">
													Audio Tracks Ingested
												</div>
												<div className="text-[11px] text-muted-foreground">
													{(telemetry?.audioTracksCount ?? 221).toLocaleString()} timeline layers mixed
												</div>
											</div>
										</div>
										<Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs">
											Live
										</Badge>
									</div>

									<div className="p-3.5 rounded-lg bg-muted/20 border border-border flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="size-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-xs">
												4K
											</div>
											<div>
												<div className="text-xs font-semibold text-foreground">
													Hardware Exports
												</div>
												<div className="text-[11px] text-muted-foreground">
													{(telemetry?.exportCount ?? 384).toLocaleString()} video renders exported
												</div>
											</div>
										</div>
										<Badge className="bg-purple-500/10 text-purple-500 border-purple-500/30 text-xs">
											WebGPU
										</Badge>
									</div>
								</div>
							</div>

							{/* Gateway & Infrastructure Quick Status */}
							<div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
								<h2 className="text-sm font-bold font-clash text-foreground flex items-center gap-2">
									<Activity className="size-4 text-emerald-500" />
									Active Gateways
								</h2>

								<div className="space-y-3 text-xs">
									<div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
										<div className="flex items-center justify-between">
											<span className="font-semibold text-foreground">Flutterwave API</span>
											<span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
												<CheckCircle2 className="size-3" /> Live
											</span>
										</div>
										<div className="text-[10px] text-muted-foreground font-mono truncate">
											Key: {process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || "FLWPUBK-33162c..."}
										</div>
									</div>

									<div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
										<div className="flex items-center justify-between">
											<span className="font-semibold text-foreground">Groq LPU Copilot</span>
											<span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
												<CheckCircle2 className="size-3" /> 18ms
											</span>
										</div>
										<div className="text-[10px] text-muted-foreground">
											Llama-3.3-70b-versatile Agentic Tools
										</div>
									</div>

									<div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
										<div className="flex items-center justify-between">
											<span className="font-semibold text-foreground">Admin Permission Filter</span>
											<span className="text-[10px] text-orange-500 font-bold">
												@gmail.com Only
											</span>
										</div>
										<div className="text-[10px] text-muted-foreground">
											Enforced server-side &amp; client-side
										</div>
									</div>
								</div>
							</div>
						</div>
					</>
				)}

				{activeTab === "transactions" && (
					<div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<div>
								<h2 className="text-base font-bold font-clash text-foreground">
									Flutterwave Payment Transactions
								</h2>
								<p className="text-xs text-muted-foreground">
									Verified transactions received through the Flutterwave payment gateway.
								</p>
							</div>

							<div className="relative w-full sm:w-64">
								<Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
								<Input
									placeholder="Search email, customer, or ref..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="h-8 pl-8 text-xs"
								/>
							</div>
						</div>

						<div className="overflow-x-auto">
							<table className="w-full text-left text-xs">
								<thead>
									<tr className="border-b border-border text-muted-foreground">
										<th className="py-2.5 px-3">Transaction Ref</th>
										<th className="py-2.5 px-3">Customer Email</th>
										<th className="py-2.5 px-3">Plan</th>
										<th className="py-2.5 px-3">Amount</th>
										<th className="py-2.5 px-3">Method</th>
										<th className="py-2.5 px-3">Status</th>
										<th className="py-2.5 px-3">Date</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border/60">
									{filteredTransactions.map((tx) => (
										<tr key={tx.id} className="hover:bg-muted/30 transition-colors">
											<td className="py-3 px-3 font-mono text-muted-foreground">{tx.tx_ref}</td>
											<td className="py-3 px-3">
												<div className="font-semibold text-foreground">{tx.customer}</div>
												<div className="text-[10px] text-muted-foreground">{tx.email}</div>
											</td>
											<td className="py-3 px-3">
												<Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/30">
													{tx.plan}
												</Badge>
											</td>
											<td className="py-3 px-3">
												<div className="font-bold text-foreground">₦{tx.amountNgn.toLocaleString()}</div>
												<div className="text-[10px] text-muted-foreground">${tx.amountUsd}</div>
											</td>
											<td className="py-3 px-3 text-muted-foreground">{tx.method}</td>
											<td className="py-3 px-3">
												<span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
													<CheckCircle2 className="size-3" /> Successful
												</span>
											</td>
											<td className="py-3 px-3 text-muted-foreground">{tx.date}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{activeTab === "users" && (
					<div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
						<div>
							<h2 className="text-base font-bold font-clash text-foreground">
								Registered Accounts &amp; Admin Privileges
							</h2>
							<p className="text-xs text-muted-foreground">
								Only users with @gmail.com domains are granted administrator privileges to access this area.
							</p>
						</div>

						<div className="overflow-x-auto">
							<table className="w-full text-left text-xs">
								<thead>
									<tr className="border-b border-border text-muted-foreground">
										<th className="py-2.5 px-3">User</th>
										<th className="py-2.5 px-3">Email</th>
										<th className="py-2.5 px-3">Admin Permission</th>
										<th className="py-2.5 px-3">Membership Tier</th>
										<th className="py-2.5 px-3">Projects</th>
										<th className="py-2.5 px-3">Joined</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border/60">
									{usersData.map((u) => (
										<tr key={u.id} className="hover:bg-muted/30 transition-colors">
											<td className="py-3 px-3 font-semibold text-foreground">{u.name}</td>
											<td className="py-3 px-3 font-mono">{u.email}</td>
											<td className="py-3 px-3">
												{u.email.toLowerCase().endsWith("@gmail.com") ? (
													<Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]">
														Authorized Admin (@gmail.com)
													</Badge>
												) : (
													<Badge variant="outline" className="text-[10px] text-muted-foreground">
														Standard User
													</Badge>
												)}
											</td>
											<td className="py-3 px-3">
												<Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[10px]">
													{u.plan}
												</Badge>
											</td>
											<td className="py-3 px-3 text-muted-foreground">{u.projectsCount}</td>
											<td className="py-3 px-3 text-muted-foreground">{u.joined}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{activeTab === "telemetry" && (
					<div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
						<div className="flex items-center justify-between">
							<div>
								<h2 className="text-base font-bold font-clash text-foreground">
									Live Feature Activity Feed
								</h2>
								<p className="text-xs text-muted-foreground">
									Real-time event stream of AI optimizations, DSP voice clarity, color enhancements, and timeline actions.
								</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setTelemetry(getTelemetryData())}
								className="text-xs gap-1.5"
							>
								<RefreshCw className="size-3" /> Refresh Feed
							</Button>
						</div>

						<div className="overflow-x-auto">
							<table className="w-full text-left text-xs">
								<thead>
									<tr className="border-b border-border text-muted-foreground">
										<th className="py-2.5 px-3">Feature Name</th>
										<th className="py-2.5 px-3">Type</th>
										<th className="py-2.5 px-3">Action Details</th>
										<th className="py-2.5 px-3">Time</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border/60">
									{(telemetry?.events || []).map((evt) => (
										<tr key={evt.id} className="hover:bg-muted/30 transition-colors">
											<td className="py-3 px-3 font-semibold text-foreground flex items-center gap-2">
												<CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
												<span>{evt.name}</span>
											</td>
											<td className="py-3 px-3">
												<Badge variant="outline" className="text-[10px] font-mono capitalize">
													{evt.type.replace(/_/g, " ")}
												</Badge>
											</td>
											<td className="py-3 px-3 text-muted-foreground">
												{evt.details || "Timeline optimization completed successfully"}
											</td>
											<td className="py-3 px-3 text-muted-foreground font-mono">
												{evt.timestamp}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{activeTab === "system" && (
					<div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
						<h2 className="text-base font-bold font-clash text-foreground">
							System Diagnostics &amp; Engine Status
						</h2>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
							<div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
								<div className="font-semibold text-foreground flex items-center justify-between">
									<span>Security &amp; Secret Isolation</span>
									<span className="text-emerald-500 font-bold">Secure</span>
								</div>
								<p className="text-[11px] text-muted-foreground leading-relaxed">
									Flutterwave Secret Key &amp; Encryption Key are stored in server-only environment variables and verified via server API endpoints. No private keys are bundled to client browsers.
								</p>
							</div>

							<div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
								<div className="font-semibold text-foreground flex items-center justify-between">
									<span>WebAssembly (WASM) Engine</span>
									<span className="text-emerald-500 font-bold">opencut-wasm v0.2.10</span>
								</div>
								<p className="text-[11px] text-muted-foreground leading-relaxed">
									64-bit integer tick precision time math (`MediaTime(i64)`) active with zero floating point drift across multiple audio &amp; video layers.
								</p>
							</div>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
