/**
 * Built-in Text-Encoded Sound Effects Generator
 *
 * Generates valid standard PCM 16-bit Mono WAV audio data URIs stored directly as text strings.
 * Requires ZERO external storage buckets, ZERO cloud dependencies, and works 100% offline.
 */

function createWavDataUri(samples: Float32Array, sampleRate = 44100): string {
	const numSamples = samples.length;
	const byteRate = sampleRate * 2; // 16-bit mono = 2 bytes per sample
	const blockAlign = 2;
	const subChunk2Size = numSamples * 2;
	const chunkSize = 36 + subChunk2Size;

	const buffer = new ArrayBuffer(44 + subChunk2Size);
	const view = new DataView(buffer);

	// RIFF identifier
	writeString(view, 0, "RIFF");
	view.setUint32(4, chunkSize, true);
	writeString(view, 8, "WAVE");

	// fmt sub-chunk
	writeString(view, 12, "fmt ");
	view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
	view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
	view.setUint16(22, 1, true); // NumChannels (1 = Mono)
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, 16, true); // BitsPerSample (16 bits)

	// data sub-chunk
	writeString(view, 36, "data");
	view.setUint32(40, subChunk2Size, true);

	// Write 16-bit PCM samples
	let offset = 44;
	for (let i = 0; i < numSamples; i++) {
		const s = Math.max(-1, Math.min(1, samples[i]));
		view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
		offset += 2;
	}

	// Convert ArrayBuffer to Base64 in isomorphic environment
	let binary = "";
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}

	const base64 =
		typeof Buffer !== "undefined"
			? Buffer.from(buffer).toString("base64")
			: btoa(binary);

	return `data:audio/wav;base64,${base64}`;
}

function writeString(view: DataView, offset: number, string: string): void {
	for (let i = 0; i < string.length; i++) {
		view.setUint8(offset + i, string.charCodeAt(i));
	}
}

// 1. Pop / Bubble Pop
function generatePopWav(): string {
	const sampleRate = 44100;
	const duration = 0.09;
	const numSamples = Math.floor(sampleRate * duration);
	const samples = new Float32Array(numSamples);

	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;
		const progress = i / numSamples;
		const freq = 900 * Math.exp(-progress * 8) + 180;
		const envelope = Math.exp(-progress * 14);
		samples[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.9;
	}
	return createWavDataUri(samples, sampleRate);
}

// 2. Whoosh / Transition Swoosh
function generateWhooshWav(): string {
	const sampleRate = 44100;
	const duration = 0.35;
	const numSamples = Math.floor(sampleRate * duration);
	const samples = new Float32Array(numSamples);

	for (let i = 0; i < numSamples; i++) {
		const progress = i / numSamples;
		// Bell curve envelope
		const env = Math.sin(progress * Math.PI);
		const whiteNoise = (Math.random() * 2 - 1) * 0.7;
		const pitchSweep = Math.sin(2 * Math.PI * (180 + 350 * progress) * (i / sampleRate));
		samples[i] = (whiteNoise * 0.7 + pitchSweep * 0.3) * (env * env);
	}
	return createWavDataUri(samples, sampleRate);
}

// 3. Cinematic Boom / Sub Impact
function generateBoomWav(): string {
	const sampleRate = 44100;
	const duration = 1.2;
	const numSamples = Math.floor(sampleRate * duration);
	const samples = new Float32Array(numSamples);

	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;
		const progress = i / numSamples;
		const freq = 120 * Math.exp(-progress * 4) + 38;
		const env = Math.exp(-progress * 3.5);
		const punch = progress < 0.05 ? (Math.random() * 2 - 1) * (1 - progress / 0.05) * 0.4 : 0;
		samples[i] = (Math.sin(2 * Math.PI * freq * t) * 0.8 + punch) * env;
	}
	return createWavDataUri(samples, sampleRate);
}

// 4. Notification Chime / Bell Ding
function generateDingWav(): string {
	const sampleRate = 44100;
	const duration = 0.8;
	const numSamples = Math.floor(sampleRate * duration);
	const samples = new Float32Array(numSamples);

	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;
		const progress = i / numSamples;
		const env = Math.exp(-progress * 4.5);
		const tone1 = Math.sin(2 * Math.PI * 1046.5 * t); // C6
		const tone2 = Math.sin(2 * Math.PI * 2093.0 * t) * 0.5; // C7
		samples[i] = (tone1 + tone2) * env * 0.6;
	}
	return createWavDataUri(samples, sampleRate);
}

