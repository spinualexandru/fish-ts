/**
 * TypeScript error-handling patterns and their fish output.
 *
 * @remarks
 * fish-ts emits `try` blocks as fish `begin` blocks, then checks `$status` for
 * catch handling. `finally` statements are emitted after the status check.
 *
 * @example TypeScript input
 * ```ts
 * function run(): void {
 *   try {
 *     echo("try");
 *   } catch (status) {
 *     echo("catch");
 *   } finally {
 *     echo("finally");
 *   }
 *
 *   return;
 * }
 *
 * run();
 * ```
 *
 * @example Generated fish
 * ```fish
 * function run
 *     begin
 *         echo try
 *     end
 *     if test $status -ne 0
 *         set -l status $status
 *         echo catch
 *     end
 *     echo finally
 *     return 0
 * end
 * run
 * ```
 *
 * @public
 */
export const errorHandlingExamples = undefined;
