import "../load-env.js";
import { retrieve } from "../retrieval/retrieve.js";
import type { RetrievalProfile } from "../retrieval/retrieve.js";
import { answerStream } from "../llm/answer.js";

const args = process.argv.slice(2);
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

const query = queryParts.join(" ").trim();
if (!query) {
  console.error('Usage: pnpm ask [--profile interactive|deep] "<question>"');
  process.exit(1);
}

try {
  process.stderr.write(`Retrieving [profile=${profile}]...\n`);
  const chunks = await retrieve(query, profile);
  process.stderr.write(`Retrieved ${chunks.length} chunks.\n\n`);

  for await (const token of answerStream(query, chunks)) {
    process.stdout.write(token);
  }
  process.stdout.write("\n");
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
