const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let c = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xFF];
  }
  return (c ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crcBuf = Buffer.alloc(4 + len);
  buf.copy(crcBuf, 0, 4, 8 + len);
  const crc = crc32(crcBuf);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function generatePng(size) {
  const width = size;
  const height = size;
  // RGBA buffer: each row has 1 filter byte (0) + width * 4 bytes
  const rowBytes = 1 + width * 4;
  const raw = Buffer.alloc(rowBytes * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.45;
  const cornerRadius = width * 0.22;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    raw[rowOffset] = 0; // Filter 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Rounded rectangle bounds for app icon
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const hw = width * 0.44;
      const hh = height * 0.44;
      const cr = cornerRadius;

      let inBounds = false;
      if (dx <= hw - cr && dy <= hh) inBounds = true;
      else if (dx <= hw && dy <= hh - cr) inBounds = true;
      else if (dx > hw - cr && dy > hh - cr) {
        const cdx = dx - (hw - cr);
        const cdy = dy - (hh - cr);
        if (cdx * cdx + cdy * cdy <= cr * cr) inBounds = true;
      }

      if (!inBounds) {
        raw[pxOffset] = 0;
        raw[pxOffset + 1] = 0;
        raw[pxOffset + 2] = 0;
        raw[pxOffset + 3] = 0; // transparent
        continue;
      }

      // Gradient from Indigo-600 (#4f46e5 -> 79, 70, 229) to Purple-600 (#9333ea -> 147, 51, 234)
      const t = (x + y) / (width + height);
      let r = Math.round(79 + (147 - 79) * t);
      let g = Math.round(70 + (51 - 70) * t);
      let b = Math.round(229 + (234 - 229) * t);

      // Draw stylized box/cube glyph in center
      // Center icon: a 3D isometric cube outline / package
      const ndx = (x - cx) / (width * 0.5);
      const ndy = (y - cy) / (height * 0.5);

      // Inner icon bounds (center box)
      const isInner = Math.abs(ndx) < 0.45 && Math.abs(ndy) < 0.45;
      
      // Let's create an elegant stylized "E" or geometric box shape
      const inBoxTop = (ndy < -0.05 && ndy > -0.38) && (Math.abs(ndx) < 0.38);
      const inBoxBottomLeft = (ndy >= -0.05 && ndy < 0.38) && (ndx >= -0.38 && ndx < -0.04);
      const inBoxBottomRight = (ndy >= -0.05 && ndy < 0.38) && (ndx > 0.04 && ndx <= 0.38);
      const inAccentPill = Math.abs(ndy) < 0.12 && Math.abs(ndx) < 0.22;

      if (inBoxTop || inBoxBottomLeft || inBoxBottomRight || inAccentPill) {
        // Crisp white glyph with slight opacity gradient
        const glyphBrightness = 255;
        r = glyphBrightness;
        g = glyphBrightness;
        b = glyphBrightness;
      }

      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = 255;
    }
  }

  const deflated = zlib.deflateSync(raw);

  // PNG Header
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type 6: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve(__dirname, '../public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

[
  { file: 'icon-192x192.png', size: 192 },
  { file: 'icon-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
].forEach(({ file, size }) => {
  const pngBuf = generatePng(size);
  const target = path.join(outDir, file);
  fs.writeFileSync(target, pngBuf);
  console.log(`Generated ${target} (${size}x${size}, ${pngBuf.length} bytes)`);
});
