/**
 * TypeScript expression patterns and their fish output.
 *
 * @remarks
 * String concatenation becomes `string join`, arithmetic becomes `math`, and
 * assignment or increment expressions emit fish `set` commands.
 *
 * @example TypeScript input
 * ```ts
 * let count: number = 1;
 * let text: string = "a";
 *
 * const greeting: string = `value: ${text}`;
 * const assigned: number = count = 2;
 * const before: number = count++;
 * const after: number = --count;
 *
 * text += "b";
 * count += 2;
 *
 * echo(greeting);
 * echo(text);
 * echo(count);
 * ```
 *
 * @example Generated fish
 * ```fish
 * set -g count 1
 * set -g text a
 * set -g greeting "value: $text"
 * set -g assigned (set count 2; echo $count)
 * set -g before (set -l __fish_ts_old $count; set count (math $count + 1); echo $__fish_ts_old)
 * set -g after (set count (math $count + -1); echo $count)
 * set text (string join "" $text b)
 * set count (math $count + 2)
 * echo $greeting
 * echo $text
 * echo $count
 * ```
 *
 * @public
 */
export const expressionExamples = undefined;
