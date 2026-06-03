# fish-ts

## What It Is

`fish-ts` is a small TypeScript-to-fish-shell transpiler.

## What It Does

It parses strictly typed TypeScript with the TypeScript compiler API and emits fish script for common shell-like code: variables, functions, calls, strings, numbers, conditionals, loops, arrays, and simple expressions.

## Example

TypeScript input:

```ts
function greet(who: string, times: number): string {
  const message: string = "Hello, " + who;

  if (times > 1) {
    echo(message);
  }

  return message;
}

const value: string = command("input");
greet(value, 2);
```

Common fish built-ins are predeclared as TypeScript functions. Use
`source("file.fish")` for fish's `.` source shorthand.

Generated fish:

```fish
function greet
    set -l who $argv[1]
    set -l times $argv[2]
    set -l message (string join "" 'Hello, ' $who)
    if test $times -gt 1
        echo $message
    end
    echo $message
    return 0
end
set -g value (command input)
greet $value 2
```

## Quickstart

```sh
npm install fish-ts
npx fish-ts input.ts > output.fish
```

For one-off use without adding it to a project:

```sh
npx fish-ts input.ts > output.fish
```

You can also pipe source through stdin:

```sh
cat input.ts | npx fish-ts > output.fish
```

Use the API from JavaScript or TypeScript:

```ts
import { transpile } from "fish-ts";

console.log(transpile(`const name: string = "world";`));
```

## Development

```sh
pnpm install
pnpm run build
pnpm test
```

## Limitations

- Not a full TypeScript runtime or POSIX shell compiler.
- Best for small, typed, shell-oriented TypeScript.
- Type annotations matter; they drive fish quoting, comparisons, and command emission.
- Only supported syntax lowers to fish; unsupported JavaScript/TypeScript features may emit incomplete or invalid output.
