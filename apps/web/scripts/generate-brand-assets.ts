import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Icon #7 (Layered Composition) - Selected as official logo
export const masterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="amber-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB923C"/>
      <stop offset="40%" stop-color="#F97316"/>
      <stop offset="100%" stop-color="#EF4444"/>
    </linearGradient>
  </defs>

  <!-- Orange Squircle Container -->
  <rect x="32" y="32" width="448" height="448" rx="100" fill="url(#amber-gradient)"/>

  <!-- Layered Video Frames (Icon #7) -->
  <!-- Back frame rotated -->
  <rect x="162" y="120" width="236" height="156" rx="16" fill="white" opacity="0.28" transform="rotate(-7 280 198)"/>
  <!-- Middle frame -->
  <rect x="142" y="158" width="236" height="156" rx="16" fill="white" opacity="0.48" transform="rotate(3 260 236)"/>
  <!-- Front frame -->
  <rect x="122" y="196" width="236" height="156" rx="16" fill="white" opacity="0.9"/>
  <!-- Play symbol on front frame -->
  <polygon points="222,250 222,298 258,274" fill="#EF4444" opacity="0.85"/>
  <!-- Bottom timeline block clips -->
  <rect x="122" y="370" width="64" height="20" rx="6" fill="white" opacity="0.55"/>
  <rect x="198" y="370" width="102" height="20" rx="6" fill="white" opacity="0.75"/>
  <rect x="312" y="370" width="64" height="20" rx="6" fill="white" opacity="0.55"/>
</svg>`;

// Helper to build Windows multi-resolution .ico file
function createIcoFromPngBuffers(pngBuffers: Array<{ width: number; height: number; buffer: Buffer }>): Buffer {
  const count = pngBuffers.length;
  let offset = 6 + count * 16;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(count, 4);

  const dirEntries: Buffer[] = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bit count
    entry.writeUInt32LE(item.buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    dirEntries.push(entry);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map((p) => p.buffer)]);
}

async function generateAll() {
  const rootDir = path.resolve(__dirname, '../../..');
  const publicDir = path.resolve(__dirname, '../public');
  const tauriIconsDir = path.resolve(rootDir, 'src-tauri/icons');
  const logosAmbercutDir = path.resolve(publicDir, 'logos/ambercut');
  const logosOpencutDir = path.resolve(publicDir, 'logos/opencut');
  const logosOpencutSvgDir = path.resolve(publicDir, 'logos/opencut/svg');
  const iconsDir = path.resolve(publicDir, 'icons');

  // Ensure directories exist
  [logosAmbercutDir, logosOpencutDir, logosOpencutSvgDir, iconsDir, tauriIconsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // 1. Write SVGs
  fs.writeFileSync(path.join(logosAmbercutDir, 'logo.svg'), masterSvg);
  fs.writeFileSync(path.join(logosAmbercutDir, 'icon.svg'), masterSvg);
  fs.writeFileSync(path.join(logosOpencutDir, 'icon.svg'), masterSvg);
  fs.writeFileSync(path.join(logosOpencutDir, 'logo.svg'), masterSvg);
  fs.writeFileSync(path.join(logosOpencutSvgDir, 'logo.svg'), masterSvg);
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), masterSvg);
  console.log('✓ SVGs written');

  const svgBuffer = Buffer.from(masterSvg);

  // 2. Generate Favicon PNGs
  const faviconSizes = [16, 32, 48, 96];
  for (const size of faviconSizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `favicon-${size}x${size}.png`));
  }

  // Generate multi-resolution .ico for Web
  const webIcoSizes = [16, 32, 48];
  const webIcoBuffers: Array<{ width: number; height: number; buffer: Buffer }> = [];
  for (const size of webIcoSizes) {
    const buf = await sharp(svgBuffer).resize(size, size).png().toBuffer();
    webIcoBuffers.push({ width: size, height: size, buffer: buf });
  }
  const webIco = createIcoFromPngBuffers(webIcoBuffers);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), webIco);
  console.log('✓ Web Favicons & favicon.ico generated');

  // 3. Generate Apple Icons
  const appleSizes = [57, 60, 72, 76, 114, 120, 144, 152, 180];
  for (const size of appleSizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `apple-icon-${size}x${size}.png`));
  }
  console.log('✓ Apple icons generated');

  // 4. Generate Android Icons
  const androidSizes = [36, 48, 72, 96, 144, 192];
  for (const size of androidSizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `android-icon-${size}x${size}.png`));
  }
  console.log('✓ Android icons generated');

  // 5. Generate Microsoft Icons
  const msSizes = [
    { name: 'ms-icon-70x70.png', size: 70 },
    { name: 'ms-icon-144x144.png', size: 144 },
    { name: 'ms-icon-150x150.png', size: 150 },
    { name: 'ms-icon-310x310.png', size: 310 },
  ];
  for (const item of msSizes) {
    await sharp(svgBuffer)
      .resize(item.size, item.size)
      .png()
      .toFile(path.join(iconsDir, item.name));
  }
  console.log('✓ MS icons generated');

  // 6. Generate Tauri Desktop icons
  if (fs.existsSync(tauriIconsDir)) {
    // 512x512 master icon
    await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(tauriIconsDir, 'icon.png'));

    // Standard Tauri icons
    await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(tauriIconsDir, '32x32.png'));
    await sharp(svgBuffer).resize(64, 64).png().toFile(path.join(tauriIconsDir, '64x64.png'));
    await sharp(svgBuffer).resize(128, 128).png().toFile(path.join(tauriIconsDir, '128x128.png'));
    await sharp(svgBuffer).resize(256, 256).png().toFile(path.join(tauriIconsDir, '128x128@2x.png'));

    // Windows Store & Square tiles
    const squareLogos = [
      { name: 'Square30x30Logo.png', size: 30 },
      { name: 'Square44x44Logo.png', size: 44 },
      { name: 'Square71x71Logo.png', size: 71 },
      { name: 'Square89x89Logo.png', size: 89 },
      { name: 'Square107x107Logo.png', size: 107 },
      { name: 'Square142x142Logo.png', size: 142 },
      { name: 'Square150x150Logo.png', size: 150 },
      { name: 'Square284x284Logo.png', size: 284 },
      { name: 'Square310x310Logo.png', size: 310 },
      { name: 'StoreLogo.png', size: 50 },
    ];
    for (const sq of squareLogos) {
      await sharp(svgBuffer).resize(sq.size, sq.size).png().toFile(path.join(tauriIconsDir, sq.name));
    }

    // Windows multi-resolution desktop icon.ico (16, 24, 32, 48, 64, 128, 256)
    const tauriIcoSizes = [16, 24, 32, 48, 64, 128, 256];
    const tauriIcoBuffers: Array<{ width: number; height: number; buffer: Buffer }> = [];
    for (const size of tauriIcoSizes) {
      const buf = await sharp(svgBuffer).resize(size, size).png().toBuffer();
      tauriIcoBuffers.push({ width: size, height: size, buffer: buf });
    }
    const tauriIco = createIcoFromPngBuffers(tauriIcoBuffers);
    fs.writeFileSync(path.join(tauriIconsDir, 'icon.ico'), tauriIco);

    console.log('✓ Tauri desktop icons & Windows icon.ico generated successfully');
  }

  console.log('All brand assets and desktop icons updated to Concept #7!');
}

generateAll().catch(console.error);
