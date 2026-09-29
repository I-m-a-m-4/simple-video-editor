import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const masterSvg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="amber-gradient" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FF7A1A"/>
      <stop offset="50%" stop-color="#F95400"/>
      <stop offset="100%" stop-color="#DC3B00"/>
    </linearGradient>
    <filter id="soft-shadow" x="-8%" y="-8%" width="116%" height="116%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-opacity="0.18"/>
    </filter>
  </defs>

  <!-- Orange Squircle Container -->
  <rect width="512" height="512" rx="116" fill="url(#amber-gradient)"/>

  <!-- AmberCut Distinctive White Mark -->
  <g filter="url(#soft-shadow)">
    <!-- Main Left Stem & Crown of 'A' -->
    <path d="M 256 94
             L 124 382
             H 194
             L 226 310
             H 270
             L 288 270
             H 208
             L 256 164
             L 284 224
             L 312 168
             L 256 94 Z"
          fill="#FFFFFF"
          fill-rule="evenodd"/>

    <!-- Right Stem with Razor Film Cut -->
    <path d="M 330 212
             L 286 298
             H 318
             L 354 382
             H 424
             L 358 230
             L 330 212 Z"
          fill="#FFFFFF"/>

    <!-- Center Play / Slice Wedge -->
    <polygon points="232,278 328,326 232,374 252,326" fill="#FFFFFF"/>
  </g>
</svg>`;

// Also a clean vector without filter for smaller icons / UI display
const cleanSvg = masterSvg.replace('filter="url(#soft-shadow)"', '');

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
  fs.writeFileSync(path.join(logosAmbercutDir, 'logo.svg'), cleanSvg);
  fs.writeFileSync(path.join(logosAmbercutDir, 'icon.svg'), cleanSvg);
  fs.writeFileSync(path.join(logosOpencutDir, 'icon.svg'), cleanSvg);
  fs.writeFileSync(path.join(logosOpencutDir, 'logo.svg'), cleanSvg);
  fs.writeFileSync(path.join(logosOpencutSvgDir, 'logo.svg'), cleanSvg);
  console.log('✓ SVGs written');

  const svgBuffer = Buffer.from(cleanSvg);

  // 2. Generate Favicon PNGs
  const faviconSizes = [16, 32, 96];
  for (const size of faviconSizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `favicon-${size}x${size}.png`));
  }
  // Copy 32x32 to public/favicon-32x32.png if needed, and make favicon.ico
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.ico'));
  console.log('✓ Favicons generated');

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

  // 6. Generate Tauri desktop icons
  if (fs.existsSync(tauriIconsDir)) {
    await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(tauriIconsDir, '32x32.png'));
    await sharp(svgBuffer).resize(128, 128).png().toFile(path.join(tauriIconsDir, '128x128.png'));
    await sharp(svgBuffer).resize(256, 256).png().toFile(path.join(tauriIconsDir, '128x128@2x.png'));
    await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(tauriIconsDir, 'icon.ico'));
    console.log('✓ Tauri desktop icons generated');
  }

  console.log('All AmberCut brand assets generated successfully!');
}

generateAll().catch(console.error);
