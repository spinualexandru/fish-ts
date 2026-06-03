import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import ts from "typescript";

const FISH_BUILTIN_COMMANDS = [
  "alias",
  "begin",
  "bg",
  "bind",
  "block",
  "breakpoint",
  "builtin",
  "cd",
  "command",
  "commandline",
  "complete",
  "contains",
  "count",
  "dirh",
  "dirs",
  "echo",
  "emit",
  "end",
  "eval",
  "exec",
  "exit",
  "fg",
  "fish",
  "fish_config",
  "fish_indent",
  "fish_pager",
  "fish_prompt",
  "fish_right_prompt",
  "fish_update_completions",
  "fishd",
  "funced",
  "funcsave",
  "functions",
  "help",
  "history",
  "isatty",
  "jobs",
  "math",
  "mimedb",
  "nextd",
  "not",
  "open",
  "or",
  "popd",
  "prevd",
  "psub",
  "pushd",
  "pwd",
  "random",
  "read",
  "set",
  "set_color",
  "source",
  "status",
  "test",
  "trap",
  "type",
  "ulimit",
  "umask",
  "vared",
] as const;

const FISH_BUILTIN_DECLARATIONS = [
  "type FishBuiltinArgument = unknown;",
  ...FISH_BUILTIN_COMMANDS.map(
    (command) =>
      `declare function ${command}(...args: FishBuiltinArgument[]): any;`,
  ),
  "",
].join("\n");

/**
 * Type-checked TypeScript source prepared for fish-ts emission.
 *
 * @remarks
 * Call {@link CheckedSource.cleanup} after using the source file and checker so
 * the temporary input file can be removed.
 *
 * @example
 * ```ts
 * import ts from "typescript";
 * import { createCheckedSource } from "fish-ts/compiler";
 *
 * const checked = createCheckedSource("const count: number = 3;");
 *
 * try {
 *   let declaration: ts.VariableDeclaration | undefined;
 *
 *   ts.forEachChild(checked.sourceFile, (node) => {
 *     if (ts.isVariableStatement(node)) {
 *       declaration = node.declarationList.declarations[0];
 *     }
 *   });
 *
 *   const type = declaration
 *     ? checked.checker.getTypeAtLocation(declaration.name)
 *     : undefined;
 *
 *   console.log(type ? checked.checker.typeToString(type) : "missing");
 * } finally {
 *   checked.cleanup();
 * }
 * ```
 *
 * @public
 */
export interface CheckedSource {
  /** TypeScript semantic checker for the generated program. */
  checker: ts.TypeChecker;
  /** Parsed source file created from the caller-provided source string. */
  sourceFile: ts.SourceFile;
  /** Removes temporary files created while building the checked source. */
  cleanup(): void;
}

/**
 * Creates a strict TypeScript program from an in-memory source string.
 *
 * @param source - TypeScript source code to parse and type-check.
 * @returns A source file and type checker pair that must be cleaned up by the
 * caller.
 *
 * @example
 * ```ts
 * import { createCheckedSource } from "fish-ts/compiler";
 * import { FishEmitter } from "fish-ts/fish-emitter";
 *
 * const checked = createCheckedSource("const total: number = 1 + 2;");
 *
 * try {
 *   const fish = new FishEmitter(checked.checker).emitSourceFile(
 *     checked.sourceFile,
 *   );
 *
 *   console.log(fish);
 *   // set -g total (math 1 + 2)
 * } finally {
 *   checked.cleanup();
 * }
 * ```
 *
 * @public
 */
export function createCheckedSource(source: string): CheckedSource {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fish-ts-"));
  const tmpFile = path.join(tmpDir, "input.ts");
  const builtinsFile = path.join(tmpDir, "fish-builtins.d.ts");
  fs.writeFileSync(tmpFile, source, "utf8");
  fs.writeFileSync(builtinsFile, FISH_BUILTIN_DECLARATIONS, "utf8");

  const program = ts.createProgram([builtinsFile, tmpFile], {
    strict: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    skipLibCheck: true,
  });

  const sourceFile = program.getSourceFile(tmpFile);
  if (!sourceFile) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw new Error("Failed to create TypeScript source file");
  }

  return {
    checker: program.getTypeChecker(),
    sourceFile,
    cleanup() {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    },
  };
}
