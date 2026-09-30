"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./auth-context";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { DEFAULT_LOGO_URL } from "@/site/brand";

interface AuthGuardProps {
	children: React.ReactNode;
	fallbackMessage?: string;
}

export function AuthGuard({
	children,
	fallbackMessage = "You must be signed in to create and edit video projects.",
}: AuthGuardProps) {
	const { isAuthenticated, isLoading } = useAuth();
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			const redirectParam = encodeURIComponent(pathname || "/projects");
			router.replace(`/login?redirect=${redirectParam}`);
		}
	}, [isAuthenticated, isLoading, router, pathname]);

	if (isLoading) {
		return (
			<div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground">
				<div className="flex flex-col items-center gap-4">
					<div className="relative flex size-12 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20">
						<Image
							src={DEFAULT_LOGO_URL}
							alt="AmberCut"
							width={28}
							height={28}
							className="rounded-md animate-pulse"
						/>
					</div>
					<div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
						<span className="size-2 rounded-full bg-orange-500 animate-ping" />
						<span>Verifying workspace session...</span>
					</div>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		const redirectUrl = `/login?redirect=${encodeURIComponent(pathname || "/projects")}`;
		return (
			<div className="flex h-screen w-screen flex-col items-center justify-center bg-background px-4 text-center">
				<div className="w-full max-w-md rounded-2xl border-2 border-dashed border-border/90 bg-card/80 p-8 shadow-none backdrop-blur-xl">
					<div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 mb-5">
						<Lock className="size-7" />
					</div>

					<h2 className="text-2xl font-bold font-clash text-foreground tracking-tight">
						Sign In Required
					</h2>
					<p className="mt-2 text-xs text-muted-foreground leading-relaxed">
						{fallbackMessage}
					</p>

					<div className="mt-6 flex flex-col gap-3">
						<Link href={redirectUrl} className="w-full">
							<Button className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-md">
								Sign In to AmberCut
								<ArrowRight className="size-4 ml-1.5" />
							</Button>
						</Link>

						<Link href={`/signup?redirect=${encodeURIComponent(pathname || "/projects")}`} className="w-full">
							<Button variant="outline" className="w-full h-10 text-xs font-medium">
								Create a Free Account
							</Button>
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
