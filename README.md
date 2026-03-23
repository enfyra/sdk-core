# @enfyra/core

Core API client for Enfyra - Pure JavaScript/TypeScript.

## Installation

```bash
npm install @enfyra/core
# or
yarn add @enfyra/core
# or
pnpm add @enfyra/core
```

## Quick Start

```typescript
import { EnfyraClient } from '@enfyra/core';

const client = new EnfyraClient({
  baseUrl: 'http://localhost:3000/api',
  timeout: 30000,
  retries: 3,
});

// CRUD operations
const users = await client
  .from('user_definition')
  .select('id,email,name')
  .filter({ status: { _eq: 'active' } })
  .sort('-createdAt')
  .limit(20)
  .execute();

// Create
const newUser = await client
  .from('user_definition')
  .insert({
    email: 'new@example.com',
    name: 'New User',
    password: 'secret123',
  })
  .execute();

// Update
await client
  .from('user_definition')
  .update({ name: 'Updated Name' })
  .byId(1)
  .execute();

// Delete
await client
  .from('user_definition')
  .delete()
  .byId(1)
  .execute();

// File upload
const uploaded = await client.storage.upload({
  file: myFile,
  folder: 123,
  title: 'My File',
});

// WebSocket
const ws = new WebSocketClient({
  baseUrl: 'http://localhost:3000',
  gateway: 'chat',
});

ws.on('connect', () => console.log('Connected'));
ws.emit('message', { text: 'Hello!', roomId: '123' });
```

## API Reference

### EnfyraClient

#### Constructor

```typescript
const client = new EnfyraClient({
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;        // default: 30000
  retries?: number;        // default: 0
  retryDelay?: number;     // default: 1000
});
```

**Important Notes:**
- **No auth config required** - Authentication is handled automatically via cookies
- The SDK automatically attaches cookies (accessToken, refreshToken, expTime) to all requests
- Nuxt server handles authentication through session cookies

#### Methods

##### `from(table)` - Query Builder

```typescript
client.from<T>('table_name')
```

##### Query Builder API

```typescript
// Field selection
.select('id,email,name,role.name')

// Filtering
.filter({
  status: { _eq: 'active' },
  email: { _contains: '@example.com' },
  _and: [
    { isActive: { _eq: true } },
    { name: { _is_not_null: true } }
  ]
})

// Sorting
.sort('-createdAt')      // DESC
.sort('name')            // ASC
.sort('category,-price') // Multiple

// Pagination
.limit(20)
.page(2)

// Deep queries (nested relations)
.deep({
  posts: {
    fields: 'id,title',
    sort: '-createdAt',
    limit: 5,
  }
})

// Execute
.execute()
```

##### CRUD Operations

```typescript
// Insert
.from('table').insert(data).execute()

// Update
.from('table').update(data).byId(id).execute()

// Delete
.from('table').delete().byId(id).execute()
```

##### Storage Manager

```typescript
// Upload file
await client.storage.upload({
  file: File | Blob,
  folder?: number,           // Folder ID (optional)
  title?: string,            // File title (optional)
  description?: string,      // File description (optional)
  storageConfig?: number | string,  // Storage config ID (optional). If not provided, server uses default Local Storage
});
```

**Note:** You need to create a storage configuration first (Local Storage or cloud storage like S3, GCS, R2) in the admin panel. If no `storageConfig` is specified, the server will use the default Local Storage.

```typescript
// Get download URL
const url = client.storage.getDownloadUrl(fileId);

// Download file
const blob = await client.storage.download(fileId);

// Get folder tree
const tree = await client.storage.getFolderTree();

// Get storage configs
const configs = await client.storage.getStorageConfigs();
```

##### WebSocket Client

```typescript
import { WebSocketClient } from '@enfyra/core';

const ws = new WebSocketClient({
  baseUrl: 'http://localhost:3000',
  gateway: 'chat',
  reconnect?: boolean,           // default: true
  maxReconnectAttempts?: number, // default: 5
  reconnectInterval?: number,    // default: 1000
});

// Events
ws.on('connect', handler);
ws.on('disconnect', handler);
ws.on('error', handler);
ws.on('customEvent', handler);

// Emit
ws.emit('eventName', data);
ws.send(data);

// Cleanup
ws.disconnect();
```

