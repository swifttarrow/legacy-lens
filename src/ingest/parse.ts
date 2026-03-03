import { readFileSync } from "fs";
import { relative } from "path";
import Parser from "tree-sitter";
import C from "tree-sitter-c";
import { hashChunk } from "./hash.js";
import type { Chunk, SymbolType } from "./types.js";

const parser = new Parser();
parser.setLanguage(C);

// ---------------------------------------------------------------------------
// Identifier extraction
// ---------------------------------------------------------------------------

/**
 * Walk down a declarator chain (pointer_declarator → function_declarator → …)
 * until we find the leaf identifier or type_identifier.
 */
function extractLeafIdentifier(node: Parser.SyntaxNode): string | null {
  if (node.type === "identifier" || node.type === "type_identifier") {
    return node.text;
  }
  // init_declarator wraps a declarator with an initialiser
  if (node.type === "init_declarator") {
    const inner = node.childForFieldName("declarator");
    if (inner) return extractLeafIdentifier(inner);
  }
  // Unwrap pointer / array / function / parenthesised declarators
  const inner = node.childForFieldName("declarator");
  if (inner) return extractLeafIdentifier(inner);
  // Fallback: first named child that has an identifier somewhere
  for (const child of node.namedChildren) {
    const name = extractLeafIdentifier(child);
    if (name) return name;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Per-node-type extractors
// ---------------------------------------------------------------------------

function extractFunctionName(funcDef: Parser.SyntaxNode): string | null {
  let decl = funcDef.childForFieldName("declarator");
  if (!decl) return null;
  // Peel pointer decorators
  while (decl.type === "pointer_declarator") {
    const next = decl.childForFieldName("declarator");
    if (!next) break;
    decl = next;
  }
  if (decl.type === "function_declarator") {
    const inner = decl.childForFieldName("declarator");
    if (inner) return extractLeafIdentifier(inner);
  }
  return null;
}

function extractTypedefName(typeDef: Parser.SyntaxNode): string | null {
  const decl = typeDef.childForFieldName("declarator");
  if (!decl) return null;
  return extractLeafIdentifier(decl);
}

// ---------------------------------------------------------------------------
// Top-level node → Chunk
// ---------------------------------------------------------------------------

function makeChunk(
  filePath: string,
  symbolName: string,
  symbolType: SymbolType,
  node: Parser.SyntaxNode,
  repoRef: string,
): Chunk {
  const content = node.text;
  return {
    file_path: filePath,
    symbol_name: symbolName,
    symbol_type: symbolType,
    start_line: node.startPosition.row + 1,
    end_line: node.endPosition.row + 1,
    content,
    chunk_hash: hashChunk(filePath, content),
    repo_ref: repoRef,
  };
}

function processNode(
  node: Parser.SyntaxNode,
  filePath: string,
  repoRef: string,
): Chunk | null {
  switch (node.type) {
    case "function_definition": {
      const name = extractFunctionName(node);
      if (!name) return null;
      return makeChunk(filePath, name, "function", node, repoRef);
    }

    case "type_definition": {
      const name = extractTypedefName(node);
      if (!name) return null;
      return makeChunk(filePath, name, "typedef", node, repoRef);
    }

    case "declaration": {
      const typeNode = node.childForFieldName("type");
      if (!typeNode) return null;

      // Struct / union with a body
      if (
        typeNode.type === "struct_specifier" ||
        typeNode.type === "union_specifier"
      ) {
        const body = typeNode.childForFieldName("body");
        const nameNode = typeNode.childForFieldName("name");
        if (!body || !nameNode) return null; // forward declaration
        return makeChunk(filePath, nameNode.text, "struct", node, repoRef);
      }

      // Enum with a body
      if (typeNode.type === "enum_specifier") {
        const body = typeNode.childForFieldName("body");
        const nameNode = typeNode.childForFieldName("name");
        if (!body || !nameNode) return null;
        return makeChunk(filePath, nameNode.text, "enum", node, repoRef);
      }

      // Global variable — use first declarator
      const decl = node.childForFieldName("declarator");
      if (!decl) return null;
      const name = extractLeafIdentifier(decl);
      if (!name) return null;
      return makeChunk(filePath, name, "global", node, repoRef);
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseFile(
  absolutePath: string,
  repoDir: string,
  repoRef: string,
): Chunk[] {
  const source = readFileSync(absolutePath, "utf8");
  // Default bufferSize (1024) is too small for files with long lines (e.g. large
  // static array initialisers in tables.c / info.c).  Use 2× the file size to
  // guarantee the internal UTF-16 conversion buffer can hold the whole input.
  const bufferSize = Math.max(source.length * 2, 32 * 1024);
  const tree = parser.parse(source, undefined, { bufferSize });
  const filePath = relative(repoDir, absolutePath);

  const chunks: Chunk[] = [];
  for (const node of tree.rootNode.namedChildren) {
    const chunk = processNode(node, filePath, repoRef);
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}
