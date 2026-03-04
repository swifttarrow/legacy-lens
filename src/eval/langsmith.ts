import { Client } from "langsmith";
import { evaluate } from "langsmith/evaluation";
import { retrieve } from "../retrieval/retrieve.js";
import { answerStream } from "../llm/answer.js";
import type { EvalCase } from "./run.js";

const DATASET_NAME = "legacy-lens-eval";

/** Extract file paths cited as `path/file.c:N` in an LLM answer. */
function extractCitedFiles(answer: string): string[] {
  const RE = /`([\w./\-]+\.(?:c|h)):\d+/g;
  const files: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = RE.exec(answer)) !== null) files.push(m[1]);
  return files;
}

async function ensureDataset(client: Client, cases: EvalCase[]): Promise<void> {
  for await (const ds of client.listDatasets({ datasetName: DATASET_NAME })) {
    void ds;
    return; // dataset already exists
  }

  const dataset = await client.createDataset(DATASET_NAME, {
    description:
      "Legacy Lens — 50 evaluation cases over the original Doom (1993) C source",
  });

  await client.createExamples(
    cases.map((c) => ({
      dataset_id: dataset.id,
      inputs: { id: c.id, query: c.query, category: c.category },
      outputs: {
        expected_symbols: c.expected_symbols,
        expected_files: c.expected_files,
      },
    })),
  );

  console.log(`Created LangSmith dataset "${DATASET_NAME}" with ${cases.length} examples.`);
}

export async function runWithLangSmith(
  cases: EvalCase[],
  options: { parallel?: number } = {},
): Promise<string> {
  const apiKey = process.env.LANGSMITH_API_KEY;
  if (!apiKey) throw new Error("LANGSMITH_API_KEY is not set");

  const client = new Client({ apiKey });
  await ensureDataset(client, cases);

  const experimentResults = await evaluate(
    async (inputs: Record<string, unknown>) => {
      const query = inputs.query as string;
      const chunks = await retrieve(query);
      let answer = "";
      for await (const token of answerStream(query, chunks, "explain")) {
        answer += token;
      }
      return {
        answer,
        retrieved_symbols: chunks.map((c) => c.symbol_name),
        retrieved_files: chunks.map((c) => c.file_path),
      };
    },
    {
      data: DATASET_NAME,
      client,
      maxConcurrency: options.parallel ?? 4,
      experimentPrefix: "legacy-lens",
      evaluators: [
        // Symbol hit: at least one expected symbol in retrieval results or answer.
        ({ outputs, referenceOutputs }: {
          outputs: Record<string, unknown>;
          referenceOutputs?: Record<string, unknown>;
        }) => {
          const expected = (referenceOutputs?.expected_symbols ?? []) as string[];
          if (expected.length === 0) return { key: "symbol_hit", score: 1 };
          const symbols = (outputs.retrieved_symbols ?? []) as string[];
          const answer = (outputs.answer ?? "") as string;
          const hit = expected.some((s) => symbols.includes(s) || answer.includes(s));
          return { key: "symbol_hit", score: hit ? 1 : 0 };
        },
        // File hit: at least one expected file matches a retrieved file path.
        ({ outputs, referenceOutputs }: {
          outputs: Record<string, unknown>;
          referenceOutputs?: Record<string, unknown>;
        }) => {
          const expected = (referenceOutputs?.expected_files ?? []) as string[];
          if (expected.length === 0) return { key: "file_hit", score: 1 };
          const files = (outputs.retrieved_files ?? []) as string[];
          const hit = expected.some((f) => files.some((rf) => rf.endsWith(f)));
          return { key: "file_hit", score: hit ? 1 : 0 };
        },
        // Faithfulness: every citation in the answer comes from a retrieved chunk.
        ({ outputs }: { outputs: Record<string, unknown> }) => {
          const answer = (outputs.answer ?? "") as string;
          const retrievedFiles = new Set((outputs.retrieved_files ?? []) as string[]);
          const cited = extractCitedFiles(answer);
          const faithful = cited.every((f) => retrievedFiles.has(f));
          return { key: "faithfulness", score: faithful ? 1 : 0 };
        },
      ],
    },
  );

  return experimentResults.experimentName;
}
