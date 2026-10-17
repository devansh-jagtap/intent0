/** A model that answers with one JSON object. */
export interface JsonModel {
  name: string;
  complete(system: string, user: string, signal?: AbortSignal): Promise<unknown>;
}

export interface ModelSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** Pulls the JSON object out of a model reply, tolerating ```json fences or extra text. */
export function parseJsonReply(text: string): unknown {
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
    async complete(system, user, signal) {
      const body: Record<string, unknown> = {
        model: settings.model,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      };
      let res = await post(body, signal);
      if (res.status === 400) {
        // Some endpoints don't support JSON mode; retry without it.
        delete body.response_format;
        res = await post(body, signal);
      }
      if (!res.ok) throw new Error(`model request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
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
