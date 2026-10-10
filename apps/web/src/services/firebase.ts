import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { isSupported, getAnalytics } from "firebase/analytics";
import {
	getFirestore,
	collection,
	doc,
	setDoc,
	getDocs,
	getDoc,
	deleteDoc,
	query,
	orderBy,
	writeBatch,
	serverTimestamp,
	type Firestore,
} from "firebase/firestore";
import type { AiChatItem } from "@/ai/types";
import type { SerializedProject } from "@/services/storage/types";

export const firebaseConfig = {
	apiKey: "AIzaSyB3wk_oEB9ON7gO9KRoZFHLAMxTJ-2RRAw",
	authDomain: "ambercut-d07ef.firebaseapp.com",
	projectId: "ambercut-d07ef",
	storageBucket: "ambercut-d07ef.firebasestorage.app",
	messagingSenderId: "993266770263",
	appId: "1:993266770263:web:18ee2786eac68d9b1a9e12",
	measurementId: "G-YHRVLB5RB0",
};

// Initialize Firebase only once
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db: Firestore = getFirestore(app);

// Initialize Analytics in browser
if (typeof window !== "undefined") {
	isSupported().then((supported) => {
		if (supported) {
			getAnalytics(app);
		}
	});
}

/**
 * Returns the Firestore collection path for chat messages of a given project.
 * Structure: projects/{projectId}/chat_messages
 */
function chatCollection(projectId: string) {
	return collection(db, "projects", projectId, "chat_messages");
}

/**
 * Save all chat messages for a project to Firestore.
 * Replaces the entire conversation — simple and reliable.
 */
export async function saveChatMessages(
	projectId: string,
	messages: AiChatItem[],
): Promise<void> {
	if (!projectId) return;

	try {
		const colRef = chatCollection(projectId);

		// Delete existing messages first
		const existingDocs = await getDocs(colRef);
		if (!existingDocs.empty) {
			const batch = writeBatch(db);
			for (const docSnap of existingDocs.docs) {
				batch.delete(docSnap.ref);
			}
			await batch.commit();
		}

		// Write new messages with ordering index
		const batch = writeBatch(db);
		for (let i = 0; i < messages.length; i++) {
			const msg = messages[i];
			// Skip pending messages — they are incomplete
			if (msg.pending) continue;

			const docRef = doc(colRef, msg.id);
			batch.set(docRef, {
				id: msg.id,
				role: msg.role,
				content: msg.content,
				toolCalls: msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
				order: i,
				updatedAt: serverTimestamp(),
			});
		}
		await batch.commit();
	} catch (err: any) {
		// Gracefully handle client ad-blockers or missing Firestore permissions without throwing errors
		if (err?.code !== "permission-denied" && !err?.message?.includes("permissions")) {
			console.warn("[Firebase] Could not save chat messages:", err?.message || err);
		}
	}
}

/**
 * Load chat messages for a project from Firestore.
 * Returns an empty array if no messages are stored.
 */
export async function loadChatMessages(
	projectId: string,
): Promise<AiChatItem[]> {
	if (!projectId) return [];

	try {
		const colRef = chatCollection(projectId);
		const q = query(colRef, orderBy("order", "asc"));
		const snapshot = await getDocs(q);

		return snapshot.docs.map((docSnap) => {
			const data = docSnap.data();
			return {
				id: data.id as string,
				role: data.role as AiChatItem["role"],
				content: data.content as string,
				toolCalls: data.toolCalls ? JSON.parse(data.toolCalls) : undefined,
				pending: false,
			};
		});
	} catch (err: any) {
		// Silent fallback if offline, adblocker active, or unauthenticated
		if (err?.code !== "permission-denied" && !err?.message?.includes("permissions")) {
			console.warn("[Firebase] Chat sync offline:", err?.message || err);
		}
		return [];
	}
}

/**
 * Clear all chat messages for a project in Firestore.
 */
export async function clearChatMessages(projectId: string): Promise<void> {
	if (!projectId) return;

	try {
		const colRef = chatCollection(projectId);
		const snapshot = await getDocs(colRef);
		if (!snapshot.empty) {
			const batch = writeBatch(db);
			for (const docSnap of snapshot.docs) {
				batch.delete(docSnap.ref);
			}
			await batch.commit();
		}
	} catch (err: any) {
		if (err?.code !== "permission-denied" && !err?.message?.includes("permissions")) {
			console.warn("[Firebase] Could not clear chat messages:", err?.message || err);
		}
	}
}

/**
 * Save project data to Firebase Firestore cloud storage.
 */
export async function saveProjectToCloud(
	project: SerializedProject,
	userId?: string,
): Promise<void> {
	if (!project?.metadata?.id) return;

	try {
		const docRef = doc(db, "projects", project.metadata.id);
		// Clean undefined fields for Firestore compatibility
		const cleanProject = JSON.parse(JSON.stringify(project));
		await setDoc(
			docRef,
			{
				...cleanProject,
				userId: userId || null,
				cloudUpdatedAt: serverTimestamp(),
			},
			{ merge: true },
		);
	} catch (err: any) {
		if (err?.code !== "permission-denied" && !err?.message?.includes("permissions")) {
			console.warn("[Firebase] Could not sync project to cloud:", err?.message || err);
		}
	}
}

/**
 * Load project data from Firebase Firestore cloud storage.
 */
export async function loadProjectFromCloud(
	projectId: string,
): Promise<SerializedProject | null> {
	if (!projectId) return null;

	try {
		const docRef = doc(db, "projects", projectId);
		const snap = await getDoc(docRef);
		if (snap.exists()) {
			const data = snap.data();
			const { userId: _u, cloudUpdatedAt: _c, ...projectData } = data;
			return projectData as SerializedProject;
		}
		return null;
	} catch (err: any) {
		if (err?.code !== "permission-denied" && !err?.message?.includes("permissions")) {
			console.warn("[Firebase] Could not load project from cloud:", err?.message || err);
		}
		return null;
	}
}
