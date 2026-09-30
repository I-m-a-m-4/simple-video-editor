"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ProState {
	isPro: boolean;
	plan: "monthly" | "annual" | null;
	transactionId: string | null;
	customerEmail: string | null;
	unlockedAt: string | null;
	isModalOpen: boolean;
	openModal: () => void;
	closeModal: () => void;
	setProStatus: (params: {
		isPro: boolean;
		plan: "monthly" | "annual";
		transactionId?: string;
		customerEmail?: string;
	}) => void;
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
