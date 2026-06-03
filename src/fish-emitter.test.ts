import { expect, test } from "vitest";

import { transpile } from "./transpile.js";

test("transpiles arrays, access, templates, and arithmetic", () => {
  const fish = transpile(`
const items: string[] = ["apple", "banana", "with space"];
const first: string = items[0];
let index: number = 1;
const selected: string = items[index];
const count: number = items.length;
const greeting: string = "Hello, " + first + "!";
const tpl: string = \`Found \${count}: \${first.toUpperCase()}\`;
const total: number = (count + 2) * 3 / 2 % 4;
`);

  expect(fish).toBe(
    [
      "set -g items apple banana 'with space'",
      "set -g first $items[1]",
      "set -g index 1",
      "set -g selected $items[(math $index + 1)]",
      "set -g count (count $items)",
      'set -g greeting (string join "" (string join "" \'Hello, \' $first) \'!\')',
      'set -g tpl "Found $count: ((# TODO: unhandled call))"',
      "set -g total (math (math (math (math $count + 2) '*' 3) / 2) '%' 4)",
    ].join("\n"),
  );
});

test("transpiles condition variants", () => {
  const fish = transpile(`
declare function echo(msg: string): void;
declare function ready(): void;
const name: string = "world";
const flag: boolean = true;
const count: number = 2;
if (!flag) echo("not flag");
if (name == "world" && count !== 1) {
  echo("match");
} else if (count >= 3 || count <= 0) {
  echo("edge");
} else if (ready()) {
  echo("ready");
} else if (true) {
  echo("true");
} else if (false) {
  echo("false");
} else if (name) {
  echo("name");
}
`);

  expect(fish).toBe(
    [
      "set -g name world",
      "set -g flag true",
      "set -g count 2",
      "if not test $flag = true",
      "    echo 'not flag'",
      "end",
      "if test $name -eq world; and test $count -ne 1",
      "    echo match",
      "else if test $count -ge 3; or test $count -le 0",
      "    echo edge",
      "else if ready",
      "    echo ready",
      "else if true",
      "    echo true",
      "else if false",
      "    echo false",
      "else if test -n $name",
      "    echo name",
      "end",
    ].join("\n"),
  );
});

test("transpiles loops, switch, break, and continue", () => {
  const fish = transpile(`
declare function echo(value: string | number): void;
const items: string[] = ["a", "b"];
for (const item of items) {
  echo(item);
  continue;
}
let i: number = 0;
for (; ; i++) {
  break;
}
for (i = 1; i < 3; ++i) echo(i);
while (i > 0) {
  i--;
}
switch (items[0]) {
  case "a":
    echo("a");
    break;
  default:
    echo("other");
}
`);

  expect(fish).toBe(
    [
      "set -g items a b",
      "for item in $items",
      "    echo $item",
      "    continue",
      "end",
      "set -g i 0",
      "begin",
      "    while true",
      "        break",
      "        set i (math $i + 1)",
      "    end",
      "end",
      "begin",
      "    set i 1",
      "    while test $i -lt 3",
      "        echo $i",
      "        set i (math $i + 1)",
      "    end",
      "end",
      "while test $i -gt 0",
      "    set i (math $i - 1)",
      "end",
      "switch $items[1]",
      "    case a",
      "        echo a",
      "    case '*'",
      "        echo other",
      "end",
    ].join("\n"),
  );
});

