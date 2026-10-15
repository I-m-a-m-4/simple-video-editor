"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/auth-context";
import { isUserAdmin, useProStore } from "@/stores/pro-store";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
	LogOut,
	ShieldCheck,
	Film,
	Crown,
	User,
	Sparkles,
	MoreVertical,
	ChevronDown,
} from "lucide-react";

interface UserProfileMenuProps {
	variant?: "avatar" | "card";
	align?: "start" | "end" | "center";
	className?: string;
	onAction?: () => void;
}

export function UserProfileMenu({
	variant = "avatar",
	align = "end",
	className = "",
	onAction,
}: UserProfileMenuProps) {
	const { user, isAuthenticated, signOut } = useAuth();
	const { isPro, openModal: openProModal } = useProStore();
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);

	if (!isAuthenticated || !user) {
		return (
			<Link href="/login" onClick={onAction}>
				<button
					type="button"
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-xs transition-all cursor-pointer"
				>
					<User className="size-3.5" />
					<span>Sign In</span>
				</button>
			</Link>
		);
	}

	const isAdmin = isUserAdmin(user.email);
	const displayName = user.name || (user.email ? user.email.split("@")[0] : "Creator");

	const getInitials = (name?: string, email?: string) => {
		if (name?.trim()) {
			const parts = name.trim().split(/\s+/);
			if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
			return name.slice(0, 2).toUpperCase();
		}
		if (email?.trim()) return email.slice(0, 2).toUpperCase();
		return "CR";
	};

	const userInitials = getInitials(user.name, user.email);

	const handleSignOut = async () => {
		try {
			onAction?.();
			setIsOpen(false);
			await signOut();
			toast.success("Logged out successfully");
			router.push("/login");
		} catch (error) {
			console.error("Signout error:", error);
			toast.error("Failed to log out. Please try again.");
		}
	};

	const avatarElement = user.image ? (
		<Image
			src={user.image}
			alt={displayName}
			width={36}
			height={36}
			className="size-full rounded-full object-cover"
			referrerPolicy="no-referrer"
			unoptimized
		/>
	) : (
		<div className="size-full rounded-full bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-xs">
			{userInitials}
		</div>
	);

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				{variant === "card" ? (
					<button
						type="button"
						className={`w-full p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-2.5 hover:border-orange-500/40 hover:bg-muted/60 transition-all cursor-pointer group text-left focus:outline-none focus:ring-1 focus:ring-orange-500/30 ${className}`}
						aria-label="Account menu"
					>
						<div className="flex items-center gap-2.5 min-w-0">
							<div className="relative size-8 rounded-full shrink-0 ring-1 ring-orange-500/30 group-hover:ring-orange-500/60 transition-all">
								{avatarElement}
								<div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
							</div>
							<div className="flex flex-col min-w-0">
								<span className="text-xs font-semibold truncate text-foreground group-hover:text-orange-500 transition-colors">
									{displayName}
								</span>
								<span className="text-[10px] text-muted-foreground truncate">
									{isPro ? "Pro Member" : "Free Creator"}
								</span>
							</div>
						</div>
						<div className="flex items-center gap-1.5 shrink-0">
							{isPro ? (
								<Badge className="bg-emerald-500/15 text-emerald-500 border-none font-bold text-[9px] px-1.5 py-0">
									PRO
								</Badge>
							) : null}
							<ChevronDown className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
						</div>
					</button>
				) : (
					<button
						type="button"
						className={`relative flex size-8 shrink-0 items-center justify-center rounded-full border border-border/80 bg-muted/60 hover:border-orange-500/60 hover:ring-2 hover:ring-orange-500/20 transition-all cursor-pointer shadow-xs focus:outline-none ${className}`}
						aria-label="Account profile and logout menu"
					>
						{avatarElement}
						<div className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
					</button>
				)}
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align={align}
				sideOffset={6}
				className="w-64 p-1.5 shadow-2xl border border-border/80 bg-popover/95 backdrop-blur-md rounded-xl z-[200]"
			>
				{/* Header User Profile Info */}
				<div className="p-2.5 border-b border-border/60 mb-1 flex items-center gap-3">
					<div className="size-9 rounded-full shrink-0 overflow-hidden ring-1 ring-orange-500/40">
						{avatarElement}
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
							<span>{displayName}</span>
							{isAdmin && (
								<Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-none text-[9px] px-1 py-0 font-bold uppercase">
									Admin
								</Badge>
							)}
						</div>
						<div className="text-[11px] text-muted-foreground truncate font-mono">
							{user.email}
						</div>
						<div className="mt-1 flex items-center gap-1">
							{isPro ? (
								<span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.2 rounded">
									<Crown className="size-2.5" /> Pro Member
								</span>
							) : (
								<span className="text-[10px] text-muted-foreground">
									Free Plan
								</span>
							)}
						</div>
					</div>
				</div>

				{/* Admin Portal Link */}
				{isAdmin && (
					<Link href="/admin" onClick={() => { onAction?.(); setIsOpen(false); }}>
						<DropdownMenuItem className="text-xs font-semibold text-orange-600 dark:text-orange-400 focus:bg-orange-500/10 cursor-pointer flex items-center gap-2.5 py-2 rounded-lg">
							<ShieldCheck className="size-4 text-orange-500" />
							<span>Admin Portal</span>
						</DropdownMenuItem>
					</Link>
				)}

				{/* Workspace Projects Link */}
				<Link href="/projects" onClick={() => { onAction?.(); setIsOpen(false); }}>
					<DropdownMenuItem className="text-xs cursor-pointer flex items-center gap-2.5 py-2 rounded-lg">
						<Film className="size-4 text-muted-foreground" />
						<span>My Video Projects</span>
					</DropdownMenuItem>
				</Link>

				{/* Pro Upgrade / Subscription */}
				<DropdownMenuItem
					onClick={() => {
						onAction?.();
						setIsOpen(false);
						openProModal();
					}}
					className="text-xs cursor-pointer flex items-center gap-2.5 py-2 rounded-lg"
				>
					<Crown className="size-4 text-amber-500" />
					<span>{isPro ? "Manage Subscription" : "Upgrade to Pro"}</span>
				</DropdownMenuItem>

				<DropdownMenuSeparator className="my-1 bg-border/60" />

				{/* Prominent Log Out Option */}
				<DropdownMenuItem
					onClick={handleSignOut}
					className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 focus:bg-red-500/10 focus:text-red-600 cursor-pointer font-semibold flex items-center gap-2.5 py-2 rounded-lg"
				>
					<LogOut className="size-4 text-red-500" />
					<span>Log Out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
