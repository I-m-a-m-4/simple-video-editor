"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { MigrationDialog } from "@/project/components/migration-dialog";
import { StoragePersistenceDialog } from "@/services/storage/components/storage-persistence-dialog";
import { AuthGuard } from "@/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useEditor } from "@/editor/use-editor";
import { useProjectsStore } from "./store";
import type {
	TProjectMetadata,
	TProjectSortKey,
	TProjectSortOption,
} from "@/project/types";
import { formatMediaDuration } from "@/utils/duration";
import { formatDate } from "@/utils/date";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteProjectDialog } from "@/project/components/delete-project-dialog";
import { ProjectInfoDialog } from "@/project/components/project-info-dialog";
import { RenameProjectDialog } from "@/project/components/rename-project-dialog";
import { ChangelogNotification } from "@/changelog/components/changelog-notification";
import { ScreenRecorderModal } from "@/components/recorder/screen-recorder-modal";
import { TextToSpeechModal } from "@/components/tts/tts-modal";
import { CreateProjectModal, type ProjectMode } from "@/project/components/create-project-modal";
import { VideoToShortsModal } from "@/components/shorts/video-to-shorts-modal";
import { ProUpgradeModal } from "@/components/editor/pro-upgrade-modal";
import { useProStore } from "@/stores/pro-store";
import { useAuth } from "@/auth/auth-context";
import {
	Plus,
	Video,
	Monitor,
	Mic,
	Volume2,
	Sparkles,
	Wand2,
	Scissors,
	ImageIcon,
	Globe,
	MessageSquare,
	Shirt,
	Search,
	LayoutGrid,
	List,
	ArrowUpDown,
	MoreVertical,
	Copy,
	Trash2,
	Edit2,
	Info,
	Play,
	Crown,
	Home,
	LayoutTemplate,
	HardDrive,
	FolderPlus,
	ChevronRight,
	Sun,
	Moon,
} from "lucide-react";

const formatProjectDuration = formatMediaDuration;

const SORT_LABELS: Record<TProjectSortKey, string> = {
	createdAt: "Created",
	updatedAt: "Modified",
	name: "Name",
	duration: "Duration",
};

