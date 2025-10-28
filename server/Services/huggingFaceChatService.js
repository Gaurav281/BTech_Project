import { HfInference } from '@huggingface/inference';

export class HuggingFaceChatService {
  constructor(apiKey) {
    this.client = new HfInference(apiKey);
  }

  async generateScript(prompt, model = 'deepseek-ai/DeepSeek-R1') {
    try {
      const response = await this.client.chatCompletion({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert code generator. Generate complete, working scripts. Output ONLY the script code, no explanations.'
          },
          {
            role: 'user', 
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.2
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Hugging Face Chat Error:', error);
      throw error;
    }
  }
}