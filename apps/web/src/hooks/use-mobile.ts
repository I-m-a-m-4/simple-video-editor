import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 1024;

export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
	const [isMobile, setIsMobile] = useState<boolean>(() => {
		if (typeof window !== "undefined") {
			return window.innerWidth < breakpoint;
		}
		return false;
	});

	useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
		const onChange = () => {
			setIsMobile(window.innerWidth < breakpoint);
		};
		mql.addEventListener("change", onChange);
		window.addEventListener("resize", onChange);
		setIsMobile(window.innerWidth < breakpoint);
		return () => {
			mql.removeEventListener("change", onChange);
			window.removeEventListener("resize", onChange);
		};
	}, [breakpoint]);

	return isMobile;
}
