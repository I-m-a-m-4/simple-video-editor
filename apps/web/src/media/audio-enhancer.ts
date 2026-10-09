/**
 * AmberCut Web Audio DSP Audio Enhancer & Background Noise Suppression
 *
 * Provides studio-grade client-side voice enhancement, background noise suppression,
 * rumble/hiss filtering, and speech dynamics leveling using Web Audio API nodes.
 */

export interface AudioEnhancementConfig {
	enabled?: boolean;
	noiseReduction?: boolean;
	vocalBoost?: boolean;
	lowCutHz?: number;
	highCutHz?: number;
}

export interface AudioEnhancerChain {
	input: AudioNode;
	output: AudioNode;
	cleanup?: () => void;
}

/**
 * Creates a real-time Web Audio processing chain for voice enhancement and noise reduction.
 */
export function createAudioEnhancerChain({
	audioContext,
	destination,
	config = {},
}: {
	audioContext: AudioContext | OfflineAudioContext;
	destination: AudioNode;
	config?: AudioEnhancementConfig;
}): AudioEnhancerChain {
	const input = audioContext.createGain();
	let current: AudioNode = input;

	const {
		noiseReduction = true,
		vocalBoost = true,
		lowCutHz = 90,
		highCutHz = 12000,
	} = config;

	const nodesToDisconnect: AudioNode[] = [input];

	// 1. High-Pass Filter: Cuts mic thumps, desk rumble, wind, and 50/60Hz AC mains power hum
	if (noiseReduction) {
		const highpass = audioContext.createBiquadFilter();
		highpass.type = "highpass";
		highpass.frequency.value = lowCutHz;
		highpass.Q.value = 0.707;
		current.connect(highpass);
		nodesToDisconnect.push(highpass);
		current = highpass;

		// 2. Low-Pass Filter: Shaves off high-frequency digital noise and air conditioning hiss
		const lowpass = audioContext.createBiquadFilter();
		lowpass.type = "lowpass";
		lowpass.frequency.value = highCutHz;
		lowpass.Q.value = 0.707;
		current.connect(lowpass);
		nodesToDisconnect.push(lowpass);
		current = lowpass;
	}

	// 3. De-Mud Filter: Dip around 320Hz to eliminate hollow, boxy room resonance
	if (vocalBoost || noiseReduction) {
		const deMud = audioContext.createBiquadFilter();
		deMud.type = "peaking";
		deMud.frequency.value = 320;
		deMud.Q.value = 1.4;
		deMud.gain.value = -3.0; // -3dB dip
		current.connect(deMud);
		nodesToDisconnect.push(deMud);
		current = deMud;
	}

	// 4. Vocal Presence & Clarity Boost: Enhances speech intelligibility (2.8kHz - 3.8kHz)
	if (vocalBoost) {
		const clarity = audioContext.createBiquadFilter();
		clarity.type = "peaking";
		clarity.frequency.value = 3400;
		clarity.Q.value = 1.2;
		clarity.gain.value = 4.5; // +4.5dB boost for crisp vocal articulation
		current.connect(clarity);
		nodesToDisconnect.push(clarity);
		current = clarity;
	}

	// 5. Dynamics Compressor: Levels soft speech and controls sudden loud peaks
	const compressor = audioContext.createDynamicsCompressor();
	compressor.threshold.value = -22; // dB
	compressor.knee.value = 8; // dB
	compressor.ratio.value = 4; // 4:1 compression ratio
	compressor.attack.value = 0.005; // 5ms fast attack
	compressor.release.value = 0.14; // 140ms release
	current.connect(compressor);
	nodesToDisconnect.push(compressor);
	current = compressor;

	// 6. Makeup Gain & Limiter Stage: Restores optimal broadcast volume
	const makeupGain = audioContext.createGain();
	makeupGain.gain.value = vocalBoost ? 1.25 : 1.1;
	current.connect(makeupGain);
	nodesToDisconnect.push(makeupGain);
	current = makeupGain;

	// Connect to final destination
	current.connect(destination);

	return {
		input,
		output: current,
		cleanup: () => {
			for (const node of nodesToDisconnect) {
				try {
					node.disconnect();
				} catch {}
			}
		},
	};
}

/**
 * Offline processor that enhances an entire AudioBuffer and returns a pristine,
 * noise-reduced, leveled AudioBuffer.
 */
export async function enhanceAudioBuffer({
	audioBuffer,
	config = {},
}: {
	audioBuffer: AudioBuffer;
	config?: AudioEnhancementConfig;
}): Promise<AudioBuffer> {
	const offlineContext = new OfflineAudioContext(
		audioBuffer.numberOfChannels,
		Math.max(1, audioBuffer.length),
		audioBuffer.sampleRate,
	);

	const source = offlineContext.createBufferSource();
	source.buffer = audioBuffer;

	const { input } = createAudioEnhancerChain({
		audioContext: offlineContext,
		destination: offlineContext.destination,
		config,
	});

	source.connect(input);
	source.start(0);

	const rendered = await offlineContext.startRendering();
	return rendered;
}
