"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* What an AI agent sees: a real exchange with the example site, and the two ways to connect. */

const EXCHANGE = `// agent → Riverton: tools/call report_problem
{ "issueType": "pothole", "location": "14 Elm Street" }

// Riverton → agent
{
  "status": "done",
  "task": "report_problem",
  "result": {
    "referenceId": "RPT-2026-04102",
    "status": "assigned to a crew"
  }
}`;

const DESKTOP = `{
  "mcpServers": {
    "riverton": {
      "command": "npx",
      "args": ["intent0", "mcp", "--dir", "./city-services",
               "--site", "http://localhost:5050"]
    }
  }
}`;

const HTTP = `POST https://your-site.example/intent0/mcp
{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }

// → search_site, water_connection, report_problem,
//   birth_certificate, track_request`;

export function AgentExchange() {
  return (
    <Tabs defaultValue="exchange" className="gap-0" data-ui>
      <TabsList className="w-full justify-start">
        <TabsTrigger value="exchange" className="flex-none">
          A real report
        </TabsTrigger>
        <TabsTrigger value="desktop" className="flex-none">
          Claude Desktop
        </TabsTrigger>
        <TabsTrigger value="http" className="flex-none">
          Over HTTP
        </TabsTrigger>
      </TabsList>
      <TabsContent value="exchange">
        <pre>
          <code>{EXCHANGE}</code>
        </pre>
      </TabsContent>
      <TabsContent value="desktop">
        <pre>
          <code>{DESKTOP}</code>
        </pre>
      </TabsContent>
      <TabsContent value="http">
        <pre>
          <code>{HTTP}</code>
        </pre>
      </TabsContent>
    </Tabs>
  );
}
