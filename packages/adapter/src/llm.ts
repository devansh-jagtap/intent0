export interface CompleteOptions {
  /** Upper bound on reply length; some free tiers reject requests whose limit is too high. */
  maxTokens?: number;
}

/** A model that answers with one JSON object. */
export interface JsonModel {
  name: string;
  complete(system: string, user: string, signal?: AbortSignal, options?: CompleteOptions): Promise<unknown>;
}

export interface ModelSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/**
 * A failed model request, with what the provider told us about its limits so callers
 * can wait (`retryAfterMs`), ask for a shorter reply (`outputLimit`) or send less (`inputTooLarge`).
 */
export class ModelError extends Error {
  override name = "ModelError";
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs?: number,
    readonly outputLimit?: number,
    readonly inputTooLarge = false,
  ) {
    super(message);
  }
}

/** Reads "try again in 7.5s" / "1m2.3s" / "450ms" or a Retry-After header. */
function retryAfter(text: string, header: string | null): number | undefined {
  const m = /try again in\s+(?:(\d+)m)?([\d.]+)(ms|s)/i.exec(text);
  if (m) return (Number(m[1] ?? 0) * 60 + Number(m[2]) / (m[3] === "ms" ? 1000 : 1)) * 1000;
  const seconds = header ? Number(header) : NaN;
  return Number.isFinite(seconds) ? seconds * 1000 : undefined;
}

/** Pulls the JSON object out of a model reply, tolerating ```json fences or extra text. */
export function parseJsonReply(raw: string): unknown {
  // Reasoning models may prepend their thinking; it can contain braces, so drop it first.
  const text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("model reply contained no JSON object");
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * Any OpenAI-compatible chat endpoint: Groq, NVIDIA, OpenRouter, Ollama (/v1), etc.
 * Switching provider = changing baseUrl, apiKey and model. No SDK needed.
 */
export function openAiCompatible(settings: ModelSettings): JsonModel {
  const url = `${settings.baseUrl.replace(/\/+$/, "")}/chat/completions`;

  async function post(body: Record<string, unknown>, signal?: AbortSignal) {
    return fetch(url, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        ...(settings.apiKey ? { authorization: `Bearer ${settings.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  return {
    name: settings.model,
    async complete(system, user, signal, options = {}) {
      const body: Record<string, unknown> = {
        model: settings.model,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      };
      let res = await post(body, signal);
      if (res.status === 400) {
        const text = await res.clone().text();
        // Some endpoints don't support JSON mode; retry without it.
        if (/response_format|json_object|json mode/i.test(text)) {
          delete body.response_format;
          res = await post(body, signal);
        }
      }
      if (!res.ok) {
        const text = await res.text();
        const out = /output tokens[^:]*:\s*Limit (\d+)/i.exec(text);
        const tooLarge = !out && /request too large|reduce (the )?(length|size)|context length|maximum context/i.test(text);
        throw new ModelError(
          `model request failed (${res.status}): ${text.slice(0, 300)}`,
          res.status,
          retryAfter(text, res.headers.get("retry-after")),
          out ? Number(out[1]) : undefined,
          tooLarge,
        );
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return parseJsonReply(data.choices?.[0]?.message?.content ?? "");
    },
  };
}

/**
 * Reads LLM_BASE_URL / LLM_API_KEY / LLM_MODEL. Returns null (= use the mock model)
 * when nothing is configured. A key is optional only for local endpoints like Ollama.
 */
export function modelFromEnv(env: Record<string, string | undefined>): JsonModel | null {
  const baseUrl = env.LLM_BASE_URL?.trim();
  const model = env.LLM_MODEL?.trim();
  const apiKey = env.LLM_API_KEY?.trim() ?? "";
  if (!baseUrl || !model) return null;
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(baseUrl);
  if (!apiKey && !local) return null;
  return openAiCompatible({ baseUrl, apiKey, model });
}
