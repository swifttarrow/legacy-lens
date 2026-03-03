export interface RetrievedChunk {
  id: number;
  file_path: string;
  symbol_name: string;
  symbol_type: string;
  start_line: number;
  end_line: number;
  content: string;
  score: number;
}
