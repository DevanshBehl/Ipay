// Generates extension icons as proper PNGs with transparency using raw pixel buffers
// No external dependencies - writes raw PNG using zlib (built into Node)
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function createPNG(size) {
  const pixels = Buffer.alloc(size * size * 4, 0); // RGBA, all transparent

  const cx = size / 2;
  const cy = size / 2;
  const squareSize = size * 0.82;
  const half = squareSize / 2;
  const radius = size * 0.18;

  // Draw white rounded square
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const rx = x - cx;
      const ry = y - cy;

      if (isInsideRoundedRect(rx, ry, half, half, radius)) {
        pixels[idx] = 255;     // R
        pixels[idx + 1] = 255; // G
        pixels[idx + 2] = 255; // B
        pixels[idx + 3] = 255; // A
      }
    }
  }

  // Draw black lightning bolt
  const boltPoints = [
    // Upper part (top-left to mid-right)
    { x: 0.42, y: 0.18 },
    { x: 0.58, y: 0.18 },
    { x: 0.48, y: 0.46 },
    { x: 0.62, y: 0.46 },
    // Lower part (mid to bottom)
    { x: 0.38, y: 0.82 },
    { x: 0.52, y: 0.54 },
    { x: 0.38, y: 0.54 },
  ];

  const scaledBolt = boltPoints.map(p => ({
    x: Math.round(p.x * size),
    y: Math.round(p.y * size),
  }));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isInsidePolygon(x, y, scaledBolt)) {
        const idx = (y * size + x) * 4;
        pixels[idx] = 0;       // R
        pixels[idx + 1] = 0;   // G
        pixels[idx + 2] = 0;   // B
        pixels[idx + 3] = 255; // A
      }
    }
  }

  return encodePNG(size, size, pixels);
}

function isInsideRoundedRect(rx, ry, hw, hh, r) {
  const ax = Math.abs(rx);
  const ay = Math.abs(ry);
  if (ax <= hw - r && ay <= hh) return true;
  if (ax <= hw && ay <= hh - r) return true;
  if (ax > hw || ay > hh) return false;
  const cx = hw - r;
  const cy = hh - r;
  if (ax > cx && ay > cy) {
    const dx = ax - cx;
    const dy = ay - cy;
    return (dx * dx + dy * dy) <= (r * r);
  }
  return true;
}

function isInsidePolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function encodePNG(w, h, pixels) {
  // Build raw scanlines (filter byte 0 = None per row)
  const rawData = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    rawData[y * (1 + w * 4)] = 0; // filter: None
    pixels.copy(rawData, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }

  const compressed = zlib.deflateSync(rawData);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);

  // CRC32
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < crcData.length; i++) {
    crc ^= crcData[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  crc = (crc ^ 0xFFFFFFFF) >>> 0;
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc, 0);

  return Buffer.concat([len, typeB, data, crcB]);
}

// Generate all sizes
const outDir = path.join(__dirname, '..', 'public', 'icons');
[16, 48, 128].forEach(size => {
  const png = createPNG(size);
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png);
  console.log(`✓ icon-${size}.png (${png.length} bytes)`);
});
