/**
 * TypeScript function patterns and their fish output.
 *
 * @remarks
 * Function parameters are read from fish `$argv`. Returning a number emits a
 * fish status code, while returning a string-like value emits it with `echo`
 * and returns success.
 *
 * @example TypeScript input
 * ```ts
 * function greet(who: string, times: number): string {
 *   const message: string = "Hello, " + who;
 *
 *   if (times > 1) {
 *     echo(message);
 *   }
 *
 *   return message;
 * }
 *
 * const value: string = command("input");
 * greet(value, 2);
 * ```
 *
 * @example Generated fish
 * ```fish
 * function greet
 *     set -l who $argv[1]
 *     set -l times $argv[2]
 *     set -l message (string join "" 'Hello, ' $who)
 *     if test $times -gt 1
 *         echo $message
 *     end
 *     echo $message
 *     return 0
 * end
 * set -g value (command input)
 * greet $value 2
 * ```
 *
 * @public
 */
export const functionExamples = undefined;
