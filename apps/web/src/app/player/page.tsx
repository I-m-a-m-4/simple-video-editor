"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
	Play,
	Pause,
	Volume2,
	VolumeX,
	Maximize,
	Minimize,
	RotateCcw,
	Wand2,
	Upload,
	FolderOpen,
	ArrowLeft,
	PictureInPicture,
	Repeat,
	Gauge,
	FileVideo,
	Info,
	Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { processMediaAssets } from "@/media/processing";
import { useEditor } from "@/editor/use-editor";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { mediaTimeFromSeconds } from "@/wasm";

function formatTime(seconds: number): string {
	if (isNaN(seconds) || seconds < 0) return "00:00";
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	if (h > 0) {
		return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	}
	return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function VideoPlayerPage() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const [videoSrc, setVideoSrc] = useState<string | null>(null);
	const [videoFile, setVideoFile] = useState<File | null>(null);
	const [videoTitle, setVideoTitle] = useState<string>("AmberCut Player");

	// Playback State
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(1);
	const [isMuted, setIsMuted] = useState(false);
	const [playbackRate, setPlaybackRate] = useState(1);
	const [isLooping, setIsLooping] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [showControls, setShowControls] = useState(true);
	const [isDraggingSeek, setIsDraggingSeek] = useState(false);
	const [isImportingToEditor, setIsImportingToEditor] = useState(false);

	const videoRef = useRef<HTMLVideoElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Load video from File
	const loadVideoFile = useCallback((file: File) => {
		const url = URL.createObjectURL(file);
		setVideoFile(file);
		setVideoSrc(url);
		setVideoTitle(file.name);
		setIsPlaying(true);
		toast.success(`Playing: ${file.name}`);
	}, []);

	// Handle Windows File Handling API (PWA / Edge / Chrome "Open With")
	useEffect(() => {
		if (typeof window !== "undefined" && "launchQueue" in window) {
			(window as any).launchQueue.setConsumer(async (launchParams: any) => {
				if (launchParams.files && launchParams.files.length > 0) {
					try {
						const fileHandle = launchParams.files[0];
						const file = await fileHandle.getFile();
						loadVideoFile(file);
					} catch (e) {
						console.error("Failed to read launched file:", e);
					}
				}
			});
		}
	}, [loadVideoFile]);

	// Handle Tauri CLI argument (Desktop app launched via "Open with" on Windows)
	useEffect(() => {
		const checkTauriCli = async () => {
			if (typeof window !== "undefined" && (window as any).__TAURI__) {
				try {
					const { invoke } = (window as any).__TAURI__.core || (window as any).__TAURI__.tauri;
					const filePath = await invoke("get_cli_media_path");
					if (filePath) {
						// In Tauri, convert local file path to asset URL
						const { convertFileSrc } = (window as any).__TAURI__.core || (window as any).__TAURI__.tauri;
						const assetUrl = convertFileSrc ? convertFileSrc(filePath) : filePath;
						const fileName = filePath.split(/[/\\]/).pop() || "Video";
						setVideoSrc(assetUrl);
						setVideoTitle(fileName);
						setIsPlaying(true);
					}
				} catch (e) {
					console.warn("Tauri CLI check not available:", e);
				}
			}
		};
		checkTauriCli();
	}, []);

	// Check URL param ?url=
	useEffect(() => {
		const urlParam = searchParams.get("url");
		if (urlParam) {
			setVideoSrc(urlParam);
			setVideoTitle("Stream Video");
			setIsPlaying(true);
		}
	}, [searchParams]);

	// Autohide controls on inactivity
	const handleMouseMove = () => {
		setShowControls(true);
		if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
		if (isPlaying) {
			hideTimeoutRef.current = setTimeout(() => {
				setShowControls(false);
			}, 2500);
		}
	};

	// Toggle play/pause
	const togglePlay = () => {
		if (!videoRef.current) return;
		if (videoRef.current.paused) {
			videoRef.current.play();
			setIsPlaying(true);
		} else {
			videoRef.current.pause();
			setIsPlaying(false);
		}
	};

	// Seek
	const handleSeek = (newTime: number) => {
		if (!videoRef.current) return;
		videoRef.current.currentTime = newTime;
		setCurrentTime(newTime);
	};

	// Volume
	const handleVolumeChange = (newVol: number) => {
		if (!videoRef.current) return;
		videoRef.current.volume = newVol;
		setVolume(newVol);
		if (newVol > 0 && isMuted) {
			setIsMuted(false);
			videoRef.current.muted = false;
		}
	};

	const toggleMute = () => {
		if (!videoRef.current) return;
		const nextMute = !isMuted;
		videoRef.current.muted = nextMute;
		setIsMuted(nextMute);
	};

	// Speed
	const cycleSpeed = () => {
		if (!videoRef.current) return;
		const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
		const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
		const nextSpeed = speeds[nextIdx];
		videoRef.current.playbackRate = nextSpeed;
		setPlaybackRate(nextSpeed);
		toast.info(`Playback Speed: ${nextSpeed}x`);
	};

	// Fullscreen
	const toggleFullscreen = () => {
		if (!containerRef.current) return;
		if (!document.fullscreenElement) {
			containerRef.current.requestFullscreen().catch(() => {});
			setIsFullscreen(true);
		} else {
			document.exitFullscreen().catch(() => {});
			setIsFullscreen(false);
		}
	};

	// PiP
	const togglePiP = async () => {
		if (!videoRef.current) return;
		try {
			if (document.pictureInPictureElement) {
				await document.exitPictureInPicture();
			} else if (document.pictureInPictureEnabled) {
				await videoRef.current.requestPictureInPicture();
			}
		} catch (e) {
			console.error(e);
		}
	};

	// Keyboard Shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
			switch (e.key) {
				case " ":
				case "k":
					e.preventDefault();
					togglePlay();
					break;
				case "ArrowLeft":
				case "j":
					e.preventDefault();
					if (videoRef.current) handleSeek(Math.max(0, videoRef.current.currentTime - 5));
					break;
				case "ArrowRight":
				case "l":
					e.preventDefault();
					if (videoRef.current) handleSeek(Math.min(duration, videoRef.current.currentTime + 5));
					break;
				case "ArrowUp":
					e.preventDefault();
					handleVolumeChange(Math.min(1, volume + 0.1));
					break;
				case "ArrowDown":
					e.preventDefault();
					handleVolumeChange(Math.max(0, volume - 0.1));
					break;
				case "f":
				case "F":
					e.preventDefault();
					toggleFullscreen();
					break;
				case "m":
				case "M":
					e.preventDefault();
					toggleMute();
					break;
				case "r":
				case "R":
					setIsLooping((prev) => !prev);
					break;
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [volume, duration, isMuted, isPlaying]);

	// Open in AmberCut Editor
	const handleEditInAmberCut = async () => {
		if (!videoFile) {
			toast.info("Opening AmberCut Editor...");
			router.push("/projects");
			return;
		}

		setIsImportingToEditor(true);
		toast.loading("Transferring video into AmberCut editor workspace...", {
			id: "player-import-toast",
		});

		try {
			// Generate project id
			const projectId = `proj_${Date.now()}`;
			sessionStorage.setItem("ambercut_pending_edit_file", videoFile.name);
			// Redirect to editor
			toast.dismiss("player-import-toast");
			toast.success("Ready to edit! Opening timeline...");
			router.push(`/editor/${projectId}`);
		} catch (err: any) {
			toast.dismiss("player-import-toast");
			toast.error(err.message || "Could not launch editor.");
		} finally {
			setIsImportingToEditor(false);
		}
	};

	return (
		<div
			ref={containerRef}
			onMouseMove={handleMouseMove}
			className="relative w-screen h-screen bg-black text-white select-none overflow-hidden flex flex-col justify-between"
		>
			<input
				ref={fileInputRef}
				type="file"
				accept="video/*"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) loadVideoFile(file);
				}}
			/>

			{/* Top Bar (Auto-hides with controls) */}
			<div
				className={`absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 ${
					showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
				}`}
			>
				<div className="flex items-center gap-3">
					<Link
						href="/projects"
						className="size-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white/80 hover:text-white"
						title="Back to Projects"
					>
						<ArrowLeft className="size-4" />
					</Link>
					<div className="flex items-center gap-2">
						<span className="font-semibold text-sm truncate max-w-md">{videoTitle}</span>
						<Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px] font-bold">
							AmberCut Player
						</Badge>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => fileInputRef.current?.click()}
						className="h-8 gap-1.5 text-xs bg-white/10 hover:bg-white/20 border-white/20 text-white"
					>
						<FolderOpen className="size-3.5" />
						Open Video
					</Button>

					<Button
						variant="default"
						size="sm"
						onClick={handleEditInAmberCut}
						disabled={isImportingToEditor}
						className="h-8 gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-md shadow-orange-500/20"
					>
						<Wand2 className="size-3.5" />
						{videoFile ? "Edit in AmberCut" : "Open in Editor"}
					</Button>
				</div>
			</div>

			{/* Video Element or Empty Dropzone */}
			{videoSrc ? (
				<div
					className="relative flex-1 flex items-center justify-center cursor-pointer"
					onClick={togglePlay}
					onDoubleClick={toggleFullscreen}
				>
					<video
						ref={videoRef}
						src={videoSrc}
						loop={isLooping}
						playsInline
						autoPlay
						onPlay={() => setIsPlaying(true)}
						onPause={() => setIsPlaying(false)}
						onTimeUpdate={() => {
							if (videoRef.current && !isDraggingSeek) {
								setCurrentTime(videoRef.current.currentTime);
							}
						}}
						onLoadedMetadata={() => {
							if (videoRef.current) {
								setDuration(videoRef.current.duration);
								videoRef.current.volume = volume;
							}
						}}
						className="max-h-full max-w-full object-contain"
					/>
				</div>
			) : (
				<div
					className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/15 m-6 rounded-2xl bg-white/[0.02] cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/[0.02] transition-all"
					onClick={() => fileInputRef.current?.click()}
					onDragOver={(e) => e.preventDefault()}
					onDrop={(e) => {
						e.preventDefault();
						const file = e.dataTransfer.files[0];
						if (file && file.type.startsWith("video/")) {
							loadVideoFile(file);
						} else {
							toast.error("Please drop a valid video file.");
						}
					}}
				>
					<div className="size-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-4 shadow-xl">
						<FileVideo className="size-8" />
					</div>
					<h2 className="text-xl font-bold tracking-tight mb-1 text-white font-clash">
						AmberCut High-Definition Video Player
					</h2>
					<p className="text-xs text-white/60 mb-5 text-center max-w-md">
						Drop any video file (.mp4, .mkv, .mov, .webm, .avi) to view instantly, or double-click any video on Windows to open with AmberCut.
					</p>

					<div className="flex gap-3">
						<Button
							variant="default"
							size="sm"
							onClick={(e) => {
								e.stopPropagation();
								fileInputRef.current?.click();
							}}
							className="gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
						>
							<FolderOpen className="size-4" />
							Choose Video File
						</Button>
						<Button
							variant="outline"
							size="sm"
							asChild
							className="border-white/20 bg-white/5 hover:bg-white/15 text-white"
						>
							<Link href="/projects">Go to Editor</Link>
						</Button>
					</div>

					<div className="mt-8 flex items-center gap-2 text-[11px] text-white/40">
						<Info className="size-3.5" />
						<span>Supports Windows &quot;Open With&quot; and default media player associations</span>
					</div>
				</div>
			)}

			{/* Bottom Controls Bar (Auto-hides) */}
			{videoSrc && (
				<div
					className={`absolute bottom-0 inset-x-0 z-30 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 space-y-2 ${
						showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
					}`}
				>
					{/* Progress / Scrubber Bar */}
					<div className="group relative flex items-center h-4 cursor-pointer">
						<input
							type="range"
							min={0}
							max={duration || 100}
							step={0.1}
							value={currentTime}
							onChange={(e) => {
								const val = parseFloat(e.target.value);
								setCurrentTime(val);
								handleSeek(val);
							}}
							className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:h-2 transition-all"
						/>
					</div>

					{/* Control Buttons */}
					<div className="flex items-center justify-between text-white">
						<div className="flex items-center gap-3">
							{/* Play/Pause */}
							<Button
								variant="ghost"
								size="icon"
								onClick={togglePlay}
								className="size-8 rounded-lg text-white hover:bg-white/15"
								title={isPlaying ? "Pause (Space)" : "Play (Space)"}
							>
								{isPlaying ? <Pause className="size-4.5" /> : <Play className="size-4.5 ml-0.5" />}
							</Button>

							{/* Volume */}
							<div className="flex items-center gap-1.5 group">
								<Button
									variant="ghost"
									size="icon"
									onClick={toggleMute}
									className="size-8 rounded-lg text-white hover:bg-white/15"
									title={isMuted ? "Unmute (M)" : "Mute (M)"}
								>
									{isMuted || volume === 0 ? (
										<VolumeX className="size-4" />
									) : (
										<Volume2 className="size-4" />
									)}
								</Button>
								<div className="hidden sm:block w-16">
									<Slider
										value={[isMuted ? 0 : volume]}
										min={0}
										max={1}
										step={0.05}
										onValueChange={([val]) => handleVolumeChange(val)}
									/>
								</div>
							</div>

							{/* Timestamp */}
							<span className="text-xs font-mono text-white/80 tabular-nums">
								{formatTime(currentTime)} / {formatTime(duration)}
							</span>
						</div>

						<div className="flex items-center gap-1.5">
							{/* Speed */}
							<Button
								variant="ghost"
								size="sm"
								onClick={cycleSpeed}
								className="h-8 px-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/15 rounded-lg"
								title="Playback Speed"
							>
								<Gauge className="size-3.5 mr-1" />
								{playbackRate}x
							</Button>

							{/* Loop */}
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setIsLooping(!isLooping)}
								className={`size-8 rounded-lg transition-colors ${
									isLooping
										? "text-orange-400 bg-orange-500/20"
										: "text-white/80 hover:text-white hover:bg-white/15"
								}`}
								title={isLooping ? "Looping Enabled (L)" : "Loop Off (L)"}
							>
								<Repeat className="size-4" />
							</Button>

							{/* Picture-in-Picture */}
							<Button
								variant="ghost"
								size="icon"
								onClick={togglePiP}
								className="size-8 rounded-lg text-white/80 hover:text-white hover:bg-white/15"
								title="Picture-in-Picture"
							>
								<PictureInPicture className="size-4" />
							</Button>

							{/* Fullscreen */}
							<Button
								variant="ghost"
								size="icon"
								onClick={toggleFullscreen}
								className="size-8 rounded-lg text-white hover:bg-white/15"
								title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
							>
								{isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
