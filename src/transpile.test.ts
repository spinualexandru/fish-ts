import { expect, test } from "vitest";

import { transpile } from "./transpile.js";

test("transpiles boolean conditions", () => {
  const fish = transpile(`
declare function echo(msg: string): void;
const flag: boolean = false;
if (flag) {
  echo("bad");
} else {
  echo("ok");
}
`);

  expect(fish).toBe(
    [
      "set -g flag false",
      "if test $flag = true",
      "    echo bad",
      "else",
      "    echo ok",
      "end",
    ].join("\n"),
  );
});

test("transpiles fish builtin calls without user declarations", () => {
  const fish = transpile(`
const name: string = "world";
echo("hello", name);
const dir: string = pwd();
source("config.fish");
`);

  expect(fish).toBe(
    [
      "set -g name world",
      "echo hello $name",
      "set -g dir (pwd)",
      "source config.fish",
    ].join("\n"),
  );
});

test("transpiles caller-declared builtin return types precisely", () => {
  const fish = transpile(`
declare function pwd(): string;
if (pwd() === "/tmp") {
  echo("tmp");
}
`);

  expect(fish).toBe(
    [
      "if test (pwd) = /tmp",
      "    echo tmp",
      "end",
    ].join("\n"),
  );
});

test("transpiles expression calls", () => {
  const fish = transpile(`
declare function greet(name: string): string;
const name: string = "world";
const x: string = greet(name);
`);

  expect(fish).toBe(
    [
      "set -g name world",
      "set -g x (greet $name)",
    ].join("\n"),
  );
});

test("transpiles local declarations", () => {
  const fish = transpile(`
function f(): void {
  const tmp: string = "x";
}
for (let i: number = 0; i < 2; i++) {
  const tmp: string = "y";
}
`);

  expect(fish).toBe(
    [
      "function f",
      "    set -l tmp x",
      "end",
      "begin",
      "    set -l i 0",
      "    while test $i -lt 2",
      "        set -l tmp y",
      "        set i (math $i + 1)",
      "    end",
      "end",
    ].join("\n"),
  );
});

test("transpiles postfix values", () => {
  const fish = transpile(`
let i: number = 1;
const y: number = i++;
`);

  expect(fish).toBe(
    [
      "set -g i 1",
      "set -g y (set -l __fish_ts_old $i; set i (math $i + 1); echo $__fish_ts_old)",
    ].join("\n"),
  );
});

test("transpiles string escaping", () => {
  const value = `a"b $HOME it's *`;
  const fish = transpile(`const s: string = ${JSON.stringify(value)};`);

  expect(fish).toBe(`set -g s 'a"b $HOME it'\\''s *'`);
});
