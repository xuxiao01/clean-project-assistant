export type LlmProviderId = 'zhipu' | 'gemini';

export interface ChatModelInfo {
  provider: LlmProviderId;
  model: string;
}

export interface EmbeddingModelInfo {
  provider: LlmProviderId;
  model: string;
}
