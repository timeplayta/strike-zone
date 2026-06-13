import { readdirSync, readFileSync } from "node:fs";
import { parse } from "node:path";

let fail = 0;
for (const f of readdirSync(".")) {
  if (!f.endsWith(".js") || f === "sw.js" || f.includes("three.module")) continue;
  const src = readFileSync(f, "utf8")
    .replace(/^\s*import[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, "")
    .replace(/^\s*export\s+(default\s+)?/gm, "");
  try {
    new Function(src);
    console.log("OK  ", f);
  } catch (e) {
    fail++;
    console.log("ERRO", f, "->", e.message);
  }
}
process.exit(fail ? 1 : 0);
