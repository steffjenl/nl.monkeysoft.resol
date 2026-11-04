# Contributing

1. `npm install`
2. Make your change; keep SDK v3 conventions (`async/await`, `this.homey.*` timers, clean up in `onUninit`/`onDeleted`).
3. `npm run lint && npm test && npm run validate` must pass.
4. Add or update tests in `test/` (no hardware needed, see `test/helpers.js`).
5. Update `.homeychangelog.json` for user-visible changes.

Open an issue first for larger changes.
