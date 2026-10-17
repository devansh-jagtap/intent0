import { createInterface } from "node:readline";

/** No terminal attached (CI, scripts): don't wait for answers, use defaults. */
const interactive = () => Boolean(process.stdin.isTTY);

export async function ask(question: string, fallback = ""): Promise<string> {
  if (!interactive()) return fallback;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const suffix = fallback ? ` (${fallback})` : "";
  const answer = await new Promise<string>((resolve) => rl.question(`${question}${suffix}: `, resolve));
  rl.close();
  return answer.trim() || fallback;
}

/** Like ask, but doesn't echo what's typed (for API keys). */
export async function askSecret(question: string): Promise<string> {
  if (!interactive()) return "";
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const anyRl = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
  let prompted = false;
  anyRl._writeToOutput = (s: string) => {
    if (!prompted) {
      process.stdout.write(s);
      prompted = true;
    } else if (s.includes("\n") || s.includes("\r")) process.stdout.write("\n");
    else process.stdout.write("*".repeat(s.length));
  };
  const answer = await new Promise<string>((resolve) => rl.question(`${question}: `, resolve));
  rl.close();
  return answer.trim();
}

export async function confirm(question: string, defaultYes = false): Promise<boolean> {
  const a = (await ask(`${question} ${defaultYes ? "[Y/n]" : "[y/N]"}`)).toLowerCase();
  return a === "" ? defaultYes : a === "y" || a === "yes";
}
