#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";

import { transpile } from "./transpile.js";

function usage(): string {
  return [
    "Usage:",
    "  fish-ts <input.ts>",
    "  cat input.ts | fish-ts",
    "",
    "Transpiles TypeScript source to fish shell source on stdout.",
  ].join("\n");
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(usage());
  process.exit(0);
}

if (args.length > 1) {
  console.error(usage());
  process.exit(1);
}

if (args.length === 0 && process.stdin.isTTY) {
  console.error(usage());
  process.exit(1);
}

const source = args[0]
  ? fs.readFileSync(args[0], "utf8")
  : fs.readFileSync(0, "utf8");
console.log(transpile(source));
