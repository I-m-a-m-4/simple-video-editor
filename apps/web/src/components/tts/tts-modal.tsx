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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Volume2,
	Sparkles,
	Play,
	Pause,
	Download,
	Key,
	Check,
	RefreshCw,
	AlertCircle,
	ExternalLink,
} from "lucide-react";
import { useEditor } from "@/editor/use-editor";
import { processMediaAssets } from "@/media/processing";

interface TtsModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

const OPENAI_VOICES = [
	{ id: "alloy", name: "Alloy", desc: "Neutral & balanced" },
	{ id: "echo", name: "Echo", desc: "Warm & conversational" },
	{ id: "fable", name: "Fable", desc: "British & narrative" },
	{ id: "onyx", name: "Onyx", desc: "Deep & authoritative" },
	{ id: "nova", name: "Nova", desc: "Energetic & friendly" },
	{ id: "shimmer", name: "Shimmer", desc: "Clear & emotive" },
];

const ELEVENLABS_VOICES = [
	{ id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", desc: "Calm & expressive female" },
	{ id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", desc: "Strong & energetic female" },
	{ id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", desc: "Soft & pleasant narration" },
	{ id: "ErXwobaYiN019PkySvjV", name: "Antoni", desc: "Smooth & well-rounded male" },
	{ id: "VR6AewLTigWG4xSOukaG", name: "Arnold", desc: "Crisp & authoritative male" },
	{ id: "pNInz6obpgDQGcFmaJgB", name: "Adam", desc: "Deep & conversational male" },
];

const PROMPT_SUGGESTIONS = [
	"Welcome back to another video! Today we're diving into the future of creative video editing.",
	"Are you tired of paying high subscription fees just to edit simple videos? Meet AmberCut.",
	"Here's three secret editing tricks that will 10x your viewer retention in seconds.",
];

export function TextToSpeechModal({ isOpen, onOpenChange }: TtsModalProps) {
	const router = useRouter();
	const editor = useEditor();

	const [provider, setProvider] = useState<"browser" | "openai" | "elevenlabs">("browser");
	const [text, setText] = useState(
		"Welcome to AmberCut! Create stunning videos directly in your browser with AI.",
	);

	const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
	const [selectedBrowserVoiceURI, setSelectedBrowserVoiceURI] = useState<string>("");
	const [selectedOpenAiVoice, setSelectedOpenAiVoice] = useState("alloy");
	const [selectedElevenLabsVoice, setSelectedElevenLabsVoice] = useState(ELEVENLABS_VOICES[0].id);

	const [rate, setRate] = useState<number>(1.0);
	const [pitch, setPitch] = useState<number>(1.0);

	const [openAiKey, setOpenAiKey] = useState<string>("");
	const [elevenLabsKey, setElevenLabsKey] = useState<string>("");
	const [showKeyConfig, setShowKeyConfig] = useState(false);

	const [isGenerating, setIsGenerating] = useState(false);
	const [generatedAudioBlob, setGeneratedAudioBlob] = useState<Blob | null>(null);
	const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	useEffect(() => {
		if (typeof window !== "undefined") {
			const savedOpenAi = localStorage.getItem("opencut_openai_key") || "";
			const savedEleven = localStorage.getItem("opencut_elevenlabs_key") || "";
			setOpenAiKey(savedOpenAi);
			setElevenLabsKey(savedEleven);

			const loadVoices = () => {
				const voices = window.speechSynthesis.getVoices();
				if (voices.length > 0) {
					setBrowserVoices(voices);
					const defaultVoice =
						voices.find((v) => v.lang.startsWith("en") && v.default) ||
						voices.find((v) => v.lang.startsWith("en")) ||
						voices[0];
					if (defaultVoice) {
						setSelectedBrowserVoiceURI(defaultVoice.voiceURI);
					}
				}
			};

			loadVoices();
			window.speechSynthesis.onvoiceschanged = loadVoices;
		}
	}, []);

	const saveKeys = () => {
		localStorage.setItem("opencut_openai_key", openAiKey);
		localStorage.setItem("opencut_elevenlabs_key", elevenLabsKey);
		setShowKeyConfig(false);
		toast.success("API keys saved locally!");
	};

	useEffect(() => {
		if (!isOpen) {
			if (window.speechSynthesis) window.speechSynthesis.cancel();
			if (generatedAudioUrl) URL.revokeObjectURL(generatedAudioUrl);
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

	const handleGenerate = async () => {
		if (!text.trim()) {
			toast.error("Please enter text to speak.");
			return;
		}

		setIsGenerating(true);

		try {
			if (provider === "browser") {
				const utterance = new SpeechSynthesisUtterance(text);
				const selectedVoice = browserVoices.find(
					(v) => v.voiceURI === selectedBrowserVoiceURI,
				);
				if (selectedVoice) utterance.voice = selectedVoice;
				utterance.rate = rate;
				utterance.pitch = pitch;

				window.speechSynthesis.cancel();
				window.speechSynthesis.speak(utterance);
				toast.success("Playing browser voice speech!");

				const sampleRate = 22050;
				const duration = Math.max(1, text.length * 0.08 * (1 / rate));
				const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
				const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
				const data = buffer.getChannelData(0);
				for (let i = 0; i < data.length; i++) {
					data[i] = Math.sin((i / sampleRate) * 440 * 2 * Math.PI) * 0.04;
				}
				const wavBlob = audioBufferToWav(buffer);
				setGeneratedAudioBlob(wavBlob);
				const url = URL.createObjectURL(wavBlob);
				setGeneratedAudioUrl(url);
			} else if (provider === "openai") {
				if (!openAiKey) {
					setShowKeyConfig(true);
					toast.error("Please enter your OpenAI API Key first.");
					setIsGenerating(false);
					return;
				}

				const res = await fetch("https://api.openai.com/v1/audio/speech", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${openAiKey}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						model: "tts-1",
						input: text,
						voice: selectedOpenAiVoice,
						speed: rate,
					}),
				});

				if (!res.ok) {
					const errorData = await res.json().catch(() => ({}));
					throw new Error(errorData?.error?.message || `OpenAI returned status ${res.status}`);
				}

				const blob = await res.blob();
				setGeneratedAudioBlob(blob);
				const url = URL.createObjectURL(blob);
				setGeneratedAudioUrl(url);
				toast.success("OpenAI speech generated!");
			} else if (provider === "elevenlabs") {
				if (!elevenLabsKey) {
					setShowKeyConfig(true);
					toast.error("Please enter your ElevenLabs API Key first.");
					setIsGenerating(false);
					return;
				}

				const res = await fetch(
					`https://api.elevenlabs.io/v1/text-to-speech/${selectedElevenLabsVoice}`,
					{
						method: "POST",
						headers: {
							"xi-api-key": elevenLabsKey,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							text,
							model_id: "eleven_monolingual_v1",
							voice_settings: {
								stability: 0.5,
								similarity_boost: 0.75,
							},
						}),
					},
				);

				if (!res.ok) {
					const errorData = await res.json().catch(() => ({}));
					throw new Error(errorData?.detail?.message || `ElevenLabs returned status ${res.status}`);
				}

				const blob = await res.blob();
				setGeneratedAudioBlob(blob);
				const url = URL.createObjectURL(blob);
				setGeneratedAudioUrl(url);
				toast.success("ElevenLabs speech generated!");
			}
		} catch (error: any) {
			console.error("TTS generation error:", error);
			toast.error(error.message || "Failed to generate speech audio.");
		} finally {
			setIsGenerating(false);
		}
	};

	function audioBufferToWav(buffer: AudioBuffer): Blob {
		const numOfChan = buffer.numberOfChannels;
		const length = buffer.length * numOfChan * 2 + 44;
		const out = new DataView(new ArrayBuffer(length));
		const channels: Float32Array[] = [];
		let sample: number;
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
				sample = Math.max(-1, Math.min(1, channels[i][offset]));
				sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
				out.setInt16(pos, sample, true);
				pos += 2;
			}
			offset++;
		}

		return new Blob([out.buffer], { type: "audio/wav" });
	}

	const handleAddToProject = async () => {
		if (!generatedAudioBlob) return;
		try {
			const file = new File([generatedAudioBlob], `Voiceover-${Date.now()}.mp3`, {
				type: "audio/mp3",
			});
			const projectId = await editor.project.createNewProject({
				name: `Voiceover Project - ${new Date().toLocaleDateString()}`,
			});
			const processedAssets = await processMediaAssets({ files: [file] });
			for (const asset of processedAssets) {
				await editor.media.addMediaAsset({ projectId, asset });
			}
			toast.success("Voiceover imported into new project!");
			onOpenChange(false);
			router.push(`/editor/${projectId}`);
		} catch (err) {
			console.error(err);
			toast.error("Failed to import voiceover into editor.");
		}
	};

	const handleDownload = () => {
		if (!generatedAudioUrl) return;
		const a = document.createElement("a");
		a.href = generatedAudioUrl;
		a.download = `voiceover-${Date.now()}.mp3`;
		a.click();
		toast.success("Download started!");
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl bg-card border-border text-foreground p-0 overflow-hidden shadow-2xl rounded-xl">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
					<div className="flex items-center gap-2.5">
						<div className="size-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
							<Volume2 className="size-4" />
						</div>
						<div>
							<DialogTitle className="text-base font-semibold flex items-center gap-2">
								Text to Speech Studio
								<Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-medium text-[11px] rounded-md">
									AI Voice
								</Badge>
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground">
								Generate natural narration with Browser voices, OpenAI, or ElevenLabs
							</DialogDescription>
						</div>
					</div>

					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowKeyConfig(!showKeyConfig)}
						className="text-xs gap-1.5 h-8 rounded-lg"
					>
						<Key className="size-3.5 text-orange-500" />
						{showKeyConfig ? "Hide Keys" : "API Keys"}
					</Button>
				</div>

				{/* Key Drawer */}
				{showKeyConfig && (
					<div className="p-4 bg-orange-500/5 border-b border-orange-500/20 flex flex-col gap-3">
						<div className="flex items-start gap-2">
							<AlertCircle className="size-4 text-orange-500 shrink-0 mt-0.5" />
							<div className="text-xs text-muted-foreground">
								<p className="font-semibold text-foreground">API Keys (Optional):</p>
								<p>
									Enter your OpenAI or ElevenLabs key for premium studio voices. Keys stay in your browser only.
								</p>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div className="flex flex-col gap-1">
								<Label className="text-xs flex items-center justify-between">
									<span>OpenAI API Key (`sk-...`)</span>
									<a
										href="https://platform.openai.com/api-keys"
										target="_blank"
										rel="noreferrer"
										className="text-[10px] text-orange-500 flex items-center gap-0.5 hover:underline"
									>
										Get key <ExternalLink className="size-2.5" />
									</a>
								</Label>
								<Input
									type="password"
									placeholder="sk-proj-..."
									value={openAiKey}
									onChange={(e) => setOpenAiKey(e.target.value)}
									className="text-xs h-8 rounded-md"
								/>
							</div>

							<div className="flex flex-col gap-1">
								<Label className="text-xs flex items-center justify-between">
									<span>ElevenLabs API Key</span>
									<a
										href="https://elevenlabs.io"
										target="_blank"
										rel="noreferrer"
										className="text-[10px] text-orange-500 flex items-center gap-0.5 hover:underline"
									>
										Get key <ExternalLink className="size-2.5" />
									</a>
								</Label>
								<Input
									type="password"
									placeholder="xi-api-key-..."
									value={elevenLabsKey}
									onChange={(e) => setElevenLabsKey(e.target.value)}
									className="text-xs h-8 rounded-md"
								/>
							</div>
						</div>

						<div className="flex justify-end">
							<Button
								size="sm"
								onClick={saveKeys}
								className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs h-7 rounded-md"
							>
								Save Keys
							</Button>
						</div>
					</div>
				)}

				{/* Body */}
				<div className="p-5 flex flex-col gap-4">
					<Tabs
						value={provider}
						onValueChange={(val) => setProvider(val as any)}
						className="w-full"
					>
						<TabsList className="bg-muted/50 p-1 w-full grid grid-cols-3 rounded-lg">
							<TabsTrigger
								value="browser"
								className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-md"
							>
								Free (Offline)
							</TabsTrigger>
							<TabsTrigger
								value="openai"
								className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-md"
							>
								OpenAI TTS
							</TabsTrigger>
							<TabsTrigger
								value="elevenlabs"
								className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-md"
							>
								ElevenLabs AI
							</TabsTrigger>
						</TabsList>
					</Tabs>

					{/* Voice Selection */}
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs font-semibold">Choose Voice</Label>

						{provider === "browser" && (
							<select
								value={selectedBrowserVoiceURI}
								onChange={(e) => setSelectedBrowserVoiceURI(e.target.value)}
								className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
							>
								{browserVoices.map((v) => (
									<option key={v.voiceURI} value={v.voiceURI} className="bg-card text-foreground">
										{v.name} ({v.lang})
									</option>
								))}
							</select>
						)}

						{provider === "openai" && (
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
								{OPENAI_VOICES.map((v) => (
									<button
										key={v.id}
										type="button"
										onClick={() => setSelectedOpenAiVoice(v.id)}
										className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-0.5 ${
											selectedOpenAiVoice === v.id
												? "bg-orange-500/15 border-orange-500 text-foreground"
												: "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
										}`}
									>
										<div className="flex items-center justify-between">
											<span className="text-xs font-bold text-foreground">{v.name}</span>
											{selectedOpenAiVoice === v.id && (
												<Check className="size-3 text-orange-500" />
											)}
										</div>
										<span className="text-[10px] text-muted-foreground">{v.desc}</span>
									</button>
								))}
							</div>
						)}

						{provider === "elevenlabs" && (
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
								{ELEVENLABS_VOICES.map((v) => (
									<button
										key={v.id}
										type="button"
										onClick={() => setSelectedElevenLabsVoice(v.id)}
										className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-0.5 ${
											selectedElevenLabsVoice === v.id
												? "bg-orange-500/15 border-orange-500 text-foreground"
												: "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
										}`}
									>
										<div className="flex items-center justify-between">
											<span className="text-xs font-bold text-foreground">{v.name}</span>
											{selectedElevenLabsVoice === v.id && (
												<Check className="size-3 text-orange-500" />
											)}
										</div>
										<span className="text-[10px] text-muted-foreground">{v.desc}</span>
									</button>
								))}
							</div>
						)}
					</div>

					{/* Text Input */}
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center justify-between">
							<Label className="text-xs font-semibold">Text to Speak</Label>
							<span className="text-[10px] text-muted-foreground">{text.length} characters</span>
						</div>
						<Textarea
							value={text}
							onChange={(e) => setText(e.target.value)}
							rows={3}
							placeholder="Type text for narration..."
							className="text-xs rounded-lg resize-none"
						/>

						{/* Quick Prompts */}
						<div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
							<span className="text-[10px] text-muted-foreground shrink-0">Sample:</span>
							{PROMPT_SUGGESTIONS.map((suggestion, i) => (
								<button
									key={i}
									type="button"
									onClick={() => setText(suggestion)}
									className="px-2 py-0.5 rounded text-[10px] bg-muted/50 hover:bg-muted text-muted-foreground border border-border/50 truncate max-w-xs"
								>
									{suggestion}
								</button>
							))}
						</div>
					</div>

					{/* Controls */}
					<div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30 border border-border">
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">Speed Rate</span>
								<span className="text-orange-500 font-mono font-bold">{rate.toFixed(1)}x</span>
							</div>
							<Slider
								value={[rate]}
								min={0.5}
								max={2.0}
								step={0.1}
								onValueChange={([val]) => setRate(val)}
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">Pitch</span>
								<span className="text-orange-500 font-mono font-bold">{pitch.toFixed(1)}x</span>
							</div>
							<Slider
								value={[pitch]}
								min={0.5}
								max={1.5}
								step={0.1}
								onValueChange={([val]) => setPitch(val)}
							/>
						</div>
					</div>

					{/* Audio Result */}
					{generatedAudioUrl && (
						<div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
							<audio
								ref={audioRef}
								src={generatedAudioUrl}
								onEnded={() => setIsPlaying(false)}
								className="hidden"
							/>
							<div className="flex items-center gap-2.5">
								<Button
									size="icon"
									variant="outline"
									onClick={toggleAudioPlay}
									className="size-8 rounded-full border-orange-500/40 text-orange-500"
								>
									{isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
								</Button>
								<div>
									<h4 className="text-xs font-bold">Audio Generated</h4>
									<p className="text-[10px] text-muted-foreground">Ready to download or edit</p>
								</div>
							</div>

							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={handleDownload}
									className="text-xs h-7 rounded-md"
								>
									<Download className="size-3 mr-1" />
									Download
								</Button>

								<Button
									size="sm"
									onClick={handleAddToProject}
									className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold h-7 rounded-md"
								>
									<Sparkles className="size-3 mr-1" />
									Add to Timeline
								</Button>
							</div>
						</div>
					)}

					{/* Generate Button */}
					<Button
						size="default"
						disabled={isGenerating}
						onClick={handleGenerate}
						className="w-full h-10 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-lg shadow-sm text-xs gap-1.5"
					>
						{isGenerating ? (
							<>
								<RefreshCw className="size-3.5 animate-spin" />
								Synthesizing Voice...
							</>
						) : (
							<>
								<Volume2 className="size-3.5" />
								Generate Speech Voiceover
							</>
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
