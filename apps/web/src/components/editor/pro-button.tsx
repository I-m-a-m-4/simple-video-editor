"use client";

import { useProStore } from "@/stores/pro-store";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles } from "lucide-react";
import { ProUpgradeModal } from "./pro-upgrade-modal";

export function ProButton() {
	const { isPro, openModal } = useProStore();

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={openModal}
				className={`relative h-7 px-2.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border shadow-sm ${
					isPro
						? "bg-gradient-to-r from-purple-950/80 to-indigo-950/80 border-purple-500/50 text-purple-300 hover:border-purple-400"
						: "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-400/40 shadow-purple-600/20"
				}`}
			>
				<Crown className="size-3.5 text-amber-300 fill-amber-300" />
				<span className="font-bold tracking-wide font-clash">
					{isPro ? "PRO Active" : "Pro"}
				</span>
				{!isPro && (
					<span className="absolute -top-1 -right-1 flex size-2">
						<span className="absolute inline-flex size-full animate-ping rounded-full bg-purple-400 opacity-75" />
						<span className="relative inline-flex size-2 rounded-full bg-purple-500" />
					</span>
				)}
			</Button>

			<ProUpgradeModal />
		</>
	);
}
