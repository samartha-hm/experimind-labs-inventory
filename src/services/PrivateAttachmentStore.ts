import { mkdir, lstat, realpath, open } from "node:fs/promises";
import { resolve, relative, isAbsolute, join } from "node:path";
import { createHash } from "node:crypto";

export const attachmentLimit = 10 * 1024 * 1024;
export const attachmentDigest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const identity = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export function validateAttachment(bytes: Buffer, name: string, mime: string) {
  if (!bytes.length || bytes.length > attachmentLimit) throw new Error("Attachment must be 1 byte to 10 MiB");
  if (!/^[\p{L}\p{N} _().-]{1,160}$/u.test(name) || name.startsWith(".") || name.endsWith(".") || /[\\/]/.test(name)) throw new Error("Invalid attachment filename");
  const ext = name.split(".").at(-1)?.toLowerCase();
  const valid = mime === "image/png" && ext === "png" && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    || mime === "image/jpeg" && ["jpg","jpeg"].includes(ext ?? "") && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    || mime === "application/pdf" && ext === "pdf" && bytes.subarray(0,5).toString() === "%PDF-"
    || mime === "text/plain" && ext === "txt" && !bytes.includes(0) && Buffer.from(bytes.toString("utf8")).equals(bytes);
  if (!valid) throw new Error("Only matching PNG, JPEG, PDF or UTF-8 TXT attachments allowed");
}

/** Generated object keys only; never derive a path from a filename or request URL. */
export class PrivateAttachmentStore {
  constructor(private readonly root: string) {}
  private async directory(org: string) {
    if (!identity.test(org) || !isAbsolute(this.root)) throw new Error("Invalid private storage configuration");
    const root = resolve(this.root);
    const rel = relative(process.cwd(), root).replaceAll("\\", "/");
    if (!rel || !rel.startsWith("..") && !isAbsolute(rel) && !rel.startsWith(".local-dev/")) throw new Error("Storage must be outside source/web roots");
    await mkdir(root, { recursive: true, mode: 0o700 });
    if ((await lstat(root)).isSymbolicLink()) throw new Error("Storage symlink forbidden");
    const canonical = await realpath(root), dir = join(canonical, org);
    await mkdir(dir, { mode: 0o700 }).catch((e: NodeJS.ErrnoException) => { if (e.code !== "EEXIST") throw e; });
    if (!(await lstat(dir)).isDirectory() || (await lstat(dir)).isSymbolicLink() || relative(canonical, await realpath(dir)) !== org) throw new Error("Unsafe storage directory");
    return dir;
  }
  async put(org: string, id: string, bytes: Buffer) {
    if (!identity.test(id)) throw new Error("Invalid object identity");
    const file = await open(join(await this.directory(org), id), "wx", 0o600);
    try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
  }
  async get(org: string, id: string, digest: string, size: number) {
    if (!identity.test(id)) throw new Error("Invalid object identity");
    const path = join(await this.directory(org), id), stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size !== size || size > attachmentLimit) throw new Error("Attachment integrity failure");
    const file = await open(path, "r");
    try {
      const opened = await file.stat();
      if (opened.ino !== stat.ino || opened.dev !== stat.dev || opened.size !== size) throw new Error("Attachment changed during read");
      const bytes = await file.readFile();
      if (attachmentDigest(bytes) !== digest) throw new Error("Attachment integrity failure");
      return bytes;
    } finally { await file.close(); }
  }
}
