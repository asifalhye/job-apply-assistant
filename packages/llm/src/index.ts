import type { LlmProvider, RouterConfig, ModelConfig } from './types.js';
import { StubProvider } from './providers/stub.js';
import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { OllamaProvider } from './providers/ollama.js';

export function createProvider(config: ModelConfig): LlmProvider {
  switch (config.provider) {
    case 'openai':
      if (!config.apiKey) throw new Error('OpenAI API key required');
      return new OpenAIProvider(config.apiKey, config.model);
    case 'anthropic':
      if (!config.apiKey) throw new Error('Anthropic API key required');
      return new AnthropicProvider(config.apiKey, config.model);
    case 'ollama':
      return new OllamaProvider(config.baseUrl ?? 'http://localhost:11434', config.model);
    case 'stub':
    default:
      return new StubProvider();
  }
}

export function defaultRouterConfig(env: Record<string, string | undefined> = process.env): RouterConfig {
  const mode = (env.LLM_MODE ?? 'balanced') as RouterConfig['mode'];

  if (mode === 'local-only') {
    return {
      mode,
      classification: { provider: 'ollama', model: 'llama3.2', baseUrl: env.OLLAMA_BASE_URL },
      generation: { provider: 'ollama', model: 'llama3.2', baseUrl: env.OLLAMA_BASE_URL },
    };
  }

  if (mode === 'quality') {
    return {
      mode,
      classification: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: env.ANTHROPIC_API_KEY,
      },
      generation: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: env.ANTHROPIC_API_KEY,
      },
    };
  }

  return {
    mode: 'balanced',
    classification: {
      provider: env.OPENAI_API_KEY ? 'openai' : 'stub',
      model: 'gpt-4o-mini',
      apiKey: env.OPENAI_API_KEY,
    },
    generation: {
      provider: env.ANTHROPIC_API_KEY ? 'anthropic' : env.OPENAI_API_KEY ? 'openai' : 'stub',
      model: env.ANTHROPIC_API_KEY ? 'claude-sonnet-4-20250514' : 'gpt-4o',
      apiKey: env.ANTHROPIC_API_KEY ?? env.OPENAI_API_KEY,
    },
  };
}

export class LlmRouter {
  private classificationProvider: LlmProvider;
  private generationProvider: LlmProvider;

  constructor(config: RouterConfig) {
    this.classificationProvider = createProvider(config.classification);
    this.generationProvider = createProvider(config.generation);
  }

  get classification() {
    return this.classificationProvider;
  }

  get generation() {
    return this.generationProvider;
  }
}

export interface GenerateAnswerInput {
  question: string;
  profileSummary: string;
  snippets: { id: number; title: string; body: string }[];
  jobDescription?: string;
  retrievedChunks?: { section?: string; content: string }[];
}

export interface GenerateAnswerOutput {
  answer: string;
  confidence: number;
  sources: { type: string; id?: number; title?: string }[];
}

export async function generateAnswer(
  router: LlmRouter,
  input: GenerateAnswerInput
): Promise<GenerateAnswerOutput> {
  const sources: GenerateAnswerOutput['sources'] = [];

  for (const s of input.snippets) {
    sources.push({ type: 'snippet', id: s.id, title: s.title });
  }
  for (const c of input.retrievedChunks ?? []) {
    sources.push({ type: 'chunk', title: c.section });
  }

  const contextParts = [
    `Profile:\n${input.profileSummary}`,
    input.snippets.length
      ? `Snippets:\n${input.snippets.map((s) => `- ${s.title}: ${s.body}`).join('\n')}`
      : '',
    input.retrievedChunks?.length
      ? `Resume/Document excerpts:\n${input.retrievedChunks.map((c) => `- [${c.section}]: ${c.content}`).join('\n')}`
      : '',
    input.jobDescription ? `Job description:\n${input.jobDescription.slice(0, 3000)}` : '',
  ].filter(Boolean);

  const prompt = `Answer this job application question using ONLY the provided context. Do not invent facts.

Question: ${input.question}

${contextParts.join('\n\n')}

Write a clear, professional answer. If context is insufficient, say what information is missing.`;

  const result = await router.generation.generateText({
    prompt,
    system: 'You are a helpful job application assistant. Be truthful and grounded in provided materials only.',
    maxTokens: 800,
  });

  const confidence = input.snippets.length > 0 || (input.retrievedChunks?.length ?? 0) > 0 ? 0.75 : 0.4;

  return {
    answer: result.text,
    confidence,
    sources,
  };
}

export * from './types.js';
export { StubProvider } from './providers/stub.js';
export { OpenAIProvider } from './providers/openai.js';
export { AnthropicProvider } from './providers/anthropic.js';
export { OllamaProvider } from './providers/ollama.js';
