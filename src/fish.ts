import ts from "typescript";

/**
 * Tests whether a TypeScript type should be emitted with fish string semantics.
 *
 * @param type - TypeScript type to inspect.
 * @returns `true` for string and string-literal types.
 *
 * @example
 * ```ts
 * import ts from "typescript";
 * import { isStringLike } from "fish-ts/fish";
 *
 * const type = checker.getTypeAtLocation(stringLiteralNode);
 *
 * if (isStringLike(type)) {
 *   // Emit `test left = right` for equality checks.
 * }
 * ```
 *
 * @public
 */
export function isStringLike(type: ts.Type): boolean {
  const flags = type.flags;
  return (flags & (ts.TypeFlags.String | ts.TypeFlags.StringLiteral)) !== 0;
}

/**
 * Tests whether a TypeScript type should be emitted with fish numeric semantics.
 *
 * @param type - TypeScript type to inspect.
 * @returns `true` for number and number-literal types.
 *
 * @example
 * ```ts
 * import ts from "typescript";
 * import { isNumberLike } from "fish-ts/fish";
 *
 * const type = checker.getTypeAtLocation(numericExpression);
 *
 * if (isNumberLike(type)) {
 *   // Emit `math` or numeric `test` operators.
 * }
 * ```
 *
 * @public
 */
export function isNumberLike(type: ts.Type): boolean {
  const flags = type.flags;
  return (flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLiteral)) !== 0;
}

/**
 * Tests whether a TypeScript type should be emitted with fish boolean semantics.
 *
 * @param type - TypeScript type to inspect.
 * @returns `true` for boolean and boolean-literal types.
 *
 * @example
 * ```ts
 * import ts from "typescript";
 * import { isBooleanLike } from "fish-ts/fish";
 *
 * const type = checker.getTypeAtLocation(flagIdentifier);
 *
 * if (isBooleanLike(type)) {
 *   // Emit `test $flag = true` for truthy checks.
 * }
 * ```
 *
 * @public
 */
export function isBooleanLike(type: ts.Type): boolean {
  const flags = type.flags;
  return (flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral)) !== 0;
}

/**
 * Escapes text as a fish single-quoted string.
 *
 * @param text - Raw text to quote.
 * @returns A fish single-quoted literal.
 *
 * @example
 * ```ts
 * escapeFishSingleQuoted("it's ready");
 * // "'it'\\''s ready'"
 * ```
 *
 * @public
 */
export function escapeFishSingleQuoted(text: string): string {
  return `'${text.replaceAll("'", "'\\''")}'`;
}

/**
 * Escapes text for interpolation inside a fish double-quoted string.
 *
 * @param text - Raw template text.
 * @returns Text with fish-sensitive characters escaped.
 *
 * @example
 * ```ts
 * escapeFishDoubleQuotedText('Cost: "$5"');
 * // "Cost: \\\"\\$5\\\""
 * ```
 *
 * @public
 */
export function escapeFishDoubleQuotedText(text: string): string {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("$", "\\$");
}

/**
 * Emits a fish string literal, leaving shell-safe text unquoted.
 *
 * @param text - Raw string literal value.
 * @returns A fish-safe string representation.
 *
 * @example
 * ```ts
 * emitStringLiteral("bin/tool");
 * // "bin/tool"
 *
 * emitStringLiteral("hello world");
 * // "'hello world'"
 * ```
 *
 * @public
 */
export function emitStringLiteral(text: string): string {
  if (text.length === 0 || !/^[A-Za-z0-9_./:@%+=,-]+$/.test(text)) {
    return escapeFishSingleQuoted(text);
  }

  return text;
}

/**
 * Maps a TypeScript arithmetic operator token to the equivalent fish `math`
 * operator.
 *
 * @param kind - TypeScript syntax kind for an operator token.
 * @returns The fish `math` operator, or `undefined` when unsupported.
 *
 * @example
 * ```ts
 * import ts from "typescript";
 *
 * mathOperatorFor(ts.SyntaxKind.AsteriskToken);
 * // "'*'"
 * ```
 *
 * @public
 */
export function mathOperatorFor(kind: ts.SyntaxKind): string | undefined {
  const mathOps: Partial<Record<ts.SyntaxKind, string>> = {
    [ts.SyntaxKind.PlusToken]: "+",
    [ts.SyntaxKind.MinusToken]: "-",
    [ts.SyntaxKind.AsteriskToken]: "'*'",
    [ts.SyntaxKind.SlashToken]: "/",
    [ts.SyntaxKind.PercentToken]: "'%'",
  };

  return mathOps[kind];
}

/**
 * Maps a TypeScript compound assignment token to the equivalent fish `math`
 * operator.
 *
 * @param kind - TypeScript syntax kind for a compound assignment token.
 * @returns The fish `math` operator, or `undefined` when unsupported.
 *
 * @example
 * ```ts
 * import ts from "typescript";
 *
 * compoundMathOperatorFor(ts.SyntaxKind.PercentEqualsToken);
 * // "'%'"
 * ```
 *
 * @public
 */
export function compoundMathOperatorFor(
  kind: ts.SyntaxKind,
): string | undefined {
  const compoundOps: Partial<Record<ts.SyntaxKind, string>> = {
    [ts.SyntaxKind.MinusEqualsToken]: "-",
    [ts.SyntaxKind.AsteriskEqualsToken]: "'*'",
    [ts.SyntaxKind.SlashEqualsToken]: "/",
    [ts.SyntaxKind.PercentEqualsToken]: "'%'",
  };

  return compoundOps[kind];
}

/**
 * Maps an ordered TypeScript comparison token to a fish `test` operator.
 *
 * @param kind - TypeScript syntax kind for a comparison token.
 * @returns The fish `test` operator, or `undefined` when unsupported.
 *
 * @example
 * ```ts
 * import ts from "typescript";
 *
 * orderTestOperatorFor(ts.SyntaxKind.GreaterThanEqualsToken);
 * // "-ge"
 * ```
 *
 * @public
 */
export function orderTestOperatorFor(kind: ts.SyntaxKind): string | undefined {
  const orderOps: Partial<Record<ts.SyntaxKind, string>> = {
    [ts.SyntaxKind.GreaterThanToken]: "-gt",
    [ts.SyntaxKind.LessThanToken]: "-lt",
    [ts.SyntaxKind.GreaterThanEqualsToken]: "-ge",
    [ts.SyntaxKind.LessThanEqualsToken]: "-le",
  };

  return orderOps[kind];
}

/**
 * Converts an operator token to the fish spelling used by fallback math
 * emission.
 *
 * @param kind - TypeScript syntax kind for an operator token.
 * @returns The fish operator spelling, or `??` when unsupported.
 *
 * @example
 * ```ts
 * import ts from "typescript";
 *
 * operatorToString(ts.SyntaxKind.PlusToken);
 * // "+"
 *
 * operatorToString(ts.SyntaxKind.EqualsEqualsEqualsToken);
 * // "??"
 * ```
 *
 * @public
 */
export function operatorToString(kind: ts.SyntaxKind): string {
  return mathOperatorFor(kind) ?? "??";
}
