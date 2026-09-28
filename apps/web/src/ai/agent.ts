import {
	type AiChatItem,
	type AiToolExecution,
	type GroqChatMessage,
	type GroqChatResponse,
	GROQ_API_URL,
} from "./types";
import { executeAiTool, toGroqTools } from "./tools";
import { useAiStore } from "./store";

function generateId(): string {
	return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

let activeAbortController: AbortController | null = null;

export function stopAiGeneration(): void {
	if (activeAbortController) {
		activeAbortController.abort();
		activeAbortController = null;
	}
	const store = useAiStore.getState();
	store.setIsGenerating(false);
	store.setActiveToolName(null);
}

export async function sendAiPrompt(prompt: string): Promise<void> {
	const store = useAiStore.getState();
	const trimmedPrompt = prompt.trim();
	if (!trimmedPrompt) return;

	if (!store.apiKey) {
		const userMsgId = generateId();
		store.addMessage({
			id: userMsgId,
			role: "user",
			content: trimmedPrompt,
		});
		const assistantMsgId = generateId();
		store.addMessage({
			id: assistantMsgId,
			role: "assistant",
			content:
				"Please enter your **Groq API Key** in the settings above to start editing with AI. You can get a free key instantly at [console.groq.com/keys](https://console.groq.com/keys).",
		});
		return;
	}

	const userMsgId = generateId();
	const assistantMsgId = generateId();

	store.addMessage({
		id: userMsgId,
		role: "user",
		content: trimmedPrompt,
	});

	store.addMessage({
		id: assistantMsgId,
		role: "assistant",
		content: "",
		pending: true,
		toolCalls: [],
	});

	store.setIsGenerating(true);
	const abortController = new AbortController();
	activeAbortController = abortController;

	const collectedToolCalls: AiToolExecution[] = [];
	let finalContent = "";

	try {
		// Build conversation history for Groq API
		const apiMessages: GroqChatMessage[] = [
			{
				role: "system",
				content: store.systemInstructions,
			},
		];

		// Include recent chat messages (excluding the new assistant pending placeholder)
		const history = store.messages.slice(-8);
		for (const msg of history) {
			if (msg.id === assistantMsgId) continue;
			if (msg.role === "user") {
				apiMessages.push({ role: "user", content: msg.content });
			} else if (msg.role === "assistant" && msg.content) {
				apiMessages.push({ role: "assistant", content: msg.content });
			}
		}

		// Add current prompt
		apiMessages.push({ role: "user", content: trimmedPrompt });

		const tools = toGroqTools();
		let turns = 0;
		const MAX_TURNS = 8;

		while (turns < MAX_TURNS) {
			turns++;

			const response = await fetch(GROQ_API_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${store.apiKey}`,
				},
				body: JSON.stringify({
					model: store.model,
					messages: apiMessages,
					tools,
					tool_choice: "auto",
					temperature: 0.2,
				}),
				signal: abortController.signal,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const errorMessage =
					(errorData as GroqChatResponse)?.error?.message ||
					`Groq API request failed with status ${response.status} (${response.statusText})`;
				throw new Error(errorMessage);
			}

			const data = (await response.json()) as GroqChatResponse;
			const choice = data.choices?.[0];
			const message = choice?.message;

			if (!message) {
				throw new Error("No response message returned from Groq");
			}

			// If the model called tools
			if (message.tool_calls && message.tool_calls.length > 0) {
				// Record assistant tool calls in conversation history
				apiMessages.push({
					role: "assistant",
					content: message.content ?? null,
					tool_calls: message.tool_calls,
				});

				for (const call of message.tool_calls) {
					const toolName = call.function.name;
					store.setActiveToolName(toolName);

					let args: Record<string, unknown> = {};
					try {
						args = JSON.parse(call.function.arguments || "{}");
					} catch {
						args = {};
					}

					let result: unknown = null;
					let errorString: string | undefined;

					try {
						result = executeAiTool(toolName, args);
					} catch (err) {
						errorString = err instanceof Error ? err.message : String(err);
						result = { error: errorString };
					}

					const executionRecord: AiToolExecution = {
						id: call.id,
						name: toolName,
						args,
						result,
						error: errorString,
					};

					collectedToolCalls.push(executionRecord);

					// Update UI with running progress
					store.updateMessage(assistantMsgId, {
						toolCalls: [...collectedToolCalls],
					});

					// Append tool result for Groq
					apiMessages.push({
						role: "tool",
						tool_call_id: call.id,
						content: JSON.stringify(result),
					});
				}
				// Loop back so Groq processes tool results
				continue;
			}

			// Final answer from model
			finalContent = message.content ?? "";
			break;
		}

		store.updateMessage(assistantMsgId, {
			content: finalContent || (collectedToolCalls.length > 0 ? "Done." : ""),
			pending: false,
			toolCalls: collectedToolCalls,
		});
	} catch (err: unknown) {
		if (abortController.signal.aborted) {
			store.updateMessage(assistantMsgId, {
				content: finalContent ? `${finalContent}\n\n*(Stopped)*` : "*(Stopped)*",
				pending: false,
				toolCalls: collectedToolCalls,
			});
		} else {
			const errMessage =
				err instanceof Error ? err.message : "An unexpected error occurred.";
			store.updateMessage(assistantMsgId, {
				content: `⚠️ **Error**: ${errMessage}`,
				pending: false,
				toolCalls: collectedToolCalls,
			});
		}
	} finally {
		activeAbortController = null;
		store.setIsGenerating(false);
		store.setActiveToolName(null);
	}
}
