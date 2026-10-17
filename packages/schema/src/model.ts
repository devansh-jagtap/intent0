import * as z from "zod";

/**
 * Which model the company chose. Strict on purpose: there is no field for an API key,
 * so a key can never end up in a manifest that gets uploaded, reviewed or committed.
 * Keys live only in the company's server environment.
 */
export const ModelConfig = z.strictObject({
  provider: z.enum(["anthropic", "openai", "google", "groq", "nvidia", "ollama", "openai_compatible"]),
  model: z.string().min(1),
  /** Only for OpenAI-compatible endpoints that need a custom base URL. */
  baseUrl: z.url().optional(),
});
export type ModelConfig = z.infer<typeof ModelConfig>;
