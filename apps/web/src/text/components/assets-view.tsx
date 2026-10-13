"use client";

import { useState, useRef, useEffect } from "react";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { useEditor } from "@/editor/use-editor";
import { DEFAULTS } from "@/timeline/defaults";
import { buildTextElement } from "@/timeline/element-utils";
import { loadFullFont } from "@/fonts/google-fonts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
	Type,
	Sparkles,
	Upload,
	Laptop,
	Plus,
	Search,
	Check,
	FolderPlus,
} from "lucide-react";
import type { MediaTime } from "@/wasm";

export interface TextPreset {
	id: string;
	name: string;
	category: "styles" | "headlines" | "social" | "captions";
	sampleText: string;
	fontFamily: string;
	fontSize: number;
	fontWeight: string;
	fontStyle?: string;
	color: string;
	letterSpacing?: number;
	previewClass?: string;
	badge?: string;
}

export const TEXT_PRESETS: TextPreset[] = [
	{
		id: "default-text",
		name: "Default Text",
		category: "styles",
		sampleText: "Default text",
		fontFamily: "Arial",
		fontSize: 48,
		fontWeight: "normal",
		color: "#FFFFFF",
	},
	{
		id: "bold-headline",
		name: "Bold Headline",
		category: "headlines",
		sampleText: "BOLD HEADLINE",
		fontFamily: "Montserrat",
		fontSize: 64,
		fontWeight: "900",
		color: "#FFFFFF",
		badge: "POPULAR",
	},
	{
		id: "cinematic-serif",
		name: "Cinematic Serif",
		category: "headlines",
		sampleText: "CINEMATIC STORY",
		fontFamily: "Playfair Display",
		fontSize: 52,
		fontWeight: "700",
		fontStyle: "italic",
		color: "#F6E05E",
		letterSpacing: 2,
		badge: "FILM",
	},
	{
		id: "social-hook",
		name: "Shorts Hook Title",
		category: "social",
		sampleText: "TOP 5 SECRETS",
		fontFamily: "Bebas Neue",
		fontSize: 70,
		fontWeight: "bold",
		color: "#FFD700",
		badge: "VIRAL",
	},
	{
		id: "modern-sans",
		name: "Modern Clean",
		category: "styles",
		sampleText: "Modern Minimalist",
		fontFamily: "Poppins",
		fontSize: 46,
		fontWeight: "600",
		color: "#FFFFFF",
		letterSpacing: 1,
	},
	{
		id: "cyber-neon",
		name: "Cyber Neon Glow",
		category: "headlines",
		sampleText: "NEON FUTURE",
		fontFamily: "Outfit",
		fontSize: 54,
		fontWeight: "800",
		color: "#00F0FF",
		badge: "GLOW",
	},
	{
		id: "retro-script",
		name: "Vintage Script",
		category: "social",
		sampleText: "Summer Memories",
		fontFamily: "Pacifico",
		fontSize: 50,
		fontWeight: "normal",
		color: "#FF6B6B",
		badge: "RETRO",
	},
	{
		id: "minimal-subtitle",
		name: "Clean Subtitle",
		category: "captions",
		sampleText: "Spoken dialogue caption",
		fontFamily: "Inter",
		fontSize: 34,
		fontWeight: "500",
		color: "#FFFFFF",
		badge: "SUBTITLE",
	},
	{
		id: "breaking-news",
		name: "Breaking News Banner",
		category: "headlines",
		sampleText: "LIVE BREAKING NEWS",
		fontFamily: "Roboto",
		fontSize: 44,
		fontWeight: "900",
		color: "#FFFFFF",
		badge: "NEWS",
	},
	{
		id: "aesthetic-quote",
		name: "Handwritten Quote",
		category: "social",
		sampleText: "Make every moment count",
		fontFamily: "Dancing Script",
		fontSize: 48,
		fontWeight: "700",
		color: "#FEF08A",
	},
];

export const PRESET_FONTS = [
	{ name: "Montserrat", category: "Sans", weight: "Bold 900", sample: "Impact Headline" },
	{ name: "Poppins", category: "Sans", weight: "Semi-Bold", sample: "Smooth Modern" },
	{ name: "Inter", category: "Sans", weight: "Medium", sample: "Clean UI Typography" },
	{ name: "Outfit", category: "Sans", weight: "Extra Bold", sample: "Urban Punch" },
	{ name: "Roboto", category: "Sans", weight: "Bold", sample: "Clear Neutral" },
	{ name: "Bebas Neue", category: "Display", weight: "Poster Bold", sample: "SHORTS & REELS" },
	{ name: "Oswald", category: "Display", weight: "Tall Bold", sample: "DOCUMENTARY" },
	{ name: "Playfair Display", category: "Serif", weight: "Classic Serif", sample: "Elegant Editorial" },
	{ name: "Cinzel", category: "Serif", weight: "Cinema Serif", sample: "ANCIENT MYTH" },
	{ name: "Pacifico", category: "Script", weight: "Playful Script", sample: "Handcrafted Brush" },
	{ name: "Dancing Script", category: "Script", weight: "Flowing Script", sample: "Personal Letter" },
	{ name: "Impact", category: "Display", weight: "Heavy Sans", sample: "HIGH POWER" },
	{ name: "Georgia", category: "Serif", weight: "Classic Book", sample: "Storyteller Voice" },
	{ name: "Courier New", category: "Mono", weight: "Monospace", sample: "Terminal Code" },
];

