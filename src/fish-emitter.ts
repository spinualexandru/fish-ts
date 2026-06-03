import ts from "typescript";

import {
  compoundMathOperatorFor,
  emitStringLiteral,
  escapeFishDoubleQuotedText,
  isBooleanLike,
  isNumberLike,
  isStringLike,
  mathOperatorFor,
  operatorToString,
  orderTestOperatorFor,
} from "./fish.js";

/**
 * Emits fish shell source from a TypeScript source file.
 *
 * @remarks
 * The emitter uses the TypeScript type checker to decide between fish string,
 * numeric, boolean, and array forms. Create instances with a checker from the
 * same TypeScript program as the source file being emitted.
 *
 * @example
 * ```ts
 * import { createCheckedSource } from "fish-ts/compiler";
 * import { FishEmitter } from "fish-ts/fish-emitter";
 *
 * const checked = createCheckedSource(`
 * const items: string[] = ["apple", "banana"];
 *
 * for (const item of items) {
 *   echo(item);
 * }
 * `);
 *
 * try {
 *   const emitter = new FishEmitter(checked.checker);
 *   console.log(emitter.emitSourceFile(checked.sourceFile));
 * } finally {
 *   checked.cleanup();
 * }
 * ```
 *
 * @public
 */
export class FishEmitter {
  private readonly output: string[] = [];
  private indentLevel = 0;
  private lexicalScopeDepth = 0;

  /**
   * Creates a fish emitter backed by TypeScript semantic information.
   *
   * @param checker - Type checker for the source file being emitted.
   *
   * @example
   * ```ts
   * const checked = createCheckedSource("const name: string = 'fish';");
   * const emitter = new FishEmitter(checked.checker);
   * ```
   */
  constructor(private readonly checker: ts.TypeChecker) {}

  /**
   * Emits a complete fish script from a TypeScript source file.
   *
   * @param sourceFile - Source file to traverse.
   * @returns Fish shell source code.
   *
   * @example
   * ```ts
   * const checked = createCheckedSource("const total: number = 1 + 2;");
   * const emitter = new FishEmitter(checked.checker);
   *
   * emitter.emitSourceFile(checked.sourceFile);
   * // "set -g total (math 1 + 2)"
   * ```
   */
  emitSourceFile(sourceFile: ts.SourceFile): string {
    ts.forEachChild(sourceFile, (node) => this.visit(node));
    return this.output.join("\n");
  }

  private emit(line: string): void {
    this.output.push("    ".repeat(this.indentLevel) + line);
  }

  private declarationFlag(): "-g" | "-l" {
    return this.lexicalScopeDepth === 0 ? "-g" : "-l";
  }

  private withLexicalScope(emitBody: () => void): void {
    this.lexicalScopeDepth++;
    emitBody();
    this.lexicalScopeDepth--;
  }

  private visit(node: ts.Node): void {
    if (ts.isVariableStatement(node)) {
      this.emitVariableStatement(node);
    } else if (ts.isExpressionStatement(node)) {
      this.emitExpressionAsStatement(node.expression);
    } else if (ts.isFunctionDeclaration(node)) {
      this.emitFunctionDeclaration(node);
    } else if (ts.isIfStatement(node)) {
      this.emitIfStatement(node);
    } else if (ts.isForOfStatement(node)) {
      this.emitForOfStatement(node);
    } else if (ts.isForStatement(node)) {
      this.emitForStatement(node);
    } else if (ts.isWhileStatement(node)) {
      this.emitWhileStatement(node);
    } else if (ts.isSwitchStatement(node)) {
      this.emitSwitchStatement(node);
    } else if (ts.isTryStatement(node)) {
      this.emitTryStatement(node);
    } else if (ts.isReturnStatement(node)) {
      this.emitReturnStatement(node);
    } else if (ts.isBreakStatement(node)) {
      this.emit("break");
    } else if (ts.isContinueStatement(node)) {
      this.emit("continue");
    }
  }

  private emitBlockOrStatement(node: ts.Statement): void {
    if (ts.isBlock(node)) {
      ts.forEachChild(node, (child) => this.visit(child));
      return;
    }

    this.visit(node);
  }

