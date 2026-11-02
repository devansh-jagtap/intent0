# intent0

Make your website intent-driven. Visitors say what they want; intent0 builds the right page from tasks you approved and sends it to your own APIs.

> This package is prepared for npm distribution. Install from npm after the first public release; until then, use the repository's local tarball instructions in the [root README](https://github.com/devansh-jagtap/intent0#try-it).

## Install

```bash
npm install intent0
```

The package includes the `intent0` CLI and the optional `intent0/server` and `intent0/react` entry points. It requires Node.js 20 or newer.

## Quick start

```bash
npx intent0 init
npx intent0 dashboard
```

`init` scans your project, helps you approve the tasks it discovers, builds Site Memory from your content, and adds the intent bar. Review `intent0.manifest.json` before enabling tasks.

For Next.js App Router projects, intent0 adds its route handler and client component. For other sites, run `npx intent0 serve` and add this script to your shared page layout:

```html
<script src="http://localhost:4100/intent0.js" defer></script>
```

See the [full documentation](https://github.com/devansh-jagtap/intent0#readme) for framework setup, configuration, and MCP agent support.

## License

All rights reserved. See the repository's [LICENSE](https://github.com/devansh-jagtap/intent0/blob/main/LICENSE).

