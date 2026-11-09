const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimalistic PNG encoder in pure Node.js (no external npm dependencies)
function createPNG(width, height, pixelFn) {
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function chunk(type, data) {
    const len = data ? data.length : 0;
    const buf = Buffer.alloc(8 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    if (data) data.copy(buf, 8);

    let crc = -1;
    const crcBuf = buf.subarray(4, 8 + len);
    for (let i = 0; i < crcBuf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ crcBuf[i]) & 0xFF];
    }
    crc = (crc ^ -1) >>> 0;
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    header,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', null)
  ]);
}

function renderIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;
  const cx = 0.5;
  const cy = 0.5;
  const dx = nx - cx;
  const dy = ny - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Rounded squircle mask
  const cornerR = 0.42;
  const sqX = Math.abs(dx);
  const sqY = Math.abs(dy);
  const cornerDist = Math.hypot(Math.max(0, sqX - (0.5 - cornerR)), Math.max(0, sqY - (0.5 - cornerR)));
  if (cornerDist > cornerR) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Modern Indigo Gradient: #4F46E5 to #4338CA
  const bgR = Math.round(79 - ny * 12);
  const bgG = Math.round(70 - ny * 14);
  const bgB = Math.round(229 - ny * 27);

  // Draw lightning bolt / conversion icon
  const isBolt = (
    // Top stem
    (nx > 0.45 && nx < 0.65 && ny > 0.22 && ny < 0.52 && (nx - 0.45) * 1.5 > (ny - 0.22)) ||
    // Bottom stem
    (nx > 0.35 && nx < 0.55 && ny >= 0.48 && ny < 0.78 && (nx - 0.35) * 1.5 < (ny - 0.48) + 0.2) ||
    // Center connector
    (ny > 0.45 && ny < 0.55 && nx > 0.38 && nx < 0.62)
  );

  const isBorder = cornerDist > cornerR - 0.05;

  if (isBolt) {
    // Pure White bolt for high contrast
    return [255, 255, 255, 255];
  }

  if (isBorder) {
    // Subtle Indigo highlight border (#C7D2FE)
    return [199, 210, 254, 240];
  }

  // Radial subtle highlight
  const highlight = Math.max(0, 1 - dist * 1.8) * 25;
  return [
    Math.min(255, Math.round(bgR + highlight)),
    Math.min(255, Math.round(bgG + highlight)),
    Math.min(255, Math.round(bgB + highlight)),
    255
  ];
}

const rootIconsDir = path.join(__dirname, 'icons');
const extIconsDir = path.join(__dirname, 'extension', 'icons');
fs.mkdirSync(rootIconsDir, { recursive: true });
fs.mkdirSync(extIconsDir, { recursive: true });

[16, 48, 128].forEach(size => {
  const png = createPNG(size, size, renderIcon);
  fs.writeFileSync(path.join(rootIconsDir, `icon${size}.png`), png);
  fs.writeFileSync(path.join(extIconsDir, `icon${size}.png`), png);
  console.log(`Generated icon${size}.png in icons/ and extension/icons/ (${size}x${size})`);
});