export default function ProjectsPage() {
	const { searchQuery, sortKey, sortOrder, viewMode } = useProjectsStore();
	const editor = useEditor();
	const router = useRouter();
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const sortOption: TProjectSortOption = `${sortKey}-${sortOrder}`;

	const isLoading = useEditor((e) => e.project.getIsLoading());
	const isInitialized = useEditor((e) => e.project.getIsInitialized());
	const projectsToDisplay = useEditor((e) =>
		e.project.getFilteredAndSortedProjects({ searchQuery, sortOption }),
	);

	// Modals for CapCut features & project creation
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [createModalMode, setCreateModalMode] = useState<ProjectMode>("standard");
	const [createModalInitialName, setCreateModalInitialName] = useState("New Project");
	const [isShortsModalOpen, setIsShortsModalOpen] = useState(false);
	const [isRecorderOpen, setIsRecorderOpen] = useState(false);
	const [isTtsOpen, setIsTtsOpen] = useState(false);

	const { user } = useAuth();
	const { isPro, openModal: openProModal } = useProStore();

	const openCreateProject = (mode: ProjectMode = "standard", initialName = "New Project") => {
		setCreateModalMode(mode);
		setCreateModalInitialName(initialName);
		setIsCreateModalOpen(true);
	};

	const handleCreateNewProject = () => {
		openCreateProject("standard", "New Project");
	};

	const displayName = user?.name || (user?.email ? user.email.split("@")[0] : "Creator");
	const getInitials = (name?: string, email?: string) => {
		if (name?.trim()) {
			const parts = name.trim().split(/\s+/);
			if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
			return name.slice(0, 2).toUpperCase();
		}
		if (email?.trim()) return email.slice(0, 2).toUpperCase();
		return "CR";
	};
	const userInitials = getInitials(user?.name, user?.email);

	useEffect(() => {
		setMounted(true);
		if (!editor.project.getIsInitialized()) {
			editor.project.loadAllProjects();
		}
	}, [editor.project]);

	const toggleTheme = () => {
		setTheme(theme === "dark" ? "light" : "dark");
	};

	return (
		<AuthGuard fallbackMessage="Please sign in or create an account to view and create video projects.">
			<div className="min-h-screen bg-background text-foreground flex transition-colors duration-200">
				<MigrationDialog />
				<StoragePersistenceDialog />
				<ChangelogNotification />

				{/* Feature Modals */}
				<CreateProjectModal
					isOpen={isCreateModalOpen}
					onOpenChange={setIsCreateModalOpen}
					initialMode={createModalMode}
					initialName={createModalInitialName}
				/>
				<VideoToShortsModal
					isOpen={isShortsModalOpen}
					onOpenChange={setIsShortsModalOpen}
				/>
				<ScreenRecorderModal
					isOpen={isRecorderOpen}
					onOpenChange={setIsRecorderOpen}
				/>
				<TextToSpeechModal
					isOpen={isTtsOpen}
					onOpenChange={setIsTtsOpen}
				/>
				<ProUpgradeModal />

				{/* Left Sidebar (Orange Brand & Adaptive Theme) */}
				<aside className="w-60 bg-card border-r border-border flex flex-col shrink-0 min-h-screen p-4 justify-between hidden md:flex">
					<div className="flex flex-col gap-5">
						{/* Brand & User Profile Card */}
						<div className="flex flex-col gap-3">
							<Link href="/" className="flex items-center gap-2.5 px-1.5 cursor-pointer">
								<div className="size-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-orange-500/20">
									AC
								</div>
								<span className="font-bold text-base tracking-tight cursor-pointer">
									AmberCut
								</span>
							</Link>

							{/* User Pro Card */}
							<div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-2 mt-1 hover:border-orange-500/30 transition-colors">
								<div className="flex items-center gap-2.5 min-w-0">
									{user?.image ? (
										<Image
											src={user.image}
											alt={displayName}
											width={32}
											height={32}
											className="size-8 rounded-full object-cover ring-1 ring-orange-500/30 shrink-0"
										/>
									) : (
										<div className="size-8 rounded-full bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm shadow-orange-500/20">
											{userInitials}
										</div>
									)}
									<div className="flex flex-col min-w-0">
										<span className="text-xs font-semibold truncate text-foreground">
											{displayName}
										</span>
										<span className="text-[10px] text-muted-foreground truncate">
											{isPro ? "Pro Member" : "Free Creator"}
										</span>
									</div>
								</div>
								<button
									type="button"
									onClick={openProModal}
									className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs flex items-center gap-1 shrink-0 cursor-pointer transition-all ${
										isPro
											? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border border-emerald-500/30"
											: "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
									}`}
								>
									<Crown className="size-3" />
									{isPro ? "PRO" : "Upgrade"}
								</button>
							</div>
						</div>

						{/* Navigation Groups */}
						<div className="flex flex-col gap-4">
							{/* Video Editing */}
							<div className="flex flex-col gap-1">
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2.5">
									Video editing
								</span>
								<Link
									href="/projects"
									className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold text-xs transition-colors cursor-pointer"
								>
									<Home className="size-4 text-orange-500" />
									<span>Home</span>
								</Link>
								<button
									type="button"
									onClick={() => toast.info("Templates coming soon!")}
									className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-muted-foreground font-medium text-xs hover:bg-muted hover:text-foreground transition-colors text-left cursor-pointer"
								>
									<LayoutTemplate className="size-4" />
									<span>Templates</span>
								</button>
							</div>

							{/* AI Tools Hub */}
							<div className="flex flex-col gap-1">
								<div className="flex items-center justify-between px-2.5">
									<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
										AI Tools
									</span>
									<span className="text-[9px] bg-orange-500/15 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded font-bold">
										NEW
									</span>
								</div>

								{/* Screen Recorder Trigger */}
								<button
									type="button"
									onClick={() => setIsRecorderOpen(true)}
									className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-foreground/80 font-medium text-xs hover:bg-muted hover:text-foreground transition-colors group text-left cursor-pointer"
								>
									<div className="flex items-center gap-2.5">
										<Monitor className="size-4 text-orange-500 group-hover:scale-105 transition-transform" />
										<span>Record Screen</span>
									</div>
									<Badge className="bg-red-500/15 text-red-500 text-[9px] h-4 px-1 font-semibold border-none rounded">
										PiP
									</Badge>
								</button>

								{/* Text to Speech Trigger */}
								<button
									type="button"
									onClick={() => setIsTtsOpen(true)}
									className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-foreground/80 font-medium text-xs hover:bg-muted hover:text-foreground transition-colors group text-left cursor-pointer"
								>
									<div className="flex items-center gap-2.5">
										<Volume2 className="size-4 text-amber-500 group-hover:scale-105 transition-transform" />
										<span>Text to Speech</span>
									</div>
									<Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 text-[9px] h-4 px-1 font-semibold border-none rounded">
										AI
									</Badge>
								</button>

								<button
									type="button"
									onClick={() => setIsShortsModalOpen(true)}
									className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-foreground/80 font-medium text-xs hover:bg-muted hover:text-foreground transition-colors group text-left cursor-pointer"
								>
									<Scissors className="size-4 text-orange-500 group-hover:scale-105 transition-transform" />
									<span>Video to Shorts</span>
								</button>

								<button
									type="button"
									onClick={() =>
										toast.info("Select audio file in the editor to run voice separation.")
									}
									className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-muted-foreground font-medium text-xs hover:bg-muted hover:text-foreground transition-colors text-left cursor-pointer"
								>
									<Mic className="size-4" />
									<span>Voice Separation</span>
								</button>
							</div>
						</div>
					</div>

					{/* Bottom Sidebar Promos & Theme Toggle */}
					<div className="flex flex-col gap-2.5">
						{/* Theme Toggle Button */}
						<div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
							<span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
								{mounted && theme === "dark" ? (
									<Moon className="size-3.5 text-orange-400" />
								) : (
									<Sun className="size-3.5 text-amber-500" />
								)}
								<span>{mounted && theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
							</span>
							<Button
								variant="ghost"
								size="sm"
								onClick={toggleTheme}
								className="h-6 px-2 text-[10px] font-semibold text-foreground hover:bg-background rounded cursor-pointer"
							>
								Switch
							</Button>
						</div>

						{/* AmberCut Pro Subscription Card */}
						<div className="p-3.5 rounded-xl bg-gradient-to-br from-orange-500/15 via-amber-500/5 to-transparent border border-orange-500/25 flex flex-col gap-2 relative overflow-hidden group shadow-xs">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1.5">
									<div className="size-6 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center">
										<Sparkles className="size-3.5" />
									</div>
									<span className="text-xs font-bold text-foreground">AmberCut Pro</span>
								</div>
								<Badge className="bg-orange-500 text-white text-[9px] h-4 px-1.5 font-bold border-none rounded">
									{isPro ? "ACTIVE" : "PRO"}
								</Badge>
							</div>
							<p className="text-[11px] text-muted-foreground leading-relaxed">
								{isPro
									? "You have full access to 4K 60fps exports, AI captions & cloud sync."
									: "Upgrade for 4K 60fps exports, AI captions, voice separation & unlimited cloud sync."}
							</p>
							<Button
								size="sm"
								onClick={openProModal}
								className="w-full h-7 text-[11px] font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs rounded-lg cursor-pointer"
							>
								{isPro ? "Manage Subscription" : "Upgrade to Pro"}
							</Button>
						</div>

						<div className="flex items-center justify-between px-1.5 text-[10px] text-muted-foreground">
							<span className="flex items-center gap-1.5">
								<HardDrive className="size-3 text-orange-500" />
								Device Storage
							</span>
							<span className="text-emerald-500 font-medium">Ready</span>
						</div>
					</div>
				</aside>

				{/* Main Content Dashboard */}
				<div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
					{/* Top Header Bar with Theme Switcher */}
					<header className="sticky top-0 z-20 px-6 py-3 bg-background/90 backdrop-blur-md border-b border-border flex items-center justify-between gap-4">
						<div className="flex items-center gap-2 text-xs">
							<span className="font-semibold text-foreground">Home</span>
							<span className="text-muted-foreground/40">/</span>
							<span className="text-muted-foreground">Projects</span>
						</div>

						<div className="flex items-center gap-3">
							<div className="relative w-56 md:w-72">
								<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
								<Input
									placeholder="Search projects..."
									value={searchQuery}
									onChange={(e) =>
										useProjectsStore.getState().setSearchQuery({
											query: e.target.value,
										})
									}
									className="bg-muted/40 border-border pl-8 h-8 text-xs rounded-lg text-foreground placeholder:text-muted-foreground focus-visible:ring-orange-500"
								/>
							</div>

							{/* Theme Switcher in Header */}
							<Button
								variant="outline"
								size="icon"
								onClick={toggleTheme}
								className="size-8 rounded-lg border-border text-foreground hover:bg-muted"
								aria-label="Toggle theme"
							>
								{mounted && theme === "dark" ? (
									<Sun className="size-3.5 text-amber-400" />
								) : (
									<Moon className="size-3.5 text-orange-500" />
								)}
							</Button>

							<Button
								onClick={handleCreateNewProject}
								size="sm"
								className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs h-8 px-3.5 rounded-lg shadow-sm gap-1.5"
							>
								<Plus className="size-3.5" />
								New Project
							</Button>
						</div>
					</header>

					{/* Dashboard Body */}
					<main className="p-5 md:p-8 lg:p-10 flex flex-col gap-7 max-w-[1700px] mx-auto w-full">
						{/* 1. Brand Orange Hero Banner & Spotlight Card (Reduced Radius) */}
						<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
							{/* Large Glowing Orange Hero Banner */}
							<div
								onClick={() => openCreateProject("standard", "New Project")}
								className="lg:col-span-3 relative h-44 md:h-48 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-6 flex flex-col justify-center items-center text-center cursor-pointer shadow-lg shadow-orange-500/15 overflow-hidden group hover:opacity-95 transition-all"
							>
								<div className="absolute inset-0 bg-radial from-white/20 to-transparent pointer-events-none" />

								<div className="relative z-10 flex flex-col items-center gap-2.5">
									<div className="size-12 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
										<Plus className="size-7 stroke-[2.5]" />
									</div>
									<h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
										Create project
									</h2>
									<p className="text-xs text-white/90 font-medium max-w-md">
										Full-featured timeline with GPU shaders, 4K composition, and zero lag.
									</p>
								</div>
							</div>

							{/* Side Spotlight Card */}
							<div
								onClick={() => setIsRecorderOpen(true)}
								className="h-44 md:h-48 rounded-xl bg-card border border-border p-4 flex flex-col justify-between cursor-pointer hover:border-orange-500/50 transition-all group shadow-xs"
							>
								<div className="flex items-start justify-between">
									<Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-none font-semibold text-[10px] rounded-md">
										SMART RECORDER
									</Badge>
									<div className="size-7 rounded-full bg-muted flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
										<ChevronRight className="size-3.5" />
									</div>
								</div>

								<div className="flex flex-col gap-1">
									<h3 className="text-sm font-bold text-foreground group-hover:text-orange-500 transition-colors">
										Screen + Webcam PiP
									</h3>
									<p className="text-[11px] text-muted-foreground leading-relaxed">
										Record launch demos with camera bubble and dynamic zoom focus.
									</p>
								</div>

								<Button
									size="sm"
									variant="outline"
									className="border-border text-foreground hover:bg-muted text-xs h-7 rounded-lg w-full"
								>
									Launch Studio
								</Button>
							</div>
						</div>

						{/* 2. Quick Action Tools Row */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
							{/* AI Video Maker */}
							<div
								onClick={() => openCreateProject("ai-video", "AI Video Assembly")}
								className="p-3.5 rounded-lg bg-card border border-border hover:border-orange-500/40 cursor-pointer flex items-center justify-between group transition-all shadow-xs"
							>
								<div className="flex items-center gap-3">
									<div className="size-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 group-hover:scale-105 transition-transform">
										<Wand2 className="size-4.5" />
									</div>
									<div className="flex flex-col">
										<div className="flex items-center gap-1.5">
											<span className="text-xs font-semibold text-foreground">
												AI video maker
											</span>
											<span className="text-[9px] bg-orange-500/15 text-orange-600 dark:text-orange-400 px-1 py-0.2 rounded font-bold">
												AI
											</span>
										</div>
										<span className="text-[11px] text-muted-foreground">
											Assemble and cut video clips automatically
										</span>
									</div>
								</div>
								<ChevronRight className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
							</div>

							{/* Record Screen */}
							<div
								onClick={() => setIsRecorderOpen(true)}
								className="p-3.5 rounded-lg bg-card border border-border hover:border-orange-500/40 cursor-pointer flex items-center justify-between group transition-all shadow-xs"
							>
								<div className="flex items-center gap-3">
									<div className="size-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 group-hover:scale-105 transition-transform">
										<Monitor className="size-4.5" />
									</div>
									<div className="flex flex-col">
										<div className="flex items-center gap-1.5">
											<span className="text-xs font-semibold text-foreground">
												Record screen
											</span>
											<span className="text-[9px] bg-red-500/15 text-red-500 px-1 py-0.2 rounded font-bold">
												HOT
											</span>
										</div>
										<span className="text-[11px] text-muted-foreground">
											Picture-in-picture camera + launch zoom
										</span>
									</div>
								</div>
								<ChevronRight className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
							</div>
						</div>

						{/* 3. "More Tools" Strip */}
						<div className="flex flex-col gap-2.5">
							<h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
								More tools
							</h3>

							<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
								{[
									{
										id: "shorts",
										title: "Long to shorts",
										icon: Scissors,
										badge: "AI",
										color: "bg-orange-500/10 text-orange-500",
										action: () => setIsShortsModalOpen(true),
									},
									{
										id: "aivideo",
										title: "AI video",
										icon: Video,
										badge: "AI",
										color: "bg-amber-500/10 text-amber-500",
										action: () => openCreateProject("ai-video", "AI Cinematic Reel"),
									},
									{
										id: "aiimage",
										title: "AI image",
										icon: ImageIcon,
										badge: "AI",
										color: "bg-rose-500/10 text-rose-500",
										action: () => openCreateProject("ai-image", "AI Image Showcase"),
									},
									{
										id: "translator",
										title: "Video translator",
										icon: Globe,
										badge: "AI",
										color: "bg-emerald-500/10 text-emerald-500",
										action: () =>
											toast.info(
												"Open video in editor to run AI subtitles & translation.",
											),
									},
									{
										id: "dialogue",
										title: "AI dialogue",
										icon: MessageSquare,
										badge: "AI",
										color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
										action: () => setIsTtsOpen(true),
									},
									{
										id: "fashion",
										title: "AI model",
										icon: Shirt,
										badge: "AI",
										color: "bg-purple-500/10 text-purple-500",
										action: () => openCreateProject("ai-model", "AI Fashion Showcase"),
									},
									{
										id: "tts",
										title: "Text to speech",
										icon: Volume2,
										badge: "AI",
										color: "bg-orange-500/10 text-orange-500",
										action: () => setIsTtsOpen(true),
									},
								].map((tool) => {
									const Icon = tool.icon;
									return (
										<div
											key={tool.id}
											onClick={tool.action}
											className="p-3 rounded-lg bg-card border border-border hover:border-orange-500/40 cursor-pointer flex flex-col items-center text-center gap-1.5 group transition-all shadow-xs"
										>
											<div className="relative">
												<div
													className={`size-9 rounded-lg ${tool.color} flex items-center justify-center group-hover:scale-105 transition-transform`}
												>
													<Icon className="size-4.5" />
												</div>
												<span className="absolute -top-1 -right-1 text-[8px] bg-orange-500/20 text-orange-600 dark:text-orange-400 px-1 rounded font-bold border border-orange-500/20">
													{tool.badge}
												</span>
											</div>
											<span className="text-[11px] font-medium text-foreground line-clamp-1 group-hover:text-orange-500">
												{tool.title}
											</span>
										</div>
									);
								})}
							</div>
						</div>

						{/* 4. Projects Section */}
						<div className="flex flex-col gap-3.5 mt-1">
							{/* Toolbar */}
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
								<div className="flex items-center gap-2">
									<h2 className="text-base font-bold text-foreground">Projects</h2>
									<Badge className="bg-muted text-muted-foreground border-none text-[11px] rounded-md px-1.5 py-0.2">
										{projectsToDisplay.length}
									</Badge>
								</div>

								<div className="flex items-center gap-2">
									{/* Sort dropdown */}
									<SortDropdown>
										<Button
											variant="outline"
											size="sm"
											className="border-border text-foreground hover:bg-muted text-xs h-7 px-2.5 rounded-lg gap-1.5"
										>
											<ArrowUpDown className="size-3 text-orange-500" />
											<span>Sort: {SORT_LABELS[sortKey]}</span>
										</Button>
									</SortDropdown>

									{/* View mode toggle */}
									<div className="flex items-center bg-muted/50 border border-border rounded-lg p-0.5">
										<button
											type="button"
											onClick={() =>
												useProjectsStore.getState().setViewMode({
													viewMode: "grid",
												})
											}
											className={`p-1 rounded-md ${
												viewMode === "grid"
													? "bg-background text-foreground shadow-xs"
													: "text-muted-foreground hover:text-foreground"
											}`}
											aria-label="Grid view"
										>
											<LayoutGrid className="size-3.5" />
										</button>
										<button
											type="button"
											onClick={() =>
												useProjectsStore.getState().setViewMode({
													viewMode: "list",
												})
											}
											className={`p-1 rounded-md ${
												viewMode === "list"
													? "bg-background text-foreground shadow-xs"
													: "text-muted-foreground hover:text-foreground"
											}`}
											aria-label="List view"
										>
											<List className="size-3.5" />
										</button>
									</div>
								</div>
							</div>

							{/* Projects List/Grid Display */}
							{isLoading || !isInitialized ? (
								<ProjectsSkeleton />
							) : projectsToDisplay.length === 0 ? (
								<EmptyState onCreateNew={handleCreateNewProject} />
							) : (
								<div
									className={
										viewMode === "grid"
											? "grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
											: "flex flex-col gap-2"
									}
								>
									{projectsToDisplay.map((project) => (
										<ProjectItem
											key={project.id}
											project={project}
											allProjectIds={projectsToDisplay.map((p) => p.id)}
										/>
									))}
								</div>
							)}
						</div>
					</main>
				</div>
			</div>
		</AuthGuard>
	);
}

function SortDropdown({ children }: { children: React.ReactNode }) {
	const { sortKey, setSortKey } = useProjectsStore();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
			<DropdownMenuContent className="w-44 bg-card border-border text-foreground" align="end">
				<DropdownMenuCheckboxItem
					checked={sortKey === "createdAt"}
					onCheckedChange={() => setSortKey({ sortKey: "createdAt" })}
				>
					Created
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={sortKey === "updatedAt"}
					onCheckedChange={() => setSortKey({ sortKey: "updatedAt" })}
				>
					Modified
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={sortKey === "name"}
					onCheckedChange={() => setSortKey({ sortKey: "name" })}
				>
					Name
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={sortKey === "duration"}
					onCheckedChange={() => setSortKey({ sortKey: "duration" })}
				>
					Duration
				</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function ProjectItem({
	project,
	allProjectIds,
}: {
	project: TProjectMetadata;
	allProjectIds: string[];
}) {
	const {
		selectedProjectIds,
		viewMode,
		setProjectSelected,
		selectProjectRange,
	} = useProjectsStore();
	const selectedProjectIdSet = new Set(selectedProjectIds);
	const isSelected = selectedProjectIdSet.has(project.id);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
	const editor = useEditor();
	const durationLabel = formatProjectDuration({ duration: project.duration });
	const isGridView = viewMode === "grid";

	const handleRename = () => setIsRenameDialogOpen(true);
	const handleDuplicate = async () => {
		await editor.project.duplicateProjects({ ids: [project.id] });
		toast.success("Project duplicated!");
	};
	const handleDeleteClick = () => setIsDeleteDialogOpen(true);
	const handleInfoClick = () => setIsInfoDialogOpen(true);
	const handleDeleteConfirm = async () => {
		await editor.project.deleteProjects({ ids: [project.id] });
		setIsDeleteDialogOpen(false);
		toast.success("Project deleted.");
	};

	const handleCheckboxChange = ({
		checked,
		shiftKey,
	}: {
		checked: boolean;
		shiftKey: boolean;
	}) => {
		if (shiftKey && checked) {
			selectProjectRange({ projectId: project.id, allProjectIds });
			return;
		}
		setProjectSelected({ projectId: project.id, isSelected: checked });
	};

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<div className="group relative">
						{isGridView ? (
							<div
								className={`rounded-lg overflow-hidden bg-card border transition-all duration-200 ${
									isSelected
										? "border-orange-500 ring-2 ring-orange-500/20"
										: "border-border hover:border-orange-500/40 hover:shadow-xs"
								}`}
							>
								{/* Thumbnail */}
								<Link href={`/editor/${project.id}`} className="block relative aspect-video bg-muted/40 overflow-hidden">
									{project.thumbnail ? (
										<Image
											src={project.thumbnail}
											alt="Project thumbnail"
											fill
											className="object-cover group-hover:scale-102 transition-transform duration-300"
										/>
									) : (
										<div className="flex size-full flex-col items-center justify-center bg-gradient-to-br from-orange-500 via-amber-400 to-white/90 p-4 relative overflow-hidden group/thumb">
											<div className="absolute inset-0 bg-radial from-white/30 to-transparent pointer-events-none" />
											<div className="size-11 rounded-xl bg-white/25 backdrop-blur-md border border-white/40 shadow-sm flex items-center justify-center text-white font-black text-sm mb-1 group-hover/thumb:scale-110 transition-transform">
												AC
											</div>
											<span className="text-[11px] font-bold text-white drop-shadow-xs truncate max-w-[85%] text-center">
												{project.name}
											</span>
										</div>
									)}

									{/* Play Button Overlay */}
									<div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
										<div className="size-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md transform scale-90 group-hover:scale-100 transition-transform">
											<Play className="size-4.5 fill-white ml-0.5" />
										</div>
									</div>

									{/* Duration Badge */}
									{durationLabel && (
										<div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-xs text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded">
											{durationLabel}
										</div>
									)}
								</Link>

								{/* Checkbox */}
								<Checkbox
									checked={isSelected}
									onClick={(e) => {
										e.stopPropagation();
										handleCheckboxChange({
											checked: !isSelected,
											shiftKey: e.shiftKey,
										});
									}}
									className={`absolute top-2 left-2 z-10 size-4 rounded ${
										isSelected
											? "opacity-100"
											: "opacity-0 group-hover:opacity-100 transition-opacity"
									}`}
								/>

								{/* Details */}
								<div className="p-3 flex items-center justify-between gap-2">
									<Link href={`/editor/${project.id}`} className="flex flex-col min-w-0 flex-1">
										<h3 className="text-xs font-semibold text-foreground truncate group-hover:text-orange-500 transition-colors">
											{project.name}
										</h3>
										<span className="text-[10px] text-muted-foreground">
											{formatDate({ date: project.createdAt })}
										</span>
									</Link>

									<DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="size-6 rounded text-muted-foreground hover:text-foreground"
												onClick={(e) => e.stopPropagation()}
											>
												<MoreVertical className="size-3.5" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent className="w-40 bg-card border-border text-foreground" align="end">
											<DropdownMenuItem onClick={handleRename}>
												<Edit2 className="size-3 mr-2 text-orange-500" />
												Rename
											</DropdownMenuItem>
											<DropdownMenuItem onClick={handleDuplicate}>
												<Copy className="size-3 mr-2 text-orange-500" />
												Duplicate
											</DropdownMenuItem>
											<DropdownMenuItem onClick={handleInfoClick}>
												<Info className="size-3 mr-2 text-orange-500" />
												Info
											</DropdownMenuItem>
											<DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
												<Trash2 className="size-3 mr-2" />
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>
						) : (
							/* List Row View */
							<div
								className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
									isSelected
										? "bg-orange-500/10 border-orange-500"
										: "bg-card border-border hover:border-orange-500/30"
								}`}
							>
								<div className="flex items-center gap-3 min-w-0 flex-1">
									<Checkbox
										checked={isSelected}
										onClick={(e) => {
											e.stopPropagation();
											handleCheckboxChange({
												checked: !isSelected,
												shiftKey: e.shiftKey,
											});
										}}
										className="size-4 rounded"
									/>
									<Link
										href={`/editor/${project.id}`}
										className="relative size-10 rounded-md bg-muted/40 overflow-hidden shrink-0"
									>
										{project.thumbnail ? (
											<Image
												src={project.thumbnail}
												alt="Thumbnail"
												fill
												className="object-cover"
											/>
										) : (
											<div className="flex size-full items-center justify-center bg-gradient-to-br from-orange-500 via-amber-400 to-white/90 text-white font-black text-[10px] shadow-xs">
												AC
											</div>
										)}
									</Link>

									<Link href={`/editor/${project.id}`} className="flex flex-col min-w-0 flex-1">
										<h4 className="text-xs font-semibold text-foreground truncate hover:text-orange-500">
											{project.name}
										</h4>
										<span className="text-[10px] text-muted-foreground">
											Created {formatDate({ date: project.createdAt })}
										</span>
									</Link>
								</div>

								<div className="flex items-center gap-3">
									<span className="text-xs text-muted-foreground font-mono">
										{durationLabel ?? "00:00"}
									</span>

									<DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="size-7 rounded text-muted-foreground hover:text-foreground"
											>
												<MoreVertical className="size-3.5" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent className="w-40 bg-card border-border text-foreground" align="end">
											<DropdownMenuItem onClick={handleRename}>
												<Edit2 className="size-3 mr-2 text-orange-500" />
												Rename
											</DropdownMenuItem>
											<DropdownMenuItem onClick={handleDuplicate}>
												<Copy className="size-3 mr-2 text-orange-500" />
												Duplicate
											</DropdownMenuItem>
											<DropdownMenuItem onClick={handleInfoClick}>
												<Info className="size-3 mr-2 text-orange-500" />
												Info
											</DropdownMenuItem>
											<DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
												<Trash2 className="size-3 mr-2" />
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>
						)}
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent className="bg-card border-border text-foreground">
					<ContextMenuItem onClick={handleRename}>
						<Edit2 className="size-3 mr-2 text-orange-500" />
						Rename
					</ContextMenuItem>
					<ContextMenuItem onClick={handleDuplicate}>
						<Copy className="size-3 mr-2 text-orange-500" />
						Duplicate
					</ContextMenuItem>
					<ContextMenuItem onClick={handleInfoClick}>
						<Info className="size-3 mr-2 text-orange-500" />
						Info
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem variant="destructive" onClick={handleDeleteClick}>
						<Trash2 className="size-3 mr-2" />
						Delete
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>

			<RenameProjectDialog
				isOpen={isRenameDialogOpen}
				onOpenChange={setIsRenameDialogOpen}
				projectName={project.name}
				onConfirm={async (newName) => {
					await editor.project.renameProject({ id: project.id, name: newName });
					setIsRenameDialogOpen(false);
					toast.success("Project renamed.");
				}}
			/>

			<DeleteProjectDialog
				isOpen={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				projectNames={[project.name]}
				onConfirm={handleDeleteConfirm}
			/>

			<ProjectInfoDialog
				isOpen={isInfoDialogOpen}
				onOpenChange={setIsInfoDialogOpen}
				project={project}
			/>
		</>
	);
}

function ProjectsSkeleton() {
	return (
		<div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
			{Array.from({ length: 8 }).map((_, i) => (
				<div
					key={i}
					className="rounded-lg bg-card border border-border overflow-hidden flex flex-col gap-2.5 p-3"
				>
					<Skeleton className="aspect-video w-full rounded-md bg-muted" />
					<Skeleton className="h-3.5 w-3/4 rounded bg-muted" />
					<Skeleton className="h-3 w-1/3 rounded bg-muted" />
				</div>
			))}
		</div>
	);
}

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl bg-card border border-border gap-3.5">
			<div className="size-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
				<FolderPlus className="size-6" />
			</div>
			<div className="flex flex-col gap-1 max-w-sm">
				<h3 className="text-sm font-bold text-foreground">No projects yet</h3>
				<p className="text-xs text-muted-foreground">
					Create your first video project or use the screen recorder to start creating.
				</p>
			</div>
			<Button
				onClick={onCreateNew}
				className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-sm"
			>
				<Plus className="size-3.5 mr-1.5" />
				Create First Project
			</Button>
		</div>
	);
}
