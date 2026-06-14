import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "../..");
const outDir = resolve(process.cwd(), "dist");

mkdirSync(outDir, { recursive: true });
writeFileSync(
  resolve(outDir, "dev-root.json"),
  `${JSON.stringify({ root }, null, 2)}\n`
);
