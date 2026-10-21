import type { ModelConfig } from "@intent0/schema";

/** Model presets offered by `init` and the dashboard. Any OpenAI-compatible endpoint works as "custom". */
export const PROVIDERS: Record<string, { provider: ModelConfig["provider"]; baseUrl: string; model: string }> = {
  groq: { provider: "groq", baseUrl: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b" },
  nvidia: { provider: "nvidia", baseUrl: "https://integrate.api.nvidia.com/v1", model: "openai/gpt-oss-120b" },
  ollama: { provider: "ollama", baseUrl: "http://localhost:11434/v1", model: "llama3.2" },
  openai: { provider: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini" },
  custom: { provider: "openai_compatible", baseUrl: "", model: "" },
};
