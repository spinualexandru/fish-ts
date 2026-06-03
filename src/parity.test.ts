import { describe, expect, test } from "vitest";

import { transpile } from "./transpile.js";

interface ParityCase {
  name: string;
  source: string;
  fish: string[];
}

const declarations = `
declare function echo(value: unknown): void;
declare function command(value: string): string;
declare function noArgs(): void;
`;

const cases: ParityCase[] = [
  {
    name: "scalar and array declarations",
    source: `
${declarations}
const name: string = "world";
const empty: string = "";
const count: number = 3;
const enabled: boolean = true;
const items: string[] = ["alpha", "two words"];
`,
    fish: [
      "set -g name world",
      "set -g empty ''",
      "set -g count 3",
      "set -g enabled true",
      "set -g items alpha 'two words'",
    ],
  },
  {
    name: "array access and length",
    source: `
${declarations}
const items: string[] = ["a", "b"];
let index: number = 1;
const first: string = items[0];
const current: string = items[index];
const total: number = items.length;
`,
    fish: [
      "set -g items a b",
      "set -g index 1",
      "set -g first $items[1]",
      "set -g current $items[(math $index + 1)]",
      "set -g total (count $items)",
    ],
  },
  {
    name: "strings and templates",
    source: `
${declarations}
const name: string = "world";
const greeting: string = "Hello, " + name + "!";
const template: string = \`Hello, \${name}!\`;
const plain: string = \`plain template\`;
`,
    fish: [
      "set -g name world",
      "set -g greeting (string join \"\" (string join \"\" 'Hello, ' $name) '!')",
      'set -g template "Hello, $name!"',
      "set -g plain 'plain template'",
    ],
  },
  {
    name: "arithmetic expressions",
    source: `
${declarations}
const base: number = 8;
const total: number = (base + 2) * 3 / 5 % 4;
`,
    fish: ["set -g base 8", "set -g total (math (math (math (math $base + 2) '*' 3) / 5) '%' 4)"],
  },
  {
    name: "conditions",
    source: `
${declarations}
const flag: boolean = true;
const count: number = 2;
const explicitName: string = "world";
if (flag) echo("flag");
if (!flag) echo("not flag");
if (count > 1 && count <= 3) echo("range");
if (explicitName === "world" || count !== 2) echo("match");
if (explicitName) echo("name");
`,
    fish: [
      "set -g flag true",
      "set -g count 2",
      "set -g explicitName world",
      "if test $flag = true",
      "    echo flag",
      "end",
      "if not test $flag = true",
      "    echo 'not flag'",
      "end",
      "if test $count -gt 1; and test $count -le 3",
      "    echo range",
      "end",
      "if test $explicitName = world; or test $count -ne 2",
      "    echo match",
      "end",
      "if test -n $explicitName",
      "    echo name",
      "end",
    ],
  },
  {
    name: "if else chains",
    source: `
${declarations}
const count: number = 2;
if (count > 2) {
  echo("many");
} else if (count === 1) {
  echo("one");
} else {
  echo("some");
}
`,
    fish: [
      "set -g count 2",
      "if test $count -gt 2",
      "    echo many",
      "else if test $count -eq 1",
      "    echo one",
      "else",
      "    echo some",
      "end",
    ],
  },
  {
    name: "for-of loops",
    source: `
${declarations}
const items: string[] = ["a", "b"];
for (const item of items) {
  echo(item);
  continue;
}
`,
    fish: ["set -g items a b", "for item in $items", "    echo $item", "    continue", "end"],
  },
  {
    name: "classic for loops",
    source: `
${declarations}
for (let i: number = 0; i < 2; i++) {
  echo(i);
}
`,
    fish: [
      "begin",
      "    set -l i 0",
      "    while test $i -lt 2",
      "        echo $i",
      "        set i (math $i + 1)",
      "    end",
      "end",
    ],
  },
  {
    name: "while loops",
    source: `
${declarations}
let n: number = 2;
while (n > 0) {
  echo(n);
  n--;
}
`,
    fish: ["set -g n 2", "while test $n -gt 0", "    echo $n", "    set n (math $n - 1)", "end"],
  },
  {
    name: "switch statements",
    source: `
${declarations}
const name: string = "world";
switch (name) {
  case "world":
    echo("hello");
    break;
  default:
    echo("unknown");
}
`,
    fish: [
      "set -g name world",
      "switch $name",
      "    case world",
      "        echo hello",
      "    case '*'",
      "        echo unknown",
      "end",
    ],
  },
  {
    name: "assignments and mutations",
    source: `
${declarations}
let count: number = 1;
let text: string = "a";
count = 2;
count += 3;
count -= 1;
count *= 2;
count /= 2;
count %= 2;
text += "b";
const before: number = count++;
const after: number = --count;
`,
    fish: [
      "set -g count 1",
      "set -g text a",
      "set count 2",
      "set count (math $count + 3)",
      "set count (math $count - 1)",
      "set count (math $count '*' 2)",
      "set count (math $count / 2)",
      "set count (math $count '%' 2)",
      'set text (string join "" $text b)',
      "set -g before (set -l __fish_ts_old $count; set count (math $count + 1); echo $__fish_ts_old)",
      "set -g after (set count (math $count + -1); echo $count)",
    ],
  },
  {
    name: "functions and calls",
    source: `
${declarations}
function greet(who: string, times: number): string {
  const message: string = "hi " + who;
  if (times > 1) {
    return message;
  }
  return times;
}
const value: string = command("input");
noArgs();
greet(value, 2);
`,
    fish: [
      "function greet",
      "    set -l who $argv[1]",
      "    set -l times $argv[2]",
      "    set -l message (string join \"\" 'hi ' $who)",
      "    if test $times -gt 1",
      "        echo $message",
      "        return 0",
      "    end",
      "    return $times",
      "end",
      "set -g value (command input)",
      "noArgs",
      "greet $value 2",
    ],
  },
  {
    name: "try catch finally",
    source: `
${declarations}
try {
  echo("try");
} catch (e) {
  echo("catch");
} finally {
  echo("finally");
}
`,
    fish: [
      "begin",
      "    echo try",
      "end",
      "if test $status -ne 0",
      "    set -l e $status",
      "    echo catch",
      "end",
      "echo finally",
    ],
  },
];

describe("TypeScript to Fish parity", () => {
  test.each(cases)("$name", ({ source, fish }) => {
    const output = transpile(source);

    expect(output).toBe(fish.join("\n"));
    expect(output).not.toMatch(/TODO|unhandled|\?\?/);
  });
});
