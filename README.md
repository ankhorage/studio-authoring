# Studio Authoring

`@ankhorage/studio-authoring` is the standalone, reusable authoring core for Ankhorage
applications. It owns portable authoring state, manifest mutation policy, selection, inspector
route identity, and the portable `/ankh` route catalog.

Host composition, manifest persistence, generated Expo Router delivery, runtime overlays, and
renderer UI remain external adapter responsibilities.

## Development

```sh
bun install --frozen-lockfile
bun run test
bun run build
```

The repository uses managed Devtools quality gates. Run `bun run lint`, `bun run format:check`,
and `bun run knip:check` before contributing.
