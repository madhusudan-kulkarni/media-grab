import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <rect x="4" y="4" width="120" height="120" rx="30" fill="#0f1419" />
  <path d="M47 33 86 55 47 77Z" fill="#ffffff" />
  <path d="M31 92h66" stroke="#ffffff" stroke-width="10" stroke-linecap="round" />
</svg>`;

const outputDirs = [path.resolve('public'), path.resolve('src/public')];

for (const dir of outputDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, 'icon.svg'), svgContent);
}

const sizes = [16, 32, 48, 128];

async function generatePngs() {
  const svgBuffer = Buffer.from(svgContent);
  for (const dir of outputDirs) {
    for (const size of sizes) {
      const outPath = path.join(dir, `icon-${size}.png`);
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outPath);
      console.log(`Generated ${outPath} (${size}x${size})`);
    }
  }
}

generatePngs().catch(console.error);
