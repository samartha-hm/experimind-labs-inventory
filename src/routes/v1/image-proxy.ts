import { Router, Request, Response } from "express";
import https from "https";

import { URL } from "url";

const router = Router();

// In-memory cache for fast repeated image serving (max 500 images)
const imageCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();
const MAX_CACHE_SIZE = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function isAllowedImageTarget(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      (!url.port || url.port === "443") &&
      ["drive.google.com", "lh3.googleusercontent.com"].includes(url.hostname.toLowerCase());
  } catch { return false; }
}

function generateSvgPlaceholder(label: string = "Laboratory Asset"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#g)" rx="24"/>
    <circle cx="200" cy="180" r="70" fill="#334155" opacity="0.6"/>
    <text x="200" y="195" font-family="system-ui, sans-serif" font-size="52" text-anchor="middle" fill="#94a3b8">🔬</text>
    <text x="200" y="290" font-family="system-ui, sans-serif" font-weight="600" font-size="16" text-anchor="middle" fill="#cbd5e1">${label}</text>
  </svg>`;
}

export async function fetchRemoteBuffer(urlStr: string, redirectCount = 0): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (redirectCount > 4) return null;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    return null;
  }

  // Public catalog proxy: only the existing Google image providers are permitted.
  if (!isAllowedImageTarget(urlStr)) return null;

  return new Promise((resolve) => {
    const client = https;
    const req = client.get(
      urlStr,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        timeout: 6000,
      },
      (res) => {
        // Follow redirects safely
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          try { return resolve(fetchRemoteBuffer(new URL(res.headers.location, parsedUrl).href, redirectCount + 1)); }
          catch { return resolve(null); }
        }

        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return resolve(null);
        }

        const contentType = (res.headers["content-type"] || "").split(";")[0].toLowerCase();
        if (!["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"].includes(contentType)) {
          res.resume();
          return resolve(null);
        }

        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (chunk) => {
          total += chunk.length;
          if (total > 8 * 1024 * 1024) { res.destroy(); resolve(null); return; }
          chunks.push(Buffer.from(chunk));
        });
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          if (buffer.length > 100) {
            resolve({ buffer, contentType });
          } else {
            resolve(null);
          }
        });
        res.on("error", () => resolve(null));
      }
    );

    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const driveId = typeof req.query.driveId === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(req.query.driveId) ? req.query.driveId : undefined;
  const originalUrl = typeof req.query.originalUrl === "string" && req.query.originalUrl.length <= 2048 ? req.query.originalUrl : undefined;

  const targetDriveId = driveId || (originalUrl ? (originalUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || originalUrl.match(/\/d\/([a-zA-Z0-9_-]+)/))?.[1] : null);

  const cacheKey = targetDriveId || originalUrl || "default";

  // Check in-memory cache
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    res.setHeader("Content-Type", cached.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.send(cached.buffer);
    return;
  }

  let result: { buffer: Buffer; contentType: string } | null = null;

  if (targetDriveId) {
    // Try Google UserContent CDN first (most reliable)
    result = await fetchRemoteBuffer(`https://lh3.googleusercontent.com/d/${targetDriveId}=w600`);
    
    // Fallback to direct download link
    if (!result) {
      result = await fetchRemoteBuffer(`https://drive.google.com/uc?export=view&id=${targetDriveId}`);
    }

    // Fallback to thumbnail URL
    if (!result) {
      result = await fetchRemoteBuffer(`https://drive.google.com/thumbnail?id=${targetDriveId}&sz=w600`);
    }
  } else if (originalUrl && (originalUrl.startsWith("http://") || originalUrl.startsWith("https://"))) {
    result = await fetchRemoteBuffer(originalUrl);
  }

  if (result) {
    while (imageCache.size >= MAX_CACHE_SIZE || [...imageCache.values()].reduce((bytes, image) => bytes + image.buffer.length, 0) + result.buffer.length > 64 * 1024 * 1024) {
      const firstKey = imageCache.keys().next().value;
      if (firstKey) imageCache.delete(firstKey);
    }
    imageCache.set(cacheKey, { ...result, timestamp: Date.now() });

    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.send(result.buffer);
  } else {
    // Return SVG placeholder with 200 status so browser doesn't log network errors
    const svg = generateSvgPlaceholder();
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(svg);
  }
});

export default router;
