import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join } from 'path';

const outDir = join(process.cwd(), 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// A simple Mario-themed SVG: red cap "M" on a sky-blue rounded square with ground bricks.
function svg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5c94fc"/>
        <stop offset="100%" stop-color="#7aa7ff"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="96" fill="url(#sky)"/>
    <!-- ground bricks -->
    <rect x="0" y="400" width="512" height="112" fill="#c84c0c"/>
    <g fill="#7c3800">
      <rect x="0" y="400" width="512" height="8"/>
      <rect x="0" y="456" width="512" height="8"/>
      <rect x="120" y="408" width="8" height="48"/>
      <rect x="256" y="408" width="8" height="48"/>
      <rect x="384" y="408" width="8" height="48"/>
    </g>
    <!-- white clouds -->
    <g fill="#ffffff" opacity="0.95">
      <ellipse cx="110" cy="120" rx="56" ry="30"/>
      <ellipse cx="150" cy="130" rx="44" ry="26"/>
    </g>
    <!-- red cap + M -->
    <circle cx="256" cy="250" r="120" fill="#d50000"/>
    <circle cx="256" cy="250" r="120" fill="none" stroke="#000" stroke-width="10"/>
    <text x="256" y="300" font-family="Arial, sans-serif" font-size="150" font-weight="bold"
          fill="#ffffff" stroke="#000" stroke-width="8" text-anchor="middle">M</text>
  </svg>`;
}

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg(size)))
    .resize(size, size)
    .png()
    .toFile(join(outDir, `icon-${size}.png`));
  console.log(`wrote icon-${size}.png`);
}
