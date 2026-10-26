import { describe, expect, it, beforeEach } from "bun:test";
import { tryExecuteLocalIntent } from "../local-intent";
import { EditorCore } from "@/core";

describe("local intent parser & executor", () => {
	beforeEach(() => {
		EditorCore.reset();
	});

	it("handles 'Add a blue title card saying Hello' reliably", () => {
		const result = tryExecuteLocalIntent("Add a blue title card saying Hello");
		expect(result.handled).toBe(true);
		expect(result.toolCall).toBeDefined();
		expect(result.toolCall?.name).toBe("add_title_card");
		expect(result.toolCall?.args.text).toBe("Hello");
		expect(result.toolCall?.args.color).toBe("blue");
		expect(result.response).toContain("blue title card");
		expect(result.response).toContain("Hello");
	});

	it("handles title cards with other colors and quotes", () => {
		const result = tryExecuteLocalIntent('Add a red title card saying "Welcome to AmberCut"');
		expect(result.handled).toBe(true);
		expect(result.toolCall?.args.text).toBe("Welcome to AmberCut");
		expect(result.toolCall?.args.color).toBe("red");
	});

	it("handles plain text insertion commands", () => {
		const result = tryExecuteLocalIntent('Add text saying "Hello World"');
		expect(result.handled).toBe(true);
		expect(result.toolCall?.name).toBe("add_text");
		expect(result.toolCall?.args.text).toBe("Hello World");
	});

	it("handles audio muting command", () => {
		const result = tryExecuteLocalIntent("Mute audio tracks");
		expect(result.handled).toBe(true);
	});

	it("returns unhandled for general conversational prompts", () => {
		const result = tryExecuteLocalIntent("How do I make my video look cinematic?");
		expect(result.handled).toBe(false);
	});
});
