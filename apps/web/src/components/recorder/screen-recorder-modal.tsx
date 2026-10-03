"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
	Video,
	Monitor,
	ZoomIn,
	Play,
	Pause,
	Square,
	RotateCcw,
	Download,
	Sparkles,
	Circle,
	Check,
} from "lucide-react";
import { useEditor } from "@/editor/use-editor";
import { processMediaAssets } from "@/media/processing";

type PipPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";
type PipShape = "circle" | "rounded";
type ZoomPreset = 1 | 1.5 | 2 | 2.5;

interface ScreenRecorderModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ScreenRecorderModal({
	isOpen,
	onOpenChange,
}: ScreenRecorderModalProps) {
	const router = useRouter();
	const editor = useEditor();

	// Media streams
	const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
	const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
	const [micStream, setMicStream] = useState<MediaStream | null>(null);

	// Settings
	const [isCameraEnabled, setIsCameraEnabled] = useState(true);
	const [isMicEnabled, setIsMicEnabled] = useState(true);
	const [isSystemAudioEnabled, setIsSystemAudioEnabled] = useState(true);
	const [pipPosition, setPipPosition] = useState<PipPosition>("bottom-right");
	const [pipShape, setPipShape] = useState<PipShape>("circle");
	const [pipSize, setPipSize] = useState<number>(220); // pixels
	const [mirrorCamera, setMirrorCamera] = useState(true);

	// Zoom and focus controls
	const [targetZoom, setTargetZoom] = useState<ZoomPreset>(1);
	const [focusPoint, setFocusPoint] = useState<{ x: number; y: number }>({
		x: 0.5,
		y: 0.5,
	});

	// State machine: "idle" -> "ready" -> "countdown" -> "recording" -> "paused" -> "preview"
	const [status, setStatus] = useState<
		"idle" | "ready" | "countdown" | "recording" | "paused" | "preview"
	>("idle");
	const [countdown, setCountdown] = useState(3);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);

	// Recording refs
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const screenVideoRef = useRef<HTMLVideoElement | null>(null);
	const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const recordedChunksRef = useRef<Blob[]>([]);
	const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
	const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
	const [isExporting, setIsExporting] = useState(false);

	// Smooth animation state for zoom & pan
	const zoomAnimRef = useRef({
		currentZoom: 1,
		currentPanX: 0.5,
		currentPanY: 0.5,
	});
	const animFrameRef = useRef<number | null>(null);

	// Initialize video elements for offscreen rendering
	useEffect(() => {
		if (!screenVideoRef.current) {
			const video = document.createElement("video");
			video.muted = true;
			video.playsInline = true;
			video.autoplay = true;
			screenVideoRef.current = video;
		}
		if (!cameraVideoRef.current) {
			const video = document.createElement("video");
			video.muted = true;
			video.playsInline = true;
			video.autoplay = true;
			cameraVideoRef.current = video;
		}
	}, []);

	// Elapsed timer
	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (status === "recording") {
			interval = setInterval(() => {
				setElapsedSeconds((prev) => prev + 1);
			}, 1000);
		}
		return () => clearInterval(interval);
	}, [status]);

	// Cleanup on close
	useEffect(() => {
		if (!isOpen) {
			stopAllStreams();
			if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
			setStatus("idle");
			setElapsedSeconds(0);
			setRecordedBlob(null);
			if (recordedUrl) {
				URL.revokeObjectURL(recordedUrl);
				setRecordedUrl(null);
			}
		}
	}, [isOpen]);

	const stopAllStreams = () => {
		screenStream?.getTracks().forEach((t) => t.stop());
		cameraStream?.getTracks().forEach((t) => t.stop());
		micStream?.getTracks().forEach((t) => t.stop());
		setScreenStream(null);
		setCameraStream(null);
		setMicStream(null);
	};

	// Start Screen & Camera setup
	const initializeCapture = async () => {
		try {
			// 1. Get Screen Stream
			const screen = await navigator.mediaDevices.getDisplayMedia({
				video: {
					displaySurface: "monitor",
				},
				audio: isSystemAudioEnabled,
			});

			if (screenVideoRef.current) {
				screenVideoRef.current.srcObject = screen;
				await screenVideoRef.current.play();
			}
			setScreenStream(screen);

			// Listen for user stopping screen share from browser banner
			screen.getVideoTracks()[0].onended = () => {
				if (status === "recording" || status === "paused") {
					stopRecording();
				}
			};

			// 2. Get Camera Stream if enabled
			if (isCameraEnabled) {
				try {
					const cam = await navigator.mediaDevices.getUserMedia({
						video: { width: { ideal: 1280 }, height: { ideal: 720 } },
						audio: false,
					});
					if (cameraVideoRef.current) {
						cameraVideoRef.current.srcObject = cam;
						await cameraVideoRef.current.play();
					}
					setCameraStream(cam);
				} catch (err) {
					console.warn("Camera permission denied or camera unavailable:", err);
					toast.info("Continuing without camera (camera access not granted)");
					setIsCameraEnabled(false);
				}
			}

			// 3. Get Microphone if enabled
			if (isMicEnabled) {
				try {
					const mic = await navigator.mediaDevices.getUserMedia({
						audio: {
							echoCancellation: true,
							noiseSuppression: true,
							autoGainControl: true,
						},
						video: false,
					});
					setMicStream(mic);
				} catch (err) {
					console.warn("Microphone permission denied:", err);
					toast.info("Microphone not available");
					setIsMicEnabled(false);
				}
			}

			setStatus("ready");
			startLiveCanvasLoop();
		} catch (error) {
			console.error("Screen capture failed:", error);
			toast.error("Screen capture cancelled or not allowed.");
		}
	};

	// Canvas compositor loop: screen + smooth zoom + camera PiP
	const startLiveCanvasLoop = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d", { alpha: false });
		if (!ctx) return;

		canvas.width = 1920;
		canvas.height = 1080;

		const render = () => {
			if (!screenVideoRef.current) return;
			const screenVid = screenVideoRef.current;
			const camVid = cameraVideoRef.current;

			// Smooth zoom & pan interpolation (lerp)
			const lerpSpeed = 0.08;
			zoomAnimRef.current.currentZoom +=
				(targetZoom - zoomAnimRef.current.currentZoom) * lerpSpeed;
			zoomAnimRef.current.currentPanX +=
				(focusPoint.x - zoomAnimRef.current.currentPanX) * lerpSpeed;
			zoomAnimRef.current.currentPanY +=
				(focusPoint.y - zoomAnimRef.current.currentPanY) * lerpSpeed;

			const currentZoom = zoomAnimRef.current.currentZoom;
			const currentPanX = zoomAnimRef.current.currentPanX;
			const currentPanY = zoomAnimRef.current.currentPanY;

			ctx.fillStyle = "#0c0d12";
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// Draw screen video with zoom & pan
			if (screenVid.readyState >= 2 && screenVid.videoWidth > 0) {
				const vidW = screenVid.videoWidth;
				const vidH = screenVid.videoHeight;

				// Visible source window inside the video
				const cropW = vidW / currentZoom;
				const cropH = vidH / currentZoom;

				const centerX = currentPanX * vidW;
				const centerY = currentPanY * vidH;

				const cropX = Math.max(0, Math.min(vidW - cropW, centerX - cropW / 2));
				const cropY = Math.max(0, Math.min(vidH - cropH, centerY - cropH / 2));

				ctx.drawImage(
					screenVid,
					cropX,
					cropY,
					cropW,
					cropH,
					0,
					0,
					canvas.width,
					canvas.height,
				);
			}

			// Draw Camera Picture-in-Picture (PiP)
			if (
				isCameraEnabled &&
				camVid &&
				camVid.readyState >= 2 &&
				camVid.videoWidth > 0
			) {
				const padding = 40;
				const size = pipSize * 1.5; // scaled for 1080p canvas
				let pipX = canvas.width - size - padding;
				let pipY = canvas.height - size - padding;

				if (pipPosition === "bottom-left") {
					pipX = padding;
					pipY = canvas.height - size - padding;
				} else if (pipPosition === "top-right") {
					pipX = canvas.width - size - padding;
					pipY = padding;
				} else if (pipPosition === "top-left") {
					pipX = padding;
					pipY = padding;
				}

				ctx.save();

				// Drop shadow for PiP
				ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
				ctx.shadowBlur = 32;
				ctx.shadowOffsetX = 0;
				ctx.shadowOffsetY = 8;

				ctx.beginPath();
				if (pipShape === "circle") {
					const radius = size / 2;
					ctx.arc(pipX + radius, pipY + radius, radius, 0, Math.PI * 2);
				} else {
					const cornerRadius = 24;
					ctx.roundRect(pipX, pipY, size, (size * 9) / 16, cornerRadius);
				}
				ctx.closePath();
				ctx.clip();

				// Mirror camera horizontally if set
				if (mirrorCamera) {
					ctx.translate(pipX + size, pipY);
					ctx.scale(-1, 1);
					ctx.drawImage(
						camVid,
						0,
						0,
						size,
						pipShape === "circle" ? size : (size * 9) / 16,
					);
				} else {
					ctx.drawImage(
						camVid,
						pipX,
						pipY,
						size,
						pipShape === "circle" ? size : (size * 9) / 16,
					);
				}

				ctx.restore();

				// Border ring around PiP in brand orange
				ctx.save();
				ctx.lineWidth = 5;
				ctx.strokeStyle = "rgba(249, 115, 22, 0.95)"; // Brand Orange glow
				ctx.beginPath();
				if (pipShape === "circle") {
					const radius = size / 2;
					ctx.arc(pipX + radius, pipY + radius, radius, 0, Math.PI * 2);
				} else {
					ctx.roundRect(pipX, pipY, size, (size * 9) / 16, 24);
				}
				ctx.stroke();
				ctx.restore();
			}

			animFrameRef.current = requestAnimationFrame(render);
		};

		animFrameRef.current = requestAnimationFrame(render);
	};

	// Start recording with 3-second countdown
	const triggerCountdown = () => {
		setStatus("countdown");
		setCountdown(3);
		let count = 3;
		const timer = setInterval(() => {
			count -= 1;
			if (count > 0) {
				setCountdown(count);
			} else {
				clearInterval(timer);
				startActualRecording();
			}
		}, 1000);
	};

	const startActualRecording = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const canvasStream = canvas.captureStream(60);
		const audioCtx = new AudioContext();
		const dest = audioCtx.createMediaStreamDestination();

		if (micStream && micStream.getAudioTracks().length > 0) {
			const micSource = audioCtx.createMediaStreamSource(micStream);
			micSource.connect(dest);
		}

		if (screenStream && screenStream.getAudioTracks().length > 0) {
			const sysSource = audioCtx.createMediaStreamSource(screenStream);
			sysSource.connect(dest);
		}

		const combinedStream = new MediaStream([
			...canvasStream.getVideoTracks(),
			...dest.stream.getAudioTracks(),
		]);

		recordedChunksRef.current = [];

		let mimeType = "video/webm;codecs=vp9,opus";
		if (!MediaRecorder.isTypeSupported(mimeType)) {
			mimeType = "video/webm";
		}

		const recorder = new MediaRecorder(combinedStream, {
			mimeType,
			videoBitsPerSecond: 6_000_000,
		});

		recorder.ondataavailable = (e) => {
			if (e.data && e.data.size > 0) {
				recordedChunksRef.current.push(e.data);
			}
		};

		recorder.onstop = () => {
			const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
			setRecordedBlob(blob);
			const url = URL.createObjectURL(blob);
			setRecordedUrl(url);
			setStatus("preview");
		};

		recorder.start(1000);
		mediaRecorderRef.current = recorder;
		setStatus("recording");
		setElapsedSeconds(0);
		toast.success("Recording started! Press Stop or close when done.");
	};

	const pauseRecording = () => {
		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state === "recording"
		) {
			mediaRecorderRef.current.pause();
			setStatus("paused");
		}
	};

	const resumeRecording = () => {
		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state === "paused"
		) {
			mediaRecorderRef.current.resume();
			setStatus("recording");
		}
	};

	const stopRecording = () => {
		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state !== "inactive"
		) {
			mediaRecorderRef.current.stop();
		}
	};

	// Open directly in the AmberCut Video Editor
	const handleOpenInEditor = async () => {
		if (!recordedBlob) return;
		setIsExporting(true);

		try {
			const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
			const file = new File([recordedBlob], `Screen Recording ${timestamp}.webm`, {
				type: "video/webm",
			});

			const projectId = await editor.project.createNewProject({
				name: `Screen Recording ${timestamp}`,
			});

			const processedAssets = await processMediaAssets({
				files: [file],
			});

			for (const asset of processedAssets) {
				await editor.media.addMediaAsset({
					projectId,
					asset,
				});
			}

			toast.success("Project created with your recording!");
			onOpenChange(false);
			router.push(`/editor/${projectId}`);
		} catch (error) {
			console.error("Failed to load recording into editor:", error);
			toast.error("Could not load recording into editor.");
		} finally {
			setIsExporting(false);
		}
	};

	const handleDownload = () => {
		if (!recordedUrl) return;
		const a = document.createElement("a");
		a.href = recordedUrl;
		a.download = `recording-${Date.now()}.webm`;
		a.click();
		toast.success("Download started!");
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
			.toString()
			.padStart(2, "0");
		const secs = (seconds % 60).toString().padStart(2, "0");
		return `${mins}:${secs}`;
	};

	const handleRegionFocus = (quadrant: string) => {
		if (quadrant === "center") setFocusPoint({ x: 0.5, y: 0.5 });
		if (quadrant === "top-left") setFocusPoint({ x: 0.25, y: 0.25 });
		if (quadrant === "top-right") setFocusPoint({ x: 0.75, y: 0.25 });
		if (quadrant === "bottom-left") setFocusPoint({ x: 0.25, y: 0.75 });
		if (quadrant === "bottom-right") setFocusPoint({ x: 0.75, y: 0.75 });
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl bg-card border-border text-foreground p-0 overflow-hidden shadow-2xl rounded-xl">
				{/* Top Header Bar */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
					<div className="flex items-center gap-3">
						<div className="size-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
							<Monitor className="size-4" />
						</div>
						<div>
							<DialogTitle className="text-base font-semibold flex items-center gap-2">
								Screen & Launch Video Studio
								<Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-medium text-[11px] rounded-md">
									PiP & Zoom
								</Badge>
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground">
								Record full screen or windows with live webcam picture-in-picture & smooth zoom
							</DialogDescription>
						</div>
					</div>

					{status === "recording" && (
						<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 animate-pulse font-mono text-xs font-bold">
							<div className="size-2 rounded-full bg-red-500" />
							<span>REC {formatTime(elapsedSeconds)}</span>
						</div>
					)}
				</div>

				{/* Main Content Area */}
				<div className="p-5 flex flex-col gap-5">
					{status === "idle" ? (
						<div className="flex flex-col items-center justify-center py-10 px-4 gap-5 text-center">
							<div className="size-16 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-sm">
								<Monitor className="size-8" />
							</div>

							<div className="max-w-md flex flex-col gap-1.5">
								<h3 className="text-lg font-bold">
									Record Screen & Picture-in-Picture
								</h3>
								<p className="text-xs text-muted-foreground leading-relaxed">
									Create professional launch videos, demos, and tutorials.
									Includes camera overlay and dynamic zoom focus.
								</p>
							</div>

							{/* Configuration Options */}
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg text-left">
								<div className="p-3.5 rounded-lg bg-muted/40 border border-border flex flex-col justify-between gap-2.5">
									<div className="flex items-center justify-between">
										<span className="text-xs font-semibold">Camera PiP</span>
										<Switch
											checked={isCameraEnabled}
											onCheckedChange={setIsCameraEnabled}
										/>
									</div>
									<span className="text-[11px] text-muted-foreground">
										Show face in corner circle
									</span>
								</div>

								<div className="p-3.5 rounded-lg bg-muted/40 border border-border flex flex-col justify-between gap-2.5">
									<div className="flex items-center justify-between">
										<span className="text-xs font-semibold">Microphone</span>
										<Switch
											checked={isMicEnabled}
											onCheckedChange={setIsMicEnabled}
										/>
									</div>
									<span className="text-[11px] text-muted-foreground">
										Narrate with microphone
									</span>
								</div>

								<div className="p-3.5 rounded-lg bg-muted/40 border border-border flex flex-col justify-between gap-2.5">
									<div className="flex items-center justify-between">
										<span className="text-xs font-semibold">System Audio</span>
										<Switch
											checked={isSystemAudioEnabled}
											onCheckedChange={setIsSystemAudioEnabled}
										/>
									</div>
									<span className="text-[11px] text-muted-foreground">
										Capture computer audio
									</span>
								</div>
							</div>

							<Button
								size="default"
								onClick={initializeCapture}
								className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-6 py-5 rounded-lg shadow-md shadow-orange-500/25 text-sm"
							>
								<Monitor className="size-4" />
								Select Screen to Record
							</Button>
						</div>
					) : status === "preview" ? (
						<div className="flex flex-col gap-5">
							<div className="aspect-video bg-black rounded-lg overflow-hidden border border-border relative">
								{recordedUrl && (
									<video
										src={recordedUrl}
										controls
										className="size-full object-contain"
										autoPlay
									/>
								)}
							</div>

							<div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-muted/30 border border-border">
								<div className="flex items-center gap-3">
									<div className="size-8 rounded-full bg-orange-500/15 text-orange-500 flex items-center justify-center">
										<Check className="size-4" />
									</div>
									<div>
										<h4 className="text-xs font-bold">Recording Ready</h4>
										<p className="text-[11px] text-muted-foreground">
											Duration: {formatTime(elapsedSeconds)} • 1080p 60fps
										</p>
									</div>
								</div>

								<div className="flex items-center gap-2.5">
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											setStatus("idle");
											setRecordedBlob(null);
										}}
										className="rounded-lg text-xs"
									>
										<RotateCcw className="size-3.5 mr-1.5" />
										Record Again
									</Button>

									<Button
										variant="outline"
										size="sm"
										onClick={handleDownload}
										className="rounded-lg text-xs"
									>
										<Download className="size-3.5 mr-1.5" />
										Download
									</Button>

									<Button
										size="sm"
										onClick={handleOpenInEditor}
										disabled={isExporting}
										className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-lg shadow-sm"
									>
										<Sparkles className="size-3.5 mr-1.5" />
										{isExporting ? "Opening Editor..." : "Open in Video Editor"}
									</Button>
								</div>
							</div>
						</div>
					) : (
						<div className="flex flex-col gap-4">
							{/* Live Canvas Stage */}
							<div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-border shadow-md">
								<canvas
									ref={canvasRef}
									className="size-full object-contain cursor-crosshair"
									onClick={(e) => {
										const rect = e.currentTarget.getBoundingClientRect();
										const x = (e.clientX - rect.left) / rect.width;
										const y = (e.clientY - rect.top) / rect.height;
										setFocusPoint({ x, y });
									}}
								/>

								{status === "countdown" && (
									<div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30">
										<span className="text-7xl font-black text-orange-400 animate-ping">
											{countdown}
										</span>
										<span className="text-sm text-white font-medium">
											Get ready to record...
										</span>
									</div>
								)}

								{targetZoom > 1 && (
									<div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-md bg-orange-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md">
										<ZoomIn className="size-3" />
										<span>{targetZoom}x Focus Zoom Active</span>
									</div>
								)}
							</div>

							{/* Controls */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-lg bg-muted/30 border border-border">
								{/* Zoom */}
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between">
										<Label className="text-xs font-semibold flex items-center gap-1.5">
											<ZoomIn className="size-3.5 text-orange-500" />
											Zoom & Focus ({targetZoom}x)
										</Label>
										<span className="text-[10px] text-muted-foreground">Demo mode</span>
									</div>
									<div className="flex items-center gap-1.5">
										{([1, 1.5, 2, 2.5] as ZoomPreset[]).map((z) => (
											<Button
												key={z}
												size="sm"
												variant={targetZoom === z ? "default" : "outline"}
												onClick={() => setTargetZoom(z)}
												className={`flex-1 text-xs h-7 rounded-md ${
													targetZoom === z
														? "bg-orange-500 text-white font-bold"
														: "text-muted-foreground"
												}`}
											>
												{z === 1 ? "1x" : `${z}x`}
											</Button>
										))}
									</div>

									{targetZoom > 1 && (
										<div className="flex items-center gap-1 pt-1">
											<span className="text-[10px] text-muted-foreground mr-1">Focus:</span>
											{["center", "top-left", "top-right", "bottom-left", "bottom-right"].map(
												(quad) => (
													<button
														key={quad}
														type="button"
														onClick={() => handleRegionFocus(quad)}
														className="px-1.5 py-0.5 rounded text-[10px] bg-muted hover:bg-accent text-foreground border border-border/50"
													>
														{quad.replace("-", " ")}
													</button>
												),
											)}
										</div>
									)}
								</div>

								{/* PiP */}
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between">
										<Label className="text-xs font-semibold flex items-center gap-1.5">
											<Video className="size-3.5 text-orange-500" />
											Webcam Position
										</Label>
										<Switch
											checked={isCameraEnabled}
											onCheckedChange={setIsCameraEnabled}
										/>
									</div>

									{isCameraEnabled && (
										<div className="flex flex-wrap items-center gap-1">
											{(
												[
													"bottom-right",
													"bottom-left",
													"top-right",
													"top-left",
												] as PipPosition[]
											).map((pos) => (
												<Button
													key={pos}
													size="sm"
													variant={pipPosition === pos ? "default" : "outline"}
													onClick={() => setPipPosition(pos)}
													className={`text-[11px] h-7 px-2 rounded-md capitalize ${
														pipPosition === pos
															? "bg-orange-500 text-white font-semibold"
															: "text-muted-foreground"
													}`}
												>
													{pos.replace("-", " ")}
												</Button>
											))}
										</div>
									)}
								</div>

								{/* Record Actions */}
								<div className="flex flex-col justify-center items-end gap-2">
									{status === "ready" && (
										<Button
											size="default"
											onClick={triggerCountdown}
											className="w-full h-10 bg-red-600 hover:bg-red-500 text-white font-bold gap-2 rounded-lg shadow-sm"
										>
											<Circle className="size-3.5 fill-white" />
											Start Recording
										</Button>
									)}

									{(status === "recording" || status === "paused") && (
										<div className="flex items-center gap-2 w-full">
											{status === "recording" ? (
												<Button
													variant="outline"
													size="sm"
													onClick={pauseRecording}
													className="flex-1 h-9 rounded-lg gap-1.5 font-semibold text-xs"
												>
													<Pause className="size-3.5" />
													Pause
												</Button>
											) : (
												<Button
													variant="outline"
													size="sm"
													onClick={resumeRecording}
													className="flex-1 h-9 rounded-lg border-orange-500/50 text-orange-500 gap-1.5 font-semibold text-xs"
												>
													<Play className="size-3.5" />
													Resume
												</Button>
											)}

											<Button
												size="sm"
												onClick={stopRecording}
												className="flex-1 h-9 bg-red-600 hover:bg-red-500 text-white font-bold gap-1.5 rounded-lg text-xs"
											>
												<Square className="size-3 fill-white" />
												Finish
											</Button>
										</div>
									)}

									<div className="flex items-center justify-between text-[11px] text-muted-foreground w-full">
										<span>1080p 60fps</span>
										<span>Hotkey: Z (Zoom), C (Cam)</span>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
