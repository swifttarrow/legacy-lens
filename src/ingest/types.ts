export type SymbolType = "function" | "struct" | "enum" | "typedef" | "global";

export interface Chunk {
  file_path: string;
  symbol_name: string;
  symbol_type: SymbolType;
  start_line: number;
  end_line: number;
  content: string;
  chunk_hash: string;
  repo_ref: string;
}
