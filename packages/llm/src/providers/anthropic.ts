import type { LlmProvider, GenerateTextInput, GenerateTextOutput } from '../types.js';

export class AnthropicProvider implements LlmProvider {
  name = 'anthropic';

  constructor(
    private apiKey: string,
    private model = 'claude-sonnet-4-20250514'
  ) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: input.maxTokens ?? 1024,
        system: input.system,
        messages: [{ role: 'user', content: input.prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic error: ${err}`);
    }

    const data = await res.json() as {
      content: { type: string; text: string }[];
    };

    return {
      text: data.content.find((c) => c.type === 'text')?.text ?? '',
      model: this.model,
      provider: 'anthropic',
    };
  }
}
