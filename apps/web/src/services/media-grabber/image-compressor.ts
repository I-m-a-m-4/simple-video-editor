/**
 * Client-Side High Performance Image Compression Utility
 */

export interface ImageCompressOptions {
	file: File;
	quality?: number; // 0.1 to 1.0 (e.g. 0.75)
	maxWidth?: number;
	maxHeight?: number;
	format?: "image/webp" | "image/jpeg" | "image/png";
}

export interface ImageCompressResult {
	file: File;
	originalSize: number;
	compressedSize: number;
	compressionRatio: number; // percentage saved, e.g. 68%
	width: number;
	height: number;
	previewUrl: string;
}

export async function compressImageInBrowser({
	file,
	quality = 0.75,
	maxWidth = 1920,
	maxHeight = 1080,
	format = "image/webp",
}: ImageCompressOptions): Promise<ImageCompressResult> {
	return new Promise((resolve, reject) => {
		const originalSize = file.size;
		const img = new Image();
		const objectUrl = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(objectUrl);

			let { width, height } = img;

			// Scale down if exceeding max bounds while preserving aspect ratio
			if (width > maxWidth || height > maxHeight) {
				const ratio = Math.min(maxWidth / width, maxHeight / height);
				width = Math.round(width * ratio);
				height = Math.round(height * ratio);
			}

			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("Failed to initialize canvas context for image compression."));
				return;
			}

			// Clear & draw
			ctx.clearRect(0, 0, width, height);
			ctx.drawImage(img, 0, 0, width, height);

			canvas.toBlob(
				(blob) => {
					if (!blob) {
						reject(new Error("Failed to compress image to blob."));
						return;
					}

					const extension =
						format === "image/webp" ? "webp" : format === "image/png" ? "png" : "jpg";
					const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
					const compressedFileName = `${baseName}_compressed.${extension}`;

					const compressedFile = new File([blob], compressedFileName, { type: format });
					const compressedSize = blob.size;
					const savedBytes = Math.max(0, originalSize - compressedSize);
					const compressionRatio =
						originalSize > 0
							? Math.round((savedBytes / originalSize) * 100)
							: 0;

					const previewUrl = URL.createObjectURL(blob);

					resolve({
						file: compressedFile,
						originalSize,
						compressedSize,
						compressionRatio,
						width,
						height,
						previewUrl,
					});
				},
				format,
				quality,
			);
		};

		img.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error("Failed to load image for compression."));
		};

		img.src = objectUrl;
	});
}
