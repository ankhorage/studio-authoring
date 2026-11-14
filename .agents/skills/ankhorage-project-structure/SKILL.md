---
name: ankhorage-project-structure
description: Define or review ownership, entrypoints, and source architecture.
---

# Ankhorage Project Structure

This is a reusable authoring engine package using a feature-first structure. Each capability lives
under `src/features/<capability>`; `src/index.ts` is the deliberate public facade. Pure domain
models must not depend on UI frameworks, host composition, storage, generated apps, or adapters.
Create ports or adapters only when a real external boundary requires them; do not add empty layers.
Cross-repository portable data uses released Contracts APIs and declared dependencies.
