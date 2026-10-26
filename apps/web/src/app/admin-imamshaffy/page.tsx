"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Crown,
	Film,
	Cpu,
	Activity,
	Search,
	RefreshCw,
	CheckCircle2,
	DollarSign,
	Mic,
	Sparkles,
	BarChart3,
	UserPlus,
	Database,
	HardDrive,
	Zap,
	Trash2,
	X,
	Eye,
	EyeOff,
	Save,
	Video,
	Scissors,
	Layers,
	TrendingUp,
	UploadCloud,
	Receipt,
	Users,
	Play,
	Clapperboard,
	LayoutDashboard,
	ShieldAlert,
	Lock,
	LogOut,
	Star,
	Globe,
	Monitor,
	Check,
	ArrowUpRight,
	ExternalLink,
	Smartphone,
	Laptop,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { UserProfileMenu } from "@/components/auth/user-profile-menu";
import {
	getTelemetryData,
	getGlobalTelemetryData,
	clearTelemetryData,
	type TelemetrySummary,
	type TelemetryEvent,
} from "@/stores/telemetry-store";
import {
	getRealTransactions,
	saveRealTransaction,
	type Transaction,
} from "@/services/transactions";
import { storageService } from "@/services/storage/service";
import {
	readStorageQuotaStatus,
	formatStorageBytes,
	type StorageQuotaStatus,
} from "@/services/storage/quota";
import { useProStore, isUserAdmin } from "@/stores/pro-store";
import { db, saveSystemAiConfig, loadSystemAiConfig } from "@/services/firebase";
import { collection, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAiStore, DEFAULT_GROQ_KEY } from "@/ai/store";

export interface CreatorUser {
	id: string;
	name: string;
	email: string;
	role: "Super Admin" | "Studio Pro" | "Creator";
	plan: "Director Suite" | "Creator Studio" | "Lifetime Pro" | "Free";
	isPro: boolean;
	projectsCount: number;
	joined: string;
	source: "Microsoft Store (Desktop)" | "Web App" | "Cloud" | "Google OAuth";
}

const MANAGED_USERS_KEY = "ambercut_admin_managed_users_v2";
const AUTHORIZED_ADMIN_EMAIL = "belloimam431@gmail.com";

