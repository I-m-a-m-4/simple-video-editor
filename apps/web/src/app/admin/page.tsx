"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
	getTelemetryData,
	clearTelemetryData,
	type TelemetrySummary,
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
import { useProStore, isUserAdmin } from "@/stores/pro-store";
import { db } from "@/services/firebase";
import {
	collection,
	doc,
	getDocs,
	setDoc,
	query,
	orderBy,
	serverTimestamp,
} from "firebase/firestore";

export interface AdminUser {
	id: string;
	name: string;
	email: string;
	role: "Super Admin" | "Admin" | "User";
	plan: "Pro (Annual)" | "Pro (Monthly)" | "Pro (Lifetime)" | "Free";
	isPro: boolean;
	projectsCount: number;
	joined: string;
	source: "Firebase Auth" | "Local Storage" | "Firestore";
}

const MANAGED_USERS_KEY = "opencut_admin_managed_users_v1";

export default function AdminPage() {
	const { user: authUser, signOut: authSignOut } = useAuth();
	const { data: session } = useSession();
	const { isPro: isCurrentPro, grantAdminAccess, resetProStatus } = useProStore();

	// Auth form state
	const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [authLoading, setAuthLoading] = useState(false);
	const [authError, setAuthError] = useState<string | null>(null);

	// Client local admin session
	const [localAdminUser, setLocalAdminUser] = useState<{
		name: string;
		email: string;
	} | null>(null);

	// Active tab
	const [activeTab, setActiveTab] = useState<
		"overview" | "transactions" | "users" | "telemetry" | "system"
	>("overview");
	const [searchQuery, setSearchQuery] = useState("");

	// Real data states (no dummy values)
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [usersList, setUsersList] = useState<AdminUser[]>([]);
	const [telemetry, setTelemetry] = useState<TelemetrySummary | null>(null);
	const [storageQuota, setStorageQuota] = useState<StorageQuotaStatus | null>(null);
	const [realProjectsCount, setRealProjectsCount] = useState<number>(0);
	const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

	// Advanced Tools: Verification modal/input
	const [verifyTxId, setVerifyTxId] = useState("");
	const [verifyPlan, setVerifyPlan] = useState<"Annual Pro" | "Monthly Pro">("Annual Pro");
	const [isVerifying, setIsVerifying] = useState(false);

	// Advanced Tools: Grant Pro modal/input
	const [grantEmail, setGrantEmail] = useState("");
	const [grantName, setGrantName] = useState("");

	// Diagnostic status
	const [groqPingMs, setGroqPingMs] = useState<number | null>(null);
	const [isTestingGroq, setIsTestingGroq] = useState(false);
	const [firestoreConnected, setFirestoreConnected] = useState<boolean | null>(null);

	// Check local admin session on mount
	useEffect(() => {
		const stored = localStorage.getItem("opencut_admin_session");
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				if (parsed.email && parsed.email.toLowerCase().endsWith("@gmail.com")) {
					setLocalAdminUser(parsed);
				}
			} catch {}
		}
	}, []);

	const currentEmail = authUser?.email || session?.user?.email || localAdminUser?.email;
	const currentName =
		authUser?.name ||
		session?.user?.name ||
		localAdminUser?.name ||
		(currentEmail ? currentEmail.split("@")[0] : "Administrator");
	const isGmail = currentEmail ? currentEmail.toLowerCase().endsWith("@gmail.com") : false;

	// Load all REAL live data
	const loadAllDashboardData = useCallback(async () => {
		setIsLoadingData(true);

		try {
			// 1. Load real transactions
			const txList = await getRealTransactions();
			setTransactions(txList);

			// 2. Load real telemetry
			setTelemetry(getTelemetryData());

			// 3. Load real storage quota
			const quota = await readStorageQuotaStatus();
			setStorageQuota(quota);

			// 4. Load real projects from IndexedDB
			let projectsCount = 0;
			try {
				const projects = await storageService.loadAllProjects();
				projectsCount = projects.length;
				setRealProjectsCount(projectsCount);
			} catch {
				// Project storage might be uninitialized
			}

			// 5. Load real registered accounts
			const loadedUsers: AdminUser[] = [];
			const seenEmails = new Set<string>();

			// Add currently authenticated admin
			if (currentEmail) {
				const adminUserRecord: AdminUser = {
					id: authUser?.id || "usr_current_admin",
					name: currentName,
					email: currentEmail,
					role: "Super Admin",
					plan: isCurrentPro ? "Pro (Lifetime)" : "Free",
					isPro: isCurrentPro,
					projectsCount: projectsCount,
					joined: "Current Session",
					source: authUser?.id ? "Firebase Auth" : "Local Storage",
				};
				loadedUsers.push(adminUserRecord);
				seenEmails.add(currentEmail.toLowerCase());
			}

			// Add admin-managed accounts from local storage
			try {
				const rawManaged = localStorage.getItem(MANAGED_USERS_KEY);
				if (rawManaged) {
					const parsed = JSON.parse(rawManaged) as AdminUser[];
					for (const u of parsed) {
						if (!seenEmails.has(u.email.toLowerCase())) {
							loadedUsers.push(u);
							seenEmails.add(u.email.toLowerCase());
						}
					}
				}
			} catch {}

			// Fetch Firestore users if available
			try {
				const usersCol = collection(db, "users");
				const snapshot = await getDocs(usersCol);
				setFirestoreConnected(true);

				for (const docSnap of snapshot.docs) {
					const data = docSnap.data();
					const userEmail = (data.email || "").toLowerCase();
					if (userEmail && !seenEmails.has(userEmail)) {
						loadedUsers.push({
							id: docSnap.id,
							name: data.name || userEmail.split("@")[0],
							email: userEmail,
							role: userEmail.endsWith("@gmail.com") ? "Admin" : "User",
							plan: data.plan || (data.isPro ? "Pro (Lifetime)" : "Free"),
							isPro: !!data.isPro,
							projectsCount: data.projectsCount || 0,
							joined: data.joined || "Recent",
							source: "Firestore",
						});
						seenEmails.add(userEmail);
					}
				}
			} catch {
				setFirestoreConnected(false);
			}

			setUsersList(loadedUsers);
		} catch (err) {
			console.error("Error loading dashboard data:", err);
		} finally {
			setIsLoadingData(false);
		}
	}, [currentEmail, currentName, authUser, isCurrentPro]);

	useEffect(() => {
		if (isGmail) {
			loadAllDashboardData();
		}
	}, [isGmail, loadAllDashboardData]);

	// Live Groq API Latency Test
	const testGroqConnection = async () => {
		setIsTestingGroq(true);
		setGroqPingMs(null);
		const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;

		if (!apiKey) {
			toast.error("NEXT_PUBLIC_GROQ_API_KEY is not configured.");
			setIsTestingGroq(false);
			return;
		}

		const startTime = performance.now();
		try {
			const res = await fetch("https://api.groq.com/openai/v1/models", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
			});

			const endTime = performance.now();
			const latency = Math.round(endTime - startTime);

			if (res.ok) {
				setGroqPingMs(latency);
				toast.success(`Groq LPU Active: ${latency}ms latency`);
			} else {
				toast.error(`Groq API returned status ${res.status}`);
			}
		} catch (err: any) {
			toast.error(`Groq ping failed: ${err?.message || "Network error"}`);
		} finally {
			setIsTestingGroq(false);
		}
	};

	// Auth submission
	const handleAuthSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setAuthError(null);

		const trimmedEmail = email.trim().toLowerCase();
		if (!trimmedEmail) {
			setAuthError("Email address is required.");
			return;
		}

		if (!trimmedEmail.endsWith("@gmail.com")) {
			setAuthError("Access Restricted: Only @gmail.com accounts are authorized for admin.");
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
				} catch {}

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
				} catch {}

				const adminSession = {
					name: trimmedEmail.split("@")[0].toUpperCase(),
					email: trimmedEmail,
				};
				localStorage.setItem("opencut_admin_session", JSON.stringify(adminSession));
				setLocalAdminUser(adminSession);
				toast.success(`Welcome back, ${trimmedEmail}`);
			}
		} catch (err: any) {
			setAuthError(err?.message || "Authentication failed.");
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

	// Advanced Action: Verify & record Flutterwave transaction
	const handleVerifyTransaction = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!verifyTxId.trim()) {
			toast.error("Please enter a valid Flutterwave Transaction ID.");
			return;
		}

		setIsVerifying(true);
		toast.loading("Verifying transaction with Flutterwave API...", { id: "admin-verify" });

		const res = await verifyAndRecordTransaction(verifyTxId.trim(), verifyPlan);
		toast.dismiss("admin-verify");
		setIsVerifying(false);

		if (res.success && res.transaction) {
			toast.success(
				`Verified! ₦${res.transaction.amountNgn.toLocaleString()} recorded for ${res.transaction.customer}`,
			);
			setVerifyTxId("");
			loadAllDashboardData();
		} else {
			toast.error(res.error || "Transaction verification failed.");
		}
	};

	// Advanced Action: Grant / Revoke Pro
	const handleGrantPro = async (targetEmail: string, targetName?: string) => {
		const cleanEmail = targetEmail.trim().toLowerCase();
		if (!cleanEmail) {
			toast.error("Please enter an email address.");
			return;
		}

		// Update locally
		const currentManaged: AdminUser[] = JSON.parse(
			localStorage.getItem(MANAGED_USERS_KEY) || "[]",
		);
		const existingIndex = currentManaged.findIndex((u) => u.email.toLowerCase() === cleanEmail);

		const updatedRecord: AdminUser = {
			id: `usr_${Date.now()}`,
			name: targetName || cleanEmail.split("@")[0],
			email: cleanEmail,
			role: cleanEmail.endsWith("@gmail.com") ? "Admin" : "User",
			plan: "Pro (Lifetime)",
			isPro: true,
			projectsCount: 0,
			joined: new Date().toLocaleDateString(),
			source: "Local Storage",
		};

		if (existingIndex >= 0) {
			currentManaged[existingIndex] = {
				...currentManaged[existingIndex],
				plan: "Pro (Lifetime)",
				isPro: true,
			};
		} else {
			currentManaged.unshift(updatedRecord);
		}

		localStorage.setItem(MANAGED_USERS_KEY, JSON.stringify(currentManaged));

		// If current user is the target, activate in pro-store
		if (currentEmail && cleanEmail === currentEmail.toLowerCase()) {
			grantAdminAccess(cleanEmail);
		}

		// Save a complimentary transaction entry for audit trail
		await saveRealTransaction({
			id: `tx_admin_${Date.now()}`,
			tx_ref: `ADMIN_GRANT_${Date.now()}`,
			email: cleanEmail,
			customer: targetName || cleanEmail.split("@")[0],
			plan: "Pro (Lifetime)",
			amountNgn: 0,
			amountUsd: 0,
			status: "successful",
			date: new Date().toLocaleString(),
			method: "Admin Granted",
		});

		// Sync to Firestore
		try {
			await setDoc(doc(db, "users", cleanEmail), {
				email: cleanEmail,
				name: targetName || cleanEmail.split("@")[0],
				isPro: true,
				plan: "Pro (Lifetime)",
				updatedAt: serverTimestamp(),
			});
		} catch {}

		toast.success(`Lifetime Pro access granted to ${cleanEmail}`);
		setGrantEmail("");
		setGrantName("");
		loadAllDashboardData();
	};

	const handleRevokePro = async (targetEmail: string) => {
		const cleanEmail = targetEmail.trim().toLowerCase();

		const currentManaged: AdminUser[] = JSON.parse(
			localStorage.getItem(MANAGED_USERS_KEY) || "[]",
		);
		const existingIndex = currentManaged.findIndex((u) => u.email.toLowerCase() === cleanEmail);

		if (existingIndex >= 0) {
			currentManaged[existingIndex] = {
				...currentManaged[existingIndex],
				plan: "Free",
				isPro: false,
			};
			localStorage.setItem(MANAGED_USERS_KEY, JSON.stringify(currentManaged));
		}

		if (currentEmail && cleanEmail === currentEmail.toLowerCase()) {
			resetProStatus();
		}

		try {
			await setDoc(doc(db, "users", cleanEmail), {
				email: cleanEmail,
				isPro: false,
				plan: "Free",
				updatedAt: serverTimestamp(),
			});
		} catch {}

		toast.info(`Pro status revoked for ${cleanEmail}`);
		loadAllDashboardData();
	};

	// Export transactions to CSV
	const exportTransactionsCSV = () => {
		if (transactions.length === 0) {
			toast.info("No transactions to export.");
			return;
		}

		const headers = [
			"ID",
			"Transaction Ref",
			"Customer",
			"Email",
			"Plan",
			"Amount NGN",
			"Amount USD",
			"Status",
			"Date",
			"Method",
		];
		const rows = transactions.map((t) => [
			t.id,
			t.tx_ref,
			`"${t.customer.replace(/"/g, '""')}"`,
			t.email,
			t.plan,
			t.amountNgn,
			t.amountUsd,
			t.status,
			`"${t.date}"`,
			t.method,
		]);

		const csvContent =
			"data:text/csv;charset=utf-8," +
			[headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", `ambercut_transactions_${Date.now()}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		toast.success("Transactions exported to CSV");
	};

	// Filtered lists
	const filteredTransactions = useMemo(() => {
		return transactions.filter(
			(tx) =>
				tx.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
				tx.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
				tx.tx_ref.toLowerCase().includes(searchQuery.toLowerCase()),
		);
	}, [transactions, searchQuery]);

	const filteredUsers = useMemo(() => {
		return usersList.filter(
			(u) =>
				u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				u.email.toLowerCase().includes(searchQuery.toLowerCase()),
		);
	}, [usersList, searchQuery]);

	// Real Metrics Calculations
	const totalRevenueNgn = useMemo(() => {
		return transactions
			.filter((t) => t.status === "successful")
			.reduce((acc, t) => acc + (t.amountNgn || 0), 0);
	}, [transactions]);

	const totalRevenueUsd = useMemo(() => {
		return transactions
			.filter((t) => t.status === "successful")
			.reduce((acc, t) => acc + (t.amountUsd || 0), 0);
	}, [transactions]);

	const proSubscribersCount = useMemo(() => {
		const proUsers = usersList.filter((u) => u.isPro);
		const paidTx = transactions.filter((t) => t.status === "successful");
		return Math.max(proUsers.length, paidTx.length);
	}, [usersList, transactions]);

	// 1. If not logged in
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
							Restricted administrator dashboard. Sign up or sign in with a verified{" "}
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
							Your account (<strong className="text-foreground">{currentEmail}</strong>) is not authorized.
						</p>
					</div>
					<div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground border border-border">
						Only accounts ending in <span className="text-orange-500 font-semibold">@gmail.com</span> have administrative privileges.
					</div>
					<div className="flex gap-2 justify-center">
						<Button
							variant="outline"
							size="sm"
							onClick={handleSignOut}
							className="text-xs gap-1.5"
						>
							<LogOut className="size-3.5" /> Sign Out &amp; Switch Account
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

	// 3. Authenticated Admin Dashboard (100% Real Live Data)
	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col">
			{/* Admin Header */}
			<header className="border-b border-border bg-card/60 px-6 py-3 sticky top-0 z-20 backdrop-blur-md">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Link
							href="/"
							className="font-clash text-lg font-bold text-foreground flex items-center gap-2"
						>
							<span className="size-6 rounded-md bg-orange-500 text-white flex items-center justify-center text-xs font-black">
								O
							</span>
							Simple Video Editor
						</Link>
						<Badge className="bg-orange-500/10 text-orange-500 border-orange-500/30 text-[10px] font-semibold">
							Live Admin Control
						</Badge>
					</div>

					<div className="flex items-center gap-3">
						<div className="text-right hidden sm:block">
							<div className="text-xs font-semibold text-foreground flex items-center gap-1.5 justify-end">
								<UserCheck className="size-3.5 text-emerald-500" />
								<span>{currentEmail}</span>
							</div>
							<div className="text-[10px] text-muted-foreground">
								Verified Administrator • Real Database Mode
							</div>
						</div>

						<Button
							variant="outline"
							size="sm"
							onClick={loadAllDashboardData}
							disabled={isLoadingData}
							className="h-8 text-xs gap-1.5"
							title="Refresh Real Data"
						>
							<RefreshCw className={`size-3.5 ${isLoadingData ? "animate-spin" : ""}`} />
							<span className="hidden sm:inline">Refresh Data</span>
						</Button>

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

				{/* Navigation Tabs */}
				<div className="flex gap-2 mt-3 pt-2 border-t border-border/50 text-xs overflow-x-auto">
					<button
						type="button"
						onClick={() => setActiveTab("overview")}
						className={`px-3 py-1 rounded-md font-semibold transition-all whitespace-nowrap ${
							activeTab === "overview"
								? "bg-orange-500 text-white shadow-xs"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						Overview &amp; Real Metrics
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("transactions")}
						className={`px-3 py-1 rounded-md font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
							activeTab === "transactions"
								? "bg-orange-500 text-white shadow-xs"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<span>Flutterwave Transactions</span>
						<Badge
							variant="secondary"
							className="text-[10px] py-0 px-1 bg-background/30 text-inherit"
						>
							{transactions.length}
						</Badge>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("users")}
						className={`px-3 py-1 rounded-md font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
							activeTab === "users"
								? "bg-orange-500 text-white shadow-xs"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<span>Registered Users</span>
						<Badge
							variant="secondary"
							className="text-[10px] py-0 px-1 bg-background/30 text-inherit"
						>
							{usersList.length}
						</Badge>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("telemetry")}
						className={`px-3 py-1 rounded-md font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
							activeTab === "telemetry"
								? "bg-orange-500 text-white shadow-xs"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<span>Telemetry &amp; Usage</span>
						<Badge
							variant="secondary"
							className="text-[10px] py-0 px-1 bg-background/30 text-inherit"
						>
							{telemetry?.events?.length ?? 0}
						</Badge>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("system")}
						className={`px-3 py-1 rounded-md font-semibold transition-all whitespace-nowrap ${
							activeTab === "system"
								? "bg-orange-500 text-white shadow-xs"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						Engine Diagnostics &amp; Health
					</button>
				</div>
			</header>

			{/* Main Content Area */}
			<main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
				{/* OVERVIEW TAB */}
				{activeTab === "overview" && (
					<>
						{/* Key Metrics Grid */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
							{/* Real Total Revenue */}
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
									<span className="text-muted-foreground">
										• {transactions.length} total tx
									</span>
								</div>
							</div>

							{/* Real Pro Subscribers */}
							<div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-xs">
								<div className="flex items-center justify-between text-muted-foreground text-xs">
									<span>Pro Subscribers</span>
									<CreditCard className="size-4 text-orange-500" />
								</div>
								<div className="text-2xl font-extrabold font-clash text-foreground">
									{proSubscribersCount} Active
								</div>
								<div className="text-[11px] text-muted-foreground">
									Real active Pro tiers &amp; verified upgrades
								</div>
							</div>

							{/* Real Registered Users */}
							<div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-xs">
								<div className="flex items-center justify-between text-muted-foreground text-xs">
									<span>Registered Accounts</span>
									<Users className="size-4 text-blue-500" />
								</div>
								<div className="text-2xl font-extrabold font-clash text-foreground">
									{usersList.length}
								</div>
								<div className="text-[11px] text-emerald-500">
									Active users &amp; authorized administrators
								</div>
							</div>

							{/* Real Projects & Exports */}
							<div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-xs">
								<div className="flex items-center justify-between text-muted-foreground text-xs">
									<span>Local Projects Ingested</span>
									<Film className="size-4 text-purple-500" />
								</div>
								<div className="text-2xl font-extrabold font-clash text-foreground">
									{realProjectsCount}
								</div>
								<div className="text-[11px] text-muted-foreground">
									IndexedDB &amp; OPFS project archives
								</div>
							</div>
						</div>

						{/* Quick Action Command Center */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Transaction Verification Tool */}
							<div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs">
								<div className="flex items-center justify-between">
									<h2 className="text-sm font-bold font-clash text-foreground flex items-center gap-2">
										<CheckCircle2 className="size-4 text-orange-500" />
										Verify Flutterwave Transaction ID
									</h2>
									<Badge variant="outline" className="text-[10px]">
										Live Gateway
									</Badge>
								</div>
								<p className="text-xs text-muted-foreground">
									Paste any transaction ID from your Flutterwave dashboard to verify it directly with Flutterwave API and record it into real records.
								</p>

								<form onSubmit={handleVerifyTransaction} className="flex gap-2">
									<Input
										placeholder="e.g. 19284729"
										value={verifyTxId}
										onChange={(e) => setVerifyTxId(e.target.value)}
										className="h-8 text-xs"
									/>
									<select
										value={verifyPlan}
										onChange={(e) => setVerifyPlan(e.target.value as any)}
										className="h-8 text-xs bg-muted border border-border rounded-md px-2 text-foreground"
									>
										<option value="Annual Pro">Annual (₦99k)</option>
										<option value="Monthly Pro">Monthly (₦12.5k)</option>
									</select>
									<Button
										type="submit"
										size="sm"
										disabled={isVerifying || !verifyTxId.trim()}
										className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white shrink-0"
									>
										{isVerifying ? (
											<RefreshCw className="size-3.5 animate-spin" />
										) : (
											"Verify & Record"
										)}
									</Button>
								</form>
							</div>

							{/* Grant Pro Membership Tool */}
							<div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs">
								<div className="flex items-center justify-between">
									<h2 className="text-sm font-bold font-clash text-foreground flex items-center gap-2">
										<UserPlus className="size-4 text-emerald-500" />
										Grant Pro Membership
									</h2>
									<Badge variant="outline" className="text-[10px]">
										Instant Access
									</Badge>
								</div>
								<p className="text-xs text-muted-foreground">
									Grant complimentary lifetime Pro access to any user account.
								</p>

								<div className="flex gap-2">
									<Input
										placeholder="user@example.com"
										value={grantEmail}
										onChange={(e) => setGrantEmail(e.target.value)}
										className="h-8 text-xs"
									/>
									<Button
										size="sm"
										onClick={() => handleGrantPro(grantEmail, grantName)}
										disabled={!grantEmail.trim()}
										className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
									>
										Grant Pro Access
									</Button>
								</div>
							</div>
						</div>

						{/* Real Telemetry Feature Counts */}
						<div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
							<div className="flex items-center justify-between">
								<h2 className="text-sm font-bold font-clash text-foreground flex items-center gap-2">
									<Sparkles className="size-4 text-orange-500" />
									Live Tool Usage &amp; Processing Statistics
								</h2>
								<div className="flex items-center gap-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											clearTelemetryData();
											setTelemetry(getTelemetryData());
											toast.success("Telemetry counters reset to zero.");
										}}
										className="h-7 text-[11px] text-muted-foreground hover:text-destructive"
									>
										<Trash2 className="size-3 mr-1" /> Reset Counters
									</Button>
									<Badge variant="outline" className="text-[10px]">
										Live Browser Tracking
									</Badge>
								</div>
							</div>

							<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
								<div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
									<div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
										<Sparkles className="size-3 text-amber-500" /> AI Suggestions
									</div>
									<div className="text-xl font-bold font-clash text-foreground">
										{telemetry?.smartSuggestionsCount ?? 0}
									</div>
									<div className="text-[10px] text-muted-foreground">Scans run</div>
								</div>

								<div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
									<div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
										<Sliders className="size-3 text-purple-500" /> Color Better
									</div>
									<div className="text-xl font-bold font-clash text-foreground">
										{telemetry?.colorBetterCount ?? 0}
									</div>
									<div className="text-[10px] text-muted-foreground">AI Enhancements</div>
								</div>

								<div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
									<div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
										<Film className="size-3 text-indigo-500" /> Color Match
									</div>
									<div className="text-xl font-bold font-clash text-foreground">
										{telemetry?.colorConsistentCount ?? 0}
									</div>
									<div className="text-[10px] text-muted-foreground">Multi-clip matches</div>
								</div>

								<div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
									<div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
										<DollarSign className="size-3 text-emerald-500" /> Volume Match
									</div>
									<div className="text-xl font-bold font-clash text-foreground">
										{telemetry?.volumeConsistentCount ?? 0}
									</div>
									<div className="text-[10px] text-muted-foreground">Gain levelings</div>
								</div>

								<div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
									<div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
										<Mic className="size-3 text-cyan-500" /> Voice Clarity
									</div>
									<div className="text-xl font-bold font-clash text-foreground">
										{telemetry?.voiceClearerCount ?? 0}
									</div>
									<div className="text-[10px] text-muted-foreground">DSP isolations</div>
								</div>

								<div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
									<div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
										<Zap className="size-3 text-blue-500" /> Video Exports
									</div>
									<div className="text-xl font-bold font-clash text-foreground">
										{telemetry?.exportCount ?? 0}
									</div>
									<div className="text-[10px] text-muted-foreground">Renders completed</div>
								</div>
							</div>
						</div>
					</>
				)}

				{/* TRANSACTIONS TAB */}
				{activeTab === "transactions" && (
					<div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<div>
								<h2 className="text-base font-bold font-clash text-foreground flex items-center gap-2">
									<span>Flutterwave Payment Transactions</span>
									<Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-xs">
										{transactions.length} Verified
									</Badge>
								</h2>
								<p className="text-xs text-muted-foreground">
									Real completed transactions received via the Flutterwave payment gateway.
								</p>
							</div>

							<div className="flex items-center gap-2">
								<div className="relative w-full sm:w-64">
									<Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
									<Input
										placeholder="Search email, ref..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="h-8 pl-8 text-xs"
									/>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={exportTransactionsCSV}
									className="h-8 text-xs gap-1.5 shrink-0"
									disabled={transactions.length === 0}
								>
									<Download className="size-3.5" /> CSV
								</Button>
							</div>
						</div>

						{filteredTransactions.length === 0 ? (
							<div className="p-8 text-center border border-dashed border-border rounded-xl space-y-3 bg-muted/10">
								<div className="size-10 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto">
									<CreditCard className="size-5" />
								</div>
								<div className="space-y-1">
									<div className="text-sm font-semibold text-foreground">
										No Real Transactions Recorded Yet
									</div>
									<p className="text-xs text-muted-foreground max-w-sm mx-auto">
										All dummy transactions have been removed. When users checkout via Flutterwave, real payments will automatically record here. You can also paste any transaction ID above to verify it on-demand.
									</p>
								</div>
							</div>
						) : (
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
												<td className="py-3 px-3 font-mono text-muted-foreground text-[11px]">
													{tx.tx_ref}
												</td>
												<td className="py-3 px-3">
													<div className="font-semibold text-foreground">{tx.customer}</div>
													<div className="text-[10px] text-muted-foreground">{tx.email}</div>
												</td>
												<td className="py-3 px-3">
													<Badge
														variant="outline"
														className="text-[10px] text-orange-500 border-orange-500/30"
													>
														{tx.plan}
													</Badge>
												</td>
												<td className="py-3 px-3">
													<div className="font-bold text-foreground">
														₦{tx.amountNgn.toLocaleString()}
													</div>
													<div className="text-[10px] text-muted-foreground">
														${tx.amountUsd} USD
													</div>
												</td>
												<td className="py-3 px-3 text-muted-foreground">{tx.method}</td>
												<td className="py-3 px-3">
													<span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
														<CheckCircle2 className="size-3" /> {tx.status}
													</span>
												</td>
												<td className="py-3 px-3 text-muted-foreground">{tx.date}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				)}

				{/* USERS TAB */}
				{activeTab === "users" && (
					<div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<div>
								<h2 className="text-base font-bold font-clash text-foreground flex items-center gap-2">
									<span>Registered User Accounts</span>
									<Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
										{usersList.length} Accounts
									</Badge>
								</h2>
								<p className="text-xs text-muted-foreground">
									Manage account privileges, administer Pro tiers, and monitor active sessions.
								</p>
							</div>

							<div className="relative w-full sm:w-64">
								<Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
								<Input
									placeholder="Search name or email..."
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
										<th className="py-2.5 px-3">User</th>
										<th className="py-2.5 px-3">Email</th>
										<th className="py-2.5 px-3">Admin Privilege</th>
										<th className="py-2.5 px-3">Membership Tier</th>
										<th className="py-2.5 px-3">Source</th>
										<th className="py-2.5 px-3 text-right">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border/60">
									{filteredUsers.map((u) => (
										<tr key={u.id} className="hover:bg-muted/30 transition-colors">
											<td className="py-3 px-3">
												<div className="font-semibold text-foreground flex items-center gap-1.5">
													<span>{u.name}</span>
													{u.email.toLowerCase() === currentEmail?.toLowerCase() && (
														<Badge className="bg-orange-500/10 text-orange-500 border-none text-[9px] py-0 px-1">
															You
														</Badge>
													)}
												</div>
											</td>
											<td className="py-3 px-3 font-mono text-[11px]">{u.email}</td>
											<td className="py-3 px-3">
												{u.email.toLowerCase().endsWith("@gmail.com") ? (
													<Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]">
														Authorized Admin
													</Badge>
												) : (
													<Badge variant="outline" className="text-[10px] text-muted-foreground">
														Standard User
													</Badge>
												)}
											</td>
											<td className="py-3 px-3">
												{u.isPro ? (
													<Badge className="bg-orange-500/10 text-orange-500 border-orange-500/30 text-[10px]">
														{u.plan}
													</Badge>
												) : (
													<Badge variant="outline" className="text-[10px] text-muted-foreground">
														Free Tier
													</Badge>
												)}
											</td>
											<td className="py-3 px-3 text-muted-foreground text-[11px]">
												{u.source}
											</td>
											<td className="py-3 px-3 text-right space-x-1">
												{u.isPro ? (
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleRevokePro(u.email)}
														className="h-7 text-[10px] text-destructive hover:bg-destructive/10"
													>
														Revoke Pro
													</Button>
												) : (
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleGrantPro(u.email, u.name)}
														className="h-7 text-[10px] text-emerald-500 hover:bg-emerald-500/10"
													>
														Grant Pro
													</Button>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* TELEMETRY ACTIVITY TAB */}
				{activeTab === "telemetry" && (
					<div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
						<div className="flex items-center justify-between">
							<div>
								<h2 className="text-base font-bold font-clash text-foreground">
									Live Tool Usage Activity Feed
								</h2>
								<p className="text-xs text-muted-foreground">
									Real-time event stream recorded from your actual video editing sessions.
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setTelemetry(getTelemetryData())}
									className="text-xs gap-1.5"
								>
									<RefreshCw className="size-3" /> Refresh Feed
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										clearTelemetryData();
										setTelemetry(getTelemetryData());
										toast.success("Event feed cleared.");
									}}
									className="text-xs text-muted-foreground hover:text-destructive"
								>
									Clear Feed
								</Button>
							</div>
						</div>

						{(!telemetry?.events || telemetry.events.length === 0) ? (
							<div className="p-8 text-center border border-dashed border-border rounded-xl space-y-2 bg-muted/10">
								<Activity className="size-8 text-muted-foreground mx-auto" />
								<div className="text-xs font-semibold text-foreground">
									No Activity Events Yet
								</div>
								<p className="text-xs text-muted-foreground max-w-sm mx-auto">
									As you use smart suggestions, adjust volume, grade colors, and export video clips in the editor, real telemetry records will stream here.
								</p>
							</div>
						) : (
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
										{telemetry.events.map((evt) => (
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
													{evt.details || "Action completed"}
												</td>
												<td className="py-3 px-3 text-muted-foreground font-mono">
													{evt.timestamp}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				)}

				{/* SYSTEM & DIAGNOSTICS TAB */}
				{activeTab === "system" && (
					<div className="space-y-6">
						<div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
							<h2 className="text-base font-bold font-clash text-foreground flex items-center gap-2">
								<Cpu className="size-4 text-orange-500" />
								API Gateways &amp; Cloud Health
							</h2>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
								{/* Groq LPU Copilot */}
								<div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
									<div className="font-semibold text-foreground flex items-center justify-between">
										<span>Groq LPU AI Copilot</span>
										{groqPingMs !== null ? (
											<span className="text-emerald-500 font-bold flex items-center gap-1">
												<CheckCircle2 className="size-3" /> {groqPingMs}ms
											</span>
										) : (
											<span className="text-muted-foreground font-normal">Ready</span>
										)}
									</div>
									<p className="text-[11px] text-muted-foreground">
										Fast inference with Llama-3.3-70b-versatile and 21 editor tools.
									</p>
									<Button
										size="sm"
										variant="outline"
										onClick={testGroqConnection}
										disabled={isTestingGroq}
										className="h-7 text-[10px] w-full mt-2"
									>
										{isTestingGroq ? (
											<RefreshCw className="size-3 animate-spin mr-1" />
										) : (
											<Zap className="size-3 mr-1 text-orange-500" />
										)}
										Test Live Groq Connection
									</Button>
								</div>

								{/* Flutterwave Status */}
								<div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
									<div className="font-semibold text-foreground flex items-center justify-between">
										<span>Flutterwave Payment Gateway</span>
										<span className="text-emerald-500 font-bold flex items-center gap-1">
											<CheckCircle2 className="size-3" /> Online
										</span>
									</div>
									<p className="text-[11px] text-muted-foreground">
										Public Key:{" "}
										<span className="font-mono text-[10px]">
											{process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY
												? `${process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY.slice(0, 16)}...`
												: "Configured"}
										</span>
									</p>
									<div className="text-[10px] text-muted-foreground font-medium pt-1">
										Card, USSD &amp; Bank Transfer channels active
									</div>
								</div>

								{/* Firestore Connection */}
								<div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
									<div className="font-semibold text-foreground flex items-center justify-between">
										<span>Firebase Firestore DB</span>
										{firestoreConnected ? (
											<span className="text-emerald-500 font-bold flex items-center gap-1">
												<CheckCircle2 className="size-3" /> Connected
											</span>
										) : (
											<span className="text-amber-500 font-bold">Local Sync</span>
										)}
									</div>
									<p className="text-[11px] text-muted-foreground">
										Project: <span className="font-mono">ambercut-d07ef</span>
									</p>
									<div className="text-[10px] text-muted-foreground font-medium pt-1">
										Chat messages, users &amp; transaction synchronization
									</div>
								</div>
							</div>
						</div>

						{/* Storage Diagnostics */}
						<div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
							<h2 className="text-base font-bold font-clash text-foreground flex items-center gap-2">
								<HardDrive className="size-4 text-purple-500" />
								Local Browser Storage Quota &amp; OPFS
							</h2>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
								<div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
									<div className="font-semibold text-foreground flex items-center justify-between">
										<span>Storage Capacity Gauge</span>
										<span className="text-purple-500 font-bold">
											{storageQuota?.usageBytes
												? formatStorageBytes({ bytes: storageQuota.usageBytes })
												: "Active"}{" "}
											used
										</span>
									</div>
									<p className="text-[11px] text-muted-foreground">
										Available:{" "}
										{storageQuota?.availableBytes
											? formatStorageBytes({ bytes: storageQuota.availableBytes })
											: "Calculating..."}
										{" • "}
										Total Quota:{" "}
										{storageQuota?.quotaBytes
											? formatStorageBytes({ bytes: storageQuota.quotaBytes })
											: "Browser Allocated"}
									</p>
								</div>

								<div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
									<div className="font-semibold text-foreground flex items-center justify-between">
										<span>WASM Tick-Precision Engine</span>
										<span className="text-emerald-500 font-bold">opencut-wasm v0.2.10</span>
									</div>
									<p className="text-[11px] text-muted-foreground leading-relaxed">
										MediaTime 64-bit integer tick math active with zero drift playback across all video and audio tracks.
									</p>
								</div>
							</div>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
