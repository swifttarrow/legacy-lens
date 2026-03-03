import { expandQuery } from "../src/retrieval/expand.js";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function assertIncludes(arr: string[], val: string, msg?: string): void {
  assert(arr.includes(val), msg ?? `Expected [${arr.join(", ")}] to include "${val}"`);
}

function assertArrayEquals<T>(a: T[], b: T[], msg?: string): void {
  assert(
    a.length === b.length && a.every((x, i) => x === b[i]),
    msg ?? `Expected [${a.join(", ")}] to equal [${b.join(", ")}]`,
  );
}

// Stop-word stripping: "how does damage work" -> dense includes "damage work"
{
  const out = expandQuery("how does damage work");
  assertIncludes(out, "damage work", "dense variant should strip stop words");
  assertIncludes(out, "how does damage work", "original query preserved");
}

// Deduplication: when query has no stop words, dense === query, so we dedupe
{
  const out = expandQuery("damage work");
  const unique = [...new Set(out)];
  assertArrayEquals(out, unique, "no duplicate variants");
}

// Single-token query: "x" -> dense empty (length<=1 filtered), core = query
{
  const out = expandQuery("x");
  assert(out.length >= 2, "should have at least 2 variants");
  assertIncludes(out, "x");
  assertIncludes(out, "C function implementation x");
}

// All stop words: "the and of" -> dense = "", core = query
{
  const out = expandQuery("the and of");
  assertIncludes(out, "the and of");
  assertIncludes(out, "C function implementation the and of");
}

// Order preservation: original first, then dense (if different), then prefixed
{
  const out = expandQuery("how does player damage work");
  assert(out[0] === "how does player damage work", "original first");
  assert(out[1] === "player damage work", "dense second");
}

console.log("expand.test.ts: all tests passed");