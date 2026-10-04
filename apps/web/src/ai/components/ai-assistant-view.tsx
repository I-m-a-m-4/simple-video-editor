"use client";

import { useEffect, useRef, useState } from "react";
import {
	Bot,
	Check,
	ChevronDown,
	ChevronRight,
	ExternalLink,
	Eye,
	EyeOff,
	Key,
	Play,
	RotateCcw,
	Send,
	Sparkles,
	Square,
	Trash2,
	Wrench,
	Rocket,
} from "lucide-react";
import { LaunchVideoStudio } from "./launch-video-studio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { useAiStore } from "../store";
import { sendAiPrompt, stopAiGeneration } from "../agent";
import { GROQ_MODELS, type AiToolExecution } from "../types";
import { cn } from "@/utils/ui";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const QUICK_ACTIONS = [
	{ label: "🚀 TypeSafe / Jev Launch Video", prompt: "Create a complete animated launch video for TypeSafe announcing Jev, our first System One model." },
	{ label: "Scan Timeline", prompt: "Inspect the timeline and summarize all clips, text, and tracks." },
	{ label: "Clean & Denoise Audio", prompt: "Enhance the audio quality and remove background noise for the clips on the timeline." },
	{ label: "Split at Playhead", prompt: "Split the clip at the current playhead position." },
	{ label: "Mute Audio", prompt: "Mute all audio tracks on the timeline." },
	{ label: "Speed Up 1.5x", prompt: "Increase playback speed to 1.5x for selected elements." },
	{ label: "Add Blur", prompt: "Apply a blur effect to the current video clip." },
];

