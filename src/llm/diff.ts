import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";
import OpenAI from "openai";
import type { RetrievedChunk } from "../retrieval/types.js";

const CHAT_MODEL = "gpt-4.1-nano";

// Only attempt full-file rewrite for files at or below this line count.
const MAX_FILE_LINES = 3_000;

/** System prompt for the file-rewrite step. */
const REWRITE_PROMPT = `\
You are a Doom C source code expert. Modify the provided source file to implement the requested change.

Rules:
- Output ONLY the complete modified file content. No explanation, no prose, no markdown code fences.
- Preserve the ENTIRE file EXACTLY — every comment, blank line, copyright header, and declaration — except for the minimal lines needed to implement the requested change.
- The first line of your output MUST be identical to the first line of the input.
- You may add new helper functions to the same file; insert them immediately before the function they support.
- Do not create new files, rename symbols, or change unrelated code.
- If the change cannot be implemented (e.g. requires a new file or binary change), output exactly:
  # CANNOT_DIFF: <reason>`;

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

function getDoomRepoDir(): string {
  const dir = process.env.DOOM_REPO_DIR;
  if (!dir) throw new Error("DOOM_REPO_DIR is not set");
  return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
}

/** Strip markdown code fences that models sometimes emit. */
function stripFences(text: string): string {
  return text
    .replace(/^```[a-z]*\s*\n/m, "")
    .replace(/\n```\s*$/m, "")
    .trim();
}

/**
 * Ask the LLM to produce a modified version of `originalContent`.
 * Returns the new file text, or a "# CANNOT_DIFF: ..." string.
 */
async function rewriteFile(
  filePath: string,
  originalContent: string,
  request: string,
  relevantSymbols: string[],
): Promise<string> {
  const hint =
    relevantSymbols.length > 0
      ? `\nRelevant symbols identified by retrieval: ${relevantSymbols.join(", ")}`
      : "";

  const userContent =
    `## File: \`${filePath}\`\n\n\`\`\`c\n${originalContent}\n\`\`\`` +
    `\n\n## Change request\n\n${request}${hint}`;

  const response = await getClient().chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: REWRITE_PROMPT },
      { role: "user", content: userContent },
    ],
    stream: false,
  });

  return stripFences(response.choices[0]?.message?.content ?? "");
}

/**
 * Compute a unified diff between two strings using the system `diff` tool.
 * `diff` exits 1 (not an error) when files differ; we catch that and use stdout.
 */
function computeUnifiedDiff(
  original: string,
  modified: string,
  label: string,
): string {
  const tmpA = path.join(os.tmpdir(), `doom-a-${Date.now()}.c`);
  const tmpB = path.join(os.tmpdir(), `doom-b-${Date.now()}.c`);
  try {
    fs.writeFileSync(tmpA, original, "utf8");
    fs.writeFileSync(tmpB, modified, "utf8");
    try {
      execFileSync("diff", [
        "-u",
        `--label=a/${label}`,
        `--label=b/${label}`,
        tmpA,
        tmpB,
      ]);
      // Exit 0 → files identical
      return "# CANNOT_DIFF: the modified file is identical to the original";
    } catch (e: unknown) {
      const err = e as { status?: number; stdout?: Buffer; stderr?: Buffer };
      if (typeof err.status === "number" && err.status === 1) {
        // Normal: files differ; stdout is the unified diff
        return err.stdout?.toString("utf8") ?? "";
      }
      const stderr = err.stderr?.toString("utf8") ?? "";
      throw new Error(`diff failed: ${stderr}`);
    }
  } finally {
    fs.rmSync(tmpA, { force: true });
    fs.rmSync(tmpB, { force: true });
  }
}

export async function generateDiff(
  request: string,
  chunks: RetrievedChunk[],
): Promise<string> {
  if (chunks.length === 0) {
    return "# CANNOT_DIFF: no source code excerpts were retrieved for this query";
  }

  const repoDir = getDoomRepoDir();

  // Pick the highest-scored file as the modification target.
  // Multi-file changes are out of scope for this MVP.
  // (chunks are already ranked by score desc)
  const targetFile = chunks[0].file_path;
  const absPath = path.join(repoDir, targetFile);

  if (!fs.existsSync(absPath)) {
    return `# CANNOT_DIFF: ${targetFile} not found in DOOM_REPO_DIR`;
  }

  const originalContent = fs.readFileSync(absPath, "utf8");
  const lineCount = originalContent.split("\n").length;

  if (lineCount > MAX_FILE_LINES) {
    return `# CANNOT_DIFF: ${targetFile} is too large (${lineCount} lines > ${MAX_FILE_LINES})`;
  }

  const relevantSymbols = [
    ...new Set(
      chunks
        .filter((c) => c.file_path === targetFile && c.symbol_name)
        .map((c) => c.symbol_name),
    ),
  ];

  const modifiedContent = await rewriteFile(
    targetFile,
    originalContent,
    request,
    relevantSymbols,
  );

  if (modifiedContent.startsWith("# CANNOT_DIFF")) {
    return modifiedContent;
  }

  return computeUnifiedDiff(originalContent, modifiedContent, targetFile);
}