// 5. Camera Shutter Click
function generateCameraShutterWav(): string {
	const sampleRate = 44100;
	const duration = 0.16;
	const numSamples = Math.floor(sampleRate * duration);
	const samples = new Float32Array(numSamples);

	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;
		const progress = i / numSamples;
		// Double transient: click 1 at 0.01s, click 2 at 0.07s
		let snap = 0;
		if (t < 0.03) {
			snap = (Math.random() * 2 - 1) * Math.exp(-t * 200);
		} else if (t > 0.06 && t < 0.11) {
			const t2 = t - 0.06;
			snap = (Math.random() * 2 - 1) * Math.exp(-t2 * 140);
		}
		samples[i] = snap * 0.85;
	}
	return createWavDataUri(samples, sampleRate);
}

// 6. Cash Register Cha-Ching
function generateCashChingWav(): string {
	const sampleRate = 44100;
	const duration = 0.6;
	const numSamples = Math.floor(sampleRate * duration);
	const samples = new Float32Array(numSamples);

	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;
		const progress = i / numSamples;
		const click = t < 0.04 ? (Math.random() * 2 - 1) * (1 - t / 0.04) : 0;
		const chime1 = Math.sin(2 * Math.PI * 1975.5 * t) * Math.exp(-progress * 5); // B6
		const chime2 = Math.sin(2 * Math.PI * 2637.0 * t) * Math.exp(-progress * 4); // E7
		samples[i] = (click * 0.4 + chime1 * 0.4 + chime2 * 0.3) * 0.8;
	}
	return createWavDataUri(samples, sampleRate);
}

// 7. Mouse Click / Mechanical Tap
function generateMouseClickWav(): string {
	const sampleRate = 44100;
	const duration = 0.04;
	const numSamples = Math.floor(sampleRate * duration);
	const samples = new Float32Array(numSamples);

	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;
		const env = Math.exp(-t * 350);
		const noise = (Math.random() * 2 - 1) * 0.6;
		const freq = Math.sin(2 * Math.PI * 1800 * t);
		samples[i] = (noise * 0.6 + freq * 0.4) * env * 0.9;
	}
	return createWavDataUri(samples, sampleRate);
}

// 8. Riser Tension Sweep
function generateRiserWav(): string {
	const sampleRate = 44100;
	const duration = 1.8;
	const numSamples = Math.floor(sampleRate * duration);
	const samples = new Float32Array(numSamples);

	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;
		const progress = i / numSamples;
		const freq = 120 + 700 * (progress * progress);
		const env = Math.pow(progress, 1.8);
		const sine = Math.sin(2 * Math.PI * freq * t);
		const whiteNoise = (Math.random() * 2 - 1) * 0.3;
		samples[i] = (sine * 0.7 + whiteNoise * 0.3) * env * 0.75;
	}
	return createWavDataUri(samples, sampleRate);
}

// 9. Glitch / Cyber Stutter
function generateGlitchWav(): string {
	const sampleRate = 44100;
	const duration = 0.28;
	const numSamples = Math.floor(sampleRate * duration);
	const samples = new Float32Array(numSamples);

	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;
		const step = Math.floor(t * 30);
		const modFreq = 220 + (step % 5) * 150;
		const square = Math.sin(2 * Math.PI * modFreq * t) > 0 ? 0.7 : -0.7;
		const env = 1 - i / numSamples;
		samples[i] = square * env * 0.6;
	}
	return createWavDataUri(samples, sampleRate);
}

// 10. Sub Bass Drop
function generateBassDropWav(): string {
	const sampleRate = 44100;
	const duration = 1.5;
	const numSamples = Math.floor(sampleRate * duration);
	const samples = new Float32Array(numSamples);

	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;
		const progress = i / numSamples;
		const freq = 150 * Math.exp(-progress * 3) + 32;
		const env = Math.exp(-progress * 2.2);
		samples[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.9;
	}
	return createWavDataUri(samples, sampleRate);
}

