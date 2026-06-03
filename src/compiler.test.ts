import { expect, test } from "vitest";
import ts from "typescript";

import { createCheckedSource } from "./compiler.js";
import { isBooleanLike, isNumberLike, isStringLike } from "./fish.js";

test("creates a checked source with semantic type information", () => {
  const checked = createCheckedSource(`
const s: string = "x";
const n: number = 1;
const b: boolean = true;
`);

  try {
    const declarations = checked.sourceFile.statements
      .filter(ts.isVariableStatement)
      .flatMap((statement) => [...statement.declarationList.declarations]);

    expect(declarations).toHaveLength(3);
    expect(declarations).toBeDefined();

    const [stringDeclaration, numberDeclaration, booleanDeclaration] =
      declarations!;

    if (!stringDeclaration || !numberDeclaration || !booleanDeclaration) {
      throw new Error("Expected string, number, and boolean declarations");
    }

    expect(
      isStringLike(checked.checker.getTypeAtLocation(stringDeclaration.name)),
    ).toBe(true);
    expect(
      isNumberLike(checked.checker.getTypeAtLocation(numberDeclaration.name)),
    ).toBe(true);
    expect(
      isBooleanLike(checked.checker.getTypeAtLocation(booleanDeclaration.name)),
    ).toBe(true);
  } finally {
    checked.cleanup();
  }
});

test("predeclares fish builtins in checked sources", () => {
  const checked = createCheckedSource(`
const name: string = "world";
echo("hello", name);
const output: string = command("pwd");
`);

  try {
    const calls: ts.CallExpression[] = [];
    const collectCalls = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        calls.push(node);
      }

      ts.forEachChild(node, collectCalls);
    };

    collectCalls(checked.sourceFile);

    const [echoCall, commandCall] = calls;
    if (!echoCall || !commandCall) {
      throw new Error("Expected echo and command calls");
    }

    const echoSymbol = checked.checker.getSymbolAtLocation(echoCall.expression);
    const commandSymbol = checked.checker.getSymbolAtLocation(
      commandCall.expression,
    );

    expect(echoSymbol?.getName()).toBe("echo");
    expect(commandSymbol?.getName()).toBe("command");
    expect(
      checked.checker.typeToString(
        checked.checker.getTypeAtLocation(commandCall),
      ),
    ).toBe("any");
  } finally {
    checked.cleanup();
  }
});

test("keeps caller-declared builtin types ahead of fallbacks", () => {
  const checked = createCheckedSource(`
declare function pwd(): string;
const cwd = pwd();
`);

  try {
    const declaration = checked.sourceFile.statements
      .filter(ts.isVariableStatement)
      .flatMap((statement) => [...statement.declarationList.declarations])[0];

    if (!declaration || !declaration.initializer) {
      throw new Error("Expected pwd call initializer");
    }

    expect(
      checked.checker.typeToString(
        checked.checker.getTypeAtLocation(declaration.initializer),
      ),
    ).toBe("string");
  } finally {
    checked.cleanup();
  }
});
