# Enfyra SDK Playground

Interactive web-based testing environment for @enfyra/core SDK.

## Quick Start

### 1. Start Nuxt Server (Required)

Make sure the Nuxt server is running before starting the playground:

```bash
cd ~/Documents/enfyra/app
yarn build && yarn preview
# Server runs on http://localhost:3000
```

### 2. Build SDK

```bash
cd ~/Documents/enfyra/sdk/core

# Install dependencies (if not done)
yarn install

# Build SDK - required before playground
yarn build
```

### 3. Start Playground

```bash
# Start Vite dev server
yarn dev:playground
```

The playground will be available at `http://localhost:3001`

> **Note:** The playground requires the Nuxt server to be running first, as all API calls and WebSocket connections target `http://localhost:3000/api`.

## Features

### ✅ Authentication Testing
- Login with email/password
- Get current user (/me)
- Refresh token
- Logout

### ✅ CRUD Operations
- List records with filtering, sorting, pagination
- Create new records
- Update existing records
- Delete records
- Query with meta information

### ✅ File Storage
- Upload files with metadata
- List files
- Get folder tree

### ✅ Custom Routes
- Test any custom endpoint
- Support GET, POST, PATCH, DELETE
- Custom request body

### ✅ WebSocket
- Connect to WebSocket gateways
- Send/receive messages
- Handle reconnection
- Backend disconnect/reconnect events

### ✅ Error Handling
- Test 404 errors
- Test validation errors
- Test authentication errors
- View error details

### ✅ Logging
- Real-time logs
- Export logs to JSON
- Clear logs
- Color-coded by type

## Usage

### 1. Initialize Client

1. Enter base URL (default: `http://localhost:3000/api`)
2. Click "Initialize Client"
3. Check status indicator

### 2. Test Authentication

1. Enter email and password
2. Click "Login"
3. View response in result box
4. Token is automatically set for subsequent requests

### 3. Test CRUD

1. Click "List Users" to see existing users
2. Click "Create User" to create a test user
3. Use "Update User" and "Delete User" with specific IDs
4. Try "Filter Users" and "With Meta" for advanced queries

### 4. Test File Upload

1. Select a file
2. Enter title and description
3. Click "Upload File"
4. View upload result

### 5. Test WebSocket

1. Enter gateway name (e.g., "chat")
2. Click "Connect"
3. Send messages
4. Monitor connection status

### 6. Test Custom Routes

1. Select HTTP method
2. Enter endpoint path
3. Enter request body (JSON)
4. Click "Send Request"

### 7. Test Error Handling

Click buttons to trigger different error types and see how SDK handles them.

## Screenshots

The playground includes:
- Clean, modern UI with Tailwind CSS
- Color-coded results (green for success, red for error)
- Real-time logging
- Exportable logs
- Responsive design

## Logs

All operations are logged with:
- Timestamp
- Operation name
- Success/error status
- Response data

Logs can be:
- Cleared with "Clear Logs"
- Exported to JSON with "Export Logs"
- Scrolled to view history

## Troubleshooting

### "Please initialize client first"

Click "Initialize Client" button first.

### "Login failed"

Make sure:
- Nuxt server is running at `http://localhost:3000`
- User exists with entered credentials
- Network connection is working

### "File upload failed"

Check:
- File is selected
- File size is within limits
- Storage is configured

### "WebSocket doesn't connect"

Verify:
- Nuxt server has socket-relay plugin loaded
- Gateway name is correct
- Check browser console for errors

## Advanced Usage

### Programmatic Testing

Open browser console and use the `client` variable:

```javascript
// List users
const result = await client.from('user_definition').execute();
console.log(result);

// Create user
const user = await client
  .from('user_definition')
  .insert({ email: 'test@example.com' })
  .execute();
console.log(user);

// Custom query
const users = await client
  .from('user_definition')
  .select('id,email,name')
  .filter({ email: { _contains: '@example.com' } })
  .meta(['totalCount'])
  .execute();
console.log(users);
```

### WebSocket Testing

```javascript
// Connect to chat
ws = new WebSocketClient({
  baseUrl: 'http://localhost:3000',
  gateway: 'chat',
});

ws.on('message', (data) => {
  console.log('Received:', data);
});

ws.emit('message', { text: 'Hello!' });
```

## Configuration

### Change Base URL

Edit the base URL input field before initializing client.

Examples:
- `http://localhost:3000/api` (local Nuxt)
- `https://your-app.com/api` (production)

### Adjust Timeout

Edit `app.js` and modify client config:

```javascript
client = new EnfyraClient({
  baseUrl,
  timeout: 60000,  // 60 seconds
  retries: 5,
});
```

## Notes

- Playground uses built SDK from `../dist/index.mjs`
- Always rebuild SDK after changes: `npm run build`
- Playground runs on port 3001 (Nuxt on 3000)
- All tests run against actual Nuxt server

## Next Steps

After testing in playground:
1. Review test results
2. Check logs for details
3. Fix any issues found
4. Integrate SDK into your app
5. Monitor production usage

## Support

For issues or questions:
1. Check logs in playground
2. Review browser console
3. See SDK documentation
4. Check the main README.md for documentation
