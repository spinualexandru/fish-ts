/**
 * TypeScript variable patterns and their fish output.
 *
 * @remarks
 * Top-level initialized declarations become global fish variables. Declarations
 * inside functions and blocks become local fish variables. Arrays become fish
 * lists, and TypeScript zero-based indexes are emitted as fish one-based
 * indexes.
 *
 * @example TypeScript input
 * ```ts
 * const items: string[] = ["apple", "two words"];
 * const first: string = items[0];
 * const index: number = 1;
 * const selected: string = items[index];
 * const count: number = items.length;
 *
 * function report(prefix: string): void {
 *   const message: string = prefix + ": " + selected;
 *   echo(message);
 * }
 *
 * report("item");
 * ```
 *
 * @example Generated fish
 * ```fish
 * set -g items apple 'two words'
 * set -g first $items[1]
 * set -g index 1
 * set -g selected $items[(math $index + 1)]
 * set -g count (count $items)
 * function report
 *     set -l prefix $argv[1]
 *     set -l message (string join "" (string join "" $prefix ': ') $selected)
 *     echo $message
 * end
 * report item
 * ```
 *
 * @public
 */
export const variableExamples = undefined;
