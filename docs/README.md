# fish-ts API Docs

This documentation set is generated from TSDoc comments in `src/**/*.ts` and
`examples/**/*.ts`.

Use `pnpm run docs` to build the static TypeDoc site into `docs/api`. Use
`pnpm run docs:watch` while editing public API comments.

## TSDoc conventions

- Put public API documentation on exported functions, classes, interfaces, and
  constants.
- For examples, pair a TypeScript input block with the fish output emitted by
  fish-ts.
- Start with a short summary sentence.
- Use `@remarks` for behavior notes that affect callers.
- Use `@param` and `@returns` when a signature is not self-evident.
- Use `@public` for exports intended to appear in generated API docs.

Generated files under `docs/api` should not be edited by hand.
