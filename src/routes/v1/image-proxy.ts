import { Router, Request, Response } from "express";
import https from "https";
import http from "http";
import { URL } from "url";

const router = Router();

// In-memory cache for fast repeated image serving (max 500 images)
const imageCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();
const MAX_CACHE_SIZE = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function isPrivateIpOrHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.")
  ) {
    return true;
  }
  // Check 172.16.0.0 - 172.31.255.255
  if (host.startsWith("172.")) {
    const parts = host.split(".");
    if (parts.length >= 2) {
      const secondOctet = parseInt(parts[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) return true;
    }
  }
  return false;
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

async function fetchRemoteBuffer(urlStr: string, redirectCount = 0): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (redirectCount > 4) return null;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    return null;
  }

  // Strictly enforce HTTP(S) protocol and block private/loopback/cloud metadata IPs
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    return null;
  }
  if (isPrivateIpOrHost(parsedUrl.hostname)) {
    console.warn(`[SSRF BLOCKED] Prevented access to restricted target: ${parsedUrl.hostname}`);
    return null;
  }

  return new Promise((resolve) => {
    const client = parsedUrl.protocol === "https:" ? https : http;
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
          return resolve(fetchRemoteBuffer(res.headers.location, redirectCount + 1));
        }

        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          return resolve(null);
        }

        const contentType = res.headers["content-type"] || "image/jpeg";
        if (contentType.includes("text/html")) {
          return resolve(null);
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
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
  const driveId = req.query.driveId as string;
  const originalUrl = req.query.originalUrl as string;

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
    if (imageCache.size >= MAX_CACHE_SIZE) {
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