export function AiAssistantView() {
	const {
		apiKey,
		model,
		messages,
		isGenerating,
		activeToolName,
		setApiKey,
		setModel,
		clearMessages,
	} = useAiStore();

	const [activeTab, setActiveTab] = useState<"chat" | "launch">("chat");
	const [input, setInput] = useState("");
	const [showSettings, setShowSettings] = useState(!apiKey);
	const [apiKeyDraft, setApiKeyDraft] = useState(apiKey);
	const [showKeyText, setShowKeyText] = useState(false);
	const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		setApiKeyDraft(apiKey);
	}, [apiKey]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isGenerating, activeToolName]);

	const handleSend = () => {
		const text = input.trim();
		if (!text || isGenerating) return;
		setInput("");
		sendAiPrompt(text);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const toggleToolExpand = (toolId: string) => {
		setExpandedTools((prev) => ({
			...prev,
			[toolId]: !prev[toolId],
		}));
	};

	const handleSaveKey = () => {
		setApiKey(apiKeyDraft);
		if (apiKeyDraft) {
			setShowSettings(false);
		}
	};

	return (
		<PanelView
			title="AI Assistant (Groq)"
			actions={
				<div className="flex items-center gap-1">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 text-muted-foreground hover:text-foreground"
								onClick={() => setShowSettings(!showSettings)}
							>
								<Key className={cn("size-3.5", apiKey && "text-primary")} />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">API Key & Settings</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 text-muted-foreground hover:text-foreground"
								onClick={clearMessages}
								disabled={messages.length === 0}
							>
								<Trash2 className="size-3.5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">Clear Chat</TooltipContent>
					</Tooltip>
				</div>
			}
			contentClassName="flex flex-col h-full p-0 pb-1"
		>
			<div className="flex flex-col h-full">
				{/* Settings Drawer */}
				{showSettings && (
					<div className="bg-muted/40 border-b p-3 space-y-3 shrink-0 animate-in fade-in slide-in-from-top-2 duration-200">
						<div className="flex items-center justify-between">
							<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
								<Sparkles className="size-3 text-primary" /> Groq Configuration
							</span>
							<a
								href="https://console.groq.com/keys"
								target="_blank"
								rel="noreferrer"
								className="text-[11px] text-primary hover:underline flex items-center gap-1"
							>
								Get free key <ExternalLink className="size-2.5" />
							</a>
						</div>

						<div className="space-y-1.5">
							<label className="text-[11px] text-muted-foreground block">Groq API Key</label>
							<div className="flex gap-1.5">
								<div className="relative flex-1">
									<Input
										type={showKeyText ? "text" : "password"}
										placeholder="gsk_..."
										value={apiKeyDraft}
										onChange={(e) => setApiKeyDraft(e.target.value)}
										className="h-8 text-xs font-mono pr-8"
									/>
									<button
										type="button"
										onClick={() => setShowKeyText(!showKeyText)}
										className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
									>
										{showKeyText ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
									</button>
								</div>
								<Button size="sm" className="h-8 text-xs px-3" onClick={handleSaveKey}>
									Save
								</Button>
							</div>
						</div>

						<div className="space-y-1.5">
							<label className="text-[11px] text-muted-foreground block">Model</label>
							<Select value={model} onValueChange={setModel}>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue placeholder="Select model" />
								</SelectTrigger>
								<SelectContent>
									{GROQ_MODELS.map((m) => (
										<SelectItem key={m} value={m} className="text-xs font-mono">
											{m}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				)}

				{/* Mode Switcher Tabs */}
				<div className="flex border-b border-border bg-muted/20 px-3 py-1.5 gap-1 shrink-0">
					<button
						type="button"
						onClick={() => setActiveTab("chat")}
						className={cn(
							"flex-1 text-xs py-1 px-2.5 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5",
							activeTab === "chat"
								? "bg-background text-foreground shadow-xs font-semibold"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<Bot className="size-3.5" />
						Chat Copilot
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("launch")}
						className={cn(
							"flex-1 text-xs py-1 px-2.5 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5",
							activeTab === "launch"
								? "bg-amber-500/20 text-amber-400 font-semibold shadow-xs border border-amber-500/30"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<Rocket className="size-3.5 text-amber-400" />
						Launch Video Studio
					</button>
				</div>

				{activeTab === "launch" ? (
					<div className="flex-1 overflow-hidden">
						<LaunchVideoStudio />
					</div>
				) : (
					<>
						{/* Quick Action Chips */}
						<div className="p-2 border-b bg-muted/15 flex gap-1.5 overflow-x-auto scrollbar-hidden shrink-0">
					{QUICK_ACTIONS.map((action) => (
						<button
							key={action.label}
							onClick={() => sendAiPrompt(action.prompt)}
							disabled={isGenerating}
							className="text-[11px] whitespace-nowrap px-2 py-1 rounded bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border/50 transition-colors disabled:opacity-50"
						>
							{action.label}
						</button>
					))}
				</div>

				{/* Chat Messages */}
				<div className="flex-1 overflow-y-auto p-3 space-y-3">
					{messages.length === 0 ? (
						<div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground space-y-3 my-auto">
							<div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
								<Bot className="size-6" />
							</div>
							<div className="space-y-1">
								<h3 className="text-sm font-medium text-foreground">Agentic Video Copilot</h3>
								<p className="text-xs max-w-xs text-muted-foreground">
									Powered by Groq's high-speed inference. Ask me to split clips, insert media, add titles, adjust speeds, or inspect your timeline.
								</p>
							</div>
						</div>
					) : (
						messages.map((msg) => (
							<div
								key={msg.id}
								className={cn(
									"flex flex-col text-xs space-y-1.5 animate-in fade-in duration-150",
									msg.role === "user" ? "items-end" : "items-start",
								)}
							>
								{/* Role Label */}
								<span className="text-[10px] text-muted-foreground px-1">
									{msg.role === "user" ? "You" : "AmberCut AI"}
								</span>

								{/* Message Content */}
								<div
									className={cn(
										"rounded-lg px-3 py-2 max-w-[92%] leading-relaxed",
										msg.role === "user"
											? "bg-primary text-primary-foreground font-normal"
											: "bg-muted/70 text-foreground border border-border/40",
									)}
								>
									{/* Tool Calls executions (if assistant used tools) */}
									{msg.toolCalls && msg.toolCalls.length > 0 && (
										<div className="space-y-1.5 mb-2.5 pb-2 border-b border-border/40">
											<div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
												<Wrench className="size-2.5 text-primary" /> Executed Actions ({msg.toolCalls.length})
											</div>
											<div className="space-y-1">
												{msg.toolCalls.map((tool) => (
													<ToolExecutionBadge
														key={tool.id}
														tool={tool}
														isExpanded={!!expandedTools[tool.id]}
														onToggle={() => toggleToolExpand(tool.id)}
													/>
												))}
											</div>
										</div>
									)}

									{/* Main text message */}
									{msg.content ? (
										<AiMessageMarkdown content={msg.content} isUser={msg.role === "user"} />
									) : msg.pending ? (
										<div className="flex items-center gap-2 text-muted-foreground py-1">
											<Sparkles className="size-3 animate-spin text-primary" />
											<span>
												{activeToolName
													? `Running tool "${activeToolName}"...`
													: "Thinking..."}
											</span>
										</div>
									) : null}
								</div>
							</div>
						))
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Input Bar */}
				<div className="p-2 border-t bg-background shrink-0 space-y-1.5">
					<div className="relative flex items-center gap-1.5 bg-muted/40 rounded-md border border-input p-1 focus-within:ring-1 focus-within:ring-ring">
						<textarea
							ref={textareaRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Tell AI what to edit or ask about your video..."
							rows={1}
							className="flex-1 bg-transparent px-2 py-1.5 text-xs focus:outline-none resize-none min-h-[34px] max-h-24 scrollbar-hidden"
						/>
						{isGenerating ? (
							<Button
								size="icon"
								variant="destructive"
								className="h-7 w-7 shrink-0 rounded"
								onClick={stopAiGeneration}
								title="Stop generation"
							>
								<Square className="size-3 fill-current" />
							</Button>
						) : (
							<Button
								size="icon"
								className="h-7 w-7 shrink-0 rounded bg-primary text-primary-foreground hover:bg-primary/90"
								onClick={handleSend}
								disabled={!input.trim()}
								title="Send prompt"
							>
								<Send className="size-3.5" />
							</Button>
						)}
					</div>
					<div className="flex justify-between items-center px-1 text-[10px] text-muted-foreground">
						<span>Press Enter to send, Shift+Enter for new line</span>
						<span className="font-mono text-amber-500 font-medium">Amber AI</span>
					</div>
				</div>
					</>
				)}
			</div>
		</PanelView>
	);
}

function ToolExecutionBadge({
	tool,
	isExpanded,
	onToggle,
}: {
	tool: AiToolExecution;
	isExpanded: boolean;
	onToggle: () => void;
}) {
	const isError = !!tool.error;

	return (
		<div className="rounded border border-border/50 bg-background/50 overflow-hidden text-[11px]">
			<button
				type="button"
				onClick={onToggle}
				className="w-full flex items-center justify-between px-2 py-1 hover:bg-muted/50 transition-colors text-left font-mono"
			>
				<span className="flex items-center gap-1.5 truncate">
					{isExpanded ? (
						<ChevronDown className="size-3 text-muted-foreground" />
					) : (
						<ChevronRight className="size-3 text-muted-foreground" />
					)}
					<span className={cn(isError ? "text-destructive" : "text-foreground font-medium")}>
						{tool.name}
					</span>
				</span>
				<Badge
					variant={isError ? "destructive" : "outline"}
					className="text-[9px] px-1 py-0 h-4 uppercase font-sans font-normal"
				>
					{isError ? "error" : "success"}
				</Badge>
			</button>

			{isExpanded && (
				<div className="p-2 border-t border-border/40 bg-muted/20 font-mono text-[10px] space-y-1 overflow-x-auto max-h-40">
					{Object.keys(tool.args).length > 0 && (
						<div>
							<div className="text-muted-foreground font-sans font-semibold">Arguments:</div>
							<pre className="text-muted-foreground">{JSON.stringify(tool.args, null, 2)}</pre>
						</div>
					)}
					<div>
						<div className="text-muted-foreground font-sans font-semibold">Result:</div>
						<pre className={cn(isError ? "text-destructive" : "text-muted-foreground")}>
							{JSON.stringify(tool.result, null, 2)}
						</pre>
					</div>
				</div>
			)}
		</div>
	);
}

function AiMessageMarkdown({ content, isUser }: { content: string; isUser: boolean }) {
	if (isUser) {
		return <div className="whitespace-pre-wrap select-text">{content}</div>;
	}

	return (
		<div className="select-text space-y-2 text-xs leading-relaxed overflow-hidden">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					h1: ({ children }) => <h1 className="text-sm font-bold text-foreground mt-3 mb-1.5">{children}</h1>,
					h2: ({ children }) => <h2 className="text-xs font-bold text-foreground mt-2.5 mb-1 flex items-center gap-1.5">{children}</h2>,
					h3: ({ children }) => <h3 className="text-xs font-semibold text-foreground mt-2 mb-1">{children}</h3>,
					p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
					ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 mb-2 text-foreground/90">{children}</ul>,
					ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 mb-2 text-foreground/90">{children}</ol>,
					li: ({ children }) => <li className="leading-snug">{children}</li>,
					hr: () => <hr className="my-2.5 border-border/50" />,
					strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
					em: ({ children }) => <em className="italic">{children}</em>,
					code: ({ inline, className, children, ...props }: any) =>
						inline ? (
							<code className="rounded bg-background/80 px-1 py-0.5 font-mono text-[11px] text-primary border border-border/50">
								{children}
							</code>
						) : (
							<pre className="overflow-x-auto rounded bg-background/90 p-2 my-1.5 font-mono text-[11px] border border-border/50">
								<code>{children}</code>
							</pre>
						),
					table: ({ children }) => (
						<div className="overflow-x-auto my-2 rounded border border-border/60 bg-background/60 shadow-sm">
							<table className="w-full text-[11px] text-left border-collapse">{children}</table>
						</div>
					),
					thead: ({ children }) => <thead className="bg-muted/60 border-b border-border/60 text-foreground font-semibold">{children}</thead>,
					tbody: ({ children }) => <tbody className="divide-y divide-border/40">{children}</tbody>,
					tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
					th: ({ children }) => <th className="px-2.5 py-1.5 font-semibold text-foreground">{children}</th>,
					td: ({ children }) => <td className="px-2.5 py-1.5 text-foreground/90 align-top">{children}</td>,
					a: ({ href, children }) => (
						<a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
							{children}
						</a>
					),
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}

