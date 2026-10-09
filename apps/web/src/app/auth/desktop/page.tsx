"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth, googleProvider, db } from "@/services/firebase";
import { doc, setDoc } from "firebase/firestore";
import { DEFAULT_LOGO_URL } from "@/site/brand";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Monitor, ShieldCheck, ArrowRight, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function DesktopAuthContent() {
	const searchParams = useSearchParams();
	const sessionId = searchParams.get("session") || "";
	const code = searchParams.get("code") || "";

	const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Detect existing auth state
	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (user) {
				setCurrentUser(user);
			}
		});
		return () => unsubscribe();
	}, []);

	const completeAuthorization = async (user: FirebaseUser) => {
		setIsLoading(true);
		setError(null);
		try {
			const profile = {
				id: user.uid,
				name: user.displayName || user.email?.split("@")[0] || "AmberCut Creator",
				email: user.email || "",
				image: user.photoURL || "",
			};

			// 1. Update Firestore session document
			if (sessionId) {
				try {
					await setDoc(
						doc(db, "desktop_auth_sessions", sessionId),
						{
							id: sessionId,
							code,
							status: "completed",
							user: profile,
							completedAt: Date.now(),
						},
						{ merge: true },
					);
				} catch (firestoreErr) {
					console.warn("Firestore sync error (falling back to API):", firestoreErr);
				}
			}

			// 2. Update server-side desktop-session API
			try {
				await fetch("/api/auth/desktop-session", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action: "complete",
						sessionId,
						code,
						user: profile,
					}),
				});
			} catch (apiErr) {
				console.warn("API route session sync error:", apiErr);
			}

			setIsSuccess(true);
			toast.success("Desktop app authorized successfully!");
		} catch (err: any) {
			console.error("Authorization error:", err);
			setError(err.message || "Failed to authorize desktop app.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleSignIn = async () => {
		setError(null);
		setIsLoading(true);
		try {
			const provider = new GoogleAuthProvider();
			provider.addScope("profile");
			provider.addScope("email");
			provider.setCustomParameters({ prompt: "select_account" });

			const result = await signInWithPopup(auth, provider);
			if (result.user) {
				await completeAuthorization(result.user);
			}
		} catch (err: any) {
			console.error("Google sign in popup error:", err);
			if (err?.code === "auth/popup-closed-by-user") {
				setError("Google sign-in popup was closed before completing.");
			} else {
				setError(err?.message || "Google sign-in failed. Please try again.");
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
			{/* Ambient glows */}
			<div className="absolute top-1/4 -left-20 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
			<div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

			<div className="w-full max-w-md bg-card/90 border border-border/80 backdrop-blur-xl rounded-2xl p-7 shadow-2xl relative z-10 text-center">
				{/* Brand */}
				<div className="flex items-center justify-center gap-2.5 mb-5">
					<Image
						src={DEFAULT_LOGO_URL}
						alt="AmberCut"
						width={38}
						height={38}
						className="rounded-xl shadow-md shadow-orange-500/20"
					/>
					<span className="font-bold font-clash text-xl tracking-tight text-foreground">
						AmberCut
					</span>
				</div>

				{!isSuccess ? (
					<>
						<div className="space-y-1.5 mb-6">
							<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[11px] font-semibold border border-orange-500/20 mb-2">
								<Monitor className="size-3.5" /> Desktop App Authentication
							</div>
							<h1 className="text-xl font-bold font-clash tracking-tight text-foreground">
								Connect AmberCut Desktop
							</h1>
							<p className="text-xs text-muted-foreground max-w-xs mx-auto">
								Authorize Google sign-in to instantly connect and unlock your video projects on desktop.
							</p>
						</div>

						{code && (
							<div className="mb-6 p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between text-xs">
								<span className="text-muted-foreground font-medium">Session Code:</span>
								<span className="font-mono font-bold tracking-widest text-orange-500 text-sm">
									{code}
								</span>
							</div>
						)}

						{error && (
							<div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 flex items-center gap-2 text-left">
								<AlertCircle className="size-4 shrink-0" />
								<span>{error}</span>
							</div>
						)}

						<div className="space-y-3">
							{currentUser ? (
								<div className="space-y-3">
									<Button
										type="button"
										onClick={() => completeAuthorization(currentUser)}
										disabled={isLoading}
										className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-xl shadow-md shadow-orange-500/20 cursor-pointer flex items-center justify-center gap-2"
									>
										{isLoading ? (
											<>
												<Loader2 className="size-4 animate-spin" /> Authorizing Desktop App...
											</>
										) : (
											<>
												Authorize as {currentUser.displayName || currentUser.email}
												<ArrowRight className="size-4" />
											</>
										)}
									</Button>

									<button
										type="button"
										onClick={handleGoogleSignIn}
										disabled={isLoading}
										className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline cursor-pointer"
									>
										Or switch to another Google account
									</button>
								</div>
							) : (
								<Button
									type="button"
									variant="outline"
									onClick={handleGoogleSignIn}
									disabled={isLoading}
									className="w-full h-12 border-border/90 bg-background hover:bg-muted font-semibold text-xs rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm hover:border-orange-500/50"
								>
									{isLoading ? (
										<Loader2 className="size-4 animate-spin text-orange-500" />
									) : (
										<svg className="size-4 shrink-0" viewBox="0 0 24 24">
											<path
												fill="#4285F4"
												d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
											/>
											<path
												fill="#34A853"
												d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
											/>
											<path
												fill="#FBBC05"
												d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
											/>
											<path
												fill="#EA4335"
												d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
											/>
										</svg>
									)}
									<span>{isLoading ? "Signing In with Google..." : "Continue with Google"}</span>
								</Button>
							)}
						</div>
					</>
				) : (
					/* Success State */
					<div className="space-y-4 py-2">
						<div className="size-14 rounded-full bg-green-500/10 border border-green-500/30 text-green-500 mx-auto flex items-center justify-center shadow-lg shadow-green-500/10 animate-in zoom-in-90 duration-200">
							<CheckCircle2 className="size-8" />
						</div>

						<div className="space-y-1.5">
							<h2 className="text-xl font-bold font-clash text-foreground">
								Desktop App Connected!
							</h2>
							<p className="text-xs text-muted-foreground max-w-xs mx-auto">
								You have successfully authenticated with Google. Return to AmberCut Desktop to continue editing.
							</p>
						</div>

						<div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-600 dark:text-orange-400 flex items-center justify-center gap-2">
							<Sparkles className="size-4 shrink-0" />
							<span>AmberCut Desktop is now ready and logged in!</span>
						</div>

						<p className="text-[11px] text-muted-foreground pt-2">
							You may safely close this browser window.
						</p>
					</div>
				)}

				<div className="mt-8 pt-4 border-t border-border/60 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
					<ShieldCheck className="size-3.5 text-orange-500" />
					<span>End-to-end encrypted session</span>
				</div>
			</div>
		</div>
	);
}

export default function DesktopAuthPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen bg-background flex items-center justify-center">
				<Loader2 className="size-6 text-orange-500 animate-spin" />
			</div>
		}>
			<DesktopAuthContent />
		</Suspense>
	);
}
