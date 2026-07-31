# Enfyra Core SDK Playground

This framework-free TypeScript playground executes `@enfyra/sdk-core` examples against a real Enfyra App.

```bash
yarn build
yarn dev:playground
```

Open `http://127.0.0.1:3001`. The default target is `http://localhost:3000`; the SDK adds `/api` automatically.

The safe suite is read-only. Login, refresh, and logout run only when selected explicitly. Credentials stay in memory, tokens are never rendered or exported, and debug reports are recursively redacted.

Framework integrations have their own playgrounds. Use `vue/playground` for `@enfyra/vue`; a React playground belongs to the React package when that package is available.
