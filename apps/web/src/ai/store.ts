import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
	type AiChatItem,
	type AiSettings,
	DEFAULT_GROQ_MODEL,
} from "./types";
import {
	saveChatMessages,
	loadChatMessages,
	clearChatMessages,
} from "@/services/firebase";

interface AiState extends AiSettings {
	systemInstructions: string;
	messages: AiChatItem[];
	isGenerating: boolean;
	activeToolName: string | null;
	projectId: string | null;

	setApiKey: (apiKey: string) => void;
	setModel: (model: string) => void;
	setSystemInstructions: (instructions: string) => void;
	addMessage: (message: AiChatItem) => void;
	updateMessage: (id: string, patch: Partial<AiChatItem>) => void;
	clearMessages: () => void;
	setIsGenerating: (isGenerating: boolean) => void;
	setActiveToolName: (toolName: string | null) => void;
	setProjectId: (projectId: string) => void;
	syncToFirebase: () => void;
	loadFromFirebase: (projectId: string) => Promise<void>;
}

const DEFAULT_SYSTEM_INSTRUCTIONS = `You are AmberCut AI, an expert agentic video editing assistant built directly into the AmberCut editor.
You have direct programmatic control over the video project via tools.

Rules & Guidelines:
1. When asked to perform edits or answer questions about the video, ALWAYS start by inspecting the project with \`get_timeline_state\` unless you already have fresh timeline data.
2. If the user asks to add footage or audio, check \`list_media_assets\` to find available asset IDs before adding them.
3. Be proactive and perform multi-step workflows when appropriate (e.g. split a clip, adjust its volume, add text above it).
4. After completing an edit or a chain of edits, explain clearly and concisely what changes you made.
5. All times are measured in seconds. Use accurate decimal values when needed.`;

export const DEFAULT_GROQ_KEY =
	process.env.NEXT_PUBLIC_GROQ_API_KEY || "";

/** Debounced sync timer — avoids hammering Firestore during tool-call loops */
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSync(projectId: string | null, messages: AiChatItem[]) {
	if (syncTimer) clearTimeout(syncTimer);
	if (!projectId) return;
	syncTimer = setTimeout(() => {
		saveChatMessages(projectId, messages);
	}, 1500);
}

export const useAiStore = create<AiState>()(
	persist(
		(set, get) => ({
			apiKey: DEFAULT_GROQ_KEY,
			model: DEFAULT_GROQ_MODEL,
			systemInstructions: DEFAULT_SYSTEM_INSTRUCTIONS,
			messages: [],
			isGenerating: false,
			activeToolName: null,
			projectId: null,

			setApiKey: (apiKey) => set({ apiKey: apiKey.trim() }),
			setModel: (model) => set({ model }),
			setSystemInstructions: (systemInstructions) => set({ systemInstructions }),
			addMessage: (message) => {
				set((state) => {
					const newMessages = [...state.messages, message];
					debouncedSync(state.projectId, newMessages);
					return { messages: newMessages };
				});
			},
			updateMessage: (id, patch) => {
				set((state) => {
					const newMessages = state.messages.map((m) =>
						m.id === id ? { ...m, ...patch } : m,
					);
					// Only sync when a message is finalized (not pending)
					const updated = newMessages.find((m) => m.id === id);
					if (updated && !updated.pending) {
						debouncedSync(state.projectId, newMessages);
					}
					return { messages: newMessages };
				});
			},
			clearMessages: () => {
				const { projectId } = get();
				set({ messages: [] });
				if (projectId) {
					clearChatMessages(projectId);
				}
			},
			setIsGenerating: (isGenerating) => set({ isGenerating }),
			setActiveToolName: (activeToolName) => set({ activeToolName }),
			setProjectId: (projectId) => {
				set({ projectId });
			},
			syncToFirebase: () => {
				const { projectId, messages } = get();
				if (projectId) {
					saveChatMessages(projectId, messages);
				}
			},
			loadFromFirebase: async (projectId: string) => {
				const loaded = await loadChatMessages(projectId);
				if (loaded.length > 0) {
					set({ messages: loaded, projectId });
				} else {
					set({ projectId });
				}
			},
		}),
		{
			name: "opencut-ai-settings",
			version: 1,
			migrate: (persistedState: unknown) => {
				const state = persistedState as Partial<AiState>;
				if (state && (state.model === "llama-3.3-70b-versatile" || !state.model)) {
					state.model = DEFAULT_GROQ_MODEL;
				}
				return state;
			},
			onRehydrateStorage: () => (state) => {
				if (state && (state.model === "llama-3.3-70b-versatile" || !state.model)) {
					state.setModel(DEFAULT_GROQ_MODEL);
				}
			},
			partialize: (state) => ({
				apiKey: state.apiKey,
				model: state.model,
				systemInstructions: state.systemInstructions,
			}),
		},
	),
);

