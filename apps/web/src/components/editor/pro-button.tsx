"use client";

import { useProStore, isUserAdmin } from "@/stores/pro-store";
import { useAuth } from "@/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { ProUpgradeModal } from "./pro-upgrade-modal";

export function ProButton() {
	const { isPro, openModal } = useProStore();
	const { user } = useAuth();
	const isProEffective = isPro || isUserAdmin(user?.email);

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={openModal}
				className={`relative h-7 px-2.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 border shadow-xs ${
					isProEffective
						? "bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/15"
						: "bg-orange-500 hover:bg-orange-600 text-white border-orange-500 shadow-orange-500/20"
				}`}
			>
				<Crown className={`size-3.5 ${isProEffective ? "text-orange-400 fill-orange-400" : "text-white fill-white"}`} />
				<span className="font-bold tracking-tight font-clash text-xs">
					{isProEffective ? "PRO" : "Pro"}
				</span>
			</Button>

			<ProUpgradeModal />
		</>
	);
}
