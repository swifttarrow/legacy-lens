import "../load-env.js";
import { retrieve } from "../retrieval/retrieve.js";
import type { RetrievalProfile } from "../retrieval/retrieve.js";
import { generateDiff } from "../llm/diff.js";

const args = process.argv.slice(2);
// Interactive gives a focused top-10 result set; deep is available via --profile deep.
let profile: RetrievalProfile = "interactive";
const queryParts: string[] = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--profile" && i + 1 < args.length) {
    const val = args[++i];
    if (val !== "interactive" && val !== "deep") {
      console.error(`Unknown profile "${val}". Use: interactive | deep`);
      process.exit(1);
    }
    profile = val;
  } else {
    queryParts.push(args[i]);
  }
}

const request = queryParts.join(" ").trim();
if (!request) {
  console.error('Usage: pnpm diff [--profile interactive|deep] "<change request>"');
  process.exit(1);
}

try {
  process.stderr.write(`Retrieving [profile=${profile}]...\n`);
  const chunks = await retrieve(request, profile);
  process.stderr.write(`Retrieved ${chunks.length} chunks. Generating diff...\n`);

  const diff = await generateDiff(request, chunks);

  if (!diff || diff.startsWith("# CANNOT_DIFF")) {
    process.stderr.write(`${diff}\n`);
    process.exit(1);
  }

  process.stdout.write(diff + "\n");
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
