"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "./ui/button";
import { ArrowRight, ShieldCheck, Film, Crown, LogOut } from "lucide-react";
import { Badge } from "./ui/badge";
import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import {
	Copy01Icon,
	Download01Icon,
	GithubIcon,
	LinkSquare02Icon,
	Menu02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/utils/ui";
import { DEFAULT_LOGO_URL, SITE_URL } from "@/site/brand";
import { SOCIAL_LINKS } from "@/site/social";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "./ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "@/auth/auth-context";

const ADMIN_EMAILS = ["belloimam431@gmail.com"];

export function Header() {
	const { user, isAuthenticated, signOut } = useAuth();
	const isAdmin = user?.email
		? ADMIN_EMAILS.includes(user.email.trim().toLowerCase())
		: false;
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const closeMenu = () => setIsMenuOpen(false);

	const links = [
		{
			label: "Features",
			href: "/#features",
		},
		{
			label: "AI Tools",
			href: "/#ai-agent",
		},
		{
			label: "Pricing",
			href: "/#pricing",
		},
		{
			label: "FAQ",
			href: "/#faq",
		},
	];

	return (
		<header className="bg-background shadow-background/85 sticky top-0 z-10 shadow-[0_30px_35px_15px_rgba(0,0,0,1)]">
			<div className="relative flex w-full items-center justify-between px-6 pt-4">
				<div className="relative z-10 flex items-center gap-6">
					<ContextMenu>
						<ContextMenuTrigger asChild>
							<Link href="/" className="flex items-center gap-3">
								<Image
									src={DEFAULT_LOGO_URL}
									alt="AmberCut Logo"
									className="rounded-lg shadow-sm"
									width={32}
									height={32}
								/>
								<span className="font-bold font-clash text-base tracking-tight text-foreground hidden sm:inline-block">
									AmberCut
								</span>
							</Link>
						</ContextMenuTrigger>
						<ContextMenuContent>
							<ContextMenuItem
								onClick={async () => {
									const res = await fetch(DEFAULT_LOGO_URL);
									const svg = await res.text();
									await navigator.clipboard.writeText(svg);
								}}
							>
								<HugeiconsIcon icon={Copy01Icon} />
								Copy SVG
							</ContextMenuItem>
							<ContextMenuItem
								onClick={() => {
									const a = document.createElement("a");
									a.href = DEFAULT_LOGO_URL;
									a.download = "opencut-logo.svg";
									a.click();
								}}
							>
								<HugeiconsIcon icon={Download01Icon} />
								Download SVG
							</ContextMenuItem>
							<Link href="/brand">
								<ContextMenuItem>
									<HugeiconsIcon icon={LinkSquare02Icon} />
									Brand assets
								</ContextMenuItem>
							</Link>
						</ContextMenuContent>
					</ContextMenu>

					<nav className="hidden items-center gap-5 md:flex">
						{links.map((link) => (
							<Link key={link.href} href={link.href}>
								<Button variant="text" className="p-0 text-xs font-semibold text-muted-foreground hover:text-foreground">
									{link.label}
								</Button>
							</Link>
						))}
					</nav>
				</div>

				<div className="relative z-10">
					<div className="flex items-center gap-3 md:hidden">
						<Button
							variant="text"
							size="icon"
							className="flex items-center justify-center p-0"
							onClick={() => setIsMenuOpen(!isMenuOpen)}
						>
							<HugeiconsIcon icon={Menu02Icon} size={30} />
						</Button>
					</div>
					<div className="hidden items-center gap-3 md:flex">
						<Link href="/#pricing">
							<Button variant="outline" className="text-xs font-semibold border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10">
								Upgrade Pro
							</Button>
						</Link>

						{isAuthenticated && user ? (
							<>
								<Link href="/projects">
									<Button className="text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-xs">
										Open Workspace
										<ArrowRight className="size-3.5 ml-1" />
									</Button>
								</Link>

								<ThemeToggle />

								{/* Square User Profile Icon with Border Radius */}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<button
											type="button"
											className="relative flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted/60 overflow-hidden hover:border-orange-500/60 hover:ring-2 hover:ring-orange-500/20 transition-all cursor-pointer shadow-xs focus:outline-none"
											aria-label="Account profile"
										>
											{user.image ? (
												<img
													src={user.image}
													alt={user.name || "User"}
													className="size-full object-cover rounded-lg"
													referrerPolicy="no-referrer"
												/>
											) : (
												<div className="size-full rounded-lg bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 text-white font-bold flex items-center justify-center text-xs uppercase shadow-xs">
													{user.name ? user.name[0] : user.email[0]}
												</div>
											)}
										</button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl border border-border/80">
										<div className="px-2.5 py-2 border-b border-border/60 mb-1 flex items-center gap-2.5">
											<div className="size-8 rounded-lg overflow-hidden border border-border/60 shrink-0 bg-muted">
												{user.image ? (
													<img
														src={user.image}
														alt={user.name || "User"}
														className="size-full object-cover rounded-lg"
														referrerPolicy="no-referrer"
													/>
												) : (
													<div className="size-full rounded-lg bg-orange-500 text-white font-bold flex items-center justify-center text-xs uppercase">
														{user.name ? user.name[0] : user.email[0]}
													</div>
												)}
											</div>
											<div className="min-w-0 flex-1">
												<div className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
													<span>{user.name || "Video Creator"}</span>
													{isAdmin && (
														<Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 text-[9px] px-1 py-0 font-semibold uppercase">
															Admin
														</Badge>
													)}
												</div>
												<div className="text-[10px] text-muted-foreground truncate font-normal">
													{user.email}
												</div>
											</div>
										</div>

										{/* Admin Portal link for belloimam431@gmail.com */}
										{isAdmin && (
											<Link href="/admin">
												<DropdownMenuItem className="text-xs font-semibold text-orange-600 dark:text-orange-400 focus:bg-orange-500/10 cursor-pointer flex items-center gap-2">
													<ShieldCheck className="size-3.5 text-orange-500" />
													<span>Admin Portal</span>
												</DropdownMenuItem>
											</Link>
										)}

										<Link href="/projects">
											<DropdownMenuItem className="text-xs cursor-pointer flex items-center gap-2">
												<Film className="size-3.5 text-muted-foreground" />
												<span>My Video Projects</span>
											</DropdownMenuItem>
										</Link>

										<Link href="/#pricing">
											<DropdownMenuItem className="text-xs cursor-pointer flex items-center gap-2">
												<Crown className="size-3.5 text-amber-500" />
												<span>Subscription &amp; Plans</span>
											</DropdownMenuItem>
										</Link>

										<DropdownMenuItem
											onClick={signOut}
											className="text-xs text-red-500 focus:text-red-600 cursor-pointer font-medium flex items-center gap-2 mt-1 border-t border-border/40 pt-1.5"
										>
											<LogOut className="size-3.5" />
											<span>Sign Out</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</>
						) : (
							<>
								<Link href="/login">
									<Button variant="ghost" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
										Sign In
									</Button>
								</Link>
								<Link href="/signup">
									<Button className="text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-xs">
										Start Creating Free
										<ArrowRight className="size-3.5 ml-1" />
									</Button>
								</Link>
								<ThemeToggle />
							</>
						)}
					</div>
				</div>
				<div
					className={cn(
						"bg-background/20 pointer-events-none fixed inset-0 opacity-0 backdrop-blur-3xl",
						"transition-opacity duration-150",
						isMenuOpen && "pointer-events-auto opacity-100",
					)}
				>
					<div className="relative h-full">
						<button
							type="button"
							aria-label="Close menu"
							className="absolute inset-0"
							onClick={closeMenu}
							onKeyDown={(event) => {
								if (
									event.key === "Enter" ||
									event.key === " " ||
									event.key === "Escape"
								) {
									event.preventDefault();
									closeMenu();
								}
							}}
						/>
						<nav className="flex flex-col gap-3 px-6 pt-[5rem]">
							{links.map((link, index) => (
								<motion.div
									key={link.href}
									initial={{ scale: 0.98, opacity: 0 }}
									animate={{
										scale: isMenuOpen ? 1 : 0.98,
										opacity: isMenuOpen ? 1 : 0,
									}}
									transition={{
										duration: 0.4,
										delay: isMenuOpen ? index * 0.1 : 0,
										ease: [0.25, 0.46, 0.45, 0.94],
									}}
								>
									<Link
										href={link.href}
										className="text-2xl font-semibold"
										onClick={() => setIsMenuOpen(false)}
									>
										{link.label}
									</Link>
								</motion.div>
							))}

							<div className="pt-4 border-t border-border/60 flex flex-col gap-3">
								{isAuthenticated && user ? (
									<>
										{isAdmin && (
											<Link
												href="/admin"
												className="text-lg font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-2"
												onClick={closeMenu}
											>
												<ShieldCheck className="size-5 text-orange-500" />
												<span>Admin Portal</span>
											</Link>
										)}
										<Link
											href="/projects"
											className="text-lg font-semibold text-foreground"
											onClick={closeMenu}
										>
											My Video Projects
										</Link>
										<button
											type="button"
											className="text-left text-sm text-red-500 font-medium cursor-pointer"
											onClick={() => {
												signOut();
												closeMenu();
											}}
										>
											Sign Out ({user.email})
										</button>
									</>
								) : (
									<>
										<Link
											href="/login"
											className="text-lg font-semibold text-foreground"
											onClick={closeMenu}
										>
											Sign In
										</Link>
										<Link
											href="/signup"
											className="text-lg font-semibold text-orange-500"
											onClick={closeMenu}
										>
											Create Free Account
										</Link>
									</>
								)}
							</div>
						</nav>
						<ThemeToggle
							className="absolute right-8 bottom-8 size-10"
							iconClassName="!size-[1.2rem]"
							onToggle={(e) => {
								e.preventDefault();
								e.stopPropagation();
							}}
						/>
					</div>
				</div>
			</div>
		</header>
	);
}
