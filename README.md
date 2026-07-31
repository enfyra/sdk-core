# @enfyra/sdk-core

TypeScript client for Enfyra. Runs in browsers, Node.js, and edge runtimes. No framework dependency.

```bash
yarn add @enfyra/sdk-core
```

## Setup

```ts
import { EnfyraClient } from '@enfyra/sdk-core'

const enfyra = new EnfyraClient({
  baseUrl: 'http://localhost:3000',
})
```

`baseUrl` accepts an absolute origin (`http://localhost:3000` → automatically appends `/api`) or a relative path (`/enfyra` → kept as-is, for same-origin proxy setups).

## Examples

### Login and get current user

```ts
await enfyra.auth.login({ email: 'user@example.com', password: 'secret' })
const me = await enfyra.auth.getMe()
```

Tokens refresh automatically when near expiry. Logout:

```ts
await enfyra.auth.logout()
```

### Query data

```ts
const { data, meta } = await enfyra
  .from('articles')
  .select(['id', 'title', 'createdAt'])
  .filter({ status: { _eq: 'published' } })
  .sort('-createdAt')
  .limit(20)
  .meta(['totalCount'])
  .execute()
```

### Create, update, delete records

```ts
const created = await enfyra.from('articles').insert({ title: 'Hello' })
await enfyra.from('articles').byId(created.data.id).update({ title: 'Updated' })
await enfyra.from('articles').byId(created.data.id).delete()
```

### Call custom routes

```ts
const { data } = await enfyra.get('/enfyra_user', {
  query: { fields: 'id,email', limit: 10 },
})

await enfyra.post('/custom-route', { key: 'value' })
```

### Free-form fetch (auth auto-injected)

```ts
const res = await enfyra.fetch('/custom-report', {
  method: 'POST',
  body: JSON.stringify({ range: 'month' }),
  headers: { 'content-type': 'application/json' },
})
```

URLs outside the Enfyra base will not have auth headers injected.

### Attach to an existing axios instance

```ts
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:3000' })
enfyra.attachAxios(api)

const { data } = await api.get('/api/me')
```

The axios instance will auto-inject tokens and retry on 401. Call `enfyra.dispose()` when tearing down.

### Upload and download files

```ts
const file = await enfyra.storage.upload({ file: selectedFile, folder: folderId })
const blob = await enfyra.storage.download(file.id)
const url = enfyra.storage.getDownloadUrl(file.id)
```

### Realtime with Socket.IO

```ts
import { WebSocketClient } from '@enfyra/sdk-core'

const socket = new WebSocketClient({
  baseUrl: 'http://localhost:3000',
  gateway: 'chat',
  getAuthToken: () => enfyra.auth.getToken(),
})

socket.on('message', (data) => console.log(data))
await socket.connect()
socket.emit('message', { text: 'hello' })
```

### Error handling

```ts
import { isEnfyraError } from '@enfyra/sdk-core'

try {
  await enfyra.get('/protected')
} catch (error) {
  if (isEnfyraError(error)) {
    console.log(error.statusCode, error.code, error.message)
  }
}
```

### Exchange API token (server-side)

```ts
const tokens = await enfyra.auth.exchangeApiToken(process.env.ENFYRA_PAT!)
```

## Playground

```bash
yarn workspace @enfyra/sdk-core dev:playground
```

Opens at `http://localhost:3001`.
