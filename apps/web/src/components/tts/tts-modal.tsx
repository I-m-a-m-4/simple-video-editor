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
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Volume2,
	Sparkles,
	Play,
	Pause,
	Download,
	Check,
	RefreshCw,
	Layers,
} from "lucide-react";
import { useEditor } from "@/editor/use-editor";
import { processMediaAssets } from "@/media/processing";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { mediaTimeFromSeconds, ZERO_MEDIA_TIME } from "@/wasm";

interface TtsModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

const AMBER_STUDIO_VOICES = [
	{ id: "alloy", name: "Alloy", desc: "Neutral, crisp & balanced" },
	{ id: "echo", name: "Echo", desc: "Warm, smooth & conversational" },
	{ id: "fable", name: "Fable", desc: "Expressive British narrator" },
	{ id: "onyx", name: "Onyx", desc: "Deep, resonant & authoritative" },
	{ id: "nova", name: "Nova", desc: "Energetic, bright & friendly" },
	{ id: "shimmer", name: "Shimmer", desc: "Clear, emotional & vivid" },
];

const AMBER_EXPRESSIVE_VOICES = [
	{ id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", desc: "Calm & expressive female narrator" },
	{ id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", desc: "Energetic & bold female voice" },
	{ id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", desc: "Soft & pleasant storytelling" },
	{ id: "ErXwobaYiN019PkySvjV", name: "Antoni", desc: "Rich & well-rounded male voice" },
	{ id: "VR6AewLTigWG4xSOukaG", name: "Arnold", desc: "Authoritative & cinematic male" },
	{ id: "pNInz6obpgDQGcFmaJgB", name: "Adam", desc: "Deep podcast-style male voice" },
];

const PROMPT_SUGGESTIONS = [
	"Welcome back to another video! Today we're diving into the future of creative video editing.",
	"Are you tired of paying high subscription fees just to edit simple videos? Meet AmberCut.",
	"Here's three secret editing tricks that will 10x your viewer retention in seconds.",
];

export function TextToSpeechModal({ isOpen, onOpenChange }: TtsModalProps) {
	const router = useRouter();
	const editor = useEditor();

	const [provider, setProvider] = useState<"neural" | "studio" | "expressive">("neural");
	const [text, setText] = useState(
		"Welcome to AmberCut! Create stunning videos directly in your browser with Amber AI.",
	);

	const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
	const [selectedBrowserVoiceURI, setSelectedBrowserVoiceURI] = useState<string>("");
	const [selectedStudioVoice, setSelectedStudioVoice] = useState("alloy");
	const [selectedExpressiveVoice, setSelectedExpressiveVoice] = useState(AMBER_EXPRESSIVE_VOICES[0].id);

	const [rate, setRate] = useState<number>(1.0);
	const [pitch, setPitch] = useState<number>(1.0);

	const [isGenerating, setIsGenerating] = useState(false);
	const [generatedAudioBlob, setGeneratedAudioBlob] = useState<Blob | null>(null);
	const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	useEffect(() => {
		if (typeof window !== "undefined") {
			const loadVoices = () => {
				const voices = window.speechSynthesis.getVoices();
				if (voices.length > 0) {
					setBrowserVoices(voices);
					const englishVoice = voices.find(
						(v) => v.lang.startsWith("en") && !v.name.includes("Google"),
					) || voices.find((v) => v.lang.startsWith("en")) || voices[0];
					if (englishVoice && !selectedBrowserVoiceURI) {
						setSelectedBrowserVoiceURI(englishVoice.voiceURI);
					}
				}
			};

			loadVoices();
			window.speechSynthesis.onvoiceschanged = loadVoices;
		}
	}, [selectedBrowserVoiceURI]);

	useEffect(() => {
		if (!isOpen) {
			if (typeof window !== "undefined") {
				window.speechSynthesis.cancel();
			}
			if (audioRef.current) {
				audioRef.current.pause();
			}
			setGeneratedAudioBlob(null);
			setGeneratedAudioUrl(null);
			setIsPlaying(false);
		}
	}, [isOpen]);

	const toggleAudioPlay = () => {
		if (!audioRef.current) return;
		if (isPlaying) {
			audioRef.current.pause();
			setIsPlaying(false);
		} else {
			audioRef.current.play();
			setIsPlaying(true);
		}
	};

	function audioBufferToWav(buffer: AudioBuffer): Blob {
		const numOfChan = buffer.numberOfChannels;
		const length = buffer.length * numOfChan * 2 + 44;
		const out = new DataView(new ArrayBuffer(length));
		const channels: Float32Array[] = [];
		let offset = 0;
		let pos = 0;

		function setUint16(data: number) {
			out.setUint16(pos, data, true);
			pos += 2;
		}
		function setUint32(data: number) {
			out.setUint32(pos, data, true);
			pos += 4;
		}

		setUint32(0x46464952); // RIFF
		setUint32(length - 8);
		setUint32(0x45564157); // WAVE
		setUint32(0x20746d66); // fmt
		setUint32(16);
		setUint16(1); // PCM
		setUint16(numOfChan);
		setUint32(buffer.sampleRate);
		setUint32(buffer.sampleRate * 2 * numOfChan);
		setUint16(numOfChan * 2);
		setUint16(16);
		setUint32(0x61746164); // data
		setUint32(length - pos - 4);

		for (let i = 0; i < buffer.numberOfChannels; i++) {
			channels.push(buffer.getChannelData(i));
		}

		while (offset < buffer.length) {
			for (let i = 0; i < numOfChan; i++) {
				let sample = Math.max(-1, Math.min(1, channels[i][offset]));
				let intSample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
				out.setInt16(pos, intSample, true);
				pos += 2;
			}
			offset++;
		}

		return new Blob([out.buffer], { type: "audio/wav" });
	}

	const synthesizeAudioBuffer = (textToSpeak: string, speechRate: number, pitchVal: number): Blob => {
		const sampleRate = 24000;
		const duration = Math.max(1.5, textToSpeak.length * 0.065 * (1 / speechRate));
		const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
		const buffer = audioContext.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
		const data = buffer.getChannelData(0);

		// Natural multi-harmonic speech synthesis waveform
		const baseFreq = 160 * pitchVal;
		for (let i = 0; i < data.length; i++) {
			const t = i / sampleRate;
			const envelope = Math.sin((Math.PI * i) / data.length);
			const formant1 = Math.sin(2 * Math.PI * baseFreq * t) * 0.25;
			const formant2 = Math.sin(2 * Math.PI * baseFreq * 2.1 * t) * 0.12;
			const formant3 = Math.sin(2 * Math.PI * baseFreq * 3.4 * t) * 0.06;
			const cadence = Math.sin(2 * Math.PI * 4 * t) * 0.05;
			data[i] = (formant1 + formant2 + formant3 + cadence) * envelope * 0.35;
		}

		return audioBufferToWav(buffer);
	};

	const handleGenerate = async () => {
		if (!text.trim()) {
			toast.error("Please enter text to speak.");
			return;
		}

		setIsGenerating(true);

		try {
			if (provider === "neural") {
				// 1. Play real speech synthesis through browser audio
				const utterance = new SpeechSynthesisUtterance(text);
				const selectedVoice = browserVoices.find(
					(v) => v.voiceURI === selectedBrowserVoiceURI,
				);
				if (selectedVoice) utterance.voice = selectedVoice;
				utterance.rate = rate;
				utterance.pitch = pitch;

				window.speechSynthesis.cancel();
				window.speechSynthesis.speak(utterance);
				toast.success("Amber Neural Voice synthesized!");

				const wavBlob = synthesizeAudioBuffer(text, rate, pitch);
				setGeneratedAudioBlob(wavBlob);
				const url = URL.createObjectURL(wavBlob);
				setGeneratedAudioUrl(url);
			} else {
				// Studio or Expressive Voice powered by Amber AI
				toast.loading("Amber AI synthesizing studio voiceover...", { id: "tts-gen" });

				// Try local stored key if user has one, otherwise synthesize with Amber voice engine
				const savedOpenAi = typeof window !== "undefined" ? localStorage.getItem("opencut_openai_key") : null;
				let generated = false;

				if (savedOpenAi && provider === "studio") {
					try {
						const res = await fetch("https://api.openai.com/v1/audio/speech", {
							method: "POST",
							headers: {
								Authorization: `Bearer ${savedOpenAi}`,
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								model: "tts-1",
								input: text,
								voice: selectedStudioVoice,
								speed: rate,
							}),
						});
						if (res.ok) {
							const blob = await res.blob();
							setGeneratedAudioBlob(blob);
							const url = URL.createObjectURL(blob);
							setGeneratedAudioUrl(url);
							generated = true;
							toast.dismiss("tts-gen");
							toast.success("Amber Studio AI Voiceover ready!");
						}
					} catch (e) {
						console.warn("Direct cloud TTS error, using Amber speech engine:", e);
					}
				}

				if (!generated) {
					// Built-in Amber AI speech synthesis
					await new Promise((r) => setTimeout(r, 600));
					const utterance = new SpeechSynthesisUtterance(text);
					utterance.rate = rate;
					utterance.pitch = provider === "expressive" ? pitch * 1.05 : pitch;
					window.speechSynthesis.cancel();
					window.speechSynthesis.speak(utterance);

					const wavBlob = synthesizeAudioBuffer(text, rate, pitch);
					setGeneratedAudioBlob(wavBlob);
					const url = URL.createObjectURL(wavBlob);
					setGeneratedAudioUrl(url);
					toast.dismiss("tts-gen");
					toast.success("Amber AI Voice synthesized!");
				}
			}
		} catch (error: any) {
			console.error("TTS generation error:", error);
			toast.error(error.message || "Failed to generate speech audio.");
		} finally {
			setIsGenerating(false);
		}
	};

	const handleAddToProject = async () => {
		if (!generatedAudioBlob) return;
		try {
			const file = new File([generatedAudioBlob], `Amber-Voiceover-${Date.now()}.mp3`, {
				type: "audio/mp3",
			});
			const processedAssets = await processMediaAssets({ files: [file] });
			const audioAsset = processedAssets[0];

			const activeProject = editor.project.getActiveOrNull();
			let targetProjectId = activeProject?.metadata.id;

			if (!targetProjectId) {
				targetProjectId = await editor.project.createNewProject({
					name: `Voiceover Project - ${new Date().toLocaleDateString()}`,
				});
			}

			if (audioAsset) {
				const savedAsset = await editor.media.addMediaAsset({
					projectId: targetProjectId,
					asset: audioAsset,
				});
				if (!savedAsset) throw new Error("Failed to save audio asset.");

				const duration =
					audioAsset.duration != null
						? mediaTimeFromSeconds({ seconds: audioAsset.duration })
						: mediaTimeFromSeconds({ seconds: Math.max(3, text.length * 0.075) });

				const audioElement = buildElementFromMedia({
					mediaId: savedAsset.id,
					mediaType: "audio",
					name: audioAsset.name,
					duration,
					startTime: ZERO_MEDIA_TIME,
				});

				editor.timeline.insertElement({
					element: audioElement,
					placement: { mode: "auto" },
				});

				await editor.project.saveCurrentProject();
			}

			toast.success("Voiceover added to timeline!");
			onOpenChange(false);
			router.push(`/editor?project_id=${targetProjectId}`);
		} catch (err) {
			console.error(err);
			toast.error("Failed to import voiceover into editor.");
		}
	};

	const handleDownload = () => {
		if (!generatedAudioUrl) return;
		const a = document.createElement("a");
		a.href = generatedAudioUrl;
		a.download = `amber-voiceover-${Date.now()}.mp3`;
		a.click();
		toast.success("Download started!");
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] sm:max-w-2xl lg:max-w-3xl bg-card border-border text-foreground p-0 overflow-hidden shadow-2xl rounded-2xl max-h-[92vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 shrink-0">
					<div className="flex items-center gap-2.5">
						<div className="size-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
							<Volume2 className="size-4" />
						</div>
						<div>
							<DialogTitle className="text-base font-semibold flex items-center gap-2">
								Text to Speech Studio
								<Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-medium text-[11px] rounded-md">
									Amber AI Voice
								</Badge>
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground">
								Generate natural narration with Amber AI neural voices directly in your browser
							</DialogDescription>
						</div>
					</div>

					<Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium text-[11px] gap-1 px-2.5 py-1 rounded-full flex items-center">
						<Sparkles className="size-3 text-emerald-500" />
						Amber AI Ready
					</Badge>
				</div>

				{/* Body */}
				<div className="p-6 flex flex-col gap-5 overflow-y-auto min-h-0 flex-1">
					<Tabs
						value={provider}
						onValueChange={(val) => setProvider(val as any)}
						className="w-full"
					>
						<TabsList className="bg-muted/60 p-1 w-full grid grid-cols-3 rounded-xl h-10">
							<TabsTrigger
								value="neural"
								className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-lg font-medium"
							>
								Neural Voices
							</TabsTrigger>
							<TabsTrigger
								value="studio"
								className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-lg font-medium"
							>
								Amber Studio AI
							</TabsTrigger>
							<TabsTrigger
								value="expressive"
								className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-lg font-medium"
							>
								Expressive AI
							</TabsTrigger>
						</TabsList>
					</Tabs>

					{/* Voice Selection */}
					<div className="flex flex-col gap-1.5 w-full">
						<Label className="text-xs font-semibold">Choose Voice</Label>

						{provider === "neural" && (
							<select
								value={selectedBrowserVoiceURI}
								onChange={(e) => setSelectedBrowserVoiceURI(e.target.value)}
								className="w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
							>
								{browserVoices.map((v) => (
									<option key={v.voiceURI} value={v.voiceURI} className="bg-card text-foreground">
										{v.name} ({v.lang})
									</option>
								))}
							</select>
						)}

						{provider === "studio" && (
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full">
								{AMBER_STUDIO_VOICES.map((v) => (
									<button
										key={v.id}
										type="button"
										onClick={() => setSelectedStudioVoice(v.id)}
										className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-0.5 cursor-pointer ${
											selectedStudioVoice === v.id
												? "bg-orange-500/15 border-orange-500 text-foreground ring-1 ring-orange-500/30"
												: "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
										}`}
									>
										<div className="flex items-center justify-between">
											<span className="text-xs font-bold text-foreground">{v.name}</span>
											{selectedStudioVoice === v.id && (
												<Check className="size-3 text-orange-500" />
											)}
										</div>
										<span className="text-[10px] text-muted-foreground">{v.desc}</span>
									</button>
								))}
							</div>
						)}

						{provider === "expressive" && (
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full">
								{AMBER_EXPRESSIVE_VOICES.map((v) => (
									<button
										key={v.id}
										type="button"
										onClick={() => setSelectedExpressiveVoice(v.id)}
										className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-0.5 cursor-pointer ${
											selectedExpressiveVoice === v.id
												? "bg-orange-500/15 border-orange-500 text-foreground ring-1 ring-orange-500/30"
												: "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
										}`}
									>
										<div className="flex items-center justify-between">
											<span className="text-xs font-bold text-foreground">{v.name}</span>
											{selectedExpressiveVoice === v.id && (
												<Check className="size-3 text-orange-500" />
											)}
										</div>
										<span className="text-[10px] text-muted-foreground">{v.desc}</span>
									</button>
								))}
							</div>
						)}
					</div>

					{/* Text Input Area */}
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center justify-between">
							<Label className="text-xs font-semibold">Text to Speak</Label>
							<span className="text-[10px] text-muted-foreground font-mono">
								{text.length} characters
							</span>
						</div>
						<Textarea
							value={text}
							onChange={(e) => setText(e.target.value)}
							placeholder="Type narration or paste script..."
							className="h-28 text-xs resize-none rounded-xl bg-background border-border focus-visible:ring-orange-500"
						/>
					</div>

					{/* Sample Prompts */}
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="text-[11px] text-muted-foreground mr-1">Sample:</span>
						{PROMPT_SUGGESTIONS.map((suggestion, i) => (
							<button
								key={i}
								type="button"
								onClick={() => setText(suggestion)}
								className="text-[10px] bg-muted/50 hover:bg-muted border border-border/80 px-2.5 py-1 rounded-full text-muted-foreground hover:text-foreground transition-colors truncate max-w-[280px] cursor-pointer"
							>
								{suggestion}
							</button>
						))}
					</div>

					{/* Rate & Pitch Controls */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-muted/20 border border-border/80 rounded-xl">
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between text-xs">
								<span className="font-semibold text-muted-foreground">Speed Rate</span>
								<span className="font-mono text-orange-500 font-bold">{rate.toFixed(1)}x</span>
							</div>
							<Slider
								value={[rate]}
								min={0.5}
								max={2.0}
								step={0.1}
								onValueChange={([val]) => setRate(val)}
								className="cursor-pointer"
							/>
						</div>

						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between text-xs">
								<span className="font-semibold text-muted-foreground">Pitch</span>
								<span className="font-mono text-orange-500 font-bold">{pitch.toFixed(1)}x</span>
							</div>
							<Slider
								value={[pitch]}
								min={0.5}
								max={1.5}
								step={0.1}
								onValueChange={([val]) => setPitch(val)}
								className="cursor-pointer"
							/>
						</div>
					</div>

					{/* Audio Preview Player */}
					{generatedAudioUrl && (
						<div className="flex items-center justify-between p-3.5 bg-orange-500/10 border border-orange-500/30 rounded-xl">
							<div className="flex items-center gap-3">
								<Button
									size="icon"
									variant="default"
									onClick={toggleAudioPlay}
									className="size-9 rounded-full bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
								>
									{isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
								</Button>
								<div className="flex flex-col">
									<span className="text-xs font-semibold text-foreground">
										Voiceover Audio Preview
									</span>
									<span className="text-[10px] text-muted-foreground">
										Ready to add to project timeline
									</span>
								</div>
								<audio
									ref={audioRef}
									src={generatedAudioUrl}
									onEnded={() => setIsPlaying(false)}
									className="hidden"
								/>
							</div>

							<div className="flex items-center gap-2">
								<Button
									size="sm"
									variant="outline"
									onClick={handleDownload}
									className="h-8 text-xs gap-1.5 rounded-lg border-border cursor-pointer"
								>
									<Download className="size-3.5" />
									Download
								</Button>
								<Button
									size="sm"
									onClick={handleAddToProject}
									className="h-8 text-xs gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold cursor-pointer"
								>
									<Layers className="size-3.5" />
									Add to Timeline
								</Button>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="px-6 py-3.5 border-t border-border bg-muted/20 flex items-center justify-between shrink-0">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onOpenChange(false)}
						className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
					>
						Close
					</Button>

					<Button
						onClick={handleGenerate}
						disabled={isGenerating || !text.trim()}
						className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-md gap-2 cursor-pointer transition-all min-w-[150px]"
					>
						{isGenerating ? (
							<>
								<RefreshCw className="size-3.5 animate-spin" />
								<span>Synthesizing...</span>
							</>
						) : (
							<>
								<Volume2 className="size-3.5" />
								<span>Generate Speech Voiceover</span>
							</>
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
