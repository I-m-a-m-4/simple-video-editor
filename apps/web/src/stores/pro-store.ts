"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const ADMIN_EMAILS = ["belloimam431@gmail.com"];

export function isUserAdmin(email?: string | null): boolean {
	if (!email) return false;
	return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export interface ProState {
	isPro: boolean;
	plan: "monthly" | "annual" | "admin" | null;
	transactionId: string | null;
	customerEmail: string | null;
	unlockedAt: string | null;
	isModalOpen: boolean;
	openModal: () => void;
	closeModal: () => void;
	setProStatus: (params: {
		isPro: boolean;
		plan: "monthly" | "annual" | "admin";
		transactionId?: string;
		customerEmail?: string;
	}) => void;
	grantAdminAccess: (email?: string) => void;
	resetProStatus: () => void;
}

export const useProStore = create<ProState>()(
	persist(
		(set) => ({
			isPro: false,
			plan: null,
			transactionId: null,
			customerEmail: null,
			unlockedAt: null,
			isModalOpen: false,
			openModal: () => set({ isModalOpen: true }),
			closeModal: () => set({ isModalOpen: false }),
			setProStatus: ({ isPro, plan, transactionId, customerEmail }) =>
				set({
					isPro,
					plan,
					transactionId: transactionId ?? null,
					customerEmail: customerEmail ?? null,
					unlockedAt: new Date().toISOString(),
					isModalOpen: false,
				}),
			grantAdminAccess: (email = "belloimam431@gmail.com") =>
				set({
					isPro: true,
					plan: "admin",
					transactionId: "admin_complimentary_access",
					customerEmail: email,
					unlockedAt: new Date().toISOString(),
					isModalOpen: false,
				}),
			resetProStatus: () =>
				set({
					isPro: false,
					plan: null,
					transactionId: null,
					customerEmail: null,
					unlockedAt: null,
				}),
		}),
		{
			name: "opencut-pro-storage",
		},
	),
);
