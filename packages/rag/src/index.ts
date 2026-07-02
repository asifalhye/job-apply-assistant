import { normalizeQuestion, fuzzyMatchScore } from '@jaa/form-engine';

export interface ChunkRecord {
  id: number;
  documentId?: number;
  snippetId?: number;
  section?: string;
  content: string;
  embedding?: number[];
}

export function chunkText(text: string, maxChunkSize = 500): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  const chunks: string[] = [];
  let current = '';

  for (const p of paragraphs) {
    if ((current + p).length > maxChunkSize && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function parseResumeSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const headers = ['experience', 'education', 'skills', 'projects', 'summary', 'certifications'];
  const lines = text.split('\n');
  let current = 'general';
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length) sections[current] = buffer.join('\n').trim();
    buffer = [];
  };

  for (const line of lines) {
    const lower = line.toLowerCase().trim();
    const matched = headers.find((h) => lower === h || lower.startsWith(`${h} `));
    if (matched && line.trim().length < 40) {
      flush();
      current = matched;
    } else {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

export function simpleEmbed(text: string, dims = 64): number[] {
  const vec = new Array(dims).fill(0);
  const tokens = normalizeQuestion(text).split(' ').filter(Boolean);
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    vec[hash % dims] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export function retrieveChunks(
  query: string,
  chunks: ChunkRecord[],
  topK = 5
): { chunk: ChunkRecord; score: number }[] {
  const queryEmb = simpleEmbed(query);
  const scored = chunks.map((chunk) => {
    const emb = chunk.embedding ?? simpleEmbed(chunk.content);
    const semantic = cosineSimilarity(queryEmb, emb);
    const lexical = fuzzyMatchScore(query, chunk.content);
    return { chunk, score: semantic * 0.7 + lexical * 0.3 };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

export function clusterQuestions(
  questions: { id: number; normalizedText: string; embedding?: number[] }[],
  threshold = 0.75
): Map<string, number[]> {
  const clusters = new Map<string, number[]>();
  const assigned = new Set<number>();

  for (const q of questions) {
    if (assigned.has(q.id)) continue;
    const clusterId = `cluster-${q.id}`;
    const members = [q.id];
    assigned.add(q.id);
    const embA = q.embedding ?? simpleEmbed(q.normalizedText);

    for (const other of questions) {
      if (assigned.has(other.id)) continue;
      const embB = other.embedding ?? simpleEmbed(other.normalizedText);
      if (cosineSimilarity(embA, embB) >= threshold) {
        members.push(other.id);
        assigned.add(other.id);
      }
    }
    clusters.set(clusterId, members);
  }
  return clusters;
}