  private emitExpr(expr: ts.Expression): string {
    if (ts.isStringLiteral(expr)) {
      return emitStringLiteral(expr.text);
    }

    if (ts.isNumericLiteral(expr)) {
      return expr.text;
    }

    if (expr.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
      const template = expr as ts.NoSubstitutionTemplateLiteral;
      return emitStringLiteral(template.text);
    }

    if (ts.isIdentifier(expr)) {
      return `$${expr.text}`;
    }

    if (expr.kind === ts.SyntaxKind.TrueKeyword) {
      return "true";
    }

    if (expr.kind === ts.SyntaxKind.FalseKeyword) {
      return "false";
    }

    if (ts.isArrayLiteralExpression(expr)) {
      return expr.elements
        .map((element) => this.emitExpr(element as ts.Expression))
        .join(" ");
    }

    if (ts.isElementAccessExpression(expr)) {
      return this.emitElementAccess(expr);
    }

    if (ts.isPropertyAccessExpression(expr)) {
      return this.emitPropertyAccess(expr);
    }

    if (ts.isTemplateExpression(expr)) {
      return this.emitTemplateExpression(expr);
    }

    if (ts.isBinaryExpression(expr)) {
      return this.emitBinaryExpr(expr);
    }

    if (ts.isPostfixUnaryExpression(expr)) {
      return this.emitPostfixAsExpr(expr);
    }

    if (ts.isPrefixUnaryExpression(expr)) {
      return this.emitPrefixAsExpr(expr);
    }

    if (ts.isCallExpression(expr)) {
      return `(${this.emitCall(expr)})`;
    }

    if (ts.isParenthesizedExpression(expr)) {
      return this.emitExpr(expr.expression);
    }

    return `# TODO: unhandled expr ${ts.SyntaxKind[expr.kind]}`;
  }

  private emitElementAccess(expr: ts.ElementAccessExpression): string {
    const array = this.emitExpr(expr.expression);
    const argument = expr.argumentExpression;
    if (!argument) {
      return `${array}[]`;
    }

    const fishIndex = ts.isNumericLiteral(argument)
      ? String(parseInt(argument.text, 10) + 1)
      : `(math ${this.emitExpr(argument)} + 1)`;

    return `${array}[${fishIndex}]`;
  }

  private emitPropertyAccess(expr: ts.PropertyAccessExpression): string {
    if (expr.name.text === "length") {
      const objectType = this.checker.getTypeAtLocation(expr.expression);
      if (this.checker.isArrayType(objectType)) {
        return `(count ${this.emitExpr(expr.expression)})`;
      }
    }

    return `${this.emitExpr(expr.expression)}.${expr.name.text}`;
  }

  private emitTemplateExpression(expr: ts.TemplateExpression): string {
    let result = `"${escapeFishDoubleQuotedText(expr.head.text)}`;

    for (const span of expr.templateSpans) {
      const expression = span.expression;
      if (ts.isIdentifier(expression)) {
        result += `$${expression.text}`;
      } else {
        result += `(${this.emitExpr(expression)})`;
      }
      result += escapeFishDoubleQuotedText(span.literal.text);
    }

    return `${result}"`;
  }

  private emitBinaryExpr(expr: ts.BinaryExpression): string {
    const op = expr.operatorToken.kind;

    if (op === ts.SyntaxKind.PlusToken) {
      const resultType = this.checker.getTypeAtLocation(expr);
      if (isStringLike(resultType)) {
        const left = this.emitExpr(expr.left);
        const right = this.emitExpr(expr.right);
        return `(string join "" ${left} ${right})`;
      }
    }

    const mathOp = mathOperatorFor(op);
    if (mathOp) {
      return `(math ${this.emitExpr(expr.left)} ${mathOp} ${this.emitExpr(expr.right)})`;
    }

    if (op === ts.SyntaxKind.EqualsToken) {
      return this.emitAssignmentExpr(expr);
    }

    if (op === ts.SyntaxKind.PlusEqualsToken) {
      return this.emitPlusEqualsExpr(expr);
    }

    return `(math ${this.emitExpr(expr.left)} ${operatorToString(op)} ${this.emitExpr(expr.right)})`;
  }

  private emitAssignmentExpr(expr: ts.BinaryExpression): string {
    const varName = this.identifierName(expr.left);
    return `(set ${varName} ${this.emitExpr(expr.right)}; echo $${varName})`;
  }

  private emitPlusEqualsExpr(expr: ts.BinaryExpression): string {
    const varName = this.identifierName(expr.left);
    const rhsType = this.checker.getTypeAtLocation(expr.left);

    if (isStringLike(rhsType)) {
      return `(set ${varName} (string join "" $${varName} ${this.emitExpr(expr.right)}); echo $${varName})`;
    }

    return `(set ${varName} (math $${varName} + ${this.emitExpr(expr.right)}); echo $${varName})`;
  }