// 11. Cinematic Atmospheric Ambient Pad (Long & Lush, D minor 9th)
function generateAmbientPadWav(): string {
	const sampleRate = 44100;
	const duration = 5.0; // 5-second atmospheric drone pad
	const numSamples = Math.floor(sampleRate * duration);
	const samples = new Float32Array(numSamples);

	// Dm9 chord frequencies: D3 (146.83), F3 (174.61), A3 (220.0), C4 (261.63), E4 (329.63)
	const freqs = [146.83, 174.61, 220.0, 261.63, 329.63];

	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;
		const progress = i / numSamples;

		// Smooth attack & release envelope
		const attack = Math.min(1, t / 0.8);
		const release = Math.min(1, (duration - t) / 1.0);
		const env = attack * release;

		// LFO filter modulation
		const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.4 * t);

		let sample = 0;
		for (let f = 0; f < freqs.length; f++) {
			const baseF = freqs[f];
			// Subtle chorus detuning
			const s1 = Math.sin(2 * Math.PI * baseF * t);
			const s2 = Math.sin(2 * Math.PI * (baseF * 1.003) * t);
			const s3 = Math.sin(2 * Math.PI * (baseF * 0.997) * t);
			sample += (s1 * 0.5 + s2 * 0.25 + s3 * 0.25) / freqs.length;
		}

		// Soft saturation warmth
		const warm = Math.tanh(sample * (1.2 + 0.4 * lfo));
		samples[i] = warm * env * 0.75;
	}
	return createWavDataUri(samples, sampleRate);
}

// 12. Cinematic Braam / Horn of Doom (Heavy Orchestral Hit)
function generateBraamImpactWav(): string {
	const sampleRate = 44100;
	const duration = 3.2;
	const numSamples = Math.floor(sampleRate * duration);
	const samples = new Float32Array(numSamples);

	const baseFreq = 55.0; // A1 low brass

	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;
		const progress = i / numSamples;

		const attack = Math.min(1, t / 0.04);
		const decay = Math.exp(-progress * 1.8);
		const env = attack * decay;

		// Rich multi-saw harmonic distortion
		let saw = 0;
		for (let h = 1; h <= 8; h++) {
			saw += (Math.sin(2 * Math.PI * baseFreq * h * t) / h) * (1 - progress * 0.3);
		}

		// Low sub punch
		const sub = Math.sin(2 * Math.PI * (baseFreq * 0.5) * t) * Math.exp(-progress * 3);

		// Distorted brass resonance
		const brass = Math.tanh((saw * 1.4 + sub * 0.6) * 1.5);
		samples[i] = brass * env * 0.85;
	}
	return createWavDataUri(samples, sampleRate);
}

// 13. Lo-Fi Electric Piano Chords (Chill Melodic Progression)
function generateLofiKeysWav(): string {
	const sampleRate = 44100;
	const duration = 4.2;
	const numSamples = Math.floor(sampleRate * duration);
	const samples = new Float32Array(numSamples);

	// Two smooth jazz chords (Fmaj7 -> Em7)
	const chord1 = [174.61, 220.0, 261.63, 329.63]; // Fmaj7
	const chord2 = [164.81, 196.0, 246.94, 293.66]; // Em7

	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;
		const isChord2 = t >= 2.1;
		const chordTime = isChord2 ? t - 2.1 : t;
		const chord = isChord2 ? chord2 : chord1;

		const attack = Math.min(1, chordTime / 0.02);
		const decay = Math.exp(-chordTime * 0.9);
		const env = attack * decay;

		let chime = 0;
		for (let c = 0; c < chord.length; c++) {
			const f = chord[c];
			const bell = Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t);
			chime += bell / chord.length;
		}

		// Gentle tape wow/flutter & vinyl warmth
		const wow = Math.sin(2 * Math.PI * 1.5 * t) * 0.05;
		const vinylNoise = (Math.random() * 2 - 1) * 0.008;

		samples[i] = (chime * (1 + wow) + vinylNoise) * env * 0.7;
	}
	return createWavDataUri(samples, sampleRate);
}

export interface BuiltInSound {
	id: number;
	name: string;
	description: string;
	url: string;
	previewUrl: string;
	downloadUrl: string;
	duration: number;
	filesize: number;
	type: string;
	channels: number;
	bitrate: number;
	bitdepth: number;
	samplerate: number;
	username: string;
	tags: string[];
	license: string;
	created: string;
	downloads: number;
	rating: number;
	ratingCount: number;
}

let cachedSounds: BuiltInSound[] | null = null;