##### Direct HTTP Methods

Use these for custom API endpoints that don't fit the CRUD pattern:

```typescript
// GET request
const users = await client.get<UsersResponse>('/users', {
  query: { status: 'active', limit: 10 }
});

// POST request
const result = await client.post<CreateResponse>('/custom-action', {
  email: 'user@example.com',
  action: 'send_email'
});

// PUT request
const updated = await client.put<UpdateResponse>('/settings', {
  theme: 'dark',
  language: 'en'
});

// PATCH request
const partial = await client.patch<UpdateResponse>('/profile', {
  name: 'New Name'
});

// DELETE request
await client.delete('/temp-data');

// With custom headers
await client.get('/admin/data', {
  headers: { 'X-Custom-Header': 'value' }
});
```

##### Response & Error Hooks

Transform responses and errors globally:

```typescript
// Response transformer - modify all responses
client.http.onResponse((response) => {
  // Log response, modify data, etc.
  console.log('API Response:', response);
  return response;
});

// Async response transformer
client.http.onResponse(async (response) => {
  // Fetch additional data if needed
  if (response.status === 200) {
    // Do something with response
  }
  return response;
});

// Error transformer - handle errors globally
client.http.onError((error) => {
  // Log errors, show notifications, etc.
  if (error.code === 'UNAUTHORIZED') {
    window.location.href = '/login';
  }
  return error;
});

// Async error transformer
client.http.onError(async (error) => {
  // Retry logic, refresh token, etc.
  if (error.code === 'UNAUTHORIZED') {
    await refreshToken();
  }
  return error;
});
```

**Note:** Multiple transformers can be registered. They execute in the order they were added.

### AuthManager

```typescript
// Login
await client.auth.login({ email, password });

// Logout
await client.auth.logout();

// Get current user
const user = await client.auth.getMe();

// Check authentication
const isAuthenticated = client.auth.isAuthenticated();

// Get tokens
const tokens = client.auth.getTokens();

// Manually set tokens
client.auth.setTokens(accessToken, refreshToken);
```

### Error Handling

```typescript
import { EnfyraError } from '@enfyra/core';

try {
  await client.from('users').select('*').execute();
} catch (error) {
  if (error instanceof EnfyraError) {
    console.log(error.code);         // 'UNAUTHORIZED', 'NOT_FOUND', etc.
    console.log(error.statusCode);   // 401, 404, etc.
    console.log(error.message);
    console.log(error.details);
  }
}
```

### Types

```typescript
import type {
  FilterObject,
  QueryConfig,
  HttpResponse,
  ExecuteResult,
  UploadFileParams,
  WebSocketConfig,
} from '@enfyra/core';
```

## Testing

```bash
# Run tests
npm test

# Run tests with specific API
TEST_API_URL=http://localhost:3000 npm test
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Dev mode
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint
```

## Architecture

### Project Structure

```
src/
├── index.ts              # Main entry point
├── client/
│   ├── EnfyraClient.ts   # Main API client
│   └── HttpClient.ts     # HTTP transport layer
├── auth/
│   └── AuthManager.ts    # JWT & cookie management
├── query/
│   └── QueryBuilder.ts   # Database query builder
├── storage/
│   └── StorageManager.ts # File upload/download
├── websocket/
│   └── WebSocketClient.ts# Socket.IO client
├── errors/
│   └── EnfyraError.ts    # Custom error class
└── types/
    └── index.ts          # TypeScript types
```

### Authentication

- SDK **does not require** passing accessToken/refreshToken during initialization
- Cookies are automatically attached thanks to `credentials: 'include'` in ofetch
- Nuxt server handles session management and forwards requests to the backend

### Cookies Format

After successful login, the AuthManager sets:
- `accessToken` - JWT access token
- `refreshToken` - JWT refresh token
- `expTime` - Expiration time (ms)

The SDK automatically sends these cookies with all requests.

### Query Parameters Mapping

SDK → API:
- `select` → `fields`
- `filter` → JSON.stringify(filter)
- `deep` → JSON.stringify(deep)

### Response Format

API response:
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": [...],
  "meta": { "totalCount": 100 }
}
```

SDK returns:
```typescript
{
  data: [...],
  meta?: { totalCount, filterCount, ... }
}
```

## License

MIT
