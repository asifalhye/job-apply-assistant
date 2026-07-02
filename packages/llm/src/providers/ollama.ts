import type { LlmProvider, GenerateTextInput, GenerateTextOutput } from '../types.js';

export class OllamaProvider implements LlmProvider {
  name = 'ollama';

  constructor(
    private baseUrl = 'http://localhost:11434',
    private model = 'llama3.2'
  ) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [
          ...(input.system ? [{ role: 'system', content: input.system }] : []),
          { role: 'user', content: input.prompt },
        ],
        stream: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama error: ${err}`);
    }

    const data = await res.json() as {
      message: { content: string };
    };

    return {
      text: data.message?.content ?? '',
      model: this.model,
      provider: 'ollama',
    };
  }
}