  private emitPostfixAsExpr(expr: ts.PostfixUnaryExpression): string {
    const varName = this.identifierName(expr.operand);
    const delta = expr.operator === ts.SyntaxKind.PlusPlusToken ? 1 : -1;
    return `(set -l __fish_ts_old $${varName}; set ${varName} (math $${varName} + ${delta}); echo $__fish_ts_old)`;
  }

  private emitPrefixAsExpr(expr: ts.PrefixUnaryExpression): string {
    const varName = this.identifierName(expr.operand);
    const delta = expr.operator === ts.SyntaxKind.PlusPlusToken ? 1 : -1;
    return `(set ${varName} (math $${varName} + ${delta}); echo $${varName})`;
  }

  private identifierName(node: ts.Node): string {
    if (ts.isIdentifier(node)) {
      return node.text;
    }

    if (ts.isPropertyAccessExpression(node)) {
      return `${this.identifierName(node.expression)}.${node.name.text}`;
    }

    return "";
  }

  private emitCondition(expr: ts.Expression): string {
    if (ts.isBinaryExpression(expr)) {
      return this.emitBinaryCondition(expr);
    }

    if (
      ts.isPrefixUnaryExpression(expr) &&
      expr.operator === ts.SyntaxKind.ExclamationToken
    ) {
      return `not ${this.emitCondition(expr.operand)}`;
    }

    if (ts.isIdentifier(expr)) {
      const exprType = this.checker.getTypeAtLocation(expr);
      if (isBooleanLike(exprType)) {
        return `test ${this.emitExpr(expr)} = true`;
      }

      return `test -n ${this.emitExpr(expr)}`;
    }

    if (ts.isCallExpression(expr)) {
      return this.emitCall(expr);
    }

    if (expr.kind === ts.SyntaxKind.TrueKeyword) {
      return "true";
    }

    if (expr.kind === ts.SyntaxKind.FalseKeyword) {
      return "false";
    }

    return `test -n ${this.emitExpr(expr)}`;
  }

  private emitBinaryCondition(expr: ts.BinaryExpression): string {
    const op = expr.operatorToken.kind;

    if (
      op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
      op === ts.SyntaxKind.EqualsEqualsToken
    ) {
      const leftType = this.checker.getTypeAtLocation(expr.left);
      const fishOp = isStringLike(leftType) || isBooleanLike(leftType) ? "=" : "-eq";
      return `test ${this.emitExpr(expr.left)} ${fishOp} ${this.emitExpr(expr.right)}`;
    }

    if (
      op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
      op === ts.SyntaxKind.ExclamationEqualsToken
    ) {
      const leftType = this.checker.getTypeAtLocation(expr.left);
      const fishOp = isStringLike(leftType) || isBooleanLike(leftType) ? "!=" : "-ne";
      return `test ${this.emitExpr(expr.left)} ${fishOp} ${this.emitExpr(expr.right)}`;
    }

    const orderOp = orderTestOperatorFor(op);
    if (orderOp) {
      return `test ${this.emitExpr(expr.left)} ${orderOp} ${this.emitExpr(expr.right)}`;
    }

    if (op === ts.SyntaxKind.AmpersandAmpersandToken) {
      return `${this.emitCondition(expr.left)}; and ${this.emitCondition(expr.right)}`;
    }

    if (op === ts.SyntaxKind.BarBarToken) {
      return `${this.emitCondition(expr.left)}; or ${this.emitCondition(expr.right)}`;
    }

    return `test -n ${this.emitExpr(expr)}`;
  }

  private emitCall(expr: ts.CallExpression): string {
    const callee = expr.expression;
    const args = expr.arguments
      .map((argument) => this.emitExpr(argument as ts.Expression))
      .join(" ");

    if (ts.isIdentifier(callee) && callee.text === "echo") {
      return `echo ${args}`;
    }

    if (ts.isIdentifier(callee)) {
      return args.length > 0 ? `${callee.text} ${args}` : callee.text;
    }

    return "# TODO: unhandled call";
  }

