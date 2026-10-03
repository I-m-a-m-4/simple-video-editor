"use client";

import { db } from "@/services/firebase";
import {
	collection,
	doc,
	getDocs,
	setDoc,
	query,
	orderBy,
	serverTimestamp,
} from "firebase/firestore";

export interface Transaction {
	id: string;
	tx_ref: string;
	email: string;
	customer: string;
	plan: "Annual Pro" | "Monthly Pro" | "Pro (Lifetime)" | "Complimentary";
	amountNgn: number;
	amountUsd: number;
	status: "successful" | "pending" | "failed";
	date: string;
	method: "Card" | "Bank Transfer" | "USSD" | "Admin Granted" | "Complimentary";
}

const STORAGE_KEY = "opencut_real_transactions_v1";

/**
 * Get all real transactions from localStorage and Firestore
 */
export async function getRealTransactions(): Promise<Transaction[]> {
	const localTxMap = new Map<string, Transaction>();

	// 1. Read local storage transactions
	if (typeof window !== "undefined") {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const list = JSON.parse(raw) as Transaction[];
				for (const item of list) {
					localTxMap.set(item.id, item);
				}
			}
		} catch (e) {
			console.warn("Failed reading local transactions:", e);
		}
	}

	// 2. Read from Firestore collection if available
	try {
		const colRef = collection(db, "transactions");
		const q = query(colRef, orderBy("date", "desc"));
		const snapshot = await getDocs(q);

		for (const docSnap of snapshot.docs) {
			const data = docSnap.data() as Transaction;
			if (data && data.id) {
				localTxMap.set(data.id, data);
			}
		}
	} catch (e) {
		// Firestore might be unauthenticated or offline
	}

	return Array.from(localTxMap.values()).sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);
}

/**
 * Save a transaction both locally and to Firestore
 */
export async function saveRealTransaction(tx: Transaction): Promise<void> {
	if (typeof window !== "undefined") {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			const list: Transaction[] = raw ? JSON.parse(raw) : [];
			const existingIndex = list.findIndex((t) => t.id === tx.id);
			if (existingIndex >= 0) {
				list[existingIndex] = tx;
			} else {
				list.unshift(tx);
			}
			localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
		} catch (e) {
			console.warn("Failed saving local transaction:", e);
		}
	}

	// Firestore sync
	try {
		const docRef = doc(db, "transactions", tx.id);
		await setDoc(docRef, {
			...tx,
			updatedAt: serverTimestamp(),
		});
	} catch (e) {
		// Silently fallback if offline
	}
}

/**
 * Verify a Flutterwave transaction via the server API and record it if successful
 */
export async function verifyAndRecordTransaction(
	transactionId: string | number,
	plan: "Annual Pro" | "Monthly Pro" = "Annual Pro",
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
	try {
		const res = await fetch("/api/payment/flutterwave/verify", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ transaction_id: String(transactionId) }),
		});

		const result = await res.json();

		if (result.success && result.transaction) {
			const fw = result.transaction;
			const amount = Number(fw.amount) || (plan === "Annual Pro" ? 99000 : 12500);
			const tx: Transaction = {
				id: `tx_${fw.id}`,
				tx_ref: fw.tx_ref || `fw_ref_${Date.now()}`,
				email: fw.customer?.email || "customer@example.com",
				customer: fw.customer?.name || fw.customer?.email?.split("@")[0] || "Valued Customer",
				plan: plan,
				amountNgn: amount,
				amountUsd: Number((amount / 1250).toFixed(2)),
				status: "successful",
				date: new Date(fw.created_at || Date.now()).toLocaleString(),
				method: "Card",
			};

			await saveRealTransaction(tx);
			return { success: true, transaction: tx };
		}

		return {
			success: false,
			error: result.message || "Flutterwave transaction could not be verified.",
		};
	} catch (err: any) {
		return {
			success: false,
			error: err?.message || "Network error while verifying transaction.",
		};
	}
}
