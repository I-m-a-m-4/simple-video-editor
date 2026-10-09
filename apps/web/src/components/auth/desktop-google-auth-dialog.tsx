"use client";

import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, type UserProfile } from "@/auth/auth-context";
import { isDesktopApp, openInExternalBrowser, getAuthBaseUrl } from "@/utils/desktop";
import { doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { toast } from "sonner";
import {
	ExternalLink,
	Copy,
	Check,
	RotateCw,
	Loader2,
	CheckCircle2,
	ShieldCheck,
	Globe,
	Sparkles,
} from "lucide-react";

interface DesktopGoogleAuthDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

export function DesktopGoogleAuthDialog({
	isOpen,
	onOpenChange,
	onSuccess,
}: DesktopGoogleAuthDialogProps) {
	const { completeExternalSignIn } = useAuth();

	const [sessionId, setSessionId] = useState<string>("");
	const [verificationCode, setVerificationCode] = useState<string>("");
	const [authUrl, setAuthUrl] = useState<string>("");
	const [status, setStatus] = useState<"launching" | "waiting" | "completed" | "error">("launching");
	const [manualCode, setManualCode] = useState<string>("");
	const [isCopied, setIsCopied] = useState<boolean>(false);
	const [isVerifyingManual, setIsVerifyingManual] = useState<boolean>(false);

	const pollingRef = useRef<NodeJS.Timeout | null>(null);
	const unsubscribeFirestoreRef = useRef<(() => void) | null>(null);

	// Start desktop auth session when dialog opens
	useEffect(() => {
		if (!isOpen) {
			cleanup();
			return;
		}

		initiateSession();

		return () => {
			cleanup();
		};
	}, [isOpen]);

	const cleanup = () => {
		if (pollingRef.current) {
			clearInterval(pollingRef.current);
			pollingRef.current = null;
		}
		if (unsubscribeFirestoreRef.current) {
			unsubscribeFirestoreRef.current();
			unsubscribeFirestoreRef.current = null;
		}
	};

	const initiateSession = async () => {
		setStatus("launching");
		cleanup();

		// Generate unique session ID & 6-digit numeric verification code
		const newSessionId = `desk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		const code = Math.floor(100000 + Math.random() * 900000).toString();
		const baseUrl = getAuthBaseUrl();
		const targetUrl = `${baseUrl}/auth/desktop?session=${newSessionId}&code=${code}`;

		setSessionId(newSessionId);
		setVerificationCode(code);
		setAuthUrl(targetUrl);

		// 1. Create session document in Firestore
		try {
			await setDoc(
				doc(db, "desktop_auth_sessions", newSessionId),
				{
					id: newSessionId,
					code,
					status: "pending",
					createdAt: Date.now(),
				},
				{ merge: true },
			);
		} catch (err) {
			console.warn("Firestore session init warning (will use API fallback):", err);
		}

		// 2. Register session in API route
		try {
			await fetch("/api/auth/desktop-session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "create",
					sessionId: newSessionId,
					code,
				}),
			});
		} catch (err) {
			console.warn("API route session init warning:", err);
		}

		// 3. Open user's default browser
		await openInExternalBrowser(targetUrl);
		setStatus("waiting");

		// 4. Start Realtime Firestore Listener
		try {
			const unsub = onSnapshot(
				doc(db, "desktop_auth_sessions", newSessionId),
				(snapshot) => {
					if (snapshot.exists()) {
						const data = snapshot.data();
						if (data?.status === "completed" && data?.user) {
							handleSuccessfulAuth(data.user, newSessionId);
						}
					}
				},
				(err) => {
					console.warn("Firestore onSnapshot error:", err);
				},
			);
			unsubscribeFirestoreRef.current = unsub;
		} catch (e) {
			console.warn("Could not bind Firestore listener:", e);
		}

		// 5. Start Polling Fallback (every 1.5 seconds)
		pollingRef.current = setInterval(async () => {
			try {
				const res = await fetch(`/api/auth/desktop-session?session=${newSessionId}`);
				if (res.ok) {
					const data = await res.json();
					if (data?.status === "completed" && data?.user) {
						handleSuccessfulAuth(data.user, newSessionId);
					}
				}
			} catch {}
		}, 1500);
	};

	const handleSuccessfulAuth = (user: UserProfile, sessId: string) => {
		cleanup();
		setStatus("completed");

		// Complete session in context
		completeExternalSignIn(user);
		toast.success(`Welcome back, ${user.name || "Creator"}!`);

		// Clean up Firestore doc in background
		try {
			deleteDoc(doc(db, "desktop_auth_sessions", sessId)).catch(() => {});
		} catch {}

		setTimeout(() => {
			onOpenChange(false);
			onSuccess?.();
		}, 1200);
	};

	const handleReopenBrowser = async () => {
		if (!authUrl) return;
		toast.info("Opening browser...");
		await openInExternalBrowser(authUrl);
	};

	const handleCopyLink = () => {
		if (!authUrl) return;
		navigator.clipboard.writeText(authUrl);
		setIsCopied(true);
		toast.success("Sign-in link copied to clipboard!");
		setTimeout(() => setIsCopied(false), 2500);
	};

	const handleVerifyManualCode = async (e: React.FormEvent) => {
		e.preventDefault();
		const cleanCode = manualCode.trim();
		if (!cleanCode) return;

		setIsVerifyingManual(true);
		try {
			const res = await fetch(`/api/auth/desktop-session?code=${cleanCode}`);
			if (res.ok) {
				const data = await res.json();
				if (data?.status === "completed" && data?.user) {
					handleSuccessfulAuth(data.user, sessionId);
					return;
				}
			}
			toast.error("Session not yet authorized in browser. Please complete Google sign-in in the open tab.");
		} catch {
			toast.error("Verification failed. Please ensure you finished sign-in in your browser.");
		} finally {
			setIsVerifyingManual(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] sm:max-w-md bg-card border-border text-foreground p-0 overflow-hidden shadow-2xl rounded-2xl">
				{/* Header */}
				<div className="p-6 border-b border-border/80 bg-muted/20 text-center relative">
					<div className="size-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center mx-auto mb-3 shadow-sm">
						{status === "completed" ? (
							<CheckCircle2 className="size-6 text-green-500" />
						) : (
							<Globe className="size-6 text-orange-500" />
						)}
					</div>
					<DialogTitle className="text-lg font-bold font-clash text-foreground">
						{status === "completed" ? "Successfully Signed In!" : "Google Sign-In via Browser"}
					</DialogTitle>
					<DialogDescription className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
						{status === "completed"
							? "Your desktop session has been verified and authorized."
							: "Google requires signing in through your default system browser for security."}
					</DialogDescription>
				</div>

				{/* Body */}
				<div className="p-6 space-y-5">
					{status === "completed" ? (
						<div className="text-center py-4 space-y-3">
							<div className="size-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto">
								<Check className="size-5" />
							</div>
							<p className="text-sm font-semibold text-foreground">
								Connecting to AmberCut Desktop...
							</p>
						</div>
					) : (
						<>
							{/* Status Card */}
							<div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Loader2 className="size-4 text-orange-500 animate-spin" />
										<span className="text-xs font-semibold text-foreground">
											Waiting for browser sign-in...
										</span>
									</div>
									<span className="text-[11px] font-mono font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-md">
										{verificationCode}
									</span>
								</div>
								<p className="text-[11px] text-muted-foreground leading-relaxed">
									A tab was opened in your web browser. Click <strong>Continue with Google</strong> to grant access to AmberCut Desktop.
								</p>
							</div>

							{/* Actions: Re-open browser or copy link */}
							<div className="grid grid-cols-2 gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleReopenBrowser}
									className="text-xs h-9 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer hover:border-orange-500/50"
								>
									<ExternalLink className="size-3.5 text-orange-500" />
									Re-open Browser
								</Button>

								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleCopyLink}
									className="text-xs h-9 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer hover:border-orange-500/50"
								>
									{isCopied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
									{isCopied ? "Copied!" : "Copy Link"}
								</Button>
							</div>

							{/* Manual Check */}
							<form onSubmit={handleVerifyManualCode} className="pt-2 border-t border-border/60 space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-[11px] text-muted-foreground">Finished in browser?</span>
									<button
										type="submit"
										disabled={isVerifyingManual}
										className="text-[11px] font-semibold text-orange-500 hover:underline cursor-pointer flex items-center gap-1"
									>
										{isVerifyingManual ? (
											<Loader2 className="size-3 animate-spin" />
										) : (
											<RotateCw className="size-3" />
										)}
										Check Status Now
									</button>
								</div>
							</form>
						</>
					)}
				</div>

				{/* Footer */}
				<div className="p-4 bg-muted/20 border-t border-border/80 flex items-center justify-between text-[11px] text-muted-foreground">
					<div className="flex items-center gap-1.5">
						<ShieldCheck className="size-3.5 text-orange-500" />
						<span>Secure token sync</span>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => onOpenChange(false)}
						className="text-xs h-7 px-2.5 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
					>
						Cancel
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
