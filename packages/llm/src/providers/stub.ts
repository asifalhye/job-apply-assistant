import type { LlmProvider, GenerateTextInput, GenerateTextOutput } from '../types.js';

export class StubProvider implements LlmProvider {
  name = 'stub';

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    return {
      text: `[Stub response] ${input.prompt.slice(0, 200)}...`,
      model: 'stub',
      provider: 'stub',
    };
  }
}
