/**
 * fish-ts: TypeScript -> Fish Shell Transpiler
 *
 * Uses the native TypeScript Compiler API to analyze strictly typed TS source
 * and emit Fish shell scripts. The TypeChecker provides semantic type
 * information, which drives Fish-specific choices like string vs numeric
 * comparisons and scalar vs array variable declarations.
 */

import { fileURLToPath } from "node:url";

import { createCheckedSource } from "./compiler.js";
import { DEMO_SOURCE } from "./demo-source.js";
import { FishEmitter } from "./fish-emitter.js";

/**
 * Transpiles TypeScript source code to fish shell source.
 *
 * @remarks
 * This is the high-level entry point for callers that do not need direct access
 * to the TypeScript compiler objects. It creates a checked source, emits fish
 * code, and always cleans up the temporary TypeScript input file.
 *
 * @param source - TypeScript source code to transpile.
 * @returns Fish shell source code.
 *
 * @example
 * ```ts
 * import { transpile } from "fish-ts";
 *
 * const fish = transpile(`
 * const name: string = "world";
 * echo("Hello, " + name);
 * `);
 *
 * console.log(fish);
 * // set -g name world
 * // echo (string join "" 'Hello, ' $name)
 * ```
 *
 * @public
 */
export function transpile(source: string): string {
  const checkedSource = createCheckedSource(source);

  try {
    return new FishEmitter(checkedSource.checker).emitSourceFile(
      checkedSource.sourceFile,
    );
  } finally {
    checkedSource.cleanup();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(transpile(DEMO_SOURCE));
}
