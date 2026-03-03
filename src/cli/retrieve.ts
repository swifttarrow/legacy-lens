import "../load-env.js";
import { retrieve } from "../retrieval/retrieve.js";
import type { RetrievalProfile } from "../retrieval/retrieve.js";

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
  console.error('Usage: pnpm retrieve [--profile interactive|deep] "<query>"');
  process.exit(1);
}

const results = await retrieve(query, profile);
console.log(`Top ${results.length} results for: "${query}" [profile=${profile}]\n`);
for (let i = 0; i < results.length; i++) {
  const r = results[i];
  console.log(
    `${i + 1}. [${r.symbol_type}] ${r.symbol_name}  (score: ${r.score.toFixed(4)})`,
  );
  console.log(`   ${r.file_path}:${r.start_line}-${r.end_line}`);
}
