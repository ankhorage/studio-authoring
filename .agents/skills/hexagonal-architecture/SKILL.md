---
name: hexagonal-architecture
description: Keep authoring policy independent from concrete host and platform mechanisms.
---

# Hexagonal Architecture

Dependencies point inward. Domain and application behavior remain independent of UI, HTTP,
filesystem, generated application, and Studio host details. Add an adapter only to translate a
real external mechanism at a declared boundary; composition alone selects concrete adapters.
