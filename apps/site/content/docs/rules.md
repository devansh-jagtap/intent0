---
title: Rules intent0 follows
order: 8
---

# Rules intent0 follows

These rules are enforced by code, not by asking the model nicely.

## Tasks

- Only approved, switched-on tasks are offered. Destructive tasks, such as delete or cancel, are off by default.
- Required steps, such as OTP or identity checks, can't be skipped.
- Tasks that can't be undone need an explicit confirmation before the final submit.
- Requests go only to the endpoints written in the approved manifest.

## Pages

- Generated pages are checked before they're shown: known components only, real endpoints only.
- Answers must cite your content, and code comes only from your docs.
- If anything fails, the visitor goes to your site's own page for that task.

## Privacy

- The model sees what the visitor asked, never their form data.
- Details remembered to pre-fill other forms stay in that browser tab, and visitors can clear them.
- Your model key stays on your server.
