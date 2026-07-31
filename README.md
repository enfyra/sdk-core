# @enfyra/sdk-core

TypeScript client cho Enfyra. Chạy ở browser, Node.js, và edge. Không phụ thuộc framework.

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

`baseUrl` nhận absolute origin (`http://localhost:3000` → tự thêm `/api`) hoặc relative path (`/enfyra` → giữ nguyên, dùng khi proxy cùng origin).

## Examples

### Login và lấy user hiện tại

```ts
await enfyra.auth.login({ email: 'user@example.com', password: 'secret' })
const me = await enfyra.auth.getMe()
```

Token tự refresh khi gần hết hạn. Logout:

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

### Tạo, sửa, xóa record

```ts
const created = await enfyra.from('articles').insert({ title: 'Hello' })
await enfyra.from('articles').byId(created.data.id).update({ title: 'Updated' })
await enfyra.from('articles').byId(created.data.id).delete()
```

### Gọi custom route

```ts
const { data } = await enfyra.get('/enfyra_user', {
  query: { fields: 'id,email', limit: 10 },
})

await enfyra.post('/custom-route', { key: 'value' })
```

### Dùng fetch tự do (vẫn auto inject auth)

```ts
const res = await enfyra.fetch('/custom-report', {
  method: 'POST',
  body: JSON.stringify({ range: 'month' }),
  headers: { 'content-type': 'application/json' },
})
```

URL ngoài Enfyra base sẽ không bị inject auth header.

### Attach vào axios instance có sẵn

```ts
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:3000' })
enfyra.attachAxios(api)

const { data } = await api.get('/api/me')
```

Axios instance sẽ tự inject token và retry khi 401. Gọi `enfyra.dispose()` khi không dùng nữa.

### Upload và download file

```ts
const file = await enfyra.storage.upload({ file: selectedFile, folder: folderId })
const blob = await enfyra.storage.download(file.id)
const url = enfyra.storage.getDownloadUrl(file.id)
```

### Realtime với Socket.IO

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

### Xử lý lỗi

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

Mở `http://localhost:3001`.
