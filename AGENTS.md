# AGENTS.md

## Project

This repository publishes `@affinity-health/npi`, a TypeScript client for the CMS NPPES NPI Registry API.

## Tooling

- Use Bun for package management.
- Use Vite+ for formatting, linting, type checks, tests, and packaging.
- Keep the library dependency-free unless a new dependency materially improves the public contract.
- Preserve upstream NPPES response field names in returned records.
- Do not describe an NPI lookup as license or credential verification.

## Validation

Run focused checks while iterating and the full sequence before release:

```sh
vp check
vp test
vp pack
bun run smoke
```

The live smoke test is opt-in and must not become a requirement for ordinary unit tests.

## Git

- Commit logical changes with `committer`, listing every intended file.
- Never push, tag, create a release, or publish unless explicitly authorized.
- Maintain `CHANGELOG.md`; release tags use `v<version>`.