test("transpiles assignments, calls, and functions", () => {
  const fish = transpile(`
declare function echo(value: string | number): void;
declare function getValue(): number;
let count: number = 1;
let text: string = "a";
count = getValue();
const assigned: number = count = 2;
const before: number = count--;
const after: number = --count;
count += 3;
count -= 1;
count *= 2;
count /= 2;
count %= 2;
text += "b";
function greet(who: string, times: number): string {
  const message: string = "hi " + who;
  if (times > 1) {
    return message;
  }
  return times;
}
greet(text, count);
`);

  expect(fish).toBe(
    [
      "set -g count 1",
      "set -g text a",
      "set count (getValue)",
      "set -g assigned (set count 2; echo $count)",
      "set -g before (set -l __fish_ts_old $count; set count (math $count + -1); echo $__fish_ts_old)",
      "set -g after (set count (math $count + -1); echo $count)",
      "set count (math $count + 3)",
      "set count (math $count - 1)",
      "set count (math $count '*' 2)",
      "set count (math $count / 2)",
      "set count (math $count '%' 2)",
      'set text (string join "" $text b)',
      "function greet",
      "    set -l who $argv[1]",
      "    set -l times $argv[2]",
      '    set -l message (string join "" \'hi \' $who)',
      "    if test $times -gt 1",
      "        echo $message",
      "        return 0",
      "    end",
      "    return $times",
      "end",
      "greet $text $count",
    ].join("\n"),
  );
});

test("transpiles try, catch, finally, and return without expression", () => {
  const fish = transpile(`
declare function echo(msg: string): void;
function run(): void {
  try {
    echo("try");
  } catch (e) {
    echo("catch");
  } finally {
    echo("finally");
  }
  return;
}
`);

  expect(fish).toBe(
    [
      "function run",
      "    begin",
      "        echo try",
      "    end",
      "    if test $status -ne 0",
      "        set -l e $status",
      "        echo catch",
      "    end",
      "    echo finally",
      "    return 0",
      "end",
    ].join("\n"),
  );
});

test("transpiles remaining expression and statement edge cases", () => {
  const fish = transpile(`
declare function noArgs(): void;
declare function echo(value: unknown): void;
declare function read(value: string[]): void;
declare function declaredOnly(): void;
const bareTemplate: string = \`plain template\`;
const values: string[] = ["x", "y"];
const inlineValues: string[] = ["a"];
const nested: number = (1);
const stringLength: number = bareTemplate.length;
echo(["inline", "array"]);
noArgs();
read(values);
try {
  echo("try only");
}
`);

  expect(fish).toBe(
    [
      "set -g bareTemplate 'plain template'",
      "set -g values x y",
      "set -g inlineValues a",
      "set -g nested 1",
      "set -g stringLength $bareTemplate.length",
      "echo inline array",
      "noArgs",
      "read $values",
      "begin",
      "    echo 'try only'",
      "end",
    ].join("\n"),
  );
});

test("transpiles declarations that intentionally emit nothing", () => {
  expect(transpile("let declaredOnly: string;")).toBe("");
});

test("transpiles branch-specific expression forms", () => {
  const fish = transpile(`
declare function echo(value: unknown): void;
let count: number = 1;
let text: string = "a";
const property = text.toString;
const explicitName: string = "world";
const same: boolean = explicitName === "world";
const different: boolean = explicitName !== "other";
if (explicitName === "world") echo("same");
if (explicitName !== "other") echo("different");
if (count + 1) echo("fallback");
const plusText: string = text += "b";
const plusCount: number = count += 2;
const afterInc: number = ++count;
count + 1;
for (;;) {
  break;
}
try {
  echo("catch without var");
} catch {
  echo("caught");
}
export default function ({ value }: { value: string }): void {
  echo(value);
}
`);

  expect(fish).toBe(
    [
      "set -g count 1",
      "set -g text a",
      "set -g property $text.toString",
      "set -g explicitName world",
      "set -g same (math $explicitName ?? world)",
      "set -g different (math $explicitName ?? other)",
      "if test $explicitName = world",
      "    echo same",
      "end",
      "if test $explicitName != other",
      "    echo different",
      "end",
      "if test -n (math $count + 1)",
      "    echo fallback",
      "end",
      'set -g plusText (set text (string join "" $text b); echo $text)',
      "set -g plusCount (set count (math $count + 2); echo $count)",
      "set -g afterInc (set count (math $count + 1); echo $count)",
      "(math $count + 1)",
      "begin",
      "    while true",
      "        break",
      "    end",
      "end",
      "begin",
      "    echo 'catch without var'",
      "end",
      "if test $status -ne 0",
      "    echo caught",
      "end",
      "function anonymous",
      "    echo $value",
      "end",
    ].join("\n"),
  );
});
