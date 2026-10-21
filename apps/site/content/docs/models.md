---
title: Your model and key
order: 7
---

# Your model and key

intent0 uses the model you choose, with your own key, on your own server. The key is never sent to the browser and never written into the manifest.

## Providers

`init` offers these presets. Any OpenAI-compatible endpoint works as `custom`.

| Provider | Model | Notes |
|---|---|---|
| groq | openai/gpt-oss-120b | Free tier available |
| nvidia | openai/gpt-oss-120b | Free tier available |
| ollama | llama3.2 | Runs on your own computer, no key |
| openai | gpt-4.1-mini | Paid |
| custom | any | Any OpenAI-compatible base URL |

## Settings

The settings live in `.env.local` (settings in `.env` are used too):

```bash
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-120b
LLM_API_KEY=your-key
```

Change them in the dashboard, or pass `--provider`, `--model` and `--base-url` to `init`.

## Without a model

If no model is set, intent0 still works: tasks use safe forms built from the manifest, and answers are put together from Site Memory without a model.
