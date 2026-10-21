---
title: Dashboard
order: 5
---

# Dashboard

The dashboard is where you review what intent0 offers on your site. Run it in your website's folder:

```bash
npx intent0 dashboard
```

The command prints a link to the Dashboard page on this website. The page connects to the command running on your computer, so your files and your model key never leave your machine. There are no accounts to create.

## What you can do

- Switch each task on or off. Visitors and AI agents only get tasks that are switched on.
- Approve the manifest, and the "you may also need" notes shown after a task.
- Choose the model, test the connection, and replace the API key. The key is saved to `.env.local` and never shown.
- Rebuild Site Memory from your docs and running site.

Changes are written to `intent0.manifest.json`, `intent0.memory.json` and `.env.local`, the same files the CLI uses. Your site picks them up without a restart. A new model needs a server restart.

## Security

The dashboard server only listens on your computer (127.0.0.1, port 4200) and needs the token in the printed link. Other websites open in your browser can't use it.
