import "../load-env.js";
import { retrieve } from "../retrieval/retrieve.js";

const query = process.argv.slice(2).join(" ").trim();
if (!query) {
  console.error("Usage: pnpm retrieve <query>");
  process.exit(1);
}

const results = await retrieve(query);
console.log(`Top ${results.length} results for: "${query}"\n`);
for (let i = 0; i < results.length; i++) {
  const r = results[i];
  console.log(
    `${i + 1}. [${r.symbol_type}] ${r.symbol_name}  (score: ${r.score.toFixed(4)})`,
  );
  console.log(`   ${r.file_path}:${r.start_line}-${r.end_line}`);
}
