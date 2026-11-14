# AGENTS.md

## Repository

Package: `@ankhorage/studio-authoring`

Reusable, standalone authoring core for Ankhorage applications.

## Architecture

This package owns portable authoring behavior only. It may depend on released public packages and
portable manifest contracts, but never on Studio host lifecycle, generated application files,
project persistence, or sibling source trees. Public exports are intentional; compatibility
aliases and source-level consumer coupling are forbidden.

## Required instructions

Before changing files, inspect `.agents/skills/`. Load `ankhorage-coding-rules`,
`ankhorage-project-structure`, and `hexagonal-architecture` for implementation, structural work,
tests, reviews, or PR delivery. Read their full instructions and use their validation requirements.

## Delivery

Use conventional commits and PR titles. Assign issues and PRs to `artiphishle`, link the issue and
PR, and keep PRs as drafts unless explicitly told otherwise. Before a PR, run `build`,
`check-types`, `lint`, `knip:check`, and `format`; run `changeset` only for release-impacting work.
