export const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export const GROQ_MODELS = [
	"llama-3.3-70b-versatile",
	"openai/gpt-oss-120b",
	"openai/gpt-oss-20b",
	"moonshotai/kimi-k2-instruct",
	"llama-3.1-8b-instant",
] as const;

export const DEFAULT_GROQ_MODEL: string = GROQ_MODELS[0];

export interface AiSettings {
	apiKey: string;
	model: string;
}

export interface AiToolExecution {
	id: string;
	name: string;
	args: Record<string, unknown>;
	result: unknown;
	error?: string;
}

export interface AiChatItem {
	id: string;
	role: "user" | "assistant";
	content: string;
	toolCalls?: AiToolExecution[];
	pending?: boolean;
}

export interface GroqFunctionCall {
	id: string;
	type: "function";
	function: {
		name: string;
		arguments: string;
	};
}

export interface GroqChatMessage {
	role: "system" | "user" | "assistant" | "tool";
	content: string | null;
	tool_calls?: GroqFunctionCall[];
	tool_call_id?: string;
}

export interface GroqToolDefinition {
	type: "function";
	function: {
		name: string;
		description: string;
		parameters: {
			type: "object";
			properties: Record<string, unknown>;
			required?: string[];
		};
	};
}

export interface GroqChatResponse {
	choices?: Array<{
		message?: {
			role: "assistant";
			content: string | null;
			tool_calls?: GroqFunctionCall[];
		};
		finish_reason?: string;
	}>;
	error?: { message?: string; type?: string };
}