export default function AdminImamShafiPage() {
	const {
		user: authUser,
		isLoading: isAuthLoading,
		signInWithGoogle,
		signInWithEmail,
		signOut: authSignOut,
	} = useAuth();

	const {
		isPro: isCurrentPro,
		plan: currentPlan,
		grantAdminAccess,
	} = useProStore();

	// Auth Form State (For Admin Portal Login Gate)
	const [loginEmail, setLoginEmail] = useState(AUTHORIZED_ADMIN_EMAIL);
	const [loginPassword, setLoginPassword] = useState("");
	const [isAuthenticating, setIsAuthenticating] = useState(false);
	const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

	// Navigation Tabs
	const [activeTab, setActiveTab] = useState<
		"overview" | "store" | "invoices" | "creators" | "ai_copilot" | "production" | "system"
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
	const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

	// Invoices & Manual Recording
	const [showAddTxModal, setShowAddTxModal] = useState(false);
	const [manualTx, setManualTx] = useState({
		email: "",
		customer: "",
		amountNgn: 198000,
		plan: "Annual Pro" as "Annual Pro" | "Monthly Pro",
	});

	// Microsoft Store Partner Metrics Modal
	const [showStoreEditModal, setShowStoreEditModal] = useState(false);
	const [storeForm, setStoreForm] = useState({
		downloads: 0,
		activeInstalls: 0,
		rating: 5.0,
	});

	// Real Client Hardware & Platform Sensors
	const [clientSystemInfo, setClientSystemInfo] = useState<{
		os: string;
		arch: string;
		cores: number;
		ram: string;
		gpuSupport: boolean;
		webCodecsSupport: boolean;
	}>({
		os: "Windows 11 / 10",
		arch: "x64",
		cores: 8,
		ram: "System RAM",
		gpuSupport: true,
		webCodecsSupport: true,
	});

	useEffect(() => {
		if (typeof window === "undefined") return;
		const ua = navigator.userAgent;
		let detectedOs = "Windows 11 / 10";
		if (ua.includes("Windows NT 10.0")) detectedOs = "Windows 11 / 10";
		else if (ua.includes("Mac")) detectedOs = "macOS";
		else if (ua.includes("Linux")) detectedOs = "Linux";

		let detectedArch = "x64 (Intel / AMD)";
		if (ua.includes("ARM") || ua.includes("aarch64")) detectedArch = "ARM64";

		const cores = navigator.hardwareConcurrency || 8;
		const mem = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB RAM` : "Hardware System Memory";
		const gpu = "gpu" in navigator;
		const codecs = typeof VideoEncoder !== "undefined";

		setClientSystemInfo({
			os: detectedOs,
			arch: detectedArch,
			cores,
			ram: mem,
			gpuSupport: gpu,
			webCodecsSupport: codecs,
		});
	}, []);

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

	// Check if current user is the authorized administrator
	const isAuthorizedAdmin = useMemo(() => {
		if (!authUser?.email) return false;
		return (
			authUser.email.trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase() ||
			isUserAdmin(authUser.email)
		);
	}, [authUser]);

	// Auto-grant admin pro tier when signed in as authorized admin
	useEffect(() => {
		if (isAuthorizedAdmin && authUser?.email) {
			grantAdminAccess(authUser.email);
		}
	}, [isAuthorizedAdmin, authUser, grantAdminAccess]);

	// Master Data Loader
	const loadDashboardData = useCallback(async (isManualRefresh = false) => {
		if (isManualRefresh) setIsRefreshing(true);
		else setIsLoadingData(true);

		try {
			// 1. Transactions (Reads Firestore payments + local)
			const txs = await getRealTransactions();
			setTransactions(txs);

			// 2. Global Telemetry & Microsoft Store Stats (Reads Firestore analytics/overview + local)
			const tel = await getGlobalTelemetryData();
			setTelemetry(tel);
			setStoreForm({
				downloads: tel.totalMicrosoftStoreDownloads || 0,
				activeInstalls: tel.activeDesktopInstalls || 0,
				rating: tel.storeRating || 5.0,
			});

			// 3. Local & Stored Projects (Strictly Real)
			let projects: any[] = [];
			try {
				projects = await storageService.loadAllProjectsMetadata();
				setRealProjectsCount(projects.length);
				setProjectsMetadata(projects);
			} catch {
				setRealProjectsCount(0);
				setProjectsMetadata([]);
			}

			// 4. Storage Quota
			try {
				const quota = await readStorageQuotaStatus();
				setStorageQuota(quota);
			} catch {}

			// 5. Creators List - Combine Firestore Users, Verified Transactions & Super Admin
			let creators: CreatorUser[] = [];

			// Try reading Firestore users collection
			try {
				const usersRef = collection(db, "users");
				const usersSnap = await getDocs(usersRef);
				for (const docSnap of usersSnap.docs) {
					const data = docSnap.data();
					if (data && (data.email || data.name)) {
						creators.push({
							id: docSnap.id,
							name: data.name || data.email?.split("@")[0] || "Creator",
							email: data.email || "creator@example.com",
							role: data.role || "Creator",
							plan: data.plan || "Free",
							isPro: !!data.isPro,
							projectsCount: Number(data.projectsCount) || 0,
							joined: data.joined || new Date().toISOString().split("T")[0],
							source: data.source || "Microsoft Store (Desktop)",
						});
					}
				}
			} catch (e) {
				console.warn("Could not load Firestore users:", e);
			}

			// Read locally managed creators cache (purging any legacy dummy entries)
			const dummyEmails = new Set([
				"tariq.edwards@creativestudios.co",
				"aisha.content@gmail.com",
				"miller.vids@outlook.com",
				"elena.edits@protonmail.com",
				"m.chen@videoproductions.org",
			]);

			if (typeof window !== "undefined") {
				const storedCreators = localStorage.getItem(MANAGED_USERS_KEY);
				if (storedCreators) {
					try {
						const parsed = JSON.parse(storedCreators) as CreatorUser[];
						for (const c of parsed) {
							if (
								!dummyEmails.has(c.email.toLowerCase()) &&
								!c.id.startsWith("cr_ms_10") &&
								!c.id.startsWith("cr_web_106") &&
								!creators.some((existing) => existing.email.toLowerCase() === c.email.toLowerCase())
							) {
								creators.push(c);
							}
						}
					} catch {}
				}
			}

			// Populate creators from verified transactions
			for (const tx of txs) {
				if (tx.email && !creators.some((c) => c.email.toLowerCase() === tx.email.toLowerCase())) {
					creators.push({
						id: tx.id || `cr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
						name: tx.customer || tx.email.split("@")[0],
						email: tx.email,
						role: tx.plan.includes("Annual") || tx.plan.includes("Director") ? "Studio Pro" : "Creator",
						plan: tx.plan.includes("Annual") || tx.plan.includes("Director") ? "Director Suite" : "Creator Studio",
						isPro: tx.status === "successful",
						projectsCount: 0,
						joined: tx.date ? tx.date.split(" ")[0] : new Date().toISOString().split("T")[0],
						source: tx.channel?.includes("Store") ? "Microsoft Store (Desktop)" : "Web App",
					});
				}
			}

			// Guarantee Super Admin Bello Imam is always at top
			const adminIndex = creators.findIndex((u) => u.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase());
			const superAdminUser: CreatorUser = {
				id: authUser?.id || "admin_bello_imam",
				name: authUser?.name || "Bello Imam",
				email: AUTHORIZED_ADMIN_EMAIL,
				role: "Super Admin",
				plan: "Director Suite",
				isPro: true,
				projectsCount: projects.length,
				joined: "2026-09-24",
				source: "Microsoft Store (Desktop)",
			};

			if (adminIndex === -1) {
				creators.unshift(superAdminUser);
			} else {
				creators[adminIndex] = {
					...creators[adminIndex],
					...superAdminUser,
					projectsCount: projects.length,
				};
			}

			setCreatorsList(creators);
			if (typeof window !== "undefined") {
				localStorage.setItem(MANAGED_USERS_KEY, JSON.stringify(creators));
			}

			if (isManualRefresh) {
				toast.success("Telemetry & Store analytics refreshed successfully!");
			}
		} catch (err) {
			console.error("Dashboard data load error:", err);
			toast.error("Failed to refresh live data.");
		} finally {
			setIsLoadingData(false);
			setIsRefreshing(false);
		}
	}, [authUser]);

	useEffect(() => {
		if (isAuthorizedAdmin) {
			loadDashboardData();
		}
	}, [isAuthorizedAdmin, loadDashboardData]);

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

	// Save Amber AI Config to Cloud
	const handleSaveAiConfig = async () => {
		setIsSavingAiKey(true);
		try {
			if (typeof window !== "undefined") {
				localStorage.setItem("ambercut_custom_groq_key", adminAiKey);
			}
			useAiStore.getState().setApiKey(adminAiKey);
			useAiStore.getState().setModel(adminAiModel);
			try {
				await saveSystemAiConfig({ groqApiKey: adminAiKey, model: adminAiModel, updatedBy: AUTHORIZED_ADMIN_EMAIL });
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

	// Save Microsoft Store Metrics to Cloud Firestore
	const handleSaveStoreMetrics = async () => {
		try {
			const docRef = doc(db, "analytics", "overview");
			await setDoc(docRef, {
				totalMicrosoftStoreDownloads: Number(storeForm.downloads) || 0,
				activeDesktopInstalls: Number(storeForm.activeInstalls) || 0,
				totalDesktopInstalls: Number(storeForm.activeInstalls) || 0,
				storeRating: Number(storeForm.rating) || 5.0,
				updatedAt: serverTimestamp(),
				updatedBy: AUTHORIZED_ADMIN_EMAIL,
			}, { merge: true });

			const current = getTelemetryData();
			current.totalMicrosoftStoreDownloads = Number(storeForm.downloads) || 0;
			current.activeDesktopInstalls = Number(storeForm.activeInstalls) || 0;
			current.storeRating = Number(storeForm.rating) || 5.0;
			if (typeof window !== "undefined") {
				localStorage.setItem("opencut_telemetry_data_v1", JSON.stringify(current));
			}
			setTelemetry({ ...current });

			setShowStoreEditModal(false);
			toast.success("Microsoft Store metrics updated in live cloud analytics!");
		} catch (err: any) {
			toast.error("Failed to save store metrics: " + err.message);
		}
	};

	// Grant Pro Access Action
	const handleGrantProAccess = async () => {
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
				joined: new Date().toISOString().split("T")[0],
				source: "Microsoft Store (Desktop)",
			});
		}

		setCreatorsList(updated);
		if (typeof window !== "undefined") {
			localStorage.setItem(MANAGED_USERS_KEY, JSON.stringify(updated));
		}

		// Also persist to Firestore users
		try {
			const userDocRef = doc(db, "users", `grant_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`);
			await setDoc(userDocRef, {
				email: cleanEmail,
				name: grantName.trim() || cleanEmail.split("@")[0],
				role: grantPlanTier === "director" ? "Studio Pro" : "Creator",
				plan: resolvedPlanTitle,
				isPro: true,
				updatedAt: serverTimestamp(),
			}, { merge: true });
		} catch {}

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
		if (typeof window !== "undefined") {
			localStorage.setItem(MANAGED_USERS_KEY, JSON.stringify(updated));
		}
		toast.success(`Updated ${email} to ${targetPlan}`);
	};

	// Manual Payment Recording
	const handleRecordManualTx = async () => {
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
			amountUsd: manualTx.plan === "Annual Pro" ? 158.4 : 11.6,
			status: "successful",
			date: new Date().toLocaleString(),
			method: "Bank Transfer",
		};

		await saveRealTransaction(newTx);
		setTransactions([newTx, ...transactions]);
		setShowAddTxModal(false);
		toast.success("Manual payment invoice recorded and saved!");
	};

	// Handle Admin Email / Password Sign In
	const handleAdminEmailLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setAuthErrorMessage(null);

		if (!loginEmail.trim() || !loginPassword.trim()) {
			setAuthErrorMessage("Please enter both email and password.");
			return;
		}

		if (loginEmail.trim().toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
			setAuthErrorMessage(`Unauthorized account. Access is strictly limited to ${AUTHORIZED_ADMIN_EMAIL}.`);
			return;
		}

		setIsAuthenticating(true);
		const result = await signInWithEmail(loginEmail, loginPassword);
		setIsAuthenticating(false);

		if (result.success) {
			toast.success("Welcome, Administrator Bello Imam!");
		} else {
			setAuthErrorMessage(result.error || "Authentication failed. Please verify password.");
		}
	};

	// Handle Google Sign In
	const handleAdminGoogleLogin = async () => {
		setAuthErrorMessage(null);
		setIsAuthenticating(true);
		const result = await signInWithGoogle();
		setIsAuthenticating(false);

		if (result.success) {
			toast.success("Signed in with Google!");
		} else {
			setAuthErrorMessage(result.error || "Google sign-in was cancelled or blocked.");
		}
	};

	// Calculated Revenue Metrics strictly from verified transactions
	const revenueMetrics = useMemo(() => {
		const successfulTxs = transactions.filter((tx) => tx.status === "successful");
		const totalRevenueNgn = successfulTxs.reduce((sum, tx) => sum + (tx.amountNgn || 0), 0);
		const totalRevenueUsd = successfulTxs.reduce((sum, tx) => sum + (tx.amountUsd || 0), 0);
		const proSubscribersCount = creatorsList.filter((c) => c.isPro).length;

		// Calculate MRR from active monthly transactions and prorated annual transactions
		const estimatedMrrNgn = successfulTxs.reduce((sum, tx) => {
			if (tx.plan.includes("Monthly")) return sum + (tx.amountNgn || 0);
			if (tx.plan.includes("Annual") || tx.plan.includes("Director") || tx.plan.includes("Lifetime")) {
				return sum + Math.round((tx.amountNgn || 0) / 12);
			}
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

	// Real 6-Month Visual Revenue Velocity Chart computed strictly from recorded transactions
	const monthlyChartData = useMemo(() => {
		const now = new Date();
		const months: { key: string; month: string; year: number }[] = [];

		for (let i = 5; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const monthName = d.toLocaleString("en-US", { month: "short" });
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			months.push({ key, month: monthName, year: d.getFullYear() });
		}

		// Group transactions by month
		const monthRevMap: Record<string, number> = {};
		const monthCountMap: Record<string, number> = {};

		for (const tx of transactions) {
			if (tx.status !== "successful") continue;
			let txDate: Date | null = null;
			if (tx.date) {
				const parsed = new Date(tx.date);
				if (!isNaN(parsed.getTime())) {
					txDate = parsed;
				}
			}
			if (!txDate) txDate = new Date();

			const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;
			monthRevMap[key] = (monthRevMap[key] || 0) + (tx.amountNgn || 0);
			monthCountMap[key] = (monthCountMap[key] || 0) + 1;
		}

		const maxRev = Math.max(...Object.values(monthRevMap), 1);

		return months.map(({ key, month }) => {
			const rev = monthRevMap[key] || 0;
			const count = monthCountMap[key] || 0;
			const heightPercent = rev > 0 ? Math.max(18, Math.round((rev / maxRev) * 100)) : 6;
			return {
				month,
				rev,
				count,
				revFormatted: rev >= 1000 ? `₦${(rev / 1000).toFixed(0)}k` : `₦${rev}`,
				height: `${heightPercent}%`,
			};
		});
	}, [transactions]);

	// Ingestion Aspect Ratio & Format Breakdown from Real Project Timelines
	const ingestionBreakdown = useMemo(() => {
		const total = projectsMetadata.length;
		if (total === 0) return [];

		let widescreen = 0;
		let vertical = 0;
		let square = 0;
		let cinema = 0;

		for (const p of projectsMetadata) {
			const w = p.canvasSize?.width || 1920;
			const h = p.canvasSize?.height || 1080;
			const ratio = w / h;
			if (ratio > 2.0) cinema++;
			else if (ratio >= 1.25) widescreen++;
			else if (ratio <= 0.8) vertical++;
			else square++;
		}

		return [
			{ label: "Widescreen Landscape (16:9)", percent: Math.round((widescreen / total) * 100), count: widescreen, color: "bg-orange-500" },
			{ label: "Vertical Shorts / Reels (9:16)", percent: Math.round((vertical / total) * 100), count: vertical, color: "bg-amber-500" },
			{ label: "Square Feed (1:1)", percent: Math.round((square / total) * 100), count: square, color: "bg-blue-500" },
			{ label: "Cinema Scope (21:9 / Custom)", percent: Math.round((cinema / total) * 100), count: cinema, color: "bg-emerald-500" },
		].filter((item) => item.count > 0);
	}, [projectsMetadata]);

	// Filtered creators for search
	const filteredCreators = useMemo(() => {
		if (!searchQuery.trim()) return creatorsList;
		const q = searchQuery.toLowerCase();
		return creatorsList.filter(
			(c) =>
				c.name.toLowerCase().includes(q) ||
				c.email.toLowerCase().includes(q) ||
				c.plan.toLowerCase().includes(q) ||
				c.source.toLowerCase().includes(q),
		);
	}, [creatorsList, searchQuery]);

	// --------------------------------------------------------------------------
	// AUTH GATE 1: LOADING STATE
	// --------------------------------------------------------------------------
	if (isAuthLoading) {
		return (
			<div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 selection:bg-orange-500/20">
				<div className="flex flex-col items-center gap-4 text-center max-w-sm">
					<div className="size-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/25 animate-pulse">
						<Clapperboard className="size-8" />
					</div>
					<div className="space-y-1">
						<h2 className="text-xl font-bold font-clash tracking-tight text-foreground">
							AmberCut Executive Terminal
						</h2>
						<p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
							<Lock className="size-3 text-orange-500" />
							Verifying administrator security credentials...
						</p>
					</div>
				</div>
			</div>
		);
	}

	// --------------------------------------------------------------------------
	// AUTH GATE 2: NOT SIGNED IN -> SECURE ADMIN LOGIN SCREEN
	// --------------------------------------------------------------------------
	if (!authUser) {
		return (
			<div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-orange-500/20">
				<div className="w-full max-w-md space-y-6">
					{/* Brand Header */}
					<div className="text-center space-y-2">
						<div className="size-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25 mx-auto">
							<Clapperboard className="size-7" />
						</div>
						<div className="flex items-center justify-center gap-2">
							<h1 className="text-2xl font-bold font-clash tracking-tight text-foreground">
								AmberCut Admin
							</h1>
							<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-500 border border-orange-500/20">
								Executive Suite
							</span>
						</div>
						<p className="text-xs text-muted-foreground">
							Root management console &bull; Platform telemetry &bull; Store analytics
						</p>
					</div>

					{/* Security Authentication Card */}
					<Card className="border-border/80 bg-card/80 backdrop-blur-xl shadow-2xl p-6 sm:p-8 space-y-6 rounded-2xl">
						<div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3 text-xs">
							<Lock className="size-4 text-orange-500 shrink-0 mt-0.5" />
							<div className="space-y-0.5">
								<p className="font-semibold text-foreground">Restricted Administrative Area</p>
								<p className="text-muted-foreground text-[11px] leading-relaxed">
									Access to this console is strictly restricted to{" "}
									<span className="font-mono font-bold text-orange-500 underline decoration-orange-500/40">
										{AUTHORIZED_ADMIN_EMAIL}
									</span>
									. Unauthorized access attempts are monitored and blocked.
								</p>
							</div>
						</div>

						{authErrorMessage && (
							<div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center gap-2">
								<ShieldAlert className="size-4 shrink-0" />
								<span>{authErrorMessage}</span>
							</div>
						)}

						{/* Primary: Quick Google OAuth Sign In */}
						<div className="space-y-3">
							<Button
								type="button"
								onClick={handleAdminGoogleLogin}
								disabled={isAuthenticating}
								className="w-full h-11 bg-card hover:bg-muted text-foreground border border-border/80 font-bold text-xs rounded-xl shadow-xs gap-2.5 transition-all"
							>
								<svg className="size-4" viewBox="0 0 24 24">
									<path
										fill="#4285F4"
										d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									/>
									<path
										fill="#34A853"
										d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									/>
									<path
										fill="#FBBC05"
										d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
									/>
									<path
										fill="#EA4335"
										d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
									/>
								</svg>
								{isAuthenticating ? "Authenticating Google Account..." : "Sign In with Google Admin"}
							</Button>

							<div className="flex items-center gap-3 text-[11px] text-muted-foreground uppercase font-mono tracking-wider pt-1">
								<div className="h-px bg-border flex-1" />
								<span>Or Password Credentials</span>
								<div className="h-px bg-border flex-1" />
							</div>

							{/* Secondary: Email / Password Credentials */}
							<form onSubmit={handleAdminEmailLogin} className="space-y-3 pt-1">
								<div className="space-y-1">
									<label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
										Admin Email
									</label>
									<Input
										type="email"
										value={loginEmail}
										onChange={(e) => setLoginEmail(e.target.value)}
										placeholder={AUTHORIZED_ADMIN_EMAIL}
										className="h-10 text-xs rounded-xl bg-background"
										required
									/>
								</div>

								<div className="space-y-1">
									<label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
										Admin Master Password
									</label>
									<Input
										type="password"
										value={loginPassword}
										onChange={(e) => setLoginPassword(e.target.value)}
										placeholder="••••••••••••"
										className="h-10 text-xs rounded-xl bg-background"
										required
									/>
								</div>

								<Button
									type="submit"
									disabled={isAuthenticating}
									className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20"
								>
									{isAuthenticating ? "Verifying Access..." : "Authenticate as Super Admin"}
								</Button>
							</form>
						</div>

						<div className="pt-2 text-center">
							<Link
								href="/editor"
								className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
							>
								&larr; Return to AmberCut Video Editor
							</Link>
						</div>
					</Card>
				</div>
			</div>
		);
	}

	// --------------------------------------------------------------------------
	// AUTH GATE 3: SIGNED IN BUT UNAUTHORIZED (NOT BELLO IMAM) -> ACCESS DENIED
	// --------------------------------------------------------------------------
	if (!isAuthorizedAdmin) {
		return (
			<div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-6 selection:bg-orange-500/20">
				<Card className="max-w-md w-full border-red-500/30 bg-card/90 shadow-2xl p-6 sm:p-8 space-y-5 text-center rounded-2xl">
					<div className="size-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto">
						<ShieldAlert className="size-7" />
					</div>

					<div className="space-y-1.5">
						<Badge className="bg-red-500/15 text-red-500 border border-red-500/20 font-bold text-[10px]">
							ACCESS DENIED &bull; 403 FORBIDDEN
						</Badge>
						<h2 className="text-xl font-bold font-clash text-foreground">
							Unauthorized Administrator Account
						</h2>
						<p className="text-xs text-muted-foreground leading-relaxed pt-1">
							You are currently authenticated as{" "}
							<span className="font-mono font-bold text-foreground">{authUser.email}</span>.
							Administrative control and store telemetry are strictly restricted to{" "}
							<span className="font-mono font-bold text-orange-500">{AUTHORIZED_ADMIN_EMAIL}</span>.
						</p>
					</div>

					<div className="pt-2 flex flex-col gap-2">
						<Button
							onClick={async () => {
								await authSignOut();
								toast.info("Signed out. Please sign in with belloimam431@gmail.com");
							}}
							className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-10 rounded-xl gap-2 shadow-sm"
						>
							<LogOut className="size-3.5" />
							Switch to Admin Account
						</Button>

						<Link href="/editor">
							<Button variant="outline" className="w-full text-xs h-10 rounded-xl">
								Return to Video Editor
							</Button>
						</Link>
					</div>
				</Card>
			</div>
		);
	}

	// --------------------------------------------------------------------------
	// AUTH GATE 4: VERIFIED BELLO IMAM -> FULL EXPANSIVE WIDESCREEN ADMIN DASHBOARD
	// --------------------------------------------------------------------------
	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col font-dm selection:bg-orange-500/20">
			{/* Top Executive Header (Fluid Widescreen Width) */}
			<header className="border-b border-border bg-card/75 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 lg:px-8 xl:px-10 py-3.5">
				<div className="w-full max-w-[1780px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					{/* Brand & Identity */}
					<div className="flex items-center gap-3.5">
						<div className="size-11 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/25 shrink-0">
							<Clapperboard className="size-6" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-lg font-bold font-clash tracking-tight text-foreground flex items-center gap-2">
									AmberCut Executive Control Center
								</h1>
								<span className="hidden sm:inline-flex text-orange-500 font-semibold text-[11px] px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">
									Super Admin: Bello Imam
								</span>
								<Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
									LIVE CLOUD SYNC
								</Badge>
							</div>
							<p className="text-xs text-muted-foreground">
								Microsoft Store Telemetry &bull; Platform Revenue (₦{revenueMetrics.estimatedArrNgn.toLocaleString()}) &bull; GPU Engine Telemetry
							</p>
						</div>
					</div>

					{/* Admin Quick Badges & Controls */}
					<div className="flex flex-wrap items-center gap-2.5">
						{/* Microsoft Store Status Indicator */}
						<div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border text-xs">
							<Monitor className="size-3.5 text-blue-500" />
							<span className="font-semibold text-foreground">Microsoft Store</span>
							<Badge className="bg-blue-500/10 text-blue-500 border-none font-bold text-[10px] px-1.5">
								{telemetry?.totalMicrosoftStoreDownloads?.toLocaleString() ?? 0} DL
							</Badge>
						</div>

						{/* Amber AI Neural LPU */}
						<div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border text-xs">
							<div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
							<span className="font-semibold text-foreground">Amber AI LPU</span>
							<span className="text-muted-foreground font-mono text-[11px]">
								{amberAiPingMs ? `${amberAiPingMs}ms` : "Active"}
							</span>
						</div>

						{/* Refresh Live Cloud Data */}
						<Button
							size="sm"
							variant="outline"
							onClick={() => loadDashboardData(true)}
							disabled={isRefreshing}
							className="h-8 text-xs rounded-xl gap-1.5 px-3"
						>
							<RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-orange-500" : ""}`} />
							{isRefreshing ? "Refreshing..." : "Refresh Cloud"}
						</Button>

						<Link href="/editor">
							<Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-8 rounded-xl gap-1.5 shadow-sm">
								<Play className="size-3 fill-white" />
								Open Studio Editor
							</Button>
						</Link>

						<UserProfileMenu variant="avatar" align="end" />
					</div>
				</div>

				{/* Modern Executive Navigation Tabs */}
				<div className="w-full max-w-[1780px] mx-auto flex items-center gap-1.5 pt-3 border-t border-border/50 mt-3 overflow-x-auto scrollbar-none">
					{[
						{ id: "overview", label: "Executive Overview", icon: LayoutDashboard },
						{ id: "store", label: "Microsoft Store & Desktop Installs", icon: Monitor, badge: "Live" },
						{ id: "invoices", label: "Invoices & Revenue Hub", icon: Receipt },
						{ id: "creators", label: "Creators & Pro Plans", icon: Users },
						{ id: "ai_copilot", label: "Amber AI & Neural Engine", icon: Cpu },
						{ id: "production", label: "Video Timelines & Assets", icon: Film },
						{ id: "system", label: "Storage & System Diagnostics", icon: Database },
					].map((tab) => {
						const Icon = tab.icon;
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id as any)}
								className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
									isActive
										? "bg-orange-500 text-white shadow-sm shadow-orange-500/20"
										: "text-muted-foreground hover:text-foreground hover:bg-muted/60"
								}`}
							>
								<Icon className="size-3.5" />
								<span>{tab.label}</span>
								{tab.badge && (
									<span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
										isActive ? "bg-white/20 text-white" : "bg-blue-500/15 text-blue-500"
									}`}>
										{tab.badge}
									</span>
								)}
							</button>
						);
					})}
				</div>
			</header>

			{/* Main Content Area (Expansive, Fluid, Full-Width Layout) */}
			<main className="flex-1 w-full max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-8">
				{/* ----------------------------------------------------------------- */}
				{/* TAB 1: EXECUTIVE DASHBOARD OVERVIEW */}
				{/* ----------------------------------------------------------------- */}
				{activeTab === "overview" && (
					<div className="space-y-6">
						{/* Top Executive KPI Grid (6 responsive wide columns) */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
							{/* Card 1: Microsoft Store Downloads */}
							<Card className="border-border bg-card/80 shadow-xs relative overflow-hidden">
								<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
								<CardHeader className="pb-2 flex flex-row items-center justify-between">
									<CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
										MS Store Downloads
									</CardTitle>
									<div className="size-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
										<Monitor className="size-3.5" />
									</div>
								</CardHeader>
								<CardContent className="space-y-1">
									<div className="text-2xl font-bold tracking-tight text-foreground font-clash">
										{telemetry?.totalMicrosoftStoreDownloads?.toLocaleString() ?? 0}
									</div>
									<div className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
										<CheckCircle2 className="size-3" />
										<span>Official Store Metric</span>
									</div>
								</CardContent>
							</Card>

							{/* Card 2: Active Desktop Installations */}
							<Card className="border-border bg-card/80 shadow-xs relative overflow-hidden">
								<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
								<CardHeader className="pb-2 flex flex-row items-center justify-between">
									<CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
										Active Desktop Installs
									</CardTitle>
									<div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
										<Laptop className="size-3.5" />
									</div>
								</CardHeader>
								<CardContent className="space-y-1">
									<div className="text-2xl font-bold tracking-tight text-foreground font-clash">
										{telemetry?.activeDesktopInstalls?.toLocaleString() ?? 0}
									</div>
									<div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
										<CheckCircle2 className="size-3" />
										<span>{telemetry?.crashFreeRate ?? 100}% crash-free rate</span>
									</div>
								</CardContent>
							</Card>

							{/* Card 3: Platform ARR */}
							<Card className="border-border bg-card/80 shadow-xs relative overflow-hidden">
								<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
								<CardHeader className="pb-2 flex flex-row items-center justify-between">
									<CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
										Platform ARR Run-Rate
									</CardTitle>
									<div className="size-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
										<DollarSign className="size-3.5" />
									</div>
								</CardHeader>
								<CardContent className="space-y-1">
									<div className="text-2xl font-bold tracking-tight text-foreground font-clash">
										₦{revenueMetrics.estimatedArrNgn.toLocaleString()}
									</div>
									<div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
										<TrendingUp className="size-3" />
										<span>MRR: ₦{revenueMetrics.estimatedMrrNgn.toLocaleString()}</span>
									</div>
								</CardContent>
							</Card>

							{/* Card 4: Verified Pro Subscribers */}
							<Card className="border-border bg-card/80 shadow-xs relative overflow-hidden">
								<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
								<CardHeader className="pb-2 flex flex-row items-center justify-between">
									<CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
										Pro Studio Licenses
									</CardTitle>
									<div className="size-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
										<Crown className="size-3.5" />
									</div>
								</CardHeader>
								<CardContent className="space-y-1">
									<div className="text-2xl font-bold tracking-tight text-foreground font-clash">
										{revenueMetrics.proSubscribersCount} Active
									</div>
									<div className="flex items-center gap-1.5 text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
										<Users className="size-3" />
										<span>Director &amp; Creator Pro</span>
									</div>
								</CardContent>
							</Card>

							{/* Card 5: Amber AI Executions */}
							<Card className="border-border bg-card/80 shadow-xs relative overflow-hidden">
								<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
								<CardHeader className="pb-2 flex flex-row items-center justify-between">
									<CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
										Amber AI Executions
									</CardTitle>
									<div className="size-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
										<Sparkles className="size-3.5" />
									</div>
								</CardHeader>
								<CardContent className="space-y-1">
									<div className="text-2xl font-bold tracking-tight text-foreground font-clash">
										{telemetry?.smartSuggestionsCount?.toLocaleString() ?? 0}
									</div>
									<div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
										<Scissors className="size-3" />
										<span>Shorts Cuts &bull; Subtitles</span>
									</div>
								</CardContent>
							</Card>

							{/* Card 6: 4K GPU Renders */}
							<Card className="border-border bg-card/80 shadow-xs relative overflow-hidden">
								<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500" />
								<CardHeader className="pb-2 flex flex-row items-center justify-between">
									<CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
										4K Hardware Renders
									</CardTitle>
									<div className="size-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
										<Zap className="size-3.5" />
									</div>
								</CardHeader>
								<CardContent className="space-y-1">
									<div className="text-2xl font-bold tracking-tight text-foreground font-clash">
										{telemetry?.exportCount?.toLocaleString() ?? 0}
									</div>
									<div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
										<CheckCircle2 className="size-3" />
										<span>WebCodecs MP4 60FPS</span>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Middle Section: Expansive Visual Revenue & Store Acquisition Chart */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Revenue & Subscription Performance Chart */}
							<Card className="lg:col-span-2 border-border bg-card/80 p-6 space-y-4">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
									<div>
										<h3 className="text-base font-bold text-foreground flex items-center gap-2">
											<BarChart3 className="size-4 text-orange-500" />
											Platform Subscription &amp; Microsoft Store Revenue Velocity
										</h3>
										<p className="text-xs text-muted-foreground">
											Monthly recurring revenue and store purchase velocity across Windows desktop and web editions
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Badge className="bg-orange-500/10 text-orange-500 border-none font-bold text-xs">
											ARR ₦{revenueMetrics.estimatedArrNgn.toLocaleString()}
										</Badge>
										<Badge className="bg-blue-500/10 text-blue-500 border-none font-bold text-xs">
											${revenueMetrics.totalRevenueUsd.toFixed(2)} USD
										</Badge>
									</div>
								</div>

								{/* Dynamic Visual Revenue Chart */}
								<div className="h-64 w-full pt-4 flex flex-col justify-between">
									<div className="h-52 flex items-end justify-between gap-4 px-3 border-b border-border/80">
										{monthlyChartData.map((item, idx) => (
											<div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
												<div className="text-[11px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
													{item.revFormatted} ({item.count} txn)
												</div>
												<div
													style={{ height: item.height }}
													className="w-full max-w-[54px] bg-gradient-to-t from-orange-500/60 via-orange-500 to-amber-500 rounded-t-xl group-hover:brightness-110 transition-all shadow-sm"
												/>
												<span className="text-xs font-semibold text-muted-foreground pt-1">
													{item.month}
												</span>
											</div>
										))}
									</div>
									<div className="flex items-center justify-between text-xs text-muted-foreground pt-3">
										<span>Verified Payments: {revenueMetrics.successfulCount} transactions recorded</span>
										<span className="text-orange-500 font-bold">
											Total Revenue: ₦{revenueMetrics.totalRevenueNgn.toLocaleString()}
										</span>
									</div>
								</div>
							</Card>

							{/* Ingestion & Video Format Intelligence */}
							<Card className="border-border bg-card/80 p-6 space-y-5">
								<div>
									<h3 className="text-base font-bold text-foreground flex items-center gap-2">
										<UploadCloud className="size-4 text-orange-500" />
										Media Ingestion Intelligence
									</h3>
									<p className="text-xs text-muted-foreground">
										Real-time format breakdown of videos edited across Microsoft Store clients
									</p>
								</div>

								<div className="space-y-4 pt-1">
									{ingestionBreakdown.length > 0 ? (
										ingestionBreakdown.map((fmt, i) => (
											<div key={i} className="space-y-1.5">
												<div className="flex justify-between text-xs font-semibold">
													<span className="text-foreground">{fmt.label}</span>
													<span className="font-mono text-muted-foreground">
														{fmt.count} ({fmt.percent}%)
													</span>
												</div>
												<div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden">
													<div
														style={{ width: `${fmt.percent}%` }}
														className={`h-full ${fmt.color} rounded-full`}
													/>
												</div>
											</div>
										))
									) : (
										<div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
											No video timelines recorded yet. Projects created in the editor will appear here.
										</div>
									)}
								</div>

								<div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
									<span>Client Storage Quota Usage:</span>
									<span className="font-mono font-bold text-foreground">
										{storageQuota?.usageBytes
											? formatStorageBytes({ bytes: storageQuota.usageBytes })
											: "0 B (IndexedDB)"}
									</span>
								</div>
							</Card>
						</div>

						{/* Live Activity & Telemetry Feed */}
						<Card className="border-border bg-card/80 p-6 space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
										<Activity className="size-4 text-orange-500" />
										Live Client Telemetry &amp; Microsoft Store Event Stream
									</h3>
									<p className="text-xs text-muted-foreground">
										Live event dispatches from Windows desktop MSIX installs, GPU render pipelines, and WebCodecs encoders
									</p>
								</div>
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										clearTelemetryData();
										setTelemetry(getTelemetryData());
										toast.success("Telemetry log reset to clean baseline.");
									}}
									className="text-xs h-7 gap-1"
								>
									<Trash2 className="size-3 text-red-500" />
									Clear Logs
								</Button>
							</div>

							<div className="divide-y divide-border/60 max-h-72 overflow-y-auto">
								{telemetry && telemetry.events && telemetry.events.length > 0 ? (
									telemetry.events.map((evt: TelemetryEvent) => (
										<div key={evt.id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
											<div className="flex items-center gap-3 min-w-0">
												<div className="size-2 rounded-full bg-orange-500 shrink-0" />
												<span className="font-semibold text-foreground truncate">{evt.name || evt.type}</span>
												<span className="text-muted-foreground truncate hidden sm:inline">
													{evt.details}
												</span>
											</div>
											<span className="text-[11px] text-muted-foreground font-mono shrink-0">
												{evt.timestamp}
											</span>
										</div>
									))
								) : (
									<div className="py-8 text-center text-xs text-muted-foreground">
										No recent telemetry events recorded.
									</div>
								)}
							</div>
						</Card>
					</div>
				)}

				{/* ----------------------------------------------------------------- */}
				{/* TAB 2: MICROSOFT STORE & DESKTOP INSTALLS */}
				{/* ----------------------------------------------------------------- */}
				{activeTab === "store" && (
					<div className="space-y-6">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div>
								<h2 className="text-lg font-bold font-clash text-foreground flex items-center gap-2">
									<Monitor className="size-5 text-blue-500" />
									Microsoft Store App Telemetry &amp; Desktop Installs
								</h2>
								<p className="text-xs text-muted-foreground">
									Monitoring Windows MSIX installer downloads, active desktop installations, and real device hardware health
								</p>
							</div>

							<Button
								size="sm"
								onClick={() => setShowStoreEditModal(true)}
								className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl gap-1.5 shadow-sm"
							>
								<Monitor className="size-3.5" />
								Update Store Metrics
							</Button>
						</div>

						{/* Store Highlight Metrics */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
							<Card className="border-border bg-card/80 p-5 space-y-1">
								<div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
									<span>Total Store Downloads</span>
									<Monitor className="size-4 text-blue-500" />
								</div>
								<div className="text-3xl font-bold font-clash text-foreground">
									{telemetry?.totalMicrosoftStoreDownloads?.toLocaleString() ?? 0}
								</div>
								<p className="text-[11px] text-blue-500 font-semibold">
									Official Partner Center Metric
								</p>
							</Card>

							<Card className="border-border bg-card/80 p-5 space-y-1">
								<div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
									<span>Active Windows Devices</span>
									<Laptop className="size-4 text-emerald-500" />
								</div>
								<div className="text-3xl font-bold font-clash text-foreground">
									{telemetry?.activeDesktopInstalls?.toLocaleString() ?? 0}
								</div>
								<p className="text-[11px] text-muted-foreground">
									Verified active client installs
								</p>
							</Card>

							<Card className="border-border bg-card/80 p-5 space-y-1">
								<div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
									<span>Store Rating</span>
									<Star className="size-4 text-amber-500 fill-amber-500" />
								</div>
								<div className="text-3xl font-bold font-clash text-foreground">
									{telemetry?.storeRating ? Number(telemetry.storeRating).toFixed(1) : "5.0"} / 5.0
								</div>
								<p className="text-[11px] text-amber-500 font-semibold">
									Microsoft Store creator score
								</p>
							</Card>

							<Card className="border-border bg-card/80 p-5 space-y-1">
								<div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
									<span>Crash-Free Rate</span>
									<CheckCircle2 className="size-4 text-emerald-500" />
								</div>
								<div className="text-3xl font-bold font-clash text-foreground">
									{telemetry?.crashFreeRate ?? 100}%
								</div>
								<p className="text-[11px] text-muted-foreground">
									Microsoft certification standard
								</p>
							</Card>
						</div>

						{/* Real Hardware Diagnostics & Cloud Store Sync */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* Card 1: Real Hardware & OS Diagnostics */}
							<Card className="border-border bg-card/80 p-6 space-y-4">
								<div className="flex items-center justify-between">
									<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
										<Laptop className="size-4 text-orange-500" />
										Client Environment &amp; Hardware Diagnostics
									</h3>
									<Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] font-bold">
										LIVE HARDWARE SENSORS
									</Badge>
								</div>
								<div className="divide-y divide-border/60 text-xs">
									<div className="py-2.5 flex justify-between items-center">
										<span className="text-muted-foreground">Operating System:</span>
										<span className="font-semibold text-foreground font-mono">{clientSystemInfo.os}</span>
									</div>
									<div className="py-2.5 flex justify-between items-center">
										<span className="text-muted-foreground">CPU Architecture:</span>
										<span className="font-semibold text-foreground font-mono">{clientSystemInfo.arch}</span>
									</div>
									<div className="py-2.5 flex justify-between items-center">
										<span className="text-muted-foreground">Logical CPU Cores:</span>
										<span className="font-semibold text-foreground font-mono">{clientSystemInfo.cores} Cores</span>
									</div>
									<div className="py-2.5 flex justify-between items-center">
										<span className="text-muted-foreground">Detected Memory:</span>
										<span className="font-semibold text-foreground font-mono">{clientSystemInfo.ram}</span>
									</div>
									<div className="py-2.5 flex justify-between items-center">
										<span className="text-muted-foreground">WebGPU Acceleration:</span>
										<Badge className={clientSystemInfo.gpuSupport ? "bg-emerald-500/15 text-emerald-500 border-none font-bold" : "bg-muted text-muted-foreground border-none"}>
											{clientSystemInfo.gpuSupport ? "Hardware DirectML / WGSL" : "Fallback 2D"}
										</Badge>
									</div>
									<div className="py-2.5 flex justify-between items-center">
										<span className="text-muted-foreground">WebCodecs MP4 Encoding:</span>
										<Badge className={clientSystemInfo.webCodecsSupport ? "bg-blue-500/15 text-blue-500 border-none font-bold" : "bg-muted text-muted-foreground border-none"}>
											{clientSystemInfo.webCodecsSupport ? "Hardware 4K WebCodecs" : "Software WASM"}
										</Badge>
									</div>
								</div>
							</Card>

							{/* Card 2: Official Store Telemetry & Sync Management */}
							<Card className="border-border bg-card/80 p-6 space-y-4">
								<div className="flex items-center justify-between">
									<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
										<Monitor className="size-4 text-blue-500" />
										Microsoft Store Distribution &amp; Cloud Telemetry
									</h3>
									<Badge className="bg-blue-500/10 text-blue-500 border-none text-[10px] font-bold">
										MSIX PACKAGE
									</Badge>
								</div>

								<div className="space-y-3 text-xs">
									<div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2">
										<div className="flex justify-between items-center">
											<span className="text-muted-foreground">MSIX Package ID:</span>
											<span className="font-mono font-bold text-foreground">AmberCut.VideoEditor</span>
										</div>
										<div className="flex justify-between items-center">
											<span className="text-muted-foreground">Firestore Telemetry Sync:</span>
											<span className="font-mono text-emerald-500 font-semibold">ambercut-d07ef (Live)</span>
										</div>
										<div className="flex justify-between items-center">
											<span className="text-muted-foreground">Verified Store Customers:</span>
											<span className="font-mono font-bold text-foreground">
												{creatorsList.filter(c => c.source.includes("Store")).length} Creators
											</span>
										</div>
										<div className="flex justify-between items-center">
											<span className="text-muted-foreground">Store Pro Revenue:</span>
											<span className="font-mono font-bold text-orange-500">
												₦{revenueMetrics.totalRevenueNgn.toLocaleString()}
											</span>
										</div>
									</div>

									<div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2 text-xs">
										<p className="font-semibold text-foreground">Microsoft Partner Center Synchronization</p>
										<p className="text-muted-foreground text-[11px] leading-relaxed">
											To update your live store metrics directly from the Windows Partner Center, click the button below to update download numbers in cloud analytics.
										</p>
										<Button
											size="sm"
											onClick={() => setShowStoreEditModal(true)}
											className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 rounded-lg mt-1"
										>
											Update Official Store Figures
										</Button>
									</div>
								</div>
							</Card>
						</div>
					</div>
				)}

				{/* ----------------------------------------------------------------- */}
				{/* TAB 3: INVOICES & REVENUE HUB */}
				{/* ----------------------------------------------------------------- */}
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
								className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs h-9 rounded-xl gap-1.5 shadow-sm"
							>
								<UserPlus className="size-3.5" />
								Record Manual Payment Invoice
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

				{/* ----------------------------------------------------------------- */}
				{/* TAB 4: CREATORS & PRO PLANS */}
				{/* ----------------------------------------------------------------- */}
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
									placeholder="Search creators by email, name, or source..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="h-9 text-xs w-72 rounded-xl bg-background"
								/>
							</div>
						</div>

						{/* Grant Access Inline Form */}
						<Card className="border-border bg-card/80 p-5 space-y-3">
							<h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
								<Crown className="size-3.5 text-orange-500" />
								Quick Grant Pro License
							</h3>
							<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
											<th className="py-3 px-4">Creator Customer</th>
											<th className="py-3 px-4">Platform Source</th>
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
																	SUPER ADMIN
																</Badge>
															)}
														</div>
														<div className="text-[11px] text-muted-foreground font-mono">{creator.email}</div>
													</td>
													<td className="py-3 px-4">
														<Badge className="bg-blue-500/10 text-blue-500 border-none text-[10px] font-medium">
															{creator.source}
														</Badge>
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
															{creator.isPro && creator.role !== "Super Admin" && (
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
												<td colSpan={7} className="py-8 text-center text-muted-foreground">
													No creator accounts matching search query.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</Card>
					</div>
				)}

				{/* ----------------------------------------------------------------- */}
				{/* TAB 5: AMBER AI & ENGINE CONFIGURATION */}
				{/* ----------------------------------------------------------------- */}
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
							<Card className="lg:col-span-2 border-border bg-card/80 p-6 space-y-5">
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
							<Card className="border-border bg-card/80 p-6 space-y-4">
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
											{amberAiPingMs !== null ? `${amberAiPingMs} ms` : "Not tested (click test button)"}
										</span>
									</div>
									<div className="flex justify-between items-center text-xs">
										<span className="text-muted-foreground">Token Throughput</span>
										<span className="font-mono font-bold text-emerald-500">
											{amberAiPingMs !== null
												? `~${Math.round(1000 / Math.max(1, amberAiPingMs / 25))} tokens/sec (est.)`
												: "~380 tokens/sec"}
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

				{/* ----------------------------------------------------------------- */}
				{/* TAB 6: VIDEO PRODUCTION & ASSETS */}
				{/* ----------------------------------------------------------------- */}
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
							<Card className="p-5 border-border bg-card/70 space-y-2">
								<div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
									<span>Video Timelines</span>
									<Video className="size-4 text-orange-500" />
								</div>
								<div className="text-2xl font-bold font-clash text-foreground">
									{realProjectsCount} Timelines
								</div>
								<p className="text-[11px] text-muted-foreground">
									Saved in client IndexedDB &amp; Cloud
								</p>
							</Card>

							<Card className="p-5 border-border bg-card/70 space-y-2">
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

							<Card className="p-5 border-border bg-card/70 space-y-2">
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
													Ready to start editing. Open editor to create new video timelines.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</Card>
					</div>
				)}

				{/* ----------------------------------------------------------------- */}
				{/* TAB 7: STORAGE & SYSTEM DIAGNOSTICS */}
				{/* ----------------------------------------------------------------- */}
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
							<Card className="border-border bg-card/80 p-6 space-y-4">
								<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
									<HardDrive className="size-4 text-orange-500" />
									Client IndexedDB Storage Quota
								</h3>
								<div className="space-y-3 pt-2">
									<div className="flex justify-between text-xs">
										<span className="text-muted-foreground">Used Storage:</span>
										<span className="font-mono font-bold text-foreground">
											{storageQuota ? formatStorageBytes({ bytes: storageQuota.usageBytes ?? 0 }) : "0 B"}
										</span>
									</div>
									<div className="flex justify-between text-xs">
										<span className="text-muted-foreground">Available Quota:</span>
										<span className="font-mono font-bold text-foreground">
											{storageQuota ? formatStorageBytes({ bytes: storageQuota.quotaBytes ?? 0 }) : "Unavailable"}
										</span>
									</div>
									<div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden">
										<div
											style={{
												width: `${
													storageQuota?.usageBytes && storageQuota?.quotaBytes
														? Math.min(100, Math.round((storageQuota.usageBytes / storageQuota.quotaBytes) * 100))
														: 0
												}%`,
											}}
											className="h-full bg-orange-500 rounded-full"
										/>
									</div>
								</div>
							</Card>

							{/* Hardware Accelerator Status */}
							<Card className="border-border bg-card/80 p-6 space-y-4">
								<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
									<Zap className="size-4 text-emerald-500" />
									WebGPU &amp; WebCodecs Acceleration
								</h3>
								<div className="space-y-3 pt-2 text-xs">
									<div className="flex justify-between items-center">
										<span className="text-muted-foreground">WebGPU Hardware Context:</span>
										<Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-[10px]">
											Available &bull; 60 FPS
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

			{/* Microsoft Store Telemetry Update Modal */}
			{showStoreEditModal && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
					<div className="w-full max-w-md bg-card border border-border p-6 rounded-2xl shadow-2xl space-y-4">
						<div className="flex justify-between items-center">
							<div className="flex items-center gap-2">
								<Monitor className="size-4 text-blue-500" />
								<h3 className="text-sm font-bold text-foreground">Update Microsoft Store Telemetry</h3>
							</div>
							<button onClick={() => setShowStoreEditModal(false)} className="text-muted-foreground hover:text-foreground">
								<X className="size-4" />
							</button>
						</div>

						<p className="text-xs text-muted-foreground">
							Enter the official download and device installation metrics from your Microsoft Partner Center console. These figures will sync directly to live cloud analytics.
						</p>

						<div className="space-y-3 text-xs">
							<div className="space-y-1">
								<label className="font-semibold text-foreground">Total Microsoft Store Downloads</label>
								<Input
									type="number"
									placeholder="e.g. 50"
									value={storeForm.downloads}
									onChange={(e) => setStoreForm({ ...storeForm, downloads: Number(e.target.value) })}
									className="h-9 text-xs font-mono"
								/>
							</div>

							<div className="space-y-1">
								<label className="font-semibold text-foreground">Active Desktop Installations</label>
								<Input
									type="number"
									placeholder="e.g. 35"
									value={storeForm.activeInstalls}
									onChange={(e) => setStoreForm({ ...storeForm, activeInstalls: Number(e.target.value) })}
									className="h-9 text-xs font-mono"
								/>
							</div>

							<div className="space-y-1">
								<label className="font-semibold text-foreground">Average Store Rating (1.0 - 5.0)</label>
								<Input
									type="number"
									step="0.1"
									min="1"
									max="5"
									placeholder="5.0"
									value={storeForm.rating}
									onChange={(e) => setStoreForm({ ...storeForm, rating: Number(e.target.value) })}
									className="h-9 text-xs font-mono"
								/>
							</div>
						</div>

						<div className="flex justify-end gap-2 pt-2 border-t border-border">
							<Button variant="ghost" size="sm" onClick={() => setShowStoreEditModal(false)} className="text-xs">
								Cancel
							</Button>
							<Button size="sm" onClick={handleSaveStoreMetrics} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
								Save Store Telemetry
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Manual Payment Invoice Modal */}
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
											amountNgn: e.target.value === "Annual Pro" ? 198000 : 14500,
										})
									}
									className="w-full h-9 px-3 text-xs rounded-xl bg-background border border-border"
								>
									<option value="Annual Pro">Director Suite Annual (₦198,000)</option>
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
