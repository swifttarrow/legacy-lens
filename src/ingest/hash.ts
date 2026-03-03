import { createHash } from "crypto";

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Hash for chunk identity: file_path + content. Same content in different files = distinct chunks. */
export function hashChunk(filePath: string, content: string): string {
  return createHash("sha256").update(filePath).update("\0").update(content).digest("hex");
}
