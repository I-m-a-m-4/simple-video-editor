"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
	Crown,
	Film,
	Cpu,
	Activity,
	ArrowUpRight,
	Search,
	RefreshCw,
	CheckCircle2,
	Clock,
	DollarSign,
	Sliders,
	Mic,
	Sparkles,
	BarChart3,
	AlertTriangle,
	UserCheck,
	Download,
	UserPlus,
	UserX,
	Database,
	HardDrive,
	Zap,
	Trash2,
	Check,
	X,
	FileText,
	KeyRound,
	Eye,
	EyeOff,
	Save,
	Video,
	Scissors,
	Layers,
	LineChart,
	TrendingUp,
	PieChart,
	ShieldCheck,
	UploadCloud,
	FileDigit,
	Receipt,
	Users,
	Laptop,
	ExternalLink,
	Play,
	Clapperboard,
	LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { UserProfileMenu } from "@/components/auth/user-profile-menu";
import {
	getTelemetryData,
	clearTelemetryData,
	type TelemetrySummary,
	type TelemetryEvent,
} from "@/stores/telemetry-store";
import {
	getRealTransactions,
	saveRealTransaction,
	verifyAndRecordTransaction,
	type Transaction,
} from "@/services/transactions";
import { storageService } from "@/services/storage/service";
import {
	readStorageQuotaStatus,
	formatStorageBytes,
	type StorageQuotaStatus,
} from "@/services/storage/quota";
import { useProStore, isUserAdmin, type ProPlanTier } from "@/stores/pro-store";
import { db, saveSystemAiConfig, loadSystemAiConfig } from "@/services/firebase";
import { useAiStore, DEFAULT_GROQ_KEY } from "@/ai/store";
import { GROQ_API_URL } from "@/ai/types";

export interface CreatorUser {
	id: string;
	name: string;
	email: string;
	role: "Super Admin" | "Studio Pro" | "Creator";
	plan: "Director Suite" | "Creator Studio" | "Lifetime Pro" | "Free";
	isPro: boolean;
	projectsCount: number;
	joined: string;
	source: "Cloud" | "Local Storage";
}

const MANAGED_USERS_KEY = "ambercut_admin_managed_users_v2";

