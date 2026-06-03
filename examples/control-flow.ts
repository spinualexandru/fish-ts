/**
 * TypeScript control-flow patterns and their fish output.
 *
 * @remarks
 * fish-ts maps TypeScript conditions to fish `test` commands using semantic
 * types. Numeric comparisons use numeric fish operators, while string and
 * boolean comparisons use string equality.
 *
 * @example TypeScript input
 * ```ts
 * const count: number = 2;
 * const name: string = "world";
 * const items: string[] = ["a", "b"];
 *
 * if (count > 1 && count <= 3) {
 *   echo("range");
 * } else {
 *   echo("outside");
 * }
 *
 * switch (name) {
 *   case "world":
 *     echo("hello");
 *     break;
 *   default:
 *     echo("unknown");
 * }
 *
 * for (const item of items) {
 *   echo(item);
 * }
 *
 * for (let i: number = 0; i < 2; i++) {
 *   echo(i);
 * }
 *
 * let n: number = 2;
 * while (n > 0) {
 *   echo(n);
 *   n = n - 1;
 * }
 * ```
 *
 * @example Generated fish
 * ```fish
 * set -g count 2
 * set -g name world
 * set -g items a b
 * if test $count -gt 1; and test $count -le 3
 *     echo range
 * else
 *     echo outside
 * end
 * switch $name
 *     case world
 *         echo hello
 *     case '*'
 *         echo unknown
 * end
 * for item in $items
 *     echo $item
 * end
 * begin
 *     set -l i 0
 *     while test $i -lt 2
 *         echo $i
 *         set i (math $i + 1)
 *     end
 * end
 * set -g n 2
 * while test $n -gt 0
 *     echo $n
 *     set n (math $n - 1)
 * end
 * ```
 *
 * @public
 */
export const controlFlowExamples = undefined;