  private emitExpressionAsStatement(expr: ts.Expression): void {
    if (ts.isCallExpression(expr)) {
      this.emit(this.emitCall(expr));
      return;
    }

    if (
      ts.isPostfixUnaryExpression(expr) ||
      ts.isPrefixUnaryExpression(expr)
    ) {
      this.emitUnaryMutationStatement(expr);
      return;
    }

    if (ts.isBinaryExpression(expr)) {
      const op = expr.operatorToken.kind;

      if (op === ts.SyntaxKind.EqualsToken && ts.isIdentifier(expr.left)) {
        this.emit(`set ${expr.left.text} ${this.emitExpr(expr.right)}`);
        return;
      }

      if (this.isCompoundAssignment(op)) {
        this.emitCompoundAssignment(expr);
        return;
      }
    }

    this.emit(this.emitExpr(expr));
  }

  private emitUnaryMutationStatement(
    expr: ts.PostfixUnaryExpression | ts.PrefixUnaryExpression,
  ): void {
    const varName = this.identifierName(expr.operand);
    const sign = expr.operator === ts.SyntaxKind.PlusPlusToken ? "+" : "-";
    this.emit(`set ${varName} (math $${varName} ${sign} 1)`);
  }

  private isCompoundAssignment(kind: ts.SyntaxKind): boolean {
    return (
      kind === ts.SyntaxKind.PlusEqualsToken ||
      kind === ts.SyntaxKind.MinusEqualsToken ||
      kind === ts.SyntaxKind.AsteriskEqualsToken ||
      kind === ts.SyntaxKind.SlashEqualsToken ||
      kind === ts.SyntaxKind.PercentEqualsToken
    );
  }

  private emitCompoundAssignment(expr: ts.BinaryExpression): void {
    const varName = this.identifierName(expr.left);
    const op = expr.operatorToken.kind;

    if (op === ts.SyntaxKind.PlusEqualsToken) {
      const rhsType = this.checker.getTypeAtLocation(expr.left);
      if (isStringLike(rhsType)) {
        this.emit(`set ${varName} (string join "" $${varName} ${this.emitExpr(expr.right)})`);
        return;
      }

      this.emit(`set ${varName} (math $${varName} + ${this.emitExpr(expr.right)})`);
      return;
    }

    const fishOp = compoundMathOperatorFor(op);
    if (fishOp) {
      this.emit(`set ${varName} (math $${varName} ${fishOp} ${this.emitExpr(expr.right)})`);
    }
  }

  private emitVariableStatement(node: ts.VariableStatement): void {
    for (const declaration of node.declarationList.declarations) {
      this.emitVariableDeclaration(declaration);
    }
  }

  private emitVariableDeclaration(declaration: ts.VariableDeclaration): void {
    if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
      return;
    }

    const varName = declaration.name.text;
    const initializer = declaration.initializer;
    const symbol = this.checker.getSymbolAtLocation(declaration.name);
    if (!symbol) {
      return;
    }

    const varType = this.checker.getTypeOfSymbolAtLocation(symbol, declaration);
    const flag = this.declarationFlag();

    if (
      this.checker.isArrayType(varType) &&
      ts.isArrayLiteralExpression(initializer)
    ) {
      const elements = initializer.elements
        .map((element) => this.emitExpr(element as ts.Expression))
        .join(" ");
      this.emit(`set ${flag} ${varName} ${elements}`);
      return;
    }