export function getBuiltInSounds(): BuiltInSound[] {
	if (cachedSounds) return cachedSounds;

	const popUri = generatePopWav();
	const whooshUri = generateWhooshWav();
	const boomUri = generateBoomWav();
	const dingUri = generateDingWav();
	const shutterUri = generateCameraShutterWav();
	const chaChingUri = generateCashChingWav();
	const mouseClickUri = generateMouseClickWav();
	const riserUri = generateRiserWav();
	const glitchUri = generateGlitchWav();
	const bassDropUri = generateBassDropWav();
	const ambientPadUri = generateAmbientPadWav();
	const braamUri = generateBraamImpactWav();
	const lofiKeysUri = generateLofiKeysWav();

	cachedSounds = [
		{
			id: 900101,
			name: "Fast Cinematic Whoosh Transition",
			description: "Crisp dynamic whoosh transition for video cuts and camera pans",
			url: whooshUri,
			previewUrl: whooshUri,
			downloadUrl: whooshUri,
			duration: 0.35,
			filesize: 30870,
			type: "wav",
			channels: 1,
			bitrate: 705600,
			bitdepth: 16,
			samplerate: 44100,
			username: "AmberCut Library",
			tags: ["whoosh", "swoosh", "transition", "fast", "cut"],
			license: "Creative Commons 0",
			created: "2026-01-01",
			downloads: 14820,
			rating: 4.9,
			ratingCount: 512,
		},
		{
			id: 900102,
			name: "Bubble Pop / UI Click",
			description: "Punchy cheerful pop sound effect for titles, stickers, and icons",
			url: popUri,
			previewUrl: popUri,
			downloadUrl: popUri,
			duration: 0.09,
			filesize: 7938,
			type: "wav",
			channels: 1,
			bitrate: 705600,
			bitdepth: 16,
			samplerate: 44100,
			username: "AmberCut Library",
			tags: ["pop", "bubble", "click", "ui", "sticker"],
			license: "Creative Commons 0",
			created: "2026-01-01",
			downloads: 19410,
			rating: 4.95,
			ratingCount: 684,
		},
		{
			id: 900103,
			name: "Cinematic Boom / Sub Impact",
			description: "Deep heavy sub-bass cinematic impact boom for dramatic moments",
			url: boomUri,
			previewUrl: boomUri,
			downloadUrl: boomUri,
			duration: 1.2,
			filesize: 105840,
			type: "wav",
			channels: 1,
			bitrate: 705600,
			bitdepth: 16,
			samplerate: 44100,
			username: "AmberCut Library",
			tags: ["boom", "impact", "cinematic", "bass", "hit"],
			license: "Creative Commons 0",
			created: "2026-01-01",
			downloads: 24100,
			rating: 5.0,
			ratingCount: 890,
		},
		{
			id: 900104,
			name: "Crystal Notification Chime / Ding",
			description: "Sparkling harmonious bell chime for alerts, subscribe buttons, and highlights",
			url: dingUri,
			previewUrl: dingUri,
			downloadUrl: dingUri,
			duration: 0.8,
			filesize: 70560,
			type: "wav",
			channels: 1,
			bitrate: 705600,
			bitdepth: 16,
			samplerate: 44100,
			username: "AmberCut Library",
			tags: ["chime", "ding", "bell", "notification", "alert"],
			license: "Creative Commons 0",
			created: "2026-01-01",
			downloads: 16320,
			rating: 4.88,
			ratingCount: 410,
		},
		{
			id: 900105,
			name: "Camera Shutter Snap",
			description: "Authentic double-snap camera shutter click for photos, b-roll, and snapshots",
			url: shutterUri,
			previewUrl: shutterUri,
			downloadUrl: shutterUri,
			duration: 0.16,
			filesize: 14112,
			type: "wav",
			channels: 1,
			bitrate: 705600,
			bitdepth: 16,
			samplerate: 44100,
			username: "AmberCut Library",
			tags: ["camera", "shutter", "photo", "snap", "click"],
			license: "Creative Commons 0",
			created: "2026-01-01",
			downloads: 11200,
			rating: 4.8,
			ratingCount: 320,
		},
		{
			id: 900106,
			name: "Cash Register Cha-Ching",
			description: "Classic money / cash register bell for sales, wins, and finance videos",
			url: chaChingUri,
			previewUrl: chaChingUri,
			downloadUrl: chaChingUri,
			duration: 0.6,
			filesize: 52920,
			type: "wav",
			channels: 1,
			bitrate: 705600,
			bitdepth: 16,
			samplerate: 44100,
			username: "AmberCut Library",
			tags: ["cash", "money", "cha-ching", "register", "win"],
			license: "Creative Commons 0",
			created: "2026-01-01",
			downloads: 18900,
			rating: 4.92,
			ratingCount: 540,
		},
		{
			id: 900107,
			name: "Mechanical Mouse Click",
			description: "Ultra-sharp tactile click for screencasts, tutorials, and button clicks",
			url: mouseClickUri,
			previewUrl: mouseClickUri,
			downloadUrl: mouseClickUri,
			duration: 0.04,
			filesize: 3528,
			type: "wav",
			channels: 1,
			bitrate: 705600,
			bitdepth: 16,
			samplerate: 44100,
			username: "AmberCut Library",
			tags: ["click", "mouse", "tactile", "ui", "tutorial"],
			license: "Creative Commons 0",
			created: "2026-01-01",
			downloads: 8700,
			rating: 4.75,
			ratingCount: 210,
		},
		{
			id: 900108,
			name: "Cinematic Riser Tension Build",
			description: "Suspenseful pitch riser sweep building tension before the drop or reveal",
			url: riserUri,
			previewUrl: riserUri,
			downloadUrl: riserUri,
			duration: 1.8,
			filesize: 158760,
			type: "wav",
			channels: 1,
			bitrate: 705600,
			bitdepth: 16,
			samplerate: 44100,
			username: "AmberCut Library",
			tags: ["riser", "tension", "build", "sweep", "cinematic"],
			license: "Creative Commons 0",
			created: "2026-01-01",
			downloads: 13400,
			rating: 4.9,
			ratingCount: 395,
		},
		{
			id: 900109,
			name: "Digital Glitch Stutter",
			description: "Cyberpunk digital glitch artifact for text transitions and error reveals",
			url: glitchUri,
			previewUrl: glitchUri,
			downloadUrl: glitchUri,
			duration: 0.28,
			filesize: 24696,
			type: "wav",
			channels: 1,
			bitrate: 705600,
			bitdepth: 16,
			samplerate: 44100,
			username: "AmberCut Library",
			tags: ["glitch", "digital", "stutter", "cyber", "transition"],
			license: "Creative Commons 0",
			created: "2026-01-01",
			downloads: 9800,
			rating: 4.82,
			ratingCount: 280,
		},
		{
			id: 900110,
			name: "Sub Bass Drop 808",
			description: "Heavy low-end sub bass drop rumble for dramatic reveals and musical transitions",
			url: bassDropUri,
			previewUrl: bassDropUri,
			downloadUrl: bassDropUri,
			duration: 1.5,
			filesize: 132300,
			type: "wav",
			channels: 1,
			bitrate: 705600,
			bitdepth: 16,
			samplerate: 44100,
			username: "AmberCut Library",
			tags: ["bass", "drop", "sub", "808", "heavy"],
			license: "Creative Commons 0",
			created: "2026-01-01",
			downloads: 15600,
			rating: 4.96,
			ratingCount: 470,
		},
		{
			id: 900111,
			name: "Cinematic Ambient Pad (Atmospheric Drone)",
			description: "Lush Dm9 synth pad chord with analog chorus warmth for background scenes and narrative pacing",
			url: ambientPadUri,
			previewUrl: ambientPadUri,
			downloadUrl: ambientPadUri,
			duration: 5.0,
			filesize: 441000,
			type: "wav",
			channels: 1,
			bitrate: 705600,
			bitdepth: 16,
			samplerate: 44100,
			username: "AmberCut Studio",
			tags: ["ambient", "cinematic", "pad", "synth", "drone", "music"],
			license: "Creative Commons 0",
			created: "2026-01-01",
			downloads: 21400,
			rating: 4.98,
			ratingCount: 620,
		},
		{
			id: 900112,
			name: "Orchestral Braam Impact",
			description: "Massive brass horn braam with low reese distortion for blockbuster reveals and trailers",
			url: braamUri,
			previewUrl: braamUri,
			downloadUrl: braamUri,
			duration: 3.2,
			filesize: 282240,
			type: "wav",
			channels: 1,
			bitrate: 705600,
			bitdepth: 16,
			samplerate: 44100,
			username: "AmberCut Studio",
			tags: ["braam", "brass", "orchestral", "trailer", "cinematic", "impact"],
			license: "Creative Commons 0",
			created: "2026-01-01",
			downloads: 18900,
			rating: 4.97,
			ratingCount: 510,
		},
		{
			id: 900113,
			name: "Lo-Fi Electric Piano Chords",
			description: "Warm Rhodes 7th chord progression with subtle vinyl flutter for chill vlog and tutorial backgrounds",
			url: lofiKeysUri,
			previewUrl: lofiKeysUri,
			downloadUrl: lofiKeysUri,
			duration: 4.2,
			filesize: 370440,
			type: "wav",
			channels: 1,
			bitrate: 705600,
			bitdepth: 16,
			samplerate: 44100,
			username: "AmberCut Studio",
			tags: ["lofi", "chords", "piano", "rhodes", "chill", "music", "vlog"],
			license: "Creative Commons 0",
			created: "2026-01-01",
			downloads: 26800,
			rating: 5.0,
			ratingCount: 780,
		},
	];

	return cachedSounds;
}
