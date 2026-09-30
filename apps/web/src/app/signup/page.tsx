"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DEFAULT_LOGO_URL } from "@/site/brand";
import { Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

function SignupForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const redirectUrl = searchParams.get("redirect") || "/projects";

	const { signUpWithEmail, signInWithGoogle, isAuthenticated, isLoading: isAuthLoading } = useAuth();

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// If already authenticated and done loading, redirect
	React.useEffect(() => {
		if (isAuthenticated && !isAuthLoading) {
			router.replace(redirectUrl);
		}
	}, [isAuthenticated, isAuthLoading, redirectUrl, router]);

	const handleEmailSignUp = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMessage(null);

		if (!email.trim() || !password) {
			setErrorMessage("Please enter an email and password.");
			return;
		}

		if (password.length < 6) {
			setErrorMessage("Password must be at least 6 characters long.");
			return;
		}

		setIsLoading(true);
		try {
			const res = await signUpWithEmail(name, email, password);
			if (res.success) {
				toast.success("Account created successfully! Welcome to AmberCut.");
				router.replace(redirectUrl);
			} else {
				setErrorMessage(res.error || "Failed to create account. Please try again.");
				toast.error(res.error || "Failed to create account.");
			}
		} catch (err: any) {
			setErrorMessage(err.message || "An unexpected error occurred during signup.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleSignUp = async () => {
		setErrorMessage(null);
		setIsGoogleLoading(true);
		try {
			const res = await signInWithGoogle();
			if (res.success) {
				toast.success("Signed up with Google! Welcome to AmberCut.");
				router.replace(redirectUrl);
			} else {
				setErrorMessage(res.error || "Google registration could not be completed.");
				toast.error(res.error || "Google sign-up failed.");
			}
		} catch (err: any) {
			setErrorMessage(err.message || "Google signup error.");
			toast.error(err.message || "Google signup error.");
		} finally {
			setIsGoogleLoading(false);
		}
	};

	return (
		<div className="w-full max-w-md rounded-2xl border-2 border-dashed border-border/90 bg-card/90 p-8 shadow-none backdrop-blur-xl transition-all">
			{/* Brand Header */}
			<div className="text-center space-y-2 mb-6">
				<Link href="/" className="inline-flex items-center gap-2.5">
					<Image
						src={DEFAULT_LOGO_URL}
						alt="AmberCut"
						width={36}
						height={36}
						className="rounded-lg shadow-sm"
					/>
					<span className="font-bold font-clash text-xl tracking-tight text-foreground">
						AmberCut
					</span>
				</Link>
				<h1 className="text-2xl font-bold font-clash text-foreground tracking-tight pt-2">
					Create Your Account
				</h1>
				<p className="text-xs text-muted-foreground">
					Sign up to start creating projects with CapCut-style AI tools
				</p>
			</div>

			{/* Error Alert */}
			{errorMessage && (
				<div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
					{errorMessage}
				</div>
			)}

			{/* Continue with Google */}
			<Button
				type="button"
				variant="outline"
				onClick={handleGoogleSignUp}
				disabled={isGoogleLoading || isLoading}
				className="w-full h-11 border-border/80 bg-background hover:bg-muted font-medium text-xs rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs"
			>
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
				<span>{isGoogleLoading ? "Connecting Google..." : "Continue with Google"}</span>
			</Button>

			{/* Divider */}
			<div className="relative my-6 flex items-center justify-center">
				<div className="absolute inset-0 flex items-center">
					<div className="w-full border-t border-border/60" />
				</div>
				<div className="relative bg-card px-3 text-[11px] text-muted-foreground uppercase font-medium">
					or sign up with email
				</div>
			</div>

			{/* Email / Password Form */}
			<form onSubmit={handleEmailSignUp} className="space-y-4">
				<div className="space-y-1.5 text-left">
					<Label htmlFor="name" className="text-xs font-semibold text-foreground">
						Full Name
					</Label>
					<Input
						id="name"
						type="text"
						placeholder="Jane Doe"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="h-10 text-xs rounded-xl bg-background border-border/80 focus:border-orange-500"
					/>
				</div>

				<div className="space-y-1.5 text-left">
					<Label htmlFor="email" className="text-xs font-semibold text-foreground">
						Email Address
					</Label>
					<Input
						id="email"
						type="email"
						placeholder="name@example.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						className="h-10 text-xs rounded-xl bg-background border-border/80 focus:border-orange-500"
					/>
				</div>

				<div className="space-y-1.5 text-left">
					<Label htmlFor="password" className="text-xs font-semibold text-foreground">
						Password (min. 6 characters)
					</Label>
					<div className="relative">
						<Input
							id="password"
							type={showPassword ? "text" : "password"}
							placeholder="Create a strong password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={6}
							className="h-10 pr-10 text-xs rounded-xl bg-background border-border/80 focus:border-orange-500"
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0"
							aria-label="Toggle password visibility"
						>
							{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
						</button>
					</div>
				</div>

				<Button
					type="submit"
					disabled={isLoading || isGoogleLoading}
					className="w-full h-11 mt-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
				>
					{isLoading ? "Creating account..." : "Create Free Account"}
					<ArrowRight className="size-3.5 ml-1.5" />
				</Button>
			</form>

			{/* Switch to Login */}
			<div className="mt-6 text-center text-xs text-muted-foreground">
				Already have an account?{" "}
				<Link
					href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
					className="font-semibold text-orange-500 hover:text-orange-600 transition-colors"
				>
					Sign in here
				</Link>
			</div>
		</div>
	);
}

export default function SignupPage() {
	return (
		<div className="relative min-h-screen w-screen flex flex-col items-center justify-center p-4 bg-background overflow-hidden">
			{/* Ambient background glows */}
			<div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-orange-500/20 via-amber-500/15 to-orange-600/20 blur-3xl opacity-75" />
			<div className="pointer-events-none absolute bottom-0 left-0 -z-10 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

			<Suspense
				fallback={
					<div className="w-full max-w-md rounded-2xl border-2 border-dashed border-border/90 bg-card p-8 text-center text-xs text-muted-foreground">
						Loading registration...
					</div>
				}
			>
				<SignupForm />
			</Suspense>

			{/* Security reassurance */}
			<div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
				<ShieldCheck className="size-3.5 text-orange-500" />
				<span>No credit card required • Unlimited free timeline edits</span>
			</div>
		</div>
	);
}