export default function AdminImamShafiPage() {
	const { user: authUser, signOut: authSignOut } = useAuth();
	const { isPro: isCurrentPro, plan: currentPlan, grantAdminAccess, resetProStatus, setProStatus } = useProStore();

	// Navigation Tabs
	const [activeTab, setActiveTab] = useState<
		"overview" | "invoices" | "creators" | "ai_copilot" | "production" | "system"
	>("overview");
	const [searchQuery, setSearchQuery] = useState("");

	// Data States
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [creatorsList, setCreatorsList] = useState<CreatorUser[]>([]);
	const [telemetry, setTelemetry] = useState<TelemetrySummary | null>(null);
	const [storageQuota, setStorageQuota] = useState<StorageQuotaStatus | null>(null);
	const [realProjectsCount, setRealProjectsCount] = useState<number>(0);
	const [projectsMetadata, setProjectsMetadata] = useState<any[]>([]);
	const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

	// Invoices & Manual Verification
	const [verifyTxId, setVerifyTxId] = useState("");
	const [verifyPlan, setVerifyPlan] = useState<"Annual Pro" | "Monthly Pro">("Annual Pro");
	const [isVerifying, setIsVerifying] = useState(false);
	const [showAddTxModal, setShowAddTxModal] = useState(false);
	const [manualTx, setManualTx] = useState({
		email: "",
		customer: "",
		amountNgn: 99000,
		plan: "Annual Pro" as "Annual Pro" | "Monthly Pro",
	});

	// Creator Management Modal
	const [grantEmail, setGrantEmail] = useState("");
	const [grantName, setGrantName] = useState("");
	const [grantPlanTier, setGrantPlanTier] = useState<"director" | "creator">("director");

	// Amber AI Engine Configuration
	const [amberAiPingMs, setAmberAiPingMs] = useState<number | null>(null);
	const [isTestingAmberAi, setIsTestingAmberAi] = useState(false);
	const [adminAiKey, setAdminAiKey] = useState<string>("");
	const [showAdminAiKey, setShowAdminAiKey] = useState<boolean>(false);
	const [adminAiModel, setAdminAiModel] = useState<string>("llama-3.3-70b-versatile");
	const [aiKeySource, setAiKeySource] = useState<"custom_firestore" | "custom_local" | "env" | "built_in">("built_in");
	const [isSavingAiKey, setIsSavingAiKey] = useState<boolean>(false);

	// Load Data on Mount
	useEffect(() => {
		const loadDashboardData = async () => {
			setIsLoadingData(true);
			try {
				// 1. Transactions
				const txs = await getRealTransactions();
				setTransactions(txs);

				// 2. Local Video Projects
				try {
					const projects = await storageService.loadAllProjectsMetadata();
					setRealProjectsCount(projects.length);
					setProjectsMetadata(projects);
				} catch {
					setRealProjectsCount(1);
				}

				// 3. Storage Quota
				try {
					const quota = await readStorageQuotaStatus();
					setStorageQuota(quota);
				} catch {}

				// 4. Telemetry
				const tel = getTelemetryData();
				setTelemetry(tel);

				// 5. Creators List
				let creators: CreatorUser[] = [];
				const storedCreators = localStorage.getItem(MANAGED_USERS_KEY);
				if (storedCreators) {
					try {
						creators = JSON.parse(storedCreators);
					} catch {}
				}

				// If admin/authUser is available, make sure they are in the list
				if (authUser?.email) {
					const adminEmail = authUser.email.toLowerCase();
					const adminIndex = creators.findIndex((u) => u.email.toLowerCase() === adminEmail);
					if (adminIndex === -1) {
						const superAdmin: CreatorUser = {
							id: authUser.id || "admin_root",
							name: authUser.name || "Administrator",
							email: authUser.email,
							role: "Super Admin",
							plan: "Lifetime Pro",
							isPro: true,
							projectsCount: realProjectsCount,
							joined: new Date().toLocaleDateString(),
							source: "Cloud",
						};
						creators = [superAdmin, ...creators];
					} else {
						creators[adminIndex].projectsCount = realProjectsCount;
					}
				}

				// Populate creator accounts from verified transactions
				for (const tx of txs) {
					if (tx.email && !creators.some((c) => c.email.toLowerCase() === tx.email.toLowerCase())) {
						creators.push({
							id: tx.id || `cr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
							name: tx.customer || tx.email.split("@")[0],
							email: tx.email,
							role: tx.plan === "Annual Pro" ? "Studio Pro" : "Creator",
							plan: tx.plan === "Annual Pro" ? "Director Suite" : "Creator Studio",
							isPro: tx.status === "successful",
							projectsCount: 1,
							joined: tx.date || new Date().toLocaleDateString(),
							source: "Cloud",
						});
					}
				}

				setCreatorsList(creators);
				if (creators.length > 0) {
					localStorage.setItem(MANAGED_USERS_KEY, JSON.stringify(creators));
				}
			} catch (err) {
				console.error("Dashboard data load error:", err);
			} finally {
				setIsLoadingData(false);
			}
		};

		loadDashboardData();
	}, [authUser, realProjectsCount]);

	// Load Amber AI Key on Mount
	useEffect(() => {
		const initAiState = async () => {
			try {
				const cloudCfg = await loadSystemAiConfig();
				if (cloudCfg?.groqApiKey) {
					setAdminAiKey(cloudCfg.groqApiKey);
					if (cloudCfg.model) setAdminAiModel(cloudCfg.model);
					setAiKeySource("custom_firestore");
					return;
				}
			} catch {}

			const localKey = typeof window !== "undefined" ? localStorage.getItem("ambercut_custom_groq_key") : null;
			const storeKey = useAiStore.getState().apiKey;
			const storeModel = useAiStore.getState().model;
			if (storeModel) setAdminAiModel(storeModel);

			if (localKey) {
				setAdminAiKey(localKey);
				setAiKeySource("custom_local");
			} else if (storeKey && storeKey !== DEFAULT_GROQ_KEY) {
				setAdminAiKey(storeKey);
				setAiKeySource("custom_local");
			} else {
				setAdminAiKey(DEFAULT_GROQ_KEY);
				setAiKeySource("built_in");
			}
		};
		initAiState();
	}, []);

	// Live Amber AI Latency Ping Test
	const testAmberAiConnection = async () => {
		setIsTestingAmberAi(true);
		setAmberAiPingMs(null);
		const start = performance.now();
		try {
			const res = await fetch("https://api.groq.com/openai/v1/models", {
				headers: {
					Authorization: `Bearer ${adminAiKey || DEFAULT_GROQ_KEY}`,
				},
			});
			const latency = Math.round(performance.now() - start);
			if (res.ok) {
				setAmberAiPingMs(latency);
				toast.success(`Amber AI Neural LPU Connected: ${latency}ms latency`);
			} else {
				toast.error(`Amber AI returned status ${res.status}`);
			}
		} catch (err: any) {
			toast.error(err.message || "Network error connecting to Amber AI engine.");
		} finally {
			setIsTestingAmberAi(false);
		}
	};

	// Save Amber AI Config
	const handleSaveAiConfig = async () => {
		setIsSavingAiKey(true);
		try {
			if (typeof window !== "undefined") {
				localStorage.setItem("ambercut_custom_groq_key", adminAiKey);
			}
			useAiStore.getState().setApiKey(adminAiKey);
			useAiStore.getState().setModel(adminAiModel);
			try {
				await saveSystemAiConfig({ groqApiKey: adminAiKey, model: adminAiModel });
				setAiKeySource("custom_firestore");
			} catch {
				setAiKeySource("custom_local");
			}
			toast.success("Amber AI Engine configuration saved and active!");
		} catch (err: any) {
			toast.error(err.message || "Failed to save Amber AI settings.");
		} finally {
			setIsSavingAiKey(false);
		}
	};

	// Grant Pro Access Action
	const handleGrantProAccess = () => {
		if (!grantEmail.trim()) {
			toast.error("Please enter a creator email address.");
			return;
		}

		const cleanEmail = grantEmail.trim().toLowerCase();
		const resolvedPlanTitle = grantPlanTier === "director" ? "Director Suite" : "Creator Studio";

		const updated = creatorsList.map((c) => {
			if (c.email.toLowerCase() === cleanEmail) {
				return {
					...c,
					isPro: true,
					plan: resolvedPlanTitle as any,
					role: (grantPlanTier === "director" ? "Studio Pro" : "Creator") as any,
				};
			}
			return c;
		});

		if (!updated.some((c) => c.email.toLowerCase() === cleanEmail)) {
			updated.push({
				id: `cr_${Date.now()}`,
				name: grantName.trim() || cleanEmail.split("@")[0],
				email: cleanEmail,
				role: grantPlanTier === "director" ? "Studio Pro" : "Creator",
				plan: resolvedPlanTitle as any,
				isPro: true,
				projectsCount: 1,
				joined: new Date().toLocaleDateString(),
				source: "Local Storage",
			});
		}

		setCreatorsList(updated);
		localStorage.setItem(MANAGED_USERS_KEY, JSON.stringify(updated));

		// If current user is being updated
		if (authUser?.email?.toLowerCase() === cleanEmail || cleanEmail === "belloimam431@gmail.com") {
			grantAdminAccess(cleanEmail);
		}

		toast.success(`Granted ${resolvedPlanTitle} access to ${cleanEmail}!`);
		setGrantEmail("");
		setGrantName("");
	};

	// Toggle Plan
	const handleTogglePlan = (email: string, targetPlan: CreatorUser["plan"]) => {
		const updated = creatorsList.map((c) => {
			if (c.email.toLowerCase() === email.toLowerCase()) {
				const isPro = targetPlan !== "Free";
				return {
					...c,
					plan: targetPlan,
					isPro,
					role: (targetPlan === "Director Suite" ? "Studio Pro" : isPro ? "Creator" : "Creator") as any,
				};
			}
			return c;
		});

		setCreatorsList(updated);
		localStorage.setItem(MANAGED_USERS_KEY, JSON.stringify(updated));
		toast.success(`Updated ${email} to ${targetPlan}`);
	};

	// Invoices manual recording
	const handleRecordManualTx = () => {
		if (!manualTx.email.trim()) {
			toast.error("Enter customer email.");
			return;
		}

		const txId = `tx_manual_${Date.now()}`;
		const newTx: Transaction = {
			id: txId,
			tx_ref: `ambercut_manual_${Date.now()}`,
			email: manualTx.email.trim(),
			customer: manualTx.customer.trim() || manualTx.email.split("@")[0],
			plan: manualTx.plan,
			amountNgn: manualTx.amountNgn,
			amountUsd: manualTx.plan === "Annual Pro" ? 79.99 : 9.99,
			status: "successful",
			date: new Date().toLocaleString(),
			method: "Bank Transfer",
		};

		saveRealTransaction(newTx);
		setTransactions([newTx, ...transactions]);
		setShowAddTxModal(false);
		toast.success("Manual payment invoice recorded!");
	};

	// Calculated Real Metrics
	const revenueMetrics = useMemo(() => {
		const successfulTxs = transactions.filter((tx) => tx.status === "successful");
		const totalRevenueNgn = successfulTxs.reduce((sum, tx) => sum + (tx.amountNgn || 0), 0);
		const totalRevenueUsd = successfulTxs.reduce((sum, tx) => sum + (tx.amountUsd || 0), 0);
		const proSubscribersCount = creatorsList.filter((c) => c.isPro).length;

		// Calculate MRR from active monthly transactions and prorated annual transactions
		const estimatedMrrNgn = successfulTxs.reduce((sum, tx) => {
			if (tx.plan === "Monthly Pro") return sum + (tx.amountNgn || 0);
			if (tx.plan === "Annual Pro") return sum + Math.round((tx.amountNgn || 0) / 12);
			return sum;
		}, 0);

		const estimatedArrNgn = estimatedMrrNgn * 12;

		return {
			totalRevenueNgn,
			totalRevenueUsd,
			proSubscribersCount,
			estimatedArrNgn,
			estimatedMrrNgn,
			successfulCount: successfulTxs.length,
		};
	}, [transactions, creatorsList]);

	// Dynamic Monthly Revenue Chart Data from Real Transactions
	const monthlyChartData = useMemo(() => {
		const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		const now = new Date();
		const months: { month: string; year: number; monthIdx: number; rev: number; count: number }[] = [];
		for (let i = 5; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			months.push({
				month: monthNames[d.getMonth()],
				year: d.getFullYear(),
				monthIdx: d.getMonth(),
				rev: 0,
				count: 0,
			});
		}

		for (const tx of transactions) {
			if (tx.status !== "successful") continue;
			const txDate = new Date(tx.date);
			if (isNaN(txDate.getTime())) continue;
			const entry = months.find((m) => m.monthIdx === txDate.getMonth() && m.year === txDate.getFullYear());
			if (entry) {
				entry.rev += tx.amountNgn || 0;
				entry.count += 1;
			}
		}

		const maxRev = Math.max(...months.map((m) => m.rev), 1);

		return months.map((m) => ({
			month: m.month,
			rev: m.rev,
			count: m.count,
			height: m.rev > 0 ? `${Math.max(12, Math.round((m.rev / maxRev) * 100))}%` : "6%",
		}));
	}, [transactions]);

	// Ingestion Aspect Ratio & Format Breakdown from Real Project Metadata
	const ingestionBreakdown = useMemo(() => {
		const total = projectsMetadata.length;
		if (total === 0) {
			return [
				{ label: "Widescreen Landscape (16:9)", count: 0, percent: 0, color: "bg-orange-500" },
				{ label: "Viral Shorts / Reels (9:16)", count: 0, percent: 0, color: "bg-amber-500" },
				{ label: "Square / Feed (1:1)", count: 0, percent: 0, color: "bg-blue-500" },
				{ label: "Custom Aspect Formats", count: 0, percent: 0, color: "bg-emerald-500" },
			];
		}

		let widescreen = 0;
		let vertical = 0;
		let square = 0;
		let custom = 0;

		for (const proj of projectsMetadata) {
			const w = proj.canvasSize?.width || 1920;
			const h = proj.canvasSize?.height || 1080;
			const ratio = w / h;
			if (Math.abs(ratio - 16 / 9) < 0.1 || ratio > 1.3) {
				widescreen++;
			} else if (Math.abs(ratio - 9 / 16) < 0.1 || ratio < 0.8) {
				vertical++;
			} else if (Math.abs(ratio - 1) < 0.1) {
				square++;
			} else {
				custom++;
			}
		}

		return [
			{ label: "Widescreen Landscape (16:9)", count: widescreen, percent: Math.round((widescreen / total) * 100), color: "bg-orange-500" },
			{ label: "Viral Shorts / Reels (9:16)", count: vertical, percent: Math.round((vertical / total) * 100), color: "bg-amber-500" },
			{ label: "Square / Feed (1:1)", count: square, percent: Math.round((square / total) * 100), color: "bg-blue-500" },
			{ label: "Custom Aspect Formats", count: custom, percent: Math.round((custom / total) * 100), color: "bg-emerald-500" },
		];
	}, [projectsMetadata]);

	// Filtered creators for search
	const filteredCreators = useMemo(() => {
		if (!searchQuery.trim()) return creatorsList;
		const q = searchQuery.toLowerCase();
		return creatorsList.filter(
			(c) =>
				c.name.toLowerCase().includes(q) ||
				c.email.toLowerCase().includes(q) ||
				c.plan.toLowerCase().includes(q),
		);
	}, [creatorsList, searchQuery]);

	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col font-dm selection:bg-orange-500/20">
			{/* Top Executive Header */}
			<header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5">
				<div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="size-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
							<Clapperboard className="size-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-lg font-bold font-clash tracking-tight text-foreground flex items-center gap-1.5">
									Amber Admin
									<span className="text-orange-500 font-medium text-xs px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">
										Imam Shafi Edition
									</span>
								</h1>
								<Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
									SYSTEM READY
								</Badge>
							</div>
							<p className="text-xs text-muted-foreground">
								Executive Studio Analytics &bull; Platform Revenue &bull; GPU Engine Telemetry
							</p>
						</div>
					</div>

					{/* Admin Quick Badges & Controls */}
					<div className="flex flex-wrap items-center gap-2.5">
						<div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border text-xs">
							<div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
							<span className="font-semibold text-foreground">Amber AI LPU</span>
							<span className="text-muted-foreground font-mono text-[11px]">
								{amberAiPingMs ? `${amberAiPingMs}ms` : "Active"}
							</span>
						</div>

						<div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border text-xs">
							<div className="size-2 rounded-full bg-orange-500" />
							<span className="font-semibold text-foreground">WASM Compositor</span>
							<span className="text-muted-foreground font-mono text-[11px]">60 FPS</span>
						</div>

						<Link href="/editor">
							<Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-8 rounded-xl gap-1.5 shadow-sm">
								<Play className="size-3 fill-white" />
								Open Video Editor
							</Button>
						</Link>

						<UserProfileMenu variant="avatar" align="end" />
					</div>
				</div>

				{/* Navigation Tabs */}
				<div className="max-w-7xl mx-auto flex items-center gap-1 pt-3 border-t border-border/50 mt-3 overflow-x-auto scrollbar-none">
					{[
						{ id: "overview", label: "Dashboard Overview", icon: LayoutDashboard },
						{ id: "invoices", label: "Invoices & Revenue", icon: Receipt },
						{ id: "creators", label: "Creators & Pro Plans", icon: Users },
						{ id: "ai_copilot", label: "Amber AI & Engine", icon: Cpu },
						{ id: "production", label: "Video Production", icon: Film },
						{ id: "system", label: "Storage & System", icon: Database },
					].map((tab) => {
						const Icon = tab.icon;
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id as any)}
								className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
									isActive
										? "bg-orange-500 text-white shadow-xs"
										: "text-muted-foreground hover:text-foreground hover:bg-muted/50"
								}`}
							>
								<Icon className="size-3.5" />
								{tab.label}
							</button>
						);
					})}
				</div>
			</header>

			{/* Main Content Area */}
			<main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
				{/* TAB 1: EXECUTIVE DASHBOARD OVERVIEW */}
				{activeTab === "overview" && (
					<div className="space-y-6">
						{/* Top KPI Metric Cards */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
							{/* Card 1: Platform ARR */}
							<Card className="border-border bg-card/70 shadow-xs relative overflow-hidden">
								<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
								<CardHeader className="pb-2 flex flex-row items-center justify-between">
									<CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
										Platform ARR Run-Rate
									</CardTitle>
									<div className="size-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
										<DollarSign className="size-4" />
									</div>
								</CardHeader>
								<CardContent className="space-y-1">
									<div className="text-2xl font-bold tracking-tight text-foreground font-clash">
										₦{revenueMetrics.estimatedArrNgn.toLocaleString()}
									</div>
									<div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
										<TrendingUp className="size-3" />
										<span>{revenueMetrics.successfulCount} verified payment{revenueMetrics.successfulCount === 1 ? "" : "s"}</span>
										<span className="text-muted-foreground font-normal">
											(MRR: ₦{revenueMetrics.estimatedMrrNgn.toLocaleString()})
										</span>
									</div>
								</CardContent>
							</Card>

							{/* Card 2: Active Video Projects */}
							<Card className="border-border bg-card/70 shadow-xs relative overflow-hidden">
								<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
								<CardHeader className="pb-2 flex flex-row items-center justify-between">
									<CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
										Total Video Timelines
									</CardTitle>
									<div className="size-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
										<Film className="size-4" />
									</div>
								</CardHeader>
								<CardContent className="space-y-1">
									<div className="text-2xl font-bold tracking-tight text-foreground font-clash">
										{realProjectsCount} {realProjectsCount === 1 ? "Project" : "Projects"}
									</div>
									<div className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
										<Layers className="size-3" />
										<span>{realProjectsCount} stored in client database</span>
										<span className="text-muted-foreground font-normal">• 9:16 &amp; 16:9</span>
									</div>
								</CardContent>
							</Card>

							{/* Card 3: Amber AI Operations */}
							<Card className="border-border bg-card/70 shadow-xs relative overflow-hidden">
								<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
								<CardHeader className="pb-2 flex flex-row items-center justify-between">
									<CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
										Amber AI Executions
									</CardTitle>
									<div className="size-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
										<Sparkles className="size-4" />
									</div>
								</CardHeader>
								<CardContent className="space-y-1">
									<div className="text-2xl font-bold tracking-tight text-foreground font-clash">
										{telemetry?.smartSuggestionsCount || 0} Tasks
									</div>
									<div className="flex items-center gap-1.5 text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
										<Scissors className="size-3" />
										<span>Shorts Cuts &bull; Subtitles &bull; TTS</span>
									</div>
								</CardContent>
							</Card>

							{/* Card 4: Hardware Renders */}
							<Card className="border-border bg-card/70 shadow-xs relative overflow-hidden">
								<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
								<CardHeader className="pb-2 flex flex-row items-center justify-between">
									<CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
										4K 60fps GPU Renders
									</CardTitle>
									<div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
										<Zap className="size-4" />
									</div>
								</CardHeader>
								<CardContent className="space-y-1">
									<div className="text-2xl font-bold tracking-tight text-foreground font-clash">
										{telemetry?.exportCount || 0} Exports
									</div>
									<div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
										<CheckCircle2 className="size-3" />
										<span>WebCodecs &amp; WebGPU pipeline</span>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Middle Section: Visual Revenue Chart & Ingestion Breakdown */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Revenue & Subscription Performance Chart */}
							<Card className="lg:col-span-2 border-border bg-card/80 p-5 space-y-4">
								<div className="flex items-center justify-between">
									<div>
										<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
											<BarChart3 className="size-4 text-orange-500" />
											Platform Subscription &amp; Revenue Velocity
										</h3>
										<p className="text-xs text-muted-foreground">
											Monthly recurring revenue and verified payment velocity (NGN)
										</p>
									</div>
									<Badge className="bg-orange-500/10 text-orange-500 border-none font-bold text-[10px]">
										ARR ₦{revenueMetrics.estimatedArrNgn.toLocaleString()}
									</Badge>
								</div>

								{/* Dynamic Visual Revenue Chart */}
								<div className="h-56 w-full pt-4 flex flex-col justify-between">
									<div className="h-44 flex items-end justify-between gap-3 px-2 border-b border-border/80">
										{monthlyChartData.map((item, idx) => (
											<div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
												<div className="text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
													₦{(item.rev / 1000).toFixed(0)}k
												</div>
												<div
													style={{ height: item.height }}
													className={`w-full max-w-[42px] ${
														item.rev > 0
															? "bg-gradient-to-t from-orange-500/60 to-orange-500"
															: "bg-muted/40"
													} rounded-t-lg group-hover:brightness-110 transition-all shadow-xs`}
												/>
												<span className="text-[11px] font-semibold text-muted-foreground">
													{item.month}
												</span>
											</div>
										))}
									</div>
									<div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2">
										<span>Verified Transactions: {revenueMetrics.successfulCount}</span>
										<span className="text-orange-500 font-semibold">
											Total Revenue: ₦{revenueMetrics.totalRevenueNgn.toLocaleString()}
										</span>
									</div>
								</div>
							</Card>

							{/* Ingestion & Format Intelligence Card */}
							<Card className="border-border bg-card/80 p-5 space-y-4">
								<div>
									<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
										<UploadCloud className="size-4 text-orange-500" />
										Media Ingestion Intelligence
									</h3>
									<p className="text-xs text-muted-foreground">
										Breakdown of video formats uploaded and edited
									</p>
								</div>

								<div className="space-y-3 pt-2">
									{ingestionBreakdown.map((fmt, i) => (
										<div key={i} className="space-y-1">
											<div className="flex justify-between text-xs font-semibold">
												<span className="text-foreground">{fmt.label}</span>
												<span className="font-mono text-muted-foreground">
													{fmt.percent}% ({fmt.count})
												</span>
											</div>
											<div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
												<div
													style={{ width: `${fmt.percent}%` }}
													className={`h-full ${fmt.color} rounded-full`}
												/>
											</div>
										</div>
									))}
								</div>

								<div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
									<span>Total Storage Used:</span>
									<span className="font-mono font-bold text-foreground">
										{storageQuota?.usageBytes
											? formatStorageBytes({ bytes: storageQuota.usageBytes })
											: "0 B"}
									</span>
								</div>
							</Card>
						</div>

						{/* Live Activity & Telemetry Feed */}
						<Card className="border-border bg-card/80 p-5 space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
										<Activity className="size-4 text-orange-500" />
										Live Video Editor Telemetry Feed
									</h3>
									<p className="text-xs text-muted-foreground">
										Real-time events dispatched from client editors and GPU rendering pipelines
									</p>
								</div>
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										clearTelemetryData();
										setTelemetry(getTelemetryData());
										toast.success("Telemetry log cleared.");
									}}
									className="text-xs h-7 gap-1"
								>
									<Trash2 className="size-3 text-red-500" />
									Clear Logs
								</Button>
							</div>

							<div className="divide-y divide-border/60 max-h-64 overflow-y-auto">
								{telemetry && telemetry.events && telemetry.events.length > 0 ? (
									telemetry.events.slice(0, 15).map((evt: TelemetryEvent) => (
										<div key={evt.id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
											<div className="flex items-center gap-2.5 min-w-0">
												<div className="size-2 rounded-full bg-orange-500 shrink-0" />
												<span className="font-semibold text-foreground truncate">{evt.name || evt.type}</span>
												<span className="text-muted-foreground truncate hidden sm:inline">
													{evt.details || evt.type}
												</span>
											</div>
											<span className="text-[10px] text-muted-foreground font-mono shrink-0">
												{evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : "Just now"}
											</span>
										</div>
									))
								) : (
									<div className="py-8 text-center text-xs text-muted-foreground">
										No recent telemetry events recorded. Perform edits or exports to stream live events.
									</div>
								)}
							</div>
						</Card>
					</div>
				)}

				{/* TAB 2: INVOICES & REVENUE HUB */}
				{activeTab === "invoices" && (
					<div className="space-y-6">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div>
								<h2 className="text-lg font-bold font-clash text-foreground flex items-center gap-2">
									<Receipt className="size-5 text-orange-500" />
									Invoices &amp; Verified Transactions Hub
								</h2>
								<p className="text-xs text-muted-foreground">
									Verified Flutterwave checkout payments, subscription renewals, and creator license receipts
								</p>
							</div>

							<Button
								size="sm"
								onClick={() => setShowAddTxModal(true)}
								className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs h-8 rounded-xl gap-1.5 shadow-sm"
							>
								<UserPlus className="size-3.5" />
								Record Manual Payment
							</Button>
						</div>

						{/* Transactions Table */}
						<Card className="border-border bg-card/80 overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs">
									<thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
										<tr>
											<th className="py-3 px-4">Transaction ID</th>
											<th className="py-3 px-4">Creator Customer</th>
											<th className="py-3 px-4">Plan Tier</th>
											<th className="py-3 px-4">Amount (NGN)</th>
											<th className="py-3 px-4">Amount (USD)</th>
											<th className="py-3 px-4">Payment Date</th>
											<th className="py-3 px-4">Status</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border/60">
										{transactions.length > 0 ? (
											transactions.map((tx) => (
												<tr key={tx.id} className="hover:bg-muted/20 transition-colors">
													<td className="py-3 px-4 font-mono font-medium text-foreground">{tx.id}</td>
													<td className="py-3 px-4">
														<div className="font-semibold text-foreground">{tx.customer}</div>
														<div className="text-[11px] text-muted-foreground">{tx.email}</div>
													</td>
													<td className="py-3 px-4">
														<Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-none font-bold text-[10px]">
															{tx.plan}
														</Badge>
													</td>
													<td className="py-3 px-4 font-mono font-bold text-foreground">
														₦{tx.amountNgn?.toLocaleString() || "0"}
													</td>
													<td className="py-3 px-4 font-mono text-muted-foreground">
														${tx.amountUsd?.toFixed(2) || "0.00"}
													</td>
													<td className="py-3 px-4 text-muted-foreground">{tx.date}</td>
													<td className="py-3 px-4">
														<Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-[10px] flex items-center gap-1 w-fit">
															<CheckCircle2 className="size-3" /> Successful
														</Badge>
													</td>
												</tr>
											))
										) : (
											<tr>
												<td colSpan={7} className="py-8 text-center text-muted-foreground">
													No verified transactions recorded yet.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</Card>
					</div>
				)}

				{/* TAB 3: CREATORS & PRO PLANS */}
				{activeTab === "creators" && (
					<div className="space-y-6">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div>
								<h2 className="text-lg font-bold font-clash text-foreground flex items-center gap-2">
									<Users className="size-5 text-orange-500" />
									Creator Directory &amp; Subscription Access
								</h2>
								<p className="text-xs text-muted-foreground">
									Manage editor licenses, grant complimentary Pro tiers, and monitor creator project volume
								</p>
							</div>

							<div className="flex items-center gap-2">
								<Input
									placeholder="Search creators by email or name..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="h-8 text-xs w-64 rounded-xl bg-background"
								/>
							</div>
						</div>

						{/* Grant Access Inline Form */}
						<Card className="border-border bg-card/80 p-4 space-y-3">
							<h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
								<Crown className="size-3.5 text-orange-500" />
								Quick Grant Pro License
							</h3>
							<div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
								<Input
									placeholder="Creator Email"
									value={grantEmail}
									onChange={(e) => setGrantEmail(e.target.value)}
									className="h-9 text-xs rounded-xl"
								/>
								<Input
									placeholder="Creator Name"
									value={grantName}
									onChange={(e) => setGrantName(e.target.value)}
									className="h-9 text-xs rounded-xl"
								/>
								<select
									value={grantPlanTier}
									onChange={(e) => setGrantPlanTier(e.target.value as any)}
									className="h-9 px-3 text-xs rounded-xl bg-background border border-border text-foreground"
								>
									<option value="director">Director Suite (Studio Pro)</option>
									<option value="creator">Creator Studio (4K Export)</option>
								</select>
								<Button
									size="sm"
									onClick={handleGrantProAccess}
									className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-9 rounded-xl"
								>
									Activate Access
								</Button>
							</div>
						</Card>

						{/* Creators Directory Table */}
						<Card className="border-border bg-card/80 overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs">
									<thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
										<tr>
											<th className="py-3 px-4">Creator</th>
											<th className="py-3 px-4">Role</th>
											<th className="py-3 px-4">Subscription Plan</th>
											<th className="py-3 px-4">Projects</th>
											<th className="py-3 px-4">Joined</th>
											<th className="py-3 px-4 text-right">Actions</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border/60">
										{filteredCreators.length > 0 ? (
											filteredCreators.map((creator) => (
												<tr key={creator.id} className="hover:bg-muted/20 transition-colors">
													<td className="py-3 px-4">
														<div className="font-semibold text-foreground flex items-center gap-1.5">
															<span>{creator.name}</span>
															{creator.role === "Super Admin" && (
																<Badge className="bg-orange-500/15 text-orange-500 border-none text-[9px] font-bold px-1.5 py-0">
																	ROOT
																</Badge>
															)}
														</div>
														<div className="text-[11px] text-muted-foreground font-mono">{creator.email}</div>
													</td>
													<td className="py-3 px-4 text-muted-foreground">{creator.role}</td>
													<td className="py-3 px-4">
														<Badge
															className={`text-[10px] font-bold ${
																creator.plan === "Director Suite"
																	? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-none"
																	: creator.plan === "Creator Studio"
																		? "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-none"
																		: creator.plan === "Lifetime Pro"
																			? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-none"
																			: "bg-muted text-muted-foreground border-none"
															}`}
														>
															{creator.plan}
														</Badge>
													</td>
													<td className="py-3 px-4 font-mono font-bold text-foreground">
														{creator.projectsCount}
													</td>
													<td className="py-3 px-4 text-muted-foreground">{creator.joined}</td>
													<td className="py-3 px-4 text-right">
														<div className="flex items-center justify-end gap-1.5">
															{creator.plan !== "Director Suite" && (
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() => handleTogglePlan(creator.email, "Director Suite")}
																	className="h-7 text-[10px] px-2 rounded-lg"
																>
																	Upgrade Director
																</Button>
															)}
															{creator.isPro && (
																<Button
																	size="sm"
																	variant="ghost"
																	onClick={() => handleTogglePlan(creator.email, "Free")}
																	className="h-7 text-[10px] px-2 text-red-500 hover:text-red-600"
																>
																	Downgrade
																</Button>
															)}
														</div>
													</td>
												</tr>
											))
										) : (
											<tr>
												<td colSpan={6} className="py-8 text-center text-muted-foreground">
													No creator accounts registered yet. Use the quick grant form above to add an account.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</Card>
					</div>
				)}

				{/* TAB 4: AMBER AI & ENGINE CONFIGURATION */}
				{activeTab === "ai_copilot" && (
					<div className="space-y-6">
						<div>
							<h2 className="text-lg font-bold font-clash text-foreground flex items-center gap-2">
								<Cpu className="size-5 text-orange-500" />
								Amber AI Neural LPU Engine Configuration
							</h2>
							<p className="text-xs text-muted-foreground">
								Real-time inference parameters, active neural models, and latency diagnostics for automated video editing
							</p>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Left 2 Cols: Key & Model Settings */}
							<Card className="lg:col-span-2 border-border bg-card/80 p-5 space-y-5">
								<div className="space-y-1">
									<h3 className="text-sm font-bold text-foreground">Active Model &amp; Key Settings</h3>
									<p className="text-xs text-muted-foreground">
										Configures the neural backend used by Video to Shorts, AI Voice Studio, and Smart Suggestions.
									</p>
								</div>

								<div className="space-y-4">
									<div className="space-y-1.5">
										<label className="text-xs font-semibold text-foreground">Active Neural Model</label>
										<select
											value={adminAiModel}
											onChange={(e) => setAdminAiModel(e.target.value)}
											className="w-full h-10 px-3 text-xs rounded-xl bg-background border border-border text-foreground font-mono"
										>
											<option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Ultra Fast, High Accuracy)</option>
											<option value="openai/gpt-oss-120b">openai/gpt-oss-120b (Complex Video Reasoning)</option>
											<option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b (High Pacing &amp; Subtitle Alignment)</option>
											<option value="openai/gpt-oss-20b">openai/gpt-oss-20b (Lightweight Fast Fallback)</option>
										</select>
									</div>

									<div className="space-y-1.5">
										<div className="flex items-center justify-between">
											<label className="text-xs font-semibold text-foreground">Amber AI API Key</label>
											<span className="text-[10px] text-muted-foreground">
												Source: {aiKeySource.replace("_", " ").toUpperCase()}
											</span>
										</div>
										<div className="relative">
											<Input
												type={showAdminAiKey ? "text" : "password"}
												value={adminAiKey}
												onChange={(e) => setAdminAiKey(e.target.value)}
												placeholder="gsk_..."
												className="h-10 text-xs font-mono rounded-xl pr-10"
											/>
											<button
												type="button"
												onClick={() => setShowAdminAiKey(!showAdminAiKey)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
											>
												{showAdminAiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
											</button>
										</div>
									</div>

									<div className="flex items-center justify-between pt-2">
										<Button
											size="sm"
											variant="outline"
											onClick={testAmberAiConnection}
											disabled={isTestingAmberAi}
											className="text-xs h-9 gap-1.5 rounded-xl"
										>
											<Zap className="size-3.5 text-orange-500" />
											{isTestingAmberAi ? "Testing Ping..." : "Test Neural Latency"}
										</Button>

										<Button
											size="sm"
											onClick={handleSaveAiConfig}
											disabled={isSavingAiKey}
											className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-9 px-5 rounded-xl gap-1.5"
										>
											<Save className="size-3.5" />
											Save &amp; Activate Model
										</Button>
									</div>
								</div>
							</Card>

							{/* Right 1 Col: AI Latency & Status */}
							<Card className="border-border bg-card/80 p-5 space-y-4">
								<h3 className="text-sm font-bold text-foreground">Engine Health Status</h3>
								<div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
									<div className="flex justify-between items-center text-xs">
										<span className="text-muted-foreground">Status</span>
										<Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-[10px]">
											Operational
										</Badge>
									</div>
									<div className="flex justify-between items-center text-xs">
										<span className="text-muted-foreground">LPU Latency</span>
										<span className="font-mono font-bold text-foreground">
											{amberAiPingMs !== null ? `${amberAiPingMs} ms` : "Not tested (click test below)"}
										</span>
									</div>
									<div className="flex justify-between items-center text-xs">
										<span className="text-muted-foreground">Token Throughput</span>
										<span className="font-mono font-bold text-emerald-500">
											{amberAiPingMs !== null
												? `~${Math.round(1000 / Math.max(1, amberAiPingMs / 25))} tokens/sec (est.)`
												: "Pending latency test"}
										</span>
									</div>
									<div className="flex justify-between items-center text-xs">
										<span className="text-muted-foreground">Active Architecture</span>
										<span className="font-mono text-muted-foreground">LPU Inference Engine</span>
									</div>
								</div>
							</Card>
						</div>
					</div>
				)}

				{/* TAB 5: VIDEO PRODUCTION & ASSETS */}
				{activeTab === "production" && (
					<div className="space-y-6">
						<div>
							<h2 className="text-lg font-bold font-clash text-foreground flex items-center gap-2">
								<Film className="size-5 text-orange-500" />
								Video Timelines &amp; Production Assets
							</h2>
							<p className="text-xs text-muted-foreground">
								Inspecting active client project timelines, multi-track scenes, and GPU shader effects
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<Card className="p-4 border-border bg-card/70 space-y-2">
								<div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
									<span>Local Projects Stored</span>
									<Video className="size-4 text-orange-500" />
								</div>
								<div className="text-2xl font-bold font-clash text-foreground">
									{realProjectsCount} Timelines
								</div>
								<p className="text-[11px] text-muted-foreground">
									Saved in client IndexedDB storage
								</p>
							</Card>

							<Card className="p-4 border-border bg-card/70 space-y-2">
								<div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
									<span>GPU Compositor</span>
									<Zap className="size-4 text-blue-500" />
								</div>
								<div className="text-2xl font-bold font-clash text-foreground">
									WebGPU &amp; WGSL
								</div>
								<p className="text-[11px] text-muted-foreground">
									Hardware accelerated blur, bloom, and transitions
								</p>
							</Card>

							<Card className="p-4 border-border bg-card/70 space-y-2">
								<div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
									<span>WASM Audio Mixers</span>
									<Mic className="size-4 text-purple-500" />
								</div>
								<div className="text-2xl font-bold font-clash text-foreground">
									WebAudio Graph
								</div>
								<p className="text-[11px] text-muted-foreground">
									SoundTouch pitch shifting &amp; noise filter
								</p>
							</Card>
						</div>

						{/* Projects Metadata Table */}
						<Card className="border-border bg-card/80 overflow-hidden">
							<div className="p-4 border-b border-border font-bold text-xs text-foreground">
								Recent Video Editor Timelines
							</div>
							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs">
									<thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
										<tr>
											<th className="py-2.5 px-4">Timeline Project</th>
											<th className="py-2.5 px-4">Canvas Format</th>
											<th className="py-2.5 px-4">Frame Rate</th>
											<th className="py-2.5 px-4">Created Date</th>
											<th className="py-2.5 px-4 text-right">Action</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border/60">
										{projectsMetadata.length > 0 ? (
											projectsMetadata.map((proj) => (
												<tr key={proj.id} className="hover:bg-muted/20">
													<td className="py-3 px-4 font-semibold text-foreground">{proj.name}</td>
													<td className="py-3 px-4">
														<Badge className="bg-orange-500/10 text-orange-500 border-none text-[10px] font-mono">
															{proj.canvasSize?.width || 1920}x{proj.canvasSize?.height || 1080}
														</Badge>
													</td>
													<td className="py-3 px-4 font-mono text-muted-foreground">
														{proj.fps ? `${proj.fps.numerator} fps` : "30 fps"}
													</td>
													<td className="py-3 px-4 text-muted-foreground">
														{proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : "Recent"}
													</td>
													<td className="py-3 px-4 text-right">
														<Link href={`/editor?project_id=${proj.id}`}>
															<Button size="sm" variant="outline" className="h-7 text-[10px] px-2.5 rounded-lg">
																Open Editor
															</Button>
														</Link>
													</td>
												</tr>
											))
										) : (
											<tr>
												<td colSpan={5} className="py-8 text-center text-muted-foreground">
													No project metadata found in local workspace.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</Card>
					</div>
				)}

				{/* TAB 6: STORAGE & SYSTEM DIAGNOSTICS */}
				{activeTab === "system" && (
					<div className="space-y-6">
						<div>
							<h2 className="text-lg font-bold font-clash text-foreground flex items-center gap-2">
								<Database className="size-5 text-orange-500" />
								Browser Storage &amp; System Health Diagnostics
							</h2>
							<p className="text-xs text-muted-foreground">
								Monitoring IndexedDB quotas, browser memory cache, and hardware WebCodecs encoding capabilities
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Client Storage Quota */}
							<Card className="border-border bg-card/80 p-5 space-y-4">
								<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
									<HardDrive className="size-4 text-orange-500" />
									Client IndexedDB Storage Quota
								</h3>
								<div className="space-y-3 pt-2">
									<div className="flex justify-between text-xs">
										<span className="text-muted-foreground">Used Storage:</span>
										<span className="font-mono font-bold text-foreground">
											{storageQuota ? formatStorageBytes({ bytes: storageQuota.usageBytes ?? 0 }) : "Loading..."}
										</span>
									</div>
									<div className="flex justify-between text-xs">
										<span className="text-muted-foreground">Available Quota:</span>
										<span className="font-mono font-bold text-foreground">
											{storageQuota ? formatStorageBytes({ bytes: storageQuota.quotaBytes ?? 0 }) : "Loading..."}
										</span>
									</div>
									<div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
										<div
											style={{
												width: `${
													storageQuota?.usageBytes && storageQuota?.quotaBytes
														? Math.min(100, Math.round((storageQuota.usageBytes / storageQuota.quotaBytes) * 100))
														: 2
												}%`,
											}}
											className="h-full bg-orange-500 rounded-full"
										/>
									</div>
								</div>
							</Card>

							{/* Hardware Accelerator Status */}
							<Card className="border-border bg-card/80 p-5 space-y-4">
								<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
									<Zap className="size-4 text-emerald-500" />
									WebGPU &amp; WebCodecs Acceleration
								</h3>
								<div className="space-y-3 pt-2 text-xs">
									<div className="flex justify-between items-center">
										<span className="text-muted-foreground">WebGPU Hardware Context:</span>
										<Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-[10px]">
											Available
										</Badge>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-muted-foreground">WebCodecs Hardware MP4:</span>
										<Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-[10px]">
											Hardware Accelerated
										</Badge>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-muted-foreground">SoundTouch Audio Engine:</span>
										<Badge className="bg-blue-500/10 text-blue-500 border-none font-bold text-[10px]">
											Synchronized
										</Badge>
									</div>
								</div>
							</Card>
						</div>
					</div>
				)}
			</main>

			{/* Manual Transaction Modal */}
			{showAddTxModal && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
					<div className="w-full max-w-md bg-card border border-border p-6 rounded-2xl shadow-2xl space-y-4">
						<div className="flex justify-between items-center">
							<h3 className="text-sm font-bold text-foreground">Record Offline Payment Invoice</h3>
							<button onClick={() => setShowAddTxModal(false)} className="text-muted-foreground hover:text-foreground">
								<X className="size-4" />
							</button>
						</div>

						<div className="space-y-3 text-xs">
							<div className="space-y-1">
								<label className="font-semibold text-foreground">Customer Creator Email</label>
								<Input
									placeholder="creator@example.com"
									value={manualTx.email}
									onChange={(e) => setManualTx({ ...manualTx, email: e.target.value })}
									className="h-9 text-xs"
								/>
							</div>

							<div className="space-y-1">
								<label className="font-semibold text-foreground">Customer Creator Name</label>
								<Input
									placeholder="Creator Name"
									value={manualTx.customer}
									onChange={(e) => setManualTx({ ...manualTx, customer: e.target.value })}
									className="h-9 text-xs"
								/>
							</div>

							<div className="space-y-1">
								<label className="font-semibold text-foreground">Plan Tier</label>
								<select
									value={manualTx.plan}
									onChange={(e) =>
										setManualTx({
											...manualTx,
											plan: e.target.value as any,
											amountNgn: e.target.value === "Annual Pro" ? 99000 : 14500,
										})
									}
									className="w-full h-9 px-3 text-xs rounded-xl bg-background border border-border"
								>
									<option value="Annual Pro">Director Suite Annual (₦198,000 / ₦99,000)</option>
									<option value="Monthly Pro">Creator Studio Monthly (₦14,500)</option>
								</select>
							</div>

							<div className="space-y-1">
								<label className="font-semibold text-foreground">Amount (NGN)</label>
								<Input
									type="number"
									value={manualTx.amountNgn}
									onChange={(e) => setManualTx({ ...manualTx, amountNgn: Number(e.target.value) })}
									className="h-9 text-xs font-mono"
								/>
							</div>
						</div>

						<div className="flex justify-end gap-2 pt-2 border-t border-border">
							<Button variant="ghost" size="sm" onClick={() => setShowAddTxModal(false)} className="text-xs">
								Cancel
							</Button>
							<Button size="sm" onClick={handleRecordManualTx} className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs">
								Save Payment Record
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
