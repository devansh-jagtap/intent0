// Riverton City Services: a fictional city website with a plain JSON backend.
// No dependencies: `node server.js` serves the pages in public/ and the APIs below on port 5050.
// Data lives in memory and resets on restart. The verification code is always 123456.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT ?? 5050);
const PUBLIC = fileURLToPath(new URL("./public/", import.meta.url));
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };

const requests = new Map(); // referenceId -> { kind, status, created }
const otps = new Map(); // otpRequestId -> phone
let counter = 4100;

const reference = (prefix) => `${prefix}-2026-${String(++counter).padStart(5, "0")}`;
const send = (res, status, data) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
};
const missing = (body, fields) => {
  const errors = {};
  for (const f of fields) if (body[f] === undefined || String(body[f]).trim() === "") errors[f] = ["This is required."];
  return Object.keys(errors).length ? errors : null;
};
const phoneOk = (p) => /^\+?[0-9 ]{7,15}$/.test(String(p ?? ""));

const api = {
  // Apply for a new water connection.
  "POST /api/water/connection": (body) => {
    const errors = missing(body, ["fullName", "phone", "address", "connectionType"]);
    if (errors) return [422, { error: "Some details are missing.", fieldErrors: errors }];
    if (!phoneOk(body.phone)) return [422, { error: "Check the phone number.", fieldErrors: { phone: ["Use digits only, e.g. 555 0142."] } }];
    if (!["residential", "commercial"].includes(body.connectionType)) return [422, { error: "Choose residential or commercial." }];
    const referenceId = reference("WTR");
    requests.set(referenceId, { kind: "Water connection", status: "received", created: Date.now() });
    return [201, { referenceId, status: "received", nextStep: "A city inspector will call you within 3 working days." }];
  },
  // Report a street problem.
  "POST /api/streets/report": (body) => {
    const errors = missing(body, ["issueType", "location"]);
    if (errors) return [422, { error: "Some details are missing.", fieldErrors: errors }];
    if (!["pothole", "streetlight", "garbage", "graffiti"].includes(body.issueType)) return [422, { error: "Unknown problem type." }];
    const referenceId = reference("RPT");
    requests.set(referenceId, { kind: "Street report", status: "assigned to a crew", created: Date.now() });
    return [201, { referenceId, status: "assigned to a crew" }];
  },
  // Birth certificate copy: verify the phone first, then order.
  "POST /api/records/verify-phone": (body) => {
    if (!phoneOk(body.phone)) return [422, { error: "Check the phone number.", fieldErrors: { phone: ["Use digits only."] } }];
    const otpRequestId = `otp_${Math.random().toString(36).slice(2, 10)}`;
    otps.set(otpRequestId, String(body.phone));
    return [200, { otpRequestId, message: "We sent a 6-digit code to your phone (in this example it is always 123456)." }];
  },
  "POST /api/records/birth-certificate": (body) => {
    const errors = missing(body, ["otpRequestId", "otp", "childName", "dateOfBirth", "copies"]);
    if (errors) return [422, { error: "Some details are missing.", fieldErrors: errors }];
    if (!otps.has(body.otpRequestId) || String(body.otp) !== "123456") return [422, { error: "That code isn't right.", fieldErrors: { otp: ["Enter the 6-digit code we sent."] } }];
    const copies = Number(body.copies);
    if (!Number.isInteger(copies) || copies < 1 || copies > 5) return [422, { error: "You can order 1 to 5 copies.", fieldErrors: { copies: ["1 to 5"] } }];
    otps.delete(body.otpRequestId);
    const referenceId = reference("BC");
    requests.set(referenceId, { kind: "Birth certificate copy", status: "being printed", created: Date.now() });
    return [201, { referenceId, status: "being printed", fee: `$${copies * 12}` }];
  },
};

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || "{}");
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  const status = /^\/api\/status\/([A-Z]+-\d{4}-\d{5})$/.exec(url.pathname);
  if (status && req.method === "GET") {
    const found = requests.get(status[1]);
    return found ? send(res, 200, { referenceId: status[1], request: found.kind, status: found.status }) : send(res, 404, { error: "No request with that reference." });
  }

  const handler = api[`${req.method} ${url.pathname}`];
  if (handler) {
    const body = await readJson(req);
    if (!body || typeof body !== "object") return send(res, 400, { error: "Send JSON." });
    const [code, data] = handler(body);
    return send(res, code, data);
  }
  if (url.pathname.startsWith("/api/")) return send(res, 404, { error: "Not found." });

  // Static pages: /services/water → public/services/water.html
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  if (/[/\\]$/.test(path)) path += "index"; // normalize() gives "\" on Windows
  if (!extname(path)) path += ".html";
  try {
    const file = await readFile(join(PUBLIC, path));
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(file);
  } catch {
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    res.end(await readFile(join(PUBLIC, "404.html")));
  }
}).listen(PORT, () => console.log(`Riverton City Services on http://localhost:${PORT}`));
