export interface GenerateTextInput {
  prompt: string;
  system?: string;
  maxTokens?: number;
}

export interface GenerateTextOutput {
  text: string;
  model: string;
  provider: string;
}

export interface ClassifyFieldInput {
  label: string;
  options?: string[];
}

export interface ClassifyFieldOutput {
  category: string;
  profileField?: string;
  confidence: number;
}

export interface RankOptionsInput {
  desired: string;
  options: string[];
}

export interface RankOptionsOutput {
  ranked: { option: string; score: number }[];
}

export interface LlmProvider {
  name: string;
  generateText(input: GenerateTextInput): Promise<GenerateTextOutput>;
  classifyField?(input: ClassifyFieldInput): Promise<ClassifyFieldOutput>;
  rankOptions?(input: RankOptionsInput): Promise<RankOptionsOutput>;
}

export interface ModelConfig {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface RouterConfig {
  mode: 'local-only' | 'balanced' | 'quality';
  classification: ModelConfig;
  generation: ModelConfig;
}
