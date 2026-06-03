/**
 * TypeScript source patterns for basic fish output.
 *
 * @remarks
 * Common fish built-ins are available as TypeScript functions. fish-ts uses
 * type information to choose quoting, command arguments, and numeric `math`
 * expressions.
 *
 * @example TypeScript input
 * ```ts
 * const name: string = "world";
 * const empty: string = "";
 * const path: string = "notes from monday.txt";
 * const total: number = (8 + 2) * 3 / 5 % 4;
 *
 * echo("Hello, " + name);
 * echo(total);
 * ```
 *
 * @example Generated fish
 * ```fish
 * set -g name world
 * set -g empty ''
 * set -g path 'notes from monday.txt'
 * set -g total (math (math (math (math 8 + 2) '*' 3) / 5) '%' 4)
 * echo (string join "" 'Hello, ' $name)
 * echo $total
 * ```
 *
 * @public
 */
export const syntaxBasicsExamples = undefined;
