export { createCheckedSource } from "./compiler.js";
export type { CheckedSource } from "./compiler.js";
export { FishEmitter } from "./fish-emitter.js";
export {
  compoundMathOperatorFor,
  emitStringLiteral,
  escapeFishDoubleQuotedText,
  escapeFishSingleQuoted,
  isBooleanLike,
  isNumberLike,
  isStringLike,
  mathOperatorFor,
  operatorToString,
  orderTestOperatorFor,
} from "./fish.js";
export { transpile } from "./transpile.js";
