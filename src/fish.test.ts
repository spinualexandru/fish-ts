import { expect, test } from "vitest";
import ts from "typescript";

import {
  compoundMathOperatorFor,
  emitStringLiteral,
  escapeFishDoubleQuotedText,
  escapeFishSingleQuoted,
  mathOperatorFor,
  operatorToString,
  orderTestOperatorFor,
} from "./fish.js";

test("escapes fish strings", () => {
  expect(escapeFishSingleQuoted("can't stop")).toBe("'can'\\''t stop'");
  expect(escapeFishDoubleQuotedText('a\\b "$HOME"')).toBe('a\\\\b \\"\\$HOME\\"');

  expect(emitStringLiteral("plain_./:@%+=,-")).toBe("plain_./:@%+=,-");
  expect(emitStringLiteral("")).toBe("''");
  expect(emitStringLiteral("has space")).toBe("'has space'");
});

test("maps TypeScript operators to fish operators", () => {
  expect(mathOperatorFor(ts.SyntaxKind.PlusToken)).toBe("+");
  expect(mathOperatorFor(ts.SyntaxKind.AsteriskToken)).toBe("'*'");
  expect(mathOperatorFor(ts.SyntaxKind.BarBarToken)).toBeUndefined();

  expect(compoundMathOperatorFor(ts.SyntaxKind.MinusEqualsToken)).toBe("-");
  expect(compoundMathOperatorFor(ts.SyntaxKind.PercentEqualsToken)).toBe("'%'");
  expect(compoundMathOperatorFor(ts.SyntaxKind.PlusEqualsToken)).toBeUndefined();

  expect(orderTestOperatorFor(ts.SyntaxKind.GreaterThanToken)).toBe("-gt");
  expect(orderTestOperatorFor(ts.SyntaxKind.LessThanEqualsToken)).toBe("-le");
  expect(orderTestOperatorFor(ts.SyntaxKind.EqualsToken)).toBeUndefined();

  expect(operatorToString(ts.SyntaxKind.SlashToken)).toBe("/");
  expect(operatorToString(ts.SyntaxKind.AmpersandAmpersandToken)).toBe("??");
});
