/**
 * AI。
 */
export interface AIConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

declare const __AI__: AIConfig | null;

export const AI: AIConfig | null = typeof __AI__ !== "undefined" ? __AI__ : null;
