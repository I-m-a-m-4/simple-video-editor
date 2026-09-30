"use client";

import { useProStore } from "@/stores/pro-store";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { ProUpgradeModal } from "./pro-upgrade-modal";

export function ProButton() {
	const { isPro, openModal } = useProStore();

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={openModal}
				className={`relative h-7 px-2.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 border shadow-xs ${
					isPro
						? "bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/15"
						: "bg-orange-500 hover:bg-orange-600 text-white border-orange-500 shadow-orange-500/20"
				}`}
			>
				<Crown className={`size-3.5 ${isPro ? "text-orange-400 fill-orange-400" : "text-white fill-white"}`} />
				<span className="font-bold tracking-tight font-clash text-xs">
					{isPro ? "PRO" : "Pro"}
				</span>
			</Button>

			<ProUpgradeModal />
		</>
	);
}
