import { mock } from "bun:test";

mock.module("opencut-wasm", () => {
	function ticksPerFrame(rate?: { numerator: number; denominator: number }): number {
		if (!rate || !rate.numerator || !rate.denominator) return 4000; // default 30fps
		return Math.round((120000 * rate.denominator) / rate.numerator);
	}

	return {
		TICKS_PER_SECOND: () => 120000,
		mediaTimeFromSeconds: ({ seconds }: { seconds: number }) => Math.round(seconds * 120000),
		mediaTimeToSeconds: ({ time }: { time: number }) => time / 120000,
		mediaTimeFromFrame: ({ frame, rate }: { frame: number; rate: any }) => {
			const tpf = ticksPerFrame(rate);
			return Math.round(frame * tpf);
		},
		mediaTimeToFrame: ({ time, rate }: { time: number; rate: any }) => {
			const tpf = ticksPerFrame(rate);
			return Math.floor(time / tpf);
		},
		floorToFrame: ({ time, rate }: { time: number; rate: any }) => {
			const tpf = ticksPerFrame(rate);
			return Math.floor(time / tpf) * tpf;
		},
		roundToFrame: ({ time, rate }: { time: number; rate: any }) => {
			const tpf = ticksPerFrame(rate);
			const rem = ((time % tpf) + tpf) % tpf;
			const floor = Math.floor(time / tpf);
			return rem * 2 >= tpf ? (floor + 1) * tpf : floor * tpf;
		},
		lastFrameTime: ({ duration, rate }: { duration: number; rate: any }) => {
			if (duration <= 0) return 0;
			const tpf = ticksPerFrame(rate);
			return Math.floor((duration - 1) / tpf) * tpf;
		},
		snappedSeekTime: ({ time, duration, rate }: { time: number; duration: number; rate: any }) => {
			const tpf = ticksPerFrame(rate);
			const rem = ((time % tpf) + tpf) % tpf;
			const floor = Math.floor(time / tpf);
			const snapped = rem * 2 >= tpf ? (floor + 1) * tpf : floor * tpf;
			return Math.max(0, Math.min(duration, snapped));
		},
		isFrameAligned: ({ time, rate }: { time: number; rate: any }) => {
			const tpf = ticksPerFrame(rate);
			return time % tpf === 0;
		},
		mediaTimeAdd: ({ a, b }: { a: number; b: number }) => a + b,
		mediaTimeSub: ({ a, b }: { a: number; b: number }) => a - b,
		mediaTimeMin: ({ a, b }: { a: number; b: number }) => Math.min(a, b),
		mediaTimeMax: ({ a, b }: { a: number; b: number }) => Math.max(a, b),
		mediaTimeClamp: ({ time, min, max }: { time: number; min: number; max: number }) =>
			Math.max(min, Math.min(max, time)),
		formatTimecode: ({ time, format }: any) => {
			const totalSeconds = time / 120000;
			const minutes = Math.floor(totalSeconds / 60);
			const seconds = Math.floor(totalSeconds % 60);
			const centiseconds = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 100);
			const pad = (n: number) => String(n).padStart(2, "0");
			if (format === "MM:SS") return `${pad(minutes)}:${pad(seconds)}`;
			if (format === "HH:MM:SS:CS") {
				const hours = Math.floor(minutes / 60);
				return `${pad(hours)}:${pad(minutes % 60)}:${pad(seconds)}:${pad(centiseconds)}`;
			}
			const hours = Math.floor(minutes / 60);
			return `${pad(hours)}:${pad(minutes % 60)}:${pad(seconds)}`;
		},
		parseTimecode: ({ timeCode }: any) => {
			const parts = String(timeCode).split(":").map(Number);
			if (parts.some(isNaN)) return null;
			let seconds = 0;
			if (parts.length === 2) {
				seconds = parts[0] * 60 + parts[1];
			} else if (parts.length >= 3) {
				seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
				if (parts.length === 4) {
					seconds += parts[3] / 100;
				}
			}
			return Math.round(seconds * 120000);
		},
		guessTimecodeFormat: () => "HH:MM:SS",
		initializeGpu: () => {},
		initCompositor: () => {},
		resizeCompositor: () => {},
		renderFrame: () => {},
		uploadTexture: () => {},
		releaseTexture: () => {},
		applyEffectPasses: () => ({}),
		applyMaskFeather: () => ({}),
		getLastFrameProfile: () => null,
		getCompositorCanvas: () => ({}),
	};
});