export function TextView() {
	const editor = useEditor();
	const [activeTab, setActiveTab] = useState<"presets" | "fonts" | "pc-fonts">("presets");
	const [fontSearch, setFontSearch] = useState("");
	const [customFonts, setCustomFonts] = useState<Array<{ name: string; source: "file" | "pc" }>>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Preload popular fonts in background so previews render sharp
	useEffect(() => {
		const popular = ["Montserrat", "Poppins", "Inter", "Playfair Display", "Bebas Neue", "Outfit", "Pacifico"];
		for (const family of popular) {
			loadFullFont({ family }).catch(() => {});
		}
	}, []);

	const handleAddPresetToTimeline = ({
		preset,
		currentTime,
	}: {
		preset: TextPreset;
		currentTime: MediaTime;
	}) => {
		const activeScene = editor.scenes.getActiveScene();
		if (!activeScene) return;

		// Load font if needed
		loadFullFont({ family: preset.fontFamily }).catch(() => {});

		const element = buildTextElement({
			raw: {
				name: preset.name,
				params: {
					...DEFAULTS.text.element.params,
					content: preset.sampleText,
					fontFamily: preset.fontFamily,
					fontSize: preset.fontSize,
					fontWeight: preset.fontWeight,
					fontStyle: preset.fontStyle || "normal",
					color: preset.color,
					letterSpacing: preset.letterSpacing || 0,
				},
			},
			startTime: currentTime,
		});

		editor.timeline.insertElement({
			element,
			placement: { mode: "auto" },
		});

		toast.success(`Added "${preset.name}" (${preset.fontFamily}) to timeline!`);
	};

	const handleAddFontToTimeline = (fontName: string) => {
		const activeScene = editor.scenes.getActiveScene();
		if (!activeScene) return;

		loadFullFont({ family: fontName }).catch(() => {});
		const currentTime = editor.playback.getCurrentTime();

		const element = buildTextElement({
			raw: {
				name: `${fontName} Text`,
				params: {
					...DEFAULTS.text.element.params,
					content: `${fontName} Title`,
					fontFamily: fontName,
					fontSize: 52,
					fontWeight: "bold",
					color: "#FFFFFF",
				},
			},
			startTime: currentTime,
		});

		editor.timeline.insertElement({
			element,
			placement: { mode: "auto" },
		});

		toast.success(`Added text with font "${fontName}" to timeline!`);
	};

	// Local file upload handler for TTF, OTF, WOFF2 fonts from user's PC
	const handleFontFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		for (const file of Array.from(files)) {
			const fontName = file.name
				.replace(/\.[^/.]+$/, "")
				.replace(/[-_]/g, " ")
				.trim();

			const reader = new FileReader();
			reader.onload = async (event) => {
				const buffer = event.target?.result as ArrayBuffer;
				if (!buffer) return;

				try {
					const fontFace = new FontFace(fontName, buffer);
					await fontFace.load();
					document.fonts.add(fontFace);

					setCustomFonts((prev) => [
						...prev.filter((f) => f.name !== fontName),
						{ name: fontName, source: "file" },
					]);

					toast.success(`Loaded font "${fontName}" from your PC! Ready to use.`);
				} catch (err) {
					toast.error(`Could not parse font "${file.name}". Ensure it is a valid .ttf, .otf, or .woff2 file.`);
				}
			};
			reader.readAsArrayBuffer(file);
		}

		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	// Local system font query (Chrome/Edge Window Local Fonts API)
	const handleQuerySystemFonts = async () => {
		if ("queryLocalFonts" in window && typeof (window as any).queryLocalFonts === "function") {
			try {
				toast.loading("Querying installed PC fonts...", { id: "sys-fonts" });
				const availableFonts = await (window as any).queryLocalFonts();
				const uniqueNames = Array.from(
					new Set(availableFonts.map((f: any) => f.family)),
				).slice(0, 30) as string[];

				setCustomFonts((prev) => {
					const existing = new Set(prev.map((f) => f.name));
					const additions = uniqueNames
						.filter((name) => !existing.has(name))
						.map((name) => ({ name, source: "pc" as const }));
					return [...prev, ...additions];
				});

				toast.dismiss("sys-fonts");
				toast.success(`Found ${uniqueNames.length} system fonts from your PC!`);
			} catch (err) {
				toast.dismiss("sys-fonts");
				toast.info("System font permission was cancelled or not granted.");
			}
		} else {
			toast.info("Direct system scan requires Chrome/Edge font permission. You can upload any .ttf/.otf file below!");
		}
	};

	const filteredPresets = TEXT_PRESETS.filter(
		(p) =>
			!fontSearch ||
			p.name.toLowerCase().includes(fontSearch.toLowerCase()) ||
			p.fontFamily.toLowerCase().includes(fontSearch.toLowerCase()),
	);

	const filteredFonts = PRESET_FONTS.filter(
		(f) =>
			!fontSearch ||
			f.name.toLowerCase().includes(fontSearch.toLowerCase()) ||
			f.category.toLowerCase().includes(fontSearch.toLowerCase()),
	);

	return (
		<PanelView title="Text">
			<div className="flex flex-col gap-3 p-3 size-full overflow-y-auto scrollbar-thin">
				{/* Top Tabs: Presets vs Font Library vs PC Local Fonts */}
				<div className="flex items-center gap-1 p-0.5 bg-muted/40 rounded-lg border border-border/60">
					<button
						type="button"
						onClick={() => setActiveTab("presets")}
						className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
							activeTab === "presets"
								? "bg-background text-foreground shadow-xs border border-border/80"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						Text Styles
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("fonts")}
						className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
							activeTab === "fonts"
								? "bg-background text-foreground shadow-xs border border-border/80"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						Preset Fonts
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("pc-fonts")}
						className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
							activeTab === "pc-fonts"
								? "bg-background text-foreground shadow-xs border border-border/80"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<Laptop className="size-3 text-orange-500" />
						<span>PC Fonts</span>
					</button>
				</div>

				{/* Search Bar */}
				{activeTab !== "pc-fonts" && (
					<div className="relative">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
						<Input
							placeholder={activeTab === "presets" ? "Search text styles..." : "Search fonts..."}
							value={fontSearch}
							onChange={(e) => setFontSearch(e.target.value)}
							className="h-7 text-xs pl-7 bg-muted/20 border-border/60 rounded-md"
						/>
					</div>
				)}

				{/* 1. TEXT PRESETS & STYLES */}
				{activeTab === "presets" && (
					<div className="flex flex-col gap-2.5">
						<div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5 font-medium">
							<span>DRAG OR CLICK TO ADD TO VIDEO</span>
							<span>{filteredPresets.length} STYLES</span>
						</div>

						<div className="grid grid-cols-2 gap-2">
							{filteredPresets.map((preset) => (
								<div key={preset.id} className="relative group">
									<DraggableItem
										name={preset.name}
										preview={
											<div className="bg-card border border-border/70 hover:border-orange-500/50 p-2.5 flex flex-col justify-between size-full rounded-lg cursor-pointer transition-all shadow-2xs group-hover:shadow-xs overflow-hidden">
												<div className="flex items-center justify-between">
													<span className="text-[10px] font-semibold text-muted-foreground truncate">
														{preset.fontFamily}
													</span>
													{preset.badge && (
														<Badge className="bg-orange-500/15 text-orange-500 text-[8px] h-3.5 px-1 font-bold border-none rounded">
															{preset.badge}
														</Badge>
													)}
												</div>

												<div
													className="text-center py-2 truncate text-foreground select-none"
													style={{
														fontFamily: preset.fontFamily,
														fontWeight: preset.fontWeight as any,
														fontStyle: preset.fontStyle || "normal",
														color: preset.color,
														letterSpacing: preset.letterSpacing ? `${preset.letterSpacing}px` : undefined,
													}}
												>
													<span className="text-sm font-semibold">{preset.sampleText}</span>
												</div>

												<div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1 border-t border-border/30">
													<span>{preset.name}</span>
													<span className="text-orange-500 font-bold group-hover:scale-110 transition-transform">
														+ Add
													</span>
												</div>
											</div>
										}
										dragData={{
											id: `text-${preset.id}`,
											type: "text",
											name: preset.name,
											content: preset.sampleText,
										}}
										aspectRatio={1.2}
										onAddToTimeline={({ currentTime }) =>
											handleAddPresetToTimeline({ preset, currentTime })
										}
										shouldShowLabel={false}
									/>
								</div>
							))}
						</div>
					</div>
				)}

				{/* 2. PRESET FONTS SHOWCASE */}
				{activeTab === "fonts" && (
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5 font-medium">
							<span>CURATED FONT FAMILIES</span>
							<span>{filteredFonts.length} FONTS</span>
						</div>

						<div className="flex flex-col gap-1.5">
							{filteredFonts.map((font) => (
								<div
									key={font.name}
									onClick={() => handleAddFontToTimeline(font.name)}
									className="p-2.5 rounded-lg bg-card border border-border/70 hover:border-orange-500/50 hover:bg-muted/40 transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
								>
									<div className="flex flex-col min-w-0 pr-2">
										<div className="flex items-center gap-1.5">
											<span className="text-xs font-bold text-foreground truncate">
												{font.name}
											</span>
											<Badge
												variant="secondary"
												className="text-[8px] h-3.5 px-1 text-muted-foreground rounded"
											>
												{font.category}
											</Badge>
										</div>
										<span
											className="text-sm text-foreground/90 truncate pt-0.5"
											style={{ fontFamily: font.name }}
										>
											{font.sample}
										</span>
									</div>

									<Button
										size="icon"
										variant="ghost"
										className="size-7 rounded-md text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors shrink-0"
										aria-label={`Add text with font ${font.name}`}
									>
										<Plus className="size-3.5" />
									</Button>
								</div>
							))}
						</div>
					</div>
				)}

				{/* 3. PC LOCAL FONTS / CUSTOM FONT UPLOAD */}
				{activeTab === "pc-fonts" && (
					<div className="flex flex-col gap-3">
						{/* Upload Box */}
						<div className="p-3 rounded-xl border border-dashed border-orange-500/40 bg-orange-500/5 flex flex-col items-center justify-center text-center gap-2">
							<div className="size-8 rounded-lg bg-orange-500/15 text-orange-500 flex items-center justify-center">
								<Upload className="size-4" />
							</div>
							<div className="flex flex-col">
								<span className="text-xs font-bold text-foreground">
									Import PC Fonts (.ttf, .otf, .woff2)
								</span>
								<span className="text-[10px] text-muted-foreground">
									Load any custom fonts installed on your computer
								</span>
							</div>

							<div className="flex items-center gap-2 pt-1 w-full">
								<input
									type="file"
									ref={fileInputRef}
									onChange={handleFontFileUpload}
									accept=".ttf,.otf,.woff,.woff2"
									multiple
									className="hidden"
								/>
								<Button
									size="sm"
									onClick={() => fileInputRef.current?.click()}
									className="flex-1 h-7 text-[11px] bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
								>
									<FolderPlus className="size-3 mr-1" />
									Browse Font Files
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={handleQuerySystemFonts}
									className="flex-1 h-7 text-[11px] border-border text-foreground hover:bg-muted font-semibold rounded-lg cursor-pointer"
								>
									<Laptop className="size-3 mr-1 text-orange-500" />
									Scan PC Fonts
								</Button>
							</div>
						</div>

						{/* Custom / Loaded PC Fonts List */}
						<div className="flex flex-col gap-1.5 pt-1">
							<div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5 font-medium">
								<span>YOUR PC FONTS</span>
								<span>{customFonts.length} LOADED</span>
							</div>

							{customFonts.length > 0 ? (
								<div className="flex flex-col gap-1.5">
									{customFonts.map((font) => (
										<div
											key={font.name}
											onClick={() => handleAddFontToTimeline(font.name)}
											className="p-2.5 rounded-lg bg-card border border-border/70 hover:border-orange-500/50 hover:bg-muted/40 transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
										>
											<div className="flex flex-col min-w-0 pr-2">
												<div className="flex items-center gap-1.5">
													<span className="text-xs font-bold text-foreground truncate">
														{font.name}
													</span>
													<Badge className="bg-emerald-500/15 text-emerald-500 text-[8px] h-3.5 px-1 font-bold border-none rounded">
														{font.source === "pc" ? "SYSTEM" : "CUSTOM"}
													</Badge>
												</div>
												<span
													className="text-sm text-foreground/90 truncate pt-0.5"
													style={{ fontFamily: font.name }}
												>
													The quick brown fox jumps
												</span>
											</div>

											<Button
												size="icon"
												variant="ghost"
												className="size-7 rounded-md text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors shrink-0"
												aria-label={`Add text with font ${font.name}`}
											>
												<Plus className="size-3.5" />
											</Button>
										</div>
									))}
								</div>
							) : (
								<div className="p-4 rounded-lg bg-muted/20 border border-border/40 text-center flex flex-col items-center gap-1 text-muted-foreground">
									<Type className="size-5 text-muted-foreground/60" />
									<span className="text-xs font-medium">No custom fonts imported yet</span>
									<span className="text-[10px]">
										Click &quot;Browse Font Files&quot; above to add any font from your computer.
									</span>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</PanelView>
	);
}