    this.emit(`set ${flag} ${varName} ${this.emitExpr(initializer)}`);
  }

  private emitIfStatement(node: ts.IfStatement): void {
    let current: ts.IfStatement | undefined = node;
    let first = true;

    while (current) {
      const activeIf: ts.IfStatement = current;
      const keyword = first ? "if" : "else if";
      this.emit(`${keyword} ${this.emitCondition(activeIf.expression)}`);
      this.indentLevel++;
      this.withLexicalScope(() => {
        this.emitBlockOrStatement(activeIf.thenStatement);
      });
      this.indentLevel--;
      first = false;

      const elseStatement: ts.Statement | undefined = activeIf.elseStatement;
      if (!elseStatement) {
        break;
      }

      if (ts.isIfStatement(elseStatement)) {
        current = elseStatement;
        continue;
      }

      this.emit("else");
      this.indentLevel++;
      this.withLexicalScope(() => {
        this.emitBlockOrStatement(elseStatement);
      });
      this.indentLevel--;
      break;
    }

    this.emit("end");
  }

  private emitForOfStatement(node: ts.ForOfStatement): void {
    if (!ts.isVariableDeclarationList(node.initializer)) {
      return;
    }

    const firstDeclaration = node.initializer.declarations[0];
    if (!firstDeclaration || !ts.isIdentifier(firstDeclaration.name)) {
      return;
    }

    this.emit(`for ${firstDeclaration.name.text} in ${this.emitExpr(node.expression)}`);
    this.indentLevel++;
    this.withLexicalScope(() => {
      this.emitBlockOrStatement(node.statement);
    });
    this.indentLevel--;
    this.emit("end");
  }

  private emitForStatement(node: ts.ForStatement): void {
    this.emit("begin");
    this.indentLevel++;
    this.withLexicalScope(() => {
      this.emitForInitializer(node.initializer);
      this.emit(`while ${node.condition ? this.emitCondition(node.condition) : "true"}`);

      this.indentLevel++;
      this.withLexicalScope(() => {
        this.emitBlockOrStatement(node.statement);
      });

      if (node.incrementor) {
        this.emitExpressionAsStatement(node.incrementor);
      }

      this.indentLevel--;
      this.emit("end");
    });
    this.indentLevel--;
    this.emit("end");
  }

  private emitForInitializer(
    initializer: ts.ForInitializer | undefined,
  ): void {
    if (!initializer) {
      return;
    }

    if (ts.isVariableDeclarationList(initializer)) {
      for (const declaration of initializer.declarations) {
        this.emitVariableDeclaration(declaration);
      }
      return;
    }

    this.emitExpressionAsStatement(initializer);
  }

  private emitWhileStatement(node: ts.WhileStatement): void {
    this.emit(`while ${this.emitCondition(node.expression)}`);
    this.indentLevel++;
    this.withLexicalScope(() => {
      this.emitBlockOrStatement(node.statement);
    });
    this.indentLevel--;
    this.emit("end");
  }

  private emitSwitchStatement(node: ts.SwitchStatement): void {
    this.emit(`switch ${this.emitExpr(node.expression)}`);

    for (const clause of node.caseBlock.clauses) {
      if (ts.isCaseClause(clause)) {
        this.emit(`    case ${this.emitExpr(clause.expression)}`);
      } else {
        this.emit("    case '*'");
      }

      this.indentLevel += 2;
      this.withLexicalScope(() => {
        for (const statement of clause.statements) {
          if (!ts.isBreakStatement(statement)) {
            this.visit(statement);
          }
        }
      });
      this.indentLevel -= 2;
    }

    this.emit("end");
  }

  private emitTryStatement(node: ts.TryStatement): void {
    this.emit("begin");
    this.indentLevel++;
    this.withLexicalScope(() => {
      ts.forEachChild(node.tryBlock, (child) => this.visit(child));
    });
    this.indentLevel--;
    this.emit("end");

    if (node.catchClause) {
      this.emitCatchClause(node.catchClause);
    }

    const finallyBlock = node.finallyBlock;
    if (finallyBlock) {
      this.withLexicalScope(() => {
        ts.forEachChild(finallyBlock, (child) => this.visit(child));
      });
    }
  }

  private emitCatchClause(catchClause: ts.CatchClause): void {
    this.emit("if test $status -ne 0");
    this.indentLevel++;

    if (
      catchClause.variableDeclaration &&
      ts.isIdentifier(catchClause.variableDeclaration.name)
    ) {
      this.emit(`set -l ${catchClause.variableDeclaration.name.text} $status`);
    }

    this.withLexicalScope(() => {
      ts.forEachChild(catchClause.block, (child) => this.visit(child));
    });
    this.indentLevel--;
    this.emit("end");
  }

  private emitReturnStatement(node: ts.ReturnStatement): void {
    if (!node.expression) {
      this.emit("return 0");
      return;
    }

    const exprType = this.checker.getTypeAtLocation(node.expression);
    if (isNumberLike(exprType)) {
      this.emit(`return ${this.emitExpr(node.expression)}`);
      return;
    }

    this.emit(`echo ${this.emitExpr(node.expression)}`);
    this.emit("return 0");
  }

  private emitFunctionDeclaration(node: ts.FunctionDeclaration): void {
    const body = node.body;
    if (!body) {
      return;
    }

    const name = node.name?.text ?? "anonymous";
    const params = node.parameters.flatMap((param) =>
      ts.isIdentifier(param.name) ? [param.name.text] : [],
    );

    this.emit(`function ${name}`);
    this.indentLevel++;

    params.forEach((param, index) => {
      this.emit(`set -l ${param} $argv[${index + 1}]`);
    });

    this.withLexicalScope(() => {
      ts.forEachChild(body, (child) => this.visit(child));
    });
    this.indentLevel--;
    this.emit("end");
  }
}
