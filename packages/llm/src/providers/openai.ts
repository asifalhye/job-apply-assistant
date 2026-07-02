import type { LlmProvider, GenerateTextInput, GenerateTextOutput } from '../types.js';

export class OpenAIProvider implements LlmProvider {
  name = 'openai';

  constructor(
    private apiKey: string,
    private model = 'gpt-4o-mini'
  ) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          ...(input.system ? [{ role: 'system', content: input.system }] : []),
          { role: 'user', content: input.prompt },
        ],
        max_tokens: input.maxTokens ?? 1024,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    const data = await res.json() as {
      choices: { message: { content: string } }[];
    };

    return {
      text: data.choices[0]?.message?.content ?? '',
      model: this.model,
      provider: 'openai',
    };
  }
}
