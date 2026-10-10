import type { StorageAdapter } from "./types";

export class OPFSAdapter implements StorageAdapter<File> {
	private directoryName: string;

	constructor(directoryName = "media") {
		this.directoryName = directoryName;
	}

	private async getDirectory(): Promise<FileSystemDirectoryHandle | null> {
		if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
			return null;
		}
		try {
			const opfsRoot = await navigator.storage.getDirectory();
			return await opfsRoot.getDirectoryHandle(this.directoryName, {
				create: true,
			});
		} catch (error) {
			console.warn("OPFS getDirectory error:", error);
			return null;
		}
	}

	async get(key: string): Promise<File | null> {
		try {
			const directory = await this.getDirectory();
			if (!directory) return null;
			const fileHandle = await directory.getFileHandle(key);
			return await fileHandle.getFile();
		} catch {
			return null;
		}
	}

	async set({
		key,
		value: file,
	}: {
		key: string;
		value: File;
	}): Promise<void> {
		const directory = await this.getDirectory();
		if (!directory) {
			throw new Error("OPFS is not available or not supported in this browser environment.");
		}
		const fileHandle = await directory.getFileHandle(key, { create: true });
		const writable = await fileHandle.createWritable();

		await writable.write(file);
		await writable.close();
	}

	async remove(key: string): Promise<void> {
		try {
			const directory = await this.getDirectory();
			if (!directory) return;
			await directory.removeEntry(key);
		} catch {
			// Ignore if not found or failed
		}
	}

	async list(): Promise<string[]> {
		try {
			const directory = await this.getDirectory();
			if (!directory) return [];
			const keys: string[] = [];

			for await (const name of directory.keys()) {
				keys.push(name);
			}

			return keys;
		} catch {
			return [];
		}
	}

	async clear(): Promise<void> {
		try {
			const directory = await this.getDirectory();
			if (!directory) return;

			for await (const name of directory.keys()) {
				await directory.removeEntry(name);
			}
		} catch {}
	}

	// Helper method to check OPFS support
	static isSupported(): boolean {
		return (
			typeof navigator !== "undefined" &&
			"storage" in navigator &&
			typeof navigator.storage?.getDirectory === "function"
		);
	}
}
