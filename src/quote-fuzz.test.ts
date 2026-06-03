import { describe, expect, test } from "vitest";

import { transpile } from "./transpile.js";

interface QuoteCase {
  name: string;
  value: string;
  expected: string;
}

const quoteCases: QuoteCase[] = [
  {
    name: "grep end anchor pattern",
    value: "enabled)$",
    expected: "'enabled)$'",
  },
  {
    name: "literal single-quoted words",
    value: "'hello world'",
    expected: "''\\''hello world'\\'''",
  },
  {
    name: "embedded single quote",
    value: "can't stop",
    expected: "'can'\\''t stop'",
  },
  {
    name: "double quotes and dollar",
    value: 'say "$HOME"',
    expected: "'say \"$HOME\"'",
  },
  {
    name: "glob and command substitution characters",
    value: "file*(echo hacked)",
    expected: "'file*(echo hacked)'",
  },
  {
    name: "backslash before quote",
    value: "\\'hello world\\'",
    expected: "'\\'\\''hello world\\'\\'''",
  },
];

describe("quote and template fuzzing", () => {
  test.each(quoteCases)("quotes string literal args: $name", ({ value, expected }) => {
    const fish = transpile(`
declare function echo(value: string): void;
echo(${JSON.stringify(value)});
`);

    expect(fish).toBe(`echo ${expected}`);
  });

  test("quotes command-shaped grep arguments independently", () => {
    const fish = transpile(`
declare function grep(pattern: string, file: string): void;
grep("enabled)$", "foo.txt");
`);

    expect(fish).toBe("grep 'enabled)$' foo.txt");
  });

  test("quotes a command line stored as a literal template", () => {
    const fish = transpile(`
const commandLine: string = \`grep 'enabled)$' foo.txt\`;
`);

    expect(fish).toBe("set -g commandLine 'grep '\\''enabled)$'\\'' foo.txt'");
  });

  test("escapes interpolated template text without escaping variables", () => {
    const fish = transpile(`
const pattern: string = "enabled)$";
const file: string = "foo.txt";
const commandLine: string = \`grep '\${pattern}' \${file} "$HOME" \\\\tail\`;
`);

    expect(fish).toBe(
      [
        "set -g pattern 'enabled)$'",
        "set -g file foo.txt",
        'set -g commandLine "grep \'$pattern\' $file \\"\\$HOME\\" \\\\tail"',
      ].join("\n"),
    );
  });

  test("keeps quote-heavy arrays split by TypeScript element boundaries", () => {
    const fish = transpile(`
const args: string[] = ["grep", "enabled)$", "foo.txt", "'hello world'"];
`);

    expect(fish).toBe(
      "set -g args grep 'enabled)$' foo.txt ''\\''hello world'\\'''",
    );
  });
});
